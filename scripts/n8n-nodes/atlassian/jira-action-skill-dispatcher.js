/**
 * Node Script: Jira Action Skill Dispatcher (`scripts/n8n-nodes/atlassian/jira-action-skill-dispatcher.js`)
 *
 * Thực thi skill thật khi người dùng click vào Action Link trên Slack:
 * 1. Phân loại skill theo cơ chế Fast-Path nội bộ của n8n:
 *    - `qa-run-test`: Gọi webhook nội bộ `qa-run-test` để chạy pytest thật, lấy log và exitCode
 *    - `ba-spec` / `ba-refine`: Gọi webhook nội bộ `jira-prep` để bóc tách dữ liệu Jira sạch và tạo workspace issue
 *    - Các skill khác: Khởi chạy qua CLI (nếu có) hoặc kích hoạt Fast-Path pipeline
 * 2. Bắt lỗi nguyên văn (Catch Error) và gửi thông báo đỏ chi tiết về SLACK_WEBHOOK_URL
 * 3. Báo cáo trung thực kết quả, tuyệt đối không báo giả "thành công" khi chưa thực thi thật.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const firstInput = (typeof $input !== 'undefined' && typeof $input.first === 'function') ? $input.first() : null;
const rawFirst = (firstInput && firstInput.json) || {};

// Trích xuất query parameters (từ Webhook GET) hoặc body (POST)
const query = rawFirst.query || rawFirst;
const skill = String(query.skill || rawFirst.skill || '').trim().replace(/^\//, '');
const issueKey = String(query.issueKey || rawFirst.issueKey || '').toUpperCase().trim();
let threadTs = String(query.thread_ts || query.threadTs || rawFirst.thread_ts || rawFirst.threadTs || '').trim();

const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const SKILL_LABELS = {
  'ba-refine': 'Refine task',
  'ba-spec': 'Phân tích yêu cầu',
  'ba-push-jira': 'Cập nhật lên Jira',
  'qa-test-design': 'Thiết kế test',
  'qa-auto-design': 'Tạo kịch bản tự động',
  'qa-run-test': 'Thực thi test',
  'qa-full-pipeline': 'Kiểm thử toàn trình',
  'qa-squash-push': 'Đồng bộ Squash TM'
};

// Hàm làm sạch thông báo cho người dùng cuối (loại bỏ HTML, đường dẫn kỹ thuật, câu lệnh CLI)
function toCleanUserText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<!DOCTYPE[^>]*>[\s\S]*?<\/html>/gi, 'Dịch vụ đích phản hồi lỗi kết nối.')
    .replace(/<[^>]*>/g, ' ')
    .replace(/workspace\/issues\/[^\s,.]+/gi, 'thư mục công việc')
    .replace(/\.n8n-data\/[^\s,.]+/gi, 'hàng đợi hệ thống')
    .replace(/--[a-z-]+/gi, '')
    .replace(/\/(ba-refine|ba-spec|ba-push-jira|qa-test-design|qa-auto-design|qa-run-test|qa-full-pipeline|qa-squash-push)/gi, (m, s) => SKILL_LABELS[s.toLowerCase()] || s)
    .replace(/\s+/g, ' ')
    .trim();
}

const skillLabel = SKILL_LABELS[skill] || 'Thao tác công việc';

if (!skill || !issueKey) {
  const errorMsg = 'Thiếu thông tin mã công việc hoặc thao tác cần thực hiện.';
  return [{
    json: {
      success: false,
      isError: true,
      skill,
      issueKey,
      error: errorMsg,
      slackNotifyPayload: {
        text: `⚠️ *Chưa thể thực hiện yêu cầu*\nLý do: ${errorMsg}`,
        ...(threadTs ? { thread_ts: threadTs } : {})
      }
    }
  }];
}

let wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || '';
if (!wsDir || !fs.existsSync(wsDir)) {
  if (fs.existsSync('/workspace/package.json')) {
    wsDir = '/workspace';
  } else {
    try {
      const proc = require('process');
      if (proc && typeof proc.cwd === 'function') wsDir = proc.cwd();
    } catch (_) {}
  }
}

// Đọc threadTs và summary từ .cache/my-tasks-state.json nếu có
let taskSummary = '';
try {
  const cacheFile = path.resolve(wsDir, '.cache', 'my-tasks-state.json');
  if (fs.existsSync(cacheFile)) {
    const diskCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8') || '{}');
    const cachedTask = diskCache[issueKey];
    if (cachedTask) {
      if (!threadTs && cachedTask.threadTs) threadTs = String(cachedTask.threadTs);
      if (cachedTask.summary) taskSummary = String(cachedTask.summary);
    }
  }
} catch (_) {}

const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const jiraUrl = baseUrl ? `${baseUrl}/browse/${issueKey}` : issueKey;
const n8nBase = (($env && $env.N8N_BASE_URL) || `${($env && $env.N8N_PROTOCOL) || 'http'}://${($env && $env.N8N_HOST) || 'localhost'}:${($env && $env.N8N_PORT) || '5678'}`).replace(/\/+$/, '');
const webhookBase = `${n8nBase}/webhook/agent-trigger-skill`;
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
const allowInsecureTls = String(((typeof $env !== 'undefined' && $env) ? $env.ALLOW_INSECURE_TLS : '') || process.env.ALLOW_INSECURE_TLS || '').toLowerCase() === 'true';

let executionSuccess = false;
let executionMessage = '';
let executionError = null;
let nextActionLinks = [];

const ALLOWED_SKILLS = [
  'ba-spec',
  'ba-refine',
  'ba-push-jira',
  'qa-test-design',
  'qa-auto-design',
  'qa-run-test',
  'qa-full-pipeline',
  'qa-squash-push'
];

// HÀM GỌI TRỰC TIẾP JIRA CLOUD REST API (Tránh gọi vòng lại webhook n8n gây nghẽn Single Task Runner)
async function fetchJiraIssueDirect(key) {
  const sprintField = ($env && $env.JIRA_SPRINT_CUSTOM_FIELD) || 'customfield_10018';
  const fields = `summary,description,status,assignee,priority,reporter,issuetype,comment,parent,issuelinks,attachment,${sprintField}`;
  const url = `${baseUrl}/rest/api/3/issue/${key}?fields=${fields}`;
  const headers = {
    'Authorization': authHeader,
    'Accept': 'application/json'
  };

  if (typeof fetch === 'function') {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Jira API trả về HTTP ${res.status} cho ${key}: ${txt.slice(0, 200)}`);
    }
    return await res.json();
  }

  const inlineScript = `
    ${allowInsecureTls ? "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';" : ''}
    (async () => {
      const res = await fetch(${JSON.stringify(url)}, {
        method: 'GET',
        headers: ${JSON.stringify(headers)}
      });
      const txt = await res.text();
      if (!res.ok) {
        process.stderr.write('Jira API HTTP ' + res.status + ': ' + txt.slice(0, 200));
        process.exit(1);
      }
      process.stdout.write(txt);
    })().catch(e => {
      process.stderr.write(e.message || String(e));
      process.exit(1);
    });
  `;
  const sub = spawnSync('node', ['-e', inlineScript], { encoding: 'utf8', timeout: 25000 });
  if (sub.status !== 0) {
    throw new Error(`Không thể lấy dữ liệu Jira cho ${key}: ${sub.stderr || sub.stdout || 'exit ' + sub.status}`);
  }
  return JSON.parse(sub.stdout || '{}');
}

// Hàm trích xuất văn bản từ Jira ADF hoặc string
function extractPlainDescription(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractPlainDescription).join('');
  const type = node.type || '';
  const content = node.content || [];
  if (type === 'text') return node.text || '';
  if (type === 'hardBreak') return '\n';
  if (type === 'paragraph' || type === 'heading' || type === 'listItem' || type === 'codeBlock') {
    return content.map(extractPlainDescription).join('') + '\n';
  }
  return content.map(extractPlainDescription).join('');
}

// HÀM THỬ CHẠY AGENT CLI TRỰC TIẾP HOẶC ĐẨY VÀO HOST QUEUE (.n8n-data/skill-queue.json)
function dispatchToAgentCliOrHostQueue(skillName, key, extraNote = '') {
  const autoFlag = ['ba-refine', 'ba-spec', 'qa-test-design', 'qa-auto-design', 'qa-full-pipeline'].includes(skillName) ? ' --auto' : '';
  const promptCmd = `/${skillName} ${key}${autoFlag}`;
  const label = SKILL_LABELS[skillName] || skillName;

  const candidateClis = [
    ($env && $env.AGENT_CLI_PATH),
    '/opt/homebrew/bin/agy',
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/agy',
    '/usr/local/bin/claude',
    'agy',
    'claude'
  ].filter(Boolean);

  for (const cli of candidateClis) {
    try {
      const check = spawnSync('which', [cli], { encoding: 'utf8' });
      if (check.status === 0 || fs.existsSync(cli)) {
        const runCmd = spawnSync(cli, ['-p', promptCmd, '--dangerously-skip-permissions'], {
          cwd: wsDir,
          timeout: 180000,
          encoding: 'utf8'
        });
        if (runCmd.status === 0) {
          return {
            ok: true,
            msg: `${extraNote ? extraNote + '\n> ' : ''}Đã hoàn tất *${label}* cho *${key}*.`
          };
        } else {
          return {
            ok: false,
            err: toCleanUserText(runCmd.stderr || runCmd.stdout || 'Quá trình xử lý gặp sự cố và dừng sớm.')
          };
        }
      }
    } catch (_) {}
  }

  // Nếu đang chạy trong Docker container (không có binary agy/claude của macOS host),
  // ghi vào .n8n-data/skill-queue.json để Host Runner (n8n-autostart.js) thực thi tức thì qua WatchPaths và báo kết quả về thread Slack
  const queueDir = path.resolve(wsDir, '.n8n-data');
  if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
  const queueFile = path.resolve(queueDir, 'skill-queue.json');
  let queue = [];
  if (fs.existsSync(queueFile)) {
    try {
      queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      if (!Array.isArray(queue)) queue = [];
    } catch (_) {
      queue = [];
    }
  }
  queue.push({
    id: `${key}-${skillName}-${Date.now()}`,
    skill: skillName,
    promptCmd,
    issueKey: key,
    summary: taskSummary || '',
    threadTs: threadTs || null,
    requestedAt: new Date().toISOString(),
    status: 'pending'
  });
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2), 'utf8');

  const issueTraceDir = path.resolve(wsDir, 'workspace', 'issues', key, 'trace');
  if (!fs.existsSync(issueTraceDir)) fs.mkdirSync(issueTraceDir, { recursive: true });
  const auditFile = path.resolve(issueTraceDir, 'action-trigger.log');
  fs.appendFileSync(auditFile, `[${new Date().toISOString()}] QUEUED: ${promptCmd} for ${key}\n`, 'utf8');

  return {
    ok: true,
    msg: `${extraNote ? extraNote + '\n> ' : ''}Đã tiếp nhận yêu cầu *${label}* và đang xử lý tự động (kết quả sẽ gửi vào luồng này ngay khi hoàn tất).`
  };
}

const threadQuery = threadTs ? `&thread_ts=${encodeURIComponent(threadTs)}` : '';

try {
  if (!ALLOWED_SKILLS.includes(skill)) {
    throw new Error('Thao tác yêu cầu không hợp lệ hoặc không được hỗ trợ.');
  }

  if (skill === 'qa-run-test') {
    // 1. PRE-FLIGHT & THỰC THI PYTEST CHO QA-RUN-TEST
    const testDir = path.resolve(wsDir, 'workspace', 'issues', issueKey, 'test');
    if (!fs.existsSync(testDir)) {
      nextActionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
      throw new Error(`Chưa có dữ liệu kiểm thử cho công việc ${issueKey}. Vui lòng chọn Thiết kế test trước.`);
    }
    const resultDir = path.resolve(testDir, 'result');
    if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });
    const logFile = path.join(resultDir, 'test-output.log');
    const junitFile = path.join(resultDir, 'junit.xml');

    const pyCheck = spawnSync('which', ['pytest'], { encoding: 'utf8' });
    if (pyCheck.status === 0) {
      const pyRes = spawnSync('pytest', [
        testDir,
        '-v',
        '--tb=short',
        '--timeout=60',
        `--junitxml=${junitFile}`
      ], { cwd: wsDir, encoding: 'utf8', timeout: 300000 });
      fs.writeFileSync(logFile, (pyRes.stdout || '') + '\n' + (pyRes.stderr || ''), 'utf8');
      if (pyRes.status === 0) {
        executionSuccess = true;
        executionMessage = `Toàn bộ kịch bản kiểm thử của *${issueKey}* đã vượt qua thành công ✅.`;
      } else {
        nextActionLinks.push(`<${webhookBase}?skill=qa-auto-design&issueKey=${issueKey}${threadQuery}|🤖 Tạo kịch bản tự động>`);
        nextActionLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${issueKey}${threadQuery}|▶️ Thực thi test>`);
        throw new Error(toCleanUserText(pyRes.stderr || pyRes.stdout || 'Có kịch bản kiểm thử chưa đạt yêu cầu.').slice(-350));
      }
    } else {
      const cliRes = dispatchToAgentCliOrHostQueue(skill, issueKey);
      executionSuccess = cliRes.ok;
      executionMessage = cliRes.msg || '';
      executionError = cliRes.err || null;
    }
  } else if (skill === 'qa-auto-design') {
    // 2. PRE-FLIGHT CHECK CHO QA-AUTO-DESIGN: Bắt buộc phải có file .feature trước
    const testDir = path.resolve(wsDir, 'workspace', 'issues', issueKey, 'test');
    const hasFeature = fs.existsSync(testDir) && fs.readdirSync(testDir).some(f => f.endsWith('.feature'));
    if (!hasFeature) {
      nextActionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
      throw new Error(`Chưa có kịch bản kiểm thử cho công việc ${issueKey}. Vui lòng chọn Thiết kế test trước.`);
    }
    const cliRes = dispatchToAgentCliOrHostQueue(skill, issueKey);
    executionSuccess = cliRes.ok;
    executionMessage = cliRes.msg || '';
    executionError = cliRes.err || null;
    nextActionLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${issueKey}${threadQuery}|▶️ Thực thi test>`);
  } else if (skill === 'ba-push-jira') {
    // 3. PUSH SPEC ĐÃ DUYỆT LÊN JIRA (Khi user bấm Duyệt & Push từ Slack)
    const specDir = path.resolve(wsDir, 'workspace', 'issues', issueKey, 'spec');
    const refinedPath = path.resolve(specDir, 'refined.md');
    const draftPath = path.resolve(specDir, 'refined-draft.md');
    const finalPath = path.resolve(specDir, 'final.md');
    const targetSpec = [refinedPath, draftPath, finalPath].find(p => fs.existsSync(p));
    if (!targetSpec) {
      nextActionLinks.push(`<${webhookBase}?skill=ba-refine&issueKey=${issueKey}${threadQuery}|✏️ Refine task>`);
      throw new Error(`Chưa có tài liệu phân tích cho công việc ${issueKey}. Vui lòng chọn Refine task trước.`);
    }
    const pushScript = path.resolve(wsDir, 'plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js');
    if (fs.existsSync(pushScript)) {
      const pushRes = spawnSync('node', [pushScript, issueKey, targetSpec], {
        cwd: wsDir,
        env: allowInsecureTls ? { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } : { ...process.env },
        encoding: 'utf8',
        timeout: 60000
      });
      if (pushRes.status === 0) {
        executionSuccess = true;
        executionMessage = `Đã cập nhật nội dung phân tích lên mô tả công việc *${issueKey}* trên Jira ✅.`;
        nextActionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
      } else {
        throw new Error(toCleanUserText(pushRes.stderr || pushRes.stdout || 'Không thể cập nhật nội dung lên Jira.').slice(-350));
      }
    } else {
      const cliRes = dispatchToAgentCliOrHostQueue(skill, issueKey);
      executionSuccess = cliRes.ok;
      executionMessage = cliRes.msg || '';
      executionError = cliRes.err || null;
    }
  } else if (skill === 'ba-spec' || skill === 'ba-refine' || skill === 'qa-test-design' || skill === 'qa-full-pipeline') {
    // 4. ĐỒNG BỘ TRỰC TIẾP JIRA CLOUD API + AUTO-BOOTSTRAP SPEC + DISPATCH SKILL
    const jiraData = await fetchJiraIssueDirect(issueKey);
    const fields = jiraData.fields || {};
    const summary = fields.summary || '';
    if (!summary) {
      throw new Error(`Không thể lấy thông tin công việc ${issueKey} từ Jira.`);
    }
    taskSummary = summary;

    const issueDir = path.resolve(wsDir, 'workspace', 'issues', issueKey);
    const sourceDir = path.resolve(issueDir, 'source');
    const specDir = path.resolve(issueDir, 'spec');
    const traceDir = path.resolve(issueDir, 'trace');
    if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });
    if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });

    const descPlain = extractPlainDescription(fields.description).trim();
    const cleanContext = {
      issueKey: jiraData.key || issueKey,
      summary,
      status: fields.status?.name || 'Unknown',
      issueType: fields.issuetype?.name || 'Task',
      priority: fields.priority?.name || 'Medium',
      assignee: fields.assignee?.displayName || '',
      reporter: fields.reporter?.displayName || '',
      description: fields.description || null,
      descriptionText: descPlain,
      fetchedAt: new Date().toISOString()
    };

    fs.writeFileSync(path.resolve(sourceDir, 'jira-issue.json'), JSON.stringify(jiraData, null, 2), 'utf8');
    fs.writeFileSync(path.resolve(specDir, `${issueKey}-context.json`), JSON.stringify(cleanContext, null, 2), 'utf8');

    // Nếu chạy qa-test-design hoặc qa-full-pipeline mà chưa có spec/final.md,
    // tự động khởi tạo spec/final.md từ refined.md hoặc từ nội dung Jira Description để không bị chặn ở Gate thiếu file
    const finalMdPath = path.resolve(specDir, 'final.md');
    const refinedMdPath = path.resolve(specDir, 'refined.md');
    if ((skill === 'qa-test-design' || skill === 'qa-full-pipeline') && !fs.existsSync(finalMdPath)) {
      if (fs.existsSync(refinedMdPath)) {
        fs.copyFileSync(refinedMdPath, finalMdPath);
      } else {
        const bootstrapMd = `# Đặc Tả Nghiệp Vụ: [${issueKey}] ${summary}\n\n` +
          `- **Loại:** ${cleanContext.issueType} | **Trạng thái:** ${cleanContext.status} | **Ưu tiên:** ${cleanContext.priority}\n` +
          `- **Assignee:** ${cleanContext.assignee} | **Reporter:** ${cleanContext.reporter}\n\n` +
          `## Mô Tả Yêu Cầu & Tiêu Chí Nghiệm Thu (Từ Jira)\n\n` +
          `${descPlain || summary}\n`;
        fs.writeFileSync(finalMdPath, bootstrapMd, 'utf8');
      }
    }

    if (skill === 'ba-refine') {
      nextActionLinks.push(`<${webhookBase}?skill=ba-push-jira&issueKey=${issueKey}${threadQuery}|📤 Duyệt & cập nhật Jira>`);
      nextActionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
    } else if (skill === 'qa-test-design') {
      nextActionLinks.push(`<${webhookBase}?skill=qa-auto-design&issueKey=${issueKey}${threadQuery}|🤖 Tạo kịch bản tự động>`);
      nextActionLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${issueKey}${threadQuery}|▶️ Thực thi test>`);
    }

    const prepNote = `Đã đồng bộ nội dung mới nhất từ Jira cho *${issueKey}*.`;
    const cliRes = dispatchToAgentCliOrHostQueue(skill, issueKey, prepNote);
    executionSuccess = cliRes.ok;
    executionMessage = cliRes.msg || prepNote;
    executionError = cliRes.err || null;
  } else {
    // 5. CÁC SKILL KHÁC (như qa-squash-push)
    const cliRes = dispatchToAgentCliOrHostQueue(skill, issueKey);
    executionSuccess = cliRes.ok;
    executionMessage = cliRes.msg || '';
    executionError = cliRes.err || null;
  }
} catch (err) {
  executionSuccess = false;
  executionError = toCleanUserText(err.message || String(err));
}

nextActionLinks.push(`<${jiraUrl}|🔗 Xem chi tiết>`);
const actionRowText = `\n> ⚡ *Thao tác tiếp theo:* ${nextActionLinks.join('  ┆  ')}`;
const threadHeader = `🧵 *<${jiraUrl}|${issueKey}>${taskSummary ? ' — ' + taskSummary : ''}*`;

// SOẠN PAYLOAD BÁO CÁO GỬI VỀ ĐÚNG THREAD TASK TRÊN SLACK (Thuần văn bản, ngắn gọn, không chứa lệnh kỹ thuật)
let slackNotifyPayload = null;

if (!executionSuccess || executionError) {
  slackNotifyPayload = {
    text: `${threadHeader}\n⚠️ *Chưa thể thực hiện: ${skillLabel}*\n> • *Lý do:* ${toCleanUserText(executionError)}\n> • *Thời gian:* ${nowStr}${actionRowText}`,
    ...(threadTs ? { thread_ts: threadTs } : {})
  };
} else {
  slackNotifyPayload = {
    text: `${threadHeader}\n⏳ *Đang xử lý: ${skillLabel}*\n> • ${executionMessage}\n> • *Thời gian:* ${nowStr}${actionRowText}`,
    ...(threadTs ? { thread_ts: threadTs } : {})
  };
}

return [{
  json: {
    success: executionSuccess,
    isError: !executionSuccess,
    skill,
    issueKey,
    threadTs: threadTs || null,
    executionMessage,
    error: executionError,
    slackNotifyPayload
  }
}];
