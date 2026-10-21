const input = $input.first();
const sprintData = (input && input.json) || {};
const prepNode = $('Prepare Standup Request').first()?.json || {};
const baseUrl = prepNode.baseUrl || 'https://entrade.atlassian.net';
const authHeader = prepNode.authHeader || '';
const boardId = prepNode.boardId || 61;
const triggerSource = prepNode._triggerSource || 'mattermost';

const sprints = sprintData.values || [];
if (!sprints || sprints.length === 0) {
  return [{
    json: {
      isError: true,
      error: 'Không tìm thấy Sprint đang hoạt động trên Board 61',
      reportText: `🚨 **[Lỗi Báo Cáo Daily Standup]** Không tìm thấy Sprint đang hoạt động (active) trên Board 61 (G.3.1).\n> Vui lòng kiểm tra lại trạng thái Sprint tại: ${baseUrl}/jira/software/c/projects/G3PTP/boards/61/backlog`,
      totalIssues: 0,
      stuckCount: 0,
      _triggerSource: triggerSource
    }
  }];
}

const activeSprint = sprints[0];
const sprintId = activeSprint.id;
const sprintName = activeSprint.name;

// Bước 2: Lấy toàn bộ issues của active sprint thuộc Board 61 kèm customfield_10022 / customfield_10026 (Story Points) và changelog
const issuesUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?maxResults=200&fields=summary,status,assignee,customfield_10022,customfield_10026,timeoriginalestimate,priority,created,updated,issuetype&expand=changelog,names`;

return [{
  json: {
    baseUrl,
    boardId,
    sprintId,
    sprintName,
    activeSprint,
    authHeader,
    issuesUrl,
    isError: false,
    _triggerSource: triggerSource
  }
}];
