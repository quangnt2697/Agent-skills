# Quy Tắc Automation Testing (Playwright + Pytest)

Bộ quy tắc này được Agent tự động tham chiếu khi thực thi skill `/qa-auto-design`.

---

## 1. Quy Tắc Chung (Áp dụng mọi Task Type)

### 1.1. Tách biệt Logic (Mô hình POM / API Object)
- Logic tương tác (UI click, nhập liệu) hoặc Network (gửi API, Connect WebSocket) bắt buộc để ở tầng `pages/` hoặc `services/`.
- Logic xác minh (Assertions) bắt buộc để ở tầng `tests/`. **KHÔNG assert trong Page/Service class.**
- Tầng **Model / DTO Layer** (`models/`): Định nghĩa các lớp Request/Response/Event schema chuẩn **Pydantic v2** (`BaseModel`, `Field`, `@field_validator(..., mode="after")` + `@classmethod`). Dùng `model_validate()` và `model_dump()`. **TUYỆT ĐỐI KHÔNG dùng cú pháp Pydantic v1** (`@validator` đã bị deprecated).

### 1.2. Tái sử dụng Code có sẵn & SDK OpenAPI (API/WebSocket)
- **Ưu tiên tái sử dụng tối đa:** Khi gặp task liên quan đến API hoặc WebSocket, Agent BẮT BUỘC phải tìm và import lại các module client có sẵn thay vì viết mới từ đầu.
- **Quét Bắt Buộc Thư Mục SDK `openapi-tyk/sdk/python/`:**
  - Đối với các dịch vụ OpenAPI (Entrade / DNSE), Agent bắt buộc dò quét thư mục `openapi-tyk/sdk/python/` (thông qua `projects.json`, biến môi trường `OPENAPI_TYK_PATH`, hoặc đường dẫn tương đối).
  - Tái sử dụng `DNSEClient` (`dnse/`), các module `trading-api/`, `marketdata-api/`, `broker-api/`, `websocket-trading/`, `websocket-marketdata/` và tham khảo `examples/`.
- **Cách tìm code có sẵn khác của Dev:**
  - Quét các file `.py` chứa thư viện `requests`, `httpx`, `APIRequestContext`, `websockets`, `websocket-client`.
  - Tìm các file có tên file api giống với tên api trong jira task (VD: task `G3PTP-16810` chứa websocket `event order` → tìm folder chứa `*websocket*` và file `*event order*` hoặc `*order*` trong folder đó).
- **Chỉ viết tầng Test** (`test_*.py`): Import class/function đã có từ SDK hoặc dev code → gọi hàm → thực hiện Assertions.
- **Bổ sung nhỏ nếu cần:** Chỉ thêm wrapper/helper khi code có sẵn thiếu method cụ thể. KHÔNG viết lại toàn bộ client class.

### 1.3. Dữ liệu động (Dynamic Test Data)
- Các dữ liệu bắt buộc unique (Username, Email, OrderId...) phải được sinh động bằng UUID/Timestamp.
- Format: `[prefix]_[testName]_[timestamp]_[random]`
  - VD: `auto_api_createUser_20260805_a8f2@test.com`
- Hỗ trợ chạy parallel: mỗi test method có data riêng biệt, không conflict.

### 1.4. Data-Driven Testing & Symbolic Boundary Mapping
- Sử dụng `@pytest.mark.parametrize` cho các scenario phải kiểm tra nhiều giá trị đầu vào/ra (phản ánh `Scenario Outline` trong Gherkin).
- KHÔNG viết vòng lặp `for` hoặc tạo hàng chục hàm test giống hệt nhau.
- **Ánh xạ Ranh giới Tượng trưng (Symbolic Boundaries):**
  - Khi Gherkin sử dụng các vị trí biên tượng trưng (`TAI_HAN_MUC`, `VUOT_HAN_MUC`, `DUOI_HAN_MUC`, `TRONG_NGUONG`, `VUOT_NGUONG`), test code **TUYỆT ĐỐI KHÔNG** hardcode số cụ thể.
  - BẮT BUỘC gọi `EnvConfig.resolve_boundary(tier, metric_type, boundary_pos)` để tự động tính toán giá trị thực tế lúc runtime dựa trên cấu hình `.env`.
  - Giúp bảo toàn tính độc lập của test suite: khi người dùng thay đổi giá trị trong `.env`, không cần sửa lại bất kỳ dòng code test nào.

