#!/usr/bin/env node
/**
 * TimescaleDB MDDS Reconciliation Runner — PRODUCTION ONLY
 * (`scripts/db/db-recon-prod.js`)
 *
 * ⚠️  Script này LUÔN thực thi trên môi trường PRODUCTION.
 *    Dành riêng cho skill `db-timescale-reconciler`.
 *    Tất cả các skill khác (QA test, sandbox...) sử dụng môi trường UAT mặc định.
 *
 * Nguyên tắc:
 *   - Ép METABASE_ENV=prod TRƯỚC khi import bất kỳ module nào đọc .env
 *   - Sau khi loadEnv() chạy, ghi đè lại để tránh .env có METABASE_ENV=uat bị set
 *
 * Cách dùng:
 *   node scripts/db/db-recon-prod.js                           # Master Dashboard (ngày hiện tại)
 *   node scripts/db/db-recon-prod.js recon-ticks               # Đối chiếu Ticks V3 vs V2
 *   node scripts/db/db-recon-prod.js --date 2026-09-17         # Lọc theo ngày cụ thể
 *   node scripts/db/db-recon-prod.js --symbol FPT              # Lọc theo mã cụ thể
 *   node scripts/db/db-recon-prod.js --list                    # Liệt kê toàn bộ query
 *   npm run db:recon:prod                                   # Lệnh npm tiện ích
 */

// ─── PRODUCTION LOCK — đặt TRƯỚC mọi import ─────────────────────────────────
process.env.METABASE_ENV = 'prod';

import { loadEnv } from '../lib/db-client.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Nạp .env (loadEnv chỉ set biến chưa tồn tại — METABASE_ENV đã được lock ở trên)
loadEnv(path.join(projectRoot, '.env'));

// Double-lock sau loadEnv để chắc chắn không bị ghi đè
process.env.METABASE_ENV = 'prod';

// ─── Re-export toàn bộ logic từ db-recon.js ──────────────────────────────────
// Dùng dynamic import để đảm bảo env đã được lock trước khi db-recon.js
// thực hiện getMetabaseConfig() tại thời điểm runQuery() được gọi.
const { loadCatalog, replaceParams, formatMarkdownTable, parseCliArgs, catalogPath } =
    await import('./db-recon.js');

// ─── Main (copy logic từ db-recon.js main(), loại bỏ --uat flag) ─────────────
import fs from 'node:fs';
import {
    metabaseFetch,
    sanitizeQuery,
    applyLimit,
    getMetabaseConfig,
    formatErrorMessage,
} from '../lib/db-client.js';

