#!/usr/bin/env node

/**
 * Script Tự Động Thiết Lập n8n cho Client Mới (`scripts/setup-n8n.js`)
 *
 * Tự động hóa:
 * 1. Kiểm tra môi trường Node.js và n8n CLI
 * 2. Tự động sửa lỗi sqlite3 native build nếu có
 * 3. Tự động import toàn bộ workflows mẫu từ `n8n-workflows/` vào n8n
 * 4. Hướng dẫn khởi động chạy ngầm bằng PM2
 *
 * Cách dùng:
 *   npm run n8n:setup
 *   node scripts/setup-n8n.js
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('='.repeat(65));
console.log('  THIẾT LẬP N8N FAST-PATH TỰ ĐỘNG CHO AGENT-SKILLS (0 ĐỒNG)');
console.log('='.repeat(65));

// 1. Kiểm tra n8n
let hasN8n = false;
try {
  const n8nPath = execSync('which n8n', { encoding: 'utf-8' }).trim();
  if (n8nPath) {
    console.log(`✅ Đã tìm thấy n8n tại: ${n8nPath}`);
    hasN8n = true;
  }
} catch {
  hasN8n = false;
}

if (!hasN8n) {
  console.log('⚠️  Chưa tìm thấy n8n toàn cục trên máy.');
  console.log('Đang tiến hành cài đặt n8n (npm install -g n8n)...');
  try {
    execSync('npm install -g n8n', { stdio: 'inherit' });
    console.log('✅ Cài đặt n8n thành công!');
    hasN8n = true;
  } catch (err) {
    console.error('❌ Không thể tự động cài đặt n8n. Vui lòng chạy thủ công:');
    console.error('   npm install -g n8n');
    process.exit(1);
  }
}

// 2. Kiểm tra và fix sqlite3 nếu thiếu binary build (thường gặp trên npm 12+ / Mac)
try {
  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const sqlite3Path = path.join(globalRoot, 'n8n', 'node_modules', 'sqlite3');
  if (fs.existsSync(sqlite3Path)) {
    const buildPath = path.join(sqlite3Path, 'build');
    const libBindingPath = path.join(sqlite3Path, 'lib', 'binding');
    if (!fs.existsSync(buildPath) && !fs.existsSync(libBindingPath)) {
      console.log('⚙️  Đang biên dịch native module sqlite3 cho n8n...');
      execSync('npm run install', { cwd: sqlite3Path, stdio: 'inherit' });
      console.log('✅ Đã biên dịch sqlite3 thành công!');
    }
  }
} catch (e) {
  // Bỏ qua nếu không thể kiểm tra đường dẫn global
}

// 3. Tự động Import Workflows từ thư mục n8n-workflows/
const workflowsDir = path.join(projectRoot, 'n8n-workflows');
if (fs.existsSync(workflowsDir)) {
  console.log('\n📥 Đang tự động nạp các Workflow mẫu từ n8n-workflows/...');
  try {
    execSync(`n8n import:workflow --separate --input="${workflowsDir}"`, { stdio: 'inherit' });
    console.log('✅ Đã nạp thành công toàn bộ workflows mẫu vào n8n!');
  } catch (err) {
    console.log('⚠️  Không thể nạp workflow tự động (có thể do n8n đang bận). Bạn có thể nạp sau.');
  }
}

console.log('\n' + '='.repeat(65));
console.log('🎉 THIẾT LẬP HOÀN TẤT!');
console.log('='.repeat(65));
console.log('Bây giờ bạn có thể quản lý n8n chạy ngầm hoàn toàn qua npm:');
console.log('  • npm run n8n:bg       --> Khởi động n8n chạy ngầm (PM2)');
console.log('  • npm run n8n:status   --> Xem trạng thái tiến trình chạy ngầm');
console.log('  • npm run n8n:logs     --> Xem log hoạt động');
console.log('  • npm run n8n:stop     --> Dừng tiến trình chạy ngầm');
console.log('  • npm run n8n          --> Chạy n8n trực tiếp trên cửa sổ Terminal');
console.log('='.repeat(65));
