#!/usr/bin/env node
/**
 * TimescaleDB MDDS Core Reconciliation Runner (`scripts/db/db-recon-core.js`)
 *
 * Thực thi đối chiếu 4 bài kiểm tra trọng tâm:
 *   1. krx_mdds_v3_ticks vs prices (Trade: total_volume_traded IS NOT NULL)
 *   2. krx_mdds_v3_top_prices vs prices (Quote: total_volume_traded IS NULL)
 *   3. krx_mdds_v3_ticks_extra vs prices (Trade: total_volume_traded IS NOT NULL)
 *   4. krx_mdds_v3_ticks vs krx_mdds_v3_ticks_extra (Nội bộ V3)
 *
 * Kiểm tra kép:
 *   - Đủ số bản ghi (Record Count Parity)
 *   - Chính xác về nội dung (Total Volume Traded Parity)
 *   - Phân loại rõ ràng mã nào có trên bảng A, mã nào có trên bảng B
 *
 * Cách dùng:
 *   node scripts/db/db-recon-core.js                    # Chạy ngày hiện tại
 *   node scripts/db/db-recon-core.js --date 2026-09-24  # Chạy ngày cụ thể
 *   node scripts/db/db-recon-core.js --json            # Xuất JSON cho n8n
 */

// Production Lock
process.env.METABASE_ENV = 'prod';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

import {
  loadEnv,
  metabaseFetch,
  sanitizeQuery,
  applyLimit,
  getMetabaseConfig,
  formatErrorMessage
} from '../../.agents/db-client.js';

loadEnv(path.join(projectRoot, '.env'));
process.env.METABASE_ENV = 'prod';

