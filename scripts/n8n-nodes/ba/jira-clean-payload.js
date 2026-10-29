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

// Parent / Epic info
const parent = fields.parent ? {
  key: fields.parent.key,
  summary: fields.parent.fields?.summary || '',
  issueType: fields.parent.fields?.issuetype?.name || '',
  status: fields.parent.fields?.status?.name || ''
} : null;

// Comments (chắt lọc tối đa 10 comment gần nhất)
const comments = (fields.comment?.comments || []).slice(-10).map(c => {
  let cBody = '';
  if (c.body && typeof c.body === 'object') {
    cBody = adfToMarkdown(c.body).trim();
  } else if (typeof c.body === 'string') {
    cBody = c.body.trim();
  }
  return {
    id: c.id,
    author: c.author?.displayName || 'Ẩn danh',
    created: c.created,
    body: cBody
  };
}).filter(c => c.body.length > 0);

// Attachments
const attachments = (fields.attachment || []).map(a => ({
  id: a.id,
  filename: a.filename,
  size: a.size,
  mimeType: a.mimeType,
  content: a.content
}));

// Issue Links chi tiết
const rawIssueLinks = fields.issuelinks || [];
const issueLinks = rawIssueLinks.map(l => {
  if (l.outwardIssue) return `${l.type?.outward || 'liên kết tới'} ${l.outwardIssue.key} (${l.outwardIssue.fields?.summary || ''})`;
  if (l.inwardIssue) return `${l.type?.inward || 'được liên kết bởi'} ${l.inwardIssue.key} (${l.inwardIssue.fields?.summary || ''})`;
  return null;
}).filter(Boolean);

