#!/usr/bin/env node

/**
 * clean-issue-workspace.js
 *
 * Tự động dọn dẹp các file nháp, scratch debug và file quá trình trong `workspace/issues/{issueKey}/`
 * sau khi chốt `refined.md`/`final.md` và push lên Jira.
 *
 * Chỉ giữ lại BỘ THÀNH QUẢ CUỐI CÙNG:
 * - spec/refined.md, spec/final.md, spec/testability-manifest.json
 * - spec/diagrams/ (hoặc tech/): mockup.html, file render script, và các ảnh mockup được nhúng trong spec
 * - source/: jira-issue.json, multi-source-context.md, và duy nhất 1 bản jira-description-backup mới nhất
 *
 * Cách dùng:
 *   node scripts/workspace/clean-issue-workspace.js <issueKey>            # Dọn dẹp 1 ticket cụ thể
 *   node scripts/workspace/clean-issue-workspace.js <issueKey> --dry-run  # Xem trước, không xóa file
 *   node scripts/workspace/clean-issue-workspace.js --all                 # Dọn dẹp toàn bộ issues
 *   node scripts/workspace/clean-issue-workspace.js                       # Dọn dẹp toàn bộ issues
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Trích xuất danh sách tên file ảnh được tham chiếu trong nội dung Markdown
 * @param {string} markdownContent
 * @returns {Set<string>} Tập hợp các basename của ảnh (vd: 'mockup.png', 'mockup-case-1.png')
 */
