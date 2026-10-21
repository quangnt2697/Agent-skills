#!/usr/bin/env bash
# ==============================================================================
# Rule 4 & Security Guard: Quét và chặn rò rỉ bí mật / token / private key
# Dùng chung cho cả Claude Code và Antigravity PreToolUse hooks
# ==============================================================================
set -euo pipefail

TARGET_PATH="${1:-}"
CONTENT="${2:-}"

# Nếu không truyền qua tham số, thử đọc từ stdin
if [[ -z "$TARGET_PATH" || -z "$CONTENT" ]]; then
  if [ ! -t 0 ]; then
    STDIN_DATA="$(cat)"
    if [[ -z "$TARGET_PATH" ]]; then
      TARGET_PATH="$(echo "$STDIN_DATA" | jq -r '
        .toolCall.args.TargetFile //
        .tool_input.file_path //
        .toolCall.args.path //
        .tool_input.path //
        empty' 2>/dev/null || echo "")"
    fi
    if [[ -z "$CONTENT" ]]; then
      CONTENT="$(echo "$STDIN_DATA" | jq -r '
        .toolCall.args.CodeContent //
        .toolCall.args.ReplacementContent //
        .tool_input.content //
        .tool_input.new_string //
        empty' 2>/dev/null || echo "")"
    fi
  fi
fi

# Ngoại lệ hợp lệ: Bỏ qua thư mục test fixtures của eval
if [[ "$TARGET_PATH" =~ evals/fixtures/ || "$TARGET_PATH" =~ scripts/tests/ ]]; then
  exit 0
fi

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# 1. Quét Private Key (RSA, EC, OPENSSH...)
if echo "$CONTENT" | grep -qE -- "-----BEGIN [A-Z ]*PRIVATE KEY-----"; then
  cat >&2 << EOF
================================================================================
❌ [LỖI BẢO MẬT] PHÁT HIỆN PRIVATE KEY DẠNG THÔ TRONG NỘI DUNG GHI!
--------------------------------------------------------------------------------
File: $TARGET_PATH
Nguyên nhân: Phát hiện khối '-----BEGIN PRIVATE KEY-----' trong nội dung chuẩn bị ghi.
Cách khắc phục: CẤM TUYỆT ĐỐI ghi private key vào mã nguồn hoặc tài liệu.
Sử dụng đường dẫn file key hoặc cấu hình biến môi trường an toàn.
================================================================================
EOF
  exit 2
fi

# 2. Quét JWT token thật (3 phần cách nhau bởi dấu chấm, tối thiểu 40 ký tự)
# Ngoại lệ: chuỗi placeholder như eyJ...xxx hoặc <token>
if echo "$CONTENT" | grep -qE "eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]{10,}"; then
  if ! echo "$CONTENT" | grep -qE "(example|mock|placeholder|<token>|xxx)"; then
    cat >&2 << EOF
================================================================================
❌ [LỖI BẢO MẬT] PHÁT HIỆN JWT TOKEN THỰC TẾ TRONG NỘI DUNG GHI!
--------------------------------------------------------------------------------
File: $TARGET_PATH
Nguyên nhân: Phát hiện chuỗi có định dạng JWT token thật (Bearer token).
Cách khắc phục: BẮT BUỘC mask token (ví dụ: eyJhbGci...<masked>) hoặc dùng process.env.
================================================================================
EOF
    exit 2
  fi
fi

exit 0
