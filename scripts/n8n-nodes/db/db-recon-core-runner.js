/**
 * Node Script: Execute Core Recon Engine
 * (`scripts/n8n-nodes/db/db-recon-core-runner.js`)
 *
 * Thực thi bộ runner `scripts/db/db-recon-core.js` qua child_process hoặc dynamic import
 * để lấy kết quả đối chiếu của 4 câu query.
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);

const input = $input.first();
const raw = (input && input.json) || {};
const body = raw.body || raw;

const now = new Date();
const targetDate = body.date || raw.date || now.toISOString().slice(0, 10);

const workspaceDir = (typeof $env !== 'undefined' && $env.AGENT_WORKSPACE_DIR)
  || (typeof process !== 'undefined' && process.env && process.env.AGENT_WORKSPACE_DIR)
  || path.resolve(process.cwd());

const scriptPath = path.resolve(workspaceDir, 'scripts/db/db-recon-core.js');

let stdout = '';
try {
  const envPath = (process.env && process.env.PATH) || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
  const result = await execAsync(`node "${scriptPath}" --date "${targetDate}" --json`, {
    cwd: workspaceDir,
    encoding: 'utf-8',
    env: Object.assign({}, process.env, { PATH: envPath, AGENT_WORKSPACE_DIR: workspaceDir, METABASE_ENV: 'prod' }),
    timeout: 120000
  });
  stdout = result.stdout || '';
} catch (err) {
  stdout = (err.stdout ? err.stdout.toString('utf-8') : '') || (err.message || '');
}

let outcome = null;
try {
  // Tìm khối JSON trong stdout
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    outcome = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  outcome = {
    date: targetDate,
    error: `Không thể parse output từ db-recon-core.js: ${stdout.slice(0, 200)}`,
    results: {}
  };
}

if (!outcome) {
  outcome = {
    date: targetDate,
    error: `Không nhận được dữ liệu từ db-recon-core.js (${stdout.slice(0, 200)})`,
    results: {}
  };
}

return [{
  json: {
    targetDate,
    outcome
  }
}];
