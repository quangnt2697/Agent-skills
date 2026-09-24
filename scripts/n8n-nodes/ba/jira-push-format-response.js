const input = $input.first();
const json = (input && input.json) || {};

let specContext = {};
try {
  specContext = $('Pre-flight Gate & ADF Converter').first()?.json || {};
} catch (e) {}

const triggerSource = specContext._triggerSource || json._triggerSource || 'mattermost';
const issueKey = specContext.issueKey || json.issueKey || '';
const userName = specContext.userName || json.userName || 'User';
const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const jiraUrl = `${baseUrl}/browse/${issueKey}`;

// 1. Trường hợp có lỗi từ bước Resolve hoặc Pre-flight
if (specContext.isError || json.isError) {
  return [{
    json: {
      success: false,
      isError: true,
      issueKey,
      reportText: specContext.reportText || json.reportText || 'Lỗi không xác định trong quá trình chuẩn bị spec.',
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 2. Trường hợp Dry Run
if (specContext.dryRun) {
  const dryRunMsg = `🧪 **[DRY RUN - Xem Trước Spec ADF]** Cho ticket [${issueKey}](${jiraUrl}):\n` +
                    `- **Nguồn file:** \`${specContext.filePath}\` (${specContext.specType || 'Spec'})\n` +
                    `- **Thống kê ADF:** ${specContext.blockCount || 0} blocks (gồm ${specContext.tableCount || 0} bảng nghiệp vụ, ${specContext.scenarioCount || 0} Scenarios AC)\n` +
                    `- **Sơ đồ phát hiện:** ${specContext.diagramFiles?.length || 0} sơ đồ diagrams\n` +
                    `> *Lưu ý: Chế độ Dry Run chỉ kiểm tra cú pháp và cấu trúc ADF, không ghi đè dữ liệu lên Jira.*`;
  return [{
    json: {
      success: true,
      isDryRun: true,
      issueKey,
      reportText: dryRunMsg,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 3. Trường hợp Live Push - kiểm tra phản hồi từ Jira API
if (json.error || json.errorMessages || (json.status && json.status >= 400)) {
  const errMsg = (json.errorMessages && json.errorMessages.join(', ')) ||
                 (json.error && (json.error.message || json.error.description)) ||
                 'Lỗi không xác định từ Jira REST API';
  const failText = `🚨 **[Lỗi Ghi Đè Jira]** Không thể cập nhật Description cho ticket [${issueKey}](${jiraUrl}):\n> ${errMsg}\n\n*Gợi ý: Kiểm tra quyền hạn của tài khoản hoặc cấu trúc ADF trong .env.*`;
  return [{
    json: {
      success: false,
      isError: true,
      issueKey,
      reportText: failText,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

const formattedUser = userName ? (userName.startsWith('@') ? userName : '@' + userName) : '@User';
const projectTag = specContext.project ? specContext.project + ' ' : '';

const successMsg = `### 🚀 Đẩy Đặc Tả Lên Jira Thành Công!
- **Ticket:** **[${issueKey}](${jiraUrl})**
- **Nguồn spec:** \`${specContext.filePath}\` (*${specContext.specType || 'Spec'}*)
- **Dự án/Cluster:** \`${specContext.project || 'Tự động phát hiện'}\`
- **Thống kê ADF:** **${specContext.blockCount || 0}** blocks (gồm **${specContext.tableCount || 0}** bảng nghiệp vụ, **${specContext.scenarioCount || 0}** Scenarios AC)
- **Sơ đồ liên quan:** ${specContext.diagramFiles?.length > 0 ? ('✅ ' + specContext.diagramFiles.length + ' file sơ đồ') : 'Không có sơ đồ riêng'}
- **Người thực hiện:** ${formattedUser}

---
💡 **Gợi ý bước tiếp theo theo quy trình BA/QA Pipeline:**
- \`/agent ${projectTag}push-squash ${issueKey}\` để đẩy kịch bản Gherkin (.feature) lên Squash TM
- \`/agent ${projectTag}run-test ${issueKey}\` để chạy kiểm thử tự động`;

return [{
  json: {
    success: true,
    isError: false,
    issueKey,
    jiraUrl,
    filePath: specContext.filePath,
    reportText: successMsg,
    _triggerSource: triggerSource,
    userName
  }
}];
