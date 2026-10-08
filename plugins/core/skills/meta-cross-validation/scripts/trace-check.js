#!/usr/bin/env node
/**
 * trace-check.js — Ma trận truy vết xác định (deterministic) theo mã BR/AC.
 *
 * Cách dùng:
 *   node trace-check.js <workspace/{issueKey}> [--stage=tech|test|all] [--min=90] [--json]
 *
 * Quét mã [BR-xx]/[AC-xx] trong spec/final.md, đối chiếu với:
 *   tech  → tech/tech-spec.md
 *   test  → test/checklist.md, test/*.feature, test/steps/** (code automation)
 *   all   → cả hai (mặc định)
 * Ghi ma trận ra trace/matrix.md và in tóm tắt. Không gọi LLM.
 *
 * Exit code (dùng làm cổng tự động theo autonomy-contract §1):
 *   0 = coverage ≥ --min ở mọi stage được kiểm
 *   1 = coverage < --min
 *   2 = thiếu input (final.md không có, hoặc final.md không có mã BR/AC nào)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ID_RE = /\b(BR|AC)-\d{1,4}\b/g;
const TEST_EXT = /\.(feature|md|py|ts|js)$/;

export function extractIds(text) {
  return [...new Set(text.match(ID_RE) || [])].sort((a, b) => {
    const [pa, na] = a.split('-');
    const [pb, nb] = b.split('-');
    return pa === pb ? Number(na) - Number(nb) : pa.localeCompare(pb);
  });
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'result' || e.name.startsWith('.') ? [] : walk(full);
    return TEST_EXT.test(e.name) ? [full] : [];
  });
}

/** Trả về { ids, stages: { tech?: {covered, missing, pct}, test?: {...} } } hoặc { error }. */
export function traceCheck(workspaceDir, stage = 'all') {
  const spec = readIfExists(path.join(workspaceDir, 'spec', 'final.md'));
  if (!spec) return { error: `Thiếu ${path.join(workspaceDir, 'spec', 'final.md')}` };
  const ids = extractIds(spec);
  if (ids.length === 0) {
    return { error: 'final.md không có mã [BR-xx]/[AC-xx] nào — ba-spec bắt buộc gắn mã để truy vết được.' };
  }

  const sources = {};
  if (stage === 'tech' || stage === 'all') {
    sources.tech = readIfExists(path.join(workspaceDir, 'tech', 'tech-spec.md'));
  }
  if (stage === 'test' || stage === 'all') {
    sources.test = walk(path.join(workspaceDir, 'test')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  }

  const stages = {};
  for (const [name, text] of Object.entries(sources)) {
    const found = new Set(extractIds(text));
    const covered = ids.filter((id) => found.has(id));
    const missing = ids.filter((id) => !found.has(id));
    stages[name] = { covered, missing, pct: Math.round((covered.length / ids.length) * 1000) / 10 };
  }
  return { ids, stages };
}

export function renderMatrix(issueKey, { ids, stages }) {
  const cols = Object.keys(stages);
  const mark = (s, id) => (stages[s].covered.includes(id) ? '✅' : '❌');
  const lines = [
    `# Traceability Matrix — ${issueKey}`,
    '',
    '> Sinh tự động bởi `trace-check.js` (khớp mã BR/AC chính xác, không dùng LLM).',
    '',
    `| Mã | ${cols.join(' | ')} |`,
    `|---|${cols.map(() => '---').join('|')}|`,
    ...ids.map((id) => `| ${id} | ${cols.map((s) => mark(s, id)).join(' | ')} |`),
    '',
    '## Coverage',
    '',
    ...cols.map((s) => `- **${s}:** ${stages[s].pct}% (${stages[s].covered.length}/${ids.length})` +
      (stages[s].missing.length ? ` — thiếu: ${stages[s].missing.join(', ')}` : '')),
    '',
  ];
  return lines.join('\n');
}

function main(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const opt = (name, def) => (argv.find((a) => a.startsWith(`--${name}=`)) || `=${def}`).split('=')[1];
  const workspaceDir = args[0];
  if (!workspaceDir) {
    console.error('Usage: trace-check.js <workspace/{issueKey}> [--stage=tech|test|all] [--min=90] [--json]');
    return 2;
  }
  const stage = opt('stage', 'all');
  const min = Number(opt('min', 90));
  const result = traceCheck(workspaceDir, stage);
  if (result.error) {
    console.error(`❌ ${result.error}`);
    return 2;
  }

  const issueKey = path.basename(path.resolve(workspaceDir));
  const traceDir = path.join(workspaceDir, 'trace');
  fs.mkdirSync(traceDir, { recursive: true });
  fs.writeFileSync(path.join(traceDir, 'matrix.md'), renderMatrix(issueKey, result));

  const failed = Object.entries(result.stages).filter(([, s]) => s.pct < min);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ issueKey, min, ...result, pass: failed.length === 0 }));
  } else {
    for (const [name, s] of Object.entries(result.stages)) {
      console.log(`${s.pct >= min ? '✅' : '❌'} ${name}: ${s.pct}% (${s.covered.length}/${result.ids.length})` +
        (s.missing.length ? ` — thiếu: ${s.missing.join(', ')}` : ''));
    }
    console.log(`→ ${path.join(traceDir, 'matrix.md')}`);
  }
  return failed.length ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
