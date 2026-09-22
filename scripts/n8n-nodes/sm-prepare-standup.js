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
const searchUrl = `${baseUrl}/rest/api/3/search?jql=sprint%20in%20openSprints()%20AND%20statusCategory%20!=%20Done&fields=summary,status,assignee,priority,updated`;

return [{
  json: {
    baseUrl,
    authHeader,
    searchUrl,
    _triggerSource: triggerSource
  }
}];
