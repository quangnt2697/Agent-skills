#!/bin/bash
# =============================================================================
# scripts/daily-repo-sync.sh (Wrapper chuyển tiếp an toàn tới scripts/sync/daily-repo-sync.sh)
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/sync/daily-repo-sync.sh"

if [ -f "$TARGET_SCRIPT" ]; then
  exec /bin/bash "$TARGET_SCRIPT" "$@"
else
  echo "SUMMARY:total=0,pulled=0,up_to_date=0,dirty=0,errors=1,no_git=0,local_only=0"
  echo "ERRORS|daily-repo-sync:Không tìm thấy script đích tại $TARGET_SCRIPT"
  exit 1
fi
