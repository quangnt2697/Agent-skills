const fs = require('fs');
const path = require('path');

const input = $input.first();
const json = (input && input.json) || {};

// Lấy thông tin từ các node trước
const prepIssuesNode = $('Prepare Sprint Issues Request').first()?.json || {};
const prepReqNode = $('Prepare Standup Request').first()?.json || {};
const triggerSource = prepIssuesNode._triggerSource || prepReqNode._triggerSource || 'mattermost';
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
  { name: "Phan Hữu Thắng", role: "Developer APP" },
  { name: "Lương Tuấn Linh", role: "Developer WEB" },
  { name: "Trịnh Quốc Đạt", role: "Developer Backend" },
  { name: "Nguyễn Thành Sơn", role: "Developer Backend" },
  { name: "Trịnh Thu Hà", role: "BA" },
  { name: "Phạm Thị Thảo Linh", role: "BA" },
  { name: "Nguyễn Thanh Quang", role: "QA" },
  { name: "Nguyễn Trung Hiếu", role: "PO" }
];

try {
  let wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Projects/agent-skills';
  try {
    const proc = require('process');
    if (proc && typeof proc.cwd === 'function') wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || proc.cwd();
  } catch (_) {}
  const configPath = path.resolve(wsDir, 'sm-config.yaml');
  if (fs.existsSync(configPath)) {
    const rawYaml = fs.readFileSync(configPath, 'utf8');
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

  // Story Points: customfield_10022 là estimation field của Board 61, fallback customfield_10016 hoặc estimate
  let sp = f.customfield_10022;
  if (sp === null || sp === undefined) sp = f.customfield_10016;
  if (sp === null || sp === undefined) {
    if (f.timeoriginalestimate) {
      sp = Math.round((parseFloat(f.timeoriginalestimate) / 28800) * 10) / 10;
    } else {
      sp = 0;
    }
  }
  sp = parseFloat(sp) || 0;
  committedPoints += sp;

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
    completedPoints += sp;
    doneIssues.push(issueItem);
  } else if (isInProg) {
    inProgressIssues.push(issueItem);
  } else if (isReadyTest) {
    readyToTestIssues.push(issueItem);
  } else {
    openIssues.push(issueItem);
  }

  // Cảnh báo ticket bị treo (> 3 ngày) và chưa Done
  if (!isDone && daysInStatus >= 3) {
    stuckIssues.push({
      ...issueItem,
      level: daysInStatus > 7 ? '🔴 Nghiêm trọng' : '🟡 Cảnh báo'
    });
  }

  // Cập nhật workload cho active tickets (chưa Done)
  if (!isDone && assignee !== 'Chưa phân bổ') {
    if (!memberStats[assignee]) {
      memberStats[assignee] = { tickets: 0, sp: 0, inProgress: 0, role: 'Thành viên khác' };
    }
    memberStats[assignee].tickets += 1;
    memberStats[assignee].sp += sp;
    if (isInProg) memberStats[assignee].inProgress += 1;
  }
}

// ── Soạn Báo Cáo Markdown Ngắn Gọn Cho Mattermost ──
const dateStr = now.toISOString().split('T')[0];
const boardUrl = `${baseUrl}/jira/software/c/projects/G3PTP/boards/${boardId}/backlog`;
const totalIssues = issues.length;
const donePct = totalIssues > 0 ? Math.round((doneIssues.length / totalIssues) * 1000) / 10 : 0;
const spPct = committedPoints > 0 ? Math.round((completedPoints / committedPoints) * 1000) / 10 : 0;

const shortRole = (role) => {
  if (!role) return 'Dev';
  return role.replace(/^Developer\s+/i, '').replace(/Backend/i, 'BE').replace(/WEB/i, 'Web').replace(/APP/i, 'App');
};

let reportText = `### ☀️ DAILY STANDUP — [${sprintName}](${boardUrl}) (${dateStr})\n`;
reportText += `> 📌 Group 3.1 ᐧ **Sprint ID:** \`${sprintId}\`\n\n`;

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

// 3. Cảnh Báo Ticket Bị Treo (> 3 ngày) - Rút gọn dạng list
if (stuckIssues.length > 0) {
  reportText += `#### 🚨 Cảnh Báo Treo (> 3 ngày)\n`;
  for (const s of stuckIssues) {
    const jiraLink = `[${s.key}](${baseUrl}/browse/${s.key})`;
    const shortTitle = s.title.length > 40 ? s.title.slice(0, 40) + '...' : s.title;
    reportText += `- ${jiraLink} ${shortTitle} (👤 **${s.assignee}** ᐧ ⏳ **${s.days} ngày** ᐧ ${s.level})\n`;
  }
  reportText += `\n`;
} else {
  reportText += `> ✅ **Không có ticket nào bị treo quá 3 ngày.**\n\n`;
}

return [{
  json: {
    isError: false,
    reportText,
    totalIssues,
    totalSP: committedPoints,
    completedSP: completedPoints,
    stuckCount: stuckIssues.length,
    sprintName,
    boardId,
    _triggerSource: triggerSource
  }
}];
