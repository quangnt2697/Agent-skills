# ==========================================================
# File mẫu: Automation Test cho Web UI (Playwright + Pytest)
# ==========================================================
# Áp dụng:
# 1. Mô hình Page Object Model (POM) chuẩn mực
# 2. Semantic Locators (get_by_role, get_by_label, get_by_placeholder)
# 3. Web-First Auto-Retrying Assertions (expect)
# 4. Gherkin Traceability Binding (@pytest.mark.scenario, @pytest.mark.jira)
# 5. Data-Driven BVA/EP với @pytest.mark.parametrize
# 6. Teardown an toàn dọn dẹp state/cookies
# ==========================================================

import time
import uuid
import pytest
from playwright.sync_api import Page, expect


# ============================
# PHẦN 1: TẦNG BASE & PAGE OBJECTS
# ============================

class BasePage:
    """Class cha cho toàn bộ Page Objects, cung cấp các hành động chung."""
    def __init__(self, page: Page):
        self.page = page

    def navigate_to(self, path: str = ""):
        self.page.goto(path)

    def get_toast_message(self):
        """Hàm dùng chung lấy thông báo toast/alert."""
        return self.page.get_by_role("alert")


class LoginPage(BasePage):
    """
    Page Object cho màn hình Đăng nhập.
    NGUYÊN TẮC: Chỉ chứa locators và action methods. TUYỆT ĐỐI KHÔNG assert trong class này.
    """
    def __init__(self, page: Page):
        super().__init__(page)
        # Sử dụng Semantic Locators theo chuẩn Playwright
        self.username_input = page.get_by_label("Tên đăng nhập")
        self.password_input = page.get_by_label("Mật khẩu")
        self.login_button = page.get_by_role("button", name="Đăng nhập")
        self.error_alert = page.get_by_role("alert")

    def login(self, username: str, password: str):
        """Thực hiện hành động điền thông tin và bấm đăng nhập."""
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.login_button.click()


class OrderPage(BasePage):
    """Page Object cho màn hình Đặt lệnh Chứng khoán."""
    def __init__(self, page: Page):
        super().__init__(page)
        self.symbol_input = page.get_by_placeholder("Mã chứng khoán")
        self.side_buy_tab = page.get_by_role("tab", name="MUA")
        self.side_sell_tab = page.get_by_role("tab", name="BÁN")
        self.quantity_input = page.get_by_label("Khối lượng")
        self.price_input = page.get_by_label("Giá đặt")
        self.submit_button = page.get_by_role("button", name="Xác nhận đặt lệnh")
        self.success_modal = page.get_by_role("dialog", name="Đặt lệnh thành công")
        self.confirm_dialog_button = page.get_by_role("button", name="Đồng ý")

    def place_order(self, symbol: str, side: str, quantity: int, price: float):
        if side.upper() == "BUY":
            self.side_buy_tab.click()
        else:
            self.side_sell_tab.click()

        self.symbol_input.fill(symbol)
        self.quantity_input.fill(str(quantity))
        self.price_input.fill(str(price))
        self.submit_button.click()

    def confirm_modal_if_present(self):
        if self.confirm_dialog_button.is_visible():
            self.confirm_dialog_button.click()


# ============================
# PHẦN 2: TẦNG TEST & ASSERTIONS
# ============================

@pytest.fixture
def auth_page(page: Page, base_url: str):
    """Fixture tiền điều kiện: Đã đăng nhập vào hệ thống."""
    login_page = LoginPage(page)
    page.goto(f"{base_url}/login")
    login_page.login("trader_test_01", "SecurePass@123")
    # Verify đăng nhập thành công trước khi bàn giao page cho test
    expect(page.get_by_role("heading", name="Bảng giá trực tuyến")).to_be_visible()
    yield page
    # Teardown: Xóa cookies và storage state sau mỗi test
    page.context.clear_cookies()


@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Đăng nhập thành công với tài khoản và mật khẩu hợp lệ")
def test_login_success(page: Page, base_url: str):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario: Đăng nhập thành công với tài khoản và mật khẩu hợp lệ
      Given người dùng mở trang đăng nhập
      When nhập tên đăng nhập "trader_test_01" và mật khẩu "SecurePass@123"
      Then hệ thống chuyển hướng đến Dashboard "Bảng giá trực tuyến"
    """
    login_page = LoginPage(page)
    page.goto(f"{base_url}/login")

    # Act
    login_page.login("trader_test_01", "SecurePass@123")

    # Assert: Web-First Auto-Retrying Assertion (Không dùng time.sleep)
    expect(page.get_by_role("heading", name="Bảng giá trực tuyến")).to_be_visible()


@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Hệ thống hiển thị thông báo lỗi khi đăng nhập không hợp lệ")
@pytest.mark.parametrize("username, password, error_keyword", [
    ("", "SecurePass@123", "Tên đăng nhập không được để trống"),
    ("trader_test_01", "", "Mật khẩu không được để trống"),
    ("unknown_user", "wrong_pass", "Tài khoản hoặc mật khẩu không chính xác"),
])
def test_login_negative_data_driven(page: Page, base_url: str, username, password, error_keyword):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario Outline: Hệ thống hiển thị thông báo lỗi khi đăng nhập không hợp lệ
      Given người dùng mở trang đăng nhập
      When nhập tên đăng nhập "<username>" và mật khẩu "<password>"
      Then hệ thống hiển thị thông báo lỗi chứa "<error_keyword>"
    """
    login_page = LoginPage(page)
    page.goto(f"{base_url}/login")

    # Act
    login_page.login(username, password)

    # Assert: Thông báo lỗi xuất hiện tự động retry
    expect(login_page.error_alert).to_be_visible()
    expect(login_page.error_alert).to_contain_text(error_keyword)


@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Đặt lệnh mua cổ phiếu thành công trên giao diện Web")
def test_place_order_success(auth_page: Page, base_url: str):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario: Đặt lệnh mua cổ phiếu thành công trên giao diện Web
      Given người dùng đã đăng nhập thành công vào hệ thống
      When người dùng mở form đặt lệnh và đặt mua mã "VNM" khối lượng "100" giá "50000"
      Then hiển thị pop-up thông báo "Đặt lệnh thành công"
    """
    order_page = OrderPage(auth_page)
    auth_page.goto(f"{base_url}/trading/order")

    # Act
    order_page.place_order(symbol="VNM", side="BUY", quantity=100, price=50000.0)
    order_page.confirm_modal_if_present()

    # Assert: Xác minh pop-up thành công xuất hiện
    expect(order_page.success_modal).to_be_visible()
