const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeQuery, applyLimit, HARD_CAP_MAX_ROWS, DEFAULT_MAX_ROWS } = require('../.agents/db-mcp.js');

test('DB MCP SQL Sanitizer: Cho phép các câu lệnh đọc hợp lệ', () => {
    // 1. SELECT đơn giản
    const q1 = sanitizeQuery('SELECT id, username, balance FROM users WHERE status = 1');
    assert.equal(q1.valid, true);
    assert.equal(q1.cleanSql, 'SELECT id, username, balance FROM users WHERE status = 1');

    // 2. Query có comment
    const q2 = sanitizeQuery('-- comment 1\nSELECT * FROM orders /* comment 2 */ WHERE id = 10');
    assert.equal(q2.valid, true);
    assert.equal(q2.cleanSql, 'SELECT * FROM orders  WHERE id = 10');

    // 3. CTE (Common Table Expression)
    const q3 = sanitizeQuery('WITH deal_summary AS (SELECT deal_id, sum(volume) as total FROM order_deals GROUP BY deal_id) SELECT * FROM deal_summary');
    assert.equal(q3.valid, true);

    // 4. EXPLAIN & SHOW
    const q4 = sanitizeQuery('EXPLAIN SELECT * FROM securities WHERE symbol = \'VND\'');
    assert.equal(q4.valid, true);

    const q5 = sanitizeQuery('SHOW server_version');
    assert.equal(q5.valid, true);

    // 5. Chuỗi ký tự (string literal) chứa từ khóa nhạy cảm không bị chặn nhầm
    const q6 = sanitizeQuery("SELECT * FROM audit_logs WHERE action = 'DELETE' AND note = 'INSERT into table'");
    assert.equal(q6.valid, true);
});

test('DB MCP SQL Sanitizer: Chặn tuyệt đối các câu lệnh thay đổi dữ liệu (DML/DDL)', () => {
    const forbidden = [
        'DROP TABLE users',
        'DELETE FROM orders WHERE id = 1',
        'UPDATE accounts SET balance = balance + 1000000',
        'INSERT INTO users (name) VALUES (\'attacker\')',
        'ALTER TABLE deals ADD COLUMN hacked text',
        'TRUNCATE TABLE transactions',
        'GRANT ALL PRIVILEGES ON DATABASE test TO guest',
        'REVOKE SELECT ON users FROM public',
        'VACUUM FULL',
        'REINDEX TABLE orders',
        'EXEC sp_dosomething',
        'COPY users TO \'/tmp/leak.txt\'',
        'SELECT * INTO new_table FROM users',
        'MERGE INTO target USING source ON target.id = source.id WHEN MATCHED THEN UPDATE SET name = source.name',
        'CALL sp_update_balance(100)',
        'LOCK TABLE users IN ACCESS EXCLUSIVE MODE'
    ];

    for (const sql of forbidden) {
        const res = sanitizeQuery(sql);
        assert.equal(res.valid, false, `Không được phép cho qua: ${sql}`);
        assert.match(res.error, /TRUY VẤN BỊ CHẶN/);
    }
});

test('DB MCP SQL Sanitizer: Chặn đa câu lệnh phân tách bằng dấu chấm phẩy (;)', () => {
    const multiSql = 'SELECT 1; DROP TABLE users;';
    const res = sanitizeQuery(multiSql);
    assert.equal(res.valid, false);
    assert.match(res.error, /không cho phép chạy nhiều câu lệnh cùng lúc/);
});

test('DB MCP SQL Sanitizer: Chặn câu lệnh DML ngụy trang trong CTE hoặc subquery', () => {
    const sneakySql = 'WITH deleted_rows AS (DELETE FROM orders RETURNING *) SELECT * FROM deleted_rows';
    const res = sanitizeQuery(sneakySql);
    assert.equal(res.valid, false);
    assert.match(res.error, /TRUY VẤN BỊ CHẶN/);
});

test('DB MCP Auto Limit: Tự động bổ sung LIMIT khi chưa có', () => {
    const sql = 'SELECT * FROM deals WHERE status = \'ACTIVE\'';
    const limited = applyLimit(sql);
    assert.equal(limited, `SELECT * FROM deals WHERE status = 'ACTIVE' LIMIT ${DEFAULT_MAX_ROWS}`);
});

