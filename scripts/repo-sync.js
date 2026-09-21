#!/usr/bin/env node
/**
 * scripts/repo-sync.js
 * 
 * Engine đồng bộ mã nguồn (Fetch & Pull Multi-repo Sync)
 * Hỗ trợ các cờ chuẩn:
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
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROJECTS_JSON_PATH = path.resolve(ROOT_DIR, 'projects.json');
const PROJECTS_EXAMPLE_PATH = path.resolve(ROOT_DIR, 'projects.json.example');

// Tự động load .env nếu PROJECT_SCAN_DIRS chưa được set trong env
if (!process.env.PROJECT_SCAN_DIRS) {
  const envPath = path.resolve(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}


// ─── PARSE ARGUMENTS ─────────────────────────────────────────────────────────

export function parseArgs(rawArgs) {
  const args = Array.isArray(rawArgs) ? rawArgs : (rawArgs || '').split(/\s+/).filter(Boolean);
  const options = {
    project: null,
    branch: null,
    des: '',
    stash: false,
    noReset: false,
    dryRun: false,
    all: false,
    list: false,
    rawText: Array.isArray(rawArgs) ? rawArgs.join(' ') : (rawArgs || '')
  };

  const text = options.rawText.trim();

  // 1. Kiểm tra boolean flags
  if (/(?:^|\s)--stash(?:\s|$)/i.test(text)) options.stash = true;
  if (/(?:^|\s)--no-reset(?:\s|$)/i.test(text)) options.noReset = true;
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
  const configPath = fs.existsSync(PROJECTS_JSON_PATH)
    ? PROJECTS_JSON_PATH
    : (fs.existsSync(PROJECTS_EXAMPLE_PATH) ? PROJECTS_EXAMPLE_PATH : null);

  if (configPath) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      for (const [key, val] of Object.entries(data)) {
        mapping[key.toLowerCase().trim()] = path.resolve(val);
      }
    } catch (err) {
      console.error(`⚠️ Lỗi khi đọc ${configPath}: ${err.message}`);
    }
  }

  // Tự động bổ sung các thư mục nhóm/repos từ PROJECT_SCAN_DIRS theo cơ chế Smart 2-Tier
  const scanDirsRaw = process.env.PROJECT_SCAN_DIRS || '';
  if (scanDirsRaw) {
    const scanDirs = scanDirsRaw.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    for (const sDir of scanDirs) {
      const resolved = path.resolve(sDir);
      if (!fs.existsSync(resolved)) continue;

      const baseName = path.basename(resolved).toLowerCase();

      // Tầng 1: Nếu chính thư mục này là 1 git repo (như dnse-trading)
      if (fs.existsSync(path.join(resolved, '.git'))) {
        if (!mapping[baseName]) {
          mapping[baseName] = resolved;
        }
        continue;
      }

      // Tầng 2: Nếu là thư mục nhóm chứa nhiều repo con (như 3.1, mobile)
      if (!mapping[baseName]) {
        mapping[baseName] = resolved;
      }

      try {
        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

          const subPath = path.join(resolved, entry.name);
          // CHỈ nhận nếu là git repository thật sự (có .git thư mục hoặc file)
          if (fs.existsSync(path.join(subPath, '.git'))) {
            const subName = entry.name.toLowerCase();
            if (!mapping[subName]) {
              mapping[subName] = subPath;
            }
          }
          // Thư mục chưa tạo .git (hoặc phi-git) -> Bỏ qua an toàn
        }
      } catch {
        // Bỏ qua lỗi truy cập thư mục
      }
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
    initialBranch: 'unknown',
    status: 'UNKNOWN',
    behind: 0,
    ahead: 0,
    latestSha: '',
    message: '',
    durationMs: 0,
    wasReset: false,
    resetMessage: '',
    didStash: false,
    stashMessage: '',
    branches: []
  };

  const startTime = Date.now();

  try {
    // 0. Kiểm tra repo có commit nào chưa (Unborn branch do mới git init)
    try {
      execSync('git rev-parse --verify HEAD', { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      result.status = 'UNBORN';
      result.message = 'Repo mới khởi tạo (git init), chưa có commit nào.';
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // 0.1. Kiểm tra remote origin
    let remote = '';
    try {
      remote = execSync('git remote get-url origin', {
        cwd: repoPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      // Không có remote origin
    }

    if (!remote) {
      result.status = 'LOCAL_ONLY';
      result.message = 'Repo cục bộ, chưa cấu hình remote origin.';
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // 1. Lấy tên branch ban đầu
    result.initialBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    result.currentBranch = result.initialBranch;

    // 2. Kiểm tra trạng thái Working Tree (Dirty check)
    const statusOut = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const isDirty = statusOut.length > 0;

    if (isDirty) {
      if (options.noReset) {
        if (!options.stash) {
          result.status = 'DIRTY_SKIPPED';
          result.message = 'Có thay đổi chưa commit (--no-reset). Đã bỏ qua để tránh mất code.';
          result.durationMs = Date.now() - startTime;
          return result;
        } else {
          // Tự động stash nếu bật cờ --stash
          execSync('git stash push -u -m "auto-stash-before-repo-sync"', {
            cwd: repoPath,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          result.didStash = true;
        }
      } else {
        // MẶC ĐỊNH: Tự động reset working tree về trạng thái sạch sẽ ban đầu
        const dirtyFilesCount = statusOut.split('\n').filter(Boolean).length;
        execSync('git reset --hard HEAD', {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        execSync('git clean -fd', {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        result.wasReset = true;
        result.resetMessage = `Đã reset ${dirtyFilesCount} file modified/untracked`;
      }
    }

    // 3. Fetch toàn bộ các nhánh từ remote
    execSync('git fetch --all --prune', {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000
    });

    // 4. Lấy danh sách toàn bộ các nhánh local
    const branchListOut = execSync("git for-each-ref --format='%(refname:short)' refs/heads/", {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    let localBranches = branchListOut.split('\n').map(b => b.trim()).filter(Boolean);
    if (localBranches.length === 0) {
      localBranches = [result.initialBranch];
    }

    // Nếu có cờ -b <branch> chỉ định và nhánh chưa có ở local nhưng có trên origin
    if (options.branch && !localBranches.includes(options.branch)) {
      try {
        execSync(`git checkout ${options.branch}`, {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        localBranches.push(options.branch);
      } catch {
        // Bỏ qua nếu không checkout được
      }
    }

    let totalBehind = 0;
    let totalAhead = 0;
    let hasPulled = false;
    let hasDiverged = false;
    let hasError = false;

    // 5. Duyệt và kéo code (Pull) cho TOÀN BỘ các nhánh
    for (const branch of localBranches) {
      const bRes = {
        name: branch,
        status: 'UNKNOWN',
        behind: 0,
        ahead: 0,
        latestSha: '',
        message: ''
      };

      try {
        // Chuyển sang nhánh cần pull
        execSync(`git checkout ${branch}`, {
          cwd: repoPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Kiểm tra upstream tracking
        let upstream = '';
        try {
          upstream = execSync('git rev-parse --abbrev-ref @{u}', {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          }).trim();
        } catch {
          // Chưa có tracking
        }

        if (!upstream) {
          // Thử tìm origin/<branch> để set-upstream
          try {
            execSync(`git rev-parse --verify origin/${branch}`, {
              cwd: repoPath,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            execSync(`git branch --set-upstream-to=origin/${branch} ${branch}`, {
              cwd: repoPath,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            upstream = `origin/${branch}`;
          } catch {
            // Nhánh chỉ có ở local
          }
        }

        if (!upstream) {
          bRes.status = 'NO_UPSTREAM';
          bRes.message = 'Chưa có remote tracking';
          bRes.latestSha = execSync('git rev-parse --short HEAD', {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          }).trim();
          result.branches.push(bRes);
          continue;
        }

        // So sánh commit delta: HEAD vs @{u}
        const deltaStr = execSync('git rev-list --left-right --count HEAD...@{u}', {
          cwd: repoPath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const [aheadCount, behindCount] = deltaStr.split(/\s+/).map(n => parseInt(n, 10) || 0);
        bRes.ahead = aheadCount;
        bRes.behind = behindCount;
        totalBehind += behindCount;
        totalAhead += aheadCount;

        if (behindCount === 0 && aheadCount === 0) {
          bRes.status = 'UP_TO_DATE';
          bRes.message = 'Đã ở bản mới nhất';
        } else if (aheadCount > 0 && behindCount > 0) {
          bRes.status = 'DIVERGED';
          bRes.message = `Phân kỳ (Ahead ${aheadCount}, Behind ${behindCount})`;
          hasDiverged = true;
        } else if (aheadCount > 0 && behindCount === 0) {
          bRes.status = 'AHEAD';
          bRes.message = `Đi trước remote ${aheadCount} commit`;
        } else if (behindCount > 0) {
          if (options.dryRun) {
            bRes.status = 'BEHIND';
            bRes.message = `[Dry-run] Có ${behindCount} commit mới`;
          } else {
            execSync('git pull --ff-only', {
              cwd: repoPath,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            bRes.status = 'PULLED';
            bRes.message = `Đã kéo +${behindCount} commit`;
            hasPulled = true;
          }
        }

        bRes.latestSha = execSync('git rev-parse --short HEAD', {
          cwd: repoPath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

      } catch (err) {
        bRes.status = 'ERROR';
        bRes.message = err.message.split('\n')[0];
        hasError = true;
      }

      result.branches.push(bRes);
    }

    // 6. Trở lại nhánh ban đầu
    try {
      execSync(`git checkout ${result.initialBranch}`, {
        cwd: repoPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      result.currentBranch = result.initialBranch;
    } catch {
      // Bỏ qua nếu có lỗi checkout quay lại
    }

    // 7. Khôi phục stash nếu có
    if (result.didStash) {
      try {
        execSync('git stash pop', { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] });
        result.stashMessage = 'Đã khôi phục stash';
      } catch {
        result.stashMessage = '⚠️ Xung đột stash (dữ liệu trong stash list)';
      }
    }

    // Lấy SHA mới nhất của nhánh hiện tại
    try {
      result.latestSha = execSync('git rev-parse --short HEAD', {
        cwd: repoPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      result.latestSha = '-';
    }

    // 8. Đánh giá trạng thái tổng thể của repo
    result.behind = totalBehind;
    result.ahead = totalAhead;

    if (hasError) {
      result.status = 'ERROR';
    } else if (hasDiverged) {
      result.status = 'DIVERGED';
    } else if (hasPulled) {
      result.status = 'PULLED';
    } else if (options.dryRun && totalBehind > 0) {
      result.status = 'BEHIND';
    } else if (totalAhead > 0) {
      result.status = 'AHEAD';
    } else {
      result.status = 'UP_TO_DATE';
    }

    // Xây dựng message tổng hợp
    const branchSummaries = result.branches.map(b => {
      if (b.status === 'PULLED') return `${b.name} (+${b.behind})`;
      if (b.status === 'UP_TO_DATE') return `${b.name} (OK)`;
      if (b.status === 'BEHIND') return `${b.name} (-${b.behind})`;
      if (b.status === 'DIVERGED') return `${b.name} (div)`;
      return `${b.name} (${b.status})`;
    });

    const parts = [];
    if (result.wasReset) parts.push(`🔄 ${result.resetMessage}`);
    parts.push(`Nhánh: ${branchSummaries.join(', ')}`);
    if (result.stashMessage) parts.push(result.stashMessage);

    result.message = parts.join(' | ');

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
    UNBORN: '⚪ Unborn',
    LOCAL_ONLY: '⚪ Local-only',
    ERROR: '❌ Error'
  };

  let md = '### 📊 Báo Cáo Đồng Bộ Mã Nguồn (Repo Sync Report)\n\n';
  md += '| Repository | Nhánh Đồng Bộ | Trạng Thái | Delta | Commit SHA | Thời Gian | Chi Tiết / Ghi Chú |\n';
  md += '|:---|:---|:---:|:---:|:---:|:---:|:---|\n';

  let totalBranchesSynced = 0;
  let totalBranchesPulled = 0;

  for (const r of results) {
    const iconLabel = statusIcons[r.status] || r.status;
    const deltaStr = r.behind > 0 ? `+${r.behind}` : (r.ahead > 0 ? `^${r.ahead}` : '0');
    const sha = r.latestSha || '-';
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`;

    let branchDisplay = `\`${r.currentBranch}\``;
    if (r.branches && r.branches.length > 1) {
      branchDisplay = r.branches.map(b => `\`${b.name}\``).join(', ');
    }

    if (r.branches) {
      totalBranchesSynced += r.branches.length;
      totalBranchesPulled += r.branches.filter(b => b.status === 'PULLED').length;
    }

    md += `| **${r.name}** | ${branchDisplay} | ${iconLabel} | \`${deltaStr}\` | \`${sha}\` | ${dur} | ${r.message} |\n`;
  }

  const pulledCount = results.filter(r => r.status === 'PULLED').length;
  const upToDateCount = results.filter(r => r.status === 'UP_TO_DATE').length;
  const skippedCount = results.filter(r => ['DIRTY_SKIPPED', 'UNBORN', 'LOCAL_ONLY'].includes(r.status)).length;
  const resetCount = results.filter(r => r.wasReset).length;
  const errCount = results.filter(r => ['ERROR', 'DIVERGED', 'BRANCH_CHECKOUT_FAILED'].includes(r.status)).length;

  md += `\n**Tổng kết:** ${results.length} repos (${totalBranchesSynced || results.length} nhánh) | 🟢 Cập nhật: ${pulledCount} (${totalBranchesPulled} nhánh pulled) | ⚪ Mới nhất: ${upToDateCount} | 🔄 Đã reset: ${resetCount} | ⚠️ Bỏ qua: ${skippedCount} | ❌ Cảnh báo/Lỗi: ${errCount}\n`;

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
