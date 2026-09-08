#!/usr/bin/env node
/**
 * Database MCP Server (.agents/db-mcp.js)
 * 
 * Server MCP chuẩn Stdio phục vụ tương tác Cơ sở dữ liệu an toàn cho AI Agent.
 * Hỗ trợ 2 chế độ (Hybrid Engine):
 * 1. Metabase REST API Engine: Kết nối thông suốt qua Metabase URL + API Token (không cần mở port 5432).
 *    Hỗ trợ mapping Database IDs:
 *    - timescale: 644
 *    - openapi: 535
 *    - openapi-sandbox: 655
 * 2. PostgreSQL Driver Engine: Kết nối trực tiếp qua thư viện 'pg' (DATABASE_URL hoặc DB_*).
 * 
 * Tính năng bảo mật & tối ưu:
 * - Bảo mật 2 lớp Read-Only (Regex Sanitizer chặn DML/DDL + Session read-only khi dùng Postgres).
 * - Chống tràn Token: Tự động gắn LIMIT 50 (tối đa 200) cho truy vấn SELECT.
 * - Chống treo hệ thống: Timeout mặc định 5.000ms.
 * - Cung cấp 5 tools: db_ping, db_list_tables, db_describe_table, db_query, db_explain_query.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const { Pool } = pg;
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// --- CÁC HÀM TIỆN ÍCH DÙNG CHUNG (TỪ db-client.js) ---
import {
    loadEnv, projectRoot, DEFAULT_MAX_ROWS, HARD_CAP_MAX_ROWS, DEFAULT_STATEMENT_TIMEOUT_MS,
    METABASE_DB_MAP, isMetabaseMode, resolveDatabaseId, getDatabaseName, resolveOpenApiDatabase,
    getMetabaseHeaders, formatErrorMessage, metabaseFetch,
    sanitizeQuery, applyLimit, CACHE_DIR, ensureCacheDir, getDiskCachePath
} from './db-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function getDatabaseMetadata(dbId, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = metadataCache.get(dbId);
        if (cached && (Date.now() - cached.timestamp < METADATA_CACHE_TTL_MS)) {
            return cached.data;
        }

        const diskPath = getDiskCachePath(dbId);
        if (fs.existsSync(diskPath)) {
            try {
                const raw = fs.readFileSync(diskPath, 'utf-8');
                const data = JSON.parse(raw);
                metadataCache.set(dbId, { timestamp: Date.now(), data });
                return data;
            } catch (_) {}
        }
    }

    const meta = await metabaseFetch(`/api/database/${dbId}/metadata`, { timeout: 35000 });
    try {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(getDiskCachePath(dbId), JSON.stringify(meta, null, 2), 'utf-8');
    } catch (_) {}
    metadataCache.set(dbId, { timestamp: Date.now(), data: meta });
    return meta;
}

async function metabasePing() {
    const start = Date.now();
    const databases = await metabaseFetch('/api/database');
    const latencyMs = Date.now() - start;

    let currentUser = 'api_token_user';
    try {
        const user = await metabaseFetch('/api/user/current');
        if (user && (user.email || user.common_name)) {
            currentUser = user.email || user.common_name;
        }
    } catch (_) {}

    const list = Array.isArray(databases) ? databases : (databases.data || []);
    const knownDbs = list.map(d => ({
        id: d.id,
        name: d.name,
        engine: d.engine
    }));

    return {
        status: 'CONNECTED',
        engine: 'metabase-api',
        url: process.env.METABASE_URL || 'https://mb-uat.dnse.com.vn',
        latencyMs,
        user: currentUser,
        configuredDatabases: {
            timescale: { id: METABASE_DB_MAP.timescale, target: 'encapital-timescaledb' },
            openapi: { id: METABASE_DB_MAP.openapi, target: 'openapi' },
            'openapi-sandbox': { id: METABASE_DB_MAP['openapi-sandbox'], target: 'openapi-sandbox' }
        },
        availableDatabasesCount: knownDbs.length,
        databases: knownDbs.filter(d => [METABASE_DB_MAP.timescale, METABASE_DB_MAP.openapi, METABASE_DB_MAP['openapi-sandbox']].includes(d.id))
    };
}

async function metabaseListTables(dbIdentifier, schema = 'public') {
    const dbId = resolveDatabaseId(dbIdentifier);
    const meta = await getDatabaseMetadata(dbId);
    const rawTables = meta.tables || [];

    const tables = rawTables
        .filter(t => {
            if (!schema || schema === '*') return true;
            const tableSchema = t.schema || 'public';
            return tableSchema.toLowerCase() === schema.toLowerCase();
        })
        .map(t => ({
            id: t.id,
            table_name: t.name,
            table_schema: t.schema || 'public',
            table_type: t.entity_type || 'TABLE',
            display_name: t.display_name || t.name,
            row_count: t.row_count || null
        }));

    return {
        engine: 'metabase-api',
        databaseId: dbId,
        databaseName: getDatabaseName(dbId),
        schema: schema || '*',
        total: tables.length,
        tables
    };
}

async function metabaseDescribeTable(tableName, dbIdentifier, schema = 'public') {
    const dbId = resolveDatabaseId(dbIdentifier);
    const meta = await getDatabaseMetadata(dbId);
    const rawTables = meta.tables || [];

    const foundTable = rawTables.find(t => {
        const matchName = t.name.toLowerCase() === tableName.toLowerCase();
        if (!schema || schema === '*') return matchName;
        const matchSchema = (t.schema || 'public').toLowerCase() === schema.toLowerCase();
        return matchName && matchSchema;
    });

    if (!foundTable) {
        throw new Error(`Không tìm thấy bảng "${tableName}" trong database ${getDatabaseName(dbId)} (ID: ${dbId}), schema "${schema}".`);
    }

    const fields = foundTable.fields || [];
    const columns = fields.map(f => ({
        column_name: f.name,
        data_type: f.database_type || f.base_type,
        base_type: f.base_type,
        display_name: f.display_name,
        is_pk: f.special_type === 'type/PK' || f.semantic_type === 'type/PK',
        is_fk: Boolean(f.fk_target_field_id || f.special_type === 'type/FK' || f.semantic_type === 'type/FK'),
        fk_target_field_id: f.fk_target_field_id || null
    }));

    const primaryKeys = columns.filter(c => c.is_pk).map(c => c.column_name);

    return {
        engine: 'metabase-api',
        databaseId: dbId,
        databaseName: getDatabaseName(dbId),
        schema: foundTable.schema || schema,
        tableName: foundTable.name,
        tableId: foundTable.id,
        primaryKeys,
        columns
    };
}

async function metabaseQuery(sql, dbIdentifier, maxRows) {
    const check = sanitizeQuery(sql);
    if (!check.valid) {
        throw new Error(check.error);
    }

    const finalSql = applyLimit(check.cleanSql, maxRows);
    const dbId = resolveDatabaseId(dbIdentifier);

    const start = Date.now();
    const result = await metabaseFetch('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
            database: dbId,
            type: 'native',
            native: {
                query: finalSql
            }
        })
    });
    const durationMs = Date.now() - start;

    if (result.status === 'failed' || result.error) {
        throw new Error(`Lỗi thực thi truy vấn Metabase: ${result.error || 'Truy vấn thất bại'}`);
    }

    const data = result.data || {};
    const cols = data.cols ? data.cols.map(c => c.name) : (data.columns || []);
    const rawRows = data.rows || [];

    const rows = rawRows.map(r => {
        const obj = {};
        cols.forEach((col, idx) => {
            obj[col] = r[idx];
        });
        return obj;
    });

    return {
        engine: 'metabase-api',
        databaseId: dbId,
        databaseName: getDatabaseName(dbId),
        executedQuery: finalSql,
        durationMs,
        rowCount: rows.length,
        rows
    };
}

async function metabaseExplainQuery(sql, dbIdentifier, analyze = false) {
    const check = sanitizeQuery(sql);
    if (!check.valid) {
        throw new Error(check.error);
    }

    const prefix = analyze ? 'EXPLAIN (ANALYZE, BUFFERS) ' : 'EXPLAIN ';
    const explainSql = prefix + check.cleanSql;
    const dbId = resolveDatabaseId(dbIdentifier);

    const start = Date.now();
    const result = await metabaseFetch('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
            database: dbId,
            type: 'native',
            native: {
                query: explainSql
            }
        })
    });
    const durationMs = Date.now() - start;

    if (result.status === 'failed' || result.error) {
        throw new Error(`Lỗi EXPLAIN Metabase: ${result.error || 'Truy vấn thất bại'}`);
    }

    const data = result.data || {};
    const rawRows = data.rows || [];
    const planLines = rawRows.map(r => Array.isArray(r) ? r[0] : String(r)).join('\n');

    return {
        engine: 'metabase-api',
        databaseId: dbId,
        databaseName: getDatabaseName(dbId),
        durationMs,
        plan: `Kế hoạch thực thi qua Metabase (DB ${dbId} - ${durationMs}ms):\n\n${planLines}`
    };
}

// 4. PostgreSQL Pool Config (Fallback Engine)
function getPoolConfig() {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
            statement_timeout: DEFAULT_STATEMENT_TIMEOUT_MS,
            connectionTimeoutMillis: 5000,
            max: 5
        };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        statement_timeout: DEFAULT_STATEMENT_TIMEOUT_MS,
        connectionTimeoutMillis: 5000,
        max: 5
    };
}

let poolInstance = null;

function getPool() {
    if (!poolInstance) {
        poolInstance = new Pool(getPoolConfig());
        poolInstance.on('connect', async (client) => {
            try {
                await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
                await client.query(`SET statement_timeout = ${DEFAULT_STATEMENT_TIMEOUT_MS};`);
            } catch (err) {
                console.error('[db-mcp] Lỗi cấu hình session read-only:', err.message);
            }
        });
        poolInstance.on('error', (err) => {
            console.error('[db-mcp] Lỗi kết nối bất ngờ từ pool:', err.message);
        });
    }
    return poolInstance;
}

// 5. SQL Sanitizer, Auto Limit, Error Format (Import từ db-client)
// 6. Khởi tạo MCP Server
const server = new Server(
    { name: 'database-mcp', version: '2.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'db_ping',
                description: 'Kiểm tra kết nối tới Database (qua Metabase API hoặc PostgreSQL), đo độ trễ, lấy danh sách database (timescale, openapi, openapi-sandbox).',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'db_list_tables',
                description: 'Liệt kê danh sách bảng và view trong schema chỉ định. Hỗ trợ chọn database ("timescale", "openapi", "openapi-sandbox" hoặc ID số).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        schema: {
                            type: 'string',
                            description: 'Tên schema cần liệt kê (mặc định: "public", dùng "*" để lấy tất cả).'
                        },
                        database: {
                            type: 'string',
                            description: 'Database cần truy vấn ("timescale" [644], "openapi" [535], "openapi-sandbox" [655], hoặc ID số). Mặc định là timescale.'
                        }
                    },
                    required: []
                }
            },
            {
                name: 'db_describe_table',
                description: 'Xem chi tiết cấu trúc bảng (danh sách cột, kiểu dữ liệu, Primary Key, Foreign Key).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tableName: {
                            type: 'string',
                            description: 'Tên bảng cần xem cấu trúc (ví dụ: "users", "deals", "orders")'
                        },
                        schema: {
                            type: 'string',
                            description: 'Tên schema chứa bảng (mặc định: "public")'
                        },
                        database: {
                            type: 'string',
                            description: 'Database chứa bảng ("timescale", "openapi", "openapi-sandbox" hoặc ID số).'
                        }
                    },
                    required: ['tableName']
                }
            },
            {
                name: 'db_query',
                description: 'Thực thi câu lệnh SELECT an toàn. Được bảo vệ bởi Regex Sanitizer và Auto-Limit (mặc định 50, trần 200).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sql: {
                            type: 'string',
                            description: 'Câu truy vấn SQL dạng SELECT hoặc WITH ... SELECT'
                        },
                        maxRows: {
                            type: 'number',
                            description: 'Số dòng tối đa cần lấy (mặc định 50, tối đa 200)'
                        },
                        database: {
                            type: 'string',
                            description: 'Database cần truy vấn ("timescale", "openapi", "openapi-sandbox" hoặc ID số).'
                        }
                    },
                    required: ['sql']
                }
            },
            {
                name: 'db_explain_query',
                description: 'Phân tích kế hoạch thực thi (Query Execution Plan) của câu lệnh SELECT bằng EXPLAIN.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sql: {
                            type: 'string',
                            description: 'Câu lệnh SQL cần phân tích kế hoạch thực thi'
                        },
                        analyze: {
                            type: 'boolean',
                            description: 'Nếu true, chạy EXPLAIN (ANALYZE, BUFFERS). Mặc định false.'
                        },
                        database: {
                            type: 'string',
                            description: 'Database cần phân tích ("timescale", "openapi", "openapi-sandbox" hoặc ID số).'
                        }
                    },
                    required: ['sql']
                }
            }
        ]
    };
});

// Xử lý gọi Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
        if (name === 'db_ping') {
            if (isMetabaseMode()) {
                const info = await metabasePing();
                return {
                    content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
                };
            } else {
                const pool = getPool();
                const start = Date.now();
                const res = await pool.query('SELECT version() as db_version, current_database() as database_name, current_user as current_user, now() as server_time');
                const latencyMs = Date.now() - start;
                const info = res.rows[0];
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            status: 'CONNECTED',
                            engine: 'postgresql-direct',
                            latencyMs,
                            database: info.database_name,
                            user: info.current_user,
                            version: info.db_version
                        }, null, 2)
                    }]
                };
            }
        }

        if (name === 'db_list_tables') {
            if (isMetabaseMode()) {
                const data = await metabaseListTables(args.database, args.schema || 'public');
                return {
                    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
                };
            } else {
                const schema = args.schema || 'public';
                const pool = getPool();
                const res = await pool.query('SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_type, table_name;', [schema]);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            engine: 'postgresql-direct',
                            schema,
                            total: res.rows.length,
                            tables: res.rows
                        }, null, 2)
                    }]
                };
            }
        }

        if (name === 'db_describe_table') {
            const tableName = args.tableName;
            if (!tableName) {
                throw new Error('Thiếu tham số bắt buộc "tableName".');
            }

            if (isMetabaseMode()) {
                const data = await metabaseDescribeTable(tableName, args.database, args.schema || 'public');
                return {
                    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
                };
            } else {
                const schema = args.schema || 'public';
                const pool = getPool();

                const columnsRes = await pool.query('SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position;', [schema, tableName]);
                if (columnsRes.rows.length === 0) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Không tìm thấy bảng "${schema}"."${tableName}".` }]
                    };
                }

                const pkRes = await pool.query('SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.constraint_type = \'PRIMARY KEY\' AND tc.table_schema = $1 AND tc.table_name = $2;', [schema, tableName]);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            engine: 'postgresql-direct',
                            schema,
                            tableName,
                            primaryKeys: pkRes.rows.map(r => r.column_name),
                            columns: columnsRes.rows
                        }, null, 2)
                    }]
                };
            }
        }

        if (name === 'db_query') {
            const rawSql = args.sql;
            const maxRows = args.maxRows;

            if (isMetabaseMode()) {
                const data = await metabaseQuery(rawSql, args.database, maxRows);
                return {
                    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
                };
            } else {
                const check = sanitizeQuery(rawSql);
                if (!check.valid) {
                    return { isError: true, content: [{ type: 'text', text: check.error }] };
                }

                const finalSql = applyLimit(check.cleanSql, maxRows);
                const pool = getPool();
                const start = Date.now();
                const res = await pool.query(finalSql);
                const durationMs = Date.now() - start;

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            engine: 'postgresql-direct',
                            executedQuery: finalSql,
                            durationMs,
                            rowCount: res.rows.length,
                            rows: res.rows
                        }, null, 2)
                    }]
                };
            }
        }

        if (name === 'db_explain_query') {
            const rawSql = args.sql;
            const analyze = args.analyze === true;

            if (isMetabaseMode()) {
                const data = await metabaseExplainQuery(rawSql, args.database, analyze);
                return {
                    content: [{ type: 'text', text: data.plan }]
                };
            } else {
                const check = sanitizeQuery(rawSql);
                if (!check.valid) {
                    return { isError: true, content: [{ type: 'text', text: check.error }] };
                }

                const explainPrefix = analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' : 'EXPLAIN (FORMAT TEXT) ';
                const pool = getPool();
                const start = Date.now();
                const res = await pool.query(explainPrefix + check.cleanSql);
                const durationMs = Date.now() - start;
                const planLines = res.rows.map(r => r['QUERY PLAN'] || Object.values(r)[0]).join('\n');

                return {
                    content: [{ type: 'text', text: `Kế hoạch thực thi (${durationMs}ms):\n\n${planLines}` }]
                };
            }
        }

        throw new Error(`Tool "${name}" không được hỗ trợ.`);
    } catch (err) {
        return {
            isError: true,
            content: [{ type: 'text', text: `LỖI DATABASE: ${formatErrorMessage(err)}` }]
        };
    }
});

// 7. Chế độ thực thi CLI Trực tiếp
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    const getArg = (flag) => {

        const idx = process.argv.indexOf(flag);
        return idx !== -1 ? process.argv[idx + 1] : null;
    };

    if (process.argv.includes('--test')) {
        console.log('[db-mcp] Đang kiểm tra kết nối cơ sở dữ liệu...');
        if (isMetabaseMode()) {
            console.log(`[db-mcp] Chế độ: Metabase API Engine (${process.env.METABASE_URL || 'https://mb-uat.dnse.com.vn'})`);
            metabasePing()
                .then(info => {
                    console.log('[db-mcp] KẾT NỐI METABASE THÀNH CÔNG:');
                    console.log(JSON.stringify(info, null, 2));
                    process.exit(0);
                })
                .catch(err => {
                    console.error('[db-mcp] LỖI KẾT NỐI METABASE:', formatErrorMessage(err));
                    console.log('[db-mcp] Gợi ý: Hãy kiểm tra METABASE_URL và METABASE_API_TOKEN trong file .env');
                    process.exit(1);
                });
        } else {
            console.log('[db-mcp] Chế độ: PostgreSQL Driver Engine');
            const pool = getPool();
            pool.query('SELECT version(), current_database(), current_user')
                .then((res) => {
                    console.log('[db-mcp] KẾT NỐI THÀNH CÔNG:');
                    console.log(JSON.stringify(res.rows[0], null, 2));
                    pool.end();
                    process.exit(0);
                })
                .catch((err) => {
                    console.error('[db-mcp] LỖI KẾT NỐI:', formatErrorMessage(err));
                    console.log('[db-mcp] Gợi ý: Hãy kiểm tra DATABASE_URL hoặc cấu hình METABASE trong .env');
                    pool.end();
                    process.exit(1);
                });
        }
    } else if (process.argv.includes('--list-tables')) {
        const schema = getArg('--schema') || 'public';
        const dbName = getArg('--db') || process.env.METABASE_DEFAULT_DATABASE || 'timescale';
        console.log(`[db-mcp] Đang liệt kê các bảng trong database "${dbName}", schema "${schema}"...`);

        if (isMetabaseMode()) {
            metabaseListTables(dbName, schema)
                .then(res => {
                    console.log(`[db-mcp] Database: ${res.databaseName} (ID: ${res.databaseId}) | Schema: "${res.schema}" | Tổng số: ${res.total}`);
                    if (res.tables.length > 0) {
                        console.table(res.tables.map(t => ({
                            ID: t.id,
                            Schema: t.table_schema,
                            TableName: t.table_name,
                            DisplayName: t.display_name
                        })));
                    } else {
                        console.log('Không có bảng nào khớp với schema đã chọn.');
                    }
                    process.exit(0);
                })
                .catch(err => {
                    console.error('[db-mcp] LỖI TRUY VẤN:', formatErrorMessage(err));
                    process.exit(1);
                });
        } else {
            const pool = getPool();
            pool.query('SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_type, table_name;', [schema])
                .then(res => {
                    console.log(`[db-mcp] Schema: "${schema}" | Tổng số: ${res.rows.length}`);
                    console.table(res.rows);
                    pool.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('[db-mcp] LỖI TRUY VẤN:', formatErrorMessage(err));
                    pool.end();
                    process.exit(1);
                });
        }
    } else if (process.argv.includes('--describe')) {
        const tableName = getArg('--describe');
        if (!tableName) {
            console.error('[db-mcp] Vui lòng chỉ định tên bảng: --describe <tên_bảng>');
            process.exit(1);
        }
        const schema = getArg('--schema') || 'public';
        const dbName = getArg('--db') || process.env.METABASE_DEFAULT_DATABASE || 'timescale';

        if (isMetabaseMode()) {
            metabaseDescribeTable(tableName, dbName, schema)
                .then(res => {
                    console.log(`[db-mcp] Cấu trúc bảng "${res.schema}"."${res.tableName}" (Database: ${res.databaseName} - ID: ${res.databaseId}):`);
                    console.log(`Primary Keys: ${res.primaryKeys.join(', ') || 'Không có'}`);
                    console.table(res.columns);
                    process.exit(0);
                })
                .catch(err => {
                    console.error('[db-mcp] LỖI TRUY VẤN:', formatErrorMessage(err));
                    process.exit(1);
                });
        } else {
            const pool = getPool();
            pool.query('SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position;', [schema, tableName])
                .then(res => {
                    console.log(`[db-mcp] Cấu trúc bảng "${schema}"."${tableName}" (${res.rows.length} cột):`);
                    console.table(res.rows);
                    pool.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('[db-mcp] LỖI TRUY VẤN:', formatErrorMessage(err));
                    pool.end();
                    process.exit(1);
                });
        }
    } else {
        const transport = new StdioServerTransport();
        server.connect(transport).catch((err) => {
            console.error('[db-mcp] Lỗi kết nối Stdio:', err);
            process.exit(1);
        });
    }
}

// Xuất module phục vụ unit test
export {
    sanitizeQuery,
    applyLimit,
    formatErrorMessage,
    getPoolConfig,
    isMetabaseMode,
    resolveDatabaseId,
    getDatabaseName,
    resolveOpenApiDatabase,
    METABASE_DB_MAP,
    HARD_CAP_MAX_ROWS,
    DEFAULT_MAX_ROWS
};

