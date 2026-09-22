import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isN8nAvailable,
  prepJiraContext,
  batchSquashPush,
  getStandupReport,
  triggerAsyncTest
} from './lib/n8n-client.js';

test('n8n-client: isN8nAvailable returns boolean', async () => {
  const available = await isN8nAvailable();
  assert.equal(typeof available, 'boolean');
});

test('n8n-client: All fast-path adapter methods are exported as functions', () => {
  assert.equal(typeof prepJiraContext, 'function');
  assert.equal(typeof batchSquashPush, 'function');
  assert.equal(typeof getStandupReport, 'function');
  assert.equal(typeof triggerAsyncTest, 'function');
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

test('Mattermost Router Command Parser: handles various command syntaxes', () => {
  function parseCommand(text) {
    const clean = (text || '').trim();
    if (!clean) return { intent: 'help', params: { project: '', skill: '', issueKey: '' } };

    const issueKeyMatch = clean.match(/\b([A-Za-z0-9]+-[0-9]+)\b/i);
    const issueKey = issueKeyMatch ? issueKeyMatch[1].toUpperCase() : '';

    let remainder = clean;
    if (issueKeyMatch) {
      remainder = remainder.replace(issueKeyMatch[0], ' ').trim();
    }

    const tokens = remainder.split(/\s+/).filter(Boolean);

    const skillIntentMap = {
      'run-test': 'run-test',
      'qa-run-test': 'run-test',
      'test': 'run-test',
      'standup': 'standup',
      'recon': 'recon',
      'jira': 'jira',
      'sync': 'sync',
      'squash': 'squash',
      'help': 'help'
    };

    let detectedIntent = null;
    let detectedSkill = '';
    let project = '';

    if (tokens.length === 1) {
      const t0 = tokens[0].toLowerCase();
      if (skillIntentMap[t0]) {
        detectedIntent = skillIntentMap[t0];
        detectedSkill = tokens[0];
      } else {
        project = tokens[0];
      }
    } else if (tokens.length >= 2) {
      const t0 = tokens[0].toLowerCase();
      const t1 = tokens[1].toLowerCase();

      if (skillIntentMap[t1]) {
        project = tokens[0];
        detectedSkill = tokens[1];
        detectedIntent = skillIntentMap[t1];
      } else if (skillIntentMap[t0]) {
        detectedSkill = tokens[0];
        detectedIntent = skillIntentMap[t0];
        project = tokens[1];
      }
    }

    if (!detectedIntent) {
      const lower = clean.toLowerCase();
      if (lower.includes('test')) detectedIntent = 'run-test';
      else if (issueKey) detectedIntent = 'jira';
      else if (lower.includes('standup')) detectedIntent = 'standup';
      else if (lower.includes('recon')) detectedIntent = 'recon';
      else if (lower.includes('sync')) detectedIntent = 'sync';
      else if (lower.includes('squash')) detectedIntent = 'squash';
      else detectedIntent = 'help';
    }

    return {
      intent: detectedIntent,
      params: { issueKey, project, skill: detectedSkill }
    };
  }

  // Case 1: Simple run-test with issueKey
  const r1 = parseCommand('run-test G3PTP-17059');
  assert.equal(r1.intent, 'run-test');
  assert.equal(r1.params.issueKey, 'G3PTP-17059');

  // Case 2: Project + skill + issueKey
  const r2 = parseCommand('my-project run-test G3PTP-17059');
  assert.equal(r2.intent, 'run-test');
  assert.equal(r2.params.project, 'my-project');
  assert.equal(r2.params.issueKey, 'G3PTP-17059');

  // Case 3: Jira command
  const r3 = parseCommand('jira G3PTP-17396');
  assert.equal(r3.intent, 'jira');
  assert.equal(r3.params.issueKey, 'G3PTP-17396');

  // Case 4: Standup
  const r4 = parseCommand('standup');
  assert.equal(r4.intent, 'standup');

  // Case 5: Empty -> Help
  const r5 = parseCommand('');
  assert.equal(r5.intent, 'help');
});

test('Mattermost Router ACK Message Builder: constructs appropriate notifications', () => {
  function buildAckMessage(intent, params, rawText, user) {
    if (intent === 'help') return '';
    const intentDescriptions = {
      'run-test': `chạy kiểm thử tự động (Pytest) cho ${params?.project ? ('`' + params.project + '` / ') : ''}ticket **${params?.issueKey || 'được yêu cầu'}**`,
      'standup': 'tổng hợp báo cáo **Daily Standup Sprint** và phân tích impediments (>3 ngày)',
      'recon': 'đối chiếu dữ liệu thị trường **KRX MDDS TimescaleDB** (Ticks v3)',
      'jira': `tra cứu và làm sạch thông tin vé Jira **${params?.issueKey || ''}**`,
      'sync': `đồng bộ mã nguồn mới nhất cho ${params?.project ? ('repo `' + params.project + '`') : 'toàn bộ group microservices'}`,
      'squash': 'đẩy danh sách test cases lên **Squash TM**'
    };

    const actionText = intentDescriptions[intent] || 'thực thi tác vụ';
    const userTag = user ? `@${user}` : 'bạn';
    const cleanCmd = (rawText || '').trim();

    return `⏳ **[Agent System]** Đã tiếp nhận lệnh \`/agent ${cleanCmd}\` từ ${userTag}.\n> ⚙️ Hệ thống đang tiến hành **${actionText}**. Quá trình có thể mất từ vài giây đến một phút tùy độ lớn tác vụ, kết quả chi tiết sẽ được gửi tại đây ngay khi hoàn tất. Vui lòng an tâm đợi!`;
  }

  // Case 1: Run test ACK
  const ackRunTest = buildAckMessage('run-test', { issueKey: 'G3PTP-17059', project: 'my-project' }, 'my-project run-test G3PTP-17059', 'quangnt');
  assert.ok(ackRunTest.includes('@quangnt'));
  assert.ok(ackRunTest.includes('G3PTP-17059'));
  assert.ok(ackRunTest.includes('chạy kiểm thử tự động (Pytest)'));
  assert.ok(ackRunTest.includes('⏳ **[Agent System]**'));

  // Case 2: Standup ACK
  const ackStandup = buildAckMessage('standup', {}, 'standup', 'lannt');
  assert.ok(ackStandup.includes('@lannt'));
  assert.ok(ackStandup.includes('Daily Standup Sprint'));

  // Case 3: Help should return empty (no ACK needed)
  const ackHelp = buildAckMessage('help', {}, 'help', 'quangnt');
  assert.equal(ackHelp, '');
});
