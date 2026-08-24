#!/bin/bash
# ==============================================================================
# jira-push-spec.sh — Đẩy tài liệu Markdown lên Jira Description
# ==============================================================================
# Đường push DUY NHẤT của ba-refine. Đọc file Markdown, chuyển sang ADF và ghi
# đè lên Description của ticket.
#
# Sử dụng: bash jira-push-spec.sh <JIRA_ISSUE_KEY|URL> <FILE_MD>
#
# Ví dụ:
#   bash jira-push-spec.sh G3PTP-16584 /project-root/workspace/G3PTP-16584/spec/refined.md
#   bash jira-push-spec.sh https://x.atlassian.net/browse/G3PTP-16584 /project-root/workspace/G3PTP-16584/spec/refined.md
#
# Xem trước ADF mà không gọi Jira:
#   DRY_RUN=1 bash jira-push-spec.sh G3PTP-16584 /project-root/workspace/G3PTP-16584/spec/refined.md
#
# Credentials đọc từ .env (ưu tiên ATLASSIAN_*, fallback JIRA_*):
#   ATLASSIAN_BASE_URL / ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN
# ==============================================================================

set -euo pipefail

# --- Màu sắc ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_info()  { echo -e "${BLUE}ℹ️  $1${NC}"; }

if [[ $# -lt 2 ]]; then
    echo "Sử dụng: bash jira-push-spec.sh <JIRA_ISSUE_KEY|URL> <FILE_MD>"
    echo ""
    echo "Ví dụ: bash jira-push-spec.sh G3PTP-16584 /project-root/workspace/G3PTP-16584/spec/refined.md"
    exit 1
fi

RAW_KEY="$1"
FILE_MD="$2"

# Bóc issue key khỏi URL nếu user dán nguyên link trình duyệt. Không bóc thì cả
# URL bị dùng làm tên thư mục workspace ở các bước sau.
ISSUE_KEY="$(printf '%s' "$RAW_KEY" | grep -oiE '[A-Z][A-Z0-9]*-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]' || true)"

if [[ -z "$ISSUE_KEY" ]]; then
    log_error "Không nhận diện được Jira issue key từ: \"${RAW_KEY}\""
    log_info "Ví dụ hợp lệ: G3PTP-17057 hoặc https://domain.atlassian.net/browse/G3PTP-17057"
    exit 1
fi

if [[ "$ISSUE_KEY" != "$RAW_KEY" ]]; then
    log_info "Issue key chuẩn hoá: \"${RAW_KEY}\" → \"${ISSUE_KEY}\""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    log_error "Không tìm thấy Node.js. Vui lòng cài đặt Node.js để chạy script này."
    exit 1
fi

# Chạy JS script
node "${SCRIPT_DIR}/jira-push-spec.js" "${ISSUE_KEY}" "${FILE_MD}"
