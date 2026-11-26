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

test('host-bridge: /discover-web-locators mở trang web bằng Playwright headless tự động không cần quyền GUI', async () => {
  const http = await import('node:http');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-web-'));
  const token = ensureBridgeToken(tmp);
  const bridgeServer = createHostBridgeServer({ rootDir: tmp, token });
  const bridgePort = await listenEphemeral(bridgeServer);

  const webApp = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
      <html>
        <head><title>Cổng Đặt Lệnh UAT</title></head>
        <body>
          <h1>Đặt lệnh cổ phiếu</h1>
          <label for="sym">Mã chứng khoán</label>
          <input id="sym" name="symbol" placeholder="Nhập mã CK" />
          <button type="button">Xác nhận mua</button>
        </body>
      </html>`);
  });
  const webPort = await listenEphemeral(webApp);

  try {
    const res = await fetch(`http://127.0.0.1:${bridgePort}/discover-web-locators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-token': token
      },
      body: JSON.stringify({
        issueKey: 'WEB-101',
        targetPage: 'order',
        urlOverride: `http://127.0.0.1:${webPort}`,
        skipLogin: true,
        headless: true
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true, data.stderr);
    assert.equal(data.executedVia, 'host-bridge');
    assert.equal(data.pageTitle, 'Cổng Đặt Lệnh UAT');
    assert.ok(data.headings.includes('Đặt lệnh cổ phiếu'));
    assert.ok(data.locatorCount >= 2);
    assert.ok(data.page_locators.some((l) => l.playwright_code.includes('Xác nhận mua')));
    assert.ok(fs.existsSync(data.outputFile));
    assert.ok(fs.existsSync(data.screenshotAfter));
  } finally {
    await new Promise((r) => webApp.close(r));
    await new Promise((r) => bridgeServer.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
