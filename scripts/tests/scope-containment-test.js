import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Scope Containment & Permission Tiers Policy', async (t) => {
  const rootDir = process.cwd();

  await t.test('autonomy-contract sets single-task hard stop as default', () => {
    const contract = fs.readFileSync(path.join(rootDir, '.agents/rules/autonomy-contract.md'), 'utf8');
    assert.match(contract, /DỪNG SAU MỖI ARTIFACT/i);
    assert.match(contract, /Single-Task Hard Stop/i);
    assert.match(contract, /Bảng Quy Chuẩn Tự Sửa Lỗi/i);
    assert.doesNotMatch(contract, /Mặc định của hệ thống là \*\*TỰ CHẠY\*\*/i);
  });

  await t.test('all 31 skills declare valid Tier banner', () => {
    const pluginsDir = path.join(rootDir, 'plugins');
    const plugins = fs.readdirSync(pluginsDir);
    let skillCount = 0;

    for (const plugin of plugins) {
      const skillsDir = path.join(pluginsDir, plugin, 'skills');
      if (!fs.existsSync(skillsDir)) continue;

      for (const skill of fs.readdirSync(skillsDir)) {
        const skillFile = path.join(skillsDir, skill, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;

        skillCount++;
        const content = fs.readFileSync(skillFile, 'utf8');
        assert.match(
          content,
          /\*\*Scope & Permission:\*\* Tier (1|2|2b|3)/,
          `Skill ${skill} must declare a valid Scope & Permission Tier banner`
        );
      }
    }

    assert.strictEqual(skillCount, 31, 'Expected exactly 31 skills');
  });

  await t.test('all 30 commands have Scope Boundaries & Hard Stop block', () => {
    const pluginsDir = path.join(rootDir, 'plugins');
    const plugins = fs.readdirSync(pluginsDir);
    let cmdCount = 0;

    for (const plugin of plugins) {
      const cmdDir = path.join(pluginsDir, plugin, 'commands');
      if (!fs.existsSync(cmdDir)) continue;

      for (const cmd of fs.readdirSync(cmdDir).filter(f => f.endsWith('.toml'))) {
        cmdCount++;
        const content = fs.readFileSync(path.join(cmdDir, cmd), 'utf8');
        assert.match(content, /Scope Boundaries & Immutable Hard Stops/, `Command ${cmd} must have Scope Boundaries`);
        assert.match(content, /TIER (1|2|2b|3)/i, `Command ${cmd} must declare TIER`);
        assert.match(content, /(ĐIỀU KIỆN DỪNG|SINGLE TASK LOCK|HARD STOP)/i, `Command ${cmd} must have HARD STOP condition`);
      }
    }

    assert.strictEqual(cmdCount, 30, 'Expected exactly 30 commands');
  });

  await t.test('e2e-delivery does not contain dead dev agent or application build phases', () => {
    const e2eCmd = fs.readFileSync(path.join(rootDir, 'plugins/core/commands/e2e-delivery.toml'), 'utf8');
    assert.doesNotMatch(e2eCmd, /agent-skills:dev/);
    assert.doesNotMatch(e2eCmd, /dev-debugging/);
    assert.doesNotMatch(e2eCmd, /Phase 5: build \+ TDD/);
    assert.match(e2eCmd, /ba-spec → qa-test-design → qa-auto-design → qa-run-test → trace-check → cr-review/);
  });

  await t.test('repo-sync command is marked as Tier 2b EXTERNAL-WRITE', () => {
    const syncCmd = fs.readFileSync(path.join(rootDir, 'plugins/core/commands/sync.toml'), 'utf8');
    assert.match(syncCmd, /TIER 2b - EXTERNAL-WRITE/);
    assert.match(syncCmd, /--force/);
  });

  await t.test('skill references/ do not force auto-chain to a downstream skill', () => {
    const refFile = path.join(rootDir, 'plugins/ba-po/skills/ba-refine/references/workflow-and-phases.md');
    const content = fs.readFileSync(refFile, 'utf8');
    assert.doesNotMatch(content, /tự động chuyển sang/i);
    assert.doesNotMatch(content, /không được dừng lại để hỏi/i);
    assert.match(content, /Single-Task Hard Stop/);
  });
});
