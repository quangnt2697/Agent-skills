'use strict';
/**
 * skill-lint.js — the skill validation rules, as a shared library.
 *
 * This is the single source of truth for what makes a SKILL.md valid
 * (docs/skill-anatomy.md). The CLI in scripts/validate-skills.js is a thin
 * wrapper over it. Splitting the rules out of the CLI keeps them importable
 * and unit-testable without spawning a process or touching the filesystem.
 *
 * Checks (errors block CI):
 *   - SKILL.md exists in every skill directory
 *   - YAML frontmatter present with 'name' and 'description' fields
 *   - frontmatter 'name' matches the directory name
 *   - directory name is lowercase-hyphen-separated (skill-anatomy.md: Naming Conventions)
 *   - description does not exceed 1024 characters
 *   - description includes a 'when to use' trigger (skill-anatomy.md: Required)
 *   - required sections are present
 *
 * Checks (warnings, do not block CI):
 *   - cross-skill references point to known skills
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 1024;

// A skill directory name must be lowercase-hyphen-separated
// (docs/skill-anatomy.md → Naming Conventions).
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// A description must state WHEN to use the skill, not just what it does
// (docs/skill-anatomy.md → Required). Accept the canonical "Use when …"
// plus the equivalent "Use before/after/during …" phrasings in use today.
// This repo authors skills in Vietnamese (CLAUDE.md → Chuẩn mực Đầu ra), so the
// Vietnamese equivalents are first-class triggers, not a fallback.
// Reject negated forms ("Do not use when …", "Không sử dụng khi …") — those
// describe exclusions, not trigger conditions.
//
// The Vietnamese alternatives use Unicode lookarounds rather than \b: JS word
// boundaries are ASCII-only, so \b never matches next to an accented letter
// ("Áp dụng", "để") and the trigger would be missed.
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

// Sections every standard SKILL.md must contain.
//
// Matched by keyword rather than by an exact heading string. The repo authors
// headings in Vietnamese with free-form parentheticals and inconsistent casing
// — "## Xác Minh (Verification)", "## Cờ Đỏ (Red Flags)", "## Những lời Biện
// minh Thường gặp" — and an exact-alias list never keeps up: every new
// phrasing reads as a missing section and buries the genuine gaps.
//
// Each entry is { label, pattern }. `label` is what an error message names;
// `pattern` is tested against each H2 heading line (case-insensitive).
const REQUIRED_SECTIONS = [
  {
    label: '## Overview',
    pattern: /^##\s+(overview|tổng\s+quan|mục\s+đích)\b/i,
  },
  {
    label: '## When to Use',
    pattern: /^##\s+.*(when\s+to\s+use|khi\s+nào\s+(cần\s+)?(sử\s+dụng|dùng|áp\s+dụng))/i,
  },
  {
    label: '## Common Rationalizations',
    // "Anti-patterns" is accepted: it is the shape several skills already use
    // to record the same thing — the excuses that lead people to skip the work.
    pattern: /^##\s+.*(rationalization|biện\s+hộ|biện\s+minh|ngụy\s+biện|anti[-\s]?pattern|phản\s+mẫu)/i,
  },
  {
    label: '## Red Flags',
    pattern: /^##\s+.*(red\s+flag|dấu\s+hiệu\s+cảnh\s+báo|cờ\s+đỏ)/i,
  },
  {
    label: '## Verification',
    pattern: /^##\s+.*(verification|xác\s+minh|kiểm\s+chứng)/i,
  },
];

// Skills that are intentionally exempt from section checks.
// Exemptions live HERE, not in skill frontmatter, so contributors
// cannot bypass the validator by editing their own skill file.
// Every entry must have a documented reason.
const SECTION_EXEMPT_SKILLS = {
  'meta-using-agent-skills': 'Meta-skill — orchestrates other skills; When-to-Use and Verification are not applicable to a routing document.',
  'ba-refine':               'Legacy structure predating skill-anatomy.md — uses How-It-Works/Usage/Anti-patterns instead of standard headings. Tracked for conformance in https://github.com/addyosmani/agent-skills/issues',
};

// Regex patterns that indicate an explicit cross-skill reference.
// Only these patterns trigger the dead-reference warning — generic
// backtick strings in code blocks are intentionally excluded.
const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /──→ ([a-z][a-z0-9-]+[a-z0-9])\b/g,          // ASCII diagram arrows
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip fenced code blocks from markdown content so that headings, references,
 * and trigger phrases inside examples or templates are not matched by lint rules.
 */
function stripFencedCodeBlocks(content) {
  return content.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
}

/**
 * Parse YAML-style frontmatter from the top of a markdown file.
 * Returns a key→value object, or null if no frontmatter block found.
 * Values are stripped of surrounding quotes.
 *
 * Supports block scalars (`key: >` folded and `key: |` literal, with optional
 * chomping indicators). Several skills declare their description that way; a
 * line-only parser would read the value as ">" and every content check against
 * it — length, trigger phrase — would be scanning a one-character string.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const result = {};
  const lines  = match[1].split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Continuation lines of a block scalar are consumed by the branch below.
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    // Only treat a line as a new key if it starts at column 0 — indented lines
    // belong to the block scalar above them.
    if (/^\s/.test(line)) continue;

    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    const rawValue = line.slice(colonIdx + 1).trim();

    if (/^[>|][-+]?\d*$/.test(rawValue)) {
      // Block scalar: gather the indented lines that follow.
      const parts = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (lines[j].trim() === '') { parts.push(''); continue; }
        if (!/^\s/.test(lines[j])) break;   // dedent ends the block
        parts.push(lines[j].trim());
      }
      i = j - 1;
      // Folded (>) joins with spaces; literal (|) keeps newlines. Either way the
      // lint rules only need the text, so join folded-style and trim.
      const joined = rawValue.startsWith('|') ? parts.join('\n') : parts.join(' ');
      result[key] = joined.replace(/\s+/g, ' ').trim();
    } else {
      result[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

/**
 * Collect all explicit skill cross-references from content.
 * Only matches against the SKILL_REF_PATTERNS list to avoid
 * false-positives from inline code snippets.
 */
