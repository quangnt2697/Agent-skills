#!/usr/bin/env bash
# ==============================================================================
# Antigravity PostToolUse Adapter: Auto-format artifacts (.feature, .json)
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
TARGET="$(echo "$INPUT" | jq -r '.toolCall.args.TargetFile // empty' 2>/dev/null || echo "")"

if [[ -n "$TARGET" && -f "$TARGET" ]]; then
  bash .agents/hooks/core/auto-format.sh "$TARGET"
fi

exit 0
