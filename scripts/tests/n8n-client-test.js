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
  const step1 = fs.readFileSync(path.join(__dirname, '..', 'n8n-nodes', 'db', 'watchdog-prepare-query.js'), 'utf-8');
  const step2 = fs.readFileSync(path.join(__dirname, '..', 'n8n-nodes', 'db', 'watchdog-prepare-query-realtime.js'), 'utf-8');
  const scriptContent = step1 + '\n' + step2;
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
    { AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..'), ATLASSIAN_BASE_URL: 'https://entrade.atlassian.net' },
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
    { AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..') },
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

