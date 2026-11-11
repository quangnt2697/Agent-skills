#!/usr/bin/env node
/**
 * diff-checkpoint.js — So sánh thay đổi giữa Checkpoint và Workspace hiện tại
 *
 * Cho phép kỹ sư kiểm tra nhanh xem những file nào trong workspace/
 * đã được chỉnh sửa, thêm mới hoặc xóa đi kể từ mốc snapshot gần nhất.
 *
 * Cách dùng:
 *   node scripts/checkpoint/diff-checkpoint.js [--file <checkpoint-file>]
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHECKPOINT_DIR = path.join(REPO_ROOT, '.checkpoints');

function parseArgs() {
  const args = process.argv.slice(2);
  let file = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' || args[i] === '-f') {
      file = args[++i];
    }
  }
  return { file };
}

function findLatestCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_DIR)) return null;
  const files = fs.readdirSync(CHECKPOINT_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return null;

  // Ưu tiên auto-save.json nếu có, hoặc file json mới nhất theo mtime
  if (files.includes('auto-save.json')) {
    return path.join(CHECKPOINT_DIR, 'auto-save.json');
  }

  files.sort((a, b) => {
    const statA = fs.statSync(path.join(CHECKPOINT_DIR, a));
    const statB = fs.statSync(path.join(CHECKPOINT_DIR, b));
    return statB.mtimeMs - statA.mtimeMs;
  });

  return path.join(CHECKPOINT_DIR, files[0]);
}

function main() {
  const { file } = parseArgs();
  const checkpointPath = file ? path.resolve(file) : findLatestCheckpoint();

  console.log('🔍 So Sánh Biến Động Workspace So Với Checkpoint (Snapshot Diff)');
  console.log('=================================================================');

  if (!checkpointPath || !fs.existsSync(checkpointPath)) {
    console.log('ℹ️ Không tìm thấy file checkpoint nào trong .checkpoints/.');
    console.log('👉 Bạn có thể lưu checkpoint thủ công bằng lệnh: /save-checkpoint');
    process.exit(0);
  }

  console.log(`📌 Checkpoint tham chiếu: ${path.relative(REPO_ROOT, checkpointPath)}`);

  let checkpointData;
  try {
    checkpointData = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Lỗi đọc file checkpoint: ${err.message}`);
    process.exit(1);
  }

  const savedTime = checkpointData.timestamp || 'Không rõ';
  const savedBranch = checkpointData.branch || 'HEAD';
  console.log(`⏰ Thời điểm snapshot : ${savedTime}`);
  console.log(`🌿 Nhánh tại snapshot : ${savedBranch}`);
  console.log('-----------------------------------------------------------------');

  // Quét danh sách file hiện tại trong workspace/
  function scanWorkspaceFiles(dir) {
    const result = new Map();
    if (!fs.existsSync(dir)) return result;
    function walk(d) {
      try {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.name.startsWith('.')) continue;
          if (e.isDirectory()) walk(p);
          else if (e.isFile()) {
            const rel = path.relative(REPO_ROOT, p);
            const stat = fs.statSync(p);
            result.set(rel, { mtime: stat.mtimeMs, size: stat.size });
          }
        }
      } catch (_) {}
    }
    walk(dir);
    return result;
  }

  const currentFiles = scanWorkspaceFiles(path.join(REPO_ROOT, 'workspace'));
  const snapshotFiles = new Map();

  if (Array.isArray(checkpointData.workspace_files_snapshot)) {
    for (const item of checkpointData.workspace_files_snapshot) {
      snapshotFiles.set(item.path, item);
    }
  } else if (Array.isArray(checkpointData.changed_workspace_files)) {
    for (const p of checkpointData.changed_workspace_files) {
      snapshotFiles.set(p, { path: p });
    }
  }

  const diffItems = [];

  // File mới hoặc sửa đổi
  for (const [filePath, currentStat] of currentFiles.entries()) {
    if (!snapshotFiles.has(filePath)) {
      diffItems.push({ icon: '✨ Mới (Untracked)', filePath });
    } else {
      const snapStat = snapshotFiles.get(filePath);
      if (snapStat.size !== undefined && (snapStat.size !== currentStat.size || Math.abs(snapStat.mtime - currentStat.mtime) > 1000)) {
        diffItems.push({ icon: '📝 Sửa đổi', filePath });
      }
    }
  }

  // File đã bị xóa
  for (const [filePath] of snapshotFiles.entries()) {
    if (!currentFiles.has(filePath)) {
      diffItems.push({ icon: '🗑️ Đã xóa', filePath });
    }
  }

  if (diffItems.length === 0) {
    console.log(`✅ Workspace đồng nhất với checkpoint (${currentFiles.size} files).`);
  } else {
    console.log(`📂 Phát hiện ${diffItems.length} biến động trong workspace/ so với snapshot:`);
    for (const item of diffItems) {
      console.log(`  ${item.icon.padEnd(20)}: ${item.filePath}`);
    }
  }

  // Kiểm tra trạng thái .agents/workspace_state.md
  const stateFile = path.join(REPO_ROOT, '.agents', 'workspace_state.md');
  if (fs.existsSync(stateFile)) {
    console.log('-----------------------------------------------------------------');
    console.log('📝 Trạng thái ngữ cảnh (.agents/workspace_state.md): ĐÃ CÓ');
  }

  console.log('=================================================================');
  console.log('💡 Gõ \'/save-checkpoint\' để cập nhật mốc snapshot mới.');
}

main();
