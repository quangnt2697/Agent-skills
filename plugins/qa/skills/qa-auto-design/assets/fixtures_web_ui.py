# ==========================================================
# fixtures_web_ui.py — Web Trading UI (Playwright) Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & credentials cho Web Trading Dashboard
# 2. Playwright Desktop Fixtures (Full HD 1920x1080, ignore_https_errors)
# 3. browser_type_launch_args: Cấu hình headless=False mặc định & hỗ trợ Cốc Cốc, Chrome, Edge
# 4. authenticated_page: Tự động đăng nhập Fail-Fast chống False-Positive
# 5. locators: Tự động nạp bảng locator từ test/fixtures/locators.json
# ==========================================================

import os
import json
import platform
from pathlib import Path
from typing import Optional, Any, Dict
import pytest
from playwright.sync_api import Page, expect


# ==========================================================
# HELPER: BROWSER RESOLVER (Cốc Cốc, Chrome, Edge)
# ==========================================================
def get_coccoc_executable_path() -> str:
    """
    Tự động phát hiện đường dẫn binary thực thi của trình duyệt Cốc Cốc theo OS.
    Ưu tiên COCCOC_BINARY_PATH / COCCOC_PATH trong .env trước.
    """
    custom_path = os.getenv("COCCOC_BINARY_PATH") or os.getenv("COCCOC_PATH")
    if custom_path and os.path.exists(custom_path):
        return custom_path

    system = platform.system()
    candidates = []
    if system == "Darwin":  # macOS
        candidates = [
            "/Applications/CocCoc.app/Contents/MacOS/CocCoc",
            str(Path.home() / "Applications/CocCoc.app/Contents/MacOS/CocCoc"),
        ]
    elif system == "Windows":
        local_app_data = os.getenv("LOCALAPPDATA", "")
        program_files = os.getenv("ProgramFiles", "C:\\Program Files")
        program_files_x86 = os.getenv("ProgramFiles(x86)", "C:\\Program Files (x86)")
        candidates = [
            os.path.join(program_files, "CocCoc", "Browser", "Application", "browser.exe"),
            os.path.join(program_files_x86, "CocCoc", "Browser", "Application", "browser.exe"),
            os.path.join(local_app_data, "CocCoc", "Browser", "Application", "browser.exe"),
        ]
    else:  # Linux
        candidates = ["/usr/bin/coccoc", "/opt/coccoc/coccoc"]

    for path in candidates:
        if path and os.path.exists(path):
            return path

    raise FileNotFoundError(
        f"[COCCOC_NOT_FOUND] Không tìm thấy trình duyệt Cốc Cốc trên hệ điều hành {system}. "
        f"Vui lòng cài đặt Cốc Cốc hoặc cấu hình đường dẫn qua biến COCCOC_BINARY_PATH trong .env"
    )


