/**
 * n8n Client Adapter (`scripts/lib/n8n-client.js`)
 *
 * Tiện ích kết nối n8n Fast-Path cho các AI Agent Skills:
 * - Kiểm tra trạng thái n8n (Fast healthcheck)
 * - Gửi Webhook với timeout và fallback an toàn
 * - Cung cấp các hàm chuyên biệt: prepJiraContext, pushSpecToJira, batchSquashPush, runAsyncTest
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Đảm bảo nạp .env
dotenv.config({ path: path.join(projectRoot, '.env') });

const N8N_ENABLED = (process.env.N8N_ENABLED || 'true').toLowerCase() === 'true';
const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = parseInt(process.env.N8N_WEBHOOK_TIMEOUT_MS || '8000', 10);

/**
 * Kiểm tra xem n8n có đang chạy và sẵn sàng nhận webhook hay không.
 * @returns {Promise<boolean>}
 */
export async function isN8nAvailable() {
  if (!N8N_ENABLED) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500); // 1.5s fast ping
    
    // n8n exposes /healthz or check base endpoint
    const res = await fetch(`${N8N_BASE_URL}/healthz`, {
      method: 'GET',
      signal: controller.signal
    }).catch(async () => {
      // Fallback: ping root
      return await fetch(N8N_BASE_URL, { method: 'HEAD', signal: controller.signal });
    });

    clearTimeout(timeout);
    return res && (res.ok || res.status < 500);
  } catch {
    return false;
  }
}

/**
 * Gửi webhook đến n8n với timeout và error handling.
 * @param {string} path Webhook path (VD: 'jira-prep' hoặc 'webhook/jira-prep')
 * @param {object} payload Dữ liệu gửi đi
 * @param {number} timeoutMs Thời gian chờ tối đa
 * @returns {Promise<object|null>}
 */
