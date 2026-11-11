#!/usr/bin/env bash
# ==============================================================================
# SessionEnd / Stop Hook: Tự động lưu checkpoint phiên làm việc khi kết thúc
# Dùng chung cho cả Claude Code và Antigravity
# ==============================================================================
set -euo pipefail

CHECKPOINT_DIR=".checkpoints"
mkdir -p "$CHECKPOINT_DIR"

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "HEAD")"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Lấy danh sách file thay đổi trong workspace/
# Vì workspace/ nằm trong .gitignore, kết hợp quét file thực tế và git status
CHANGED_FILES="$(git status --porcelain workspace/ 2>/dev/null || true)"

# Quét snapshot file thực tế trong workspace/
WORKSPACE_SNAPSHOT="$(node -e '
const fs = require("fs");
const path = require("path");
const ws = "workspace";
const files = [];
if (fs.existsSync(ws)) {
  function walk(d) {
    try {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.name.startsWith(".")) continue;
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          const stat = fs.statSync(p);
          files.push({ path: p, mtime: stat.mtimeMs, size: stat.size });
        }
      }
    } catch (_) {}
  }
  walk(ws);
}
console.log(JSON.stringify(files));
' 2>/dev/null || echo "[]")"

FILE_COUNT="$(echo "$WORKSPACE_SNAPSHOT" | jq 'length' 2>/dev/null || echo "0")"

if [[ -n "$CHANGED_FILES" || "$FILE_COUNT" -gt 0 ]]; then
  # Tạo file auto-save.json ghi nhận trạng thái
  cat << EOF > "$CHECKPOINT_DIR/auto-save.json"
{
  "timestamp": "$TIMESTAMP",
  "branch": "$CURRENT_BRANCH",
  "auto_saved": true,
  "summary": "Phiên làm việc tự động lưu khi kết thúc session",
  "git_status": $(echo "$CHANGED_FILES" | jq -R . | jq -s .),
  "changed_workspace_files": $(echo "$WORKSPACE_SNAPSHOT" | jq '[.[].path]'),
  "workspace_files_snapshot": $WORKSPACE_SNAPSHOT
}
EOF
  echo "[agent-skills hooks] Đã tự động lưu snapshot phiên vào $CHECKPOINT_DIR/auto-save.json ($FILE_COUNT files)" >&2
fi

exit 0
