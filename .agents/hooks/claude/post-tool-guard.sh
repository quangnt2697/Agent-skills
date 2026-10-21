#!/usr/bin/env bash
# ==============================================================================
# Claude Code PostToolUse Adapter: Auto-format artifacts (.feature, .json, .md)
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")"

if [[ -n "$FILE_PATH" && -f "$FILE_PATH" ]]; then
  bash "${CLAUDE_PROJECT_DIR:-.}/.agents/hooks/core/auto-format.sh" "$FILE_PATH"
fi

exit 0
