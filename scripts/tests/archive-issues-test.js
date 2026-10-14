import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { archiveIssues } from '../workspace/archive-issues.js';

const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-archive-test-'));
  sandboxes.push(root);
  return root;
}

afterEach(() => {
  while (sandboxes.length) {
    fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
  }
});

test('archiveIssues: không làm gì nếu không có workspace/issues', () => {
  const root = makeSandbox();
  const res = archiveIssues({ projectRoot: root });
  assert.deepEqual(res.archived, []);
  assert.deepEqual(res.skipped, []);
  assert.deepEqual(res.errors, []);
});

test('archiveIssues: di chuyển issue theo key chỉ định', () => {
  const root = makeSandbox();
  const issueDir = path.join(root, 'workspace', 'issues', 'G3PTP-999');
  fs.mkdirSync(issueDir, { recursive: true });
  fs.writeFileSync(path.join(issueDir, 'test.txt'), 'hello');

  const res = archiveIssues({ projectRoot: root, key: 'G3PTP-999' });
  assert.equal(res.archived.length, 1);
  assert.ok(!fs.existsSync(issueDir));
  assert.ok(fs.existsSync(path.join(root, 'workspace', 'archive', 'G3PTP-999', 'test.txt')));
});

test('archiveIssues: dry-run không thực hiện di chuyển file', () => {
  const root = makeSandbox();
  const issueDir = path.join(root, 'workspace', 'issues', 'G3PTP-888');
  fs.mkdirSync(issueDir, { recursive: true });
  fs.writeFileSync(path.join(issueDir, 'test.txt'), 'hello');

  const res = archiveIssues({ projectRoot: root, key: 'G3PTP-888', dryRun: true });
  assert.equal(res.archived.length, 1);
  assert.ok(fs.existsSync(issueDir));
  assert.ok(!fs.existsSync(path.join(root, 'workspace', 'archive', 'G3PTP-888')));
});
