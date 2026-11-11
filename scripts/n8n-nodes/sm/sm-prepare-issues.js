const input = $input.first();
const sprintData = (input && input.json) || {};
const prepNode = $('Prepare Standup Request').first()?.json || {};
const baseUrl = prepNode.baseUrl || (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const authHeader = prepNode.authHeader || '';
const boardId = prepNode.boardId || (parseInt(($env && $env.JIRA_BOARD_ID) || '', 10) || null);
const triggerSource = prepNode._triggerSource || 'internal';

const sprints = sprintData.values || [];
if (!sprints || sprints.length === 0) {
  return [{
    json: {
      isError: true,
      error: `Không tìm thấy Sprint đang hoạt động trên Board ${boardId || ''}`,
      reportText: `🚨 **[Lỗi Báo Cáo Daily Standup]** Không tìm thấy Sprint đang hoạt động (active) trên Board ${boardId || ''}.\n> Vui lòng kiểm tra lại trạng thái Sprint tại Jira board.`,
      totalIssues: 0,
      stuckCount: 0,
      _triggerSource: triggerSource
    }
  }];
}

const activeSprint = sprints[0];
const sprintId = activeSprint.id;
const sprintName = activeSprint.name;

const spCustomField = ($env && $env.JIRA_STORY_POINTS_FIELD) || 'customfield_10028';
const issuesUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?maxResults=200&fields=summary,status,assignee,${spCustomField},customfield_10022,customfield_10026,timeoriginalestimate,priority,created,updated,issuetype&expand=changelog,names`;

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
