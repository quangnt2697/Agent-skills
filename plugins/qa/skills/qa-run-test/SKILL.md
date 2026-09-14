---
name: qa-run-test
description: Thực thi bộ test tự động (Pytest/Playwright), tự sửa lỗi script kỹ thuật và xuất báo cáo kết quả kiểm thử toàn diện.
trigger: Khi cần chạy test suite tự động, kiểm thử hồi quy (regression) hoặc thẩm định kết quả kiểm thử sau khi fix bug. Trigger bằng lệnh /qa-run-test.
---

# Kỹ Năng Thực Thi Kiểm Thử Tự Động (qa-run-test)

## 1. Khi nào dùng?
- Đã có sẵn bộ mã kiểm thử trong thư mục `workspace/{issueKey}/test/steps/`.
- Cần thực thi test tự động, thu thập log chi tiết và xuất báo cáo kết quả `report.md`.
- Chạy kiểm thử hồi quy (Regression test) hoặc xác minh sau khi DEV sửa bug.

**Khi KHÔNG sử dụng:**
- Chưa có code test trong `steps/` → Dùng `qa-auto-design` để sinh code trước.
- Tuyệt đối KHÔNG dùng skill này để tự viết lại mã test từ đầu.

## 2. Quy trình Thực thi 5 Bước
- **Bước 1 (Pre-flight Check):** Xác định mục tiêu `workspace/{issueKey}/test/steps/`, nhận diện cả 2 định dạng `test_*.py` và `*_test.py`, dọn dẹp thư mục `result/`.
- **Bước 2 (Thực thi Test Suite):** Chạy Pytest với cờ `-s`, live logging, và xuất đồng thời ra `test-output.log` cùng `junit.xml`.
- **Bước 3 (Self-fix Loop Kỹ thuật):** Nếu gặp lỗi cú pháp, import, thiếu fixture ➔ Tự sửa code test (tối đa 3 vòng). Nghiêm cấm sửa assertion để biến FAILED thành PASS khi hệ thống trả lỗi thật.
- **Bước 4 (Phân loại Thất bại):** Phân loại lỗi thành Application Bug, Script Issue, Environment, hoặc Flaky. Bắt buộc bóc tách Request/Response cho 100% test case lỗi.
- **Bước 5 (Xuất Báo cáo Độc bản):** Ghi báo cáo chính thức vào duy nhất file `workspace/{issueKey}/test/result/report.md` và tóm tắt ngắn gọn cho người dùng.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 bước thực thi, cấm kỵ (Anti-cheating), Red Flags và Checklist xác minh.
  - [test_execution_guide.md](references/test_execution_guide.md): Cú pháp lệnh CLI Pytest tối ưu, cấu hình xuất JUnit/HTML report.
  - [failure_analysis_and_reporting.md](references/failure_analysis_and_reporting.md): Hướng dẫn phân loại lỗi và mẫu báo cáo kết quả kiểm thử chuẩn Markdown.

## 4. Ví dụ mẫu (Few-shot Example)
- **Output:** Báo cáo tóm tắt trên màn hình sau khi chạy:
  ```markdown
  ### 📊 Kết Quả Thực Thi Kiểm Thử: STK-101
  - **Tổng số tests:** 12 | ✅ **Passed:** 11 | ❌ **Failed:** 1 | ⏱️ **Thời gian:** 4.2s
  - **Lỗi phát hiện:** `test_cancel_order_after_matching` -> Trạng thái mong đợi `CANNOT_CANCEL`, thực tế trả `CANCELLED`.
  - **Phân loại:** 🐛 Application Bug (Hệ thống cho phép hủy lệnh đã khớp).
  - **Artifacts:** Đã lưu log tại `result/test-output.log` và báo cáo chi tiết tại `result/report.md`.
  ```
