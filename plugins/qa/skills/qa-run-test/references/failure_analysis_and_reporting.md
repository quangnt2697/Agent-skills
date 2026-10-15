# Cẩm Nang Báo Cáo Kết Quả Kiểm Thử & Chuyển Giao Xử Lý (Failure Analysis & Reporting)

Tài liệu này hướng dẫn định dạng chuẩn của file báo cáo độc bản `report.md`, cách trích xuất lỗi trực tiếp từ output Pytest và quy chuẩn đề xuất các kỹ năng/vai trò chuyên trách để xử lý lỗi sau khi test kết thúc.

---

## 1. Nguyên Tắc Báo Cáo: Ghi Nhận Khách Quan — Không Suy Diễn Mã Nguồn

- **Nhiệm vụ của QA:** Ghi nhận trung thực, đầy đủ và khách quan kết quả thực thi (Pass / Fail / Error).
- **Trích xuất trực tiếp từ log:** Mọi thông tin lỗi (AssertionError, HTTP Status, Exception stack trace) phải được lấy trực tiếp từ `test-output.log` do Pytest sinh ra.
- **Ranh giới trách nhiệm (Strict Boundary):**
  - ❌ **KHÔNG** mở file mã nguồn backend hoặc database để tự truy tìm "Root Cause" tầng service.
  - ❌ **KHÔNG** tự đưa ra giải pháp sửa mã nguồn ứng dụng (việc này thuộc về DEV).
  - ❌ **KHÔNG** tự chạy thêm các lệnh curl/urllib ngoài luồng kiểm thử.
  - ✅ **BẮT BUỘC:** Đề xuất kỹ năng xử lý phù hợp (`dev-debugging`, `cr-review-code-and-quality`, `qa-auto-design`) để các persona tương ứng tiếp quản điều tra.

---

## 2. Quy Chuẩn Độc Bản Output (Single File Per Format)

Trong thư mục kết quả `workspace/issues/{issueKey}/test/result/`, **BẮT BUỘC CHỈ TỒN TẠI DUY NHẤT 1 FILE CHO MỖI LOẠI ĐỊNH DẠNG**:

```
workspace/issues/{issueKey}/test/result/
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

## 3. Mẫu Báo Cáo Chuẩn (`report.md`)

```markdown
# Báo cáo Thực thi Automation Test — [Issue Key / Module]

**Thời gian:** YYYY-MM-DD HH:MM:SS  
**Mục tiêu:** `workspace/issues/{issueKey}/test/steps/`  
**Môi trường:** UAT / Staging  
**Framework:** Pytest  

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

**Trạng thái chung:** ⚠️ FAILED (Phát hiện 2 test cases thất bại)

---

## ❌ 2. Chi tiết Test Case Thất bại (Failed Tests Breakdown)

### 2.1. `test_order.py::test_order_invalid_qty` [Phân loại: APP_BUG]
- **File:** `workspace/issues/{issueKey}/test/steps/test_order.py:45`
- **Phân loại lỗi:** `[APP_BUG]` — Request hợp lệ theo spec nhưng API trả sai mã lỗi.
- **Thông báo lỗi từ Pytest:** `AssertionError: Expected HTTP 400, got 200`
- **Dữ liệu ghi nhận từ Log:**
  - **Request:** `POST /api/v1/orders` — Body: `{"symbol": "TCB", "quantity": 0, "side": "BUY"}`
  - **Response:** HTTP 200 OK — Body: `{"orderId": "ORD-9988", "status": "PENDING"}`
- **Dòng code gây lỗi (Traceback snippet):**
  ```python
  > assert response.status_code == 400
  E AssertionError: Expected HTTP 400, got 200
  ```
- **Hành động:** 🛑 CẤM SỬA TEST ASSERTION. Giữ nguyên trạng thái FAILED và chuyển giao DEV sửa backend.

---

### 2.2. `test_ws.py::test_ws_reconnect`
- **File:** `workspace/{issueKey}/test/steps/test_ws.py:82`
- **Thông báo lỗi từ Pytest:** `asyncio.exceptions.TimeoutError: Timeout waiting for WebSocket reconnect event after 5.0s`
- **Dòng code gây lỗi (Traceback snippet):**
  ```python
  > await asyncio.wait_for(ws_client.wait_for_reconnect(), timeout=5.0)
  E asyncio.exceptions.TimeoutError
  ```

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

## 🎯 4. Đề Xuất Kỹ Năng Tiếp Theo (Next Step Recommendations)

Phát hiện test case thất bại. Đề xuất các kỹ năng/vai trò chuyên trách để xử lý tiếp:

1. 🛠️ **Gỡ lỗi Backend / Điều tra nguyên nhân:** Sử dụng skill `dev-debugging` hoặc gọi subagent `dev` để kiểm tra mã nguồn backend, reproduce và sửa lỗi xử lý dữ liệu.
2. 🔍 **Review Mã nguồn:** Sử dụng skill `cr-review-code-and-quality` hoặc gọi subagent `code-reviewer` để rà soát toàn diện implementation mã nguồn.
3. ⚙️ **Cập nhật Kịch bản Test:** Sử dụng skill `qa-auto-design` nếu các tham số test cần được đồng bộ lại theo đặc tả mới nhất.
```

## 4. Ví Dụ Mẫu (Few-shot Example)

```markdown
### 📊 Kết Quả Thực Thi Kiểm Thử: G3PTP-17061

- **Mục tiêu:** `workspace/G3PTP-17061/test/steps/test_volume_profile_and_stream.py`
- **Tổng số tests:** 30 | ✅ **Passed:** 14 | ❌ **Failed:** 16 | ⏱️ **Thời gian:** 12.8s
- **Artifacts:**
  - 📄 Log chi tiết: `workspace/G3PTP-17061/test/result/test-output.log`
  - 📋 Báo cáo tổng hợp: `workspace/G3PTP-17061/test/result/report.md`

#### ❌ Tóm tắt các lỗi phát hiện (Trích xuất từ Pytest Output):
1. `test_volume_profile_valid_symbol`: AssertionError: Expected status 200, got 400. Response: `{"error": "Invalid boardId"}`
2. `test_stream_ticks_reconnect`: TimeoutError: Connection timed out after 5.0s.
...(chi tiết toàn bộ 16 lỗi đã ghi nhận trong report.md)

---

### 🎯 Đề Xuất Hành Động Tiếp Theo:
Phát hiện 16 test case thất bại do hệ thống trả về mã lỗi hoặc timeout. Đề xuất lựa chọn kỹ năng xử lý:
1. 🛠️ **Gỡ lỗi & Sửa mã nguồn:** Sử dụng skill `dev-debugging` hoặc gọi subagent `dev` để trace mã nguồn backend và kiểm tra mapping tham số.
2. 🔍 **Review mã nguồn:** Sử dụng skill `cr-review-code-and-quality` hoặc gọi subagent `code-reviewer` để rà soát toàn diện implementation.
3. ⚙️ **Cập nhật kịch bản test:** Sử dụng skill `qa-auto-design` nếu các tham số kiểm thử cần được cập nhật lại theo spec mới nhất.
```
