#!/bin/bash
# ==============================================================================
# squash-push.sh — Tự động đẩy Gherkin file lên Squash TM (V5)
# ==============================================================================
# PHASE A — Test Case Workspace
#   1. Tìm thư mục "EnTrade Sprint xxx" mới nhất trong Test Case Workspace (G.3.1).
#   2. Kiểm tra/Tạo test case dạng Gherkin trong thư mục Sprint đó.
#   3. XÓA SẠCH EXECUTION CŨ: Quét executions của test case và xóa sạch (nếu có).
#   4. Cập nhật script Gherkin mới (PATCH).
#
# PHASE B — Campaign Workspace
#   5. Dò node Sprint tương ứng trong Campaign Workspace (tự động mở SprintGroup/Folder).
#   6. Đọc sprint-view, tìm requirement có reference == ISSUE_KEY.
#   7. XÓA SẠCH TEST PLAN ITEM CŨ: Quét test-plan-items và xóa sạch (nếu có).
#   8. Gán Test Case mới vào test plan của sprint-req-version đó.
#   9. Lưu thông tin đồng bộ vào workspace/{ISSUE_KEY}/test/squash_sync.json.
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
log_debug() { [[ "${SQUASH_DEBUG:-0}" == "1" ]] && echo -e "${BLUE}🐞 $1${NC}" || true; }

