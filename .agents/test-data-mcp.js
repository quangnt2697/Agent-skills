#!/usr/bin/env node
/**
 * Test Data MCP Server (.agents/test-data-mcp.js)
 *
 * MCP Server chuyên biệt cho QA — cung cấp fixture data thật từ TimescaleDB.
 * Phục vụ skill qa-test-design (BVA/checklist) và qa-auto-design (conftest fixtures).
 *
 * Tools:
 *   td_get_market_snapshot  — Phiên hiện tại + N mã mỗi board/sàn (tool chính)
 *   td_get_security_info    — Chi tiết 1 mã cụ thể
 *   td_get_tick_samples     — Mẫu tick khớp lệnh theo symbol+date
 *   td_get_price_limits     — Giá trần/sàn/tham chiếu
 *   td_get_session_flags    — Cờ phiên hiện tại
 *   td_export_fixture       — Ghi fixture ra workspace/{issueKey}/test/fixtures/
 *
 * NGUYÊN TẮC BẤT BIẾN:
 *   - READ-ONLY với TimescaleDB (không INSERT/UPDATE/DELETE)
 *   - KHÔNG push bất kỳ dữ liệu nào lên Jira / Confluence / GitLab
 *   - Tuân thủ rule V3 > V2 (ưu tiên bảng v3, fallback v2)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    loadEnv, projectRoot,
    metabaseFetch, metabaseRunSql,
    sanitizeQuery, applyLimit,
    CACHE_DIR, ensureCacheDir,
    DEFAULT_STATEMENT_TIMEOUT_MS,
    resolveOpenApiDatabase,
} from './db-client.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Nạp thêm .env example nếu có
loadEnv(path.join(projectRoot, 'plugins/qa/skills/qa-auto-design/examples/.env.example'));

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT_CONFIG — Toàn bộ mapping field ở đây.
// Khi cần thêm/bớt/sửa field: CHỈ SỬA CONFIG NÀY, không đụng logic query.
// ─────────────────────────────────────────────────────────────────────────────
const SNAPSHOT_CONFIG = {

    // === NHÓM A: PHIÊN HIỆN TẠI ===
    session: {
        table:          'krx_mdds_v3_board_events',
        fallback_table: 'krx_mdds_v2_board_events',
        // Mapping cờ phiên KRX → tên dễ đọc. Thêm cờ mới ở đây.
        session_name_map: {
            'AA1': 'ATO',
            'BB1': 'Liên tục',
            'BC1': 'ATC',
            'AW8': 'PLO',
            'AW9': 'PLO Kết thúc',
            'AC2': 'Nghỉ trưa',
            'EI8': 'Halt (Tạm dừng)',
            'EI9': 'Mở lại Liên tục',
            'EI1': 'Định kỳ 15 phút sau Halt',
            'AF6': 'Circuit Breaker kích hoạt',
            'AF8': 'Circuit Breaker giải tỏa',
            'BF9': 'Circuit Breaker kết thúc',
        },
    },

    // === NHÓM B1: THÔNG TIN MÃ CHỨNG KHOÁN ===
    // security_definition_v3: không có symbol_name / security_exchange (chỉ 18 cột)
    // Phải dùng security_definitions (v2) cho phần identify + sàn + board
    // security_definition_v3 có: ceiling_price, floor_price, basic_price (=ref) — dùng trong price_limits
    // === NHÓM B1: THÔNG TIN MÃ CHỨNG KHOÁN ===
    // Theo yêu cầu: CHỈ sử dụng bảng security_definition_v3.
    // Bảng v3 không có symbol_name và security_exchange, chỉ có market_id, board_id (int4) và symbol.
    security_info: {
        table:          'security_definition_v3',
        symbols_per_board: 2,       // Số mã lấy mỗi (market_id, board_id)
        
        // Theo tài liệu KRX MDDS:
        // 6: STO (HoSE), 7: STX (HNX), 8: UPX (UpCoM), 3: DVX (Phái sinh)
        markets_id: [6, 7, 8, 3], 
        
        // Cơ chế map ID nguyên gốc thành Text (Theo enum MarketID của KRX)
        market_name_map: {
            1: 'BDO',
            2: 'BDX',
            3: 'DVX', // Phái sinh
            4: 'HCX',
            5: 'RPO',
            6: 'STO', // HoSE
            7: 'STX', // HNX
            8: 'UPX'  // UPCOM
        },
        // Theo enum BoardID của KRX
        board_name_map: {
            1: 'AL',
            2: 'G1', // Lô chẵn
            3: 'G2',
            4: 'G3', // Lô chẵn Post closing
            5: 'G4', // Lô lẻ
            6: 'G7', // Buy-in
            7: 'G8',
            8: 'R1',
            9: 'T1', // Thỏa thuận lô chẵn regular
            10: 'T2', // Thỏa thuận lô chẵn pre
            11: 'T3', // Thỏa thuận lô chẵn post
            12: 'T4', // Thỏa thuận lô lẻ regular
            13: 'T6'  // Thỏa thuận lô lẻ post
        },

        fields: [
            { col: 'symbol',            alias: 'symbol' },
            { col: 'market_id',         alias: 'market_id' },
            { col: 'board_id',          alias: 'board_id' },
        ],
    },

    // === NHÓM B2: GIÁ TRẦN/SÀN/THAM CHIẾU ===
    // security_definition_v3 có sẵn cả 3 giá: ceiling_price, floor_price, basic_price (=reference)
    // Nhưng không có symbol_name/security_exchange — nên cần join với security_definitions
    // Mặc định JOIN trong 1 query khi bạn gọi include_groups: ["price_limits"]
    // Đối với query riêng td_get_price_limits — lấy từ security_definition_v3 theo symbol
    price_limits: {
        table:          'security_definition_v3', // v3 — có ceiling_price, floor_price, basic_price
        fallback_table: 'krx_mdds_v2_stock_infos',// fallback nếu cần giá realtime tick
        // Thêm field mới: { col: 'prev_close_px', alias: 'prev_close_price' }
        fields: [
            { col: 'basic_price',     alias: 'reference_price' }, // basic_price = giá tham chiếu
            { col: 'ceiling_price',   alias: 'ceiling_price' },
            { col: 'floor_price',     alias: 'floor_price' },
        ],
    },

    // === NHÓM B3+B4: THỐNG KÊ + KHỚP GẦN NHẤT (krx_mdds_v3_ticks — 1 query) ===
    // total_volume_traded & gross_trade_amount là cột TÍCH LŨY (cumulative).
    // Lấy DISTINCT ON (symbol) ORDER BY sending_time DESC — KHÔNG SUM.
    tick_snapshot: {
        table:          'krx_mdds_v3_ticks',
        fallback_table: 'krx_mdds_v2_ticks',
        strategy:       'DISTINCT ON latest',
        // Thêm field mới: { col: 'side', alias: 'last_side' }
        fields: [
            { col: 'total_volume_traded', alias: 'total_matched_volume' }, // cumulative
            { col: 'gross_trade_amount',  alias: 'total_matched_value' },  // cumulative
            { col: 'match_price',         alias: 'last_match_price' },
            { col: 'match_qtty',          alias: 'last_match_qtty' },
            { col: 'sending_time',        alias: 'last_match_time' },
        ],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SQL BUILDERS — Mỗi hàm build SQL từ SNAPSHOT_CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TZ = "'Asia/Ho_Chi_Minh'";

function buildSessionQuery(cfg, date) {
    const whereClause = date
        ? `WHERE DATE(sending_time AT TIME ZONE ${TZ}) = '${date}'`
        : '';
    return `
SELECT DISTINCT ON (market_id, board_id)
    market_id,
    board_id,
    trading_session_id  AS session_flag,
    sending_time        AS started_at
FROM ${cfg.table}
${whereClause}
ORDER BY market_id, board_id, sending_time DESC
LIMIT 50`.trim();
}

function buildSecurityPickQuery(cfg, date) {
    const marketIds  = cfg.markets_id ? cfg.markets_id.join(', ') : '6, 7, 8';
    const n          = cfg.symbols_per_board || 2;
    const whereConditions = [`market_id IN (${marketIds})`];
    if (date) {
        whereConditions.push(`DATE(sending_time AT TIME ZONE ${TZ}) = '${date}'`);
    }

    return `
WITH ranked AS (
    SELECT
        symbol,
        market_id,
        board_id,
        ceiling_price,
        floor_price,
        basic_price       AS reference_price,
        ROW_NUMBER() OVER (
            PARTITION BY market_id, board_id
            ORDER BY sending_time DESC
        ) AS rn
    FROM security_definition_v3
    WHERE ${whereConditions.join(' AND ')}
)
SELECT symbol, market_id, board_id, ceiling_price, floor_price, reference_price
FROM ranked
WHERE rn <= ${n}
ORDER BY market_id, board_id, symbol
LIMIT 200`.trim();
}

function buildPriceLimitsQuery(cfg, symbols, date) {
    const symList    = symbols.map(s => `'${s}'`).join(', ');
    const dateClause = date
        ? `AND DATE(sending_time AT TIME ZONE ${TZ}) = '${date}'`
        : '';
    // Dùng security_definition_v3: có ceiling_price, floor_price, basic_price (=reference)
    return `
SELECT DISTINCT ON (symbol)
    symbol,
    basic_price    AS reference_price,
    ceiling_price,
    floor_price
FROM security_definition_v3
WHERE symbol IN (${symList})
  ${dateClause}
ORDER BY symbol, sending_time DESC
LIMIT 200`.trim();
}

function buildTickSnapshotQuery(cfg, symbols, date) {
    const symList = symbols.map(s => `'${s}'`).join(', ');
    const dateClause = date
        ? `AND DATE(sending_time AT TIME ZONE ${TZ}) = '${date}'`
        : '';
    return `
SELECT DISTINCT ON (symbol)
    symbol,
    total_volume_traded AS total_matched_volume,
    gross_trade_amount  AS total_matched_value,
    match_price         AS last_match_price,
    match_qtty          AS last_match_qtty,
    sending_time        AS last_match_time
FROM ${cfg.table}
WHERE symbol IN (${symList})
  ${dateClause}
ORDER BY symbol, sending_time DESC
LIMIT 200`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

const DB_TIMESCALE = 'timescale';

/**
 * td_get_market_snapshot — Tool chính
 * Tổng hợp: phiên hiện tại + N mã mỗi board mỗi sàn trong 4 queries.
 */
