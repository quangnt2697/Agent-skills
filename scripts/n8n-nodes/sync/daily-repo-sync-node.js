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

const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;
const params = json.params || body.params || {};

// Trích xuất target project / group nếu được truyền vào từ caller
let targetProject = (params.project || body.project || json.project || '').trim();
let targetBranch = (params.branch || body.branch || json.branch || '').trim();

// Trích xuất _triggerSource để phân luồng response
let triggerSource = json._triggerSource || body._triggerSource || 'cron';
try {
  const trigNode = $('Schedule Trigger (09:00 Mon-Fri)').first();
  if (trigNode && trigNode.json && Object.keys(trigNode.json).length > 0) {
    triggerSource = 'cron';
  }
} catch (_) {}

try {
  const execTrig = $('Execute Workflow Trigger').first();
  if (execTrig && execTrig.json && Object.keys(execTrig.json).length > 0) {
    triggerSource = 'executeWorkflow';
  }
} catch (_) {}

// Xây dựng lệnh gọi repo-sync.js engine
const repoSyncScript = path.resolve(workspaceDir, 'scripts/sync/repo-sync.js');
let syncCmd = `node "${repoSyncScript}"`;

if (targetProject) {
  syncCmd += ` -p "${targetProject}"`;
  if (targetBranch) {
    syncCmd += ` -b "${targetBranch}"`;
  }
  syncCmd += ` --stash`;
} else {
  // Mặc định cron đầu ngày: quét và pull toàn bộ các nhánh cho tất cả các repos
  syncCmd += ` --all --stash`;
}

let stdout = '';
try {
  const envPath = procEnv.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
  const result = await execAsync(syncCmd, {
    cwd: workspaceDir,
    encoding: 'utf-8',
    env: Object.assign({}, procEnv, { PATH: envPath, AGENT_WORKSPACE_DIR: workspaceDir }),
    timeout: 300000 // 5 phút cho multi-repo fetch & pull
  });
  stdout = result.stdout || '';
} catch (err) {
  const outStr = err.stdout ? err.stdout.toString('utf-8') : '';
  const errStr = err.stderr ? err.stderr.toString('utf-8') : (err.message || '');
  stdout = outStr + '\n' + errStr;
}

// Bóc tách bảng Markdown Báo Cáo từ stdout
let reportText = '';
const reportIndex = stdout.indexOf('### 📊 Báo Cáo');
if (reportIndex !== -1) {
  reportText = stdout.substring(reportIndex).trim();
} else {
  reportText = stdout.trim() || 'Không có kết quả từ repo-sync engine.';
}

// Trích xuất thống kê tổng kết
let totalCount = 0;
let pulledCount = 0;
let upToDateCount = 0;
let resetCount = 0;
let errCount = 0;

const summaryMatch = reportText.match(/\*\*Tổng kết:\*\*\s*(\d+)\s*repos.*🟢\s*Cập nhật:\s*(\d+).*⚪\s*Mới nhất:\s*(\d+).*🔄\s*Đã reset:\s*(\d+).*❌\s*Cảnh báo\/Lỗi:\s*(\d+)/i);
if (summaryMatch) {
  totalCount = parseInt(summaryMatch[1], 10) || 0;
  pulledCount = parseInt(summaryMatch[2], 10) || 0;
  upToDateCount = parseInt(summaryMatch[3], 10) || 0;
  resetCount = parseInt(summaryMatch[4], 10) || 0;
  errCount = parseInt(summaryMatch[5], 10) || 0;
}

const runTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const targetLabel = targetProject ? `Target: \`${targetProject}\`` : 'Toàn Bộ Repos';
let headerEmoji = '✅';
if (errCount > 0) headerEmoji = '⚠️';
if (pulledCount > 0) headerEmoji = '🚀';

let finalMessage = `${headerEmoji} **[Repo Sync - ${runTime}]** (${targetLabel})\n\n` + reportText;

return [{
  json: {
    msg: finalMessage,
    reportText: finalMessage,
    targetProject,
    targetBranch,
    total: totalCount,
    pulledCount,
    upToDateCount,
    resetCount,
    errCount,
    _triggerSource: triggerSource
  }
}];
