#!/usr/bin/env node

/**
 * Script Import và Kích Hoạt (Active) Toàn Bộ Workflows vào n8n SQLite
 * (`scripts/n8n/import-and-activate.js`)
 *
 * Tự động:
 * 1. Quét toàn bộ 19 file workflow JSON trong `n8n-workflows/`.
 * 2. Cập nhật hoặc thêm mới vào `workflow_entity` và `workflow_history` trong `~/.n8n/database.sqlite`.
 * 3. Đảm bảo `active = 1` và `activeVersionId = versionId` (bắt buộc cho n8n v1+).
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const dbPath = path.join(os.homedir(), '.n8n', 'database.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Không tìm thấy database n8n tại: ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
const workflowsDir = path.join(projectRoot, 'n8n-workflows');

function findWorkflowFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findWorkflowFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

const workflowFiles = findWorkflowFiles(workflowsDir);
console.log(`🔍 Tìm thấy ${workflowFiles.length} file workflow trong n8n-workflows/...`);

let updatedCount = 0;
let insertedCount = 0;

for (const filePath of workflowFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const wf = JSON.parse(content);
    const id = wf.id;
    const name = wf.name || path.basename(filePath, '.json');
    const nodes = JSON.stringify(wf.nodes || []);
    const connections = JSON.stringify(wf.connections || {});
    const settings = JSON.stringify(wf.settings || {});
    const staticData = wf.staticData ? JSON.stringify(wf.staticData) : null;
    const pinData = wf.pinData ? JSON.stringify(wf.pinData) : null;

    if (!id) {
      console.warn(`⚠️ Bỏ qua file thiếu id: ${filePath}`);
      continue;
    }

    const existing = db.prepare('SELECT id, versionId, activeVersionId FROM workflow_entity WHERE id = ?').get(id);
    const newVersionId = crypto.randomUUID();

    // 1. Ghi bản ghi lịch sử vào workflow_history
    const histStmt = db.prepare(`
      INSERT INTO workflow_history (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, nodeGroups)
      VALUES (?, ?, 'agent-skills', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, 0, '[]')
    `);
    histStmt.run(newVersionId, id, nodes, connections, name);

    if (existing) {
      // 2a. Cập nhật workflow_entity
      const updateStmt = db.prepare(`
        UPDATE workflow_entity 
        SET name = ?, nodes = ?, connections = ?, settings = ?, staticData = COALESCE(?, staticData),
            pinData = COALESCE(?, pinData), versionId = ?, activeVersionId = ?, active = 1, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(name, nodes, connections, settings, staticData, pinData, newVersionId, newVersionId, id);
      updatedCount++;
      console.log(`  🔄 [UPDATED & ACTIVE] ${name} (${id})`);
    } else {
      // 2b. Thêm mới workflow_entity
      const insertStmt = db.prepare(`
        INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, pinData, versionId, activeVersionId, nodeGroups, createdAt, updatedAt)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      insertStmt.run(id, name, nodes, connections, settings, staticData, pinData, newVersionId, newVersionId);
      insertedCount++;
      console.log(`  ➕ [INSERTED & ACTIVE] ${name} (${id})`);
    }
  } catch (err) {
    console.error(`❌ Lỗi xử lý ${filePath}:`, err.message);
  }
}

db.close();

console.log(`\n🎉 Hoàn tất! Đã cập nhật ${updatedCount} workflows, thêm mới ${insertedCount} workflows.`);
console.log(`✅ Toàn bộ ${updatedCount + insertedCount} workflows đã được kích hoạt (active = 1, activeVersionId đồng bộ)!`);