# ==========================================================
# CLI OPTIONS REGISTRATION FOR WEB UI
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho Web UI."""
    options = [
        ("--web-base-url", os.getenv("WEB_BASE_URL", ""), "Base URL của Web Trading"),
        ("--trading-username", os.getenv("TRADING_USERNAME", ""), "Tài khoản đăng nhập Web Trading"),
        ("--trading-password", os.getenv("TRADING_PASSWORD", ""), "Mật khẩu đăng nhập Web Trading"),
        ("--target-browser", os.getenv("TARGET_BROWSER", os.getenv("BROWSER", "chromium")), "Trình duyệt mục tiêu: chromium, coccoc, chrome, msedge, firefox, webkit"),
        ("--headless-mode", os.getenv("HEADLESS", "false"), "Chạy headless: true | false (mặc định false)"),
    ]
    for opt, default_val, help_text in options:
        try:
            parser.addoption(opt, action="store", default=default_val, help=help_text)
        except Exception:
            pass


# ==========================================================
# CREDENTIALS & URL FIXTURES
# ==========================================================
@pytest.fixture(scope="session")
def web_base_url(request):
    try:
        return request.config.getoption("--web-base-url") or os.getenv("WEB_BASE_URL", "")
    except Exception:
        return os.getenv("WEB_BASE_URL", "")


@pytest.fixture(scope="session")
def trading_username(request):
    try:
        return request.config.getoption("--trading-username") or os.getenv("TRADING_USERNAME", "")
    except Exception:
        return os.getenv("TRADING_USERNAME", "")


@pytest.fixture(scope="session")
def trading_password(request):
    try:
        return request.config.getoption("--trading-password") or os.getenv("TRADING_PASSWORD", "")
    except Exception:
        return os.getenv("TRADING_PASSWORD", "")


@pytest.fixture(scope="session")
def trading_investor_id():
    return os.getenv("TRADING_INVESTOR_ID", "")


@pytest.fixture(scope="session")
def web_api_token():
    return os.getenv("WEB_API_TOKEN", "")


# ==========================================================
# PLAYWRIGHT WEB FIXTURES (Desktop 1920x1080 & Launcher Config)
# ==========================================================
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Override viewport mặc định của Playwright thành chuẩn Full HD 1920x1080."""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
    }


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args, request):
    """
    Cấu hình Playwright browser launcher:
    1. Chế độ headless=False (mặc định mở trình duyệt trực quan để theo dõi thao tác).
    2. Hỗ trợ chọn browser tương ứng:
       - Cốc Cốc: Chỉ định executable_path qua get_coccoc_executable_path()
       - Chrome / Edge: Khởi chạy qua channel="chrome" / "msedge"
       - Chromium / Firefox / WebKit chuẩn
    """
    launch_args = {**browser_type_launch_args}

    # 1. Headless mode (mặc định False theo yêu cầu)
    headless_opt = None
    try:
        headless_opt = request.config.getoption("--headless-mode")
    except Exception:
        pass
    if not headless_opt:
        headless_opt = os.getenv("HEADLESS", "false")

    is_headless = str(headless_opt).strip().lower() in ("true", "1", "yes")

    # Kiểm tra flag --headed chuẩn của pytest-playwright nếu có
    try:
        if request.config.getoption("--headed", default=False):
            is_headless = False
    except Exception:
        pass

    launch_args["headless"] = is_headless

    # 2. Browser selection & CocCoc custom binary
    target_browser = ""
    try:
        target_browser = request.config.getoption("--target-browser") or ""
    except Exception:
        pass
    if not target_browser:
        target_browser = os.getenv("TARGET_BROWSER") or os.getenv("BROWSER", "chromium")
    target_browser = target_browser.strip().lower()

    if target_browser in ("coccoc", "coc-coc"):
        coccoc_path = get_coccoc_executable_path()
        launch_args["executable_path"] = coccoc_path
        launch_args["args"] = launch_args.get("args", []) + [
            "--no-first-run",
            "--no-default-browser-check",
        ]
    elif target_browser in ("chrome", "msedge", "chrome-beta"):
        launch_args["channel"] = target_browser

    slow_mo = int(os.getenv("SLOW_MO_MS", "0"))
    if slow_mo > 0:
        launch_args["slow_mo"] = slow_mo

    return launch_args


@pytest.fixture
def web_page(page: Page, web_base_url: str):
    """Page cơ bản đã mở sẵn trang chủ Web Trading."""
    if web_base_url:
        page.goto(web_base_url)
    return page


