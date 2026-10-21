#!/usr/bin/env bash
# ==============================================================================
# Claude Code PreToolUse Adapter: Workspace Path Guard + Secrets Guard
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")"
CONTENT="$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null || echo "")"

if [[ -n "$FILE_PATH" ]]; then
  bash "${CLAUDE_PROJECT_DIR:-.}/.agents/hooks/core/check-workspace-path.sh" "$FILE_PATH"
fi

if [[ -n "$CONTENT" ]]; then
  bash "${CLAUDE_PROJECT_DIR:-.}/.agents/hooks/core/check-secrets.sh" "$FILE_PATH" "$CONTENT"
fi

exit 0
