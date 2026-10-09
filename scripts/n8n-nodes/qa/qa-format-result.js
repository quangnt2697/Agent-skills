const fs = require('fs');
const path = require('path');

const input = $input.first();
const extractNode = (typeof $('Extract issueKey') !== 'undefined') ? $('Extract issueKey').first().json : {};
const issueKey = extractNode.issueKey || input.json.issueKey || '';
const project = extractNode.project || input.json.project || '';
const cwd = input.json.cwd || $env.AGENT_WORKSPACE_DIR || process.cwd();
const targetLabel = project ? (project + ' / ' + issueKey) : issueKey;
const triggerSource = extractNode._triggerSource || input.json._triggerSource || 'webhook';

if (!issueKey || extractNode.error) {
  const errMsg = extractNode.error || 'Thiếu issueKey hợp lệ.';
  return [{ json: { success: false, verdict: 'ERROR', errorCode: 'MISSING_ISSUEKEY', message: errMsg, _triggerSource: triggerSource } }];
}

const execRes = input.json;
const exitCode = execRes.exitCode;
const isTimeout = exitCode === 124 || (execRes.message && execRes.message.includes('TIMEOUT'));

let verdict = 'PASS';
let errorCode = null;

if (isTimeout) {
  verdict = 'TIMEOUT';
  errorCode = 'SUITE_TIMEOUT';
} else if (exitCode === 0) {
  verdict = 'PASS';
} else if (exitCode === 1) {
  verdict = 'FAIL';
  errorCode = 'TEST_FAILED';
} else if (exitCode === 2) {
  verdict = 'ERROR';
  errorCode = 'USER_INTERRUPTION';
} else if (exitCode === 3) {
  verdict = 'ERROR';
  errorCode = 'INTERNAL_ERROR';
} else if (exitCode === 4) {
  verdict = 'ERROR';
  errorCode = 'USAGE_ERROR';
} else if (exitCode === 5) {
  verdict = 'ERROR';
  errorCode = 'NO_TESTS_COLLECTED';
} else {
  verdict = 'ERROR';
  errorCode = 'UNKNOWN_ERROR';
}

const success = (verdict === 'PASS');
const resultDir = path.resolve(cwd, 'workspace', issueKey, 'test', 'result');
if (!fs.existsSync(resultDir)) {
  fs.mkdirSync(resultDir, { recursive: true });
}

const reportMd = [
  `# Báo Cáo Kiểm Thử Tự Động: ${issueKey}`,
  '',
  `| Thuộc tính | Giá trị |`,
  `| :--- | :--- |`,
  `| **Issue Key** | \`${issueKey}\` |`,
  `| **Project** | \`${project || 'default'}\` |`,
  `| **Verdict** | **${verdict}** |`,
  `| **Mã lỗi** | \`${errorCode || 'N/A'}\` |`,
  `| **Thời Gian** | \`${new Date().toISOString()}\` |`
].join('\n');

try {
  fs.writeFileSync(path.join(resultDir, 'report.md'), reportMd, 'utf8');
} catch (e) {
  throw new Error('REPORT_WRITE_FAILED: ' + e.message);
}

const runStatus = {
  issueKey, project, verdict, errorCode, exitCode, timestamp: new Date().toISOString()
};
try {
  fs.writeFileSync(path.join(resultDir, 'run-status.json'), JSON.stringify(runStatus, null, 2), 'utf8');
} catch (e) {
  throw new Error('REPORT_WRITE_FAILED: ' + e.message);
}

const statusIcon = success ? '✅' : (verdict === 'FAIL' ? '❌' : (verdict === 'TIMEOUT' ? '⏱️' : '⛔'));
const message = `🚀 **[QA Automation]** Kết quả chạy kiểm thử cho ticket **${targetLabel}**:\n` +
                `- Verdict: ${statusIcon} **${verdict}**\n` +
                (errorCode ? `- Lỗi: \`${errorCode}\`\n` : '');

return [{
  json: {
    success,
    verdict,
    errorCode,
    message,
    reportText: message,
    issueKey,
    project,
    exitCode,
    _triggerSource: triggerSource
  }
}];
