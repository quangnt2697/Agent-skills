#!/bin/bash
# ==============================================================================
# squash-push.sh — Tự động đẩy Gherkin file lên Squash TM (V3)
# ==============================================================================
# 1. Tìm thư mục "EnTrade Sprint xxx" mới nhất trong Requirement Workspace (G.3.1).
# 2. Kiểm tra/Tạo thư mục tương ứng trong Test Case Workspace (G.3.1).
# 3. Tìm/Tạo test case dạng Gherkin và dán đè script.
#
# Sử dụng: bash squash-push.sh <ISSUE_KEY> <NAME_JIRA> <GHERKIN_FILE_PATH>
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

if [[ $# -lt 3 ]]; then
    echo "Sử dụng: bash squash-push.sh <ISSUE_KEY> <NAME_JIRA> <GHERKIN_FILE_PATH>"
    exit 1
fi

ISSUE_KEY="$1"
NAME_JIRA="$2"
GHERKIN_FILE="$3"
TEST_CASE_NAME="${ISSUE_KEY}-${NAME_JIRA}"

# --- Đọc .env ---
ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [[ -z "${SQUASH_BASE_URL:-}" || -z "${SQUASH_API_TOKEN:-}" ]]; then
    log_error "Thiếu cấu hình đăng nhập Squash TM (SQUASH_BASE_URL, SQUASH_API_TOKEN) trong .env"
    exit 1
fi

if [[ -z "${SQUASH_PROJECT_ID:-}" || -z "${SQUASH_REQ_G31_FOLDER_ID:-}" || -z "${SQUASH_TC_G31_FOLDER_ID:-}" ]]; then
    log_error "Thiếu cấu hình Folder ID (SQUASH_PROJECT_ID, SQUASH_REQ_G31_FOLDER_ID, SQUASH_TC_G31_FOLDER_ID) trong .env"
    exit 1
fi

if [[ ! -f "$GHERKIN_FILE" ]]; then
    log_error "Không tìm thấy file Gherkin: $GHERKIN_FILE"
    exit 1
fi



# Hàm gọi API
call_api() {
    local method="$1"
    local endpoint="$2"
    local payload="${3:-}"
    
    if [[ -z "$payload" ]]; then
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${SQUASH_API_TOKEN}" \
            -H "Accept: application/json"
    else
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${SQUASH_API_TOKEN}" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$payload"
    fi
}

log_info "1. Tìm Sprint mới nhất từ Requirement Workspace (Folder G.3.1)..."

REQ_FOLDERS_JSON=$(call_api "GET" "/api/rest/latest/requirement-folders/${SQUASH_REQ_G31_FOLDER_ID}/content")

# Trích xuất thư mục có dạng "EnTrade Sprint xxx" lớn nhất
TARGET_SPRINT_NAME=$(echo "$REQ_FOLDERS_JSON" | jq -r '
  ._embedded.content[]? 
  | select(.name | test("EnTrade Sprint [0-9]+")) 
  | .name as $name 
  | ($name | capture("EnTrade Sprint (?<num>[0-9]+)") | .num | tonumber) as $num 
  | {name: $name, num: $num}
' | jq -r -s 'sort_by(.num) | last | .name')

if [[ -z "$TARGET_SPRINT_NAME" || "$TARGET_SPRINT_NAME" == "null" ]]; then
    log_error "Không tìm thấy thư mục nào có định dạng 'EnTrade Sprint xxx' bên Requirement Workspace!"
    exit 1
fi

log_ok "Tìm thấy Sprint mới nhất: $TARGET_SPRINT_NAME"

log_info "2. Kiểm tra/Đồng bộ thư mục sang Test Case Workspace (Folder G.3.1)..."

TC_FOLDERS_JSON=$(call_api "GET" "/api/rest/latest/test-case-folders/${SQUASH_TC_G31_FOLDER_ID}/content")
TARGET_TC_FOLDER_ID=$(echo "$TC_FOLDERS_JSON" | jq -r "._embedded.content[]? | select(.name == \"$TARGET_SPRINT_NAME\") | .id" | head -n 1)

if [[ -z "$TARGET_TC_FOLDER_ID" || "$TARGET_TC_FOLDER_ID" == "null" ]]; then
    log_info "Thư mục '$TARGET_SPRINT_NAME' chưa tồn tại bên Test Case. Khởi tạo thư mục mới..."
    CREATE_FOLDER_PAYLOAD=$(cat <<EOF
{
  "_type": "test-case-folder",
  "name": "${TARGET_SPRINT_NAME}",
  "parent": {
    "_type": "test-case-folder",
    "id": "${SQUASH_TC_G31_FOLDER_ID}"
  }
}
EOF
)
    CREATE_FOLDER_RES=$(call_api "POST" "/api/rest/latest/test-case-folders" "$CREATE_FOLDER_PAYLOAD")
    TARGET_TC_FOLDER_ID=$(echo "$CREATE_FOLDER_RES" | jq -r '.id')
    
    if [[ -z "$TARGET_TC_FOLDER_ID" || "$TARGET_TC_FOLDER_ID" == "null" ]]; then
        log_error "Tạo thư mục Test Case thất bại!"
        echo "$CREATE_FOLDER_RES"
        exit 1
    fi
    log_ok "Khởi tạo thư mục thành công (ID: $TARGET_TC_FOLDER_ID)"
else
    log_ok "Thư mục đã tồn tại bên Test Case (ID: $TARGET_TC_FOLDER_ID)"
fi

log_info "3. Kiểm tra Test Case: $TEST_CASE_NAME"

ENCODED_SEARCH=$(jq -rn --arg x "name~\"${TEST_CASE_NAME}\"" '$x|@uri')
SEARCH_RES=$(call_api "GET" "/api/rest/latest/test-cases?search=${ENCODED_SEARCH}")
TC_ID=$(echo "$SEARCH_RES" | jq -r "._embedded.\"test-cases\"[]? | select(.name == \"${TEST_CASE_NAME}\") | .id" | head -n 1)

if [[ -z "$TC_ID" || "$TC_ID" == "null" ]]; then
    log_info "Test case chưa tồn tại. Tạo mới..."
    CREATE_TC_PAYLOAD=$(cat <<EOF
{
  "_type": "scripted-test-case",
  "name": "${TEST_CASE_NAME}",
  "description": "Auto-generated test case from Jira",
  "parent": {
    "_type": "test-case-folder",
    "id": "${TARGET_TC_FOLDER_ID}"
  }
}
EOF
)
    CREATE_TC_RES=$(call_api "POST" "/api/rest/latest/test-cases" "$CREATE_TC_PAYLOAD")
    TC_ID=$(echo "$CREATE_TC_RES" | jq -r '.id')
    
    if [[ -z "$TC_ID" || "$TC_ID" == "null" ]]; then
        log_error "Tạo test case thất bại!"
        echo "$CREATE_TC_RES"
        exit 1
    fi
    log_ok "Tạo test case thành công (ID: $TC_ID)"
else
    log_warn "Test case đã tồn tại (ID: $TC_ID). Dán đè script..."
fi

log_info "4. Cập nhật script Gherkin..."

GHERKIN_CONTENT=$(cat "$GHERKIN_FILE" | jq -Rs .)
PATCH_PAYLOAD=$(cat <<EOF
{
  "_type": "scripted-test-case",
  "script": ${GHERKIN_CONTENT}
}
EOF
)

PATCH_RES=$(call_api "PATCH" "/api/rest/latest/test-cases/${TC_ID}" "$PATCH_PAYLOAD")

log_ok "Cập nhật script thành công!"
echo "--------------------------------------------------"
echo "✅ Đã push thành công lên Squash TM"
echo "- Project ID: ${SQUASH_PROJECT_ID}"
echo "- Thư mục: ${TARGET_SPRINT_NAME}"
echo "- Test Case: ${TEST_CASE_NAME}"
echo "- Link: ${SQUASH_BASE_URL}/test-case-workspace/test-case/${TC_ID}"
echo "--------------------------------------------------"
exit 0