const CORE_QUERIES = {
  q1: {
    id: 'recon-core-ticks',
    name: 'Query 1: krx_mdds_v3_ticks vs prices (Trade)',
    description: 'Đối chiếu số lượng tick & total_volume_traded giữa V3 Ticks và Raw prices Sở',
    colA: 'cnt_v3',
    colB: 'cnt_raw',
    labelA: 'Tick V3',
    labelB: 'Tick Raw',
    volA: 'total_vol_v3',
    volB: 'total_vol_raw',
    sql: `
WITH isin_map AS (
  SELECT DISTINCT ON (isin) symbol, isin 
  FROM security_definition_v3 
  WHERE isin IS NOT NULL
),
raw_trades AS (
  SELECT 
    m.symbol,
    COUNT(*)::int AS cnt_raw,
    MAX(p.total_volume_traded)::bigint AS max_vol_raw
  FROM prices p
  JOIN isin_map m ON p.symbol = m.isin
  WHERE p.sending_time >= '{{date}}'::date 
    AND p.sending_time <  '{{date}}'::date + INTERVAL '1 day'
    AND p.total_volume_traded IS NOT NULL
  GROUP BY m.symbol
),
v3_ticks AS (
  SELECT 
    symbol,
    COUNT(*)::int AS cnt_v3,
    MAX(total_volume_traded)::bigint AS max_vol_v3,
    SUM(match_qtty)::bigint AS sum_match_qtty_v3
  FROM krx_mdds_v3_ticks
  WHERE sending_time >= '{{date}}'::date 
    AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  GROUP BY symbol
)
SELECT 
  COALESCE(v3.symbol, r.symbol) AS symbol,
  COALESCE(v3.cnt_v3, 0)   AS cnt_v3,
  COALESCE(r.cnt_raw, 0)   AS cnt_raw,
  (COALESCE(v3.cnt_v3, 0) - COALESCE(r.cnt_raw, 0)) AS diff_records,
  COALESCE(v3.max_vol_v3, 0) AS total_vol_v3,
  COALESCE(r.max_vol_raw, 0) AS total_vol_raw,
  (COALESCE(v3.max_vol_v3, 0) - COALESCE(r.max_vol_raw, 0)) AS diff_total_volume,
  CASE 
    WHEN v3.symbol IS NULL AND r.symbol IS NOT NULL THEN '🔴 CHỈ CÓ TRÊN PRICES RAW (THIẾU V3)'
    WHEN v3.symbol IS NOT NULL AND r.symbol IS NULL THEN '🟡 CHỈ CÓ TRÊN V3 (THIẾU RAW)'
    WHEN COALESCE(v3.max_vol_v3, 0) != COALESCE(r.max_vol_raw, 0) THEN '🚨 SAI LỆCH NỘI DUNG TOTAL VOLUME'
    WHEN v3.cnt_v3 != r.cnt_raw THEN '⚠️ LỆCH SỐ BẢN GHI (VOLUME KHỚP)'
    ELSE '🟢 KHỚP HOÀN TOÀN'
  END AS discrepancy_status
FROM v3_ticks v3
FULL OUTER JOIN raw_trades r ON v3.symbol = r.symbol
WHERE v3.symbol IS NULL 
   OR r.symbol IS NULL 
   OR v3.cnt_v3 != r.cnt_raw
   OR COALESCE(v3.max_vol_v3, 0) != COALESCE(r.max_vol_raw, 0)
ORDER BY ABS(COALESCE(v3.max_vol_v3, 0) - COALESCE(r.max_vol_raw, 0)) DESC,
         ABS(COALESCE(v3.cnt_v3, 0) - COALESCE(r.cnt_raw, 0)) DESC
LIMIT 50;
    `
  },
  q2: {
    id: 'recon-core-topprices',
    name: 'Query 2: krx_mdds_v3_top_prices vs prices (Quote)',
    description: 'Đối chiếu số lượt cập nhật sổ lệnh 3/10 giá giữa V3 TopPrice và Raw prices Sở',
    colA: 'cnt_v3',
    colB: 'cnt_raw',
    labelA: 'Sổ Lệnh V3',
    labelB: 'Sổ Lệnh Raw',
    sql: `
WITH isin_map AS (
  SELECT DISTINCT ON (isin) symbol, isin 
  FROM security_definition_v3 
  WHERE isin IS NOT NULL
),
raw_quotes AS (
  SELECT 
    m.symbol, 
    COUNT(*)::int AS cnt_raw
  FROM prices p
  JOIN isin_map m ON p.symbol = m.isin
  WHERE p.sending_time >= '{{date}}'::date 
    AND p.sending_time <  '{{date}}'::date + INTERVAL '1 day'
    AND p.total_volume_traded IS NULL
  GROUP BY m.symbol
),
v3_topprice AS (
  SELECT 
    symbol, 
    COUNT(*)::int AS cnt_v3
  FROM krx_mdds_v3_top_prices
  WHERE sending_time >= '{{date}}'::date 
    AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  GROUP BY symbol
)
SELECT 
  COALESCE(v3.symbol, r.symbol) AS symbol,
  COALESCE(v3.cnt_v3, 0)   AS cnt_v3,
  COALESCE(r.cnt_raw, 0)   AS cnt_raw,
  (COALESCE(v3.cnt_v3, 0) - COALESCE(r.cnt_raw, 0)) AS diff_records,
  CASE 
    WHEN v3.symbol IS NULL AND r.symbol IS NOT NULL THEN '🔴 CHỈ CÓ TRÊN PRICES RAW (THIẾU V3 TOPPRICE)'
    WHEN v3.symbol IS NOT NULL AND r.symbol IS NULL THEN '🟡 CHỈ CÓ TRÊN V3 TOPPRICE (THIẾU RAW)'
    WHEN v3.cnt_v3 != r.cnt_raw THEN '⚠️ LỆCH SỐ LƯỢT CẬP NHẬT SỔ LỆNH'
    ELSE '🟢 KHỚP HOÀN TOÀN'
  END AS discrepancy_status
FROM v3_topprice v3
FULL OUTER JOIN raw_quotes r ON v3.symbol = r.symbol
WHERE v3.symbol IS NULL 
   OR r.symbol IS NULL 
   OR v3.cnt_v3 != r.cnt_raw
ORDER BY ABS(COALESCE(v3.cnt_v3, 0) - COALESCE(r.cnt_raw, 0)) DESC
LIMIT 50;
    `
  },
  q3: {
    id: 'recon-core-ticks-extra-vs-prices',
    name: 'Query 3: krx_mdds_v3_ticks_extra vs prices (Trade)',
    description: 'Đối chiếu dữ liệu làm giàu chiều mua/bán (ticks_extra) so với Raw prices Sở',
    colA: 'cnt_extra',
    colB: 'cnt_raw',
    labelA: 'Tick Extra',
    labelB: 'Tick Raw',
    volA: 'total_vol_extra',
    volB: 'total_vol_raw',
    hasSide: true,
    sql: `
WITH isin_map AS (
  SELECT DISTINCT ON (isin) symbol, isin 
  FROM security_definition_v3 
  WHERE isin IS NOT NULL
),
raw_trades AS (
  SELECT 
    m.symbol,
    COUNT(*)::int AS cnt_raw,
    MAX(p.total_volume_traded)::bigint AS max_vol_raw
  FROM prices p
  JOIN isin_map m ON p.symbol = m.isin
  WHERE p.sending_time >= '{{date}}'::date 
    AND p.sending_time <  '{{date}}'::date + INTERVAL '1 day'
    AND p.total_volume_traded IS NOT NULL
  GROUP BY m.symbol
),
extra AS (
  SELECT 
    symbol,
    COUNT(*)::int AS cnt_extra,
    COUNT(CASE WHEN side IS NOT NULL AND side != 0 THEN 1 END)::int AS cnt_side_ok,
    SUM(match_qtty)::bigint AS sum_vol_extra,
    MAX(total_volume_traded)::bigint AS max_vol_extra
  FROM krx_mdds_v3_ticks_extra
  WHERE sending_time >= '{{date}}'::date 
    AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  GROUP BY symbol
)
SELECT 
  COALESCE(e.symbol, r.symbol) AS symbol,
  COALESCE(e.cnt_extra, 0) AS cnt_extra,
  COALESCE(r.cnt_raw, 0)   AS cnt_raw,
  (COALESCE(e.cnt_extra, 0) - COALESCE(r.cnt_raw, 0)) AS diff_records,
  COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) AS total_vol_extra,
  COALESCE(r.max_vol_raw, 0) AS total_vol_raw,
  (COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) - COALESCE(r.max_vol_raw, 0)) AS diff_total_volume,
  ROUND(COALESCE(e.cnt_side_ok, 0)::numeric * 100.0 / NULLIF(COALESCE(e.cnt_extra, 0), 0), 1) AS side_pct,
  CASE 
    WHEN e.symbol IS NULL AND r.symbol IS NOT NULL THEN '🔴 CHỈ CÓ TRÊN PRICES RAW (THIẾU EXTRA)'
    WHEN e.symbol IS NOT NULL AND r.symbol IS NULL THEN '🟡 CHỈ CÓ TRÊN TICKS EXTRA (THIẾU RAW)'
    WHEN COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) != COALESCE(r.max_vol_raw, 0) THEN '🚨 SAI LỆCH NỘI DUNG TOTAL VOLUME'
    WHEN e.cnt_extra != r.cnt_raw THEN '⚠️ LỆCH SỐ BẢN GHI (VOLUME KHỚP)'
    WHEN (COALESCE(e.cnt_side_ok, 0)::numeric / NULLIF(e.cnt_extra, 0)) < 0.95 THEN '⚠️ TỶ LỆ SIDE THẤP (<95%)'
    ELSE '🟢 KHỚP HOÀN TOÀN'
  END AS discrepancy_status
FROM extra e
FULL OUTER JOIN raw_trades r ON e.symbol = r.symbol
WHERE e.symbol IS NULL 
   OR r.symbol IS NULL 
   OR e.cnt_extra != r.cnt_raw
   OR COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) != COALESCE(r.max_vol_raw, 0)
   OR (e.cnt_extra > 0 AND COALESCE(e.cnt_side_ok, 0)::numeric / e.cnt_extra < 0.95)
ORDER BY ABS(COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) - COALESCE(r.max_vol_raw, 0)) DESC,
         ABS(COALESCE(e.cnt_extra, 0) - COALESCE(r.cnt_raw, 0)) DESC
LIMIT 50;
    `
  },
  q4: {
    id: 'recon-core-ticks-vs-extra',
    name: 'Query 4: krx_mdds_v3_ticks vs krx_mdds_v3_ticks_extra (Nội Bộ V3)',
    description: 'Đối chiếu luồng xử lý nội bộ V3 (từ bảng Ingest Ticks sang bảng Worker Side/AvgPrice)',
    colA: 'cnt_v3_ticks',
    colB: 'cnt_v3_extra',
    labelA: 'Tick V3',
    labelB: 'Tick Extra',
    volA: 'vol_v3_ticks',
    volB: 'vol_v3_extra',
    hasSide: true,
    sql: `
WITH v3 AS (
  SELECT 
    symbol,
    COUNT(*)::int AS cnt_v3,
    MAX(total_volume_traded)::bigint AS max_vol_v3,
    SUM(match_qtty)::bigint AS sum_vol_v3
  FROM krx_mdds_v3_ticks
  WHERE sending_time >= '{{date}}'::date 
    AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  GROUP BY symbol
),
extra AS (
  SELECT 
    symbol,
    COUNT(*)::int AS cnt_extra,
    COUNT(CASE WHEN side IS NOT NULL AND side != 0 THEN 1 END)::int AS cnt_side_ok,
    MAX(total_volume_traded)::bigint AS max_vol_extra,
    SUM(match_qtty)::bigint AS sum_vol_extra
  FROM krx_mdds_v3_ticks_extra
  WHERE sending_time >= '{{date}}'::date 
    AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  GROUP BY symbol
)
SELECT 
  COALESCE(v3.symbol, e.symbol) AS symbol,
  COALESCE(v3.cnt_v3, 0)    AS cnt_v3_ticks,
  COALESCE(e.cnt_extra, 0) AS cnt_v3_extra,
  (COALESCE(e.cnt_extra, 0) - COALESCE(v3.cnt_v3, 0)) AS diff_records,
  COALESCE(v3.max_vol_v3, v3.sum_vol_v3, 0) AS vol_v3_ticks,
  COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) AS vol_v3_extra,
  (COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) - COALESCE(v3.max_vol_v3, v3.sum_vol_v3, 0)) AS diff_total_volume,
  ROUND(COALESCE(e.cnt_side_ok, 0)::numeric * 100.0 / NULLIF(COALESCE(e.cnt_extra, 0), 0), 1) AS side_pct,
  CASE 
    WHEN v3.symbol IS NULL AND e.symbol IS NOT NULL THEN '🟡 CHỈ CÓ TRÊN TICKS EXTRA (THIẾU V3 TICKS)'
    WHEN v3.symbol IS NOT NULL AND e.symbol IS NULL THEN '🔴 CHỈ CÓ TRÊN V3 TICKS (THIẾU TICKS EXTRA)'
    WHEN COALESCE(v3.max_vol_v3, v3.sum_vol_v3, 0) != COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) THEN '🚨 SAI LỆCH NỘI DUNG TOTAL VOLUME'
    WHEN v3.cnt_v3 != e.cnt_extra THEN '⚠️ LỆCH SỐ BẢN GHI (VOLUME KHỚP)'
    ELSE '🟢 KHỚP HOÀN TOÀN'
  END AS discrepancy_status
FROM v3
FULL OUTER JOIN extra e ON v3.symbol = e.symbol
WHERE v3.symbol IS NULL 
   OR e.symbol IS NULL 
   OR v3.cnt_v3 != e.cnt_extra
   OR COALESCE(v3.max_vol_v3, v3.sum_vol_v3, 0) != COALESCE(e.max_vol_extra, e.sum_vol_extra, 0)
ORDER BY ABS(COALESCE(e.max_vol_extra, e.sum_vol_extra, 0) - COALESCE(v3.max_vol_v3, v3.sum_vol_v3, 0)) DESC,
         ABS(COALESCE(e.cnt_extra, 0) - COALESCE(v3.cnt_v3, 0)) DESC
LIMIT 50;
    `
  }
};

