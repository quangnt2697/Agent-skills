# Quy Tắc Automation Testing (Playwright + Pytest)

Bộ quy tắc này được Agent tự động tham chiếu khi thực thi skill `/qa-auto-design`.

---

## 1. Quy Tắc Chung (Áp dụng mọi Task Type)

### 1.1. Tách biệt Logic (Mô hình POM / API Object)
- Logic tương tác (UI click, nhập liệu) hoặc Network (gửi API, Connect WebSocket) bắt buộc để ở tầng `pages/` hoặc `services/`.
- Logic xác minh (Assertions) bắt buộc để ở tầng `tests/`. **KHÔNG assert trong Page/Service class.**
- Tầng **Model / DTO Layer** (`models/`): Định nghĩa các lớp Request/Response/Event schema dưới dạng Pydantic models hoặc Python Dataclasses. Dùng để validate schema tự động.

### 1.2. Tái sử dụng Code có sẵn (API/WebSocket)
- **Ưu tiên tái sử dụng:** Khi project đã có sẵn code gọi API hoặc kết nối WebSocket do developer tạo ra, Agent BẮT BUỘC phải tìm và import lại các file đó thay vì viết mới từ đầu.
- **Cách tìm code có sẵn:**
  - Quét các file `.py` chứa thư viện `requests`, `httpx`, `APIRequestContext`, `websockets`, `websocket-client`.
  - Tìm các file có tên file api giống với tên api trong jira task (VD: task `G3PTP-16810` chứa websocket `event order` → tìm folder chứa `*websocket*` và file `*event order*` hoặc `*order*` trong folder đó).
- **Chỉ viết tầng Test** (`test_*.py`): Import class/function đã có → gọi hàm → thực hiện Assertions.
- **Bổ sung nhỏ nếu cần:** Chỉ thêm wrapper/helper khi code có sẵn thiếu method cụ thể. KHÔNG viết lại toàn bộ client class.

### 1.3. Dữ liệu động (Dynamic Test Data)
- Các dữ liệu bắt buộc unique (Username, Email, OrderId...) phải được sinh động bằng UUID/Timestamp.
- Format: `[prefix]_[testName]_[timestamp]_[random]`
  - VD: `auto_api_createUser_20260805_a8f2@test.com`
- Hỗ trợ chạy parallel: mỗi test method có data riêng biệt, không conflict.

### 1.4. Data-Driven Testing
- Sử dụng `@pytest.mark.parametrize` cho các scenario phải kiểm tra nhiều giá trị đầu vào/ra (phản ánh `Scenario Outline` trong Gherkin).
- KHÔNG viết vòng lặp `for` hoặc tạo hàng chục hàm test giống hệt nhau.

### 1.5. Dọn dẹp dữ liệu (Teardown)
- Phải xoá data rác đã tạo ra trong quá trình test thông qua pytest fixture (`yield` pattern).
- Ví dụ: Test tạo user → fixture phải gọi API DELETE user ở cuối.

### 1.6. Authentication & Bảo mật
- **KHÔNG hardcode** passwords, secret keys, API tokens trực tiếp trong source code hoặc file test data.
- Đọc credentials và base URL từ biến môi trường (`.env`, config files).
- **Quản lý Token Lifecycle:**
  - Lấy Auth Token ở bước Setup (session-scoped `@pytest.fixture`).
  - Tái sử dụng token giữa các test cases để tối ưu thời gian chạy.
  - Xử lý kịch bản tự động refresh token khi token hết hạn.
- **Masking Sensitive Data:** Tự động ẩn thông tin nhạy cảm (Password, Token) trong log và report.

### 1.7. Quản lý File & Thư mục
- KHÔNG tự động xóa file source khi chưa xác nhận với user.
- Kiểm tra cấu trúc thư mục hiện có trước khi tạo file mới — tránh duplicate.
- Đặt file đúng thư mục theo kiến trúc project.

### 1.8. Chất lượng Code (Clean Code)
- Không logic trùng lặp — tạo helper methods cho các hành động lặp đi lặp lại.
- Trước khi deliver code:
  - Xóa toàn bộ `print()`, `console.log()` sinh ra khi debug.
  - Xóa code bị comment (`#`, `"""..."""`).
  - Xóa locator / biến không sử dụng (unused code).
- Sử dụng `expect(locator).to_be_visible()` (Auto-retrying assertions) của Playwright. Hạn chế tối đa `page.wait_for_timeout()` (hard sleep).

### 1.9. Self-fix Loop
- Self-fix Loop chỉ dùng để sửa **lỗi kỹ thuật của script** (ImportError, SyntaxError, fixture thiếu, timeout config sai, connection refused...).
- **KHÔNG ĐƯỢC sửa code để ép test case từ FAIL thành PASS.** Nếu test case FAIL vì ứng dụng/API trả kết quả sai so với spec → đó là kết quả hợp lệ, ghi nhận vào báo cáo, KHÔNG can thiệp.

