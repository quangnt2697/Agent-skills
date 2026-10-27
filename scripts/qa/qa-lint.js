#!/usr/bin/env node
/**
 * QA Lint (`scripts/qa/qa-lint.js`) — kiểm tra tất định mã test đã sinh.
 * Dùng: node scripts/qa/qa-lint.js {issueKey}
 * Quy tắc: đủ số test so với Scenario; cấm sleep/mock; cấm URL hardcode;
 * assert chỉ ở file test_*.py (không ở POM/Service).
 */
import fs from 'node:fs';
import path from 'node:path';

const issueKey = process.argv[2];
if (!issueKey) {
  console.error('Usage: node qa-lint.js {issueKey}');
  process.exit(1);
}
const base = path.join(process.cwd(), 'workspace/issues', issueKey, 'test');
const featurePath = path.join(base, `${issueKey}.feature`);
const stepsDir = path.join(base, 'steps');
const errors = [];

if (!fs.existsSync(featurePath)) errors.push(`Thiếu ${path.relative(process.cwd(), featurePath)}`);
if (!fs.existsSync(stepsDir)) errors.push(`Thiếu thư mục ${path.relative(process.cwd(), stepsDir)}`);
if (errors.length) { errors.forEach((e) => console.error(`✗ ${e}`)); process.exit(1); }

const scenarios = (fs.readFileSync(featurePath, 'utf8').match(/^\s*Scenario(?: Outline)?:/gm) || []).length;
const pyFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.py')) pyFiles.push(p);
  }
})(stepsDir);

let tests = 0;
for (const f of pyFiles) {
  const rel = path.relative(process.cwd(), f);
  const text = fs.readFileSync(f, 'utf8');
  const isTest = /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(f);
  if (isTest) tests += (text.match(/^\s*(?:async\s+)?def\s+test_\w+/gm) || []).length;
  if (/\btime\.sleep\(|\bwaitForTimeout\(/.test(text)) errors.push(`${rel}: cấm sleep/waitForTimeout`);
  if (/\b(unittest\.mock|MagicMock|monkeypatch\.setattr|@patch)\b/.test(text)) errors.push(`${rel}: cấm mock`);
  if (/https?:\/\/|wss?:\/\//.test(text.replace(/^\s*#.*$/gm, ''))) errors.push(`${rel}: URL hardcode — dùng .env`);
  if (!isTest && !/conftest\.py$/.test(f) && /^\s*assert\s/m.test(text)) errors.push(`${rel}: assert ngoài tầng test`);
}
if (tests < scenarios) errors.push(`Chỉ có ${tests} test cho ${scenarios} Scenario (cần ≥ số Scenario)`);

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log(`✓ qa-lint OK: ${tests} test / ${scenarios} Scenario / ${pyFiles.length} file .py`);
