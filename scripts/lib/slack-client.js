/**
 * Slack Formatter & API Helper (`scripts/lib/slack-client.js`)
 *
 * Tiện ích hỗ trợ:
 * - Chuyển đổi Markdown chuẩn sang Slack mrkdwn (links, bold, code blocks)
 * - Gửi tin nhắn và Block Kit blocks lên kênh Slack qua Webhook URL hoặc Web API
 * - Tương thích với SLACK_WEBHOOK_URL và SLACK_BOT_TOKEN
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

/**
 * Chuyển đổi bảng Markdown (| col1 | col2 |) sang bảng Monospace căn cột thẳng hàng trong khối ```
 * @param {string} text
 * @returns {string}
 */
export function convertMarkdownTables(text) {
  if (!text || typeof text !== 'string') return '';

  const lines = text.split('\n');
  const out = [];
  let tableLines = [];

  const cleanCell = (raw) =>
    String(raw || '')
      .trim()
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
      .normalize('NFC');

  const visualLen = (str) => [...String(str || '')].length;

  const isSeparatorRow = (cells) =>
    cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));

  const getAlignments = (cells) =>
    cells.map((c) => {
      const t = c.trim();
      if (t.startsWith(':') && t.endsWith(':')) return 'center';
      if (t.endsWith(':')) return 'right';
      return 'left';
    });

  const padCell = (str, width, align) => {
    const len = visualLen(str);
    const diff = Math.max(0, width - len);
    if (align === 'right') return ' '.repeat(diff) + str;
    if (align === 'center') {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    }
    return str + ' '.repeat(diff);
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    if (tableLines.length < 2) {
      out.push(...tableLines);
      tableLines = [];
      return;
    }

    const parsedRows = tableLines.map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cleanCell)
    );

    let alignments = [];
    const dataRows = [];

    for (let i = 0; i < parsedRows.length; i++) {
      if (i === 1 && isSeparatorRow(parsedRows[i])) {
        alignments = getAlignments(parsedRows[i]);
      } else {
        dataRows.push(parsedRows[i]);
      }
    }

    const colCount = Math.max(...dataRows.map((r) => r.length));
    const colWidths = new Array(colCount).fill(0);

    for (const row of dataRows) {
      for (let c = 0; c < colCount; c++) {
        const val = row[c] || '';
        colWidths[c] = Math.max(colWidths[c], visualLen(val));
      }
    }

    const rendered = dataRows.map((row, rIdx) => {
      const cells = [];
      for (let c = 0; c < colCount; c++) {
        const val = row[c] || '';
        // Dòng tiêu đề hoặc cột cuối luôn căn trái để gọn đẹp
        const align = rIdx === 0 || c === colCount - 1 ? 'left' : (alignments[c] || 'left');
        // Không cần pad khoảng trắng dư ở cột cuối cùng
        const padded = c === colCount - 1 ? val : padCell(val, colWidths[c], align);
        cells.push(padded);
      }
      return cells.join(' │ ');
    });

    if (rendered.length > 1) {
      const sepParts = colWidths.map((w, c) => '─'.repeat(c === colCount - 1 ? Math.min(w, 12) : w));
      rendered.splice(1, 0, sepParts.join('─┼─'));
    }

    out.push('```\n' + rendered.join('\n') + '\n```');
    tableLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      tableLines.push(line);
    } else {
      flushTable();
      out.push(line);
    }
  }
  flushTable();

  return out.join('\n');
}

/**
 * Chuyển đổi Markdown thông thường sang cú pháp Slack mrkdwn
 * @param {string} text
 * @returns {string}
 */
