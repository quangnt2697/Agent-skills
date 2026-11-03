#!/usr/bin/env node

/**
 * Script Đồng Bộ Node Scripts vào Workflow JSON (`scripts/n8n/sync-n8n-nodes.js`)
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
const projectRoot = path.resolve(__dirname, '..', '..');

export const mappings = [
  {
    workflowFile: 'n8n-workflows/qa-squash/qa-run-test-workflow.json',
    nodeName: 'Extract issueKey',
    nodeId: 'code-extract-issuekey',
    scriptFile: 'scripts/n8n-nodes/qa/qa-extract-issuekey.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-squash/qa-run-test-workflow.json',
    nodeName: 'Run Pytest',
    nodeId: 'execute-command',
    scriptFile: 'scripts/n8n-nodes/qa/qa-run-pytest.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-squash/qa-run-test-workflow.json',
    nodeName: 'Format Result',
    nodeId: 'code-format-result',
    scriptFile: 'scripts/n8n-nodes/qa/qa-format-result.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/global-error-handler.json',
    nodeName: 'Write Error Log',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/ops/error-log-writer.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-squash/squash-batch-pusher.json',
    nodeName: 'Execute Squash Push Engine',
    nodeId: '5',
    scriptFile: 'scripts/n8n-nodes/qa/squash-push-engine.js'
  },
  {
    workflowFile: 'n8n-workflows/qa-squash/squash-batch-pusher.json',
    nodeName: 'Format Squash Report Markdown',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/qa/squash-format-report.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/metabase-query-executor.json',
    nodeName: 'Prepare & Sanitize Query',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/db/metabase-prepare-query.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/metabase-query-executor.json',
    nodeName: 'Normalize & Format Response',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/db/metabase-normalize-response.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-fast-ingestor.json',
    nodeName: 'Prepare Jira Request',
    nodeId: 'prep-jira',
    scriptFile: 'scripts/n8n-nodes/ba/jira-prepare-request.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-fast-ingestor.json',
    nodeName: 'Filter & Clean Payload',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/ba/jira-clean-payload.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-spec-pusher.json',
    nodeName: 'Pre-flight Gate & ADF Converter',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/ba/jira-push-preflight.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-spec-pusher.json',
    nodeName: 'Format Response & Audit',
    nodeId: '6',
    scriptFile: 'scripts/n8n-nodes/ba/jira-push-format-response.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/daily-repo-sync-cron.json',
    nodeName: 'Execute & Parse Daily Sync',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/sync/daily-repo-sync-node.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/sm-daily-standup-cron.json',
    nodeName: 'Prepare Standup Request',
    nodeId: 'prep-standup',
    scriptFile: 'scripts/n8n-nodes/sm/sm-prepare-standup.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/sm-daily-standup-cron.json',
    nodeName: 'Prepare Sprint Issues Request',
    nodeId: 'prep-issues',
    scriptFile: 'scripts/n8n-nodes/sm/sm-prepare-issues.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/sm-daily-standup-cron.json',
    nodeName: 'Analyze Velocity & Blockers',
    nodeId: 'analyze-standup',
    scriptFile: 'scripts/n8n-nodes/sm/sm-analyze-standup.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/db-mdds-recon-watchdog.json',
    nodeName: 'Prepare Watchdog Query',
    nodeId: '3',
    scriptFile: 'scripts/n8n-nodes/db/watchdog-prepare-query.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/db-mdds-recon-watchdog.json',
    nodeName: 'Verify Health & Parity',
    nodeId: '5',
    scriptFile: 'scripts/n8n-nodes/db/watchdog-verify-health.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/securities-fixture-generator.json',
    nodeName: 'Securities Fixture Engine',
    nodeId: 'code-fixture-engine',
    scriptFile: 'scripts/n8n-nodes/qa/securities-fixture-engine.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/confluence-doc-fetcher.json',
    nodeName: 'Confluence Clean Payload',
    nodeId: 'code-clean-confluence',
    scriptFile: 'scripts/n8n-nodes/ba/confluence-clean-payload.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/cr-diff-cleaner.json',
    nodeName: 'CR Filter Diff',
    nodeId: 'code-filter-diff',
    scriptFile: 'scripts/n8n-nodes/cr/cr-filter-diff.js'
  },
  {
    workflowFile: 'n8n-workflows/ops/security-vulnerability-digest.json',
    nodeName: 'Security Digest Engine',
    nodeId: 'code-security-digest',
    scriptFile: 'scripts/n8n-nodes/security/security-digest-engine.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-ready-to-test-notifier.json',
    nodeName: 'Prepare Jira Polling Query',
    nodeId: 'prep-poll',
    scriptFile: 'scripts/n8n-nodes/qa/jira-poll-prepare.js'
  },
  {
    workflowFile: 'n8n-workflows/atlassian/jira-ready-to-test-notifier.json',
    nodeName: 'Filter Board G31 & Ready to Test',
    nodeId: 'code-filter-ready',
    scriptFile: 'scripts/n8n-nodes/qa/jira-ready-to-test-filter.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/db-mdds-recon-core.json',
    nodeName: 'Run Core Recon Engine',
    nodeId: 'node-runner',
    scriptFile: 'scripts/n8n-nodes/db/db-recon-core-runner.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/db-mdds-recon-core.json',
    nodeName: 'Format 4 Separate Messages',
    nodeId: 'node-format',
    scriptFile: 'scripts/n8n-nodes/db/db-recon-core-format.js'
  },
  {
    workflowFile: 'n8n-workflows/data-recon/securities-domain-engine.json',
    nodeName: 'Securities Domain Engine',
    nodeId: 'code-domain-engine',
    scriptFile: 'scripts/n8n-nodes/qa/securities-domain-engine.js'
  }
];

/**
 * Đồng bộ code từ script vào `parameters.jsCode` của node trong workflow.
 * @param {{root?: string, items?: typeof mappings, write?: boolean, log?: (m: string) => void}} [opts]
 *   write=false → chỉ kiểm tra (không ghi file), dùng cho `--check`.
 * @returns {{synced: number, drifted: string[], errors: string[]}}
 *   drifted: các node có jsCode khác script nguồn (trước khi ghi).
 */
