const fs = require('fs');
const path = require('path');

const input = $input.first();
const json = (input && input.json) || {};

// Lấy thông tin từ các node trước
const prepIssuesNode = $('Prepare Sprint Issues Request').first()?.json || {};
const prepReqNode = $('Prepare Standup Request').first()?.json || {};
const triggerSource = prepIssuesNode._triggerSource || prepReqNode._triggerSource || 'internal';
const sprintName = prepIssuesNode.sprintName || 'Sprint đang mở';
const sprintId = prepIssuesNode.sprintId || '';
const boardId = prepReqNode.boardId || 61;
const baseUrl = (prepReqNode.baseUrl || 'https://entrade.atlassian.net').replace(/\/+$/, '');

// Xử lý lỗi Jira API hoặc không có sprint
if (prepIssuesNode.isError || json.error || json.errorMessages || (json.message && !json.issues)) {
  const errMsg = prepIssuesNode.error ||
                 (json.errorMessages && json.errorMessages.join(', ')) ||
                 (json.error && (json.error.message || json.error.description)) ||
                 json.message || 'Không thể kết nối đến Jira Agile API';
  return [{
    json: {
      isError: true,
      error: errMsg,
      reportText: `🚨 **[Lỗi Báo Cáo Daily Standup]** Không thể lấy danh sách issue cho Board 61:\n> ${errMsg}\n\n*Gợi ý: Kiểm tra cấu hình ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL và API Token trong file .env.*`,
      totalIssues: 0, stuckCount: 0, _triggerSource: triggerSource
    }
  }];
}

// Đọc cấu hình team từ sm-config.yaml
let team = [
  { name: "Nguyễn Văn Tuyền", role: "Developer Mobile" },
  { name: "Phan Hữu Thắng", role: "Developer Mobile" },
  { name: "Lương Tuấn Linh", role: "Developer WEB" },
  { name: "Trịnh Quốc Đạt", role: "Developer Backend" },
  { name: "Nguyễn Thành Sơn", role: "Developer Backend" },
  { name: "Trịnh Thu Hà", role: "BA" },
  { name: "Phạm Thị Thảo Linh", role: "BA" },
  { name: "Nguyễn Thanh Quang", role: "QA" },
  { name: "Nguyễn Trung Hiếu", role: "PO" }
];

let stuckDaysThreshold = 4;
if ($env && $env.STANDUP_STUCK_DAYS_THRESHOLD) {
  const parsed = parseInt($env.STANDUP_STUCK_DAYS_THRESHOLD, 10);
  if (!isNaN(parsed) && parsed > 0) stuckDaysThreshold = parsed;
}

try {
  let wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Projects/agent-skills';
  try {
    const proc = require('process');
    if (proc && typeof proc.cwd === 'function') wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || proc.cwd();
  } catch (_) {}
  const configCandidates = [
    path.resolve(wsDir, 'config', 'sm-config.yaml'),
    path.resolve(wsDir, 'sm-config.yaml'),
    path.resolve(wsDir, 'config', 'sm-config.example.yaml'),
    path.resolve(wsDir, 'sm-config.example.yaml')
  ];
  const configPath = configCandidates.find(p => fs.existsSync(p)) || null;
  if (configPath) {
    const rawYaml = fs.readFileSync(configPath, 'utf8');
    const stuckMatch = rawYaml.match(/stuck_days_threshold:\s*(\d+)/);
    if (stuckMatch) {
      stuckDaysThreshold = parseInt(stuckMatch[1], 10);
    }
    // Simple YAML parser cho team list
    const teamMatches = rawYaml.match(/- name:\s*"([^"]+)"\s*\n\s*role:\s*"([^"]+)"/g);
    if (teamMatches && teamMatches.length > 0) {
      team = teamMatches.map(m => {
        const n = m.match(/- name:\s*"([^"]+)"/);
        const r = m.match(/role:\s*"([^"]+)"/);
        return { name: n ? n[1] : '', role: r ? r[1] : 'Developer' };
      }).filter(t => t.name);
    }
  }
} catch (_) {}

const issues = json.issues || [];
const now = new Date();
const stuckIssues = [];
const doneIssues = [];
const inProgressIssues = [];
const readyToTestIssues = [];
const openIssues = [];

let committedPoints = 0;
let completedPoints = 0;

// Khởi tạo stats theo team
const memberStats = {};
for (const m of team) {
  memberStats[m.name] = { tickets: 0, sp: 0, inProgress: 0, role: m.role };
}

