#!/usr/bin/env bash
# ==============================================================================
# Antigravity PostToolUse Adapter: Auto-format artifacts (.feature, .json)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INPUT="$(cat)"
TARGET="$(echo "$INPUT" | jq -r '.toolCall.args.Path // .toolCall.args.TargetFile // .toolCall.args.file_path // .toolCall.args.path // .tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")"

if [[ -n "$TARGET" && -f "$TARGET" ]]; then
  bash "$REPO_ROOT/.agents/hooks/core/auto-format.sh" "$TARGET"
fi

exit 0
