import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  cleanAllIssuesWorkspace,
  cleanIssueWorkspace,
  extractReferencedImageNames
} from '../workspace/clean-issue-workspace.js';

test('extractReferencedImageNames: trích xuất chính xác tên các file ảnh từ markdown và HTML', () => {
  const mdContent = `
# Spec Test
Đây là ảnh mockup:
![Mockup Case 1](workspace/issues/G3PTP-100/spec/diagrams/mockup-case-1.png)
Ảnh phụ:
![Mockup Case 2](diagrams/mockup-case-2.PNG "Title")
Tag HTML:
<img src="assets/diagrams/user-flow.svg" width="800" />
Text thường không phải ảnh:
[Link](https://example.com/file.pdf)
  `;

  const extracted = extractReferencedImageNames(mdContent);
  assert.equal(extracted.has('mockup-case-1.png'), true);
  assert.equal(extracted.has('mockup-case-2.PNG'), true);
  assert.equal(extracted.has('user-flow.svg'), true);
  assert.equal(extracted.has('file.pdf'), false);
  assert.equal(extracted.size, 3);
});

test('cleanIssueWorkspace: bỏ qua an toàn khi chưa có refined.md hoặc final.md', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-workspace-test-'));
  const issueDir = path.join(tmpRoot, 'workspace', 'issues', 'TEST-01');
  const specDir = path.join(issueDir, 'spec');
  fs.mkdirSync(specDir, { recursive: true });

  // Chỉ có refined-draft.md, chưa có refined.md
  fs.writeFileSync(path.join(specDir, 'refined-draft.md'), '# Draft\n', 'utf8');

  try {
    const res = cleanIssueWorkspace('TEST-01', { rootDir: tmpRoot });
    assert.equal(res.success, false);
    assert.match(res.reason, /Chưa có spec chốt/);
    // File nháp vẫn còn nguyên
    assert.equal(fs.existsSync(path.join(specDir, 'refined-draft.md')), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('cleanIssueWorkspace: giữ lại bộ thành quả cuối cùng và xóa sạch file nháp/rác', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-workspace-test-'));
  const issueDir = path.join(tmpRoot, 'workspace', 'issues', 'TEST-02');
  const specDir = path.join(issueDir, 'spec');
  const diagDir = path.join(specDir, 'diagrams');
  const scratchDir = path.join(specDir, '.scratch');
  const sourceDir = path.join(issueDir, 'source');

  fs.mkdirSync(diagDir, { recursive: true });
  fs.mkdirSync(scratchDir, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });

  // 1. Files thành quả cuối cùng (CẦN GIỮ)
  const specContent = `
# Refined Spec
![Mockup 1](diagrams/mockup-case-1.png)
  `;
  fs.writeFileSync(path.join(specDir, 'refined.md'), specContent, 'utf8');
  fs.writeFileSync(path.join(specDir, 'final.md'), specContent, 'utf8');
  fs.writeFileSync(path.join(specDir, 'testability-manifest.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'mockup.html'), '<html>Mockup</html>', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'render-mockup.mjs'), 'console.log("render")', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'mockup-case-1.png'), 'fake-png-1', 'utf8');

  // 2. Files nháp & rác (CẦN XÓA)
  fs.writeFileSync(path.join(specDir, 'refined-draft.md'), '# Old Draft', 'utf8');
  fs.writeFileSync(path.join(specDir, 'adf.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(specDir, 'parse_svg.py'), 'print()', 'utf8');
  fs.writeFileSync(path.join(specDir, 'user-flow.mmd'), 'graph TD', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'mockup-unreferenced-temp.png'), 'fake-temp-png', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'scratch-debug-runner.mjs'), 'console.log("scratch")', 'utf8');
  fs.writeFileSync(path.join(diagDir, 'asis-snapshot.html'), '<html>ASIS</html>', 'utf8');
  fs.writeFileSync(path.join(scratchDir, 'debug-temp.js'), 'console.log(1)', 'utf8');
  fs.writeFileSync(path.join(issueDir, 'temp-notes.txt'), 'notes', 'utf8');

  // 3. Backup Jira: tạo 2 file, file 2 mới hơn
  const b1 = path.join(sourceDir, 'jira-description-backup-1000.json');
  const b2 = path.join(sourceDir, 'jira-description-backup-2000.json');
  fs.writeFileSync(b1, '{"old": 1}', 'utf8');
  fs.writeFileSync(b2, '{"new": 2}', 'utf8');
  // Chỉnh mtime cho b2 mới hơn b1
  fs.utimesSync(b1, 1000, 1000);
  fs.utimesSync(b2, 2000, 2000);

  try {
    // Test Dry-run
    const dryRes = cleanIssueWorkspace('TEST-02', { rootDir: tmpRoot, dryRun: true });
    assert.equal(dryRes.success, true);
    assert.ok(dryRes.removedFiles.length > 0);
    // Trong dry-run, file nháp vẫn còn
    assert.equal(fs.existsSync(path.join(specDir, 'refined-draft.md')), true);

    // Test Thực thi thật
    const realRes = cleanIssueWorkspace('TEST-02', { rootDir: tmpRoot, dryRun: false });
    assert.equal(realRes.success, true);

    // Xác minh file BẮT BUỘC GIỮ
    assert.equal(fs.existsSync(path.join(specDir, 'refined.md')), true);
    assert.equal(fs.existsSync(path.join(specDir, 'final.md')), true);
    assert.equal(fs.existsSync(path.join(specDir, 'testability-manifest.json')), true);
    assert.equal(fs.existsSync(path.join(diagDir, 'mockup.html')), true);
    assert.equal(fs.existsSync(path.join(diagDir, 'render-mockup.mjs')), true);
    assert.equal(fs.existsSync(path.join(diagDir, 'mockup-case-1.png')), true);
    assert.equal(fs.existsSync(b2), true); // Bản backup mới nhất được giữ

    // Xác minh file ĐÃ XÓA
    assert.equal(fs.existsSync(path.join(specDir, 'refined-draft.md')), false);
    assert.equal(fs.existsSync(path.join(specDir, 'adf.json')), false);
    assert.equal(fs.existsSync(path.join(specDir, 'parse_svg.py')), false);
    assert.equal(fs.existsSync(path.join(specDir, 'user-flow.mmd')), false);
    assert.equal(fs.existsSync(path.join(diagDir, 'mockup-unreferenced-temp.png')), false);
    assert.equal(fs.existsSync(path.join(diagDir, 'scratch-debug-runner.mjs')), false);
    assert.equal(fs.existsSync(path.join(diagDir, 'asis-snapshot.html')), false);
    assert.equal(fs.existsSync(scratchDir), false);
    assert.equal(fs.existsSync(path.join(issueDir, 'temp-notes.txt')), false);
    assert.equal(fs.existsSync(b1), false); // Bản backup cũ bị xóa
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('cleanAllIssuesWorkspace: duyệt và dọn dẹp toàn bộ danh sách issues', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-workspace-all-test-'));
  const issue1 = path.join(tmpRoot, 'workspace', 'issues', 'ISSUE-1', 'spec');
  const issue2 = path.join(tmpRoot, 'workspace', 'issues', 'ISSUE-2', 'spec');
  fs.mkdirSync(issue1, { recursive: true });
  fs.mkdirSync(issue2, { recursive: true });

  fs.writeFileSync(path.join(issue1, 'refined.md'), '# Spec 1\n', 'utf8');
  fs.writeFileSync(path.join(issue1, 'refined-draft.md'), '# Draft 1\n', 'utf8');

  fs.writeFileSync(path.join(issue2, 'final.md'), '# Spec 2\n', 'utf8');
  fs.writeFileSync(path.join(issue2, 'adf.json'), '{}', 'utf8');

  try {
    const results = cleanAllIssuesWorkspace({ rootDir: tmpRoot });
    assert.equal(results.length, 2);
    assert.equal(fs.existsSync(path.join(issue1, 'refined-draft.md')), false);
    assert.equal(fs.existsSync(path.join(issue2, 'adf.json')), false);
    assert.equal(fs.existsSync(path.join(issue1, 'refined.md')), true);
    assert.equal(fs.existsSync(path.join(issue2, 'final.md')), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

