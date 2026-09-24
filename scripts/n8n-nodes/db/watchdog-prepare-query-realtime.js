/**
 * Node Script: Prepare Watchdog Query — Step 2: Realtime Clear Check
 * (`scripts/n8n-nodes/watchdog-prepare-query-realtime.js`)
 *
 * Mục đích:
 * Chuẩn bị câu SQL BƯỚC 2 — Kiểm tra bảng `krx_mdds_v2_stock_infos`:
 *   - Đảm bảo 21 trường realtime/giao dịch tích lũy BẮT BUỘC phải CLEAR (NULL hoặc = 0)
 *     trước giờ mở phiên ATO lúc 09:00 AM.
 *   - Các trường cần clear: highest_price, lowest_price, open_price, close_price,
 *     average_price, buy_foreign_qtty, sell_foreign_qtty, expected_trade_price,
 *     expected_trade_qtty, open_interest_qtty, total_volume_traded, gross_trade_amount,
 *     total_offer_qtty, total_bid_qtty, match_price, match_qtty, match_value,
 *     changed_value, changed_ratio, buy_foreign_value, sell_foreign_value.
 *   - Liệt kê tối đa 100 mã chưa clear (nếu có).
 *
 * Output node này được merge với BƯỚC 1 (security_definition_v3) tại node watchdog-verify-health.
 */

// ── SQL BƯỚC 2: Kiểm tra clear trường realtime krx_mdds_v2_stock_infos ───────
const realtimeSql = `
WITH unclean_realtime AS (
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
    query: realtimeSql,
    database: 'timescale',
    environment: 'prod',
    maxRows: 10,
    checkStep: 'step2_realtime_clear',
    checkTime: '08:20:00 ICT'
  }
}];
