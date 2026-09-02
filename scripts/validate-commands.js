#!/usr/bin/env node
/**
 * validate-commands.js
 *
 * Guards against silent drift across the slash-command directories:
 *   .claude/commands/  (.md   — Claude Code)
 *   commands/          (.toml — Antigravity CLI)
 *
 * This fork does not ship .gemini/commands/, so Gemini CLI is not part of the
 * parity check. Upstream carries that directory; if it is ever added back here,
 * put it back in DIRS and the check picks it up automatically.
 *
 * Checks (errors block CI):
 *   - Every command present in one directory exists in the others
 *   - The 'description' field is identical across equivalents
 *
 * What this does NOT check:
 *   Prompt body differences are intentional — each tool has its own
 *   syntax ($ARGUMENTS, agent-skills: prefixes, GEMINI.md vs CLAUDE.md).
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const DIRS = {
  claude:     { isClaude: true, ext: '.md'   },
  antigravity:{ isClaude: false, ext: '.toml' },
};

// Commands where the file stem differs between Claude and the TOML dirs.
// Key = Claude stem, value = TOML stem. Empty today — the two directories use
// identical stems, and keeping a stale mapping here silently hides a real
// mismatch (an entry for a stem that no longer exists always "resolves").
const NAME_MAP = {};
const NAME_MAP_REVERSE = Object.fromEntries(
  Object.entries(NAME_MAP).map(([k, v]) => [v, k])
);

// ─── Parsers ──────────────────────────────────────────────────────────────────

function descriptionFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match   = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    if (line.slice(0, colonIdx).trim() === 'description') {
      let val = line.slice(colonIdx + 1).trim();
      const isDoubleQuoted = val.startsWith('"') && val.endsWith('"');
      val = val.replace(/^['"]|['"]$/g, '');
      if (isDoubleQuoted) {
        val = val.replace(/\\"/g, '"');
      }
      return val;
    }
  }
  return null;
}

function descriptionFromToml(filePath) {
  const content     = fs.readFileSync(filePath, 'utf8');
  const doubleMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  if (doubleMatch) return doubleMatch[1].replace(/\\"/g, '"');
  const singleMatch = content.match(/^description\s*=\s*'([^']*)'/m);
  return singleMatch ? singleMatch[1] : null;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function loadCommands({ ext, isClaude }) {
  const PLUGINS_DIR = path.join(ROOT, 'plugins');
  if (!fs.existsSync(PLUGINS_DIR)) return {};
  
  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory());
  
  let result = {};
  for (const plugin of plugins) {
    const dir = isClaude 
      ? path.join(PLUGINS_DIR, plugin, '.claude', 'commands')
      : path.join(PLUGINS_DIR, plugin, 'commands');
      
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith(ext));
    for (const f of files) {
      const stem = path.basename(f, ext);
      const full = path.join(dir, f);
      try {
        const desc = ext === '.md' ? descriptionFromMd(full) : descriptionFromToml(full);
        result[stem] = desc;
      } catch (e) {
        console.log(`  ✗  ${stem} — cannot read file: ${e.message}`);
        result[stem] = null;
      }
    }
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const byTool = {
    claude:      loadCommands(DIRS.claude),
    antigravity: loadCommands(DIRS.antigravity),
  };

  // Canonical command list: use Claude stems as the reference.
  // Map each Claude stem to its TOML equivalent for lookup.
  const claudeStems = Object.keys(byTool.claude).sort();
  const allTomlStems = new Set(Object.keys(byTool.antigravity));
  const allCanonicalStems = new Set([
    ...claudeStems,
    ...[...allTomlStems].map(s => NAME_MAP_REVERSE[s] ?? s),
  ]);

  let errors = 0;

  // ── Parity check ────────────────────────────────────────────────────────────
  console.log('Checking command parity...');

  // Commands in Claude not found in TOML dirs
  for (const stem of claudeStems) {
    const tomlStem = NAME_MAP[stem] ?? stem;
    const missing  = [];
    if (!(tomlStem in byTool.antigravity)) missing.push('commands');
    if (missing.length) {
      console.log(`  ✗  ${stem} — missing in: ${missing.join(', ')}`);
      errors++;
    } else {
      console.log(`  ✓  ${stem}${stem !== tomlStem ? ` (${tomlStem} in toml dirs)` : ''}`);
    }
  }

  // Commands in TOML dirs not found in Claude
  for (const stem of [...allTomlStems].sort()) {
    const claudeStem = NAME_MAP_REVERSE[stem] ?? stem;
    if (!(claudeStem in byTool.claude)) {
      console.log(`  ✗  ${stem} — present in toml dirs but missing in .claude/commands`);
      errors++;
    }
  }

  // ── Description sync check ──────────────────────────────────────────────────
  console.log('\nChecking description sync...');

  for (const claudeStem of claudeStems) {
    const tomlStem   = NAME_MAP[claudeStem] ?? claudeStem;
    const descClaude = byTool.claude[claudeStem];
    const descAgy    = byTool.antigravity[tomlStem];

    const malformed = [
      ['.claude/commands', byTool.claude, claudeStem],
      ['commands', byTool.antigravity, tomlStem],
    ].filter(([, commands, stem]) => Object.prototype.hasOwnProperty.call(commands, stem) && commands[stem] == null);

    if (malformed.length) {
      console.log(`  ✗  ${claudeStem}`);
      for (const [toolDir, , stem] of malformed) {
        console.log(`       ${toolDir}/${stem} — missing or malformed description`);
      }
      errors++;
      continue;
    }

    if (descClaude == null || descAgy == null) {
      // Missing file already flagged by parity check
      continue;
    }

    const allMatch = descClaude === descAgy;

    if (allMatch) {
      console.log(`  ✓  ${claudeStem}`);
    } else {
      console.log(`  ✗  ${claudeStem}`);
      console.log(`       .claude:      ${descClaude}`);
      console.log(`       commands/:    ${descAgy}`);
      errors++;
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${allCanonicalStems.size} commands checked — ${errors} error(s) — ${status}`);

  if (errors > 0) process.exit(1);
}

main();
