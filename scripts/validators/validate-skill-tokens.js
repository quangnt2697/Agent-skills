#!/usr/bin/env node
/**
 * validate-skill-tokens.js
 *
 * Kiểm tra ngân sách token và số dòng của toàn bộ 30 file SKILL.md.
 * Giữ kích thước mỗi SKILL.md trong mức tối ưu để tiết kiệm context window
 * và tránh tình trạng tràn token khi agent nạp skill.
 *
 * Ngưỡng khuyến nghị:
 *   - Số dòng lý tưởng: <= 120 dòng (cảnh báo nếu > 180 dòng trừ ngoại lệ)
 *   - Ước lượng tokens: <= 4,000 tokens
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.resolve(__dirname, '..', '..', 'plugins');

const MAX_RECOMMENDED_LINES = 180;
const MAX_RECOMMENDED_TOKENS = 4000;

// Các skill đặc thù có bảng tra cứu lớn hoặc sơ đồ mẫu
const TOKEN_EXEMPT_SKILLS = new Set([
  'ba-design-flowchart',   // Thư viện ký hiệu SVG & CSS styles
  'meta-using-agent-skills', // Bảng định tuyến toàn bộ 30 skills
  'qa-auto-design'          // Bảng POM và SDK mapping
]);

function estimateTokens(text) {
  // Ước tính xấp xỉ: 1 token ~ 3.8 ký tự đối với văn bản hỗn hợp EN/VI
  return Math.ceil(text.length / 3.8);
}

function main() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`ERROR: plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory());
  const skillList = [];

  for (const plugin of plugins) {
    const skillsDir = path.join(PLUGINS_DIR, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;

    const skills = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory());
    for (const skill of skills) {
      const skillFile = path.join(skillsDir, skill, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf8');
        const lines = content.split(/\r?\n/).length;
        const tokens = estimateTokens(content);
        skillList.push({ plugin, skill, lines, tokens, isExempt: TOKEN_EXEMPT_SKILLS.has(skill) });
      }
    }
  }

  skillList.sort((a, b) => a.skill.localeCompare(b.skill));

  console.log('🔍 Kiểm tra Ngân sách Token & Độ dài SKILL.md (30 skills):');
  console.log('-------------------------------------------------------------------------');
  console.log('| Kỹ năng (Skill)               | Dòng | Ước lượng Tokens | Trạng thái  |');
  console.log('-------------------------------------------------------------------------');

  let warningCount = 0;

  for (const item of skillList) {
    let status = '✅ Tối ưu';
    if (!item.isExempt) {
      if (item.lines > MAX_RECOMMENDED_LINES || item.tokens > MAX_RECOMMENDED_TOKENS) {
        status = '⚠️ Dài (>180L)';
        warningCount++;
      }
    } else {
      status = 'ℹ️ Miễn trừ';
    }

    const skillPadded = item.skill.padEnd(30, ' ');
    const linesPadded = String(item.lines).padStart(4, ' ');
    const tokensPadded = `~${item.tokens}`.padStart(16, ' ');
    console.log(`| ${skillPadded} | ${linesPadded} | ${tokensPadded} | ${status} |`);
  }

  console.log('-------------------------------------------------------------------------');
  console.log(`Kết quả: ${skillList.length} skills đã quét — ${warningCount} cảnh báo.`);

  // Cảnh báo không làm fail CI, nhưng ghi nhận chỉ số tối ưu
  process.exit(0);
}

main();
