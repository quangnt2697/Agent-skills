#!/usr/bin/env node

/**
 * Script tự động thiết lập / gỡ bỏ các plugin của agent-skills
 * vào thư mục cấu hình toàn cục của Gemini CLI và Google Antigravity (~/.gemini/config/plugins/).
 *
 * Cách dùng:
 *   node scripts/setup-plugins.js          # Tạo symlinks cài đặt
 *   node scripts/setup-plugins.js --unlink # Gỡ bỏ symlinks
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const isUnlink = process.argv.includes('--unlink');
const homeDir = os.homedir();
const targetPluginsDir = path.join(homeDir, '.gemini', 'config', 'plugins');
const projectRoot = path.resolve(__dirname, '..');
const sourcePluginsDir = path.join(projectRoot, 'plugins');

console.log('='.repeat(65));
console.log(isUnlink ? '  GỠ BỎ AGENT-SKILLS PLUGINS' : '  THIẾT LẬP AGENT-SKILLS PLUGINS CHO GEMINI / ANTIGRAVITY');
console.log('='.repeat(65));
console.log(`Thư mục đích: ${targetPluginsDir}`);
console.log(`Nguồn plugin: ${sourcePluginsDir}`);
console.log('');

if (!fs.existsSync(targetPluginsDir)) {
  if (isUnlink) {
    console.log('Thư mục plugins chưa tồn tại. Không có gì để gỡ bỏ.');
    process.exit(0);
  }
  console.log(`Tạo thư mục đích: ${targetPluginsDir}`);
  fs.mkdirSync(targetPluginsDir, { recursive: true });
}

// Xóa symlink cũ legacy "agent-skills" (nếu trỏ vào projectRoot)
const legacyLink = path.join(targetPluginsDir, 'agent-skills');
if (fs.existsSync(legacyLink)) {
  try {
    const stat = fs.lstatSync(legacyLink);
    if (stat.isSymbolicLink()) {
      const realTarget = fs.realpathSync(legacyLink);
      if (realTarget === projectRoot) {
        console.log(`🧹 Đang dọn dẹp symlink cũ không còn phù hợp: ${legacyLink}`);
        fs.unlinkSync(legacyLink);
      }
    }
  } catch (e) {
    // ignore
  }
}

if (!fs.existsSync(sourcePluginsDir)) {
  console.error(`❌ Lỗi: Không tìm thấy thư mục plugins tại ${sourcePluginsDir}`);
  process.exit(1);
}

const subPlugins = fs.readdirSync(sourcePluginsDir).filter((file) => {
  const fullPath = path.join(sourcePluginsDir, file);
  return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'plugin.json'));
});

if (subPlugins.length === 0) {
  console.error('❌ Không tìm thấy sub-plugin nào có plugin.json trong plugins/');
  process.exit(1);
}

let successCount = 0;

for (const pluginDirName of subPlugins) {
  const pluginSrc = path.join(sourcePluginsDir, pluginDirName);
  let pluginName = `agent-skills-${pluginDirName}`;

  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginSrc, 'plugin.json'), 'utf8'));
    if (manifest.name) {
      pluginName = manifest.name;
    }
  } catch (err) {
    // dùng fallback pluginName
  }

  const linkDest = path.join(targetPluginsDir, pluginName);

  if (isUnlink) {
    if (fs.existsSync(linkDest)) {
      try {
        const stat = fs.lstatSync(linkDest);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(linkDest);
          console.log(`  - Đã gỡ bỏ: ${pluginName}`);
          successCount++;
        }
      } catch (err) {
        console.warn(`  ⚠️ Không thể gỡ bỏ ${pluginName}: ${err.message}`);
      }
    }
  } else {
    // Kiểm tra xem đích đã tồn tại chưa
    if (fs.existsSync(linkDest)) {
      const stat = fs.lstatSync(linkDest);
      if (stat.isSymbolicLink()) {
        try {
          const currentTarget = fs.readlinkSync(linkDest);
          if (path.resolve(targetPluginsDir, currentTarget) === pluginSrc) {
            console.log(`  ✓ Đã tồn tại chuẩn xác: ${pluginName} -> ${pluginDirName}`);
            successCount++;
            continue;
          }
        } catch (e) {}
        fs.unlinkSync(linkDest);
      } else {
        console.warn(`  ⚠️ Cảnh báo: ${linkDest} tồn tại nhưng không phải symlink, bỏ qua để tránh ghi đè.`);
        continue;
      }
    }

    try {
      fs.symlinkSync(pluginSrc, linkDest, 'dir');
      console.log(`  ✅ Đã liên kết: ${pluginName} -> plugins/${pluginDirName}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Lỗi khi tạo symlink cho ${pluginName}: ${err.message}`);
    }
  }
}

console.log('');
if (isUnlink) {
  console.log(`Hoàn tất gỡ bỏ ${successCount}/${subPlugins.length} plugins.`);
} else {
  console.log(`🎉 Hoàn tất thiết lập ${successCount}/${subPlugins.length} plugins!`);
  console.log('');
  console.log('📌 Giờ đây khi mở bất kỳ project nào trong Gemini CLI hoặc Antigravity,');
  console.log('   tất cả 42 skills và 7 agents sẽ được nhận diện và sử dụng tự động.');
}
console.log('='.repeat(65));
