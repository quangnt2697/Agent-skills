import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildPlistContent,
  checkAndCatchUpStandup,
  ensureColimaRunning,
  ensureContainerRunning,
  hasStandupBeenSentToday,
  isJiraConfigured,
  isSlackWebhookConfigured,
  isWeekdayWorkHour,
  markStandupSentToday
} from '../setup/n8n-autostart.js';

test('buildPlistContent: sinh nội dung plist hợp lệ chuẩn macOS launchd', () => {
  const customRoot = '/tmp/fake-project';
  const plist = buildPlistContent({
    label: 'com.test.n8n',
    nodeBin: '/custom/bin/node',
    scriptPath: '/tmp/fake-project/scripts/setup/n8n-autostart.js',
    rootDir: customRoot,
    logFile: '/tmp/fake-project/.n8n-data/autostart.log',
    pathEnv: '/opt/homebrew/bin:/usr/local/bin',
    intervalSeconds: 180
  });

  assert.match(plist, /<!DOCTYPE plist PUBLIC/);
  assert.match(plist, /<key>Label<\/key>\s*<string>com\.test\.n8n<\/string>/);
  assert.match(plist, /<string>\/custom\/bin\/node<\/string>/);
  assert.match(plist, /<string>--ensure<\/string>/);
  assert.match(plist, /<key>WorkingDirectory<\/key>\s*<string>\/tmp\/fake-project<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist, /<key>StartInterval<\/key>\s*<integer>180<\/integer>/);
  assert.match(plist, /<key>StandardOutPath<\/key>\s*<string>\/tmp\/fake-project\/\.n8n-data\/autostart\.log<\/string>/);
  assert.match(plist, /<key>PATH<\/key>/);
  assert.match(plist, /\/opt\/homebrew\/bin/);
});

test('isWeekdayWorkHour: phân loại chính xác khung giờ làm việc và ngày nghỉ', () => {
  // 1. Thứ Hai lúc 09:15 AM (UTC+7 là 02:15 UTC) -> Trong khung làm việc
  const monday915 = new Date('2026-11-09T02:15:00Z');
  const resMon = isWeekdayWorkHour(monday915);
  assert.equal(resMon.weekday, 'Mon');
  assert.equal(resMon.hour, 9);
  assert.equal(resMon.minute, 15);
  assert.equal(resMon.isWorkingWindow, true);

  // 2. Thứ Hai lúc 08:30 AM (UTC+7 là 01:30 UTC) -> Trước giờ cron (08:50) -> Bỏ qua
  const monday830 = new Date('2026-11-09T01:30:00Z');
  const resMonEarly = isWeekdayWorkHour(monday830);
  assert.equal(resMonEarly.isWorkingWindow, false);

  // 3. Thứ Hai lúc 08:51 AM (UTC+7 là 01:51 UTC) -> Vừa qua cron 08:50 -> Được kích hoạt
  const monday851 = new Date('2026-11-09T01:51:00Z');
  const resMonCatch = isWeekdayWorkHour(monday851);
  assert.equal(resMonCatch.isWorkingWindow, true);

  // 4. Thứ Hai lúc 12:30 PM (UTC+7 là 05:30 UTC) -> Quá trưa -> Bỏ qua
  const monday1230 = new Date('2026-11-09T05:30:00Z');
  const resMonLate = isWeekdayWorkHour(monday1230);
  assert.equal(resMonLate.isWorkingWindow, false);

  // 5. Chủ Nhật lúc 09:30 AM (UTC+7 là 02:30 UTC) -> Cuối tuần -> Bỏ qua
  const sunday930 = new Date('2026-11-08T02:30:00Z');
  const resSun = isWeekdayWorkHour(sunday930);
  assert.equal(resSun.weekday, 'Sun');
  assert.equal(resSun.isWorkingWindow, false);
});

