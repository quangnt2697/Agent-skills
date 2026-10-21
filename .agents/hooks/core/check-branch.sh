#!/usr/bin/env bash
# ==============================================================================
# Rule 5.1 Enforcer: Chặn tuyệt đối hành vi commit trực tiếp trên nhánh main/master
# Dùng chung cho cả Git Hook (pre-commit) và AI Agent Tool Hook (Bash/run_command)
# ==============================================================================
set -euo pipefail

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "HEAD")"

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  cat >&2 << 'EOF'
================================================================================
❌ [LỖI BẢO VỆ NHÁNH] PHÁT HIỆN HÀNH ĐỘNG COMMIT TRỰC TIẾP TRÊN NHÁNH CHÍNH!
--------------------------------------------------------------------------------
Dòng lỗi: git commit trên nhánh main / master
Nguyên nhân: Vi phạm quy định Rule 5.1 tại AGENTS.md và .agents/rules/git-workflow.md
Cách khắc phục: BẮT BUỘC thực hiện trên nhánh tính năng (feature/*, fix/*, refactor/*).

👉 Vui lòng chạy lệnh sau để tạo nhánh mới trước khi commit:
   git checkout -b feature/<tên-nhánh>
================================================================================
EOF
  exit 1
fi

exit 0
