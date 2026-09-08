import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATOR = path.join(__dirname, 'validate-artifact-paths.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-artifact-paths-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-artifact-paths.js'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
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
    'plugins/core/skills/ba-spec/SKILL.md',
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
  writeFile(root, 'plugins/core/skills/ba-x/SKILL.md', 'Save to `workspace/{issueKey}/output/report.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /"output" is not a workspace root/);
});

test('accepts a literal issue key in place of the {issueKey} placeholder', () => {
  const root = makeSandbox();
  writeFile(root, 'plugins/core/agents/qa.md', 'Read `workspace/PROJ-123/spec/final.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a non-ASCII placeholder as the unit-of-work segment (qa-code2spec)', () => {
  const root = makeSandbox();
  writeFile(root, 'plugins/core/skills/qa-code2spec/SKILL.md', 'Xuất ra `workspace/{tên_file}/spec/final.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a workspace path built from a shell variable', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'plugins/core/skills/qa-run-test/SKILL.md',
    'REPORT_DIR="workspace/${ISSUE_KEY}/test/result"\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('accepts a dotfile directly under the workspace key', () => {
  const root = makeSandbox();
  writeFile(root, 'plugins/core/skills/qa-pipeline/SKILL.md', 'State: `workspace/{issueKey}/.pipeline-state.json`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('does not flag tree children that hang off a workspace root', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'plugins/core/.claude/commands/qa-pipeline.md',
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
    writeFile(sandbox, 'plugins/core/skills/ba-x/SKILL.md', `Lưu vào \`${oldPath}\`.\n`);

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
    'plugins/core/skills/ba-spec/SKILL.md',
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
    'plugins/core/skills/ba-spec/SKILL.md',
    ['```', 'workspace/{issueKey}/', '└── tests/qa-test-design/{issueKey}/', '```', ''].join('\n'),
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /legacy layout — use workspace\/\{issueKey\}\/test\//);
});
