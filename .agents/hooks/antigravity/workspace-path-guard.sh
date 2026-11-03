#!/usr/bin/env bash
# ==============================================================================
# Antigravity PreToolUse Adapter: Workspace Path Guard + Secrets Guard
# Contract: In JSON {"decision": "allow" | "deny" | "ask", "reason": "..."}
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

INPUT="$(cat)"

# Hỗ trợ cả Antigravity/Gemini (Path, Content, Replacement) và Claude/Cortex (TargetFile, CodeContent)
TARGET="$(echo "$INPUT" | jq -r '
  .toolCall.args.Path //
  .toolCall.args.TargetFile //
  .toolCall.args.path //
  .toolCall.args.file_path //
  empty' 2>/dev/null || echo "")"

CONTENT="$(echo "$INPUT" | jq -r '
  .toolCall.args.Content //
  .toolCall.args.Replacement //
  .toolCall.args.CodeContent //
  .toolCall.args.ReplacementContent //
  .toolCall.args.content //
  .toolCall.args.new_string //
  empty' 2>/dev/null || echo "")"

# 1. Kiểm tra Workspace Path Boundary
if [[ -n "$TARGET" ]]; then
  PATH_ERR=""
  if ! PATH_ERR="$(bash "$REPO_ROOT/.agents/hooks/core/check-workspace-path.sh" "$TARGET" 2>&1 >/dev/null)"; then
    jq -n --arg reason "$PATH_ERR" '{"decision": "deny", "reason": $reason}'
    exit 0
  fi
fi

# 2. Kiểm tra Secrets Leak
if [[ -n "$CONTENT" ]]; then
  SEC_ERR=""
  if ! SEC_ERR="$(bash "$REPO_ROOT/.agents/hooks/core/check-secrets.sh" "$TARGET" "$CONTENT" 2>&1 >/dev/null)"; then
    jq -n --arg reason "$SEC_ERR" '{"decision": "deny", "reason": $reason}'
    exit 0
  fi
fi

echo '{"decision": "allow"}'
exit 0
