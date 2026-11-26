#!/usr/bin/env node
/**
 * Host Runner Bridge (`scripts/lib/host-bridge.js`)
 *
 * Cầu nối HTTP nhẹ chạy trên máy macOS Host để Docker container `agent-skills-n8n`
 * có thể ủy quyền chạy `pytest` (dùng `.venv` Python 3.12 + Chrome/Playwright)
 * và `squash-push.sh` (dùng `bash`/`curl`/`jq` của macOS).
 *
 * Bảo mật:
 * - Xác thực mọi POST request bằng token ngẫu nhiên 32-byte lưu trong `.n8n-data/host-bridge-token`
 * - Allowlist cố định endpoint (`/health`, `/run-pytest`, `/squash-push`, `/discover-web-locators`), không nhận shell tùy ý
 * - Validate `issueKey` và kiểm tra containment đường dẫn
 */

import crypto from 'node:crypto';
import { execFile, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '..', '..');

const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const DEFAULT_BRIDGE_PORT = parseInt(process.env.HOST_BRIDGE_PORT || '5680', 10);
export const TOKEN_FILE_REL = path.join('.n8n-data', 'host-bridge-token');
export const PID_FILE_REL = path.join('.n8n-data', 'host-bridge.pid');
export const CA_BUNDLE_REL = path.join('.n8n-data', 'corporate-ca.pem');
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_-]{1,63}$/;

/**
 * Đồng bộ Root CA từ macOS Keychain ra `.n8n-data/corporate-ca.pem` để container n8n
 * tin cậy chứng chỉ proxy/SSL doanh nghiệp qua `NODE_EXTRA_CA_CERTS` (không cần tắt verify TLS).
 */