### 1.5. Dọn dẹp dữ liệu (Teardown An Toàn)
- Phải xoá data rác đã tạo ra trong quá trình test thông qua pytest fixture (`yield` pattern).
- **BẮT BUỘC dùng khối `try...finally`:** Toàn bộ logic teardown sau `yield` phải nằm trong khối `finally` hoặc bọc `try/except` từng phần tử để đảm bảo dữ liệu luôn được dọn dẹp kể cả khi test case raise exception hoặc assertion thất bại.
- Ví dụ: Test tạo order/user → fixture phải gọi API DELETE/Cancel ở khối teardown. *(Tham khảo [test_api_example.py](../assets/test_api_example.py))*

### 1.6. Quy Tắc Quản Lý Biến Môi Trường & Tuyệt Đối Không Hardcode (.env Mandatory & Zero-Hardcode Rule)
- **TẠO VÀ LƯU GIỮ BIẾN TRONG `.env`:**
  - Toàn bộ các giá trị cấu hình, kết nối, thông tin xác thực và biến kiểm thử (Base URLs, WS URLs, API keys, secrets, tokens, account numbers, test symbols, prices, quantities, timeouts, threshold metrics, broker codes) **BẮT BUỘC** phải được tạo và lưu giữ trong file `.env` (theo mô hình phân tầng: task-local `workspace/{issueKey}/test/.env` hoặc central `agent-skills/.env`).
- **CHỈ ĐƯỢC GỌI TỪ `.env` TRONG TEST SCRIPT:**
  - Trong toàn bộ test script (`test_*.py`, `conftest.py`, `services/`, `pages/`), mã nguồn **CHỈ ĐƯỢC PHÉP** đọc/gọi giá trị từ file `.env` thông qua `os.getenv("VARIABLE_NAME", default_val)` hoặc qua fixture/config loader.
- **TUYỆT ĐỐI NGHIÊM CẤM HARDCODE:**
  - Cấm tuyệt đối việc hardcode trực tiếp vào mã nguồn test: URLs (`https://...`, `wss://...`), credentials, số tài khoản test, mã chứng khoán (nếu không lấy từ market fixture), khối lượng, mức giá, API versions.
- **Quy Trình "Environment First, Script Second":**
  - Khi thiết kế kịch bản test phát hiện cần tham số mới: Agent **BẮT BUỘC** phải thêm biến đó vào file `.env` trước (kèm giá trị mặc định rõ ràng và comment giải thích), sau đó mới viết code gọi biến đó từ test script.
- **Quản lý Token Lifecycle & Caching:**
  - Lấy Auth Token ở session-scoped fixture (`@pytest.fixture(scope="session")`).
  - Hỗ trợ cache file cục bộ để tái sử dụng token giữa các session chạy test khác nhau trong ngày, tránh spam API Login.
- **Quality Gate:** Test script chứa giá trị hardcode thay vì gọi từ `.env` sẽ bị đánh trượt cú pháp và nghiệm thu ngay tại Giai đoạn 4.
- Chi tiết cơ chế xem [shared_fixtures_and_env.md](shared_fixtures_and_env.md).

### 1.7. Quản lý Cấu Trúc Thư Mục Chuẩn (Blueprint)
- Toàn bộ tài nguyên kiểm thử của task BẮT BUỘC nằm trong `/project-root/workspace/{issueKey}/test/`.
- **CẤM TỰ NGHĨ RA THƯ MỤC:** Tuyệt đối không tự ý tạo các thư mục rời rạc như `src/`, `tests/`, `utils/`, `common/` bên ngoài blueprint.
- Tuân thủ ma trận cho phép theo Task Type: Không sinh `pages/` cho API/WS; Không sinh `services/` cho Web UI.
- Thư mục `result/` chỉ chứa duy nhất 1 file mỗi loại (`junit.xml`, `report.html`, `test-output.log`, `report.md`).
- Thiết lập `pytest.ini` với `pythonpath` chuẩn để import shared fixtures và SDK của dự án.
- Chi tiết sơ đồ cây thư mục và quy định từng file xem [folder_structure_blueprint.md](folder_structure_blueprint.md).

