const fs = require('fs');
const path = require('path');

const input = $input.first();
const json = (input && input.json) || {};

// 1. Nhận diện nguồn gọi (Webhook Fast-Path vs Mattermost Router)
let triggerSource = 'mattermost';
let reqIssueKey = '';
let targetProject = '';
let userName = 'User';

try {
  const prepNode = $('Prepare Jira Request').first();
  if (prepNode && prepNode.json) {
    reqIssueKey = prepNode.json.issueKey || '';
    targetProject = prepNode.json.project || '';
    userName = prepNode.json.userName || 'User';
    triggerSource = prepNode.json._triggerSource || 'mattermost';
  }
} catch (e) {}

if (!reqIssueKey) {
  try {
    const trigWebhook = $('Webhook Trigger (jira-prep)').first();
    if (trigWebhook && trigWebhook.json) {
      triggerSource = 'webhook';
      const b = trigWebhook.json.body || trigWebhook.json;
      reqIssueKey = b.issueKey || '';
      targetProject = b.project || '';
      userName = b.userName || b.user_name || 'User';
    }
  } catch (e) {}
}

if (!reqIssueKey) {
  try {
    const trigExec = $('Execute Workflow Trigger').first();
    if (trigExec && trigExec.json) {
      triggerSource = 'mattermost';
      const b = trigExec.json.body?.params || trigExec.json.body || trigExec.json.params || trigExec.json;
      reqIssueKey = b.issueKey || '';
      targetProject = b.project || '';
      userName = trigExec.json.userName || trigExec.json.user_name || 'User';
    }
  } catch (e) {}
}

// 2. Xử lý lỗi từ Jira REST API (404, 401, timeout...)
if (json.error || json.errorMessages || (json.message && !json.fields)) {
  const errMsg = (json.errorMessages && json.errorMessages.join(', ')) ||
                 (json.error && (json.error.message || json.error.description)) ||
                 json.message || 'Không thể kết nối đến Jira REST API';
  
  const formattedError = `🚨 **[Lỗi Tra Cứu Jira]** Không thể lấy thông tin issue [${reqIssueKey || 'chưa nhập'}]:\n> ${errMsg}\n\n*Gợi ý: Hãy kiểm tra mã issueKey (VD: G3PTP-17396) và quyền hạn tài khoản trong .env.*`;
  
  return [{
    json: {
      isError: true,
      error: errMsg,
      issueKey: reqIssueKey,
      reportText: formattedError,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 3. Hàm giải mã Atlassian Document Format (ADF) sang Markdown chuẩn
function adfToMarkdown(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToMarkdown).join('');

  const type = node.type || '';
  const content = node.content || [];
  const text = node.text || '';

  if (type === 'text') {
    let res = text;
    if (node.marks && Array.isArray(node.marks)) {
      for (const m of node.marks) {
        if (m.type === 'strong') res = `**${res}**`;
        if (m.type === 'em') res = `*${res}*`;
        if (m.type === 'code') res = `\`${res}\``;
        if (m.type === 'link' && m.attrs?.href) res = `[${res}](${m.attrs.href})`;
        if (m.type === 'strike') res = `~~${res}~~`;
      }
    }
    return res;
  }

  if (type === 'hardBreak') return '\n';
  if (type === 'rule') return '\n---\n';

  if (type === 'heading') {
    const level = node.attrs?.level || 2;
    const prefix = '#'.repeat(level);
    return `\n${prefix} ${content.map(adfToMarkdown).join('')}\n`;
  }

  if (type === 'paragraph') {
    const inner = content.map(adfToMarkdown).join('');
    return inner ? `${inner}\n` : '\n';
  }

  if (type === 'bulletList') {
    return '\n' + content.map(item => '- ' + contentOfItem(item).trim()).join('\n') + '\n';
  }

  if (type === 'orderedList') {
    return '\n' + content.map((item, idx) => `${idx + 1}. ` + contentOfItem(item).trim()).join('\n') + '\n';
  }

  if (type === 'codeBlock') {
    const lang = node.attrs?.language || '';
    return `\n\`\`\`${lang}\n${content.map(adfToMarkdown).join('')}\n\`\`\`\n`;
  }

  if (type === 'blockquote') {
    return '\n> ' + content.map(adfToMarkdown).join('').trim().replace(/\n/g, '\n> ') + '\n';
  }

  if (type === 'table') {
    const rows = content.filter(n => n.type === 'tableRow');
    if (rows.length === 0) return '';
    let tableMd = '\n';
    rows.forEach((r, rIdx) => {
      const cells = (r.content || []).filter(c => c.type === 'tableHeader' || c.type === 'tableCell');
      const cellTexts = cells.map(c => contentOfItem(c).replace(/\n+/g, ' ').trim());
      tableMd += '| ' + cellTexts.join(' | ') + ' |\n';
      if (rIdx === 0) {
        tableMd += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      }
    });
    return tableMd + '\n';
  }

  if (content.length > 0) {
    return content.map(adfToMarkdown).join('');
  }
  return '';
}

function contentOfItem(item) {
  if (!item || !item.content) return '';
  return item.content.map(adfToMarkdown).join('');
}

// 4. Trích xuất thông tin nghiệp vụ chi tiết
const fields = json.fields || {};
const issueKey = json.key || reqIssueKey;
const summary = fields.summary || 'Không có tiêu đề';
const issueType = fields.issuetype?.name || 'Task';
const status = fields.status?.name || 'Unknown';
const priority = fields.priority?.name || 'Medium';
const assignee = fields.assignee?.displayName || 'Chưa phân bổ';
const reporter = fields.reporter?.displayName || 'Chưa rõ';
const labels = fields.labels || [];
const components = (fields.components || []).map(c => c.name);

// Sprint info — Jira Cloud Entrade dùng customfield_10018, các bản khác dùng customfield_10020, Server/DC dùng fields.sprint
let sprintName = 'Không có Sprint';
const sprintRaw = fields.customfield_10018 || fields.sprint || fields.customfield_10020;
if (Array.isArray(sprintRaw)) {
  sprintName = sprintRaw.map(s => s.name).filter(Boolean).join(', ') || sprintName;
} else if (sprintRaw && typeof sprintRaw === 'object') {
  sprintName = sprintRaw.name || sprintName;
} else if (typeof sprintRaw === 'string' && sprintRaw.includes('name=')) {
  const m = sprintRaw.match(/name=([^,\]]+)/);
  if (m) sprintName = m[1].trim();
}

// Attachments
const attachments = (fields.attachment || []).map(a => ({
  filename: a.filename,
  size: a.size,
  mimeType: a.mimeType,
  content: a.content
}));

// Issue Links
const issueLinks = (fields.issuelinks || []).map(l => {
  if (l.outwardIssue) return `${l.type?.outward || 'liên kết tới'} ${l.outwardIssue.key} (${l.outwardIssue.fields?.summary || ''})`;
  if (l.inwardIssue) return `${l.type?.inward || 'được liên kết bởi'} ${l.inwardIssue.key} (${l.inwardIssue.fields?.summary || ''})`;
  return null;
}).filter(Boolean);

// Subtasks
const subtasks = (fields.subtasks || []).map(s => `[${s.key}] ${s.fields?.summary || ''} (${s.fields?.status?.name || ''})`);

// Description ADF sang Markdown
let cleanDesc = '';
if (fields.description && typeof fields.description === 'object') {
  cleanDesc = adfToMarkdown(fields.description).trim();
} else if (typeof fields.description === 'string') {
  cleanDesc = fields.description.trim();
}

// Trích xuất Confluence links từ description và issueLinks
const confluenceMatches = cleanDesc.match(/https?:\/\/[^\s)]+\/wiki\/(?:spaces|pages)\/[^\s)]+/gi) || [];
const uniqueConfluenceLinks = Array.from(new Set(confluenceMatches));

