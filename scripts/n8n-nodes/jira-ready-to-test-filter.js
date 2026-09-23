/**
 * Node Script: Jira Ready To Test Filter (`scripts/n8n-nodes/jira-ready-to-test-filter.js`)
 *
 * Mục đích (WF-11):
 * - Lắng nghe sự kiện webhook từ Jira (`jira:issue_updated`).
 * - Lọc nghiêm ngặt 3 điều kiện:
 *   1. Thuộc Board G.3.1 (mã key `G3PTP-*` hoặc project `G.3.1` / `G3PTP`).
 *   2. Thuộc Sprint hiện tại (Active Sprint: `sprint.state === 'active'`).
 *   3. Trạng thái chuyển đổi sang `"Ready to test"` (case-insensitive).
 * - Quét workspace local của `issueKey`:
 *   - Kiểm tra file `.feature`: có -> `"v gherkin file"`, không -> `"x gherkin file"`.
 *   - Kiểm tra file `steps/test-*.py` (hoặc `test_*.py`): có -> `"v autoscript test"`, không -> `"x autoscript test"`.
 * - Đưa ra gợi ý lệnh tương ứng tùy theo tình trạng file.
 * - Soạn thẻ Markdown gửi thông báo về Mattermost.
 */

const fs = require('fs');
const path = require('path');

const input = $input.first();
const raw = (input && input.json) || {};
const body = raw.body || raw;

// 1. Trích xuất thông tin issue và changelog
const issue = body.issue || raw.issue || body;
const changelog = body.changelog || raw.changelog || {};
const issueKey = (issue.key || body.issueKey || raw.issueKey || '').toUpperCase().trim();
const fields = issue.fields || {};

// 2. Điều kiện 1: Board G.3.1
const projectKey = (fields.project?.key || '').toUpperCase();
const projectName = (fields.project?.name || '');
const isBoardG31 = issueKey.startsWith('G3PTP-') || projectKey === 'G3PTP' || projectName.includes('G.3.1') || (body.boardName || '').includes('G.3.1');

// 3. Điều kiện 2: Active Sprint
let isActiveSprint = false;
let sprintName = 'Active Sprint';

// Jira có thể lưu sprint ở fields.sprint hoặc customfield
const sprintField = fields.sprint || fields.customfield_10020 || fields.customfield_10010;
if (Array.isArray(sprintField)) {
  const activeS = sprintField.find(s => (s.state || '').toLowerCase() === 'active');
  if (activeS) {
    isActiveSprint = true;
    sprintName = activeS.name || sprintName;
  } else if (sprintField.length > 0) {
    sprintName = sprintField[0].name || sprintName;
  }
} else if (sprintField && typeof sprintField === 'object') {
  isActiveSprint = (sprintField.state || '').toLowerCase() === 'active';
  sprintName = sprintField.name || sprintName;
} else if (typeof sprintField === 'string' && sprintField.toLowerCase().includes('state=active')) {
  isActiveSprint = true;
  const match = sprintField.match(/name=([^,]+)/);
  if (match) sprintName = match[1];
} else if (body.isCurrentSprint === true || body.isActiveSprint === true) {
  // Cho phép mock/test từ payload trực tiếp
  isActiveSprint = true;
}

// 4. Điều kiện 3: Status đổi sang "Ready to test"
let isStatusReadyToTest = false;
const items = Array.isArray(changelog.items) ? changelog.items : [];

for (const item of items) {
  if ((item.field || '').toLowerCase() === 'status') {
    const toStr = (item.toString || item.to || '').toLowerCase().trim();
    if (toStr === 'ready to test' || toStr === 'ready for testing' || toStr === 'sẵn sàng kiểm thử') {
      isStatusReadyToTest = true;
      break;
    }
  }
}

// Nếu gửi trực tiếp qua webhook test có field status
if (!isStatusReadyToTest && (fields.status?.name || body.status || '').toLowerCase().trim() === 'ready to test') {
  isStatusReadyToTest = true;
}

// Kiểm tra 3 điều kiện
if (!isBoardG31 || !isActiveSprint || !isStatusReadyToTest) {
  return [{
    json: {
      isReadyToTest: false,
      ignored: true,
      reason: `Bỏ qua sự kiện: isBoardG31=${isBoardG31}, isActiveSprint=${isActiveSprint}, isStatusReadyToTest=${isStatusReadyToTest}`,
      issueKey
    }
  }];
}

// 5. Quét Workspace Local để kiểm tra file
const candidateRoots = [
  ($env && $env.AGENT_WORKSPACE_DIR) || '/Users/qa-quangnt/Desktop/Project/Test/agent-skills',
  '/Users/qa-quangnt/Desktop/Project/Test/agent-skills'
];

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
      // Quét thêm đệ quy mức nông trong wsDir
      try {
        const allFiles = fs.readdirSync(wsDir);
        hasGherkin = allFiles.some(f => f.endsWith('.feature'));
      } catch (_) {}
    }

    // B. Kiểm tra file test script (steps/test-*.py hoặc steps/test_*.py hoặc test/test_*.py)
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

// 5. Đánh dấu icon thiếu (❌) hoặc đủ (✅) theo yêu cầu người dùng
const gherkinBadge = hasGherkin ? '✅ Gherkin file' : '❌ Gherkin file';
const autoScriptBadge = hasAutoScript ? '✅ Autoscript test' : '❌ Autoscript test';

// 6. Gợi ý lệnh tùy theo tình trạng file - MỖI LỆNH ĐỨNG RIÊNG BIỆT TRÊN MỘT DÒNG
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

const suggestedCommand = commandList[0]?.cmd || `/qa-full-pipeline ${issueKey}`;
const suggestedCommands = commandList.map(c => c.cmd);

// 7. Tạo thẻ thông báo Mattermost bắt mắt và chuyên nghiệp
const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const jiraUrl = `${baseUrl}/browse/${issueKey}`;
const summary = fields.summary || body.summary || '-';
const assignee = fields.assignee?.displayName || body.assignee || '-';
const priority = fields.priority?.name || body.priority || 'Medium';

// Định dạng danh sách lệnh gợi ý — mỗi lệnh đứng ở 1 dòng riêng biệt
const commandsBlock = commandList.map(c => `- **${c.label}**\n  \`${c.cmd}\``).join('\n');

const reportText = `### 🎯 READY TO TEST — [${issueKey}](${jiraUrl})

| Thông Tin | Chi Tiết |
| :--- | :--- |
| 📋 **Title** | **${summary}** |
| 👤 **Assignee** | **${assignee}** |
| ⚡ **Sprint** | \`${sprintName}\` |
| 🏷️ **Độ ưu tiên** | \`${priority}\` |
| 📁 **Trạng thái Workspace** | ${gherkinBadge} ᐧ ${autoScriptBadge} |

---

#### 🔍 Chi Tiết Kiểm Tra Workspace Local:
- **Kịch bản BDD:** ${hasGherkin ? '✅ **Đã có kịch bản**' : '❌ **Chưa có kịch bản**'} (\`workspace/${issueKey}/test/*.feature\`)
- **Mã kiểm thử:** ${hasAutoScript ? '✅ **Đã có mã automation test**' : '❌ **Chưa có mã automation test**'} (\`workspace/${issueKey}/test/steps/test-*.py\`)
> 📌 *Hiện trạng:* ${situationSummary}

---

#### 💡 Lệnh Đề Xuất Thực Hiện:
${commandsBlock}`;

return [{
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
      text: reportText
    }
  }
}];
