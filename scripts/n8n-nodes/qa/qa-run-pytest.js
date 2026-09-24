const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

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
  } else {
    // Kiểm tra trong PROJECT_SCAN_DIRS hoặc thư mục cha
    const scanDirsRaw = (typeof $env !== 'undefined' && $env.PROJECT_SCAN_DIRS) || process.env.PROJECT_SCAN_DIRS || '';
    const scanDirs = scanDirsRaw.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    let foundDir = '';
    for (const sDir of scanDirs) {
      const candidate = path.resolve(sDir, project);
      if (fs.existsSync(candidate)) {
        foundDir = candidate;
        break;
      }
    }
    if (foundDir) {
      cwd = foundDir;
    } else if (fs.existsSync(path.resolve(cwd, project))) {
      cwd = path.resolve(cwd, project);
    }
  }
} else {
  // Nếu không truyền project: ưu tiên đường dẫn duy nhất trong projects.json nếu có
  const projectKeys = Object.keys(projects);
  if (projectKeys.length === 1) {
    cwd = projects[projectKeys[0]];
    project = projectKeys[0];
  } else {
    // Nếu có nhiều, tự động tìm xem workspace issueKey nằm ở project nào
    const currentTestDir = path.resolve(cwd, 'workspace', issueKey, 'test');
    if (!fs.existsSync(currentTestDir)) {
      for (const [pName, pPath] of Object.entries(projects)) {
        if (fs.existsSync(path.resolve(pPath, 'workspace', issueKey))) {
          cwd = pPath;
          project = pName;
          break;
        }
      }
    }
  }
}

// Hàm kiểm tra file test: Tên file luôn bắt đầu hoặc kết thúc bằng "test" (VD: test_*.py, test-*.py, *_test.py, *-test.py)
function isTestFile(filename) {
  if (!filename.toLowerCase().endsWith('.py')) return false;
  const baseName = filename.slice(0, -3).toLowerCase();
  return baseName.startsWith('test') || baseName.endsWith('test');
}

// 2. Định vị file test: Ưu tiên workspace/[issueKey]/test/steps/ rồi đến workspace/[issueKey]/test/
const ticketDir = path.resolve(cwd, 'workspace', issueKey);
const stepsDir = path.resolve(ticketDir, 'test', 'steps');
const testDir = path.resolve(ticketDir, 'test');

let matchedFiles = [];
let targetDir = '';

if (fs.existsSync(stepsDir)) {
  try {
    const files = fs.readdirSync(stepsDir);
    matchedFiles = files.filter(isTestFile).map(f => path.join('workspace', issueKey, 'test', 'steps', f));
    if (matchedFiles.length > 0) {
      targetDir = 'workspace/' + issueKey + '/test/steps';
    }
  } catch (e) {}
}

if (matchedFiles.length === 0 && fs.existsSync(testDir)) {
  try {
    const files = fs.readdirSync(testDir);
    matchedFiles = files.filter(isTestFile).map(f => path.join('workspace', issueKey, 'test', f));
    if (matchedFiles.length > 0) {
      targetDir = 'workspace/' + issueKey + '/test';
    }
  } catch (e) {}
}

// Nếu không tìm thấy file test
if (matchedFiles.length === 0) {
  let detailMsg = '';
  if (!fs.existsSync(ticketDir)) {
    detailMsg = 'Thư mục ticket workspace/' + issueKey + ' chưa tồn tại trong dự án ' + cwd;
  } else if (!fs.existsSync(testDir)) {
    const existingDirs = fs.readdirSync(ticketDir).filter(f => {
      try { return fs.statSync(path.join(ticketDir, f)).isDirectory(); } catch(e) { return false; }
    });
    detailMsg = 'Ticket ' + issueKey + ' hiện tại chưa có thư mục kiểm thử `test/` (mới chỉ có các thư mục: ' + (existingDirs.length > 0 ? existingDirs.join(', ') : 'trống') + '). Cần chạy `qa-auto-design` để sinh kịch bản test trước.';
  } else {
    detailMsg = 'Thư mục `workspace/' + issueKey + '/test` đã tồn tại nhưng không tìm thấy file testscript nào (file cần bắt đầu hoặc kết thúc bằng \"test\", ví dụ: test_*.py, test-*.py, *_test.py).';
  }

  return [{
    json: {
      stdout: '',
      stderr: detailMsg,
      exitCode: 4,
      error: { message: detailMsg },
      project: project,
      issueKey: issueKey
    }
  }];
}

// 3. Thực thi Pytest với danh sách file tìm được
const quotedFiles = matchedFiles.map(f => '"' + f.replace(/"/g, '\\"') + '"').join(' ');
const command = 'pytest ' + quotedFiles + ' -v --tb=short -o python_files="test*.py *test.py test-*.py *-test.py test_*.py *_test.py"';

try {
  const result = await execAsync(command, { encoding: 'utf-8', cwd: cwd, timeout: 120000 });
  return [{
    json: {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
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
      exitCode: err.code !== undefined ? err.code : (err.status || 1),
      error: { message: err.message },
      project: project,
      issueKey: issueKey
    }
  }];
}
