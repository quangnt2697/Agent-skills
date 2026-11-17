const fs = require('fs');
const path = require('path');

const input = $input.first();
const resolveRes = (input && input.json) || {};
let prepContext = {};
try {
  prepContext = $('Prepare Resolver Input').first()?.json || {};
} catch (_) {}

const triggerSource = prepContext._triggerSource || resolveRes._triggerSource || 'internal';
const issueKey = prepContext.issueKey || resolveRes.issueKey || '';
const userName = prepContext.userName || resolveRes.userName || 'User';
const isDryRun = Boolean(prepContext.dryRun || resolveRes.dryRun);
const isForce = Boolean(prepContext.force || resolveRes.force);
const hasInlinePayload = Boolean(prepContext.hasInlinePayload && typeof prepContext.markdownContent === 'string');
const isExternalCaller = Boolean(hasInlinePayload || prepContext.callerWorkspaceDir);

let targetFilePath = '';
let specDir = '';
let specType = '';
let markdownContent = '';
let inlineAttachments = Array.isArray(prepContext.attachments) ? prepContext.attachments : [];

if (hasInlinePayload) {
  markdownContent = prepContext.markdownContent;
  targetFilePath = prepContext.filePath || `workspace/issues/${issueKey}/spec/refined.md`;
  specDir = path.dirname(targetFilePath);
  const isFinal = path.basename(targetFilePath).toLowerCase().includes('final');
  specType = prepContext.specType || (isFinal ? 'final.md (chuẩn ba-spec)' : 'refined.md (chuẩn ba-refine)');
} else {
  // 1. Kiểm tra kết quả từ Workspace Resolver (fallback khi chạy từ Slack / trong container)
  if (resolveRes.isError || !resolveRes.found) {
    return [{
      json: {
        isError: true,
        errorType: resolveRes.errorType || 'DIR_NOT_FOUND',
        reportText: resolveRes.reportText || `🚨 Không tìm thấy thư mục workspace cho ticket **${issueKey}**.`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  specDir = resolveRes.resolvedPath || resolveRes.dirPath || '';
  const refinedPath = path.join(specDir, 'refined.md');
  const finalPath = path.join(specDir, 'final.md');

  if (fs.existsSync(refinedPath)) {
    targetFilePath = refinedPath;
    specType = 'refined.md (chuẩn ba-refine)';
  } else if (fs.existsSync(finalPath)) {
    targetFilePath = finalPath;
    specType = 'final.md (chuẩn ba-spec)';
  } else {
    return [{
      json: {
        isError: true,
        errorType: 'SPEC_NOT_FOUND',
        reportText: `🚨 **[Không Tìm Thấy Spec]** Ticket **${issueKey}** chưa có file đặc tả chuẩn trong thư mục:\n> \`${specDir}\`\n\n*👉 Cần có ít nhất 1 trong 2 file: \`spec/refined.md\` (từ ba-refine) hoặc \`spec/final.md\` (từ ba-spec) trước khi đẩy lên Jira.*`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  try {
    markdownContent = fs.readFileSync(targetFilePath, 'utf8');
  } catch (e) {
    return [{
      json: {
        isError: true,
        errorType: 'READ_ERROR',
        reportText: `🚨 **[Lỗi Đọc File]** Không thể đọc nội dung file tại \`${targetFilePath}\`: ${e.message}`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  // Thu thập ảnh local từ diagrams/ khi chạy ở Resolver Mode
  const diagramDir = path.join(specDir, 'diagrams');
  if (fs.existsSync(diagramDir)) {
    try {
      const files = fs.readdirSync(diagramDir).filter(f => /\.(png|jpe?g|svg)$/i.test(f));
      inlineAttachments = files.map(f => {
        const full = path.join(diagramDir, f);
        const ext = path.extname(f).toLowerCase();
        const mimeType = ext === '.svg' ? 'image/svg+xml' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');
        return {
          filename: f,
          mimeType,
          dataBase64: fs.readFileSync(full).toString('base64')
        };
      });
    } catch (_) {}
  }
}

if (!markdownContent.trim()) {
  return [{
    json: {
      isError: true,
      errorType: 'EMPTY_FILE',
      reportText: `🚨 **[File Spec Rỗng]** File tại \`${targetFilePath}\` không có nội dung.`,
      _triggerSource: triggerSource,
      userName,
      issueKey
    }
  }];
}

// 2. Pre-flight Quality Gate (Chuẩn ba-refine; bỏ qua khi --force hoặc final.md)
const isFinalSpec = path.basename(targetFilePath).toLowerCase().includes('final');
const qualityErrors = [];

if (!isForce && !isFinalSpec) {
  if (/\[\.\.\.\]/.test(markdownContent)) {
    qualityErrors.push("Spec còn chứa placeholder chưa điền: `[...]`");
  }

  const forbiddenSections = [
    /##\s*Giả định\s*(&|và)\s*Rủi ro/i,
    /##\s*Ngoài Phạm vi/i,
    /##\s*Đánh giá Độ tin cậy/i,
    /##\s*(?:🧱\s*)?Technical Notes/i
  ];
  for (const pattern of forbiddenSections) {
    if (pattern.test(markdownContent)) {
      qualityErrors.push(`Spec còn chứa section nội bộ bị cấm trên Jira: \`${pattern.source}\``);
    }
  }

  if (targetFilePath.endsWith('refined.md')) {
    if (!/^##\s*(?:🧩\s*)?User Story/im.test(markdownContent)) {
      qualityErrors.push("Spec refine bắt buộc phải có `## 🧩 User Story` (`**As a**`, `**I want**`, `**So that**`).");
    }
  }

  const hasGiven = /Given\b/i.test(markdownContent);
  const hasWhen = /When\b/i.test(markdownContent);
  const hasThen = /Then\b/i.test(markdownContent);

  if (!hasGiven || !hasWhen || !hasThen) {
    qualityErrors.push("Acceptance Criteria bắt buộc phải có cấu trúc Gherkin chuẩn (`Given` / `When` / `Then`).");
  }

  const scenarioCountCheck = (markdownContent.match(/Scenario(?:\s+Outline)?\s*:/gi) || []).length;
  if (scenarioCountCheck < 2) {
    qualityErrors.push(`Acceptance Criteria cần có tối thiểu 2 Scenarios kiểm thử (hiện có: ${scenarioCountCheck}).`);
  }

  const lines = markdownContent.split('\n');
  let inGherkin = false;
  for (const line of lines) {
    if (/^```gherkin/i.test(line)) inGherkin = true;
    else if (/^```/.test(line)) inGherkin = false;
    else if (inGherkin) {
      if (/^\s*@[a-zA-Z0-9_-]+/.test(line)) {
        qualityErrors.push(`Acceptance Criteria không được chứa automation @tag: "${line.trim()}".`);
        break;
      }
      if (/Scenario(?:\s+Outline)?\s*:.*\[AC(?:-\d+(?:\.\d+)?)?\]/i.test(line)) {
        qualityErrors.push(`Scenario không được gắn tag mã [AC]: "${line.trim()}".`);
        break;
      }
    }
  }
}

const scenarioCount = (markdownContent.match(/Scenario(?:\s+Outline)?\s*:/gi) || []).length;

if (qualityErrors.length > 0) {
  const errMsg = `⚠️ **[Chặn Ghi Đè - Spec Chưa Đạt Chuẩn]** File \`${path.basename(targetFilePath)}\` của ticket **${issueKey}** chưa hoàn thiện:\n` +
                 qualityErrors.map(e => `> - ${e}`).join('\n') + '\n\n' +
                 `*Vui lòng mở file \`${targetFilePath}\` để hoàn thiện spec trước khi đẩy lên Jira.*`;
  return [{
    json: {
      isError: true,
      errorType: 'PREFLIGHT_FAILED',
      reportText: errMsg,
      _triggerSource: triggerSource,
      userName,
      issueKey,
      filePath: targetFilePath
    }
  }];
}

// 3. Tải parser Markdown -> ADF (CommonJS helper, dùng được cả trong n8n và ESM CLI)
let procCwd = '';
try {
  const proc = require('process');
  if (proc && typeof proc.cwd === 'function') procCwd = proc.cwd();
} catch (_) {}
const projectRoot = ($env && $env.AGENT_WORKSPACE_DIR) || (fs.existsSync('/workspace/package.json') ? '/workspace' : procCwd);

let markdownToAdfFn = null;
const parserCandidates = [
  path.join(projectRoot, 'scripts/lib/jira-adf.cjs'),
  '/workspace/scripts/lib/jira-adf.cjs'
];
for (const cand of parserCandidates) {
  try {
    if (fs.existsSync(cand)) {
      const mod = require(cand);
      if (mod && typeof mod.markdownToAdf === 'function') {
        markdownToAdfFn = mod.markdownToAdf;
        break;
      }
    }
  } catch (_) {}
}

const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

// 4. Khi Live Push: lấy attachments hiện có + oldDescription để backup, và upload mockup PNG base64 nếu có
const attachmentMap = {};
let oldDescription = null;
let uploadedCount = 0;

if (!isDryRun && baseUrl && email && token && typeof fetch === 'function') {
  try {
    const issueRes = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=attachment,description`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    if (issueRes.ok) {
      const issueData = await issueRes.json();
      oldDescription = issueData?.fields?.description || null;
      const existing = issueData?.fields?.attachment || [];
      for (const att of existing) {
        attachmentMap[att.filename] = {
          id: att.id,
          filename: att.filename,
          content: att.content,
          size: att.size
        };
      }
    }
  } catch (_) {}

  for (const att of inlineAttachments) {
    if (!att || !att.filename || !att.dataBase64) continue;
    try {
      const buf = Buffer.from(att.dataBase64, 'base64');
      const blob = new Blob([buf], { type: att.mimeType || 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, path.basename(att.filename));

      const uploadRes = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'X-Atlassian-Token': 'no-check'
        },
        body: formData
      });
      if (uploadRes.ok) {
        const uploadedList = await uploadRes.json();
        for (const item of uploadedList) {
          attachmentMap[item.filename] = {
            id: item.id,
            filename: item.filename,
            content: item.content,
            size: item.size
          };
          uploadedCount++;
        }
      }
    } catch (_) {}
  }
}

// 5. Chuyển đổi Markdown sang ADF kèm attachmentMap thật
let adfContent = null;
if (markdownToAdfFn) {
  try {
    adfContent = markdownToAdfFn(markdownContent, attachmentMap);
  } catch (_) {}
}

if (!adfContent || !adfContent.content) {
  adfContent = {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: markdownContent }]
      }
    ]
  };
}

const tableCount = (adfContent.content || []).filter(n => n.type === 'table').length;
const blockCount = (adfContent.content || []).length;
const diagramFiles = inlineAttachments.map(a => a.filename).filter(Boolean);

return [{
  json: {
    isError: false,
    issueKey,
    project: resolveRes.project || prepContext.project,
    filePath: targetFilePath,
    specType,
    dryRun: isDryRun,
    force: isForce,
    isExternalCaller,
    adfContent,
    oldDescription,
    attachmentMap,
    uploadedCount,
    tableCount,
    blockCount,
    scenarioCount,
    diagramFiles,
    userName,
    authHeader,
    _triggerSource: triggerSource
  }
}];
