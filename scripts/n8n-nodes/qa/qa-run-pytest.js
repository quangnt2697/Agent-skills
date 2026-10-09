const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const input = $input.first();
const issueKey = (input.json.issueKey || '').toUpperCase();
let project = (input.json.project || '').trim();
const reqTestFiles = (input.json.testFiles || '').trim();

if (input.json.error || !issueKey) {
  return [{ json: { stdout: '', stderr: input.json.error || 'Thiếu tham số issueKey.', exitCode: 1, error: { message: input.json.error || 'Thiếu tham số issueKey.' }, project, issueKey, cwd: process.cwd() } }];
}

let cwd = $env.AGENT_WORKSPACE_DIR || process.cwd();

let projects = {};
try {
  const projectsFile = path.resolve(cwd, 'projects.json');
  if (fs.existsSync(projectsFile)) {
    projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  }
} catch (e) {}

if (project) {
  if (projects[project]) {
    cwd = projects[project];
  } else {
    const scanDirsRaw = (typeof $env !== 'undefined' && $env.PROJECT_SCAN_DIRS) || process.env.PROJECT_SCAN_DIRS || '';
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
    const currentTestDir = path.resolve(cwd, 'workspace', issueKey, 'test');
    if (!fs.existsSync(currentTestDir)) {
      for (const [pName, pPath] of Object.entries(projects)) {
        if (fs.existsSync(path.resolve(pPath, 'workspace', issueKey, 'test'))) { cwd = pPath; project = pName; break; }
      }
    }
  }
}

const ticketDir = path.resolve(cwd, 'workspace', issueKey);
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
  target,
  '-v',
  '--tb=short',
  '--timeout=60',
  '-o', 'python_files=test*.py *test.py test-*.py *-test.py test_*.py *_test.py',
  `--junitxml=${junitFile}`
];

return new Promise((resolve) => {
  const child = spawn('pytest', args, { cwd: cwd, env: process.env, shell: false });
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