async function tdGetMarketSnapshot({ symbols_per_board, markets, boards, date, include_groups } = {}) {
    const cfg          = JSON.parse(JSON.stringify(SNAPSHOT_CONFIG)); // deep clone tránh mutate
    const n            = symbols_per_board || cfg.security_info.symbols_per_board;
    const mktFilter    = markets || cfg.security_info.markets;
    const targetDate   = date || null;
    const groups       = include_groups || ['session', 'security_info', 'price_limits', 'tick_snapshot'];
    const sourceTables = [];
    const startAll     = Date.now();

    // Override config nếu caller chỉ định
    cfg.security_info.symbols_per_board = n;
    cfg.security_info.markets           = mktFilter;

    const result = {
        snapshot_time: new Date().toISOString(),
        date: targetDate || new Date().toISOString().slice(0, 10),
        current_sessions: [],
        securities: [],
        _meta: { source_tables: [], query_duration_ms: 0, total_symbols: 0, symbols_per_board: n }
    };

    // ── Query 1: Phiên hiện tại ──────────────────────────────────────────────
    if (groups.includes('session')) {
        const sql = buildSessionQuery(cfg.session, targetDate);
        const { rows, durationMs } = await metabaseRunSql(sql, DB_TIMESCALE);
        const nameMap = cfg.session.session_name_map;
        result.current_sessions = rows.map(r => ({
            market:       r.market_id,
            board_id:     r.board_id,
            session_flag: r.session_flag,
            session_name: nameMap[r.session_flag] || r.session_flag,
            started_at:   r.started_at,
        }));
        sourceTables.push(cfg.session.table);
    }

    // ── Query 2+3 (gộp): Lấy N mã mỗi board/sàn + giá trần/sàn/tham chiếu (từ v3) ──────
    let symbols = [];
    if (groups.includes('security_info') || groups.includes('price_limits')) {
        const sql = buildSecurityPickQuery(cfg.security_info, targetDate);
        const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
        let filteredRows = rows;
        if (boards && boards.length > 0) {
            filteredRows = rows.filter(r => boards.includes(r.board_id));
        }
        filteredRows.forEach(r => {
            const sec = {
                symbol:      r.symbol,
                market_id:   r.market_id,
                market_name: cfg.security_info.market_name_map[r.market_id] || String(r.market_id),
                board_id:    r.board_id,
                board_name:  cfg.security_info.board_name_map[r.board_id] || String(r.board_id),
            };
            if (groups.includes('price_limits')) {
                sec.reference_price = r.reference_price ?? null;
                sec.ceiling_price   = r.ceiling_price   ?? null;
                sec.floor_price     = r.floor_price     ?? null;
            }
            result.securities.push(sec);
        });
        symbols = filteredRows.map(r => r.symbol);
        sourceTables.push('security_definition_v3');
    }


    // ── Query 4+5 (hợp nhất): Tổng KL/GT + Khớp gần nhất từ v3_ticks ───────
    if (groups.includes('tick_snapshot') && symbols.length > 0) {
        const sql = buildTickSnapshotQuery(cfg.tick_snapshot, symbols, targetDate);
        const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
        const tickMap = {};
        rows.forEach(r => { tickMap[r.symbol] = r; });
        result.securities.forEach(sec => {
            const t = tickMap[sec.symbol] || {};
            sec.total_matched_volume = t.total_matched_volume ?? null;
            sec.total_matched_value  = t.total_matched_value  ?? null;
            sec.last_match_price     = t.last_match_price     ?? null;
            sec.last_match_qtty      = t.last_match_qtty      ?? null;
            sec.last_match_time      = t.last_match_time      ?? null;
        });
        sourceTables.push(cfg.tick_snapshot.table);
    }

    result._meta.source_tables   = [...new Set(sourceTables)];
    result._meta.query_duration_ms = Date.now() - startAll;
    result._meta.total_symbols    = result.securities.length;

    return result;
}

