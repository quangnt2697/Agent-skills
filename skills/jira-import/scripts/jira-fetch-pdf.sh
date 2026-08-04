#!/bin/bash
# ==============================================================================
# jira-fetch-pdf.sh — Tải Jira issue thành PDF + nhận diện loại task
# ==============================================================================
# Mục đích: Tải issue từ Jira, export thành PDF, detect loại task từ tên
# Sử dụng: bash jira-fetch-pdf.sh <JIRA_ISSUE_KEY> [output_dir]
#
# Ví dụ:
#   bash jira-fetch-pdf.sh G3PTP-16584
#   bash jira-fetch-pdf.sh G3PTP-16584 ./specs/jira-import
#
# Env vars yêu cầu:
#   JIRA_BASE_URL   - URL Jira (VD: https://your-company.atlassian.net)
#   JIRA_EMAIL      - Email đăng nhập Jira
#   JIRA_API_TOKEN  - API token
#
# Dependencies: curl, jq
# Optional: wkhtmltopdf (để convert HTML → PDF)
#
# Output:
#   {output_dir}/{issueKey}/source/{issueKey}.pdf
#   {output_dir}/{issueKey}/source/metadata.json
#   {output_dir}/{issueKey}/source/attachment-*.*
#
# Exit codes:
#   0 - Thành công
#   1 - Thiếu tham số hoặc biến môi trường
#   2 - Không tìm thấy issue
#   3 - Lỗi tải file
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

# --- Kiểm tra tham số ---
if [[ $# -lt 1 ]]; then
    echo "Sử dụng: bash jira-fetch-pdf.sh <JIRA_ISSUE_KEY> [output_dir]"
    echo ""
    echo "Ví dụ:"
    echo "  bash jira-fetch-pdf.sh G3PTP-16584"
    echo "  bash jira-fetch-pdf.sh G3PTP-16584 ./specs/jira-import"
    exit 1
fi

ISSUE_KEY="$1"
OUTPUT_BASE="${2:-./specs/jira-import}"

# --- Đọc .env ---
ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

# --- Kiểm tra biến môi trường ---
if [[ -z "${JIRA_BASE_URL:-}" ]] || [[ -z "${JIRA_EMAIL:-}" ]] || [[ -z "${JIRA_API_TOKEN:-}" ]]; then
    log_error "Thiếu biến môi trường. Chạy jira-auth-check.sh trước."
    exit 1
fi

JIRA_BASE_URL="${JIRA_BASE_URL%/}"

# --- Tạo thư mục output ---
OUTPUT_DIR="${OUTPUT_BASE}/${ISSUE_KEY}/source"
mkdir -p "$OUTPUT_DIR"
log_ok "Thư mục output: ${OUTPUT_DIR}"

# ==============================================================================
# BƯỚC 1: Fetch JSON issue từ Jira REST API
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 BƯỚC 1: Tải thông tin issue ${ISSUE_KEY}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_URL="${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}"
log_info "Gọi API: ${API_URL}"

ISSUE_JSON=$(curl -s \
    -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
    -H "Accept: application/json" \
    "${API_URL}" 2>/dev/null)

# Kiểm tra lỗi
if echo "$ISSUE_JSON" | jq -e '.errorMessages' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$ISSUE_JSON" | jq -r '.errorMessages[0]')
    log_error "Không tìm thấy issue: ${ERROR_MSG}"
    exit 2
fi

# Trích xuất thông tin
SUMMARY=$(echo "$ISSUE_JSON" | jq -r '.fields.summary // "N/A"')
STATUS=$(echo "$ISSUE_JSON" | jq -r '.fields.status.name // "N/A"')
PRIORITY=$(echo "$ISSUE_JSON" | jq -r '.fields.priority.name // "N/A"')
ASSIGNEE=$(echo "$ISSUE_JSON" | jq -r '.fields.assignee.displayName // "Chưa gán"')
REPORTER=$(echo "$ISSUE_JSON" | jq -r '.fields.reporter.displayName // "N/A"')
LABELS=$(echo "$ISSUE_JSON" | jq -r '[.fields.labels[]] | join(", ") // "Không có"')
CREATED=$(echo "$ISSUE_JSON" | jq -r '.fields.created // "N/A"')

# Sprint (custom field - thử vài field phổ biến)
SPRINT=$(echo "$ISSUE_JSON" | jq -r '
  .fields.customfield_10020[0].name //
  .fields.customfield_10007[0].name //
  .fields.sprint.name //
  "N/A"' 2>/dev/null || echo "N/A")

log_ok "Tìm thấy issue: ${SUMMARY}"
echo "   📋 Trạng thái: ${STATUS}"
echo "   🎯 Ưu tiên: ${PRIORITY}"
echo "   👤 Người thực hiện: ${ASSIGNEE}"

# ==============================================================================
# BƯỚC 2: Nhận diện loại task từ tên issue
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 BƯỚC 2: Nhận diện loại task"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUMMARY_LOWER=$(echo "$SUMMARY" | tr '[:upper:]' '[:lower:]')
TASK_TYPE="HYBRID"
TASK_TYPE_SOURCE="Không tìm thấy tag trong tên task"

if [[ "$SUMMARY_LOWER" == *"[app]"* ]]; then
    TASK_TYPE="APP"
    TASK_TYPE_SOURCE="[APP] trong tên task"
elif [[ "$SUMMARY_LOWER" == *"[web]"* ]]; then
    TASK_TYPE="WEB"
    TASK_TYPE_SOURCE="[WEB] trong tên task"
elif [[ "$SUMMARY_LOWER" == *"[openapi]"* ]]; then
    TASK_TYPE="API"
    TASK_TYPE_SOURCE="[OpenAPI] trong tên task"
elif [[ "$SUMMARY_LOWER" == *"[be]"* ]]; then
    TASK_TYPE="API"
    TASK_TYPE_SOURCE="[BE] trong tên task"
elif [[ "$SUMMARY_LOWER" == *"[websocket]"* ]]; then
    TASK_TYPE="API"
    TASK_TYPE_SOURCE="[websocket] trong tên task"
elif [[ "$SUMMARY_LOWER" == *"[ws]"* ]]; then
    TASK_TYPE="API"
    TASK_TYPE_SOURCE="[ws] trong tên task"
fi

case "$TASK_TYPE" in
    APP)  log_ok "Loại task: 📱 Mobile App (${TASK_TYPE_SOURCE})" ;;
    WEB)  log_ok "Loại task: 🌐 Web Application (${TASK_TYPE_SOURCE})" ;;
    API)  log_ok "Loại task: 🔌 Backend/API (${TASK_TYPE_SOURCE})" ;;
    *)    log_warn "Loại task: 🔀 Hybrid (${TASK_TYPE_SOURCE})" ;;
