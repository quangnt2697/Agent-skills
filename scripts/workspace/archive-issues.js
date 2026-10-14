#!/usr/bin/env node

/**
 * archive-issues.js
 *
 * Quản lý lưu trữ (archive) các thư mục issue trong `workspace/issues/`.
 * Tự động di chuyển các issue đã hoàn thành hoặc không hoạt động quá N ngày
 * (mặc định: 30 ngày) sang `workspace/archive/`.
 *
 * Cách dùng:
 *   node scripts/workspace/archive-issues.js                # Quét và lưu trữ issue > 30 ngày
 *   node scripts/workspace/archive-issues.js --dry-run      # Chỉ kiểm tra, không di chuyển
 *   node scripts/workspace/archive-issues.js --days=14      # Lưu trữ issue > 14 ngày
 *   node scripts/workspace/archive-issues.js --key=G3PTP-1  # Lưu trữ đích danh 1 issue cụ thể
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Lấy thời gian sửa đổi gần nhất của thư mục hoặc file bên trong.
 */
function getLatestMtime(dirPath) {
  let latest = fs.statSync(dirPath).mtimeMs;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = getLatestMtime(full);
        if (sub > latest) latest = sub;
      } else {
        const stat = fs.statSync(full);
        if (stat.mtimeMs > latest) latest = stat.mtimeMs;
      }
    }
  } catch {
    // fallback to folder stat
  }
  return latest;
}

/**
 * Thực thi lưu trữ các issues.
 * @param {Object} options
 * @param {string} [options.projectRoot]
 * @param {number} [options.days=30]
 * @param {boolean} [options.dryRun=false]
 * @param {string} [options.key]
 * @returns {{archived: string[], skipped: string[], errors: string[]}}
 */
export function archiveIssues({
  projectRoot = DEFAULT_PROJECT_ROOT,
  days = 30,
  dryRun = false,
  key = null,
} = {}) {
  const issuesDir = path.join(projectRoot, 'workspace', 'issues');
  const archiveDir = path.join(projectRoot, 'workspace', 'archive');
  const result = { archived: [], skipped: [], errors: [] };

  if (!fs.existsSync(issuesDir)) {
    return result;
  }

  if (!dryRun && !fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const now = Date.now();
  const maxAgeMs = days * 24 * 60 * 60 * 1000;

  const entries = fs.readdirSync(issuesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const issueKey = entry.name;

    if (key && issueKey.toUpperCase() !== key.toUpperCase()) {
      continue;
    }

    const sourcePath = path.join(issuesDir, issueKey);
    const destPath = path.join(archiveDir, issueKey);

    try {
      const latestMtime = getLatestMtime(sourcePath);
      const ageMs = now - latestMtime;
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

      if (key || ageMs >= maxAgeMs) {
        if (!dryRun) {
          if (fs.existsSync(destPath)) {
            // Nếu đã tồn tại ở archive, di dời hoặc ghi đè an toàn
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          fs.renameSync(sourcePath, destPath);
        }
        result.archived.push(`${issueKey} (${ageDays} ngày trước)`);
      } else {
        result.skipped.push(`${issueKey} (${ageDays} ngày trước, < ${days} ngày)`);
      }
    } catch (err) {
      result.errors.push(`${issueKey}: ${err.message}`);
    }
  }

  return result;
}

// CLI execution
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const daysArg = args.find(a => a.startsWith('--days='));
  const keyArg = args.find(a => a.startsWith('--key=') || a.startsWith('--issue='));

  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;
  const key = keyArg ? keyArg.split('=')[1] : null;

  console.log('='.repeat(60));
  console.log(`📦 Quản lý Lưu Trữ Workspace Issues (${dryRun ? 'DRY-RUN' : 'LIVE'})`);
  console.log(`- Tiêu chí: ${key ? `Issue ${key}` : `Tuổi > ${days} ngày`}`);
  console.log('='.repeat(60));

  const { archived, skipped, errors } = archiveIssues({ days, dryRun, key });

  if (archived.length > 0) {
    console.log(`\n✅ ${dryRun ? 'Sẽ lưu trữ' : 'Đã lưu trữ'} (${archived.length}):`);
    archived.forEach(item => console.log(`   - ${item}`));
  } else {
    console.log('\nℹ️ Không có issue nào cần lưu trữ.');
  }

  if (skipped.length > 0) {
    console.log(`\n⏸️ Còn hiệu lực (${skipped.length}):`);
    skipped.forEach(item => console.log(`   - ${item}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Lỗi (${errors.length}):`);
    errors.forEach(err => console.log(`   - ${err}`));
    process.exit(1);
  }
}
