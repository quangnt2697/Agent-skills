# ==========================================================
# Pytest conftest.py mẫu — Root fixtures dùng chung toàn dự án
# ==========================================================
# Cung cấp đầy đủ fixtures cho:
# 1. CLI Options & Environment Variables (.env) với Cascade Fallback
# 2. Trading REST API & OpenAPI Dashboard (Auth tokens, Auto Login)
# 3. WebSocket Real-time Testing (URL, Admin URL, API Key/Secret, Encoding)
# 4. Trading Platform Web (Credentials, Investor ID, Auth Token)
# 5. Web Testing (Desktop Chrome / Firefox / WebKit 1920x1080)
# 6. Mobile Web Emulation (Pixel 7 / iPhone 14)
# 7. Native Mobile Testing (Appium Android/iOS Driver)
# 8. Hook tự động chụp ảnh Screenshot khi Test Case FAILED
# ==========================================================

import os
import json
import time
import uuid
import urllib.request
from urllib.parse import urlparse
import glob
from pathlib import Path
import pytest
from dotenv import load_dotenv, find_dotenv

# ==========================================================
# CƠ CHẾ NẠP MÔI TRƯỜNG PHÂN TẦNG (Cascading Env Load)
# Tự động kế thừa từ:
# Tier 0: Repo agent-skills/.env (Kho credentials trung tâm toàn máy)
# Tier 1: Project Root .env (Cấu hình riêng của dự án hiện tại)
# Tier 2: Sibling task .env cùng domain (kế thừa nếu thiếu)
# Tier 3: Task-local .env (ưu tiên ghi đè cao nhất)
# ==========================================================
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
        # Tìm agent-skills/ tại các vị trí phổ biến (không hardcode path máy cụ thể)
        next(
            (p for p in [
                project_root.parent / "agent-skills" / ".env",
                project_root.parent.parent / "agent-skills" / ".env",
            ] if Path(p).exists()), None
        ),
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
        # Fallback tìm ngược lên thư mục cha
        load_dotenv(find_dotenv(usecwd=True))

load_hierarchical_env()


# ==========================================================
# 0. DYNAMIC ENVIRONMENT CONFIG & SYMBOLIC BOUNDARIES (EnvConfig)
# ==========================================================
# Quản lý tập trung biến môi trường từ .env và tự động ánh xạ
# các vị trí biên BVA tượng trưng (TAI_HAN_MUC, VUOT_HAN_MUC)
# từ kịch bản Gherkin sang giá trị số nguyên thực tế lúc runtime.
# Giúp test suite chỉ cần sửa ở 1 chỗ duy nhất (.env).
# ==========================================================

