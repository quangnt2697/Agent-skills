/**
 * Node Script: Jira My Tasks Query Preparer (`scripts/n8n-nodes/atlassian/jira-my-tasks-query.js`)
 *
 * Chuẩn bị tham số truy vấn Jira Cloud API:
 * - Lọc tất cả task được assign cho người dùng hiện tại (currentUser() hoặc JIRA_MY_ACCOUNT_ID / JIRA_MY_EMAIL)
 * - Khung thời gian: cập nhật trong vòng 20 phút gần nhất (buffer chống miss giữa chu kỳ 5 phút)
 * - Mở rộng changelog để phát hiện chính xác trường nào thay đổi
 */

const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

const rawAccountId = ($env && $env.JIRA_MY_ACCOUNT_ID) ? String($env.JIRA_MY_ACCOUNT_ID).trim() : '';
const myAccountId = rawAccountId.split('?')[0].trim();
const myEmail = ($env && $env.JIRA_MY_EMAIL) ? String($env.JIRA_MY_EMAIL).trim() : email;

// Xây dựng mệnh đề JQL lọc assignee
let assigneeClause = 'assignee = currentUser()';
if (myAccountId && myEmail) {
  assigneeClause = `assignee in (currentUser(), "${myAccountId}", "${myEmail}")`;
} else if (myAccountId) {
  assigneeClause = `assignee in (currentUser(), "${myAccountId}")`;
} else if (myEmail) {
  assigneeClause = `assignee in (currentUser(), "${myEmail}")`;
}

// JQL tìm các task được assign cho tôi có cập nhật trong 20 phút qua
const jql = `${assigneeClause} AND updated >= -20m ORDER BY updated DESC`;
const searchUrl = `${baseUrl}/rest/api/3/search/jql`;

const searchBody = {
  jql,
  fields: [
    'summary',
    'status',
    'assignee',
    'priority',
    'reporter',
    'issuetype',
    'updated',
    'created',
    'comment',
    'customfield_10018', // Sprint field (Jira Cloud)
    'customfield_10020',
    'description',
    'project'
  ],
  expand: 'changelog',
  maxResults: 30
};

return [{
  json: {
    baseUrl,
    authHeader,
    searchUrl,
    searchBody,
    myAccountId,
    myEmail,
    _triggerSource: 'schedule'
  }
}];

