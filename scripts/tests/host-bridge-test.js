import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createHostBridgeServer,
  ensureBridgeToken,
  isPathInsideRoots,
  translateContainerPath,
  verifyToken
} from '../lib/host-bridge.js';

function listenEphemeral(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

test('host-bridge: token generation and constant-time verification', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-tok-'));
  try {
    const t1 = ensureBridgeToken(tmp);
    const t2 = ensureBridgeToken(tmp);
    assert.equal(t1.length, 64);
    assert.equal(t1, t2);
    assert.equal(verifyToken(t1, t2), true);
    assert.equal(verifyToken('wrong', t2), false);
    assert.equal(verifyToken('', t2), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('host-bridge: translateContainerPath & isPathInsideRoots', () => {
  assert.equal(translateContainerPath('/workspace/workspace/issues/STK-1/test', '/Users/me/repo'), '/Users/me/repo/workspace/issues/STK-1/test');
  assert.equal(translateContainerPath('/workspace', '/Users/me/repo'), '/Users/me/repo');
  assert.equal(isPathInsideRoots('/Users/me/repo/workspace/issues/STK-1', ['/Users/me/repo']), true);
  assert.equal(isPathInsideRoots('/etc/passwd', ['/Users/me/repo']), false);
});

test('host-bridge: HTTP /health, auth guard, validation, and real pytest execution', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-srv-'));
  const testStepsDir = path.join(tmp, 'workspace', 'issues', 'HB-1', 'test', 'steps');
  fs.mkdirSync(testStepsDir, { recursive: true });
  fs.writeFileSync(
    path.join(testStepsDir, 'test_sample.py'),
    'def test_bridge_smoke():\n    assert 1 + 1 == 2\n',
    'utf8'
  );

  const token = ensureBridgeToken(tmp);
  const server = createHostBridgeServer({ rootDir: tmp, token });
  const port = await listenEphemeral(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const hJson = await health.json();
    assert.equal(hJson.ok, true);

    const unauth = await fetch(`${baseUrl}/run-pytest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueKey: 'HB-1' })
    });
    assert.equal(unauth.status, 401);

    const badKey = await fetch(`${baseUrl}/run-pytest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-token': token },
      body: JSON.stringify({ issueKey: '../etc' })
    });
    assert.equal(badKey.status, 400);

    const traversal = await fetch(`${baseUrl}/run-pytest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-token': token },
      body: JSON.stringify({ issueKey: 'HB-1', testFiles: '/etc/passwd' })
    });
    assert.equal(traversal.status, 403);

    const runRes = await fetch(`${baseUrl}/run-pytest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-token': token },
      body: JSON.stringify({ issueKey: 'HB-1', testFiles: '/workspace/workspace/issues/HB-1/test/steps/' })
    });
    assert.equal(runRes.status, 200);
    const runJson = await runRes.json();
    assert.equal(runJson.exitCode, 0);
    assert.equal(runJson.executedVia, 'host-bridge');
    assert.ok(fs.existsSync(path.join(tmp, 'workspace', 'issues', 'HB-1', 'test', 'result', 'test-output.log')));
    assert.ok(fs.existsSync(path.join(tmp, 'workspace', 'issues', 'HB-1', 'test', 'result', 'junit.xml')));
  } finally {
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
