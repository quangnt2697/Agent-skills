#!/usr/bin/env bash
# ==============================================================================
# Rule 4.3 & workspace-paths.md Enforcer: Chống ô nhiễm thư mục gốc
# Dùng chung cho cả Claude Code PreToolUse và Antigravity PreToolUse hooks
# ==============================================================================
set -euo pipefail

TARGET_PATH="${1:-}"

# Nếu không truyền qua tham số $1, thử đọc từ stdin (JSON hoặc raw path)
if [[ -z "$TARGET_PATH" ]]; then
  if [ ! -t 0 ]; then
    STDIN_DATA="$(cat)"
    # Thử parse JSON (Claude hoặc Antigravity format)
    TARGET_PATH="$(echo "$STDIN_DATA" | jq -r '
      .toolCall.args.TargetFile //
      .tool_input.file_path //
      .toolCall.args.path //
      .tool_input.path //
      empty' 2>/dev/null || echo "")"
    if [[ -z "$TARGET_PATH" ]]; then
      TARGET_PATH="$STDIN_DATA"
    fi
  fi
fi

if [[ -z "$TARGET_PATH" ]]; then
  exit 0
fi

# Chuẩn hóa đường dẫn tương đối
PROJECT_ROOT="$(pwd)"
REL_PATH="${TARGET_PATH#"${PROJECT_ROOT}/"}"
REL_PATH="${REL_PATH#./}"
REL_PATH="${REL_PATH#/}"

# 1. Danh sách tiền tố thư mục rác BỊ CẤM tạo ở gốc dự án
FORBIDDEN_ROOTS=("reports/" "output/" "test-output/" "temp/" "tmp/" "logs/")

for prefix in "${FORBIDDEN_ROOTS[@]}"; do
  if [[ "$REL_PATH" == ${prefix}* ]]; then
    cat >&2 << EOF
================================================================================
❌ [LỖI WORKSPACE PATH] VI PHẠM RANH GIỚI LƯU TRỮ ARTIFACTS!
--------------------------------------------------------------------------------
Dòng lỗi: Đường dẫn đích vi phạm '$TARGET_PATH'
Nguyên nhân: Thư mục '$prefix' ở gốc dự án bị nghiêm cấm tạo (Zero Repo Pollution).
Cách khắc phục: BẮT BUỘC lưu trữ đúng vị trí chuẩn:
- Per-issue artifacts: workspace/issues/{issueKey}/[source|spec|tech|test|trace]/
- Phân tích nội bộ / adhoc: workspace/adhoc/{slug}/
- Báo cáo Sprint / Standup: workspace/sprints/{sprintId}/

Tham khảo chi tiết tại: .agents/rules/workspace-paths.md
================================================================================
EOF
    exit 2
  fi
done

# 2. Chặn các file artifact per-issue bị lưu lạc ngay tại thư mục gốc
FORBIDDEN_ROOT_FILES=("checklist.md" "report.md" "test-output.log" "tech-spec.md" "plan.md")
for fname in "${FORBIDDEN_ROOT_FILES[@]}"; do
  if [[ "$REL_PATH" == "$fname" ]]; then
    cat >&2 << EOF
================================================================================
❌ [LỖI WORKSPACE PATH] ARTIFACT KHÔNG ĐƯỢC ĐẶT Ở THƯ MỤC GỐC!
--------------------------------------------------------------------------------
Dòng lỗi: File '$fname' không được lưu ở gốc dự án.
Nguyên nhân: Vi phạm quy chuẩn cấu trúc workspace phân tầng theo issueKey.
Cách khắc phục: Di chuyển file vào đúng thư mục con: workspace/issues/{issueKey}/...
================================================================================
EOF
    exit 2
  fi
done

exit 0