### 1.8. Chất lượng Code (Clean Code & Web-First Assertions)
- Không logic trùng lặp — tạo helper methods cho các hành động lặp đi lặp lại.
- Trước khi deliver code:
  - Xóa toàn bộ `print()`, `console.log()` sinh ra khi debug.
  - Xóa code bị comment (`#`, `"""..."""`).
  - Xóa locator / biến không sử dụng (unused code).
- **TUYỆT ĐỐI CẤM HARD SLEEP:** Không sử dụng `time.sleep()` hoặc `page.wait_for_timeout()`. BẮT BUỘC sử dụng Web-First Auto-Retrying Assertions của Playwright (`expect(locator).to_be_visible()`, `expect(locator).to_have_text()`, v.v.) với polling retry tự động.

### 1.9. Self-fix Loop
- Self-fix Loop chỉ dùng để sửa **lỗi kỹ thuật của script** (ImportError, SyntaxError, fixture thiếu, timeout config sai, connection refused...).
- **KHÔNG ĐƯỢC sửa code để ép test case từ FAIL thành PASS.** Nếu test case FAIL vì ứng dụng/API trả kết quả sai so với spec → đó là kết quả hợp lệ, ghi nhận vào báo cáo, KHÔNG can thiệp.

### 1.10. Chuẩn Thiết Kế Log Kiểm Thử (Test Logging Standard)
- **Cấu trúc Thống nhất & Căn Chỉnh Thẳng Hàng:** Toàn bộ log của mọi loại test (API, WebSocket, Database, Web UI, State Transition) bắt buộc tuân theo mẫu cố định:
  ```text
  [TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - MESSAGE | CONTEXT
  ```
  Phần tiền tố `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - ` bắt buộc được pad độ rộng cố định để luôn thẳng hàng trên mọi dòng log.
- **4 Quy Tắc Vàng Khi Viết Log:**
  1. **Không log dữ liệu nhạy cảm:** Bắt buộc che (mask) `password`, `token`, `api_secret`, thẻ tín dụng, `cccd`.
  2. **Message phải cố định, Data để vào Context:** Không ghép chuỗi biến động vào `MESSAGE` để phục vụ lọc thống kê. Dữ liệu kỹ thuật đưa vào `CONTEXT` dạng `key="value"`.
  3. **Phân loại Level nghiêm ngặt:** Sử dụng đúng chuẩn `ERROR` (hỏng hóc/test fail), `WARN` (bất thường/chậm), `INFO` (luồng bình thường/kết quả), `DEBUG` (chi tiết nội bộ/raw query).
  4. **Chống trùng lặp & Khởi tạo gọn gàng:** Cấm tuyệt đối `logging.basicConfig(...)` trong test script/conftest (tránh nhân đôi log Pytest). Khởi tạo môi trường chỉ in đúng 1 dòng tóm tắt ở Session Scope.
- **Không Dùng Ký Tự Cây:** Tuyệt đối không dùng các ký tự ASCII tree (`▶`, `├─`, `└─`). Log hiển thị theo dạng flow text tuần tự tự nhiên với 4 thẻ tiếng Việt: `[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`.
- **Ghi nhận Full Audit Trail:** File `workspace/{issueKey}/test/result/test-output.log` và bảng trong `report.md` vẫn lưu trữ đầy đủ 100% Request/Response của **CẢ TEST CASE PASSED VÀ FAILED**.
- 📖 **Cẩm nang & Template Chi Tiết Cho Mọi Loại Test/Task:** Bắt buộc tham chiếu và tuân thủ [test_logging_guidelines.md](test_logging_guidelines.md). Không định nghĩa template riêng lẻ trong file này.

