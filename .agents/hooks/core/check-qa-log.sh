#!/usr/bin/env bash
# ==============================================================================
# Rule 4.1 Enforcer: Chống xả toàn bộ log kiểm thử vào chat làm tràn context
# Dùng chung cho cả Claude Code và Antigravity PreToolUse hooks
# ==============================================================================
set -euo pipefail

CMD="${1:-}"

# Nếu không truyền qua $1, thử đọc từ stdin
if [[ -z "$CMD" ]]; then
  if [ ! -t 0 ]; then
    STDIN_DATA="$(cat)"
    CMD="$(echo "$STDIN_DATA" | jq -r '
      .toolCall.args.CommandLine //
      .tool_input.command //
      empty' 2>/dev/null || echo "")"
    if [[ -z "$CMD" ]]; then
      CMD="$STDIN_DATA"
    fi
  fi
fi

if [[ -z "$CMD" ]]; then
  exit 0
fi

# Kiểm tra nếu lệnh chạy kiểm thử pytest hoặc behave
if echo "$CMD" | grep -qE "(pytest|python3[[:space:]]+-m[[:space:]]+pytest|behave)"; then
  # Ngoại lệ hợp lệ: Kiểm tra cú pháp, help, collect-only, hoặc đã có chuyển hướng log (>, >>, | tee)
  if echo "$CMD" | grep -qE "(--help|-h|--collect-only|--version|>|tee)"; then
    exit 0
  fi

  cat >&2 << EOF
================================================================================
❌ [LỖI QA LOG EXEMPTION] LỆNH CHẠY TEST KHÔNG CÓ CHUYỂN HƯỚNG RA FILE LOG!
--------------------------------------------------------------------------------
Lệnh vi phạm: $CMD
Nguyên nhân: Vi phạm quy định Rule 4.1 & AGENTS.md (Cấm in full log vào chat làm tràn token).
Cách khắc phục: BẮT BUỘC gắn đuôi chuyển hướng 100% log ra file test-output.log:

👉 Chạy lại lệnh với đuôi chuyển hướng:
   $CMD > workspace/issues/<issueKey>/test/result/test-output.log 2>&1
================================================================================
EOF
  exit 2
fi

exit 0
