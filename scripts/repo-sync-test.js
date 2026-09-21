import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

import {
  parseArgs,
  loadProjectsConfig,
  resolveTargetProjects,
  formatReport
} from './repo-sync.js';

test('repo-sync parseArgs: Bóc tách chính xác cờ -p, --project, project:', () => {
  const t1 = parseArgs('-p openapi-tyk');
  assert.equal(t1.project, 'openapi-tyk');

  const t2 = parseArgs('--project openapi-websocket');
  assert.equal(t2.project, 'openapi-websocket');

  const t3 = parseArgs('project: trading-service');
  assert.equal(t3.project, 'trading-service');

  const t4 = parseArgs(['-p', 'openapi']);
  assert.equal(t4.project, 'openapi');

  const t5 = parseArgs('openapi-tyk');
  assert.equal(t5.project, 'openapi-tyk');
});

test('repo-sync parseArgs: Bóc tách chính xác cờ -b, --branch, branch:', () => {
  const t1 = parseArgs('-p openapi-tyk -b develop');
  assert.equal(t1.project, 'openapi-tyk');
  assert.equal(t1.branch, 'develop');

  const t2 = parseArgs('--project openapi-tyk --branch release/krx');
  assert.equal(t2.branch, 'release/krx');

  const t3 = parseArgs('project: openapi-tyk branch: master');
  assert.equal(t3.branch, 'master');
});

test('repo-sync parseArgs: Nhận diện đúng các cờ boolean (--stash, --dry-run, --all, --list)', () => {
  const t1 = parseArgs('-p openapi-tyk --stash');
  assert.equal(t1.stash, true);
  assert.equal(t1.dryRun, false);

  const t2 = parseArgs('-p openapi-tyk --dry-run');
  assert.equal(t2.dryRun, true);
  assert.equal(t2.stash, false);

  const t3 = parseArgs('--list');
  assert.equal(t3.list, true);

  const t4 = parseArgs('--all');
  assert.equal(t4.all, true);

  const t5 = parseArgs('-p openapi-tyk --no-reset');
  assert.equal(t5.noReset, true);
});

test('repo-sync loadProjectsConfig: Đọc và phân giải danh sách alias từ projects.json', () => {
  const mapping = loadProjectsConfig();
  assert.ok(typeof mapping === 'object' && mapping !== null);
  
  // Đảm bảo có các alias quan trọng
  assert.ok(mapping['openapi-tyk'], 'projects.json cần có alias openapi-tyk');
  assert.ok(mapping['openapi'], 'projects.json cần có alias openapi');
  assert.ok(mapping['agent-skills'], 'projects.json cần có alias agent-skills');
});

test('repo-sync resolveTargetProjects: Phân giải alias thành đúng thư mục đích', () => {
  const mapping = loadProjectsConfig();
  
  // Test với alias đơn: openapi-tyk
  const targetsTyk = resolveTargetProjects('openapi-tyk', mapping);
  assert.ok(targetsTyk.length >= 1, 'Cần tìm thấy ít nhất 1 target cho openapi-tyk');
  assert.equal(targetsTyk[0].name, 'openapi-tyk');

  // Test với alias cụm: openapi (chứa nhiều repos con)
  const targetsOpenApi = resolveTargetProjects('openapi', mapping);
  assert.ok(targetsOpenApi.length >= 1, 'Cần tìm thấy các repos con trong folder 3.1 cho openapi');
  const names = targetsOpenApi.map(t => t.name);
  assert.ok(names.includes('openapi-tyk'), 'Cụm openapi phải chứa openapi-tyk');
});

