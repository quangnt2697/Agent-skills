# Cơ Chế Chia Sẻ Fixture & Tự Động Kế Thừa Cấu Hình (Shared Fixtures & Cascading Env)

Tài liệu này hướng dẫn chi tiết cơ chế chia sẻ fixtures, kế thừa biến môi trường (credentials, URLs, tokens) giữa các task cùng loại và giữa các session làm việc khác nhau, giúp tái sử dụng tối đa mà không bắt người dùng phải cấu hình lại nhiều lần.

---

## 1. Cơ Chế Tự Động Nhận Diện Môi Trường Phân Tầng (Cascading Auto-Discovery)

Khi khởi tạo hoặc sinh mã test cho một task tại `workspace/{issueKey}/test/` ở bất kỳ dự án nào, Agent **BẮT BUỘC** áp dụng quy trình nạp cấu hình phân tầng:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 0: Central Agent-Skills Config (Toàn cục trên máy)     │
│  - agent-skills/.env (Kho lưu toàn bộ credentials chung)    │
│  - Dùng chung cho mọi project trên máy mà không cần nhập lại│
└──────────────────────────────┬──────────────────────────────┘
                               │ (fallback/kết hợp)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: Project Root Config (Dự án hiện tại)               │
│  - /project-root/.env (Cấu hình riêng của dự án nếu có)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (fallback nếu thiếu)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Tier 2: Sibling Task Inheritance (Kế thừa từ Task anh em)  │
│  - Quét workspace/*/test/.env của các task cùng domain     │
│  - Trích xuất: API_KEY, API_SECRET, BASE_URL, WS_URL, TOKENS│
└──────────────────────────────┬──────────────────────────────┘
                               │ (ghi đè bởi task cụ thể)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Tier 3: Task-Local Config                                  │
│  - workspace/{issueKey}/test/.env                           │
│  - Chỉ chứa biến đặc thù hoặc ghi đè riêng của task đó      │
└─────────────────────────────────────────────────────────────┘
```

### 1.1. Chi tiết các Tầng (Tiers)

0. **Tier 0: Central Agent-Skills Config (Repo `agent-skills/.env`):**
   - **Vị trí:** File `.env` tại thư mục gốc của repository `agent-skills` (đã có trong `.gitignore`, không lo lộ secret).
   - **Mục đích:** Lưu trữ tập trung 100% credentials kiểm thử (`API_KEY`, `API_SECRET`, `BASE_URL`, `WS_URL`, `DASHBOARD_URL`, `TRADING_USERNAME`...).
   - **Khi gọi skill ở project khác:** Agent tự động đọc từ repo `agent-skills/.env` để lấy thông số điền vào test mà **không bao giờ phải hỏi lại người dùng**.
   - **Khi chạy test ở project khác:** `conftest.py` tự động phát hiện và nạp từ `agent-skills/.env`.

1. **Tier 1: Project Root Config (`/project-root/.env`):**
   - File `.env` tại thư mục gốc của project đang làm việc (nếu dự án đó có cấu hình môi trường riêng).

2. **Tier 2: Sibling Task Inheritance (Kế thừa từ Task anh em cùng hệ thống):**
   - Quét các thư mục task đã tồn tại: `workspace/*/test/.env`.
   - Nếu là task cùng loại (ví dụ cùng test OpenAPI), tự động kế thừa credentials từ task anh em đã chạy thành công trước đó.

3. **Tier 3: Task-Local Override (`workspace/{issueKey}/test/.env`):**
   - Chỉ tạo hoặc ghi đè khi task đó có yêu cầu kiểm thử tài khoản đặc thù (VIP account riêng, timeout riêng, mock error).

---

## 2. Hàm Nạp Môi Trường Phân Tầng Trong `conftest.py`

Trong file `steps/conftest.py`, sử dụng hàm `load_hierarchical_env()` để tự động nạp cấu hình theo đúng thứ tự ưu tiên:

```python
import os
import glob
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

