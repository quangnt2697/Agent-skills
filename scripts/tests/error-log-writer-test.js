import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const SRC = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "n8n-nodes", "ops", "error-log-writer.js"),
  "utf8",
);

// Chạy script như n8n Code Node: $env, $input, require được n8n cấp sẵn.
function runNode(env, json) {
  const items = [{ json }];
  const $input = { first: () => items[0], all: () => items };
  return new Function("$env", "$input", "require", SRC)(env, $input, require);
}

test("error-log-writer: ghi 1 dòng JSON vào workspace/.n8n-errors.log", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "errlog-"));
  const out = runNode(
    { AGENT_WORKSPACE_DIR: root },
    { workflowName: "WF A", workflowId: "1", failedNode: "Node X", errorMessage: "boom", executionId: "42", timestamp: "2026-01-01T00:00:00.000Z" },
  );
  const logFile = path.join(root, "workspace", ".n8n-errors.log");
  assert.equal(out[0].json.logFile, logFile);
  const lines = fs.readFileSync(logFile, "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.workflowName, "WF A");
  assert.equal(entry.failedNode, "Node X");
  assert.equal(entry.errorMessage, "boom");
  assert.equal(entry.executionId, "42");
});

test("error-log-writer: lỗi sau được nối tiếp, không ghi đè lỗi trước", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "errlog-"));
  runNode({ AGENT_WORKSPACE_DIR: root }, { errorMessage: "one" });
  runNode({ AGENT_WORKSPACE_DIR: root }, { errorMessage: "two" });
  const lines = fs.readFileSync(path.join(root, "workspace", ".n8n-errors.log"), "utf8").trim().split("\n");
  assert.deepEqual(lines.map((l) => JSON.parse(l).errorMessage), ["one", "two"]);
});

test("error-log-writer: không nuốt lỗi khi không ghi được file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "errlog-"));
  fs.writeFileSync(path.join(root, "workspace"), "đây là file, không phải thư mục");
  assert.throws(() => runNode({ AGENT_WORKSPACE_DIR: root }, { errorMessage: "x" }));
});

