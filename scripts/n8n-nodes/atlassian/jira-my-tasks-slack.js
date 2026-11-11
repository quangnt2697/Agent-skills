/**
 * Node Script: Jira My Tasks Slack Builder (`scripts/n8n-nodes/atlassian/jira-my-tasks-slack.js`)
 *
 * Xây dựng Slack Message Payload (Block Kit tương thích Incoming Webhook)
 * Đính kèm các Action Links (hyperlink) trỏ tới localhost webhook n8n:
 * - Khi click link, browser tự đóng ngay (qua HTML response window.close)
 * - n8n lập tức kích hoạt skill tương ứng và báo kết quả/lỗi về Slack
 *
 * Tối ưu hóa chuẩn n8n-io/n8n Item Loop:
 * - Duyệt qua toàn bộ $input.all() để không bỏ sót bất kỳ task nào khi có nhiều task cùng cập nhật.
 */

const allInputs = (typeof $input !== 'undefined' && typeof $input.all === 'function') ? $input.all() : [];
if (allInputs.length === 0) return [];

const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const n8nBase = (($env && $env.N8N_BASE_URL) || `${($env && $env.N8N_PROTOCOL) || 'http'}://${($env && $env.N8N_HOST) || 'localhost'}:${($env && $env.N8N_PORT) || '5678'}`).replace(/\/+$/, '');
const webhookBase = `${n8nBase}/webhook/agent-trigger-skill`;

// Cấu hình nhãn & biểu tượng theo loại sự kiện
const eventMap = {
  'created':             { emoji: '🆕', label: 'Task Mới Được Giao' },
  'reassigned_to_me':    { emoji: '👤', label: 'Vừa Được Phân Công' },
  'status_changed':      { emoji: '🔄', label: 'Chuyển Trạng Thái' },
  'comment_added':       { emoji: '💬', label: 'Bình Luận Mới' },
  'description_updated': { emoji: '📝', label: 'Cập Nhật Mô Tả' },
  'api_error':           { emoji: '🚨', label: 'Lỗi Kết Nối Jira API' }
};

const prioMap = {
  'Highest':  '🔴 Highest',
  'High':     '🟠 High',
  'Medium':   '🟡 Medium',
  'Low':      '🟢 Low',
  'Lowest':   '⚪ Lowest'
};

const outputItems = [];

for (const inputItem of allInputs) {
  const data = inputItem.json || {};
  const issueKey = data.issueKey || '';
  if (!issueKey) continue;

  const jiraUrl = `${baseUrl}/browse/${issueKey}`;
  const cfg = eventMap[data.changeType] || { emoji: '📋', label: 'Cập Nhật Task' };
  const priorityDisplay = prioMap[data.priority] || `🟡 ${data.priority || 'Medium'}`;

  // Sprint Name
  let sprintName = 'N/A';
  const issueFields = data.issue?.fields || {};
  const sprintCustomKey = ($env && $env.JIRA_SPRINT_CUSTOM_FIELD) || 'customfield_10018';
  const sprintField = issueFields[sprintCustomKey] || issueFields.customfield_10018 || issueFields.customfield_10020 || issueFields.sprint;
  if (Array.isArray(sprintField) && sprintField.length > 0) {
    const activeS = sprintField.find(s => s && (s.state || '').toLowerCase() === 'active') || sprintField[sprintField.length - 1];
    if (activeS) sprintName = activeS.name || (typeof activeS === 'string' && activeS.match(/name=([^,\]]+)/)?.[1]) || 'Active Sprint';
  } else if (sprintField && typeof sprintField === 'object') {
    sprintName = sprintField.name || 'Active Sprint';
  }

  // Xây dựng Action Links theo đúng TRẠNG THÁI TASK (data.status):
  // - Open / To Do / Backlog / Reopened -> hiển thị /ba-refine
  // - Ready to test / Testing / QA -> hiển thị /qa-test-design và /qa-run-test
  // - In Progress / In Review -> hiển thị /ba-refine và /qa-test-design
  // - Done / Closed / Resolved -> hiển thị /qa-run-test
  const actionLinks = [];
  const statusLower = (data.status || '').toLowerCase().trim();
  const threadQuery = data.threadTs ? `&thread_ts=${encodeURIComponent(data.threadTs)}` : '';

  const isOpenState = ['open', 'to do', 'todo', 'backlog', 'reopened', 'new', 'draft'].some(s => statusLower === s || statusLower.includes(s));
  const isReadyToTestState = statusLower.includes('ready') || statusLower.includes('test') || statusLower.includes('qa') || statusLower.includes('uat');
  const isDoneState = ['done', 'closed', 'resolved', 'completed'].some(s => statusLower === s || statusLower.includes(s));

  if (data.changeType !== 'api_error') {
    if (isReadyToTestState) {
      actionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
      actionLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${issueKey}${threadQuery}|▶️ Thực thi test>`);
    } else if (isOpenState) {
      actionLinks.push(`<${webhookBase}?skill=ba-refine&issueKey=${issueKey}${threadQuery}|✏️ Refine task>`);
    } else if (isDoneState) {
      actionLinks.push(`<${webhookBase}?skill=qa-run-test&issueKey=${issueKey}${threadQuery}|▶️ Thực thi test>`);
    } else {
      // In Progress / In Review hoặc trạng thái trung gian
      actionLinks.push(`<${webhookBase}?skill=ba-refine&issueKey=${issueKey}${threadQuery}|✏️ Refine task>`);
      actionLinks.push(`<${webhookBase}?skill=qa-test-design&issueKey=${issueKey}${threadQuery}|🧪 Thiết kế test>`);
    }
    actionLinks.push(`<${jiraUrl}|🔗 Xem chi tiết>`);
  }

  // Slack Block Kit sections
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${cfg.emoji} *${cfg.label}* — <${jiraUrl}|*${issueKey}*>\n*${data.summary}*`
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Loại:* ${data.issueType}` },
        { type: 'mrkdwn', text: `*Trạng thái:* ${data.status}` },
        { type: 'mrkdwn', text: `*Độ ưu tiên:* ${priorityDisplay}` },
        { type: 'mrkdwn', text: `*Sprint:* ${sprintName}` }
      ]
    }
  ];

  // Chi tiết thay đổi (làm sạch mọi thẻ HTML kỹ thuật nếu có)
  if (data.changeDetail) {
    const cleanDetail = String(data.changeDetail).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Nội dung cập nhật:* ${cleanDetail}`
      }
    });
  }

  // Hành động nhanh (Action Links)
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `⚡ *Kích hoạt:* ${actionLinks.join('  ┆  ')}`
    }
  });

  // Context footer
  const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `🕒 ${nowStr}`
      }
    ]
  });

  const fallbackText = `${cfg.emoji} [${issueKey}] ${cfg.label}: ${data.summary}`;

  const slackPayload = {
    text: fallbackText,
    blocks
  };
  if (data.threadTs) {
    slackPayload.thread_ts = data.threadTs;
  }

  outputItems.push({
    json: {
      issueKey,
      changeType: data.changeType,
      threadTs: data.threadTs || null,
      slackPayload
    }
  });
}

return outputItems;
