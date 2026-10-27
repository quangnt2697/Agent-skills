import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATOR = path.join(__dirname, '..', 'validators', 'validate-code-refs.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-code-refs-test-'));
  const scriptsDir = path.join(root, 'scripts', 'validators');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-code-refs.js'));
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
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validators', 'validate-code-refs.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes when all referenced scripts and assets exist', () => {
  const root = makeSandbox();
  writeFile(root, 'scripts/qa/sample.js', 'console.log("ok");\n');
  writeFile(
    root,
    'plugins/demo/skills/demo-skill/SKILL.md',
    '# Demo\nChạy script: `node ${AGENT_SKILLS_HOME:-.}/scripts/qa/sample.js`\n'
  );

  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when a skill references a non-existent script', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'plugins/demo/skills/demo-skill/SKILL.md',
    '# Demo\nChạy script ma: `node scripts/qa/ghost-script.js`\n'
  );

  const result = run(root);
  assert.equal(result.status, 1, 'Expected failure for missing script');
  assert.match(result.stdout, /ghost-script\.js/);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
});

test('ignores runtime artifacts in workspace/ and path parameters', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'plugins/demo/skills/demo-skill/SKILL.md',
    '# Demo\nLưu tại `workspace/issues/{issueKey}/test/result.json`\n'
  );

  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when a skill references a non-existent markdown checklist/domain file', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'plugins/demo/skills/demo-skill/SKILL.md',
    '# Demo\nTham chiếu: `references/securities/non-existent-rule.md`\n'
  );

  const result = run(root);
  assert.equal(result.status, 1, 'Expected failure for missing markdown reference');
  assert.match(result.stdout, /non-existent-rule\.md/);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
});
