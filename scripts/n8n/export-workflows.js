#!/usr/bin/env node

/**
 * n8n Workflow Exporter with Category Routing
 *
 * Xuất toàn bộ workflows từ n8n instance và phân loại chính xác vào các thư mục con:
 * - n8n-workflows/atlassian/
 * - n8n-workflows/data-recon/
 * - n8n-workflows/ops/
 * - n8n-workflows/qa-squash/
 *
 * Khắc phục triệt để lỗi ghi đè toàn bộ workflows vào n8n-workflows/ops/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const workflowsRoot = path.join(projectRoot, 'n8n-workflows');
const tempExportDir = path.join(workflowsRoot, '.tmp-export');

const CATEGORIES = ['atlassian', 'data-recon', 'ops', 'qa-squash'];

function buildExistingCatalog() {
  const map = new Map(); // key: id or filename -> relativePath
  for (const cat of CATEGORIES) {
    const dir = path.join(workflowsRoot, cat);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content.id) map.set(`id:${content.id}`, { cat, file, fullPath });
        if (content.name) map.set(`name:${content.name.toLowerCase()}`, { cat, file, fullPath });
      } catch {
        // ignore parse errors
      }
      map.set(`file:${file}`, { cat, file, fullPath });
    }
  }
  return map;
}

function resolveCategory(filename, workflowJson, catalog) {
  if (workflowJson.id && catalog.has(`id:${workflowJson.id}`)) {
    return catalog.get(`id:${workflowJson.id}`);
  }
  if (workflowJson.name && catalog.has(`name:${workflowJson.name.toLowerCase()}`)) {
    return catalog.get(`name:${workflowJson.name.toLowerCase()}`);
  }
  if (catalog.has(`file:${filename}`)) {
    return catalog.get(`file:${filename}`);
  }

  // Heuristic matching based on name / filename
  const str = `${filename} ${workflowJson.name || ''}`.toLowerCase();
  if (/jira|confluence|atlassian|spec-push/.test(str)) {
    return { cat: 'atlassian', file: filename };
  }
  if (/recon|metabase|timescale|securities|mdds/.test(str)) {
    return { cat: 'data-recon', file: filename };
  }
  if (/squash|qa|test-runner|locator/.test(str)) {
    return { cat: 'qa-squash', file: filename };
  }
  return { cat: 'ops', file: filename };
}

function main() {
  console.log('🔄 Đang xuất workflows từ n8n với Category Routing...');

  if (fs.existsSync(tempExportDir)) {
    fs.rmSync(tempExportDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExportDir, { recursive: true });

  for (const cat of CATEGORIES) {
    fs.mkdirSync(path.join(workflowsRoot, cat), { recursive: true });
  }

  const catalog = buildExistingCatalog();

  try {
    execSync(`n8n export:workflow --all --separate --output="${tempExportDir}"`, {
      stdio: 'pipe',
      encoding: 'utf8'
    });
  } catch (err) {
    // If n8n CLI is not active or offline, warn cleanly
    if (err.message.includes('command not found') || err.message.includes('ENOENT')) {
      console.warn('⚠️  Lệnh n8n không có sẵn trên hệ thống. Bỏ qua export.');
      fs.rmSync(tempExportDir, { recursive: true, force: true });
      return;
    }
    console.warn(`⚠️  n8n export gặp lỗi (${err.message.split('\n')[0]}). Kiểm tra trạng thái n8n.`);
    fs.rmSync(tempExportDir, { recursive: true, force: true });
    return;
  }

  const exportedFiles = fs.readdirSync(tempExportDir).filter(f => f.endsWith('.json'));
  if (exportedFiles.length === 0) {
    console.log('ℹ️  Không có workflow nào được xuất.');
    fs.rmSync(tempExportDir, { recursive: true, force: true });
    return;
  }

  const summary = { atlassian: 0, 'data-recon': 0, ops: 0, 'qa-squash': 0 };

  for (const file of exportedFiles) {
    const srcPath = path.join(tempExportDir, file);
    let workflowJson = {};
    try {
      workflowJson = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    } catch {
      // ignore
    }

    const { cat, file: targetFilename } = resolveCategory(file, workflowJson, catalog);
    const destPath = path.join(workflowsRoot, cat, targetFilename);

    fs.copyFileSync(srcPath, destPath);
    summary[cat] = (summary[cat] || 0) + 1;
  }

  fs.rmSync(tempExportDir, { recursive: true, force: true });

  console.log('✅ Đã xuất và phân loại thành công các workflows:');
  for (const [cat, count] of Object.entries(summary)) {
    console.log(`   - ${cat}/: ${count} workflows`);
  }
}

main();