@pytest.fixture
def authenticated_page(page: Page, web_base_url: str, trading_username: str, trading_password: str, locators: Dict[str, Any]):
    """
    Page tự động hoàn tất đăng nhập với cơ chế Fail-Fast & chống False-Positive:
    1. Kiểm tra credentials hợp lệ từ .env.
    2. Điền form đăng nhập.
    3. Chốt chặn 1: Quét ngay thông báo lỗi (Toast / Alert / Error popup) -> Fail ngay nếu xuất hiện.
    4. Chốt chặn 2: Chờ phần tử màn hình chính (Dashboard) xuất hiện. Nếu timeout -> Fail ngay.
    """
    if not web_base_url:
        pytest.fail("[SETUP_FAILED] Chưa cấu hình WEB_BASE_URL trong .env")

    if not trading_username or not trading_password:
        pytest.fail(
            "[CONFIG_ERROR] Thiếu thông tin tài khoản đăng nhập (TRADING_USERNAME hoặc TRADING_PASSWORD). "
            "Vui lòng cấu hình trong file .env trước khi chạy test."
        )

    login_url = f"{web_base_url.rstrip('/')}/login"
    page.goto(login_url)

    # Lấy selectors đăng nhập từ locators.json hoặc fallback chuẩn
    user_sel = locators.get("login", {}).get("username_input", "input[name='username'], input[type='text']")
    pass_sel = locators.get("login", {}).get("password_input", "input[name='password'], input[type='password']")
    btn_sel = locators.get("login", {}).get("submit_button", "button[type='submit']")

    try:
        page.fill(user_sel, trading_username)
        page.fill(pass_sel, trading_password)
        page.click(btn_sel)
    except Exception as e:
        pytest.fail(f"[LOGIN_INTERACTION_ERROR] Không thể tương tác form đăng nhập (fill/click): {e}")

    # Chốt chặn 1: Quét nếu có thông báo lỗi hiển thị (Sai tài khoản / Mật khẩu)
    error_selectors = [
        locators.get("login", {}).get("error_alert"),
        "[role='alert']",
        ".ant-alert-error",
        ".toast-error",
        ".error-message",
        ".ant-notification-notice-error",
        ".form-item-explain-error",
    ]
    error_selector = ", ".join([s for s in error_selectors if s])

    try:
        error_element = page.locator(error_selector).first
        if error_element.is_visible(timeout=3000):
            err_text = error_element.inner_text().strip()
            pytest.fail(
                f"[AUTH_FAILED] Đăng nhập KHÔNG thành công với tài khoản '{trading_username}'. "
                f"Thông báo lỗi từ hệ thống: '{err_text}'"
            )
    except Exception as e:
        # Nếu đã là pytest.fail thì re-raise
        if "Failed: [AUTH_FAILED]" in str(e):
            raise

    # Chốt chặn 2: Xác nhận đã vào màn hình Dashboard / Bảng giá
    dashboard_sel = locators.get("dashboard", {}).get(
        "identity",
        "[data-testid='user-profile'], header .user-info, .dashboard-container, h1, .trading-layout"
    )
    timeout_ms = int(os.getenv("PLAYWRIGHT_LOGIN_TIMEOUT_MS", "15000"))
    try:
        expect(page.locator(dashboard_sel).first).to_be_visible(timeout=timeout_ms)
    except AssertionError:
        current_url = page.url
        pytest.fail(
            f"[AUTH_TIMEOUT] Sau khi bấm đăng nhập, không thấy giao diện chính ({dashboard_sel}) sau {timeout_ms}ms. "
            f"Tài khoản '{trading_username}' có thể sai thông tin hoặc trang web không chuyển hướng. "
            f"URL hiện tại: {current_url}"
        )

    yield page

    # Teardown an toàn sau mỗi test
    try:
        page.context.clear_cookies()
    except Exception:
        pass


# ==========================================================
# LOCATORS LOADER FIXTURE
# ==========================================================
@pytest.fixture(scope="session")
def locators() -> Dict[str, Any]:
    """Tự động nạp bảng locator từ test/fixtures/locators.json nếu có."""
    test_dir = Path(__file__).resolve().parent.parent
    locator_file = test_dir / "fixtures" / "locators.json"
    if locator_file.exists():
        try:
            with open(locator_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Lỗi đọc locators.json: {e}")
    return {}
