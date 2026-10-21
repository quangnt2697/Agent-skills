#!/usr/bin/env bash
# ==============================================================================
# Antigravity PreToolUse Adapter: Branch Guard + QA Log Guard
# ==============================================================================
set -euo pipefail

INPUT="$(cat)"
CMD="$(echo "$INPUT" | jq -r '.toolCall.args.CommandLine // empty' 2>/dev/null || echo "")"

if [[ -n "$CMD" ]]; then
  if [[ "$CMD" =~ git[[:space:]]+commit ]]; then
    bash .agents/hooks/core/check-branch.sh
  fi

  if [[ "$CMD" =~ (pytest|behave) ]]; then
    bash .agents/hooks/core/check-qa-log.sh "$CMD"
  fi
fi

exit 0
