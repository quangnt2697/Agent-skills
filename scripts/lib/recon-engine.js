/**
 * TimescaleDB MDDS Core Reconciliation Engine (`scripts/lib/recon-engine.js`)
 *
 * Engine tập trung thực thi, đối chiếu chéo và đánh giá tính toàn vẹn dữ liệu
 * KRX MDDS trên TimescaleDB. Dùng chung cho:
 * - CLI: `scripts/db/db-recon.js`
 * - n8n Code Nodes: `db-recon-core-runner.js`, `watchdog-verify-health.js`
 * - Watchdog & Automation Suites
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadEnv,
  metabaseFetch,
  sanitizeQuery,
  applyLimit,
  getMetabaseConfig,
  formatErrorMessage
} from './db-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Đảm bảo nạp .env
loadEnv(path.join(projectRoot, '.env'));

export function todayVN() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export const catalogPath = path.join(
  projectRoot,
  'plugins',
  'fintech-data',
  'skills',
  'db-timescale-reconciler',
  'assets',
  'reconciliation-queries.json'
);

export function loadCatalog() {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Không tìm thấy file catalog câu query tại: ${catalogPath}`);
  }
  return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
}

export function replaceParams(sqlTemplate, params) {
  let sql = sqlTemplate;
  for (const [key, val] of Object.entries(params)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    sql = sql.replace(regex, String(val));
  }
  return sql;
}

// ── 4 CÂU QUERY ĐỐI CHIẾU TRỌNG TÂM (CORE RECONCILIATION) ───────────────────
export const CORE_QUERIES = {
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
  ORDER BY isin, symbol
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
    (MAX(total_volume_traded) * 10)::bigint AS max_vol_v3,
    (SUM(match_qtty) * 10)::bigint AS sum_match_qtty_v3
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
  END AS discrepancy_status,
  COUNT(*) OVER() AS total_mismatch
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
  ORDER BY isin, symbol
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
  END AS discrepancy_status,
  COUNT(*) OVER() AS total_mismatch
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
  ORDER BY isin, symbol
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
    (SUM(match_qtty) * 10)::bigint AS sum_vol_extra,
    (MAX(total_volume_traded) * 10)::bigint AS max_vol_extra
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
  END AS discrepancy_status,
  COUNT(*) OVER() AS total_mismatch
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
  END AS discrepancy_status,
  COUNT(*) OVER() AS total_mismatch
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

/**
 * Thử lại khi gặp xung đột replication trên replica node
 */
export async function withRecoveryRetry(fn, retries = 2) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= retries || !/conflict with recovery/i.test(err.message)) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

/**
 * Thực thi một câu query đối chiếu lõi
 */