### 1.11. Tuyệt Đối Không Mock Server Trên UAT (Real Base URLs Only)
- **NGHIÊM CẤM MOCK TRÊN MÔI TRƯỜNG UAT:** Khi viết auto test script cho OpenAPI (REST API) hoặc WebSocket trên môi trường UAT / Sandbox, Agent **TUYỆT ĐỐI KHÔNG** được sử dụng mock server, mock client, hoặc thư viện giả lập (như `unittest.mock`, `pytest-mock`, `respx`, `responses`, `aioresponses`, WireMock, hay local mock websocket server).
- **Mục tiêu của Automation Test:** Xác thực tính tương thích, độ trễ, handshake SSL và nghiệp vụ thực tế trên hệ thống backend UAT thật. Việc mock server làm mất hoàn toàn giá trị kiểm thử hệ thống (System Integration Testing).
- **Ép buộc trỏ Real Base URLs:**
  - REST API: Bắt buộc gọi trực tiếp `BASE_URL` từ `.env`.
  - WebSocket: Bắt buộc kết nối trực tiếp `WS_URL` từ `.env`.
- **Quality Gate:** Mọi test script chứa mock adapter, decorator `@patch` vào tầng HTTP client, hoặc dựng fake server sẽ bị đánh trượt Quality Gate ngay lập tức.

### 1.12. Pre-generation Code Reconnaissance Gate (Quét Tận Dụng Code Có Sẵn & SDK openapi-tyk)
- Đối với các task OpenAPI (REST API hoặc WebSocket), trước khi sinh bất kỳ code test nào, Agent **BẮT BUỘC** phải thực hiện bước quét mã nguồn (Code Recon) trong toàn bộ workspace/repository:
  1. **Quét SDK `openapi-tyk/sdk/python/`:** Quét toàn bộ thư mục SDK chính thức (thông qua `projects.json`, biến môi trường `OPENAPI_TYK_PATH` hoặc đường dẫn tương đối), trích xuất `DNSEClient`, `trading-api`, `marketdata-api`, `broker-api`, `websocket-trading`, `websocket-marketdata`.
  2. **Quét Auth & Token:** Tìm các file chứa logic đăng nhập, tạo token, quản lý refresh token, hàm ký HMAC/SHA256 signature (`auth`, `token`, `login`, `sign`, `signature`).
  3. **Quét WebSocket Client & Channels:** Tìm WebSocket client, connection manager, helper `subscribe`/`unsubscribe`, hàm decode/unpack msgpack (`websocket`, `ws_client`, `subscribe`, `channel`).
  4. **Quét Enums & Constants:** Tìm các file định nghĩa tên channel, topic, loại lệnh, error code (`channels.py`, `constants.py`, `enums.py`).
- **Quy tắc tái sử dụng bắt buộc:**
  - Import và sử dụng trực tiếp các class, helper, function đã tìm thấy từ SDK hoặc codebase DEV.
  - Chỉ viết thêm class con kế thừa hoặc wrapper method nhỏ khi code có sẵn thiếu chức năng cụ thể.
  - **TUYỆT ĐỐI CẤM** tự viết lại từ đầu các module client/auth mà SDK và codebase đã có.

### 1.13. Liên kết Kịch bản Gherkin Chặt chẽ (Gherkin Traceability Binding)
- Mỗi test function trong file `test_*.py` **BẮT BUỘC** phải có:
  1. Decorator `@pytest.mark.scenario("<Tên scenario chính xác trong .feature>")`
  2. Decorator `@pytest.mark.jira("{issueKey}")`
  3. Docstring trích dẫn nguyên văn kịch bản BDD tương ứng (Given / When / Then) để bảo đảm ma trận truy vết 1-1 giữa code automation và tài liệu Gherkin.

### 1.14. Chỉ Luôn Thiết Kế & Scan Test Trên Metabase UAT (Metabase UAT Strict Policy & Zero-Mutation)
- **Môi trường Duy nhất:** Agent **BẮT BUỘC CHỈ LUÔN** thiết kế kịch bản kiểm thử, quét dữ liệu thị trường (scan/recon) và thực thi test trên môi trường **Metabase UAT** (`${METABASE_UAT_URL}`, Database ID: `${METABASE_UAT_DB_TIMESCALE_ID}`).
- **Khóa Chặn Bảo Mật Tuyệt Đối (Security Gate):**
  - **NGHIÊM CẤM** chạy automation test trên **Metabase Production** (`${METABASE_PROD_URL}`).
  - Mã nguồn service/test runner BẮT BUỘC phải cài đặt kiểm tra an toàn:
    ```python
    prod_url = os.getenv("METABASE_PROD_URL", "")
    current_env = os.getenv("METABASE_ENV", "uat").lower()
    if current_env in ["prod", "production"] or (prod_url and prod_url in metabase_url):
        raise ValueError("[SECURITY_VIOLATION] Nghiêm cấm chạy automation test trên Metabase Production!")
    ```