export function extractReferencedImageNames(markdownContent) {
  const images = new Set();
  if (!markdownContent || typeof markdownContent !== 'string') return images;

  // 1. Markdown image syntax: ![alt](path/to/img.png)
  const mdRegex = /!\[.*?\]\(([^)\s]+)(?:\s+["'].*?["'])?\)/g;
  let match;
  while ((match = mdRegex.exec(markdownContent)) !== null) {
    const rawPath = match[1].trim();
    const base = path.basename(rawPath);
    if (base && /\.(png|jpe?g|svg|webp|gif)$/i.test(base)) {
      images.add(base);
    }
  }

  // 2. HTML img tag syntax: <img src="path/to/img.png" ...>
  const htmlRegex = /<img\s+[^>]*?src=["']([^"']+)["']/gi;
  while ((match = htmlRegex.exec(markdownContent)) !== null) {
    const rawPath = match[1].trim();
    const base = path.basename(rawPath);
    if (base && /\.(png|jpe?g|svg|webp|gif)$/i.test(base)) {
      images.add(base);
    }
  }

  return images;
}

/**
 * Dọn dẹp workspace cho một ticket cụ thể
 * @param {string} issueKey
 * @param {object} options { rootDir, dryRun, verbose }
 * @returns {object} { success, issueKey, removedFiles: [], preservedFiles: [], reason }
 */
export function cleanIssueWorkspace(issueKey, { rootDir = DEFAULT_PROJECT_ROOT, dryRun = false, verbose = false } = {}) {
  const issueDir = path.resolve(rootDir, 'workspace', 'issues', issueKey);
  const result = {
    success: false,
    issueKey,
    removedFiles: [],
    preservedFiles: [],
    reason: ''
  };

  if (!fs.existsSync(issueDir)) {
    result.reason = 'Thư mục issue không tồn tại';
    return result;
  }

  const specDir = path.join(issueDir, 'spec');
  const refinedPath = path.join(specDir, 'refined.md');
  const finalPath = path.join(specDir, 'final.md');

  // Chốt chặn an toàn: CHỈ dọn dẹp khi spec đã được chốt (có refined.md hoặc final.md)
  const hasRefined = fs.existsSync(refinedPath);
  const hasFinal = fs.existsSync(finalPath);
  if (!hasRefined && !hasFinal) {
    result.reason = 'Chưa có spec chốt (refined.md hoặc final.md) — đang trong quá trình soạn thảo, không xóa file nháp';
    return result;
  }

  // 1. Thu thập danh sách ảnh thực tế đang được sử dụng trong spec
  let combinedSpecContent = '';
  if (hasRefined) combinedSpecContent += fs.readFileSync(refinedPath, 'utf8') + '\n';
  if (hasFinal) combinedSpecContent += fs.readFileSync(finalPath, 'utf8') + '\n';

  const usedImageNames = extractReferencedImageNames(combinedSpecContent);

  const filesToDelete = [];
  const filesToKeep = [];

  // Helper duyệt và phân loại file
  const recordKeep = (filePath) => filesToKeep.push(path.relative(issueDir, filePath));
  const recordDelete = (filePath) => filesToDelete.push(filePath);

  // A. Xử lý thư mục spec/
  if (fs.existsSync(specDir)) {
    const specEntries = fs.readdirSync(specDir, { withFileTypes: true });
    for (const entry of specEntries) {
      const fullPath = path.join(specDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '.scratch') {
          // Xóa toàn bộ thư mục .scratch
          recordDelete(fullPath);
        } else if (entry.name === 'diagrams') {
          // Xử lý bên trong thư mục diagrams/
          const diagEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const dEntry of diagEntries) {
            const dPath = path.join(fullPath, dEntry.name);
            if (dEntry.isDirectory()) {
              recordKeep(dPath);
              continue;
            }

            // File scratch/debug/asis tạm thời trong diagrams/: XÓA
            if (/^(scratch-|temp-|debug-|test-|parse_|asis-)/i.test(dEntry.name)) {
              recordDelete(dPath);
              continue;
            }

            // HTML thiết kế hoặc scripts render chính thức: BẮT BUỘC GIỮ
            if (/\.(html|mjs|js|py|sh)$/i.test(dEntry.name)) {
              recordKeep(dPath);
              continue;
            }

            // Ảnh: Chỉ giữ lại nếu được tham chiếu trong spec
            if (/\.(png|jpe?g|svg|webp|gif)$/i.test(dEntry.name)) {
              if (usedImageNames.has(dEntry.name)) {
                recordKeep(dPath);
              } else {
                recordDelete(dPath);
              }
              continue;
            }

            // File khác trong diagrams (vd .mmd nháp): xóa
            if (/\.(mmd|txt|bak|tmp)$/i.test(dEntry.name)) {
              recordDelete(dPath);
            } else {
              recordKeep(dPath);
            }
          }
        } else {
          recordKeep(fullPath);
        }
        continue;
      }

      // Xử lý các file trực tiếp dưới spec/
      if (entry.name === 'refined.md' || entry.name === 'final.md' || entry.name === 'testability-manifest.json') {
        recordKeep(fullPath);
      } else if (entry.name === 'refined-draft.md') {
        // Đã có refined.md/final.md -> xóa refined-draft.md
        recordDelete(fullPath);
      } else if (
        /\.(mmd|py|sh)$/i.test(entry.name) ||
        entry.name === 'adf.json' ||
        entry.name.startsWith('asis-')
      ) {
        // File trung gian: adf.json, parse_svg.py, *.mmd, asis-snapshot.html, asis-baseline.png
        recordDelete(fullPath);
      } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(entry.name)) {
        if (usedImageNames.has(entry.name)) {
          recordKeep(fullPath);
        } else {
          recordDelete(fullPath);
        }
      } else {
        recordKeep(fullPath);
      }
    }
  }

  // B. Xử lý thư mục tech/ (nếu có mockup hoặc script render nháp trong tech/)
  const techDir = path.join(issueDir, 'tech');
  if (fs.existsSync(techDir)) {
    const techEntries = fs.readdirSync(techDir, { withFileTypes: true });
    for (const entry of techEntries) {
      const fullPath = path.join(techDir, entry.name);
      if (entry.isDirectory()) {
        recordKeep(fullPath);
        continue;
      }

      // File scratch/debug/asis tạm thời trong tech/: XÓA
      if (/^(scratch-|temp-|debug-|test-|parse_|asis-)/i.test(entry.name)) {
        recordDelete(fullPath);
        continue;
      }

      // HTML và script render trong tech: giữ lại nếu là template thành quả
      if (/\.(html|mjs|js|py|sh)$/i.test(entry.name)) {
        recordKeep(fullPath);
        continue;
      }

      // Ảnh trong tech/: nếu không dùng trong spec -> xóa dọn dẹp
      if (/\.(png|jpe?g|svg|webp|gif)$/i.test(entry.name)) {
        if (usedImageNames.has(entry.name)) {
          recordKeep(fullPath);
        } else {
          recordDelete(fullPath);
        }
        continue;
      }

      // tech-spec.md, plan.md, ui-mapping.json -> giữ lại
      recordKeep(fullPath);
    }
  }

  // C. Xử lý thư mục source/ (Deduplicate jira-description-backup-*.json)
  const sourceDir = path.join(issueDir, 'source');
  if (fs.existsSync(sourceDir)) {
    const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true });
    const backupFiles = [];

    for (const entry of sourceEntries) {
      const fullPath = path.join(sourceDir, entry.name);
      if (entry.isFile() && /^jira-description-backup-\d+\.json$/.test(entry.name)) {
        const stat = fs.statSync(fullPath);
        backupFiles.push({ path: fullPath, name: entry.name, mtimeMs: stat.mtimeMs });
      }
    }

    if (backupFiles.length > 1) {
      // Sắp xếp giảm dần theo mtime (mới nhất lên đầu)
      backupFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
      // Giữ lại file mới nhất
      recordKeep(backupFiles[0].path);
      // Xóa tất cả các bản cũ hơn
      for (let i = 1; i < backupFiles.length; i++) {
        recordDelete(backupFiles[i].path);
      }
    }
  }

  // D. Xử lý các file rác nằm trực tiếp ở gốc issueDir (vd: version lightweight chart.txt)
  const rootEntries = fs.readdirSync(issueDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    const fullPath = path.join(issueDir, entry.name);
    if (entry.isFile()) {
      if (entry.name === '.pipeline-state.json') {
        recordKeep(fullPath);
      } else if (/\.(txt|tmp|bak|log)$/i.test(entry.name)) {
        recordDelete(fullPath);
      } else {
        recordKeep(fullPath);
      }
    }
  }

  // 2. Thực hiện xóa các file đã đánh dấu
  for (const targetPath of filesToDelete) {
    const rel = path.relative(issueDir, targetPath);
    result.removedFiles.push(rel);

    if (!dryRun) {
      try {
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
      } catch (err) {
        if (verbose) console.warn(`⚠️ Không thể xóa ${rel}: ${err.message}`);
      }
    }
  }

  result.preservedFiles = filesToKeep;
  result.success = true;
  return result;
}

