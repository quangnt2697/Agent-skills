/**
 * Node Script: Error Log Writer (`scripts/n8n-nodes/ops/error-log-writer.js`)
 *
 * Mục đích: ghi lỗi workflow n8n (dead-letter) ra file `workspace/.n8n-errors.log`
 * (mỗi dòng 1 JSON) thay vì gửi qua kênh chat. `/workspace/` đã nằm trong .gitignore.
 * KHÔNG nuốt lỗi: nếu không ghi được file thì node lỗi để n8n hiển thị execution thất bại.
 */
const fs = require('fs');
const path = require('path');

const procCwd = (() => { try { return require('process').cwd(); } catch (_) { return ''; } })();
const root = ($env && $env.AGENT_WORKSPACE_DIR) || procCwd;
if (!root) {
  throw new Error('Không xác định được thư mục gốc dự án (AGENT_WORKSPACE_DIR) để ghi .n8n-errors.log');
}

const item = $input.first().json || {};
const entry = {
  timestamp: item.timestamp || new Date().toISOString(),
  workflowName: item.workflowName || 'Unknown Workflow',
  workflowId: item.workflowId || 'N/A',
  failedNode: item.failedNode || 'Unknown Node',
  errorMessage: item.errorMessage || 'Không có chi tiết lỗi',
  executionId: item.executionId || 'N/A'
};

const logDir = path.join(root, 'workspace');
const logFile = path.join(logDir, '.n8n-errors.log');
fs.mkdirSync(logDir, { recursive: true });
fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');

return [{ json: { ...item, logFile } }];