export function syncCorporateCaBundle(rootDir = projectRoot) {
  const caPath = path.join(rootDir, CA_BUNDLE_REL);
  const dir = path.dirname(caPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (process.platform !== 'darwin') return false;
  try {
    const chunks = [];
    for (const keychain of [
      '/Library/Keychains/System.keychain',
      path.join(os.homedir(), 'Library/Keychains/login.keychain-db')
    ]) {
      if (!fs.existsSync(keychain)) continue;
      const r = spawnSync('security', ['find-certificate', '-a', '-p', keychain], { encoding: 'utf8', timeout: 5000 });
      if (r.status === 0 && r.stdout && r.stdout.includes('BEGIN CERTIFICATE')) {
        chunks.push(r.stdout.trim());
      }
    }
    if (chunks.length > 0) {
      fs.writeFileSync(caPath, `${chunks.join('\n')}\n`, { encoding: 'utf8', mode: 0o644 });
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Đảm bảo token xác thực tồn tại tại `<rootDir>/.n8n-data/host-bridge-token`.
 */
export function ensureBridgeToken(rootDir = projectRoot) {
  const tokenFile = path.join(rootDir, TOKEN_FILE_REL);
  const dir = path.dirname(tokenFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(tokenFile)) {
    const existing = fs.readFileSync(tokenFile, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const token = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(tokenFile, `${token}\n`, { encoding: 'utf8', mode: 0o600 });
  return token;
}

/**
 * So sánh token an toàn theo constant-time.
 */
export function verifyToken(provided, expected) {
  if (!provided || !expected || typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(expected.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Quy đổi đường dẫn `/workspace/...` từ bên trong Docker container về đường dẫn thật trên host.
 */
export function translateContainerPath(rawPath, rootDir = projectRoot) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  if (rawPath === '/workspace') return rootDir;
  if (rawPath.startsWith('/workspace/')) {
    return path.join(rootDir, rawPath.slice('/workspace/'.length));
  }
  return rawPath;
}

/**
 * Kiểm tra đường dẫn có nằm trong các thư mục gốc được phép hay không.
 */
export function isPathInsideRoots(targetPath, allowedRoots) {
  const resolved = path.resolve(targetPath);
  return allowedRoots.some((root) => {
    const r = path.resolve(root);
    return resolved === r || resolved.startsWith(r + path.sep);
  });
}

/**
 * Tải cấu hình `config/projects.json` nếu có.
 */
function loadProjectsMap(rootDir) {
  const candidates = [
    path.join(rootDir, 'config', 'projects.json'),
    path.join(rootDir, 'projects.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (_) {}
    }
  }
  return {};
}

/**
 * Định vị binary `pytest` khả dụng trên host (.venv -> PATH -> ~/Library/Python -> python3 -m pytest).
 */
export function resolveHostPytest(cwd, rootDir = projectRoot) {
  const candidates = [
    [path.join(cwd, '.venv', 'bin', 'pytest'), []],
    [path.join(rootDir, '.venv', 'bin', 'pytest'), []],
    ['pytest', []],
    ['python3', ['-m', 'pytest']],
    ['/usr/bin/python3', ['-m', 'pytest']]
  ];
  const userPyDir = path.join(os.homedir(), 'Library', 'Python');
  if (fs.existsSync(userPyDir)) {
    for (const ver of fs.readdirSync(userPyDir)) {
      candidates.push([path.join(userPyDir, ver, 'bin', 'pytest'), []]);
    }
  }
  for (const [bin, prefixArgs] of candidates) {
    if (bin.includes(path.sep) && !fs.existsSync(bin)) continue;
    const probe = spawnSync(bin, [...prefixArgs, '--help'], { cwd, encoding: 'utf8', timeout: 5000 });
    if (probe.status === 0) {
      return {
        bin,
        prefixArgs,
        hasTimeoutPlugin: /--timeout\b/.test(probe.stdout || '')
      };
    }
  }
  return null;
}

/**
 * Phân giải thư mục dự án trên host cho một `issueKey` và `project` tùy chọn.
 */
export function resolveHostProjectDir({ issueKey, project = '', rootDir = projectRoot }) {
  const projects = loadProjectsMap(rootDir);
  const scanDirsRaw = process.env.PROJECT_SCAN_DIRS || '';
  const scanDirs = scanDirsRaw.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const allowedRoots = [
    rootDir,
    ...Object.values(projects).filter((v) => typeof v === 'string'),
    ...scanDirs
  ].map((p) => path.resolve(p));

  let cwd = rootDir;
  if (project) {
    if (projects[project]) {
      cwd = path.resolve(projects[project]);
    } else {
      const foundInScan = scanDirs.map((d) => path.resolve(d, project)).find((c) => fs.existsSync(c));
      if (foundInScan) cwd = foundInScan;
      else if (fs.existsSync(path.resolve(rootDir, project))) cwd = path.resolve(rootDir, project);
    }
  } else {
    const projectKeys = Object.keys(projects);
    const hasLocalTest = [
      path.join(rootDir, 'workspace', 'issues', issueKey, 'test'),
      path.join(rootDir, 'workspace', issueKey, 'test')
    ].some((d) => fs.existsSync(d));

    if (!hasLocalTest && projectKeys.length > 0) {
      for (const [pName, pPath] of Object.entries(projects)) {
        const found = [
          path.join(pPath, 'workspace', 'issues', issueKey, 'test'),
          path.join(pPath, 'workspace', issueKey, 'test')
        ].some((d) => fs.existsSync(d));
        if (found) {
          cwd = path.resolve(pPath);
          project = pName;
          break;
        }
      }
    }
  }

  return { cwd, project, allowedRoots };
}

/**
 * Thực thi pytest trên host cho một ticket.
 */
export async function handleRunPytest(payload = {}, rootDir = projectRoot) {
  const issueKey = String(payload.issueKey || '').toUpperCase().trim();
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return { status: 400, body: { stdout: '', stderr: 'Thiếu hoặc sai định dạng issueKey.', exitCode: 4, error: { message: 'Invalid issueKey' } } };
  }

  const rawProject = String(payload.project || '').trim();
  const reqTestFiles = translateContainerPath(String(payload.testFiles || '').trim(), rootDir);
  const { cwd, project, allowedRoots } = resolveHostProjectDir({ issueKey, project: rawProject, rootDir });

  let ticketDir = path.resolve(cwd, 'workspace', 'issues', issueKey);
  if (!fs.existsSync(ticketDir) && fs.existsSync(path.resolve(cwd, 'workspace', issueKey))) {
    ticketDir = path.resolve(cwd, 'workspace', issueKey);
  }
  const testDir = path.resolve(ticketDir, 'test');
  const stepsDir = path.resolve(testDir, 'steps');
  const resultDir = path.resolve(testDir, 'result');

  let target = '';
  if (reqTestFiles) {
    target = path.isAbsolute(reqTestFiles) ? path.resolve(reqTestFiles) : path.resolve(cwd, reqTestFiles);
    if (!isPathInsideRoots(target, allowedRoots)) {
      return {
        status: 403,
        body: { stdout: '', stderr: `Từ chối truy cập testFiles ngoài phạm vi workspace: ${target}`, exitCode: 4, error: { message: 'Path outside workspace' } }
      };
    }
  } else if (fs.existsSync(stepsDir)) {
    target = stepsDir;
  } else if (fs.existsSync(testDir)) {
    target = testDir;
  } else {
    return {
      status: 200,
      body: { stdout: '', stderr: `Không tìm thấy thư mục test cho ${issueKey}`, exitCode: 4, error: { message: 'Không tìm thấy thư mục test' }, project, issueKey, hostCwd: cwd }
    };
  }

  if (!fs.existsSync(target)) {
    return {
      status: 200,
      body: { stdout: '', stderr: `Không tìm thấy mục tiêu kiểm thử: ${target}`, exitCode: 4, error: { message: 'Test target not found' }, project, issueKey, hostCwd: cwd }
    };
  }

  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }

  const logFile = path.join(resultDir, 'test-output.log');
  const junitFile = path.join(resultDir, 'junit.xml');
  const runner = resolveHostPytest(cwd, rootDir);

  if (!runner) {
    return {
      status: 200,
      body: {
        stdout: '',
        stderr: 'RUNNER_MISSING: Không tìm thấy pytest trên máy host (.venv/bin/pytest hoặc PATH).',
        exitCode: 4,
        error: { message: 'Không tìm thấy pytest trên host' },
        project,
        issueKey,
        hostCwd: cwd
      }
    };
  }

  const args = [
    ...runner.prefixArgs,
    target,
    '-v',
    '--tb=short',
    ...(runner.hasTimeoutPlugin ? ['--timeout=60'] : []),
    '-o', 'python_files=test*.py *test.py test-*.py *-test.py test_*.py *_test.py',
    `--junitxml=${junitFile}`
  ];

  const logStream = fs.createWriteStream(logFile);
  const caCertPath = path.join(rootDir, CA_BUNDLE_REL);
  const pytestEnv = {
    ...process.env,
    HEADLESS: process.env.HEADLESS || 'true',
    ...(fs.existsSync(caCertPath) && !process.env.NODE_EXTRA_CA_CERTS ? { NODE_EXTRA_CA_CERTS: caCertPath } : {})
  };

  return await new Promise((resolve) => {
    const child = spawn(runner.bin, args, { cwd, shell: false, env: pytestEnv });
    let stdoutData = '';
    let stderrData = '';
    let isTimeout = false;

    child.stdout.on('data', (d) => {
      stdoutData += d.toString();
      logStream.write(d);
    });
    child.stderr.on('data', (d) => {
      stderrData += d.toString();
      logStream.write(d);
    });

    const timer = setTimeout(() => {
      isTimeout = true;
      child.kill('SIGKILL');
    }, 600000);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      logStream.end();
      let exitCode = code;
      let message = '';
      if (isTimeout || signal === 'SIGKILL') {
        exitCode = 124;
        message = 'SUITE TIMEOUT: Chạy test quá 10 phút';
      }
      resolve({
        status: 200,
        body: {
          stdout: stdoutData,
          stderr: stderrData,
          exitCode: exitCode !== null ? exitCode : 1,
          message,
          project,
          issueKey,
          hostCwd: cwd,
          logFile,
          junitFile,
          executedVia: 'host-bridge'
        }
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      logStream.end();
      resolve({
        status: 200,
        body: {
          stdout: stdoutData,
          stderr: err.message,
          exitCode: 1,
          error: { message: err.message },
          project,
          issueKey,
          hostCwd: cwd,
          executedVia: 'host-bridge'
        }
      });
    });
  });
}

/**
 * Thực thi `squash-push.sh` trên macOS Host (nơi có sẵn bash, curl, jq).
 */
export async function handleSquashPush(payload = {}, rootDir = projectRoot) {
  const issueKey = String(payload.issueKey || '').toUpperCase().trim();
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return { status: 400, body: { success: false, isError: true, error: 'Thiếu hoặc sai định dạng issueKey.' } };
  }

  const namejira = String(payload.namejira || issueKey).trim();
  const rawProjectRoot = translateContainerPath(String(payload.projectRoot || ''), rootDir);
  const { cwd, allowedRoots } = resolveHostProjectDir({
    issueKey,
    project: String(payload.project || '').trim(),
    rootDir
  });
  const effectiveRoot = rawProjectRoot && fs.existsSync(rawProjectRoot) && isPathInsideRoots(rawProjectRoot, allowedRoots)
    ? path.resolve(rawProjectRoot)
    : cwd;

  const featureCandidates = [
    payload.featureFile ? translateContainerPath(String(payload.featureFile), rootDir) : '',
    path.join(effectiveRoot, 'workspace', 'issues', issueKey, 'test', `${issueKey}.feature`),
    path.join(effectiveRoot, 'workspace', issueKey, 'test', `${issueKey}.feature`)
  ].filter(Boolean);

  const absFeatureFile = featureCandidates.find((p) => fs.existsSync(p));
  if (!absFeatureFile || !isPathInsideRoots(absFeatureFile, allowedRoots)) {
    return {
      status: 200,
      body: {
        success: false,
        isError: true,
        errorOutput: `Không tìm thấy file .feature hợp lệ cho ${issueKey}`
      }
    };
  }

  const scriptPath = path.join(rootDir, 'plugins/qa/skills/qa-squash-push/assets/squash-push.sh');
  if (!fs.existsSync(scriptPath)) {
    return {
      status: 200,
      body: { success: false, isError: true, errorOutput: `Không tìm thấy ${scriptPath}` }
    };
  }

  return await new Promise((resolve) => {
    execFile('bash', [scriptPath, issueKey, namejira || issueKey, absFeatureFile], {
      cwd: effectiveRoot,
      timeout: 180000,
      encoding: 'utf8',
      env: { ...process.env }
    }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          status: 200,
          body: {
            success: false,
            isError: true,
            issueKey,
            featureFile: absFeatureFile,
            errorOutput: `${stdout || ''}\n${stderr || err.message || ''}`.trim()
          }
        });
        return;
      }

      let syncMeta = null;
      const syncPath = [
        path.join(effectiveRoot, 'workspace', 'issues', issueKey, 'test', 'squash_sync.json'),
        path.join(effectiveRoot, 'workspace', issueKey, 'test', 'squash_sync.json')
      ].find((p) => fs.existsSync(p));
      if (syncPath) {
        try { syncMeta = JSON.parse(fs.readFileSync(syncPath, 'utf8')); } catch (_) {}
      }

      resolve({
        status: 200,
        body: {
          success: true,
          isError: false,
          issueKey,
          featureFile: absFeatureFile,
          namejira,
          stdout: stdout || '',
          syncMeta,
          executedVia: 'host-bridge'
        }
      });
    });
  });
}

function parseDotenvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function probeUrlHead(targetUrl, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!targetUrl) {
      resolve({ ok: false, status: 0, reason: 'empty_url' });
      return;
    }
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: (parsed.pathname || '/') + (parsed.search || ''),
        method: 'HEAD',
        timeout: timeoutMs,
        rejectUnauthorized: false
      }, (res) => {
        res.resume();
        resolve({ ok: (res.statusCode || 500) < 400, status: res.statusCode || 0 });
      });
      req.on('error', () => resolve({ ok: false, status: 0, reason: 'connection_error' }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, reason: 'timeout' });
      });
      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, reason: err.message });
    }
  });
}

