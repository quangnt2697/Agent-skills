#!/usr/bin/env node
/**
 * build-commands.js
 * 
 * Auto-generates `.claude/commands/*.md` from `commands/*.toml` inside each plugin.
 * Reads `description` and `prompt` from the TOML file and creates a markdown file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.resolve(__dirname, '..', 'plugins');

function parseToml(content) {
  try {
    const data = parse(content);
    return {
      description: typeof data.description === 'string' ? data.description : '',
      prompt: typeof data.prompt === 'string' ? data.prompt.trim() : ''
    };
  } catch (err) {
    console.error(`Error parsing TOML: ${err.message}`);
    return { description: '', prompt: '' };
  }
}

function processPlugin(pluginDir) {
  const commandsDir = path.join(pluginDir, 'commands');
  const outDir = path.join(pluginDir, '.claude', 'commands');
  
  if (!fs.existsSync(commandsDir)) return;
  
  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.toml'));
  
  for (const file of files) {
    const tomlPath = path.join(commandsDir, file);
    const mdName = file.replace('.toml', '.md');
    const mdPath = path.join(outDir, mdName);
    
    const content = fs.readFileSync(tomlPath, 'utf8');
    const { description, prompt } = parseToml(content);
    
    if (!prompt) {
      console.warn(`Warning: No prompt found in ${tomlPath}`);
      continue;
    }
    
    const mdContent = `---
description: "${description.replace(/"/g, '\\"') || 'Command auto-generated from TOML'}"
---

${prompt}
`;
    
    fs.writeFileSync(mdPath, mdContent);
    console.log(`Generated ${mdPath}`);
  }
}

function main() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`ERROR: plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }
  
  const plugins = fs.readdirSync(PLUGINS_DIR).filter(d => {
    return fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory();
  });
  
  for (const plugin of plugins) {
    processPlugin(path.join(PLUGINS_DIR, plugin));
  }
  
  console.log('Command build complete.');
}

main();
