# ==========================================================
# conftest_ui.py — Web UI, Mobile Emulation & Appium Driver Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & credentials cho Web Trading & Mobile
# 2. Playwright Web Fixtures (Desktop Full HD 1920x1080, ignore_https_errors)
# 3. Mobile Web Emulation Fixtures (Pixel 7 / iPhone 14 touch emulation)
# 4. Native Mobile Appium Fixtures (UiAutomator2 / XCUITest driver)
# ==========================================================

import os
import pytest

# ==========================================================
# CLI OPTIONS REGISTRATION FOR WEB & MOBILE UI
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho Web UI và Mobile."""
    options = [
        ("--web-base-url", os.getenv("WEB_BASE_URL", ""), "Base URL của Web Trading"),
        ("--trading-username", os.getenv("TRADING_USERNAME", ""), "Tài khoản đăng nhập Web Trading"),
        ("--trading-password", os.getenv("TRADING_PASSWORD", ""), "Mật khẩu đăng nhập Web Trading"),
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
# PLAYWRIGHT WEB FIXTURES (Desktop 1920x1080)
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
# MOBILE EMULATION FIXTURES (Playwright Mobile)
# ==========================================================
@pytest.fixture
def mobile_context(browser):
    """
    Context giả lập thiết bị di động (Pixel 7).
    Tự động bật touch events và viewport di động.
    """
    from playwright.sync_api import devices
    pixel_7 = devices.get("Pixel 7") or {"viewport": {"width": 412, "height": 915}, "is_mobile": True, "has_touch": True}
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
# NATIVE MOBILE FIXTURES (Appium Driver)
# ==========================================================
@pytest.fixture(scope="function")
def appium_driver():
    """
    Khởi tạo Appium Driver cho Native App Testing.
    Đọc cấu hình server và package từ biến môi trường.
    """
    appium_server_url = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")
    app_package = os.getenv("APP_PACKAGE", "com.example.trading")
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
