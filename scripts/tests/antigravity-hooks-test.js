import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('Antigravity PreToolUse Hooks Contract', async (t) => {
  const workspaceGuard = path.resolve('.agents/hooks/antigravity/workspace-path-guard.sh');
  const branchGuard = path.resolve('.agents/hooks/antigravity/branch-guard.sh');

  const runHook = (hookPath, payload) => {
    const input = JSON.stringify(payload);
    const stdout = execSync(`bash "${hookPath}"`, { input, encoding: 'utf8' });
    return JSON.parse(stdout);
  };

  await t.test('workspace-path-guard blocks forbidden roots (reports/) with decision deny', () => {
    const res = runHook(workspaceGuard, {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'reports/leak.md',
          Content: 'forbidden content'
        }
      }
    });
    assert.strictEqual(res.decision, 'deny');
    assert.match(res.reason, /LỖI WORKSPACE PATH/);
  });

  await t.test('workspace-path-guard blocks temporary scratch scripts in root scripts/ with decision deny', () => {
    const res = runHook(workspaceGuard, {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'scripts/scratch-test-debug.mjs',
          Content: 'console.log("temp");'
        }
      }
    });
    assert.strictEqual(res.decision, 'deny');
    assert.match(res.reason, /CẤM TẠO SCRIPT TẠM TRONG THƯ MỤC SCRIPTS\/ GỐC/);
  });

  await t.test('workspace-path-guard allows valid workspace ticket paths', () => {
    const res = runHook(workspaceGuard, {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'workspace/issues/JIRA-123/spec/final.md',
          Content: '# Spec content'
        }
      }
    });
    assert.strictEqual(res.decision, 'allow');
  });

  await t.test('workspace-path-guard blocks secret leak with decision deny', () => {
    const res = runHook(workspaceGuard, {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'workspace/issues/JIRA-123/test/test.py',
          Content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...'
        }
      }
    });
    assert.strictEqual(res.decision, 'deny');
    assert.match(res.reason, /LỖI BẢO MẬT/);
  });

  await t.test('branch-guard asks confirmation for dangerous git reset --hard', () => {
    const res = runHook(branchGuard, {
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'git reset --hard HEAD'
        }
      }
    });
    assert.strictEqual(res.decision, 'ask');
    assert.match(res.reason, /AUTONOMY GUARD/);
  });

  await t.test('branch-guard asks confirmation for pip install', () => {
    const res = runHook(branchGuard, {
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'pip install some-package'
        }
      }
    });
    assert.strictEqual(res.decision, 'ask');
  });

  await t.test('branch-guard blocks raw test execution without redirect', () => {
    const res = runHook(branchGuard, {
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'pytest tests/'
        }
      }
    });
    assert.strictEqual(res.decision, 'deny');
    assert.match(res.reason, /QA LOG EXEMPTION/);
  });

  await t.test('branch-guard allows benign command', () => {
    const res = runHook(branchGuard, {
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'npm test'
        }
      }
    });
    assert.strictEqual(res.decision, 'allow');
  });
});
