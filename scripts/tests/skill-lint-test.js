#!/usr/bin/env node

'use strict';

/**
 * skill-lint-test.js — unit tests for the shared skill validation rules.
 *
 * Focus: this repo authors SKILL.md in Vietnamese (CLAUDE.md → Chuẩn mực Đầu ra),
 * so the linter must accept Vietnamese section headings and trigger phrases as
 * first-class, not treat them as missing. Before this was supported the validator
 * reported 164 false-positive errors, which buried the genuine ones.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lintSkillContent, parseFrontmatter } from '../lib/skill-lint.js';


const KNOWN = new Set(['demo-skill', 'other-skill']);

/** Build a SKILL.md body from a list of H2 headings. */
function skillDoc({ name = 'demo-skill', description, sections }) {
  const fm = `---\nname: ${name}\ndescription: ${description}\n---\n\n`;
  return fm + sections.map(h => `${h}\n\nnội dung.\n`).join('\n');
}

const VN_SECTIONS = [
  '## Tổng quan',
  '## Khi nào sử dụng',
  '## Các Biện hộ Thường gặp',
  '## Dấu hiệu Cảnh báo (Red Flags)',
  '## Xác minh',
];

const EN_SECTIONS = [
  '## Overview',
  '## When to Use',
  '## Common Rationalizations',
  '## Red Flags',
  '## Verification',
];

