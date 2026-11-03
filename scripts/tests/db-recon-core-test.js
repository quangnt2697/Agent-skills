import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

import { sanitizeQuery } from '../lib/db-client.js';

test('Core Recon: Workflow db-mdds-recon-core.json tồn tại và có đủ 4 node chính', () => {
  const wfPath = path.join(projectRoot, 'n8n-workflows', 'data-recon', 'db-mdds-recon-core.json');
  assert.ok(fs.existsSync(wfPath), 'File n8n-workflows/data-recon/db-mdds-recon-core.json phải tồn tại');

  const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
  assert.equal(wf.id, 'DbMddsReconCore001');

  const nodeNames = wf.nodes.map(n => n.name);
  assert.ok(nodeNames.includes('Cron 16:00 PM (Post-Trading Core Recon)'), 'Thiếu Schedule Trigger 16:00');
  assert.ok(nodeNames.includes('Webhook Trigger (db-recon-core)'), 'Thiếu Webhook Trigger');
  assert.ok(nodeNames.includes('Run Core Recon Engine'), 'Thiếu Node Run Core Recon Engine');
  assert.ok(nodeNames.includes('Format 4 Separate Messages'), 'Thiếu Node Format 4 Separate Messages');
  assert.ok(!nodeNames.some(n => /mattermost/i.test(n)), 'Workflow không còn node Mattermost');
});

test('Core Recon: 4 câu query cốt lõi tuân thủ Zero-Mutation & Partition-First', async () => {
  const { CORE_QUERIES } = await import('../db/db-recon-core.js');
  const allSql = Object.values(CORE_QUERIES).map(q => `${q.id}\n${q.sql}`).join('\n');

  // Kiểm tra 4 query ID
  assert.ok(allSql.includes('recon-core-ticks'));
  assert.ok(allSql.includes('recon-core-topprices'));
  assert.ok(allSql.includes('recon-core-ticks-extra-vs-prices'));
  assert.ok(allSql.includes('recon-core-ticks-vs-extra'));

  // Kiểm tra điều kiện lọc total_volume_traded trên bảng prices
  assert.ok(allSql.includes('p.total_volume_traded IS NOT NULL'), 'Thiếu filter total_volume_traded IS NOT NULL cho Trade');
  assert.ok(allSql.includes('p.total_volume_traded IS NULL'), 'Thiếu filter total_volume_traded IS NULL cho Quote');

  // Kiểm tra partition-first & sanitizer
  for (const q of Object.values(CORE_QUERIES)) {
    assert.ok(q.sql.includes("sending_time >= '{{date}}'::date"), `Query ${q.id} thiếu partition key sending_time`);
    const check = sanitizeQuery(q.sql.replace(/\{\{date\}\}/g, '2026-09-24'));
    assert.equal(check.valid, true, `Query ${q.id} vi phạm Read-Only Sanitizer: ${check.error}`);
  }
});

test('Core Recon: Node format sinh chính xác 4 items độc lập', () => {
  const formatScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'n8n-nodes', 'db', 'db-recon-core-format.js'), 'utf8');

  // Giả lập môi trường n8n cho script
  const mockOutcome = {
    date: '2026-09-24',
    results: {
      q1: { rowCount: 0, rows: [] },
      q2: { rowCount: 0, rows: [] },
      q3: {
        rowCount: 1,
        rows: [{
          symbol: 'HPG',
          cnt_extra: 0,
          cnt_raw: 15420,
          diff_records: -15420,
          total_vol_extra: 0,
          total_vol_raw: 48250100,
          diff_total_volume: -48250100,
          side_pct: 0,
          discrepancy_status: '🔴 CHỈ CÓ TRÊN PRICES RAW (THIẾU EXTRA)'
        }]
      },
      q4: { rowCount: 0, rows: [] }
    }
  };

  const fn = new Function('$input', formatScript);
  const items = fn({ first: () => ({ json: { outcome: mockOutcome } }) });

  assert.equal(items.length, 4, 'Bắt buộc phải trả về đúng 4 items (4 messages)');

  // Item 1, 2, 4 phải là 🟢 100% ĐỒNG BỘ
  assert.equal(items[0].json.hasDiscrepancy, false);
  assert.ok(items[0].json.messageText.includes('🟢 **100% ĐỒNG BỘ**'));

  assert.equal(items[1].json.hasDiscrepancy, false);
  assert.ok(items[1].json.messageText.includes('🟢 **100% ĐỒNG BỘ**'));

  // Item 3 phải là 🚨 LỆCH DỮ LIỆU và in mã HPG
  assert.equal(items[2].json.hasDiscrepancy, true);
  assert.ok(items[2].json.messageText.includes('🚨 **LỆCH DỮ LIỆU'));
  assert.ok(items[2].json.messageText.includes('HPG'));
  assert.ok(items[2].json.messageText.includes('CHỈ CÓ TRÊN PRICES RAW'));

  assert.equal(items[3].json.hasDiscrepancy, false);
});
