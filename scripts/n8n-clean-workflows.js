#!/usr/bin/env node

/**
 * Script Dọn Dẹp Workflow Cũ và Re-import Workflows Mới Chuẩn Hóa
 * (`scripts/n8n-clean-workflows.js`)
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const dbPath = path.join(os.homedir(), '.n8n', 'database.sqlite');
const workflowsDir = path.resolve('n8n-workflows');

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

// 3. Import lại 4 workflow chuẩn hóa mới
try {
  console.log('\n3. Đang import 4 workflow mới nhất từ n8n-workflows/...');
  execSync(`n8n import:workflow --separate --input="${workflowsDir}"`, { stdio: 'inherit' });
  console.log('✅ Đã nạp thành công các workflow mới!');
} catch (err) {
  console.error('❌ Lỗi khi import workflow:', err.message);
  process.exit(1);
}

// 4. Khởi động lại n8n chạy ngầm
try {
  console.log('\n4. Đang khởi động lại n8n chạy ngầm...');
  execSync('npm run n8n:bg', { stdio: 'inherit' });
} catch (e) {
  // ignore
}

// 5. Kiểm tra danh sách workflow hiện tại
try {
  console.log('\n5. Danh sách workflow hiện tại trên n8n:');
  const list = execSync('n8n list:workflow', { encoding: 'utf-8' });
  console.log(list);
} catch (e) {
  // ignore
}

console.log('='.repeat(65));
console.log('🎉 HOÀN TẤT DỌN DẸP VÀ IMPORT MỚI!');
console.log('='.repeat(65));
