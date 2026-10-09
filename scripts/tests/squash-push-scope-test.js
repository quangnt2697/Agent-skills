import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../plugins/qa/skills/qa-squash-push/assets/squash-push.sh",
);

// Lấy đúng hàm lọc từ script thật để test không lệch với code chạy production.
const MATCH_FN = fs
  .readFileSync(SCRIPT, "utf8")
  .match(/^match_issue_test_cases\(\) \{[\s\S]*?^\}$/m)[0];

const PROJECT_TEST_CASES = [
  { id: 1, name: "G3PTP-123-Dat-lenh" },
  { id: 2, name: "G3PTP-1234-Huy-lenh" },
  { id: 3, name: "G3PTP-12-Sua-lenh" },
  { id: 4, name: "Regression G3PTP-123 lien quan" },
  { id: 5, name: "Smoke test - g3ptp-123 + G3PTP-456" },
  { id: 6, name: "G3PTP-123" },
  { id: 7, name: "g3ptp-123-ten-viet-thuong" },
  { id: 8, name: "G3PTP-456-Khac" },
];

function idsToDelete(issueKey, testCases = PROJECT_TEST_CASES) {
  const out = execFileSync("bash", ["-c", `${MATCH_FN}\nmatch_issue_test_cases "$1"`, "_", issueKey], {
    input: JSON.stringify(testCases),
    encoding: "utf8",
  });
  return JSON.parse(out).map((t) => t.id);
}

test("chỉ xoá test case của đúng issue được push", () => {
  assert.deepEqual(idsToDelete("G3PTP-123"), [1, 6, 7]);
});

test("không xoá issue khác có số bắt đầu giống nhau", () => {
  assert.deepEqual(idsToDelete("G3PTP-12"), [3]);
  assert.ok(!idsToDelete("G3PTP-123").includes(2), "G3PTP-1234 không thuộc G3PTP-123");
});

test("không xoá test case chỉ nhắc tới issue key ở giữa tên", () => {
  const ids = idsToDelete("G3PTP-123");
  assert.ok(!ids.includes(4) && !ids.includes(5));
});

test("không có test case nào của issue: không xoá gì", () => {
  assert.deepEqual(idsToDelete("G3PTP-999"), []);
});

for (const bad of ["", "G3PTP", "G3PTP-", "123", "G3PTP-12a", "../G3PTP-1"]) {
  test(`issue key không hợp lệ '${bad}': dừng trước khi gọi Squash`, () => {
    const res = spawnSync("bash", [SCRIPT, bad, "name", "/nonexistent.feature"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /ISSUE_KEY không hợp lệ/);
  });
}

const PLAN_FN = fs
  .readFileSync(SCRIPT, "utf8")
  .match(/^select_issue_plan_items\(\) \{[\s\S]*?^\}$/m)[0];

function planItemsToDelete(issueKey, response, purged = []) {
  const out = execFileSync(
    "bash",
    ["-c", `${PLAN_FN}\nselect_issue_plan_items "$1" "$2"`, "_", issueKey, JSON.stringify(purged)],
    { input: JSON.stringify(response), encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean).map(Number);
}

test("test plan: chỉ xoá item trỏ tới test case của issue, giữ item của task khác", () => {
  const response = [
    { id: 101, testCaseName: "G3PTP-123-Dat-lenh" },
    { id: 102, testCaseName: "Regression bo lenh" },
    { id: 103, testCaseName: "G3PTP-1234-Huy-lenh" },
    { id: 104, testCaseId: 7 },
  ];
  assert.deepEqual(planItemsToDelete("G3PTP-123", response, [7]), [101, 104]);
});

test("test plan: hỗ trợ dạng {content:[...]} và referencedTestCase", () => {
  const response = { content: [
    { id: 201, referencedTestCase: { id: 9, name: "g3ptp-123-x" } },
    { id: 202, referencedTestCase: { id: 10, name: "G3PTP-456-y" } },
  ] };
  assert.deepEqual(planItemsToDelete("G3PTP-123", response), [201]);
});

test("test plan: item không xác định được test case thì KHÔNG xoá", () => {
  assert.deepEqual(planItemsToDelete("G3PTP-123", [{ id: 301 }, { id: 302, status: "READY" }]), []);
});