for (const issue of issues) {
  const f = issue.fields || {};
  const key = issue.key;
  const title = f.summary || '';
  const assignee = f.assignee ? f.assignee.displayName : 'Chưa phân bổ';
  const priority = f.priority ? f.priority.name : 'Medium';
  const statusName = (f.status && f.status.name) || '';
  const statusCat = (f.status && f.status.statusCategory && f.status.statusCategory.name) || '';
  const statusLower = statusName.toLowerCase();

  // Story Points: Board 61 (G3PTP) dùng customfield_10022 ("Story Points", number), fallback customfield_10026 ("Story point estimate", number) hoặc timeoriginalestimate (8h = 1 SP)
  // CẢNH BÁO: Tuyệt đối KHÔNG dùng customfield_10016 vì đó là "[CHART] Date of First Response" (chuỗi ISO datetime "2026-...", parseFloat sẽ ra 2026!)
  let rawSp = f.customfield_10022;
  if (rawSp === null || rawSp === undefined) rawSp = f.customfield_10026;

  let sp = 0;
  if (typeof rawSp === 'number' && !isNaN(rawSp)) {
    sp = rawSp;
  } else if (typeof rawSp === 'string' && /^\d+(\.\d+)?$/.test(rawSp.trim())) {
    sp = parseFloat(rawSp.trim());
  } else if (f.timeoriginalestimate && typeof f.timeoriginalestimate === 'number') {
    sp = Math.round((f.timeoriginalestimate / 28800) * 10) / 10;
  } else if (f.timeoriginalestimate && typeof f.timeoriginalestimate === 'string' && /^\d+(\.\d+)?$/.test(f.timeoriginalestimate.trim())) {
    sp = Math.round((parseFloat(f.timeoriginalestimate.trim()) / 28800) * 10) / 10;
  }
  sp = Math.max(0, Math.round(sp * 10) / 10);
  committedPoints = Math.round((committedPoints + sp) * 10) / 10;

  // Tính thời gian ở trạng thái từ changelog (nếu có) hoặc updated
  let daysInStatus = 0;
  const changelog = (issue.changelog && issue.changelog.histories) || [];
  let statusChangedDate = f.created;

  if (changelog.length > 0) {
    const sorted = [...changelog].sort((a, b) => new Date(a.created) - new Date(b.created));
    for (let i = sorted.length - 1; i >= 0; i--) {
      const items = sorted[i].items || [];
      if (items.some(item => (item.field || '').toLowerCase() === 'status')) {
        statusChangedDate = sorted[i].created;
        break;
      }
    }
  }

  if (statusChangedDate) {
    const diff = (now - new Date(statusChangedDate)) / (1000 * 60 * 60 * 24);
    daysInStatus = Math.max(0, Math.floor(diff));
  }

  const isDone = statusCat === 'Done' || ['done', 'closed', 'resolved', 'wait for release'].includes(statusLower);
  const isInProg = ['in progress', 'coding', 'doing', 'ready to merge', 'code review'].includes(statusLower);
  const isReadyTest = ['ready to test', 'ready for qa', 'testing', 'sẵn sàng kiểm thử'].includes(statusLower);

  const issueItem = {
    key, title, assignee, priority, sp,
    status: statusName,
    days: daysInStatus,
    updated: (f.updated || '').slice(0, 10)
  };

  if (isDone) {
    completedPoints = Math.round((completedPoints + sp) * 10) / 10;
    doneIssues.push(issueItem);
  } else if (isInProg) {
    inProgressIssues.push(issueItem);
  } else if (isReadyTest) {
    readyToTestIssues.push(issueItem);
  } else {
    openIssues.push(issueItem);
  }

  // Cảnh báo ticket bị treo (> stuckDaysThreshold ngày, ví dụ > 4 ngày) và chưa Done
  if (!isDone && daysInStatus > stuckDaysThreshold) {
    stuckIssues.push({
      ...issueItem,
      level: daysInStatus > 7 ? '🔴 Nghiêm trọng' : '🟡 Cảnh báo'
    });
  }

  // Cập nhật workload cho active tickets (chưa Done)
  if (!isDone && assignee !== 'Chưa phân bổ') {
    if (!memberStats[assignee]) {
      memberStats[assignee] = { tickets: 0, sp: 0, inProgress: 0, role: 'Khác' };
    }
    memberStats[assignee].tickets += 1;
    memberStats[assignee].sp = Math.round((memberStats[assignee].sp + sp) * 10) / 10;
    if (isInProg) memberStats[assignee].inProgress += 1;
  }
}

// ── Soạn Báo Cáo Markdown Ngắn Gọn ──
const dateStr = now.toISOString().split('T')[0];
const boardUrl = `${baseUrl}/jira/software/c/projects/G3PTP/boards/${boardId}/backlog`;
const totalIssues = issues.length;
const donePct = totalIssues > 0 ? Math.round((doneIssues.length / totalIssues) * 1000) / 10 : 0;
const spPct = committedPoints > 0 ? Math.round((completedPoints / committedPoints) * 1000) / 10 : 0;

