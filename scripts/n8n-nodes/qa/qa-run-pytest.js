const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const input = $input.first();
const issueKey = (input.json.issueKey || '').toUpperCase();
let project = (input.json.project || '').trim();
const reqTestFiles = (input.json.testFiles || '').trim();

let procEnv = {};
let procCwd = '';
try {
  const proc = require('process');
  if (proc) {
    procEnv = proc.env || {};
    if (typeof proc.cwd === 'function') procCwd = proc.cwd();
  }
} catch (_) {}

if (input.json.error || !issueKey) {
  return [{ json: { stdout: '', stderr: input.json.error || 'Thiếu tham số issueKey.', exitCode: 1, error: { message: input.json.error || 'Thiếu tham số issueKey.' }, project, issueKey, cwd: procCwd } }];
}

let cwd = ($env && $env.AGENT_WORKSPACE_DIR) || procCwd || '';

let projects = {};
try {
  const projectsFile = [
    path.resolve(cwd, 'config', 'projects.json'),
    path.resolve(cwd, 'projects.json')
  ].find(p => fs.existsSync(p));
  if (projectsFile) {
    projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  }
} catch (e) {}

if (project) {
  if (projects[project]) {
    cwd = projects[project];
  } else {
    const scanDirsRaw = (typeof $env !== 'undefined' && $env.PROJECT_SCAN_DIRS) || procEnv.PROJECT_SCAN_DIRS || '';
    const scanDirs = scanDirsRaw.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    let foundDir = '';
    for (const sDir of scanDirs) {
      const candidate = path.resolve(sDir, project);
      if (fs.existsSync(candidate)) { foundDir = candidate; break; }
    }
    if (foundDir) cwd = foundDir;
    else if (fs.existsSync(path.resolve(cwd, project))) cwd = path.resolve(cwd, project);
  }
} else {
  const projectKeys = Object.keys(projects);
  if (projectKeys.length === 1) {
    cwd = projects[projectKeys[0]];
    project = projectKeys[0];
  } else {
    const candidateDirs = [
      path.resolve(cwd, 'workspace', 'issues', issueKey, 'test'),
      path.resolve(cwd, 'workspace', issueKey, 'test')
    ];
    let currentTestDir = candidateDirs.find(d => fs.existsSync(d));
    if (!currentTestDir) {
      for (const [pName, pPath] of Object.entries(projects)) {
        const pCandidates = [
          path.resolve(pPath, 'workspace', 'issues', issueKey, 'test'),
          path.resolve(pPath, 'workspace', issueKey, 'test')
        ];
        const found = pCandidates.find(d => fs.existsSync(d));
        if (found) {
          cwd = pPath;
          project = pName;
          currentTestDir = found;
          break;
        }
      }
    }
  }
}

