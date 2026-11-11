#!/usr/bin/env node

/**
 * Quản lý Dịch vụ Tự Khởi Động & Giám sát n8n Fast-Path qua macOS User LaunchAgent
 *
 * Chức năng:
 *   node scripts/setup/n8n-autostart.js on       → Cài đặt & kích hoạt LaunchAgent tự chạy cùng macOS
 *   node scripts/setup/n8n-autostart.js off      → Gỡ bỏ LaunchAgent và tắt tự khởi động
 *   node scripts/setup/n8n-autostart.js status   → Kiểm tra trạng thái LaunchAgent, Colima & Container
 *   node scripts/setup/n8n-autostart.js --ensure → Watchdog ngầm: bật Colima/n8n nếu tắt & Catch-up Standup
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '..', '..');

export const AGENT_LABEL = 'com.agent-skills.n8n';
export const PLIST_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
export const PLIST_PATH = path.join(PLIST_DIR, `${AGENT_LABEL}.plist`);
export const LOG_DIR = path.resolve(projectRoot, '.n8n-data');
export const LOG_FILE = path.resolve(LOG_DIR, 'autostart.log');
export const LAST_SENT_FILE = path.resolve(LOG_DIR, 'standup-last-sent.txt');

/**
 * Tạo nội dung file XML plist cho macOS launchd
 */
export function buildPlistContent({
  label = AGENT_LABEL,
  nodeBin = process.execPath,
  scriptPath = path.resolve(projectRoot, 'scripts', 'setup', 'n8n-autostart.js'),
  rootDir = projectRoot,
  logFile = LOG_FILE,
  pathEnv = '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  intervalSeconds = 300
} = {}) {
  const mergedPath = pathEnv.includes(process.env.PATH || '')
    ? pathEnv
    : `${pathEnv}:${process.env.PATH || ''}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${nodeBin}</string>
      <string>${scriptPath}</string>
      <string>--ensure</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${rootDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>
    <key>WatchPaths</key>
    <array>
      <string>${path.resolve(rootDir, '.n8n-data', 'skill-queue.json')}</string>
    </array>
    <key>StandardOutPath</key>
    <string>${logFile}</string>
    <key>StandardErrorPath</key>
    <string>${logFile}</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>${mergedPath}</string>
      <key>AGENT_WORKSPACE_DIR</key>
      <string>${rootDir}</string>
    </dict>
  </dict>
</plist>
`;
}

/**
 * Kiểm tra xem ngày giờ hiện tại có nằm trong khung giờ sáng ngày làm việc (Thứ 2 - Thứ 6, từ 08:51 đến 11:59)
 * @param {Date} [now]
 * @returns {{ isWorkingWindow: boolean, dateStr: string, weekday: string, hour: number, minute: number }}
 */
export function isWeekdayWorkHour(now = new Date()) {
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(now);
  const hour = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }).format(now), 10);
  const minute = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', minute: '2-digit', hour12: false }).format(now), 10);

  const isWeekday = !['Sat', 'Sun'].includes(weekday);
  const isAfterCron = (hour > 8) || (hour === 8 && minute >= 51);
  const isBeforeNoon = hour < 12;

  return {
    isWorkingWindow: isWeekday && isAfterCron && isBeforeNoon,
    dateStr,
    weekday,
    hour,
    minute
  };
}

/**
 * Kiểm tra xem Standup hôm nay đã gửi chưa
 */
