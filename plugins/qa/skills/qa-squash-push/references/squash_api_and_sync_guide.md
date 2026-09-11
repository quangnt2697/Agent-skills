# Cẩm Nang Tích Hợp API & Đồng Bộ Test Case Lên Squash TM (Squash API & Sync Guide)

Tài liệu này cung cấp hướng dẫn kỹ thuật chi tiết về cấu hình môi trường, giao thức REST API công khai (Phase A), giao thức Internal API session-based (Phase B), và cơ chế đồng bộ kịch bản Gherkin lên hệ thống Squash TM.

---

## 1. Cấu Hình Biến Môi Trường (.env)

Kỹ năng `qa-squash-push` tự động nạp cấu hình từ file `.env` tại thư mục root của plugin hoặc root của dự án. File cấu hình gồm 2 nhóm biến chính:

```bash
# ==============================================================================
# PHASE A: Test Case Workspace (Bắt buộc — REST API công khai)
# ==============================================================================
SQUASH_BASE_URL="https://squash.company.com/squash"   # URL gốc của hệ thống Squash TM
SQUASH_API_TOKEN="ey..."                             # Bearer token cá nhân có quyền ghi
SQUASH_PROJECT_ID="12"                               # ID của dự án kiểm thử trên Squash
SQUASH_REQ_G31_FOLDER_ID="105"                       # ID thư mục gốc Requirement (VD: G.3.1)
SQUASH_TC_G31_FOLDER_ID="210"                        # ID thư mục gốc Test Case (VD: G.3.1)

# ==============================================================================
# PHASE B: Campaign Workspace (Tùy chọn — Backend Internal API Session-based)
# ==============================================================================
SQUASH_USERNAME="ten.nguoidung"                      # Tài khoản đăng nhập Squash TM
SQUASH_PASSWORD="mat_khau_that"                      # Mật khẩu tài khoản (dùng tạo session)
SQUASH_DEBUG="0"                                     # Đặt = 1 để in raw response JSON khi cần debug
```

### Quy tắc An toàn Thông tin:
- `SQUASH_PASSWORD` là mật khẩu người dùng thực tế, bắt buộc đảm bảo file `.env` đã được liệt kê trong `.gitignore`.
- Tuyệt đối không commit file `.env`, không dán token hoặc mật khẩu vào Jira issue, pull request hoặc console output.

---

## 2. Chi Tiết Quy Trình Phase A (Test Case Workspace — REST API Công Khai)

Phase A giao tiếp thông qua REST API chính thức của Squash TM (`/api/rest/latest/...`) với header `Authorization: Bearer ${SQUASH_API_TOKEN}`.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 1: Quét Sprint Mới Nhất từ Requirement Workspace                  │
│ GET /api/rest/latest/requirement-folders/{SQUASH_REQ_G31_FOLDER_ID}    │
│ ➔ Dùng regex "EnTrade Sprint [0-9]+" tìm số hiệu xxx lớn nhất          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 2: Đồng Bộ Cấu Trúc Thư Mục sang Test Case Workspace              │
│ GET /api/rest/latest/test-case-folders/{SQUASH_TC_G31_FOLDER_ID}       │
│ ➔ Nếu thư mục Sprint chưa có: POST tạo mới test-case-folder            │
│ ➔ Lấy targetFolderId của thư mục Sprint tương ứng                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 3: Cơ Chế Clean-Before-Add (Xóa Sạch Execution Cũ)                │
│ GET /api/rest/latest/test-cases trong targetFolderId                   │
│ ➔ Nếu Test Case đã tồn tại: quét toàn bộ executions gắn kèm            │
│ ➔ DELETE từng execution cũ để tránh lẫn lộn dữ liệu kiểm thử           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 4: Khởi Tạo hoặc Ghi Đè Kịch Bản Gherkin (PATCH Script)           │
│ ➔ Nếu chưa có: POST tạo mới test-case dạng GHERKIN                     │
│ ➔ PATCH /api/rest/latest/test-cases/{id} cập nhật trường "script"      │
│ ➔ Dán đè 100% nội dung file .feature mới vào Test Case                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Các Endpoint Phase A Cốt Lõi:
1. **Lấy danh sách thư mục con:**
   `GET /api/rest/latest/requirement-folders/{id}/content`