function readBridgeToken() {
  const candidates = [
    '/home/node/.n8n/host-bridge-token',
    path.join(cwd, '.n8n-data', 'host-bridge-token'),
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

function callHostBridge(endpoint, bodyObj, timeoutMs = 610000) {
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');
  const { Buffer } = require('buffer');
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
        } catch (e) {
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

// Định vị binary pytest khả dụng (.venv của dự án -> PATH -> python3 -m pytest)
function resolvePytestRunner() {
  const candidates = [
    [path.join(cwd, '.venv', 'bin', 'pytest'), []],
    ['/workspace/.venv/bin/pytest', []],
    ['pytest', []],
    ['python3', ['-m', 'pytest']]
  ];
  for (const [bin, prefixArgs] of candidates) {
    if (bin.includes('/') && !fs.existsSync(bin)) continue;
    const probe = spawnSync(bin, [...prefixArgs, '--help'], { cwd, encoding: 'utf8', timeout: 5000 });
    if (probe.status === 0) {
      const hasTimeoutPlugin = /--timeout\b/.test(probe.stdout || '');
      return { bin, prefixArgs, hasTimeoutPlugin };
    }
  }
  return null;
}

const runner = resolvePytestRunner();

// Nếu container không có pytest (Alpine), ủy quyền sang Host Runner Bridge trên macOS
if (!runner) {
  try {
    const bridgeRes = await callHostBridge('/run-pytest', {
      issueKey,
      project,
      testFiles: reqTestFiles
    });
    const b = bridgeRes.data || {};
    if (bridgeRes.status >= 400) {
      return [{ json: { stdout: '', stderr: b.error || b.stderr || `Host Bridge HTTP ${bridgeRes.status}`, exitCode: 4, error: { message: b.error || 'Host Bridge error' }, project, issueKey, cwd } }];
    }
    return [{
      json: {
        stdout: b.stdout || '',
        stderr: b.stderr || '',
        exitCode: typeof b.exitCode === 'number' ? b.exitCode : 1,
        message: b.message || '',
        project: b.project || project,
        issueKey,
        cwd,
        hostCwd: b.hostCwd || cwd,
        logFile: b.logFile || '',
        junitFile: b.junitFile || '',
        executedVia: b.executedVia || 'host-bridge'
      }
    }];
  } catch (bridgeErr) {
    return [{
      json: {
        stdout: '',
        stderr: `RUNNER_MISSING: Không tìm thấy pytest trong container và không kết nối được Host Bridge (${bridgeErr.message}). Chạy "npm run bridge:start" trên máy host.`,
        exitCode: 4,
        error: { message: `Host Bridge unreachable: ${bridgeErr.message}` },
        project,
        issueKey,
        cwd
      }
    }];
  }
}

let ticketDir = path.resolve(cwd, 'workspace', 'issues', issueKey);
if (!fs.existsSync(ticketDir)) {
  ticketDir = path.resolve(cwd, 'workspace', issueKey);
}
const testDir = path.resolve(ticketDir, 'test');
const stepsDir = path.resolve(testDir, 'steps');
const resultDir = path.resolve(testDir, 'result');

if (!fs.existsSync(resultDir)) {
  fs.mkdirSync(resultDir, { recursive: true });
}

let target = '';
if (reqTestFiles) {
  target = path.resolve(cwd, reqTestFiles);
} else if (fs.existsSync(stepsDir)) {
  target = stepsDir;
} else if (fs.existsSync(testDir)) {
  target = testDir;
} else {
  return [{ json: { stdout: '', stderr: 'Không tìm thấy thư mục test', exitCode: 4, error: { message: 'Không tìm thấy thư mục test' }, project, issueKey, cwd } }];
}

const logFile = path.join(resultDir, 'test-output.log');
const junitFile = path.join(resultDir, 'junit.xml');

const logStream = fs.createWriteStream(logFile);

const args = [
  ...runner.prefixArgs,
  target,
  '-v',
  '--tb=short',
  ...(runner.hasTimeoutPlugin ? ['--timeout=60'] : []),
  '-o', 'python_files=test*.py *test.py test-*.py *-test.py test_*.py *_test.py',
  `--junitxml=${junitFile}`
];

return new Promise((resolve) => {
  const child = spawn(runner.bin, args, { cwd: cwd, shell: false });
  let stdoutData = '';
  let stderrData = '';
  
  child.stdout.on('data', (data) => {
    stdoutData += data.toString();
    logStream.write(data);
  });
  
  child.stderr.on('data', (data) => {
    stderrData += data.toString();
    logStream.write(data);
  });
  
  let isTimeout = false;
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
    
    resolve([{
      json: {
        stdout: stdoutData,
        stderr: stderrData,
        exitCode: exitCode !== null ? exitCode : 1,
        message: message,
        project: project,
        issueKey: issueKey,
        cwd: cwd,
        logFile: logFile,
        junitFile: junitFile
      }
    }]);
  });
  
  child.on('error', (err) => {
    clearTimeout(timer);
    logStream.end();
    resolve([{
      json: {
        stdout: stdoutData,
        stderr: err.message,
        exitCode: 1,
        error: { message: err.message },
        project: project,
        issueKey: issueKey,
        cwd: cwd
      }
    }]);
  });
});
