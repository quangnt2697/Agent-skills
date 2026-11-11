/**
 * Node Script: Jira Action Skill Pre-Respond (`scripts/n8n-nodes/atlassian/jira-action-skill-pre-respond.js`)
 *
 * Chạy ngay sau Webhook để trả HTML tự động đóng tab cho trình duyệt siêu tốc (< 5ms):
 * - Browser nhận HTML và đóng tab tức thì, không bị treo chờ xử lý
 * - Truyền toàn bộ thông tin query sang các node thực thi phía sau
 */

const firstInput = (typeof $input !== 'undefined' && typeof $input.first === 'function') ? $input.first() : null;
const rawFirst = (firstInput && firstInput.json) || {};

const query = rawFirst.query || rawFirst;
const skill = String(query.skill || rawFirst.skill || '').trim().replace(/^\//, '');
const issueKey = String(query.issueKey || rawFirst.issueKey || '').toUpperCase().trim();

const SKILL_LABELS = {
  'ba-refine': 'Refine task',
  'ba-spec': 'Phân tích yêu cầu',
  'ba-push-jira': 'Cập nhật lên Jira',
  'qa-test-design': 'Thiết kế test',
  'qa-auto-design': 'Tạo kịch bản tự động',
  'qa-run-test': 'Thực thi test',
  'qa-full-pipeline': 'Kiểm thử toàn trình',
  'qa-squash-push': 'Đồng bộ Squash TM'
};
const skillLabel = SKILL_LABELS[skill] || 'Yêu cầu xử lý';

const autoCloseHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Đang xử lý</title>
  <script>
    try { window.open('', '_self').close(); } catch (_) {}
    try { window.close(); } catch (_) {}
    setTimeout(() => { try { window.close(); } catch (_) {} }, 50);
  </script>
</head>
<body style="background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border-radius:8px;border:1px solid #30363d;background:#161b22;max-width:420px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
    <div style="font-size:36px;margin-bottom:12px;">⚡</div>
    <h3 style="margin:0 0 8px 0;color:#58a6ff;">Đang thực hiện: ${skillLabel}</h3>
    <p style="margin:0 0 12px 0;font-size:14px;color:#8b949e;">Công việc: <strong>${issueKey || 'N/A'}</strong></p>
    <p style="margin:0;font-size:12px;color:#6e7681;">Cửa sổ này sẽ tự động đóng. Kết quả sẽ được gửi về kênh Slack.</p>
  </div>
</body>
</html>`;

return [{
  json: {
    ...rawFirst,
    skill,
    issueKey,
    autoCloseHtml
  }
}];