class EnvConfig:
    """Quản lý cấu hình môi trường tập trung và ánh xạ biên động từ .env."""

    @staticmethod
    def get_max_connector(tier: str) -> int:
        """Hạn mức kết nối socket đồng thời theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_MAX_CONNECTOR"
        defaults = {"normal": 10, "vip": 25, "ultimate": 50}
        return int(os.getenv(key, defaults.get(tier_normalized, 10)))

    @staticmethod
    def get_max_stream(tier: str) -> int:
        """Hạn mức số stream/mã chứng khoán theo dõi theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_MAX_STREAM"
        defaults = {"normal": 200, "vip": 400, "ultimate": 400}
        return int(os.getenv(key, defaults.get(tier_normalized, 200)))

    @staticmethod
    def get_rate_limit(tier: str) -> int:
        """Ngưỡng tần suất gửi tin nhắn/yêu cầu (msg/s) theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_RATE_LIMIT"
        defaults = {"normal": 10, "vip": 50, "ultimate": 200}
        return int(os.getenv(key, defaults.get(tier_normalized, 10)))

    @classmethod
    def resolve_boundary(cls, tier: str, metric_type: str, boundary_pos: str) -> int:
        """
        Ánh xạ vị trí biên tượng trưng từ Gherkin sang giá trị số nguyên thực tế:
        - TAI_HAN_MUC / AT_LIMIT: đúng bằng limit
        - VUOT_HAN_MUC / OVER_LIMIT: limit + 1
        - DUOI_HAN_MUC / BELOW_LIMIT: max(1, limit - 1)
        - TRONG_NGUONG / WITHIN_LIMIT: đúng bằng ngưỡng (limit)
        - VUOT_NGUONG / BEYOND_LIMIT: vượt ngưỡng (limit + 5 hoặc limit * 1.2)
        """
        m_type = metric_type.strip().upper()
        if m_type in ("CONNECTOR", "SOCKET", "CONNECTION"):
            limit = cls.get_max_connector(tier)
        elif m_type in ("STREAM", "TOPIC", "SYMBOL"):
            limit = cls.get_max_stream(tier)
        elif m_type in ("RATE_LIMIT", "MESSAGE", "TAN_SUAT"):
            limit = cls.get_rate_limit(tier)
        else:
            raise ValueError(f"Loại hạn mức không hợp lệ: {metric_type}")

        b_pos = boundary_pos.strip().upper()
        if b_pos in ("TAI_HAN_MUC", "AT_LIMIT", "LIMIT"):
            return limit
        elif b_pos in ("VUOT_HAN_MUC", "OVER_LIMIT"):
            return limit + 1
        elif b_pos in ("DUOI_HAN_MUC", "BELOW_LIMIT"):
            return max(1, limit - 1)
        elif b_pos in ("TRONG_NGUONG", "WITHIN_LIMIT"):
            return limit
        elif b_pos in ("VUOT_NGUONG", "BEYOND_LIMIT"):
            return limit + max(1, int(limit * 0.2))
        else:
            # Fallback nếu truyền trực tiếp số nguyên
            try:
                return int(boundary_pos)
            except ValueError:
                raise ValueError(f"Không thể giải quyết vị trí biên: '{boundary_pos}'")

# Cho phép truyền ghi đè qua CLI (ví dụ: pytest --ws-url=wss://...)
# Mặc định ưu tiên đọc từ biến môi trường trong .env
# ==========================================================

def pytest_addoption(parser):
    # 1. Trading & REST API
    parser.addoption(
        "--base-url",
        action="store",
        default=os.getenv("BASE_URL", "https://openapi-uat.dnse.com.vn"),
        help="Base URL của OpenAPI Trading REST"
    )
    parser.addoption(
        "--api-key",
        action="store",
        default=os.getenv("API_KEY", "eyJvcmciOiJkbnNlIiwiaWQiOiI3YTRiN2FkNjNkZTQ0YTRiOTEyMjA5NDMwNjA5MDQ5YiIsImgiOiJtdXJtdXIxMjgifQ=="),
        help="API Key cho OpenAPI / WebSocket"
    )
    parser.addoption(
        "--api-secret",
        action="store",
        default=os.getenv("API_SECRET", "dEZI939ujODBZ5k_KnlD_fDUasGhsAfVFeED_RuXM7m-73g6BNgTk1O1p8IdKMAZrt9QM836H1BCvbcnzYUTdQ"),
        help="API Secret cho OpenAPI / WebSocket"
    )
    parser.addoption(
        "--user-b-api-key",
        action="store",
        default=os.getenv("NORMAL_USER_API_KEY", os.getenv("VIP_USER_API_TOKEN", "")),
        help="API Key cho User B (dùng trong test Data Isolation hoặc Lệnh Đối Ứng UAT)"
    )
    parser.addoption(
        "--user-b-api-secret",
        action="store",
        default=os.getenv("NORMAL_USER_API_SECRET", os.getenv("VIP_USER_API_SECRET", "")),
        help="API Secret cho User B (dùng trong test Data Isolation hoặc Lệnh Đối Ứng UAT)"
    )

    # 2. WebSocket & Admin
    parser.addoption(
        "--ws-url",
        action="store",
        default=os.getenv("WS_URL", "wss://ws-openapi-uat.dnse.com.vn"),
        help="WebSocket URL của hệ thống giao dịch/datafeed"
    )
    parser.addoption(
        "--ws-admin-url",
        action="store",
        default=os.getenv("WS_ADMIN_URL", "http://localhost:8080"),
        help="WebSocket Admin API URL (/monitor_current, v.v.)"
    )
    parser.addoption(
        "--ws-encoding",
        action="store",
        default=os.getenv("WS_ENCODING", "msgpack"),
        help="Định dạng mã hóa tin nhắn WebSocket (msgpack | json)"
    )

    # 3. OpenAPI Dashboard & BFF
    parser.addoption(
        "--dashboard-url",
        action="store",
        default=os.getenv("DASHBOARD_URL", "https://dashboard-openapi-uat.dnse.com.vn/#/dashboard/overview"),
        help="Dashboard BFF URL"
    )
    parser.addoption(
        "--dashboard-username",
        action="store",
        default=os.getenv("DASHBOARD_USERNAME", "dnse.admin@dnse.com.vn"),
        help="Tài khoản đăng nhập Dashboard"
    )
    parser.addoption(
        "--dashboard-password",
        action="store",
        default=os.getenv("DASHBOARD_PASSWORD", "@dmin$1234"),
        help="Mật khẩu đăng nhập Dashboard"
    )

    # 4. Trading Platform Web
    parser.addoption(
        "--web-base-url",
        action="store",
        default=os.getenv("WEB_BASE_URL", "https://dev.trading-test.dnse.com.vn/"),
        help="Base URL của Web Trading"
    )
    parser.addoption(
        "--trading-username",
        action="store",
        default=os.getenv("TRADING_USERNAME", "064CJJH8UF"),
        help="Tài khoản đăng nhập Trading"
    )
    parser.addoption(
        "--trading-password",
        action="store",
        default=os.getenv("TRADING_PASSWORD", "ENCAP@1234"),
        help="Mật khẩu đăng nhập Trading"
    )

    # 5. ORS Admin UAT (Order Execution Report Simulator)
    parser.addoption(
        "--ors-admin-url",
        action="store",
        default=os.getenv("ORS_ADMIN_URL", "https://api-uat.dnse.com.vn"),
        help="Base URL của ORS Admin Service (Login lấy JWT)"
    )
    parser.addoption(
        "--ors-fo-url",
        action="store",
        default=os.getenv("ORS_FO_URL", "https://api-fo-uat.dnse.com.vn"),
        help="Base URL của ORS FO (Bắn Execution Report, tra cứu orders)"
    )
    parser.addoption(
        "--ors-admin-username",
        action="store",
        default=os.getenv("ORS_ADMIN_USERNAME", "dnse.admin@dnse.com.vn"),
        help="Username đăng nhập ORS Admin"
    )
    parser.addoption(
        "--ors-admin-password",
        action="store",
        default=os.getenv("ORS_ADMIN_PASSWORD", "@dmin$1234"),
        help="Mật khẩu đăng nhập ORS Admin"
    )


# ==========================================================
# 2. SESSION FIXTURES CHO CẤU HÌNH & CREDENTIALS
# ==========================================================


@pytest.fixture(scope="session")
def base_url(request):
    return request.config.getoption("--base-url")


@pytest.fixture(scope="session")
def api_key(request):
    return request.config.getoption("--api-key")


@pytest.fixture(scope="session")
def api_secret(request):
    return request.config.getoption("--api-secret")


@pytest.fixture(scope="session")
def user_b_api_key(request):
    """API Key cho User B — dùng trong test Lệnh Đối Ứng Khớp Lệnh UAT & Data Isolation."""
    return request.config.getoption("--user-b-api-key")


@pytest.fixture(scope="session")
def user_b_api_secret(request):
    """API Secret cho User B — dùng trong test Lệnh Đối Ứng Khớp Lệnh UAT & Data Isolation."""
    return request.config.getoption("--user-b-api-secret")


@pytest.fixture(scope="session")
def ws_url(request):
    return request.config.getoption("--ws-url")


@pytest.fixture(scope="session")
def ws_admin_url(request):
    return request.config.getoption("--ws-admin-url")


@pytest.fixture(scope="session")
def ws_encoding(request):
    return request.config.getoption("--ws-encoding")


@pytest.fixture(scope="session")
def dashboard_url(request):
    return request.config.getoption("--dashboard-url")


@pytest.fixture(scope="session")
def dashboard_username(request):
    return request.config.getoption("--dashboard-username")


@pytest.fixture(scope="session")
def dashboard_password(request):
    return request.config.getoption("--dashboard-password")


@pytest.fixture(scope="session")
def web_base_url(request):
    return request.config.getoption("--web-base-url")


@pytest.fixture(scope="session")
def trading_username(request):
    return request.config.getoption("--trading-username")


@pytest.fixture(scope="session")
def trading_password(request):
    return request.config.getoption("--trading-password")


@pytest.fixture(scope="session")
def trading_investor_id():
    """Mã Investor ID của tài khoản trading."""
    return os.getenv("TRADING_INVESTOR_ID", "")


@pytest.fixture(scope="session")
def web_api_token():
    """Token chứng thực Web Trading đọc từ .env."""
    return os.getenv("WEB_API_TOKEN", "")


@pytest.fixture(scope="session")
def auth_token():
    """Auth token Bearer đọc từ .env. Lấy 1 lần, tái sử dụng toàn session."""
    token = os.getenv("API_TOKEN")
    return token


@pytest.fixture(scope="session")
def auth_token_user_b():
    """Token cho user B — dùng trong test Data Isolation (WebSocket / API)."""
    token = os.getenv("API_TOKEN_USER_B")
    return token


@pytest.fixture(scope="session")
def ors_admin_url(request):
    return request.config.getoption("--ors-admin-url")


@pytest.fixture(scope="session")
def ors_fo_url(request):
    return request.config.getoption("--ors-fo-url")


@pytest.fixture(scope="session")
def ors_admin_username(request):
    return request.config.getoption("--ors-admin-username")


@pytest.fixture(scope="session")
def ors_admin_password(request):
    return request.config.getoption("--ors-admin-password")



@pytest.fixture(scope="session")
def dashboard_auth_token(dashboard_url, dashboard_username, dashboard_password):
    """
    Đăng nhập Dashboard OpenAPI tự động để lấy Bearer token.
    Có tích hợp bộ nhớ cache cục bộ (~/.cache/dashboard_test_token_cache.json)
    để tái sử dụng giữa các session và lần chạy khác nhau trong ngày, tránh spam API Login.
    """
    cache_file = Path.home() / ".cache" / "dashboard_test_token_cache.json"
    cache_key = f"{dashboard_username}@{dashboard_url}"

    # 1. Đọc từ Cache nếu còn hạn (< 45 phút)
    if cache_file.exists():
        try:
            with open(cache_file, "r") as f:
                data = json.load(f)
                entry = data.get(cache_key)
                if entry and (time.time() - entry.get("timestamp", 0) < 2700):
                    return entry.get("token")
        except Exception:
            pass

    # 2. Gọi API Login nếu cache không tồn tại hoặc hết hạn
    parsed = urlparse(dashboard_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    login_url = f"{origin}/api/v5/login"

    payload = json.dumps({
        "username": dashboard_username,
        "password": dashboard_password,
    }).encode("utf-8")

    req = urllib.request.Request(
        login_url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("token")
            # Lưu lại vào cache
            if token:
                try:
                    cache_file.parent.mkdir(parents=True, exist_ok=True)
                    cache_data = {}
                    if cache_file.exists():
                        with open(cache_file, "r") as f:
                            cache_data = json.load(f)
                    cache_data[cache_key] = {"token": token, "timestamp": time.time()}
                    with open(cache_file, "w") as f:
                        json.dump(cache_data, f)
                except Exception:
                    pass
            return token
    except Exception as e:
        print(f"\n⚠️ Không thể lấy token Dashboard tại {login_url}: {e}")
        return None


# ==========================================================
# 3. DYNAMIC TEST DATA & ENVIRONMENT FIXTURES (TEST-DATA MCP)
# ==========================================================

@pytest.fixture
def unique_id():
    """Sinh ID unique cho mỗi test method. Format: auto_[timestamp]_[random]."""
    return f"auto_{int(time.time())}_{uuid.uuid4().hex[:6]}"


@pytest.fixture(scope="session")
def target_environment():
    """
    Tự động nhận diện môi trường từ BASE_URL và điều hướng đúng Database:
    - Nếu BASE_URL chứa 'sandbox' hoặc 'sb-openapi' hoặc 'sb-openapi-uat': trỏ về openapi-sandbox (DB ID: 655)
    - Mặc định hoặc chứa 'openapi-uat' / 'openapi': trỏ về openapi (DB ID: 535)
    """
    base_url = os.getenv("BASE_URL", "")
    raw = base_url.lower()
    if "sandbox" in raw or "sb-openapi" in raw or "sb-openapi-uat" in raw:
        return {
            "name": "sandbox",
            "base_url": base_url,
            "db_id": int(os.getenv("METABASE_DB_OPENAPI_SANDBOX_ID", "655")),
            "db_name": "openapi-sandbox",
        }
    return {
        "name": "openapi",
        "base_url": base_url,
        "db_id": int(os.getenv("METABASE_DB_OPENAPI_ID", "535")),
        "db_name": "openapi",
    }


@pytest.fixture(scope="session")
def market_fixture():
    """
    Nạp dữ liệu thị trường thật được export bởi test-data-mcp
    tại workspace/{issueKey}/test/fixtures/market_data.json.
    """
    test_dir = Path(__file__).resolve().parent.parent
    fixture_file = test_dir / "fixtures" / "market_data.json"
    if fixture_file.exists():
        try:
            with open(fixture_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
                return payload.get("data", payload)
        except Exception as e:
            print(f"⚠️ Lỗi đọc fixture {fixture_file}: {e}")
    return {}


@pytest.fixture(scope="session")
def valid_order_symbol(market_fixture):
    """
    Lấy 1 mã chứng khoán hợp lệ kèm giá trần/sàn/tham chiếu thật từ fixture.
    Fallback an toàn nếu chưa xuất file fixture.
    """
    securities = market_fixture.get("securities", [])
    if securities and len(securities) > 0:
        sec = securities[0]
        ref = sec.get("reference_price") or 10000
        ceil = sec.get("ceiling_price") or int(ref * 1.07)
        floor = sec.get("floor_price") or int(ref * 0.93)
        return {
            "symbol": sec.get("symbol", "FPT"),
            "market_id": sec.get("market_id", 6),
            "board_id": sec.get("board_id", 2),
            "reference_price": ref,
            "ceiling_price": ceil,
            "floor_price": floor,
            "tick_size": 100 if ref >= 50000 else (50 if ref >= 10000 else 10),
        }
    return {
        "symbol": "FPT",
        "market_id": 6,
        "board_id": 2,
        "reference_price": 72.2,
        "ceiling_price": 77.2,
        "floor_price": 67.2,
        "tick_size": 0.1,
    }


@pytest.fixture(scope="session")
def order_book_fixture(market_fixture):
    """Lấy dữ liệu sổ lệnh (toàn bộ bước giá bid/ask) từ fixture nếu có."""
    return market_fixture.get("order_book", {})


# ==========================================================
# 4. WEB FIXTURES (Desktop 1920x1080)
# ==========================================================

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Override viewport mặc định của Playwright thành chuẩn Full HD 1920x1080."""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
    }


