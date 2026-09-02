#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-commands.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-commands-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-commands.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeClaudeCommand(root, stem, descriptionLine) {
  writeFile(
    root,
    path.join('plugins', 'core', '.claude', 'commands', `${stem}.md`),
    `---\n${descriptionLine}\n---\n\n# Command\n`,
  );
}

function writeTomlCommand(root, directory, stem, descriptionLine) {
  writeFile(root, path.join('plugins', 'core', directory, `${stem}.toml`), `${descriptionLine}\nprompt = "Run command"\n`);
}

function writeMatchingCommands(root, stem, description) {
  writeClaudeCommand(root, stem, `description: "${description}"`);
  writeTomlCommand(root, 'commands', stem, `description = "${description}"`);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-commands.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes matching command twins', () => {
  const root = makeSandbox();
  writeMatchingCommands(root, 'plan', 'Plan');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 commands checked — 0 error\(s\) — PASSED/);
  assert.match(result.stdout, /✓  plan/);
});

test('fails when a Claude command is missing a TOML twin', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'plan', 'description: "Plan"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗  plan — missing in: commands/);
});

test('fails when a TOML command has no Claude twin', () => {
  const root = makeSandbox();
  writeTomlCommand(root, 'commands', 'plan', 'description = "Plan"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗  plan — present in toml dirs but missing in \.claude\/commands/);
});

test('reports all descriptions when command twins drift', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'plan', 'description: "Plan B"');
  writeTomlCommand(root, 'commands', 'plan', 'description = "Plan A"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗  plan/);
  assert.match(result.stdout, /\.claude:\s+Plan B/);
  assert.match(result.stdout, /commands\/:\s+Plan A/);
});

test('fails with an actionable error for a malformed description', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'plan', 'description: "Plan"');
  writeTomlCommand(root, 'commands', 'plan', 'description = Plan');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗  plan/);
  assert.match(result.stdout, /commands\/plan — missing or malformed description/);
});

test('parses escaped quotes in double-quoted TOML descriptions', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'plan', 'description: \'Show "Plan"\'');
  writeTomlCommand(root, 'commands', 'plan', 'description = "Show \\"Plan\\""');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});