export async function executeSingleCoreQuery(queryKey, dateStr, { env = 'prod', statementTimeout = 180000 } = {}) {
  const qDef = CORE_QUERIES[queryKey];
  if (!qDef) throw new Error(`Query key không hợp lệ: ${queryKey}`);

  const rawSql = qDef.sql.replace(/\{\{date\}\}/g, dateStr).trim();
  const check = sanitizeQuery(rawSql);
  if (!check.valid) {
    throw new Error(`An toàn SQL bị chặn: ${check.error}`);
  }

  const finalSql = applyLimit(check.cleanSql, 100);
  const isProd = env === 'prod' || env === 'production';
  const dbId = isProd
    ? parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || '7', 10)
    : parseInt(process.env.METABASE_UAT_DB_TIMESCALE_ID || process.env.METABASE_DB_TIMESCALE_ID || '644', 10);

  const start = Date.now();
  const result = await metabaseFetch('/api/dataset', {
    method: 'POST',
    timeout: statementTimeout,
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

  const totalMismatch = rows.length > 0 ? parseInt(rows[0].total_mismatch || rows.length, 10) : 0;
  const isTruncated = data.rows_truncated === true || rows.length >= 2000;

  return {
    key: queryKey,
    id: qDef.id,
    name: qDef.name,
    description: qDef.description,
    durationMs,
    totalMismatch,
    rowCount: rows.length,
    isTruncated,
    rows,
    colA: qDef.colA,
    colB: qDef.colB,
    labelA: qDef.labelA,
    labelB: qDef.labelB,
    volA: qDef.volA,
    volB: qDef.volB,
    hasSide: qDef.hasSide || false
  };
}

/**
 * Thực thi toàn bộ bộ 4 câu query Core Reconciliation
 */
export async function runCoreReconciliation({ date, env = 'prod', statementTimeout = 180000 } = {}) {
  const targetDate = date || todayVN();
  const results = {};
  const errors = {};

  const runOne = async (qKey) => {
    try {
      results[qKey] = await withRecoveryRetry(() =>
        executeSingleCoreQuery(qKey, targetDate, { env, statementTimeout })
      );
    } catch (err) {
      errors[qKey] = formatErrorMessage(err);
      results[qKey] = {
        key: qKey,
        id: CORE_QUERIES[qKey].id,
        name: CORE_QUERIES[qKey].name,
        error: err.message,
        rowCount: -1,
        totalMismatch: 0,
        rows: []
      };
    }
  };

  const lanes = process.env.RECON_CONCURRENCY === '2'
    ? [['q1', 'q3'], ['q2', 'q4']]
    : [['q1', 'q2', 'q3', 'q4']];

  for (const lane of lanes) {
    await Promise.all(lane.map(k => runOne(k)));
  }

  const totalMismatchAll = Object.values(results).reduce((acc, r) => acc + (r.totalMismatch || 0), 0);
  const hasErrors = Object.keys(errors).length > 0;
  const isHealthy = !hasErrors && totalMismatchAll === 0;

  return {
    date: targetDate,
    timestamp: new Date().toISOString(),
    environment: env.toUpperCase(),
    results,
    errors,
    totalMismatchAll,
    hasErrors,
    isHealthy
  };
}

/**
 * Render báo cáo Core Recon dạng Markdown trực quan
 */
export function formatCoreReport(outcome) {
  const { date, environment, results = {}, errors = {}, isHealthy, totalMismatchAll } = outcome;
  let md = `## 📊 Báo Cáo Đối Chiếu Dữ Liệu MDDS TimescaleDB (${environment})\n`;
  md += `- **Ngày kiểm tra:** \`${date}\` | **Trạng thái:** ${isHealthy ? '🟢 **HOÀN TOÀN KHỚP**' : `🚨 **PHÁT HIỆN ${totalMismatchAll} ĐIỂM LỆCH**`}\n\n`;

  for (const qKey of ['q1', 'q2', 'q3', 'q4']) {
    const r = results[qKey] || {};
    md += `### ${r.name || qKey} (${r.durationMs || 0}ms)\n`;
    if (r.error || errors[qKey]) {
      md += `> ❌ **Lỗi truy vấn:** ${r.error || errors[qKey]}\n\n`;
      continue;
    }
    if (!r.rows || r.rows.length === 0) {
      md += `> 🟢 **100% Khớp:** Không phát hiện bất kỳ mã nào sai lệch.\n\n`;
      continue;
    }

    md += `> 🚨 Phát hiện **${r.totalMismatch}** mã có sai lệch (hiển thị top ${r.rows.length}):\n\n`;
    const headers = ['Mã CK', r.labelA || 'Bảng A', r.labelB || 'Bảng B', 'Lệch Bản Ghi', 'Trạng Thái'];
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => ':---').join(' | ')} |\n`;

    for (const row of r.rows.slice(0, 10)) {
      const sym = row.symbol || '_';
      const cA = row[r.colA] !== undefined ? Number(row[r.colA]).toLocaleString() : '-';
      const cB = row[r.colB] !== undefined ? Number(row[r.colB]).toLocaleString() : '-';
      const diff = row.diff_records !== undefined ? Number(row.diff_records).toLocaleString() : '0';
      const st = row.discrepancy_status || '';
      md += `| **${sym}** | ${cA} | ${cB} | ${diff} | ${st} |\n`;
    }
    if (r.rows.length > 10) {
      md += `\n*(Đã ẩn ${r.rows.length - 10} mã tiếp theo để tối ưu hiển thị)*\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Kiểm tra đối chiếu chéo trước giờ mở phiên: UAT vs PROD (Pre-Market Environment Sync Check)
 */
export async function checkPreMarketSync({ statementTimeout = 60000 } = {}) {
  const prodDbId = parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || '7', 10);
  const uatDbId = parseInt(process.env.METABASE_UAT_DB_TIMESCALE_ID || process.env.METABASE_DB_TIMESCALE_ID || '644', 10);

  const querySql = `
    SELECT
      market_id,
      COUNT(*)::int AS count_symbols,
      COUNT(CASE WHEN basic_price > 0 AND ceiling_price > 0 AND floor_price > 0 THEN 1 END)::int AS valid_prices,
      COUNT(CASE WHEN ceiling_price <= floor_price OR ceiling_price <= basic_price THEN 1 END)::int AS invalid_ratios
    FROM security_definition_v3
    GROUP BY market_id
    ORDER BY market_id;
  `;

  const prodResult = await metabaseFetch('/api/dataset', {
    method: 'POST',
    timeout: statementTimeout,
    body: JSON.stringify({ database: prodDbId, type: 'native', native: { query: querySql } })
  });

  const uatResult = await metabaseFetch('/api/dataset', {
    method: 'POST',
    timeout: statementTimeout,
    body: JSON.stringify({ database: uatDbId, type: 'native', native: { query: querySql } })
  });

  return {
    timestamp: new Date().toISOString(),
    prod: prodResult?.data?.rows || [],
    uat: uatResult?.data?.rows || []
  };
}

/**
 * Lưu kết quả đối chiếu vào file jsonl lịch sử
 */
export function recordReconHistory(outcome, baseDir = projectRoot) {
  try {
    const historyDir = path.join(baseDir, 'workspace', 'adhoc', 'database', 'recon-history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    const fileName = `${outcome.date}.jsonl`;
    const targetFile = path.join(historyDir, fileName);
    const line = JSON.stringify({
      timestamp: outcome.timestamp || new Date().toISOString(),
      date: outcome.date,
      environment: outcome.environment,
      isHealthy: outcome.isHealthy,
      totalMismatch: outcome.totalMismatchAll,
      queryCounts: Object.fromEntries(
        Object.entries(outcome.results || {}).map(([k, v]) => [k, v.totalMismatch || 0])
      ),
      errors: outcome.errors || {}
    }) + '\n';
    fs.appendFileSync(targetFile, line, 'utf-8');
    return targetFile;
  } catch (err) {
    return null;
  }
}
