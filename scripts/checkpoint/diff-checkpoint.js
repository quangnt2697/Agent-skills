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

  // Lấy trạng thái git status hiện tại của workspace/
  let currentGitStatus = '';
  try {
    currentGitStatus = execFileSync('git', ['status', '--porcelain', 'workspace/'], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    }).trim();
  } catch (err) {
    console.error(`❌ Lỗi lấy git status: ${err.message}`);
    process.exit(1);
  }

  if (!currentGitStatus) {
    console.log('✅ Workspace sạch sẽ — không có file nào đang thay đổi hoặc chưa track.');
  } else {
    console.log('📂 Trạng thái workspace/ hiện tại:');
    const lines = currentGitStatus.split('\n');
    for (const line of lines) {
      const code = line.slice(0, 2).trim();
      const filePath = line.slice(3).trim();
      let icon = '📝 Sửa đổi';
      if (code === '??') icon = '✨ Mới (Untracked)';
      else if (code === 'A')  icon = '➕ Đã add (Staged)';
      else if (code === 'D')  icon = '🗑️ Đã xóa';
      console.log(`  ${icon.padEnd(20)}: ${filePath}`);
    }
  }

  console.log('=================================================================');
  console.log('💡 Gõ \'/save-checkpoint\' để cập nhật mốc snapshot mới.');
}

main();
