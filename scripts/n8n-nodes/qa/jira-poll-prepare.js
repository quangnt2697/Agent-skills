const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

// Board 61: "G.3.1 - Partners & Open API" (Project G3PTP)
// JQL tìm các task thuộc Board 61 trong open sprints có trạng thái Ready to Test
const searchUrl = `${baseUrl}/rest/api/3/search/jql`;
const searchBody = {
  jql: "project = G3PTP AND \"G3 Team[Dropdown]\" = 3.1 AND sprint in openSprints() AND status in ('Ready to test', 'Ready to Test', 'Ready for Testing') ORDER BY updated DESC",
  fields: ["summary", "status", "assignee", "priority", "updated", "created", "customfield_10020", "customfield_10010", "sprint"],
  maxResults: 25
};

return [{
  json: {
    baseUrl,
    authHeader,
    searchUrl,
    searchBody,
    _triggerSource: 'schedule'
  }
}];
