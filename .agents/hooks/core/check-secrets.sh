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
        .toolCall.args.Path //
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

# Ngoại lệ hợp lệ: Bỏ qua thư mục test fixtures của eval (chặn path traversal ..)
NORM_PATH="${TARGET_PATH#./}"
if [[ ! "$NORM_PATH" =~ (^|/)\.\.(/|$) ]] && [[ "$NORM_PATH" =~ ^(evals/fixtures/|scripts/tests/) || "$NORM_PATH" =~ /agent-skills/(evals/fixtures|scripts/tests)/ ]]; then
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
# Kiểm tra trên từng dòng chứa pattern, loại trừ các dòng chứa placeholder
JWT_LINE="$(echo "$CONTENT" | grep -E "eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]{10,}" | grep -vE "(example|mock|placeholder|<token>|xxx|your_)" | head -n 1 || true)"
if [[ -n "$JWT_LINE" ]]; then
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

# 3. Quét Token các dịch vụ thông dụng (GitLab, Slack, Google/Gemini, Atlassian, AWS, GitHub, OpenAI/Anthropic)
TOKEN_LINE="$(echo "$CONTENT" | grep -E "(glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[0-9A-Za-z_-]{20,}|AIzaSy[A-Za-z0-9_-]{33}|ATATT3x[A-Za-z0-9_=-]{20,}|(AKIA|ASIA)[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,}|sk-(proj-|ant-api03-)[A-Za-z0-9_-]{20,})" | grep -vE "(example|mock|placeholder|xxx|your_)" | head -n 1 || true)"
if [[ -n "$TOKEN_LINE" ]]; then
  cat >&2 << EOF
================================================================================
❌ [LỖI BẢO MẬT] PHÁT HIỆN ACCESS TOKEN DẠNG THÔ!
--------------------------------------------------------------------------------
File: $TARGET_PATH
Nguyên nhân: Phát hiện token định dạng thật (glpat- / xox* / AIzaSy / ATATT3x / AKIA / ghp_ / sk-).
Cách khắc phục: BẮT BUỘC dùng biến môi trường (.env), CẤM ghi token thô vào file.
================================================================================
EOF
  exit 2
fi

exit 0
