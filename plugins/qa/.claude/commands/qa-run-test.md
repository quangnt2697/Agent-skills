---
description: "Chỉ chạy test automation đã có sẵn và xuất báo cáo kết quả. Không sinh code mới."
---

CHỈ thực thi test scripts đã có sẵn và xuất báo cáo. KHÔNG sinh code automation mới.

$ARGUMENTS có thể chứa Jira issue key (VD: G3PTP-16825), đường dẫn thư mục, hoặc file test cụ thể.

## Quy trình

1. **Tự động tìm kiếm thư mục steps & nhận diện test files:**
   - Nếu có `{issueKey}`:
     - Kiểm tra vị trí ưu tiên: `/project-root/workspace/{issueKey}/test/steps/`
   - Nếu không có `{issueKey}` hoặc không tìm thấy tại đường dẫn trên:
     - Tự động quét tìm thư mục `steps` trong workspace/repo (bỏ qua `node_modules`, `.git`, `.venv`...).
   - Nếu không tìm thấy thư mục `steps` nào → thông báo user chưa có test scripts, gợi ý chạy `/qa-auto-design {issueKey}` để sinh code trước.
   - Nhận diện tất cả các file test trong thư mục `steps` khớp định dạng:
     - `test_*.py`
     - `*_test.py`
   - Nếu user chỉ định file hoặc marker cụ thể trong $ARGUMENTS, áp dụng bộ lọc tương ứng.

2. **Đọc ngữ cảnh & các file liên quan trước khi chạy:**
   - Trước khi kích hoạt lệnh chạy, chủ động đọc các file liên quan để nắm rõ context:
     - **Cấu hình & Fixtures:** `conftest.py` (fixtures, session setup, teardown), `pytest.ini`, `pyproject.toml`, file `.env` của project/thư mục test (biến môi trường, baseURL, credentials). Cảnh báo ngay nếu thiếu config/env bắt buộc.
     - **Đặc tả & BDD:** Các file `*.feature` (trong `features/` cùng cấp/cha), file Business-Spec (`*-final.md`), file checklist (`*checklist*.md`) để hiểu các scenarios, business rules và chuẩn bị cho ma trận truy vết.
     - **Tầng bổ trợ:** Đọc các module được import trong test scripts (Service clients, Page Objects `pages/`, helpers/utils, dữ liệu test trong `data/`) để hiểu cách setup request, locators và assertions.

3. **Kiểm tra môi trường & Chạy test:**
   - Kiểm tra `pytest` và các thư viện cần thiết (`pytest-html`, `pytest-asyncio`, `playwright` nếu là UI).
   - Đảm bảo thư mục `$REPORT_DIR` được tạo (`mkdir -p "$REPORT_DIR"`), dọn dẹp các file trùng lặp cũ (`*-test-report.md`, log thừa) nếu có.
   - Thực thi test suite với full log chi tiết:
     `pytest "$TEST_DIR" -o python_files="test_*.py *_test.py" -v -s -o log_cli=true -o log_cli_level=INFO -rA --tb=short --junitxml="$REPORT_DIR/junit.xml" --html="$REPORT_DIR/report.html" --self-contained-html 2>&1 | tee "$REPORT_DIR/test-output.log"`
   - File `$REPORT_DIR/test-output.log` ghi lại 100% full log chi tiết (nhờ cờ `-s`, `-o log_cli=true`, `-rA` và chuyển hướng `2>&1 | tee`).
   - **Self-fix Loop (tối đa 3 lần):** Nếu phát sinh lỗi kỹ thuật của script (ImportError, syntax, fixture thiếu, timeout chờ event...) → sửa script/fixture → chạy lại. Tuyệt đối KHÔNG sửa assertion/logic để ép test case FAIL (do bug ứng dụng) thành PASS.

4. **Phân tích kết quả & Xuất báo cáo:**
   - Đọc kết quả từ log pytest và junit.xml.
   - Phân loại rõ ràng:
     - Application Bug (Lỗi nghiệp vụ/API/UI của ứng dụng) vs Script Error vs Environment Issue.
     - Với test API/WebSocket: BẮT BUỘC in Request (Method, URL, Headers, Body) và Response (Status, Body).
   - Sinh báo cáo Markdown tại DUY NHẤT một file `/project-root/workspace/{issueKey}/test/result/report.md` gồm:
     - Bảng tổng kết: Total / Passed / Failed / Skipped / Thời gian / Pass Rate.
     - Chi tiết từng test case Passed.
     - Chi tiết từng test case Failed kèm Root Cause và Đề xuất Fix.
     - **Bảng Truy vết Toàn trình (End-to-End Traceability Matrix):** Business Rule (`*-final.md`) ↔ Checklist ID (`*checklist*.md`) ↔ Scenario (`*.feature`) ↔ Test script (`test_*.py` / `*_test.py`) ↔ Kết quả (Pass/Fail).
     - Đề xuất hành động theo độ ưu tiên (P0/P1/P2) cho DEV, QA, DevOps.

5. **Trình bày kết quả cho user:**
   - Hiển thị bảng tổng kết Pass/Fail.
   - Nếu có FAILED: tóm tắt lỗi chính, phân loại bug vs lỗi script/môi trường.
   - Cung cấp đường dẫn đến file báo cáo `report.md`.

## Quy tắc

1. KHÔNG sinh code test mới — chỉ tìm và chạy code đã có trong `steps/`.
2. KHÔNG sửa assertion/logic để ép FAIL→PASS — test FAIL do bug ứng dụng là kết quả hợp lệ cần báo cáo.
3. CHỈ sửa lỗi kỹ thuật script (import sai, fixture thiếu, syntax error, timeout chờ...).
4. Output báo cáo bằng TIẾNG VIỆT.
5. Test API/WebSocket BẮT BUỘC in Request và Response trong báo cáo.
6. **ĐỘC BẢN OUTPUT (BẮT BUỘC):** Sau khi chạy xong, trong thư mục kết quả chỉ sinh ra DUY NHẤT 1 file mỗi loại: đúng 1 file XML (`junit.xml`), 1 file HTML (`report.html`), 1 file LOG (`test-output.log`), 1 file MD (`report.md`). Tuyệt đối KHÔNG sinh trùng 2 file cùng loại (cấm sinh đồng thời `{issueKey}-test-report.md` và `report.md`).
7. **FULL CHI TIẾT LOG:** File `test-output.log` BẮT BUỘC ghi lại chi tiết full log toàn bộ console stdout/stderr (không nuốt log, đầy đủ request/response payloads, websocket frames, logs từ các test methods).

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
