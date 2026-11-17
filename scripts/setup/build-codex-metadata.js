#!/usr/bin/env node
/**
 * build-codex-metadata.js
 *
 * Tự động sinh `agents/openai.yaml` cho toàn bộ 31 skills trong `plugins/<plugin>/skills/<skill>/`
 * theo chuẩn OpenAI Codex (`skill-creator/references/openai_yaml.md`).
 *
 * Với `--normalize`: chuẩn hóa frontmatter `SKILL.md` (chuyển `trigger` và `disable-auto-invoke`
 * vào `metadata:` và đảm bảo `description` chứa điều kiện kích hoạt) để pass cả `validate-skills.js`
 * lẫn Codex `quick_validate.py`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS_DIR = path.join(REPO_ROOT, 'plugins');

const PLUGIN_BRAND_COLORS = {
  'ba-po': '#2563EB',
  'qa': '#10B981',
  'code-reviewer': '#8B5CF6',
  'scrum-master': '#F59E0B',
  'fintech-data': '#06B6D4',
  'core': '#64748B',
};

const DESCRIPTION_TRIGGER = new RegExp(
  '\\buse (this )?when\\b' +
  '|\\buse (before|after|during)\\b' +
  '|(?<!\\p{L})(sử dụng|dùng|áp dụng|kích hoạt)\\s+(kỹ năng này\\s+)?' +
    '(khi|trước khi|sau khi|trong khi|để|cho)(?!\\p{L})',
  'iu'
);

const DESCRIPTION_TRIGGER_NEGATE = new RegExp(
  '\\b(do not|don\'t|never) use (this )?(when|before|after|during)\\b' +
  '|(?<!\\p{L})(không|đừng|tuyệt đối không)\\s+(nên\\s+)?(sử dụng|dùng|áp dụng)(?!\\p{L})',
  'iu'
);

function parseRawFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)$/);
  if (!m) return null;
  const fmText = m[1];
  const body = m[2];
  const fields = {};
  const metadata = {};
  let inMetadata = false;

  for (const line of fmText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/^\s+/.test(line) && inMetadata) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        metadata[k] = v;
      }
      continue;
    }
    inMetadata = false;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k === 'metadata') {
      inMetadata = true;
    } else {
      fields[k] = v;
    }
  }
  return { fields, metadata, body };
}

function yamlQuote(str) {
  return JSON.stringify(String(str ?? '').replace(/\s+/g, ' ').trim());
}

function toDisplayName(skillName) {
  const mapPrefix = { ba: 'BA', qa: 'QA', cr: 'CR', sm: 'SM', db: 'DB', meta: 'Meta' };
  return skillName
    .split('-')
    .map((w, i) => (i === 0 && mapPrefix[w] ? mapPrefix[w] : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function buildShortDescription(description) {
  // Chuẩn hóa khoảng trắng, giữ nguyên chấm phần mở rộng (.feature) và dấu ba chấm (...) khi tách câu
  const normalized = description
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.{2,}/g, '…')
    .replace(/\(([^)]+)\)/g, (m, inner) => `(${inner.replace(/\./g, '·')})`);
  const firstSentence = normalized
    .split(/[.!?](?=\s|$)/)[0]
    .replace(/·/g, '.')
    .trim();

  if (firstSentence.length >= 25 && firstSentence.length <= 64) {
    return firstSentence;
  }

  const base = firstSentence.length > 64 ? firstSentence : normalized.replace(/·/g, '.');
  if (base.length <= 64) return base;

  const slice = base.slice(0, 61);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace >= 36 ? slice.slice(0, lastSpace) : slice;
  return trimmed.trimEnd().replace(/[,;:\-(]+$/, '').trimEnd() + '...';
}

function normalizeSkillFrontmatter(skillFile) {
  const raw = fs.readFileSync(skillFile, 'utf8');
  const parsed = parseRawFrontmatter(raw);
  if (!parsed) return false;

  const { fields, metadata, body } = parsed;
  let changed = false;

  let desc = (fields.description || '').replace(/[<>]/g, '').trim();
  const triggerVal = fields.trigger || metadata.trigger || '';

  const hasTriggerDesc = DESCRIPTION_TRIGGER.test(desc);
  const onlyNegated = hasTriggerDesc && DESCRIPTION_TRIGGER_NEGATE.test(desc)
    && !desc.replace(DESCRIPTION_TRIGGER_NEGATE, '').match(DESCRIPTION_TRIGGER);

  if (!hasTriggerDesc || onlyNegated) {
    if (triggerVal) {
      let cleanTrig = triggerVal
        .replace(/Trigger bằng lệnh\s+\/[^\s.]+(\s+\{[^}]+\})?\.?/gi, '')
        .replace(/Kích hoạt bằng lệnh\s+\/[^\s.]+(\s+\{[^}]+\})?\.?/gi, '')
        .replace(/^(Khi|Sử dụng khi|Dùng khi)\s+/i, 'Dùng khi ')
        .replace(/[<>]/g, '')
        .trim();
      if (!DESCRIPTION_TRIGGER.test(cleanTrig)) {
        cleanTrig = `Dùng khi ${cleanTrig.charAt(0).toLowerCase()}${cleanTrig.slice(1)}`;
      }
      desc = desc.endsWith('.') ? `${desc} ${cleanTrig}` : `${desc}. ${cleanTrig}`;
    } else {
      desc = `${desc}. Sử dụng khi người dùng yêu cầu tác vụ ${fields.name}.`;
    }
    changed = true;
  }

  if (desc.length > 1000) {
    desc = desc.slice(0, 997).trimEnd() + '...';
    changed = true;
  }

  if ('trigger' in fields || 'disable-auto-invoke' in fields) {
    changed = true;
  }

  const newMeta = { ...metadata };
  if (!newMeta.version) newMeta.version = '1.0.0';
  if (fields['disable-auto-invoke'] === 'true') {
    newMeta['disable-auto-invoke'] = 'true';
  }
  if (!newMeta['short-description']) {
    newMeta['short-description'] = buildShortDescription(desc);
  }

  if (!changed && 'metadata' in parsed && raw.includes('short-description')) {
    return false;
  }

  const lines = [
    '---',
    `name: ${fields.name}`,
    `description: ${yamlQuote(desc)}`,
    'metadata:',
    `  version: ${yamlQuote(newMeta.version)}`,
    `  short-description: ${yamlQuote(newMeta['short-description'])}`,
  ];
  if (newMeta['disable-auto-invoke'] === 'true') {
    lines.push('  disable-auto-invoke: true');
  }
  lines.push('---');

  fs.writeFileSync(skillFile, lines.join('\n') + body, 'utf8');
  return true;
}

export function generateOpenAiYaml(pluginName, skillDir) {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;

  const raw = fs.readFileSync(skillFile, 'utf8');
  const parsed = parseRawFrontmatter(raw);
  if (!parsed) return null;

  const { fields, metadata } = parsed;
  const skillName = fields.name || path.basename(skillDir);
  const desc = fields.description || '';
  const displayName = toDisplayName(skillName);
  const shortDesc = metadata['short-description'] || buildShortDescription(desc);
  const brandColor = PLUGIN_BRAND_COLORS[pluginName] || '#3B82F6';
  const disableAuto = fields['disable-auto-invoke'] === 'true' || metadata['disable-auto-invoke'] === 'true';
  const defaultPrompt = `Sử dụng $${skillName} để thực hiện tác vụ này theo đúng quy trình chuẩn.`;

  const yamlLines = [
    'interface:',
    `  display_name: ${yamlQuote(displayName)}`,
    `  short_description: ${yamlQuote(shortDesc)}`,
    `  brand_color: ${yamlQuote(brandColor)}`,
    `  default_prompt: ${yamlQuote(defaultPrompt)}`,
    '',
    'policy:',
    `  allow_implicit_invocation: ${disableAuto ? 'false' : 'true'}`,
    '',
  ];

  const outDir = path.join(skillDir, 'agents');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'openai.yaml');
  fs.writeFileSync(outPath, yamlLines.join('\n'), 'utf8');
  return outPath;
}

function main() {
  const normalize = process.argv.includes('--normalize');
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`ERROR: plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  let normalizedCount = 0;
  let generatedCount = 0;

  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory()).sort();
  for (const plugin of plugins) {
    const skillsDir = path.join(PLUGINS_DIR, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;
    const skills = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory()).sort();
    for (const skill of skills) {
      const skillDir = path.join(skillsDir, skill);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;

      if (normalize && normalizeSkillFrontmatter(skillFile)) {
        normalizedCount++;
      }
      if (generateOpenAiYaml(plugin, skillDir)) {
        generatedCount++;
      }
    }
  }

  if (normalize) {
    console.log(`Normalized ${normalizedCount} SKILL.md frontmatters.`);
  }
  console.log(`Generated ${generatedCount} agents/openai.yaml files for Codex.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
