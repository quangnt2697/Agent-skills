const input = $input.first();
const res = (input && input.json) || {};

if (res.isError) {
  return [{ json: res }];
}

const meta = res.syncMeta || {};
const issueKey = res.issueKey || '';
const featureFile = res.featureFile || '';
const tcId = meta.testCaseId;
const tcName = meta.testCaseName || `${issueKey}-${res.namejira}`;
const sprintName = meta.sprintName || 'Sprint mới nhất';
const sprintReqId = meta.sprintReqVersionId;
const baseUrl = (($env && $env.SQUASH_BASE_URL) || 'https://tm.dnse.com.vn/squash').replace(/\/+$/, '');

const tcLink = tcId ? `[#${tcId} - ${tcName}](${baseUrl}/test-case-workspace/test-case/${tcId})` : `\`${tcName}\``;
const campaignStatus = sprintReqId 
  ? `✅ **Đã gán vào Requirement Test Plan** (sprint-req-version: \`#${sprintReqId}\`)` 
  : `⚠️ *Chưa tìm thấy Requirement tương ứng trong Sprint để tự động gán*`;

const reportText = `### 🧪 Kết Quả Đẩy Kịch Bản Gherkin Lên Squash TM
- **Ticket:** **${issueKey}** ${res.project ? '(`' + res.project + '`)' : ''}
- **Kịch bản nguồn:** \`${featureFile}\`
- **Thư mục Sprint:** \`${sprintName}\`
- **Test Case Workspace:** ${tcLink}
- **Nội dung BDD:** ✅ Đã nạp toàn bộ kịch bản Gherkin (.feature) vào trường script.
- **Campaign Workspace:** ${campaignStatus}
- **Truy vết Local:** Đã lưu metadata tại \`workspace/${issueKey}/test/squash_sync.json\``;

return [{
  json: {
    ...res,
    reportText
  }
}];
