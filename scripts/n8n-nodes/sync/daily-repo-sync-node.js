const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = util.promisify(exec);

let procEnv = {};
try {
  const proc = require('process');
  procEnv = proc.env || {};
} catch (e) {}

const workspaceDir = (typeof $env !== 'undefined' && $env.AGENT_WORKSPACE_DIR)
  || procEnv.AGENT_WORKSPACE_DIR
  || path.resolve(process.cwd());

let scriptPath = path.resolve(workspaceDir, 'scripts/sync/daily-repo-sync.sh');
if (!fs.existsSync(scriptPath)) {
  scriptPath = path.resolve(workspaceDir, 'scripts/daily-repo-sync.sh');
}

let stdout = '';
try {
  const envPath = procEnv.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
  const result = await execAsync(`/bin/bash "${scriptPath}"`, {
    cwd: workspaceDir,
    encoding: 'utf-8',
    env: Object.assign({}, procEnv, { PATH: envPath, AGENT_WORKSPACE_DIR: workspaceDir }),
    timeout: 180000
  });
  stdout = result.stdout || '';
} catch (err) {
  const outStr = err.stdout ? err.stdout.toString('utf-8') : '';
  const errStr = err.stderr ? err.stderr.toString('utf-8') : (err.message || '');
  stdout = outStr + '\n' + errStr;
}

const lines = stdout.split('\n');
let summaryStr = '';
const pulled = [];
const dirty = [];
const errors = [];

for (const line of lines) {
  if (line.startsWith('SUMMARY:')) {
    summaryStr = line.replace('SUMMARY:', '');
  } else if (line.startsWith('PULLED|')) {
    pulled.push(...line.split('|').slice(1));
  } else if (line.startsWith('DIRTY|')) {
    dirty.push(...line.split('|').slice(1));
  } else if (line.startsWith('ERRORS|')) {
    errors.push(...line.split('|').slice(1));
  }
}

// Xử lý trường hợp script lỗi không sinh được SUMMARY
if (!summaryStr) {
  const errDetail = stdout.trim() || 'Không nhận được dữ liệu từ daily-repo-sync.sh';
  const errMsg = '🚨 **[Daily Repo Sync - Lỗi Tiến Trình]**\n> ' + errDetail.split('\n')[0] + '\n\n*Vui lòng kiểm tra log: npm run n8n:logs*';
  return [{ json: { msg: errMsg, reportText: errMsg, total: 0, pulledCount: 0, upToDateCount: 0, dirtyCount: 0, errCount: 1, noGitCount: 0, localCount: 0, error: errDetail } }];
}

// Parse summary
const summaryParts = summaryStr.split(',');
let total = 0, pulledCount = 0, upToDateCount = 0, dirtyCount = 0, errCount = 0, noGitCount = 0, localCount = 0;
summaryParts.forEach(part => {
  const [k, v] = part.split('=');
  if (k === 'total') total = parseInt(v) || 0;
  if (k === 'pulled') pulledCount = parseInt(v) || 0;
  if (k === 'up_to_date') upToDateCount = parseInt(v) || 0;
  if (k === 'dirty') dirtyCount = parseInt(v) || 0;
  if (k === 'errors') errCount = parseInt(v) || 0;
  if (k === 'no_git') noGitCount = parseInt(v) || 0;
  if (k === 'local_only') localCount = parseInt(v) || 0;
});

let emoji = '✅';
if (errCount > 0 || dirtyCount > 0) emoji = '⚠️';

const runTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
let msg = emoji + ` **[Daily Repo Sync - ${runTime}]**\n`;
let skippedDetail = '';
if (noGitCount > 0 || localCount > 0) {
  skippedDetail = ' | Bỏ qua (phi-git/local): ' + (noGitCount + localCount);
}
msg += '> Đã quét **' + total + '** repos. Up-to-date: ' + upToDateCount + ' | Đã pull mới: ' + pulledCount + ' | Cần chú ý: ' + dirtyCount + ' | Lỗi: ' + errCount + skippedDetail + '\n';

if (pulled.length > 0) {
  msg += '\n✅ **Repos đã cập nhật code mới:**\n';
  pulled.forEach(item => {
    const parts = item.split(':');
    if (parts.length >= 3) {
      msg += '- `' + parts[0] + '`: pulled ' + parts[1].replace('↓', '') + ' commits → `' + parts.slice(2).join(':') + '`\n';
    }
  });
}

if (dirty.length > 0) {
  msg += '\n⚠️ **Repos chưa commit (bỏ qua pull):**\n';
  dirty.forEach(item => {
    const parts = item.split(':');
    if (parts.length >= 2) {
      msg += '- `' + parts[0] + '`: ' + parts.slice(1).join(':') + '\n';
    }
  });
}

if (errors.length > 0) {
  msg += '\n❌ **Repos gặp lỗi (Fetch/Pull fail):**\n';
  errors.forEach(item => {
    const parts = item.split(':');
    if (parts.length >= 2) {
      msg += '- `' + parts[0] + '`: ' + parts.slice(1).join(':') + '\n';
    }
  });
}

return [{ json: { msg, reportText: msg, total, pulledCount, upToDateCount, dirtyCount, errCount, noGitCount, localCount } }];
