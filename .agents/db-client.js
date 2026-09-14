#!/usr/bin/env node
/**
 * Shared Metabase Client (.agents/db-client.js)
 *
 * Module dùng chung cho db-mcp.js và test-data-mcp.js.
 * Chứa: loadEnv, Metabase API fetch, sanitizeQuery, applyLimit,
 *        METABASE_DB_MAP, resolveDatabaseId, getDatabaseName.
 *
 * NGUYÊN TẮC BẤT BIẾN: READ-ONLY.
 * Không export bất kỳ hàm ghi dữ liệu nào lên DB.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');


function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?(\s*)$/);
        if (match) {
            let key   = match[1];
            let value = (match[2] || '').replace(/(^['"]|['"]$)/g, '').trim();
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    });
}

// Nạp .env gốc dự án (nếu file tồn tại)
loadEnv(path.join(projectRoot, '.env'));

// ─── 2. Tham số hệ thống ─────────────────────────────────────────────────────

const DEFAULT_MAX_ROWS           = 50;
const HARD_CAP_MAX_ROWS          = 200;
const DEFAULT_STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT || '5000', 10);

// ─── 3. Metabase Database ID Map ─────────────────────────────────────────────

const METABASE_DB_MAP = {
    'timescale':      parseInt(process.env.METABASE_DB_TIMESCALE_ID      || '644', 10),
    'openapi':        parseInt(process.env.METABASE_DB_OPENAPI_ID        || '535', 10),
    'openapi-sandbox':parseInt(process.env.METABASE_DB_OPENAPI_SANDBOX_ID|| '655', 10),
    'sandbox':        parseInt(process.env.METABASE_DB_OPENAPI_SANDBOX_ID|| '655', 10),
};

function isMetabaseMode() {
    return Boolean(
        process.env.METABASE_URL ||
        process.env.METABASE_API_TOKEN ||
        process.env.METABASE_SESSION_TOKEN ||
        process.env.METABASE_PROD_URL ||
        process.env.METABASE_PROD_SESSION_TOKEN
    );
}

/**
 * Phân giải cấu hình Metabase đang hoạt động (UAT vs Production)
 */
function getMetabaseConfig() {
    const envVal = (process.env.METABASE_ENV || '').toLowerCase();
    const isExplicitProd = envVal === 'prod' || envVal === 'production';
    const prodUrl = process.env.METABASE_PROD_URL || '';
    const currentUrl = process.env.METABASE_URL || '';
    const isUrlProd = Boolean(prodUrl && currentUrl && currentUrl.replace(/\/+$/, '') === prodUrl.replace(/\/+$/, ''));
    const isProd = isExplicitProd || isUrlProd;

    let baseUrl = process.env.METABASE_URL;
    let token = process.env.METABASE_SESSION_TOKEN || process.env.METABASE_API_TOKEN;

    if (isProd) {
        baseUrl = (isExplicitProd ? process.env.METABASE_PROD_URL : null) || baseUrl || process.env.METABASE_PROD_URL || '';
        token = process.env.METABASE_PROD_SESSION_TOKEN || token || process.env.METABASE_PROD_API_TOKEN;
    } else {
        baseUrl = baseUrl || process.env.METABASE_UAT_URL || '';
        token = token || process.env.METABASE_UAT_API_TOKEN || process.env.METABASE_UAT_SESSION_TOKEN;
    }

    return {
        isProd,
        baseUrl: (baseUrl || '').replace(/\/+$/, ''),
        token: token || ''
    };
}

function resolveDatabaseId(dbIdentifier) {
    const { isProd } = getMetabaseConfig();
    const timescaleId = isProd
        ? parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || '7', 10)
        : parseInt(process.env.METABASE_UAT_DB_TIMESCALE_ID || process.env.METABASE_DB_TIMESCALE_ID || '644', 10);
    const openapiId = isProd
        ? parseInt(process.env.METABASE_PROD_DB_OPENAPI_ID || '266', 10)
        : parseInt(process.env.METABASE_UAT_DB_OPENAPI_ID || process.env.METABASE_DB_OPENAPI_ID || '535', 10);
    const openapiSandboxId = parseInt(process.env.METABASE_UAT_DB_OPENAPI_SANDBOX_ID || process.env.METABASE_DB_OPENAPI_SANDBOX_ID || '655', 10);

    const activeDbMap = {
        'timescale': timescaleId,
        'openapi': openapiId,
        'openapi-sandbox': openapiSandboxId,
        'sandbox': openapiSandboxId,
    };

    if (!dbIdentifier) {
        const defaultDb = (process.env.METABASE_DEFAULT_DATABASE || 'timescale').toLowerCase();
        return activeDbMap[defaultDb] || parseInt(defaultDb, 10) || timescaleId;
    }
    if (typeof dbIdentifier === 'number') return dbIdentifier;
    const key = String(dbIdentifier).trim().toLowerCase();
    if (activeDbMap[key]) return activeDbMap[key];
    const parsed = parseInt(key, 10);
    if (!isNaN(parsed)) return parsed;
    return activeDbMap['timescale'] || timescaleId;
}