test('hasStandupBeenSentToday & markStandupSentToday: chống gửi trùng lặp', () => {
  const tmpFile = path.join(os.tmpdir(), `test-standup-${Date.now()}.txt`);

  try {
    assert.equal(hasStandupBeenSentToday({ lastSentFilePath: tmpFile, todayDateStr: '2026-11-06' }), false);

    // Đánh dấu ngày hôm nay
    markStandupSentToday({ lastSentFilePath: tmpFile, todayDateStr: '2026-11-06' });
    assert.equal(hasStandupBeenSentToday({ lastSentFilePath: tmpFile, todayDateStr: '2026-11-06' }), true);

    // Ngày khác chưa gửi
    assert.equal(hasStandupBeenSentToday({ lastSentFilePath: tmpFile, todayDateStr: '2026-11-07' }), false);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
});

test('ensureColimaRunning & ensureContainerRunning: dryRun an toàn không throw lỗi', () => {
  const colimaRes = ensureColimaRunning({ dryRun: true });
  assert.ok(typeof colimaRes.running === 'boolean');

  const containerRes = ensureContainerRunning({ dryRun: true });
  assert.ok(typeof containerRes.running === 'boolean');
});

test('isSlackWebhookConfigured & isJiraConfigured: nhận diện đúng cấu hình thật và placeholder của người mới', () => {
  // Slack chưa cấu hình hoặc là placeholder
  assert.equal(isSlackWebhookConfigured(''), false);
  assert.equal(isSlackWebhookConfigured(undefined), false);
  assert.equal(isSlackWebhookConfigured('https://hooks.slack.com/services/T00000000/B00000000/XXXX'), false);
  assert.equal(isSlackWebhookConfigured('your_slack_webhook_url_here'), false);
  // Slack hợp lệ
  assert.equal(isSlackWebhookConfigured('https://hooks.slack.com/services/T01ABCDEF/B02GHIJKL/mNopQrStUvWxYz123456'), true);

  // Jira từ .env.example (placeholder) -> false
  assert.equal(isJiraConfigured({
    ATLASSIAN_BASE_URL: 'https://example.atlassian.net',
    ATLASSIAN_EMAIL: 'user@example.com',
    ATLASSIAN_API_TOKEN: 'your_atlassian_api_token_here'
  }), false);

  // Jira cấu hình thật -> true
  assert.equal(isJiraConfigured({
    ATLASSIAN_BASE_URL: 'https://entrade.atlassian.net',
    ATLASSIAN_EMAIL: 'dev@dnse.com.vn',
    ATLASSIAN_API_TOKEN: 'ATATT3xFfGF0_real_token_123'
  }), true);
});

test('checkAndCatchUpStandup: người mới clone repo chưa cấu hình Slack hoặc Jira sẽ tự động skip êm ái không lỗi', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-newcomer-'));
  const monday915 = new Date('2026-11-09T02:15:00Z'); // 09:15 AM Thứ Hai

  try {
    // Kịch bản 1: Chưa có .env hoặc SLACK_WEBHOOK_URL trống -> skip với reason slack_not_configured
    fs.writeFileSync(path.join(tmpRoot, '.env'), 'SLACK_WEBHOOK_URL=\nATLASSIAN_API_TOKEN=your_atlassian_api_token_here\n', 'utf8');
    const resNoSlack = await checkAndCatchUpStandup({ rootDir: tmpRoot, dryRun: true, now: monday915 });
    assert.equal(resNoSlack.skipped, true);
    assert.equal(resNoSlack.reason, 'slack_not_configured');

    // Kịch bản 2: Đã có SLACK_WEBHOOK_URL nhưng chưa điền Jira token thật -> skip với reason jira_not_configured
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T01ABCDEF/B02GHIJKL/realWebhook123\nATLASSIAN_EMAIL=user@example.com\nATLASSIAN_API_TOKEN=your_atlassian_api_token_here\n',
      'utf8'
    );
    const resNoJira = await checkAndCatchUpStandup({ rootDir: tmpRoot, dryRun: true, now: monday915 });
    assert.equal(resNoJira.skipped, true);
    assert.equal(resNoJira.reason, 'jira_not_configured');

    // Kịch bản 3: Đã cấu hình đủ cả Slack và Jira nhưng đã gửi trong ngày -> skip với reason already_sent_today
    const dataDir = path.join(tmpRoot, '.n8n-data');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'standup-last-sent.txt'), '2026-11-09\n', 'utf8');
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T01ABCDEF/B02GHIJKL/realWebhook123\nATLASSIAN_BASE_URL=https://entrade.atlassian.net\nATLASSIAN_EMAIL=dev@dnse.com.vn\nATLASSIAN_API_TOKEN=ATATT3x_real_token\n',
      'utf8'
    );
    const resAlreadySent = await checkAndCatchUpStandup({ rootDir: tmpRoot, dryRun: true, now: monday915 });
    assert.equal(resAlreadySent.skipped, true);
    assert.equal(resAlreadySent.reason, 'already_sent_today');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

