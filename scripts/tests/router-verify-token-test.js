import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const SRC = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "n8n-nodes", "router", "router-verify-token.js"),
  "utf8",
);

// Chạy script như n8n Code Node: $env, $input, require được n8n cấp sẵn.
function runNode(env, body) {
  const items = [{ json: { body } }];
  const $input = { first: () => items[0], all: () => items };
  return new Function("$env", "$input", "require", SRC)(env, $input, require);
}

test("thiếu MATTERMOST_SLASH_TOKEN: từ chối mọi request", () => {
  assert.throws(() => runNode({}, { token: "x" }), /chưa được cấu hình/);
});

test("sai token: từ chối", () => {
  assert.throws(() => runNode({ MATTERMOST_SLASH_TOKEN: "abc" }, { token: "abd" }), /không hợp lệ/);
  assert.throws(() => runNode({ MATTERMOST_SLASH_TOKEN: "abc" }, {}), /không hợp lệ/);
});

test("đúng token: cho đi tiếp nguyên item", () => {
  const out = runNode({ MATTERMOST_SLASH_TOKEN: "abc" }, { token: "abc", user_name: "an" });
  assert.equal(out[0].json.body.user_name, "an");
});

test("allowlist user: chặn user ngoài danh sách, không phân biệt hoa thường", () => {
  const env = { MATTERMOST_SLASH_TOKEN: "abc", MATTERMOST_ALLOWED_USERS: "an, Binh" };
  assert.throws(() => runNode(env, { token: "abc", user_name: "chi" }), /MATTERMOST_ALLOWED_USERS/);
  assert.doesNotThrow(() => runNode(env, { token: "abc", user_name: "binh" }));
});
