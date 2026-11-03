const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;
const params = body.params || json.params || {};

// 1. Nhận diện nguồn gọi
let triggerSource = 'internal';
try {
  const trigWebhook = $('Webhook Trigger (jira-prep)').first();
  if (trigWebhook && trigWebhook.json) {
    triggerSource = 'webhook';
  }
} catch (_) {}

// 2. Trích xuất thông số
const issueKey = (params.issueKey || body.issueKey || json.issueKey || '').trim().toUpperCase();
const project = (params.project || body.project || json.project || '').trim();
const userName = json.userName || body.userName || json.user_name || body.user_name || 'User';

const baseUrl = (body.baseUrl || json.baseUrl || ($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

const fields = 'summary,description,status,assignee,priority,attachment,issuelinks,reporter,labels,sprint,customfield_10018,customfield_10020,customfield_10016,issuetype,components,subtasks,parent,comment';
const jiraApiUrl = `${baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`;

return [{
  json: {
    issueKey,
    project,
    userName,
    baseUrl,
    authHeader,
    jiraApiUrl,
    _triggerSource: triggerSource,
    _originalInput: json
  }
}];
