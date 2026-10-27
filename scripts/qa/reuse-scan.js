#!/usr/bin/env node
/**
 * Reuse Scan (`scripts/qa/reuse-scan.js`) — tìm code test có sẵn khớp từ khóa.
 * Dùng: node scripts/qa/reuse-scan.js {issueKey} "từ khóa 1 từ khóa 2"
 * Ghi: workspace/issues/{issueKey}/test/reuse-scan.json (chỉ chứa kết quả quét thật).
 */
import fs from 'node:fs';
import path from 'node:path';

const [issueKey, ...kw] = process.argv.slice(2);
const keywords = kw.join(' ').toLowerCase().split(/\s+/).filter((k) => k.length > 2);
if (!issueKey || !keywords.length) {
  console.error('Usage: node reuse-scan.js {issueKey} "từ_khóa"');
  process.exit(1);
}

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git', '__pycache__', '.venv']);
const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.py$/.test(e.name)) {
      const text = fs.readFileSync(p, 'utf8');
      const lower = text.toLowerCase();
      const matched = keywords.filter((k) => lower.includes(k));
      if (!matched.length) continue;
      const defs = [...text.matchAll(/^\s*(?:def|class)\s+(\w+)/gm)].map((m) => m[1]);
      hits.push({ file: path.relative(root, p), matched, definitions: defs.slice(0, 30) });
    }
  }
}
walk(path.join(root, 'workspace'));

const sdkMap = path.join(root, 'plugins/qa/skills/qa-auto-design/references/sdk-map.json');
const out = {
  issueKey,
  keywords,
  scannedAt: new Date().toISOString(),
  sdkMap: fs.existsSync(sdkMap) ? path.relative(root, sdkMap) : null,
  reusable: hits.sort((a, b) => b.matched.length - a.matched.length).slice(0, 20),
};
const dest = path.join(root, 'workspace/issues', issueKey, 'test/reuse-scan.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`✓ ${out.reusable.length} file khớp → ${path.relative(root, dest)}`);