export async function callN8nWebhook(path, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const cleanPath = path.replace(/^\//, '');
  const url = cleanPath.startsWith('webhook') 
    ? `${N8N_BASE_URL}/${cleanPath}` 
    : `${N8N_BASE_URL}/webhook/${cleanPath}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    // Nếu webhook production chưa Publish (404), thử gọi webhook-test (khi user đang test trên UI)
    if (res.status === 404 && !cleanPath.includes('webhook-test')) {
      const testUrl = `${N8N_BASE_URL}/webhook-test/${cleanPath.replace(/^webhook\//, '')}`;
      const testRes = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).catch(() => null);
      if (testRes && testRes.ok) {
        clearTimeout(timer);
        return await testRes.json();
      }
    }

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`n8n HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fast-Path: Lấy context Jira đã làm sạch từ n8n
 * @param {string} issueKey Mã Jira (VD: G3PTP-17396)
 * @returns {Promise<object|null>}
 */
export async function prepJiraContext(issueKey) {
  return await callN8nWebhook('jira-prep', { issueKey });
}

/**
 * Fast-Path: Batch Push test cases lên Squash TM qua n8n
 * Tự động nạp cấu hình từ .env nếu params không truyền vào
 * @param {object} params { baseUrl, apiToken, projectId, folderId, testCases }
 * @returns {Promise<object>}
 */
export async function batchSquashPush(params = {}) {
  const payload = {
    baseUrl: (params.baseUrl || process.env.SQUASH_BASE_URL || '').replace(/\/$/, ''),
    apiToken: params.apiToken || process.env.SQUASH_API_TOKEN || '',
    projectId: params.projectId || process.env.SQUASH_PROJECT_ID || '',
    folderId: params.folderId || process.env.SQUASH_TC_G31_FOLDER_ID || '',
    testCases: params.testCases || []
  };
  return await callN8nWebhook('squash-batch', payload, 30000); // 30s for batch
}

/**
 * Fast-Path: Lấy báo cáo Standup từ n8n để hiển thị trực tiếp lên Mattermost
 * @returns {Promise<object>}
 */
export async function getStandupReport() {
  return await callN8nWebhook('sm-standup', {});
}

/**
 * Fast-Path: Kích hoạt test suite phi đồng bộ (Non-blocking)
 * @param {object} params { issueKey, testCommand, testFiles }
 * @returns {Promise<object>}
 */
export async function triggerAsyncTest(params) {
  return await callN8nWebhook('qa-run-test', params);
}

/**
 * Fast-Path: Đẩy file refined.md lên Jira Description qua n8n
 * @param {string} issueKey Mã Jira
 * @param {string} filePathOrProject Đường dẫn file hoặc tên project/cluster
 * @param {object} options { dryRun: boolean, project: string }
 * @returns {Promise<object>}
 */
export async function pushSpecToJira(issueKey, filePathOrProject = '', options = {}) {
  const isMd = typeof filePathOrProject === 'string' && filePathOrProject.endsWith('.md');
  const payload = {
    issueKey,
    filePath: isMd ? filePathOrProject : undefined,
    project: options.project || (!isMd ? filePathOrProject : undefined),
    dryRun: Boolean(options.dryRun)
  };
  return await callN8nWebhook('jira-push-spec', payload, 30000);
}

/**
 * Fast-Path: Thực thi truy vấn dữ liệu Metabase (TimescaleDB / OpenAPI) qua n8n
 * @param {string} query Câu lệnh SQL hoặc template
 * @param {object} options { database, environment, maxRows, params, userQuestion }
 * @returns {Promise<object>}
 */
export async function queryMetabase(query, options = {}) {
  const payload = {
    query,
    database: options.database || 'openapi',
    environment: options.environment || 'uat',
    maxRows: options.maxRows || 50,
    params: options.params || {},
    userQuestion: options.userQuestion || ''
  };
  return await callN8nWebhook('metabase-query', payload, 35000);
}

/**
 * Fast-Path: Lấy Test Fixture chứng khoán từ security_definition_v3 (WF-02)
 * Trả về 4 phân khúc: Phái sinh (41I1GA0000/rollover), HOSE (SHB), UPCOM (OIL), HNX (SHS) kèm API Key/Secret.
 * @param {object} params { exchange, symbol, accountType }
 * @returns {Promise<object>}
 */
export async function getSecuritiesFixture(params = {}) {
  return await callN8nWebhook('securities-fixture', params, 25000);
}

/**
 * Fast-Path: Bóc tách tài liệu Confluence Storage XHTML sang Markdown tinh gọn (WF-03)
 * @param {string} pageUrlOrId Confluence URL hoặc Page ID
 * @returns {Promise<object>}
 */
export async function fetchConfluenceDoc(pageUrlOrId) {
  return await callN8nWebhook('confluence-doc', { pageUrlOrId }, 25000);
}

/**
 * Fast-Path: Tiền xử lý lọc sạch git diff rác cho Code Reviewer (WF-07)
 * @param {string} rawDiffText Nội dung raw diff
 * @param {object} options { maxLinesPerFile: number }
 * @returns {Promise<object>}
 */
export async function cleanDiffForReview(rawDiffText, options = {}) {
  return await callN8nWebhook('cr-diff-clean', { rawDiff: rawDiffText, ...options }, 20000);
}

/**
 * Fast-Path: Quét phụ thuộc và lỗ hổng bảo mật ngầm (WF-08)
 * @param {string} projectPath Đường dẫn project
 * @param {object} options { scanContent: string }
 * @returns {Promise<object>}
 */
export async function runSecurityDigest(projectPath = '', options = {}) {
  return await callN8nWebhook('security-scan', { projectPath, ...options }, 35000);
}

/**
 * Fast-Path: Gửi sự kiện chuyển trạng thái Jira Ready To Test lên Mattermost (WF-11)
 * @param {object} payload Dữ liệu Jira Webhook hoặc test payload
 * @returns {Promise<object>}
 */
export async function notifyJiraReadyToTest(payload = {}) {
  return await callN8nWebhook('jira-ready-to-test', payload, 20000);
}

// ── CLI ENTRYPOINT (Chống sai lệch kiến trúc) ──────────────────────────────
// Cho phép gọi trực tiếp script này từ Bash thay vì chỉ làm JS Module
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const action = args[0];
  if (!action) {
    console.error("Usage: node n8n-client.js <action> [args...]");
    process.exit(1);
  }

  (async () => {
    try {
      let result;
      switch(action) {
        case 'ping':
          result = await isN8nAvailable();
          break;
        case 'prepJiraContext':
          result = await prepJiraContext(args[1]);
          break;
        case 'pushSpecToJira':
          result = await pushSpecToJira(args[1], args[2], JSON.parse(args[3] || '{}'));
          break;
        case 'queryMetabase':
          result = await queryMetabase(args[1], JSON.parse(args[2] || '{}'));
          break;
        case 'batchSquashPush':
          result = await batchSquashPush(JSON.parse(args[1] || '{}'));
          break;
        case 'getStandupReport':
          result = await getStandupReport();
          break;
        case 'triggerAsyncTest':
          result = await triggerAsyncTest(JSON.parse(args[1] || '{}'));
          break;
        case 'getSecuritiesFixture':
          result = await getSecuritiesFixture(JSON.parse(args[1] || '{}'));
          break;
        case 'fetchConfluenceDoc':
          result = await fetchConfluenceDoc(args[1]);
          break;
        case 'cleanDiffForReview':
          result = await cleanDiffForReview(args[1], JSON.parse(args[2] || '{}'));
          break;
        case 'runSecurityDigest':
          result = await runSecurityDigest(args[1], JSON.parse(args[2] || '{}'));
          break;
        case 'notifyJiraReadyToTest':
          result = await notifyJiraReadyToTest(JSON.parse(args[1] || '{}'));
          break;
        default:
          console.error(`Unknown action: ${action}`);
          process.exit(1);
      }
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    }
  })();
}

