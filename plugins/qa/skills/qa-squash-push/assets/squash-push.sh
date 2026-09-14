#!/bin/bash
# ==============================================================================
# squash-push.sh — Tự động đẩy Gherkin file lên Squash TM (V6)
# ==============================================================================
# PHASE A — Dò Sprint Mới Nhất & Tạo Mới Test Case Sạch Sẽ
#   1. Quét tìm Sprint mới nhất trên ĐA WORKSPACE (Test Case, Requirement, Campaign).
#   2. Tự động khởi tạo thư mục Sprint mới nhất bên Test Case Workspace (nếu chưa có).
#   3. QUÉT & XÓA TEST CASE CŨ Ở BẤT KỲ ĐÂU: Quét toàn project, xóa executions & xóa
#      hoàn toàn test case cũ liên quan đến ISSUE_KEY trước khi push mới.
#   4. Khởi tạo Test Case mới tinh tại thư mục Sprint mới nhất.
#   5. Nạp nội dung kịch bản Gherkin (.feature) qua PATCH.
#
# PHASE B — Campaign Workspace
#   6. Dò node Sprint tương ứng trong Campaign Workspace.
#   7. Đọc sprint-view, tìm requirement có reference == ISSUE_KEY.
#   8. XÓA SẠCH TEST PLAN ITEM CŨ: Quét test-plan-items và xóa sạch (nếu có).
#   9. Gán Test Case mới vào test plan của sprint-req-version đó.
#  10. Lưu thông tin đồng bộ vào workspace/{ISSUE_KEY}/test/squash_sync.json.
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
        -H "Origin: ${SQUASH_BASE_URL}" \
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
            -H "Origin: ${SQUASH_BASE_URL}" \
            -H "Referer: ${SQUASH_BASE_URL}/campaign-workspace" \
            -H "User-Agent: Mozilla/5.0" \
            -H "Accept: application/json, text/plain, */*" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}"
    else
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Origin: ${SQUASH_BASE_URL}" \
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

fetch_all_folder_contents() {
    local type="$1"
    local folder_id="$2"
    local page=0
    local all_items="[]"

    while true; do
        local res
        res=$(call_api "GET" "/api/rest/latest/${type}/${folder_id}/content?page=${page}&size=100" 2>/dev/null || echo "{}")
        local items
        items=$(echo "$res" | jq -c '._embedded.content // []' 2>/dev/null || echo "[]")
        if [[ "$items" == "[]" || "$items" == "null" ]]; then
            break
        fi

        all_items=$(jq -c -s '.[0] + .[1]' <(echo "$all_items") <(echo "$items"))

        local total_pages
        total_pages=$(echo "$res" | jq -r '.page.totalPages // 1' 2>/dev/null || echo "1")
        page=$((page + 1))
        if [[ "$page" -ge "$total_pages" ]]; then
            break
        fi
    done

    echo "$all_items"
}