# ==========================================================
# 5. MOBILE EMULATION FIXTURES (Playwright Mobile)
# ==========================================================

@pytest.fixture
def mobile_context(browser):
    """
    Context giả lập thiết bị di động (Pixel 7).
    Tự động bật touch events và viewport di động.
    """
    from playwright.sync_api import devices
    pixel_7 = devices["Pixel 7"]
    context = browser.new_context(**pixel_7, locale="vi-VN")
    yield context
    context.close()


@pytest.fixture
def mobile_page(mobile_context):
    """Page object chạy trên thiết bị di động giả lập."""
    page = mobile_context.new_page()
    yield page
    page.close()


# ==========================================================
# 6. NATIVE MOBILE FIXTURES (Appium Driver)
# ==========================================================

@pytest.fixture(scope="function")
def appium_driver():
    """
    Khởi tạo Appium Driver cho Native App Testing.
    Đọc cấu hình server và package từ biến môi trường.
    """
    appium_server_url = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")
    app_package = os.getenv("APP_PACKAGE", "com.dnse.trading")
    app_activity = os.getenv("APP_ACTIVITY", ".MainActivity")

    capabilities = {
        "platformName": "Android",
        "automationName": "UiAutomator2",
        "appPackage": app_package,
        "appActivity": app_activity,
        "noReset": True,
        "autoGrantPermissions": True,
    }

    try:
        from appium import webdriver
        from appium.options.android import UiAutomator2Options
        options = UiAutomator2Options().load_capabilities(capabilities)
        driver = webdriver.Remote(appium_server_url, options=options)
    except Exception as e:
        pytest.skip(f"Không thể kết nối đến Appium Server tại {appium_server_url}: {e}")

    yield driver

    try:
        driver.quit()
    except Exception:
        pass


