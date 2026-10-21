#!/usr/bin/env node
/**
 * TimescaleDB MDDS Core Reconciliation Runner (`scripts/db/db-recon-core.js`)
 *
 * Thực thi đối chiếu 4 bài kiểm tra trọng tâm trên môi trường Production
 * bằng cách ủy quyền trực tiếp cho `scripts/lib/recon-engine.js` (Single Source of Truth):
 *   1. krx_mdds_v3_ticks vs prices (Trade: total_volume_traded IS NOT NULL)
 *   2. krx_mdds_v3_top_prices vs prices (Quote: total_volume_traded IS NULL)
 *   3. krx_mdds_v3_ticks_extra vs prices (Trade: total_volume_traded IS NOT NULL)
 *   4. krx_mdds_v3_ticks vs krx_mdds_v3_ticks_extra (Nội bộ V3)
 *
 * Cách dùng:
 *   node scripts/db/db-recon-core.js                    # Chạy ngày hiện tại
 *   node scripts/db/db-recon-core.js --date 2026-09-24  # Chạy ngày cụ thể
 *   node scripts/db/db-recon-core.js --json             # Xuất JSON cho n8n
 *   npm run db:recon:core                               # Lệnh npm tiện ích
 */

// Production Lock
process.env.METABASE_ENV = 'prod';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../lib/db-client.js';
import {
  CORE_QUERIES,
  runCoreReconciliation,
  recordReconHistory,
  todayVN
} from '../lib/recon-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

loadEnv(path.join(projectRoot, '.env'));
process.env.METABASE_ENV = 'prod';

const RECON_TIMEOUT_MS = parseInt(process.env.RECON_STATEMENT_TIMEOUT || '180000', 10);

export async function runAllCoreRecon(targetDate) {
  const dateStr = targetDate || todayVN();
  const outcome = await runCoreReconciliation({
    date: dateStr,
    env: 'prod',
    statementTimeout: RECON_TIMEOUT_MS
  });
  recordReconHistory(outcome, projectRoot);
  return outcome;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') parsed.json = true;
    else if (args[i] === '--date' && args[i + 1]) parsed.date = args[++i];
    else if (args[i].startsWith('--date=')) parsed.date = args[i].split('=')[1];
  }
  return parsed;
}

async function main() {
  const args = parseCliArgs();
  const dateStr = args.date || todayVN();

  if (!args.json) {
    console.log(`\n==============================================================`);
    console.log(`🔍 TIMESCALEDB MDDS CORE RECONCILIATION RUNNER (4 QUERIES)`);
    console.log(`📅 Ngày kiểm tra: ${dateStr} | Môi trường: PRODUCTION`);
    console.log(`==============================================================\n`);
  }

  const outcome = await runAllCoreRecon(dateStr);

  if (args.json) {
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }

  for (const qKey of ['q1', 'q2', 'q3', 'q4']) {
    const qRes = outcome.results[qKey];
    console.log(`--------------------------------------------------------------`);
    console.log(`📌 ${qRes.name} (${qRes.durationMs || 0}ms)`);
    if (qRes.error) {
      console.log(`   ❌ LỖI: ${qRes.error}`);
    } else if (qRes.rowCount === 0) {
      console.log(`   🟢 100% ĐỒNG BỘ — Không phát hiện mã lệch nào.`);
    } else {
      console.log(`   🚨 PHÁT HIỆN ${qRes.totalMismatch} MÃ SAI LỆCH (hiển thị top ${qRes.rowCount}):`);
      qRes.rows.slice(0, 10).forEach(r => {
        console.log(`     - [${r.symbol}]: ${r.discrepancy_status} (Lệch bản ghi: ${r.diff_records || 0} | Lệch volume: ${r.diff_total_volume || 0})`);
      });
      if (qRes.totalMismatch > 10) {
        console.log(`     ... và ${qRes.totalMismatch - 10} mã khác.`);
      }
    }
    console.log('');
  }
}

if (process.argv[1] && process.argv[1].endsWith('db-recon-core.js')) {
  main().catch(err => {
    console.error('❌ Thất bại:', err);
    process.exit(1);
  });
}

export { CORE_QUERIES };
