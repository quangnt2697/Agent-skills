#!/usr/bin/env node
/**
 * TimescaleDB MDDS Reconciliation Runner (`scripts/db-recon.js`)
 *
 * Thực thi các câu query đối chiếu (Reconciliation & Parity Check) trên TimescaleDB Production
 * (DB ID: 644) qua Metabase API, dựa trên catalog câu query chuẩn hóa tại:
 * plugins/core/skills/db-timescale-reconciler/resources/reconciliation-queries.json
 *
 * Cách dùng:
 *   node scripts/db-recon.js                           # Chạy Master Dashboard cho ngày hiện tại
 *   node scripts/db-recon.js recon-ticks               # Chạy đối chiếu Ticks V3 vs V2
 *   node scripts/db-recon.js recon-ticks --symbol FPT  # Lọc theo mã FPT
 *   node scripts/db-recon.js --date 2026-09-08         # Lọc theo ngày cụ thể
 *   node scripts/db-recon.js --list                    # Liệt kê toàn bộ các câu query khả dụng
 *   npm run db:recon                                   # Lệnh npm tiện ích
 */

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const {
    loadEnv,
    metabaseFetch,
    sanitizeQuery,
    applyLimit,
    getMetabaseConfig,
    formatErrorMessage
} = require(path.join(projectRoot, '.agents', 'db-client.js'));

// Nạp .env
loadEnv(path.join(projectRoot, '.env'));

const catalogPath = path.join(
    projectRoot,
    'plugins',
    'core',
    'skills',
    'db-timescale-reconciler',
    'resources',
    'reconciliation-queries.json'
);

function loadCatalog() {
    if (!fs.existsSync(catalogPath)) {
        throw new Error(`Không tìm thấy file catalog câu query tại: ${catalogPath}`);
    }
    return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
}

function replaceParams(sqlTemplate, params) {
    let sql = sqlTemplate;
    for (const [key, val] of Object.entries(params)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        sql = sql.replace(regex, String(val));
    }
    return sql;
}

function formatMarkdownTable(rows, title) {
    if (!rows || rows.length === 0) {
        return `> **${title}**: Không tìm thấy bản ghi nào (hoặc dữ liệu hoàn toàn khớp).`;
    }

    const headers = Object.keys(rows[0]);
    const headerLine = '| ' + headers.join(' | ') + ' |';
    const separatorLine = '| ' + headers.map(() => ':---').join(' | ') + ' |';

    const dataLines = rows.map(r => {
        return '| ' + headers.map(h => {
            let val = r[h];
            if (val === null || val === undefined) return '';
            if (h === 'status') {
                if (val === 'MATCH') return '🟢 MATCH';
                if (val === 'DISCREPANCY') return '🔴 DISCREPANCY';
                if (val.includes('THIEU')) return `⚠️ ${val}`;
            }
            if (typeof val === 'number') {
                return Number.isInteger(val) ? val.toLocaleString('en-US') : val;
            }
            return String(val);
        }).join(' | ') + ' |';
    });

    return [
        `### 📊 ${title}`,
        '',
        headerLine,
        separatorLine,
        ...dataLines,
        ''
    ].join('\n');
}

async function runQuery(queryId, cliArgs) {
    const catalog = loadCatalog();
    const queryDef = catalog[queryId];

    if (!queryDef) {
        console.error(`❌ Không tìm thấy query ID "${queryId}".`);
        console.log(`💡 Chạy 'node scripts/db-recon.js --list' để xem danh sách các query hợp lệ.\n`);
        process.exit(1);
    }

    // Xác định tham số
    const params = {};
    if (queryDef.params) {
        for (const [paramName, paramConfig] of Object.entries(queryDef.params)) {
            if (cliArgs[paramName] !== undefined) {
                params[paramName] = cliArgs[paramName];
            } else {
                params[paramName] = paramConfig.default;
            }
        }
    }

    // Xử lý CURRENT_DATE
    if (params.date === 'CURRENT_DATE' || !params.date) {
        params.date = new Date().toISOString().slice(0, 10);
    }

    const rawSql = replaceParams(queryDef.sql, params);

    // Kiểm tra an toàn Read-Only
    const check = sanitizeQuery(rawSql);
    if (!check.valid) {
        console.error(`❌ BẢO VỆ AN TOÀN BỊ KÍCH HOẠT: ${check.error}`);
        process.exit(1);
    }

    const finalSql = applyLimit(check.cleanSql, 200);

    const config = getMetabaseConfig();
    const targetUrl = config.baseUrl;
    const dbId = parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || process.env.METABASE_DB_TIMESCALE_ID || '644', 10);

    console.log(`\n==============================================================`);
    console.log(`🔍 TIMESCALEDB RECONCILIATION RUNNER`);
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
            console.log(`\n👉 Gợi ý: Hãy chạy lệnh sau để mở trình duyệt đăng nhập SSO và làm mới Session Token:`);
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

function parseCliArgs(args = process.argv.slice(2)) {
    const parsed = { _: [] };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--list') parsed.list = true;
        else if (arg === '--json') parsed.json = true;
        else if (arg === '--uat') parsed.uat = true;
        else if (arg === '--query' && args[i + 1]) parsed.query = args[++i];
        else if (arg === '--date' && args[i + 1]) parsed.date = args[++i];
        else if (arg === '--symbol' && args[i + 1]) parsed.symbol = args[++i];
        else if (arg === '--resolution' && args[i + 1]) parsed.resolution = args[++i];
        else if (arg === '--min-diff' && args[i + 1]) parsed.minDiff = parseInt(args[++i], 10);
        else if (!arg.startsWith('--')) parsed._.push(arg);
    }
    return parsed;
}

function showList() {
    const catalog = loadCatalog();
    console.log(`\n==============================================================`);
    console.log(`📋 DANH MỤC CÁC CÂU QUERY ĐỐI CHIẾU TIMESCALEDB (11 TOPIC MDDS)`);
    console.log(`==============================================================\n`);

    Object.entries(catalog).forEach(([id, q], idx) => {
        console.log(`${idx + 1}. [${id}]`);
        console.log(`   - Tên: ${q.name}`);
        console.log(`   - Topic MDDS: ${q.topic}`);
        console.log(`   - Mô tả: ${q.description}`);
        const params = Object.keys(q.params || {});
        if (params.length > 0) {
            console.log(`   - Tham số: ${params.join(', ')}`);
        }
        console.log('');
    });

    console.log(`💡 Cách chạy: node scripts/db-recon.js <query_id> [--date YYYY-MM-DD] [--symbol FPT]\n`);
}

async function main() {
    const cliArgs = parseCliArgs();

    if (cliArgs.list) {
        showList();
        return;
    }

    if (cliArgs.uat) {
        process.env.METABASE_ENV = 'uat';
    }

    // Xác định queryId
    let queryId = cliArgs.query || cliArgs._[0] || 'master-dashboard';
    await runQuery(queryId, cliArgs);
}

if (require.main === module) {
    main().catch(err => {
        console.error(`❌ Lỗi không mong đợi:`, err);
        process.exit(1);
    });
}

module.exports = {
    loadCatalog,
    replaceParams,
    formatMarkdownTable,
    parseCliArgs,
    catalogPath
};