// 5. Quét trạng thái Workspace Local
const candidateRoots = [
  ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Projects/agent-skills',
  '/Users/qa-quangnt/Projects/agent-skills'
];

const scanDirsRaw = ($env && $env.PROJECT_SCAN_DIRS) || '';
if (scanDirsRaw) {
  scanDirsRaw.split(',').forEach(d => {
    const p = d.trim().replace(/^["']|["']$/g, '');
    if (p && !candidateRoots.includes(p)) candidateRoots.push(p);
  });
}

// Thêm đường dẫn từ projects.json
try {
  const pMapPath = [
    path.join(candidateRoots[0], 'config', 'projects.json'),
    path.join(candidateRoots[0], 'projects.json')
  ].find(p => fs.existsSync(p));
  if (pMapPath) {
    const pMap = JSON.parse(fs.readFileSync(pMapPath, 'utf8'));
    Object.values(pMap).forEach(v => {
      const p = path.resolve(v);
      if (!candidateRoots.includes(p)) candidateRoots.push(p);
    });
  }
} catch (_) {}

let localWorkspaceInfo = {
  found: false,
  projectRoot: '',
  hasRefinedSpec: false,
  hasFinalSpec: false,
  hasFeatureFile: false,
  hasSquashSync: false,
  squashSyncId: null,
  specPath: ''
};

for (const cRoot of candidateRoots) {
  const wsDir = path.join(cRoot, 'workspace', issueKey);
  if (fs.existsSync(wsDir)) {
    localWorkspaceInfo.found = true;
    localWorkspaceInfo.projectRoot = cRoot;
    
    const refinedPath = path.join(wsDir, 'spec', 'refined.md');
    if (fs.existsSync(refinedPath)) {
      localWorkspaceInfo.hasRefinedSpec = true;
      localWorkspaceInfo.specPath = refinedPath;
    }
    
    const finalPath = path.join(wsDir, 'spec', 'final.md');
    if (fs.existsSync(finalPath)) {
      localWorkspaceInfo.hasFinalSpec = true;
      if (!localWorkspaceInfo.specPath) localWorkspaceInfo.specPath = finalPath;
    }

    const testDir = path.join(wsDir, 'test');
    if (fs.existsSync(testDir)) {
      try {
        const testFiles = fs.readdirSync(testDir);
        localWorkspaceInfo.hasFeatureFile = testFiles.some(f => f.endsWith('.feature'));
        const syncJson = path.join(testDir, 'squash_sync.json');
        if (fs.existsSync(syncJson)) {
          const sData = JSON.parse(fs.readFileSync(syncJson, 'utf8'));
          localWorkspaceInfo.hasSquashSync = true;
          localWorkspaceInfo.squashSyncId = sData.testCaseId || null;
        }
      } catch (_) {}
    }
    break;
  }
}

// 6. Xây dựng thẻ báo cáo Markdown chi tiết cho Mattermost
const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const jiraUrl = `${baseUrl}/browse/${issueKey}`;

let localStatusText = '⚠️ *Chưa tìm thấy workspace local* (👉 Chạy `/ba-spec` hoặc `/ba-refine` để khởi tạo)';
if (localWorkspaceInfo.found) {
  const parts = [];
  if (localWorkspaceInfo.hasRefinedSpec) parts.push('✅ `spec/refined.md`');
  else if (localWorkspaceInfo.hasFinalSpec) parts.push('✅ `spec/final.md`');
  else parts.push('❌ Chưa có file spec');

  if (localWorkspaceInfo.hasFeatureFile) parts.push('✅ `test/*.feature`');
  if (localWorkspaceInfo.hasSquashSync) parts.push(`✅ Squash TM [#${localWorkspaceInfo.squashSyncId || 'Sync'}]`);
  
  localStatusText = parts.join(' | ') + `\n> Thư mục: \`${localWorkspaceInfo.specPath || localWorkspaceInfo.projectRoot}\``;
}

const suggestions = [];
const resolvedProjTag = targetProject ? targetProject + ' ' : '';
if (localWorkspaceInfo.hasRefinedSpec || localWorkspaceInfo.hasFinalSpec) {
  suggestions.push(`\`/agent ${resolvedProjTag}push-jira ${issueKey}\` để cập nhật Description lên Jira`);
}
if (localWorkspaceInfo.hasFeatureFile) {
  suggestions.push(`\`/agent ${resolvedProjTag}push-squash ${issueKey}\` để đồng bộ test case lên Squash TM`);
  suggestions.push(`\`/agent ${resolvedProjTag}run-test ${issueKey}\` để chạy kiểm thử tự động`);
} else {
  suggestions.push(`\`/ba-refine ${issueKey}\` để mài giũa spec và viết User Story/AC`);
}

const descSnippet = cleanDesc.length > 800 ? cleanDesc.substring(0, 800) + '\n\n*(... nội dung còn tiếp ...)*' : (cleanDesc || '*Không có mô tả chi tiết.*');

const reportText = `### 📋 Thông Tin Jira Issue: [${issueKey}](${jiraUrl}) - ${summary}
- **Loại:** \`${issueType}\` | **Trạng thái:** **${status}** | **Ưu tiên:** \`${priority}\`
- **Người xử lý:** **${assignee}** | **Người tạo:** ${reporter}
- **Sprint:** \`${sprintName}\`${components.length > 0 ? (' | **Components:** `' + components.join(', ') + '`') : ''}
${labels.length > 0 ? ('- **Labels:** `' + labels.join(', ') + '`\n') : ''}- **Tài liệu tham chiếu:** ${attachments.length} file đính kèm | ${uniqueConfluenceLinks.length} liên kết Confluence | ${issueLinks.length} liên kết Issue
- **Workspace Local:** ${localStatusText}

#### 📖 Trích Đoạn Mô Tả (ADF Markdown):
${descSnippet}

---
💡 **Gợi ý bước tiếp theo:**
${suggestions.map(s => `- ${s}`).join('\n')}`;

return [{
  json: {
    isError: false,
    issueKey,
    summary,
    issueType,
    status,
    priority,
    assignee,
    reporter,
    sprintName,
    labels,
    components,
    attachments,
    issueLinks,
    subtasks,
    confluenceLinks: uniqueConfluenceLinks,
    descriptionMarkdown: cleanDesc,
    descriptionSnippet: cleanDesc.substring(0, 1500),
    localWorkspace: localWorkspaceInfo,
    reportText,
    _triggerSource: triggerSource,
    userName
  }
}];
