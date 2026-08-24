---
description: Chỉ chạy test automation đã có sẵn và xuất báo cáo kết quả. Không sinh code mới.
---

CHỈ thực thi test scripts đã có sẵn và xuất báo cáo. KHÔNG sinh code automation mới.

$ARGUMENTS chứa Jira issue key (VD: G3PTP-16825).

## Quy trình

1. **Tìm test scripts có sẵn:**
   - Tìm tại `/project-root/workspace/{issueKey}/test/steps/test_*.py`
   - Nếu không tìm thấy → thông báo user chưa có test scripts, gợi ý chạy `/qa-auto-design {issueKey}` để sinh code trước
   - KHÔNG tự viết hoặc sinh code test mới

2. **Chạy test:**
   - Thực thi `pytest /project-root/workspace/{issueKey}/test/steps/ -v`
   - Nếu có cấu hình pytest-html: thêm `--html=/project-root/workspace/{issueKey}/test/result/report.html --self-contained-html`
   - Self-fix Loop: Nếu lỗi **kỹ thuật** của script (ImportError, SyntaxError, fixture thiếu...) → sửa script → chạy lại
   - KHÔNG sửa code để ép test case FAIL thành PASS

3. **Xuất báo cáo:**
   - Đọc kết quả pytest output
   - Sinh báo cáo Markdown theo template `references/report_template.md`
   - Bao gồm:
     - Bảng tổng kết: Total / Passed / Failed / Skipped / Thời gian
     - Chi tiết từng test case
     - Chi tiết lỗi (nếu có)
     - Bảng truy vết Scenario ↔ Test method (nếu có file .feature)
     - Bảng truy vết End-to-End (nếu có file Business-Spec (ba-spec))
   - Lưu tại `/project-root/workspace/{issueKey}/test/result/report.md`

4. **Trình bày kết quả cho user:**
   - Hiển thị bảng tổng kết Pass/Fail
   - Nếu có FAILED → hiển thị chi tiết lỗi + phân loại: Script Error vs Application Bug
   - Đường dẫn đến file báo cáo

## Quy tắc

1. KHÔNG sinh code test mới — chỉ chạy code đã có
2. KHÔNG sửa assertion/logic để ép FAIL→PASS — test FAIL do bug ứng dụng là kết quả hợp lệ
3. CHỈ sửa lỗi kỹ thuật script (import sai, fixture thiếu, syntax error...)
4. Output báo cáo bằng TIẾNG VIỆT
