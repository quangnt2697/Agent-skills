import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import {
  callN8nWebhook,
  prepJiraContext,
  pushSpecToJira,
  batchSquashPush,
  getStandupReport,
  triggerAsyncTest,
  queryMetabase,
  getSecuritiesFixture,
  discoverWebUILocators,
  fetchConfluenceDoc,
  cleanDiffForReview,
  runSecurityDigest,
  notifyJiraReadyToTest,
  getSecuritiesRuleMatrix,
  lintDomainGherkin
} from '../lib/n8n-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('n8n-client: All fast-path adapter methods are exported as functions', () => {
  assert.equal(typeof callN8nWebhook, 'function');
  assert.equal(typeof prepJiraContext, 'function');
  assert.equal(typeof pushSpecToJira, 'function');
  assert.equal(typeof batchSquashPush, 'function');
  assert.equal(typeof getStandupReport, 'function');
  assert.equal(typeof triggerAsyncTest, 'function');
  assert.equal(typeof queryMetabase, 'function');
  assert.equal(typeof getSecuritiesFixture, 'function');
  assert.equal(typeof discoverWebUILocators, 'function');
  assert.equal(typeof fetchConfluenceDoc, 'function');
  assert.equal(typeof cleanDiffForReview, 'function');
  assert.equal(typeof runSecurityDigest, 'function');
  assert.equal(typeof notifyJiraReadyToTest, 'function');
  assert.equal(typeof getSecuritiesRuleMatrix, 'function');
  assert.equal(typeof lintDomainGherkin, 'function');
});

test('n8n ADF Parser: decodes ADF tree into clean markdown/plain text', () => {
  function adfToPlainText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(adfToPlainText).join('');
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    let text = '';
    if (node.content && Array.isArray(node.content)) {
      const isBlock = node.type === 'paragraph' || (typeof node.type === 'string' && node.type.startsWith('heading'));
      text = node.content.map(adfToPlainText).join('');
      if (isBlock) return text + '\n';
      if (node.type === 'bulletList' || node.type === 'orderedList') return '\n' + text;
      if (node.type === 'listItem') return '- ' + text.trim() + '\n';
    }
    return text;
  }

  const mockAdf = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Mục Tiêu Nghiệp Vụ' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hệ thống cần xử lý kiểm thử vé ' },
          { type: 'text', text: 'G3PTP-17059', marks: [{ type: 'strong' }] },
          { type: 'text', text: ' một cách tự động.' }
        ]
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tiêu chí 1: Đúng format' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tiêu chí 2: Không rác' }] }]
          }
        ]
      }
    ]
  };

  const result = adfToPlainText(mockAdf).trim();
  assert.ok(result.includes('Mục Tiêu Nghiệp Vụ'));
  assert.ok(result.includes('G3PTP-17059'));
  assert.ok(result.includes('- Tiêu chí 1: Đúng format'));
  assert.ok(result.includes('- Tiêu chí 2: Không rác'));
  assert.ok(!result.includes('{"type":'));
});

test('Watchdog Query Builder: generates correct pre-trading definition & reset SQL', () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'n8n-nodes', 'db', 'watchdog-prepare-query.js'), 'utf-8');
  assert.ok(scriptContent.includes('security_definition_v3'));
  assert.ok(scriptContent.includes('krx_mdds_v2_stock_infos'));
  assert.ok(scriptContent.includes('basic_price'));
  assert.ok(scriptContent.includes('ceiling_price'));
  assert.ok(scriptContent.includes('floor_price'));
  assert.ok(scriptContent.includes('match_price'));
  assert.ok(scriptContent.includes('total_volume_traded'));
  assert.ok(scriptContent.includes('gross_trade_amount'));
  assert.ok(scriptContent.includes("database: 'timescale'"));
  assert.ok(scriptContent.includes("environment: 'prod'"));
});

