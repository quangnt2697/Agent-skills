---
name: qa-run-test
description: 'Chạy test automation hiện có (Pytest/Playwright) và xuất báo cáo kết quả kiểm thử ngay lập tức. Không review lan man hay điều tra mã nguồn backend. Đề xuất kỹ năng debug hoặc code review khi có lỗi. Chạy lại test sau khi fix bug.'
trigger: Khi cần chạy test automation đã có sẵn, regression test, hoặc thẩm định kết quả sau fix bug. Trigger bằng /qa-run-test.
---

# Kỹ Năng Thực Thi Kiểm Thử Tự Động (qa-run-test)

## 1. Khi Nào Dùng & Nguyên Tắc Cốt Lõi
- **Khi nào dùng:**
  - Đã có sẵn mã kiểm thử trong `workspace/{issueKey}/test/steps/` hoặc file test cụ thể.
  - Cần chạy test tự động ngay lập tức, thu thập log và xuất báo cáo kết quả `report.md`.
  - Chạy regression test hoặc thẩm định kết quả sau khi DEV sửa bug.
- **Khi KHÔNG dùng:**
  - Chưa có test script ➔ Dùng `qa-auto-design` để sinh code trước.
  - Không dùng skill này để tự viết lại test từ đầu.
- **Nguyên tắc cốt lõi: Chạy ngay — Báo cáo ngay — Không lan man:**
  - ❌ **KHÔNG** đọc lại tài liệu spec (`final.md`), user story hay checklist trước/sau khi chạy.
  - ❌ **KHÔNG** mở file, tìm kiếm (`grep_search`), hoặc phân tích mã nguồn backend/ứng dụng.
  - ❌ **KHÔNG** tự tạo script Python / lệnh cURL ngoài luồng để kiểm tra hay tái hiện API.
  - ❌ **KHÔNG** tự thực hiện Root Cause Analysis sâu trong kiến trúc hệ thống hay viết code sửa backend.
- **Ranh giới trách nhiệm:** QA ghi nhận trung thực kết quả thực thi (Pass/Fail). Nếu có lỗi hệ thống, đề xuất kỹ năng chuyên trách (`dev-debugging`, `cr-review-code-and-quality`) để điều tra nguyên nhân.

## 2. Quy Trình Thực Thi Tinh Gọn 3 Bước

### Bước 1: Định vị Target Trực Tiếp
- Xác định mục tiêu từ tham số hoặc mặc định:
  - Nếu có file/thư mục cụ thể trong tham số: Trỏ thẳng target đó.
  - Nếu có `{issueKey}`: Target mặc định là `workspace/{issueKey}/test/steps/`.
  - Nhận diện cả hai chuẩn file: `test_*.py` và `*_test.py`.
- Chuẩn bị thư mục kết quả `workspace/{issueKey}/test/result/` và dọn dẹp kết quả cũ (nếu có).
- **CHẠY NGAY LẬP TỨC**, không thực hiện bất kỳ bước phân tích hay review nào trước khi chạy.

### Bước 2: Thực Thi Test Suite
- Chạy Pytest tiêu chuẩn để ghi Full Log:
  ```bash
  pytest "$TEST_TARGET" \
    -o python_files="test_*.py *_test.py" \
    -s -v -rA --tb=short \
    -o log_cli=true -o log_cli_level=INFO \
    --junitxml="workspace/{issueKey}/test/result/junit.xml" \
    2>&1 | tee "workspace/{issueKey}/test/result/test-output.log"
  ```
- Nếu môi trường có `pytest-html`, tự động thêm cờ `--html=... --self-contained-html`.
- Không nuốt log (cờ `-s`), toàn bộ console output được lưu vào duy nhất `test-output.log`.

### Bước 3: Trả Kết Quả Tức Thì & Đề Xuất Kỹ Năng Xử Lý
- Đọc kết quả trực tiếp từ output Pytest và `test-output.log`:
  - Tổng số test, số Passed, số Failed, số Skipped, thời gian thực thi.
  - Với các test Failed: Trích xuất tên test, dòng gây lỗi, thông báo lỗi (`AssertionError` / Exception) hiển thị trong log.
- Xuất báo cáo độc bản ra duy nhất file `workspace/{issueKey}/test/result/report.md`.
- **ĐỀ XUẤT HÀNH ĐỘNG TIẾP THEO (NẾU CÓ TEST THẤT BẠI):**
  - 🛠️ **Gỡ lỗi mã nguồn / Tìm nguyên nhân gốc rễ backend:** Đề xuất chạy skill `dev-debugging` (hoặc subagent `dev`).
  - 🔍 **Đánh giá chất lượng & Review mã nguồn:** Đề xuất chạy skill `cr-review-code-and-quality` (hoặc subagent `code-reviewer`).
  - ⚙️ **Cập nhật kịch bản test (nếu test script out-of-date):** Đề xuất chạy skill `qa-auto-design`.

## 3. Tài Nguyên Mở Rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): Chi tiết quy trình 3 bước, cấm kỵ (Zero-review, no deep investigation), Checklist xác minh.
  - [test_execution_guide.md](references/test_execution_guide.md): Cú pháp lệnh CLI Pytest tối ưu, cấu hình xuất JUnit/HTML report.
  - [failure_analysis_and_reporting.md](references/failure_analysis_and_reporting.md): Mẫu báo cáo kết quả kiểm thử chuẩn Markdown và quy chuẩn đề xuất skill xử lý lỗi.