# ==========================================================
# 7. LOGGING INTERCEPTOR & AUTO LOGGING FOR ALL TESTCASES (PASSED & FAILED)
# ==========================================================

class TestLogCollector:
    """
    Thu thập toàn bộ Request Payload và Response Body của từng testcase (REST & WebSocket).
    Hoạt động độc lập trên từng test method để ghi lại bằng chứng kiểm thử 100% trung thực.
    """
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.http_records = []
        self.ws_records = []

    def record_http(self, method: str, url: str, headers: dict, request_body: any,
                    status_code: int, response_time_ms: float, response_headers: dict, response_body: any):
        # Mask credentials trong headers
        masked_headers = {}
        for k, v in (headers or {}).items():
            if k.lower() in ("authorization", "x-api-key", "api-key", "api-secret"):
                masked_headers[k] = "***masked***"
            else:
                masked_headers[k] = v

        self.http_records.append({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "method": method.upper(),
            "url": url,
            "headers": masked_headers,
            "request_body": request_body,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "response_headers": dict(response_headers or {}),
            "response_body": response_body,
        })

    def record_ws(self, event_type: str, url: str = None, channel: str = None,
                  payload: any = None, latency_ms: float = 0.0):
        self.ws_records.append({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": event_type,  # CONNECT, SUBSCRIBE, SEND, RECEIVE_EVENT, CLOSE
            "url": url,
            "channel": channel,
            "payload": payload,
            "latency_ms": latency_ms,
        })