2. **Tạo thư mục Test Case mới:**
   `POST /api/rest/latest/test-case-folders`
   Payload: `{"_type": "test-case-folder", "name": "EnTrade Sprint xxx", "parent": {"id": SQUASH_TC_G31_FOLDER_ID}}`
3. **Tạo Test Case định dạng Gherkin:**
   `POST /api/rest/latest/test-cases`
   Payload: `{"_type": "test-case", "name": "{issueKey}-{namejira}", "parent": {"id": targetFolderId}, "script": {"_type": "script", "scriptType": "GHERKIN"}}`
4. **Cập nhật nội dung Gherkin:**
   `PATCH /api/rest/latest/test-cases/{id}`
   Payload: `{"script": {"_type": "script", "scriptType": "GHERKIN", "content": "...gherkin text..."}}`

---

## 3. Chi Tiết Quy Trình Phase B (Campaign Workspace — Internal API Session-Based)

Phase B là luồng **Best-effort**: kết nối với API nội bộ của UI Squash TM (`/backend/...`) để gán test case vào requirement tương ứng bên Campaign Workspace.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 5: Xác Thực Phiên Làm Việc (Spring Security Session)               │
│ GET /login ➔ Thu thập cookie JSESSIONID và header XSRF-TOKEN           │
│ POST /backend/login (form-urlencoded: username, password)               │
│ ➔ Lưu cookie vào file tạm (chmod 600), bẫy trap EXIT để tự xóa         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 6: Duyệt Cây Chiến Dịch (2-Pass Campaign Tree Exploration)         │
│ Lượt 1: POST /backend/campaign-tree với openedNodes: []                │
│ Lượt 2: POST /backend/campaign-tree mở các node cha để tìm Sprint-*    │
│ ➔ Phân giải sprintId theo: Trùng tên ➔ Trùng số hiệu ➔ ID lớn nhất     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 7: Tìm Requirement & Làm Sạch Test Plan (Clean-Before-Add)        │
│ GET /backend/sprint-view/{sprintId} ➔ Tìm reference == {issueKey}      │
│ Lấy sprintReqVersionId ➔ Quét /test-plan-items                         │
│ ➔ DELETE xóa sạch executions và test plan items cũ                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Bước 8: Gán Mới Test Case & Xuất Metadata Đồng Bộ                      │
│ POST /backend/sprint-req-version/{sprintReqVersionId}/test-plan-items   │
│ Payload: {"testCaseIds": [TC_ID]}                                      │
│ ➔ Ghi file metadata: workspace/{issueKey}/test/squash_sync.json         │
└────────────────────────────────────────────────────────────────────────┘
```

### Cấu Trúc File Metadata `squash_sync.json`:
Sau khi gán thành công, script tự động xuất file truy vết độc bản:
```json
{
  "issueKey": "G3PTP-17145",
  "nameJira": "Thiet-ke-luong-thanh-toan",
  "testCaseId": 12540,
  "sprintName": "EnTrade Sprint 046",
  "sprintId": "852",
  "sprintReqVersionId": "4321",
  "phaseAStatus": "SUCCESS",
  "phaseBStatus": "SUCCESS",
  "syncedAt": "2026-09-11T16:50:00Z"
}
```

---

## 4. Quy Chuẩn An Toàn & Bảo Mật (Security Standards)

1. **Quản lý Session Cookie Tạm:**
   - Session cookie tạo ra bởi `curl -c /tmp/squash_cookie_XXXXXX.txt` bắt buộc phân quyền `chmod 600`.
   - Sử dụng lệnh bẫy `trap 'rm -f /tmp/squash_cookie_*' EXIT` trong bash script để đảm bảo file cookie luôn được xóa sạch ngay khi script kết thúc (kể cả khi bị ngắt đột ngột).
2. **Masking Dữ liệu Nhạy cảm:**
   - Toàn bộ log console hiển thị cho người dùng tuyệt đối không chứa giá trị của `SQUASH_API_TOKEN`, cookie `JSESSIONID`, hoặc `SQUASH_PASSWORD`.