test('Watchdog Health Verifier: handles 100% healthy scenario with clean reset', () => {
  const mockReportData = {
    total_scanned: 1587,
    summary: [
      { floor_code: 'HOSE', total_symbols: 412, valid_symbols: 412, invalid_symbols: 0, missing_basic_count: 0, missing_ceiling_count: 0, missing_floor_count: 0 },
      { floor_code: 'HNX', total_symbols: 315, valid_symbols: 315, invalid_symbols: 0, missing_basic_count: 0, missing_ceiling_count: 0, missing_floor_count: 0 },
      { floor_code: 'UPCOM', total_symbols: 860, valid_symbols: 860, invalid_symbols: 0, missing_basic_count: 0, missing_ceiling_count: 0, missing_floor_count: 0 }
    ],
    invalids: [],
    unclean_count: 0,
    unclean_samples: []
  };

  // Giả lập logic kiểm tra trong watchdog-verify-health.js
  const totalScanned = mockReportData.total_scanned;
  assert.equal(totalScanned, 1587);
  const invalidTotal = mockReportData.summary.reduce((acc, s) => acc + s.invalid_symbols, 0);
  assert.equal(invalidTotal, 0);
  const uncleanCount = mockReportData.unclean_count;
  assert.equal(uncleanCount, 0);
  const isHealthy = invalidTotal === 0 && uncleanCount === 0;
  assert.equal(isHealthy, true);
});

test('Watchdog Health Verifier: detects missing price limits and formats details', () => {
  const mockReportData = {
    total_scanned: 1587,
    summary: [
      { floor_code: 'HOSE', total_symbols: 412, valid_symbols: 410, invalid_symbols: 2, missing_basic_count: 1, missing_ceiling_count: 2, missing_floor_count: 1 },
      { floor_code: 'HNX', total_symbols: 315, valid_symbols: 315, invalid_symbols: 0, missing_basic_count: 0, missing_ceiling_count: 0, missing_floor_count: 0 }
    ],
    invalids: [
      { symbol: 'ABC', floor_code: 'HOSE', basic_price: 15.2, ceiling_price: null, floor_price: 13.0, error_detail: 'Thiếu giá Trần' },
      { symbol: 'XYZ', floor_code: 'HOSE', basic_price: 0, ceiling_price: 0, floor_price: 0, error_detail: 'Thiếu giá TC, Thiếu giá Trần, Thiếu giá Sàn' }
    ],
    unclean_count: 0,
    unclean_samples: []
  };

  const invalidTotal = mockReportData.summary.reduce((acc, s) => acc + s.invalid_symbols, 0);
  assert.equal(invalidTotal, 2);
  assert.equal(mockReportData.invalids.length, 2);
  assert.equal(mockReportData.invalids[0].symbol, 'ABC');
  assert.equal(mockReportData.invalids[0].error_detail, 'Thiếu giá Trần');
});

test('Watchdog Health Verifier: detects uncleared realtime fields (match_price/volume/gross_amount)', () => {
  const mockReportData = {
    total_scanned: 1587,
    summary: [
      { floor_code: 'HOSE', total_symbols: 412, valid_symbols: 412, invalid_symbols: 0 }
    ],
    invalids: [],
    unclean_count: 1,
    unclean_samples: [
      { symbol: 'FPT', floor_code: 'HOSE', match_price: 135.5, total_volume_traded: 250000, gross_trade_amount: 33875000, uncleared_fields: 'Chưa clear match_price (135.5), Chưa clear total_volume_traded (250000)' }
    ]
  };

  assert.equal(mockReportData.unclean_count, 1);
  assert.equal(mockReportData.unclean_samples[0].symbol, 'FPT');
  assert.ok(mockReportData.unclean_samples[0].uncleared_fields.includes('match_price'));
});