const shortRole = (role) => {
  if (!role) return 'Dev';
  return role.replace(/^Developer\s+/i, '').replace(/Backend/i, 'BE').replace(/WEB/i, 'Web').replace(/APP/i, 'App');
};

let reportText = `### ☀️ DAILY STANDUP G3.1\n`;
reportText += `> 📌 ${dateStr} - [${sprintName}](${boardUrl})\n\n`;

// 1. Tóm tắt tiến độ & trạng thái
reportText += `- 📈 **Tiến độ:** **${doneIssues.length}/${totalIssues}** issues (${donePct}%) ᐧ **${completedPoints}/${committedPoints} SP** (${spPct}%)\n`;
reportText += `- 📌 **Trạng thái:** 🔄 **${inProgressIssues.length}** In Progress ᐧ 🧪 **${readyToTestIssues.length}** Ready to Test ᐧ 📝 **${openIssues.length}** To Do ᐧ ✅ **${doneIssues.length}** Done\n\n`;

// 2. Bảng Phân Bổ Công Việc (1 bảng duy nhất, súc tích)
const sortedMembers = Object.entries(memberStats)
  .map(([name, stats]) => ({ name, ...stats }))
  .sort((a, b) => b.sp - a.sp || b.tickets - a.tickets);

const activeMembers = sortedMembers.filter(m => m.tickets > 0);
const idleMembers = sortedMembers.filter(m => m.tickets === 0 && team.some(t => t.name === m.name));

if (activeMembers.length > 0) {
  reportText += `#### ⚖️ Phân Bổ Công Việc\n`;
  reportText += `| Thành viên | Role | Issues | SP | In Progress | Tải |\n`;
  reportText += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  for (const m of activeMembers) {
    let loadBadge = '🟢 Cân bằng';
    if (m.sp >= 25 || m.tickets >= 5) {
      loadBadge = '🔴 Tải cao';
    } else if (m.sp <= 5 && m.tickets <= 1) {
      loadBadge = '🟡 Tải nhẹ';
    }

    reportText += `| **${m.name}** | \`${shortRole(m.role)}\` | ${m.tickets} | **${m.sp}** | ${m.inProgress} | ${loadBadge} |\n`;
  }

  if (idleMembers.length > 0) {
    const idleNames = idleMembers.map(m => m.name).join(', ');
    reportText += `> *Chưa có ticket active:* ${idleNames}\n`;
  }
  reportText += `\n`;
}

// 3. Bảng Cảnh Báo Ticket Bị Treo (> stuckDaysThreshold ngày)
if (stuckIssues.length > 0) {
  const sortedStuck = [...stuckIssues].sort((a, b) => b.days - a.days);
  reportText += `#### 🚨 Cảnh Báo Treo (> ${stuckDaysThreshold} ngày)\n`;
  reportText += `| Ticket | Tiêu đề | Thành viên | Treo | Mức độ |\n`;
  reportText += `| :--- | :--- | :--- | :---: | :--- |\n`;
  for (const s of sortedStuck) {
    const jiraLink = `[${s.key}](${baseUrl}/browse/${s.key})`;
    const fullTitle = s.title.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
    reportText += `| ${jiraLink} | ${fullTitle} | **${s.assignee}** | **${s.days} ngày** | ${s.level} |\n`;
  }
  reportText += `\n`;
} else {
  reportText += `> ✅ **Không có ticket nào bị treo quá ${stuckDaysThreshold} ngày.**\n\n`;
}

// ── Tạo Slack Payload (Monospace Workload Table + Native Block Kit Table cho Cảnh Báo Treo) ──
const convertMdTables = (txt) => {
  const lines = String(txt || '').split('\n');
  const out = [];
  let tbl = [];
  const clean = (r) =>
    String(r || '')
      .trim()
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
      .normalize('NFC');
  const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
  const getAligns = (cells) =>
    cells.map((c) => {
      const t = c.trim();
      if (t.startsWith(':') && t.endsWith(':')) return 'center';
      if (t.endsWith(':')) return 'right';
      return 'left';
    });
  const pad = (s, w, al) => {
    const d = Math.max(0, w - [...s].length);
    if (al === 'right') return ' '.repeat(d) + s;
    if (al === 'center') return ' '.repeat(Math.floor(d / 2)) + s + ' '.repeat(d - Math.floor(d / 2));
    return s + ' '.repeat(d);
  };
  const flush = () => {
    if (tbl.length === 0) return;
    if (tbl.length < 2) {
      out.push(...tbl);
      tbl = [];
      return;
    }
    const rows = tbl.map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean));
    let aligns = [];
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      if (i === 1 && isSep(rows[i])) aligns = getAligns(rows[i]);
      else data.push(rows[i]);
    }
    const cols = Math.max(...data.map((r) => r.length));
    const widths = new Array(cols).fill(0);
    for (const r of data) {
      for (let c = 0; c < cols; c++) widths[c] = Math.max(widths[c], [...(r[c] || '')].length);
    }
    const rendered = data.map((r, rIdx) => {
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const v = r[c] || '';
        const al = rIdx === 0 || c === cols - 1 ? 'left' : (aligns[c] || 'left');
        cells.push(c === cols - 1 ? v : pad(v, widths[c], al));
      }
      return cells.join(' │ ');
    });
    if (rendered.length > 1) {
      rendered.splice(1, 0, widths.map((w, c) => '─'.repeat(c === cols - 1 ? Math.min(w, 12) : w)).join('─┼─'));
    }
    out.push('```\n' + rendered.join('\n') + '\n```');
    tbl = [];
  };
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('|') && t.endsWith('|') && t.length > 2) tbl.push(l);
    else {
      flush();
      out.push(l);
    }
  }
  flush();
  return out.join('\n');
};