async function executeSingleQuery(queryKey, dateStr) {
  const qDef = CORE_QUERIES[queryKey];
  if (!qDef) throw new Error(`Query key không hợp lệ: ${queryKey}`);

  const rawSql = qDef.sql.replace(/\{\{date\}\}/g, dateStr).trim();
  const check = sanitizeQuery(rawSql);
  if (!check.valid) {
    throw new Error(`An toàn SQL bị chặn: ${check.error}`);
  }

  const finalSql = applyLimit(check.cleanSql, 100);
  const dbId = parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || '7', 10);

  const start = Date.now();
  const result = await metabaseFetch('/api/dataset', {
    method: 'POST',
    body: JSON.stringify({
      database: dbId,
      type: 'native',
      native: { query: finalSql }
    })
  });

  const durationMs = Date.now() - start;
  if (result.status === 'failed' || result.error) {
    throw new Error(result.error || 'Metabase query thất bại');
  }

  const data = result.data || {};
  const cols = data.cols ? data.cols.map(c => c.name) : (data.columns || []);
  const rows = (data.rows || []).map(r => {
    const obj = {};
    cols.forEach((col, idx) => { obj[col] = r[idx]; });
    return obj;
  });

  return {
    queryKey,
    id: qDef.id,
    name: qDef.name,
    durationMs,
    rowCount: rows.length,
    rows
  };
}