@pytest.fixture(autouse=True)
def test_log_collector(request):
    """Fixture tự động cấp TestLogCollector cho từng testcase."""
    collector = TestLogCollector(request.node.name)
    request.node._log_collector = collector
    yield collector


class LoggingSession:
    """
    Wrapper HTTP Session tích hợp Logging Interceptor.
    Tự động ghi nhận Request Payload & Response Body vào TestLogCollector.
    """
    def __init__(self, collector: TestLogCollector = None, base_headers: dict = None):
        import requests
        self._session = requests.Session()
        if base_headers:
            self._session.headers.update(base_headers)
        self.collector = collector

    def set_collector(self, collector: TestLogCollector):
        self.collector = collector

    def request(self, method: str, url: str, **kwargs):
        start = time.perf_counter()
        req_body = kwargs.get("json") or kwargs.get("data")
        resp = self._session.request(method, url, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        try:
            resp_body = resp.json()
        except Exception:
            resp_body = resp.text

        if self.collector:
            self.collector.record_http(
                method=method,
                url=url,
                headers=dict(self._session.headers),
                request_body=req_body,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp_body,
            )
        return resp

    def get(self, url, **kwargs): return self.request("GET", url, **kwargs)
    def post(self, url, **kwargs): return self.request("POST", url, **kwargs)
    def put(self, url, **kwargs): return self.request("PUT", url, **kwargs)
    def delete(self, url, **kwargs): return self.request("DELETE", url, **kwargs)


@pytest.fixture
def api_session(auth_token, test_log_collector):
    """Fixture cung cấp LoggingSession có sẵn Auth token và kết nối test_log_collector."""
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    session = LoggingSession(collector=test_log_collector, base_headers=headers)
    return session


@pytest.fixture
def user_b_api_session(user_b_api_key, test_log_collector):
    """Fixture cung cấp LoggingSession cho User B (kiểm thử đối ứng 2 tài khoản trên UAT)."""
    headers = {"Content-Type": "application/json"}
    if user_b_api_key:
        headers["Authorization"] = f"Bearer {user_b_api_key}"
    session = LoggingSession(collector=test_log_collector, base_headers=headers)
    return session


# ==========================================================
# 7.1. ORS ADMIN CLIENT & EXECUTION REPORT INJECTION FIXTURE
# ==========================================================

class OrsAdminClient:
    """
    Client gọi API ORS Admin UAT để giả lập các sự kiện khớp lệnh (Execution Reports)
    từ Sở Giao dịch về Core ORS cho cả CƠ SỞ (/ors) và PHÁI SINH (/ors-derivative).
    Tự động ghi nhận interaction vào TestLogCollector.
    """
    def __init__(self, admin_url: str = "https://api-uat.dnse.com.vn", fo_url: str = "https://api-fo-uat.dnse.com.vn", collector=None):
        import requests
        self._admin_url = admin_url.rstrip("/")
        self._fo_url = fo_url.rstrip("/")
        self._session = requests.Session()
        self._token = None
        self._collector = collector

    def _resolve_prefix(self, is_derivative: bool = False, symbol: str = None) -> str:
        """
        Xác định prefix endpoint theo loại chứng khoán:
        - Phái sinh: /ors-derivative (khi is_derivative=True hoặc mã phái sinh: VN30F..., GB05..., 41I1G9000...)
        - Cơ sở: /ors (mặc định)
        """
        if is_derivative:
            return "/ors-derivative"
        if symbol:
            sym_upper = symbol.strip().upper()
            if (
                sym_upper.startswith(("VN30F", "GB05", "GB10"))
                or len(sym_upper) >= 8  # KRX derivative code format e.g. 41I1G9000
                or (len(sym_upper) > 6 and any(c.isdigit() for c in sym_upper))
            ):
                return "/ors-derivative"
        return "/ors"

    def login(self, username: str = "dnse.admin@dnse.com.vn", password: str = "@dmin$1234") -> str:
        """Đăng nhập lấy Bearer token của ORS Admin."""
        resp = self._session.post(
            f"{self._admin_url}/admin-service/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code in (200, 201), f"ORS Admin login thất bại: {resp.text}"
        data = resp.json()
        self._token = data.get("token") or data.get("accessToken") or data.get("data", {}).get("token") or resp.text.strip('"')
        self._session.headers.update({"Authorization": f"Bearer {self._token}"})
        return self._token

    def get_orders(self, start: int = 0, end: int = 100, is_derivative: bool = False, symbol: str = None) -> list:
        """
        Tra cứu danh sách orders trên ORS:
        - Cơ sở: GET /ors/orders?_start=0&_end=100
        - Phái sinh: GET /ors-derivative/orders?_start=0&_end=100
        """
        if not self._token:
            self.login()
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        url = f"{self._fo_url}{prefix}/orders?_start={start}&_end={end}"
        start_time = time.perf_counter()
        resp = self._session.get(url)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="GET",
                url=url,
                headers=dict(self._session.headers),
                request_body=None,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text[:500],
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            return data if isinstance(data, list) else (data.get("data") or data.get("orders") or [])
        return []

    def get_order_detail(self, account_no: str, order_id: str | int, is_derivative: bool = False, symbol: str = None) -> dict:
        """
        Xem chi tiết lệnh:
        - Cơ sở: GET /ors/accounts/{accountNo}/orders/{orderId}
        - Phái sinh: GET /ors-derivative/accounts/{accountNo}/orders/{orderId}
        """
        if not self._token:
            self.login()
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        order_id_str = str(order_id)
        url = f"{self._fo_url}{prefix}/accounts/{account_no}/orders/{order_id_str}"
        start_time = time.perf_counter()
        resp = self._session.get(url)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="GET",
                url=url,
                headers=dict(self._session.headers),
                request_body=None,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text[:500],
            )
        return resp.json() if resp.status_code in (200, 201) else {"status_code": resp.status_code, "text": resp.text}

    def find_order(self, client_ref: str = None, symbol: str = None, account_no: str = None, is_derivative: bool = False) -> dict:
        """
        Tìm kiếm order trên ORS để lấy chính xác order_id (chuỗi ký tự hoặc số) và accountNo.
        Tự động chọn sổ lệnh Cơ sở hoặc Phái sinh theo cờ is_derivative hoặc mã symbol.
        """
        orders = self.get_orders(start=0, end=50, is_derivative=is_derivative, symbol=symbol)
        for o in orders:
            if client_ref and str(o.get("clOrdId")) == str(client_ref):
                return o
        for o in orders:
            if symbol and o.get("symbol") == symbol:
                if not account_no or str(o.get("accountNo")) == str(account_no):
                    return o
        return orders[0] if orders else {}

    def inject_execution_report(
        self,
        account_no: str,
        order_id: str | int,
        symbol: str,
        last_quantity: int,
        last_price: float,
        is_full_fill: bool = False,
        cl_ord_id: str = None,
        is_derivative: bool = False,
    ) -> dict:
        """
        Bắn Execution Report vào ORS để chuyển trạng thái lệnh sang PartiallyFilled hoặc Filled.
        - Tự động điều hướng:
          + Cơ sở: POST /ors/accounts/{accountNo}/orders/{orderId}/reports
          + Phái sinh: POST /ors-derivative/accounts/{accountNo}/orders/{orderId}/reports
        - order_id: có thể là chuỗi ký tự (string) hoặc số nguyên (int).
        - is_full_fill=False (lastQuantity < orderQuantity) -> PartiallyFilled
        - is_full_fill=True (lastQuantity == orderQuantity) -> Filled
        """
        if not self._token:
            self.login()

        order_status = "Filled" if is_full_fill else "PartiallyFilled"
        order_id_str = str(order_id)
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        payload = {
            "clOrdId": str(cl_ord_id or order_id),
            "id": order_id,  # Có thể là chuỗi ký tự (str) hoặc số (int)
            "symbol": symbol,
            "orderStatus": order_status,
            "lastQuantity": last_quantity,
            "lastPrice": last_price,
            "fillQuantity": "",
            "avgPrice": "",
            "execType": "F",
            "execId": "",
        }
        url = f"{self._fo_url}{prefix}/accounts/{account_no}/orders/{order_id_str}/reports"
        start_time = time.perf_counter()
        resp = self._session.post(url, json=payload)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="POST",
                url=url,
                headers=dict(self._session.headers),
                request_body=payload,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text,
            )
        return resp.json() if resp.text and resp.status_code in (200, 201) else {"status_code": resp.status_code, "text": resp.text}




