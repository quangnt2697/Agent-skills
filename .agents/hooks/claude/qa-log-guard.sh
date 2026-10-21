#!/usr/bin/env bash
# ==============================================================================
# Claude Code PreToolUse Adapter: Chặn pytest xả log vào chat
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
CMD="$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")"

if [[ -n "$CMD" ]]; then
  bash "${CLAUDE_PROJECT_DIR:-.}/.agents/hooks/core/check-qa-log.sh" "$CMD"
fi

exit 0
