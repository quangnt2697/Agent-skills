import test from 'node:test';
import assert from 'node:assert/strict';
import { toSlackMrkdwn, markdownToSlackBlocks, sendSlackMessage, buildJiraIssueBlocks } from '../lib/slack-client.js';

test('toSlackMrkdwn: converts links, headers, and bold formatting', () => {
  const md = '### Tiêu đề\nĐây là **chữ đậm** và [liên kết](https://example.com)';
  const expected = '*Tiêu đề*\nĐây là *chữ đậm* và <https://example.com|liên kết>';
  assert.equal(toSlackMrkdwn(md), expected);
});

test('toSlackMrkdwn & markdownToSlackBlocks: converts markdown tables into monospace and native Slack table blocks with clickable links', () => {
  const md = [
    '#### ⚖️ Phân Bổ Công Việc',
    '| Thành viên | Role | SP | Tải |',
    '| :--- | :---: | :---: | :--- |',
    '| **Nguyễn Văn Tuyền** | `Mobile` | **23** | 🟢 Cân bằng |',
    '',
    '#### 🚨 Cảnh Báo Treo (> 4 ngày)',
    '| Ticket | Tiêu đề | Thành viên | Treo | Mức độ |',
    '| :--- | :--- | :--- | :---: | :--- |',
    '| [G3PTP-17004](https://entrade.atlassian.net/browse/G3PTP-17004) | Full Jira Task Title | **Phạm Thị Thảo Linh** | **69 ngày** | 🔴 Nghiêm trọng |'
  ].join('\n');
  const out = toSlackMrkdwn(md);
  assert.ok(out.includes('```\n'));
  assert.ok(out.includes('Thành viên       │ Role   │ SP │ Tải'));

  const blocks = markdownToSlackBlocks(md);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'section');
  assert.equal(blocks[1].type, 'table');
  assert.equal(blocks[1].rows[1][0].elements[0].elements[0].type, 'link');
  assert.equal(blocks[1].rows[1][0].elements[0].elements[0].url, 'https://entrade.atlassian.net/browse/G3PTP-17004');
  assert.equal(blocks[1].rows[1][0].elements[0].elements[0].text, 'G3PTP-17004');
});

test('toSlackMrkdwn: handles empty and non-string inputs safely', () => {
  assert.equal(toSlackMrkdwn(''), '');
  assert.equal(toSlackMrkdwn(null), '');
  assert.equal(toSlackMrkdwn(undefined), '');
});

test('buildJiraIssueBlocks: dynamic buttons based on status', () => {
  // 1. Open / To Do -> BA/PO buttons
  const openBlocks = buildJiraIssueBlocks({ issueKey: 'TEST-1', summary: 'Task', status: 'Open' });
  const openActions = openBlocks.find(b => b.type === 'actions');
  assert.ok(openActions.elements.some(e => e.text.text.includes('Refine Spec')));
  assert.ok(openActions.elements.some(e => e.text.text.includes('Import Spec')));

  // 2. In Progress -> QA Design buttons
  const progBlocks = buildJiraIssueBlocks({ issueKey: 'TEST-2', summary: 'Task', status: 'In Progress' });
  const progActions = progBlocks.find(b => b.type === 'actions');
  assert.ok(progActions.elements.some(e => e.text.text.includes('Auto BA-QA')));
  assert.ok(progActions.elements.some(e => e.text.text.includes('Design Test')));

  // 3. Ready to Test -> QA Run Pytest buttons
  const testBlocks = buildJiraIssueBlocks({ issueKey: 'TEST-3', summary: 'Task', status: 'Ready to Test' });
  const testActions = testBlocks.find(b => b.type === 'actions');
  assert.ok(testActions.elements.some(e => e.text.text.includes('Run Pytest')));
});

test('sendSlackMessage: skips when no webhook or token is provided', async () => {
  const prevWebhook = process.env.SLACK_WEBHOOK_URL;
  const prevToken = process.env.SLACK_BOT_TOKEN;
  try {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.SLACK_BOT_TOKEN;
    const res = await sendSlackMessage({ text: 'test' });
    assert.equal(res.ok, false);
    assert.equal(res.skipped, true);
  } finally {
    if (prevWebhook) process.env.SLACK_WEBHOOK_URL = prevWebhook;
    if (prevToken) process.env.SLACK_BOT_TOKEN = prevToken;
  }
});