- **Zero-Mutation Policy:**
  - Mọi câu truy vấn dữ liệu là Native SQL `SELECT` Read-Only để quan sát và đối chiếu.
  - Tuyệt đối KHÔNG chạy câu lệnh sửa đổi (`INSERT`, `UPDATE`, `DELETE`, `DROP`).
  - Tuyệt đối KHÔNG publish message Kafka giả lập lên các topic sàn thật (`Board_event`, `Prices`, `Deem_Trade_Price`) làm lệch phiên của môi trường UAT.

---

## 2. Quy Tắc Chuyên Biệt Cho Web UI Testing (Desktop & Webview)

### 2.1. Cấu hình Browser & Viewport Chuẩn
- Toàn bộ phiên kiểm thử Web UI qua Playwright MCP tự động áp dụng độ phân giải chuẩn Full HD: **`1920x1080`**.
- Không sử dụng Headless mode khi đang viết mới hoặc debug script nếu muốn trực quan hóa hành vi.

### 2.2. Quy Trình Thao Tác Bắt Buộc Với Playwright MCP
Khi làm việc với các task kiểm thử Web UI, Agent **BẮT BUỘC** thao tác theo quy trình 5 bước:
1. **Mở trang & Tự động Đăng nhập (`playwright_navigate` / `playwright_login_*`):**
   - Đọc URL và thông tin đăng nhập từ file `.env` (ví dụ: `DASHBOARD_URL`, `WEB_BASE_URL`).
   - Sử dụng tool `playwright_login_dashboard` hoặc `playwright_login_trading` để tự động vượt qua màn hình đăng nhập.
2. **Quan sát trực quan (`playwright_screenshot`):**
   - Chụp ảnh màn hình (`playwright_screenshot(name="ui_overview")`) để xác định chính xác layout, menu, và trạng thái hiển thị.
3. **Soi DOM thật (`playwright_get_dom` & `playwright_inspect_element`):**
   - Lấy mã HTML thực tế từ DOM bằng `playwright_get_dom`.
   - Dùng `playwright_inspect_element(selector=...)` để soi thuộc tính `role`, `name`, `placeholder`, `aria-label`, `isVisible`, `isEnabled`.
4. **Thử nghiệm tương tác (`playwright_click` & `playwright_fill`):**
   - Thực hiện bấm thử và điền thử giá trị qua MCP trước khi sinh mã code, bảo đảm selector hoạt động trơn tru.
5. **Chốt Semantic Locators:**
   - Ưu tiên 1: `page.get_by_role()` (button, link, heading, tab, dialog).
   - Ưu tiên 2: `page.get_by_label()` (form fields).
   - Ưu tiên 3: `page.get_by_placeholder()` (search/input).
   - Ưu tiên 4: `page.get_by_test_id()` (`data-testid`).
   - **NGHIÊM CẤM:** Tự suy đoán locator hoặc dùng XPath tuyệt đối dài dòng (`/html/body/div[1]/...`).

### 2.3. Smart Waits & Auto-retrying Assertions
- Tuyệt đối KHÔNG sử dụng hard sleep (`time.sleep()` hoặc `page.wait_for_timeout()`).
- Luôn sử dụng auto-retrying assertions của Playwright:
  - `expect(locator).to_be_visible()`
  - `expect(locator).to_have_text(...)`
  - `expect(locator).to_be_enabled()`


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
2. **Event Payload Schema:** BẮT BUỘC validate JSON Schema của Event message được push về (đối chiếu với tài liệu Jira). Dùng Pydantic v2 model (`EventModel.model_validate(raw)`) hoặc `jsonschema.validate()` — KHÔNG chỉ kiểm tra 1-2 field đơn lẻ.
3. **Luồng & Thứ tự sự kiện (Event Sequence & Timestamp):**
   - BẮT BUỘC kiểm tra các sự kiện được đẩy về phải tuân thủ nghiêm ngặt tính tuần tự về thời gian: Event phát sinh sau phải có timestamp lớn hơn event trước đó và được Client nhận về sau.
   - Các luồng chuyển trạng thái phụ thuộc vào từng nghiệp vụ cụ thể, nhưng **tính hợp lệ về thời gian (Time-series validation)** là tiêu chuẩn kỹ thuật bắt buộc cho mọi message stream.
