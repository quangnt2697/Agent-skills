#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-artifact-paths.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-artifact-paths-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-artifact-paths.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-artifact-paths.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes when producers and consumers use the canonical artifact paths', () => {
  const root = makeSandbox();
  writeFile(root, '.claude/commands/spec.md', 'Save the spec as `SPEC.md` in the project root.\n');
  writeFile(root, '.claude/commands/plan.md', 'Save the plan to `tech/plan.md` and task list to `tech/todo.md`.\n');
  writeFile(root, '.claude/commands/build.md', 'Look for a spec at `SPEC.md`, `docs/SPEC.md`, or under `spec/`. Require `tech/plan.md`.\n');
  writeFile(root, 'skills/spec-driven-development/SKILL.md', 'Save the plan to `tech/plan.md` and the task list to `tech/todo.md`.\n');
  writeFile(root, 'skills/planning-and-task-breakdown/SKILL.md', 'Save to `tech/plan.md` and `tech/todo.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /5 files checked — 0 error\(s\) — PASSED/);
});

test('fails when a producer drifts to an unapproved artifact path (the #93 regression)', () => {
  const root = makeSandbox();
  // Only the producers are changed to the per-feature layout; consumers stay on the old paths.
  writeFile(root, '.claude/commands/spec.md', 'Save the spec to `docs/features/[feature-name]/spec.md`.\n');
  writeFile(root, '.claude/commands/plan.md', 'Save the plan to `docs/features/[feature-name]/plan.md`.\n');
  writeFile(root, '.claude/commands/build.md', 'Require a spec at `SPEC.md` and a plan at `tech/plan.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /docs\/features\/\[feature-name\]\/spec\.md/);
  assert.match(result.stdout, /docs\/features\/\[feature-name\]\/plan\.md/);
  assert.match(result.stdout, /error\(s\) — FAILED/);
});

test('reports the offending file and line number', () => {
  const root = makeSandbox();
  writeFile(root, '.claude/commands/plan.md', 'Intro line.\nSave the plan to `plan.md` in the root.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\.claude\/commands\/plan\.md/);
  assert.match(result.stdout, /L2:/);
});

test('accepts the docs/SPEC.md alternate spec location', () => {
  const root = makeSandbox();
  writeFile(root, '.claude/commands/build.md', 'Look for the spec at `docs/SPEC.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

test('ignores non-artifact markdown references (no false positives)', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/spec-driven-development/SKILL.md',
    'See `SKILL.md` and `references/testing-patterns.md`. Save the plan to `tech/plan.md`.\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

test('skips guarded files that do not exist', () => {
  const root = makeSandbox();
  writeFile(root, '.claude/commands/spec.md', 'Save the spec as `SPEC.md`.\n');
  // No other guarded files present.

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

// --- Per-issue workspace convention -----------------------------------------
//
// Canonical layout (see .claude/rules/workspace-paths.md):
//   workspace/{issueKey}/{source,spec,tech,test,trace}/
// Two independent guards: the roots directly under workspace/<key>/ must be one
// of the five, and no file may mention a directory from the old nested layout.

test('passes when per-issue artifacts use the five canonical roots', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/ba-spec/SKILL.md',
    [
      'Output: `workspace/{issueKey}/spec/final.md`.',
      'Downloads land in `workspace/{issueKey}/source/refs/`.',
      'DEV writes `workspace/{issueKey}/tech/tech-spec.md`.',
      'QA writes `workspace/{issueKey}/test/checklist.md`.',
      'Traceability: `workspace/{issueKey}/trace/matrix.md`.',
      '',
    ].join('\n'),
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Checking per-issue workspace artifact paths/);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

test('flags a sixth root invented under workspace/<key>/', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/ba-x/SKILL.md', 'Save to `workspace/{issueKey}/output/report.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /"output" is not a workspace root/);
});

test('accepts a literal issue key in place of the {issueKey} placeholder', () => {
  const root = makeSandbox();
  writeFile(root, 'agents/qa.md', 'Read `workspace/PROJ-123/spec/final.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a non-ASCII placeholder as the unit-of-work segment (qa-code2spec)', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/qa-code2spec/SKILL.md', 'Xuất ra `workspace/{tên_file}/spec/final.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a workspace path built from a shell variable', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/qa-run-test/SKILL.md',
    'REPORT_DIR="workspace/${ISSUE_KEY}/test/result"\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a dotfile directly under the workspace key', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/qa-pipeline/SKILL.md', 'State: `workspace/{issueKey}/.pipeline-state.json`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('does not flag tree children that hang off a workspace root', () => {
  const root = makeSandbox();
  writeFile(
    root,
    '.claude/commands/qa-pipeline.md',
    [
      '```',
      'workspace/{issueKey}/',
      '├── spec/final.md',
      '└── test/',
      '    ├── checklist.md',
      '    └── result/summary.md',
      '```',
      '',
    ].join('\n'),
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('rejects every directory name from the pre-flattening layout', () => {
  const legacy = [
    ['specs/imports/jira/{issueKey}/{issueKey}-final.md', 'spec/'],
    ['specs/refine/jira/{issueKey}/{issueKey}-refined.md', 'spec/refined.md'],
    ['specs/code-import/{tên_file}-final.md', 'spec/final.md'],
    ['tests/qa-test-design/{issueKey}/steps/', 'test/'],
    ['docs/user-stories/{issueKey}-user-stories.md', 'spec/user-stories.md'],
    ['docs/gap-analysis/{issueKey}-gap-analysis.md', 'spec/gap-analysis.md'],
    ['docs/backlog/{issueKey}-prioritized-backlog.md', 'spec/backlog.md'],
    ['docs/processes/{issueKey}-as-is-process.md', 'spec/process-'],
    ['docs/stakeholder-interviews/{issueKey}-x.md', 'spec/stakeholders.md'],
  ];

  for (const [oldPath, hintFragment] of legacy) {
    const sandbox = makeSandbox();
    writeFile(sandbox, 'skills/ba-x/SKILL.md', `Lưu vào \`${oldPath}\`.\n`);

    const result = run(sandbox);

    assert.equal(result.status, 1, `${oldPath}: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /legacy layout — use/, oldPath);
    assert.ok(result.stdout.includes(hintFragment), `${oldPath} should suggest ${hintFragment}`);
  }
});

test('catches the legacy layout even when correctly workspace-prefixed', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/ba-spec/SKILL.md',
    'Output: `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md`.\n',
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /legacy layout/);
});

test('catches the legacy layout inside an ASCII tree line', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/ba-spec/SKILL.md',
    ['```', 'workspace/{issueKey}/', '└── tests/qa-test-design/{issueKey}/', '```', ''].join('\n'),
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /legacy layout — use workspace\/\{issueKey\}\/test\//);
});
