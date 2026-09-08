import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

import { sanitizeQuery } from '../.agents/db-client.js';
import {
    loadCatalog,
    replaceParams,
    formatMarkdownTable,
    parseCliArgs
} from './db-recon.js';


test('TimescaleDB Reconciler: Đọc catalog và kiểm tra cấu trúc', () => {
    const catalog = loadCatalog();
    const queryIds = Object.keys(catalog);

    // Có ít nhất 12 query đối chiếu
    assert.ok(queryIds.length >= 12, `Catalog cần ít nhất 12 query, hiện có: ${queryIds.length}`);

    // Kiểm tra từng query có đầy đủ các trường bắt buộc
    for (const [id, item] of Object.entries(catalog)) {
        assert.ok(item.name, `Query [${id}] thiếu trường 'name'`);
        assert.ok(item.topic, `Query [${id}] thiếu trường 'topic'`);
        assert.ok(item.description, `Query [${id}] thiếu trường 'description'`);
        assert.ok(item.sql, `Query [${id}] thiếu trường 'sql'`);
        assert.ok(typeof item.sql === 'string' && item.sql.trim().length > 0, `Query [${id}] có sql rỗng`);
    }

    // Đảm bảo có master dashboard
    assert.ok(catalog['master-dashboard'], "Catalog phải có query 'master-dashboard'");
    // Đảm bảo có các topic cốt lõi
    assert.ok(catalog['recon-ticks'], "Catalog phải có 'recon-ticks'");
    assert.ok(catalog['recon-topprice'], "Catalog phải có 'recon-topprice'");
    assert.ok(catalog['recon-expected-price'], "Catalog phải có 'recon-expected-price'");
    assert.ok(catalog['recon-ohlc'], "Catalog phải có 'recon-ohlc'");
    assert.ok(catalog['recon-indices'], "Catalog phải có 'recon-indices'");
    assert.ok(catalog['recon-board-events'], "Catalog phải có 'recon-board-events'");
    assert.ok(catalog['recon-missing-symbols'], "Catalog phải có 'recon-missing-symbols'");
});

test('TimescaleDB Reconciler: 100% Query trong Catalog tuân thủ Read-Only Sanitizer', () => {
    const catalog = loadCatalog();

    for (const [id, item] of Object.entries(catalog)) {
        // Điền giá trị giả định cho params để sanitizeQuery kiểm tra được câu lệnh hoàn chỉnh
        const mockParams = {};
        if (item.params) {
            for (const [pKey, pDef] of Object.entries(item.params)) {
                mockParams[pKey] = pDef.default !== undefined ? pDef.default : '2026-09-08';
            }
        }

        const executableSql = replaceParams(item.sql, mockParams);
        const check = sanitizeQuery(executableSql);

        assert.equal(
            check.valid,
            true,
            `Query [${id}] vi phạm bộ lọc bảo mật Read-Only: ${check.error}\nSQL: ${executableSql}`
        );

        // Đảm bảo chỉ bắt đầu bằng SELECT hoặc WITH
        const normalized = check.cleanSql.trim().toUpperCase();
        const startsWithAllowed = normalized.startsWith('SELECT') || normalized.startsWith('WITH');
        assert.ok(
            startsWithAllowed,
            `Query [${id}] bắt buộc phải bắt đầu bằng SELECT hoặc WITH. Thực tế: ${normalized.slice(0, 30)}...`
        );
    }
});

test('TimescaleDB Reconciler: Tuyệt đối không chứa bất kỳ bảng OpenAPI nào', () => {
    const catalog = loadCatalog();
    const forbiddenOpenApiTables = [
        /\bpublic\.orders\b/i,
        /\bfrom\s+orders\b/i,
        /\bjoin\s+orders\b/i,
        /\bpublic\.deals\b/i,
        /\bfrom\s+deals\b/i,
        /\bjoin\s+deals\b/i,
        /\bpublic\.users\b/i,
        /\bfrom\s+users\b/i,
        /\bpublic\.accounts\b/i,
        /\bfrom\s+accounts\b/i
    ];

    for (const [id, item] of Object.entries(catalog)) {
        for (const pattern of forbiddenOpenApiTables) {
            assert.equal(
                pattern.test(item.sql),
                false,
                `Query [${id}] chứa tham chiếu đến bảng OpenAPI bị cấm (pattern: ${pattern})`
            );
        }
    }
});

test('TimescaleDB Reconciler: Hàm replaceParams thay thế chính xác các placeholder', () => {
    const template = "SELECT * FROM ticks WHERE date = '{{date}}' AND symbol = '{{symbol}}' AND diff > {{minDiff}}";
    const params = {
        date: '2026-09-08',
        symbol: 'FPT',
        minDiff: 50
    };

    const result = replaceParams(template, params);
    assert.equal(
        result,
        "SELECT * FROM ticks WHERE date = '2026-09-08' AND symbol = 'FPT' AND diff > 50"
    );
});

test('TimescaleDB Reconciler: Hàm parseCliArgs trích xuất đầy đủ cờ CLI', () => {
    const rawArgs = [
        'recon-ticks',
        '--date', '2026-09-08',
        '--symbol', 'VNM',
        '--min-diff', '10',
        '--json',
        '--uat'
    ];

    const parsed = parseCliArgs(rawArgs);
    assert.equal(parsed._[0], 'recon-ticks');
    assert.equal(parsed.date, '2026-09-08');
    assert.equal(parsed.symbol, 'VNM');
    assert.equal(parsed.minDiff, 10);
    assert.equal(parsed.json, true);
    assert.equal(parsed.uat, true);
});

test('TimescaleDB Reconciler: Hàm formatMarkdownTable render đúng bảng Markdown', () => {
    // 1. Trường hợp có dữ liệu
    const sampleRows = [
        { topic: 'Trade/Ticks', table_v3: 'krx_mdds_v3_ticks', count_v3: 150000, count_v2: 150000, diff: 0, status: 'MATCH' },
        { topic: 'Quote/TopPrice', table_v3: 'krx_mdds_v3_top_prices', count_v3: 400000, count_v2: 395000, diff: 5000, status: 'DISCREPANCY' }
    ];

    const tableStr = formatMarkdownTable(sampleRows, 'Test Report');
    assert.ok(tableStr.includes('### 📊 Test Report'));
    assert.ok(tableStr.includes('| topic | table_v3 | count_v3 | count_v2 | diff | status |'));
    assert.ok(tableStr.includes('🟢 MATCH'));
    assert.ok(tableStr.includes('🔴 DISCREPANCY'));
    assert.ok(tableStr.includes('150,000'));

    // 2. Trường hợp rỗng
    const emptyStr = formatMarkdownTable([], 'Empty Report');
    assert.ok(emptyStr.includes('Không tìm thấy bản ghi nào'));
});
