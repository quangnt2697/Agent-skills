#!/usr/bin/env bash
# ==============================================================================
# Antigravity PreToolUse Adapter: Workspace Path Guard + Secrets Guard
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
TARGET="$(echo "$INPUT" | jq -r '.toolCall.args.TargetFile // empty' 2>/dev/null || echo "")"
CONTENT="$(echo "$INPUT" | jq -r '.toolCall.args.CodeContent // .toolCall.args.ReplacementContent // empty' 2>/dev/null || echo "")"

if [[ -n "$TARGET" ]]; then
  bash .agents/hooks/core/check-workspace-path.sh "$TARGET"
fi

if [[ -n "$CONTENT" ]]; then
  bash .agents/hooks/core/check-secrets.sh "$TARGET" "$CONTENT"
fi

exit 0