export function syncNodes({ root = projectRoot, items = mappings, write = true, log = () => {} } = {}) {
  let synced = 0;
  const drifted = [];
  const errors = [];
  const cache = new Map();

  for (const item of items) {
    let workflowPath = path.join(root, item.workflowFile);
    const scriptPath = path.join(root, item.scriptFile);

    if (!fs.existsSync(workflowPath)) {
      const basename = path.basename(item.workflowFile);
      const candidates = [
        path.join(root, 'n8n-workflows', 'atlassian', basename),
        path.join(root, 'n8n-workflows', 'qa-squash', basename),
        path.join(root, 'n8n-workflows', 'data-recon', basename),
        path.join(root, 'n8n-workflows', 'ops', basename),
      ];
      const found = candidates.find(c => fs.existsSync(c));
      if (found) {
        workflowPath = found;
      }
    }

    if (!fs.existsSync(workflowPath)) {
      errors.push(`Không tìm thấy workflow: ${item.workflowFile}`);
      continue;
    }
    if (!fs.existsSync(scriptPath)) {
      errors.push(`Không tìm thấy script: ${item.scriptFile}`);
      continue;
    }

    if (!cache.has(workflowPath)) {
      cache.set(workflowPath, JSON.parse(fs.readFileSync(workflowPath, 'utf8')));
    }

    const workflowJson = cache.get(workflowPath);
    const codeContent = fs.readFileSync(scriptPath, 'utf8');

    const targetNode = workflowJson.nodes.find(n => n.id === item.nodeId || n.name === item.nodeName);
    if (!targetNode) {
      errors.push(`Không tìm thấy node [${item.nodeName}] trong ${item.workflowFile}`);
      continue;
    }

    if (!targetNode.parameters) targetNode.parameters = {};
    if (targetNode.parameters.jsCode !== codeContent) {
      drifted.push(`${item.workflowFile} -> "${item.nodeName}"`);
    }
    targetNode.parameters.jsCode = codeContent;
    synced++;
    log(`  ✅ [${item.workflowFile}] -> node "${item.nodeName}" updated từ ${item.scriptFile}`);
  }

  if (write) {
    for (const [wfPath, wfData] of cache.entries()) {
      fs.writeFileSync(wfPath, JSON.stringify(wfData, null, 2) + '\n', 'utf8');
    }
  }
  return { synced, drifted, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const check = process.argv.includes('--check');
  console.log(check ? '🔍 Kiểm tra lệch giữa node scripts và n8n workflows...' : '🔄 Đang đồng bộ các node script vào n8n workflows...');
  const { synced, drifted, errors } = syncNodes({ write: !check, log: check ? undefined : console.log });
  errors.forEach(e => console.error(`❌ ${e}`));
  if (check) {
    drifted.forEach(d => console.error(`⚠️ Lệch: ${d}`));
    if (errors.length || drifted.length) process.exit(1);
    console.log(`✅ ${synced} code nodes đồng bộ.`);
  } else {
    console.log(`✨ Hoàn tất đồng bộ ${synced} n8n code nodes thành công!\n`);
  }
}
