const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;

let triggerSource = 'mattermost';
try {
  if ($('Webhook Trigger (sm-standup)').first()) {
    triggerSource = 'webhook';
  }
} catch (e) {
  triggerSource = 'mattermost';
}

const baseUrl = (body.baseUrl || json.baseUrl || ($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

// Migration: /rest/api/3/search?jql= đã bị xóa (HTTP 410, Atlassian CHANGE-2046)
// Endpoint mới: POST /rest/api/3/search/jql với body JSON
const searchUrl = `${baseUrl}/rest/api/3/search/jql`;
const searchMethod = 'POST';
const searchBody = {
  jql: 'sprint in openSprints() AND statusCategory != Done',
  fields: ['summary', 'status', 'assignee', 'priority', 'updated'],
  maxResults: 100
};

return [{
  json: {
    baseUrl,
    authHeader,
    searchUrl,
    searchMethod,
    searchBody,
    _triggerSource: triggerSource
  }
}];

