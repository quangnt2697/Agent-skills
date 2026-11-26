#!/usr/bin/env node

/**
 * Cài / gỡ agent-skills cho OpenAI Codex CLI & App ở phạm vi user (mọi project trên máy).
 *
 * Cách dùng:
 *   node scripts/setup/setup-codex.js            # Cài đầy đủ (31 skills + AGENTS.md + AGENT_SKILLS_HOME + 6 Agent Roles + hooks.json)
 *   node scripts/setup/setup-codex.js --no-hooks # Chỉ cài skills + AGENTS.md + AGENT_SKILLS_HOME (bỏ qua hooks.json & agent roles)
 *   node scripts/setup/setup-codex.js --unlink   # Gỡ toàn bộ cấu hình của agent-skills khỏi ~/.codex/
 *
 * <codex-home> là $CODEX_HOME nếu có, mặc định ~/.codex.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_KEY = 'AGENT_SKILLS_HOME';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = fs.realpathSync(path.resolve(__dirname, '..', '..'));
const pluginsDir = path.join(projectRoot, 'plugins');
const codexAgentsDir = path.join(projectRoot, 'config', 'codex', 'agents');
const codexHooksDir = path.join(projectRoot, '.agents', 'hooks', 'codex');

const CODEX_AGENT_ROLES = [
  { key: 'ba_po', file: 'ba-po.toml', description: 'Chuyên gia Phân tích Nghiệp vụ & Product Owner (Tier 2 Artifact-Only)' },
  { key: 'qa', file: 'qa.toml', description: 'Kỹ sư Tự động hóa Kiểm thử QA/SDET (Tier 2/3)' },
  { key: 'code_reviewer', file: 'code-reviewer.toml', description: 'Kỹ sư Review Code & Chất lượng (Tier 1 Read-Only)' },
  { key: 'security_auditor', file: 'security-auditor.toml', description: 'Kỹ sư Kiểm toán Bảo mật OWASP (Tier 1 Read-Only)' },
  { key: 'webperf_auditor', file: 'webperf-auditor.toml', description: 'Kỹ sư Kiểm toán Hiệu năng Web Core Vitals (Tier 1 Read-Only)' },
  { key: 'scrum_master', file: 'scrum-master.toml', description: 'Scrum Master điều phối Sprint, Daily Standup & Impediment (Tier 2 Artifact-Only)' },
];

function resolveCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function shQuote(value) {
  return `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;
}

function backupOnce(filePath) {
  const backup = `${filePath}.agent-skills.bak`;
  if (fs.existsSync(filePath) && !fs.existsSync(backup)) {
    fs.copyFileSync(filePath, backup);
  }
}

function writeAtomic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function collectSkills() {
  const skills = [];
  if (!fs.existsSync(pluginsDir)) return skills;

  for (const plugin of fs.readdirSync(pluginsDir).sort()) {
    const skillsDir = path.join(pluginsDir, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;
    for (const skillName of fs.readdirSync(skillsDir).sort()) {
      const skillPath = path.join(skillsDir, skillName);
      if (fs.statSync(skillPath).isDirectory() && fs.existsSync(path.join(skillPath, 'SKILL.md'))) {
        skills.push({ plugin, name: skillName, targetPath: skillPath });
      }
    }
  }
  return skills;
}

function sameTarget(linkPath, expectedTarget) {
  try {
    return fs.realpathSync(linkPath) === fs.realpathSync(expectedTarget);
  } catch {
    return false;
  }
}

function isInsideRepo(p) {
  try {
    const real = fs.realpathSync(p);
    return real === projectRoot || real.startsWith(projectRoot + path.sep);
  } catch {
    return p === projectRoot || p.startsWith(projectRoot + path.sep);
  }
}

// Tách config.toml thành mảng blocks: preamble (trước header đầu tiên) + các { header, name, lines }
function splitTomlSections(content) {
  const lines = content ? content.split(/\r?\n/) : [];
  const preamble = [];
  const sections = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^\s*\[([^\[\]]+)\]\s*(?:#.*)?$/);
    if (m) {
      current = { name: m[1].trim(), headerLine: line, bodyLines: [] };
      sections.push(current);
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, sections };
}

function serializeTomlSections({ preamble, sections }) {
  const outLines = [...preamble];
  for (const sec of sections) {
    while (outLines.length > 0 && outLines[outLines.length - 1].trim() === '') {
      outLines.pop();
    }
    if (outLines.length > 0) outLines.push('');
    outLines.push(sec.headerLine);
    outLines.push(...sec.bodyLines);
  }
  while (outLines.length > 0 && outLines[outLines.length - 1].trim() === '') {
    outLines.pop();
  }
  return outLines.length > 0 ? outLines.join('\n') + '\n' : '';
}

function upsertSectionKey(section, key, tomlValue, preserveExisting = false) {
  const keyRe = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  const idx = section.bodyLines.findIndex(l => keyRe.test(l));
  if (idx !== -1) {
    if (!preserveExisting) {
      section.bodyLines[idx] = `${key} = ${tomlValue}`;
    }
    return;
  }
  let insertAt = section.bodyLines.length;
  while (insertAt > 0 && section.bodyLines[insertAt - 1].trim() === '') {
    insertAt--;
  }
  section.bodyLines.splice(insertAt, 0, `${key} = ${tomlValue}`);
}

function removeSectionKey(section, key) {
  const keyRe = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  section.bodyLines = section.bodyLines.filter(l => !keyRe.test(l));
}

function hasAnyKeyValue(section) {
  return section.bodyLines.some(l => {
    const t = l.trim();
    return t !== '' && !t.startsWith('#');
  });
}

function extractTomlStringField(section, key) {
  const keyRe = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(.+?)\\s*(?:#.*)?$`);
  for (const line of section.bodyLines) {
    const m = line.match(keyRe);
    if (m) {
      try { return JSON.parse(m[1]); } catch { return m[1].replace(/^['"]|['"]$/g, ''); }
    }
  }
  return null;
}

function ensureSection(sections, name) {
  let sec = sections.find(s => s.name === name);
  if (!sec) {
    sec = { name, headerLine: `[${name}]`, bodyLines: [] };
    sections.push(sec);
  }
  return sec;
}

function updateConfigToml(configPath, { remove = false, includeHooksAndAgents = true } = {}) {
  const exists = fs.existsSync(configPath);
  const content = exists ? fs.readFileSync(configPath, 'utf8') : '';
  if (remove && !exists) return 'skip';

  const parsed = splitTomlSections(content);

  if (remove) {
    const setSec = parsed.sections.find(s => s.name === 'shell_environment_policy.set');
    if (setSec) {
      removeSectionKey(setSec, ENV_KEY);
      if (!hasAnyKeyValue(setSec)) {
        parsed.sections = parsed.sections.filter(s => s !== setSec);
      }
    }

    const swwSec = parsed.sections.find(s => s.name === 'sandbox_workspace_write');
    if (swwSec) {
      removeSectionKey(swwSec, 'network_access');
      if (!hasAnyKeyValue(swwSec)) {
        parsed.sections = parsed.sections.filter(s => s !== swwSec);
      }
    }

    const managedSections = new Set(CODEX_AGENT_ROLES.map(r => `agents.${r.key}`));
    parsed.sections = parsed.sections.filter(sec => {
      if (!managedSections.has(sec.name)) return true;
      const cfg = extractTomlStringField(sec, 'config_file');
      return !(cfg && isInsideRepo(cfg));
    });

    const next = serializeTomlSections(parsed);
    if (next !== content) {
      backupOnce(configPath);
      if (next === '') {
        fs.rmSync(configPath, { force: true });
      } else {
        writeAtomic(configPath, next);
      }
      return 'removed';
    }
    return 'skip';
  }

  const setSec = ensureSection(parsed.sections, 'shell_environment_policy.set');
  upsertSectionKey(setSec, ENV_KEY, JSON.stringify(projectRoot), false);

  // Bật network_access trong sandbox workspace-write để Agent gọi được localhost:5678 (n8n) & 127.0.0.1:5680 (Host Bridge)
  // giúp chạy Playwright tự động trên Host mà không cần xin nâng lên quyền danger-full-access ("Full access")
  const swwSec = ensureSection(parsed.sections, 'sandbox_workspace_write');
  upsertSectionKey(swwSec, 'network_access', 'true', true);

  if (includeHooksAndAgents) {
    const featuresSec = ensureSection(parsed.sections, 'features');
    upsertSectionKey(featuresSec, 'hooks', 'true', true);
    upsertSectionKey(featuresSec, 'multi_agent', 'true', true);

    for (const role of CODEX_AGENT_ROLES) {
      const agentToml = path.join(codexAgentsDir, role.file);
      if (!fs.existsSync(agentToml)) continue;
      const secName = `agents.${role.key}`;
      const existing = parsed.sections.find(s => s.name === secName);
      if (existing) {
        const existingCfg = extractTomlStringField(existing, 'config_file');
        if (existingCfg && !isInsideRepo(existingCfg)) {
          continue; // Bảo vệ custom role do user tự khai báo ngoài repo
        }
      }
      const sec = ensureSection(parsed.sections, secName);
      upsertSectionKey(sec, 'description', JSON.stringify(role.description), false);
      upsertSectionKey(sec, 'config_file', JSON.stringify(agentToml), false);
    }
  }

  const next = serializeTomlSections(parsed);
  if (exists && next === content) return 'unchanged';
  if (exists) backupOnce(configPath);
  writeAtomic(configPath, next);
  return exists ? 'updated' : 'added';
}

function buildManagedHooksSpec() {
  const wrapCmd = (scriptName) => {
    const scriptPath = path.join(codexHooksDir, scriptName);
    return `${ENV_KEY}=${shQuote(projectRoot)} bash ${shQuote(scriptPath)}`;
  };
  return {
    SessionStart: [{
      matcher: '.*',
      hooks: [{ type: 'command', command: wrapCmd('session-start.sh'), timeout: 10 }],
    }],
    PreToolUse: [{
      matcher: '.*',
      hooks: [{ type: 'command', command: wrapCmd('pre-tool-guard.sh'), timeout: 10 }],
    }],
    PostToolUse: [{
      matcher: '.*',
      hooks: [{ type: 'command', command: wrapCmd('post-tool-guard.sh'), timeout: 10 }],
    }],
    Stop: [{
      hooks: [{ type: 'command', command: wrapCmd('session-end.sh'), timeout: 10 }],
    }],
  };
}

function isManagedHookEntry(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some(h => {
    if (!h || typeof h.command !== 'string') return false;
    return h.command.includes(codexHooksDir) || h.command.includes(`${ENV_KEY}=${shQuote(projectRoot)}`);
  });
}

function updateHooksJson(hooksPath, { remove = false } = {}) {
  const exists = fs.existsSync(hooksPath);
  if (remove && !exists) return 'skip';

  let data = {};
  if (exists) {
    try {
      data = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    } catch (err) {
      console.error(`❌ ${hooksPath} không phải JSON hợp lệ (${err.message}). Sửa file rồi chạy lại — script không ghi đè.`);
      process.exit(1);
    }
  }

  const hooksObj = (data.hooks && typeof data.hooks === 'object' && !Array.isArray(data.hooks)) ? { ...data.hooks } : {};

  if (remove) {
    let changed = false;
    for (const [ev, list] of Object.entries(hooksObj)) {
      if (!Array.isArray(list)) continue;
      const filtered = list.filter(item => !isManagedHookEntry(item));
      if (filtered.length !== list.length) {
        changed = true;
        if (filtered.length === 0) delete hooksObj[ev];
        else hooksObj[ev] = filtered;
      }
    }
    if (!changed) return 'skip';
    backupOnce(hooksPath);
    const nextData = { ...data, hooks: hooksObj };
    if (Object.keys(hooksObj).length === 0 && Object.keys(nextData).length === 1) {
      fs.rmSync(hooksPath, { force: true });
    } else {
      writeAtomic(hooksPath, `${JSON.stringify(nextData, null, 2)}\n`);
    }
    return 'removed';
  }

  const spec = buildManagedHooksSpec();
  for (const [ev, entries] of Object.entries(spec)) {
    const existingList = Array.isArray(hooksObj[ev]) ? hooksObj[ev].filter(item => !isManagedHookEntry(item)) : [];
    hooksObj[ev] = [...existingList, ...entries];
  }

  const nextData = { ...data, hooks: hooksObj };
  const nextJson = `${JSON.stringify(nextData, null, 2)}\n`;
  if (exists && fs.readFileSync(hooksPath, 'utf8') === nextJson) {
    return 'unchanged';
  }
  if (exists) backupOnce(hooksPath);
  writeAtomic(hooksPath, nextJson);
  return exists ? 'updated' : 'added';
}

function install(codexHome, { withHooksAndAgents = true } = {}) {
  const skillsDest = path.join(codexHome, 'skills');
  fs.mkdirSync(skillsDest, { recursive: true });

  const skills = collectSkills();
  let linked = 0;
  let kept = 0;
  const skipped = [];

  for (const s of skills) {
    const linkPath = path.join(skillsDest, s.name);
    const lstat = fs.lstatSync(linkPath, { throwIfNoEntry: false });

    if (lstat) {
      if (lstat.isSymbolicLink() && sameTarget(linkPath, s.targetPath)) {
        kept++;
        continue;
      }
      if (lstat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else {
        skipped.push(s.name);
        continue;
      }
    }

    fs.symlinkSync(s.targetPath, linkPath, 'dir');
    linked++;
  }

  const configPath = path.join(codexHome, 'config.toml');
  const envState = updateConfigToml(configPath, { remove: false, includeHooksAndAgents: withHooksAndAgents });

  let hooksState = 'skipped (--no-hooks)';
  if (withHooksAndAgents) {
    const hooksPath = path.join(codexHome, 'hooks.json');
    hooksState = `${updateHooksJson(hooksPath, { remove: false })} -> ${hooksPath}`;
  }

  // Symlink global AGENTS.md vào ~/.codex/AGENTS.md để mọi project khác cũng nhận quy tắc hệ thống
  const srcAgentsMd = path.join(projectRoot, 'AGENTS.md');
  const dstAgentsMd = path.join(codexHome, 'AGENTS.md');
  let agentsState = 'skip';
  if (fs.existsSync(srcAgentsMd)) {
    try {
      const st = fs.lstatSync(dstAgentsMd, { throwIfNoEntry: false });
      if (st && st.isSymbolicLink() && sameTarget(dstAgentsMd, srcAgentsMd)) {
        agentsState = 'up-to-date';
      } else if (!st || st.isSymbolicLink()) {
        if (st) fs.unlinkSync(dstAgentsMd);
        fs.symlinkSync(srcAgentsMd, dstAgentsMd, 'file');
        agentsState = 'linked';
      } else {
        agentsState = 'skipped (existing non-symlink file)';
      }
    } catch (err) {
      agentsState = `error (${err.message})`;
    }
  }

  console.log(`Codex home: ${codexHome}`);
  console.log(`Skills: ${linked} created, ${kept} up-to-date (total ${skills.length})`);
  if (skipped.length > 0) {
    console.warn(`Skipped existing non-symlink dirs: ${skipped.join(', ')}`);
  }
  console.log(`AGENTS.md: ${agentsState} -> ${dstAgentsMd}`);
  console.log(`config.toml (${ENV_KEY}${withHooksAndAgents ? ' + 6 agents' : ''}): ${envState} -> ${configPath}`);
  console.log(`hooks.json: ${hooksState}`);
}

function unlink(codexHome) {
  const skillsDest = path.join(codexHome, 'skills');
  let removed = 0;

  if (fs.existsSync(skillsDest)) {
    for (const entry of fs.readdirSync(skillsDest)) {
      const p = path.join(skillsDest, entry);
      try {
        const lstat = fs.lstatSync(p);
        if (lstat.isSymbolicLink() && isInsideRepo(p)) {
          fs.unlinkSync(p);
          removed++;
        }
      } catch {
        // ignore broken entry
      }
    }
  }

  const dstAgentsMd = path.join(codexHome, 'AGENTS.md');
  let agentsRemoved = false;
  try {
    const st = fs.lstatSync(dstAgentsMd, { throwIfNoEntry: false });
    if (st && st.isSymbolicLink() && isInsideRepo(dstAgentsMd)) {
      fs.unlinkSync(dstAgentsMd);
      agentsRemoved = true;
    }
  } catch {
    // ignore
  }

  const configPath = path.join(codexHome, 'config.toml');
  const envState = updateConfigToml(configPath, { remove: true });

  const hooksPath = path.join(codexHome, 'hooks.json');
  const hooksState = updateHooksJson(hooksPath, { remove: true });

  console.log(`Unlinked ${removed} Codex skill symlinks from ${skillsDest}`);
  console.log(`AGENTS.md: ${agentsRemoved ? 'unlinked' : 'kept/not found'}`);
  console.log(`config.toml: ${envState}`);
  console.log(`hooks.json: ${hooksState}`);
}

const isUnlink = process.argv.includes('--unlink');
const noHooks = process.argv.includes('--no-hooks');
const codexHome = resolveCodexHome();

if (isUnlink) {
  unlink(codexHome);
} else {
  install(codexHome, { withHooksAndAgents: !noHooks });
}