async function launchHostChromium({ chromium, headless = true, slowMo = 0, env = process.env }) {
  const baseArgs = ['--no-sandbox', '--disable-dev-shm-usage'];
  const customBin = env.CHROME_BIN && fs.existsSync(env.CHROME_BIN) ? env.CHROME_BIN : '';
  if (customBin) {
    return await chromium.launch({ headless, slowMo, executablePath: customBin, args: baseArgs });
  }
  try {
    return await chromium.launch({ headless, slowMo, args: baseArgs });
  } catch (firstErr) {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macChrome)) {
      return await chromium.launch({ headless, slowMo, executablePath: macChrome, args: baseArgs });
    }
    throw firstErr;
  }
}

/**
 * Thực thi Playwright headless trực tiếp trên máy Host (ngoài OS Sandbox của AI Agent
 * và ngoài Docker Alpine) để kiểm tra trang web, đăng nhập tùy chọn, chụp screenshot và trích xuất semantic locators.
 */
export async function handleDiscoverWebLocators(payload = {}, rootDir = projectRoot) {
  const urlOverride = String(payload.urlOverride || payload.url || '').trim();
  const issueKey = String(payload.issueKey || (urlOverride ? 'ADHOC-WEB' : '')).toUpperCase().trim();
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return { status: 400, body: { success: false, error: 'Thiếu hoặc sai định dạng issueKey.' } };
  }
  if (urlOverride && !/^https?:\/\//i.test(urlOverride)) {
    return { status: 400, body: { success: false, error: 'urlOverride phải bắt đầu bằng http:// hoặc https://.' } };
  }

  const rawProject = String(payload.project || '').trim();
  const targetPage = String(payload.targetPage || 'home').toLowerCase().trim().replace(/^\/+/, '');
  const { cwd, project, allowedRoots } = resolveHostProjectDir({ issueKey, project: rawProject, rootDir });

  let ticketDir = path.resolve(cwd, 'workspace', 'issues', issueKey);
  if (!fs.existsSync(ticketDir) && fs.existsSync(path.resolve(cwd, 'workspace', issueKey))) {
    ticketDir = path.resolve(cwd, 'workspace', issueKey);
  }
  if (!isPathInsideRoots(ticketDir, allowedRoots)) {
    return { status: 403, body: { success: false, error: 'Đường dẫn ticket ngoài phạm vi workspace được phép.' } };
  }

  const mergedEnv = {
    ...parseDotenvFile(path.join(rootDir, '.env')),
    ...parseDotenvFile(path.join(cwd, '.env')),
    ...parseDotenvFile(path.join(ticketDir, 'test', '.env')),
    ...process.env
  };

  const issueKeyTemplate = String(payload.issueKeyUrl || mergedEnv.ISSUE_KEY_URL || '').replace(/\/$/, '');
  const webBaseUrl = String(payload.webBaseUrl || mergedEnv.WEB_BASE_URL || '').replace(/\/$/, '');
  const issueKeyUrl = issueKeyTemplate.includes('{issueKey}')
    ? issueKeyTemplate.replace(/\{issueKey\}/gi, issueKey.toLowerCase())
    : issueKeyTemplate;

  let resolvedUrl = '';
  let urlSource = '';
  let probeStatus = null;

  if (urlOverride) {
    resolvedUrl = urlOverride.replace(/\/$/, '');
    urlSource = 'urlOverride';
    probeStatus = { ok: true, status: 'skipped' };
  } else if (issueKeyUrl) {
    probeStatus = await probeUrlHead(issueKeyUrl, 5000);
    if (probeStatus.ok) {
      resolvedUrl = issueKeyUrl;
      urlSource = 'ISSUE_KEY_URL';
    } else {
      resolvedUrl = webBaseUrl;
      urlSource = 'WEB_BASE_URL (fallback)';
    }
  } else {
    resolvedUrl = webBaseUrl;
    urlSource = 'WEB_BASE_URL';
  }

  if (!resolvedUrl) {
    return {
      status: 200,
      body: {
        success: false,
        exitCode: 1,
        issueKey,
        targetPage,
        stderr: 'Chưa cấu hình WEB_BASE_URL / ISSUE_KEY_URL trong .env và không có urlOverride.',
        executedVia: 'host-bridge'
      }
    };
  }

  const tradingUsername = String(payload.tradingUsername || mergedEnv.TRADING_USERNAME || '').trim();
  const tradingPassword = String(payload.tradingPassword || mergedEnv.TRADING_PASSWORD || '').trim();
  const skipLogin = payload.skipLogin !== undefined
    ? Boolean(payload.skipLogin)
    : Boolean(urlOverride && (!tradingUsername || !tradingPassword));

  if (!skipLogin && (!tradingUsername || !tradingPassword)) {
    return {
      status: 200,
      body: {
        success: false,
        exitCode: 1,
        issueKey,
        targetPage,
        resolvedUrl,
        urlSource,
        stderr: 'Thiếu TRADING_USERNAME hoặc TRADING_PASSWORD trong .env (truyền skipLogin: true nếu trang không cần đăng nhập).',
        executedVia: 'host-bridge'
      }
    };
  }

  const headless = payload.headless !== undefined
    ? Boolean(payload.headless)
    : String(mergedEnv.HEADLESS || 'true').toLowerCase() !== 'false';
  const slowMo = Number(payload.slowMo ?? mergedEnv.SLOW_MO_MS ?? 0) || 0;
  const viewportWidth = Number(payload.viewportWidth ?? mergedEnv.VIEWPORT_WIDTH ?? 1920) || 1920;
  const viewportHeight = Number(payload.viewportHeight ?? mergedEnv.VIEWPORT_HEIGHT ?? 1080) || 1080;
  const playwrightTimeout = Number(payload.playwrightTimeout ?? mergedEnv.PLAYWRIGHT_TIMEOUT_MS ?? 30000) || 30000;

  const fixtureDir = path.join(ticketDir, 'test', 'fixtures');
  const screenshotDir = path.join(ticketDir, 'test', 'result', 'screenshots');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const safeTag = targetPage.replace(/[^a-z0-9_-]/gi, '_') || 'home';
  const outputFile = path.join(fixtureDir, 'locators.json');
  const screenshotBefore = path.join(screenshotDir, `${safeTag}-before-login.png`);
  const screenshotAfter = path.join(screenshotDir, `${safeTag}-after-login.png`);

  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (err) {
    return {
      status: 200,
      body: {
        success: false,
        exitCode: 1,
        issueKey,
        targetPage,
        stderr: `Không tìm thấy thư viện Playwright trên Host: ${err.message}`,
        executedVia: 'host-bridge'
      }
    };
  }

  const loginUrl = urlOverride ? resolvedUrl : `${resolvedUrl}/login`;
  const targetUrl = urlOverride
    ? resolvedUrl
    : (targetPage === 'home' || !targetPage ? resolvedUrl : `${resolvedUrl}/${targetPage}`);

  const result = {
    issueKey,
    project,
    targetPage,
    resolvedUrl,
    finalUrl: targetUrl,
    pageTitle: '',
    urlSource,
    issueKeyUrl,
    webBaseUrl,
    probeStatus,
    skipLogin,
    loginSuccess: false,
    headings: [],
    visibleTextSample: '',
    consoleErrors: [],
    pageErrors: [],
    locators: {},
    errors: [],
    capturedAt: new Date().toISOString()
  };

  let browser;
  try {
    browser = await launchHostChromium({ chromium, headless, slowMo, env: mergedEnv });
    const ctx = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      ignoreHTTPSErrors: true,
      locale: 'vi-VN'
    });
    const page = await ctx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') result.consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on('pageerror', (err) => {
      result.pageErrors.push((err && err.message ? err.message : String(err)).slice(0, 300));
    });

    if (!skipLogin) {
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: playwrightTimeout });
      await page.screenshot({ path: screenshotBefore }).catch(() => {});

      const loginCandidates = [
        { key: 'username_input', tries: ['getByLabel:Tên đăng nhập', 'getByLabel:Username', 'getByPlaceholder:Tên đăng nhập', 'getByPlaceholder:Tài khoản', 'locator:input[name="username"]', 'locator:input[type="text"]'] },
        { key: 'password_input', tries: ['getByLabel:Mật khẩu', 'getByLabel:Password', 'getByPlaceholder:Mật khẩu', 'locator:input[type="password"]'] },
        { key: 'login_button', tries: ['getByRole:button|Đăng nhập', 'getByRole:button|Login', 'locator:button[type="submit"]'] }
      ];
      const loginLoc = {};
      for (const cand of loginCandidates) {
        for (const t of cand.tries) {
          const [method, ...rest] = t.split(':');
          const arg = rest.join(':');
          try {
            let loc;
            if (method === 'getByRole') { const [r, n] = arg.split('|'); loc = page.getByRole(r, { name: n }); }
            else if (method === 'getByLabel') loc = page.getByLabel(arg);
            else if (method === 'getByPlaceholder') loc = page.getByPlaceholder(arg);
            else loc = page.locator(arg);
            if ((await loc.count()) > 0) {
              const el = loc.first();
              const attrs = await el.evaluate((n) => ({
                tag: n.tagName.toLowerCase(),
                role: n.getAttribute('role'),
                ariaLabel: n.getAttribute('aria-label'),
                placeholder: n.getAttribute('placeholder'),
                name: n.getAttribute('name'),
                type: n.getAttribute('type')
              })).catch(() => ({}));
              const playwright_code = method === 'getByRole'
                ? (() => { const [r, n] = arg.split('|'); return `page.get_by_role("${r}", name="${n}")`; })()
                : method === 'getByLabel' ? `page.get_by_label("${arg}")`
                : method === 'getByPlaceholder' ? `page.get_by_placeholder("${arg}")`
                : `page.locator(${JSON.stringify(arg)})`;
              loginLoc[cand.key] = {
                method,
                arg,
                playwright_code,
                ...attrs,
                isVisible: await el.isVisible().catch(() => false),
                isEnabled: await el.isEnabled().catch(() => false)
              };
              break;
            }
          } catch (_) {}
        }
      }
      result.locators.login = loginLoc;

      if (loginLoc.username_input && loginLoc.password_input && loginLoc.login_button) {
        const resolveEl = (info) => {
          if (info.method === 'getByRole') { const [r, n] = info.arg.split('|'); return page.getByRole(r, { name: n }).first(); }
          if (info.method === 'getByLabel') return page.getByLabel(info.arg).first();
          if (info.method === 'getByPlaceholder') return page.getByPlaceholder(info.arg).first();
          return page.locator(info.arg).first();
        };
        await resolveEl(loginLoc.username_input).fill(tradingUsername);
        await resolveEl(loginLoc.password_input).fill(tradingPassword);
        await resolveEl(loginLoc.login_button).click();
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        result.loginSuccess = true;
      } else {
        result.errors.push('Không tìm đủ locator login form (username/password/button)');
      }

      if (result.loginSuccess && targetUrl !== loginUrl) {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: playwrightTimeout });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }
      await page.screenshot({ path: screenshotAfter }).catch(() => {});
    } else {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: playwrightTimeout });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: screenshotAfter }).catch(() => {});
    }

    result.finalUrl = page.url();
    result.pageTitle = await page.title().catch(() => '');

    const snapshot = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
        .map((h) => (h.innerText || '').trim())
        .filter(Boolean)
        .slice(0, 20);
      const visibleTextSample = (document.body && document.body.innerText ? document.body.innerText : '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);
      const elems = [];
      ['button', 'a[href]', 'input', 'select', 'textarea', '[role="tab"]', '[role="dialog"]', '[role="alert"]', '[role="heading"]', '[data-testid]'].forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
          if (!isVisible) return;
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute('role') || (tag === 'a' ? 'link' : tag);
          const ariaLabel = (el.getAttribute('aria-label') || '').trim();
          const placeholder = (el.getAttribute('placeholder') || '').trim();
          const name = (el.getAttribute('name') || '').trim();
          const testId = (el.getAttribute('data-testid') || '').trim();
          const innerText = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          if (!ariaLabel && !placeholder && !name && !testId && !innerText) return;
          let playwright_code = '';
          if (testId) playwright_code = `page.get_by_test_id(${JSON.stringify(testId)})`;
          else if (['button', 'link', 'tab', 'heading', 'dialog', 'alert'].includes(role) && innerText) {
            playwright_code = `page.get_by_role(${JSON.stringify(role)}, name=${JSON.stringify(innerText.slice(0, 40))})`;
          } else if (ariaLabel) playwright_code = `page.get_by_label(${JSON.stringify(ariaLabel)})`;
          else if (placeholder) playwright_code = `page.get_by_placeholder(${JSON.stringify(placeholder)})`;
          else if (name) playwright_code = `page.locator(${JSON.stringify(`[name="${name}"]`)})`;
          if (playwright_code) {
            elems.push({ tag, role, ariaLabel, placeholder, name, testId, innerText, playwright_code, isVisible: true });
          }
        });
      });
      return { headings, visibleTextSample, elems: elems.slice(0, 80) };
    });

    result.headings = snapshot.headings;
    result.visibleTextSample = snapshot.visibleTextSample;
    result.locators[targetPage] = snapshot.elems;
  } catch (err) {
    result.errors.push(err.message || String(err));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
  const pageLocators = result.locators[targetPage] || [];
  const ok = result.errors.length === 0 && (skipLogin || result.loginSuccess);

  return {
    status: 200,
    body: {
      issueKey,
      project,
      targetPage,
      issueKeyUrl,
      webBaseUrl,
      resolvedUrl,
      finalUrl: result.finalUrl,
      pageTitle: result.pageTitle,
      urlSource,
      probeStatus,
      skipLogin,
      loginSuccess: result.loginSuccess,
      locatorCount: pageLocators.length,
      headings: result.headings,
      visibleTextSample: result.visibleTextSample,
      consoleErrors: result.consoleErrors,
      pageErrors: result.pageErrors,
      outputFile,
      screenshotBefore: skipLogin ? '' : screenshotBefore,
      screenshotAfter,
      locatorsData: result,
      login_locators: result.locators.login || {},
      page_locators: pageLocators.slice(0, 50),
      errors: result.errors,
      capturedAt: result.capturedAt,
      exitCode: ok ? 0 : 1,
      stderr: result.errors.join('; '),
      success: ok,
      executedVia: 'host-bridge'
    }
  };
}