fetch_campaign_sprints() {
    if [[ "$HAS_BACKEND_SESSION" -ne 1 ]]; then
        echo "[]"
        return 0
    fi

    local OPENED_NODES="[\"CampaignLibrary-${SQUASH_PROJECT_ID}\"]"
    local TREE_JSON
    TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" "{\"openedNodes\":${OPENED_NODES},\"selectedNodes\":[]}")

    local CHILD_GROUPS
    CHILD_GROUPS=$(echo "$TREE_JSON" | jq -c --arg pid "$SQUASH_PROJECT_ID" '
      [ .dataRows[]? | select(.parentRowId == "CampaignLibrary-\($pid)") | .id ] | unique
    ' 2>/dev/null || echo "[]")

    if [[ "$CHILD_GROUPS" != "[]" && -n "$CHILD_GROUPS" ]]; then
        local COMBINED_OPENED
        COMBINED_OPENED=$(jq -c -n --argjson cg "$CHILD_GROUPS" --arg pid "$SQUASH_PROJECT_ID" '
          $cg + ["CampaignLibrary-" + $pid] | unique
        ')
        TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" "{\"openedNodes\":${COMBINED_OPENED},\"selectedNodes\":[]}")
    fi

    echo "$TREE_JSON" | jq -c '
      [ .dataRows[]?
        | select((.id? // "" | tostring) | test("^Sprint-[0-9]+$"))
        | {id: .id, name: (.data.NAME? // ""), source: "Campaign"}
      ]
    ' 2>/dev/null || echo "[]"
}

delete_test_case_executions() {
    local tc_id="$1"
    if [[ "$HAS_BACKEND_SESSION" -ne 1 ]]; then
        return 0
    fi

    refresh_xsrf
    local EXEC_GRID_PAYLOAD='{"gridRequest":1,"size":100,"page":0,"allowedPageSizes":[10,25,50,100],"active":true,"fixedPaginationSize":false,"showAll":false,"sort":[{"property":"lastExecutedOn","direction":"DESC"}],"filterValues":[],"scope":[],"extendedHighLvlReqScope":true,"simplifiedColumnDisplayGridIds":[],"gridId":"test-case-view-execution","searchOnMultiColumns":false}'

    local EXEC_RES
    EXEC_RES=$(curl -s -X POST "${SQUASH_BASE_URL}/backend/test-case/${tc_id}/executions" \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "Origin: ${SQUASH_BASE_URL}" \
        -H "Referer: ${SQUASH_BASE_URL}/test-case-workspace/test-case/${tc_id}/executions?anchor=executions" \
        -H "User-Agent: Mozilla/5.0" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/plain, */*" \
        -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
        --data-raw "$EXEC_GRID_PAYLOAD" 2>/dev/null || echo "{}")

    local OLD_EXEC_IDS
    OLD_EXEC_IDS=$(echo "$EXEC_RES" | jq -r '.dataRows[]?.id // empty' 2>/dev/null || true)
    if [[ -n "$OLD_EXEC_IDS" ]]; then
        for OLD_EXEC_ID in $OLD_EXEC_IDS; do
            call_api "DELETE" "/api/rest/latest/executions/${OLD_EXEC_ID}" > /dev/null 2>&1 || true
            refresh_xsrf
            curl -s -X DELETE "${SQUASH_BASE_URL}/backend/executions/${OLD_EXEC_ID}" \
                -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                -H "Origin: ${SQUASH_BASE_URL}" \
                -H "Referer: ${SQUASH_BASE_URL}/test-case-workspace" \
                -H "User-Agent: Mozilla/5.0" \
                -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" > /dev/null 2>&1 || true
            log_ok "Đã xoá execution cũ: $OLD_EXEC_ID của Test Case #${tc_id}"
        done
    fi
}

purge_old_test_cases_anywhere() {
    local issue_key="$1"
    local proj_id="$2"

    log_info "2. Kiểm tra Test Case cũ của '${issue_key}' trên toàn bộ dự án (để dọn sạch)..."

    local page=0
    local found_tcs="[]"

    while true; do
        local res
        res=$(call_api "GET" "/api/rest/latest/projects/${proj_id}/test-cases?page=${page}&size=100" 2>/dev/null || echo "{}")
        local tcs
        tcs=$(echo "$res" | jq -c '._embedded["test-cases"] // []' 2>/dev/null || echo "[]")
        if [[ "$tcs" == "[]" || "$tcs" == "null" ]]; then
            break
        fi

        local matched
        matched=$(echo "$tcs" | jq -c --arg key "$issue_key" '
          [ .[]? | select(
              (.name? // "") as $n
              | ($n == $key)
                or ($n | startswith($key + "-"))
                or ($n | test("(^|[^A-Za-z0-9])" + $key + "([^A-Za-z0-9]|$)"; "i"))
            )
            | {id: .id, name: .name}
          ]
        ' 2>/dev/null || echo "[]")

        found_tcs=$(jq -c -s '.[0] + .[1]' <(echo "$found_tcs") <(echo "$matched"))

        local total_pages
        total_pages=$(echo "$res" | jq -r '.page.totalPages // 1' 2>/dev/null || echo "1")
        page=$((page + 1))
        if [[ "$page" -ge "$total_pages" ]]; then
            break
        fi
    done

    local count
    count=$(echo "$found_tcs" | jq 'length')

    if [[ "$count" -gt 0 ]]; then
        log_warn "Phát hiện $count test case cũ liên quan đến '${issue_key}' trên dự án:"
        local tc_ids
        tc_ids=$(echo "$found_tcs" | jq -r '.[].id')
        for old_id in $tc_ids; do
            local old_name
            old_name=$(echo "$found_tcs" | jq -r --argjson oid "$old_id" '.[] | select(.id == $oid) | .name')
            log_info "-> Dọn dẹp executions của Test Case cũ #${old_id} ('${old_name}')..."
            delete_test_case_executions "$old_id"

            log_info "-> Xóa bỏ Test Case cũ #${old_id} ('${old_name}')..."
            call_api "DELETE" "/api/rest/latest/test-cases/${old_id}" > /dev/null 2>&1 || true
            log_ok "Đã xóa hoàn toàn Test Case cũ #${old_id} ('${old_name}')"
        done
    else
        log_info "Không tìm thấy Test Case cũ nào của '${issue_key}' trên dự án. Sẵn sàng tạo mới."
    fi
}

# ==============================================================================
# PHASE A — Đẩy Gherkin lên Test Case Workspace
# ==============================================================================

log_info "1. Quét tìm Sprint mới nhất trên đa Workspace (Test Case, Requirement, Campaign)..."

# 1.1 Quét Test Case Workspace
TC_ITEMS_JSON=$(fetch_all_folder_contents "test-case-folders" "$SQUASH_TC_G31_FOLDER_ID")
TC_CANDIDATES=$(echo "$TC_ITEMS_JSON" | jq -c '
  [ .[]?
    | select(.name? and (.name | test("sprint[\\s_\\-]*[0-9]+"; "i")))
    | .name as $name
    | ($name | capture("sprint[\\s_\\-]*0*(?<num>[0-9]+)"; "i") | .num | tonumber) as $num
    | {id: .id, name: $name, num: $num, source: "Test Case Workspace"}
  ]
' 2>/dev/null || echo "[]")

# 1.2 Quét Requirement Workspace
REQ_CANDIDATES="[]"
if [[ -n "${SQUASH_REQ_G31_FOLDER_ID:-}" ]]; then
    REQ_ITEMS_JSON=$(fetch_all_folder_contents "requirement-folders" "$SQUASH_REQ_G31_FOLDER_ID")
    REQ_CANDIDATES=$(echo "$REQ_ITEMS_JSON" | jq -c '
      [ .[]?
        | select(.name? and (.name | test("sprint[\\s_\\-]*[0-9]+"; "i")))
        | .name as $name
        | ($name | capture("sprint[\\s_\\-]*0*(?<num>[0-9]+)"; "i") | .num | tonumber) as $num
        | {id: .id, name: $name, num: $num, source: "Requirement Workspace"}
      ]
    ' 2>/dev/null || echo "[]")
fi

# 1.3 Quét Campaign Workspace
CAMP_CANDIDATES="[]"
if [[ "$HAS_BACKEND_SESSION" -eq 1 ]]; then
    CAMP_SPRINTS_JSON=$(fetch_campaign_sprints)
    CAMP_CANDIDATES=$(echo "$CAMP_SPRINTS_JSON" | jq -c '
      [ .[]?
        | select(.name? and (.name | test("sprint[\\s_\\-]*[0-9]+"; "i")))
        | .name as $name
        | ($name | capture("sprint[\\s_\\-]*0*(?<num>[0-9]+)"; "i") | .num | tonumber) as $num
        | {id: .id, name: $name, num: $num, source: "Campaign Workspace"}
      ]
    ' 2>/dev/null || echo "[]")
fi

# 1.4 Tổng hợp ứng viên từ cả 3 Workspace và lấy Sprint lớn nhất (mới nhất)
ALL_CANDIDATES=$(jq -c -s '.[0] + .[1] + .[2]' <(echo "$TC_CANDIDATES") <(echo "$REQ_CANDIDATES") <(echo "$CAMP_CANDIDATES"))
LATEST_CANDIDATE=$(echo "$ALL_CANDIDATES" | jq -c 'sort_by(.num) | last // empty' 2>/dev/null || echo "")

if [[ -z "$LATEST_CANDIDATE" || "$LATEST_CANDIDATE" == "null" || "$LATEST_CANDIDATE" == "{}" ]]; then
    log_error "Không tìm thấy bất kỳ thư mục hay node nào chứa định dạng 'Sprint xxx' trên cả 3 Workspace!"
    exit 1
fi

TARGET_SPRINT_NAME=$(echo "$LATEST_CANDIDATE" | jq -r '.name')
SPRINT_NUMBER=$(echo "$LATEST_CANDIDATE" | jq -r '.num')
SPRINT_SOURCE=$(echo "$LATEST_CANDIDATE" | jq -r '.source')

log_ok "Đã xác định Sprint mới nhất: '$TARGET_SPRINT_NAME' (#${SPRINT_NUMBER}) — phát hiện từ: ${SPRINT_SOURCE}"

# 1.5 Kiểm tra / Tạo thư mục Sprint bên Test Case Workspace
TARGET_TC_FOLDER_ID=$(echo "$TC_CANDIDATES" | jq -r --argjson num "$SPRINT_NUMBER" '
  .[] | select(.num == $num) | .id
' | head -n 1)

if [[ -z "$TARGET_TC_FOLDER_ID" || "$TARGET_TC_FOLDER_ID" == "null" ]]; then
    log_info "Thư mục Sprint #${SPRINT_NUMBER} chưa tồn tại trong Test Case Workspace. Khởi tạo thư mục '${TARGET_SPRINT_NAME}'..."
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
    log_ok "Khởi tạo thư mục Test Case thành công (ID: $TARGET_TC_FOLDER_ID)"
else
    log_ok "Đã có sẵn thư mục trong Test Case Workspace (ID: $TARGET_TC_FOLDER_ID)"
fi

# 2. Xóa sạch Test Case cũ ở bất kỳ nơi nào trên toàn dự án trước khi tạo mới
purge_old_test_cases_anywhere "$ISSUE_KEY" "$SQUASH_PROJECT_ID"

# 3. Tạo mới Test Case tại thư mục Sprint mới nhất
log_info "3. Khởi tạo Test Case mới: '${TEST_CASE_NAME}' tại thư mục '${TARGET_SPRINT_NAME}'..."
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
    log_error "Tạo test case mới thất bại!"
    echo "$CREATE_TC_RES"
    exit 1
fi
log_ok "Khởi tạo test case mới thành công (ID: $TC_ID)"

# 4. Nạp script Gherkin vào Test Case mới
log_info "4. Cập nhật kịch bản Gherkin vào Test Case #${TC_ID}..."
GHERKIN_CONTENT=$(cat "$GHERKIN_FILE" | jq -Rs .)
PATCH_PAYLOAD=$(cat <<EOF
{
  "_type": "scripted-test-case",
  "script": ${GHERKIN_CONTENT}
}
EOF
)
PATCH_RES=$(call_api "PATCH" "/api/rest/latest/test-cases/${TC_ID}" "$PATCH_PAYLOAD")
log_ok "Cập nhật script Gherkin thành công!"

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
        // ( [ .[] | select((.data.NAME // "") | test("sprint[\\s_\\-]*0*" + $num + "([^0-9]|$)"; "i")) ] | first )
        // ( [ .[] | select((.data.NAME // "") | test("(^|[^0-9])" + $num + "([^0-9]|$)")) ] | first )
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
                -H "Origin: ${SQUASH_BASE_URL}" \
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
        -H "Origin: ${SQUASH_BASE_URL}" \
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
