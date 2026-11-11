/**
 * Node Script: Jira My Tasks Delta Detector (`scripts/n8n-nodes/atlassian/jira-my-tasks-delta.js`)
 *
 * Phát hiện chính xác các thay đổi (delta) trên các task được assign cho người dùng:
 * 1. Task mới tạo trong chu kỳ (created)
 * 2. Được phân công lại cho tôi (reassigned_to_me)
 * 3. Chuyển trạng thái (status_changed)
 * 4. Cập nhật mô tả (description_updated)
 * 5. Có comment mới (comment_added)
 *
 * Tối ưu hóa chuẩn n8n-io/n8n:
 * - Sắp xếp changelog histories mới nhất lên đầu để lấy đúng trạng thái mới nhất
 * - Dùng mốc cutoffTime = prev.updated (khi đã có cache) hoặc (now - 25m) (khi chưa có cache)
 *   để chống lặp thông báo cũ khi task có nhiều cập nhật liên tiếp trong 25 phút
 * - Chống nhận diện nhầm khi Cold-Start (task cũ không bị gán thành "Task Mới")
 * - Bắt đa sự kiện độc lập trong cùng chu kỳ polling (Item Loop pattern)
 * - Dual-layer persistence: File cache `.cache/my-tasks-state.json` + staticData
 */

const fs = require('fs');
const path = require('path');

const firstInput = (typeof $input !== 'undefined' && typeof $input.first === 'function') ? $input.first() : null;
const rawFirst = (firstInput && firstInput.json) || {};

// Kiểm tra lỗi trả về từ Jira REST API (401/403/500/Network)
if (rawFirst.error || (Array.isArray(rawFirst.errorMessages) && rawFirst.errorMessages.length > 0)) {
  const rawErr = (Array.isArray(rawFirst.errorMessages) && rawFirst.errorMessages.join('; ')) ||
    (typeof rawFirst.error === 'object' ? (rawFirst.error.message || JSON.stringify(rawFirst.error)) : String(rawFirst.error));
  const cleanErr = String(rawErr).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  return [{
    json: {
      isApiError: true,
      issueKey: 'JIRA-ALERT',
      changeType: 'api_error',
      summary: 'Không thể kết nối tới Jira để kiểm tra công việc mới',
      issueType: 'Cảnh báo hệ thống',
      status: 'Gián đoạn',
      priority: 'Highest',
      reporter: 'Hệ thống',
      changeDetail: `Chi tiết: ${cleanErr || 'Vui lòng kiểm tra lại kết nối mạng hoặc tài khoản Jira.'}`
    }
  }];
}

const prepNode = (typeof $ !== 'undefined' && $('Prepare My Tasks Query')?.first()?.json) || {};
const rawAccountId = prepNode.myAccountId || ($env && $env.JIRA_MY_ACCOUNT_ID) || '';
const myAccountId = String(rawAccountId).split('?')[0].trim();
const myEmail = ((prepNode.myEmail || ($env && $env.JIRA_MY_EMAIL) || ($env && $env.ATLASSIAN_EMAIL) || '')).toLowerCase().trim();

let procCwd = '';
try {
  const proc = require('process');
  if (proc && typeof proc.cwd === 'function') procCwd = proc.cwd();
} catch (_) {}

const candidateRoots = [
  ($env && $env.AGENT_WORKSPACE_DIR),
  procCwd,
  '/Users/quang.nguyen3/Projects/Agent/agent-skills',
  '/workspace'
].filter(Boolean);

let primaryRoot = candidateRoots[0] || '';
for (const r of candidateRoots) {
  if (fs.existsSync(r)) {
    primaryRoot = r;
    break;
  }
}

// 1. Khởi tạo Dual-Layer Cache: $getWorkflowStaticData + File System
let staticData = {};
try {
  if (typeof $getWorkflowStaticData === 'function') {
    staticData = $getWorkflowStaticData('global');
  }
} catch (_) {}

const cacheDir = path.join(primaryRoot, '.cache');
const cacheFile = path.join(cacheDir, 'my-tasks-state.json');
let taskCache = staticData.taskCache || {};
let cacheUpdated = false;

try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (fs.existsSync(cacheFile)) {
    const diskCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8') || '{}');
    taskCache = { ...diskCache, ...taskCache };
  }
} catch (_) {}

const issues = Array.isArray(rawFirst.issues) ? rawFirst.issues : [];
const detectedEvents = [];
const now = new Date();
const windowMs = 25 * 60 * 1000; // 25 phút buffer cho poller 5 phút khi chưa có prev cache

