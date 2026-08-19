#!/usr/bin/env node
/**
 * validate-artifact-paths.js
 *
 * Guards the spec -> plan -> build pipeline against silent artifact-path drift.
 *
 * The `/spec` and `/plan` commands (producers) write their artifacts to a set
 * of paths that the `/build` command and the spec/plan skills (consumers) read
 * back. When a producer moves an artifact without updating the consumers — as
 * in PR #93, which pointed `/spec` and `/plan` at docs/features/[name]/ while
 * `/build` still required SPEC.md and tasks/plan.md — the pipeline breaks, and
 * nothing else in CI catches it (command parity only compares descriptions).
 *
 * This validator enforces one canonical set of spec/plan/todo artifact paths
 * across every file in the pipeline. Changing the convention means updating
 * ARTIFACT_ALLOWLIST *and* every guarded file in the same change; CI fails
 * until they agree.
 *
 * It also enforces a second, independent convention: every per-issue artifact
 * root (specs/imports, specs/refine, tests/qa-test-design) must be written
 * under a `workspace/{issueKey}/` prefix. The BA -> QA -> DEV pipeline hands
 * artifacts between personas by path, so a skill that writes to the repo root
 * instead of the issue workspace silently breaks the handoff — as ba-refine
 * did, emitting specs/refine/ while every sibling skill used
 * workspace/{issueKey}/specs/. Nothing else in CI catches that.
 *
 * Scope is deliberately narrow: only spec/plan/todo artifacts, only the files
 * that define the pipeline. It is not a general markdown path linter.
 *
 * Exit codes: 0 = all clear, 1 = one or more drifted paths.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// The canonical spec/plan/todo artifact paths. These are the only artifact
// file paths the pipeline files may reference. To change the convention, edit
// this list and update every guarded file to match — CI enforces the pairing.
const ARTIFACT_ALLOWLIST = new Set([
  'SPEC.md',        // spec, project root (produced by /spec, read by /build)
  'docs/SPEC.md',   // spec, alternate location accepted by /build
  'tasks/plan.md',  // plan (produced by /plan, read by /build)
  'tasks/todo.md',  // task list (produced by /plan)
]);

// The files that make up the spec -> plan -> build pipeline. Absent files are
// skipped, not failed: this validator checks path consistency, not presence.
const GUARDED_FILES = [
  '.claude/commands/spec.md',
  '.claude/commands/plan.md',
  '.claude/commands/build.md',
  'skills/spec-driven-development/SKILL.md',
  'skills/planning-and-task-breakdown/SKILL.md',
  'docs/getting-started.md',
  'docs/adoption-guide.md',
];

// Matches a path-like token ending in a spec/plan/todo artifact filename,
// including an optional directory prefix with bracket placeholders like
// docs/features/[feature-name]/spec.md. Case-insensitive so SPEC.md and a
// drifted spec.md are both caught, then compared against the allowlist.
const ARTIFACT_RE = /(?:[A-Za-z0-9._[\]-]+\/)*(?:spec|plan|todo)\.md/gi;

// --- Per-issue workspace convention -----------------------------------------

// The artifact roots that belong to a single Jira issue. Every mention of one
// of these must carry a `workspace/{issueKey}/` prefix so BA, QA and DEV read
// and write the same directory for a given issue.
const WORKSPACE_ROOT_RE =
  /(?:[A-Za-z0-9._{}[\]-]+\/)*(?:specs\/(?:imports|refine)|tests\/qa-test-design)\//g;

// A match is well-formed when it starts with workspace/<segment>/ — the segment
// is the issue key, either a placeholder ({issueKey}) or a literal (PROJ-123).
const WORKSPACE_PREFIX_RE = /^workspace\/[A-Za-z0-9._{}[\]-]+\//;

// Lines that continue an ASCII directory tree are relative to the root printed
// above them, so their paths are correct without a prefix of their own. The
// tree root itself carries no such marker and is still checked.
const TREE_CONTINUATION_RE = /^\s*[│├└]/;

// Files that define the BA -> QA -> DEV pipeline. Historical analysis and
// proposal docs under docs/ are excluded on purpose: they describe how the
// layout used to look, and rewriting that history would be a lie.
const WORKSPACE_GUARDED_GLOBS = [
  { dir: 'skills', depth: 2, name: 'SKILL.md' },
  { dir: '.claude/commands', depth: 1, ext: '.md' },
  { dir: 'commands', depth: 1, ext: '.toml' },
  { dir: 'agents', depth: 1, ext: '.md' },
];
const WORKSPACE_GUARDED_EXTRA = [
  'CLAUDE.md',
  'docs/ba-workflow-detail.md',
  'docs/test-ownership.md',
];

// Expands WORKSPACE_GUARDED_GLOBS into concrete repo-relative paths. Missing
// directories yield nothing rather than throwing: forks may drop either tree.
function collectWorkspaceGuardedFiles() {
  const files = [];

  for (const glob of WORKSPACE_GUARDED_GLOBS) {
    const base = path.join(ROOT, glob.dir);
    if (!fs.existsSync(base)) continue;

    if (glob.depth === 2) {
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(glob.dir, entry.name, glob.name);
        if (fs.existsSync(path.join(ROOT, candidate))) files.push(candidate);
      }
    } else {
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(glob.ext)) {
          files.push(path.join(glob.dir, entry.name));
        }
      }
    }
  }

  for (const extra of WORKSPACE_GUARDED_EXTRA) {
    if (fs.existsSync(path.join(ROOT, extra))) files.push(extra);
  }

  return files.sort();
}

function findWorkspaceViolations(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null; // skipped

  const violations = [];
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (TREE_CONTINUATION_RE.test(line)) return;
    const matches = line.match(WORKSPACE_ROOT_RE);
    if (!matches) return;
    for (const match of matches) {
      if (!WORKSPACE_PREFIX_RE.test(match)) {
        violations.push({ line: i + 1, match });
      }
    }
  });
  return violations;
}

function findViolations(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null; // skipped

  const violations = [];
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const matches = line.match(ARTIFACT_RE);
    if (!matches) return;
    for (const match of matches) {
      if (!ARTIFACT_ALLOWLIST.has(match)) {
        violations.push({ line: i + 1, match });
      }
    }
  });
  return violations;
}

function main() {
  console.log('Checking spec/plan/todo artifact paths...\n');

  let checked = 0;
  let errors = 0;

  for (const relPath of GUARDED_FILES) {
    const violations = findViolations(relPath);
    if (violations === null) continue; // file not present, skip
    checked++;

    if (violations.length === 0) {
      console.log(`  ✓  ${relPath}`);
    } else {
      console.log(`  ✗  ${relPath}`);
      for (const { line, match } of violations) {
        console.log(`       L${line}: ${match} — not an approved spec/plan/todo artifact path`);
        errors++;
      }
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${checked} files checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    console.log('\nThe spec -> plan -> build pipeline expects one set of artifact paths.');
    console.log('Either use a path from ARTIFACT_ALLOWLIST, or change the convention');
    console.log('across every guarded file and update the allowlist in the same change.');
  }

  console.log('\nChecking per-issue workspace artifact paths...\n');

  let wsChecked = 0;
  let wsErrors = 0;

  for (const relPath of collectWorkspaceGuardedFiles()) {
    const violations = findWorkspaceViolations(relPath);
    if (violations === null) continue; // file not present, skip
    wsChecked++;

    if (violations.length > 0) {
      console.log(`  ✗  ${relPath}`);
      for (const { line, match } of violations) {
        console.log(`       L${line}: ${match} — missing workspace/{issueKey}/ prefix`);
        wsErrors++;
      }
    }
  }

  const wsStatus = wsErrors > 0 ? 'FAILED' : 'PASSED';
  console.log(`${wsChecked} files checked — ${wsErrors} error(s) — ${wsStatus}`);

  if (wsErrors > 0) {
    console.log('\nPer-issue artifacts live under workspace/{issueKey}/ so BA, QA and DEV');
    console.log('resolve the same directory for an issue. Prefix the path, or exclude the');
    console.log('file from WORKSPACE_GUARDED_GLOBS if it documents a historical layout.');
  }

  if (errors > 0 || wsErrors > 0) {
    process.exit(1);
  }
}

main();