const linkedIssuesList = rawIssueLinks.map(l => {
  const target = l.outwardIssue || l.inwardIssue;
  if (!target) return null;
  return {
    key: target.key,
    relationship: l.outwardIssue ? (l.type?.outward || 'relates to') : (l.type?.inward || 'is related to'),
    summary: target.fields?.summary || '',
    status: target.fields?.status?.name || '',
    issueType: target.fields?.issuetype?.name || ''
  };
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

// Trích xuất Confluence links từ description và comments
const textToScan = cleanDesc + '\n' + comments.map(c => c.body).join('\n');
const confluenceMatches = textToScan.match(/https?:\/\/[^\s)]+\/wiki\/(?:spaces|pages)\/[^\s)]+/gi) || [];
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
  const tieredDir = path.join(cRoot, 'workspace', 'issues', issueKey);
  const legacyDir = path.join(cRoot, 'workspace', issueKey);
  const wsDir = fs.existsSync(tieredDir) ? tieredDir : (fs.existsSync(legacyDir) ? legacyDir : null);
  if (wsDir) {
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

// 5.1. Xác định BaseUrl & AuthHeader dùng chung cho cả bước Hydrate và Báo cáo
let baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
let resolvedAuthHeader = '';
try {
  const prepNode = $('Prepare Jira Request').first();
  if (prepNode && prepNode.json) {
    if (prepNode.json.baseUrl) baseUrl = prepNode.json.baseUrl.replace(/\/+$/, '');
    if (prepNode.json.authHeader) resolvedAuthHeader = prepNode.json.authHeader;
  }
} catch (_) {}
if (!resolvedAuthHeader) {
  resolvedAuthHeader = 'Basic ' + Buffer.from(`${($env && $env.ATLASSIAN_EMAIL) || ''}:${($env && $env.ATLASSIAN_API_TOKEN) || ''}`).toString('base64');
}

// Lưu cache metadata Jira vào workspace/issues/{issueKey}/source/jira-issue.json để phục vụ ba-refine / ba-spec
let hydratedParentDetailText = '';
let hydratedConfluenceDocs = [];
let downloadedAttachments = [];
try {
  const targetRoot = localWorkspaceInfo.projectRoot || candidateRoots[0];
  if (targetRoot && issueKey && fs.existsSync(targetRoot)) {
    const sourceDir = path.join(targetRoot, 'workspace', 'issues', issueKey, 'source');
    const refsDir = path.join(sourceDir, 'refs');
    const specDir = path.join(targetRoot, 'workspace', 'issues', issueKey, 'spec');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(refsDir, { recursive: true });
    fs.mkdirSync(specDir, { recursive: true });

    const authHeaders = {
      'Authorization': resolvedAuthHeader,
      'Accept': 'application/json'
    };

    // Hàm helper gọi HTTP đồng bộ (ưu tiên global.__mockHttpGet trong unit test, fallback curl)
    const curlGet = (targetUrl) => {
      if (typeof globalThis !== 'undefined' && typeof globalThis.__mockJiraCleanHttpGet === 'function') {
        return globalThis.__mockJiraCleanHttpGet(targetUrl, authHeaders);
      }
      try {
        const { execSync } = require('child_process');
        return execSync(`curl -s --max-time 10 -H "Authorization: ${authHeaders.Authorization}" -H "Accept: application/json" "${targetUrl}"`, { encoding: 'utf8' });
      } catch (_) {
        return null;
      }
    };

    // A. Quét Remote Links (/remotelink) để bắt trọn link Confluence gắn ở mục Link của Jira
    try {
      const rlRaw = curlGet(`${baseUrl}/rest/api/3/issue/${issueKey}/remotelink`);
      if (rlRaw) {
        const rlList = typeof rlRaw === 'string' ? JSON.parse(rlRaw) : rlRaw;
        if (Array.isArray(rlList)) {
          rlList.forEach(rl => {
            const u = rl.object?.url || '';
            if (u && /\/wiki\//i.test(u) && !uniqueConfluenceLinks.includes(u)) {
              uniqueConfluenceLinks.push(u);
            }
          });
        }
      }
    } catch (_) {}

    // B. Hydrate nội dung chi tiết của Parent / Epic (lưu vào source/refs/parent-{key}.md)
    if (parent && parent.key) {
      try {
        const parentRaw = curlGet(`${baseUrl}/rest/api/3/issue/${parent.key}?fields=summary,description,status,issuetype`);
        if (parentRaw) {
          const pData = typeof parentRaw === 'string' ? JSON.parse(parentRaw) : parentRaw;
          const pDesc = pData.fields?.description ? adfToMarkdown(pData.fields.description).trim() : '';
          parent.descriptionMarkdown = pDesc;
          hydratedParentDetailText = `# [${parent.key}] ${pData.fields?.summary || parent.summary}\n` +
            `- **Loại:** ${pData.fields?.issuetype?.name || parent.issueType} | **Trạng thái:** ${pData.fields?.status?.name || parent.status}\n\n` +
            `## Mô Tả Epic / Ticket Cha:\n${pDesc || '(Không có mô tả chi tiết)'}\n`;
          fs.writeFileSync(path.join(refsDir, `parent-${parent.key}.md`), hydratedParentDetailText, 'utf8');
        }
      } catch (_) {}
    }

    // C. Hydrate nội dung của tối đa 5 Linked Issues trực tiếp (lưu vào source/refs/linked-{key}.md)
    if (linkedIssuesList.length > 0) {
      linkedIssuesList.slice(0, 5).forEach(l => {
        try {
          const lRaw = curlGet(`${baseUrl}/rest/api/3/issue/${l.key}?fields=summary,description,status,issuetype`);
          if (lRaw) {
            const lData = typeof lRaw === 'string' ? JSON.parse(lRaw) : lRaw;
            const lDesc = lData.fields?.description ? adfToMarkdown(lData.fields.description).trim() : '';
            const lContent = `# [${l.key}] ${lData.fields?.summary || l.summary}\n` +
              `- **Mối quan hệ:** ${l.relationship}\n` +
              `- **Loại:** ${lData.fields?.issuetype?.name || l.issueType} | **Trạng thái:** ${lData.fields?.status?.name || l.status}\n\n` +
              `## Mô Tả Ticket Liên Quan:\n${lDesc || '(Không có mô tả)'}\n`;
            fs.writeFileSync(path.join(refsDir, `linked-${l.key}.md`), lContent, 'utf8');
            l.descriptionMarkdown = lDesc;
          }
        } catch (_) {}
      });
    }

    // D. Kéo nội dung Confluence Pages về source/refs/confluence-{pageId}.md
    if (uniqueConfluenceLinks.length > 0) {
      uniqueConfluenceLinks.forEach(lnk => {
        let pId = '';
        const idMatch = lnk.match(/\/pages\/(\d+)/i) || lnk.match(/pageId=(\d+)/i);
        if (idMatch) pId = idMatch[1];
        if (pId) {
          try {
            let docMd = '';
            if (typeof globalThis !== 'undefined' && typeof globalThis.__mockJiraCleanHttpGet === 'function') {
              const mockCf = globalThis.__mockJiraCleanHttpGet(`${baseUrl}/wiki/api/v2/pages/${pId}?body-format=storage`, authHeaders);
              if (mockCf) {
                const cfData = typeof mockCf === 'string' ? JSON.parse(mockCf) : mockCf;
                docMd = cfData.markdownContent || cfData.body?.storage?.value || '';
              }
            } else {
              // Thử qua n8n confluence-doc webhook trước
              const { execSync } = require('child_process');
              try {
                const cfPost = execSync(`curl -s --max-time 10 -X POST -H 'Content-Type: application/json' -d '{"pageUrlOrId":"${pId}"}' http://localhost:5678/webhook/confluence-doc`, { encoding: 'utf8' });
                const cfJson = JSON.parse(cfPost);
                if (cfJson && cfJson.markdownContent) docMd = cfJson.markdownContent;
              } catch (_) {}
            }

            // Fallback trực tiếp Confluence API nếu n8n webhook chưa sẵn sàng
            if (!docMd) {
              const cfRaw = curlGet(`${baseUrl}/wiki/api/v2/pages/${pId}?body-format=storage`);
              if (cfRaw) {
                const cfData = typeof cfRaw === 'string' ? JSON.parse(cfRaw) : cfRaw;
                const val = cfData.body?.storage?.value || cfData.body?.view?.value || '';
                if (val) {
                  docMd = val
                    .replace(/<ac:structured-macro[^>]*>[\s\S]*?<\/ac:structured-macro>/gi, '')
                    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
                    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
                    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim();
                }
              }
            }

            if (docMd) {
              const cleanDocMd = docMd.replace(/<[^>]+>/g, '').trim();
              fs.writeFileSync(path.join(refsDir, `confluence-${pId}.md`), `# Confluence Doc: ${lnk}\n\n${cleanDocMd}\n`, 'utf8');
              hydratedConfluenceDocs.push({ pageId: pId, url: lnk, snippet: cleanDocMd.substring(0, 1000) });
            }
          } catch (_) {}
        }
      });
    }

    // E. Tải các file đính kèm hợp lệ (Attachments <= 15MB, bỏ qua video/zip) về source/refs/
    if (attachments.length > 0) {
      attachments.forEach(att => {
        if (!att.filename || !att.content) return;
        const safeName = path.basename(att.filename);
        if (/\.(mp4|mov|avi|zip|tar|gz|rar|7z)$/i.test(safeName)) return;
        if (att.size && att.size > 15 * 1024 * 1024) return;
        const destPath = path.join(refsDir, safeName);
        try {
          if (typeof globalThis !== 'undefined' && typeof globalThis.__mockJiraCleanHttpGet === 'function') {
            const mockAtt = globalThis.__mockJiraCleanHttpGet(att.content, authHeaders);
            if (mockAtt !== null && mockAtt !== undefined) {
              fs.writeFileSync(destPath, typeof mockAtt === 'string' ? mockAtt : JSON.stringify(mockAtt), 'utf8');
              downloadedAttachments.push(safeName);
            }
          } else if (!fs.existsSync(destPath)) {
            const { execSync } = require('child_process');
            execSync(`curl -s -L --max-time 15 -H "Authorization: ${authHeaders.Authorization}" -o "${destPath}" "${att.content}"`);
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
              downloadedAttachments.push(safeName);
            }
          } else {
            downloadedAttachments.push(safeName);
          }
        } catch (_) {}
      });
    }

    // Tạo bản tóm tắt đa nguồn để dễ dàng đưa vào prompt LLM hoặc spec generator
    const multiSourceSummary = [
      `# Bối Cảnh Nghiệp Vụ Đa Nguồn: ${issueKey} - ${summary}`,
      `- Loại: ${issueType} | Trạng thái: ${status} | Ưu tiên: ${priority}`,
      `- Phân bổ: ${assignee} | Người tạo: ${reporter} | Sprint: ${sprintName}`,
      parent ? `- Ticket Cha (Epic/Story): [${parent.key}] ${parent.summary} (${parent.status})` : '- Không có ticket cha.',
      '',
      '## Mô Tả Chi Tiết Ticket:',
      cleanDesc || '(Không có mô tả)',
      ''
    ];

    if (hydratedParentDetailText) {
      multiSourceSummary.push('## Chi Tiết Ticket Cha (Parent/Epic):');
      multiSourceSummary.push(hydratedParentDetailText);
    }

    if (comments.length > 0) {
      multiSourceSummary.push('## Trao Đổi & Chốt Nghiệp Vụ (Comments):');
      comments.forEach((c, idx) => {
        multiSourceSummary.push(`### Comment #${idx + 1} (${c.author} - ${c.created}):\n${c.body}\n`);
      });
    }

    if (linkedIssuesList.length > 0) {
      multiSourceSummary.push('## Các Ticket Liên Kết (Linked Issues):');
      linkedIssuesList.forEach(l => {
        multiSourceSummary.push(`- **${l.relationship}** [${l.key}] ${l.summary} (Loại: ${l.issueType}, Trạng thái: ${l.status})`);
        if (l.descriptionMarkdown) {
          multiSourceSummary.push(`  > *Mô tả:* ${l.descriptionMarkdown.substring(0, 300).replace(/\n/g, ' ')}...`);
        }
      });
      multiSourceSummary.push('');
    }

    if (uniqueConfluenceLinks.length > 0) {
      multiSourceSummary.push('## Tài Liệu Confluence Liên Quan:');
      uniqueConfluenceLinks.forEach(lnk => multiSourceSummary.push(`- ${lnk}`));
      if (hydratedConfluenceDocs.length > 0) {
        multiSourceSummary.push('\n### Nội Dung Bóc Tách Từ Confluence:');
        hydratedConfluenceDocs.forEach(d => {
          multiSourceSummary.push(`#### [Confluence #${d.pageId}](${d.url}):\n${d.snippet}...\n`);
        });
      }
      multiSourceSummary.push('');
    }

    if (downloadedAttachments.length > 0) {
      multiSourceSummary.push('## Tài Liệu Đính Kèm Đã Tải Về (`source/refs/`):');
      downloadedAttachments.forEach(fn => multiSourceSummary.push(`- \`source/refs/${fn}\``));
      multiSourceSummary.push('');
    }

    const multiSourceText = multiSourceSummary.join('\n');
    fs.writeFileSync(path.join(sourceDir, 'multi-source-context.md'), multiSourceText, 'utf8');

    fs.writeFileSync(
      path.join(sourceDir, 'jira-issue.json'),
      JSON.stringify({
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
        parent,
        comments,
        attachments,
        downloadedAttachments,
        issueLinks,
        linkedIssues: linkedIssuesList,
        subtasks,
        confluenceLinks: uniqueConfluenceLinks,
        confluenceDocs: hydratedConfluenceDocs,
        descriptionMarkdown: cleanDesc,
        multiSourceContext: multiSourceText,
        fetchedAt: new Date().toISOString()
      }, null, 2),
      'utf8'
    );
    localWorkspaceInfo.found = true;
    localWorkspaceInfo.projectRoot = targetRoot;
  }
} catch (_) {}

