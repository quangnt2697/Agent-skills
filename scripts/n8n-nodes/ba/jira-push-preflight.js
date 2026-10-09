const fs = require('fs');
const path = require('path');

const input = $input.first();
const resolveRes = (input && input.json) || {};
const prepContext = $('Prepare Resolver Input').first()?.json || {};

const triggerSource = prepContext._triggerSource || resolveRes._triggerSource || 'mattermost';
const issueKey = prepContext.issueKey || resolveRes.issueKey || '';
const userName = prepContext.userName || resolveRes.userName || 'User';
const isDryRun = Boolean(prepContext.dryRun || resolveRes.dryRun);

// 1. Kiểm tra kết quả từ Workspace Resolver
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

const specDir = resolveRes.resolvedPath || resolveRes.dirPath || '';
const refinedPath = path.join(specDir, 'refined.md');
const finalPath = path.join(specDir, 'final.md');

let targetFilePath = '';
let specType = '';

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

let markdownContent = '';
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

// 2. Pre-flight Quality Gate (Chuẩn ba-refine & ba-spec)
const qualityErrors = [];

// A. Chặn placeholder chưa điền
if (/\[\.\.\.\]/.test(markdownContent)) {
  qualityErrors.push("Spec còn chứa placeholder chưa điền: `[...]`");
}

// B. Chặn các section nội bộ bị cấm trên Jira
const forbiddenSections = [
  /##\s*Giả định\s*(&|và)\s*Rủi ro/i,
  /##\s*Ngoài Phạm vi/i,
  /##\s*Đánh giá Độ tin cậy/i
];
for (const pattern of forbiddenSections) {
  if (pattern.test(markdownContent)) {
    qualityErrors.push(`Spec còn chứa section nội bộ bị cấm trên Jira: \`${pattern.source}\``);
  }
}

// C. Kiểm tra cấu trúc Acceptance Criteria (bắt buộc có Given/When/Then và ít nhất 1 Scenario)
const hasGiven = /Given\b/i.test(markdownContent);
const hasWhen = /When\b/i.test(markdownContent);
const hasThen = /Then\b/i.test(markdownContent);

if (!hasGiven || !hasWhen || !hasThen) {
  qualityErrors.push("Acceptance Criteria bắt buộc phải có cấu trúc Gherkin chuẩn (`Given` / `When` / `Then`).");
}

const scenarioCount = (markdownContent.match(/Scenario(?:\s+Outline)?\s*:/gi) || []).length;
if (scenarioCount < 2) {
  qualityErrors.push(`Acceptance Criteria cần có tối thiểu 2 Scenarios kiểm thử (hiện có: ${scenarioCount}).`);
}

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

// 3. Quét sơ đồ đính kèm trong diagrams/
let diagramFiles = [];
const diagramDir = path.join(specDir, 'diagrams');
if (fs.existsSync(diagramDir)) {
  try {
    diagramFiles = fs.readdirSync(diagramDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.jpg'))
      .map(f => path.join(diagramDir, f));
  } catch (_) {}
}

// 4. Chuyển đổi Markdown sang ADF (Atlassian Document Format)
const projectRoot = ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Projects/agent-skills';
let adfContent = null;

try {
  const scriptPath = path.join(projectRoot, 'plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js');
  if (fs.existsSync(scriptPath)) {
    const { markdownToAdf } = require(scriptPath);
    adfContent = markdownToAdf(markdownContent);
  }
} catch (e) {}

// Fallback nếu parser bị lỗi
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

const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

return [{
  json: {
    isError: false,
    issueKey,
    project: resolveRes.project || prepContext.project,
    filePath: targetFilePath,
    specType,
    dryRun: isDryRun,
    adfContent,
    tableCount,
    blockCount,
    scenarioCount,
    diagramFiles,
    userName,
    authHeader,
    _triggerSource: triggerSource
  }
}];
