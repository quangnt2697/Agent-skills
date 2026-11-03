#!/usr/bin/env bash
# ==============================================================================
# Antigravity PreToolUse Adapter: Branch Guard + QA Log Guard + Dangerous Command Guard
# Contract: In JSON {"decision": "allow" | "deny" | "ask", "reason": "..."}
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

INPUT="$(cat)"
CMD="$(echo "$INPUT" | jq -r '
  .toolCall.args.CommandLine //
  .toolCall.args.command //
  .tool_input.command //
  empty' 2>/dev/null || echo "")"

if [[ -z "$CMD" ]]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# 1. Chặn commit trực tiếp vào main/master
if echo "$CMD" | grep -qE "git[[:space:]]+commit"; then
  BRANCH_ERR=""
  if ! BRANCH_ERR="$(bash "$REPO_ROOT/.agents/hooks/core/check-branch.sh" 2>&1 >/dev/null)"; then
    jq -n --arg reason "$BRANCH_ERR" '{"decision": "deny", "reason": $reason}'
    exit 0
  fi
fi

# 2. Cổng hỏi xác nhận (ask) đối với các lệnh nguy hiểm / thay đổi môi trường
# Theo autonomy-contract.md Mục 2 (Trường hợp #5: Hành động không hoàn tác được bằng git revert)
if echo "$CMD" | grep -qE "git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f|git[[:space:]]+push[[:space:]]+.*(--force|-f)|(pip|pip3)[[:space:]]+install|npm[[:space:]]+(i|install)\b|rm[[:space:]]+-rf[[:space:]]+(/|~|\.\.)"; then
  REASON="⚠️ [AUTONOMY GUARD] Lệnh nhạy cảm/nguy hiểm phát hiện: '$CMD'. Hành động này có thể làm mất dữ liệu uncommitted hoặc thay đổi môi trường hệ thống. Vui lòng xác nhận trước khi tiếp tục."
  jq -n --arg reason "$REASON" '{"decision": "ask", "reason": $reason}'
  exit 0
fi

# 3. Chặn lệnh test không ghi log ra file
if echo "$CMD" | grep -qE "(pytest|behave)"; then
  LOG_ERR=""
  if ! LOG_ERR="$(bash "$REPO_ROOT/.agents/hooks/core/check-qa-log.sh" "$CMD" 2>&1 >/dev/null)"; then
    jq -n --arg reason "$LOG_ERR" '{"decision": "deny", "reason": $reason}'
    exit 0
  fi
fi

echo '{"decision": "allow"}'
exit 0
