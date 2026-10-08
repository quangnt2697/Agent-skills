#!/usr/bin/env node

/**
 * Cài / gỡ agent-skills cho Claude Code ở phạm vi user (mọi project trên máy).
 *
 * Cách dùng:
 *   node scripts/setup/setup-claude.js            # Cài (idempotent, chạy lại bao nhiêu lần cũng được)
 *   node scripts/setup/setup-claude.js --unlink   # Gỡ
 *
 * Cơ chế:
 *   1. Symlink  <claude-config>/skills/agent-skills  ->  thư mục repo này.
 *      Claude Code nạp thư mục này như plugin `agent-skills@skills-dir` theo
 *      .claude-plugin/plugin.json. Vì là symlink nên sửa/thêm skill trong repo
 *      có hiệu lực ngay ở mọi project, không cần lệnh cập nhật.
 *   2. Ghi env.AGENT_SKILLS_HOME vào <claude-config>/settings.json để skill gọi
 *      được script của repo (node scripts/..., bash plugins/...) từ bất kỳ cwd nào.
 *
 * <claude-config> là $CLAUDE_CONFIG_DIR nếu có, mặc định ~/.claude.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_KEY = 'AGENT_SKILLS_HOME';
const PLUGIN_LINK_NAME = 'agent-skills';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = fs.realpathSync(path.resolve(__dirname, '..', '..'));

const isUnlink = process.argv.includes('--unlink');
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const skillsDir = path.join(configDir, 'skills');
const linkPath = path.join(skillsDir, PLUGIN_LINK_NAME);
const settingsPath = path.join(configDir, 'settings.json');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readSettings() {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (err) {
    fail(`${settingsPath} không phải JSON hợp lệ (${err.message}). Sửa file rồi chạy lại — script không ghi đè.`);
  }
}

function writeSettings(settings) {
  const backup = `${settingsPath}.agent-skills.bak`;
  if (fs.existsSync(settingsPath) && !fs.existsSync(backup)) {
    fs.copyFileSync(settingsPath, backup);
  }
  const tmp = `${settingsPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`);
  fs.renameSync(tmp, settingsPath);
}

function linkTarget() {
  const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
  if (!stat) return { kind: 'missing' };
  if (!stat.isSymbolicLink()) return { kind: 'not-symlink' };
  const resolved = fs.existsSync(linkPath) ? fs.realpathSync(linkPath) : null;
  return { kind: 'symlink', resolved };
}

function install() {
  fs.mkdirSync(skillsDir, { recursive: true });

  const current = linkTarget();
  if (current.kind === 'not-symlink') {
    fail(`${linkPath} đã tồn tại và không phải symlink. Xoá hoặc đổi tên thủ công rồi chạy lại.`);
  }
  if (current.kind === 'symlink' && current.resolved === projectRoot) {
    console.log(`  ✓ Symlink đã đúng: ${linkPath} -> ${projectRoot}`);
  } else {
    if (current.kind === 'symlink') fs.unlinkSync(linkPath);
    fs.symlinkSync(projectRoot, linkPath, 'dir');
    console.log(`  ✅ Đã tạo symlink: ${linkPath} -> ${projectRoot}`);
  }

  const settings = readSettings();
  if (settings.env?.[ENV_KEY] === projectRoot) {
    console.log(`  ✓ ${ENV_KEY} đã đúng trong ${settingsPath}`);
  } else {
    settings.env = { ...settings.env, [ENV_KEY]: projectRoot };
    writeSettings(settings);
    console.log(`  ✅ Đã ghi env.${ENV_KEY}=${projectRoot} vào ${settingsPath}`);
  }

  console.log('\n🎉 Xong. Mở phiên Claude Code mới (hoặc /reload-plugins) ở bất kỳ project nào.');
  console.log('   Cập nhật skill: sửa trong repo là có hiệu lực ngay; thêm/xoá skill thì /reload-plugins.');
}

function uninstall() {
  const current = linkTarget();
  if (current.kind === 'symlink') {
    fs.unlinkSync(linkPath);
    console.log(`  - Đã gỡ symlink: ${linkPath}`);
  } else if (current.kind === 'not-symlink') {
    console.warn(`  ⚠️ ${linkPath} không phải symlink — giữ nguyên.`);
  } else {
    console.log(`  ✓ Không có symlink tại ${linkPath}`);
  }

  const settings = readSettings();
  if (settings.env?.[ENV_KEY] === projectRoot) {
    delete settings.env[ENV_KEY];
    if (Object.keys(settings.env).length === 0) delete settings.env;
    writeSettings(settings);
    console.log(`  - Đã xoá env.${ENV_KEY} khỏi ${settingsPath}`);
  }
}

console.log('='.repeat(65));
console.log(isUnlink ? '  GỠ AGENT-SKILLS KHỎI CLAUDE CODE' : '  CÀI AGENT-SKILLS CHO CLAUDE CODE (TOÀN MÁY)');
console.log('='.repeat(65));

if (isUnlink) uninstall();
else install();
