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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', '..');


// --- Per-issue workspace convention -----------------------------------------

// The artifact roots that belong to a single unit of work (a Jira issue, or a
// module name when reverse-engineering). Every mention of one of these must
// carry a `workspace/{issueKey}/` prefix so BA, QA and DEV read and write the
// same directory for a given issue. Keep in sync with the canonical tree in
// .claude/rules/workspace-paths.md.
//
// Placeholders may be non-ASCII ({tên_file} in qa-code2spec) and skills build
// paths from shell variables (workspace/${ISSUE_KEY}/...), so the segment class
// is Unicode-aware and admits `$` rather than being [A-Za-z0-9].
const PATH_SEGMENT = '[\\p{L}\\p{N}._{}$[\\]-]+';

// The five artifact roots of the canonical layout, and the only directory names
// allowed directly under workspace/<key>/. Keep in sync with the canonical tree
// in .claude/rules/workspace-paths.md.
const WORKSPACE_ROOTS = ['source', 'spec', 'tech', 'test', 'trace'];

// Finds `workspace/<key>/<next>` and captures <next>, so a skill that invents a
// sixth root (workspace/{issueKey}/output/) is caught. Deliberately anchored on
// the literal `workspace/` prefix: after flattening, the roots are generic words
// ("spec", "test", "source") that appear all over ordinary prose, so matching
// them bare would drown real drift in false positives. Regression to the OLD
// layout is caught by LEGACY_PATHS below instead.
const WORKSPACE_CHILD_RE = new RegExp(
  `workspace\\/${PATH_SEGMENT}\\/(${PATH_SEGMENT})`,
  'gu'
);

// Directory names from the pre-flattening layout. These are gone for good: the
// old tree repeated {issueKey} up to three times in one path, nested six levels
// deep, and used `reports/` for two unrelated things. Any reappearance means a
// file was written against the old convention, so fail loudly and name the
// replacement instead of silently accepting a path nothing else resolves.
const LEGACY_PATHS = [
  { re: /specs\/imports/g, hint: 'workspace/{issueKey}/spec/ + source/' },
  { re: /specs\/refine/g, hint: 'workspace/{issueKey}/spec/refined.md' },
  { re: /specs\/code-import/g, hint: 'workspace/{tên_file}/spec/final.md' },
  { re: /tests\/qa-test-design/g, hint: 'workspace/{issueKey}/test/' },
  { re: /docs\/user-stories/g, hint: 'workspace/{issueKey}/spec/user-stories.md' },
  { re: /docs\/gap-analysis/g, hint: 'workspace/{issueKey}/spec/gap-analysis.md' },
  { re: /docs\/backlog/g, hint: 'workspace/{issueKey}/spec/backlog.md' },
  { re: /docs\/processes/g, hint: 'workspace/{issueKey}/spec/process-{as-is|to-be}.md' },
  {
    re: /docs\/stakeholder-interviews/g,
    hint: 'workspace/{issueKey}/spec/stakeholders.md',
  },
];

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

function getPluginFiles() {
  const PLUGINS_DIR = path.join(ROOT, 'plugins');
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  
  const files = [];
  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory());
  for (const plugin of plugins) {
    const pluginDir = path.join('plugins', plugin);
    
    // skills
    const skillsDir = path.join(ROOT, pluginDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory());
      for (const skill of skills) {
        if (fs.existsSync(path.join(skillsDir, skill.name, 'SKILL.md'))) {
          files.push(path.join(pluginDir, 'skills', skill.name, 'SKILL.md'));
        }
      }
    }
    
    // commands
    for (const d of ['commands', '.claude/commands']) {
      const dir = path.join(ROOT, pluginDir, d);
      if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
          if (file.endsWith('.md') || file.endsWith('.toml')) {
            files.push(path.join(pluginDir, d, file));
          }
        }
      }
    }
    
    // agents
    const agentsDir = path.join(ROOT, pluginDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      for (const file of fs.readdirSync(agentsDir)) {
        if (file.endsWith('.md')) {
          files.push(path.join(pluginDir, 'agents', file));
        }
      }
    }
  }
  return files;
}

// Expands WORKSPACE_GUARDED_GLOBS into concrete repo-relative paths. Missing
// directories yield nothing rather than throwing: forks may drop either tree.
function collectWorkspaceGuardedFiles() {
  const files = getPluginFiles();

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
    // Any surviving mention of the old layout, tree lines included.
    for (const { re, hint } of LEGACY_PATHS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        violations.push({
          line: i + 1,
          match: m[0],
          detail: `legacy layout — use ${hint}`,
        });
      }
    }

    if (TREE_CONTINUATION_RE.test(line)) return;

    WORKSPACE_CHILD_RE.lastIndex = 0;
    for (const m of line.matchAll(WORKSPACE_CHILD_RE)) {
      const child = m[1];
      if (child.startsWith('.')) continue; // .pipeline-state.json et al
      if (!WORKSPACE_ROOTS.includes(child)) {
        violations.push({
          line: i + 1,
          match: m[0],
          detail: `"${child}" is not a workspace root (${WORKSPACE_ROOTS.join(', ')})`,
        });
      }
    }
  });
  return violations;
}

function main() {
  console.log('Checking per-issue workspace artifact paths...\n');

  let wsChecked = 0;
  let wsErrors = 0;

  for (const relPath of collectWorkspaceGuardedFiles()) {
    const violations = findWorkspaceViolations(relPath);
    if (violations === null) continue; // file not present, skip
    wsChecked++;

    if (violations.length > 0) {
      console.log(`  ✗  ${relPath}`);
      for (const { line, match, detail } of violations) {
        console.log(`       L${line}: ${match} — ${detail}`);
        wsErrors++;
      }
    }
  }

  const wsStatus = wsErrors > 0 ? 'FAILED' : 'PASSED';
  console.log(`${wsChecked} files checked — ${wsErrors} error(s) — ${wsStatus}`);

  if (wsErrors > 0) {
    console.log('\nPer-issue artifacts live under workspace/{issueKey}/ in exactly five roots:');
    console.log(`  ${WORKSPACE_ROOTS.join('/  ')}/`);
    console.log('See .claude/rules/workspace-paths.md for the canonical tree.');
  }

  if (wsErrors > 0) {
    process.exit(1);
  }
}

main();
