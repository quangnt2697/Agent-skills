---
name: qa-auto-design
description: Viết code automation test bằng Playwright/Pytest (Web, API, WebSocket). Trigger bằng lệnh /qa-auto-design. Đọc Task Type từ Jira và dựa vào checklist, Gherkin file (.feature) để sinh code theo đúng quy tắc.
---

# Kỹ năng Automation Testing (auto-test)

## Mục đích

Skill này tự động hóa việc sinh code kiểm thử (test scripts) dựa trên các artifacts đã có (Checklist, BDD Gherkin file) cho các hệ thống WEB, API, hoặc WebSocket bằng Python, Playwright, và Pytest.

## Trigger

Người dùng gọi lệnh `/qa-auto-design` hoặc yêu cầu "viết code automation test", "chuyển file feature thành code"...

## Nguyên Tắc Cốt Lõi

1. **AI DOM Recon First (chỉ UI):** Agent phải sử dụng browser MCP để mở trình duyệt, inspect DOM thật. TUYỆT ĐỐI không suy đoán locator.
2. **Phân tầng nghiêm ngặt:** Tuân thủ POM (UI) hoặc API Object Pattern (API/WS). Assertions chỉ ở tầng Test.
3. **Smart Waits:** Không hard sleep (`time.sleep`, `wait_for_timeout`). Chỉ dùng auto-waiting/auto-retrying assertions.
4. **Deterministic Data:** Test data phải unique + traceable, không hardcode.
5. **Self-fix Loop:** Agent tự chạy test → nếu script lỗi runtime (ImportError, SyntaxError...) → tự đọc log, sửa script, chạy lại → đến khi script thực thi hoàn tất. KHÔNG sửa code để ép test case FAIL thành PASS.

---

## Quy Trình 7 Bước

```
Bước 0: Kiểm tra kiến trúc Project
         │
Bước 1: Nhận diện Task Type & Bối cảnh
         │
Bước 2: Đối chiếu Checklist & Gherkin (Gate)
         │
Bước 3: Phân tích & Recon (UI DOM / API Spec)
         │
Bước 4: Thiết kế POM / Service Objects
         │
Bước 5: Sinh Code Automation
         │
Bước 6: Review Code (Quality Gate)
         │
Bước 7: Chạy Test & Xuất Báo Cáo
```

### Bước 0: Kiểm tra Kiến trúc Project

Trước khi viết bất kỳ code nào, Agent **BẮT BUỘC** phải:

1. **Quét cấu trúc thư mục hiện có** của workspace để xác định project đã có sẵn hay cần tạo mới.
2. **KHÔNG tự động xóa file source** khi chưa xác nhận với user.
3. **Đặt file đúng thư mục** theo kiến trúc project. Nếu project mới (Playwright + Python), khởi tạo theo cấu trúc chuẩn:

```
project-root/
├── conftest.py                   # Root fixtures + browser setup
├── .env.example                  # KHÔNG chứa credentials thật
├── src/
│   ├── pages/                    # Page Object classes (UI)
│   │   ├── base_page.py
│   │   └── login_page.py
│   ├── services/                 # API/WS Client classes
│   │   ├── api_client.py
│   │   └── ws_client.py
│   ├── models/                   # DTO / Pydantic models
│   │   └── order_event.py
│   └── utils/                    # Helpers & data generators
│       ├── test_data.py
│       └── env_config.py
├── tests/                        # Test specs (grouped by feature)
│   ├── ui/
│   ├── api/
│   └── ws/
└── test-data/                    # External test data (JSON/YAML)
```

### Bước 1: Nhận diện Task Type và Bối cảnh

1. **Phân tích Jira / Yêu cầu:** Xác định rõ đối tượng cần test (Task Type) là gì:
   - `WEB / UI` → Áp dụng mô hình POM (Page Object Model).
   - `API` → Áp dụng API Object Pattern (REST).
   - `WebSocket` → Áp dụng Async WS Service Pattern.
2. Đọc file spec hoặc yêu cầu gốc (Jira `*-final.md`) nếu có trong workspace để hiểu luồng nghiệp vụ.

### Bước 2: Đối chiếu Checklist và Gherkin File (Quality Gate)

1. **Quét file `.feature` và Checklist:** Agent **BẮT BUỘC** phải tìm và đọc file Checklist (nếu có) và `.feature` liên quan đến tính năng này.
2. **Đảm bảo Coverage 100%:** Số lượng test method/case sinh ra phải phản ánh chính xác và cover toàn bộ các scenario trong file Gherkin. KHÔNG tự ý bỏ sót bất kỳ một kịch bản nào.
3. **Quy trình bắt buộc:** Nếu file `.feature` không tồn tại, yêu cầu user tạo Gherkin file trước khi viết code (có thể thông qua skill `qa-test-design`). KHÔNG tự ý sáng tác code khi không có thiết kế test case đầu vào.

