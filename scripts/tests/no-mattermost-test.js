import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function listWorkflows() {
  const base = path.join(ROOT, "n8n-workflows");
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => fs.readdirSync(path.join(base, d.name))
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join("n8n-workflows", d.name, f)));
}

test("không workflow n8n nào còn tham chiếu Mattermost", () => {
  const offenders = listWorkflows().filter((f) => /mattermost/i.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("router Mattermost và script phụ trợ đã bị gỡ", () => {
  for (const rel of [
    "n8n-workflows/ops/mattermost-single-router.json",
    "scripts/n8n-nodes/router",
    "scripts/tests/router-verify-token-test.js",
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, rel)), false, `${rel} không được tồn tại`);
  }
});

test("global-error-handler ghi lỗi ra file thay vì gọi webhook chat", () => {
  const wf = JSON.parse(read("n8n-workflows/ops/global-error-handler.json"));
  const writer = wf.nodes.find((n) => n.name === "Write Error Log");
  assert.ok(writer, "thiếu node Write Error Log");
  assert.match(writer.parameters.jsCode, /\.n8n-errors\.log/);
  assert.equal(wf.nodes.some((n) => n.type === "n8n-nodes-base.httpRequest"), false);
});

test("cấu hình môi trường không còn ngrok / Mattermost / NOTIFY_CHANNEL", () => {
  assert.doesNotMatch(read("config/ecosystem.config.cjs"), /ngrok/i);
  assert.doesNotMatch(read(".env.example"), /mattermost|ngrok|NOTIFY_CHANNEL/i);
});

