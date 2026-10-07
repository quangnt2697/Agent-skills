#!/usr/bin/env node
/**
 * Bật/tắt tự khởi động n8n (+ ngrok nếu có NGROK_DOMAIN) cùng macOS qua PM2 + launchd.
 *   node scripts/setup/n8n-autostart.js on    → start + save + in lệnh sudo cần chạy
 *   node scripts/setup/n8n-autostart.js off   → gỡ launchd startup
 */
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const mode = process.argv[2];
if (!['on', 'off'].includes(mode)) {
  console.error('Dùng: node scripts/setup/n8n-autostart.js <on|off>');
  process.exit(1);
}
if (process.platform !== 'darwin') {
  console.error('❌ Script này chỉ hỗ trợ macOS (launchd). Trên OS khác chạy: pm2 startup');
  process.exit(1);
}

const run = (args) => spawnSync('pm2', args, { encoding: 'utf8' });
const user = os.userInfo().username;

if (mode === 'on') {
  const start = run(['start', 'ecosystem.config.cjs']);
  if (start.status !== 0) {
    console.error(`❌ pm2 start thất bại:\n${start.stderr || start.stdout}`);
    process.exit(1);
  }
  const save = run(['save']);
  if (save.status !== 0) {
    console.error(`❌ pm2 save thất bại:\n${save.stderr || save.stdout}`);
    process.exit(1);
  }
  console.log('✅ Đã start và lưu danh sách tiến trình PM2 (pm2 save).');

  // pm2 startup không tự sudo: nó in ra đúng 1 lệnh sudo để người dùng chạy.
  const startup = run(['startup', 'launchd', '-u', user, '--hp', os.homedir()]);
  const out = `${startup.stdout}\n${startup.stderr}`;
  const cmd = out.split('\n').find((l) => l.trim().startsWith('sudo '));
  if (cmd) {
    console.log('\n▶ Chạy lệnh sau trong terminal (cần quyền admin) để hoàn tất:\n');
    console.log(`  ${cmd.trim()}\n`);
  } else if (startup.status === 0) {
    console.log('✅ Startup launchd đã được cấu hình.');
  } else {
    console.error(`❌ pm2 startup thất bại:\n${out}`);
    process.exit(1);
  }
} else {
  const res = run(['unstartup', 'launchd']);
  const out = `${res.stdout}\n${res.stderr}`;
  const cmd = out.split('\n').find((l) => l.trim().startsWith('sudo '));
  if (cmd) {
    console.log('▶ Chạy lệnh sau trong terminal để gỡ autostart:\n');
    console.log(`  ${cmd.trim()}\n`);
  } else {
    console.log(res.status === 0 ? '✅ Đã gỡ autostart.' : `⚠️ ${out.trim()}`);
  }
}