async function runQuery(queryId, cliArgs) {
    const catalog  = loadCatalog();
    const queryDef = catalog[queryId];

    if (!queryDef) {
        console.error(`❌ Không tìm thấy query ID "${queryId}".`);
        console.log(`💡 Chạy 'node scripts/db/db-recon-prod.js --list' để xem danh sách các query hợp lệ.\n`);
        process.exit(1);
    }

    const params = {};
    if (queryDef.params) {
        for (const [paramName, paramConfig] of Object.entries(queryDef.params)) {
            params[paramName] = cliArgs[paramName] !== undefined
                ? cliArgs[paramName]
                : paramConfig.default;
        }
    }
    if (params.date === 'CURRENT_DATE' || !params.date) {
        params.date = new Date().toISOString().slice(0, 10);
    }

    const rawSql = replaceParams(queryDef.sql, params);
    const check  = sanitizeQuery(rawSql);
    if (!check.valid) {
        console.error(`❌ BẢO VỆ AN TOÀN BỊ KÍCH HOẠT: ${check.error}`);
        process.exit(1);
    }

    const finalSql = applyLimit(check.cleanSql, 200);
    const config   = getMetabaseConfig();
    const targetUrl = config.baseUrl;
    const dbId     = parseInt(
        process.env.METABASE_PROD_DB_TIMESCALE_ID || '7',
        10
    );

    console.log(`\n==============================================================`);
    console.log(`🔍 TIMESCALEDB RECONCILIATION RUNNER — 🔴 PRODUCTION`);
    console.log(`🌐 Mục tiêu: ${targetUrl} (Database ID: ${dbId})`);
    console.log(`📋 Query: [${queryId}] ${queryDef.name}`);
    console.log(`🏷️  Topic: ${queryDef.topic}`);
    if (Object.keys(params).length > 0) {
        console.log(`⚙️  Tham số: ${JSON.stringify(params)}`);
    }
    console.log(`==============================================================\n`);

    const start = Date.now();
    let result;
    try {
        result = await metabaseFetch('/api/dataset', {
            method: 'POST',
            body: JSON.stringify({
                database: dbId,
                type: 'native',
                native: { query: finalSql }
            })
        });
    } catch (err) {
        console.error(`❌ Thực thi thất bại: ${formatErrorMessage(err)}`);
        if (err.message.includes('Xác thực Metabase thất bại')) {
            console.log(`\n👉 Gợi ý: Hãy chạy lệnh sau để mở trình duyệt đăng nhập SSO Production và làm mới Session Token:`);
            console.log(`   npm run metabase:login\n`);
        }
        process.exit(1);
    }

    const durationMs = Date.now() - start;

    if (result.status === 'failed' || result.error) {
        console.error(`❌ Metabase báo lỗi: ${result.error || 'Truy vấn thất bại'}`);
        process.exit(1);
    }

    const data = result.data || {};
    const cols = data.cols ? data.cols.map(c => c.name) : (data.columns || []);
    const rows = (data.rows || []).map(r => {
        const obj = {};
        cols.forEach((col, idx) => { obj[col] = r[idx]; });
        return obj;
    });

    if (cliArgs.json) {
        console.log(JSON.stringify({ queryId, durationMs, rowCount: rows.length, rows }, null, 2));
    } else {
        const tableOutput = formatMarkdownTable(rows, `${queryDef.name} (${durationMs}ms - ${rows.length} dòng)`);
        console.log(tableOutput);
    }
}

function showList() {
    const catalog = loadCatalog();
    console.log(`\n==============================================================`);
    console.log(`📋 DANH MỤC CÁC CÂU QUERY ĐỐI CHIẾU TIMESCALEDB (11 TOPIC MDDS) — 🔴 PRODUCTION`);
    console.log(`==============================================================\n`);
    Object.entries(catalog).forEach(([id, q], idx) => {
        console.log(`${idx + 1}. [${id}]`);
        console.log(`   - Tên: ${q.name}`);
        console.log(`   - Topic MDDS: ${q.topic}`);
        console.log(`   - Mô tả: ${q.description}`);
        const p = Object.keys(q.params || {});
        if (p.length > 0) console.log(`   - Tham số: ${p.join(', ')}`);
        console.log('');
    });
    console.log(`💡 Cách chạy: node scripts/db/db-recon-prod.js <query_id> [--date YYYY-MM-DD] [--symbol FPT]\n`);
}

async function main() {
    const cliArgs = parseCliArgs();

    if (cliArgs.list) {
        showList();
        return;
    }

    if (cliArgs.uat) {
        console.error(`❌ Flag --uat không được hỗ trợ trên db-recon-prod.js.`);
        console.log(`   Script này luôn chạy trên Production. Dùng node scripts/db/db-recon.js --uat để truy vấn UAT.\n`);
        process.exit(1);
    }

    const queryId = cliArgs.query || cliArgs._[0] || 'master-dashboard';
    await runQuery(queryId, cliArgs);
}

function isMain() {
    if (!process.argv[1]) return false;
    try {
        return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return process.argv[1] === fileURLToPath(import.meta.url);
    }
}

if (isMain()) {
    main().catch(err => {
        console.error(`❌ Lỗi không mong đợi:`, err);
        process.exit(1);
    });
}
