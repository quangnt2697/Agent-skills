#!/usr/bin/env node

/**
 * Script Đồng Bộ Node Scripts vào Workflow JSON (`scripts/sync-n8n-nodes.js`)
 *
 * Đọc mã nguồn sạch từ các file .js trong scripts/n8n-nodes/ và nhúng vào
 * các node Code ("jsCode") trong n8n-workflows/*.json.
 * Ngăn ngừa vĩnh viễn tình trạng Code Drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const mappings = [
  {
    workflowFile: 'n8n-workflows/qa-run-test-workflow.json',
    nodeName: 'Extract issueKey',
    nodeId: 'code-extract-issuekey',
    scriptFile: 'scripts/n8n-nodes/qa-extract-issuekey.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-run-test-workflow.json',
    nodeName: 'Run Pytest',
    nodeId: 'execute-command',
    scriptFile: 'scripts/n8n-nodes/qa-run-pytest.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-run-test-workflow.json',
    nodeName: 'Format Result',
    nodeId: 'code-format-result',
    scriptFile: 'scripts/n8n-nodes/qa-format-result.js'
  },
  {
    workflowFile: 'n8n-workflows/mattermost-single-router.json',
    nodeName: 'Parse AI Output',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/router-parse-ai-output.js'
  },
  {
    workflowFile: 'n8n-workflows/squash-batch-pusher.json',
    nodeName: 'Execute Squash Push Engine',
    nodeId: '5',
    scriptFile: 'scripts/n8n-nodes/squash-push-engine.js'
  },
  {
    workflowFile: 'n8n-workflows/squash-batch-pusher.json',
    nodeName: 'Format Squash Report Markdown',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/squash-format-report.js'
  },
  {
    workflowFile: 'n8n-workflows/metabase-query-executor.json',
    nodeName: 'Prepare & Sanitize Query',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/metabase-prepare-query.js'
  },
  {
    workflowFile: 'n8n-workflows/metabase-query-executor.json',
    nodeName: 'Normalize & Format Response',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/metabase-normalize-response.js'
  },
  {
    workflowFile: 'n8n-workflows/jira-fast-ingestor.json',
    nodeName: 'Prepare Jira Request',
    nodeId: 'prep-jira',
    scriptFile: 'scripts/n8n-nodes/jira-prepare-request.js'
  },
  {
    workflowFile: 'n8n-workflows/jira-fast-ingestor.json',
    nodeName: 'Filter & Clean Payload',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/jira-clean-payload.js'
  },
  {
    workflowFile: 'n8n-workflows/jira-spec-pusher.json',
    nodeName: 'Pre-flight Gate & ADF Converter',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/jira-push-preflight.js'
  },
  {
    workflowFile: 'n8n-workflows/jira-spec-pusher.json',
    nodeName: 'Format Response & Audit',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/jira-push-format-response.js'
  },
  {
    workflowFile: 'n8n-workflows/sm-daily-standup-cron.json',
    nodeName: 'Prepare Standup Request',
    nodeId: 'prep-standup',
    scriptFile: 'scripts/n8n-nodes/sm-prepare-standup.js'
  },
  {
    workflowFile: 'n8n-workflows/db-mdds-recon-watchdog.json',
    nodeName: 'Prepare Watchdog Query',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/watchdog-prepare-query.js'
  },
  {
    workflowFile: 'n8n-workflows/db-mdds-recon-watchdog.json',
    nodeName: 'Verify Health & Parity',
    nodeId: '5',
    scriptFile: 'scripts/n8n-nodes/watchdog-verify-health.js'
  }
];

console.log('🔄 Đang đồng bộ các node script vào n8n workflows...');

let syncedCount = 0;
const cache = new Map();

for (const item of mappings) {
  const workflowPath = path.join(projectRoot, item.workflowFile);
  const scriptPath = path.join(projectRoot, item.scriptFile);

  if (!fs.existsSync(workflowPath)) {
    console.error(`❌ Không tìm thấy workflow: ${item.workflowFile}`);
    continue;
  }
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Không tìm thấy script: ${item.scriptFile}`);
    continue;
  }

  if (!cache.has(workflowPath)) {
    const raw = fs.readFileSync(workflowPath, 'utf8');
    cache.set(workflowPath, JSON.parse(raw));
  }

  const workflowJson = cache.get(workflowPath);
  const codeContent = fs.readFileSync(scriptPath, 'utf8');

  let targetNode = workflowJson.nodes.find(n => n.id === item.nodeId || n.name === item.nodeName);
  if (!targetNode) {
    console.warn(`⚠️ Không tìm thấy node [${item.nodeName}] trong ${item.workflowFile}`);
    continue;
  }

  if (!targetNode.parameters) targetNode.parameters = {};
  targetNode.parameters.jsCode = codeContent;
  syncedCount++;
  console.log(`  ✅ [${item.workflowFile}] -> node "${item.nodeName}" updated từ ${item.scriptFile}`);
}

for (const [wfPath, wfData] of cache.entries()) {
  fs.writeFileSync(wfPath, JSON.stringify(wfData, null, 2) + '\n', 'utf8');
}

console.log(`✨ Hoàn tất đồng bộ ${syncedCount} n8n code nodes thành công!\n`);