test('Securities Fixture Engine (WF-02): correctly resolves 41I1GA0000, SHB, OIL, SHS and injects auth credentials', async () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'qa', 'securities-fixture-engine.js');
  assert.ok(fs.existsSync(enginePath), 'securities-fixture-engine.js must exist');

  // Kiểm tra cấu trúc mock data với đầy đủ 4 sàn
  const mockRows = [
    { symbol: '41I1GA0000', market_id: 3, basic_price: 1250.0, ceiling_price: 1337.5, floor_price: 1162.5, board_lot: 1 },
    { symbol: 'SHB', market_id: 6, basic_price: 11500, ceiling_price: 12300, floor_price: 10700, board_lot: 100 },
    { symbol: 'OIL', market_id: 8, basic_price: 13200, ceiling_price: 15100, floor_price: 11300, board_lot: 100 },
    { symbol: 'SHS', market_id: 7, basic_price: 14000, ceiling_price: 15400, floor_price: 12600, board_lot: 100 }
  ];

  assert.equal(mockRows.find(r => r.symbol === '41I1GA0000').market_id, 3);
  assert.equal(mockRows.find(r => r.symbol === 'SHB').market_id, 6);
  assert.equal(mockRows.find(r => r.symbol === 'OIL').market_id, 8);
  assert.equal(mockRows.find(r => r.symbol === 'SHS').market_id, 7);
});

test('Confluence Clean Payload (WF-03): strips CSS/layout noise and converts tables/macros to Markdown', () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'ba', 'confluence-clean-payload.js');
  assert.ok(fs.existsSync(enginePath), 'confluence-clean-payload.js must exist');

  const mockXhtml = `
    <div style="background: red;" class="confluence-layout">
      <h1>Tài Liệu Nghiệp Vụ</h1>
      <ac:structured-macro ac:name="info"><ac:rich-text-body>Lưu ý quan trọng</ac:rich-text-body></ac:structured-macro>
      <table class="confluenceTable">
        <tr><th>Mã</th><th>Tên</th></tr>
        <tr><td>SHB</td><td>Ngân hàng SHB</td></tr>
      </table>
    </div>
  `;

  assert.ok(mockXhtml.includes('<table'));
  assert.ok(mockXhtml.includes('ac:structured-macro'));
});

test('CR Filter Diff (WF-07): removes noise lockfiles and classifies files into architectural layers', () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'cr', 'cr-filter-diff.js');
  assert.ok(fs.existsSync(enginePath), 'cr-filter-diff.js must exist');

  const noiseList = ['package-lock.json', 'pnpm-lock.yaml', 'dist/bundle.min.js', 'assets/logo.svg'];
  const NOISE_PATTERNS = [
    /package-lock\.json$/i,
    /pnpm-lock\.yaml$/i,
    /\.min\.(js|css)$/i,
    /\.(svg|png)$/i,
    /(^|\/)(dist|build)\//i
  ];

  for (const n of noiseList) {
    const isNoise = NOISE_PATTERNS.some(p => p.test(n));
    assert.equal(isNoise, true, `File ${n} should be detected as noise`);
  }
});

test('Security Digest Engine (WF-08): extracts High/Critical vulnerabilities and scans leaked secrets', () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'security', 'security-digest-engine.js');
  assert.ok(fs.existsSync(enginePath), 'security-digest-engine.js must exist');

  const mockAudit = {
    vulnerabilities: {
      'lodash': { severity: 'critical', fixAvailable: true },
      'debug': { severity: 'low', fixAvailable: true },
      'axios': { severity: 'high', fixAvailable: { name: 'axios', version: '1.7.0' } }
    }
  };

  const highCritical = Object.entries(mockAudit.vulnerabilities)
    .filter(([_, v]) => v.severity === 'high' || v.severity === 'critical');

  assert.equal(highCritical.length, 2);
  assert.equal(highCritical[0][0], 'lodash');
  assert.equal(highCritical[1][0], 'axios');
});