test('DB MCP Auto Limit: Giữ nguyên LIMIT hợp lệ nhỏ hơn trần tối đa', () => {
    const sql = 'SELECT * FROM deals LIMIT 10';
    const limited = applyLimit(sql);
    assert.equal(limited, 'SELECT * FROM deals LIMIT 10');
});

test('DB MCP Auto Limit: Ép trần giới hạn tối đa nếu query yêu cầu quá nhiều dòng', () => {
    const sql = 'SELECT * FROM deals LIMIT 5000';
    const limited = applyLimit(sql);
    assert.equal(limited, `SELECT * FROM deals LIMIT ${HARD_CAP_MAX_ROWS}`);
});

test('DB MCP Auto Limit: Không gắn LIMIT vào EXPLAIN hoặc SHOW', () => {
    const sqlExplain = 'EXPLAIN SELECT * FROM deals';
    assert.equal(applyLimit(sqlExplain), 'EXPLAIN SELECT * FROM deals');

    const sqlShow = 'SHOW timezone';
    assert.equal(applyLimit(sqlShow), 'SHOW timezone');
});

test('DB MCP Error Formatter: Xử lý AggregateError và lỗi thông thường', () => {
    const { formatErrorMessage } = require('../.agents/db-mcp.js');

    // 1. Lỗi thông thường
    assert.equal(formatErrorMessage(new Error('Syntax error at or near SELECT')), 'Syntax error at or near SELECT');

    // 2. AggregateError
    const aggErr = {
        code: 'ECONNREFUSED',
        errors: [
            { message: 'connect ECONNREFUSED 127.0.0.1:5432' }
        ]
    };
    assert.match(formatErrorMessage(aggErr), /ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432/);
});

test('DB MCP Config: Nạp cấu hình từ DATABASE_URL hoặc các biến DB_*', () => {
    const { getPoolConfig } = require('../.agents/db-mcp.js');
    const prevUrl = process.env.DATABASE_URL;

    process.env.DATABASE_URL = 'postgresql://testuser:testpass@db.local:5432/testdb';
    const cfg = getPoolConfig();
    assert.equal(cfg.connectionString, 'postgresql://testuser:testpass@db.local:5432/testdb');

    delete process.env.DATABASE_URL;
    process.env.DB_HOST = 'custom-host';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'custom-db';
    const cfg2 = getPoolConfig();
    assert.equal(cfg2.host, 'custom-host');
    assert.equal(cfg2.port, 5433);
    assert.equal(cfg2.database, 'custom-db');

    // Restore
    if (prevUrl) process.env.DATABASE_URL = prevUrl;
    else delete process.env.DATABASE_URL;
});