def load_hierarchical_env():
    """
    Nạp cấu hình môi trường phân tầng:
    0. Central agent-skills/.env (kho credentials tập trung trên máy)
    1. Root .env của project hiện tại (nền tảng)
    2. Sibling task .env cùng domain (kế thừa credentials đã khởi tạo: API_KEY, SECRET,...)
    3. Task-local .env (ưu tiên ghi đè cao nhất)
    """
    current_dir = Path(__file__).resolve().parent  # steps/
    task_test_dir = current_dir.parent             # workspace/{issueKey}/test/
    workspace_dir = task_test_dir.parent.parent    # workspace/
    project_root = workspace_dir.parent            # repo root của project hiện tại

    # 0. Nạp từ Repo agent-skills/.env trung tâm (Lưu tập trung toàn bộ credentials trên máy)
    agent_env_candidates = [
        os.getenv("AGENT_SKILLS_ENV_PATH"),
        os.getenv("AGENT_SKILLS_PATH", "") + "/.env" if os.getenv("AGENT_SKILLS_PATH") else None,
        project_root.parent / "agent-skills" / ".env",
        project_root / ".env" if project_root.name == "agent-skills" else None,
    ]
    for candidate in agent_env_candidates:
        if candidate and Path(candidate).exists():
            load_dotenv(candidate, override=False)
            break

    # 1. Nạp từ Project Root của dự án hiện tại (nếu có cấu hình riêng)
    root_env = project_root / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)

    # 2. Kế thừa từ Sibling Tasks (nếu thiếu API_KEY hoặc API_SECRET)
    if not os.getenv("API_KEY") or not os.getenv("API_SECRET"):
        sibling_envs = glob.glob(str(workspace_dir / "*" / "test" / ".env"))
        for sib in sibling_envs:
            if Path(sib).resolve() != (task_test_dir / ".env").resolve():
                load_dotenv(sib, override=False)
                if os.getenv("API_KEY") and os.getenv("API_SECRET"):
                    break

    # 3. Nạp Task-local .env (Ưu tiên ghi đè cao nhất)
    local_env = task_test_dir / ".env"
    if local_env.exists():
        load_dotenv(local_env, override=True)
    else:
        load_dotenv(find_dotenv(usecwd=True))

# Gọi nạp ngay khi khởi động conftest
load_hierarchical_env()
```
```

---

## 3. Tái Sử Dụng Fixtures & SDK Dùng Chung (Shared SDK / Fixtures)

### 3.1. Thiết lập `pythonpath` trong `pytest.ini`
Để các task có thể import trực tiếp SDK dùng chung mà không phải copy code:
```ini
[pytest]
pythonpath = . steps ../../.. ../../../shared ../../../sdk
```

### 3.2. Ưu tiên Sử Dụng Client/SDK Có Sẵn
Khi viết code kiểm thử cho API/WebSocket:
1. **Kiểm tra SDK có sẵn:**
   - Quét workspace để tìm SDK do dev team cung cấp (ví dụ: `shared/sdk/python`, `services/client/`).
   - Nếu đã có SDK, trong `steps/services/` chỉ cần tạo một wrapper đơn giản kế thừa client đó hoặc import trực tiếp vào `conftest.py` / `test_*.py`.
2. **Không viết lại từ đầu:**
   - Việc tự viết lại client HTTP/WebSocket làm phát sinh lỗi duplicate code và lệch chuẩn giao thức với hệ thống thật.

### 3.3. Cơ Chế Cache Token Tránh Spam Login Giữa Các Session
Để tránh việc mỗi lần chạy test hoặc mỗi session mới lại gọi API đăng nhập lấy token nhiều lần, `conftest.py` hỗ trợ cơ chế lưu cache token cục bộ:

```python
import json
import time
from pathlib import Path

TOKEN_CACHE_FILE = Path.home() / ".cache" / "openapi_test_token_cache.json"

def get_cached_or_fresh_token(login_func, username, password, expiry_seconds=3600):
    """
    Lấy token từ file cache nếu còn hạn, hoặc gọi login_func để lấy token mới
    và lưu lại vào cache dùng chung cho các session khác.
    """
    TOKEN_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    cache_key = f"{username}"
    
    if TOKEN_CACHE_FILE.exists():
        try:
            with open(TOKEN_CACHE_FILE, "r") as f:
                data = json.load(f)
                entry = data.get(cache_key)
                if entry and (time.time() - entry.get("timestamp", 0) < expiry_seconds):
                    return entry.get("token")
        except Exception:
            pass

    # Gọi login mới nếu cache không hợp lệ
    fresh_token = login_func(username, password)
    if fresh_token:
        try:
            data = {}
            if TOKEN_CACHE_FILE.exists():
                with open(TOKEN_CACHE_FILE, "r") as f:
                    data = json.load(f)
            data[cache_key] = {"token": fresh_token, "timestamp": time.time()}
            with open(TOKEN_CACHE_FILE, "w") as f:
                json.dump(data, f)
        except Exception:
            pass

    return fresh_token
```

---

## 4. Tóm Tắt Quy Trình Khi Khởi Tạo Session Mới