function getDatabaseName(dbId) {
    const parsed = parseInt(dbId, 10);
    const uatTimescale = parseInt(process.env.METABASE_UAT_DB_TIMESCALE_ID || process.env.METABASE_DB_TIMESCALE_ID || '644', 10);
    const prodTimescale = parseInt(process.env.METABASE_PROD_DB_TIMESCALE_ID || '7', 10);
    const uatOpenApi = parseInt(process.env.METABASE_UAT_DB_OPENAPI_ID || process.env.METABASE_DB_OPENAPI_ID || '535', 10);
    const prodOpenApi = parseInt(process.env.METABASE_PROD_DB_OPENAPI_ID || '266', 10);
    const sandboxId = parseInt(process.env.METABASE_UAT_DB_OPENAPI_SANDBOX_ID || process.env.METABASE_DB_OPENAPI_SANDBOX_ID || '655', 10);

    if (parsed === uatTimescale || parsed === prodTimescale || parsed === 644 || parsed === 7) return 'timescale';
    if (parsed === uatOpenApi || parsed === prodOpenApi || parsed === 535 || parsed === 266) return 'openapi';
    if (parsed === sandboxId || parsed === 655) return 'openapi-sandbox';
    return `db-${dbId}`;
}

/**
 * Tự động phân giải database OpenAPI dựa trên URL hoặc tên môi trường:
 * - Nếu chứa 'sandbox' hoặc 'sb-openapi' -> openapi-sandbox
 * - Mặc định, rỗng, null, hoặc chứa 'openapi-uat' / 'openapi' -> openapi
 */
function resolveOpenApiDatabase(targetEnvOrUrl) {
    if (targetEnvOrUrl === null || targetEnvOrUrl === '') {
        return 'openapi';
    }
    const input = targetEnvOrUrl === undefined ? (process.env.BASE_URL || '') : targetEnvOrUrl;
    const raw = String(input).toLowerCase();
    if (raw.includes('sandbox') || raw.includes('sb-openapi')) {
        return 'openapi-sandbox';
    }
    return 'openapi';
}

// ─── 4. Metabase HTTP Client ──────────────────────────────────────────────────

function getMetabaseHeaders() {
    const { token } = getMetabaseConfig();
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) {
        headers['X-API-KEY']          = token;
        headers['X-Metabase-Session'] = token;
        headers['Cookie']             = `metabase.SESSION=${token}`;
    }
    return headers;
}

function formatErrorMessage(err) {
    if (!err) return 'Unknown error';
    if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
        return `Timeout — kết nối vượt quá giới hạn thời gian.`;
    }
    if (err.errors && Array.isArray(err.errors)) {
        const msgs = err.errors.map(e => e.message || String(e)).join('; ');
        return err.code ? `${err.code}: ${msgs}` : msgs;
    }
    return err.message || String(err);
}

async function metabaseFetch(endpoint, options = {}) {
    const { baseUrl } = getMetabaseConfig();
    const url     = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = { ...getMetabaseHeaders(), ...(options.headers || {}) };
    const timeoutMs = options.timeout || (endpoint.includes('/metadata') ? 35000 : DEFAULT_STATEMENT_TIMEOUT_MS);

    let res;
    try {
        res = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (netErr) {
        throw new Error(`Không thể kết nối tới Metabase (${baseUrl}): ${formatErrorMessage(netErr)}`);
    }

    if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try { const p = JSON.parse(errText); errMsg = p.message || p.error || errText; } catch (_) {}
        if (res.status === 401 || res.status === 403) {
            throw new Error(`Xác thực Metabase thất bại (${res.status}): Kiểm tra METABASE_SESSION_TOKEN hoặc METABASE_API_TOKEN trong .env. Nếu dùng SSO trên Production (${baseUrl}), hãy chạy 'npm run metabase:login' để đăng nhập và làm mới session token. Chi tiết: ${errMsg}`);
        }
        throw new Error(`Lỗi Metabase API (${res.status}): ${errMsg}`);
    }
    return await res.json();
}

// ─── 5. Thực thi Native SQL qua Metabase Dataset API ─────────────────────────

/**
 * Gửi câu lệnh SQL đến Metabase /api/dataset và trả về Array<Object>.
 * Luôn quét qua sanitizeQuery để đảm bảo 100% tuân thủ quy tắc Read-Only.
 */
