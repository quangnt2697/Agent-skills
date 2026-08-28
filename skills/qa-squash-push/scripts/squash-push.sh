#!/bin/bash
# ==============================================================================
# squash-push.sh — Tự động đẩy Gherkin file lên Squash TM (V4)
# ==============================================================================
# PHASE A — Test Case Workspace (REST API công khai, auth = Bearer token)
#   1. Tìm thư mục "EnTrade Sprint xxx" mới nhất trong Requirement Workspace (G.3.1).
#   2. Kiểm tra/Tạo thư mục tương ứng trong Test Case Workspace (G.3.1).
#   3. Tìm/Tạo test case dạng Gherkin và dán đè script.
#
# PHASE B — Campaign Workspace (API nội bộ /backend, auth = session JSESSIONID)
#   5. Đăng nhập lấy JSESSIONID + XSRF-TOKEN.
#   6. Quét campaign-tree tìm node Sprint tương ứng.
#   7. Đọc sprint-view, lọc requirement có reference == ISSUE_KEY.
#   8. Gán test case vào test plan của sprint-req-version đó.
#
# Phase B là best-effort: mọi lỗi chỉ cảnh báo, KHÔNG làm hỏng kết quả Phase A.
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
# Không dùng `export $(... | xargs)`: cách đó vỡ ngay khi value chứa dấu cách,
# `&`, `#` hay dấu nháy — vốn rất phổ biến trong mật khẩu. Parse thủ công thay vào đó.
load_env_file() {
    local file="$1" line key val
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line%$'\r'}"                                  # bỏ CRLF của file Windows
        [[ -z "${line//[[:space:]]/}" ]] && continue          # dòng trống
        [[ "$line" =~ ^[[:space:]]*# ]] && continue           # dòng comment
        [[ "$line" =~ ^[[:space:]]*export[[:space:]]+ ]] && line="${line#*export }"
        [[ "$line" != *"="* ]] && continue

        key="${line%%=*}"
        val="${line#*=}"
        key="${key//[[:space:]]/}"
        [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

        # Bóc cặp nháy bao ngoài, giữ nguyên mọi ký tự bên trong
        if [[ ${#val} -ge 2 && "$val" == \"*\" ]]; then
            val="${val:1:${#val}-2}"
        elif [[ ${#val} -ge 2 && "$val" == \'*\' ]]; then
            val="${val:1:${#val}-2}"
        fi

        export "$key=$val"
    done < "$file"
}

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
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

# ==============================================================================
# PHASE A — Đẩy Gherkin lên Test Case Workspace
# ==============================================================================

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

# Số hiệu sprint, dùng lại ở Phase B để dò node Sprint bên campaign-tree
SPRINT_NUMBER=$(echo "$TARGET_SPRINT_NAME" | grep -oE '[0-9]+' | tail -n 1)

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
PAGE=0
TC_ID=""
while true; do
    SEARCH_RES=$(call_api "GET" "/api/rest/latest/test-cases?search=${ENCODED_SEARCH}&page=${PAGE}&size=100")
    TC_ID=$(echo "$SEARCH_RES" | jq -r "._embedded.\"test-cases\"[]? | select(.name == \"${TEST_CASE_NAME}\") | .id" | head -n 1)
    if [[ -n "$TC_ID" && "$TC_ID" != "null" ]]; then
        break
    fi
    TOTAL_PAGES=$(echo "$SEARCH_RES" | jq -r '.page.totalPages // 0')
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

# ==============================================================================
# PHASE B — Gán Test Case vào Sprint Requirement Version (Campaign Workspace)
# ==============================================================================
# Dùng API nội bộ /backend (session-based), KHÔNG dùng Bearer token như Phase A.
# Toàn bộ phase này là best-effort: thất bại chỉ cảnh báo, exit code vẫn là 0.

COOKIE_JAR=""
cleanup_cookies() {
    [[ -n "$COOKIE_JAR" && -f "$COOKIE_JAR" ]] && rm -f "$COOKIE_JAR" || true
}
trap cleanup_cookies EXIT

XSRF_TOKEN=""
SPRINT_NODE_ID=""
SPRINT_REQ_VERSION_ID=""

# Đọc lại XSRF-TOKEN từ cookie jar (định dạng Netscape: $6=name, $7=value)
refresh_xsrf() {
    XSRF_TOKEN=$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$COOKIE_JAR" 2>/dev/null | tail -n 1)
}

# Gọi API nội bộ /backend bằng session cookie
call_backend() {
    local method="$1"
    local endpoint="$2"
    local payload="${3:-}"
    local content_type="${4:-application/json}"

    if [[ -z "$payload" ]]; then
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Accept: application/json, text/plain, */*" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}"
    else
        curl -s -X "$method" "${SQUASH_BASE_URL}${endpoint}" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -H "Accept: application/json, text/plain, */*" \
            -H "Content-Type: ${content_type}" \
            -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
            --data-raw "$payload"
    fi
}

assign_test_case_to_sprint() {
    if [[ -z "${SQUASH_USERNAME:-}" || -z "${SQUASH_PASSWORD:-}" ]]; then
        log_warn "Chưa cấu hình SQUASH_USERNAME / SQUASH_PASSWORD trong .env — bỏ qua bước gán vào Campaign Workspace."
        return 1
    fi

    COOKIE_JAR=$(mktemp)
    chmod 600 "$COOKIE_JAR"

    # --- 5. Đăng nhập lấy session ---
    log_info "5. Đăng nhập Campaign Workspace (session-based)..."

    # GET trang login để Spring Security phát hành cookie XSRF-TOKEN
    curl -s -o /dev/null -c "$COOKIE_JAR" "${SQUASH_BASE_URL}/login" || true
    refresh_xsrf

    if [[ -z "$XSRF_TOKEN" ]]; then
        log_warn "Không lấy được XSRF-TOKEN từ ${SQUASH_BASE_URL}/login — bỏ qua bước gán."
        return 1
    fi

    LOGIN_RES=$(curl -s -w '\n%{http_code}' -X POST "${SQUASH_BASE_URL}/backend/login" \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "Accept: application/json, text/plain, */*" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
        --data-urlencode "username=${SQUASH_USERNAME}" \
        --data-urlencode "password=${SQUASH_PASSWORD}")

    LOGIN_CODE=$(echo "$LOGIN_RES" | tail -n 1)
    if [[ "$LOGIN_CODE" != "200" && "$LOGIN_CODE" != "204" ]]; then
        log_warn "Đăng nhập thất bại (HTTP $LOGIN_CODE) — bỏ qua bước gán vào Campaign Workspace."
        log_debug "$(echo "$LOGIN_RES" | sed '$d')"
        return 1
    fi

    # XSRF-TOKEN thường xoay vòng sau khi đăng nhập
    refresh_xsrf
    if ! grep -q "JSESSIONID" "$COOKIE_JAR"; then
        log_warn "Đăng nhập không trả về JSESSIONID — bỏ qua bước gán."
        return 1
    fi
    log_ok "Đăng nhập thành công (user: ${SQUASH_USERNAME})"

    # --- 6. Tìm node Sprint trong campaign-tree ---
    log_info "6. Dò node Sprint trong Campaign Workspace..."

    # Lượt 1: lấy các node gốc
    TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" '{"openedNodes":[],"selectedNodes":[]}')
    log_debug "campaign-tree (root): $TREE_JSON"

    # Mở dần các nhánh theo chiều sâu (SprintGroup, CampaignFolder) cho đến khi lộ ra node Sprint
    # Chỉ mở CampaignLibrary tương ứng với SQUASH_PROJECT_ID để tối ưu
    PREV_OPENED="[]"
    while true; do
        OPENED_NODES=$(echo "$TREE_JSON" | jq -c --arg pid "${SQUASH_PROJECT_ID:-}" '
          [ .. | objects | .id? // empty | tostring
            | select(test("^(CampaignLibrary|SprintGroup|CampaignFolder)-[0-9]+$"))
            | select( (startswith("CampaignLibrary-") | not) or (. == "CampaignLibrary-\($pid)") ) ]
          | unique
        ' 2>/dev/null || echo '[]')

        if [[ "$OPENED_NODES" == "$PREV_OPENED" || "$OPENED_NODES" == "[]" ]]; then
            break
        fi

        PREV_OPENED="$OPENED_NODES"
        TREE_JSON=$(call_backend "POST" "/backend/campaign-tree" \
            "{\"openedNodes\":${OPENED_NODES},\"selectedNodes\":[]}")
    done
    FULL_TREE="$TREE_JSON"
    log_debug "campaign-tree (expanded): $FULL_TREE"

    SPRINT_NODES=$(echo "$FULL_TREE" | jq -c '
      [ .. | objects
        | select((.id? // "" | tostring) | test("^Sprint-[0-9]+$"))
        | {id: (.id | tostring), name: ((.name // .label // .title // "") | tostring)} ]
      | unique_by(.id)
    ' 2>/dev/null || echo '[]')

    if [[ "$SPRINT_NODES" == "[]" || -z "$SPRINT_NODES" ]]; then
        log_warn "Không tìm thấy node Sprint nào trong campaign-tree — bỏ qua bước gán."
        log_warn "Gợi ý: chạy lại với SQUASH_DEBUG=1 để xem cấu trúc cây trả về."
        return 1
    fi

    # Ưu tiên node trùng tên sprint bên Requirement, sau đó tới node cùng số hiệu,
    # cuối cùng mới lấy node có số lớn nhất.
    SPRINT_NODE_ID=$(echo "$SPRINT_NODES" | jq -r \
        --arg exact "$TARGET_SPRINT_NAME" \
        --arg num "$SPRINT_NUMBER" '
        ( [ .[] | select(.name == $exact) ] | first )
        // ( [ .[] | select(.name | test("(^|[^0-9])" + $num + "([^0-9]|$)")) ] | first )
        // ( [ .[] | . + {n: ((.id | capture("Sprint-(?<v>[0-9]+)") | .v | tonumber)) } ]
             | sort_by(.n) | last )
        | .id // empty
    ')

    if [[ -z "$SPRINT_NODE_ID" ]]; then
        log_warn "Không khớp được node Sprint cho '$TARGET_SPRINT_NAME' — bỏ qua bước gán."
        return 1
    fi

    SPRINT_ID="${SPRINT_NODE_ID#Sprint-}"
    SPRINT_MATCHED_NAME=$(echo "$SPRINT_NODES" | jq -r --arg id "$SPRINT_NODE_ID" '.[] | select(.id == $id) | .name')
    log_ok "Khớp Sprint: ${SPRINT_MATCHED_NAME:-$SPRINT_NODE_ID} (ID: $SPRINT_ID)"

    # --- 7. Tìm requirement có reference == ISSUE_KEY ---
    log_info "7. Tìm requirement có reference '${ISSUE_KEY}' trong Sprint..."

    SPRINT_VIEW=$(call_backend "GET" "/backend/sprint-view/${SPRINT_ID}?frontEndErrorIsHandled=true")
    log_debug "sprint-view: $SPRINT_VIEW"

    # Bản ghi cần tìm là object bất kỳ trong response có field reference khớp issueKey.
    # id của nó chính là sprintReqVersionId dùng cho endpoint test-plan-items.
    SPRINT_REQ_VERSION_ID=$(echo "$SPRINT_VIEW" | jq -r --arg key "$ISSUE_KEY" '
      [ .. | objects
        | select(((.reference? // "") | tostring | ascii_downcase) == ($key | ascii_downcase))
        | (.id? // .sprintReqVersionId? // .sprintReqVersionBindingId? // empty) ]
      | map(tostring) | unique | first // empty
    ' 2>/dev/null || echo "")

    if [[ -z "$SPRINT_REQ_VERSION_ID" ]]; then
        log_warn "Không tìm thấy requirement nào có reference '${ISSUE_KEY}' trong Sprint ${SPRINT_ID} — bỏ qua bước gán."
        log_warn "Kiểm tra lại: requirement đã được thêm vào Sprint chưa, và field Reference đã điền '${ISSUE_KEY}' chưa?"
        return 1
    fi

    log_ok "Tìm thấy Sprint Requirement Version (ID: $SPRINT_REQ_VERSION_ID)"

    # --- 8. Gán test case vào test plan ---
    log_info "8. Gán Test Case #${TC_ID} vào test plan của requirement..."

    ASSIGN_RES=$(curl -s -w '\n%{http_code}' -X POST \
        "${SQUASH_BASE_URL}/backend/sprint-req-version/${SPRINT_REQ_VERSION_ID}/test-plan-items" \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "Accept: application/json, text/plain, */*" \
        -H "Content-Type: application/json" \
        -H "X-XSRF-TOKEN: ${XSRF_TOKEN}" \
        --data-raw "{\"testCaseIds\":[${TC_ID}]}")

    ASSIGN_CODE=$(echo "$ASSIGN_RES" | tail -n 1)
    ASSIGN_BODY=$(echo "$ASSIGN_RES" | sed '$d')
    log_debug "test-plan-items response: $ASSIGN_BODY"

    if [[ "$ASSIGN_CODE" == "200" || "$ASSIGN_CODE" == "201" || "$ASSIGN_CODE" == "204" ]]; then
        log_ok "Đã gán Test Case vào requirement ${ISSUE_KEY}"
        return 0
    fi

    log_warn "Gán test case thất bại (HTTP $ASSIGN_CODE)."
    log_warn "Response: $ASSIGN_BODY"
    return 1
}

ASSIGN_STATUS="⏭️  Bỏ qua / thất bại (xem cảnh báo ở trên)"
if assign_test_case_to_sprint; then
    ASSIGN_STATUS="✅ Đã gán vào requirement ${ISSUE_KEY} (sprint-req-version ${SPRINT_REQ_VERSION_ID})"
fi

echo "--------------------------------------------------"
echo "✅ Đã push thành công lên Squash TM"
echo "- Project ID: ${SQUASH_PROJECT_ID}"
echo "- Thư mục: ${TARGET_SPRINT_NAME}"
echo "- Test Case: ${TEST_CASE_NAME}"
echo "- Link: ${SQUASH_BASE_URL}/test-case-/project-root/workspace/test-case/${TC_ID}"
echo "- Campaign Workspace: ${ASSIGN_STATUS}"
echo "--------------------------------------------------"
exit 0
