#!/usr/bin/env node

/**
 * Script Import và Kích Hoạt (Active) Toàn Bộ Workflows vào n8n
 * (`scripts/n8n/import-and-activate.js`)
 *
 * Tự động:
 * 1. Nếu Docker container n8n đang chạy, dùng `n8n import:workflow` để nạp toàn bộ thư mục `n8n-workflows/`.
 * 2. Cập nhật SQLite database (.n8n-data/database.sqlite hoặc ~/.n8n/database.sqlite) để đặt `active = 1` và `activeVersionId = versionId`.
 * 3. Tự động reload để n8n xuất bản toàn bộ 18 workflows.
 */

import { DatabaseSync } from 'node:sqlite';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const isClean = process.argv.includes('--clean');

const dbCandidates = [
  process.env.N8N_DB_PATH,
  path.join(projectRoot, '.n8n-data', 'database.sqlite'),
  path.join(os.homedir(), '.n8n', 'database.sqlite')
].filter(Boolean);

// 1. Kiểm tra nếu container Docker n8n đang chạy
let isDockerRunning = false;
try {
  const containerCheck = execSync('docker ps --filter "name=agent-skills-n8n" --format "{{.Names}}"', { encoding: 'utf8' }).trim();
  if (containerCheck.includes('agent-skills-n8n')) {
    isDockerRunning = true;
  }
} catch (_) {}

// Nếu Docker đang chạy lần đầu, đợi tối đa 30s để n8n khởi tạo database.sqlite và /healthz
if (isDockerRunning) {
  console.log('⏳ Đang kiểm tra trạng thái sẵn sàng của container agent-skills-n8n...');
  for (let i = 1; i <= 30; i++) {
    const hasDb = dbCandidates.some(p => fs.existsSync(p));
    let isHealthy = false;
    try {
      execSync('curl -sf http://localhost:5678/healthz', { stdio: 'ignore' });
      isHealthy = true;
    } catch (_) {}
    if (hasDb && isHealthy) {
      break;
    }
    execSync('sleep 1');
  }
}

const dbPath = dbCandidates.find(p => fs.existsSync(p)) || null;

if (!dbPath) {
  console.error(`❌ Không tìm thấy database n8n tại: \n - ${dbCandidates.join('\n - ')}`);
  console.error('👉 Vui lòng khởi động n8n trước (npm run n8n:up) để tạo database.');
  process.exit(1);
}

console.log(`📁 Sử dụng n8n database: ${dbPath}`);

// Tuỳ chọn --clean: Xoá sạch các bản ghi workflow cũ (giữ nguyên credentials) trước khi import lại
if (isClean) {
  console.log('🧹 Đang dọn dẹp toàn bộ workflows cũ trong SQLite (giữ nguyên Credentials)...');
  if (isDockerRunning) {
    execSync('docker stop agent-skills-n8n', { stdio: 'ignore' });
  }
  const cleanDb = new DatabaseSync(dbPath);
  for (const table of ['workflows_tags', 'shared_workflow', 'workflow_history', 'workflow_statistics', 'workflow_dependency', 'workflow_entity']) {
    try {
      cleanDb.exec(`DELETE FROM ${table};`);
    } catch (_) {}
  }
  cleanDb.close();
  console.log('✅ Đã xóa sạch các workflow cũ!');
  if (isDockerRunning) {
    execSync('docker start agent-skills-n8n', { stdio: 'ignore' });
    for (let i = 1; i <= 30; i++) {
      try {
        execSync('curl -sf http://localhost:5678/healthz', { stdio: 'ignore' });
        break;
      } catch (_) {
        execSync('sleep 1');
      }
    }
  }
}

if (isDockerRunning) {
  console.log('📦 Phát hiện container Docker n8n đang chạy, đang import workflows...');
  const workflowsDir = path.join(projectRoot, 'n8n-workflows');
  const subDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const sub of subDirs) {
    try {
      execSync(`docker exec agent-skills-n8n n8n import:workflow --separate --input="/workspace/n8n-workflows/${sub}"`, { stdio: 'inherit' });
    } catch (err) {
      console.warn(`⚠️ Import ${sub} có cảnh báo:`, err.message);
    }
  }
}

// 2. Kích hoạt toàn bộ workflows trong SQLite database
try {
  if (isDockerRunning) {
    console.log('⏸️  Tạm dừng container để flush SQLite WAL trước khi kích hoạt workflows...');
    execSync('docker stop agent-skills-n8n', { stdio: 'ignore' });
  }

  const db = new DatabaseSync(dbPath);
  const res = db.prepare('UPDATE workflow_entity SET active = 1, activeVersionId = versionId').run();
  db.close();
  console.log(`✅ Đã kích hoạt (active = 1) cho ${res.changes} workflows trong SQLite!`);

  if (isDockerRunning) {
    console.log('🔄 Đang khởi động lại container để n8n xuất bản lịch chạy...');
    execSync('docker start agent-skills-n8n', { stdio: 'ignore' });
    for (let i = 1; i <= 30; i++) {
      try {
        execSync('curl -sf http://localhost:5678/healthz', { stdio: 'ignore' });
        break;
      } catch (_) {
        execSync('sleep 1');
      }
    }
    console.log('🎉 Hoàn tất! n8n đã sẵn sàng tại http://localhost:5678 (18/18 workflows active)');
  }
} catch (err) {
  console.error('❌ Lỗi kích hoạt SQLite workflows:', err.message);
  process.exit(1);
}
