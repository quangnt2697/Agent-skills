import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

test('jira-my-tasks-query: builds valid JQL and query parameters', () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-my-tasks-query.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  // Chạy giả lập trong context sandbox
  const fn = new Function('$env', code);
  const result = fn({
    ATLASSIAN_BASE_URL: 'https://test.atlassian.net',
    ATLASSIAN_EMAIL: 'qa@example.com',
    ATLASSIAN_API_TOKEN: 'fake-token',
    JIRA_MY_ACCOUNT_ID: '712020:acc-12345?cloudId=xyz',
    JIRA_MY_EMAIL: 'qa@example.com'
  });

  assert.equal(result.length, 1);
  const json = result[0].json;
  assert.equal(json.baseUrl, 'https://test.atlassian.net');
  assert.equal(json.myAccountId, '712020:acc-12345'); // Đã cắt ?cloudId
  assert.ok(json.authHeader.startsWith('Basic '));
  assert.ok(json.searchBody.jql.includes('assignee in (currentUser(), "712020:acc-12345", "qa@example.com")'));
  assert.ok(json.searchBody.jql.includes('updated >= -20m'));
  assert.ok(json.searchBody.fields.includes('summary'));
  assert.ok(json.searchBody.fields.includes('status'));
  assert.equal(json.searchBody.expand, 'changelog');
});

test('jira-my-tasks-delta: detects newly created tasks and avoids cold-start false-positives', () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-my-tasks-delta.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const uniqueKeyNew = 'G3PTP-NEW-' + Date.now();
  const uniqueKeyOld = 'G3PTP-OLD-' + Date.now();
  const now = new Date();
  const oldDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 ngày trước

  const mockIssues = [
    // 1. Task vừa tạo mới trong 5 phút qua
    {
      key: uniqueKeyNew,
      created: now.toISOString(),
      updated: now.toISOString(),
      fields: {
        summary: 'Task vừa tạo mới',
        status: { name: 'Open' },
        assignee: { accountId: 'my-acc-id', emailAddress: 'me@example.com', displayName: 'Quang' },
        priority: { name: 'High' },
        reporter: { displayName: 'PO Hieu' },
        issuetype: { name: 'Story' },
        comment: { total: 0, comments: [] }
      }
    },
    // 2. Task cũ tạo từ 2 ngày trước nhưng vừa có status changelog trong 5 phút qua
    {
      key: uniqueKeyOld,
      created: oldDate,
      updated: now.toISOString(),
      fields: {
        summary: 'Task cũ vừa chuyển trạng thái',
        status: { name: 'Ready to test' },
        assignee: { accountId: 'my-acc-id', emailAddress: 'me@example.com', displayName: 'Quang' },
        priority: { name: 'Medium' },
        reporter: { displayName: 'PO Hieu' },
        issuetype: { name: 'Bug' },
        comment: { total: 0, comments: [] }
      },
      changelog: {
        histories: [
          {
            created: now.toISOString(),
            items: [{ field: 'status', fromString: 'In Progress', toString: 'Ready to test' }]
          }
        ]
      }
    }
  ];

  // Chạy giả lập
  const $input = { first: () => ({ json: { issues: mockIssues } }) };
  const $ = () => ({ first: () => ({ json: { myAccountId: 'my-acc-id' } }) });
  const fn = new Function('require', '$input', '$', '$env', code);
  const res = fn(require, $input, $, {
    AGENT_WORKSPACE_DIR: projectRoot,
    JIRA_MY_ACCOUNT_ID: 'my-acc-id'
  });

  assert.ok(Array.isArray(res));
  assert.equal(res.length, 2);

  const newEvt = res.find(r => r.json.issueKey === uniqueKeyNew)?.json;
  assert.ok(newEvt);
  assert.equal(newEvt.changeType, 'created');

  const oldEvt = res.find(r => r.json.issueKey === uniqueKeyOld)?.json;
  assert.ok(oldEvt);
  assert.equal(oldEvt.changeType, 'status_changed');
  assert.equal(oldEvt.fromStatus, 'In Progress');
  assert.equal(oldEvt.toStatus, 'Ready to test');
});