function extractSkillReferences(content) {
  const refs = new Set();
  for (const pattern of SKILL_REF_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      refs.add(m[1]);
    }
  }
  return refs;
}

// ─── Linter ──────────────────────────────────────────────────────────────────

/**
 * Lint already-read SKILL.md content. Pure: no filesystem access, so the rules
 * can be exercised against crafted fixtures in a unit test.
 * Returns { errors, warnings, exempt }.
 */
function lintSkillContent(dirName, content, knownSkills) {
  const errors   = [];
  const warnings = [];
  let   exempt   = false;

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, exempt };
  }

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!KEBAB_CASE.test(dirName)) {
    errors.push(`Directory name '${dirName}' is not lowercase-hyphen-separated (skill-anatomy.md: Naming Conventions)`);
  }

  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else {
    if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit` +
        ` (agents inject this into the system prompt)`
      );
    }
    const hasTriggerField  = typeof fm.trigger === 'string' && fm.trigger.trim().length > 0;
    const hasTriggerDesc   = DESCRIPTION_TRIGGER.test(fm.description);
    const onlyNegated      = hasTriggerDesc && DESCRIPTION_TRIGGER_NEGATE.test(fm.description)
      && !fm.description.replace(DESCRIPTION_TRIGGER_NEGATE, '').match(DESCRIPTION_TRIGGER);
    if (!hasTriggerField && (!hasTriggerDesc || onlyNegated)) {
      errors.push(
        `Description has no 'when to use' trigger — add a 'trigger:' field in frontmatter or a "Use when …" clause in description ` +
        `(skill-anatomy.md: Required — the skill must declare when to use it)`
      );
    }
  }

  // ── Exemption guard ──────────────────────────────────────────────────────
  // Exemptions are validator-owned (SECTION_EXEMPT_SKILLS above).
  // If a skill's frontmatter tries to declare its own exemption, fail loud —
  // that's a sign someone is trying to bypass the validator.
  if (fm.type === 'meta' || fm.exempt === 'sections') {
    if (!SECTION_EXEMPT_SKILLS[dirName]) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to scripts/lib/skill-lint.js with a documented reason.`
      );
    }
  }

  // ── Required sections ────────────────────────────────────────────────────
  exempt = dirName in SECTION_EXEMPT_SKILLS;

  if (!exempt) {
    // Strip fenced code blocks so headings inside examples/templates don't
    // satisfy the check, then test each H2 line on its own — anchoring per
    // heading keeps `### Verification` inside a block from satisfying `## Verification`.
    const headings = stripFencedCodeBlocks(content)
      .split(/\r?\n/)
      .filter(line => /^##\s/.test(line));

    // Support both Progressive Disclosure (3-tier) structure and Classic 5-section structure
    const hasWhenToUse = headings.some(h => /^##\s+.*(when\s+to\s+use|khi\s+nào\s+(cần\s+)?(sử\s+dụng|dùng|áp\s+dụng)|mục\s+đích|overview|tổng\s+quan)/i.test(h));
    const hasProcess = headings.some(h => /^##\s+.*(quy\s+trình|chu\s+trình|các\s+bước|hướng\s+dẫn|thực\s+hiện|nguyên\s+tắc|workflow|process|giai\s+đoạn|phase|đầu\s+vào)/i.test(h));
    const hasResourcesOrFewShot = headings.some(h => /^##\s+.*(tài\s+nguyên|assets|references|mở\s+rộng|ví\s+dụ|few-shot|mẫu|xác\s+minh|verification)/i.test(h));

    const isProgressiveDisclosure = hasWhenToUse && hasProcess && hasResourcesOrFewShot;

    if (!isProgressiveDisclosure) {
      for (const { label, pattern } of REQUIRED_SECTIONS) {
        if (!headings.some(h => pattern.test(h))) {
          errors.push(`Missing required section: ${label}`);
        }
      }
    }
  }

  // ── Cross-skill references ───────────────────────────────────────────────
  const refs = extractSkillReferences(content);
  for (const ref of refs) {
    if (!knownSkills.has(ref)) {
      warnings.push(`Dead cross-reference: \`${ref}\` is not a known skill`);
    }
  }

  return { errors, warnings, exempt };
}

/**
 * Lint a skill by directory name: reads its SKILL.md, then delegates to
 * lintSkillContent. This is the thin filesystem wrapper the CLI uses.
 * Returns { errors, warnings, exempt }.
 */
function lintSkill(dirName, skillsDir, knownSkills) {
  const skillPath = path.join(skillsDir, dirName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    return { errors: ['Missing SKILL.md'], warnings: [], exempt: false };
  }

  let content;
  try {
    content = fs.readFileSync(skillPath, 'utf8');
  } catch (err) {
    return { errors: [`Unreadable SKILL.md: ${err.message}`], warnings: [], exempt: false };
  }

  return lintSkillContent(dirName, content, knownSkills);
}

// Export only the linting functions. The policy collections (REQUIRED_SECTIONS,
// SECTION_EXEMPT_SKILLS, SKILL_REF_PATTERNS, and the regexes) stay private so a
// test or future consumer cannot mutate shared state and change lint results for
// the rest of the process. Exercise the rules through these functions.
export {
  parseFrontmatter,
  extractSkillReferences,
  lintSkillContent,
  lintSkill,
};