esac

# ==============================================================================
# BƯỚC 3: Tải attachments
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📎 BƯỚC 3: Tải file đính kèm"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ATTACHMENT_COUNT=$(echo "$ISSUE_JSON" | jq '.fields.attachment | length')
ATTACHMENT_FILES="[]"

if [[ "$ATTACHMENT_COUNT" -gt 0 ]]; then
    log_info "Tìm thấy ${ATTACHMENT_COUNT} file đính kèm"

    ATTACHMENT_FILES=$(echo "$ISSUE_JSON" | jq '[.fields.attachment[] | {name: .filename, url: .content, size: .size, mimeType: .mimeType}]')

    INDEX=1
    echo "$ISSUE_JSON" | jq -r '.fields.attachment[] | "\(.content)\t\(.filename)"' | while IFS=$'\t' read -r URL FILENAME; do
        echo "   📥 [${INDEX}/${ATTACHMENT_COUNT}] Tải: ${FILENAME}"
        curl -s \
            -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
            -o "${OUTPUT_DIR}/${FILENAME}" \
            "${URL}" 2>/dev/null
        INDEX=$((INDEX + 1))
    done

    log_ok "Đã tải ${ATTACHMENT_COUNT} file đính kèm"
else
    log_info "Không có file đính kèm"
fi

# ==============================================================================
# BƯỚC 4: Export issue thành PDF
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 BƯỚC 4: Export issue thành PDF"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PDF_FILE="${OUTPUT_DIR}/${ISSUE_KEY}.pdf"