### Bước 3: Phân tích & Recon

Tuỳ theo Task Type:

**Với UI (Web/App):**
- Sử dụng browser MCP (Playwright) để **tự mở trình duyệt** và inspect DOM thật.
- Thu thập locators trực tiếp từ DOM. Phải verify locator tồn tại trước khi sử dụng.
- **TUYỆT ĐỐI KHÔNG:** Suy đoán locator, copy locator mù quáng từ code cũ mà không verify.

**Với API:**
- Đọc API spec (Swagger/OpenAPI, Postman collection, hoặc tài liệu Jira).
- Đối với các dự án có sẵn các file code api thì tiến hành đọc code api đó và viết automation script dựa theo code đó (ưu tiên viết lại giống với code đã sẵn có).
- Trích xuất: Endpoints, HTTP Methods, Request/Response Schemas, Auth mechanism.

**Với WebSocket:**
- Đọc tài liệu Jira/spec để trích xuất: Connection URL, Auth mechanism, Channel/Topic names, Event Payload Schemas mẫu.
- Đối với các dự án có sẵn các file code websocket thì tiến hành đọc code websocket đó và viết automation script dựa theo code đó (ưu tiên viết lại giống với code đã sẵn có).

### Bước 4: Thiết kế POM / Service Objects

**Đọc quy tắc chi tiết:** 👉 Đọc file `references/automation_rules.md` trước khi viết code.

**Với UI:**
- Viết class Page Object. Chỉ chứa locators + action methods. KHÔNG assert.
- Tham khảo code mẫu: 👉 `examples/web_ui_pom.py`

**Với API/WebSocket:**
- Viết class Service/Client. Chỉ chứa logic gửi/nhận request. KHÔNG assert.
- Viết class DTO/Model (Pydantic/Dataclass) cho request/response/event payload.
- Tham khảo code mẫu: 👉 `examples/api_ws_service.py`

### Bước 5: Sinh Code Automation

**Với API/WebSocket — Ưu tiên tái sử dụng code có sẵn:**

Trong hầu hết các dự án, developer đã tạo sẵn các file code gọi API hoặc kết nối WebSocket (client, service, helper...). Agent **BẮT BUỘC** phải:

1. **Quét workspace để tìm code có sẵn:** Tìm các file `.py` đã có logic gọi API (`requests`, `httpx`, `APIRequestContext`) hoặc kết nối WebSocket (`websockets`, `websocket-client`) trong project. Hoặc tìm kiếm các file `.py` có tên file giống với tên task jira.
2. **Tái sử dụng làm tầng Service:** Import và sử dụng trực tiếp các class/function đã có thay vì viết lại từ đầu. Điều này giúp:
   - Code automation dễ đọc, nhất quán với codebase hiện tại.
   - Người đọc (user) nhìn vào hiểu ngay logic vì quen thuộc với code đã có.
3. **Chỉ viết tầng Test:** Agent chỉ cần viết file `test_*.py` gọi các hàm/class đã có, truyền dữ liệu, và thực hiện Assertions.
4. **Nếu cần bổ sung:** Chỉ thêm wrapper/helper nhỏ khi code có sẵn thiếu method cụ thể (VD: thiếu hàm subscribe channel). KHÔNG viết lại toàn bộ client class.

**Với UI — Viết mới POM:**

Do UI test thường chưa có sẵn Page Objects, Agent viết mới các class POM theo Bước 4.

**Quy tắc chung cho mọi Task Type:**

1. **Cấu trúc Arrange → Act → Assert:**
   ```
   Arrange: Setup data, khởi tạo Page/Service (hoặc import service có sẵn)
   Act:     Thực hiện hành động (navigate, fill, click / gửi request / connect WS)
   Assert:  Kiểm tra kết quả (expect, assert)
   ```

2. **Tham số hoá (Parameterize)** cho các `Scenario Outlines` từ Gherkin → dùng `@pytest.mark.parametrize`.

3. **Dữ liệu động:** Setup prefix_testname_timestamp cho mọi dữ liệu cần unique.

4. **Teardown (Data Cleanup):** Dùng cơ chế `yield` trong pytest fixture để dọn dẹp data rác (xoá user, huỷ lệnh...) sau khi test xong.

5. **Authentication:**
   - KHÔNG hardcode tokens/passwords. Đọc từ `.env` / environment variables.
   - Lấy Auth Token 1 lần ở session-scoped fixture, tái sử dụng giữa các tests.

### Bước 6: Review Code (Quality Gate)

