const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const input = $input.first();
const issueKey = (input.json.issueKey || '').toUpperCase();
let project = (input.json.project || '').trim();

if (input.json.error || !issueKey) {
  return [{
    json: {
      stdout: '',
      stderr: input.json.error || 'Thiếu tham số issueKey.',
      exitCode: 1,
      error: { message: input.json.error || 'Thiếu tham số issueKey.' },
      project: project,
      issueKey: issueKey
    }
  }];
}

let cwd = $env.AGENT_WORKSPACE_DIR || process.cwd();

// Đọc danh sách project mapping từ projects.json
let projects = {};
try {
  const projectsFile = path.resolve(cwd, 'projects.json');
  if (fs.existsSync(projectsFile)) {
    projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  }
} catch (e) {}

// 1. Phân giải thư mục gốc (cwd) theo project hoặc tự động tìm kiếm
if (project) {
  if (projects[project]) {
    cwd = projects[project];
  } else if (fs.existsSync(path.resolve('/Users/qa-quangnt/Desktop/Project', project))) {
    cwd = path.resolve('/Users/qa-quangnt/Desktop/Project', project);
  } else if (fs.existsSync(path.resolve(cwd, project))) {
    cwd = path.resolve(cwd, project);
  }
} else {
  // Nếu không truyền project, kiểm tra xem workspace issueKey nằm ở project nào
  const currentTestDir = path.resolve(cwd, 'workspace', issueKey, 'test');
  if (!fs.existsSync(currentTestDir)) {
    for (const [pName, pPath] of Object.entries(projects)) {
      if (fs.existsSync(path.resolve(pPath, 'workspace', issueKey, 'test'))) {
        cwd = pPath;
        project = pName;
        break;
      }
    }
  }
}

// 2. Định vị file test: Ưu tiên workspace/[issueKey]/test/steps/test*.py
const stepsDir = path.resolve(cwd, 'workspace', issueKey, 'test', 'steps');
const testDir = path.resolve(cwd, 'workspace', issueKey, 'test');

let testTarget = '';
let targetFolder = '';

if (fs.existsSync(stepsDir)) {
  try {
    const files = fs.readdirSync(stepsDir);
    const testFiles = files.filter(f => f.startsWith('test') && f.endsWith('.py'));
    if (testFiles.length > 0) {
      testTarget = 'workspace/' + issueKey + '/test/steps/test*.py';
      targetFolder = 'workspace/' + issueKey + '/test/steps';
    }
  } catch (e) {}
}

if (!testTarget && fs.existsSync(testDir)) {
  try {
    const files = fs.readdirSync(testDir);
    const testFiles = files.filter(f => f.startsWith('test') && f.endsWith('.py'));
    if (testFiles.length > 0) {
      testTarget = 'workspace/' + issueKey + '/test/test*.py';
      targetFolder = 'workspace/' + issueKey + '/test';
    }
  } catch (e) {}
}

// Nếu không tìm thấy file test
if (!testTarget) {
  const checkedPath = 'workspace/' + issueKey + '/test/steps/test*.py';
  return [{
    json: {
      stdout: '',
      stderr: 'Không tìm thấy file kiểm thử tại: ' + checkedPath + ' (Thư mục dự án: ' + cwd + ')',
      exitCode: 4,
      error: { message: 'Không tìm thấy file test cho ticket ' + issueKey + '.' },
      project: project,
      issueKey: issueKey
    }
  }];
}

// 3. Thực thi Pytest
const command = 'pytest ' + testTarget + ' -v --tb=short';

try {
  const result = execSync(command, { encoding: 'utf-8', cwd: cwd, timeout: 120000 });
  return [{
    json: {
      stdout: result,
      stderr: '',
      exitCode: 0,
      project: project,
      issueKey: issueKey
    }
  }];
} catch (err) {
  return [{
    json: {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      exitCode: err.status || 1,
      error: { message: err.message },
      project: project,
      issueKey: issueKey
    }
  }];
}
