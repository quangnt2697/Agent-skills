#!/usr/bin/env node
/**
 * GitLab MCP - Launcher
 * Đọc credentials từ `.env` rồi spawn `@zereight/mcp-gitlab` qua npx,
 * forward stdio nguyên vẹn để giữ đúng giao thức MCP (stdin/stdout).
 *
 * Lý do cần launcher này: mcp_config.json không hỗ trợ nội suy biến môi
 * trường dạng ${VAR} — các host (Claude Desktop/Antigravity/Gemini CLI)
 * không tự đọc `.env`. Package bên thứ 3 cũng không tự loadEnv như
 * atlassian-mcp-proxy.js hay squash-tm-mcp.js, nên phải bơm env trước khi spawn.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] || '';
            value = value.replace(/(^['"]|['"]$)/g, '').trim();
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    });
}

const projectRoot = path.join(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));

if (!process.env.GITLAB_API_URL || !process.env.GITLAB_PERSONAL_ACCESS_TOKEN) {
    console.error('LỖI: Thiếu GITLAB_API_URL hoặc GITLAB_PERSONAL_ACCESS_TOKEN trong .env');
    process.exit(1);
}

// BẤT BIẾN: server này CHỈ được phép đọc, không phụ thuộc giá trị trong .env.
// Nếu .env bị sửa nhầm thành modify/full, launcher vẫn ép lại readonly ở đây.
if (process.env.GITLAB_PERMISSION_MODE !== 'readonly') {
    console.error(
        `CẢNH BÁO: .env đặt GITLAB_PERMISSION_MODE="${process.env.GITLAB_PERMISSION_MODE}" ` +
        `nhưng launcher này chỉ cho phép "readonly". Đang ép về readonly.`
    );
}
process.env.GITLAB_PERMISSION_MODE = 'readonly';

// Lớp chặn thứ 2, độc lập với PERMISSION_MODE: deny bất kỳ tool nào có tên
// bắt đầu bằng create_/update_/delete_/push_/merge_/approve_/unapprove_/
// resolve_/retry_/cancel_/mark_ — phòng trường hợp bản mới của package đổi
// hành vi default của readonly mode.
process.env.GITLAB_DENIED_TOOLS_REGEX =
    '^(create_|update_|delete_|push_|merge_|approve_|unapprove_|resolve_|retry_|cancel_|mark_)';

const child = spawn(
    'npx',
    ['-y', '@zereight/mcp-gitlab@2.1.54'],
    { env: process.env, stdio: 'inherit' }
);

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
    console.error('Lỗi khởi động gitlab-mcp:', err);
    process.exit(1);
});

const forwardSignal = (sig) => {
    if (child && !child.killed) {
        child.kill(sig);
    }
};
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