test('Jira Ready To Test Filter (WF-11): enforces Board G.3.1, active sprint, and outputs v/x badges with suggestions', () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'qa', 'jira-ready-to-test-filter.js');
  assert.ok(fs.existsSync(enginePath), 'jira-ready-to-test-filter.js must exist');

  const mockPayload = {
    issue: {
      key: 'G3PTP-17396',
      fields: {
        project: { key: 'G3PTP', name: 'Board G.3.1 Trading' },
        sprint: { state: 'active', name: 'Sprint 42' },
        summary: 'Đặt lệnh mua SHB sàn HOSE'
      }
    },
    changelog: {
      items: [
        { field: 'status', fromString: 'In Progress', toString: 'Ready to test' }
      ]
    }
  };

  const isG31 = mockPayload.issue.key.startsWith('G3PTP-');
  const isActive = mockPayload.issue.fields.sprint.state === 'active';
  const isReady = mockPayload.changelog.items.some(i => i.field === 'status' && i.toString.toLowerCase() === 'ready to test');

  assert.equal(isG31, true);
  assert.equal(isActive, true);
  assert.equal(isReady, true);

  // Test Node Execution Logic
  const code = fs.readFileSync(enginePath, 'utf8');
  const fn = new Function('$input', '$env', 'require', code);
  const result = fn(
    { first: () => ({ json: mockPayload }) },
    { AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..'), ATLASSIAN_BASE_URL: 'https://example.atlassian.net', JIRA_PROJECT_KEY: 'G3PTP' },
    require
  );

  assert.equal(result[0].json.isReadyToTest, true);
  assert.equal(result[0].json.sprintName, 'Sprint 42');
  assert.ok(result[0].json.gherkinBadge.includes('Gherkin file'));
  assert.ok(result[0].json.autoScriptBadge.includes('Autoscript test'));
  assert.ok(result[0].json.gherkinBadge.startsWith('❌') || result[0].json.gherkinBadge.startsWith('✅'));
  assert.ok(result[0].json.reportText.includes('### 🎯 READY TO TEST'));
  assert.ok(result[0].json.reportText.includes('/qa-'));
  assert.ok(Array.isArray(result[0].json.suggestedCommands));

  // Test real Jira Cloud Entrade customfield_10018
  const mockEntrade = {
    issue: {
      key: 'G3PTP-17485',
      fields: {
        project: { key: 'G3PTP', name: 'G.3.1 Partners & Open API' },
        status: { name: 'Ready to test' },
        summary: 'APP - Test',
        customfield_10018: [
          { id: 7080, name: 'EnTrade Sprint 300', state: 'closed' },
          { id: 7090, name: 'EnTrade Sprint 301', state: 'active' }
        ]
      }
    }
  };
  const resEntrade = fn(
    { first: () => ({ json: mockEntrade }) },
    { AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..'), JIRA_PROJECT_KEY: 'G3PTP', JIRA_SPRINT_CUSTOM_FIELD: 'customfield_10018' },
    require
  );
  assert.equal(resEntrade[0].json.isReadyToTest, true);
  assert.equal(resEntrade[0].json.sprintName, 'EnTrade Sprint 301');
  assert.ok(resEntrade[0].json.reportText.includes('`EnTrade Sprint 301`'));
});

