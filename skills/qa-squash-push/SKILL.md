---
name: qa-squash-push
description: >
  Tự động đẩy file Gherkin test case (.feature) lên hệ thống Squash TM thông qua REST API.
  Hỗ trợ quét Requirement Workspace để lấy Sprint mới nhất, đồng bộ tạo thư mục bên Test Case Workspace và tự động dán đè script.
  Trigger: "/qa-push-squash {issueKey}"
---

# Skill: qa-squash-push

## Mục đích
Tự động đẩy tài liệu Test Case (định dạng Gherkin) đã thiết kế trong dự án lên hệ thống quản lý test Squash TM. Tính năng đặc biệt: Tự động quét **Requirement Workspace** để tìm "EnTrade Sprint xxx" mới nhất, sau đó đồng bộ thư mục này sang **Test Case Workspace** trước khi đẩy script (overwrite) vào.

---

## Điều kiện Tiên quyết
- File `.env` phải khai báo đủ:
  - `SQUASH_BASE_URL` (VD: https://squash.company.com/squash)
  - `SQUASH_USERNAME`
  - `SQUASH_PASSWORD`
  - `SQUASH_PROJECT_ID` (ID của Project open-api)
  - `SQUASH_REQ_G31_FOLDER_ID` (ID thư mục G.3.1 bên Requirement Workspace)
  - `SQUASH_TC_G31_FOLDER_ID` (ID thư mục G.3.1 bên Test Case Workspace)
- File Gherkin phải tồn tại tại: `tests/qa-test-design/{issueKey}/features/{issueKey}.feature`
- (Tuỳ chọn) File `*-final.md` để lấy tiêu đề Jira task (`namejira`).

---

## Quy trình Thực hiện (Workflow)

Agent CHỈ CẦN gọi bash script tự động đã được xây dựng sẵn để xử lý toàn bộ thao tác giao tiếp REST API phức tạp với Squash TM:

### Bước 1: Thu thập Tham số
- Lấy `issueKey` từ `$ARGUMENTS`.
- Lấy `namejira` (Tiêu đề task Jira) bằng cách quét file `specs/imports/jira/{issueKey}/{issueKey}-final.md`. Nếu không có, dùng chung tên là `{issueKey}`.
- Lấy đường dẫn file Gherkin: `tests/qa-test-design/{issueKey}/features/{issueKey}.feature`

### Bước 2: Gọi Bash Script Tự Động
- Execute file script: `skills/qa-squash-push/scripts/squash-push.sh`
- Cú pháp:
  ```bash
  bash skills/qa-squash-push/scripts/squash-push.sh <ISSUE_KEY> <NAME_JIRA> <GHERKIN_FILE_PATH>
  ```

### Logic bên trong Script (Để Agent nắm bắt)
1. **Tìm Sprint Mới Nhất:** Gọi GET list các thư mục trong `SQUASH_REQ_G31_FOLDER_ID` (Requirement Workspace). Dùng regex tìm `EnTrade Sprint xxx`, chọn số `xxx` lớn nhất để lấy tên thư mục (vd: `EnTrade Sprint 046`).
2. **Đồng bộ Thư mục Target:** Tìm trong `SQUASH_TC_G31_FOLDER_ID` (Test Case Workspace) xem đã có thư mục `EnTrade Sprint 046` chưa.
   - Nếu chưa: Tự động POST tạo mới thư mục này bên Test Case. Lấy ra ID của thư mục vừa tạo.
   - Nếu có: Lấy ID thư mục hiện tại.
3. **Kiểm tra & Tạo Test Case:** Đặt tên test case là `{issueKey}-{namejira}`. Tìm test case trong thư mục Target.
   - Nếu chưa có: Tạo mới (POST, format: `GHERKIN`).
   - Nếu đã có: Lấy Test Case ID hiện tại.
4. **Cập nhật Gherkin Script:** Gọi PATCH update toàn bộ nội dung file `.feature` vào trường `script` của Test Case ID, dán đè dữ liệu cũ.

### Bước 3: Trình bày Kết quả
Nếu bash script chạy thành công (Exit code 0), Agent báo cáo lại cho người dùng bằng format:

```markdown
✅ **Đã push thành công lên Squash TM:**

- **Sprint:** EnTrade Sprint xxx (Lấy chuẩn từ Requirement)
- **Test Case:** `{issueKey}-{namejira}`
- **Hành động:** Đã đồng bộ thư mục / Đã tạo mới (hoặc Overwrite) test case
```

Nếu script thất bại (Thiếu env, không tìm thấy file, lỗi API), Agent in ra lỗi chi tiết.