/**
 * td_get_security_info — Chi tiết 1 mã chứng khoán (từ v3)
 */
async function tdGetSecurityInfo({ symbol }) {
    if (!symbol) throw new Error('Thiếu tham số bắt buộc: symbol');
    const sym = symbol.toUpperCase().trim();
    const sql = `
SELECT DISTINCT ON (symbol)
    symbol, market_id, board_id, basic_price, ceiling_price, floor_price, sending_time
FROM security_definition_v3
WHERE symbol = '${sym}'
ORDER BY symbol, sending_time DESC
LIMIT 1`.trim();
    const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
    if (!rows.length) throw new Error(`Không tìm thấy mã "${sym}" trong security_definition_v3.`);
    
    // Map qua Text nếu có
    const r = rows[0];
    const cfg = SNAPSHOT_CONFIG.security_info;
    r.market_name = cfg.market_name_map[r.market_id] || String(r.market_id);
    r.board_name  = cfg.board_name_map[r.board_id] || String(r.board_id);
    
    return r;
}

/**
 * td_get_tick_samples — Mẫu tick khớp lệnh
 */
async function tdGetTickSamples({ symbol, date, limit = 10, table_version = 'v3' }) {
    if (!symbol) throw new Error('Thiếu tham số bắt buộc: symbol');
    const sym        = symbol.toUpperCase().trim();
    const tbl        = table_version === 'v2' ? 'krx_mdds_v2_ticks' : 'krx_mdds_v3_ticks';
    const dateFilter = date ? `'${date}'` : 'CURRENT_DATE';
    const n          = Math.min(limit, 50);
    const sql = `
SELECT
    symbol, match_price, match_qtty, sending_time AS timestamp,
    total_volume_traded, gross_trade_amount
FROM ${tbl}
WHERE symbol = '${sym}'
  AND DATE(sending_time AT TIME ZONE ${TZ}) = ${dateFilter}
ORDER BY sending_time DESC
LIMIT ${n}`.trim();
    const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
    return { symbol: sym, table: tbl, date: date || 'today', count: rows.length, ticks: rows };
}

