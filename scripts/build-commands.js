#!/usr/bin/env node
/**
 * build-commands.js
 * 
 * Auto-generates `.claude/commands/*.md` from `commands/*.toml` inside each plugin.
 * Reads `description` and `prompt` from the TOML file and creates a markdown file.
 */

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.resolve(__dirname, '..', 'plugins');

function parseToml(content) {
  // Simple TOML parser for this specific use case
  const result = {
    description: '',
    prompt: ''
  };
  
  const doubleMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  if (doubleMatch) {
    result.description = doubleMatch[1].replace(/\\"/g, '"');
  } else {
    const singleMatch = content.match(/^description\s*=\s*'([^']*)'/m);
    if (singleMatch) {
      result.description = singleMatch[1];
    }
  }
  
  // Try to find prompt as a multi-line string ''' or """
  const promptMultiMatch = content.match(/prompt\s*=\s*('''|""")([\s\S]*?)\1/);
  if (promptMultiMatch) {
    result.prompt = promptMultiMatch[2].trim();
  } else {
    // Try single line string
    const promptSingleMatch = content.match(/prompt\s*=\s*(['"])(.*?)\1/);
    if (promptSingleMatch) {
      result.prompt = promptSingleMatch[2];
    }
  }
  
  return result;
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