export function toSlackMrkdwn(text) {
  if (!text || typeof text !== 'string') return '';

  // 1. Chuyển bảng Markdown sang khối monospace code block trước
  let res = convertMarkdownTables(text);

  // 2. Convert standard markdown links [text](url) -> <url|text>
  res = res.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>');

  // 3. Convert header ### / ## / # to *bold header*
  res = res.replace(/^#{1,4}\s+(.+)$/gm, '*$1*');

  // 4. Convert bold **text** -> *text*
  res = res.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  return res;
}

/**
 * Chuyển một ô Markdown thành cell `rich_text` chuẩn của Slack Block Kit `table`
 * @param {string} rawCell
 * @param {boolean} isHeader
 * @returns {object}
 */
function parseMarkdownCellToSlackTableCell(rawCell, isHeader = false) {
  const raw = String(rawCell || '').trim().normalize('NFC');

  // Kiểm tra cú pháp link [label](url)
  const linkMatch = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (linkMatch) {
    return {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'link',
              url: linkMatch[2],
              text: linkMatch[1],
              style: { bold: true }
            }
          ]
        }
      ]
    };
  }

  const isBold = isHeader || (/^\*\*([^*]+)\*\*$/.test(raw));
  const isCode = /^`([^`]+)`$/.test(raw);
  const cleanText = raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1') || ' ';

  const style = {};
  if (isBold) style.bold = true;
  if (isCode) style.code = true;

  return {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: cleanText,
            ...(Object.keys(style).length > 0 ? { style } : {})
          }
        ]
      }
    ]
  };
}

/**
 * Chuyển đổi văn bản Markdown có chứa bảng (đặc biệt bảng có link như Cảnh Báo Treo)
 * thành danh sách Slack Block Kit blocks (kết hợp `section` mrkdwn và native `table` block).
 * @param {string} text
 * @returns {Array}
 */
export function markdownToSlackBlocks(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const blocks = [];
  let textLines = [];
  let tableLines = [];

  const isSeparatorRow = (cells) =>
    cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));

  const getAlignments = (cells) =>
    cells.map((c) => {
      const t = c.trim();
      if (t.startsWith(':') && t.endsWith(':')) return 'center';
      if (t.endsWith(':')) return 'right';
      return 'left';
    });

  const flushText = () => {
    const joined = textLines.join('\n').trim();
    textLines = [];
    if (!joined) return;
    const mrkdwn = toSlackMrkdwn(joined);
    if (mrkdwn) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: mrkdwn.slice(0, 3000)
        }
      });
    }
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    const rawTable = tableLines.join('\n');
    const hasLinks = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.test(rawTable);

    // Nếu bảng không chứa link (VD: Phân Bổ Công Việc), giữ trong textLines để render khối ``` Monospace gọn đẹp
    if (!hasLinks || tableLines.length < 2) {
      textLines.push(...tableLines);
      tableLines = [];
      return;
    }

    // Nếu bảng có chứa link (VD: Cảnh Báo Treo), flush phần text phía trước rồi tạo native Slack `table` block
    flushText();

    const parsedRows = tableLines.map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );

    let alignments = [];
    const dataRows = [];
    for (let i = 0; i < parsedRows.length; i++) {
      if (i === 1 && isSeparatorRow(parsedRows[i])) {
        alignments = getAlignments(parsedRows[i]);
      } else {
        dataRows.push(parsedRows[i]);
      }
    }

    const colCount = Math.max(...dataRows.map((r) => r.length));
    const column_settings = [];
    for (let c = 0; c < colCount; c++) {
      column_settings.push({
        align: alignments[c] || 'left',
        is_wrapped: true
      });
    }

    const rows = dataRows.slice(0, 95).map((row, rIdx) => {
      const cells = [];
      for (let c = 0; c < colCount; c++) {
        cells.push(parseMarkdownCellToSlackTableCell(row[c] || '', rIdx === 0));
      }
      return cells;
    });

    blocks.push({
      type: 'table',
      column_settings,
      rows
    });

    tableLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      tableLines.push(line);
    } else {
      flushTable();
      textLines.push(line);
    }
  }
  flushTable();
  flushText();

  return blocks;
}

/**
 * Gửi tin nhắn lên Slack (hỗ trợ thread_ts)
 * @param {object} options
 * @param {string} options.text Nội dung tin nhắn
 * @param {Array} [options.blocks] Block Kit blocks (tùy chọn)
 * @param {string} [options.channel] Channel ID (khi dùng bot token)
 * @param {string} [options.threadTs] Timestamp tin nhắn cha để reply vào Thread
 * @param {string} [options.webhookUrl] Override webhook URL
 * @returns {Promise<object>}
 */
