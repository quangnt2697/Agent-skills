/**
 * n8n Client Adapter (`scripts/lib/n8n-client.js`)
 *
 * Adapter kết nối n8n Fast-Path cho các AI Agent Skills:
 * - Gửi Webhook với timeout và error handling rõ ràng
 * - Các hàm chuyên biệt: prepJiraContext, pushSpecToJira, batchSquashPush, triggerAsyncTest...
 *
 * **Lưu ý:** n8n là BẮT BUỘC phải đang chạy. Không có fallback MCP hay shell.
 * Khởi động n8n bằng: `npm run n8n` hoặc `npm run n8n:bg` (background via PM2)
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Đảm bảo nạp .env
dotenv.config({ path: path.join(projectRoot, '.env') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = parseInt(process.env.N8N_WEBHOOK_TIMEOUT_MS || '8000', 10);

/**
 * Gửi webhook đến n8n với timeout và error handling.
 * @param {string} webhookPath Webhook path (VD: 'jira-prep' hoặc 'webhook/jira-prep')
 * @param {object} payload Dữ liệu gửi đi
 * @param {number} timeoutMs Thời gian chờ tối đa
 * @returns {Promise<object|null>}
 */
export async function callN8nWebhook(webhookPath, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS, { retries = 0 } = {}) {
  const cleanPath = webhookPath.replace(/^\//, '');
  const url = cleanPath.startsWith('webhook') 
    ? `${N8N_BASE_URL}/${cleanPath}` 
    : `${N8N_BASE_URL}/webhook/${cleanPath}`;

  // Mỗi request có AbortController + timer riêng để lần gọi sau không bị trừ thời gian của lần trước
  const post = async (targetUrl) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const attempt = async () => {
    const res = await post(url);

    // Nếu webhook production chưa Publish (404), thử gọi webhook-test (khi user đang test trên UI)
    if (res.status === 404 && !cleanPath.includes('webhook-test')) {
      const testUrl = `${N8N_BASE_URL}/webhook-test/${cleanPath.replace(/^webhook\//, '')}`;
      const testRes = await post(testUrl).catch(() => null);
      if (testRes && testRes.ok) {
        return await testRes.json();
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`n8n HTTP ${res.status}: ${errText}`);
      err.status = res.status;
      throw err;
    }

    return await res.json();
  };

  // Retry chỉ dành cho webhook idempotent (retries > 0); lỗi mạng tạm thời hoặc 502/503/504
  const isTransient = (err) =>
    [502, 503, 504].includes(err.status) ||
    ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.cause?.code || err.code);
  const backoff = [300, 900];

  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (i >= retries || !isTransient(err)) throw err;
      await new Promise(r => setTimeout(r, backoff[Math.min(i, backoff.length - 1)]));
    }
  }
}

/**
 * Fast-Path: Lấy context Jira đã làm sạch từ n8n
 * @param {string} issueKey Mã Jira (VD: G3PTP-17396)
 * @returns {Promise<object|null>}
 */