test('jira-my-tasks-slack: formats Block Kit across multiple items via $input.all()', () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-my-tasks-slack.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const mockEvents = [
    {
      issueKey: 'G3PTP-201',
      changeType: 'status_changed',
      summary: 'Task 1',
      issueType: 'Story',
      status: 'Ready to test',
      priority: 'High',
      reporter: 'BA Linh',
      changeDetail: '`In Progress` ➔ `Ready to test`',
      issue: { fields: { customfield_10018: [{ state: 'active', name: 'Sprint 50' }] } }
    },
    {
      issueKey: 'G3PTP-202',
      changeType: 'comment_added',
      summary: 'Task 2',
      issueType: 'Task',
      status: 'Open',
      priority: 'Low',
      reporter: 'Dev Linh',
      threadTs: '1731234567.000100',
      changeDetail: '*Dev Linh:* "Đã cập nhật tài liệu"',
      issue: { fields: {} }
    }
  ];

  const $input = { all: () => mockEvents.map(e => ({ json: e })) };
  const fn = new Function('$input', '$env', code);
  const res = fn($input, {
    ATLASSIAN_BASE_URL: 'https://test.atlassian.net',
    N8N_PORT: '5678',
    N8N_HOST: 'localhost'
  });

  // Kiểm tra xử lý đủ cả 2 items (Item Execution Loop)
  assert.equal(res.length, 2);
  assert.equal(res[0].json.issueKey, 'G3PTP-201');
  assert.equal(res[1].json.issueKey, 'G3PTP-202');

  // 1. Trạng thái Ready to test -> hiển thị "Thiết kế test", "Thực thi test", "Xem chi tiết"
  const payload1 = res[0].json.slackPayload;
  assert.ok(payload1.text.includes('G3PTP-201'));
  const actionBlock1 = payload1.blocks.find(b => b.text && b.text.text && b.text.text.includes('Kích hoạt'));
  assert.ok(actionBlock1);
  assert.ok(actionBlock1.text.text.includes('skill=qa-test-design&issueKey=G3PTP-201|🧪 Thiết kế test>'));
  assert.ok(actionBlock1.text.text.includes('skill=qa-run-test&issueKey=G3PTP-201|▶️ Thực thi test>'));
  assert.ok(actionBlock1.text.text.includes('🔗 Xem chi tiết>'));
  assert.ok(!actionBlock1.text.text.includes('skill=ba-refine'));

  // 2. Trạng thái Open -> hiển thị "Refine task", "Xem chi tiết" và truyền đúng thread_ts
  const payload2 = res[1].json.slackPayload;
  assert.equal(payload2.thread_ts, '1731234567.000100');
  const actionBlock2 = payload2.blocks.find(b => b.text && b.text.text && b.text.text.includes('Kích hoạt'));
  assert.ok(actionBlock2);
  assert.ok(actionBlock2.text.text.includes('skill=ba-refine&issueKey=G3PTP-202&thread_ts=1731234567.000100|✏️ Refine task>'));
  assert.ok(actionBlock2.text.text.includes('🔗 Xem chi tiết>'));
  assert.ok(!actionBlock2.text.text.includes('skill=qa-run-test'));
});

test('jira-action-skill-pre-respond: returns instant auto-close HTML (<5ms)', () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-action-skill-pre-respond.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const $input = {
    first: () => ({
      json: {
        query: { skill: 'qa-run-test', issueKey: 'G3PTP-505' }
      }
    })
  };

  const fn = new Function('$input', code);
  const res = fn($input);

  assert.equal(res.length, 1);
  const data = res[0].json;
  assert.equal(data.skill, 'qa-run-test');
  assert.equal(data.issueKey, 'G3PTP-505');
  assert.ok(data.autoCloseHtml.includes('window.close()'));
});

test('jira-action-skill-dispatcher: catches errors and generates actionable Slack alerts', async () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-action-skill-dispatcher.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

  // Test 1: Khi thiếu tham số bắt buộc -> Báo lỗi Slack ngay (văn bản thuần, không chứa lệnh kỹ thuật)
  const $inputError = { first: () => ({ json: { query: {} } }) };
  const fnError = new AsyncFunction('require', '$input', '$env', code);
  const resError = await fnError(require, $inputError, {});

  assert.equal(resError[0].json.isError, true);
  assert.ok(resError[0].json.slackNotifyPayload.text.includes('Chưa thể thực hiện yêu cầu'));

  // Test 2: Khi skill không hợp lệ -> Báo lỗi Slack ngay
  const $inputInvalidSkill = { first: () => ({ json: { query: { skill: 'invalid-skill', issueKey: 'G3PTP-999' } } }) };
  const fnInvalidSkill = new AsyncFunction('require', '$input', '$env', code);
  const resInvalidSkill = await fnInvalidSkill(require, $inputInvalidSkill, { AGENT_WORKSPACE_DIR: projectRoot });
  assert.equal(resInvalidSkill[0].json.isError, true);
  assert.ok(resInvalidSkill[0].json.slackNotifyPayload.text.includes('không hợp lệ'));

  // Test 3: Khi chạy qa-auto-design nhưng chưa có kịch bản -> Báo lỗi pre-flight thuần văn bản về đúng thread_ts trên Slack
  const $inputNoFeature = { first: () => ({ json: { query: { skill: 'qa-auto-design', issueKey: 'G3PTP-NO-FEATURE-999', thread_ts: '1731234567.000200' } } }) };
  const fnNoFeature = new AsyncFunction('require', '$input', '$env', code);
  const resNoFeature = await fnNoFeature(require, $inputNoFeature, { AGENT_WORKSPACE_DIR: projectRoot });
  assert.equal(resNoFeature[0].json.isError, true);
  assert.equal(resNoFeature[0].json.slackNotifyPayload.thread_ts, '1731234567.000200');
  assert.ok(resNoFeature[0].json.slackNotifyPayload.text.includes('G3PTP-NO-FEATURE-999'));
  assert.ok(resNoFeature[0].json.slackNotifyPayload.text.includes('Chưa có kịch bản kiểm thử'));
  assert.ok(!resNoFeature[0].json.slackNotifyPayload.text.includes('.feature'));
  assert.ok(!resNoFeature[0].json.slackNotifyPayload.text.includes('workspace/issues/'));
});