1. **Bước 1:** Quét tìm file `.env` ở Root và các task anh em (`workspace/*/test/.env`).
2. **Bước 2:** Khởi tạo `workspace/{issueKey}/test/.env` từ template, tự động điền sẵn các credentials đã tìm thấy.
3. **Bước 3:** Sử dụng `conftest.py` có hàm `load_hierarchical_env()` để bảo đảm mọi fixture đều nhận đúng cấu hình.
4. **Bước 4:** Tận dụng token caching trong `conftest.py` để tiết kiệm thời gian xác thực giữa các lần chạy.

---

## 5. Nạp Test Fixtures Động Từ Test-Data MCP & Điều Hướng Môi Trường

### 5.1. Cơ Chế Điều Hướng Môi Trường Chuẩn Xác (OpenAPI UAT vs Sandbox)
Hệ thống kiểm thử hỗ trợ 2 môi trường độc lập với Database tương ứng:
- **Môi trường OpenAPI UAT:** `BASE_URL` trỏ tới UAT $\rightarrow$ Database `openapi` (Metabase DB ID: `${METABASE_UAT_DB_OPENAPI_ID}`).
- **Môi trường Sandbox:** `BASE_URL` chứa `sandbox` $\rightarrow$ Database `openapi-sandbox` (Metabase DB ID: `${METABASE_UAT_DB_OPENAPI_SANDBOX_ID}`).

Trong `conftest.py`, fixture `target_environment` tự động nhận diện môi trường từ `BASE_URL`:
```python
@pytest.fixture(scope="session")
def target_environment():
    base_url = os.getenv("BASE_URL", "")
    if "sandbox" in base_url.lower() or "sb-openapi" in base_url.lower():
        return {
            "name": "sandbox",
            "db_id": int(os.getenv("METABASE_DB_OPENAPI_SANDBOX_ID", "655")),
            "db_name": "openapi-sandbox",
            "base_url": base_url
        }
    return {
        "name": "openapi",
        "db_id": int(os.getenv("METABASE_DB_OPENAPI_ID", "535")),
        "db_name": "openapi",
        "base_url": base_url
    }
```

### 5.2. Nạp Dữ Liệu Thị Trường Thật Từ `fixtures/market_data.json`
Trước khi thực thi test, skill `qa-auto-design` gọi MCP `test-data` tool `td_export_fixture` để snapshot dữ liệu thị trường thật vào file:
`workspace/{issueKey}/test/fixtures/market_data.json`

Fixture `market_fixture` và `valid_order_symbol` tự động nạp dữ liệu này:
```python
@pytest.fixture(scope="session")
def market_fixture():
    test_dir = Path(__file__).resolve().parent.parent
    fixture_file = test_dir / "fixtures" / "market_data.json"
    if fixture_file.exists():
        with open(fixture_file, "r", encoding="utf-8") as f:
            payload = json.load(f)
            return payload.get("data", payload)
    return {}

@pytest.fixture(scope="session")
def valid_order_symbol(market_fixture):
    securities = market_fixture.get("securities", [])
    if securities:
        return securities[0] # Chứa symbol, ceiling_price, floor_price, reference_price
    return {"symbol": "FPT", "reference_price": 72.2, "ceiling_price": 77.2, "floor_price": 67.2}
```
Nhờ cơ chế này, mã test không bao giờ phải hardcode giá hoặc mã cổ phiếu, loại bỏ 100% rủi ro dữ liệu giả.

### 5.3. Fixture Quản Trị ORS Admin Giả Lập Khớp Lệnh (`ors_admin_client`)
Để kiểm thử các trạng thái `PartiallyFilled` và `Filled` trên UAT mà không phụ thuộc vào matching engine của sàn, `conftest.py` cung cấp fixture `ors_admin_client`:

```python
@pytest.fixture(scope="session")
def ors_admin_client(test_log_collector):
    """
    Tự động kết nối tới ORS Admin UAT để bắn Execution Reports:
    - ORS_ADMIN_URL: Đọc từ .env (Login lấy JWT)
    - ORS_FO_URL: Đọc từ .env (Gateway Cơ sở và Phái sinh)
    """
    admin_url = os.getenv("ORS_ADMIN_URL")
    fo_url = os.getenv("ORS_FO_URL")
    username = os.getenv("ORS_ADMIN_USERNAME")
    password = os.getenv("ORS_ADMIN_PASSWORD")

    if not all([admin_url, fo_url, username, password]):
        pytest.skip("Chưa cấu hình đầy đủ ORS Admin credentials trong .env")

    client = OrsAdminClient(admin_url=admin_url, fo_url=fo_url, collector=test_log_collector)
    client.login(username=username, password=password)
    return client
```