/**
 * td_get_price_limits — Giá trần/sàn/tham chiếu 1 mã
 */
async function tdGetPriceLimits({ symbol, date }) {
    if (!symbol) throw new Error('Thiếu tham số bắt buộc: symbol');
    const sym        = symbol.toUpperCase().trim();
    const dateFilter = date ? `'${date}'` : 'CURRENT_DATE';
    // Ưu tiên security_definition_v3 (có ceiling_price, floor_price, basic_price)
    const sql = `
SELECT DISTINCT ON (symbol)
    symbol,
    basic_price    AS reference_price,
    ceiling_price,
    floor_price
FROM security_definition_v3
WHERE symbol = '${sym}'
  AND DATE(sending_time AT TIME ZONE ${TZ}) = ${dateFilter}
ORDER BY symbol, sending_time DESC
LIMIT 1`.trim();
    const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
    if (!rows.length) throw new Error(`Không tìm thấy price limits cho "${sym}" ngày ${date || 'hôm nay'}.`);
    return rows[0];
}

/**
 * td_get_session_flags — Cờ phiên hiện tại tất cả boards
 */
async function tdGetSessionFlags({ market, date } = {}) {
    const dateFilter = date ? `'${date}'` : 'CURRENT_DATE';
    const mktFilter  = market ? `AND market_id = '${market}'` : '';
    const sql = `
SELECT DISTINCT ON (market_id, board_id)
    market_id,
    board_id,
    trading_session_id AS session_flag,
    sending_time       AS started_at
FROM krx_mdds_v3_board_events
WHERE DATE(sending_time AT TIME ZONE ${TZ}) = ${dateFilter}
  ${mktFilter}
ORDER BY market_id, board_id, sending_time DESC
LIMIT 50`.trim();
    const { rows } = await metabaseRunSql(sql, DB_TIMESCALE);
    const nameMap = SNAPSHOT_CONFIG.session.session_name_map;
    return rows.map(r => ({
        market:       r.market_id,
        board_id:     r.board_id,
        session_flag: r.session_flag,
        session_name: nameMap[r.session_flag] || r.session_flag,
        started_at:   r.started_at,
    }));
}

/**
 * td_export_fixture — Ghi fixture ra workspace/{issueKey}/test/fixtures/{filename}.json
 */
async function tdExportFixture({ issueKey, data, filename = 'market_data' }) {
    if (!issueKey) throw new Error('Thiếu tham số bắt buộc: issueKey');
    if (data === undefined || data === null) throw new Error('Thiếu tham số bắt buộc: data');

    // Tìm thư mục workspace từ projectRoot hoặc các path thông dụng
    const candidates = [
        path.join(projectRoot, 'workspace', issueKey, 'test', 'fixtures'),
        path.join(projectRoot, '..', 'workspace', issueKey, 'test', 'fixtures'),
        path.join(process.cwd(), 'workspace', issueKey, 'test', 'fixtures'),
    ];

    let fixturesDir = candidates[0]; // default
    for (const c of candidates) {
        const testDir = path.dirname(c);
        if (fs.existsSync(testDir)) { fixturesDir = c; break; }
    }

    if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
    }

    const fname   = filename.endsWith('.json') ? filename : `${filename}.json`;
    const outPath = path.join(fixturesDir, fname);
    const payload = {
        _generated_at: new Date().toISOString(),
        _source:       'test-data-mcp.js (TimescaleDB)',
        _issue_key:    issueKey,
        data,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

    return {
        written: true,
        path:    outPath,
        size_bytes: fs.statSync(outPath).size,
        issue_key:  issueKey,
        filename:   fname,
    };
}

// ─── CÁC TOOL MỚI BỔ SUNG ────────────────────────────────────────────────────

function safeJsonParse(val, defaultVal = []) {
    if (val === null || val === undefined) return defaultVal;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (_) {
        return defaultVal;
    }
}

/**
 * td_get_order_book — Sổ lệnh thị trường (Market Depth / Top Prices)
 * Lấy tất cả các bước giá chào mua (bid) và chào bán (offer) đang có của mã từ KRX MDDS v3 (fallback v2).
 */
