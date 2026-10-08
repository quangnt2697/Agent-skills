import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";

import { extractIds, traceCheck } from "../../plugins/core/skills/meta-cross-validation/scripts/trace-check.js";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../plugins/core/skills/meta-cross-validation/scripts/trace-check.js",
);

const sandboxes = [];

function makeWorkspace(files) {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-check-test-")), "STK-1");
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  sandboxes.push(path.dirname(root));
  return root;
}

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

test("extractIds: duy nhất, sắp xếp theo số, không bắt BR-xx nằm trong từ khác", () => {
  assert.deepEqual(extractIds("[BR-10] [BR-2] BR-2 AC-1 XBR-3 BR-x"), ["AC-1", "BR-2", "BR-10"]);
});

test("đủ coverage ở cả tech và test: exit 0, ghi trace/matrix.md", () => {
  const ws = makeWorkspace({
    "spec/final.md": "[BR-01] a\n[AC-01] b\n",
    "tech/tech-spec.md": "BR-01 → API; AC-01 → validate",
    "test/STK-1.feature": "@BR-01\nScenario: x\n@AC-01\nScenario: y",
  });
  const res = run(ws);
  assert.equal(res.status, 0, res.stderr);
  const matrix = fs.readFileSync(path.join(ws, "trace/matrix.md"), "utf8");
  assert.match(matrix, /\| BR-01 \| ✅ \| ✅ \|/);
});

test("thiếu coverage dưới ngưỡng: exit 1 và liệt kê mã thiếu", () => {
  const ws = makeWorkspace({
    "spec/final.md": "[BR-01] [BR-02] [AC-01]",
    "tech/tech-spec.md": "BR-01 BR-02 AC-01",
    "test/checklist.md": "BR-01",
  });
  const res = run(ws, "--min=90");
  assert.equal(res.status, 1);
  assert.match(res.stdout, /test: 33\.3% \(1\/3\) — thiếu: AC-01, BR-02/);
});

test("--stage=tech chỉ kiểm tech-spec", () => {
  const ws = makeWorkspace({ "spec/final.md": "[BR-01]", "tech/tech-spec.md": "BR-01" });
  const { stages } = traceCheck(ws, "tech");
  assert.deepEqual(Object.keys(stages), ["tech"]);
  assert.equal(run(ws, "--stage=tech").status, 0);
});

test("final.md không có mã BR/AC: exit 2 (thiếu input, không đoán bằng keyword)", () => {
  const ws = makeWorkspace({ "spec/final.md": "Quy tắc nghiệp vụ không gắn mã" });
  const res = run(ws);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /không có mã/);
});

test("bỏ qua test/result/ (log có thể chứa mã BR nhưng không phải bằng chứng bao phủ)", () => {
  const ws = makeWorkspace({
    "spec/final.md": "[BR-01]",
    "test/result/report.md": "BR-01 failed",
  });
  assert.equal(traceCheck(ws, "test").stages.test.pct, 0);
});
