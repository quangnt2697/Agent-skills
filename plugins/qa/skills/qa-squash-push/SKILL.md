---
name: qa-squash-push
description: Tự động đồng bộ kịch bản kiểm thử BDD Gherkin (.feature) lên hệ thống quản lý kiểm thử Squash TM qua REST API và gán vào Campaign Test Plan.
trigger: Khi đã có file .feature hoàn chỉnh và cần đồng bộ test case lên Squash TM. Trigger bằng lệnh /qa-squash-push {issueKey}.
---

# Kỹ Năng Đẩy Test Case Lên Squash TM (qa-squash-push)

## 1. Khi nào dùng?
- Đã hoàn thiện kịch bản BDD Gherkin (`workspace/{issueKey}/test/{issueKey}.feature`) và đã pass qua script kiểm tra `qa-validate.sh`.
- Cần đồng bộ test case lên hệ thống Squash TM (Test Case Workspace) và tự động gán vào Sprint Test Plan (Campaign Workspace).

**Khi KHÔNG sử dụng:**
- Kịch bản `.feature` chưa được thẩm định cú pháp hoặc đang bị lỗi.
- Chưa có file `final.md` để lấy thông tin `namejira` (tên task).

## 2. Quy trình Thực thi 3 Bước
- **Bước 1 (Kiểm tra Đầu vào):** Xác định `issueKey`, trích xuất `namejira` từ `final.md`, kiểm tra file `{issueKey}.feature` tồn tại.
- **Bước 2 (Chạy Script Đồng bộ Tập trung):** Thực thi script duy nhất:
  ```bash
  bash plugins/qa/skills/qa-squash-push/assets/squash-push.sh "{issueKey}" "{namejira}" "workspace/{issueKey}/test/{issueKey}.feature"
  ```
  Script tự nạp cấu hình `.env`, tạo mới/ghi đè test case trên Test Case Workspace, và liên kết vào Campaign Workspace tương ứng với Sprint.
- **Bước 3 (Phân tích Kết quả & Lưu Metadata):** Đọc kết quả từ console, lưu thông tin đồng bộ vào `workspace/{issueKey}/test/squash_sync.json` và báo cáo cho người dùng.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Script tự động (assets/):**
  - [squash-push.sh](assets/squash-push.sh): Script Shell tự động hóa toàn bộ việc gọi REST API và session token tới Squash TM.
- 📖 **Tài liệu quy trình & Xử lý sự cố (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 3 bước, cấm kỵ (Anti-patterns) và Checklist xác minh.
  - [troubleshooting_and_edge_cases.md](references/troubleshooting_and_edge_cases.md): Xử lý các lỗi kết nối, hết hạn session token, conflict ID.

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** `/qa-squash-push STK-101`
- **Output:**
  ```markdown
  ### 🚀 Kết Quả Đồng Bộ Lên Squash TM: STK-101
  - **Kịch bản nguồn:** `workspace/STK-101/test/STK-101.feature` (5 scenarios).
  - **Test Case Workspace:** Đã cập nhật thành công thư mục `[Sprint 34] STK-101 Dat lenh mua`.
  - **Campaign Workspace:** Đã gán 5 test cases vào Test Plan của Requirement `STK-101`.
  - **Metadata:** Đã lưu kết quả tại `test/squash_sync.json`.
  ```
