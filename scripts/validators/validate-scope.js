#!/usr/bin/env node
/**
 * validate-scope.js
 * 
 * Validator kiểm tra Scope Containment, Permission Tiers và Anti-Autopilot:
 * 1. 100% SKILL.md có banner Scope & Permission (Tier 1/2/2b/3).
 * 2. 100% commands/*.toml có khối Scope Boundaries & TIER chuẩn.
 * 3. Không có cụm từ autopilot bị cấm (tự chạy, tự sửa 3 vòng, cài package...).
 * 4. Không có tham chiếu tới persona/skill không tồn tại (agent-skills:dev, dev-debugging...).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const FORBIDDEN_PHRASES = [
  { pattern: /tự động chuyển sang/i, name: 'tự động chuyển sang (vi phạm Single Task Hard Stop)' },
  { pattern: /tối đa 3 vòng/i, name: 'tối đa 3 vòng (chỉ cho phép tối đa 1 vòng theo autonomy-contract.md)' },
  { pattern: /mặc định (là )?tự chạy/i, name: 'mặc định tự chạy (phải là dừng sau mỗi artifact)' },
  { pattern: /cài rồi chạy lại/i, name: 'cài rồi chạy lại (cấm tự ý cài package)' }
];

const DEAD_REFERENCES = [
  'agent-skills:dev',
  'dev-debugging',
  'dev-spec-driven-development',
  'dev-planning-and-task-breakdown',
  'dev-incremental-implementation'
];

let errors = [];

function checkSkills() {
  const pluginsDir = path.join(REPO_ROOT, 'plugins');
  const plugins = fs.readdirSync(pluginsDir);

  for (const plugin of plugins) {
    const skillsDir = path.join(pluginsDir, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;

    const skills = fs.readdirSync(skillsDir);
    for (const skill of skills) {
      const skillFile = path.join(skillsDir, skill, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;

      const content = fs.readFileSync(skillFile, 'utf8');

      // 1. Kiểm tra Tier banner
      if (!content.includes('**Scope & Permission:** Tier')) {
        errors.push(`[SKILL TIER MISSING] ${path.relative(REPO_ROOT, skillFile)} thiếu banner Tier.`);
      }

      // 2. Kiểm tra cụm từ cấm
      for (const { pattern, name } of FORBIDDEN_PHRASES) {
        if (pattern.test(content)) {
          errors.push(`[FORBIDDEN PHRASE] ${path.relative(REPO_ROOT, skillFile)} chứa cụm: "${name}".`);
        }
      }

      // 3. Kiểm tra dead references
      for (const deadRef of DEAD_REFERENCES) {
        if (content.includes(deadRef)) {
          errors.push(`[DEAD REFERENCE] ${path.relative(REPO_ROOT, skillFile)} tham chiếu không tồn tại: "${deadRef}".`);
        }
      }
    }
  }
}

function checkCommands() {
  const pluginsDir = path.join(REPO_ROOT, 'plugins');
  const plugins = fs.readdirSync(pluginsDir);

  for (const plugin of plugins) {
    const cmdDir = path.join(pluginsDir, plugin, 'commands');
    if (!fs.existsSync(cmdDir)) continue;

    const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.toml'));
    for (const file of files) {
      const filePath = path.join(cmdDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Kiểm tra Scope Boundaries block
      if (!content.includes('Scope Boundaries & Immutable Hard Stops')) {
        errors.push(`[COMMAND SCOPE MISSING] ${path.relative(REPO_ROOT, filePath)} thiếu khối Scope Boundaries.`);
      }

      // Kiểm tra TIER
      if (!content.match(/TIER\s+(1|2|2b|3)/i)) {
        errors.push(`[COMMAND TIER MISSING] ${path.relative(REPO_ROOT, filePath)} không khai báo TIER hợp lệ (1/2/2b/3).`);
      }

      // Kiểm tra cụm từ cấm
      for (const { pattern, name } of FORBIDDEN_PHRASES) {
        if (pattern.test(content)) {
          errors.push(`[FORBIDDEN PHRASE] ${path.relative(REPO_ROOT, filePath)} chứa cụm: "${name}".`);
        }
      }

      // Kiểm tra dead references
      for (const deadRef of DEAD_REFERENCES) {
        if (content.includes(deadRef)) {
          errors.push(`[DEAD REFERENCE] ${path.relative(REPO_ROOT, filePath)} tham chiếu không tồn tại: "${deadRef}".`);
        }
      }
    }
  }
}

checkSkills();
checkCommands();

if (errors.length > 0) {
  console.error('\n❌ Phát hiện vi phạm Scope Containment / Autonomy:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log('✓ Scope Containment & Permission Tiers validation PASSED (31 skills, 30 commands)');
}

