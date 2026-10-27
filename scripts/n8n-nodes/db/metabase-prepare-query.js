const input = $input.first();
const rawJson = (input && input.json) || {};

// 1. Nhận diện nguồn gọi
let triggerSource = 'executeWorkflow';
let rawBody = {};

try {
  const trigWebhook = $('Webhook Trigger (metabase-query)').first();
  if (trigWebhook && trigWebhook.json) {
    triggerSource = 'webhook';
    rawBody = trigWebhook.json.body || trigWebhook.json;
  }
} catch (e) {}

if (triggerSource !== 'webhook') {
  try {
    const trigExec = $('Execute Workflow Trigger').first();
    if (trigExec && trigExec.json) {
      triggerSource = trigExec.json._triggerSource || 'mattermost';
      rawBody = trigExec.json.body?.params || trigExec.json.body || trigExec.json.params || trigExec.json;
    }
  } catch (e) {}
}

const payload = Object.assign({}, rawJson, rawBody);
let rawQuery = (payload.query || payload.sql || '').trim();
const userQuestion = (payload.userQuestion || payload.question || '').trim();
const userName = payload.userName || 'User';
const params = payload.params || {};
let maxRows = parseInt(payload.maxRows || payload.limit || '50', 10);
if (isNaN(maxRows) || maxRows <= 0) maxRows = 50;
if (maxRows > 200) maxRows = 200; // Hard cap trần 200

// A. Bind tham số vào template {{key}} nếu có
if (params && typeof params === 'object') {
  for (const [k, v] of Object.entries(params)) {
    const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    rawQuery = rawQuery.replace(regex, String(v));
  }
}

