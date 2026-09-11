# Cẩm Nang Phân Tích Thất Bại & Chuẩn Hóa Báo Cáo Kiểm Thử (Failure Analysis & Reporting)

Tài liệu này hướng dẫn chi tiết quy trình bóc tách log lỗi, phân loại nguyên nhân thất bại, trích xuất Request/Response và định dạng chuẩn của file báo cáo độc bản `report.md`.

---

## 1. Ma Trận Phân Loại Thất Bại (Failure Categorization)

Mỗi test case FAILED bắt buộc phải được phân loại chính xác vào 1 trong 4 nhóm sau:

| Nhóm Lỗi | Mức độ | Dấu hiệu nhận diện | Hành động xử lý |
|---|---|---|---|
| 🔴 **Application Bug** | **P0 / P1** | API hoặc UI trả về kết quả sai lệch so với spec (`final.md`) hoặc kịch bản BDD (`.feature`). Ví dụ: HTTP 200 khi gửi số lượng = 0, tính sai phí/thuế, response thiếu field bắt buộc. | **Giữ nguyên kết quả FAIL.** Trích xuất đầy đủ Request/Response payload, chỉ rõ nguyên nhân và đề xuất fix cho Developer. |
| 🟡 **Script Issue** | **P2** | Lỗi do test script: locator bị lệch sau khi UI cập nhật, assertion sai format kiểu dữ liệu (chuỗi vs số), helper gọi sai method. | Kích hoạt Self-fix loop: sửa code test trong `steps/` hoặc Page Object và chạy lại. |
| 🔵 **Environment Issue** | **P2** | Môi trường UAT sập, mất kết nối DB/Network, token hết hạn, `.env` trỏ sai host, connection refused. | Cập nhật cấu hình môi trường/credentials và chạy lại. |
| 🟠 **Flaky Test** | **P2** | Test chạy đơn lẻ thì pass nhưng chạy cả suite thì fail; hoặc chập chờn do race condition, timeout mạng UAT giật lag. | Điều chỉnh smart wait, polling hợp lý hoặc tăng timeout kết nối. |

---

## 2. Tiêu Chuẩn Bóc Tách Request & Response (Bắt Buộc Cho API/WebSocket)

Khi test case API hoặc WebSocket bị FAILED, Agent **BẮT BUỘC** trích xuất từ `test-output.log` các thông tin chi tiết sau:

```
[THÔNG TIN TRÍCH XUẤT BẮT BUỘC]
1. Endpoint: HTTP Method + Full URL (hoặc WebSocket URL + Channel)
2. Request Headers: Authorization (masked), Content-Type, Client info
3. Request Payload: Toàn bộ body JSON gửi lên
4. Response Status: HTTP Status Code (thực tế vs kỳ vọng)
5. Response Body: Toàn bộ JSON payload server trả về
6. Stack Trace: Dòng code phát sinh AssertionError hoặc Exception
7. Root Cause: Phân tích ngắn gọn nguyên nhân gốc rễ
8. Fix Recommendation: Hướng dẫn khắc phục cụ thể cho DEV
```

---

## 3. Quy Chuẩn Độc Bản Output (Single File Per Format)

Trong thư mục kết quả `/project-root/workspace/{issueKey}/test/result/`, **BẮT BUỘC CHỈ TỒN TẠI DUY NHẤT 1 FILE CHO MỖI LOẠI ĐỊNH DẠNG**:

```
/project-root/workspace/{issueKey}/test/result/
├── junit.xml                    # Duy nhất 1 file XML chuẩn JUnit (dùng cho CI/CD)
├── report.html                  # Duy nhất 1 file HTML trực quan (kèm pytest-html nếu có)
├── test-output.log              # Duy nhất 1 file LOG (toàn bộ console stdout/stderr qua tee)
└── report.md                    # Duy nhất 1 file Markdown báo cáo chính thức
```

