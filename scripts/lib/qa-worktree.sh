#!/usr/bin/env bash
# ==============================================================================
# qa-worktree.sh — Tiện ích cô lập môi trường kiểm thử với Git Worktree
#
# Giúp QA/SDET thực thi kiểm thử E2E Playwright hoặc sinh test code hàng loạt
# trong một git worktree riêng biệt mà không làm bẩn (dirty) working tree của kỹ sư.
#
# Cách dùng:
#   bash scripts/lib/qa-worktree.sh create <issueKey> [baseBranch]
#   bash scripts/lib/qa-worktree.sh path <issueKey>
#   bash scripts/lib/qa-worktree.sh remove <issueKey>
# ==============================================================================
set -euo pipefail

ACTION="${1:-help}"
ISSUE_KEY="${2:-}"
BASE_BRANCH="${3:-HEAD}"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKTREE_DIR="$PROJECT_ROOT/.worktrees/qa-${ISSUE_KEY}"

usage() {
  echo "Cách sử dụng:"
  echo "  $0 create <issueKey> [baseBranch]   Tạo worktree cô lập cho issue"
  echo "  $0 path <issueKey>                  In đường dẫn của worktree"
  echo "  $0 remove <issueKey>                Xóa worktree cô lập sau khi test xong"
  exit 1
}

if [[ "$ACTION" != "help" && -z "$ISSUE_KEY" ]]; then
  echo "❌ Lỗi: Cần truyền <issueKey> (ví dụ: JIRA-123)" >&2
  usage
fi

case "$ACTION" in
  create)
    if [[ -d "$WORKTREE_DIR" ]]; then
      echo "ℹ️ Worktree đã tồn tại tại: $WORKTREE_DIR"
      exit 0
    fi
    mkdir -p "$(dirname "$WORKTREE_DIR")"
    WORKTREE_BRANCH="worktree/qa-${ISSUE_KEY}"
    
    # Kiểm tra xem branch đã có chưa
    if git rev-parse --verify "$WORKTREE_BRANCH" >/dev/null 2>&1; then
      git worktree add "$WORKTREE_DIR" "$WORKTREE_BRANCH"
    else
      git worktree add -b "$WORKTREE_BRANCH" "$WORKTREE_DIR" "$BASE_BRANCH"
    fi
    
    echo "✅ Đã tạo worktree cô lập cho $ISSUE_KEY tại: $WORKTREE_DIR"
    echo "👉 Chuyển đến thư mục: cd $WORKTREE_DIR"
    ;;

  path)
    if [[ -d "$WORKTREE_DIR" ]]; then
      echo "$WORKTREE_DIR"
    else
      echo "❌ Worktree cho $ISSUE_KEY chưa được tạo." >&2
      exit 1
    fi
    ;;

  remove)
    if [[ -d "$WORKTREE_DIR" ]]; then
      git worktree remove --force "$WORKTREE_DIR" 2>/dev/null || rm -rf "$WORKTREE_DIR"
      git worktree prune
      # Xóa nhánh tạm nếu muốn
      WORKTREE_BRANCH="worktree/qa-${ISSUE_KEY}"
      git branch -D "$WORKTREE_BRANCH" 2>/dev/null || true
      echo "✅ Đã dọn dẹp worktree $WORKTREE_DIR thành công."
    else
      echo "ℹ️ Không tìm thấy worktree tại $WORKTREE_DIR để xóa."
    fi
    ;;

  *)
    usage
    ;;
esac
