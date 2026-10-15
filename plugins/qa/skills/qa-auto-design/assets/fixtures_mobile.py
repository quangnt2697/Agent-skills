# ==========================================================
# fixtures_mobile.py — Mobile Trading (Playwright Emulation & Appium Native) Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & credentials cho Mobile Trading App & Emulation
# 2. Playwright Mobile Emulation Fixtures (Pixel 7 / iPhone 14 touch emulation)
# 3. Native Mobile Appium Fixtures (UiAutomator2 / XCUITest driver)
# 4. mobile_actions: Helper các thao tác vuốt chạm, scroll và gõ phím trên mobile
# ==========================================================

import os
from typing import Optional, Any
import pytest

# ==========================================================
# CLI OPTIONS REGISTRATION FOR MOBILE
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho Mobile Testing."""
    options = [
        ("--appium-server-url", os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723"), "URL của Appium Server"),
        ("--app-package", os.getenv("APP_PACKAGE", "com.example.trading"), "Package ID của ứng dụng Android"),
        ("--app-activity", os.getenv("APP_ACTIVITY", ".MainActivity"), "Launcher Activity của ứng dụng"),
        ("--platform-name", os.getenv("MOBILE_PLATFORM", "Android"), "Hệ điều hành di động (Android / iOS)"),
    ]
    for opt, default_val, help_text in options:
        try:
            parser.addoption(opt, action="store", default=default_val, help=help_text)
        except Exception:
            pass

# ==========================================================
# MOBILE WEB EMULATION FIXTURES (Playwright Mobile)
# ==========================================================
@pytest.fixture
def mobile_context(browser):
    """
    Context giả lập thiết bị di động (Pixel 7).
    Tự động kích hoạt Touch Events và Viewport di động.
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
def appium_driver(request):
    """
    Khởi tạo Appium Driver cho Native App Testing.
    Tự động đọc thông số từ CLI hoặc biến môi trường.
    """
    try:
        appium_server_url = request.config.getoption("--appium-server-url") or os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")
        app_package = request.config.getoption("--app-package") or os.getenv("APP_PACKAGE", "com.example.trading")
        app_activity = request.config.getoption("--app-activity") or os.getenv("APP_ACTIVITY", ".MainActivity")
        platform_name = request.config.getoption("--platform-name") or os.getenv("MOBILE_PLATFORM", "Android")
    except Exception:
        appium_server_url = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")
        app_package = os.getenv("APP_PACKAGE", "com.example.trading")
        app_activity = os.getenv("APP_ACTIVITY", ".MainActivity")
        platform_name = os.getenv("MOBILE_PLATFORM", "Android")

    automation_name = "UiAutomator2" if platform_name.lower() == "android" else "XCUITest"

    capabilities = {
        "platformName": platform_name,
        "automationName": automation_name,
        "appPackage": app_package,
        "appActivity": app_activity,
        "noReset": True,
        "autoGrantPermissions": True,
    }

    try:
        from appium import webdriver
        if platform_name.lower() == "android":
            from appium.options.android import UiAutomator2Options
            options = UiAutomator2Options().load_capabilities(capabilities)
        else:
            from appium.options.ios import XCUITestOptions
            options = XCUITestOptions().load_capabilities(capabilities)

        driver = webdriver.Remote(appium_server_url, options=options)
    except Exception as e:
        pytest.skip(f"Không thể kết nối đến Appium Server tại {appium_server_url}: {e}")

    yield driver

    try:
        driver.quit()
    except Exception:
        pass

# ==========================================================
# MOBILE ACTIONS HELPER
# ==========================================================
class MobileActions:
    """Helper hỗ trợ các thao tác cử chỉ phổ biến trên Mobile."""
    def __init__(self, driver):
        self.driver = driver

    def swipe_down(self, duration: int = 800):
        """Vuốt từ trên xuống dưới để pull-to-refresh."""
        size = self.driver.get_window_size()
        start_x = size["width"] // 2
        start_y = int(size["height"] * 0.3)
        end_y = int(size["height"] * 0.8)
        self.driver.swipe(start_x, start_y, start_x, end_y, duration)

    def swipe_up(self, duration: int = 800):
        """Vuốt cuộn trang xuống dưới."""
        size = self.driver.get_window_size()
        start_x = size["width"] // 2
        start_y = int(size["height"] * 0.8)
        end_y = int(size["height"] * 0.3)
        self.driver.swipe(start_x, start_y, start_x, end_y, duration)

@pytest.fixture
def mobile_actions(appium_driver):
    """Fixture cung cấp các thao tác vuốt cuộn màn hình trên thiết bị di động."""
    return MobileActions(appium_driver)
