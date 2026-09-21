#!/bin/bash
# =============================================================================
# scripts/daily-repo-sync.sh
# Scan toàn bộ repos trong PROJECT_SCAN_DIRS, fetch + pull nếu có commit mới.
# Dùng GitLab PAT để xác thực HTTPS repos (không cần Maintainer/Owner).
# Dùng SSH repos bình thường nếu đã cấu hình SSH key.
#
# Env vars cần thiết (đọc từ .env qua PM2 / n8n):
#   PROJECT_SCAN_DIRS  — thư mục nhóm, phân tách dấu phẩy (vd: /path/3.1,/path/3.2)
#   GITLAB_PAT         — Personal Access Token (READ_REPOSITORY)
# =============================================================================

set -uo pipefail

SCAN_RAW="${PROJECT_SCAN_DIRS:-}"
PAT="${GITLAB_PERSONAL_ACCESS_TOKEN:-}"

# Counters
TOTAL=0; PULLED=0; UP_TO_DATE=0; DIRTY_COUNT=0; ERR_COUNT=0

# Output collectors (pipe-delimited)
PULLED_REPOS=""
DIRTY_REPOS=""
ERR_REPOS=""

# Không có gì để scan
if [ -z "$SCAN_RAW" ]; then
  echo "SUMMARY:total=0,pulled=0,up_to_date=0,dirty=0,errors=1"
  echo "ERRORS|agent-skills-sync:PROJECT_SCAN_DIRS chưa được cấu hình trong .env"
  exit 0
fi

IFS=',' read -ra DIRS <<< "$SCAN_RAW"

for BASE_DIR in "${DIRS[@]}"; do
  BASE_DIR="$(echo "$BASE_DIR" | xargs)"   # trim whitespace
  [ -d "$BASE_DIR" ] || continue

  # Tìm tất cả git repos trong BASE_DIR, depth 3, sort để output ổn định
  while IFS= read -r GIT_DIR; do
    REPO_DIR="$(dirname "$GIT_DIR")"
    REPO_BASE="$(basename "$REPO_DIR")"
    TOTAL=$((TOTAL + 1))

    # ── Lấy current branch ──────────────────────────────────────────────────
    CUR_BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    if [ "$CUR_BRANCH" = "HEAD" ] || [ "$CUR_BRANCH" = "unknown" ]; then
      ERR_COUNT=$((ERR_COUNT + 1))
      ERR_REPOS="${ERR_REPOS}|${REPO_BASE}:Detached HEAD — bỏ qua"
      continue
    fi

    # ── Kiểm tra working tree có dirty không ────────────────────────────────
    DIRTY_OUTPUT="$(git -C "$REPO_DIR" status --porcelain 2>/dev/null)"
    DIRTY_FILES="$(echo "$DIRTY_OUTPUT" | grep -v '^$' | wc -l | tr -d ' ')"

    # ── Xử lý authentication (HTTPS + PAT, SSH dùng key có sẵn) ────────────
    REMOTE="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || echo "")"
    GIT_CONFIG_ARGS=""
    if echo "$REMOTE" | grep -q "^https://" && [ -n "$PAT" ]; then
      # Inject PAT vào URL mà không lưu vĩnh viễn
      AUTHED="$(echo "$REMOTE" | sed -E "s|https://([^@/]*@)?|https://oauth2:${PAT}@|")"
      GIT_CONFIG_ARGS="-c remote.origin.url=${AUTHED}"
    fi

    # ── Fetch để lấy thông tin remote ───────────────────────────────────────
    # shellcheck disable=SC2086
    git $GIT_CONFIG_ARGS -C "$REPO_DIR" fetch origin "$CUR_BRANCH" --quiet 2>/dev/null || true

    # Kiểm tra số commit behind
    BEHIND="$(git -C "$REPO_DIR" rev-list "HEAD..origin/${CUR_BRANCH}" --count 2>/dev/null || echo 0)"

    if [ "$BEHIND" = "0" ]; then
      UP_TO_DATE=$((UP_TO_DATE + 1))
      continue  # up-to-date, không ghi vào report
    fi

    # ── Có commit mới — kiểm tra dirty trước khi pull ───────────────────────
    if [ "$DIRTY_FILES" -gt "0" ]; then
      DIRTY_COUNT=$((DIRTY_COUNT + 1))
      TOP_FILES="$(echo "$DIRTY_OUTPUT" | head -2 | awk '{print $2}' | tr '\\n' ',' | sed 's/,$//')"
      [ "$DIRTY_FILES" -gt "2" ] && TOP_FILES="${TOP_FILES},..."
      
      DIRTY_REPOS="${DIRTY_REPOS}|${REPO_BASE}(${CUR_BRANCH}):${DIRTY_FILES} file(s) chưa commit (${TOP_FILES}) — cần stash/commit thủ công"
      continue
    fi

    # ── Pull ─────────────────────────────────────────────────────────────────
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

  done < <(find "$BASE_DIR" -maxdepth 3 -name ".git" -type d 2>/dev/null | sort)
done

# ── Output cho n8n Code node parse ──────────────────────────────────────────
echo "SUMMARY:total=${TOTAL},pulled=${PULLED},up_to_date=${UP_TO_DATE},dirty=${DIRTY_COUNT},errors=${ERR_COUNT}"
[ -n "$PULLED_REPOS" ] && echo "PULLED${PULLED_REPOS}"
[ -n "$DIRTY_REPOS"  ] && echo "DIRTY${DIRTY_REPOS}"
[ -n "$ERR_REPOS"    ] && echo "ERRORS${ERR_REPOS}"