**Các hành vi bị cấm:**
- ❌ CẤM sinh đồng thời `report.md` và `{issueKey}-test-report.md`.
- ❌ CẤM tạo thêm các file log phụ như `pytest.log`, `runner.log`.
- ❌ CẤM tạo thêm file xml thứ hai như `results.xml`, `test-results.xml`.

---

## 4. Mẫu Báo Cáo Chuẩn (`report.md`)

```markdown
# Báo cáo Thực thi Automation Test — [Issue Key / Module]

**Thời gian:** YYYY-MM-DD HH:MM:SS  
**Mục tiêu:** `/project-root/workspace/{issueKey}/test/steps/`  
**Môi trường:** UAT / Staging  
**Framework:** Pytest (Playwright / Requests)  

---

## 📊 1. Tổng quan Thực thi (Execution Summary)

| Chỉ số | Số lượng | Tỷ lệ |
|---|---|---|
| **Tổng số Tests** | 25 | 100% |
| **✅ Passed** | 23 | 92.0% |
| **❌ Failed** | 2 | 8.0% |
| **⏭️ Skipped** | 0 | 0.0% |
| **⏱️ Thời gian** | 1m 12s | — |
| **Tỷ lệ Pass** | **92.0%** | — |

**Trạng thái chung:** ⚠️ FAILED (Phát hiện 2 lỗi cần khắc phục)

---

## ❌ 2. Chi tiết Test Case Thất bại (Failed Tests Breakdown)

### 2.1. `test_order.py::test_order_invalid_qty` — 🔴 APPLICATION BUG (P0)
- **File:** `workspace/{issueKey}/test/steps/test_order.py:45`
- **Thông báo lỗi:** `AssertionError: Expected HTTP 400, got 200`
- **Chi tiết Request:**
  ```http
  POST /api/v1/orders
  Content-Type: application/json
  Authorization: Bearer eyJhbGci...
  
  {
    "symbol": "TCB",
    "quantity": 0,
    "price": 25500,
    "side": "BUY"
  }
  ```
- **Chi tiết Response:**
  ```json
  HTTP 200 OK
  
  {
    "orderId": "ORD-9988",
    "status": "PENDING",
    "message": "Order placed successfully"
  }
  ```
- **Nguyên nhân gốc rễ (Root Cause):** Backend thiếu validation rule kiểm tra `quantity > 0` tại tầng Service trước khi lưu DB.
- **Đề xuất khắc phục:** DEV bổ sung validation `quantity > 0` và trả về mã lỗi HTTP 400 Bad Request.

---

### 2.2. `test_ws.py::test_ws_reconnect` — 🟠 FLAKY TEST (P2)
- **File:** `workspace/{issueKey}/test/steps/test_ws.py:82`
- **Thông báo lỗi:** `asyncio.exceptions.TimeoutError: Timeout waiting for WebSocket reconnect event after 2.0s`
- **Nguyên nhân gốc rễ:** Mạng test UAT có độ trễ kết nối lại dao động từ 2.5s – 3.2s, test script hardcode timeout 2.0s.
- **Đề xuất khắc phục:** Tăng timeout lên 5.0s kèm cơ chế smart poll trong test script.

---

## ✅ 3. Danh sách Test Case Thành công (Passed Tests)

<details>
<summary>Nhấn để xem danh sách 23 test cases PASSED</summary>

- `test_order.py::test_order_valid_price` (0.45s)
- `test_order.py::test_order_buy_limit` (0.62s)
- `test_auth.py::test_token_valid` (0.28s)
...
</details>

---

## 🎯 4. Khuyến Nghị & Đề Xuất Hành Động (Action Items)

- **DEV (P0):** Bổ sung validation `quantity > 0` trong `OrderService` và deploy lại UAT.
- **QA (P2):** Tăng timeout reconnect trong `test_ws.py` lên 5s và re-run test.
- **QA (P0):** Chạy lại `/qa-run-test {issueKey}` sau khi DEV xác nhận đã deploy bản vá.
```
