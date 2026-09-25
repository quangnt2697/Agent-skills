/**
 * Node Script: Jira Ready To Test Filter (`scripts/n8n-nodes/jira-ready-to-test-filter.js`)
 *
 * Mục đích (WF-11):
 * - Hỗ trợ cả 2 chế độ:
 *   1. Webhook thời gian thực từ Jira (`jira:issue_updated` hoặc webhook test)
 *   2. Scheduled Poller (định kỳ 5 phút quét Board 61 active sprint)
 * - Lọc nghiêm ngặt 3 điều kiện:
 *   1. Thuộc Board G.3.1 (mã key `G3PTP-*` hoặc project `G.3.1` / `G3PTP`).
 *   2. Thuộc Sprint hiện tại (Active Sprint: `sprint.state === 'active'`).
 *   3. Trạng thái chuyển đổi sang `"Ready to test"` (case-insensitive).
 * - Cơ chế Cache chống trùng lặp: Lưu vào `.cache/notified-ready-to-test.json`
 * - Quét workspace local của `issueKey`:
 *   - Kiểm tra file `.feature`: có -> `✅ Gherkin file`, không -> `❌ Gherkin file`.
 *   - Kiểm tra file `steps/test-*.py` (hoặc `test_*.py`): có -> `✅ Autoscript test`, không -> `❌ Autoscript test`.
 * - Đưa ra gợi ý lệnh tương ứng tùy theo tình trạng file (mỗi lệnh trên 1 dòng riêng biệt).
 * - Soạn thẻ Markdown gửi thông báo về Mattermost.
 */

const fs = require('fs');
const path = require('path');

const firstInput = (typeof $input !== 'undefined' && typeof $input.first === 'function') ? $input.first() : null;
const rawFirst = (firstInput && firstInput.json) || {};
const bodyFirst = rawFirst.body || rawFirst;

let procCwd = '';
try {
  const proc = require('process');
  if (proc && typeof proc.cwd === 'function') procCwd = proc.cwd();
} catch (_) {}

const candidateRoots = [
  ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Desktop/Project/Test/agent-skills',
  procCwd,
  '/Users/qa-quangnt/Desktop/Project/Test/agent-skills'
].filter(Boolean);

let primaryRoot = candidateRoots[0];
for (const r of candidateRoots) {
  if (fs.existsSync(r)) {
    primaryRoot = r;
    break;
  }
}

// Khởi tạo hoặc đọc cache các issue đã gửi thông báo
const cacheDir = path.join(primaryRoot, '.cache');
const cacheFile = path.join(cacheDir, 'notified-ready-to-test.json');
let notifiedCache = {};
let cacheUpdated = false;

try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (fs.existsSync(cacheFile)) {
    notifiedCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8') || '{}');
  }
} catch (_) {}

// Thu thập danh sách candidate issues (từ webhook payload đơn lẻ hoặc batch issues từ Jira search)
const candidateItems = [];

// Trường hợp 1: Nhận payload từ Jira Search / Poller ({ issues: [...] })
if (Array.isArray(bodyFirst.issues)) {
  for (const iss of bodyFirst.issues) {
    candidateItems.push({
      issue: iss,
      changelog: iss.changelog || {},
      isPolled: true
    });
  }
} else if (Array.isArray(rawFirst.issues)) {
  for (const iss of rawFirst.issues) {
    candidateItems.push({
      issue: iss,
      changelog: iss.changelog || {},
      isPolled: true
    });
  }
} else {
  // Trường hợp 2: Nhận payload đơn lẻ qua Webhook hoặc Execute Workflow
  candidateItems.push(bodyFirst);
}

const outputResults = [];

