/**
 * Node Script: Run Security Scanner (`scripts/n8n-nodes/security/run-security-scanner.js`)
 *
 * Thực thi `npm audit --json` an toàn (không shell interpolation, có kiểm tra projectPath).
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);

const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;

const defaultRoot = path.resolve(($env && $env.AGENT_WORKSPACE_DIR) || process.cwd());
const allowedRoots = [
  defaultRoot,
  path.resolve(process.cwd()),
  $env && $env.PROJECTS_ROOT ? path.resolve($env.PROJECTS_ROOT) : null
].filter(Boolean);

const requestedPath = body.projectPath ? path.resolve(String(body.projectPath)) : defaultRoot;
const isInsideAllowed = allowedRoots.some(
  (root) => requestedPath === root || requestedPath.startsWith(root + path.sep)
);

let auditOutput = '';
if (!isInsideAllowed || !fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isDirectory()) {
  auditOutput = JSON.stringify({
    error: `Từ chối quét: projectPath "${requestedPath}" không hợp lệ hoặc nằm ngoài phạm vi workspace được phép.`
  });
} else {
  try {
    const res = await execFileAsync('npm', ['audit', '--json'], {
      cwd: requestedPath,
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024
    });
    auditOutput = res.stdout || '';
  } catch (err) {
    // npm audit trả về exit code 1 nếu phát hiện lỗ hổng, stdout vẫn chứa JSON đầy đủ
    auditOutput = err.stdout || err.message || '';
  }
}

return [{
  json: {
    projectPath: requestedPath,
    auditOutput,
    scanContent: body.scanContent || '',
    _triggerSource: 'security-scan'
  }
}];
