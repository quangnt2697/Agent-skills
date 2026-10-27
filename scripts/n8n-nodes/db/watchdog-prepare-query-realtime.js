/**
 * Node Script: Prepare Watchdog Query — Step 2: Realtime Clear & Session-Aware Staleness Check
 * (`scripts/n8n-nodes/db/watchdog-prepare-query-realtime.js`)
 *
 * Mục đích:
 * 1. Hỗ trợ Session-Aware Watchdog:
 *    - Xác định phiên giao dịch KRX hiện tại (PRE_OPEN, ATO, CONTINUOUS_MORNING, LUNCH_BREAK, CONTINUOUS_AFTERNOON, ATC, PLO, CLOSED).
 *    - Trong LUNCH_BREAK (11:30–13:00): Tắt cảnh báo đứng hình (staleness) khớp lệnh, chuyển sang kiểm tra toàn vẹn cuối phiên sáng.
 *    - Trong CONTINUOUS_*: Kiểm tra độ trễ luồng dữ liệu (staleness_seconds) của các topic MDDS trọng yếu.
 *    - Sau 15:15 (CLOSED): Gợi ý chuyển sang EOD Full Reconciliation.
 * 2. Giữ tương thích kiểm tra 21 trường realtime cần clear của `krx_mdds_v2_stock_infos` đầu ngày.
 */

const input = typeof $input !== 'undefined' ? $input.first() : null;
const raw = (input && input.json) || {};

