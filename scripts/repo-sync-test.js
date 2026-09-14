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