export function hasStandupBeenSentToday({ lastSentFilePath = LAST_SENT_FILE, todayDateStr } = {}) {
  try {
    if (!todayDateStr) {
      todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
    if (!fs.existsSync(lastSentFilePath)) return false;
    const content = fs.readFileSync(lastSentFilePath, 'utf8');
    return content.includes(todayDateStr);
  } catch {
    return false;
  }
}

/**
 * Đánh dấu ngày đã gửi Standup
 */
export function markStandupSentToday({ lastSentFilePath = LAST_SENT_FILE, todayDateStr } = {}) {
  try {
    if (!todayDateStr) {
      todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
    const parent = path.dirname(lastSentFilePath);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(lastSentFilePath, `${todayDateStr}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra và bật Colima VM nếu đang tắt
 */
export function ensureColimaRunning({ dryRun = false } = {}) {
  try {
    const statusOut = execSync('colima status 2>&1', { encoding: 'utf8' });
    if (/colima is running/i.test(statusOut)) {
      return { running: true, started: false };
    }
  } catch {
    // colima chưa chạy
  }

  if (dryRun) return { running: false, started: false, willStart: true };

  console.log(`[${new Date().toISOString()}] [Watchdog] 🚀 Colima VM chưa chạy. Đang khởi động Colima...`);
  try {
    execSync('colima start --cpu 2 --memory 2 --disk 20', { stdio: 'inherit' });
    return { running: true, started: true };
  } catch (err) {
    console.error(`[Watchdog] ❌ Khởi động Colima thất bại: ${err.message}`);
    return { running: false, started: false, error: err.message };
  }
}

/**
 * Kiểm tra và bật Container n8n nếu đang tắt
 */
export function ensureContainerRunning({ rootDir = projectRoot, dryRun = false } = {}) {
  let isRunning = false;
  try {
    const psOut = execSync('docker ps --filter name=agent-skills-n8n --format "{{.Names}}"', { encoding: 'utf8' }).trim();
    isRunning = psOut.includes('agent-skills-n8n');
  } catch {
    isRunning = false;
  }

  if (isRunning) return { running: true, started: false };
  if (dryRun) return { running: false, started: false, willStart: true };

  console.log(`[${new Date().toISOString()}] [Watchdog] 📦 Container agent-skills-n8n chưa chạy. Đang khởi động qua Docker Compose...`);
  try {
    const hasCompose = (() => {
      try {
        execSync('docker-compose version', { stdio: 'ignore' });
        return 'docker-compose';
      } catch {
        return 'docker compose';
      }
    })();

    execSync(`${hasCompose} up -d`, { cwd: rootDir, stdio: 'inherit' });
    execSync('node scripts/n8n/import-and-activate.js', { cwd: rootDir, stdio: 'inherit' });
    return { running: true, started: true };
  } catch (err) {
    console.error(`[Watchdog] ❌ Khởi động Container n8n thất bại: ${err.message}`);
    return { running: false, started: false, error: err.message };
  }
}

/**
 * Kiểm tra xem URL Slack Webhook đã được cấu hình thực tế hay chưa (bỏ qua giá trị trống hoặc mẫu)
 */
export function isSlackWebhookConfigured(slackUrl) {
  if (!slackUrl || typeof slackUrl !== 'string') return false;
  const trimmed = slackUrl.trim();
  if (!trimmed.startsWith('https://hooks.slack.com/')) return false;
  if (trimmed.includes('T00000000') || trimmed.includes('your_') || trimmed.includes('XXXX')) return false;
  return true;
}

/**
 * Kiểm tra xem thông tin xác thực Jira đã được cấu hình thực tế hay chưa
 */
export function isJiraConfigured(env = process.env) {
  if (!env) return false;
  const token = String(env.ATLASSIAN_API_TOKEN || '').trim();
  const email = String(env.ATLASSIAN_EMAIL || '').trim();
  const baseUrl = String(env.ATLASSIAN_BASE_URL || '').trim();
  if (!token || token.includes('your_') || token === 'changeme') return false;
  if (!email || email === 'user@example.com' || email.includes('your_')) return false;
  if (baseUrl.includes('example.atlassian.net')) return false;
  return true;
}

/**
 * Đọc biến môi trường từ file .env của rootDir (kết hợp process.env khi chạy tại projectRoot)
 */
export function readEnvConfig(rootDir = projectRoot) {
  const parsed = {};
  const envPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          parsed[k] = v;
          if (rootDir === projectRoot && !process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    } catch (_) {}
  }
  return rootDir === projectRoot ? { ...process.env, ...parsed } : parsed;
}

/**
 * Tự động chạy bù Daily Standup nếu máy bật trễ sau 08:50 sáng
 * An toàn 100% cho người mới clone repo chưa cấu hình SLACK_WEBHOOK_URL hoặc Jira token:
 * tự động bỏ qua êm ái (không báo lỗi, không spam log).
 */
export async function checkAndCatchUpStandup({ rootDir = projectRoot, dryRun = false, force = false, now } = {}) {
  const timeInfo = isWeekdayWorkHour(now);
  const lastSentFilePath = path.resolve(rootDir, '.n8n-data', 'standup-last-sent.txt');
  const alreadySent = hasStandupBeenSentToday({ lastSentFilePath, todayDateStr: timeInfo.dateStr });
  const envConfig = readEnvConfig(rootDir);

  if (!force) {
    if (!isSlackWebhookConfigured(envConfig.SLACK_WEBHOOK_URL)) {
      return { skipped: true, reason: 'slack_not_configured', timeInfo };
    }
    if (!isJiraConfigured(envConfig)) {
      return { skipped: true, reason: 'jira_not_configured', timeInfo };
    }
    if (!timeInfo.isWorkingWindow) {
      return { skipped: true, reason: 'outside_window', timeInfo };
    }
    if (alreadySent) {
      return { skipped: true, reason: 'already_sent_today', timeInfo };
    }
  }

  if (dryRun) {
    return { willRun: true, timeInfo, alreadySent };
  }

  console.log(`[${new Date().toISOString()}] [Standup Catch-up] ☀️ Phát hiện chưa gửi Daily Standup cho ngày ${timeInfo.dateStr}. Đang kích hoạt chạy bù...`);

  try {
    // 1. Kiểm tra n8n health
    const n8nBase = (envConfig.N8N_BASE_URL || `${envConfig.N8N_PROTOCOL || 'http'}://${envConfig.N8N_HOST || 'localhost'}:${envConfig.N8N_PORT || '5678'}`).replace(/\/+$/, '');
    const healthRes = await fetch(`${n8nBase}/healthz`).catch(() => null);
    if (!healthRes || !healthRes.ok) {
      console.warn('[Standup Catch-up] ⚠️ n8n chưa phản hồi healthz, hoãn lại lần sau.');
      return { success: false, reason: 'n8n_not_ready' };
    }

    // 2. Kích hoạt webhook standup
    const webhookRes = await fetch(`${n8nBase}/webhook/sm-standup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({})
    });

    if (!webhookRes.ok) {
      const errTxt = await webhookRes.text().catch(() => '');
      throw new Error(`Webhook sm-standup trả về HTTP ${webhookRes.status}: ${errTxt}`);
    }

    const data = await webhookRes.json();
    if (data.isError) {
      throw new Error(data.error || 'Webhook sm-standup báo lỗi nghiệp vụ');
    }

    // 3. Lưu báo cáo vào workspace trace
    const traceDir = path.resolve(rootDir, 'workspace', 'sprints', 'sprint', 'trace');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const reportPath = path.join(traceDir, 'daily-standup-report.md');
    fs.writeFileSync(reportPath, data.reportText || '# Daily Standup\n', 'utf8');

    // 4. Bắn vào Slack nếu có webhook URL hợp lệ
    const slackUrl = envConfig.SLACK_WEBHOOK_URL;
    if (isSlackWebhookConfigured(slackUrl)) {
      const slackBody = data.slackPayload || { text: data.reportText };
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackBody)
      });
      console.log('✅ Đã gửi báo cáo Daily Standup lên Slack thành công.');
    } else {
      console.log('ℹ️ SLACK_WEBHOOK_URL chưa cấu hình, đã lưu báo cáo ra workspace trace.');
    }

    // 5. Đánh dấu đã gửi hôm nay
    markStandupSentToday({ lastSentFilePath, todayDateStr: timeInfo.dateStr });
    console.log(`🎉 [Standup Catch-up] Hoàn tất chạy bù Daily Standup cho ngày ${timeInfo.dateStr}!`);
    return { success: true, date: timeInfo.dateStr, reportPath };
  } catch (err) {
    console.error(`[Standup Catch-up] ❌ Lỗi khi chạy bù Standup: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Lệnh bật Autostart
 */
export async function enableAutostart() {
  if (process.platform !== 'darwin') {
    console.log('ℹ️ Tính năng LaunchAgent chỉ áp dụng cho macOS. Trên Linux/Windows, hãy dùng policy restart của Docker.');
    return;
  }

  if (!fs.existsSync(PLIST_DIR)) {
    fs.mkdirSync(PLIST_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // 1. Sinh file plist
  const plistContent = buildPlistContent();
  fs.writeFileSync(PLIST_PATH, plistContent, 'utf8');
  console.log(`📄 Đã tạo file LaunchAgent: ${PLIST_PATH}`);

  // 2. Nạp vào launchctl
  spawnSync('launchctl', ['unload', '-w', PLIST_PATH], { stdio: 'ignore' });
  const loadRes = spawnSync('launchctl', ['load', '-w', PLIST_PATH], { encoding: 'utf8' });
  if (loadRes.status !== 0) {
    console.error(`❌ Không thể nạp LaunchAgent: ${loadRes.stderr || loadRes.stdout}`);
    process.exit(1);
  }

  console.log('✅ Đã kích hoạt macOS LaunchAgent cho n8n (Tự khởi động khi login + Watchdog 5 phút/lần).');
  console.log(`📝 Log hoạt động ghi tại: ${LOG_FILE}`);

  // 3. Thực hiện vòng kiểm tra khởi động ngay lập tức
  console.log('\n🔍 Đang thực hiện vòng kiểm tra khởi động tức thì...');
  await runEnsure();
}

/**
 * Lệnh tắt Autostart
 */
export function disableAutostart() {
  if (process.platform !== 'darwin') return;

  if (fs.existsSync(PLIST_PATH)) {
    spawnSync('launchctl', ['unload', '-w', PLIST_PATH], { stdio: 'ignore' });
    fs.rmSync(PLIST_PATH, { force: true });
    console.log(`✅ Đã gỡ bỏ LaunchAgent: ${PLIST_PATH}`);
  } else {
    console.log('ℹ️ LaunchAgent chưa được kích hoạt trước đó.');
  }
}

/**
 * Xem trạng thái Autostart
 */
export function showStatus() {
  console.log('='.repeat(60));
  console.log('  TRẠNG THÁI TỰ KHỞI ĐỘNG VÀ GIÁM SÁT N8N (AUTOSTART)');
  console.log('='.repeat(60));

  const hasPlist = fs.existsSync(PLIST_PATH);
  console.log(`• File LaunchAgent:  ${hasPlist ? '✅ ĐÃ CÀI ĐẶT' : '❌ CHƯA CÀI ĐẶT'} (${PLIST_PATH})`);

  let launchdLoaded = false;
  if (hasPlist && process.platform === 'darwin') {
    try {
      const out = execSync(`launchctl list | grep ${AGENT_LABEL} || true`, { encoding: 'utf8' });
      launchdLoaded = out.includes(AGENT_LABEL);
    } catch (_) {}
  }
  console.log(`• Dịch vụ Launchd:   ${launchdLoaded ? '🟢 ĐANG CHẠY NỀN' : '⚪ KHÔNG HOẠT ĐỘNG'}`);

  let colimaOk = false;
  try {
    const colimaOut = execSync('colima status 2>&1', { encoding: 'utf8' });
    colimaOk = /colima is running/i.test(colimaOut);
  } catch (_) {}
  console.log(`• Máy ảo Colima:     ${colimaOk ? '🟢 ĐANG CHẠY' : '🔴 ĐANG TẮT'}`);

  let containerOk = false;
  try {
    const psOut = execSync('docker ps --filter name=agent-skills-n8n --format "{{.Status}}"', { encoding: 'utf8' }).trim();
    containerOk = psOut.length > 0;
  } catch (_) {}
  console.log(`• Container n8n:     ${containerOk ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 ĐANG TẮT'}`);

  const envConfig = readEnvConfig(projectRoot);
  const hasSlack = isSlackWebhookConfigured(envConfig.SLACK_WEBHOOK_URL);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const standupSent = hasStandupBeenSentToday({ todayDateStr: todayStr });

  if (!hasSlack) {
    console.log('• Standup Slack:     ⚪ CHƯA CẤU HÌNH SLACK_WEBHOOK_URL (Bỏ qua tự gửi Slack; các skill chạy bình thường)');
  } else {
    console.log(`• Standup Hôm Nay (${todayStr}): ${standupSent ? '✅ ĐÃ GỬI BÁO CÁO' : '⏳ CHƯA GỬI / CHỜ CRON'}`);
  }
  console.log(`• Log file:          ${LOG_FILE}`);
  console.log('='.repeat(60));
}

/**
 * Xử lý hàng đợi Skill từ Docker Container (.n8n-data/skill-queue.json) trên macOS Host
 */
export async function processSkillQueue({ rootDir = projectRoot } = {}) {
  const queueFile = path.resolve(rootDir, '.n8n-data', 'skill-queue.json');
  if (!fs.existsSync(queueFile)) return { processed: 0 };

  let queue = [];
  try {
    queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    if (!Array.isArray(queue)) return { processed: 0 };
  } catch {
    return { processed: 0 };
  }

  const pendingJobs = queue.filter((j) => j && j.status === 'pending');
  if (pendingJobs.length === 0) return { processed: 0 };

  const envConfig = readEnvConfig(rootDir);
  const slackUrl = envConfig.SLACK_WEBHOOK_URL;
  const candidateClis = [
    envConfig.AGENT_CLI_PATH,
    path.join(os.homedir(), '.local', 'bin', 'agy'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/agy',
    '/usr/local/bin/claude'
  ].filter(Boolean);

  const selectedCli = candidateClis.find((c) => fs.existsSync(c));
  let processedCount = 0;

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

  function cleanHostMsg(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/<!DOCTYPE[^>]*>[\s\S]*?<\/html>/gi, 'Dịch vụ đích phản hồi lỗi kết nối.')
      .replace(/<[^>]*>/g, ' ')
      .replace(/workspace\/issues\/[^\s,.]+/gi, 'thư mục công việc')
      .replace(/--[a-z-]+/gi, '')
      .replace(/\/(ba-refine|ba-spec|ba-push-jira|qa-test-design|qa-auto-design|qa-run-test|qa-full-pipeline|qa-squash-push)/gi, (m, s) => SKILL_LABELS[s.toLowerCase()] || s)
      .replace(/\s+/g, ' ')
      .trim();
  }

  for (const job of pendingJobs) {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2), 'utf8');

    const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const baseUrl = (envConfig.ATLASSIAN_BASE_URL || '').replace(/\/+$/, '');
    const jiraUrl = baseUrl ? `${baseUrl}/browse/${job.issueKey}` : job.issueKey;
    const n8nBase = (envConfig.N8N_BASE_URL || `${envConfig.N8N_PROTOCOL || 'http'}://${envConfig.N8N_HOST || 'localhost'}:${envConfig.N8N_PORT || '5678'}`).replace(/\/+$/, '');
    const webhookBase = `${n8nBase}/webhook/agent-trigger-skill`;
    const threadQuery = job.threadTs ? `&thread_ts=${encodeURIComponent(job.threadTs)}` : '';
    const threadHeader = `🧵 *<${jiraUrl}|${job.issueKey}>${job.summary ? ' — ' + job.summary : ''}*`;
    const skillLabel = SKILL_LABELS[job.skill] || 'Thao tác công việc';

    if (!selectedCli) {
      job.status = 'failed';
      job.error = 'Chưa tìm thấy công cụ xử lý tự động trên máy trạm.';
      if (isSlackWebhookConfigured(slackUrl)) {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${threadHeader}\n⚠️ *Chưa thể thực hiện: ${skillLabel}*\n> • *Lý do:* ${job.error}\n> • *Thời gian:* ${nowStr}`,
            ...(job.threadTs ? { thread_ts: job.threadTs } : {})
          })
        }).catch(() => {});
      }
      continue;
    }

    const promptToRun = job.promptCmd || `/${job.skill} ${job.issueKey} --auto`;
    const res = spawnSync(selectedCli, ['-p', promptToRun, '--dangerously-skip-permissions'], {
      cwd: rootDir,
      timeout: 300000,
      encoding: 'utf8'
    });

    if (res.status === 0) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      processedCount++;

      // Tổng hợp tóm tắt kết quả bằng ngôn ngữ tự nhiên và gợi ý thao tác tiếp theo
      const issueDir = path.resolve(rootDir, 'workspace', 'issues', job.issueKey);
      let artifactSummary = `Đã xử lý hoàn tất yêu cầu cho công việc *${job.issueKey}*.`;
      const followUpLinks = [];

      if (job.skill === 'ba-refine' || job.skill === 'ba-spec') {
        const refinedFile = path.resolve(issueDir, 'spec', 'refined.md');
        const draftFile = path.resolve(issueDir, 'spec', 'refined-draft.md');
        const finalFile = path.resolve(issueDir, 'spec', 'final.md');
        const foundSpec = [refinedFile, finalFile, draftFile].find((p) => fs.existsSync(p));
        if (foundSpec) {
          artifactSummary = `Đã hoàn thiện tài liệu phân tích yêu cầu cho *${job.issueKey}* (Sẵn sàng để bạn duyệt và cập nhật lên Jira).`;
        }
        followUpLinks.push(`<${webhookBase}?skill=ba-push-jira&issueKey=${job.issueKey}${threadQuery}|📤 Duyệt & cập nhật Jira>`);
        followUpLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${job.issueKey}${threadQuery}|🧪 Thiết kế test>`);
      } else if (job.skill === 'qa-test-design') {
        const clFile = path.resolve(issueDir, 'test', 'checklist.md');
        const featFile = path.resolve(issueDir, 'test', `${job.issueKey}.feature`);
        let clCount = 0;
        let scCount = 0;
        if (fs.existsSync(clFile)) {
          clCount = (fs.readFileSync(clFile, 'utf8').match(/CL-\d+/g) || []).length;
        }
        if (fs.existsSync(featFile)) {
          scCount = (fs.readFileSync(featFile, 'utf8').match(/^\s*Scenario(?: Outline)?:/gm) || []).length;
        }
        artifactSummary = `Đã thiết kế xong danh mục kiểm thử (${clCount} hạng mục) và ${scCount} kịch bản kiểm thử chi tiết.`;
        followUpLinks.push(`<${webhookBase}?skill=qa-auto-design&issueKey=${job.issueKey}${threadQuery}|🤖 Tạo kịch bản tự động>`);
        followUpLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${job.issueKey}${threadQuery}|▶️ Thực thi test>`);
      } else if (job.skill === 'qa-auto-design') {
        artifactSummary = `Đã tạo xong bộ kịch bản kiểm thử tự động cho *${job.issueKey}*.`;
        followUpLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${job.issueKey}${threadQuery}|▶️ Thực thi test>`);
      }

      followUpLinks.push(`<${jiraUrl}|🔗 Xem chi tiết>`);
      const followUpRow = `\n> ⚡ *Thao tác tiếp theo:* ${followUpLinks.join('  ┆  ')}`;

      if (isSlackWebhookConfigured(slackUrl)) {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${threadHeader}\n✅ *Hoàn tất: ${skillLabel}*\n> • ${artifactSummary}\n> • *Thời gian:* ${nowStr}${followUpRow}`,
            ...(job.threadTs ? { thread_ts: job.threadTs } : {})
          })
        }).catch(() => {});
      }
    } else {
      job.status = 'failed';
      job.error = cleanHostMsg(res.stderr || res.stdout || 'Quá trình xử lý gặp sự cố và dừng sớm.').slice(0, 350);
      if (isSlackWebhookConfigured(slackUrl)) {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${threadHeader}\n⚠️ *Chưa thể hoàn tất: ${skillLabel}*\n> • *Lý do:* ${job.error}\n> • *Thời gian:* ${nowStr}\n> 🔗 <${jiraUrl}|Xem chi tiết>`,
            ...(job.threadTs ? { thread_ts: job.threadTs } : {})
          })
        }).catch(() => {});
      }
    }
  }

  // Giữ lại tối đa 30 bản ghi gần nhất để tránh phình file
  const trimmedQueue = queue.slice(-30);
  fs.writeFileSync(queueFile, JSON.stringify(trimmedQueue, null, 2), 'utf8');
  return { processed: processedCount };
}