### 1.10. Capture Request/Response (API & WebSocket)
- Khi test API/WS, test script phải được thiết kế hoặc sử dụng log/interceptor để **bắt được toàn bộ thông tin Request đã gửi và Response thực tế trả về**.
- Các thông tin này bắt buộc phải được đưa vào báo cáo (`report.md`) theo template để QA/BA và Dev có thể debug trực tiếp từ báo cáo mà không cần chạy lại test.

---

## 2. Quy Tắc Chuyên Biệt Cho UI Testing (Web/App)

### 2.1. Cấu hình Browser & Viewport
- BẮT BUỘC resize thành `1920x1080` khi debug/thiết lập script.
- Khi sử dụng Playwright MCP để debug UI, **LUÔN LUÔN** gọi `browser_resize(width=1920, height=1080)` ngay sau khi mở browser.
- Không sử dụng Headless mode khi đang viết mới hoặc debug script. Chỉ bật khi code đã chạy pass 100%.

### 2.2. Semantic Locators (Thứ tự ưu tiên)
Ưu tiên theo thứ tự từ trên xuống:
1. `page.get_by_role()` — Tốt nhất cho semantic elements (button, link, heading)
2. `page.get_by_label()` — Tốt nhất cho form fields có label
3. `page.get_by_placeholder()` — Tốt nhất cho input không có label
4. `page.get_by_test_id()` — Khi frontend đã gắn sẵn `data-testid`
5. CSS Selector / XPath — **Chỉ dùng khi thực sự hết cách**

**KHÔNG SUY ĐOÁN Locator.** Agent phải dùng MCP snapshot hoặc dựa vào DOM HTML thực tế để trích xuất locator chính xác.

---

## 3. Quy Tắc Chuyên Biệt Cho API Testing (REST)

Mỗi Test Case API **BẮT BUỘC** thực hiện đủ **7 bước assertions:**

1. **Request Schema:** Xác thực Request Body/Params đúng cấu trúc trước khi gửi (dùng Pydantic model hoặc `jsonschema`). Đảm bảo:
   - Đúng kiểu dữ liệu cho từng field (string, int, float, boolean, array...).
   - Các field bắt buộc (required) phải có mặt.
   - Giá trị nằm trong phạm vi cho phép (enum, min/max, regex pattern).
   - **Negative test:** Cố tình gửi request thiếu field bắt buộc, sai kiểu dữ liệu, vượt giới hạn → kiểm tra API trả về lỗi đúng.
2. **HTTP Status Code:** Kiểm tra exact match (VD: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`).
3. **Response Schema:** Xác thực Response Body đúng cấu trúc JSON Schema / Contract đã định nghĩa (dùng Pydantic model hoặc thư viện `jsonschema`).
4. **Key Business Fields:** Kiểm tra các trường dữ liệu quan trọng bằng exact value hoặc pattern match. Sử dụng Soft Assertions khi kiểm tra nhiều trường cùng lúc.
5. **Error Response Detail (Negative Cases):** Đối với kịch bản lỗi, kiểm tra chính xác `errorCode`, `message` hoặc `details` trả về. KHÔNG chỉ kiểm tra mỗi Status Code.
6. **Response Time / SLA:** Kiểm tra thời gian phản hồi nằm trong ngưỡng cho phép (VD: `< 2000ms`) nếu có yêu cầu SLA.
7. **Headers Check:** Kiểm tra Content-Type (VD: `application/json`) và các Security Headers quan trọng khi cần.

---

## 4. Quy Tắc Chuyên Biệt Cho WebSocket Testing (Event-driven)

1. **Connection State:** Kiểm tra kết nối thành công với Auth chuẩn. Có báo lỗi (401/403) khi Auth sai. Xử lý kịch bản disconnect/reconnect.
2. **Event Payload Schema:** BẮT BUỘC validate JSON Schema của Event message được push về (đối chiếu với tài liệu Jira). Dùng Pydantic model hoặc `jsonschema.validate()` — KHÔNG chỉ kiểm tra 1-2 field đơn lẻ.
3. **Luồng & Thứ tự sự kiện (Event Sequence & Timestamp):**
   - BẮT BUỘC kiểm tra các sự kiện được đẩy về phải tuân thủ nghiêm ngặt tính tuần tự về thời gian: Event phát sinh sau phải có timestamp lớn hơn event trước đó và được Client nhận về sau.
   - Các luồng chuyển trạng thái phụ thuộc vào từng nghiệp vụ cụ thể, nhưng **tính hợp lệ về thời gian (Time-series validation)** là tiêu chuẩn kỹ thuật bắt buộc cho mọi message stream.
4. **Data Isolation (Tính cô lập):** User A chỉ nhận event của User A, tuyệt đối không nhận data của User B.
5. **Trạng thái gián đoạn (Disruption):** Test luồng ngắt kết nối (mất mạng) và xác nhận hành vi hệ thống (có hoặc không replay event đã mất).
