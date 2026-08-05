# ==========================================================
# Template Báo Cáo Kết Quả Automation Test
# ==========================================================
# Agent sử dụng template này để sinh báo cáo sau khi chạy test.
# Thay thế các placeholder [...] bằng dữ liệu thực tế.
# ==========================================================

# Báo cáo Kết quả Automation Test — [{issueKey}] {Tên tính năng}

**Ngày chạy:** {timestamp}
**Môi trường:** {UAT / Staging / Sandbox}
**Framework:** Playwright + Pytest
**Task Type:** {UI / API / WebSocket}
**File feature:** `{đường dẫn tới file .feature}`

---

## Tổng kết

| Chỉ số          | Giá trị  |
|-----------------|----------|
| Tổng test cases | {total}  |
| ✅ Passed       | {passed} |
| ❌ Failed       | {failed} |
| ⏭️ Skipped     | {skipped}|
| ⏱️ Thời gian   | {time}s  |

---

## Chi tiết kết quả

| # | Test Case | Trạng thái | Thời gian | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | {test_method_name} | {✅ PASSED / ❌ FAILED} | {time}s | {ghi chú nếu cần} |

---

## Chi tiết lỗi (nếu có)

> Bỏ qua mục này nếu tất cả test case đều PASSED.

### ❌ {test_method_name}
- **Lỗi:** {Error message từ pytest output}
- **File:** {file_path}:{line_number}
- **Loại lỗi:** {Script Error / Application Bug}
  - `Script Error`: Lỗi kỹ thuật của script (ImportError, SyntaxError...) → Agent đã tự sửa.
  - `Application Bug`: Ứng dụng/API trả kết quả sai so với spec → Báo cáo cho dev team.
- **Screenshot:** {Đính kèm nếu là UI test — đường dẫn tới ảnh}

---

## Truy vết Scenario ↔ Test

> Bảng mapping giữa scenario trong file `.feature` và test method tương ứng.

| Scenario trong .feature | Test method | Kết quả |
|-------------------------|-------------|---------|
| {Tên scenario} | {test_method_name} | {✅ PASSED / ❌ FAILED} |

---

## Ghi chú

- File báo cáo HTML: `tests/automation/{issueKey}/reports/report.html`
- Screenshot lỗi: `tests/automation/{issueKey}/screenshots/`
- Để chạy lại: `pytest tests/automation/{issueKey}/ -v`