async function tdGetOrderBook({ symbol, date, table_version = 'v3' } = {}) {
    if (!symbol) throw new Error('Thiếu tham số bắt buộc: symbol');
    const sym = symbol.toUpperCase().trim();
    const tbl = table_version === 'v2' ? 'krx_mdds_v2_top_prices' : 'krx_mdds_v3_top_prices';
    const dateFilter = date ? `'${date}'` : 'CURRENT_DATE';

    // 1. Query theo ngày chỉ định (hoặc hôm nay)
    let sql = `
SELECT DISTINCT ON (symbol)
    symbol, market_id, board_id, isin, sending_time,
    bid, offer, total_bid_qtty, total_offer_qtty
FROM ${tbl}
WHERE symbol = '${sym}'
  AND DATE(sending_time AT TIME ZONE ${TZ}) = ${dateFilter}
ORDER BY symbol, sending_time DESC
LIMIT 1`.trim();

    let { rows } = await metabaseRunSql(sql, DB_TIMESCALE);

    // 2. Nếu ngày hôm nay chưa có dữ liệu/ngoài giờ giao dịch, tự động lấy snapshot mới nhất
    if (!rows.length && !date) {
        sql = `
SELECT DISTINCT ON (symbol)
    symbol, market_id, board_id, isin, sending_time,
    bid, offer, total_bid_qtty, total_offer_qtty
FROM ${tbl}
WHERE symbol = '${sym}'
ORDER BY symbol, sending_time DESC
LIMIT 1`.trim();
        const fallbackRes = await metabaseRunSql(sql, DB_TIMESCALE);
        rows = fallbackRes.rows;
    }

    if (!rows.length) {
        throw new Error(`Không tìm thấy dữ liệu sổ lệnh cho mã "${sym}" trong bảng ${tbl}.`);
    }

    const r = rows[0];
    const parsedBid = safeJsonParse(r.bid);
    const parsedOffer = safeJsonParse(r.offer);
    const cfg = SNAPSHOT_CONFIG.security_info;

    return {
        symbol:            r.symbol,
        market_id:         r.market_id,
        market_name:       cfg.market_name_map[r.market_id] || String(r.market_id),
        board_id:          r.board_id,
        board_name:        cfg.board_name_map[r.board_id] || String(r.board_id),
        isin:              r.isin,
        sending_time:      r.sending_time,
        total_bid_qtty:    r.total_bid_qtty,
        total_offer_qtty:  r.total_offer_qtty,
        bid_levels:        parsedBid,   // Toàn bộ các bước giá chào mua [{price, qtty}, ...]
        offer_levels:      parsedOffer, // Toàn bộ các bước giá chào bán [{price, qtty}, ...]
        levels_count: {
            bid:   Array.isArray(parsedBid) ? parsedBid.length : 0,
            offer: Array.isArray(parsedOffer) ? parsedOffer.length : 0,
        },
        source_table:      tbl,
    };
}

/**
 * td_get_personal_orders — Sổ lệnh cá nhân của một tài khoản (Personal Order Book)
 * Truy vấn danh sách lệnh đặt thực tế của tài khoản từ DB OpenAPI (535) hoặc Sandbox (655).
 */
async function tdGetPersonalOrders({ account_no, symbol, status, environment, limit = 20 } = {}) {
    const targetDb = resolveOpenApiDatabase(environment);
    const n = Math.min(limit, 100);
    const whereClauses = ['1=1'];
    if (account_no) whereClauses.push(`account_no = '${account_no.trim()}'`);
    if (symbol) whereClauses.push(`symbol = '${symbol.toUpperCase().trim()}'`);
    if (status) whereClauses.push(`status = '${status.trim().toUpperCase()}'`);

    const sql = `
SELECT *
FROM orders
WHERE ${whereClauses.join(' AND ')}
ORDER BY created_at DESC
LIMIT ${n}`.trim();

    try {
        const { rows } = await metabaseRunSql(sql, targetDb);
        return {
            environment: targetDb,
            count: rows.length,
            orders: rows,
        };
    } catch (err) {
        return {
            environment: targetDb,
            status: 'UNAVAILABLE_OR_EMPTY',
            message: `Không thể lấy sổ lệnh cá nhân từ database ${targetDb}: ${err.message}`,
            orders: [],
        };
    }
}

/**
 * td_get_api_key_sample — Lấy mẫu API Key / Credential kiểm thử
 * Phục vụ test auth hoặc verify trạng thái key từ đúng database môi trường (535 vs 655).
 */
async function tdGetApiKeySample({ environment, limit = 5 } = {}) {
    const targetDb = resolveOpenApiDatabase(environment);
    const n = Math.min(limit, 50);
    const sql = `
SELECT id, investor_id, api_key, status, user_type_code, created_at
FROM api_keys
ORDER BY created_at DESC
LIMIT ${n}`.trim();

    try {
        const { rows } = await metabaseRunSql(sql, targetDb);
        return {
            environment: targetDb,
            count: rows.length,
            api_keys: rows,
        };
    } catch (err) {
        return {
            environment: targetDb,
            status: 'ERROR',
            message: `Lỗi truy vấn api_keys từ database ${targetDb}: ${err.message}`,
            api_keys: [],
        };
    }
}

/**
 * td_get_market_indices — Chỉ số thị trường (VN-Index, VN30, UPCOM Index...)
 * Lấy từ krx_mdds_v3_market_indices (DB 644).
 */
