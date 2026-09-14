#!/usr/bin/env node
/**
 * scripts/repo-sync.js
 * 
 * Engine đồng bộ mã nguồn (Fetch & Pull Multi-repo Sync)
 * Hỗ trợ các cờ chuẩn của discord-bridge:
 *   -p, --project, project: <tên_project_hoặc_thư_mục>
 *   -b, --branch, branch: <nhánh_cần_pull>
 *   -d, --des, des: <mô_tả_hoặc_ghi_chú>
 *   --stash: Tự động stash thay đổi chưa lưu trước khi pull và pop lại
 *   --dry-run: Chỉ kiểm tra độ lệch commit với remote mà không pull thật
 *   --all: Đồng bộ tất cả project được cấu hình
 *   --list: Liệt kê danh sách project đã cấu hình và phát hiện được
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROJECTS_JSON_PATH = path.resolve(ROOT_DIR, 'tools', 'discord-bridge', 'projects.json');

// ─── PARSE ARGUMENTS ─────────────────────────────────────────────────────────

export function parseArgs(rawArgs) {
  const args = Array.isArray(rawArgs) ? rawArgs : (rawArgs || '').split(/\s+/).filter(Boolean);
  const options = {
    project: null,
    branch: null,
    des: '',
    stash: false,
    dryRun: false,
    all: false,
    list: false,
    rawText: Array.isArray(rawArgs) ? rawArgs.join(' ') : (rawArgs || '')
  };

  const text = options.rawText.trim();

  // 1. Kiểm tra boolean flags
  if (/(?:^|\s)--stash(?:\s|$)/i.test(text)) options.stash = true;
  if (/(?:^|\s)--dry-run(?:\s|$)/i.test(text)) options.dryRun = true;
  if (/(?:^|\s)--all(?:\s|$)/i.test(text)) options.all = true;
  if (/(?:^|\s)--list(?:\s|$)/i.test(text)) options.list = true;

  // 2. Trích xuất project (-p, --project, project:)
  const pMatch = text.match(/(?:^|\s)(?:--project|-p|project:)\s+([^\s]+)/i);
  if (pMatch) {
    options.project = pMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // 3. Trích xuất branch (-b, --branch, branch:)
  const bMatch = text.match(/(?:^|\s)(?:--branch|-b|branch:)\s+([^\s]+)/i);
  if (bMatch) {
    options.branch = bMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // 4. Trích xuất des (-d, --des, des:)
  const dMatch = text.match(/(?:^|\s)(?:--des|-d|des:)\s+(.*)$/i);
  if (dMatch) {
    options.des = dMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // 5. Fallback nếu không dùng flag mà truyền tham số positional
  if (!options.project && !options.list && !options.all) {
    const cleanWords = args.filter(w => !w.startsWith('-') && !w.includes(':'));
    if (cleanWords.length > 0 && !['sync', '/sync', 'repo-sync', '/repo-sync'].includes(cleanWords[0])) {
      options.project = cleanWords[0];
    } else if (cleanWords.length > 1) {
      options.project = cleanWords[1];
    }
  }

  return options;
}

// ─── LOAD PROJECTS MAPPING ───────────────────────────────────────────────────

export function loadProjectsConfig() {
  const mapping = {};
  if (fs.existsSync(PROJECTS_JSON_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROJECTS_JSON_PATH, 'utf8'));
      for (const [key, val] of Object.entries(data)) {
        mapping[key.toLowerCase().trim()] = path.resolve(val);
      }
    } catch (err) {
      console.error(`⚠️ Lỗi khi đọc ${PROJECTS_JSON_PATH}: ${err.message}`);
    }
  }
  return mapping;
}

// ─── RESOLVE TARGET REPOSITORIES ─────────────────────────────────────────────

export function resolveTargetProjects(query, configMapping) {
  const targets = [];
  const cleanQuery = query ? query.toLowerCase().trim() : '';

  // Case 1: Không có query và không có flag all -> Kiểm tra CWD hiện tại
  if (!cleanQuery) {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.git'))) {
      targets.push({ name: path.basename(cwd), path: cwd });
    }
    return targets;
  }

  // Case 2: Query khớp trực tiếp với alias trong projects.json
  if (configMapping[cleanQuery]) {
    const targetPath = configMapping[cleanQuery];
    inspectPathAndCollect(cleanQuery, targetPath, targets);
    return targets;
  }

  // Case 3: Query khớp prefix/substring với alias trong projects.json
  for (const [alias, targetPath] of Object.entries(configMapping)) {
    if (alias.startsWith(cleanQuery) || alias.includes(cleanQuery)) {
      inspectPathAndCollect(alias, targetPath, targets);
    }
  }

  if (targets.length > 0) return targets;

  // Case 4: Query là một đường dẫn thực tế trên máy
  const resolvedPath = path.resolve(query);
  if (fs.existsSync(resolvedPath)) {
    inspectPathAndCollect(path.basename(resolvedPath), resolvedPath, targets);
  }

  return targets;
}

function inspectPathAndCollect(name, targetPath, targetList) {
  if (!fs.existsSync(targetPath)) return;

  // Nếu chính thư mục này là một git repo
  if (fs.existsSync(path.join(targetPath, '.git'))) {
    if (!targetList.some(t => t.path === targetPath)) {
      targetList.push({ name, path: targetPath });
    }
    return;
  }

  // Nếu thư mục này chứa các git repo con (ví dụ: folder 3.1 chứa openapi-tyk, openapi-websocket)
  try {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(targetPath, entry.name);
        if (fs.existsSync(path.join(subPath, '.git'))) {
          if (!targetList.some(t => t.path === subPath)) {
            targetList.push({ name: entry.name, path: subPath });
          }
        }
      }
    }
  } catch (err) {
    // Bỏ qua lỗi truy cập thư mục
  }
}

// ─── GIT SYNC ENGINE ─────────────────────────────────────────────────────────

export function syncSingleRepo(repoPath, options = {}) {
  const result = {
    name: path.basename(repoPath),
    path: repoPath,
    currentBranch: 'unknown',
    status: 'UNKNOWN',
    behind: 0,
    ahead: 0,
    latestSha: '',
    message: '',
    durationMs: 0
  };

  const startTime = Date.now();

  try {
    // 1. Lấy tên branch hiện tại
    result.currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // 2. Kiểm tra trạng thái Working Tree (Dirty check)
    const statusOut = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const isDirty = statusOut.length > 0;
    let didStash = false;

    if (isDirty) {
      if (!options.stash) {
        result.status = 'DIRTY_SKIPPED';
        result.message = 'Có thay đổi chưa commit. Đã bỏ qua để tránh mất code (dùng --stash để auto-stash).';
        result.durationMs = Date.now() - startTime;
        return result;
      } else {
        // Tự động stash
        execSync('git stash push -u -m "auto-stash-before-repo-sync"', {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        didStash = true;
      }
    }

    // 3. Nếu có chỉ định branch khác và cần chuyển sang branch đó
    if (options.branch && options.branch !== result.currentBranch) {
      try {
        execSync(`git checkout ${options.branch}`, {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        result.currentBranch = options.branch;
      } catch (e) {
        result.status = 'BRANCH_CHECKOUT_FAILED';
        result.message = `Không thể checkout sang nhánh ${options.branch}: ${e.message.split('\n')[0]}`;
        if (didStash) execSync('git stash pop', { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] });
        result.durationMs = Date.now() - startTime;
        return result;
      }
    }

    // 4. Fetch metadata mới nhất từ origin
    execSync('git fetch origin --prune', {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });

    // 5. Kiểm tra upstream tracking branch
    let upstream = '';
    try {
      upstream = execSync('git rev-parse --abbrev-ref @{u}', {
        cwd: repoPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      // Không có upstream tracking
    }

    if (!upstream) {
      result.status = 'NO_UPSTREAM';
      result.message = `Nhánh '${result.currentBranch}' chưa gắn upstream tracking remote.`;
      if (didStash) execSync('git stash pop', { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] });
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // 6. So sánh commit delta: HEAD vs @{u}
    const deltaStr = execSync('git rev-list --left-right --count HEAD...@{u}', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const [aheadCount, behindCount] = deltaStr.split(/\s+/).map(n => parseInt(n, 10) || 0);
    result.ahead = aheadCount;
    result.behind = behindCount;

    // 7. Xử lý trạng thái và kéo code
    if (behindCount === 0 && aheadCount === 0) {
      result.status = 'UP_TO_DATE';
      result.message = 'Đã ở phiên bản mới nhất';
    } else if (aheadCount > 0 && behindCount > 0) {
      result.status = 'DIVERGED';
      result.message = `Nhánh bị phân kỳ (Ahead ${aheadCount}, Behind ${behindCount}). Cần rebase thủ công.`;
    } else if (aheadCount > 0 && behindCount === 0) {
      result.status = 'AHEAD';
      result.message = `Local đi trước remote ${aheadCount} commit chưa push.`;
    } else if (behindCount > 0) {
      if (options.dryRun) {
        result.status = 'BEHIND';
        result.message = `[Dry-run] Có ${behindCount} commit mới trên remote chưa pull.`;
      } else {
        // Kéo code bằng fast-forward only
        execSync('git pull --ff-only', {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        result.status = 'PULLED';
        result.message = `Đã kéo thành công +${behindCount} commit mới.`;
      }
    }

    // Lấy SHA mới nhất
    result.latestSha = execSync('git rev-parse --short HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // 8. Pop stash nếu trước đó đã auto-stash
    if (didStash) {
      try {
        execSync('git stash pop', {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        result.message += ' (Đã khôi phục stash thành công)';
      } catch {
        result.message += ' (⚠️ Xung đột khi pop stash, dữ liệu vẫn an toàn trong stash list)';
      }
    }

  } catch (err) {
    result.status = 'ERROR';
    result.message = err.message.split('\n')[0];
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ─── FORMAT MARKDOWN TABLE REPORT ────────────────────────────────────────────

export function formatReport(results) {
  if (!results || results.length === 0) {
    return '⚠️ Không tìm thấy repository nào phù hợp để đồng bộ.';
  }

  const statusIcons = {
    PULLED: '🟢 Pulled',
    UP_TO_DATE: '⚪ Up-to-date',
    BEHIND: '🟡 Behind',
    AHEAD: '⚪ Ahead',
    DIRTY_SKIPPED: '⚠️ Dirty Skipped',
    DIVERGED: '🔴 Diverged',
    BRANCH_CHECKOUT_FAILED: '❌ Branch Error',
    NO_UPSTREAM: 'ℹ️ No Upstream',
    ERROR: '❌ Error'
  };

  let md = '### 📊 Báo Cáo Đồng Bộ Mã Nguồn (Repo Sync Report)\n\n';
  md += '| Repository | Branch | Trạng Thái | Delta | Commit SHA | Thời Gian | Ghi Chú |\n';
  md += '|:---|:---|:---:|:---:|:---:|:---:|:---|\n';

  for (const r of results) {
    const iconLabel = statusIcons[r.status] || r.status;
    const deltaStr = r.behind > 0 ? `+${r.behind}` : (r.ahead > 0 ? `^${r.ahead}` : '0');
    const sha = r.latestSha || '-';
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`;
    md += `| **${r.name}** | \`${r.currentBranch}\` | ${iconLabel} | \`${deltaStr}\` | \`${sha}\` | ${dur} | ${r.message} |\n`;
  }

  const pulledCount = results.filter(r => r.status === 'PULLED').length;
  const upToDateCount = results.filter(r => r.status === 'UP_TO_DATE').length;
  const skippedCount = results.filter(r => r.status === 'DIRTY_SKIPPED').length;
  const errCount = results.filter(r => ['ERROR', 'DIVERGED', 'BRANCH_CHECKOUT_FAILED'].includes(r.status)).length;

  md += `\n**Tổng kết:** ${results.length} repos | 🟢 Cập nhật: ${pulledCount} | ⚪ Mới nhất: ${upToDateCount} | ⚠️ Bỏ qua: ${skippedCount} | ❌ Cảnh báo/Lỗi: ${errCount}\n`;

  return md;
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────

export async function run(rawArgs = process.argv.slice(2)) {
  const options = parseArgs(rawArgs);
  const configMapping = loadProjectsConfig();

  if (options.list) {
    console.log('\n📂 Danh Sách Projects Đã Cấu Hình (từ projects.json):');
    console.log('--------------------------------------------------');
    for (const [alias, p] of Object.entries(configMapping)) {
      const exists = fs.existsSync(p) ? '✓' : '✗';
      console.log(`  [${exists}] ${alias.padEnd(20)} -> ${p}`);
    }
    console.log('\nCách dùng: node scripts/repo-sync.js -p <tên_project> [--stash] [--dry-run]\n');
    return;
  }

  let targets = [];
  if (options.all) {
    for (const [alias, p] of Object.entries(configMapping)) {
      inspectPathAndCollect(alias, p, targets);
    }
  } else {
    targets = resolveTargetProjects(options.project, configMapping);
  }

  if (targets.length === 0) {
    console.log(`⚠️ Không tìm thấy project nào khớp với: "${options.project || 'CWD'}".`);
    console.log('Dùng --list để xem danh sách các project alias có sẵn.');
    return;
  }

  console.log(`🚀 Bắt đầu đồng bộ ${targets.length} repository...`);
  const results = [];

  for (const target of targets) {
    process.stdout.write(`  ⏳ Đang kiểm tra ${target.name}... `);
    const res = syncSingleRepo(target.path, options);
    results.push(res);
    console.log(`[${res.status}]`);
  }

  const report = formatReport(results);
  console.log('\n' + report);
  return results;
}

// Chạy trực tiếp nếu là entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error(`\n❌ Lỗi thực thi repo-sync: ${err.message}`);
    process.exit(1);
  });
}
