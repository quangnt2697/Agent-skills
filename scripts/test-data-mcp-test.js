/**
 * Unit Test Suite for Test Data MCP Server (.agents/test-data-mcp.js)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    TOOLS_SCHEMA,
    handleToolCall,
    safeJsonParse,
    printHelp,
    tdExportFixture,
} from '../.agents/test-data-mcp.js';

import {
    resolveOpenApiDatabase,
    METABASE_DB_MAP,
    resolveDatabaseId,
} from '../.agents/db-client.js';


test('test-data-mcp: Định nghĩa đầy đủ 10 MCP tools với schema chuẩn', () => {
    assert.equal(Array.isArray(TOOLS_SCHEMA), true);
    assert.equal(TOOLS_SCHEMA.length, 10);

    const toolNames = TOOLS_SCHEMA.map(t => t.name);
    const expectedTools = [
        'td_get_market_snapshot',
        'td_get_security_info',
        'td_get_tick_samples',
        'td_get_price_limits',
        'td_get_session_flags',
        'td_get_order_book',
        'td_get_personal_orders',
        'td_get_api_key_sample',
        'td_get_market_indices',
        'td_export_fixture',
    ];

    expectedTools.forEach(name => {
        assert.equal(toolNames.includes(name), true, `Thiếu tool: ${name}`);
    });
});

test('test-data-mcp: safeJsonParse parse an toàn các định dạng dữ liệu', () => {
    // 1. Chuỗi JSON hợp lệ
    const validJson = '[{"price": 72.2, "qtty": 50000}]';
    assert.deepEqual(safeJsonParse(validJson), [{ price: 72.2, qtty: 50000 }]);

    // 2. Đã là object/array
    assert.deepEqual(safeJsonParse([{ a: 1 }]), [{ a: 1 }]);

    // 3. Null / undefined / rác
    assert.deepEqual(safeJsonParse(null), []);
    assert.deepEqual(safeJsonParse(undefined), []);
    assert.deepEqual(safeJsonParse('invalid-json'), []);
    assert.deepEqual(safeJsonParse('{bad json', {}), {});
});

test('test-data-mcp: Smart Environment Routing giữa openapi (535) và sandbox (655)', () => {
    // 1. Phân giải database name
    assert.equal(resolveOpenApiDatabase('sandbox'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('openapi-sandbox'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('https://sb-openapi.dnse.com.vn'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('https://sb-openapi-uat.dnse.com.vn'), 'openapi-sandbox');

    assert.equal(resolveOpenApiDatabase('openapi'), 'openapi');
    assert.equal(resolveOpenApiDatabase('https://openapi-uat.dnse.com.vn'), 'openapi');
    assert.equal(resolveOpenApiDatabase('https://openapi.dnse.com.vn'), 'openapi');
    assert.equal(resolveOpenApiDatabase(''), 'openapi');
    assert.equal(resolveOpenApiDatabase(null), 'openapi');

    // 2. Phân giải database ID
    assert.equal(resolveDatabaseId('openapi'), 535);
    assert.equal(resolveDatabaseId('openapi-sandbox'), 655);
    assert.equal(resolveDatabaseId('sandbox'), 655);
    assert.equal(METABASE_DB_MAP['openapi'], 535);
    assert.equal(METABASE_DB_MAP['openapi-sandbox'], 655);
});

test('test-data-mcp: handleToolCall ném lỗi khi tool không tồn tại', async () => {
    await assert.rejects(
        async () => { await handleToolCall('non_existent_tool', {}); },
        /Tool không tồn tại/
    );
});

test('test-data-mcp: td_export_fixture xuất file JSON đúng chuẩn vào thư mục fixtures', async () => {
    const testIssueKey = 'TEST-MCP-999';
    const mockData = {
        symbol: 'FPT',
        reference_price: 72.2,
        ceiling_price: 77.2,
        floor_price: 67.2,
    };

    const result = await tdExportFixture({
        issueKey: testIssueKey,
        data: mockData,
        filename: 'unit_test_fixture',
    });

    assert.equal(result.written, true);
    assert.equal(fs.existsSync(result.path), true);
    assert.equal(result.filename, 'unit_test_fixture.json');

    const fileContent = JSON.parse(fs.readFileSync(result.path, 'utf-8'));
    assert.equal(fileContent._issue_key, testIssueKey);
    assert.deepEqual(fileContent.data, mockData);

    // Dọn dẹp file test
    const fixtureDir = path.dirname(result.path);
    fs.rmSync(path.join(fixtureDir, '..', '..'), { recursive: true, force: true });
});
