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

> [!WARNING]
> **Anti-Pattern Phổ Biến:** Tự động viết lại toàn bộ class HTTP Client, tự viết hàm HMAC signature, tự dựng kết nối WebSocket từ đầu trong khi dự án đã có sẵn code của Developer. Hành vi này tạo ra 2 nguồn sự thật (two sources of truth) và khiến code test khó bảo trì.

### 3.1. Các Bước Thực Hiện Code Recon Gate

```
[BƯỚC 1: Quét Codebase] ──> [BƯỚC 2: Đối Chiếu Spec] ──> [BƯỚC 3: Tái Sử Dụng & Wrap]
(grep_search / list_dir)     (Swagger / Jira / Final.md)   (Import Service, cấm viết lại)
```

1. **Bước 1: Quét tìm code có sẵn trong workspace bằng `grep_search` & `list_dir`:**
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

### 3.2. Chính Sách Tuyệt Đối Không Mock Trên UAT (Real Base URLs Only)

Trong quá trình Recon và thiết kế API/WS client:
- Mọi cấu hình kết nối BẮT BUỘC trỏ vào Real Base URLs từ `.env`:
  + `BASE_URL` cấu hình trong `.env` (UAT hoặc Sandbox).
  + `WS_URL` cấu hình trong `.env`.
- **CẤM TUYỆT ĐỐI:** Sử dụng mock server cục bộ, `unittest.mock`, `respx`, `responses`, `@patch` để giả lập response trên UAT. Test phải phản ánh 100% dữ liệu và phản hồi thực từ hệ thống.
