#!/bin/bash
# =============================================================================
# scripts/sync/daily-repo-sync.sh
# Scan toàn bộ repos trong PROJECT_SCAN_DIRS, fetch + pull nếu có commit mới.
# Hỗ trợ:
#   1. Thư mục đơn lẻ là 1 git repo (như dnse-trading)
#   2. Thư mục nhóm chứa nhiều repo con (như 3.1, mobile)
#   3. Tự động bỏ qua an toàn các thư mục chưa tạo .git (không báo lỗi)
#   4. Tự động bỏ qua các repo local chưa tạo commit hoặc chưa cấu hình remote origin
#   5. Hỗ trợ đường dẫn có khoảng trắng (như Entrade Trading)
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 1. Tự động nạp cấu hình từ .env nếu chưa có trong biến môi trường
if [ -z "${PROJECT_SCAN_DIRS:-}" ]; then
  ENV_FILE=""
  if [ -f "$PROJECT_ROOT/.env" ]; then
    ENV_FILE="$PROJECT_ROOT/.env"
  elif [ -f ".env" ]; then
    ENV_FILE=".env"
  elif [ -f "../.env" ]; then
    ENV_FILE="../.env"
  fi

  if [ -n "$ENV_FILE" ]; then
    SCAN_LINE="$(grep -E '^PROJECT_SCAN_DIRS=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)"
    SCAN_LINE="$(echo "$SCAN_LINE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
    PROJECT_SCAN_DIRS="$SCAN_LINE"

    if [ -z "${GITLAB_PAT:-}" ] && [ -z "${GITLAB_PERSONAL_ACCESS_TOKEN:-}" ]; then
      PAT_LINE="$(grep -E '^(GITLAB_PERSONAL_ACCESS_TOKEN|GITLAB_PAT)=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)"
      PAT_LINE="$(echo "$PAT_LINE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
      GITLAB_PAT="$PAT_LINE"
    fi
  fi
fi

SCAN_RAW="${PROJECT_SCAN_DIRS:-}"
PAT="${GITLAB_PERSONAL_ACCESS_TOKEN:-${GITLAB_PAT:-}}"

# Counters
TOTAL=0; PULLED=0; UP_TO_DATE=0; DIRTY_COUNT=0; ERR_COUNT=0
SKIPPED_NO_GIT=0; SKIPPED_LOCAL=0

# Output collectors (pipe-delimited)
PULLED_REPOS=""
DIRTY_REPOS=""
ERR_REPOS=""
NO_GIT_DIRS=""

# Kiểm tra nếu chưa cấu hình PROJECT_SCAN_DIRS
if [ -z "$SCAN_RAW" ]; then
  echo "SUMMARY:total=0,pulled=0,up_to_date=0,dirty=0,errors=1,no_git=0,local_only=0"
  echo "ERRORS|agent-skills-sync:PROJECT_SCAN_DIRS chưa được cấu hình trong .env"
  exit 0
fi

# 2. Thu thập danh sách Git Repos theo cơ chế Smart 2-Tier
REPOS=()

IFS=',' read -ra DIRS <<< "$SCAN_RAW"