4. **Data Isolation (Tính cô lập):** User A chỉ nhận event của User A, tuyệt đối không nhận data của User B.
5. **Trạng thái gián đoạn (Disruption):** Test luồng ngắt kết nối (mất mạng) và xác nhận hành vi hệ thống (có hoặc không replay event đã mất).
6. **Async Testing & Fail-fast:** BẮT BUỘC dùng `@pytest.mark.asyncio` và bọc `await asyncio.wait_for(ws.receive_event(), timeout=5.0)` để fail-fast nếu không có event sau 5s. TUYỆT ĐỐI CẤM dùng `asyncio.sleep()` hay `time.sleep()` để chờ thụ động.
7. **Kiểm Thử Luồng Chuyển Trạng Thái Lệnh E2E (Order & Conditional Order State Machine Testing):**
   - **Mô hình Trigger - Listen - Verify:** Đối với các task liên quan đến event trạng thái lệnh (`order_events`, `conditional_orders`), Agent **TUYỆT ĐỐI KHÔNG** chỉ nghe thụ động hoặc mock dữ liệu. BẮT BUỘC thiết kế kịch bản kiểm thử E2E:
     1. Mở kết nối WebSocket và Subscribe kênh lệnh (`orders`, `order_events` hoặc `conditional_orders`) cho tài khoản test (`account_no`).
     2. Kích hoạt hành động qua REST API (đặt lệnh thường, đặt lệnh điều kiện, sửa lệnh, hủy lệnh, hoặc tạo lệnh đối ứng).
     3. Đón nhận và xác thực từng event WebSocket bắn về theo đúng máy trạng thái (FSM) và JSON Schema (Pydantic model).
   - **Bao phủ đầy đủ cả 2 nhóm lệnh:**
     + **Lệnh Thường (Normal Orders — kênh `order_events`):** `PendingNew` $\rightarrow$ `New`, `PendingReplace` $\rightarrow$ `Replaced`, `PendingCancel` $\rightarrow$ `Cancelled`, `PartiallyFilled` & `Filled` (qua API Bắn Báo Cáo Khớp Lệnh ORS Admin UAT), `Rejected` (15 mã lỗi ORS), `WaitToConfirm` (lệnh thỏa thuận 2F).
     + **Lệnh Điều Kiện (Conditional Orders — kênh `conditional_orders`):** `NEW` $\rightarrow$ `ACTIVATED` (qua Kỹ thuật Tự Tạo Tick Thị Trường Bằng Lệnh Đối Ứng hoặc In-the-Money Trigger), `CANCELLED`, `CANCELLED_AFTER_TRIGGER`, `REJECTED` khi kích hoạt (rút cạn sức mua), `CANCELLED_BY_RIGHTS_EVENT`, `OCO`.
   - **📖 Cẩm nang chi tiết & kỹ thuật gọi API:** Xem toàn bộ quy trình và kịch bản gọi API cụ thể tại [order_state_testing.md](order_state_testing.md).

---

## 5. Quy Tắc Chuyên Biệt Cho Mobile App Testing (Task Type: 📱 APP)

Áp dụng cho các dự án ứng dụng di động (Android / iOS):

1. **Mô hình Screen Object Model (SOM):**
   - Tương tự POM nhưng thiết kế theo từng Screen/Drawer/Modal của ứng dụng di động.
   - Chỉ chứa selectors và gestures/actions, không đặt assertions trong Screen class.
2. **Lựa chọn Framework phù hợp:**
   - **Playwright Mobile Emulation:** Dành cho Mobile Web, PWA hoặc Webview tích hợp. Sử dụng context giả lập thiết bị (`devices["Pixel 7"]`, `devices["iPhone 14"]`) kèm thao tác `tap()`.
   - **Appium Python Client:** Dành cho Native App (.apk, .aab, .ipa).