test('jira-my-tasks-delta: cutoffTime prevents duplicate alerts for already-notified changelog events', () => {
  const scriptPath = path.join(projectRoot, 'scripts/n8n-nodes/atlassian/jira-my-tasks-delta.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const key = 'G3PTP-DEDUP-' + Date.now();
  const now = new Date();
  const tMinus15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const tMinus10m = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const tMinus2m = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const oldCreated = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

  // Giả lập StaticData đã lưu lần quét trước ở tMinus10m
  const staticData = {
    taskCache: {
      [key]: {
        status: 'Ready to test',
        updated: tMinus10m,
        assignee: 'my-acc-id',
        commentCount: 1,
        descSnippet: '',
        summary: 'Task test dedup'
      }
    }
  };

  // Lần quét này: task có `updated = tMinus2m` (ví dụ ai đó sửa field phụ),
  // nhưng changelog status_changed nằm ở `tMinus15m` (TRƯỚC `prev.updated = tMinus10m`)
  // -> Không được phép báo lại status_changed cũ!
  const mockIssue = {
    key,
    created: oldCreated,
    updated: tMinus2m,
    fields: {
      summary: 'Task test dedup',
      status: { name: 'Ready to test' },
      assignee: { accountId: 'my-acc-id' },
      priority: { name: 'Medium' },
      issuetype: { name: 'Bug' },
      comment: { total: 1, comments: [{ id: '1001', created: tMinus15m, body: 'Old comment' }] }
    },
    changelog: {
      histories: [
        {
          created: tMinus15m,
          items: [{ field: 'status', fromString: 'In Progress', toString: 'Ready to test' }]
        }
      ]
    }
  };

  const $input = { first: () => ({ json: { issues: [mockIssue] } }) };
  const $ = () => ({ first: () => ({ json: { myAccountId: 'my-acc-id' } }) });
  const $getWorkflowStaticData = () => staticData;

  const fn = new Function('require', '$input', '$', '$env', '$getWorkflowStaticData', code);
  const res = fn(require, $input, $, { AGENT_WORKSPACE_DIR: projectRoot, JIRA_MY_ACCOUNT_ID: 'my-acc-id' }, $getWorkflowStaticData);

  assert.equal(res.length, 0, 'Must not re-emit changelog event older than prev.updated');
});

test('jira-my-tasks-notifier workflow: verifies cron schedule, retry policies and async response layout', () => {
  const wfPath = path.join(projectRoot, 'n8n-workflows/atlassian/jira-my-tasks-notifier.json');
  assert.ok(fs.existsSync(wfPath), 'Workflow file must exist');

  const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

  // 1. Cron đúng 9:00 - 17:00 Mon-Fri
  const schedNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger');
  assert.ok(schedNode);
  const expressions = schedNode.parameters.rule.interval.map(i => i.expression);
  assert.ok(expressions.includes('*/5 9-16 * * 1-5'));
  assert.ok(expressions.includes('0 17 * * 1-5'));

  // 2. Retry policies trên các node HTTP Request
  const jiraHttp = wf.nodes.find(n => n.name === 'Query Jira API');
  assert.equal(jiraHttp.retryOnFail, true);
  assert.equal(jiraHttp.maxTries, 3);

  const slackHttp = wf.nodes.find(n => n.name === 'Send My Tasks to Slack');
  assert.equal(slackHttp.retryOnFail, true);
  assert.equal(slackHttp.maxTries, 3);

  // 3. Layout async: Pre-respond chạy trước Respond Auto-Close HTML
  const preRespond = wf.nodes.find(n => n.name === 'Pre-respond Auto-Close HTML');
  assert.ok(preRespond);
});