export async function prepJiraContext(issueKey) {
  return await callN8nWebhook('jira-prep', { issueKey }, 15000, { retries: 2 });
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
 * Fast-Path: Lấy Test Fixture chứng khoán từ security_definition_v3
 * Trả về 4 phân khúc: Phái sinh (41I1GA0000/rollover), HOSE (SHB), UPCOM (OIL), HNX (SHS) kèm API Key/Secret.
 * @param {object} params { exchange, symbol, accountType }
 * @returns {Promise<object>}
 */
export async function getSecuritiesFixture(params = {}) {
  return await callN8nWebhook('securities-fixture', params, 25000, { retries: 2 });
}

/**
 * Fast-Path: Khám phá locator Web UI thật bằng cách mở browser, đăng nhập
 * bằng TRADING_USERNAME/PASSWORD và dump DOM của trang chỉ định.
 * Kết quả lưu vào workspace/{issueKey}/test/fixtures/locators.json.
 * @param {string} issueKey  Jira issue key (VD: STK-201)
 * @param {string} targetPage Tên màn hình cần lấy locator (VD: 'login', 'order', 'portfolio')
 * @param {object} options   { urlOverride } — ghi đè URL nếu cần
 * @returns {Promise<object>} { success, loginSuccess, locatorCount, outputFile, login_locators, page_locators }
 */
export async function discoverWebUILocators(issueKey, targetPage = 'home', options = {}) {
  const payload = { issueKey, targetPage, ...options };
  return await callN8nWebhook('web-ui-locator-discovery', payload, 120000); // 2 phút cho Playwright
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
 * Fast-Path: Tiền xử lý lọc sạch git diff rác cho Code Reviewer
 * @param {string} rawDiffText Nội dung raw diff
 * @param {object} options { maxLinesPerFile: number }
 * @returns {Promise<object>}
 */
export async function cleanDiffForReview(rawDiffText, options = {}) {
  return await callN8nWebhook('cr-diff-clean', { rawDiff: rawDiffText, ...options }, 20000);
}

/**
 * Fast-Path: Quét phụ thuộc và lỗ hổng bảo mật ngầm
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

/**
 * Fast-Path: Lấy ma trận loại lệnh hợp lệ và bảng Examples tham số hóa đa sàn (WF-18)
 * Tra cứu theo sàn, phiên, và cờ trạng thái SI (CR/RES filter).
 * @param {object} params { marketId, boardId, eventId, symbol, adminStatus, sanctionStatus, methodStatus }
 * @returns {Promise<object>} { allowedOrders, disallowedOrders, sessionName, isMtlFiltered, multiSymbolExamples }
 */
export async function getSecuritiesRuleMatrix(params = {}) {
  return await callN8nWebhook('securities-rule-matrix', { action: 'getRuleMatrix', ...params }, 20000);
}

/**
 * Fast-Path: Kiểm tra tính tuân thủ quy tắc nghiệp vụ chứng khoán (Domain Linter) của file Gherkin (WF-19)
 * Phát hiện vi phạm: MTL trên mã CR/RES, lệnh cấm trên UPCoM, sửa/hủy ATO/ATC, PLO sau giờ...
 * @param {string|object} gherkinOrParams Nội dung .feature hoặc object { gherkinContent, issueKey }
 * @returns {Promise<object>} { valid, errorCount, warningCount, errors, warnings, checkedRules }
 */
export async function lintDomainGherkin(gherkinOrParams) {
  const payload = typeof gherkinOrParams === 'string'
    ? { action: 'lintGherkin', gherkinContent: gherkinOrParams }
    : { action: 'lintGherkin', ...gherkinOrParams };
  return await callN8nWebhook('qa-domain-lint', payload, 25000);
}

/**
 * Fast-Path: Kéo ảnh render frame từ Figma làm giao diện chuẩn đối chiếu
 * @param {string} fileKeyOrUrl Link Figma hoặc File Key
 * @param {string} nodeId ID của Node/Frame
 * @param {string} outputPath Đường dẫn lưu ảnh
 * @param {object} options { scale, format }
 * @returns {Promise<object>}
 */
export async function downloadFigmaFrame(fileKeyOrUrl, nodeId, outputPath, options = {}) {
  try {
    const payload = { fileKeyOrUrl, nodeId, outputPath, ...options };
    return await callN8nWebhook('ui-design-mockup', payload, 30000);
  } catch (err) {
    const { exportFigmaImage } = await import('./figma-client.js');
    return await exportFigmaImage(fileKeyOrUrl, nodeId, outputPath, options);
  }
}

// ── CLI ENTRYPOINT (Chống sai lệch kiến trúc) ──────────────────────────────
// Cho phép gọi trực tiếp script này từ Bash thay vì chỉ làm JS Module
// Dùng pathToFileURL để đảm bảo portable trên Windows (path separator khác nhau)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
        case 'downloadFigmaFrame':
          result = await downloadFigmaFrame(args[1], args[2], args[3], JSON.parse(args[4] || '{}'));
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
        case 'discoverWebUILocators':
          // Usage: node n8n-client.js discoverWebUILocators STK-201 order
          result = await discoverWebUILocators(args[1], args[2] || 'home', JSON.parse(args[3] || '{}'));
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
        case 'getSecuritiesRuleMatrix':
          result = await getSecuritiesRuleMatrix(JSON.parse(args[1] || '{}'));
          break;
        case 'lintDomainGherkin':
          result = await lintDomainGherkin(args[1] && args[1].startsWith('{') ? JSON.parse(args[1]) : args[1]);
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

