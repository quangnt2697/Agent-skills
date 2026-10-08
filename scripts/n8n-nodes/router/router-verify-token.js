// Cổng xác thực cho webhook /agent: n8n được public qua ngrok nên mọi request
// phải chứng minh đến từ Mattermost Slash Command trước khi chạy bất kỳ workflow nào.
//   MATTERMOST_SLASH_TOKEN   — token Mattermost cấp khi tạo Slash Command (bắt buộc)
//   MATTERMOST_ALLOWED_USERS — danh sách user_name cách nhau bởi dấu phẩy (tuỳ chọn)
const crypto = require('crypto');

const expected = ($env.MATTERMOST_SLASH_TOKEN || '').trim();
if (!expected) {
  throw new Error('MATTERMOST_SLASH_TOKEN chưa được cấu hình trong .env — từ chối mọi request /agent.');
}

const item = $input.first();
const json = (item && item.json) || {};
const body = json.body || json;

const provided = String(body.token || '');
const a = Buffer.from(provided);
const b = Buffer.from(expected);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new Error('Token Mattermost không hợp lệ — request bị từ chối.');
}

const allowed = ($env.MATTERMOST_ALLOWED_USERS || '')
  .split(',')
  .map(u => u.trim().toLowerCase())
  .filter(Boolean);
const userName = String(body.user_name || '').toLowerCase();
if (allowed.length && !allowed.includes(userName)) {
  throw new Error(`User "${body.user_name || ''}" không nằm trong MATTERMOST_ALLOWED_USERS.`);
}

return $input.all();