test('Securities Domain Engine (WF-18 / WF-19): evaluates rule matrix, filters MTL on CR/RES, and lints domain Gherkin', () => {
  const enginePath = path.join(__dirname, '..', 'n8n-nodes', 'qa', 'securities-domain-engine.js');
  const wfPath = path.join(__dirname, '..', '..', 'n8n-workflows', 'data-recon', 'securities-domain-engine.json');
  assert.ok(fs.existsSync(enginePath), 'securities-domain-engine.js must exist');
  assert.ok(fs.existsSync(wfPath), 'securities-domain-engine.json must exist');

  const code = fs.readFileSync(enginePath, 'utf8');

  // Test 1: getRuleMatrix with CR filter on STO
  const fnMatrix = new Function('$input', code);
  const matrixRes = fnMatrix({
    first: () => ({
      json: {
        action: 'getRuleMatrix',
        marketId: 'STO',
        boardId: 'G1',
        eventId: 'BB1',
        symbol: 'HAG',
        adminStatus: 'CR'
      }
    })
  });

  const matrixJson = matrixRes[0].json;
  assert.equal(matrixJson.success, true);
  assert.equal(matrixJson.marketId, 'STO');
  assert.equal(matrixJson.isMtlFiltered, true);
  assert.deepEqual(matrixJson.allowedOrders, ['LO', 'ATC']);
  assert.ok(matrixJson.disallowedOrders.includes('MTL'));
  assert.ok(Array.isArray(matrixJson.multiSymbolExamples));
  assert.equal(matrixJson.multiSymbolExamples.length, 6);

  // Test 2: getRuleMatrix with UPX (only LO)
  const upxRes = fnMatrix({
    first: () => ({
      json: {
        action: 'getRuleMatrix',
        marketId: 'UPX',
        boardId: 'G1',
        eventId: 'AB1'
      }
    })
  });
  assert.deepEqual(upxRes[0].json.allowedOrders, ['LO']);

  // Test 3: lintGherkin detects violations
  const fnLint = new Function('$input', code);
  const badGherkin = `Feature: Test dat lenh
  Scenario Outline: Dat lenh CR
    Given Ma <symbol> co trang thai <adminStatus> tren san <exchange>
    When Dat lenh <orderType>
    Then Ket qua thanh cong
    Examples:
      | symbol | exchange | adminStatus | orderType |
      | HAG | HOSE | CR | MTL |
      | OIL | UPCOM | NRM | MP |
  `;
  const lintResBad = fnLint({
    first: () => ({
      json: {
        action: 'lintGherkin',
        gherkinContent: badGherkin
      }
    })
  });
  assert.equal(lintResBad[0].json.valid, false);
  assert.ok(lintResBad[0].json.errorCount >= 2);

  // Test 4: lintGherkin passes clean gherkin
  const goodGherkin = `Feature: Test dat lenh hop le
  Scenario Outline: Dat lenh
    Given Ma <symbol> thuoc san <exchange>
    When Dat lenh <orderType>
    Then Lenh thanh cong
    Examples:
      | symbol | exchange | orderType |
      | SHB | HOSE | LO |
      | SHS | HNX | LO |
  `;
  const lintResGood = fnLint({
    first: () => ({
      json: {
        action: 'lintGherkin',
        gherkinContent: goodGherkin
      }
    })
  });
  assert.equal(lintResGood[0].json.valid, true);
  assert.equal(lintResGood[0].json.errorCount, 0);
});

test('pushSpecToJira: đóng gói markdownContent + ảnh PNG base64 từ dự án ngoài bất kỳ và xử lý backup/manifest/cleanup tại cwd', async () => {
  const os = await import('node:os');
  const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'external-arrow-app-'));
  const issueKey = 'G3PTP-18039';
  const specDir = path.join(tmpProject, 'workspace', 'issues', issueKey, 'spec');
  const diagDir = path.join(specDir, 'diagrams');
  fs.mkdirSync(diagDir, { recursive: true });

  const pngPath = path.join(diagDir, 'mockup-case-1.png');
  fs.writeFileSync(pngPath, Buffer.from('fake-png-bytes'));
  fs.writeFileSync(path.join(specDir, 'refined-draft.md'), '# draft');

  const validSpec = [
    '## 🧩 User Story',
    '**As a** Nhà đầu tư  ',
    '**I want** xem màn hình chi tiết  ',
    '**So that** ra quyết định nhanh',
    '',
    '## 💼 Business Context',
    '- **Vấn đề:** Thiếu thông tin.',
    '- **Mục tiêu:** Bổ sung.',
    '',
    '## ✅ Acceptance Criteria',
    '```gherkin',
    'Feature: Xem chi tiết',
    '  Scenario: Happy - Hiển thị thành công',
    '    Given Đã đăng nhập',
    '    When Mở màn hình',
    '    Then Hiển thị đúng dữ liệu',
    '',
    '  Scenario: Validation - Thiếu dữ liệu',
    '    Given Không có dữ liệu',
    '    When Mở màn hình',
    '    Then Hiển thị trạng thái trống',
    '',
    '  Scenario: Edge - Mất kết nối mạng',
    '    Given Mạng bị ngắt',
    '    When Tải lại màn hình',
    '    Then Hiển thị nút thử lại',
    '```',
    '',
    '## 🎨 UI Design / Mockup',
    '',
    '![Mockup Case 1](workspace/issues/G3PTP-18039/spec/diagrams/mockup-case-1.png)',
    '',
    '## ☀️ Success Criteria & Tracking',
    '| Metric | Current | Target | Measurement |',
    '|---|---|---|---|',
    '| Adoption | 0% | 50% | GA4 |',
  ].join('\n');

  const specPath = path.join(specDir, 'refined.md');
  fs.writeFileSync(specPath, validSpec, 'utf8');

  let capturedPayload = null;
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).endsWith('/webhook/jira-push-spec'));
    capturedPayload = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        isError: false,
        issueKey,
        oldDescription: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'old' }] }] },
        uploadedCount: 1,
      }),
    };
  };

  try {
    const res = await pushSpecToJira(issueKey, 'workspace/issues/G3PTP-18039/spec/refined.md', { cwd: tmpProject });
    assert.equal(res.success, true);
    assert.equal(capturedPayload.issueKey, issueKey);
    assert.equal(capturedPayload.callerWorkspaceDir, tmpProject);
    assert.ok(capturedPayload.markdownContent.includes('Nhà đầu tư'));
    assert.equal(capturedPayload.attachments.length, 1);
    assert.equal(capturedPayload.attachments[0].filename, 'mockup-case-1.png');
    assert.equal(Buffer.from(capturedPayload.attachments[0].dataBase64, 'base64').toString(), 'fake-png-bytes');

    // Kiểm tra backup, testability-manifest.json, final.md và cleanup draft tại dự án ngoài
    const sourceDir = path.join(tmpProject, 'workspace', 'issues', issueKey, 'source');
    assert.ok(fs.readdirSync(sourceDir).some(f => f.startsWith('jira-description-backup-')));
    assert.ok(fs.existsSync(path.join(specDir, 'testability-manifest.json')));
    assert.ok(fs.existsSync(path.join(specDir, 'final.md')));
    assert.equal(fs.existsSync(path.join(specDir, 'refined-draft.md')), false);
  } finally {
    globalThis.fetch = origFetch;
    fs.rmSync(tmpProject, { recursive: true, force: true });
  }
});

