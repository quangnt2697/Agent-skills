import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";

import { mappings, syncNodes } from "../n8n/sync-n8n-nodes.js";

const sandboxes = [];

function makeSandbox({ workflows = {}, scripts = {} }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-n8n-sync-test-"));
  for (const [rel, data] of Object.entries(workflows)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(data, null, 2));
  }
  for (const [rel, code] of Object.entries(scripts)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, code);
  }
  sandboxes.push(root);
  return root;
}

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

const item = {
  workflowFile: "wf.json",
  nodeName: "Code A",
  nodeId: "a",
  scriptFile: "a.js",
};

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

test("writes script content into the node's jsCode", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "a", name: "Code A", parameters: { jsCode: "old" } }] } },
    scripts: { "a.js": "return 1;" },
  });
  const res = syncNodes({ root, items: [item] });
  assert.equal(res.synced, 1);
  assert.deepEqual(res.errors, []);
  assert.equal(readJson(root, "wf.json").nodes[0].parameters.jsCode, "return 1;");
});

test("creates parameters when the node has none", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "a", name: "Code A" }] } },
    scripts: { "a.js": "x" },
  });
  syncNodes({ root, items: [item] });
  assert.equal(readJson(root, "wf.json").nodes[0].parameters.jsCode, "x");
});

test("matches a node by name when the id differs", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "zzz", name: "Code A", parameters: {} }] } },
    scripts: { "a.js": "by-name" },
  });
  assert.equal(syncNodes({ root, items: [item] }).synced, 1);
});

test("write=false reports drift without touching the workflow file", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "a", name: "Code A", parameters: { jsCode: "old" } }] } },
    scripts: { "a.js": "new" },
  });
  const res = syncNodes({ root, items: [item], write: false });
  assert.equal(res.drifted.length, 1);
  assert.equal(readJson(root, "wf.json").nodes[0].parameters.jsCode, "old");
});

test("no drift when the workflow already matches the script", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "a", name: "Code A", parameters: { jsCode: "same" } }] } },
    scripts: { "a.js": "same" },
  });
  assert.deepEqual(syncNodes({ root, items: [item], write: false }).drifted, []);
});

test("reports missing workflow, script and node as errors instead of throwing", () => {
  const root = makeSandbox({
    workflows: { "wf.json": { nodes: [{ id: "other", name: "Other" }] } },
    scripts: { "a.js": "x" },
  });
  const res = syncNodes({
    root,
    write: false,
    items: [
      { ...item, workflowFile: "missing.json" },
      { ...item, scriptFile: "missing.js" },
      item,
    ],
  });
  assert.equal(res.synced, 0);
  assert.equal(res.errors.length, 3);
});

test("the repo's own n8n workflows are in sync with scripts/n8n-nodes", () => {
  const res = syncNodes({ write: false });
  assert.deepEqual(res.errors, []);
  assert.deepEqual(res.drifted, []);
  assert.equal(res.synced, mappings.length);
});
