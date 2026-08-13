#!/bin/bash
# ==============================================================================
# jira-push-spec.sh — Đẩy tài liệu Markdown lên Jira Description
# ==============================================================================
# Mục đích: Đọc file Markdown, chuyển sang ADF và ghi đè lên Description của ticket
# Sử dụng: bash jira-push-spec.sh <JIRA_ISSUE_KEY> <FILE_MD>
#
# Ví dụ:
#   bash jira-push-spec.sh G3PTP-16584 ./specs/imports/jira/final.md
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
    echo "Sử dụng: bash jira-push-spec.sh <JIRA_ISSUE_KEY> <FILE_MD>"
    echo ""
    echo "Ví dụ: bash jira-push-spec.sh G3PTP-16584 ./specs/imports/jira/final.md"
    exit 1
fi

ISSUE_KEY="$1"
FILE_MD="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    log_error "Không tìm thấy Node.js. Vui lòng cài đặt Node.js để chạy script này."
    exit 1
fi

# Chạy JS script
node "${SCRIPT_DIR}/jira-push-spec.js" "${ISSUE_KEY}" "${FILE_MD}"
