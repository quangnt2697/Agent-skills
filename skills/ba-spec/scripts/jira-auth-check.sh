#!/bin/bash
# ==============================================================================
# jira-auth-check.sh — Kiểm tra xác thực Jira
# ==============================================================================
# Mục đích: Kiểm tra kết nối tới Jira API trước khi fetch issue
# Sử dụng: bash jira-auth-check.sh
#
# Env vars yêu cầu:
#   JIRA_BASE_URL   - URL Jira (VD: https://your-company.atlassian.net)
#   JIRA_EMAIL      - Email đăng nhập Jira
#   JIRA_API_TOKEN  - API token
#
# Exit codes:
#   0 - Xác thực thành công
#   1 - Thiếu biến môi trường
#   2 - Không kết nối được tới Jira
#   3 - Xác thực thất bại (sai email/token)
# ==============================================================================

set -euo pipefail

# --- Màu sắc cho output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Hàm tiện ích ---
log_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# --- Đọc .env nếu tồn tại ---
ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "$ENV_FILE" ]]; then
    echo "📂 Đọc cấu hình từ: $ENV_FILE"
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    log_warn "Không tìm thấy file .env tại: $ENV_FILE"
    echo "   Kiểm tra biến môi trường hiện tại..."
fi

# --- Kiểm tra biến môi trường ---
echo ""
echo "🔍 Kiểm tra biến môi trường..."

MISSING=0

if [[ -z "${JIRA_BASE_URL:-}" ]]; then
    log_error "JIRA_BASE_URL chưa được cấu hình"
    MISSING=1
else
    log_ok "JIRA_BASE_URL = ${JIRA_BASE_URL}"
fi

if [[ -z "${JIRA_EMAIL:-}" ]]; then
    log_error "JIRA_EMAIL chưa được cấu hình"
    MISSING=1
else
    log_ok "JIRA_EMAIL = ${JIRA_EMAIL}"
fi

if [[ -z "${JIRA_API_TOKEN:-}" ]]; then
    log_error "JIRA_API_TOKEN chưa được cấu hình"
    MISSING=1
else
    # Chỉ hiển thị 4 ký tự đầu + ***
    TOKEN_PREVIEW="${JIRA_API_TOKEN:0:4}***"
    log_ok "JIRA_API_TOKEN = ${TOKEN_PREVIEW}"
fi

if [[ $MISSING -eq 1 ]]; then
    echo ""
    log_error "Thiếu biến môi trường. Vui lòng tạo file .env theo mẫu .env.example"
    exit 1
fi

# --- Kiểm tra kết nối tới Jira ---
echo ""
echo "🌐 Kiểm tra kết nối tới Jira..."

# Loại bỏ trailing slash
JIRA_BASE_URL="${JIRA_BASE_URL%/}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout 10 \
    --max-time 15 \
    -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    "${JIRA_BASE_URL}/rest/api/3/myself" \
    2>/dev/null || echo "000")

case "$HTTP_CODE" in
    200)
        # Lấy thêm thông tin user
        USER_INFO=$(curl -s \
            -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
            "${JIRA_BASE_URL}/rest/api/3/myself" \
            2>/dev/null)

        DISPLAY_NAME=$(echo "$USER_INFO" | jq -r '.displayName // "N/A"' 2>/dev/null || echo "N/A")
        ACCOUNT_ID=$(echo "$USER_INFO" | jq -r '.accountId // "N/A"' 2>/dev/null || echo "N/A")

        log_ok "Kết nối thành công!"
        echo "   👤 Tên hiển thị: ${DISPLAY_NAME}"
        echo "   🔑 Account ID: ${ACCOUNT_ID}"
        echo "   🌐 Server: ${JIRA_BASE_URL}"
        echo ""
        log_ok "Sẵn sàng sử dụng /jira {issueKey}"
        exit 0
        ;;
    401)
        log_error "Xác thực thất bại (HTTP 401)"
        echo "   Kiểm tra lại JIRA_EMAIL và JIRA_API_TOKEN"
        echo "   Hướng dẫn tạo API token: https://id.atlassian.com/manage-profile/security/api-tokens"
        exit 3
        ;;
    403)
        log_error "Không có quyền truy cập (HTTP 403)"
        echo "   API token đúng nhưng tài khoản không có quyền truy cập API"
        exit 3
        ;;
    000)
        log_error "Không kết nối được tới Jira"
        echo "   Kiểm tra lại JIRA_BASE_URL: ${JIRA_BASE_URL}"
        echo "   Kiểm tra kết nối mạng"
        exit 2
        ;;
    *)
        log_error "Lỗi không mong đợi (HTTP ${HTTP_CODE})"
        echo "   URL: ${JIRA_BASE_URL}/rest/api/3/myself"
        exit 2
        ;;
esac
