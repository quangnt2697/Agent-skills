#!/usr/bin/env node

/**
 * Script Dọn Dẹp Workflow Cũ và Re-import Workflows Mới Chuẩn Hóa
 * (`scripts/n8n/n8n-clean-workflows.js`)
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

import fs from 'node:fs';

const dbPath = path.join(os.homedir(), '.n8n', 'database.sqlite');
const workflowsDir = path.resolve('n8n-workflows');

// Guard: kiểm tra sqlite3 CLI
try {
  execSync('which sqlite3', { stdio: 'pipe' });
} catch {
  console.error('\u274c Chưa cài sqlite3 CLI. Chạy: brew install sqlite3');
  process.exit(1);
}

console.log('='.repeat(65));
console.log('  DỌN DẸP WORKFLOW CŨ VÀ IMPORT LẠI BỘ WORKFLOW MỚI CHUẨN HÓA');
console.log('='.repeat(65));

// 1. Tạm dừng n8n để tránh lock database
try {
  console.log('1. Tạm dừng n8n...');
  execSync('npm run n8n:stop', { stdio: 'ignore' });
} catch (e) {
  // ignore
}

// 2. Xóa các workflow cũ trong database (giữ nguyên credentials đã lưu)
try {
  console.log('2. Đang xóa các workflow cũ bị trùng lặp...');
  const cleanSql = `
    DELETE FROM workflows_tags;
    DELETE FROM shared_workflow;
    DELETE FROM workflow_history;
    DELETE FROM workflow_statistics;
    DELETE FROM workflow_dependency;
    DELETE FROM workflow_entity;
  `;
  execSync(`sqlite3 "${dbPath}" "${cleanSql.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log('✅ Đã dọn dẹp sạch toàn bộ workflow cũ (Credentials vẫn giữ nguyên)!');
} catch (err) {
  console.error('❌ Lỗi khi dọn dẹp database:', err.message);
  process.exit(1);
}

// 3. Import lại toàn bộ workflow chuẩn hóa mới
try {
  console.log('\n3. Đang import toàn bộ workflow mới nhất từ n8n-workflows/...');
  const subdirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(workflowsDir, dirent.name));

  const targetDirs = subdirs.length > 0 ? subdirs : [workflowsDir];
  for (const dir of targetDirs) {
    execSync(`n8n import:workflow --separate --input="${dir}"`, { stdio: 'inherit' });
  }
  console.log('✅ Đã nạp thành công các workflow mới!');
} catch (err) {
  console.error('❌ Lỗi khi import workflow:', err.message);
  process.exit(1);
}

// 4. Kích hoạt (activate) toàn bộ workflow qua SQLite (kèm activeVersionId cho n8n v2+)
try {
  console.log('\n4. Đang kích hoạt (activate) các workflow...');
  execSync(`sqlite3 "${dbPath}" "UPDATE workflow_entity SET active = 1, activeVersionId = versionId;"`, { stdio: 'ignore' });
  const countOut = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM workflow_entity WHERE active = 1 AND activeVersionId IS NOT NULL;"`, { encoding: 'utf-8' }).trim();
  console.log(`✅ Đã kích hoạt thành công ${countOut} workflow!`);
} catch (err) {
  console.warn('⚠️ Cảnh báo khi kích hoạt workflow:', err.message);
}

// 5. Khởi động lại n8n chạy ngầm
try {
  console.log('\n5. Đang khởi động lại n8n chạy ngầm...');
  execSync('npm run n8n:bg', { stdio: 'inherit' });
} catch (e) {
  // ignore
}

// 6. Kiểm tra danh sách workflow hiện tại
try {
  console.log('\n6. Danh sách workflow hiện tại trên n8n:');
  const list = execSync(`sqlite3 "${dbPath}" "SELECT id, name, CASE WHEN active = 1 THEN '✅ Active' ELSE '❌ Inactive' END FROM workflow_entity;"`, { encoding: 'utf-8' });
  console.log(list);
} catch (e) {
  // ignore
}

console.log('='.repeat(65));
console.log('🎉 HOÀN TẤT DỌN DẸP VÀ IMPORT MỚI!');
console.log('='.repeat(65));
