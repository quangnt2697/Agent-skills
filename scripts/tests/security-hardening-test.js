import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { buildShortDescription } from '../setup/build-codex-metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

test('check-secrets.sh: phát hiện Atlassian/AWS/GitHub/AI tokens và chặn path traversal ngoại lệ', () => {
  const script = path.join(projectRoot, '.agents/hooks/core/check-secrets.sh');

  const sampleSecrets = [
    ['Atlassian', 'ATLASSIAN_API_TOKEN=ATATT3xFfGF0123456789abcdefghij'],
    ['AWS', 'AWS_ACCESS_KEY_ID=AKIA0123456789ABCDEF'],
    ['GitHub', 'GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz1234'],
    ['OpenAI', 'OPENAI_API_KEY=sk-proj-1234567890abcdefghijklmnopqrstuvwxyz1234']
  ];

  for (const [label, line] of sampleSecrets) {
    const res = spawnSync('bash', [script, 'src/config.js', line], { encoding: 'utf8' });
    assert.equal(res.status, 2, `${label} secret phải bị chặn (exit 2), nhận: ${res.status}`);
  }

  // Hỗ trợ Antigravity payload `.toolCall.args.Path` + `.CodeContent` qua stdin JSON
  const agyPayloadRes = spawnSync('bash', [script], {
    input: JSON.stringify({
      toolCall: { args: { Path: 'src/app.js', CodeContent: 'TOKEN=ATATT3xFfGF0123456789abcdefghij' } }
    }),
    encoding: 'utf8'
  });
  assert.equal(agyPayloadRes.status, 2, 'Phải trích xuất được Path từ payload Antigravity');

  // Ngoại lệ hợp lệ bên trong evals/fixtures/
  const fixtureAllowed = spawnSync('bash', [script, 'evals/fixtures/sample/case.json', 'token=glpat-abcdefghijklmnopqrstuvwx'], {
    encoding: 'utf8'
  });
  assert.equal(fixtureAllowed.status, 0);

  // Path traversal qua .. không được phép bypass
  const traversalBlocked = spawnSync('bash', [script, 'evals/fixtures/../../.env', 'ATLASSIAN_API_TOKEN=ATATT3xFfGF0123456789abcdefghij'], {
    encoding: 'utf8'
  });
  assert.equal(traversalBlocked.status, 2);
});

test('antigravity hooks: post-tool-guard và sdd-cache-pre hoạt động đúng khi CWD là .agents/', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hook-fix-'));
  try {
    // Copy minimal hook layout into tmp/.agents/hooks/...
    const hookDir = path.join(tmp, '.agents/hooks');
    fs.mkdirSync(path.join(hookDir, 'core'), { recursive: true });
    fs.mkdirSync(path.join(hookDir, 'antigravity'), { recursive: true });
    fs.copyFileSync(
      path.join(projectRoot, '.agents/hooks/antigravity/post-tool-guard.sh'),
      path.join(hookDir, 'antigravity/post-tool-guard.sh')
    );
    fs.copyFileSync(
      path.join(projectRoot, '.agents/hooks/core/auto-format.sh'),
      path.join(hookDir, 'core/auto-format.sh')
    );
    fs.copyFileSync(
      path.join(projectRoot, '.agents/hooks/antigravity/sdd-cache-pre.sh'),
      path.join(hookDir, 'antigravity/sdd-cache-pre.sh')
    );

    const sampleFile = path.join(tmp, 'sample.txt');
    fs.writeFileSync(sampleFile, 'hello   \n');

    const postRes = spawnSync('bash', [path.join(hookDir, 'antigravity/post-tool-guard.sh')], {
      cwd: path.join(tmp, '.agents'),
      input: JSON.stringify({ toolCall: { args: { Path: sampleFile } } }),
      encoding: 'utf8'
    });
    assert.equal(postRes.status, 0, postRes.stderr);

    const cacheRes = spawnSync('bash', [path.join(hookDir, 'antigravity/sdd-cache-pre.sh')], {
      cwd: path.join(tmp, '.agents'),
      input: JSON.stringify({ toolCall: { name: 'read_url_content', args: { Url: 'https://example.com/spec' } } }),
      encoding: 'utf8'
    });
    assert.equal(cacheRes.status, 0, cacheRes.stderr);
    // Cache index phải nằm ở tmp/.agents/sdd-cache, KHÔNG lồng .agents/.agents/sdd-cache
    assert.equal(fs.existsSync(path.join(tmp, '.agents/.agents/sdd-cache')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('jira-action-skill-dispatcher: chặn issueKey chứa path traversal', async () => {
  const modRequire = createRequire(import.meta.url);
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-action-skill-dispatcher.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('require', '$input', '$env', code);

  const res = await fn(
    modRequire,
    { first: () => ({ json: { query: { skill: 'ba-spec', issueKey: '../G3PTP-1' } } }) },
    { AGENT_WORKSPACE_DIR: projectRoot }
  );

  assert.equal(res[0].json.isError, true);
  assert.match(res[0].json.error, /không hợp lệ/);
});

test('run-security-scanner: từ chối projectPath ngoài phạm vi workspace được phép', async () => {
  const modRequire = createRequire(import.meta.url);
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/security/run-security-scanner.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('require', '$input', '$env', code);

  const res = await fn(
    modRequire,
    { first: () => ({ json: { body: { projectPath: '/etc' } } }) },
    { AGENT_WORKSPACE_DIR: projectRoot }
  );
  const parsed = JSON.parse(res[0].json.auditOutput);
  assert.match(parsed.error, /Từ chối quét/);
});

test('buildShortDescription: không cắt giữa chừng tại .feature hoặc dấu ... trong ngoặc', () => {
  const s1 = buildShortDescription(
    'Tự động đồng bộ kịch bản kiểm thử BDD Gherkin (.feature) lên hệ thống quản lý kiểm thử Squash TM qua REST API và gán vào Campaign Test Plan.'
  );
  assert.ok(!s1.endsWith('('), `Không được cắt ngang tại '(': ${s1}`);
  assert.ok(s1.length <= 64);

  const s2 = buildShortDescription(
    'Viết User Stories chuẩn mực theo nguyên tắc INVEST ("As a... I want... So that...") kèm tiêu chí chấp nhận Acceptance Criteria bằng định dạng Gherkin.'
  );
  assert.ok(!s2.endsWith('"As a'), `Không được cắt ngang tại '"As a': ${s2}`);
  assert.ok(s2.length <= 64);
});
