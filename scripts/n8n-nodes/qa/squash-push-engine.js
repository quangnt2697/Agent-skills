const { exec, spawnSync } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

const input = $input.first();
const resolveRes = input.json || {};
const context = $('Extract & Prepare Input').first()?.json || {};
const issueKey = context.issueKey || resolveRes.issueKey || '';
const project = context.project || resolveRes.project || '';
const triggerSource = context._triggerSource || context.triggerSource || 'internal';
const userName = context.userName || 'User';

if (!issueKey) {
  return [{
    json: {
      success: false,
      isError: true,
      reportText: '🚨 **[Squash Push Lỗi]** Không tìm thấy mã `issueKey` trong yêu cầu.\n> Cú pháp: `/agent [project] push-squash <issueKey>`',
      _triggerSource: triggerSource,
      userName
    }
  }];
}

if (resolveRes.isError || !resolveRes.found) {
  const errMsg = resolveRes.reportText || `Không tìm thấy thư mục workspace cho ticket **${issueKey}**.`;
  return [{
    json: {
      success: false,
      isError: true,
      reportText: `🚨 **[Squash Push Lỗi]** ${errMsg}`,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

let procCwd = '';
try {
  const proc = require('process');
  if (proc && typeof proc.cwd === 'function') procCwd = proc.cwd();
} catch (_) {}
const defaultRoot = ($env && $env.AGENT_WORKSPACE_DIR) || (fs.existsSync('/workspace/package.json') ? '/workspace' : procCwd);
const projectRoot = resolveRes.projectRoot || defaultRoot;
const matchedFiles = resolveRes.matchedFiles || [];
const featureFile = matchedFiles.find(f => f.endsWith('.feature'));

if (!featureFile) {
  return [{
    json: {
      success: false,
      isError: true,
      reportText: `🚨 **[Squash Push Lỗi]** Không tìm thấy file kịch bản BDD (\`.feature\`) trong thư mục test của ticket **${issueKey}**.\n> Đường dẫn tìm kiếm: \`${resolveRes.targetPath || 'workspace/' + issueKey + '/test'}\`\n*👉 Hãy chạy kỹ năng \`qa-auto-design\` hoặc tạo file \`${issueKey}.feature\` trước khi đẩy lên Squash TM.*`,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// Tìm namejira từ final.md nếu có
let namejira = issueKey;
const finalMdCandidates = [
  path.join(projectRoot, 'workspace', 'issues', issueKey, 'spec', 'final.md'),
  path.join(projectRoot, 'workspace', issueKey, 'spec', 'final.md')
];
const finalMdPath = finalMdCandidates.find(p => fs.existsSync(p)) || '';
if (finalMdPath) {
  try {
    const finalContent = fs.readFileSync(finalMdPath, 'utf-8');
    const firstLine = finalContent.split('\n').find(l => l.startsWith('# '));
    if (firstLine) {
      namejira = firstLine.replace(/^#\s*(\[[^\]]+\])?\s*/, '').trim()
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]+/g, '-')
        .replace(/^-+|-+$/g, '').substring(0, 80);
    }
  } catch (_) {}
}

// Xác định đường dẫn script engine squash-push.sh từ repo agent-skills
const agentSkillsRoot = ($env && $env.AGENT_WORKSPACE_DIR) || projectRoot;
const scriptCandidates = [
  path.join(agentSkillsRoot, 'plugins/qa/skills/qa-squash-push/assets/squash-push.sh'),
  path.join(projectRoot, 'plugins/qa/skills/qa-squash-push/assets/squash-push.sh'),
  '/workspace/plugins/qa/skills/qa-squash-push/assets/squash-push.sh'
];

let scriptPath = '';
for (const cand of scriptCandidates) {
  if (fs.existsSync(cand)) {
    scriptPath = cand;
    break;
  }
}

if (!scriptPath) {
  return [{
    json: {
      success: false,
      isError: true,
      reportText: `🚨 **[Squash Push Lỗi]** Không tìm thấy script engine \`squash-push.sh\` tại các thư mục plugins:\n` +
                  scriptCandidates.map(c => `- \`${c}\``).join('\n'),
      _triggerSource: triggerSource,
      userName
    }
  }];
}

const absFeatureFile = path.isAbsolute(featureFile) ? featureFile : path.join(projectRoot, featureFile);
const hasLocalShellDeps = ['bash', 'curl', 'jq'].every((bin) => spawnSync('which', [bin], { encoding: 'utf8' }).status === 0);

if (!hasLocalShellDeps) {
  try {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    const { Buffer } = require('buffer');
    let procEnv = {};
    try { procEnv = require('process').env || {}; } catch (_) {}
    const bridgePort = ($env && $env.HOST_BRIDGE_PORT) || procEnv.HOST_BRIDGE_PORT || '5680';
    const bridgeUrl = (($env && $env.HOST_BRIDGE_URL) || procEnv.HOST_BRIDGE_URL || `http://host.docker.internal:${bridgePort}`).replace(/\/$/, '');
    const tokenPath = ['/home/node/.n8n/host-bridge-token', path.join(projectRoot, '.n8n-data', 'host-bridge-token'), '/workspace/.n8n-data/host-bridge-token'].find((p) => fs.existsSync(p));
    const token = tokenPath ? fs.readFileSync(tokenPath, 'utf8').trim() : (($env && $env.HOST_BRIDGE_TOKEN) || procEnv.HOST_BRIDGE_TOKEN || '');
    const bodyStr = JSON.stringify({ issueKey, project, namejira: namejira || issueKey, featureFile: absFeatureFile, projectRoot });

    const bridgeResp = await new Promise((resolve, reject) => {
      const parsed = new URL(`${bridgeUrl}/squash-push`);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        timeout: 185000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'x-bridge-token': token
        }
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
          catch (e) { reject(new Error(`Host Bridge invalid JSON: ${raw.slice(0, 200)}`)); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Host Bridge squash-push timeout')));
      req.write(bodyStr);
      req.end();
    });

    const b = bridgeResp.data || {};
    if (bridgeResp.status >= 400 || b.isError) {
      const errOut = b.errorOutput || b.error || `Host Bridge HTTP ${bridgeResp.status}`;
      return [{
        json: {
          success: false, isError: true, issueKey, project, featureFile: absFeatureFile,
          errorOutput: errOut,
          reportText: `🚨 **[Squash Push Thất Bại]** Không thể đồng bộ kịch bản Gherkin của **${issueKey}** lên Squash TM:\n\`\`\`text\n${String(errOut).slice(-1200)}\n\`\`\``,
          _triggerSource: triggerSource, userName
        }
      }];
    }
    return [{
      json: {
        success: true, isError: false, issueKey, project,
        featureFile: b.featureFile || absFeatureFile,
        namejira: b.namejira || namejira,
        stdout: b.stdout || '',
        syncMeta: b.syncMeta || null,
        executedVia: 'host-bridge',
        _triggerSource: triggerSource, userName
      }
    }];
  } catch (bridgeErr) {
    return [{
      json: {
        success: false, isError: true, issueKey, project, featureFile: absFeatureFile,
        errorOutput: bridgeErr.message,
        reportText: `🚨 **[Squash Push Thất Bại]** Container thiếu bash/curl/jq và không kết nối được Host Bridge (${bridgeErr.message}). Hãy chạy \`npm run bridge:start\` trên máy host.`,
        _triggerSource: triggerSource, userName
      }
    }];
  }
}

const cmd = `bash "${scriptPath}" "${issueKey}" "${namejira || issueKey}" "${absFeatureFile}"`;

try {
  const result = await execAsync(cmd, {
    cwd: projectRoot,
    timeout: 180000,
    encoding: 'utf-8',
    env: { ...require('process').env }
  });

  const stdout = result.stdout || '';
  
  // Đọc file sync metadata nếu có (ưu tiên workspace/issues/{issueKey}/test/)
  let syncMeta = null;
  const syncJsonCandidates = [
    path.join(projectRoot, 'workspace', 'issues', issueKey, 'test', 'squash_sync.json'),
    path.join(projectRoot, 'workspace', issueKey, 'test', 'squash_sync.json')
  ];
  const syncJsonPath = syncJsonCandidates.find(p => fs.existsSync(p));
  if (syncJsonPath) {
    try {
      syncMeta = JSON.parse(fs.readFileSync(syncJsonPath, 'utf-8'));
    } catch (_) {}
  }

  return [{
    json: {
      success: true,
      isError: false,
      issueKey,
      project,
      featureFile: absFeatureFile,
      namejira,
      stdout,
      syncMeta,
      _triggerSource: triggerSource,
      userName
    }
  }];
} catch (err) {
  const errOutput = (err.stdout || '') + '\n' + (err.stderr || err.message || '');
  return [{
    json: {
      success: false,
      isError: true,
      issueKey,
      project,
      featureFile: absFeatureFile,
      errorOutput: errOutput,
      reportText: `🚨 **[Squash Push Thất Bại]** Không thể đồng bộ kịch bản Gherkin của **${issueKey}** lên Squash TM:\n\`\`\`text\n${errOutput.substring(errOutput.length - 1200)}\n\`\`\``,
      _triggerSource: triggerSource,
      userName
    }
  }];
}