test('repo-sync formatReport: Render bảng Markdown tổng kết trực quan', () => {
  const dummyResults = [
    {
      name: 'openapi-tyk',
      path: '/path/openapi-tyk',
      currentBranch: 'develop',
      status: 'PULLED',
      behind: 3,
      ahead: 0,
      latestSha: 'a1b2c3d',
      message: 'Đã kéo thành công +3 commit mới.',
      durationMs: 450
    },
    {
      name: 'openapi-websocket',
      path: '/path/openapi-websocket',
      currentBranch: 'main',
      status: 'UP_TO_DATE',
      behind: 0,
      ahead: 0,
      latestSha: 'e5f6g7h',
      message: 'Đã ở phiên bản mới nhất',
      durationMs: 320
    }
  ];

  const md = formatReport(dummyResults);
  assert.ok(md.includes('openapi-tyk'));
  assert.ok(md.includes('openapi-websocket'));
  assert.ok(md.includes('🟢 Pulled'));
  assert.ok(md.includes('⚪ Up-to-date'));
  assert.ok(md.includes('**Tổng kết:** 2 repos'));
});

test('repo-sync formatReport: Hiển thị đầy đủ thông tin đa nhánh và trạng thái reset', () => {
  const multiBranchResults = [
    {
      name: 'openapi-tyk',
      path: '/path/openapi-tyk',
      currentBranch: 'master',
      initialBranch: 'master',
      status: 'PULLED',
      behind: 7,
      ahead: 0,
      latestSha: 'a1b2c3d',
      wasReset: true,
      resetMessage: 'Đã reset 5 file modified/untracked',
      message: '🔄 Đã reset 5 file modified/untracked | Nhánh: master (+3), dev (+4), uat (OK)',
      durationMs: 1200,
      branches: [
        { name: 'master', status: 'PULLED', behind: 3, ahead: 0, latestSha: 'a1b2c3d', message: 'Đã kéo +3 commit' },
        { name: 'dev', status: 'PULLED', behind: 4, ahead: 0, latestSha: 'e4f5g6h', message: 'Đã kéo +4 commit' },
        { name: 'uat', status: 'UP_TO_DATE', behind: 0, ahead: 0, latestSha: 'i7j8k9l', message: 'Đã ở bản mới nhất' }
      ]
    }
  ];

  const md = formatReport(multiBranchResults);
  assert.ok(md.includes('openapi-tyk'));
  assert.ok(md.includes('`master`, `dev`, `uat`'));
  assert.ok(md.includes('🔄 Đã reset 5 file modified/untracked'));
  assert.ok(md.includes('master (+3)'));
  assert.ok(md.includes('dev (+4)'));
  assert.ok(md.includes('🔄 Đã reset: 1'));
});

test('repo-sync loadProjectsConfig: Smart 2-Tier scanning nhận diện đúng repo độc lập và thư mục nhóm, bỏ qua thư mục phi-git', () => {
  const mapping = loadProjectsConfig();
  
  // 1. Phải nhận diện được repo từ group dirs nếu có trong env
  if (process.env.PROJECT_SCAN_DIRS) {
    // Thư mục non-git không bao giờ được đưa vào mapping
    assert.equal(mapping['workspace'], undefined, 'workspace không có .git không được vào mapping');
    assert.equal(mapping['temp_ba_refine_skill'], undefined, 'temp_ba_refine_skill không có .git không được vào mapping');
    assert.equal(mapping['certificates'], undefined, 'certificates không có .git không được vào mapping');
  }
});

test('repo-sync formatReport: Hiển thị đúng trạng thái UNBORN và LOCAL_ONLY', () => {
  const specialResults = [
    {
      name: 'new-repo-init',
      path: '/path/new-repo-init',
      currentBranch: 'unknown',
      status: 'UNBORN',
      behind: 0,
      ahead: 0,
      latestSha: '',
      message: 'Repo mới khởi tạo (git init), chưa có commit nào.',
      durationMs: 50
    },
    {
      name: 'local-repo',
      path: '/path/local-repo',
      currentBranch: 'main',
      status: 'LOCAL_ONLY',
      behind: 0,
      ahead: 0,
      latestSha: '1234567',
      message: 'Repo cục bộ, chưa cấu hình remote origin.',
      durationMs: 80
    }
  ];

  const md = formatReport(specialResults);
  assert.ok(md.includes('⚪ Unborn'));
  assert.ok(md.includes('⚪ Local-only'));
  assert.ok(md.includes('⚠️ Bỏ qua: 2'));
});

