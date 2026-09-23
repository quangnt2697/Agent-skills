/**
 * Node Script: Prepare Watchdog Query — Step 1: Security Definition V3
 * (`scripts/n8n-nodes/watchdog-prepare-query.js`)
 *
 * Mục đích:
 * Chuẩn bị câu SQL BƯỚC 1 — Kiểm tra bảng `security_definition_v3`:
 *   - Xác thực sự tồn tại dữ liệu đầu ngày (không rỗng).
 *   - Thống kê tổng số mã theo từng sàn (HOSE, HNX, UPCOM, DVX...).
 *   - Đảm bảo 100% mã có đủ: basic_price, ceiling_price, floor_price > 0 + board_id hợp lệ.
 *   - Liệt kê chi tiết tối đa 100 mã lỗi (nếu có).
 *
 * Output của node này sẽ được đưa vào Metabase Query Executor (Run Query 1).
 * Sau đó được merge với kết quả BƯỚC 2 (krx_mdds_v2_stock_infos) tại node watchdog-verify-health.
 */

const input = $input.first();
const raw = (input && input.json) || {};

let triggerSource = 'cron';
try {
  if ($('Execute Workflow Trigger').first()) {
    triggerSource = 'executeWorkflow';
  }
} catch (e) {
  triggerSource = 'cron';
}

// ── SQL BƯỚC 1: Kiểm tra Security Definition V3 ─────────────────────────────
const secDefSql = `
WITH sec_summary AS (
  SELECT
    CASE
      WHEN market_id = 6 THEN 'HOSE'
      WHEN market_id = 7 THEN 'HNX'
      WHEN market_id = 8 THEN 'UPCOM'
      WHEN market_id = 3 THEN 'DVX (Phái sinh)'
      ELSE 'SÀN ' || COALESCE(market_id::text, 'KHÁC')
    END AS floor_code,
    COUNT(*)::int AS total_symbols,
    COUNT(CASE WHEN basic_price > 0 AND ceiling_price > 0 AND floor_price > 0
                    AND board_id IS NOT NULL AND board_id <> '' THEN 1 END)::int AS valid_symbols,
    COUNT(CASE WHEN basic_price IS NULL OR basic_price <= 0
                 OR ceiling_price IS NULL OR ceiling_price <= 0
                 OR floor_price IS NULL OR floor_price <= 0
                 OR board_id IS NULL OR board_id = '' THEN 1 END)::int AS invalid_symbols,
    COUNT(CASE WHEN basic_price IS NULL OR basic_price <= 0 THEN 1 END)::int AS missing_basic_count,
    COUNT(CASE WHEN ceiling_price IS NULL OR ceiling_price <= 0 THEN 1 END)::int AS missing_ceiling_count,
    COUNT(CASE WHEN floor_price IS NULL OR floor_price <= 0 THEN 1 END)::int AS missing_floor_count,
    COUNT(CASE WHEN board_id IS NULL OR board_id = '' THEN 1 END)::int AS missing_board_id_count
  FROM security_definition_v3
  GROUP BY market_id
  ORDER BY floor_code
),
sec_invalids AS (
  SELECT
    symbol,
    CASE
      WHEN market_id = 6 THEN 'HOSE'
      WHEN market_id = 7 THEN 'HNX'
      WHEN market_id = 8 THEN 'UPCOM'
      WHEN market_id = 3 THEN 'DVX'
      ELSE 'SÀN ' || COALESCE(market_id::text, 'KHÁC')
    END AS floor_code,
    basic_price,
    ceiling_price,
    floor_price,
    board_id,
    CONCAT_WS(', ',
      CASE WHEN basic_price IS NULL OR basic_price <= 0 THEN 'Thiếu giá TC' END,
      CASE WHEN ceiling_price IS NULL OR ceiling_price <= 0 THEN 'Thiếu giá Trần' END,
      CASE WHEN floor_price IS NULL OR floor_price <= 0 THEN 'Thiếu giá Sàn' END,
      CASE WHEN board_id IS NULL OR board_id = '' THEN 'Thiếu Board ID' END
    ) AS error_detail
  FROM security_definition_v3
  WHERE basic_price IS NULL OR basic_price <= 0
     OR ceiling_price IS NULL OR ceiling_price <= 0
     OR floor_price IS NULL OR floor_price <= 0
     OR board_id IS NULL OR board_id = ''
  ORDER BY market_id, symbol
  LIMIT 100
)
SELECT json_build_object(
  'step',         'sec_def_v3',
  'total_scanned', (SELECT COUNT(*)::int FROM security_definition_v3),
  'summary',      (SELECT COALESCE(json_agg(s), '[]'::json) FROM sec_summary s),
  'invalids',     (SELECT COALESCE(json_agg(i), '[]'::json) FROM sec_invalids i)
)::text AS report_data;
`.trim();

return [{
  json: {
    query: secDefSql,
    database: 'timescale',
    environment: 'prod',
    maxRows: 10,
    checkStep: 'step1_sec_def_v3',
    checkTime: '08:20:00 ICT',
    _triggerSource: triggerSource
  }
}];