// ── 1. HELPER: KRX MARKET SESSION STATE MACHINE ─────────────────────────────
function getKRXMarketSession(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const vnDate = new Date(utc + (7 * 3600000));
  
  const yyyy = vnDate.getFullYear();
  const mm = String(vnDate.getMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dayOfWeek = vnDate.getDay();

  const vnStockHolidays = [
    '2025-01-01', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
    '2025-04-07', '2025-04-30', '2025-05-01', '2025-05-02', '2025-09-01', '2025-09-02',
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
    '2026-04-26', '2026-04-30', '2026-05-01', '2026-09-01', '2026-09-02',
    '2027-01-01', '2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10',
    '2027-04-16', '2027-04-30', '2027-05-01', '2027-09-02', '2027-09-03'
  ];

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = vnStockHolidays.includes(dateStr);
  const isTradingDay = !isWeekend && !isHoliday;

  const hours = vnDate.getHours();
  const minutes = vnDate.getMinutes();
  const hhmm = hours * 100 + minutes;

  let sessionPhase = 'CLOSED';
  let description = 'Thị trường đóng cửa';

  if (!isTradingDay) {
    sessionPhase = 'CLOSED';
    description = isWeekend ? 'Cuối tuần (Không có giao dịch)' : 'Ngày nghỉ lễ (Không có giao dịch)';
  } else if (hhmm < 845) {
    sessionPhase = 'PRE_OPEN';
    description = 'Trước giờ mở cửa (Kiểm tra reset đầu ngày)';
  } else if (hhmm < 900) {
    sessionPhase = 'ATO';
    description = 'Phiên khớp lệnh định kỳ mở cửa (Phái sinh mở 08:45, Cơ sở mở 09:00)';
  } else if (hhmm < 1130) {
    sessionPhase = 'CONTINUOUS_MORNING';
    description = 'Phiên khớp lệnh liên tục buổi sáng';
  } else if (hhmm < 1300) {
    sessionPhase = 'LUNCH_BREAK';
    description = 'Nghỉ trưa (Tắt cảnh báo đứng hình khớp lệnh)';
  } else if (hhmm < 1430) {
    sessionPhase = 'CONTINUOUS_AFTERNOON';
    description = 'Phiên khớp lệnh liên tục buổi chiều';
  } else if (hhmm < 1445) {
    sessionPhase = 'ATC';
    description = 'Phiên khớp lệnh định kỳ đóng cửa';
  } else if (hhmm < 1500) {
    sessionPhase = 'PLO';
    description = 'Phiên khớp lệnh sau giờ (HNX PLO)';
  } else {
    sessionPhase = 'CLOSED';
    description = 'Thị trường đã đóng cửa (EOD Full Reconciliation)';
  }

  return {
    tradingDate: dateStr,
    dayOfWeek,
    isWeekend,
    isHoliday,
    isTradingDay,
    sessionPhase,
    description,
    timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(vnDate.getSeconds()).padStart(2, '0')} ICT`
  };
}

const marketSession = getKRXMarketSession();
const reqMode = raw.mode || (marketSession.sessionPhase === 'PRE_OPEN' ? 'clear_check' : 'staleness_check');

// ── 2. SQL BƯỚC 2A: KIỂM TRA RESET REALTIME ĐẦU NGÀY ────────────────────────
const clearCheckSql = `
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
      CASE WHEN highest_price                IS NOT NULL AND highest_price                > 0 THEN 'highest_price' END,
      CASE WHEN lowest_price                 IS NOT NULL AND lowest_price                 > 0 THEN 'lowest_price' END,
      CASE WHEN open_price                   IS NOT NULL AND open_price                   > 0 THEN 'open_price' END,
      CASE WHEN close_price                  IS NOT NULL AND close_price                  > 0 THEN 'close_price' END,
      CASE WHEN average_price                IS NOT NULL AND average_price                > 0 THEN 'average_price' END,
      CASE WHEN buy_foreign_quantity         IS NOT NULL AND buy_foreign_quantity         > 0 THEN 'buy_foreign_quantity' END,
      CASE WHEN sell_foreign_quantity        IS NOT NULL AND sell_foreign_quantity        > 0 THEN 'sell_foreign_quantity' END,
      CASE WHEN expected_trade_price         IS NOT NULL AND expected_trade_price         > 0 THEN 'expected_trade_price' END,
      CASE WHEN expected_trade_quantity      IS NOT NULL AND expected_trade_quantity      > 0 THEN 'expected_trade_quantity' END,
      CASE WHEN open_interest_quantity       IS NOT NULL AND open_interest_quantity       > 0 THEN 'open_interest_quantity' END,
      CASE WHEN total_volume_traded          IS NOT NULL AND total_volume_traded          > 0 THEN 'total_volume_traded' END,
      CASE WHEN gross_trade_amount           IS NOT NULL AND gross_trade_amount           > 0 THEN 'gross_trade_amount' END,
      CASE WHEN sell_total_order_quantity    IS NOT NULL AND sell_total_order_quantity    > 0 THEN 'sell_total_order_quantity' END,
      CASE WHEN buy_total_order_quantity     IS NOT NULL AND buy_total_order_quantity     > 0 THEN 'buy_total_order_quantity' END,
      CASE WHEN match_price                  IS NOT NULL AND match_price                  > 0 THEN 'match_price' END,
      CASE WHEN match_quantity               IS NOT NULL AND match_quantity               > 0 THEN 'match_quantity' END,
      CASE WHEN match_value                  IS NOT NULL AND match_value                  > 0 THEN 'match_value' END,
      CASE WHEN changed_value                IS NOT NULL AND changed_value                > 0 THEN 'changed_value' END,
      CASE WHEN changed_ratio                IS NOT NULL AND changed_ratio                > 0 THEN 'changed_ratio' END,
      CASE WHEN buy_foreign_value            IS NOT NULL AND buy_foreign_value            > 0 THEN 'buy_foreign_value' END,
      CASE WHEN sell_foreign_value           IS NOT NULL AND sell_foreign_value           > 0 THEN 'sell_foreign_value' END
    ) AS uncleared_fields
  FROM krx_mdds_v2_stock_infos
  WHERE created_date >= CURRENT_DATE
    AND (
         (highest_price                IS NOT NULL AND highest_price                > 0)
      OR (lowest_price                 IS NOT NULL AND lowest_price                 > 0)
      OR (open_price                   IS NOT NULL AND open_price                   > 0)
      OR (close_price                  IS NOT NULL AND close_price                  > 0)
      OR (average_price                IS NOT NULL AND average_price                > 0)
      OR (buy_foreign_quantity         IS NOT NULL AND buy_foreign_quantity         > 0)
      OR (sell_foreign_quantity        IS NOT NULL AND sell_foreign_quantity        > 0)
      OR (expected_trade_price         IS NOT NULL AND expected_trade_price         > 0)
      OR (expected_trade_quantity      IS NOT NULL AND expected_trade_quantity      > 0)
      OR (open_interest_quantity       IS NOT NULL AND open_interest_quantity       > 0)
      OR (total_volume_traded          IS NOT NULL AND total_volume_traded          > 0)
      OR (gross_trade_amount           IS NOT NULL AND gross_trade_amount           > 0)
      OR (sell_total_order_quantity    IS NOT NULL AND sell_total_order_quantity    > 0)
      OR (buy_total_order_quantity     IS NOT NULL AND buy_total_order_quantity     > 0)
      OR (match_price                  IS NOT NULL AND match_price                  > 0)
      OR (match_quantity               IS NOT NULL AND match_quantity               > 0)
      OR (match_value                  IS NOT NULL AND match_value                  > 0)
      OR (changed_value                IS NOT NULL AND changed_value                > 0)
      OR (changed_ratio                IS NOT NULL AND changed_ratio                > 0)
      OR (buy_foreign_value            IS NOT NULL AND buy_foreign_value            > 0)
      OR (sell_foreign_value           IS NOT NULL AND sell_foreign_value           > 0)
    )
  ORDER BY symbol
  LIMIT 100
)
SELECT json_build_object(
  'step',          'realtime_clear',
  'unclean_count', (
    SELECT COUNT(*)::int FROM krx_mdds_v2_stock_infos
    WHERE created_date >= CURRENT_DATE
      AND (
           (highest_price                IS NOT NULL AND highest_price                > 0)
        OR (lowest_price                 IS NOT NULL AND lowest_price                 > 0)
        OR (open_price                   IS NOT NULL AND open_price                   > 0)
        OR (close_price                  IS NOT NULL AND close_price                  > 0)
        OR (average_price                IS NOT NULL AND average_price                > 0)
        OR (buy_foreign_quantity         IS NOT NULL AND buy_foreign_quantity         > 0)
        OR (sell_foreign_quantity        IS NOT NULL AND sell_foreign_quantity        > 0)
        OR (expected_trade_price         IS NOT NULL AND expected_trade_price         > 0)
        OR (expected_trade_quantity      IS NOT NULL AND expected_trade_quantity      > 0)
        OR (open_interest_quantity       IS NOT NULL AND open_interest_quantity       > 0)
        OR (total_volume_traded          IS NOT NULL AND total_volume_traded          > 0)
        OR (gross_trade_amount           IS NOT NULL AND gross_trade_amount           > 0)
        OR (sell_total_order_quantity    IS NOT NULL AND sell_total_order_quantity    > 0)
        OR (buy_total_order_quantity     IS NOT NULL AND buy_total_order_quantity     > 0)
        OR (match_price                  IS NOT NULL AND match_price                  > 0)
        OR (match_quantity               IS NOT NULL AND match_quantity               > 0)
        OR (match_value                  IS NOT NULL AND match_value                  > 0)
        OR (changed_value                IS NOT NULL AND changed_value                > 0)
        OR (changed_ratio                IS NOT NULL AND changed_ratio                > 0)
        OR (buy_foreign_value            IS NOT NULL AND buy_foreign_value            > 0)
        OR (sell_foreign_value           IS NOT NULL AND sell_foreign_value           > 0)
      )
  ),
  'unclean_samples', (SELECT COALESCE(json_agg(u), '[]'::json) FROM unclean_realtime u)
)::text AS report_data;
`.trim();

// ── 3. SQL BƯỚC 2B: REALTIME STALENESS & FLOW CHECK (TRONG PHIÊN) ───────────
const stalenessSql = `
WITH topic_staleness AS (
  SELECT 'krx_mdds_v3_ticks' AS topic_name, MAX(sending_time) AS max_time,
         ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(sending_time)))::numeric, 1) AS latency_seconds,
         COUNT(*)::int AS row_count
  FROM krx_mdds_v3_ticks
  WHERE sending_time >= CURRENT_DATE
  UNION ALL
  SELECT 'krx_mdds_v3_top_prices' AS topic_name, MAX(sending_time) AS max_time,
         ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(sending_time)))::numeric, 1) AS latency_seconds,
         COUNT(*)::int AS row_count
  FROM krx_mdds_v3_top_prices
  WHERE sending_time >= CURRENT_DATE
  UNION ALL
  SELECT 'krx_mdds_v3_market_indices' AS topic_name, MAX(transact_time) AS max_time,
         ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(transact_time)))::numeric, 1) AS latency_seconds,
         COUNT(*)::int AS row_count
  FROM krx_mdds_v3_market_indices
  WHERE transact_time >= CURRENT_DATE
)
SELECT json_build_object(
  'step', 'realtime_staleness',
  'session_phase', '${marketSession.sessionPhase}',
  'is_trading_day', ${marketSession.isTradingDay},
  'topics', (SELECT json_agg(t) FROM topic_staleness t)
)::text AS report_data;
`.trim();

const isClearMode = reqMode === 'clear_check';
const chosenSql = isClearMode ? clearCheckSql : stalenessSql;
const allowStalenessAlerts = marketSession.sessionPhase.startsWith('CONTINUOUS_');

return [{
  json: {
    query: chosenSql,
    database: 'timescale',
    environment: 'prod',
    maxRows: 10,
    checkStep: isClearMode ? 'step2_realtime_clear' : 'step2_realtime_staleness',
    marketSession,
    sessionPhase: marketSession.sessionPhase,
    isTradingDay: marketSession.isTradingDay,
    allowStalenessAlerts,
    checkTime: marketSession.timeStr,
    _triggerSource: 'executeWorkflow'
  }
}];
