---
name: qa-squash-push
description: >
  Tự động đẩy file Gherkin test case (.feature) lên hệ thống Squash TM thông qua REST API,
  sau đó gán test case vào test plan của requirement tương ứng bên Campaign Workspace.
  Hỗ trợ quét Requirement Workspace để lấy Sprint mới nhất, đồng bộ tạo thư mục bên Test Case Workspace và tự động dán đè script.
  Trigger: "/qa-push-squash {issueKey}"
---

# Skill: qa-squash-push

## Mục đích
Tự động đẩy tài liệu Test Case (định dạng Gherkin) đã thiết kế trong dự án lên hệ thống quản lý test Squash TM, rồi **gán test case đó vào requirement tương ứng bên Campaign Workspace** để sẵn sàng execute.

Skill gồm 2 phase:

| Phase | Workspace | API | Auth | Fail thì sao? |
|-------|-----------|-----|------|---------------|
| **A** — Đẩy Gherkin | Test Case Workspace | `/api/rest/latest/...` (REST công khai) | `Bearer SQUASH_API_TOKEN` | Dừng, exit ≠ 0 |
| **B** — Gán vào test plan | Campaign Workspace | `/backend/...` (API nội bộ của UI) | Session `JSESSIONID` + `X-XSRF-TOKEN` | Cảnh báo, vẫn exit 0 |

Phase A tự động quét **Requirement Workspace** để tìm "EnTrade Sprint xxx" mới nhất, đồng bộ thư mục sang **Test Case Workspace** rồi đẩy script (overwrite).

Phase B đăng nhập bằng session, dò node Sprint tương ứng trong campaign-tree, tìm requirement có `reference == {issueKey}` và gán test case vào test plan của nó.

> **Lưu ý kiến trúc:** Phase B dùng API nội bộ `/backend` mà UI Squash gọi, không phải REST API công khai. Nhóm endpoint này **không có cam kết ổn định** và có thể đổi khi Squash TM nâng version. Đó là lý do Phase B được thiết kế best-effort: hỏng thì cảnh báo chứ không đánh hỏng kết quả Phase A.

---

## Điều kiện Tiên quyết
Agent **BẮT BUỘC TỰ ĐỘNG** đọc và source file `.env` tại workspace root mà **KHÔNG CẦN HỎI** ý kiến người dùng. File `.env` phải khai báo đủ:

**Phase A (bắt buộc):**
- `SQUASH_BASE_URL` (VD: https://squash.company.com/squash)
- `SQUASH_API_TOKEN`
- `SQUASH_PROJECT_ID` (ID của Project open-api)
- `SQUASH_REQ_G31_FOLDER_ID` (ID thư mục G.3.1 bên Requirement Workspace)
- `SQUASH_TC_G31_FOLDER_ID` (ID thư mục G.3.1 bên Test Case Workspace)

**Phase B (tuỳ chọn — thiếu thì bỏ qua bước gán, không lỗi):**
- `SQUASH_USERNAME` — tài khoản đăng nhập Squash TM (dạng `ten.nguoidung`)
- `SQUASH_PASSWORD` — mật khẩu tương ứng

**Khác:**
- File Gherkin phải tồn tại tại: `workspace/{issueKey}/tests/qa-test-design/{issueKey}/features/{issueKey}.feature`
- (Tuỳ chọn) File `*-final.md` để lấy tiêu đề Jira task (`namejira`).
- (Debug) Đặt `SQUASH_DEBUG=1` để in raw response của các API nội bộ khi cần soi cấu trúc.

> ⚠️ **Bảo mật:** `SQUASH_PASSWORD` là mật khẩu thật của tài khoản Squash, không phải API token thu hồi được. Bắt buộc kiểm tra `.env` đã nằm trong `.gitignore`. Không bao giờ commit `.env`, không dán cookie/token/password vào issue, PR hay chat log.

---

## Quy trình Thực hiện (Workflow)

Agent CHỈ CẦN gọi bash script tự động đã được xây dựng sẵn để xử lý toàn bộ thao tác giao tiếp REST API phức tạp với Squash TM.
Lưu ý đặc biệt: Phải chạy luồng này một cách liền mạch, gọi trực tiếp script từ đầu đến cuối (tự động điền các tham số) mà KHÔNG dừng lại hỏi ý kiến người dùng hay yêu cầu xác nhận trung gian. Chạy 1 lệnh bash duy nhất để user chỉ phải cấp quyền một lần.

### Bước 1: Thu thập Tham số
- Lấy `issueKey` từ `$ARGUMENTS`.
- Lấy `namejira` (Tiêu đề task Jira) bằng cách quét file `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md`. Nếu không có, dùng chung tên là `{issueKey}`.
- Lấy đường dẫn file Gherkin: `workspace/{issueKey}/tests/qa-test-design/{issueKey}/features/{issueKey}.feature`

### Bước 2: Gọi Bash Script Tự Động
- Execute file script: `skills/qa-squash-push/scripts/squash-push.sh`
- Cú pháp:
  ```bash
  bash skills/qa-squash-push/scripts/squash-push.sh <ISSUE_KEY> <NAME_JIRA> <GHERKIN_FILE_PATH>
  ```

### Logic bên trong Script (Để Agent nắm bắt)

**PHASE A — Test Case Workspace (REST công khai, Bearer token)**

1. **Tìm Sprint Mới Nhất:** Gọi GET list các thư mục trong `SQUASH_REQ_G31_FOLDER_ID` (Requirement Workspace). Dùng regex tìm `EnTrade Sprint xxx`, chọn số `xxx` lớn nhất để lấy tên thư mục (vd: `EnTrade Sprint 046`).
2. **Đồng bộ Thư mục Target:** Tìm trong `SQUASH_TC_G31_FOLDER_ID` (Test Case Workspace) xem đã có thư mục `EnTrade Sprint 046` chưa.
   - Nếu chưa: Tự động POST tạo mới thư mục này bên Test Case. Lấy ra ID của thư mục vừa tạo.
   - Nếu có: Lấy ID thư mục hiện tại.
3. **Kiểm tra & Tạo Test Case:** Đặt tên test case là `{issueKey}-{namejira}`. Tìm test case trong thư mục Target.
   - Nếu chưa có: Tạo mới (POST, format: `GHERKIN`).
   - Nếu đã có: Lấy Test Case ID hiện tại.
4. **Cập nhật Gherkin Script:** Gọi PATCH update toàn bộ nội dung file `.feature` vào trường `script` của Test Case ID, dán đè dữ liệu cũ.

**PHASE B — Campaign Workspace (API nội bộ `/backend`, session-based)**

Bỏ qua toàn bộ phase nếu thiếu `SQUASH_USERNAME`/`SQUASH_PASSWORD`.

5. **Đăng nhập:** `GET {BASE}/login` để Spring Security phát hành cookie `XSRF-TOKEN`, rồi `POST {BASE}/backend/login` (form-urlencoded: `username`, `password`) kèm header `X-XSRF-TOKEN`. Cookie lưu trong file tạm `chmod 600`, xoá bằng `trap EXIT`. Token XSRF được đọc lại sau đăng nhập vì Spring xoay vòng token.
6. **Dò node Sprint:** `POST {BASE}/backend/campaign-tree` hai lượt — lượt 1 với `openedNodes: []` để lấy các node gốc (`CampaignLibrary-*`, `SprintGroup-*`), lượt 2 mở chính các node đó để lộ danh sách `Sprint-*`. Chọn sprint theo 3 mức ưu tiên:
   1. Tên node trùng khớp tuyệt đối `EnTrade Sprint 046`
   2. Tên node chứa cùng số hiệu sprint (`046`)
   3. Node có số ID lớn nhất
7. **Tìm Requirement:** `GET {BASE}/backend/sprint-view/{sprintId}?frontEndErrorIsHandled=true`. Duyệt đệ quy toàn bộ response tìm object có `reference` khớp `{issueKey}` (không phân biệt hoa thường), lấy `id` (fallback `sprintReqVersionId`, `sprintReqVersionBindingId`).
8. **Gán Test Case:** `POST {BASE}/backend/sprint-req-version/{sprintReqVersionId}/test-plan-items` với body `{"testCaseIds":[{TC_ID}]}`.

Bất kỳ bước nào từ 5–8 hỏng: in cảnh báo, giữ nguyên exit code 0.

### Bước 3: Trình bày Kết quả
Nếu bash script chạy thành công (Exit code 0), Agent báo cáo lại cho người dùng bằng format:

```markdown
✅ **Đã push thành công lên Squash TM:**

- **Sprint:** EnTrade Sprint xxx (Lấy chuẩn từ Requirement)
- **Test Case:** `{issueKey}-{namejira}`
- **Hành động:** Đã đồng bộ thư mục / Đã tạo mới (hoặc Overwrite) test case
- **Campaign Workspace:** Đã gán vào requirement `{issueKey}` / Bỏ qua (kèm lý do)
```

Exit code 0 **không** đảm bảo Phase B thành công. Agent phải đọc dòng `- Campaign Workspace:` trong output để biết bước gán có chạy được hay không, và nếu bỏ qua thì báo lại lý do cho người dùng thay vì im lặng.

Nếu script thất bại (Thiếu env, không tìm thấy file, lỗi API Phase A), Agent in ra lỗi chi tiết.

---

## Xử lý sự cố (Phase B)

| Cảnh báo | Nguyên nhân thường gặp | Cách xử lý |
|----------|------------------------|------------|
| `Chưa cấu hình SQUASH_USERNAME / SQUASH_PASSWORD` | Thiếu biến trong `.env` | Bổ sung 2 biến, kiểm tra `.env` đã gitignore |
| `Đăng nhập thất bại (HTTP 401/403)` | Sai mật khẩu, hoặc tài khoản bị khoá | Đăng nhập thủ công trên UI để xác nhận |
| `Không tìm thấy node Sprint nào trong campaign-tree` | Cấu trúc cây khác dự đoán, hoặc user không có quyền xem Campaign Workspace | Chạy lại với `SQUASH_DEBUG=1` để xem raw response |
| `Không khớp được node Sprint` | Tên sprint bên Campaign khác bên Requirement (vd `Sprint 46` vs `EnTrade Sprint 046`) | Kiểm tra và đồng bộ lại quy ước đặt tên |
| `Không tìm thấy requirement nào có reference '{issueKey}'` | Requirement chưa được thêm vào Sprint, hoặc field Reference bỏ trống | Vào Campaign Workspace điền Reference = issueKey |
| `Gán test case thất bại (HTTP 4xx)` | Endpoint `/backend` đã đổi ở version Squash mới | Capture lại request từ DevTools và cập nhật script |
