# File mẫu: Tầng Page Object (ví dụ: pages/login_page.py)
from playwright.sync_api import Page

class LoginPage:
    def __init__(self, page: Page):
        self.page = page
        # Sử dụng semantic locators
        self.username_input = page.get_by_label("Tên đăng nhập")
        self.password_input = page.get_by_label("Mật khẩu")
        self.login_button = page.get_by_role("button", name="Đăng nhập")

    # Chỉ thực hiện action, tuyệt đối KHÔNG assert ở đây
    def login(self, username, password):
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.login_button.click()

# ----------------------------------------------------------------------
# File mẫu: Tầng Test (ví dụ: tests/test_login.py)
import pytest
from playwright.sync_api import Page, expect
from pages.login_page import LoginPage

def test_login_success(page: Page):
    # Setup
    login_page = LoginPage(page)
    page.goto("https://example.com/login")
    
    # Hành động (Act)
    login_page.login("testuser", "password123")
    
    # Xác minh (Assert) - Assertions bắt buộc nằm trong file test
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()

@pytest.mark.parametrize("username, password, error_message", [
    ("invalid_user", "password123", "Tên đăng nhập không tồn tại"),
    ("testuser", "wrong_pass", "Mật khẩu không chính xác"),
])
def test_login_negative(page: Page, username, password, error_message):
    login_page = LoginPage(page)
    page.goto("https://example.com/login")
    
    login_page.login(username, password)
    
    # Assert lỗi hiển thị (auto-retrying assertion)
    expect(page.get_by_role("alert")).to_contain_text(error_message)
