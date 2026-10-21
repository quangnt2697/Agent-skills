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

# Lấy danh sách file thay đổi hoặc chưa track trong workspace/
CHANGED_FILES="$(git status --porcelain workspace/ 2>/dev/null || true)"

if [[ -n "$CHANGED_FILES" ]]; then
  # Tạo file auto-save.json ghi nhận trạng thái
  cat << EOF > "$CHECKPOINT_DIR/auto-save.json"
{
  "timestamp": "$TIMESTAMP",
  "branch": "$CURRENT_BRANCH",
  "auto_saved": true,
  "summary": "Phiên làm việc tự động lưu khi kết thúc session",
  "changed_workspace_files": $(echo "$CHANGED_FILES" | jq -R . | jq -s .)
}
EOF
  echo "[agent-skills hooks] Đã tự động lưu snapshot phiên vào $CHECKPOINT_DIR/auto-save.json" >&2
fi

exit 0
