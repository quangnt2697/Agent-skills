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
const REFERENCES_DIR = path.join(REPO_ROOT, 'references');

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

function getPluginSkills(pluginDir) {
  const skillsDir = path.join(pluginDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
}

function getPluginCommands(pluginDir) {
  const commandsDir = path.join(pluginDir, 'commands');
  if (!fs.existsSync(commandsDir)) return [];
  return fs.readdirSync(commandsDir).filter(f => f.endsWith('.toml')).map(f => f.replace('.toml', ''));
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

  // 1. Sao chép toàn bộ thư mục plugin
  copyRecursive(srcDir, outDir);

  // 2. Tự động đính kèm shared references nếu plugin thuộc domain tài chính/chứng khoán
  const sharedDomainPlugins = ['qa', 'ba-po', 'fintech-data'];
  if (sharedDomainPlugins.includes(options.plugin)) {
    const targetRefDir = path.join(outDir, 'references');
    mkdirp(targetRefDir);
    const domainRulesSrc = path.join(REFERENCES_DIR, 'securities-domain-rules.md');
    if (fs.existsSync(domainRulesSrc)) {
      fs.copyFileSync(domainRulesSrc, path.join(targetRefDir, 'securities-domain-rules.md'));
    }
    const secDirSrc = path.join(REFERENCES_DIR, 'securities');
    if (fs.existsSync(secDirSrc)) {
      copyRecursive(secDirSrc, path.join(targetRefDir, 'securities'));
    }
    console.log('   📚 Đã đính kèm references/securities dùng chung vào gói plugin.');
  }

  // 3. Tạo file README.md hướng dẫn cài đặt độc lập chi tiết
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'plugin.json'), 'utf8'));
  const skillsList = getPluginSkills(srcDir);
  const commandsList = getPluginCommands(srcDir);

  const skillsTable = skillsList.map(s => `- \`${s}\``).join('\n') || '- Không có skill độc lập';
  const commandsTable = commandsList.map(c => `- \`/${c}\``).join('\n') || '- Không có lệnh slash command';

  const readmeContent = `# ${manifest.name} (v${manifest.version})

> ${manifest.description}

Gói plugin độc lập được trích xuất từ \`agent-skills\` để tích hợp trực tiếp vào dự án microservice của bạn mà không cần clone cả monorepo.

---

## 🛠️ Danh Sách Kỹ Năng & Lệnh Có Sẵn

### Kỹ Năng (Skills)
${skillsTable}

### Lệnh Nhanh (Slash Commands)
${commandsTable}

---

## 🚀 Hướng Dẫn Cài Đặt Vào Dự Án Microservice

### Cách 1: Sử dụng trong Claude Code (Khuyên dùng)
Chạy lệnh trực tiếp từ thư mục dự án microservice của bạn:
\`\`\`bash
# 1. Chạy với thư mục plugin cục bộ
claude --plugin-dir /path/to/agent-skills-${options.plugin}

# 2. Hoặc nạp vĩnh viễn vào settings.json của dự án microservice:
# Thêm vào .claude/settings.json của microservice:
# {
#   "pluginDirs": ["/path/to/agent-skills-${options.plugin}"]
# }
\`\`\`

### Cách 2: Sử dụng trong Google Antigravity / Gemini CLI
1. Sao chép thư mục này vào dự án microservice của bạn:
\`\`\`bash
# Tạo thư mục plugins trong workspace
mkdir -p /path/to/my-microservice/.agents/plugins/
cp -r /path/to/agent-skills-${options.plugin} /path/to/my-microservice/.agents/plugins/
\`\`\`
2. Hoặc cài đặt toàn cục vào máy cá nhân:
\`\`\`bash
mkdir -p ~/.gemini/config/plugins/
cp -r /path/to/agent-skills-${options.plugin} ~/.gemini/config/plugins/
\`\`\`

---

## 📖 Kiểm Tra Hoạt Động
Mở khung chat của AI Agent trong dự án microservice và gõ lệnh kiểm tra:
\`\`\`text
${commandsList[0] ? `/${commandsList[0]}` : '/help'}
\`\`\`
`;

  fs.writeFileSync(path.join(outDir, 'README.md'), readmeContent, 'utf8');
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

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

main();
