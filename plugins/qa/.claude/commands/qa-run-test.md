---
description: "Chạy test automation hiện có (Pytest/Playwright) và xuất báo cáo kết quả kiểm thử ngay lập tức. Không review lan man hay điều tra mã nguồn backend. Đề xuất kỹ năng debug hoặc code review khi có lỗi."
---

CHỈ thực thi test scripts đã có sẵn và xuất báo cáo. KHÔNG sinh code automation mới. KHÔNG review thêm bất cứ mã nguồn hay tài liệu nào.

$ARGUMENTS có thể chứa Jira issue key (VD: G3PTP-16825), đường dẫn thư mục, file test cụ thể, hoặc marker pytest.

## Nguyên Tắc Cốt Lõi: Chạy Ngay — Báo Cáo Ngay — Không Lan Man

1. **Định vị Target Trực Tiếp & Chuẩn Bị:**
   - **Xác định target:**
     - Nếu $ARGUMENTS chỉ định file hoặc thư mục cụ thể → Trỏ thẳng target đó để chạy ngay.
     - Nếu có `{issueKey}` → Target mặc định: `workspace/{issueKey}/test/steps/`.
     - Nếu không có → Quét tìm thư mục `steps` hoặc `tests` gần nhất trong workspace.
   - **Nhận diện test files:** Khớp cả hai chuẩn `test_*.py` và `*_test.py`.
   - Tạo thư mục kết quả `workspace/{issueKey}/test/result/` và dọn dẹp kết quả cũ (nếu có).
   - **TUYỆT ĐỐI KHÔNG** đọc file spec, checklist, hay review bất kỳ tài liệu nào trước khi chạy.

2. **Thực Thi Test Suite Ngay Lập Tức:**
   - Chạy test suite với cấu hình ghi Full Log và hỗ trợ cả 2 chuẩn file:
     ```bash
     HTML_FLAG=""
     python3 -c "import pytest_html" 2>/dev/null && HTML_FLAG="--html=$REPORT_DIR/report.html --self-contained-html"

     pytest "$TEST_TARGET" -o python_files="test_*.py *_test.py" -v -s -o log_cli=true -o log_cli_level=INFO -rA --tb=short --junitxml="$REPORT_DIR/junit.xml" $HTML_FLAG 2>&1 | tee "$REPORT_DIR/test-output.log"
     ```
   - **Cờ cốt lõi:** `-s` (không nuốt log), live logging, `-rA` (tổng kết mọi test), và chuyển hướng `2>&1 | tee` vào DUY NHẤT 1 file `test-output.log`.

3. **Trả Kết Quả Tức Thì & Xuất Báo Cáo Độc Bản:**
   - Đọc kết quả từ console output / `test-output.log` và `junit.xml`.
   - Ghi báo cáo chính thức vào DUY NHẤT một file `workspace/{issueKey}/test/result/report.md` gồm:
     - Bảng tổng kết: Total / Passed / Failed / Skipped / Thời gian / Tỷ lệ Pass.
     - Danh sách test cases Failed (trích xuất trực tiếp tên hàm test, file, dòng lỗi, thông báo lỗi AssertionError/Exception từ log).
     - Danh sách test cases Passed (rút gọn).
   - Trình bày tóm tắt kết quả Pass/Fail và link file báo cáo cho user.

4. **Đề Xuất Kỹ Năng Xử Lý Tiếp Theo (Nếu Có Test Thất Bại):**
   - **Tuyệt đối KHÔNG tự điều tra backend code, KHÔNG tự chạy script curl/urllib ngoài luồng.**
   - Ngay sau bảng kết quả, đề xuất các kỹ năng/vai trò chuyên trách để xử lý lỗi:
     - 🛠️ **Gỡ lỗi mã nguồn backend / Tìm nguyên nhân:** Đề xuất dùng skill `dev-debugging` hoặc gọi subagent `dev` để trace code và kiểm tra log backend.
     - 🔍 **Review mã nguồn:** Đề xuất dùng skill `cr-review-code-and-quality` hoặc gọi subagent `code-reviewer` để đánh giá chất lượng và logic implementation.
     - ⚙️ **Cập nhật kịch bản kiểm thử:** Đề xuất dùng skill `qa-auto-design` nếu các tham số kiểm thử cần được cập nhật theo spec mới.

## Quy Tắc Bắt Buộc

1. **KHÔNG đọc lan man:** Không đọc lại spec (`final.md`), checklist, hay POM trước/sau khi chạy.
2. **KHÔNG điều tra mã nguồn backend:** CẤM dùng `grep_search`, `view_file` hay bất kỳ công cụ nào để lục lọi source code backend/service.
3. **KHÔNG chạy API ngoài luồng:** CẤM tự viết script Python hoặc gọi lệnh cURL để test lại API bên ngoài test suite.
4. **KHÔNG sửa code gian lận:** Tuyệt đối KHÔNG sửa assertion/logic để ép FAIL→PASS — test FAIL do bug ứng dụng là kết quả hợp lệ cần báo cáo.
5. **Output báo cáo bằng TIẾNG VIỆT.**
6. **ĐỘC BẢN OUTPUT (BẮT BUỘC):** Sau khi chạy xong, trong thư mục kết quả chỉ sinh ra DUY NHẤT 1 file mỗi loại: đúng 1 file XML (`junit.xml`), 1 file HTML (`report.html` nếu có pytest-html), 1 file LOG (`test-output.log`), 1 file MD (`report.md`).
7. **FULL CHI TIẾT LOG:** File `test-output.log` BẮT BUỘC ghi lại chi tiết full log toàn bộ console stdout/stderr qua cờ `-s`.

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
