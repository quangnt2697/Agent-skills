// ── NODE 3: DELEGATE WEB PLAYWRIGHT TO HOST RUNNER BRIDGE ───────
// Thực thi Playwright headless trực tiếp trên máy Host qua Host Bridge (ngoài Docker Alpine & ngoài OS Sandbox của Agent)
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { Buffer } = require('buffer');

const inp = $input.first().json || {};
let procEnv = {};
let procCwd = '/workspace';
try {
  const proc = typeof process !== 'undefined' ? process : require('process');
  if (proc) {
    procEnv = proc.env || {};
    if (typeof proc.cwd === 'function') procCwd = proc.cwd();
  }
} catch (_) {}

const wsDir = (($env && $env.AGENT_WORKSPACE_DIR) || procCwd || '/workspace').replace(/\/$/, '');

function readBridgeToken() {
  const candidates = [
    '/home/node/.n8n/host-bridge-token',
    path.join(wsDir, '.n8n-data', 'host-bridge-token'),
    '/workspace/.n8n-data/host-bridge-token'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const t = fs.readFileSync(p, 'utf8').trim();
        if (t) return t;
      } catch (_) {}
    }
  }
  return ($env && $env.HOST_BRIDGE_TOKEN) || procEnv.HOST_BRIDGE_TOKEN || '';
}

function callHostBridge(endpoint, bodyObj, timeoutMs = 130000) {
  const bridgePort = ($env && $env.HOST_BRIDGE_PORT) || procEnv.HOST_BRIDGE_PORT || '5680';
  const bridgeUrl = (($env && $env.HOST_BRIDGE_URL) || procEnv.HOST_BRIDGE_URL || `http://host.docker.internal:${bridgePort}`).replace(/\/$/, '');
  const token = readBridgeToken();

  return new Promise((resolve, reject) => {
    const parsed = new URL(`${bridgeUrl}${endpoint}`);
    const lib = parsed.protocol === 'https:' ? https : http;
    const payloadStr = JSON.stringify(bodyObj);
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        'x-bridge-token': token
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (_) {
          reject(new Error(`Host Bridge invalid JSON (HTTP ${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Host Bridge request timeout')); });
    req.write(payloadStr);
    req.end();
  });
}

try {
  const bridgeRes = await callHostBridge('/discover-web-locators', {
    issueKey: inp.issueKey,
    project: inp.project,
    targetPage: inp.targetPage,
    issueKeyUrl: inp.issueKeyUrl,
    webBaseUrl: inp.webBaseUrl,
    urlOverride: inp.urlOverride,
    skipLogin: inp.skipLogin,
    tradingUsername: inp.tradingUsername,
    tradingPassword: inp.tradingPassword,
    headless: inp.headless,
    slowMo: inp.slowMo,
    viewportWidth: inp.viewportWidth,
    viewportHeight: inp.viewportHeight,
    playwrightTimeout: inp.playwrightTimeout
  });

  const data = bridgeRes.data || {};
  if (bridgeRes.status >= 400) {
    return [{
      json: {
        ...inp,
        success: false,
        exitCode: 1,
        stderr: data.error || `Host Bridge HTTP ${bridgeRes.status}`
      }
    }];
  }
  return [{ json: data }];
} catch (err) {
  return [{
    json: {
      issueKey: inp.issueKey,
      targetPage: inp.targetPage,
      issueKeyUrl: inp.issueKeyUrl,
      webBaseUrl: inp.webBaseUrl,
      urlOverride: inp.urlOverride,
      success: false,
      exitCode: 1,
      stderr: `HOST_BRIDGE_UNAVAILABLE: Không kết nối được Host Runner Bridge (${err.message}). Chạy "npm run bridge:start" hoặc "npm run n8n:up" trên máy host.`
    }
  }];
}