async function metabaseRunSql(sql, dbIdentifier) {
    const check = sanitizeQuery(sql);
    if (!check.valid) {
        throw new Error(check.error);
    }
    const cleanSql = check.cleanSql;
    const dbId  = resolveDatabaseId(dbIdentifier);
    const start = Date.now();

    const result = await metabaseFetch('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({ database: dbId, type: 'native', native: { query: cleanSql } }),
    });
    const durationMs = Date.now() - start;

    if (result.status === 'failed' || result.error) {
        throw new Error(`Lỗi thực thi truy vấn Metabase: ${result.error || 'Truy vấn thất bại'}`);
    }

    const data = result.data || {};
    const cols = data.cols ? data.cols.map(c => c.name) : (data.columns || []);
    const rows = (data.rows || []).map(r => {
        const obj = {};
        cols.forEach((col, idx) => { obj[col] = r[idx]; });
        return obj;
    });

    return { rows, durationMs, dbId, dbName: getDatabaseName(dbId) };
}

// ─── 6. SQL Sanitizer & Auto-Limit (Read-Only guard) ─────────────────────────

function sanitizeQuery(sql) {
    if (!sql || typeof sql !== 'string') {
        return { valid: false, error: 'Câu lệnh SQL không hợp lệ hoặc bị rỗng.' };
    }
    const stripped = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!stripped) return { valid: false, error: 'Câu lệnh SQL rỗng sau khi loại bỏ comment.' };

    const statements = stripped.split(';').map(s => s.trim()).filter(Boolean);
    if (statements.length > 1) {
        return { valid: false, error: 'BẢO VỆ AN TOÀN: không cho phép chạy nhiều câu lệnh cùng lúc (phân tách bằng dấu chấm phẩy).' };
    }
    const stmt = statements[0];
    if (!/^(SELECT|WITH|EXPLAIN|SHOW)\b/i.test(stmt)) {
        return { valid: false, error: `TRUY VẤN BỊ CHẶN: Chỉ chấp nhận SELECT/WITH/EXPLAIN/SHOW. Nhận: "${stmt.slice(0, 40)}..."` };
    }

    // Loại bỏ chuỗi ký tự '...' trước khi kiểm tra từ khóa nguy hiểm để tránh false positive khi chuỗi chứa từ khóa
    const codeWithoutStrings = stmt.replace(/'(?:''|[^'])*'/g, "''");

    const forbiddenRegex = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|REINDEX|VACUUM|COPY|EXECUTE|EXEC|MERGE|CALL|DO|LOCK|INTO)\b/i;
    if (forbiddenRegex.test(codeWithoutStrings)) {
        const kw = codeWithoutStrings.match(forbiddenRegex)[0];
        return { valid: false, error: `TRUY VẤN BỊ CHẶN: Phát hiện từ khóa nguy hiểm "${kw.toUpperCase()}". Chế độ READ-ONLY.` };
    }
    return { valid: true, cleanSql: stmt };
}

function applyLimit(cleanSql, requestedLimit) {
    let limit = (typeof requestedLimit === 'number' && requestedLimit > 0) ? requestedLimit : DEFAULT_MAX_ROWS;
    if (limit > HARD_CAP_MAX_ROWS) limit = HARD_CAP_MAX_ROWS;
    if (/^(EXPLAIN|SHOW)\b/i.test(cleanSql)) return cleanSql;
    const m = cleanSql.match(/\bLIMIT\s+(\d+)/i);
    if (m) {
        const existing = parseInt(m[1], 10);
        return existing > HARD_CAP_MAX_ROWS
            ? cleanSql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${HARD_CAP_MAX_ROWS}`)
            : cleanSql;
    }
    return `${cleanSql} LIMIT ${limit}`;
}

// ─── 7. Cache Disk ───────────────────────────────────────────────────────────

const CACHE_DIR = path.join(projectRoot, '.agents', 'cache');

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getDiskCachePath(dbId) {
    const { isProd } = getMetabaseConfig();
    const envPrefix = isProd ? 'prod' : 'uat';
    return path.join(CACHE_DIR, `schema-${envPrefix}-${dbId}.json`);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
    // env
    loadEnv,
    projectRoot,
    // constants
    DEFAULT_MAX_ROWS,
    HARD_CAP_MAX_ROWS,
    DEFAULT_STATEMENT_TIMEOUT_MS,
    // db mapping
    METABASE_DB_MAP,
    isMetabaseMode,
    getMetabaseConfig,
    resolveDatabaseId,
    getDatabaseName,
    resolveOpenApiDatabase,
    // http
    getMetabaseHeaders,
    formatErrorMessage,
    metabaseFetch,
    metabaseRunSql,
    // sql safety
    sanitizeQuery,
    applyLimit,
    // cache
    CACHE_DIR,
    ensureCacheDir,
    getDiskCachePath,
};

