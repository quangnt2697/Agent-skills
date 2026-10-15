import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('qa-init.sh', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-init-test-'));
  const scriptPath = path.resolve('plugins/qa/skills/qa-test-design/assets/qa-init.sh');

  await t.test('initializes default api fixture when no type is passed', () => {
    const issueKey = 'INIT-001';
    const outRaw = execSync(`bash ${scriptPath} ${issueKey} ${tmpDir}`, { encoding: 'utf8' });
    const res = JSON.parse(outRaw.trim().split('\n').pop());

    assert.strictEqual(res.status, 'ready');
    assert.strictEqual(res.issue_key, issueKey);

    const testDir = path.join(tmpDir, issueKey, 'test');
    assert.ok(fs.existsSync(path.join(testDir, 'conftest.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', '__init__.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_api.py')));
    assert.ok(!fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_ws.py')));
  });

  await t.test('initializes composable fixtures for hybrid task (--type=api,ws)', () => {
    const issueKey = 'INIT-002';
    const outRaw = execSync(`bash ${scriptPath} ${issueKey} ${tmpDir} --type=api,ws`, { encoding: 'utf8' });
    const res = JSON.parse(outRaw.trim().split('\n').pop());

    assert.strictEqual(res.status, 'ready');
    assert.strictEqual(res.issue_key, issueKey);

    const testDir = path.join(tmpDir, issueKey, 'test');
    assert.ok(fs.existsSync(path.join(testDir, 'conftest.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_api.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_ws.py')));
    assert.ok(!fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_web_ui.py')));
  });

  await t.test('initializes all fixtures when --type=all is passed', () => {
    const issueKey = 'INIT-003';
    const outRaw = execSync(`bash ${scriptPath} ${issueKey} ${tmpDir} --type=all`, { encoding: 'utf8' });
    const res = JSON.parse(outRaw.trim().split('\n').pop());

    assert.strictEqual(res.status, 'ready');

    const testDir = path.join(tmpDir, issueKey, 'test');
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_api.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_ws.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_web_ui.py')));
    assert.ok(fs.existsSync(path.join(testDir, 'fixtures', 'fixtures_mobile.py')));
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
