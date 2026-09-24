#!/usr/bin/env node

/**
 * Script tự động thiết lập / gỡ bỏ các plugin của agent-skills
 * vào thư mục cấu hình toàn cục của Gemini CLI và Google Antigravity (~/.gemini/config/plugins/).
 *
 * Cách dùng:
 *   node scripts/setup/setup-plugins.js            # Sao chép/đồng bộ plugin (khuyên dùng cho Antigravity IDE)
 *   node scripts/setup/setup-plugins.js --symlink  # Tạo symlink (dành cho phát triển trên Gemini CLI)
 *   node scripts/setup/setup-plugins.js --unlink   # Gỡ bỏ các plugin đã cài
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isUnlink = process.argv.includes('--unlink');
const isSymlink = process.argv.includes('--symlink');
const homeDir = os.homedir();
const targetConfigDir = path.join(homeDir, '.gemini', 'config');
const targetPluginsDir = path.join(targetConfigDir, 'plugins');
const targetReferencesDir = path.join(targetConfigDir, 'references');
const targetScriptsDir = path.join(targetConfigDir, 'scripts');
const targetRulesDir = path.join(targetConfigDir, 'rules');
const targetAgentsMd = path.join(targetConfigDir, 'AGENTS.md');
const projectRoot = path.resolve(__dirname, '..', '..');
const sourcePluginsDir = path.join(projectRoot, 'plugins');
const sourceReferencesDir = path.join(projectRoot, 'references');
const sourceScriptsDir = path.join(projectRoot, 'scripts');
const sourceRulesDir = path.join(projectRoot, '.agents', 'rules');
const sourceAgentsMd = path.join(projectRoot, 'AGENTS.md');

console.log('='.repeat(65));
if (isUnlink) {
  console.log('  GỠ BỎ AGENT-SKILLS PLUGINS KHỎI GEMINI / ANTIGRAVITY');
} else if (isSymlink) {
  console.log('  THIẾT LẬP SYMLINKS AGENT-SKILLS (CHẾ ĐỘ PHÁT TRIỂN)');
} else {
  console.log('  ĐỒNG BỘ AGENT-SKILLS PLUGINS CHO GEMINI / ANTIGRAVITY');
}
console.log('='.repeat(65));
console.log(`Thư mục config: ${targetConfigDir}`);
console.log(`Thư mục plugins đích: ${targetPluginsDir}`);
console.log(`Nguồn plugin: ${sourcePluginsDir}`);
console.log(`Chế độ: ${isUnlink ? 'Gỡ bỏ' : (isSymlink ? 'Symlink (Dev)' : 'Copy/Sync (An toàn đa project)')}`);
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
        fs.rmSync(linkDest, { recursive: true, force: true });
        console.log(`  - Đã gỡ bỏ: ${pluginName}`);
        successCount++;
      } catch (err) {
        console.warn(`  ⚠️ Không thể gỡ bỏ ${pluginName}: ${err.message}`);
      }
    }
  } else if (isSymlink) {
    // Chế độ Symlink (Dev)
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
        fs.rmSync(linkDest, { recursive: true, force: true });
      }
    }

    try {
      fs.symlinkSync(pluginSrc, linkDest, 'dir');
      console.log(`  ✅ Đã liên kết symlink: ${pluginName} -> plugins/${pluginDirName}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Lỗi khi tạo symlink cho ${pluginName}: ${err.message}`);
    }
  } else {
    // Chế độ Copy/Sync (Default - Bắt buộc cho Antigravity IDE để tránh lỗi vi phạm ranh giới workspace)
    if (fs.existsSync(linkDest)) {
      try {
        const stat = fs.lstatSync(linkDest);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(linkDest);
        } else {
          fs.rmSync(linkDest, { recursive: true, force: true });
        }
      } catch (e) {
        fs.rmSync(linkDest, { recursive: true, force: true });
      }
    }

    try {
      fs.cpSync(pluginSrc, linkDest, { recursive: true, dereference: true, force: true });
      console.log(`  ✅ Đã đồng bộ thư mục: ${pluginName}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Lỗi khi sao chép ${pluginName}: ${err.message}`);
    }
  }
}

// Đồng bộ các thư mục tài nguyên, script và quy tắc dùng chung
if (!isUnlink) {
  if (fs.existsSync(sourceReferencesDir)) {
    try {
      if (fs.existsSync(targetReferencesDir)) {
        const stat = fs.lstatSync(targetReferencesDir);
        if (stat.isSymbolicLink()) fs.unlinkSync(targetReferencesDir);
      }
      fs.cpSync(sourceReferencesDir, targetReferencesDir, { recursive: true, dereference: true, force: true });
      console.log(`  ✅ Đã đồng bộ tài liệu dùng chung: references/ -> ~/.gemini/config/references/`);
    } catch (err) {
      console.warn(`  ⚠️ Cảnh báo khi sao chép references/: ${err.message}`);
    }
  }

  if (fs.existsSync(sourceScriptsDir)) {
    try {
      if (fs.existsSync(targetScriptsDir)) {
        const stat = fs.lstatSync(targetScriptsDir);
        if (stat.isSymbolicLink()) fs.unlinkSync(targetScriptsDir);
      }
      fs.cpSync(sourceScriptsDir, targetScriptsDir, { recursive: true, dereference: true, force: true });
      console.log(`  ✅ Đã đồng bộ thư mục scripts/: scripts/ -> ~/.gemini/config/scripts/`);
    } catch (err) {
      console.warn(`  ⚠️ Cảnh báo khi sao chép scripts/: ${err.message}`);
    }
  }

  // Đồng bộ AGENTS.md sang ~/.gemini/config/AGENTS.md (Áp dụng Global cho Antigravity IDE)
  if (fs.existsSync(sourceAgentsMd)) {
    try {
      if (fs.existsSync(targetAgentsMd)) {
        const stat = fs.lstatSync(targetAgentsMd);
        if (stat.isSymbolicLink()) fs.unlinkSync(targetAgentsMd);
      }
      fs.copyFileSync(sourceAgentsMd, targetAgentsMd);
      console.log(`  ✅ Đã đồng bộ luật hệ thống toàn cục: AGENTS.md -> ~/.gemini/config/AGENTS.md`);
    } catch (err) {
      console.warn(`  ⚠️ Cảnh báo khi sao chép AGENTS.md: ${err.message}`);
    }
  }

  // Đồng bộ thư mục rules/ sang ~/.gemini/config/rules/ (Chứa action-first-adhd.md)
  if (fs.existsSync(sourceRulesDir)) {
    try {
      if (fs.existsSync(targetRulesDir)) {
        const stat = fs.lstatSync(targetRulesDir);
        if (stat.isSymbolicLink()) fs.unlinkSync(targetRulesDir);
      }
      fs.cpSync(sourceRulesDir, targetRulesDir, { recursive: true, dereference: true, force: true });
      console.log(`  ✅ Đã đồng bộ thư mục rules toàn cục: rules/ -> ~/.gemini/config/rules/`);
    } catch (err) {
      console.warn(`  ⚠️ Cảnh báo khi sao chép rules/: ${err.message}`);
    }
  }
} else {
  if (fs.existsSync(targetReferencesDir)) {
    try { fs.rmSync(targetReferencesDir, { recursive: true, force: true }); } catch (e) {}
  }
  if (fs.existsSync(targetScriptsDir)) {
    try { fs.rmSync(targetScriptsDir, { recursive: true, force: true }); } catch (e) {}
  }
  if (fs.existsSync(targetRulesDir)) {
    try { fs.rmSync(targetRulesDir, { recursive: true, force: true }); } catch (e) {}
  }
}

console.log('');
if (isUnlink) {
  console.log(`Hoàn tất gỡ bỏ ${successCount}/${subPlugins.length} plugins.`);
} else {
  console.log(`🎉 Hoàn tất thiết lập ${successCount}/${subPlugins.length} plugins!`);
  console.log('');
  console.log('📌 Giờ đây khi mở bất kỳ project nào trong Gemini CLI hoặc Antigravity,');
  console.log('   tất cả 44 skills và 7 agents sẽ được nhận diện và thực thi an toàn (không bị chặn ranh giới file).');
}
console.log('='.repeat(65));
