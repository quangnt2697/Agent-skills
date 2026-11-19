#!/usr/bin/env node
/**
 * SDK preflight (`scripts/qa/check-sdk.js`) — tất định, không gọi mạng.
 * Kiểm tra: sdk-map.json hợp lệ, python3 & pytest khả dụng.
 * Exit 0 = đủ điều kiện; Exit 1 = thiếu dependency (agent phải DỪNG, không giả lập).
 */
import fs from 'node:fs';
import os from 'node:os';
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

const pyRes = spawnSync('python3', ['--version'], { encoding: 'utf8' });
if (pyRes.status === 0) console.log(`✓ python3: ${(pyRes.stdout || pyRes.stderr).trim()}`);
else errors.push(`Thiếu python3: ${(pyRes.stderr || pyRes.error?.message || '').trim()}`);

function findPytest() {
  const candidates = [
    [path.join(process.cwd(), '.venv/bin/pytest'), ['--version']],
    [path.join(root, '.venv/bin/pytest'), ['--version']],
    ['python3', ['-m', 'pytest', '--version']],
    ['pytest', ['--version']],
    ['/usr/bin/python3', ['-m', 'pytest', '--version']],
  ];
  const userPyDir = path.join(os.homedir(), 'Library/Python');
  if (fs.existsSync(userPyDir)) {
    for (const ver of fs.readdirSync(userPyDir)) {
      candidates.push([path.join(userPyDir, ver, 'bin/pytest'), ['--version']]);
    }
  }
  for (const [cmd, args] of candidates) {
    if (cmd.includes(path.sep) && !fs.existsSync(cmd)) continue;
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    if (r.status === 0) return { cmd, out: (r.stdout || r.stderr).trim() };
  }
  return null;
}

const pytestHit = findPytest();
if (pytestHit) {
  console.log(`✓ pytest (${pytestHit.cmd}): ${pytestHit.out}`);
} else {
  errors.push('Thiếu pytest (chưa cài trong python3, PATH, .venv hoặc ~/Library/Python/*/bin)');
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