export async function runAllCoreRecon(targetDate) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);
  const results = {};

  for (const qKey of ['q1', 'q2', 'q3', 'q4']) {
    try {
      results[qKey] = await executeSingleQuery(qKey, dateStr);
    } catch (err) {
      results[qKey] = {
        queryKey: qKey,
        id: CORE_QUERIES[qKey].id,
        name: CORE_QUERIES[qKey].name,
        error: err.message,
        rowCount: -1,
        rows: []
      };
    }
  }

  return {
    date: dateStr,
    timestamp: new Date().toISOString(),
    results
  };
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') parsed.json = true;
    else if (args[i] === '--date' && args[i + 1]) parsed.date = args[++i];
  }
  return parsed;
}

async function main() {
  const args = parseCliArgs();
  const dateStr = args.date || new Date().toISOString().slice(0, 10);

  console.log(`\n==============================================================`);
  console.log(`🔍 TIMESCALEDB MDDS CORE RECONCILIATION RUNNER (4 QUERIES)`);
  console.log(`📅 Ngày kiểm tra: ${dateStr} | Môi trường: PRODUCTION`);
  console.log(`==============================================================\n`);

  const outcome = await runAllCoreRecon(dateStr);

  if (args.json) {
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }

  // Print readable CLI report
  for (const qKey of ['q1', 'q2', 'q3', 'q4']) {
    const qRes = outcome.results[qKey];
    console.log(`--------------------------------------------------------------`);
    console.log(`📌 ${qRes.name} (${qRes.durationMs || 0}ms)`);
    if (qRes.error) {
      console.log(`   ❌ LỖI: ${qRes.error}`);
    } else if (qRes.rowCount === 0) {
      console.log(`   🟢 100% ĐỒNG BỘ — Không phát hiện mã lệch nào.`);
    } else {
      console.log(`   🚨 PHÁT HIỆN ${qRes.rowCount} MÃ SAI LỆCH:`);
      qRes.rows.slice(0, 10).forEach(r => {
        console.log(`     - [${r.symbol}]: ${r.discrepancy_status} (Lệch bản ghi: ${r.diff_records || 0} | Lệch volume: ${r.diff_total_volume || 0})`);
      });
      if (qRes.rowCount > 10) {
        console.log(`     ... và ${qRes.rowCount - 10} mã khác.`);
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
