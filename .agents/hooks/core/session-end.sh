#!/usr/bin/env bash
# ==============================================================================
# SessionEnd / Stop Hook: Tự động lưu checkpoint phiên làm việc khi kết thúc
# Dùng chung cho cả Claude Code và Antigravity
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CHECKPOINT_DIR="$PROJECT_ROOT/.checkpoints"
mkdir -p "$CHECKPOINT_DIR"

CURRENT_BRANCH="$(git -C "$PROJECT_ROOT" symbolic-ref --short HEAD 2>/dev/null || echo "HEAD")"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Lấy danh sách file thay đổi trong workspace/
# Vì workspace/ nằm trong .gitignore, kết hợp quét file thực tế và git status
CHANGED_FILES="$(git -C "$PROJECT_ROOT" status --porcelain workspace/ 2>/dev/null || true)"

# Quét snapshot file thực tế trong workspace/
WORKSPACE_SNAPSHOT="$(PROJECT_ROOT="$PROJECT_ROOT" node -e '
const fs = require("fs");
const path = require("path");
const root = process.env.PROJECT_ROOT;
const ws = path.join(root, "workspace");
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
          files.push({ path: path.relative(root, p), mtime: stat.mtimeMs, size: stat.size });
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
  # Tạo file auto-save.json an toàn qua jq (chống injection ký tự đặc biệt trong tên branch/file)
  jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg branch "$CURRENT_BRANCH" \
    --arg changed "$CHANGED_FILES" \
    --argjson snapshot "$WORKSPACE_SNAPSHOT" \
    '{
      timestamp: $timestamp,
      branch: $branch,
      auto_saved: true,
      summary: "Phiên làm việc tự động lưu khi kết thúc session",
      git_status: ($changed | split("\n") | map(select(length > 0))),
      changed_workspace_files: ($snapshot | map(.path)),
      workspace_files_snapshot: $snapshot
    }' > "$CHECKPOINT_DIR/auto-save.json"
  echo "[agent-skills hooks] Đã tự động lưu snapshot phiên vào $CHECKPOINT_DIR/auto-save.json ($FILE_COUNT files)" >&2
fi

exit 0