for (const issue of issues) {
  const issueKey = (issue.key || '').toUpperCase().trim();
  const fields = issue.fields || {};
  if (!issueKey) continue;

  const assignee = fields.assignee || {};
  const assigneeAccountId = (assignee.accountId || '').trim();
  const assigneeEmail = (assignee.emailAddress || '').toLowerCase().trim();

  // Xác minh assignee thuộc về user
  const isMine = (myAccountId && assigneeAccountId === myAccountId) ||
                 (myEmail && assigneeEmail === myEmail) ||
                 (!myAccountId && !myEmail); // Fallback: JQL currentUser() đã lọc ở server Jira

  if (!isMine) continue;

  const statusName = fields.status?.name || 'Unknown';
  const updatedTime = fields.updated || issue.updated || '';
  const createdTime = fields.created || issue.created || '';
  const isRecentlyCreated = createdTime ? (now - new Date(createdTime)) <= windowMs : false;

  const comments = Array.isArray(fields.comment?.comments) ? fields.comment.comments : [];
  const commentCount = fields.comment?.total ?? comments.length;

  // Trích xuất description snippet
  let descText = '';
  if (typeof fields.description === 'string') {
    descText = fields.description;
  } else if (fields.description?.content) {
    try {
      descText = JSON.stringify(fields.description.content);
    } catch (_) {}
  }
  const descSnippet = descText.slice(0, 200);

  const prev = taskCache[issueKey];

  // Nếu đã có prev và mốc updated không mới hơn -> bỏ qua ngay
  if (prev && prev.updated && updatedTime && new Date(updatedTime) <= new Date(prev.updated)) {
    continue;
  }

  // Mốc thời gian chặn dưới (cutoffTime):
  // - Nếu đã có prev.updated: chỉ xét các thay đổi diễn ra SAU prev.updated (chống lặp sự kiện cũ!)
  // - Nếu chưa có prev: chỉ xét các thay đổi trong vòng 25 phút gần nhất
  const cutoffTime = (prev && prev.updated)
    ? new Date(prev.updated)
    : new Date(now.getTime() - windowMs);

  const rawHistories = (issue.changelog && issue.changelog.histories) || [];
  // Sắp xếp changelog giảm dần theo thời gian (mới nhất lên đầu)
  const sortedHistories = [...rawHistories].sort((a, b) => new Date(b.created) - new Date(a.created));

  let recentStatusChange = null;
  let recentAssigneeChange = null;
  let recentDescChange = false;

  for (const hist of sortedHistories) {
    const histTime = new Date(hist.created);
    // Chỉ xét các lịch sử mới hơn cutoffTime
    if (prev && prev.updated ? histTime <= cutoffTime : histTime < cutoffTime) break;

    for (const item of (hist.items || [])) {
      const fieldName = (item.field || '').toLowerCase();
      if (fieldName === 'status' && !recentStatusChange) {
        recentStatusChange = { from: item.fromString, to: item.toString, created: hist.created };
      } else if (fieldName === 'assignee' && !recentAssigneeChange) {
        recentAssigneeChange = { from: item.fromString, to: item.toString, toId: item.to, created: hist.created };
      } else if (fieldName === 'description') {
        recentDescChange = true;
      }
    }
  }

  // Kiểm tra comment mới nhất có mới hơn cutoffTime không
  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
  const latestCommentTime = latestComment?.updated || latestComment?.created || '';
  const isLatestCommentNew = latestCommentTime
    ? (prev && prev.updated ? new Date(latestCommentTime) > cutoffTime : new Date(latestCommentTime) >= cutoffTime)
    : false;

  let commentAuthor = latestComment?.author?.displayName || 'Thành viên';
  let commentBody = '';
  if (typeof latestComment?.body === 'string') {
    commentBody = latestComment.body;
  } else if (latestComment?.body?.content) {
    try {
      commentBody = latestComment.body.content
        .map(block => (block.content || []).map(c => c.text || '').join(''))
        .join(' ');
    } catch (_) {}
  }
  commentBody = String(commentBody).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const baseEvent = {
    issueKey,
    summary: fields.summary || '',
    issueType: fields.issuetype?.name || 'Task',
    status: statusName,
    priority: fields.priority?.name || 'Medium',
    reporter: fields.reporter?.displayName || '',
    assigneeName: assignee.displayName || '',
    updatedTime,
    threadTs: (prev && prev.threadTs) ? prev.threadTs : null,
    issue
  };

  // PHÂN LOẠI SỰ KIỆN:
  if (!prev) {
    // Trường hợp 1: Task chưa có trong cache
    if (isRecentlyCreated) {
      detectedEvents.push({
        ...baseEvent,
        changeType: 'created',
        changeDetail: 'Task mới được tạo và giao cho bạn'
      });
    } else {
      if (recentAssigneeChange && (recentAssigneeChange.toId === myAccountId || (myEmail && recentAssigneeChange.to?.toLowerCase().includes(myEmail)))) {
        detectedEvents.push({
          ...baseEvent,
          changeType: 'reassigned_to_me',
          changeDetail: `Được phân công từ: ${recentAssigneeChange.from || 'người khác'}`
        });
      }
      if (recentStatusChange) {
        detectedEvents.push({
          ...baseEvent,
          changeType: 'status_changed',
          fromStatus: recentStatusChange.from,
          toStatus: recentStatusChange.to,
          changeDetail: `${recentStatusChange.from} ➔ ${recentStatusChange.to}`
        });
      }
      if (isLatestCommentNew && commentBody) {
        detectedEvents.push({
          ...baseEvent,
          changeType: 'comment_added',
          commentAuthor,
          commentText: commentBody.slice(0, 150),
          changeDetail: `${commentAuthor}: "${commentBody.slice(0, 120)}${commentBody.length > 120 ? '...' : ''}"`
        });
      }
      if (recentDescChange) {
        detectedEvents.push({
          ...baseEvent,
          changeType: 'description_updated',
          changeDetail: 'Nội dung mô tả công việc vừa được cập nhật'
        });
      }
    }
    // Nếu là task cũ và không có sự kiện nào mới hơn cutoffTime: CHỈ lập baseline cache, KHÔNG báo spam!
  } else {
    // Trường hợp 2: Task đã có trong cache và có updatedTime > prev.updated
    let hasEvent = false;

    // A. Re-assigned sang cho tôi
    if (recentAssigneeChange && (recentAssigneeChange.toId === myAccountId || (myEmail && recentAssigneeChange.to?.toLowerCase().includes(myEmail)))) {
      detectedEvents.push({
        ...baseEvent,
        changeType: 'reassigned_to_me',
        changeDetail: `Được chuyển giao từ: ${recentAssigneeChange.from || 'thành viên khác'}`
      });
      hasEvent = true;
    }

    // B. Chuyển trạng thái (chỉ khi status thực sự khác prev.status hoặc có changelog status mới hơn prev.updated)
    if (prev.status !== statusName || recentStatusChange) {
      const fromSt = recentStatusChange?.from || prev.status;
      const toSt = recentStatusChange?.to || statusName;
      detectedEvents.push({
        ...baseEvent,
        changeType: 'status_changed',
        fromStatus: fromSt,
        toStatus: toSt,
        changeDetail: `${fromSt} ➔ ${toSt}`
      });
      hasEvent = true;
    }

    // C. Comment mới (chỉ khi số comment tăng hoặc có comment mới hơn prev.updated)
    if (commentCount > (prev.commentCount || 0) || (isLatestCommentNew && commentBody)) {
      detectedEvents.push({
        ...baseEvent,
        changeType: 'comment_added',
        commentAuthor,
        commentText: commentBody.slice(0, 150),
        changeDetail: `${commentAuthor}: "${commentBody.slice(0, 120)}${commentBody.length > 120 ? '...' : ''}"`
      });
      hasEvent = true;
    }

    // D. Cập nhật description
    if (recentDescChange || (prev.descSnippet !== undefined && descSnippet !== prev.descSnippet)) {
      detectedEvents.push({
        ...baseEvent,
        changeType: 'description_updated',
        changeDetail: 'Nội dung mô tả công việc vừa được cập nhật'
      });
    }
  }

  // Cập nhật trạng thái mới nhất vào cache (giữ nguyên threadTs nếu đã có)
  taskCache[issueKey] = {
    status: statusName,
    updated: updatedTime,
    commentCount,
    descSnippet,
    assignee: assigneeAccountId || assigneeEmail,
    summary: fields.summary || '',
    threadTs: (prev && prev.threadTs) ? prev.threadTs : null
  };
  cacheUpdated = true;
}

// Lưu cache bền vững
if (cacheUpdated) {
  if (staticData) staticData.taskCache = taskCache;
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(taskCache, null, 2), 'utf8');
  } catch (_) {}
}

if (detectedEvents.length === 0) {
  return []; // Không có thay đổi nào mới -> dừng luồng, không gửi Slack
}

return detectedEvents.map(evt => ({ json: evt }));
