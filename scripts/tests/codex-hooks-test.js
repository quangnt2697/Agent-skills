import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('Codex PreToolUse Hook Adapter Contract', async (t) => {
  const preToolGuard = path.resolve('.agents/hooks/codex/pre-tool-guard.sh');

  const runGuard = (payload) => {
    return spawnSync('bash', [preToolGuard], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });
  };

  await t.test('blocks forbidden root path (reports/) via apply_patch with exit code 2', () => {
    const res = runGuard({
      tool_name: 'apply_patch',
      tool_input: {
        patch: '*** Begin Patch\n*** Add File: reports/leak.md\n+hello\n*** End Patch',
      },
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /LỖI WORKSPACE PATH/);
  });

  await t.test('blocks secret leak (glpat- token) in file write with exit code 2', () => {
    const res = runGuard({
      tool_name: 'apply_patch',
      tool_input: {
        file_path: 'workspace/issues/PROJ-1/spec/notes.md',
        content: 'token = glpat-abcdef1234567890xyz1',
      },
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /LỖI BẢO MẬT|SECRET/i);
  });

  await t.test('blocks dangerous git reset --hard command with exit code 2', () => {
    const res = runGuard({
      tool_name: 'exec_command',
      tool_input: {
        command: 'git reset --hard HEAD~1',
      },
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /git reset --hard/i);
  });

  await t.test('blocks raw pytest without test-output.log redirect', () => {
    const res = runGuard({
      tool_name: 'exec_command',
      tool_input: {
        command: 'pytest tests/test_order.py',
      },
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /test-output\.log/);
  });

  await t.test('allows valid workspace ticket path and benign shell command', () => {
    const fileRes = runGuard({
      tool_name: 'apply_patch',
      tool_input: {
        file_path: 'workspace/issues/PROJ-1/spec/final.md',
        content: '# Spec sạch',
      },
    });
    assert.equal(fileRes.status, 0, fileRes.stderr);

    const cmdRes = runGuard({
      tool_name: 'exec_command',
      tool_input: {
        command: 'git status --short',
      },
    });
    assert.equal(cmdRes.status, 0, cmdRes.stderr);
  });

  await t.test('blocks multi-file apply_patch when a subsequent file targets forbidden path', () => {
    const res = runGuard({
      tool_name: 'apply_patch',
      tool_input: {
        patch: [
          '*** Begin Patch',
          '*** Add File: workspace/issues/PROJ-1/spec/ok.md',
          '+ok',
          '*** Add File: reports/sneaky.md',
          '+bad',
          '*** End Patch',
        ].join('\n'),
      },
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /LỖI WORKSPACE PATH/);
  });

  await t.test('parses stringified tool_input JSON arguments', () => {
    const res = runGuard({
      tool_name: 'exec_command',
      arguments: JSON.stringify({ command: 'pytest tests/test_order.py' }),
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /test-output\.log/);
  });
});