/**
 * Watchdog runner (--ensure)
 */
export async function runEnsure() {
  // Xử lý ngay hàng đợi skill (nếu được đánh thức bởi WatchPaths từ nút bấm Slack)
  await processSkillQueue();

  const colimaRes = ensureColimaRunning();
  if (colimaRes.started) {
    console.log('[Watchdog] ✅ Colima đã khởi động xong.');
  }

  const containerRes = ensureContainerRunning();
  if (containerRes.started) {
    console.log('[Watchdog] ✅ Container n8n đã khởi động xong.');
  }

  await checkAndCatchUpStandup();
}

/**
 * Entry Point
 */
async function main() {
  const cmd = process.argv[2] || 'status';

  switch (cmd) {
    case 'on':
    case 'install':
    case 'enable':
      await enableAutostart();
      break;
    case 'off':
    case 'uninstall':
    case 'disable':
      disableAutostart();
      break;
    case 'status':
      showStatus();
      break;
    case '--ensure':
    case 'ensure':
      await runEnsure();
      break;
    case '--catchup-standup':
    case 'catchup':
      await checkAndCatchUpStandup({ force: true });
      break;
    default:
      console.log('Cách dùng:');
      console.log('  node scripts/setup/n8n-autostart.js on     # Cài đặt & bật tự khởi động');
      console.log('  node scripts/setup/n8n-autostart.js off    # Gỡ bỏ tự khởi động');
      console.log('  node scripts/setup/n8n-autostart.js status # Kiểm tra trạng thái');
      console.log('  node scripts/setup/n8n-autostart.js ensure # Chạy 1 vòng kiểm tra');
      process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`❌ Lỗi autostart: ${err.message}`);
    process.exit(1);
  });
}

