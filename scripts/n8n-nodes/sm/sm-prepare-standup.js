const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;

let triggerSource = 'internal';
try {
  const trigNode = $('Webhook Trigger (sm-standup)').first();
  if (trigNode && trigNode.json && Object.keys(trigNode.json).length > 0) {
    triggerSource = 'webhook';
  }
} catch (e) {
  triggerSource = 'internal';
}

const baseUrl = (body.baseUrl || json.baseUrl || ($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

// Board 61: "G.3.1 - Partners & Open API" (Project G3PTP)
// URL chuẩn: https://entrade.atlassian.net/jira/software/c/projects/G3PTP/boards/61/backlog
const boardId = body.boardId || json.boardId || 61;

// Bước 1: Lấy Sprint đang hoạt động (active sprint) của riêng Board 61
const sprintUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active`;

return [{
  json: {
    baseUrl,
    boardId,
    authHeader,
    sprintUrl,
    _triggerSource: triggerSource
  }
}];