async function tdGetMarketIndices({ index_code, date, table_version = 'v3' } = {}) {
    const tbl = table_version === 'v2' ? 'krx_mdds_v2_market_indices' : 'krx_mdds_v3_market_indices';
    const dateFilter = date ? `'${date}'` : 'CURRENT_DATE';
    const codeFilter = index_code ? `AND index_type_code = '${index_code.trim()}'` : '';

    let sql = `
SELECT DISTINCT ON (market_id, index_type_code)
    market_id,
    trading_session_id,
    index_type_code,
    transact_time,
    value_indexes,
    total_volume_traded,
    gross_trade_amount
FROM ${tbl}
WHERE DATE(transact_time AT TIME ZONE ${TZ}) = ${dateFilter}
  ${codeFilter}
ORDER BY market_id, index_type_code, transact_time DESC
LIMIT 50`.trim();

    let { rows } = await metabaseRunSql(sql, DB_TIMESCALE);

    if (!rows.length && !date) {
        sql = `
SELECT DISTINCT ON (market_id, index_type_code)
    market_id,
    trading_session_id,
    index_type_code,
    transact_time,
    value_indexes,
    total_volume_traded,
    gross_trade_amount
FROM ${tbl}
WHERE 1=1
  ${codeFilter}
ORDER BY market_id, index_type_code, transact_time DESC
LIMIT 50`.trim();
        const fallbackRes = await metabaseRunSql(sql, DB_TIMESCALE);
        rows = fallbackRes.rows;
    }

    const indexNameMap = {
        '001': 'VN-Index',
        '002': 'VN30',
        '003': 'VNX50',
        '101': 'HNX-Index',
        '102': 'HNX30',
        '301': 'UPCOM-Index',
    };

    return rows.map(r => ({
        market_id:           r.market_id,
        index_type_code:     r.index_type_code,
        index_name:          indexNameMap[r.index_type_code] || `Index-${r.index_type_code}`,
        trading_session_id:  r.trading_session_id,
        transact_time:       r.transact_time,
        index_value:         r.value_indexes,
        total_volume_traded: r.total_volume_traded,
        gross_trade_amount:  r.gross_trade_amount,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS_SCHEMA = [
    {
        name: 'td_get_market_snapshot',
        description: 'Tổng hợp thông tin thị trường: phiên hiện tại + N mã mỗi board/sàn (giá trần/sàn/tham chiếu, tổng KL/GT khớp, giá khớp gần nhất). Dùng cho qa-test-design (BVA) và qa-auto-design (fixture).',
        inputSchema: {
            type: 'object',
            properties: {
                symbols_per_board: { type: 'number', description: 'Số mã lấy mỗi board. Mặc định: 2' },
                markets:  { type: 'array',  items: { type: 'string' }, description: 'Danh sách sàn. Mặc định: ["HOSE","HNX","UPCOM"]' },
                boards:   { type: 'array',  items: { type: 'string' }, description: 'Lọc theo board_id (G1, G4...). null = tất cả' },
                date:     { type: 'string', description: 'Ngày YYYY-MM-DD. null = hôm nay' },
                include_groups: {
                    type: 'array', items: { type: 'string' },
                    description: 'Nhóm dữ liệu cần lấy. Tùy chọn: session, security_info, price_limits, tick_snapshot. Mặc định: tất cả',
                },
            },
        },
    },
    {
        name: 'td_get_security_info',
        description: 'Lấy thông tin niêm yết của 1 mã chứng khoán: tên, sàn, board_id.',
        inputSchema: {
            type: 'object',
            required: ['symbol'],
            properties: {
                symbol: { type: 'string', description: 'Mã chứng khoán (VD: VNM, SSI)' },
            },
        },
    },
    {
        name: 'td_get_tick_samples',
        description: 'Lấy N tick khớp lệnh gần nhất cho 1 mã từ krx_mdds_v3_ticks (mặc định) hoặc v2.',
        inputSchema: {
            type: 'object',
            required: ['symbol'],
            properties: {
                symbol:        { type: 'string', description: 'Mã chứng khoán' },
                date:          { type: 'string', description: 'Ngày YYYY-MM-DD. Mặc định: hôm nay' },
                limit:         { type: 'number', description: 'Số tick cần lấy (tối đa 50). Mặc định: 10' },
                table_version: { type: 'string', enum: ['v3', 'v2'], description: 'Phiên bản bảng. Mặc định: v3' },
            },
        },
    },
    {
        name: 'td_get_price_limits',
        description: 'Lấy giá trần/sàn/tham chiếu của 1 mã từ security_definition_v3.',
        inputSchema: {
            type: 'object',
            required: ['symbol'],
            properties: {
                symbol: { type: 'string', description: 'Mã chứng khoán' },
                date:   { type: 'string', description: 'Ngày YYYY-MM-DD. Mặc định: hôm nay' },
            },
        },
    },
    {
        name: 'td_get_session_flags',
        description: 'Lấy cờ phiên giao dịch hiện tại của tất cả boards (AA1=ATO, BB1=Liên tục, BC1=ATC...).',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Lọc theo sàn: HOSE/HNX/UPCOM. null = tất cả' },
                date:   { type: 'string', description: 'Ngày YYYY-MM-DD. Mặc định: hôm nay' },
            },
        },
    },
    {
        name: 'td_get_order_book',
        description: 'Lấy tất cả các bước giá chào mua (bid) và chào bán (offer) đang có của mã trên thị trường từ krx_mdds_v3_top_prices (TimescaleDB).',
        inputSchema: {
            type: 'object',
            required: ['symbol'],
            properties: {
                symbol:        { type: 'string', description: 'Mã chứng khoán (VD: FPT, SSI, VNM)' },
                date:          { type: 'string', description: 'Ngày YYYY-MM-DD. Mặc định: hôm nay' },
                table_version: { type: 'string', enum: ['v3', 'v2'], description: 'Phiên bản bảng. Mặc định: v3' },
            },
        },
    },
    {
        name: 'td_get_personal_orders',
        description: 'Lấy sổ lệnh cá nhân (danh sách lệnh đặt thực tế của tài khoản) từ database openapi hoặc openapi-sandbox.',
        inputSchema: {
            type: 'object',
            properties: {
                account_no:  { type: 'string', description: 'Số tài khoản chứng khoán' },
                symbol:      { type: 'string', description: 'Mã chứng khoán cần lọc' },
                status:      { type: 'string', description: 'Trạng thái lệnh (PENDING, FILLED, CANCELLED...)' },
                environment: { type: 'string', enum: ['openapi', 'openapi-sandbox'], description: 'Môi trường OpenAPI. Mặc định: auto-detect từ BASE_URL' },
                limit:       { type: 'number', description: 'Số lệnh tối đa cần lấy. Mặc định: 20' },
            },
        },
    },
    {
        name: 'td_get_api_key_sample',
        description: 'Lấy mẫu API Key / Credential kiểm thử từ database openapi hoặc openapi-sandbox.',
        inputSchema: {
            type: 'object',
            properties: {
                environment: { type: 'string', enum: ['openapi', 'openapi-sandbox'], description: 'Môi trường OpenAPI. Mặc định: auto-detect từ BASE_URL' },
                limit:       { type: 'number', description: 'Số lượng key lấy mẫu. Mặc định: 5' },
            },
        },
    },
    {
        name: 'td_get_market_indices',
        description: 'Lấy chỉ số thị trường (VNINDEX, VN30, UPCOM...) từ krx_mdds_v3_market_indices (TimescaleDB).',
        inputSchema: {
            type: 'object',
            properties: {
                index_code:    { type: 'string', description: 'Mã chỉ số (001: VN-Index, 002: VN30, 301: UPCOM...). null = tất cả' },
                date:          { type: 'string', description: 'Ngày YYYY-MM-DD. Mặc định: hôm nay' },
                table_version: { type: 'string', enum: ['v3', 'v2'], description: 'Phiên bản bảng. Mặc định: v3' },
            },
        },
    },
    {
        name: 'td_export_fixture',
        description: 'Xuất dữ liệu thị trường đã lấy thành file fixture JSON chuẩn hóa lưu tại workspace/{issueKey}/test/fixtures/ để phục vụ pytest.',
        inputSchema: {
            type: 'object',
            required: ['issueKey', 'data'],
            properties: {
                issueKey: { type: 'string', description: 'Mã issue Jira (VD: G3PTP-17093)' },
                data:     { description: 'Dữ liệu fixture JSON cần ghi (từ snapshot hoặc các tool td_*)' },
                filename: { type: 'string', description: 'Tên file (không cần đuôi .json). Mặc định: market_data' },
            },
        },
    },
];

async function handleToolCall(name, args) {
    switch (name) {
        case 'td_get_market_snapshot': return await tdGetMarketSnapshot(args);
        case 'td_get_security_info':   return await tdGetSecurityInfo(args);
        case 'td_get_tick_samples':    return await tdGetTickSamples(args);
        case 'td_get_price_limits':    return await tdGetPriceLimits(args);
        case 'td_get_session_flags':   return await tdGetSessionFlags(args);
        case 'td_get_order_book':      return await tdGetOrderBook(args);
        case 'td_get_personal_orders': return await tdGetPersonalOrders(args);
        case 'td_get_api_key_sample':  return await tdGetApiKeySample(args);
        case 'td_get_market_indices':  return await tdGetMarketIndices(args);
        case 'td_export_fixture':      return await tdExportFixture(args);
        default: throw new Error(`Tool không tồn tại: ${name}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI MODE & HELP
// ─────────────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
Test Data MCP Server (.agents/test-data-mcp.js)
==============================================
Cung cấp fixture data chứng khoán thực tế từ TimescaleDB (DB 644) và OpenAPI (DB 535 / 655).

Cú pháp CLI:
  node .agents/test-data-mcp.js [options]

Tùy chọn CLI:
  --help, -h               In hướng dẫn này và thoát.
  --test                   Chạy dry-run kiểm tra kết nối TimescaleDB & OpenAPI.
  --symbol <MÃ> --test     Chạy dry-run kiểm tra chi tiết giá và sổ lệnh của mã chỉ định (VD: --symbol FPT --test).

Danh sách Tools MCP khả dụng:
  1. td_get_market_snapshot: Lấy snapshot thị trường (phiên hiện tại, N mã/board, giá trần/sàn/TC, tick).
  2. td_get_security_info:   Chi tiết niêm yết 1 mã chứng khoán (sàn, board, giá trần/sàn).
  3. td_get_tick_samples:    Mẫu tick khớp lệnh gần nhất (giá, khối lượng, timestamp).
  4. td_get_price_limits:    Giá trần, sàn, tham chiếu của 1 mã từ security_definition_v3.
  5. td_get_session_flags:   Cờ phiên giao dịch KRX hiện tại (AA1, BB1, BC1...).
  6. td_get_order_book:      Sổ lệnh thị trường (toàn bộ các bước giá bid/offer từ krx_mdds_v3_top_prices).
  7. td_get_personal_orders: Sổ lệnh cá nhân (danh sách lệnh đặt từ DB openapi 535 / openapi-sandbox 655).
  8. td_get_api_key_sample:  Mẫu API credentials kiểm thử từ DB openapi (535) / openapi-sandbox (655).
  9. td_get_market_indices:  Chỉ số thị trường (VNINDEX, VN30, UPCOM Index...).
 10. td_export_fixture:      Xuất dữ liệu fixture ra file JSON tại workspace/{issueKey}/test/fixtures/.
`);
}

async function runTest() {
    console.log('[test-data-mcp] Chạy dry-run kiểm tra kết nối...\n');
    let targetSymbol = null;
    const symIdx = process.argv.indexOf('--symbol');
    if (symIdx !== -1 && process.argv[symIdx + 1]) {
        targetSymbol = process.argv[symIdx + 1].toUpperCase().trim();
    }

    try {
        const snapshot = await tdGetMarketSnapshot({
            symbols_per_board: 1,
            include_groups: ['session', 'security_info', 'price_limits'],
        });
        console.log('✅ Kết nối TimescaleDB (644) thành công!');
        console.log(`   Phiên hiện tại: ${snapshot.current_sessions.length} board(s)`);
        if (snapshot.current_sessions.length > 0) {
            const s = snapshot.current_sessions[0];
            console.log(`   → ${s.market} ${s.board_id}: ${s.session_flag} (${s.session_name})`);
        }
        console.log(`   Mã lấy được: ${snapshot._meta.total_symbols} symbols`);
        if (snapshot.securities.length > 0) {
            const sec = snapshot.securities[0];
            console.log(`   → ${sec.symbol} (${sec.market_name}/${sec.board_name}): trần=${sec.ceiling_price}, sàn=${sec.floor_price}`);
        }

        // Test sổ lệnh
        const checkSym = targetSymbol || (snapshot.securities[0] ? snapshot.securities[0].symbol : 'FPT');
        console.log(`\n📊 Kiểm tra Sổ lệnh Thị trường (Market Depth) cho mã "${checkSym}":`);
        const ob = await tdGetOrderBook({ symbol: checkSym });
        console.log(`   Bảng nguồn: ${ob.source_table} | Cập nhật lúc: ${ob.sending_time}`);
        console.log(`   Tổng chào mua: ${ob.total_bid_qtty || 'N/A'} (${ob.levels_count.bid} bước giá)`);
        console.log(`   Tổng chào bán: ${ob.total_offer_qtty || 'N/A'} (${ob.levels_count.offer} bước giá)`);
        if (ob.bid_levels && ob.bid_levels.length > 0) {
            console.log(`   Top 1 Bid: Giá ${ob.bid_levels[0].price} | KL ${ob.bid_levels[0].qtty}`);
        }
        if (ob.offer_levels && ob.offer_levels.length > 0) {
            console.log(`   Top 1 Offer: Giá ${ob.offer_levels[0].price} | KL ${ob.offer_levels[0].qtty}`);
        }

        // Test OpenAPI database resolution
        console.log('\n🌐 Kiểm tra Smart Environment Routing:');
        const openapiDb = resolveOpenApiDatabase('openapi');
        const sandboxDb = resolveOpenApiDatabase('sandbox');
        console.log(`   OpenAPI UAT trỏ về: ${openapiDb} (ID: 535)`);
        console.log(`   OpenAPI Sandbox trỏ về: ${sandboxDb} (ID: 655)`);

        console.log('\n🎉 Toàn bộ kiểm tra test-data-mcp hoàn tất thành công!');
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    if (process.argv.includes('--test')) {
        await runTest();
        return;
    }

    const server = new Server(
        { name: 'test-data-mcp', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS_SCHEMA }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const result = await handleToolCall(name, args || {});
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `[test-data-mcp] Lỗi tool ${name}: ${err.message}` }],
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('[test-data-mcp] Server khởi động thành công — chờ request...\n');
}

// Export các hàm phục vụ Unit Test & Modular imports
export {
    tdGetMarketSnapshot,
    tdGetSecurityInfo,
    tdGetTickSamples,
    tdGetPriceLimits,
    tdGetSessionFlags,
    tdGetOrderBook,
    tdGetPersonalOrders,
    tdGetApiKeySample,
    tdGetMarketIndices,
    tdExportFixture,
    handleToolCall,
    TOOLS_SCHEMA,
    safeJsonParse,
    printHelp,
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch(err => {
        process.stderr.write(`[test-data-mcp] FATAL: ${err.message}\n`);
        process.exit(1);
    });
}