test('accepts a fully Vietnamese skill', () => {
  const content = skillDoc({
    description: 'Thiết kế test artifacts. Sử dụng khi cần tạo checklist và Gherkin.',
    sections: VN_SECTIONS,
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.deepEqual(errors, []);
});

test('still accepts a fully English skill', () => {
  const content = skillDoc({
    description: 'Designs test artifacts. Use when creating a checklist.',
    sections: EN_SECTIONS,
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.deepEqual(errors, []);
});

test('accepts documented Vietnamese heading aliases', () => {
  const content = skillDoc({
    description: 'Dịch ngược code thành spec. Dùng khi cần reverse engineering.',
    sections: [
      '## Mục đích',                          // alias của ## Overview
      '## Khi nào cần sử dụng',               // alias của ## When to Use
      '## Anti-patterns (Tránh)',             // alias của ## Common Rationalizations
      '## Các Dấu hiệu Cảnh báo (Red Flags)', // alias của ## Red Flags
      '## Checklist Xác minh',                // alias của ## Verification
    ],
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.deepEqual(errors, []);
});

test('matches headings by keyword, not exact string', () => {
  // Free-form parentheticals and title-case wording that no alias list would
  // have enumerated — these are real headings from skills in this repo.
  const content = skillDoc({
    description: 'Tối ưu ngữ cảnh. Sử dụng khi cần reset context.',
    sections: [
      '## Tổng Quan',
      '## Khi Nào Sử Dụng',
      '## Những Sự Ngụy Biện Phổ Biến (Common Rationalizations)',
      '## Cờ Đỏ (Red Flags)',
      '## Xác Minh (Verification)',
    ],
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.deepEqual(errors, []);
});

test('keyword matching does not accept an unrelated heading', () => {
  const content = skillDoc({
    description: 'Demo. Sử dụng khi cần demo.',
    sections: [
      '## Tổng quan',
      '## Khi nào sử dụng',
      '## Các Biện hộ Thường gặp',
      '## Dấu hiệu Cảnh báo (Red Flags)',
      '## Tích hợp với Pipeline',   // KHÔNG phải Verification
    ],
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing required section: ## Verification/);
});

test('an H3 heading does not satisfy a required H2 section', () => {
  const content =
    `---\nname: demo-skill\ndescription: Demo. Sử dụng khi cần.\n---\n\n` +
    VN_SECTIONS.filter(h => h !== '## Xác minh').map(h => `${h}\n\nnội dung.\n`).join('\n') +
    '\n### Xác minh\n\nnội dung.\n';
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing required section: ## Verification/);
});

test('reports a genuinely missing section even when the rest is Vietnamese', () => {
  const content = skillDoc({
    description: 'Chạy test automation. Sử dụng khi cần chạy lại test đã có.',
    sections: VN_SECTIONS.filter(h => h !== '## Xác minh'),
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing required section: ## Verification/);
});

test('accepts Vietnamese "when to use" trigger phrasings', () => {
  const triggers = [
    'Sử dụng khi cần import Jira.',
    'Dùng khi phát hiện spec có gap.',
    'Áp dụng trước khi merge vào main.',
    'Sử dụng để sinh code automation từ Gherkin.',
    'Kích hoạt khi user yêu cầu review code.',
  ];
  for (const description of triggers) {
    const content = skillDoc({ description, sections: VN_SECTIONS });
    const { errors } = lintSkillContent('demo-skill', content, KNOWN);
    assert.deepEqual(errors, [], `phải chấp nhận trigger: ${description}`);
  }
});

test('rejects a description with no trigger at all', () => {
  const content = skillDoc({
    description: 'Kỹ năng này thiết kế test artifacts cho domain chứng khoán.',
    sections: VN_SECTIONS,
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no 'when to use' trigger/);
});

test('rejects a Vietnamese negated-only trigger', () => {
  const content = skillDoc({
    description: 'Thiết kế test artifacts. Không sử dụng cho unit test logic thuần.',
    sections: VN_SECTIONS,
  });
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no 'when to use' trigger/);
});

test('flags frontmatter name that does not match the directory', () => {
  const content = skillDoc({
    name: 'test-driven-development',
    description: 'Viết test trước. Sử dụng khi implement tính năng mới.',
    sections: VN_SECTIONS,
  });
  const { errors } = lintSkillContent('dev-test-driven-development', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not match directory name/);
});

test('exempt skills skip section checks', () => {
  const content = skillDoc({
    name: 'meta-using-agent-skills',
    description: 'Khám phá và gọi các kỹ năng. Sử dụng khi bắt đầu một phiên làm việc.',
    sections: ['## Tổng quan'],
  });
  const { errors, exempt } = lintSkillContent('meta-using-agent-skills', content, KNOWN);
  assert.equal(exempt, true);
  assert.deepEqual(errors, []);
});

test('headings inside fenced code blocks do not satisfy a section', () => {
  const content =
    `---\nname: demo-skill\ndescription: Demo. Sử dụng khi cần demo.\n---\n\n` +
    VN_SECTIONS.filter(h => h !== '## Xác minh').map(h => `${h}\n\nnội dung.\n`).join('\n') +
    '\n```markdown\n## Xác minh\n```\n';
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing required section: ## Verification/);
});

test('parseFrontmatter reads name and description', () => {
  const fm = parseFrontmatter('---\nname: demo-skill\ndescription: "Demo. Sử dụng khi cần."\n---\n\nbody\n');
  assert.equal(fm.name, 'demo-skill');
  assert.equal(fm.description, 'Demo. Sử dụng khi cần.');
});

test('parseFrontmatter reads a folded (>) block scalar description', () => {
  const fm = parseFrontmatter(
    '---\nname: demo-skill\ndescription: >\n  Dòng một của mô tả,\n  dòng hai nối tiếp.\n  Sử dụng khi cần demo.\n---\n\nbody\n'
  );
  assert.equal(fm.name, 'demo-skill');
  assert.equal(fm.description, 'Dòng một của mô tả, dòng hai nối tiếp. Sử dụng khi cần demo.');
});

test('a block-scalar description satisfies the trigger check', () => {
  const content =
    '---\nname: demo-skill\ndescription: >\n  Import tài liệu từ Jira.\n  Sử dụng khi cần tạo Business-Spec.\n---\n\n' +
    VN_SECTIONS.map(h => `${h}\n\nnội dung.\n`).join('\n');
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.deepEqual(errors, []);
});

test('a block-scalar description with no trigger is still rejected', () => {
  const content =
    '---\nname: demo-skill\ndescription: >\n  Import tài liệu từ Jira\n  rồi tổng hợp thành markdown.\n---\n\n' +
    VN_SECTIONS.map(h => `${h}\n\nnội dung.\n`).join('\n');
  const { errors } = lintSkillContent('demo-skill', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no 'when to use' trigger/);
});