export async function sendSlackMessage({ text, blocks, channel, webhookUrl, threadTs } = {}) {
  const targetWebhook = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  const token = process.env.SLACK_BOT_TOKEN;
  const targetChannel = channel || process.env.SLACK_REPORT_CHANNEL_NAME || process.env.SLACK_REPORT_CHANNEL_ID;

  const formattedText = toSlackMrkdwn(text || '');
  const resolvedBlocks =
    blocks && blocks.length > 0
      ? blocks
      : text && /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.test(text) && text.includes('|')
        ? markdownToSlackBlocks(text)
        : undefined;

  // 1. Ưu tiên Webhook URL nếu được cấu hình
  if (targetWebhook && targetWebhook.startsWith('http')) {
    const payload = {
      text: formattedText,
      ...(resolvedBlocks && resolvedBlocks.length > 0 ? { blocks: resolvedBlocks } : {}),
      ...(threadTs ? { thread_ts: threadTs } : {})
    };

    const res = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Slack Webhook HTTP ${res.status}: ${errText}`);
    }

    return { ok: true, status: res.status, mode: 'webhook', thread_ts: threadTs };
  }

  // 2. Fallback sang Slack Web API nếu có SLACK_BOT_TOKEN
  if (token && token.startsWith('xoxb-')) {
    const payload = {
      channel: targetChannel,
      text: formattedText,
      ...(blocks && blocks.length > 0 ? { blocks } : {}),
      ...(threadTs ? { thread_ts: threadTs } : {})
    };

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(`Slack Web API error: ${data.error || res.statusText}`);
    }
    return { ok: true, data, mode: 'web_api', thread_ts: threadTs };
  }

  return { ok: false, skipped: true, reason: 'Chưa cấu hình SLACK_WEBHOOK_URL hoặc SLACK_BOT_TOKEN hợp lệ trong .env' };
}

/**
 * Xây dựng Block Kit động cho một Jira Issue tùy theo Status của task
 * @param {object} options
 * @param {string} options.issueKey Mã ticket (VD: G3PTP-17917)
 * @param {string} options.summary Tiêu đề ticket
 * @param {string} options.status Trạng thái Jira (Open, In Progress, Ready to Test, Done...)
 * @param {string} [options.assignee] Người phụ trách
 * @param {number|string} [options.sp] Story Points
 * @param {string} [options.type] Loại ticket (Story, Task, Bug...)
 * @param {string} [options.priority] Mức độ ưu tiên (High, Medium, Low...)
 * @param {boolean} [options.isThreadReply] Có phải tin nhắn reply vào thread hay không
 * @returns {Array} Mảng Slack Block Kit blocks
 */
export function buildJiraIssueBlocks({ issueKey, summary, status, assignee, sp, type = 'Story', priority = 'Medium', isThreadReply = false } = {}) {
  const normStatus = String(status || '').trim().toLowerCase();
  const baseUrl = (process.env.ATLASSIAN_BASE_URL || 'https://entrade.atlassian.net').replace(/\/+$/, '');
  const jiraUrl = `${baseUrl}/browse/${issueKey}`;
  
  let buttons = [];

  // 1. Nhóm Status: Sẵn sàng Kiểm thử / Đang test (Ready to Test, Testing, In QA)
  if (normStatus.includes('ready to test') || normStatus.includes('ready for test') || normStatus.includes('testing') || normStatus.includes('in qa') || normStatus.includes('kiểm thử')) {
    buttons = [
      { type: 'button', text: { type: 'plain_text', text: '▶️ Run Pytest' }, style: 'primary', value: `run_${issueKey}` },
      { type: 'button', text: { type: 'plain_text', text: '🔄 Reverse Spec' }, value: `code2spec_${issueKey}` },
      { type: 'button', text: { type: 'plain_text', text: '📤 Push Squash' }, value: `squash_${issueKey}` }
    ];
  } 
  // 2. Nhóm Status: Đang phát triển / Lập trình / Code Review (In Progress, Ready for Dev, Coding...)
  else if (normStatus.includes('ready for dev') || normStatus.includes('ready to dev') || normStatus.includes('in progress') || normStatus.includes('coding') || normStatus.includes('doing') || normStatus.includes('code review') || normStatus.includes('merge')) {
    buttons = [
      { type: 'button', text: { type: 'plain_text', text: '🚀 Auto BA-QA' }, style: 'primary', value: `auto_${issueKey}` },
      { type: 'button', text: { type: 'plain_text', text: '📐 Design Test' }, value: `design_${issueKey}` },
      { type: 'button', text: { type: 'plain_text', text: '📤 Push Squash' }, value: `squash_${issueKey}` }
    ];
  } 
  // 3. Nhóm Status: Hoàn thành (Done, Closed, Resolved, Released)
  else if (normStatus.includes('done') || normStatus.includes('closed') || normStatus.includes('resolved') || normStatus.includes('release')) {
    buttons = [
      { type: 'button', text: { type: 'plain_text', text: '▶️ Chạy Regression Test' }, style: 'primary', value: `regression_${issueKey}` }
    ];
  } 
  // 4. Nhóm Status Mặc định: Khởi tạo / Phân tích (Open, To Do, Backlog, In Analysis)
  else {
    buttons = [
      { type: 'button', text: { type: 'plain_text', text: '🧠 Refine Spec' }, style: 'primary', value: `refine_${issueKey}` },
      { type: 'button', text: { type: 'plain_text', text: '📋 Import Spec' }, value: `spec_${issueKey}` }
    ];
  }

  // Nếu là reply trong thread của tin nhắn Jira: giao diện tinh gọn, tập trung vào Action Buttons
  if (isThreadReply) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚡ *Agent Skills Hub:* Nhận diện ticket <${jiraUrl}|*${issueKey}*> — Trạng thái: \`${status || 'Open'}\`\nChọn tác vụ để thực thi:`
        }
      },
      {
        type: 'actions',
        elements: buttons
      }
    ];
  }

  // Định dạng chuẩn Jira Atlassian
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${jiraUrl}|*${issueKey} ${summary || 'Không có tiêu đề'}*>\n*Status:* \`${status || 'Open'}\`  ᐧ  *Type:* \`${type}\`  ᐧ  *Assignee:* \`${assignee || 'Chưa phân bổ'}\`  ᐧ  *Priority:* \`${priority}\`${sp !== undefined ? `  ᐧ  *SP:* \`${sp}\`` : ''}`
      }
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: buttons
    }
  ];
}

/**
 * Gửi card Jira Ticket kèm Action Buttons động tùy theo Status (hỗ trợ reply vào thread_ts)
 */
export async function sendJiraStatusCard({ issueKey, summary, status, assignee, sp, type, priority, threadTs, webhookUrl } = {}) {
  const blocks = buildJiraIssueBlocks({
    issueKey,
    summary,
    status,
    assignee,
    sp,
    type,
    priority,
    isThreadReply: Boolean(threadTs)
  });

  return await sendSlackMessage({
    text: `⚡ [${issueKey}] ${summary || ''} — Status: ${status || 'Open'}`,
    blocks,
    threadTs,
    webhookUrl
  });
}

// ── CLI ENTRYPOINT ──────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const action = args[0];

  (async () => {
    try {
      if (action === 'card') {
        // Usage: node slack-client.js card <issueKey> <summary> <status> [assignee] [sp] [threadTs] [type] [priority]
        const issueKey = args[1] || 'G3PTP-17917';
        const summary = args[2] || '[Dadmin] Là VHHT, tôi muốn update đúng trạng thái giao dịch nộp...';
        const status = args[3] || 'Open';
        const assignee = args[4] || 'Trịnh Thu Hà';
        const sp = args[5] || 3;
        const threadTs = args[6] || undefined;
        const type = args[7] || 'Story';
        const priority = args[8] || 'Medium';

        const res = await sendJiraStatusCard({ issueKey, summary, status, assignee, sp, threadTs, type, priority });
        console.log(`✅ Gửi Card cho ${issueKey} (Status: ${status}${threadTs ? `, Thread: ${threadTs}` : ''}) thành công:`, res);
      } else {
        const message = args.join(' ') || '👋 Kiểm tra kết nối từ Agent Skills!';
        const result = await sendSlackMessage({ text: message });
        console.log('✅ Gửi tin nhắn Slack thành công:', result);
      }
    } catch (e) {
      console.error('❌ Lỗi gửi Slack:', e.message);
      process.exit(1);
    }
  })();
}