// B. Kiểm tra câu query rỗng
if (!rawQuery) {
  const errMsg = '🚨 **[Lỗi Truy Vấn Metabase]** Không tìm thấy câu lệnh SQL nào được cung cấp.';
  return [{
    json: {
      isError: true,
      errorType: 'EMPTY_QUERY',
      reportText: errMsg,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// C. QA Security Gate: Chỉ cho phép READ-ONLY (SELECT / EXPLAIN / SHOW / WITH)
const forbiddenPattern = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|REPLACE|UPSERT|MERGE|EXECUTE|EXEC|CALL)\b/i;
if (forbiddenPattern.test(rawQuery)) {
  const errMsg = '🚨 **[Chặn Bởi QA Security Gate]** Lệnh SQL bị từ chối! Hệ thống chỉ cho phép các câu lệnh truy vấn dữ liệu (`SELECT`). Tuyệt đối cấm các câu lệnh thay đổi dữ liệu hoặc thay đổi cấu trúc database (`UPDATE`, `DELETE`, `DROP`, `ALTER`...).';
  return [{
    json: {
      isError: true,
      errorType: 'SECURITY_VIOLATION',
      reportText: errMsg,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// Chặn đa câu lệnh bằng dấu chấm phẩy (;)
const cleanQueryNoComments = rawQuery.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
const semiIndex = cleanQueryNoComments.indexOf(';');
if (semiIndex !== -1 && semiIndex < cleanQueryNoComments.length - 1) {
  const remaining = cleanQueryNoComments.slice(semiIndex + 1).trim();
  if (remaining.length > 0) {
    const errMsg = '🚨 **[Chặn Bởi QA Security Gate]** Phát hiện nhiều câu lệnh phân tách bởi dấu chấm phẩy (`;`). Chỉ cho phép 1 câu lệnh duy nhất.';
    return [{
      json: {
        isError: true,
        errorType: 'MULTI_STATEMENT_DETECTED',
        reportText: errMsg,
        _triggerSource: triggerSource,
        userName
      }
    }];
  }
}

// D. Tự động tiêm LIMIT nếu chưa có
let sanitizedQuery = rawQuery.replace(/;\s*$/, '').trim();
const hasLimit = /\bLIMIT\s+\d+/i.test(sanitizedQuery);
if (!hasLimit) {
  sanitizedQuery += ` LIMIT ${maxRows}`;
}

// E. Phân giải Database ID và Môi trường
const envVal = (payload.environment || payload.env || ($env && $env.METABASE_ENV) || 'uat').toLowerCase();
const isProd = envVal === 'prod' || envVal === 'production';
const rawDb = (payload.database || payload.db || 'openapi').toString().toLowerCase().trim();

let dbName = 'openapi';
let databaseId = 535;

if (rawDb.includes('time') || rawDb.includes('mdds') || rawDb.includes('tick') || rawDb.includes('price')) {
  dbName = 'timescale';
  databaseId = isProd
    ? parseInt(($env && $env.METABASE_PROD_DB_TIMESCALE_ID) || '7', 10)
    : parseInt(($env && ($env.METABASE_UAT_DB_TIMESCALE_ID || $env.METABASE_DB_TIMESCALE_ID)) || '644', 10);
} else if (rawDb.includes('sand') || rawDb.includes('sb')) {
  dbName = 'openapi-sandbox';
  databaseId = parseInt(($env && ($env.METABASE_UAT_DB_OPENAPI_SANDBOX_ID || $env.METABASE_DB_OPENAPI_SANDBOX_ID)) || '655', 10);
} else {
  dbName = 'openapi';
  databaseId = isProd
    ? parseInt(($env && $env.METABASE_PROD_DB_OPENAPI_ID) || '266', 10)
    : parseInt(($env && ($env.METABASE_UAT_DB_OPENAPI_ID || $env.METABASE_DB_OPENAPI_ID)) || '535', 10);
}

// Nếu user truyền thẳng database ID dạng số
const parsedNumericDb = parseInt(rawDb, 10);
if (!isNaN(parsedNumericDb) && parsedNumericDb > 0) {
  databaseId = parsedNumericDb;
}

// G. Partition Pruning Check cho TimescaleDB Hypertables
if (dbName === 'timescale') {
  const timescaleHypertables = [
    'krx_mdds_v3_ticks', 'krx_mdds_v3_ticks_extra', 'krx_mdds_v3_top_prices',
    'krx_mdds_v3_market_indices', 'krx_mdds_v3_board_events', 'krx_mdds_v3_symbol_board_events',
    'krx_mdds_v3_trading_foreign_investors', 'expected_price_v3', 'expected_price_v3_snapshots',
    'krx_mdds_v2_ticks', 'krx_mdds_v2_top_prices', 'krx_mdds_v2_market_indices',
    'krx_mdds_v2_board_events', 'krx_mdds_v2_symbol_board_events', 'krx_mdds_v2_stock_ohlc',
    'prices', 'stock_ohlc', 'trading_result_of_foreign_investors'
  ];

  const matchedHypertable = timescaleHypertables.find(t => new RegExp(`\\b${t}\\b`, 'i').test(cleanQueryNoComments));
  if (matchedHypertable) {
    const hasTimeFilter = /(sending_time|transact_time|\btime\b|created_at|\bdate\b)\s*(=|!=|<>|<|>|<=|>=|\bBETWEEN\b|\bIN\b|\bLIKE\b|\bIS\s+NOT\s+NULL\b)/i.test(cleanQueryNoComments)
      || /time_bucket\s*\(/i.test(cleanQueryNoComments)
      || /\b(CURRENT_DATE|CURRENT_TIMESTAMP|now\(\))\b/i.test(cleanQueryNoComments);
    if (!hasTimeFilter) {
      const errMsg = `🚨 **[Chặn Bởi TimescaleDB Partition Guard]** Truy vấn vào hypertable (\`${matchedHypertable}\`) thiếu điều kiện lọc thời gian (\`sending_time\`, \`transact_time\`, hoặc \`time\`). Bắt buộc phải có điều kiện lọc thời gian để tránh quét toàn bảng (Full Table Scan).`;
      return [{
        json: {
          isError: true,
          errorType: 'MISSING_PARTITION_FILTER',
          reportText: errMsg,
          _triggerSource: triggerSource,
          userName
        }
      }];
    }
  }
}

// F. Phân giải URL và Session Token
let metabaseUrl = isProd
  ? (($env && $env.METABASE_PROD_URL) || ($env && $env.METABASE_URL) || 'https://mb.dnse.com.vn')
  : (($env && $env.METABASE_UAT_URL) || ($env && $env.METABASE_URL) || 'https://mb-uat.dnse.com.vn');
metabaseUrl = metabaseUrl.replace(/\/+$/, '');

let sessionToken = '';
if (isProd) {
  sessionToken = ($env && $env.METABASE_PROD_SESSION_TOKEN) || ($env && $env.METABASE_PROD_API_TOKEN) || ($env && $env.METABASE_SESSION_TOKEN) || '';
} else {
  sessionToken = ($env && $env.METABASE_UAT_API_TOKEN) || ($env && $env.METABASE_UAT_SESSION_TOKEN) || ($env && $env.METABASE_API_TOKEN) || ($env && $env.METABASE_SESSION_TOKEN) || '';
}

// Fallback nạp session token từ .env trực tiếp nếu $env chưa cập nhật
if (!sessionToken && typeof require !== 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const envFile = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const tokenKey = isProd ? 'METABASE_PROD_SESSION_TOKEN' : 'METABASE_UAT_API_TOKEN';
      const m = envContent.match(new RegExp(`^${tokenKey}=(.*)$`, 'm'));
      if (m && m[1]) sessionToken = m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
}

return [{
  json: {
    isError: false,
    sanitizedQuery,
    originalQuery: rawQuery,
    userQuestion,
    dbName,
    databaseId,
    environment: isProd ? 'PRODUCTION' : 'UAT',
    metabaseUrl,
    sessionToken,
    maxRows,
    userName,
    _triggerSource: triggerSource
  }
}];
