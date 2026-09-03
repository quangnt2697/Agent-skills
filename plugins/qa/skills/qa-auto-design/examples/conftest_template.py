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
import pytest
from dotenv import load_dotenv, find_dotenv

# Tự động tìm nạp .env từ thư mục hiện tại hoặc ngược lên thư mục cha
load_dotenv(find_dotenv(usecwd=True))


# ==========================================================
# 1. CLI OPTIONS (pytest_addoption)
# ==========================================================
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
def dashboard_auth_token(dashboard_url, dashboard_username, dashboard_password):
    """
    Đăng nhập Dashboard OpenAPI tự động để lấy Bearer token.
    Tự động suy luận URL gốc từ dashboard_url (bỏ qua hash path).
    """
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
            return data.get("token")
    except Exception as e:
        print(f"\n⚠️ Không thể lấy token Dashboard tại {login_url}: {e}")
        return None


# ==========================================================
# 3. DYNAMIC TEST DATA
# ==========================================================

@pytest.fixture
def unique_id():
    """Sinh ID unique cho mỗi test method. Format: auto_[timestamp]_[random]."""
    return f"auto_{int(time.time())}_{uuid.uuid4().hex[:6]}"


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
# 7. AUTO SCREENSHOT HOOK ON FAILURE
# ==========================================================

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook tự động chụp màn hình khi test case bị FAILED (cả Playwright Web và Appium).
    Ảnh được lưu vào thư mục: test/result/screenshots/
    """
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        screenshots_dir = os.path.join(os.getcwd(), "test", "result", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        timestamp = int(time.time())
        screenshot_path = os.path.join(screenshots_dir, f"fail_{item.name}_{timestamp}.png")

        # 1. Chụp ảnh nếu là Playwright Page fixture
        page = item.funcargs.get("page") or item.funcargs.get("mobile_page")
        if page and hasattr(page, "screenshot"):
            try:
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"\n📸 Đã chụp màn hình lỗi (Playwright): {screenshot_path}")
            except Exception as e:
                print(f"\n⚠️ Lỗi khi chụp screenshot: {e}")

        # 2. Chụp ảnh nếu là Appium driver fixture
        driver = item.funcargs.get("appium_driver")
        if driver and hasattr(driver, "save_screenshot"):
            try:
                driver.save_screenshot(screenshot_path)
                print(f"\n📸 Đã chụp màn hình lỗi (Appium): {screenshot_path}")
            except Exception as e:
                print(f"\n⚠️ Lỗi khi chụp screenshot: {e}")