function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/**
 * Tạo HTTP Server cho Host Bridge (có thể test độc lập với port 0).
 */
export function createHostBridgeServer({ rootDir = projectRoot, token = ensureBridgeToken(rootDir) } = {}) {
  return http.createServer(async (req, res) => {
    const send = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      if (req.method === 'GET' && req.url === '/health') {
        const pytestInfo = resolveHostPytest(rootDir, rootDir);
        const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        send(200, {
          ok: true,
          pid: process.pid,
          rootDir,
          pytest: pytestInfo ? pytestInfo.bin : null,
          hasTimeoutPlugin: Boolean(pytestInfo?.hasTimeoutPlugin),
          chromeBin: process.env.CHROME_BIN || (fs.existsSync(macChrome) ? macChrome : null),
          endpoints: ['/health', '/run-pytest', '/squash-push', '/discover-web-locators']
        });
        return;
      }

      if (req.method !== 'POST') {
        send(405, { error: 'Method Not Allowed' });
        return;
      }

      const provided = req.headers['x-bridge-token'];
      if (!verifyToken(provided, token)) {
        send(401, { error: 'Unauthorized: invalid x-bridge-token' });
        return;
      }

      const body = await readJsonBody(req);
      if (req.url === '/run-pytest') {
        const result = await handleRunPytest(body, rootDir);
        send(result.status, result.body);
        return;
      }
      if (req.url === '/squash-push') {
        const result = await handleSquashPush(body, rootDir);
        send(result.status, result.body);
        return;
      }
      if (req.url === '/discover-web-locators') {
        const result = await handleDiscoverWebLocators(body, rootDir);
        send(result.status, result.body);
        return;
      }

      send(404, { error: 'Not Found' });
    } catch (err) {
      send(500, { error: err.message });
    }
  });
}

