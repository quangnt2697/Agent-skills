"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { afterEach, test } = require("node:test");

const {
  collectVersions,
  checkVersionConsistency,
  MANIFEST_PATHS,
} = require("./validate-versions");

const sandboxes = [];

function makeSandbox(manifests) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-versions-test-"));
  for (const [relPath, contents] of Object.entries(manifests)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(contents, null, 2));
  }
  sandboxes.push(root);
  return root;
}

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

test("passes when every manifest declares the same version", () => {
  const root = makeSandbox({
    "plugin.json": { name: "agent-skills", version: "1.0.0" },
    ".claude-plugin/plugin.json": { name: "agent-skills", version: "1.0.0" },
    ".claude-plugin/marketplace.json": { plugins: [{ name: "agent-skills", version: "1.0.0" }] },
  });
  const found = collectVersions(MANIFEST_PATHS, root);
  assert.equal(found.length, 3);
  assert.equal(checkVersionConsistency(found), null);
});

test("fails when manifests drift apart", () => {
  const root = makeSandbox({
    "plugin.json": { name: "agent-skills", version: "1.0.0" },
    ".claude-plugin/plugin.json": { name: "agent-skills", version: "0.6.6" },
  });
  const error = checkVersionConsistency(collectVersions(MANIFEST_PATHS, root));
  assert.match(error, /different versions/);
  assert.match(error, /plugin\.json: 1\.0\.0/);
  assert.match(error, /\.claude-plugin\/plugin\.json: 0\.6\.6/);
});

test("skips manifests that do not exist in this fork", () => {
  const root = makeSandbox({
    "plugin.json": { name: "agent-skills", version: "1.0.0" },
  });
  const found = collectVersions(MANIFEST_PATHS, root);
  assert.deepEqual(found.map(f => f.path), ["plugin.json"]);
  assert.equal(checkVersionConsistency(found), null);
});

test("skips manifests that carry no version field", () => {
  const root = makeSandbox({
    "plugin.json": { name: "agent-skills", version: "1.0.0" },
    // .agents marketplace ships without a version — must not read as <missing>
    ".agents/plugins/marketplace.json": { name: "agent-skills", plugins: [{ name: "agent-skills" }] },
  });
  const found = collectVersions(MANIFEST_PATHS, root);
  assert.deepEqual(found.map(f => f.path), ["plugin.json"]);
  assert.equal(checkVersionConsistency(found), null);
});

test("reads the version out of a marketplace plugins array", () => {
  const root = makeSandbox({
    ".claude-plugin/marketplace.json": { plugins: [{ name: "agent-skills", version: "2.1.0" }] },
  });
  assert.deepEqual(collectVersions(MANIFEST_PATHS, root), [
    { path: ".claude-plugin/marketplace.json", version: "2.1.0" },
  ]);
});

test("reports when there is no versioned manifest at all", () => {
  const root = makeSandbox({});
  assert.match(checkVersionConsistency(collectVersions(MANIFEST_PATHS, root)), /No versioned plugin manifest/);
});

test("the repo's own manifests agree", () => {
  assert.equal(checkVersionConsistency(collectVersions()), null);
});
