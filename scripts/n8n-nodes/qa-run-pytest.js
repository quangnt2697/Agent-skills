const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const input = $input.first();
const issueKey = (input.json.issueKey || '').toUpperCase();
const project = input.json.project || '';

if (input.json.error || !issueKey) {
  return [{
    json: {
      stdout: '',
      stderr: input.json.error || 'Thiếu tham số issueKey.',
      exitCode: 1,
      error: { message: input.json.error || 'Thiếu tham số issueKey.' }
    }
  }];
}

let cwd = $env.AGENT_WORKSPACE_DIR || process.cwd();

// Nếu có chỉ định project, tìm thư mục project từ projects.json nếu tồn tại
if (project) {
  try {
    const projectsFile = path.resolve(cwd, 'projects.json');
    if (fs.existsSync(projectsFile)) {
      const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
      if (projects[project]) {
        cwd = projects[project];
      }
    }
  } catch (e) {}
}

const testDir = path.resolve(cwd, 'workspace', issueKey, 'test');

if (!fs.existsSync(testDir)) {
  return [{
    json: {
      stdout: '',
      stderr: 'Không tìm thấy thư mục kiểm thử: workspace/' + issueKey + '/test trên hệ thống.',
      exitCode: 4,
      error: { message: 'Thư mục kiểm thử không tồn tại: workspace/' + issueKey + '/test' }
    }
  }];
}

let testTarget = '';
try {
  const files = fs.readdirSync(testDir);
  const pyTestFiles = files.filter(f => f.startsWith('test_') && f.endsWith('.py'));
  const anyPyFiles = files.filter(f => f.endsWith('.py'));

  if (pyTestFiles.length > 0) {
    testTarget = path.join(testDir, 'test_*.py');
  } else if (anyPyFiles.length > 0) {
    testTarget = path.join(testDir, anyPyFiles[0]);
  } else {
    return [{
      json: {
        stdout: '',
        stderr: 'Không tìm thấy file Python test (*.py) nào trong workspace/' + issueKey + '/test.',
        exitCode: 4,
        error: { message: 'Không có file test nào trong thư mục.' }
      }
    }];
  }
} catch (e) {
  return [{
    json: {
      stdout: '',
      stderr: 'Lỗi truy xuất thư mục kiểm thử: ' + e.message,
      exitCode: 1,
      error: { message: e.message }
    }
  }];
}

const command = 'pytest ' + testTarget + ' -v --tb=short';

try {
  const result = execSync(command, { encoding: 'utf-8', cwd: cwd, timeout: 60000 });
  return [{ json: { stdout: result, stderr: '', exitCode: 0 } }];
} catch (err) {
  return [{
    json: {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      exitCode: err.status || 1,
      error: { message: err.message }
    }
  }];
}
