import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportChatGptBundle, validateExportSafety } from '../setup/export-chatgpt.js';

test('export-chatgpt generates <= 10 safe files with <= 8000-char system prompt', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-chatgpt-test-'));
  try {
    const { files } = exportChatGptBundle(tmpDir);
    assert.equal(files.size, 7);
    const instr = fs.readFileSync(path.join(tmpDir, '00-INSTRUCTIONS-SYSTEM-PROMPT.md'), 'utf8');
    assert.ok(instr.length <= 8000, `Expected <= 8000 chars, got ${instr.length}`);
    assert.match(instr, /Code Interpreter/);
    assert.match(instr, /Canvas/);
    assert.equal(validateExportSafety(files).length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validateExportSafety blocks leaked tokens and oversized instructions', () => {
  const bad = new Map([
    ['00-INSTRUCTIONS-SYSTEM-PROMPT.md', 'a'.repeat(8001)],
    ['01-LEAK.md', 'token=glpat-1234567890abcdefghij1234'],
  ]);
  const errs = validateExportSafety(bad);
  assert.equal(errs.length, 2);
});