**Bước này KHÔNG ĐƯỢC bỏ qua.** Agent phải tự review code trước khi chạy test.

1. **Gọi skill `code-review-and-quality`** để đánh giá code automation vừa sinh ra. Các tiêu chí review:
   - **Kiến trúc:** Assertions có nằm đúng tầng Tests không? Page/Service có chứa assert không?
   - **Coverage:** Mỗi scenario trong `.feature` đều có test method tương ứng?
   - **Naming:** Tên biến, method có rõ nghĩa không?
   - **Duplication:** Có logic trùng lặp cần extract thành helper không?
   - **Method length:** Method nào quá dài (>20 dòng) cần tách?

2. **Clean code trước khi chạy:**
   - Xoá toàn bộ `print()`, `console.log()` sinh ra khi debug.
   - Xoá code bị comment (`#`, `"""..."""`) không còn dùng.
   - Xoá locator / biến khai báo mà không sử dụng (unused code).

3. **Nếu review phát hiện lỗi** → sửa code → review lại → lặp cho đến khi code sạch và đúng cấu trúc.

### Bước 7: Chạy Test & Xuất Báo Cáo

#### 7.1. Thực thi Test

1. **Chạy test:** Thực thi `pytest` trên code vừa sinh ra.
   ```bash
   # Chạy test và sinh báo cáo HTML
   pytest tests/ -v --html=reports/report.html --self-contained-html
   # Hoặc nếu dùng Allure
   pytest tests/ -v --alluredir=reports/allure-results
   ```
2. **Self-fix Loop (chỉ sửa lỗi script, KHÔNG sửa kết quả test):**
   - Nếu `pytest` **không thể thực thi được** (lỗi runtime: ImportError, SyntaxError, fixture thiếu, timeout config sai, connection refused...) → đọc log lỗi → sửa code script → chạy lại → lặp cho đến khi script chạy hoàn tất.
   - **KHÔNG ĐƯỢC sửa code để ép test case từ FAIL thành PASS.** Nếu test case FAIL vì ứng dụng/API trả kết quả sai so với spec → đó là kết quả hợp lệ, ghi nhận vào báo cáo, KHÔNG can thiệp.
   - **Tóm lại:** Self-fix = sửa lỗi kỹ thuật của script. Test FAIL do bug ứng dụng = kết quả cần báo cáo.
3. **CI/CD Readiness:** Code phải chạy được trong CI (headless mode, không phụ thuộc local state).

#### 7.2. Xuất Báo Cáo Kết Quả

Sau khi test chạy xong, Agent **BẮT BUỘC** xuất báo cáo kết quả dưới dạng **Markdown artifact** (file `.md`) với nội dung sau:

**Cấu trúc báo cáo:**

```markdown
# Báo cáo Kết quả Automation Test — [Tên tính năng / Issue Key]

**Ngày chạy:** [timestamp]
**Môi trường:** [UAT / Staging / Sandbox]
**Framework:** Playwright + Pytest
**Task Type:** [UI / API / WebSocket]

## Tổng kết

| Chỉ số          | Giá trị |
|-----------------|---------|
| Tổng test cases | X       |
| ✅ Passed       | X       |
| ❌ Failed       | X       |
| ⏭️ Skipped     | X       |
| ⏱️ Thời gian   | X giây  |

## Chi tiết kết quả

| # | Test Case                         | Trạng thái | Thời gian | Ghi chú     |
|---|-----------------------------------|------------|-----------|-------------|
| 1 | test_login_success                | ✅ PASSED  | 1.2s      |             |
| 2 | test_login_invalid_password       | ✅ PASSED  | 0.8s      |             |
| 3 | test_ws_event_timestamp_sequence  | ❌ FAILED  | 3.1s      | Xem lỗi bên dưới |

## Chi tiết lỗi (nếu có)

### ❌ test_ws_event_timestamp_sequence
- **Lỗi:** AssertionError: Timestamp event [2] (1691234000) phải lớn hơn event [1] (1691234500)
- **File:** tests/ws/test_order_events.py:45
- **Screenshot:** [Đính kèm nếu là UI test]

## Truy vết Scenario ↔ Test

| Scenario trong .feature              | Test method tương ứng              | Kết quả   |
|--------------------------------------|------------------------------------|-----------|
| Kết nối WebSocket thành công         | test_ws_connect_success            | ✅ PASSED |
| Từ chối kết nối khi API Key sai      | test_ws_connect_invalid_key        | ✅ PASSED |

## Truy vết End-to-End (Biz-spec → Checklist → Gherkin → Test)

| Biz-spec Section        | Checklist Item (ID) | Gherkin Scenario           | Test Method              | Kết quả   |
|-------------------------|---------------------|----------------------------|--------------------------|-----------|
| Business Rule #1        | CL-001 [P0]         | SC-01: Luồng thành công   | test_order_success       | ✅ PASSED |
| Authentication          | CL-002 [P0]         | SC-02: API key không hợp lệ| test_invalid_api_key    | ✅ PASSED |
| Validation Rules        | CL-005 [P1]         | SC-05: Giá vượt trần      | test_price_exceed_ceiling| ❌ FAILED |
```