/**
 * Quét và dọn dẹp toàn bộ các issues trong workspace/issues/
 * @param {object} options
 * @returns {Array<object>}
 */
export function cleanAllIssuesWorkspace({ rootDir = DEFAULT_PROJECT_ROOT, dryRun = false, verbose = false } = {}) {
  const issuesDir = path.resolve(rootDir, 'workspace', 'issues');
  const results = [];

  if (!fs.existsSync(issuesDir)) return results;

  const entries = fs.readdirSync(issuesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const res = cleanIssueWorkspace(entry.name, { rootDir, dryRun, verbose });
      results.push(res);
    }
  }

  return results;
}

/**
 * CLI Runner
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const positional = args.filter((a) => !a.startsWith('-'));

  console.log('='.repeat(65));
  console.log(`🧹 DỌN DẸP WORKSPACE ISSUES ${dryRun ? '(DRY-RUN)' : ''}`);
  console.log('='.repeat(65));

  if (positional.length > 0 && positional[0] !== 'all') {
    const issueKey = positional[0].toUpperCase();
    console.log(`Đang xử lý ticket: ${issueKey}...`);
    const res = cleanIssueWorkspace(issueKey, { dryRun, verbose });

    if (!res.success) {
      console.log(`ℹ️ ${issueKey}: ${res.reason}`);
    } else {
      console.log(`✅ [${issueKey}] Hoàn tất dọn dẹp:`);
      console.log(`   - File giữ lại (${res.preservedFiles.length}): ${res.preservedFiles.join(', ') || 'Không'}`);
      console.log(`   - File đã xóa (${res.removedFiles.length}): ${res.removedFiles.join(', ') || 'Không có file rác'}`);
    }
  } else {
    console.log('Quét toàn bộ thư mục workspace/issues/...\n');
    const results = cleanAllIssuesWorkspace({ dryRun, verbose });
    let totalRemoved = 0;

    for (const res of results) {
      if (!res.success) {
        if (verbose) console.log(`• ${res.issueKey}: ${res.reason}`);
      } else if (res.removedFiles.length > 0) {
        totalRemoved += res.removedFiles.length;
        console.log(`✅ [${res.issueKey}] Đã dọn dẹp ${res.removedFiles.length} file nháp/rác:`);
        for (const f of res.removedFiles) {
          console.log(`   - ${f}`);
        }
      } else {
        console.log(`✨ [${res.issueKey}] Đã sạch sẽ, không có file rác.`);
      }
    }

    console.log('\n' + '='.repeat(65));
    console.log(`🎉 TỔNG KẾT: Đã dọn dẹp ${totalRemoved} file rác/nháp trên toàn bộ workspace!`);
    console.log('='.repeat(65));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(`❌ Lỗi dọn dẹp workspace: ${err.message}`);
    process.exit(1);
  });
}