// 6. Xây dựng thẻ báo cáo Markdown chi tiết cho Mattermost & Slack
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
const parentSnippet = parent ? `- **Ticket Cha:** [${parent.key}] ${parent.summary} (\`${parent.status}\`)\n` : '';
const commentsSnippet = comments.length > 0 ? `- **Ghi nhận:** ${comments.length} trao đổi/comment nghiệp vụ chốt gần nhất\n` : '';

const reportText = `### 📋 Thông Tin Jira Issue: [${issueKey}](${jiraUrl}) - ${summary}
- **Loại:** \`${issueType}\` | **Trạng thái:** **${status}** | **Ưu tiên:** \`${priority}\`
- **Người xử lý:** **${assignee}** | **Người tạo:** ${reporter}
- **Sprint:** \`${sprintName}\`${components.length > 0 ? (' | **Components:** `' + components.join(', ') + '`') : ''}
${labels.length > 0 ? ('- **Labels:** `' + labels.join(', ') + '`\n') : ''}${parentSnippet}${commentsSnippet}- **Tài liệu tham chiếu:** ${attachments.length} file đính kèm | ${uniqueConfluenceLinks.length} liên kết Confluence | ${issueLinks.length} liên kết Issue
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
    parent,
    comments,
    attachments,
    downloadedAttachments,
    issueLinks,
    linkedIssues: linkedIssuesList,
    subtasks,
    confluenceLinks: uniqueConfluenceLinks,
    confluenceDocs: hydratedConfluenceDocs,
    descriptionMarkdown: cleanDesc,
    descriptionSnippet: cleanDesc.substring(0, 1500),
    localWorkspace: localWorkspaceInfo,
    reportText,
    _triggerSource: triggerSource,
    userName
  }
}];