for (const rawItem of candidateItems) {
  const item = rawItem.body || rawItem;
  const issue = item.issue || rawItem.issue || item;
  const changelog = item.changelog || rawItem.changelog || {};
  const issueKey = (issue.key || item.issueKey || rawItem.issueKey || '').toUpperCase().trim();
  const fields = issue.fields || {};

  if (!issueKey) continue;

  // 1. Điều kiện 1: Board G.3.1 (Project G3PTP hoặc chứa G.3.1)
  const projectKey = (fields.project?.key || '').toUpperCase();
  const projectName = (fields.project?.name || '');
  const isBoardG31 = issueKey.startsWith('G3PTP-') || projectKey === 'G3PTP' || projectName.includes('G.3.1') || (item.boardName || '').includes('G.3.1');

  // 2. Điều kiện 2: Active Sprint
  let isActiveSprint = false;
  let sprintName = 'Active Sprint';

  const sprintField = fields.sprint || fields.customfield_10020 || fields.customfield_10010;
  if (Array.isArray(sprintField)) {
    const activeS = sprintField.find(s => (s.state || '').toLowerCase() === 'active');
    if (activeS) {
      isActiveSprint = true;
      sprintName = activeS.name || sprintName;
    } else if (sprintField.length > 0) {
      sprintName = sprintField[0].name || sprintName;
      // Nếu polling theo JQL sprint in openSprints(), coi như thuộc open sprint
      if (rawItem.isPolled) isActiveSprint = true;
    }
  } else if (sprintField && typeof sprintField === 'object') {
    isActiveSprint = (sprintField.state || '').toLowerCase() === 'active';
    sprintName = sprintField.name || sprintName;
  } else if (typeof sprintField === 'string' && sprintField.toLowerCase().includes('state=active')) {
    isActiveSprint = true;
    const match = sprintField.match(/name=([^,]+)/);
    if (match) sprintName = match[1];
  } else if (item.isCurrentSprint === true || item.isActiveSprint === true || rawItem.isPolled) {
    isActiveSprint = true;
  }

  // 3. Điều kiện 3: Status đổi sang hoặc đang ở "Ready to test"
  let isStatusReadyToTest = false;
  const items = Array.isArray(changelog.items) ? changelog.items : [];

  for (const ch of items) {
    if ((ch.field || '').toLowerCase() === 'status') {
      const toStr = (ch.toString || ch.to || '').toLowerCase().trim();
      if (toStr === 'ready to test' || toStr === 'ready for testing' || toStr === 'sẵn sàng kiểm thử') {
        isStatusReadyToTest = true;
        break;
      }
    }
  }

  if (!isStatusReadyToTest && (fields.status?.name || item.status || '').toLowerCase().trim().includes('ready to test')) {
    isStatusReadyToTest = true;
  }

  // Kiểm tra 3 điều kiện
  if (!isBoardG31 || !isActiveSprint || !isStatusReadyToTest) {
    if (candidateItems.length === 1 && !rawItem.isPolled) {
      outputResults.push({
        json: {
          isReadyToTest: false,
          ignored: true,
          reason: `Bỏ qua sự kiện: isBoardG31=${isBoardG31}, isActiveSprint=${isActiveSprint}, isStatusReadyToTest=${isStatusReadyToTest}`,
          issueKey
        }
      });
    }
    continue;
  }

  // 4. Kiểm tra Cache chống thông báo lặp lại
  const updatedTime = fields.updated || item.updated || new Date().toISOString();
  if (notifiedCache[issueKey]) {
    const lastNotified = new Date(notifiedCache[issueKey]);
    const issueUpdated = new Date(updatedTime);
    // Nếu đã thông báo và ticket không đổi trạng thái sau đó -> bỏ qua
    if (issueUpdated <= lastNotified) {
      if (candidateItems.length === 1 && !rawItem.isPolled) {
        outputResults.push({
          json: {
            isReadyToTest: false,
            ignored: true,
            reason: `Issue ${issueKey} đã được thông báo trước đó vào ${lastNotified.toISOString()}`,
            issueKey
          }
        });
      }
      continue;
    }
  }

  // 5. Quét Workspace Local để kiểm tra file
  let hasGherkin = false;
  let hasAutoScript = false;
  let workspaceFoundPath = '';

  for (const cRoot of candidateRoots) {
    const wsDir = path.join(cRoot, 'workspace', issueKey);
    if (fs.existsSync(wsDir)) {
      workspaceFoundPath = wsDir;

      // A. Kiểm tra file .feature (Gherkin)
      const testDir = path.join(wsDir, 'test');
      if (fs.existsSync(testDir)) {
        try {
          const files = fs.readdirSync(testDir);
          hasGherkin = files.some(f => f.endsWith('.feature'));
        } catch (_) {}
      }
      if (!hasGherkin) {
        try {
          const allFiles = fs.readdirSync(wsDir);
          hasGherkin = allFiles.some(f => f.endsWith('.feature'));
        } catch (_) {}
      }

      // B. Kiểm tra file test script
      const stepsDir = path.join(wsDir, 'test', 'steps');
      if (fs.existsSync(stepsDir)) {
        try {
          const stepFiles = fs.readdirSync(stepsDir);
          hasAutoScript = stepFiles.some(f => (f.startsWith('test-') || f.startsWith('test_')) && f.endsWith('.py'));
        } catch (_) {}
      }
      if (!hasAutoScript && fs.existsSync(testDir)) {
        try {
          const testFiles = fs.readdirSync(testDir);
          hasAutoScript = testFiles.some(f => (f.startsWith('test-') || f.startsWith('test_')) && f.endsWith('.py'));
        } catch (_) {}
      }
      break;
    }
  }

  // 6. Đánh dấu badge trạng thái file
  const gherkinBadge = hasGherkin ? '✅ Gherkin file' : '❌ Gherkin file';
  const autoScriptBadge = hasAutoScript ? '✅ Autoscript test' : '❌ Autoscript test';

  // 7. Gợi ý lệnh tùy theo tình trạng file
  const commandList = [];
  let situationSummary = '';

  if (!hasGherkin && !hasAutoScript) {
    situationSummary = 'Chưa có kịch bản BDD Gherkin và chưa có mã automation testscript.';
    commandList.push({
      label: 'Thiết kế Checklist & Gherkin file:',
      cmd: `/qa-test-design ${issueKey}`
    });
    commandList.push({
      label: 'Thiết kế test script Playwright/Pytest:',
      cmd: `/qa-auto-design ${issueKey}`
    });
  } else if (hasGherkin && !hasAutoScript) {
    situationSummary = 'Đã có kịch bản BDD Gherkin nhưng chưa có mã automation test.';
    commandList.push({
      label: 'Thiết kế test script Playwright/Pytest:',
      cmd: `/qa-auto-design ${issueKey}`
    });
    commandList.push({
      label: 'Thực thi kiểm thử tự động:',
      cmd: `/qa-run-test ${issueKey}`
    });
  } else {
    situationSummary = 'Đã sẵn sàng đầy đủ kịch bản BDD Gherkin và mã automation test.';
    commandList.push({
      label: 'Thực thi kiểm thử tự động:',
      cmd: `/qa-run-test ${issueKey}`
    });
    commandList.push({
      label: 'Đồng bộ kịch bản kiểm thử lên Squash TM:',
      cmd: `/qa-squash-push ${issueKey}`
    });
  }

  const suggestedCommands = commandList.map(c => c.cmd);
  const suggestedCommand = suggestedCommands[0] || '';

  // 8. Tạo thẻ thông báo Mattermost bắt mắt
  const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
  const jiraUrl = `${baseUrl}/browse/${issueKey}`;
  const summary = fields.summary || item.summary || '-';
  const assignee = fields.assignee?.displayName || item.assignee || '-';
  const priority = fields.priority?.name || item.priority || 'Medium';

  const reportText = `### 🎯 READY TO TEST — [${issueKey}](${jiraUrl})\n\n| Thông Tin | Chi Tiết |\n| :--- | :--- |\n| 📋 **Title** | **${summary}** |\n| 👤 **Assignee** | **${assignee}** |\n| ⚡ **Sprint** | \`${sprintName}\` |\n| 🏷️ **Độ ưu tiên** | \`${priority}\` |\n| 📁 **Trạng thái Workspace** | ${gherkinBadge} ᐧ ${autoScriptBadge} |\n| 💡 **Lệnh đề xuất** | \`${suggestedCommand}\` |\n`;

  outputResults.push({
    json: {
      isReadyToTest: true,
      ignored: false,
      issueKey,
      summary,
      assignee,
      priority,
      sprintName,
      gherkinBadge,
      autoScriptBadge,
      hasGherkin,
      hasAutoScript,
      suggestedCommand,
      suggestedCommands,
      situationSummary,
      reportText,
      mattermostPayload: {
        text: reportText,
        username: 'Jira QA Bot',
        icon_emoji: ':dart:'
      }
    }
  });

  // Ghi nhận vào cache
  notifiedCache[issueKey] = new Date().toISOString();
  cacheUpdated = true;
}

// Lưu cache mới vào disk
if (cacheUpdated) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(notifiedCache, null, 2), 'utf8');
  } catch (_) {}
}

if (outputResults.length === 0) {
  return [{
    json: {
      isReadyToTest: false,
      ignored: true,
      reason: 'Không có issue nào mới chuyển sang Ready to test.',
      issueKey: ''
    }
  }];
}

return outputResults;