const toMrkdwn = (txt) =>
  convertMdTables(txt)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>')
    .replace(/^#{1,4}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*([^*]+)\*\*/g, '*$1*');

const makeRichCell = (rawCell, isHeader = false) => {
  const raw = String(rawCell || '').trim().normalize('NFC');
  const linkMatch = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (linkMatch) {
    return {
      type: 'rich_text',
      elements: [{ type: 'rich_text_section', elements: [{ type: 'link', url: linkMatch[2], text: linkMatch[1], style: { bold: true } }] }]
    };
  }
  const isBold = isHeader || /^\*\*([^*]+)\*\*$/.test(raw);
  const isCode = /^`([^`]+)`$/.test(raw);
  const cleanText = raw.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1') || ' ';
  const style = {};
  if (isBold) style.bold = true;
  if (isCode) style.code = true;
  return {
    type: 'rich_text',
    elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: cleanText, ...(Object.keys(style).length ? { style } : {}) }] }]
  };
};

const buildSlackPayload = () => {
  const fullSlackText = toMrkdwn(reportText);
  if (stuckIssues.length === 0) {
    return { text: fullSlackText };
  }
  const [beforeStuckTable] = reportText.split('| Ticket | Tiêu đề |');
  const sectionMrkdwn = toMrkdwn((beforeStuckTable || '').trim());
  const sortedStuck = [...stuckIssues].sort((a, b) => b.days - a.days);
  const tableRows = [
    ['Ticket', 'Tiêu đề', 'Thành viên', 'Treo', 'Mức độ'].map((h) => makeRichCell(h, true)),
    ...sortedStuck.slice(0, 95).map((s) => [
      makeRichCell(`[${s.key}](${baseUrl}/browse/${s.key})`),
      makeRichCell(s.title.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()),
      makeRichCell(`**${s.assignee}**`),
      makeRichCell(`**${s.days} ngày**`),
      makeRichCell(s.level)
    ])
  ];
  return {
    text: fullSlackText,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: sectionMrkdwn.slice(0, 3000) } },
      {
        type: 'table',
        column_settings: [
          { align: 'left', is_wrapped: true },
          { align: 'left', is_wrapped: true },
          { align: 'left', is_wrapped: true },
          { align: 'center', is_wrapped: true },
          { align: 'left', is_wrapped: true }
        ],
        rows: tableRows
      }
    ]
  };
};

const slackPayload = buildSlackPayload();

// Ghi nhận mốc ngày gửi standup thành công vào standup-last-sent.txt khi chạy từ Cron nội bộ và đã cấu hình Slack
const slackWebhookUrl = ($env && $env.SLACK_WEBHOOK_URL) ? String($env.SLACK_WEBHOOK_URL).trim() : '';
const hasValidSlack = slackWebhookUrl.startsWith('https://hooks.slack.com/') &&
  !slackWebhookUrl.includes('T00000000') &&
  !slackWebhookUrl.includes('your_');

if (triggerSource !== 'webhook' && hasValidSlack) {
  try {
    const candidates = [
      path.resolve(wsDir, '.n8n-data', 'standup-last-sent.txt'),
      path.resolve('/workspace', '.n8n-data', 'standup-last-sent.txt'),
      path.resolve('/home/node/.n8n', 'standup-last-sent.txt')
    ];
    for (const targetFile of candidates) {
      const parentDir = path.dirname(targetFile);
      if (fs.existsSync(parentDir)) {
        fs.writeFileSync(targetFile, `${dateStr}\n`, 'utf8');
        break;
      }
    }
  } catch (_) {}
}

return [{
  json: {
    isError: false,
    reportText,
    slackPayload,
    totalIssues,
    totalSP: committedPoints,
    completedSP: completedPoints,
    stuckCount: stuckIssues.length,
    sprintName,
    boardId,
    _triggerSource: triggerSource
  }
}];
