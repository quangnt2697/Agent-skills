#!/usr/bin/env node

/**
 * Chẩn đoán môi trường render. Đây là lệnh đầu tiên nên chạy sau khi clone repo về máy mới.
 * In ra engine sẽ được dùng, Chrome tìm thấy ở đâu, và lệnh sửa chính xác cho từng thứ còn thiếu.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { CHROME_HELP, mmdcBinary, resolveChrome, skillRoot } from './mmdc-engine.mjs';

const OK = '✓';
const FAIL = '✗';
const WARN = '!';

function line(mark, label, detail) {
  console.log(`  ${mark} ${label}${detail ? `: ${detail}` : ''}`);
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
const hasBeautiful = existsSync(join(skillRoot, 'node_modules', 'beautiful-mermaid'));
const mmdc = mmdcBinary();
const chrome = mmdc ? resolveChrome() : null;

console.log('\nba-design-flowchart — chẩn đoán môi trường\n');

console.log('Môi trường:');
line(nodeMajor >= 16 ? OK : FAIL, 'Node.js', `v${process.versions.node}${nodeMajor >= 16 ? '' : ' (cần >= 16)'}`);
line(OK, 'Nền tảng', `${process.platform} ${process.arch}`);

console.log('\nEngine mmdc (Mermaid chuẩn — mặc định):');
line(mmdc ? OK : FAIL, '@mermaid-js/mermaid-cli', mmdc ?? 'chưa cài');
line(chrome ? OK : FAIL, 'Chrome', chrome ? `${chrome.path} (${chrome.source})` : 'không tìm thấy');

console.log('\nEngine beautiful (dự phòng — ascii + 15 theme):');
line(hasBeautiful ? OK : FAIL, 'beautiful-mermaid', hasBeautiful ? 'đã cài' : 'chưa cài');

const usable = Boolean(mmdc && chrome);
console.log(`\nEngine sẽ dùng mặc định: ${usable ? 'mmdc' : 'beautiful (dự phòng)'}`);

if (!usable) {
  console.log('');
  if (!mmdc || !hasBeautiful) {
    console.log(`${WARN} Thiếu dependency. Chạy: cd ${skillRoot} && npm install`);
  }
  if (mmdc && !chrome) {
    console.log(`${WARN} Có mmdc nhưng thiếu Chrome nên phải dùng engine beautiful.`);
    console.log('  Hệ quả: flowchart LR có cạnh quay lại sẽ bị sai bố cục');
    console.log('  (node đầu tiên bị đẩy sang phải — vi phạm Rule 7 mục 2 trong AGENTS.md).');
    console.log('');
    console.log(CHROME_HELP);
  }
}

console.log('');
process.exit(usable || hasBeautiful ? 0 : 1);
