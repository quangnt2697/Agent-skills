#!/usr/bin/env node
/**
 * export-plugin.js — Tiện ích trích xuất và đóng gói plugin độc lập
 *
 * Cho phép trích xuất một plugin (ví dụ: plugins/qa hoặc plugins/code-reviewer)
 * thành một gói độc lập (standalone folder hoặc .tar.gz) để các dự án microservice
 * khác có thể tải về và sử dụng ngay mà không cần clone cả kho mã nguồn agent-skills.
 *
 * Cách dùng:
 *   node scripts/setup/export-plugin.js --plugin <plugin-name> [--output <dir>] [--tar]
 *   node scripts/setup/export-plugin.js --list
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS_DIR = path.join(REPO_ROOT, 'plugins');

function getAvailablePlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  return fs.readdirSync(PLUGINS_DIR).filter(d => {
    const p = path.join(PLUGINS_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'plugin.json'));
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    plugin: null,
    output: null,
    tar: false,
    list: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plugin' || args[i] === '-p') {
      options.plugin = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[++i];
    } else if (args[i] === '--tar') {
      options.tar = true;
    } else if (args[i] === '--list' || args[i] === '-l') {
      options.list = true;
    }
  }

  return options;
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const options = parseArgs();
  const availablePlugins = getAvailablePlugins();

  if (options.list) {
    console.log('📦 Danh sách các plugin có sẵn để đóng gói:');
    for (const p of availablePlugins) {
      const manifest = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, p, 'plugin.json'), 'utf8'));
      console.log(`  - ${p.padEnd(16)} (v${manifest.version}) : ${manifest.description}`);
    }
    process.exit(0);
  }

  if (!options.plugin) {
    console.error('❌ Lỗi: Cần chỉ định tên plugin bằng --plugin <tên>');
    console.error(`Các plugin khả dụng: ${availablePlugins.join(', ')}`);
    console.error('Ví dụ: node scripts/setup/export-plugin.js --plugin qa --tar');
    process.exit(1);
  }

  if (!availablePlugins.includes(options.plugin)) {
    console.error(`❌ Lỗi: Không tìm thấy plugin '${options.plugin}' trong thư mục plugins/`);
    console.error(`Các plugin khả dụng: ${availablePlugins.join(', ')}`);
    process.exit(1);
  }

  const srcDir = path.join(PLUGINS_DIR, options.plugin);
  const outDir = options.output
    ? path.resolve(options.output)
    : path.join(REPO_ROOT, 'dist', `agent-skills-${options.plugin}`);

  console.log(`🚀 Bắt đầu xuất plugin '${options.plugin}'...`);
  console.log(`   Nguồn: ${srcDir}`);
  console.log(`   Đích:  ${outDir}`);

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Sao chép toàn bộ thư mục plugin
  copyRecursive(srcDir, outDir);

  // Tạo thêm file README.md cho gói độc lập nếu chưa có
  const readmePath = path.join(outDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'plugin.json'), 'utf8'));
    const readmeContent = `# ${manifest.name} (v${manifest.version})

${manifest.description}

## Hướng dẫn sử dụng độc lập (Standalone Usage)
Gói này được trích xuất từ monorepo \`agent-skills\` để dùng cho dự án của bạn.

### Cài đặt vào Claude Code
\`\`\`bash
claude --plugin-dir .
\`\`\`

### Cài đặt vào Google Antigravity
Thêm đường dẫn plugin vào cấu hình workspace Antigravity trong file \`.agents/config.json\`.
`;
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
  }

  console.log(`✅ Đã xuất thư mục plugin thành công tại: ${outDir}`);

  if (options.tar) {
    const tarFile = `${outDir}.tar.gz`;
    const parentDir = path.dirname(outDir);
    const baseName = path.basename(outDir);

    console.log(`📦 Đang nén thành tarball: ${tarFile}...`);
    execFileSync('tar', ['-czf', tarFile, '-C', parentDir, baseName]);
    console.log(`✅ Đã tạo tarball thành công: ${tarFile}`);
  }
}

main();