for BASE_DIR in "${DIRS[@]}"; do
  # Trim khoảng trắng và dấu nháy kép/đơn bao ngoài
  BASE_DIR="$(echo "$BASE_DIR" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  [ -d "$BASE_DIR" ] || continue

  # Tầng 1: Nếu chính BASE_DIR là 1 git repo (có thư mục .git hoặc file .git worktree)
  if [ -d "$BASE_DIR/.git" ] || [ -f "$BASE_DIR/.git" ]; then
    REPOS+=("$BASE_DIR")
    continue
  fi

  # Tầng 2: Nếu BASE_DIR là thư mục nhóm chứa nhiều repo con
  for SUB in "$BASE_DIR"/*; do
    [ -d "$SUB" ] || continue
    SUB_NAME="$(basename "$SUB")"

    # Bỏ qua thư mục ẩn hoặc node_modules
    [[ "$SUB_NAME" =~ ^\..* ]] && continue
    [ "$SUB_NAME" = "node_modules" ] && continue

    if [ -d "$SUB/.git" ] || [ -f "$SUB/.git" ]; then
      REPOS+=("$SUB")
    else
      # Thư mục chưa tạo .git (hoặc thư mục phi-git) -> Bỏ qua an toàn, không coi là lỗi
      SKIPPED_NO_GIT=$((SKIPPED_NO_GIT + 1))
      NO_GIT_DIRS="${NO_GIT_DIRS}|${SUB_NAME}"
    fi
  done
done

# 3. Đồng bộ từng Git Repository hợp lệ
for REPO_DIR in "${REPOS[@]}"; do
  REPO_BASE="$(basename "$REPO_DIR")"

  # Kiểm tra repo có commit nào chưa (Unborn branch do mới git init)
  if ! git -C "$REPO_DIR" rev-parse --verify HEAD >/dev/null 2>&1; then
    SKIPPED_LOCAL=$((SKIPPED_LOCAL + 1))
    continue
  fi

  TOTAL=$((TOTAL + 1))

  # Lấy current branch
  CUR_BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  if [ "$CUR_BRANCH" = "HEAD" ] || [ "$CUR_BRANCH" = "unknown" ]; then
    ERR_COUNT=$((ERR_COUNT + 1))
    ERR_REPOS="${ERR_REPOS}|${REPO_BASE}:Detached HEAD — bỏ qua"
    continue
  fi

  # Kiểm tra remote origin
  REMOTE="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || echo "")"
  if [ -z "$REMOTE" ]; then
    # Repo local mới tạo chưa gắn remote origin -> bỏ qua an toàn
    SKIPPED_LOCAL=$((SKIPPED_LOCAL + 1))
    UP_TO_DATE=$((UP_TO_DATE + 1))
    continue
  fi

  # Kiểm tra working tree có dirty không
  DIRTY_OUTPUT="$(git -C "$REPO_DIR" status --porcelain 2>/dev/null || echo "")"
  DIRTY_FILES=0
  if [ -n "$DIRTY_OUTPUT" ]; then
    DIRTY_FILES="$(echo "$DIRTY_OUTPUT" | wc -l | tr -d ' ')"
  fi

  # Xử lý authentication (HTTPS + PAT, SSH dùng key có sẵn)
  GIT_CONFIG_ARGS=""
  if echo "$REMOTE" | grep -q "^https://" && [ -n "$PAT" ]; then
    AUTHED="$(echo "$REMOTE" | sed -E "s|https://([^@/]*@)?|https://oauth2:${PAT}@|")"
    GIT_CONFIG_ARGS="-c remote.origin.url=${AUTHED}"
  fi

  # Fetch để lấy thông tin remote
  # shellcheck disable=SC2086
  git $GIT_CONFIG_ARGS -C "$REPO_DIR" fetch origin "$CUR_BRANCH" --quiet 2>/dev/null || true

  # Kiểm tra số commit behind
  BEHIND="$(git -C "$REPO_DIR" rev-list "HEAD..origin/${CUR_BRANCH}" --count 2>/dev/null || echo 0)"

  if [ "$BEHIND" = "0" ]; then
    UP_TO_DATE=$((UP_TO_DATE + 1))
    continue  # up-to-date, không cần pull
  fi

  # Có commit mới — kiểm tra dirty trước khi pull
  if [ "$DIRTY_FILES" -gt "0" ]; then
    DIRTY_COUNT=$((DIRTY_COUNT + 1))
    TOP_FILES="$(echo "$DIRTY_OUTPUT" | head -2 | awk '{print $2}' | tr '\n' ',' | sed 's/,$//')"
    [ "$DIRTY_FILES" -gt "2" ] && TOP_FILES="${TOP_FILES},..."
    DIRTY_REPOS="${DIRTY_REPOS}|${REPO_BASE}(${CUR_BRANCH}):${DIRTY_FILES} file(s) chưa commit (${TOP_FILES}) — cần stash/commit thủ công"
    continue
  fi

  # Pull mã nguồn mới nhất
  # shellcheck disable=SC2086
  PULL_OUT="$(git $GIT_CONFIG_ARGS -C "$REPO_DIR" pull --ff-only 2>&1 || echo "PULL_FAILED")"
  SHA="$(git -C "$REPO_DIR" log -1 --format="%h %s" 2>/dev/null | head -c 100 || echo "")"

  if echo "$PULL_OUT" | grep -qE "Updating|Fast-forward|Already up to date"; then
    PULLED=$((PULLED + 1))
    PULLED_REPOS="${PULLED_REPOS}|${REPO_BASE}(${CUR_BRANCH}):${BEHIND}↓:${SHA}"
  else
    ERR_COUNT=$((ERR_COUNT + 1))
    ERR_MSG="$(echo "$PULL_OUT" | head -1 | cut -c1-120)"
    ERR_REPOS="${ERR_REPOS}|${REPO_BASE}(${CUR_BRANCH}):${ERR_MSG}"
  fi

done

# 4. Xuất kết quả tổng hợp cho n8n Code node parse
echo "SUMMARY:total=${TOTAL},pulled=${PULLED},up_to_date=${UP_TO_DATE},dirty=${DIRTY_COUNT},errors=${ERR_COUNT},no_git=${SKIPPED_NO_GIT},local_only=${SKIPPED_LOCAL}"
[ -n "$PULLED_REPOS" ] && echo "PULLED${PULLED_REPOS}" || true
[ -n "$DIRTY_REPOS"  ] && echo "DIRTY${DIRTY_REPOS}" || true
[ -n "$ERR_REPOS"    ] && echo "ERRORS${ERR_REPOS}" || true
[ -n "$NO_GIT_DIRS"  ] && echo "NOGIT${NO_GIT_DIRS}" || true

exit 0