if [[ $# -lt 3 ]]; then
    echo "Sử dụng: bash squash-push.sh <ISSUE_KEY> <NAME_JIRA> <GHERKIN_FILE_PATH>"
    exit 1
fi

ISSUE_KEY="$1"
NAME_JIRA="$2"
GHERKIN_FILE="$3"
TEST_CASE_NAME="${ISSUE_KEY}-${NAME_JIRA}"

# --- Đọc .env ---
load_env_file() {
    local file="$1" line key val
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line%$'\r'}"
        [[ -z "${line//[[:space:]]/}" ]] && continue
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*export[[:space:]]+ ]] && line="${line#*export }"
        [[ "$line" != *"="* ]] && continue

        key="${line%%=*}"
        val="${line#*=}"
        key="${key//[[:space:]]/}"
        [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

        if [[ ${#val} -ge 2 && "$val" == \"*\" ]]; then
            val="${val:1:${#val}-2}"
        elif [[ ${#val} -ge 2 && "$val" == \'*\' ]]; then
            val="${val:1:${#val}-2}"
        fi

        export "$key=$val"
    done < "$file"
}

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
PROJECT_ROOT="${PWD}"

if [[ -f "${PLUGIN_DIR}/.env" ]]; then
    load_env_file "${PLUGIN_DIR}/.env"
fi
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    load_env_file "${PROJECT_ROOT}/.env"
fi

if [[ -z "${SQUASH_BASE_URL:-}" || -z "${SQUASH_API_TOKEN:-}" ]]; then
    log_error "Thiếu cấu hình đăng nhập Squash TM (SQUASH_BASE_URL, SQUASH_API_TOKEN) trong .env"
    exit 1
fi

if [[ -z "${SQUASH_PROJECT_ID:-}" || -z "${SQUASH_TC_G31_FOLDER_ID:-}" ]]; then
    log_error "Thiếu cấu hình Folder ID (SQUASH_PROJECT_ID, SQUASH_TC_G31_FOLDER_ID) trong .env"
    exit 1
fi

if [[ ! -f "$GHERKIN_FILE" ]]; then
    log_error "Không tìm thấy file Gherkin: $GHERKIN_FILE"
    exit 1
fi

# Cookie jar dùng cho các request backend / session
COOKIE_JAR=$(mktemp)
chmod 600 "$COOKIE_JAR"
cleanup_cookies() {
    [[ -n "$COOKIE_JAR" && -f "$COOKIE_JAR" ]] && rm -f "$COOKIE_JAR" || true
}
trap cleanup_cookies EXIT

XSRF_TOKEN=""
refresh_xsrf() {
    XSRF_TOKEN=$(grep -E "(^|[[:space:]])XSRF-TOKEN[[:space:]]" "$COOKIE_JAR" 2>/dev/null | tail -n 1 | awk '{print $NF}' | tr -d "\r\n")
}

# Đăng nhập session backend Squash TM
login_backend() {
    if [[ -z "${SQUASH_USERNAME:-}" || -z "${SQUASH_PASSWORD:-}" ]]; then
        log_warn "Chưa cấu hình SQUASH_USERNAME / SQUASH_PASSWORD — bỏ qua các thao tác nâng cao (xóa execution & Campaign Workspace)."
        return 1
    fi

    log_info "Khởi tạo phiên làm việc backend Squash TM..."
    curl -s -L -o /dev/null -c "$COOKIE_JAR" -H "User-Agent: Mozilla/5.0" "${SQUASH_BASE_URL}/login" || true
    refresh_xsrf

    if [[ -z "$XSRF_TOKEN" ]]; then
        log_warn "Không lấy được XSRF-TOKEN ban đầu từ ${SQUASH_BASE_URL}/login"
        return 1
    fi

    local LOGIN_RES
    LOGIN_RES=$(curl -s -w '\n%{http_code}' -X POST "${SQUASH_BASE_URL}/backend/login" \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "Origin: https://tm.dnse.com.vn" \
        -H "Referer: ${SQUASH_BASE_URL}/login" \
        -H "User-Agent: Mozilla/5.0" \
        -H "Accept: application/json, text/plain, */*" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
        --data-urlencode "username=${SQUASH_USERNAME}" \
        --data-urlencode "password=${SQUASH_PASSWORD}")

    local LOGIN_CODE
    LOGIN_CODE=$(echo "$LOGIN_RES" | tail -n 1)
    if [[ "$LOGIN_CODE" != "200" && "$LOGIN_CODE" != "204" ]]; then
        log_warn "Đăng nhập backend thất bại (HTTP $LOGIN_CODE)"
        return 1
    fi

    refresh_xsrf
    log_ok "Đăng nhập backend thành công (user: ${SQUASH_USERNAME})"
    return 0
}

# Gọi API REST công khai bằng Bearer Token
call_api() {
    local method="$1"
    local endpoint="$2"
    local payload="${3:-}"

    if [[ -z "$payload" ]]; then
        curl -s --max-time 60 --retry 2 --retry-delay 1 -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${SQUASH_API_TOKEN}" \
            -H "Accept: application/json"
    else
        curl -s --max-time 60 --retry 2 --retry-delay 1 -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${SQUASH_API_TOKEN}" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$payload"
    fi
}

# Gọi API nội bộ /backend bằng session cookie
call_backend() {
    local method="$1"
    local endpoint="$2"
    local payload="${3:-}"
    local content_type="${4:-application/json}"

    refresh_xsrf

    if [[ -z "$payload" ]]; then
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Origin: https://tm.dnse.com.vn" \
            -H "Referer: ${SQUASH_BASE_URL}/campaign-workspace" \
            -H "User-Agent: Mozilla/5.0" \
            -H "Accept: application/json, text/plain, */*" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}"
    else
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Origin: https://tm.dnse.com.vn" \
            -H "Referer: ${SQUASH_BASE_URL}/campaign-workspace" \
            -H "User-Agent: Mozilla/5.0" \
            -H "Accept: application/json, text/plain, */*" \
            -H "Content-Type: ${content_type}" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
            --data-raw "$payload"
    fi
}

# Đăng nhập backend sẵn sàng
HAS_BACKEND_SESSION=0
if login_backend; then
    HAS_BACKEND_SESSION=1
fi

# ==============================================================================
# PHASE A — Đẩy Gherkin lên Test Case Workspace
# ==============================================================================

log_info "1. Tìm Sprint mới nhất từ Test Case Workspace (Folder G.3.1)..."

# Ưu tiên lấy trực tiếp từ Test Case Workspace
TC_FOLDERS_JSON=$(call_api "GET" "/api/rest/latest/test-case-folders/${SQUASH_TC_G31_FOLDER_ID}/content?size=100")

TARGET_SPRINT_NAME=$(echo "$TC_FOLDERS_JSON" | jq -r '
  ._embedded.content[]?
  | select(.name | test("EnTrade Sprint [0-9]+"))
  | .name as $name
  | ($name | capture("EnTrade Sprint (?<num>[0-9]+)") | .num | tonumber) as $num
  | {name: $name, num: $num}
' | jq -r -s 'sort_by(.num) | last | .name // empty')

# Fallback sang Requirement Workspace nếu Test Case chưa có Sprint nào
if [[ -z "$TARGET_SPRINT_NAME" && -n "${SQUASH_REQ_G31_FOLDER_ID:-}" ]]; then
    log_info "Chưa tìm thấy Sprint bên Test Case, quét Requirement Workspace..."
    REQ_FOLDERS_JSON=$(call_api "GET" "/api/rest/latest/requirement-folders/${SQUASH_REQ_G31_FOLDER_ID}/content?size=100")
    TARGET_SPRINT_NAME=$(echo "$REQ_FOLDERS_JSON" | jq -r '
      ._embedded.content[]?
      | select(.name | test("EnTrade Sprint [0-9]+"))
      | .name as $name
      | ($name | capture("EnTrade Sprint (?<num>[0-9]+)") | .num | tonumber) as $num
      | {name: $name, num: $num}
    ' | jq -r -s 'sort_by(.num) | last | .name // empty')
fi

if [[ -z "$TARGET_SPRINT_NAME" || "$TARGET_SPRINT_NAME" == "null" ]]; then
    log_error "Không tìm thấy thư mục nào có định dạng 'EnTrade Sprint xxx'!"
    exit 1
fi

log_ok "Tìm thấy Sprint mới nhất: $TARGET_SPRINT_NAME"
SPRINT_NUMBER=$(echo "$TARGET_SPRINT_NAME" | grep -oE '[0-9]+' | tail -n 1)

# Lấy ID thư mục Sprint bên Test Case
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

log_info "2. Kiểm tra Test Case: $TEST_CASE_NAME"

PAGE=0
TC_ID=""
while true; do
    FOLDER_RES=$(call_api "GET" "/api/rest/latest/test-case-folders/${TARGET_TC_FOLDER_ID}/content?page=${PAGE}&size=100")
    TC_ID=$(echo "$FOLDER_RES" | jq -r "._embedded.content[]? | select(.name == \"${TEST_CASE_NAME}\" or (.name | startswith(\"${ISSUE_KEY}-\"))) | .id" | head -n 1)
    if [[ -n "$TC_ID" && "$TC_ID" != "null" ]]; then
        break
    fi
    TOTAL_PAGES=$(echo "$FOLDER_RES" | jq -r '.page.totalPages // 0')
    PAGE=$((PAGE + 1))
    if [[ "$PAGE" -ge "$TOTAL_PAGES" ]]; then
        break
    fi
done

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
    log_warn "Test case đã tồn tại (ID: $TC_ID)."

    # --- XÓA SẠCH EXECUTION CŨ CỦA TEST CASE (THEO YÊU CẦU USER) ---
    if [[ "$HAS_BACKEND_SESSION" -eq 1 ]]; then
        log_info "Kiểm tra executions cũ của Test Case ${TC_ID}..."
        refresh_xsrf
        EXEC_GRID_PAYLOAD='{"gridRequest":1,"size":50,"page":0,"allowedPageSizes":[10,25,50,100],"active":true,"fixedPaginationSize":false,"showAll":false,"sort":[{"property":"lastExecutedOn","direction":"DESC"}],"filterValues":[],"scope":[],"extendedHighLvlReqScope":true,"simplifiedColumnDisplayGridIds":[],"gridId":"test-case-view-execution","searchOnMultiColumns":false}'
        
        EXEC_RES=$(curl -s -X POST "${SQUASH_BASE_URL}/backend/test-case/${TC_ID}/executions" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Origin: https://tm.dnse.com.vn" \
            -H "Referer: ${SQUASH_BASE_URL}/test-case-workspace/test-case/${TC_ID}/executions?anchor=executions" \
            -H "User-Agent: Mozilla/5.0" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json, text/plain, */*" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
            --data-raw "$EXEC_GRID_PAYLOAD" 2>/dev/null || echo "{}")

        OLD_EXEC_IDS=$(echo "$EXEC_RES" | jq -r '.dataRows[]?.id // empty' 2>/dev/null || true)
        if [[ -n "$OLD_EXEC_IDS" ]]; then
            for OLD_EXEC_ID in $OLD_EXEC_IDS; do
                log_info "Xoá execution cũ (ID: $OLD_EXEC_ID) của Test Case ${TC_ID}..."
                call_api "DELETE" "/api/rest/latest/executions/${OLD_EXEC_ID}" > /dev/null 2>&1 || true
                refresh_xsrf
                curl -s -X DELETE "${SQUASH_BASE_URL}/backend/executions/${OLD_EXEC_ID}" \
                    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                    -H "Origin: https://tm.dnse.com.vn" \
                    -H "Referer: ${SQUASH_BASE_URL}/test-case-workspace" \
                    -H "User-Agent: Mozilla/5.0" \
                    -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" > /dev/null 2>&1 || true
                log_ok "Đã xoá execution cũ: $OLD_EXEC_ID"
            done
        else
            log_info "Không có execution cũ nào cần xoá."
        fi
    fi
fi

log_info "3. Cập nhật script Gherkin..."

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

# ==============================================================================
# PHASE B — Gán Test Case vào Campaign Workspace (Clean & Add New)
# ==============================================================================

SPRINT_REQ_VERSION_ID=""

assign_test_case_to_campaign() {
    if [[ "$HAS_BACKEND_SESSION" -ne 1 ]]; then
        log_warn "Không có session backend — bỏ qua bước gán vào Campaign Workspace."
        return 1
    fi

    log_info "4. Dò node Sprint '${TARGET_SPRINT_NAME}' trong Campaign Workspace..."

    # Mở dần các nhánh trong CampaignLibrary-PROJECT_ID
    local OPENED_NODES="[\"CampaignLibrary-${SQUASH_PROJECT_ID}\"]"
    local TREE_JSON
    TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" "{\"openedNodes\":${OPENED_NODES},\"selectedNodes\":[]}")

    # Lấy các thư mục nhóm (ví dụ SprintGroup-240 "G3.1", CampaignFolder-xxx)
    local CHILD_GROUPS
    CHILD_GROUPS=$(echo "$TREE_JSON" | jq -c --arg pid "$SQUASH_PROJECT_ID" '
      [ .dataRows[]? | select(.parentRowId == "CampaignLibrary-\($pid)") | .id ] | unique
    ' 2>/dev/null || echo "[]")

    if [[ "$CHILD_GROUPS" != "[]" && -n "$CHILD_GROUPS" ]]; then
        OPENED_NODES=$(echo "$CHILD_GROUPS" | jq -c --arg pid "$SQUASH_PROJECT_ID" '. + ["CampaignLibrary-\($pid)"] | unique')
        TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" "{\"openedNodes\":${OPENED_NODES},\"selectedNodes\":[]}")
    fi

    # Tìm node Sprint có tên trùng TARGET_SPRINT_NAME hoặc số SPRINT_NUMBER
    local SPRINT_NODE_ID
    SPRINT_NODE_ID=$(echo "$TREE_JSON" | jq -r \
        --arg exact "$TARGET_SPRINT_NAME" \
        --arg num "$SPRINT_NUMBER" '
        [ .dataRows[]? | select((.id? // "" | tostring) | test("^Sprint-[0-9]+$")) ]
        | ( [ .[] | select(.data.NAME == $exact) ] | first )
        // ( [ .[] | select(.data.NAME | test("(^|[^0-9])" + $num + "([^0-9]|$)")) ] | first )
        | .id // empty
    ' 2>/dev/null || echo "")

    if [[ -z "$SPRINT_NODE_ID" ]]; then
        log_warn "Không khớp được node Sprint cho '$TARGET_SPRINT_NAME' trong Campaign Workspace — bỏ qua bước gán."
        return 1
    fi

    local SPRINT_ID="${SPRINT_NODE_ID#Sprint-}"
    log_ok "Khớp Sprint trong Campaign: $SPRINT_NODE_ID (ID: $SPRINT_ID)"

    log_info "5. Tìm requirement '${ISSUE_KEY}' trong Sprint ${SPRINT_ID}..."
    local SPRINT_VIEW
    SPRINT_VIEW=$(call_backend "GET" "/backend/sprint-view/${SPRINT_ID}?frontEndErrorIsHandled=true")

    SPRINT_REQ_VERSION_ID=$(echo "$SPRINT_VIEW" | jq -r --arg key "$ISSUE_KEY" '
      [ .. | objects
        | select(((.reference? // "") | tostring | ascii_downcase) == ($key | ascii_downcase))
        | (.id? // .sprintReqVersionId? // .sprintReqVersionBindingId? // empty) ]
      | map(tostring) | unique | first // empty
    ' 2>/dev/null || echo "")

    if [[ -z "$SPRINT_REQ_VERSION_ID" ]]; then
        log_warn "Không tìm thấy requirement có reference '${ISSUE_KEY}' trong Sprint ${SPRINT_ID} — bỏ qua bước gán."
        return 1
    fi

    log_ok "Tìm thấy Sprint Requirement Version (ID: $SPRINT_REQ_VERSION_ID)"

    # XÓA SẠCH TEST PLAN ITEM CŨ (THEO YÊU CẦU USER)
    log_info "6. Quét và xoá test plan items cũ trong requirement..."
    local OLD_ITEMS_JSON
    OLD_ITEMS_JSON=$(call_backend "GET" "/backend/sprint-req-version/${SPRINT_REQ_VERSION_ID}/test-plan-items")
    
    local OLD_ITEM_IDS
    OLD_ITEM_IDS=$(echo "$OLD_ITEMS_JSON" | jq -r '
      if type == "array" then
        .[].id?
      elif type == "object" then
        (.content[]?.id? // ._embedded[][]?.id? // .items[]?.id?)
      else
        empty
      end | select(. != null)
    ' 2>/dev/null | sort -u || true)

    if [[ -n "$OLD_ITEM_IDS" ]]; then
        for OLD_ITEM_ID in $OLD_ITEM_IDS; do
            log_info "Xoá test plan item cũ (ID: $OLD_ITEM_ID)..."
            refresh_xsrf
            curl -s -X DELETE \
                "${SQUASH_BASE_URL}/backend/sprint-req-version/${SPRINT_REQ_VERSION_ID}/test-plan-items/${OLD_ITEM_ID}" \
                -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                -H "Origin: https://tm.dnse.com.vn" \
                -H "Referer: ${SQUASH_BASE_URL}/campaign-workspace" \
                -H "User-Agent: Mozilla/5.0" \
                -H "Accept: application/json, text/plain, */*" \
                -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" > /dev/null 2>&1 || true
            log_ok "Đã xoá test plan item cũ: $OLD_ITEM_ID"
        done
    else
        log_info "Không có test plan item cũ nào cần xoá."
    fi

    # GÁN MỚI TEST CASE VÀO REQUIREMENT
    log_info "7. Gán Test Case #${TC_ID} vào requirement trong Campaign..."
    refresh_xsrf
    local ASSIGN_RES
    ASSIGN_RES=$(curl -s -w '\n%{http_code}' -X POST \
        "${SQUASH_BASE_URL}/backend/sprint-req-version/${SPRINT_REQ_VERSION_ID}/test-plan-items" \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "Origin: https://tm.dnse.com.vn" \
        -H "Referer: ${SQUASH_BASE_URL}/campaign-workspace" \
        -H "User-Agent: Mozilla/5.0" \
        -H "Accept: application/json, text/plain, */*" \
        -H "Content-Type: application/json" \
        -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
        --data-raw "{\"testCaseIds\":[${TC_ID}]}")

    local ASSIGN_CODE
    ASSIGN_CODE=$(echo "$ASSIGN_RES" | tail -n 1)
    if [[ "$ASSIGN_CODE" == "200" || "$ASSIGN_CODE" == "201" || "$ASSIGN_CODE" == "204" ]]; then
        log_ok "Đã gán thành công Test Case vào requirement ${ISSUE_KEY}!"
        return 0
    fi

    log_warn "Gán test case thất bại (HTTP $ASSIGN_CODE)."
    return 1
}

ASSIGN_STATUS="⏭️  Bỏ qua / thất bại (xem cảnh báo ở trên)"
if assign_test_case_to_campaign; then
    ASSIGN_STATUS="✅ Đã gán vào requirement ${ISSUE_KEY} (sprint-req-version ${SPRINT_REQ_VERSION_ID})"
fi

# Lưu vết đồng bộ vào file squash_sync.json
SYNC_DIR="workspace/${ISSUE_KEY}/test"
if [[ -d "$SYNC_DIR" ]]; then
    SYNC_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    cat <<EOF > "${SYNC_DIR}/squash_sync.json"
{
  "testCaseId": ${TC_ID},
  "testCaseName": "${TEST_CASE_NAME}",
  "sprintName": "${TARGET_SPRINT_NAME}",
  "sprintReqVersionId": "${SPRINT_REQ_VERSION_ID:-}",
  "syncedAt": "${SYNC_TIME}"
}
EOF
    log_ok "Đã lưu truy vết vào ${SYNC_DIR}/squash_sync.json"
fi

echo "--------------------------------------------------"
echo "✅ Đã hoàn tất đồng bộ lên Squash TM"
echo "- Project ID: ${SQUASH_PROJECT_ID}"
echo "- Thư mục: ${TARGET_SPRINT_NAME}"
echo "- Test Case: ${TEST_CASE_NAME}"
echo "- Link: ${SQUASH_BASE_URL}/test-case-workspace/test-case/${TC_ID}"
echo "- Campaign Workspace: ${ASSIGN_STATUS}"
echo "--------------------------------------------------"
exit 0
