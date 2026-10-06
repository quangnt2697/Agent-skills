#!/usr/bin/env node
// Sinh assets/icons.html từ references/primitive-icons.md (nguồn duy nhất) + assets/icons.template.html.
// Dùng: node scripts/build_icons_gallery.mjs [--check]   (--check: exit 1 nếu icons.html lệch nguồn)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'references/primitive-icons.md'), 'utf8').replace(/\r\n/g, '\n');
const tpl = readFileSync(join(root, 'assets/icons.template.html'), 'utf8');
const out = join(root, 'assets/icons.html');

const cats = [];
let cat = null, name = null;
const lines = md.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/^## /.test(l)) { cat = /^## (Usage)$/.test(l) ? null : { title: l.slice(3).trim(), icons: [] }; if (cat) cats.push(cat); name = null; }
  else if (cat && /^### /.test(l)) name = l.slice(4).trim();
  else if (cat && name && l.startsWith('```svg')) {
    const svg = lines[i + 1];
    cat.icons.push({ name, svg });
    name = null;
  }
}

const body = '    ' + cats.filter(c => c.icons.length).map(c =>
  `<section class="cat"><h2>${c.title}</h2><div class="grid">\n` +
  c.icons.map(x => `<div class="cell"><div class="icon">${x.svg}</div><div class="name">${x.name}</div></div>`).join('\n') +
  `\n</div></section>`).join('\n');

const html = tpl.replace('<!-- ICONS -->', body);
if (process.argv.includes('--check')) {
  const cur = readFileSync(out, 'utf8');
  if (cur.replace(/\r\n/g, '\n') !== html.replace(/\r\n/g, '\n')) { console.error('icons.html lệch primitive-icons.md — chạy lại build_icons_gallery.mjs'); process.exit(1); }
  console.log(`OK — ${cats.reduce((n, c) => n + c.icons.length, 0)} icons`);
} else {
  writeFileSync(out, html);
  console.log(`Đã sinh ${out}`);
}
