#!/usr/bin/env node
/**
 * validate-code-refs.js
 *
 * Kiểm tra tính tồn tại của tất cả các file script (.sh, .js, .mjs, .py),
 * file asset/cấu hình cố định (.json, .yaml, .yml), và các file tài liệu/checklist (.md)
 * được gọi trong SKILL.md (thông qua lệnh bash, node, python3 hoặc code span/markdown link).
 *
 * Chống ảo giác (anti-hallucination): Đảm bảo Agent không bao giờ gọi hoặc
 * hướng dẫn chạy các script/tài nguyên "ma" không tồn tại trong repository.
 *
 * Exit codes: 0 = tất cả hợp lệ, 1 = có file tham chiếu không tồn tại.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS_DIR = path.join(ROOT, 'plugins');

// 1. Lệnh thực thi: node/bash/python3 ...
const EXEC_CMD_RE = /(?:node|bash|python3|python)\s+(?:["']?)([^"'\s\n|;>`]+)/g;

// 2. Đường dẫn cụ thể trong code span hoặc inline: `path/to/file.ext`
const CODE_PATH_RE = new RegExp(
  '(?<![A-Za-z0-9._/-])' +
  '((?:\\$\\{[^}]+\\}|(?:\\.\\./)+|plugins/|scripts/|assets/|references/)[A-Za-z0-9._/-]+?\\.(?:sh|js|mjs|py|json|yaml|yml|md))\\b',
  'g'
);

// 3. Markdown links trỏ tới assets/, scripts/, hoặc references/
const ASSET_LINK_RE = /\]\(([^)#\s]+?\.(?:sh|js|mjs|py|json|yaml|yml|md))\b[^)]*\)/g;

// Các file markdown kết quả runtime hoặc placeholder không nằm cố định trong repo
const RUNTIME_MD = new Set([
  'final.md',
  'spec/final.md',
  'asis-inventory.md',
  'checklist.md',
  'tech-spec.md',
  'report.md',
  'matrix.md',
  'gaps.md',
  'blockers-triage.md',
  'lessons-learned.md',
  'workspace_state.md',
  'sprint-plan.md',
  'daily-standup-report.md',
  'sprint-retrospective-report.md',
]);

function cleanPath(rawPath) {
  let p = rawPath.trim();
  p = p.replace(/\${AGENT_SKILLS_HOME:-[.]}/g, '.');
  p = p.replace(/\${AGENT_SKILLS_HOME}/g, '.');
  p = p.replace(/\${PROJECT_ROOT}/g, '.');
  p = p.replace(/\$PROJECT_ROOT/g, '.');
  p = p.split('#')[0].split('?')[0];
  p = p.replace(/^["']|["']$/g, '');
  return p;
}

function shouldSkip(p) {
  if (/\{[^}]+\}/.test(p) || /\*/.test(p)) return true;
  if (p.startsWith('workspace/') || p.includes('/workspace/')) return true;
  if (p.startsWith('-')) return true;
  if (/^https?:\/\//.test(p)) return true;
  for (const r of RUNTIME_MD) {
    if (p === r || p.endsWith('/' + r)) return true;
  }
  if (!/\.(sh|js|mjs|py|json|yaml|yml|md)$/.test(p)) return true;
  return false;
}

function resolveCandidatePath(p, skillDir) {
  const normalized = path.normalize(p);

  if (
    normalized.startsWith('assets/') ||
    normalized.startsWith('references/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    const inSkill = path.resolve(skillDir, normalized);
    if (fs.existsSync(inSkill)) return inSkill;
  }

  const relFromRoot = path.resolve(ROOT, normalized);
  if (fs.existsSync(relFromRoot)) return relFromRoot;

  const relFromSkill = path.resolve(skillDir, normalized);
  if (fs.existsSync(relFromSkill)) return relFromSkill;

  return relFromRoot;
}

function checkSkillFile(skillDir, skillFile) {
  const violations = [];
  const content = fs.readFileSync(skillFile, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const candidates = new Set();

    for (const match of line.matchAll(EXEC_CMD_RE)) {
      candidates.add(cleanPath(match[1]));
    }

    for (const match of line.matchAll(CODE_PATH_RE)) {
      candidates.add(cleanPath(match[1]));
    }

    for (const match of line.matchAll(ASSET_LINK_RE)) {
      candidates.add(cleanPath(match[1]));
    }

    for (const cand of candidates) {
      if (shouldSkip(cand)) continue;

      const resolved = resolveCandidatePath(cand, skillDir);
      if (!fs.existsSync(resolved)) {
        violations.push({
          line: idx + 1,
          raw: cand,
          resolved: path.relative(ROOT, resolved),
        });
      }
    }
  });

  return violations;
}

function main() {
  console.log('Checking code, script & doc references in skills (Anti-Hallucination Guard)...\n');

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.log('No plugins/ directory — nothing to check.');
    return;
  }

  let checked = 0;
  let errors = 0;

  const plugins = fs.readdirSync(PLUGINS_DIR).filter((d) =>
    fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory()
  );

  for (const plugin of plugins) {
    const skillsDir = path.join(PLUGINS_DIR, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;

    const skillNames = fs.readdirSync(skillsDir).sort();
    for (const name of skillNames) {
      const skillDir = path.join(skillsDir, name);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (!fs.statSync(skillDir).isDirectory() || !fs.existsSync(skillFile)) continue;

      checked++;
      const violations = checkSkillFile(skillDir, skillFile);

      const relSkill = `plugins/${plugin}/skills/${name}/SKILL.md`;
      if (violations.length === 0) {
        console.log(`  ✓  ${relSkill}`);
      } else {
        console.log(`  ✗  ${relSkill}`);
        for (const v of violations) {
          console.log(`       L${v.line}: '${v.raw}' — file not found (resolves to: ${v.resolved})`);
          errors++;
        }
      }
    }
  }

  console.log(`\n${checked} skills checked — ${errors} error(s) — ${errors === 0 ? 'PASSED' : 'FAILED'}`);
  process.exit(errors === 0 ? 0 : 1);
}

main();