export async function isBridgeHealthy(port = DEFAULT_BRIDGE_PORT) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: ctrl.signal });
      if (!r.ok) return null;
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function ensureBridgeBackground({ rootDir = projectRoot, port = DEFAULT_BRIDGE_PORT } = {}) {
  ensureBridgeToken(rootDir);
  syncCorporateCaBundle(rootDir);
  const alive = await isBridgeHealthy(port);
  if (alive && alive.ok) return { running: true, started: false, health: alive };

  const logDir = path.join(rootDir, '.n8n-data');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFd = fs.openSync(path.join(logDir, 'host-bridge.log'), 'a');
  const child = spawn(process.execPath, [__filename], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, HOST_BRIDGE_PORT: String(port) }
  });
  child.unref();
  fs.closeSync(logFd);

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const check = await isBridgeHealthy(port);
    if (check && check.ok) {
      return { running: true, started: true, health: check };
    }
  }
  return { running: false, started: false };
}

export function stopBridgeBackground(rootDir = projectRoot) {
  const pidFile = path.join(rootDir, PID_FILE_REL);
  if (!fs.existsSync(pidFile)) return { stopped: false, reason: 'no_pid_file' };
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (!Number.isFinite(pid)) return { stopped: false, reason: 'invalid_pid' };
  try {
    process.kill(pid, 'SIGTERM');
    fs.rmSync(pidFile, { force: true });
    return { stopped: true, pid };
  } catch (err) {
    fs.rmSync(pidFile, { force: true });
    return { stopped: false, reason: err.message };
  }
}

// ── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const port = DEFAULT_BRIDGE_PORT;
  const host = process.env.HOST_BRIDGE_HOST || '0.0.0.0';

  if (args.includes('--status')) {
    const h = await isBridgeHealthy(port);
    console.log(JSON.stringify({ running: Boolean(h?.ok), port, health: h }, null, 2));
    process.exit(h?.ok ? 0 : 1);
  } else if (args.includes('--stop')) {
    const res = stopBridgeBackground(projectRoot);
    console.log(JSON.stringify(res));
    process.exit(0);
  } else if (args.includes('--ensure-bg')) {
    const res = await ensureBridgeBackground({ rootDir: projectRoot, port });
    if (res.running) {
      console.log(`✅ Host Bridge sẵn sàng tại http://127.0.0.1:${port} (pytest: ${res.health?.pytest || 'N/A'})`);
      process.exit(0);
    }
    console.error(`❌ Không thể khởi động Host Bridge trên port ${port}`);
    process.exit(1);
  } else {
    const token = ensureBridgeToken(projectRoot);
    const pidFile = path.join(projectRoot, PID_FILE_REL);
    const server = createHostBridgeServer({ rootDir: projectRoot, token });
    server.listen(port, host, () => {
      fs.writeFileSync(pidFile, `${process.pid}\n`, 'utf8');
      console.log(`🌉 Host Runner Bridge listening on http://${host}:${port} (root: ${projectRoot})`);
    });
    const cleanup = () => {
      try { fs.rmSync(pidFile, { force: true }); } catch (_) {}
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}
