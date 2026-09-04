# Mẫu Bộ Cấu Trúc Thư Mục Automation Test Chuẩn

Tài liệu này định nghĩa cấu trúc thư mục và file chuẩn mực cho toàn bộ mã nguồn Automation Test sinh ra bởi skill `qa-auto-design`. Bắt buộc tuân thủ khi sinh mã cho bất kỳ dự án nào nhằm đảm bảo tính đồng nhất, tránh tình trạng Agent tự nghĩ ra các cấu trúc file/thư mục tùy tiện.

---

## 1. Cấu Trúc Tổng Thể (The Canonical Layout)

Toàn bộ tài nguyên kiểm thử của một Jira task BẮT BUỘC nằm gọn trong thư mục:
`/project-root/workspace/{issueKey}/test/`

```
workspace/{issueKey}/test/
├── checklist.md                        # Checklist BVA/EP (sinh bởi qa-test-design)
├── {issueKey}.feature                  # Kịch bản BDD Gherkin (sinh bởi qa-test-design)
├── .env                                # Task-level config (kế thừa từ Root/Shared & ghi đè riêng)
├── pytest.ini                          # Cấu hình test runner chuẩn (pythonpath, log_cli, reporting)
├── steps/                              # Toàn bộ mã nguồn thực thi test
│   ├── conftest.py                     # Root fixtures: nạp env phân tầng, auth token, shared fixture
│   ├── test_{feature_name}.py          # File test chính (ánh xạ 1-1 với Gherkin scenario)
│   ├── services/                       # API/WS client classes (hoặc wrapper quanh SDK có sẵn)
│   │   ├── __init__.py
│   │   └── {service_name}_service.py
│   ├── pages/                          # Page Object Model (CHỈ dành cho Web UI)
│   │   ├── __init__.py
│   │   ├── base_page.py
│   │   └── {page_name}_page.py
│   ├── models/                         # DTO / Pydantic v2 schemas (cho API/WS payload validation)
│   │   ├── __init__.py
│   │   └── {model_name}.py
│   └── helpers/                        # Utility & Symbolic Boundary Resolver (tính biên động)
│       ├── __init__.py
│       └── {helper_name}.py
└── result/                             # Kết quả thực thi test (DUY NHẤT 1 FILE MỖI LOẠI)
    ├── junit.xml                       # Kết quả chuẩn JUnit XML (duy nhất 1 file)
    ├── report.html                     # Báo cáo trực quan HTML (duy nhất 1 file)
    ├── test-output.log                 # Chi tiết toàn bộ log thực thi test (duy nhất 1 file)
    ├── report.md                       # Báo cáo tổng kết Markdown kèm ma trận truy vết (duy nhất 1 file)
    └── screenshots/                    # Ảnh chụp màn hình khi test fail (chỉ dùng cho Web UI)
```

---

## 2. Ma Trận File Cho Phép Sinh Theo Task Type

Agent **TUYỆT ĐỐI KHÔNG** sinh ra các thư mục không liên quan đến Task Type đang thực hiện:

| Thư mục / File | `🔌 API` | `⚡ WebSocket` | `🌐 WEB / UI` | `📱 MOBILE` | Ghi chú quan trọng |
|---|:---:|:---:|:---:|:---:|---|
| `checklist.md` | ✅ | ✅ | ✅ | ✅ | Bắt buộc (từ `qa-test-design`) |
| `{issueKey}.feature` | ✅ | ✅ | ✅ | ✅ | Bắt buộc (từ `qa-test-design`) |
| `.env` | ✅ | ✅ | ✅ | ✅ | Nạp tự động từ Root/Sibling/Template |
| `pytest.ini` | ✅ | ✅ | ✅ | ✅ | Cấu hình test runner & pythonpath |
| `steps/conftest.py` | ✅ | ✅ | ✅ | ✅ | Fixtures dùng chung toàn task |
| `steps/test_*.py` | ✅ | ✅ | ✅ | ✅ | File test chính (chứa assert & marks) |
| `steps/services/` | ✅ | ✅ | ❌ | ❌ | **CẤM** sinh trong Web UI/Mobile trừ khi mock API |
| `steps/pages/` | ❌ | ❌ | ✅ | ✅ | **CẤM** sinh trong API/WebSocket |
| `steps/models/` | ✅ | ✅ | ❌ | ❌ | Pydantic v2 schemas validate schema |
| `steps/helpers/` | ✅ | ✅ | ✅ | ✅ | Boundary resolver, data generator |
| `result/` | ✅ | ✅ | ✅ | ✅ | Chứa đúng 4 file output duy nhất |

---

## 3. Quy Định Chi Tiết Từng File & Thư Mục

### 3.1. File Cấu Hình Test Runner (`pytest.ini`)
Bắt buộc có tại `workspace/{issueKey}/test/pytest.ini` để đảm bảo test có thể chạy độc lập ở bất kỳ môi trường nào:

```ini
[pytest]
testpaths = steps
python_files = test_*.py
python_classes = Test*
python_functions = test_*
pythonpath = . steps ../../.. ../../../shared
log_cli = true
log_cli_level = INFO
log_cli_format = %(asctime)s [%(levelname)8s] %(message)s (%(filename)s:%(lineno)s)
log_cli_date_format = %Y-%m-%d %H:%M:%S
markers =
    scenario: Tên scenario BDD Gherkin tương ứng
    jira: Jira Issue Key tương ứng
    asyncio: Đánh dấu test case bất đồng bộ (WebSocket/Async API)
    smoke: Smoke verification test
```

> **Lợi ích:** Đặt `pythonpath` cho phép import trực tiếp SDK dùng chung từ repo root (`../../..`) mà không bị lỗi `ModuleNotFoundError`.

### 3.2. File `steps/conftest.py`
- Là điểm tập trung (Single Entrypoint) cho toàn bộ fixtures của task.
- Chứa logic `load_hierarchical_env()` để tự động nạp kế thừa `.env` từ Root và các task anh em cùng loại.
- Chứa session-scoped fixtures: `base_url`, `api_key`, `api_secret`, `auth_token`, `ws_url`, `browser_context_args`.
- Tích hợp hook `pytest_runtest_makereport` tự động chụp ảnh màn hình khi có test case FAILED (lưu vào `result/screenshots/`).

### 3.3. File `steps/test_{feature_name}.py`
- Tên file bắt buộc bắt đầu bằng `test_` theo snake_case của tên tính năng (ví dụ: `test_order_events.py`, `test_login_dashboard.py`).
- 1-to-1 Mapping: Mỗi `Scenario` hoặc dòng `Examples` trong file `.feature` tương ứng với đúng 1 test method (hoặc 1 param test case).
- Mỗi hàm test BẮT BUỘC gắn:
  ```python
  @pytest.mark.scenario("Tên scenario trong .feature")
  @pytest.mark.jira("{issueKey}")
  def test_example(auth_token):
      """
      Given người dùng có API Key hợp lệ
      When gửi request lấy danh sách lệnh
      Then mã trạng thái trả về là 200
      """
      ...
  ```

### 3.4. Thư mục `steps/services/` (Dành cho API & WebSocket)
- Chứa các class giao tiếp mạng (HTTP Client, WebSocket Client).
- **Quy tắc tái sử dụng:** Nếu trong workspace/repo đã có sẵn SDK hoặc client do dev viết (ví dụ: `openapi-tyk/sdk/python`), Agent **BẮT BUỘC** tái sử dụng bằng cách import hoặc tạo wrapper kế thừa mỏng thay vì tự viết lại toàn bộ giao thức.
- **TUYỆT ĐỐI KHÔNG** chứa assertions (`assert`, `expect`) trong Service class.

### 3.5. Thư mục `steps/pages/` (Dành cho Web UI & Mobile)
- Chứa các class Page Object Model (POM) kế thừa từ `base_page.py`.
- Toàn bộ locators và hành vi tương tác với trang nằm tại đây.
- **TUYỆT ĐỐI KHÔNG** chứa assertions trong Page Object class.

### 3.6. Thư mục `steps/models/` (Dành cho API & WebSocket)
- Định nghĩa các DTO / Data Models bằng Pydantic v2.
- Bắt buộc dùng cú pháp v2: `model_validate()`, `@field_validator(..., mode="after")` + `@classmethod`. Cấm dùng cú pháp v1 (`@validator`).

### 3.7. Thư mục `result/` (Quy Chuẩn Output Duy Nhất)
Khi test chạy xong (thông qua `qa-run-test` hoặc Bước 7 của `qa-auto-design`), thư mục `result/` chỉ chứa duy nhất 1 file mỗi loại:
1. `junit.xml`: File XML báo cáo cho CI/CD.
2. `report.html`: File HTML trực quan kết quả test.
3. `test-output.log`: Chi tiết toàn bộ log chạy test và Request/Response capture.
4. `report.md`: Báo cáo tổng kết chuẩn Markdown kèm ma trận truy vết (End-to-End Traceability).
5. `screenshots/`: Thư mục chứa ảnh chụp lỗi (nếu có).

---

## 4. Các Điều Cấm Kỵ (Anti-Patterns)

1. ❌ **CẤM tự ý tạo thư mục lạ ngoài blueprint:** Không tự tạo các thư mục như `src/`, `tests/`, `test-data/`, `utils/`, `common/` rời rạc bên ngoài `workspace/{issueKey}/test/`.
2. ❌ **CẤM đặt sai vị trí:** Tuyệt đối không sinh file test trực tiếp ngoài thư mục gốc repo hoặc lẫn lộn trong thư mục `spec/`.
3. ❌ **CẤM duplicate file kết quả:** Không sinh ra nhiều file trùng loại trong `result/` (ví dụ `report1.html`, `test_run_123.log`, `result.xml`). Chỉ giữ đúng 1 file duy nhất mỗi loại.
4. ❌ **CẤM sinh thừa file theo Task Type:** Không sinh `pages/` cho API task, không sinh `services/` cho Web UI task đơn thuần.
