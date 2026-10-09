/**
 * Node Script: Prepare Watchdog Query — Step 1 & Step 2 Unified
 * (`scripts/n8n-nodes/db/watchdog-prepare-query.js`)
 *
 * Mục đích:
 * Chuẩn bị câu SQL hợp nhất (UNION ALL) kiểm tra toàn diện trước phiên giao dịch:
 *   - BƯỚC 1: Bảng `security_definition_v3` (xác thực dữ liệu đầu ngày, basic/ceiling/floor > 0, board_id).
 *   - BƯỚC 2: Bảng `krx_mdds_v2_stock_infos` (đảm bảo 21 trường realtime đã được clear sạch trước 09:00).
 *
 * Trả về 2 bản ghi report_data trong 1 lần gọi Metabase duy nhất, tối ưu latency và đảm bảo đủ 2 bước.
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

// ── SQL HỢP NHẤT: BƯỚC 1 (SecDef V3) + BƯỚC 2 (Realtime Clear) ───────────────
const combinedSql = `
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
),
unclean_realtime AS (
  SELECT
    symbol,
    CASE
      WHEN market_id = 6 THEN 'HOSE'
      WHEN market_id = 7 THEN 'HNX'
      WHEN market_id = 8 THEN 'UPCOM'
      ELSE 'KHÁC'
    END AS floor_code,
    CONCAT_WS(', ',
      CASE WHEN highest_price       IS NOT NULL AND highest_price       > 0 THEN 'highest_price' END,
      CASE WHEN lowest_price        IS NOT NULL AND lowest_price        > 0 THEN 'lowest_price' END,
      CASE WHEN open_price          IS NOT NULL AND open_price          > 0 THEN 'open_price' END,
      CASE WHEN close_price         IS NOT NULL AND close_price         > 0 THEN 'close_price' END,
      CASE WHEN average_price       IS NOT NULL AND average_price       > 0 THEN 'average_price' END,
      CASE WHEN buy_foreign_qtty    IS NOT NULL AND buy_foreign_qtty    > 0 THEN 'buy_foreign_qtty' END,
      CASE WHEN sell_foreign_qtty   IS NOT NULL AND sell_foreign_qtty   > 0 THEN 'sell_foreign_qtty' END,
      CASE WHEN expected_trade_price IS NOT NULL AND expected_trade_price > 0 THEN 'expected_trade_price' END,
      CASE WHEN expected_trade_qtty  IS NOT NULL AND expected_trade_qtty  > 0 THEN 'expected_trade_qtty' END,
      CASE WHEN open_interest_qtty   IS NOT NULL AND open_interest_qtty   > 0 THEN 'open_interest_qtty' END,
      CASE WHEN total_volume_traded  IS NOT NULL AND total_volume_traded  > 0 THEN 'total_volume_traded' END,
      CASE WHEN gross_trade_amount   IS NOT NULL AND gross_trade_amount   > 0 THEN 'gross_trade_amount' END,
      CASE WHEN total_offer_qtty     IS NOT NULL AND total_offer_qtty     > 0 THEN 'total_offer_qtty' END,
      CASE WHEN total_bid_qtty       IS NOT NULL AND total_bid_qtty       > 0 THEN 'total_bid_qtty' END,
      CASE WHEN match_price          IS NOT NULL AND match_price          > 0 THEN 'match_price' END,
      CASE WHEN match_qtty           IS NOT NULL AND match_qtty           > 0 THEN 'match_qtty' END,
      CASE WHEN match_value          IS NOT NULL AND match_value          > 0 THEN 'match_value' END,
      CASE WHEN changed_value        IS NOT NULL AND changed_value        > 0 THEN 'changed_value' END,
      CASE WHEN changed_ratio        IS NOT NULL AND changed_ratio        > 0 THEN 'changed_ratio' END,
      CASE WHEN buy_foreign_value    IS NOT NULL AND buy_foreign_value    > 0 THEN 'buy_foreign_value' END,
      CASE WHEN sell_foreign_value   IS NOT NULL AND sell_foreign_value   > 0 THEN 'sell_foreign_value' END
    ) AS uncleared_fields
  FROM krx_mdds_v2_stock_infos
  WHERE (highest_price       IS NOT NULL AND highest_price       > 0)
     OR (lowest_price        IS NOT NULL AND lowest_price        > 0)
     OR (open_price          IS NOT NULL AND open_price          > 0)
     OR (close_price         IS NOT NULL AND close_price         > 0)
     OR (average_price       IS NOT NULL AND average_price       > 0)
     OR (buy_foreign_qtty    IS NOT NULL AND buy_foreign_qtty    > 0)
     OR (sell_foreign_qtty   IS NOT NULL AND sell_foreign_qtty   > 0)
     OR (expected_trade_price IS NOT NULL AND expected_trade_price > 0)
     OR (expected_trade_qtty  IS NOT NULL AND expected_trade_qtty  > 0)
     OR (open_interest_qtty   IS NOT NULL AND open_interest_qtty   > 0)
     OR (total_volume_traded  IS NOT NULL AND total_volume_traded  > 0)
     OR (gross_trade_amount   IS NOT NULL AND gross_trade_amount   > 0)
     OR (total_offer_qtty     IS NOT NULL AND total_offer_qtty     > 0)
     OR (total_bid_qtty       IS NOT NULL AND total_bid_qtty       > 0)
     OR (match_price          IS NOT NULL AND match_price          > 0)
     OR (match_qtty           IS NOT NULL AND match_qtty           > 0)
     OR (match_value          IS NOT NULL AND match_value          > 0)
     OR (changed_value        IS NOT NULL AND changed_value        > 0)
     OR (changed_ratio        IS NOT NULL AND changed_ratio        > 0)
     OR (buy_foreign_value    IS NOT NULL AND buy_foreign_value    > 0)
     OR (sell_foreign_value   IS NOT NULL AND sell_foreign_value   > 0)
  ORDER BY symbol
  LIMIT 100
)
SELECT json_build_object(
  'step',         'sec_def_v3',
  'total_scanned', (SELECT COUNT(*)::int FROM security_definition_v3),
  'summary',      (SELECT COALESCE(json_agg(s), '[]'::json) FROM sec_summary s),
  'invalids',     (SELECT COALESCE(json_agg(i), '[]'::json) FROM sec_invalids i)
)::text AS report_data
UNION ALL
SELECT json_build_object(
  'step',          'realtime_clear',
  'unclean_count', (
    SELECT COUNT(*)::int FROM krx_mdds_v2_stock_infos
    WHERE (highest_price       IS NOT NULL AND highest_price       > 0)
       OR (lowest_price        IS NOT NULL AND lowest_price        > 0)
       OR (open_price          IS NOT NULL AND open_price          > 0)
       OR (close_price         IS NOT NULL AND close_price         > 0)
       OR (average_price       IS NOT NULL AND average_price       > 0)
       OR (buy_foreign_qtty    IS NOT NULL AND buy_foreign_qtty    > 0)
       OR (sell_foreign_qtty   IS NOT NULL AND sell_foreign_qtty   > 0)
       OR (expected_trade_price IS NOT NULL AND expected_trade_price > 0)
       OR (expected_trade_qtty  IS NOT NULL AND expected_trade_qtty  > 0)
       OR (open_interest_qtty   IS NOT NULL AND open_interest_qtty   > 0)
       OR (total_volume_traded  IS NOT NULL AND total_volume_traded  > 0)
       OR (gross_trade_amount   IS NOT NULL AND gross_trade_amount   > 0)
       OR (total_offer_qtty     IS NOT NULL AND total_offer_qtty     > 0)
       OR (total_bid_qtty       IS NOT NULL AND total_bid_qtty       > 0)
       OR (match_price          IS NOT NULL AND match_price          > 0)
       OR (match_qtty           IS NOT NULL AND match_qtty           > 0)
       OR (match_value          IS NOT NULL AND match_value          > 0)
       OR (changed_value        IS NOT NULL AND changed_value        > 0)
       OR (changed_ratio        IS NOT NULL AND changed_ratio        > 0)
       OR (buy_foreign_value    IS NOT NULL AND buy_foreign_value    > 0)
       OR (sell_foreign_value   IS NOT NULL AND sell_foreign_value   > 0)
  ),
  'unclean_samples', (SELECT COALESCE(json_agg(u), '[]'::json) FROM unclean_realtime u)
)::text AS report_data;
`.trim();

return [{
  json: {
    query: combinedSql,
    database: 'timescale',
    environment: 'prod',
    maxRows: 10,
    checkStep: 'step1_and_step2',
    checkTime: '08:20:00 ICT',
    _triggerSource: triggerSource
  }
}];
