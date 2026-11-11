const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

const projectKey = ($env && $env.JIRA_PROJECT_KEY) || '';
const teamName = ($env && $env.JIRA_TEAM_NAME) || '';
const projectClause = projectKey ? `project = ${projectKey} AND ` : '';
const teamClause = teamName ? `("G3 Team[Dropdown]" = '${teamName}' OR "Team" = '${teamName}') AND ` : '';
const sprintField = ($env && $env.JIRA_SPRINT_CUSTOM_FIELD) || '';

// JQL tìm các task thuộc project trong open sprints có trạng thái Ready to Test
const searchUrl = `${baseUrl}/rest/api/3/search/jql`;
const searchBody = {
  jql: `${projectClause}${teamClause}sprint in openSprints() AND status in ('Ready to test', 'Ready to Test', 'Ready for Testing') ORDER BY updated DESC`,
  fields: ["summary", "status", "assignee", "priority", "updated", "created", sprintField, "sprint", "project"].filter(Boolean),
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
