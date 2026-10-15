#!/usr/bin/env node

"use strict";

/**
 * validate-versions.js
 *
 * Checks that every plugin manifest in the repo declares the same version.
 *
 * This is a fork of addyosmani/agent-skills. Its git tags come from upstream,
 * so the fork's own version (plugin.json) legitimately differs from the latest
 * tag — comparing against `git describe --tags` would fail forever by design.
 * What still matters is that the manifests do not drift from each other: a tool
 * reading .claude-plugin/plugin.json must not see a different version from one
 * reading plugin.json.
 *
 * Manifests that are absent are skipped (not every distribution channel ships
 * in every fork), as are manifests that carry no version field at all.
 *
 * Exit codes: 0 = all manifests agree, 1 = drift detected
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";


const MANIFEST_PATHS = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "plugins/ba-po/plugin.json",
  "plugins/code-reviewer/plugin.json",
  "plugins/core/plugin.json",
  "plugins/qa/plugin.json",
  "plugins/scrum-master/plugin.json",
  "plugins/fintech-data/plugin.json",
];

function readManifestVersion(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.version ?? manifest.plugins?.[0]?.version;
}

/**
 * Collect {path, version} for every manifest that exists and declares a version.
 * Pure apart from the reads, so the test can exercise it against fixtures.
 */
function collectVersions(paths = MANIFEST_PATHS, root = "") {
  const found = [];
  for (const manifestPath of paths) {
    const full = root ? `${root}/${manifestPath}` : manifestPath;
    if (!existsSync(full)) continue;
    const version = readManifestVersion(full);
    if (version === undefined) continue;
    found.push({ path: manifestPath, version });
  }
  return found;
}

/**
 * Returns an error string when manifests disagree, or null when they agree
 * (including the vacuous case of fewer than two versioned manifests).
 */
function checkVersionConsistency(found) {
  if (found.length === 0) return "No versioned plugin manifest found.";
  const versions = new Set(found.map(f => f.version));
  if (versions.size === 1) return null;
  const detail = found.map(f => `  ${f.path}: ${f.version}`).join("\n");
  return `Plugin manifests declare different versions:\n${detail}`;
}

function main() {
  const found = collectVersions();
  const error = checkVersionConsistency(found);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(
    `All ${found.length} plugin manifest(s) use version ${found[0].version}.`,
  );
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return existsSync(process.argv[1]) && readFileSync && (process.argv[1] === fileURLToPath(import.meta.url) || fsRealpath(process.argv[1]) === fsRealpath(fileURLToPath(import.meta.url)));
  } catch {
    return process.argv[1] === fileURLToPath(import.meta.url);
  }
}

import { realpathSync as fsRealpath } from "node:fs";

if (isMain()) main();

export { collectVersions, checkVersionConsistency, MANIFEST_PATHS };


