import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';
import { parse as parseToml } from 'smol-toml';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'setup', 'setup-codex.js');
const REPO_ROOT = fs.realpathSync(path.resolve(path.dirname(SCRIPT), '..', '..'));

const sandboxes = [];

function makeCodexHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-codex-test-'));
  sandboxes.push(dir);
  return dir;
}

function runSetup(codexHome, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

test('cài mới mặc định: 31 skills, AGENTS.md, config.toml hợp lệ (6 agents + env), hooks.json chuẩn', () => {
  const dir = makeCodexHome();
  const res = runSetup(dir);
  assert.equal(res.status, 0, res.stderr);

  const skills = fs.readdirSync(path.join(dir, 'skills'));
  assert.equal(skills.length, 31);
  assert.equal(fs.realpathSync(path.join(dir, 'AGENTS.md')), path.join(REPO_ROOT, 'AGENTS.md'));

  const cfg = parseToml(fs.readFileSync(path.join(dir, 'config.toml'), 'utf8'));
  assert.equal(cfg.shell_environment_policy.set.AGENT_SKILLS_HOME, REPO_ROOT);
  assert.equal(cfg.sandbox_workspace_write.network_access, true);
  assert.equal(cfg.features.hooks, true);
  assert.equal(cfg.features.multi_agent, true);
  for (const role of ['ba_po', 'qa', 'code_reviewer', 'security_auditor', 'webperf_auditor', 'scrum_master']) {
    assert.ok(cfg.agents[role], `Thiếu [agents.${role}]`);
    assert.ok(path.isAbsolute(cfg.agents[role].config_file), `config_file phải tuyệt đối: ${role}`);
    assert.ok(fs.existsSync(cfg.agents[role].config_file), `config_file không tồn tại: ${cfg.agents[role].config_file}`);
  }

  const hooksData = JSON.parse(fs.readFileSync(path.join(dir, 'hooks.json'), 'utf8'));
  for (const ev of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']) {
    assert.ok(Array.isArray(hooksData.hooks[ev]) && hooksData.hooks[ev].length === 1, `Thiếu hook event ${ev}`);
    const cmd = hooksData.hooks[ev][0].hooks[0].command;
    assert.ok(cmd.includes(`AGENT_SKILLS_HOME="${REPO_ROOT}"`), `Hook ${ev} thiếu AGENT_SKILLS_HOME inline`);
  }
  assert.equal(hooksData.hooks.Stop[0].matcher, undefined, 'Stop hook không nên đặt matcher');
});

test('idempotent: chạy lần 2 không sửa lại config.toml và hooks.json', () => {
  const dir = makeCodexHome();
  assert.equal(runSetup(dir).status, 0);
  const cfgBefore = fs.readFileSync(path.join(dir, 'config.toml'), 'utf8');
  const hooksBefore = fs.readFileSync(path.join(dir, 'hooks.json'), 'utf8');

  const res2 = runSetup(dir);
  assert.equal(res2.status, 0, res2.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'config.toml'), 'utf8'), cfgBefore);
  assert.equal(fs.readFileSync(path.join(dir, 'hooks.json'), 'utf8'), hooksBefore);
});

test('bảo toàn cấu hình sẵn có của user và --unlink gỡ sạch phần thuộc repo', () => {
  const dir = makeCodexHome();
  fs.writeFileSync(
    path.join(dir, 'config.toml'),
    'model = "gpt-5"\n\n[agents.user_custom]\ndescription = "keep"\nconfig_file = "/tmp/user-custom.toml"\n',
  );
  fs.writeFileSync(
    path.join(dir, 'hooks.json'),
    JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo user-hook' }] }],
      },
    }),
  );

  assert.equal(runSetup(dir).status, 0);
  const resUnlink = runSetup(dir, '--unlink');
  assert.equal(resUnlink.status, 0, resUnlink.stderr);

  assert.equal(fs.readdirSync(path.join(dir, 'skills')).length, 0);
  assert.equal(fs.existsSync(path.join(dir, 'AGENTS.md')), false);

  const cfgText = fs.readFileSync(path.join(dir, 'config.toml'), 'utf8');
  assert.equal(cfgText.includes('[shell_environment_policy.set]'), false, 'Không được để lại section rỗng');
  assert.equal(cfgText.includes('[sandbox_workspace_write]'), false, 'Không được để lại sandbox_workspace_write rỗng sau unlink');
  const cfg = parseToml(cfgText);
  assert.equal(cfg.model, 'gpt-5');
  assert.ok(cfg.agents.user_custom);
  assert.equal(cfg.agents.ba_po, undefined);

  const hooksData = JSON.parse(fs.readFileSync(path.join(dir, 'hooks.json'), 'utf8'));
  assert.equal(hooksData.hooks.PreToolUse.length, 1);
  assert.equal(hooksData.hooks.PreToolUse[0].hooks[0].command, 'echo user-hook');
  assert.equal(hooksData.hooks.SessionStart, undefined);
});

test('--no-hooks: chỉ cài skills, AGENTS.md và AGENT_SKILLS_HOME', () => {
  const dir = makeCodexHome();
  const res = runSetup(dir, '--no-hooks');
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.existsSync(path.join(dir, 'hooks.json')), false);
  const cfg = parseToml(fs.readFileSync(path.join(dir, 'config.toml'), 'utf8'));
  assert.equal(cfg.shell_environment_policy.set.AGENT_SKILLS_HOME, REPO_ROOT);
  assert.equal(cfg.agents, undefined);
});

test('config/codex templates hợp lệ và toàn bộ model_instructions_file tồn tại thực tế', () => {
  const exampleCfg = parseToml(fs.readFileSync(path.join(REPO_ROOT, 'config', 'codex', 'config.toml.example'), 'utf8'));
  assert.equal(exampleCfg.hooks, undefined, 'config.toml không được chứa map [hooks]');
  assert.equal(exampleCfg.tools, undefined);
  assert.equal(exampleCfg.features.default_mode_request_user_input, true);

  const exampleHooks = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'codex', 'hooks.json.example'), 'utf8'));
  for (const ev of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']) {
    assert.ok(Array.isArray(exampleHooks.hooks[ev]), `hooks.json.example thiếu ${ev}`);
  }

  const agentsDir = path.join(REPO_ROOT, 'config', 'codex', 'agents');
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.toml'));
  assert.equal(agentFiles.length, 6);
  for (const fn of agentFiles) {
    const filePath = path.join(agentsDir, fn);
    const parsed = parseToml(fs.readFileSync(filePath, 'utf8'));
    const target = path.resolve(agentsDir, parsed.model_instructions_file);
    assert.ok(fs.existsSync(target), `${fn}: model_instructions_file không tồn tại -> ${target}`);
  }
});
