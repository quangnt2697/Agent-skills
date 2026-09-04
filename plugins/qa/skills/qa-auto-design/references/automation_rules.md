# Quy Tắc Automation Testing (Playwright + Pytest)

Bộ quy tắc này được Agent tự động tham chiếu khi thực thi skill `/qa-auto-design`.

---

## 1. Quy Tắc Chung (Áp dụng mọi Task Type)

### 1.1. Tách biệt Logic (Mô hình POM / API Object)
- Logic tương tác (UI click, nhập liệu) hoặc Network (gửi API, Connect WebSocket) bắt buộc để ở tầng `pages/` hoặc `services/`.
- Logic xác minh (Assertions) bắt buộc để ở tầng `tests/`. **KHÔNG assert trong Page/Service class.**
- Tầng **Model / DTO Layer** (`models/`): Định nghĩa các lớp Request/Response/Event schema chuẩn **Pydantic v2** (`BaseModel`, `Field`, `@field_validator(..., mode="after")` + `@classmethod`). Dùng `model_validate()` và `model_dump()`. **TUYỆT ĐỐI KHÔNG dùng cú pháp Pydantic v1** (`@validator` đã bị deprecated).

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
- Ví dụ: Test tạo order/user → fixture phải gọi API DELETE/Cancel ở khối teardown.

### 1.6. Authentication & Kế Thừa Cấu Hình Môi Trường (3-Tier Env)
- **KHÔNG hardcode** passwords, secret keys, API tokens trực tiếp trong source code hoặc file test data.
- **Kế thừa cấu hình 3 tầng (3-Tier Auto-Discovery):** Tự động dò quét Root `.env` và các task anh em cùng hệ thống (`workspace/*/test/.env`) để kế thừa các credentials (`API_KEY`, `API_SECRET`, `BASE_URL`, `WS_URL`, `API_TOKEN`) mà không cần hỏi lại user.
- **Quản lý Token Lifecycle & Caching:**
  - Lấy Auth Token ở session-scoped fixture (`@pytest.fixture(scope="session")`).
  - Hỗ trợ cache file cục bộ để tái sử dụng token giữa các session chạy test khác nhau trong ngày, tránh spam API Login.
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

### 1.10. Capture Request/Response (API & WebSocket)
- Khi test API/WS, test script phải được thiết kế hoặc sử dụng log/interceptor để **bắt được toàn bộ thông tin Request đã gửi và Response thực tế trả về**.
- Các thông tin này bắt buộc phải được đưa vào báo cáo (`report.md`) theo template để QA/BA và Dev có thể debug trực tiếp từ báo cáo mà không cần chạy lại test.

### 1.11. Liên kết Kịch bản Gherkin Chặt chẽ (Gherkin Traceability Binding)
- Mỗi test function trong file `test_*.py` **BẮT BUỘC** phải có:
  1. Decorator `@pytest.mark.scenario("<Tên scenario chính xác trong .feature>")`
  2. Decorator `@pytest.mark.jira("{issueKey}")`
  3. Docstring trích dẫn nguyên văn kịch bản BDD tương ứng (Given / When / Then) để bảo đảm ma trận truy vết 1-1 giữa code automation và tài liệu Gherkin.

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
