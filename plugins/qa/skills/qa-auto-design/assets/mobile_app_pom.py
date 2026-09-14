# ==========================================================
# File mẫu: Automation Test cho Mobile App (Playwright Mobile & Appium)
# ==========================================================
# Áp dụng cho Task Type: 📱 APP
# Bao gồm:
# 1. Screen Object Model (SOM) cho Mobile App
# 2. Hướng 1: Playwright Mobile Emulation (Mobile Web, PWA, Hybrid)
# 3. Hướng 2: Appium Python (Native App Android/iOS)
# 4. Mobile Gestures (Swipe, Scroll to Element, Tap coordinates)
# 5. Xử lý đặc thù Mobile: Biometrics/PIN, Permission Pop-ups, Offline Mode
# 6. Gherkin Traceability Binding (@pytest.mark.scenario, @pytest.mark.jira)
# ==========================================================

import time
import pytest


# ==========================================================
# HƯỚNG 1: PLAYWRIGHT MOBILE EMULATION (Mobile Web / PWA)
# ==========================================================
# Dùng khi test web responsive trên thiết bị di động, PWA, hoặc Webview.
# ==========================================================

from playwright.sync_api import Page, Browser, expect

class MobileTradingScreen:
    """Screen Object cho màn hình giao dịch chứng khoán trên Mobile Web."""
    def __init__(self, page: Page):
        self.page = page
        # Mobile-specific selectors & tap targets (kích thước tối thiểu 44x44px)
        self.menu_toggle_button = page.get_by_role("button", name="Mở menu")
        self.search_symbol_input = page.get_by_placeholder("Tìm mã CK")
        self.quick_buy_button = page.get_by_role("button", name="MUA NHANH")
        self.order_drawer = page.get_by_role("dialog", name="Phiếu lệnh")
        self.confirm_pin_input = page.get_by_label("Nhập mã PIN")
        self.confirm_order_button = page.get_by_role("button", name="Xác nhận")
        self.success_toast = page.get_by_role("alert")

    def open_quick_order(self, symbol: str):
        self.search_symbol_input.fill(symbol)
        self.page.get_by_text(symbol).first.tap()  # Dùng tap() thay vì click() trên mobile
        self.quick_buy_button.tap()

    def confirm_with_pin(self, pin: str):
        self.confirm_pin_input.fill(pin)
        self.confirm_order_button.tap()


@pytest.fixture
def mobile_page(browser: Browser):
    """
    Khởi tạo context giả lập thiết bị di động (Pixel 7 hoặc iPhone 14).
    Tự động bật touch, mobile viewport và user agent chuẩn.
    """
    from playwright.sync_api import devices
    pixel_7 = devices["Pixel 7"]
    context = browser.new_context(**pixel_7, locale="vi-VN")
    page = context.new_page()
    yield page
    context.close()


@pytest.mark.jira("ENT-9812")
@pytest.mark.scenario("Khách hàng đặt lệnh nhanh trên giao diện Mobile Web thành công")
def test_mobile_web_quick_order(mobile_page: Page, base_url: str):
    """
    Gherkin Binding:
    Feature: ENT-9812.feature
    Scenario: Khách hàng đặt lệnh nhanh trên giao diện Mobile Web thành công
      Given khách hàng truy cập ứng dụng trên trình duyệt di động
      When tìm kiếm mã "FPT" và nhấn "MUA NHANH"
      And xác nhận bằng mã PIN "123456"
      Then hệ thống hiển thị thông báo "Lệnh đã được gửi thành công"
    """
    screen = MobileTradingScreen(mobile_page)
    mobile_page.goto(f"{base_url}/m")

    # Act: Thao tác cảm ứng (Touch / Tap)
    screen.open_quick_order("FPT")
    expect(screen.order_drawer).to_be_visible()

    screen.confirm_with_pin("123456")

    # Assert: Auto-retrying notification
    expect(screen.success_toast).to_be_visible()
    expect(screen.success_toast).to_contain_text("Lệnh đã được gửi thành công")


# ==========================================================
# HƯỚNG 2: APPIUM PYTHON (NATIVE APP ANDROID / IOS)
# ==========================================================
# Dùng khi test Native App cài đặt qua file .apk hoặc .ipa.
# ==========================================================

class NativeLoginScreen:
    """
    Screen Object cho Native App (Appium).
    Sử dụng AppiumBy.ACCESSIBILITY_ID (Ưu tiên số 1 trên Mobile).
    """
    def __init__(self, driver):
        self.driver = driver

    # Định nghĩa Locators bằng Accessibility ID hoặc Android UIAutomator
    @property
    def username_field(self):
        from appium.webdriver.common.appiumby import AppiumBy
        return self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "input_username")

    @property
    def password_field(self):
        from appium.webdriver.common.appiumby import AppiumBy
        return self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "input_password")

    @property
    def login_btn(self):
        from appium.webdriver.common.appiumby import AppiumBy
        return self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "btn_login")

    @property
    def biometric_prompt_btn(self):
        from appium.webdriver.common.appiumby import AppiumBy
        return self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "btn_biometric_login")

    def login(self, username: str, password: str):
        self.username_field.clear()
        self.username_field.send_keys(username)
        self.password_field.clear()
        self.password_field.send_keys(password)
        self.login_btn.click()

    def swipe_down_to_refresh(self):
        """Thực hiện gesture vuốt màn hình (Swipe down)."""
        window_size = self.driver.get_window_size()
        width = window_size["width"]
        height = window_size["height"]

        start_x = width // 2
        start_y = int(height * 0.3)
        end_x = width // 2
        end_y = int(height * 0.8)

        # Sử dụng TouchAction hoặc W3C Actions
        self.driver.swipe(start_x, start_y, end_x, end_y, duration=600)


@pytest.mark.jira("ENT-9812")
@pytest.mark.scenario("Đăng nhập Native App và xử lý mất kết nối mạng (Offline mode)")
def test_native_app_offline_handling(appium_driver):
    """
    Gherkin Binding:
    Feature: ENT-9812.feature
    Scenario: Đăng nhập Native App và xử lý mất kết nối mạng (Offline mode)
      Given ứng dụng Native đang mở ở màn hình Đăng nhập
      When người dùng ngắt toàn bộ kết nối Wi-Fi/4G và nhấn Đăng nhập
      Then ứng dụng hiển thị pop-up cảnh báo "Không có kết nối mạng"
    """
    from appium.webdriver.common.appiumby import AppiumBy
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    screen = NativeLoginScreen(appium_driver)

    # Giả lập ngắt kết nối mạng trên thiết bị Android
    try:
        appium_driver.set_network_connection(1)  # 1 = Airplane mode on
    except Exception:
        pytest.skip("Thiết bị không hỗ trợ toggle network tự động")

    screen.login("user_test", "Password@123")

    # Assert: Cảnh báo mất kết nối xuất hiện
    wait = WebDriverWait(appium_driver, timeout=5)
    alert = wait.until(EC.visibility_of_element_located((
        AppiumBy.ACCESSIBILITY_ID, "network_error_dialog"
    )))
    assert "Không có kết nối mạng" in alert.text

    # Teardown: Bật lại mạng bình thường
    appium_driver.set_network_connection(6)  # 6 = All network data on
