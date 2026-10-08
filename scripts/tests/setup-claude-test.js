import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "setup", "setup-claude.js");
const REPO_ROOT = fs.realpathSync(path.resolve(path.dirname(SCRIPT), "..", ".."));

const sandboxes = [];

function makeConfigDir(settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-claude-test-"));
  if (settings !== undefined) fs.writeFileSync(path.join(dir, "settings.json"), settings);
  sandboxes.push(dir);
  return dir;
}

function run(configDir, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: "utf8",
  });
}

const readSettings = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "settings.json"), "utf8"));

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

test("cài mới: tạo symlink tới repo và ghi AGENT_SKILLS_HOME", () => {
  const dir = makeConfigDir();
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.realpathSync(path.join(dir, "skills", "agent-skills")), REPO_ROOT);
  assert.equal(readSettings(dir).env.AGENT_SKILLS_HOME, REPO_ROOT);
});

test("giữ nguyên cấu hình sẵn có và tạo bản sao lưu", () => {
  const dir = makeConfigDir(JSON.stringify({ model: "x", env: { KEEP: "1" } }));
  assert.equal(run(dir).status, 0);
  const settings = readSettings(dir);
  assert.equal(settings.model, "x");
  assert.equal(settings.env.KEEP, "1");
  assert.ok(fs.existsSync(path.join(dir, "settings.json.agent-skills.bak")));
});

test("idempotent: chạy lần 2 không đổi gì", () => {
  const dir = makeConfigDir();
  run(dir);
  const before = fs.readFileSync(path.join(dir, "settings.json"), "utf8");
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.readFileSync(path.join(dir, "settings.json"), "utf8"), before);
});

test("settings.json hỏng: dừng và không ghi đè", () => {
  const dir = makeConfigDir("{ not json");
  const res = run(dir);
  assert.equal(res.status, 1);
  assert.equal(fs.readFileSync(path.join(dir, "settings.json"), "utf8"), "{ not json");
});

test("đường dẫn đích là thư mục thật: dừng, không xoá", () => {
  const dir = makeConfigDir();
  fs.mkdirSync(path.join(dir, "skills", "agent-skills"), { recursive: true });
  assert.equal(run(dir).status, 1);
  assert.ok(fs.lstatSync(path.join(dir, "skills", "agent-skills")).isDirectory());
});

test("--unlink: gỡ symlink và AGENT_SKILLS_HOME, giữ env khác", () => {
  const dir = makeConfigDir(JSON.stringify({ env: { KEEP: "1" } }));
  run(dir);
  assert.equal(run(dir, "--unlink").status, 0);
  assert.equal(fs.existsSync(path.join(dir, "skills", "agent-skills")), false);
  assert.deepEqual(readSettings(dir).env, { KEEP: "1" });
});