# Thử phương án A: HTML export + wkhtmltopdf
if command -v wkhtmltopdf &> /dev/null; then
    log_info "Sử dụng wkhtmltopdf để export PDF"

    # Tải HTML view của issue
    HTML_URL="${JIRA_BASE_URL}/si/jira.issueviews:issue-html/${ISSUE_KEY}/${ISSUE_KEY}.html"
    HTML_FILE="${OUTPUT_DIR}/${ISSUE_KEY}.html"

    curl -s \
        -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
        -o "$HTML_FILE" \
        "$HTML_URL" 2>/dev/null

    if [[ -s "$HTML_FILE" ]]; then
        wkhtmltopdf --quiet \
            --encoding utf-8 \
            --page-size A4 \
            --margin-top 15mm \
            --margin-bottom 15mm \
            --margin-left 10mm \
            --margin-right 10mm \
            "$HTML_FILE" "$PDF_FILE" 2>/dev/null || true

        if [[ -s "$PDF_FILE" ]]; then
            log_ok "PDF đã tạo: ${PDF_FILE}"
            rm -f "$HTML_FILE"
        else
            log_warn "wkhtmltopdf thất bại, lưu HTML thay thế"
        fi
    else
        log_warn "Không tải được HTML view, thử phương án khác..."
    fi
fi

# Phương án B: Nếu chưa có PDF, tạo PDF đơn giản từ description
if [[ ! -s "$PDF_FILE" ]]; then
    log_info "Tạo PDF từ nội dung description..."

    # Lấy description dạng text
    DESCRIPTION=$(echo "$ISSUE_JSON" | jq -r '
      .fields.description.content[]?.content[]?.text // empty
    ' 2>/dev/null | head -500)

    # Lưu text để agent đọc trực tiếp
    TEXT_FILE="${OUTPUT_DIR}/${ISSUE_KEY}.txt"
    {
        echo "═══════════════════════════════════════════"
        echo "  ${ISSUE_KEY}: ${SUMMARY}"
        echo "═══════════════════════════════════════════"
        echo ""
        echo "Trạng thái: ${STATUS}"
        echo "Ưu tiên: ${PRIORITY}"
        echo "Người thực hiện: ${ASSIGNEE}"
        echo "Người tạo: ${REPORTER}"
        echo "Labels: ${LABELS}"
        echo "Sprint: ${SPRINT}"
        echo "Ngày tạo: ${CREATED}"
        echo ""
        echo "═══════════════════════════════════════════"
        echo "  MÔ TẢ"
        echo "═══════════════════════════════════════════"
        echo ""
        echo "$DESCRIPTION"
    } > "$TEXT_FILE"

    log_warn "Không có wkhtmltopdf — đã lưu nội dung dạng text: ${TEXT_FILE}"
    log_info "Agent sẽ đọc file text + attachments để phân tích"
fi

# ==============================================================================
# BƯỚC 5: Tạo metadata.json
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 BƯỚC 5: Tạo metadata.json"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ATTACHMENT_NAMES=$(echo "$ISSUE_JSON" | jq '[.fields.attachment[].filename]')
DOWNLOADED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "${OUTPUT_DIR}/metadata.json" << EOF
{
  "key": "${ISSUE_KEY}",
  "summary": $(echo "$SUMMARY" | jq -R .),
  "task_type": "${TASK_TYPE}",
  "task_type_detected_from": "${TASK_TYPE_SOURCE}",
  "status": "${STATUS}",
  "priority": "${PRIORITY}",
  "assignee": "${ASSIGNEE}",
  "reporter": "${REPORTER}",
  "labels": $(echo "$LABELS" | jq -R 'split(", ")'),
  "sprint": "${SPRINT}",
  "created": "${CREATED}",
  "jira_url": "${JIRA_BASE_URL}/browse/${ISSUE_KEY}",
  "attachments": ${ATTACHMENT_NAMES},
  "attachment_count": ${ATTACHMENT_COUNT},
  "downloaded_at": "${DOWNLOADED_AT}"
}
EOF

log_ok "Đã tạo metadata.json"

# ==============================================================================
# KẾT QUẢ
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HOÀN THÀNH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Thư mục output: ${OUTPUT_DIR}"
echo "📋 Issue: ${ISSUE_KEY} — ${SUMMARY}"
echo "🏷️  Loại task: ${TASK_TYPE} (${TASK_TYPE_SOURCE})"
echo "📎 Số file đính kèm: ${ATTACHMENT_COUNT}"
echo ""

# Liệt kê files
echo "📁 Danh sách file:"
ls -la "${OUTPUT_DIR}/" | tail -n +4 | while read -r line; do
    echo "   ${line}"
done

echo ""
log_ok "Sẵn sàng cho Phase 2: Trích xuất có cấu trúc"
