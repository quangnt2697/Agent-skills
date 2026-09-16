# Cẩm Nang Quy Trình Khảo Sát & Trinh Sát Mã Nguồn (Reconnaissance Guide)

Tài liệu này hướng dẫn chi tiết quy trình khảo sát thực tế (Reconnaissance) trước khi sinh code automation test cho tất cả các loại Task Type (`Web UI`, `Mobile App`, `API`, `WebSocket`).

> [!IMPORTANT]
> **Nguyên tắc bất di bất dịch:** KHÔNG BAO GIỜ viết code test dựa trên phỏng đoán. Bắt buộc phải trinh sát hệ thống thực tế (DOM thật, app thật, hoặc mã nguồn codebase đã có) trước khi viết bất kỳ class hay test method nào.

---

## 1. Web UI Recon (Quy Trình 5 Bước Với MCP Playwright)

Đối với các task kiểm thử Web UI (`🌐 WEB`), Agent **BẮT BUỘC** thực hiện quy trình trinh sát trên trình duyệt thật thông qua Playwright MCP trước khi viết Page Object Model (POM):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Khởi động & Điều hướng (playwright_navigate)              │
│    - Mở DASHBOARD_URL / WEB_BASE_URL                        │
│    - Tự động đăng nhập nếu yêu cầu auth                     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Quan sát trực quan (playwright_screenshot)               │
│    - Chụp ảnh snapshot nhận diện modal/pop-up che khuất     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Soi DOM thật (playwright_get_dom & inspect_element)       │
│    - Lấy HTML của vùng chức năng                            │
│    - Soi tag, role, aria-label, placeholder, visibility     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Thử nghiệm tương tác (playwright_click & fill)           │
│    - Click / nhập thử dữ liệu để xác nhận không bị disabled │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Chốt Semantic Locators đưa vào Page Object (POM)         │
│    - get_by_role, get_by_label, get_by_placeholder         │
│    - CẤM XPath tuyệt đối (/html/body/...)                   │
└─────────────────────────────────────────────────────────────┘
```

### Chi tiết từng bước thao tác:

1. **Khởi động & Điều hướng (`playwright_navigate`):**
   - Đọc URL mục tiêu từ file `.env` (`DASHBOARD_URL` hoặc `WEB_BASE_URL`).
   - Gọi tool điều hướng tới trang cần kiểm thử.
   - *Xử lý đăng nhập:* Nếu trang yêu cầu xác thực, gọi ngay helper đăng nhập (ví dụ: `playwright_login_dashboard` hoặc `playwright_login_trading`) để duy trì session làm việc.

2. **Quan sát tổng thể (`playwright_screenshot`):**
   - Chụp ảnh màn hình (`name="recon_initial"`) để quan sát bố cục trực quan.
   - Nhận diện các lớp overlay, banner quảng cáo, dialog điều khoản hoặc notification pop-up có thể che khuất các phần tử tương tác.

3. **Soi DOM thật (`playwright_get_dom` & `playwright_inspect_element`):**
   - Gọi `playwright_get_dom(selector=...)` để lấy cây HTML chính xác của container chứa tính năng.
   - Gọi `playwright_inspect_element(selector=...)` để kiểm tra chi tiết:
     + Thẻ HTML (`button`, `input`, `select`, `div`).
     + Accessibility Role (`role="button"`, `role="combobox"`).
     + Các thuộc tính định danh: `aria-label`, `placeholder`, `data-testid`, `name`, `id`.
     + Trạng thái: `disabled`, `readonly`, bounding box và độ hiển thị (`visible`).

4. **Thử nghiệm tương tác trước (`playwright_click` & `playwright_fill`):**
   - Thử click hoặc fill dữ liệu mẫu qua tool MCP để đảm bảo phần tử nhận sự kiện bình thường, không bị chặn bởi animation hoặc z-index layer.

5. **Chốt Semantic Locators đưa vào Page Object (POM):**
   - Ưu tiên số 1: `page.get_by_role("button", name="...")`
   - Ưu tiên số 2: `page.get_by_label("...")`
   - Ưu tiên số 3: `page.get_by_placeholder("...")`
   - Ưu tiên số 4: `page.get_by_test_id("...")`
   - Ưu tiên số 5: CSS selector ngắn gọn mang tính ngữ nghĩa (ví dụ: `.order-form button[type="submit"]`).
   - **TUYỆT ĐỐI CẤM:** Tự suy đoán ID/class hoặc dùng XPath tuyệt đối (`/html/body/div[1]/div[2]/...`).

---

## 2. Mobile App Recon (Playwright Mobile & Appium)

Đối với ứng dụng di động (`📱 APP / MOBILE`):

### 2.1. Mobile Web / PWA / Hybrid Webview
- Sử dụng Playwright với Device Descriptor mô phỏng thiết bị thực tế:
  ```python
  from playwright.async_api import async_playwright
  # Giả lập Pixel 7 hoặc iPhone 14
  device = playwright.devices["Pixel 7"]
  context = await browser.new_context(**device)
  ```
- Khảo sát vùng cảm ứng (Touch Targets): Đảm bảo các nút bấm có kích thước tối thiểu $44 \times 44$ CSS pixels.
- Kiểm tra thanh cuộn, bàn phím ảo hiển thị và gesture cuộn (`touchscreen`).

### 2.2. Native Mobile App (Android / iOS)
- Quét mã nguồn ứng dụng (Flutter, React Native, Native Android Kotlin/Java, iOS Swift) hoặc dùng Appium Inspector để trích xuất locator:
  1. `AppiumBy.ACCESSIBILITY_ID` (Android `content-desc`, iOS `accessibilityIdentifier`) — **Ưu tiên số 1**.
  2. `AppiumBy.ANDROID_UIAUTOMATOR` hoặc `AppiumBy.IOS_PREDICATE`.
  3. `AppiumBy.ID` (Resource-ID).
  4. `AppiumBy.XPATH` — Chỉ dùng làm giải pháp cuối cùng cho dynamic lists.

---

## 3. API & WebSocket Recon (Pre-generation Code Recon Gate)

Đối với các task kiểm thử Backend (`🔌 API`, `⚡ WebSocket`), Agent **BẮT BUỘC** thực hiện **Code Recon Gate** trước khi bắt tay vào viết code test.

> [!IMPORTANT]
> **BẮT BUỘC ĐỌC NGAY — Bước 0:** Trước khi grep bất cứ thứ gì, đọc file SDK Index:
> ```
> plugins/qa/skills/qa-auto-design/references/sdk-map.json
> ```
> File này chứa đường dẫn và `usage` sẵn cho tất cả class Auth, Trading API, MarketData API, WS Client. Đọc file này tiết kiệm 10-15 phút grep thủ công.

> [!WARNING]
> **Anti-Pattern Phổ Biến:** Tự động viết lại toàn bộ class HTTP Client, tự viết hàm HMAC signature, tự dựng kết nối WebSocket từ đầu trong khi dự án đã có sẵn code của Developer. Hành vi này tạo ra 2 nguồn sự thật (two sources of truth) và khiến code test khó bảo trì.

### 3.1. Các Bước Thực Hiện Code Recon Gate

```
[BƯỚC 0: Đọc sdk-map.json] ──> [BƯỚC 1: Quét Codebase] ──> [BƯỚC 2: Đối Chiếu Spec] ──> [BƯỚC 3: Tái Sử Dụng & Wrap]
(references/sdk-map.json)      (grep_search / list_dir)     (Swagger / Jira / Final.md)   (Import Service, cấm viết lại)
```

1. **Bước 0 (BẮT BUỘC TRƯỚC TIÊN): Đọc `references/sdk-map.json`** để lấy đường dẫn và `usage` của các class/module đã biết. Chỉ grep codebase thêm khi cần tìm module KHÔNG có trong sdk-map.

2. **Bước 1: Quét tìm code có sẵn trong workspace bằng `grep_search` & `list_dir` (khi cần bổ sung):**
   - **Xác thực & Ký số (Auth & HMAC):** Tìm các hàm tạo signature, tạo SHA256/HMAC, hàm lấy Access Token từ API Key/Secret.
     ```bash
     grep_search(Query="api_key", SearchPath="/project-root")
     grep_search(Query="hmac", SearchPath="/project-root")
     grep_search(Query="jwt", SearchPath="/project-root")
     ```
   - **REST API Client:** Tìm các class client hoặc service đã gọi API (`requests`, `httpx`, `aiohttp`, `APIRequestContext`).
     ```bash
     grep_search(Query="class.*Client", SearchPath="/project-root")
     grep_search(Query="def place_order", SearchPath="/project-root")
     ```
   - **WebSocket Client:** Tìm các module kết nối WebSocket, hàm subscribe/unsubscribe channel, logic giải mã gói tin (JSON hoặc MessagePack).
     ```bash
     grep_search(Query="websockets.connect", SearchPath="/project-root")
     grep_search(Query="class WSClient", SearchPath="/project-root")
     grep_search(Query="subscribe", SearchPath="/project-root")
     ```
   - **Enums & Constants:** Tìm các file định nghĩa hằng số channels (`tick`, `top_price`, `order_events`, `conditional_orders`), order types, side (`BUY`/`SELL`).

2. **Bước 2: Đối chiếu Spec và Trích xuất Hợp Đồng (Contract):**
   - Đọc Swagger/OpenAPI spec, Postman collection, hoặc Jira `*-final.md` để trích xuất:
     + URL paths, HTTP methods.
     + Headers bắt buộc (`x-api-key`, `Authorization: Bearer ...`, `Content-Type`).
     + Schema của Request Body và Response Body (để tạo Pydantic v2 models).
     + Kênh WebSocket (Channel names) và cấu trúc payload JSON event.

3. **Bước 3: Nguyên Tắc Tái Sử Dụng:**
   - **Có sẵn $\rightarrow$ Import trực tiếp:** Import class Service/Client của project vào `conftest.py` hoặc `steps/test_*.py`.
   - **Thiếu method nhỏ $\rightarrow$ Viết Wrapper:** Kế thừa class có sẵn và bổ sung thêm đúng method còn thiếu.
   - **CẤM:** Viết lại một client class hoàn toàn mới từ số không khi codebase đã có client chuẩn.

### 3.2. Quét Bắt Buộc Thư Mục SDK `openapi-tyk/sdk/python/` (API & WebSocket)

Đối với toàn bộ task liên quan đến API hoặc WebSocket (đặc biệt là hệ sinh thái Entrade / DNSE OpenAPI), Agent **BẮT BUỘC** phải quét thư mục SDK Python chính thức tại:
`openapi-tyk/sdk/python/`

#### 3.2.1. Cơ Chế Tự Động Định Vị Thư Mục SDK
Agent tiến hành dò tìm thư mục `openapi-tyk/sdk/python/` theo thứ tự ưu tiên:
1. **Tra cứu Alias từ `tools/discord-bridge/projects.json`:**
   - Đọc key `"openapi-tyk"` (ví dụ: `/path/to/openapi-tyk`) ➔ Nối thêm `/sdk/python/`.
2. **Biến môi trường trong `.env`:**
   - Kiểm tra `OPENAPI_TYK_PATH` hoặc `OPENAPI_SDK_PATH` (nếu có chỉ định cụ thể).
3. **Quét thư mục tương đối quanh Workspace:**
   - `./openapi-tyk/sdk/python/` (nếu đang ở thư mục cha chứa các services).
   - `../openapi-tyk/sdk/python/` (thư mục anh em trong cùng cụm dự án 3.1).
   - `../../3.1/openapi-tyk/sdk/python/` hoặc tìm kiếm thư mục `openapi-tyk` trên máy (`find /Users/... -maxdepth 4 -name "openapi-tyk"`).

#### 3.2.2. Khảo Sát & Bóc Tách Codebase SDK Có Sẵn
Bên trong `openapi-tyk/sdk/python/`, Agent cần khảo sát các phân hệ:
- **`dnse/` (`DNSEClient`):**
  - Khởi tạo client trung tâm với xác thực API Key/Secret:
    ```python
    from dnse import DNSEClient
    client = DNSEClient(
        api_key=os.getenv("API_KEY"),
        api_secret=os.getenv("API_SECRET"),
        base_url=os.getenv("BASE_URL"),
        api_version=os.getenv("DNSE_API_VERSION", "2026-05-07")
    )
    ```
  - Hỗ trợ cơ chế `dry_run=True/False` và tự động gắn version header.
- **`trading-api/`:**
  - Chứa toàn bộ nghiệp vụ giao dịch: `post_order`, `cancel_order`, `replace_order`, `get_orders`, `get_order_detail`, `get_ppse` (sức mua/bán), `get_balances`, `get_loan_packages`, `create_trading_token`, `send_email_otp`.
- **`marketdata-api/`:**
  - Dữ liệu thị trường: `get_security_definition`, `get_instruments`, `get_trades`, `get_latest_trade`, `get_ohlc`, `get_close_price`, `get_working_dates`.
- **`websocket-trading/`:**
  - `TradingClient.subscribe_order_event()`: Hỗ trợ lắng nghe luồng sự kiện lệnh thường (`order_events`) và lệnh điều kiện (`conditional_orders`) đồng nhất.
- **`websocket-marketdata/`:**
  - Streaming dữ liệu bảng giá: `sec_def`, `quote` (giá bid/ask tốt nhất), `trade` (khớp lệnh/tick), `ohlc`, `expected_price` (phiên ATO/ATC), `market_index`.
- **`examples/`:**
  - Thư mục chứa các script chạy mẫu hoàn chỉnh cho từng API và kênh WebSocket (`get_accounts.py`, `post_order.py`, `trade.py`, `quote.py`...). Agent cần đọc các file này để nắm vững mẫu gọi hàm thực tế.

#### 3.2.3. Quy Tắc Tái Sử Dụng & Thiết Kế Service Test
1. **Thêm SDK vào đường dẫn nạp module (`pythonpath`):**
   Trong file `pytest.ini` của task test, bổ sung đường dẫn tới `openapi-tyk/sdk/python`:
   ```ini
   [pytest]
   pythonpath = . steps ../../../openapi-tyk/sdk/python /Users/qa-quangnt/Desktop/Project/3.1/openapi-tyk/sdk/python
   ```
2. **Kế thừa Service Client:**
   Trong `workspace/{issueKey}/test/steps/services/`, tạo Service Wrapper kế thừa hoặc bọc `DNSEClient` hoặc các class từ `trading-api`, `websocket-trading`:
   - Không tự code lại request signing HMAC SHA256 hay logic WebSocket framing.
   - Tái sử dụng 100% client có sẵn từ SDK.
3. **Tuyệt đối không hardcode:**
   Mọi tham số đầu vào của SDK (`api_key`, `api_secret`, `base_url`, `account_no`, `symbol`, `price`, `quantity`, `otp`) BẮT BUỘC nạp từ `.env` qua `os.getenv()`.

### 3.3. Chính Sách Tuyệt Đối Không Mock Trên UAT (Real Base URLs Only)

Trong quá trình Recon và thiết kế API/WS client:
- Mọi cấu hình kết nối BẮT BUỘC trỏ vào Real Base URLs từ `.env`:
  + `BASE_URL` cấu hình trong `.env` (UAT hoặc Sandbox).
  + `WS_URL` cấu hình trong `.env`.
- **CẤM TUYỆT ĐỐI:** Sử dụng mock server cục bộ, `unittest.mock`, `respx`, `responses`, `@patch` để giả lập response trên UAT. Test phải phản ánh 100% dữ liệu và phản hồi thực từ hệ thống.