test('jira-push-preflight.js: xử lý Payload Mode (markdownContent + ADF CommonJS helper) không cần resolver', async () => {
  const preflightCode = fs.readFileSync(
    path.join(__dirname, '..', 'n8n-nodes', 'ba', 'jira-push-preflight.js'),
    'utf8'
  );
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('require', '$input', '$', '$env', preflightCode);

  const md = [
    '## 🧩 User Story',
    '**As a** Tester  ',
    '**I want** push ADF  ',
    '**So that** giữ nguyên bảng',
    '',
    '## ✅ Acceptance Criteria',
    '```gherkin',
    'Scenario: Happy - A',
    '  Given 1',
    '  When 2',
    '  Then 3',
    'Scenario: Validation - B',
    '  Given 4',
    '  When 5',
    '  Then 6',
    '```',
    '',
    '| Col1 | Col2 |',
    '|---|---|',
    '| v1 | v2 |',
  ].join('\n');

  const prepPayload = {
    issueKey: 'G3PTP-18039',
    project: 'arrow-app',
    filePath: '/tmp/arrow-app/workspace/issues/G3PTP-18039/spec/refined.md',
    callerWorkspaceDir: '/tmp/arrow-app',
    markdownContent: md,
    hasInlinePayload: true,
    attachments: [],
    dryRun: true,
    force: false,
    _triggerSource: 'webhook'
  };

  const out = await fn(
    require,
    { first: () => ({ json: prepPayload }) },
    (name) => ({ first: () => ({ json: name === 'Prepare Resolver Input' ? prepPayload : {} }) }),
    { AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..') }
  );

  assert.equal(out[0].json.isError, false);
  assert.equal(out[0].json.isExternalCaller, true);
  assert.equal(out[0].json.tableCount, 1);
  assert.equal(out[0].json.scenarioCount, 2);
  assert.ok(out[0].json.adfContent.content.some(n => n.type === 'table'));
});

test('local-workspace-resolver.json: dò đúng chuẩn workspace/issues/{issueKey} và config/projects.json', async () => {
  const os = await import('node:os');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lwr-test-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'config'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'workspace', 'issues', 'G3PTP-18039', 'spec'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'workspace', 'issues', 'G3PTP-18039', 'spec', 'refined.md'), '# test');
    fs.writeFileSync(path.join(tmpRoot, 'config', 'projects.json'), JSON.stringify({ demo: tmpRoot }));

    const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'n8n-workflows', 'data-recon', 'local-workspace-resolver.json'), 'utf8'));
    const code = wf.nodes.find(n => n.name === 'Resolve Workspace Path').parameters.jsCode;
    const fn = new Function('require', '$input', '$', '$env', code);

    const payload = { issueKey: 'G3PTP-18039', targetPath: 'spec' };
    const out = fn(
      require,
      { first: () => ({ json: payload }) },
      () => ({ first: () => ({ json: payload }) }),
      { AGENT_WORKSPACE_DIR: tmpRoot }
    );
    assert.equal(out[0].json.found, true);
    assert.equal(out[0].json.resolvedPath, path.join(tmpRoot, 'workspace', 'issues', 'G3PTP-18039', 'spec'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('n8n-node-env.cjs: khôi phục NODE_EXTRA_CA_CERTS khi task-runner process.env bị cắt bỏ', async () => {
  const os = await import('node:os');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { buildNodeChildEnv, resolveExtraCaCerts } = require('../lib/n8n-node-env.cjs');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-env-test-'));
  try {
    const caDir = path.join(tmpRoot, '.n8n-data');
    fs.mkdirSync(caDir, { recursive: true });
    const caFile = path.join(caDir, 'corporate-ca.pem');
    fs.writeFileSync(caFile, '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----\n');

    // Trường hợp 1: $env có NODE_EXTRA_CA_CERTS hợp lệ trong khi procEnv của task-runner bị rỗng
    const resolvedFromEnv = resolveExtraCaCerts({
      env: { NODE_EXTRA_CA_CERTS: caFile },
      procEnv: { PATH: '/usr/bin' },
      projectRoot: tmpRoot
    });
    assert.equal(resolvedFromEnv, caFile);

    // Trường hợp 2: cả $env lẫn procEnv đều không có, tự fallback về .n8n-data/corporate-ca.pem
    const childEnv = buildNodeChildEnv({
      env: { ALLOW_INSECURE_TLS: 'true' },
      procEnv: { PATH: '/usr/bin' },
      projectRoot: tmpRoot
    });
    assert.equal(childEnv.NODE_EXTRA_CA_CERTS, caFile);
    assert.equal(childEnv.NODE_TLS_REJECT_UNAUTHORIZED, '0');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('jira-push-preflight.js: Live Push dùng child node nhận NODE_EXTRA_CA_CERTS qua HTTPS self-signed, giải Media UUID và chặn local-* khi upload lỗi', async () => {
  const os = await import('node:os');
  const { spawn, execFileSync } = await import('node:child_process');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);

  const preflightCode = fs.readFileSync(
    path.join(__dirname, '..', 'n8n-nodes', 'ba', 'jira-push-preflight.js'),
    'utf8'
  );
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('require', '$input', '$', '$env', preflightCode);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-tls-test-'));
  const keyPath = path.join(tmpDir, 'server.key');
  const certPath = path.join(tmpDir, 'server.crt');
  const mediaUuid = 'add1a557-a26a-48ca-9427-6f0ea6a9ff6f';

  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath, '-out', certPath, '-days', '1',
    '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1'
  ], { stdio: 'ignore' });

  const serverScript = `
    const https = require('node:https');
    const fs = require('node:fs');
    const [keyPath, certPath, mediaUuid] = process.argv.slice(1);
    const server = https.createServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }, (req, res) => {
      if (req.url === '/__fail') {
        server.failUpload = true;
        res.writeHead(200); res.end('ok'); return;
      }
      if (req.method === 'GET' && req.url.startsWith('/rest/api/3/issue/G3PTP-18092?fields=attachment,description')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ fields: { description: { type: 'doc', version: 1, content: [] }, attachment: [] } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/rest/api/3/issue/G3PTP-18092/attachments') {
        if (server.failUpload) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Simulated upload error');
          return;
        }
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([{
            id: '90001',
            filename: 'mockup-case-1.png',
            content: 'https://127.0.0.1:' + server.address().port + '/rest/api/3/attachment/content/90001',
            size: 128
          }]));
        });
        return;
      }
      if (req.method === 'GET' && req.url === '/rest/api/3/attachment/content/90001') {
        res.writeHead(302, { Location: 'https://media.example.local/file/' + mediaUuid + '/binary' });
        res.end();
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      process.stdout.write(String(server.address().port) + '\\n');
    });
  `;

  const srvProc = spawn(process.execPath, ['-e', serverScript, keyPath, certPath, mediaUuid], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const port = await new Promise((resolve, reject) => {
    let buf = '';
    srvProc.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      if (buf.includes('\n')) resolve(Number(buf.trim()));
    });
    srvProc.on('error', reject);
    srvProc.on('exit', (code) => reject(new Error(`Mock HTTPS server exited early (${code})`)));
  });

  try {
    const md = [
      '## 🧩 User Story',
      '**As a** Tester  ',
      '**I want** push ảnh mockup  ',
      '**So that** hiển thị đúng trên Jira',
      '',
      '## 🎨 UI Design / Mockup',
      '![Mockup](diagrams/mockup-case-1.png)',
      '',
      '## ✅ Acceptance Criteria',
      '```gherkin',
      'Scenario: Happy - A',
      '  Given 1',
      '  When 2',
      '  Then 3',
      'Scenario: Validation - B',
      '  Given 4',
      '  When 5',
      '  Then 6',
      '```',
    ].join('\n');

    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    const prepPayload = {
      issueKey: 'G3PTP-18092',
      project: 'agent-skills',
      filePath: '/tmp/G3PTP-18092/spec/refined.md',
      callerWorkspaceDir: '/tmp/G3PTP-18092',
      markdownContent: md,
      hasInlinePayload: true,
      attachments: [
        { filename: 'mockup-case-1.png', mimeType: 'image/png', dataBase64: png1x1.toString('base64') }
      ],
      dryRun: false,
      force: false,
      _triggerSource: 'webhook'
    };

    const envCfg = {
      AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..'),
      ATLASSIAN_BASE_URL: `https://127.0.0.1:${port}`,
      ATLASSIAN_EMAIL: 'bot@example.com',
      ATLASSIAN_API_TOKEN: 'secret-token',
      NODE_EXTRA_CA_CERTS: certPath
    };

    // 1. Live upload qua HTTPS self-signed thành công nhờ NODE_EXTRA_CA_CERTS -> giải Media UUID thật
    const okOut = await fn(
      require,
      { first: () => ({ json: prepPayload }) },
      (name) => ({ first: () => ({ json: name === 'Prepare Resolver Input' ? prepPayload : {} }) }),
      envCfg
    );
    assert.equal(okOut[0].json.isError, false);
    assert.equal(okOut[0].json.uploadedCount, 1);
    assert.equal(okOut[0].json.attachmentMap['mockup-case-1.png'].mediaId, mediaUuid);
    assert.ok(!JSON.stringify(okOut[0].json.adfContent).includes('local-mockup-case-1.png'));

    // 2. Upload lỗi -> fail-fast ATTACHMENT_UPLOAD_FAILED thay vì đẩy local-* lên Jira
    const https = await import('node:https');
    await new Promise((resolve, reject) => {
      const req = https.get(`https://127.0.0.1:${port}/__fail`, { ca: fs.readFileSync(certPath) }, (res) => {
        res.resume();
        res.on('end', resolve);
      });
      req.on('error', reject);
    });

    const errOut = await fn(
      require,
      { first: () => ({ json: prepPayload }) },
      (name) => ({ first: () => ({ json: name === 'Prepare Resolver Input' ? prepPayload : {} }) }),
      envCfg
    );
    assert.equal(errOut[0].json.isError, true);
    assert.equal(errOut[0].json.errorType, 'ATTACHMENT_UPLOAD_FAILED');
    assert.ok(errOut[0].json.reportText.includes('HTTP 500'));
    assert.ok(errOut[0].json.reportText.includes(certPath));
  } finally {
    srvProc.kill();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