@pytest.fixture(scope="session")
def ors_admin_client(ors_admin_url, ors_fo_url, ors_admin_username, ors_admin_password, test_log_collector):
    """Fixture khởi tạo và login ORS Admin Client (tự động kế thừa từ .env)."""
    client = OrsAdminClient(admin_url=ors_admin_url, fo_url=ors_fo_url, collector=test_log_collector)
    client.login(username=ors_admin_username, password=ors_admin_password)
    return client



# ==========================================================
# 8. PYTEST HOOK: FULL LOGGING (PASSED & FAILED) & SCREENSHOT
# ==========================================================

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Pytest hook thực thi sau mỗi testcase:
    1. Ghi toàn bộ Payload & Response chi tiết của TẤT CẢ các test case (cả PASSED và FAILED) vào test-output.log.
    2. Chụp ảnh màn hình khi test case bị FAILED (cho Web UI và Mobile App).
    """
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        # Xác định thư mục output
        result_dir = os.path.join(os.getcwd(), "test", "result")
        os.makedirs(result_dir, exist_ok=True)
        log_file = os.path.join(result_dir, "test-output.log")

        status_text = "PASSED" if report.passed else ("FAILED" if report.failed else "SKIPPED")
        duration = getattr(call, "duration", 0.0)

        # 1. GHI LOG CHI TIẾT REQUEST & RESPONSE CHO TẤT CẢ TEST CASES (PASSED & FAILED)
        collector = getattr(item, "_log_collector", None)
        log_lines = [
            f"\n{'='*80}",
            f"[TESTCASE]: {item.name} | [STATUS]: {status_text} | [DURATION]: {duration:.2f}s",
            f"{'-'*80}",
        ]

        if collector and (collector.http_records or collector.ws_records):
            # Log REST HTTP interactions
            for idx, r in enumerate(collector.http_records, 1):
                log_lines.append(f"  [HTTP #{idx}] {r['timestamp']} {r['method']} {r['url']}")
                log_lines.append(f"  Request Headers: {json.dumps(r['headers'], ensure_ascii=False)}")
                if r['request_body'] is not None:
                    log_lines.append(f"  Request Payload: {json.dumps(r['request_body'], indent=2, ensure_ascii=False)}")
                log_lines.append(f"  Response Status: {r['status_code']} | Latency: {r['response_time_ms']:.1f}ms")
                log_lines.append(f"  Response Body: {json.dumps(r['response_body'], indent=2, ensure_ascii=False) if isinstance(r['response_body'], (dict, list)) else r['response_body']}")
                log_lines.append(f"  {'-'*40}")

            # Log WebSocket interactions
            for idx, w in enumerate(collector.ws_records, 1):
                log_lines.append(f"  [WS #{idx}] {w['timestamp']} Event: {w['event_type']} | Channel: {w.get('channel')} | URL: {w.get('url')}")
                if w.get('payload') is not None:
                    log_lines.append(f"  Payload: {json.dumps(w['payload'], indent=2, ensure_ascii=False) if isinstance(w['payload'], (dict, list)) else w['payload']}")
                log_lines.append(f"  {'-'*40}")
        else:
            log_lines.append("  (Không có HTTP/WS interaction được ghi nhận qua LoggingSession)")

        if report.failed:
            log_lines.append(f"  [FAILURE REASON]: {report.longreprtext if hasattr(report, 'longreprtext') else str(report.longrepr)}")

        log_lines.append(f"{'='*80}\n")

        # Ghi vào file test-output.log
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write("\n".join(log_lines))
        except Exception as e:
            print(f"⚠️ Lỗi ghi file test-output.log: {e}")

        # 2. CHỤP ẢNH MÀN HÌNH NẾU LÀ UI TEST VÀ TESTCASE BỊ FAILED
        if report.failed:
            screenshots_dir = os.path.join(result_dir, "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)
            timestamp = int(time.time())
            screenshot_path = os.path.join(screenshots_dir, f"fail_{item.name}_{timestamp}.png")

            # Playwright Page fixture
            page = item.funcargs.get("page") or item.funcargs.get("mobile_page")
            if page and hasattr(page, "screenshot"):
                try:
                    page.screenshot(path=screenshot_path, full_page=True)
                    print(f"\n📸 Đã chụp màn hình lỗi (Playwright): {screenshot_path}")
                except Exception as e:
                    print(f"\n⚠️ Lỗi khi chụp screenshot: {e}")

            # Appium driver fixture
            driver = item.funcargs.get("appium_driver")
            if driver and hasattr(driver, "save_screenshot"):
                try:
                    driver.save_screenshot(screenshot_path)
                    print(f"\n📸 Đã chụp màn hình lỗi (Appium): {screenshot_path}")
                except Exception as e:
                    print(f"\n⚠️ Lỗi khi chụp screenshot: {e}")