**Đường dẫn output báo cáo:**
- File báo cáo Markdown: `tests/qa-test-design/{issueKey}/reports/{issueKey}-report.md`
- File báo cáo HTML (nếu dùng pytest-html): `tests/qa-test-design/{issueKey}/reports/{issueKey}-report.html`
- Screenshot lỗi (nếu UI test): `tests/qa-test-design/{issueKey}/reports/screenshots/`

---

## Verification Checklist

Sau khi hoàn thành, Agent tự kiểm tra:

### Kiến trúc
- [ ] File được đặt đúng thư mục (`pages/`, `services/`, `tests/`)
- [ ] Assertions chỉ nằm trong tầng Tests, KHÔNG ở Page/Service
- [ ] Có class DTO/Model cho API/WS response schema

### Coverage
- [ ] Mỗi scenario trong file `.feature` đều có test method tương ứng
- [ ] Có test cho cả happy path và negative/edge cases

### Data & Auth
- [ ] Dữ liệu unique sinh động (UUID/timestamp), không hardcode
- [ ] Credentials đọc từ `.env`, không nằm trong source code
- [ ] Có fixture teardown dọn dẹp data rác

### Code Quality
- [ ] Không còn `print()`, `console.log()`, code comment rác
- [ ] Sử dụng auto-retrying assertions (`expect`), không hard sleep
- [ ] Đã qua bước Review Code (Bước 6) — không bỏ qua

### Thực thi & Báo cáo
- [ ] Chạy qua toàn bộ các scenario bằng `pytest`
- [ ] Xuất báo cáo Markdown với bảng tổng kết Pass/Fail
- [ ] Chi tiết Request & Response ĐẦY ĐỦ cho từng test case (API/WS)
- [ ] Bảng truy vết Scenario ↔ Test method đầy đủ
- [ ] Screenshot đính kèm khi UI test fail

### Quy tắc theo Task Type
- [ ] **UI:** Locators lấy từ DOM thật, ưu tiên semantic (`get_by_role`, `get_by_label`)
- [ ] **API:** Đủ 7 assertions (Request Schema, Status Code, Response Schema, Business Fields, Error Detail, SLA, Headers)
- [ ] **WebSocket:** Validate Event Payload Schema + Time-series (timestamp tuần tự) + Data Isolation

## Quy trình QA tổng thể

Skill `auto-test` nằm ở **Giai đoạn 3-4** trong pipeline QA:

```
Giai đoạn 1              Giai đoạn 2              Giai đoạn 3              Giai đoạn 4
/ba-spec            →   /qa-test-design      →   /qa-auto-design           →   Báo cáo
Import Jira              Thiết kế Checklist       Sinh code automation     Chạy test &
→ Phân tích spec         → Viết Gherkin file      → Review code            Xuất report
                                                  → Chạy test
```

| Giai đoạn | Skill | Input | Output |
|-----------|-------|-------|--------|
| 1 | `biz-spec` | Jira Issue Key | `specs/jira-import/{issueKey}/ba-spec/{issueKey}-final.md` |
| 2 | `qa-test-design` | File `*-final.md` | `tests/qa-test-design/{issueKey}/features/{issueKey}-checklist.md` + `{issueKey}.feature` |
| 3 | `auto-test` | File `.feature` + code có sẵn | `tests/qa-test-design/{issueKey}/steps/test_*.py` |
| 4 | `auto-test` (Bước 7) | Test scripts | `tests/qa-test-design/{issueKey}/reports/{issueKey}-report.md` |

## Xem thêm

- Đọc bộ quy tắc chi tiết tại `references/automation_rules.md`
- Template báo cáo kết quả test tại `references/report_template.md`
- Tham khảo code mẫu UI tại `examples/web_ui_pom.py`
- Tham khảo code mẫu API/WS (tái sử dụng code có sẵn) tại `examples/api_ws_service.py`
- Tham khảo conftest.py mẫu (fixtures dùng chung) tại `examples/conftest_template.py`
- Để import và phân tích Jira task, dùng skill `biz-spec`
- Để thiết kế Gherkin/Checklist trước khi viết code, dùng skill `qa-test-design`
- Để review code trước khi merge, dùng skill `code-review-and-quality`
