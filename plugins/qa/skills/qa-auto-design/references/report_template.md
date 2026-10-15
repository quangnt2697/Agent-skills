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

| Chỉ số            | Giá trị    |
|-------------------|------------|
| Tổng test cases   | {total}    |
| ✅ Passed         | {passed}   |
| ❌ Failed         | {failed}   |
| ⏭️ Skipped         | {skipped}  |
| ⏱️ Thời gian       | {time}s    |

---

## Chi tiết kết quả

| # | Test Case          | Trạng thái              | Thời gian   | Ghi chú           |
|---|--------------------|-------------------------|-------------|-------------------| 
| 1 | {test_method_name} | {✅ PASSED / ❌ FAILED} | {time}s     | {ghi chú nếu cần} |

---

## Chi tiết Request & Response và Các Step Thực Hiện (API / WebSocket)

> **BẮT BUỘC áp dụng cho 100% test case (CẢ ✅ PASSED VÀ ❌ FAILED).**
> - BẮT BUỘC hiển thị danh sách toàn bộ các Step đã thực hiện (Given / When / Then).
> - Với API / WebSocket: BẮT BUỘC hiển thị đầy đủ chi tiết Request đã gửi và Response/Event thực tế nhận được.
> - TUYỆT ĐỐI KHÔNG được chỉ log khi fail hay bỏ qua các case passed.

### Test Case #{n}: {test_method_name} — {✅ PASSED / ❌ FAILED}

**📋 Các bước thực hiện (Executed Steps):**
- **Step 1:** `[GIVEN]` {Mô tả Given tiền điều kiện} — {✅ PASSED / ❌ FAILED} ({time}ms)
- **Step 2:** `[WHEN]` {Mô tả When hành động kích hoạt} — {✅ PASSED / ❌ FAILED} ({time}ms)
- **Step 3:** `[THEN]` {Mô tả Then xác minh kết quả} — {✅ PASSED / ❌ FAILED} ({time}ms)
- **Step 4:** `[AND]` {Mô tả And assertions hoặc teardown} — {✅ PASSED / ❌ FAILED} ({time}ms)

**📤 Request (nếu có tương tác mạng):**

| Thuộc tính    | Giá trị                                                 |
|---------------|---------------------------------------------------------|
| Method        | {GET / POST / PUT / DELETE / WS_CONNECT / WS_SUBSCRIBE} |
| URL           | {full_url_with_path_params}                             |
| Thời gian gửi | {timestamp}                                             |

Headers:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "***masked***",
  "Authorization": "Bearer ***masked***"
}
```

Payload / Body:
```json
{request_body_json}
```

**📥 Response thực tế:**

| Thuộc tính    | Giá trị                     |
|---------------|-----------------------------|
| HTTP Status   | {status_code} {status_text} |
| Response Time | {response_time}ms           |
| Content-Type  | {content_type}              |

Body:
```json
{response_body_json}
```

**📋 Đánh giá:**
- Kết quả: {✅ PASSED / ❌ FAILED}
- {Mô tả ngắn assertion: VD "Status 200 OK, schema hợp lệ, matchQtty = 500"}

---

> **Với WebSocket:** Thay Request/Response bằng:
> - **📤 Connect & Subscribe:** URL kết nối, channel/topic, auth params
> - **📥 Events nhận được:** Danh sách các event messages theo thứ tự thời gian, mỗi event kèm timestamp và payload JSON

---

## Chi tiết lỗi (nếu có)

> Bỏ qua mục này nếu tất cả test case đều PASSED.

### ❌ {test_method_name}
- **Lỗi:** {Error message từ pytest output}
- **File:** {file_path}:{line_number}
- **Loại lỗi:** {Script Error / Application Bug}
  - `Script Error`: Lỗi kỹ thuật của script (ImportError, SyntaxError...) → Agent đã tự sửa.
  - `Application Bug`: Ứng dụng/API trả kết quả sai so với spec → Báo cáo cho dev team.
- **Request đã gửi:** (xem mục Chi tiết Request & Response ở trên)
- **Response thực tế:** (xem mục Chi tiết Request & Response ở trên)
- **Screenshot:** {Đính kèm nếu là UI test — đường dẫn tới ảnh}

---

## Truy vết Scenario ↔ Test

> Bảng mapping giữa scenario trong file `.feature` và test method tương ứng.

| Scenario trong .feature   | Test method        | Kết quả                 |
|---------------------------|--------------------|-------------------------|
| {Tên scenario}            | {test_method_name} | {✅ PASSED / ❌ FAILED} |

---

## Truy vết End-to-End (Biz-spec → Checklist → Gherkin → Test)

> Bảng ánh xạ từ yêu cầu gốc (ba-spec) xuyên suốt đến kết quả test.
> Giúp trả lời: "Yêu cầu nào đã được test? Yêu cầu nào chưa?"

| Biz-spec Section | Checklist Item (ID)   | Gherkin Scenario   | Test Method        | Kết quả                 |
|------------------|-----------------------|--------------------|--------------------|-------------------------|
| {section_name}   | {CL-XXX} [{P0/P1/P2}] | {scenario_name}    | {test_method_name} | {✅ PASSED / ❌ FAILED} |

---

## Ghi chú

- File báo cáo HTML: `workspace/issues/{issueKey}/test/result/report.html`
- Screenshot lỗi: `workspace/issues/{issueKey}/test/result/screenshots/`
- Để chạy lại: `pytest workspace/issues/{issueKey}/test/steps/ -v`
- Để chạy lại full pipeline: `/qa-pipeline {issueKey}`
