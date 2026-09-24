const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

const input = $input.first();
const resolveRes = input.json || {};
const context = $('Extract & Prepare Input').first()?.json || {};
const issueKey = context.issueKey || resolveRes.issueKey || '';
const project = context.project || resolveRes.project || '';
const triggerSource = context._triggerSource || context.triggerSource || 'mattermost';
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

const projectRoot = resolveRes.projectRoot || (($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Desktop/Project/Test/agent-skills');
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
const finalMdPath = path.join(projectRoot, 'workspace', issueKey, 'spec', 'final.md');
if (fs.existsSync(finalMdPath)) {
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
const agentSkillsRoot = ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Desktop/Project/Test/agent-skills';
const scriptCandidates = [
  path.join(agentSkillsRoot, 'plugins/qa/skills/qa-squash-push/assets/squash-push.sh'),
  '/Users/qa-quangnt/Desktop/Project/Test/agent-skills/plugins/qa/skills/qa-squash-push/assets/squash-push.sh',
  path.join(projectRoot, 'plugins/qa/skills/qa-squash-push/assets/squash-push.sh')
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
const cmd = `bash "${scriptPath}" "${issueKey}" "${namejira || issueKey}" "${absFeatureFile}"`;

try {
  const result = await execAsync(cmd, {
    cwd: projectRoot,
    timeout: 180000,
    encoding: 'utf-8',
    env: { ...require('process').env }
  });

  const stdout = result.stdout || '';
  
  // Đọc file sync metadata nếu có
  let syncMeta = null;
  const syncJsonPath = path.join(projectRoot, 'workspace', issueKey, 'test', 'squash_sync.json');
  if (fs.existsSync(syncJsonPath)) {
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