3. **Thứ tự ưu tiên Mobile Locators (Appium):**
   1. `AppiumBy.ACCESSIBILITY_ID` (hoặc `content-desc` trên Android, `accessibilityIdentifier` trên iOS) — **Ưu tiên số 1, ổn định nhất**.
   2. `AppiumBy.ANDROID_UIAUTOMATOR` hoặc `AppiumBy.IOS_PREDICATE`.
   3. `AppiumBy.ID` (Resource-ID).
   4. `AppiumBy.XPATH` — **Hạn chế tối đa**, chỉ dùng khi phần tử không có định danh riêng.
4. **Thao tác Cảm ứng & Cử chỉ (Mobile Gestures):**
   - Không click bằng chuột giả lập; sử dụng đúng hành vi mobile: `tap()`, `swipe()`, `scroll_to_element()`, `long_press()`.
   - BẮT BUỘC dùng Smart Waits (ví dụ `WebDriverWait` kết hợp `expected_conditions`) thay vì hard sleep khi chờ màn hình cuộn xong.
5. **Xử lý các tình huống đặc thù Mobile:**
   - **Mất mạng (Offline mode):** Kiểm tra phản hồi ứng dụng khi mất kết nối mạng đột ngột (Airplane mode on) và khi mạng phục hồi.
   - **Quyền hệ thống (System Permissions):** Bật `autoGrantPermissions: True` trong capabilities hoặc viết helper tự động bấm "Cho phép" các dialog xin quyền (Location, Camera, Notification).
   - **Vòng đời ứng dụng (App Lifecycle):** Test trường hợp app chuyển vào Background (nhận cuộc gọi/chuyển app) rồi quay lại Foreground (đảm bảo không bị văng phiên đăng nhập).
   - **Bảo mật Biometrics/PIN:** Mock hoặc test các bước nhập mã PIN xác thực giao dịch tài chính.
6. **Tự động chụp ảnh lỗi (Screenshot on Failure):**
   - Khi chạy trên Mobile, bắt buộc có fixture/hook lưu ảnh chụp màn hình thiết bị khi test fail để đối chiếu layout và thông báo lỗi.

---

## 6. Quy Chuẩn Nghiệp Vụ Chứng Khoán (Securities Domain Standards)

Khi thiết kế và viết code automation test cho domain chứng khoán, Agent **BẮT BUỘC** tham chiếu và tuân thủ nghiêm ngặt cẩm nang nghiệp vụ tại [references/securities-domain-rules.md](../../../../../references/securities-domain-rules.md):
- **Dữ liệu thật từ TimescaleDB (V3 > V2):** Tra cứu qua MCP `test-data` (DB 644). Tuyệt đối cấm tự bịa mã chứng khoán hoặc giá vi phạm biên độ sàn (HOSE $\pm 7\%$, HNX $\pm 10\%$, UPCOM $\pm 15\%$) và bước giá (tick size).
- **Kiểm thử 25 kịch bản Random End (RE):** Kiểm chứng nhận diện mã RE tại ATO (`expected_price != 0`) và ATC (`expected_price != 0 & expected_quantity != 0`), mã RE giữ nguyên phiên ATO sau 09:15 cho đến khi nhận tín hiệu kết thúc từ `Prices` (`trading_session_id = 40` hoặc `type = 2 & trading_session_id = 10`), tự động reset `enableRE = false`, chặn lệnh MTL/MP và cấm sửa/hủy lệnh trong khoảng 09:15-09:17.
- **Bao phủ 15 mã lỗi ORS & Fallback Lệnh 24/7:** Kiểm tra các ca biên sinh đúng 15 mã lỗi ORS và luồng tự động Fallback sang Lệnh 24/7 khi đặt lệnh ngoài phiên hoặc khi thị trường Halt.
- **Kiểm thử biên Sửa Lệnh (Replace Order):** $newQuantity = filledQuantity$ (bị từ chối), $newQuantity = filledQuantity + 1$ (chấp nhận), sửa lệnh ngoài phiên liên tục, sửa lệnh thị trường.
- **Quản trị vị thế ký quỹ theo Deal (Deal-based Margin):** Kiểm thử công thức tỷ lệ Deal ($R_{\text{deal}}$), Giá chặn Margin (Loan Price / Cap Price), Call Margin ($<85\%$), Smart Order Force Sell ($<80\%$).
