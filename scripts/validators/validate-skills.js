#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * CLI that validates every skill in skills/ against the rules in
 * docs/skill-anatomy.md. The rules themselves live in scripts/lib/skill-lint.js
 * (a single source of truth, importable and unit-testable); this file is a thin
 * wrapper that walks the skills directory, runs the linter, prints the report,
 * and sets the exit code.
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { lintSkill } from '../lib/skill-lint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.resolve(__dirname, '..', '..', 'plugins');


// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`ERROR: plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory());
  
  let allSkillDirs = [];
  let skillToPathMap = new Map();
  
  for (const plugin of plugins) {
    const skillsDir = path.join(PLUGINS_DIR, plugin, 'skills');
    if (fs.existsSync(skillsDir)) {
      const skillsInPlugin = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory());
      for (const skill of skillsInPlugin) {
        allSkillDirs.push(skill);
        skillToPathMap.set(skill, skillsDir);
      }
    }
  }

  allSkillDirs.sort();
  const knownSkills = new Set(allSkillDirs);

  let totalErrors   = 0;
  let totalWarnings = 0;

  for (const dirName of allSkillDirs) {
    const skillsDir = skillToPathMap.get(dirName);
    const { errors, warnings, exempt } = lintSkill(dirName, skillsDir, knownSkills);
    totalErrors   += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      const tag = exempt ? ' (section checks exempt)' : '';
      console.log(`  ✓  ${dirName}${tag}`);
    } else {
      const icon = errors.length > 0 ? '  ✗ ' : '  ⚠ ';
      console.log(`${icon} ${dirName}`);
      for (const msg of errors)   console.log(`       ERROR: ${msg}`);
      for (const msg of warnings) console.log(`       WARN:  ${msg}`);
    }
  }

  const status = totalErrors > 0 ? 'FAILED' : totalWarnings > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
  console.log(`\n${allSkillDirs.length} skills checked — ${totalErrors} error(s), ${totalWarnings} warning(s) — ${status}`);

  if (totalErrors > 0) process.exit(1);
}

// Surface unexpected failures (fs errors, bad symlinks, …) as a structured
// one-line CI error instead of an uncaught stack trace.
try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-skills failed unexpectedly: ${err.message}`);
  process.exit(1);
}