test('DB MCP Metabase: Phân giải chính xác Database IDs (timescale: 644, openapi: 535, openapi-sandbox: 655)', () => {
    const { resolveDatabaseId, getDatabaseName, isMetabaseMode } = require('../.agents/db-mcp.js');

    assert.equal(isMetabaseMode(), true);

    // 1. Alias name
    assert.equal(resolveDatabaseId('timescale'), 644);
    assert.equal(resolveDatabaseId('openapi'), 535);
    assert.equal(resolveDatabaseId('openapi-sandbox'), 655);
    assert.equal(resolveDatabaseId('sandbox'), 655);

    // 2. Mặc định (khi không truyền)
    assert.equal(resolveDatabaseId(undefined), 644);
    assert.equal(resolveDatabaseId(null), 644);
    assert.equal(resolveDatabaseId(''), 644);

    // 3. ID số hoặc chuỗi số
    assert.equal(resolveDatabaseId(644), 644);
    assert.equal(resolveDatabaseId('535'), 535);
    assert.equal(resolveDatabaseId(655), 655);

    // 4. Lấy tên database
    assert.equal(getDatabaseName(644), 'timescale');
    assert.equal(getDatabaseName(535), 'openapi');
    assert.equal(getDatabaseName(655), 'openapi-sandbox');

    // 5. Smart Environment Routing (resolveOpenApiDatabase)
    const { resolveOpenApiDatabase } = require('../.agents/db-mcp.js');
    assert.equal(resolveOpenApiDatabase('sandbox'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('openapi-sandbox'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('https://sb-openapi.dnse.com.vn'), 'openapi-sandbox');
    assert.equal(resolveOpenApiDatabase('https://sb-openapi-uat.dnse.com.vn'), 'openapi-sandbox');

    assert.equal(resolveOpenApiDatabase('openapi'), 'openapi');
    assert.equal(resolveOpenApiDatabase('https://openapi-uat.dnse.com.vn'), 'openapi');
    assert.equal(resolveOpenApiDatabase('https://openapi.dnse.com.vn'), 'openapi');
    assert.equal(resolveOpenApiDatabase(''), 'openapi');
    assert.equal(resolveOpenApiDatabase(null), 'openapi');
});

test('DB MCP Metabase: Hỗ trợ chuyển đổi môi trường UAT / PROD và SSO Session Token', () => {
    const { getMetabaseConfig, getMetabaseHeaders, resolveDatabaseId } = require('../.agents/db-client.js');

    const originalEnv = { ...process.env };

    try {
        // 1. Môi trường UAT mặc định
        process.env.METABASE_ENV = 'uat';
        process.env.METABASE_UAT_URL = 'https://mb-uat.dnse.com.vn';
        process.env.METABASE_UAT_API_TOKEN = 'token-uat-123';
        delete process.env.METABASE_PROD_SESSION_TOKEN;

        const cfgUat = getMetabaseConfig();
        assert.equal(cfgUat.isProd, false);
        assert.equal(cfgUat.baseUrl, 'https://mb-uat.dnse.com.vn');

        // 2. Chuyển sang Production qua METABASE_ENV=prod
        process.env.METABASE_ENV = 'prod';
        process.env.METABASE_PROD_URL = 'https://mb.dnse.com.vn';
        process.env.METABASE_PROD_SESSION_TOKEN = 'session-prod-xyz-999';
        process.env.METABASE_PROD_DB_TIMESCALE_ID = '700';

        const cfgProd = getMetabaseConfig();
        assert.equal(cfgProd.isProd, true);
        assert.equal(cfgProd.baseUrl, 'https://mb.dnse.com.vn');
        assert.equal(cfgProd.token, 'session-prod-xyz-999');

        // Headers phải có cả X-Metabase-Session và Cookie metabase.SESSION
        const headers = getMetabaseHeaders();
        assert.equal(headers['X-Metabase-Session'], 'session-prod-xyz-999');
        assert.equal(headers['Cookie'], 'metabase.SESSION=session-prod-xyz-999');

        // Database ID ưu tiên PROD DB ID
        assert.equal(resolveDatabaseId('timescale'), 700);

    } finally {
        process.env = originalEnv;
    }
});

test('Metabase SSO Helper: Đọc và cập nhật file .env an toàn', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { parseEnv, updateEnvFile } = require('../scripts/metabase-sso-login.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-sso-test-'));
    const tmpEnv = path.join(tmpDir, '.env');

    try {
        fs.writeFileSync(tmpEnv, [
            '# Comment ban đầu',
            'METABASE_ENV=uat',
            'METABASE_PROD_SESSION_TOKEN=',
            'OTHER_VAR=keep_me'
        ].join('\n'), 'utf-8');

        // Cập nhật session token mới
        updateEnvFile(tmpEnv, {
            METABASE_PROD_SESSION_TOKEN: 'new-token-abc',
            METABASE_PROD_DB_TIMESCALE_ID: '888'
        });

        const parsed = parseEnv(tmpEnv);
        assert.equal(parsed.METABASE_ENV, 'uat');
        assert.equal(parsed.OTHER_VAR, 'keep_me');
        assert.equal(parsed.METABASE_PROD_SESSION_TOKEN, 'new-token-abc');
        assert.equal(parsed.METABASE_PROD_DB_TIMESCALE_ID, '888');

        // Đảm bảo comment ban đầu không bị xóa
        const rawContent = fs.readFileSync(tmpEnv, 'utf-8');
        assert.ok(rawContent.includes('# Comment ban đầu'));
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

