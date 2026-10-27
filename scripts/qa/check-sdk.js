#!/usr/bin/env node
/**
 * SDK preflight (`scripts/qa/check-sdk.js`) — tất định, không gọi mạng.
 * Kiểm tra: sdk-map.json hợp lệ, python3 & pytest khả dụng.
 * Exit 0 = đủ điều kiện; Exit 1 = thiếu dependency (agent phải DỪNG, không giả lập).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mapPath = path.join(root, 'plugins/qa/skills/qa-auto-design/references/sdk-map.json');
const errors = [];

try {
  JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  console.log(`✓ sdk-map.json hợp lệ (${path.relative(root, mapPath)})`);
} catch (e) {
  errors.push(`sdk-map.json lỗi: ${e.message}`);
}

for (const [label, cmd, args] of [
  ['python3', 'python3', ['--version']],
  ['pytest', 'python3', ['-m', 'pytest', '--version']],
]) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status === 0) console.log(`✓ ${label}: ${(r.stdout || r.stderr).trim()}`);
  else errors.push(`Thiếu ${label}: ${(r.stderr || r.error?.message || '').trim()}`);
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
