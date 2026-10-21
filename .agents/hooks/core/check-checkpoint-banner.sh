#!/usr/bin/env bash
# ==============================================================================
# check-checkpoint-banner.sh — Tạo thông báo nhắc khôi phục phiên nếu có checkpoint
# Dùng chung cho cả Claude Code và Antigravity session-start hook
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CHECKPOINT_FILE="$PROJECT_ROOT/.checkpoints/auto-save.json"

if [[ -f "$CHECKPOINT_FILE" ]] && command -v jq >/dev/null 2>&1; then
  TIMESTAMP="$(jq -r '.timestamp // "gần đây"' "$CHECKPOINT_FILE" 2>/dev/null || echo "gần đây")"
  BRANCH="$(jq -r '.branch // "hiện tại"' "$CHECKPOINT_FILE" 2>/dev/null || echo "hiện tại")"
  CHANGED_COUNT="$(jq -r '.changed_workspace_files | length // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")"

  echo "💡 [Khôi phục Phiên Làm Việc]"
  echo "Phát hiện snapshot dở dang từ phiên trước (lưu lúc $TIMESTAMP trên nhánh '$BRANCH', có $CHANGED_COUNT file workspace thay đổi)."
  echo "👉 Gõ lệnh '/load-checkpoint' để nạp lại ngữ cảnh và tiếp tục công việc."
  echo ""
fi
exit 0
