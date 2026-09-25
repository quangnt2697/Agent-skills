# ==========================================================
# File mẫu: Automation Test cho Web UI (Playwright + Pytest)
# Trading Platform — Entrade / DNSE
# ==========================================================
# Áp dụng:
# 1. Mô hình Page Object Model (POM) chuẩn mực
# 2. Semantic Locators — PHẢI lấy từ DOM thật sau khi đăng nhập (discoverWebUILocators / browser DOM)
# 3. Web-First Auto-Retrying Assertions (expect)
# 4. Gherkin Traceability Binding (@pytest.mark.scenario, @pytest.mark.jira)
# 5. Data-Driven BVA/EP với @pytest.mark.parametrize
# 6. Teardown an toàn dọn dẹp state/cookies
# 7. Zero-Mock Rule — KHÔNG mock server, test trực tiếp trên hệ thống thật
# ==========================================================
# ⚠️  QUY TẮC BẮT BUỘC:
#   - TUYỆT ĐỐI KHÔNG hardcode credentials / URL vào code.
#   - Mọi giá trị đọc từ .env qua os.getenv().
#   - Locator PHẢI được xác thực qua discoverWebUILocators hoặc DOM thật sau khi đăng nhập.
#   - Dữ liệu thị trường (giá, mã CK) lấy từ fixture Metabase UAT, không tự bịa.
# ==========================================================

import os
import ssl
import urllib.error
import urllib.request
import uuid
import pytest
from playwright.sync_api import Page, BrowserContext, Playwright, sync_playwright, expect


# ============================
# PHẦN 0: URL RESOLVER — Đọc từ .env & Probe Fallback
# ============================

def resolve_web_url(issue_key: str | None = None, timeout_sec: float = 3.0) -> str:
    """
    Resolve URL môi trường web theo thứ tự ưu tiên:
    1. Kiểm tra ISSUE_KEY_URL trước (nếu có issue_key): probe HTTP HEAD (timeout 3s).
       Nếu phản hồi tốt (HTTP < 400) -> sử dụng ISSUE_KEY_URL.
    2. Nếu ISSUE_KEY_URL không phản hồi, timeout, hoặc trả về lỗi (4xx, 5xx) ->
       tự động fallback về WEB_BASE_URL (URL dev/test ổn định).
    Không nhận URL hardcode — NGHIÊM CẤM truyền URL trực tiếp vào test code.
    """
    base_url = os.getenv("WEB_BASE_URL", "https://dev.trading-test.dnse.com.vn/").rstrip("/")
    if not issue_key:
        return base_url

    template = os.getenv("ISSUE_KEY_URL", "https://{issueKey}.trading-test.dnse.com.vn/")
    candidate_url = template.replace("{issueKey}", issue_key.lower()).rstrip("/")

    # Probe HTTP HEAD để kiểm tra URL per-branch có hoạt động không
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(candidate_url, method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout_sec, context=ctx) as resp:
            if resp.status < 400:
                return candidate_url
    except Exception:
        pass

    # Fallback khi ISSUE_KEY_URL không phản hồi hoặc trả về mã lỗi
    return base_url


# ============================
# PHẦN 1: TẦNG BASE & PAGE OBJECTS
# ============================

class BasePage:
    """Class cha cho toàn bộ Page Objects — chỉ chứa hành động, KHÔNG assert."""
    def __init__(self, page: Page):
        self.page = page

    def navigate_to(self, url: str):
        self.page.goto(url)

    def get_toast_message(self):
        """Hàm dùng chung lấy thông báo toast/alert."""
        return self.page.get_by_role("alert")


class LoginPage(BasePage):
    """
    Page Object cho màn hình Đăng nhập Trading Platform.
    NGUYÊN TẮC: Chỉ chứa locators và action methods. TUYỆT ĐỐI KHÔNG assert trong class này.

    ⚠️ LOCATOR POLICY:
    - Locator BẮT BUỘC được xác thực từ DOM thật qua discoverWebUILocators / browser devtools
      sau khi đăng nhập thật bằng TRADING_USERNAME/TRADING_PASSWORD từ .env.
    - KHÔNG tự suy đoán locator — soi DOM thật trước khi code.
    """
    def __init__(self, page: Page):
        super().__init__(page)
        # ── Locators dưới đây cần được xác nhận lại qua DOM thật / discoverWebUILocators ──
        # Quy trình: navigate → screenshot → inspect DOM → chốt locator chính xác
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
    """
    Page Object cho màn hình Đặt lệnh Chứng khoán.

    ⚠️ LOCATOR POLICY: Xác thực qua DOM thật sau khi auth_page fixture đăng nhập thật.
    """
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
# PHẦN 2: FIXTURES — Đọc từ .env, đăng nhập thật
# ============================

@pytest.fixture(scope="session")
def trading_credentials() -> dict:
    """
    Session-scoped fixture trả về credentials từ .env.
    NGHIÊM CẤM hardcode username/password — BẮT BUỘC đọc từ os.getenv().
    """
    username = os.getenv("TRADING_USERNAME")
    password = os.getenv("TRADING_PASSWORD")
    investor_id = os.getenv("TRADING_INVESTOR_ID", "")
    if not username or not password:
        pytest.fail("[CONFIG] Thiếu TRADING_USERNAME hoặc TRADING_PASSWORD trong .env")
    return {
        "username": username,
        "password": password,
        "investor_id": investor_id,
    }


@pytest.fixture(scope="session")
def trading_web_url(request) -> str:
    """
    Session-scoped fixture trả về Web URL từ .env.
    Ưu tiên: ISSUE_KEY_URL (per-feature-branch) → WEB_BASE_URL (dev/test ổn định).
    """
    issue_key = os.getenv("ISSUE_KEY", getattr(request.config, "workerinput", {}).get("ISSUE_KEY", ""))
    return resolve_web_url(issue_key if issue_key else None)


@pytest.fixture(scope="function")
def auth_page(page: Page, trading_web_url: str, trading_credentials: dict):
    """
    Fixture tiền điều kiện — Đăng nhập vào Trading Platform thật.

    ⚠️ QUY TRÌNH BẮT BUỘC KHI VIẾT MỚI SCRIPT:
    1. Navigate đến trading_web_url.
    2. Chụp screenshot để quan sát layout.
    3. Inspect DOM thật (qua discoverWebUILocators hoặc browser inspect) từng phần tử login.
    4. Xác nhận locator hoạt động thật rồi mới đưa vào LoginPage class.
    KHÔNG tự suy đoán hoặc dùng XPath tuyệt đối.
    """
    login_page = LoginPage(page)
    page.goto(f"{trading_web_url}/login")

    # Đăng nhập bằng credentials từ .env — KHÔNG hardcode
    login_page.login(
        username=trading_credentials["username"],
        password=trading_credentials["password"],
    )

    # Verify đăng nhập thành công (locator cần xác nhận qua DOM thật)
    expect(page.get_by_role("heading", name="Bảng giá trực tuyến")).to_be_visible(
        timeout=int(os.getenv("PLAYWRIGHT_TIMEOUT_MS", "30000"))
    )

    yield page

    # Teardown: Xóa cookies và storage state sau mỗi test
    page.context.clear_cookies()


# ============================
# PHẦN 3: TẦNG TEST & ASSERTIONS
# ============================

@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Đăng nhập thành công với tài khoản và mật khẩu hợp lệ")
def test_login_success(page: Page, trading_web_url: str, trading_credentials: dict):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario: Đăng nhập thành công với tài khoản và mật khẩu hợp lệ
      Given người dùng mở trang đăng nhập Trading Platform
      When nhập TRADING_USERNAME và TRADING_PASSWORD từ .env
      Then hệ thống chuyển hướng đến Dashboard "Bảng giá trực tuyến"

    ⚠️ LOCATOR NOTE: Xác thực locator qua DOM thật / discoverWebUILocators trước khi chạy.
    URL: Đọc từ WEB_BASE_URL hoặc ISSUE_KEY_URL trong .env.
    """
    # test-intent: Xác minh luồng đăng nhập thành công trên hệ thống thật
    login_page = LoginPage(page)
    page.goto(f"{trading_web_url}/login")

    # [ĐẦU VÀO] Credentials từ .env — KHÔNG hardcode
    login_page.login(
        username=trading_credentials["username"],
        password=trading_credentials["password"],
    )

    # [KẾT QUẢ] Web-First Auto-Retrying Assertion — không dùng time.sleep
    expect(page.get_by_role("heading", name="Bảng giá trực tuyến")).to_be_visible()


@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Hệ thống hiển thị thông báo lỗi khi đăng nhập không hợp lệ")
@pytest.mark.parametrize("username, password, error_keyword", [
    ("", "wrong_pass", "Tên đăng nhập không được để trống"),
    ("064CJJH8UF_invalid", "", "Mật khẩu không được để trống"),
    ("unknown_user", "wrong_pass", "Tài khoản hoặc mật khẩu không chính xác"),
])
def test_login_negative_data_driven(page: Page, trading_web_url: str, username, password, error_keyword):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario Outline: Hệ thống hiển thị thông báo lỗi khi đăng nhập không hợp lệ
      Given người dùng mở trang đăng nhập
      When nhập tên đăng nhập "<username>" và mật khẩu "<password>"
      Then hệ thống hiển thị thông báo lỗi chứa "<error_keyword>"
    """
    # test-intent: Kiểm tra negative cases đăng nhập — hệ thống thật, không mock
    login_page = LoginPage(page)
    page.goto(f"{trading_web_url}/login")

    # [ĐẦU VÀO] Dữ liệu đầu vào lỗi (parametrize từ decorator)
    login_page.login(username, password)

    # [KẾT QUẢ] Thông báo lỗi xuất hiện — auto-retry assertion
    expect(login_page.error_alert).to_be_visible()
    expect(login_page.error_alert).to_contain_text(error_keyword)


@pytest.mark.jira("G3PTP-17145")
@pytest.mark.scenario("Đặt lệnh mua cổ phiếu thành công trên giao diện Web")
def test_place_order_success(auth_page: Page, trading_web_url: str, valid_order_symbol: dict):
    """
    Gherkin Binding:
    Feature: G3PTP-17145.feature
    Scenario: Đặt lệnh mua cổ phiếu thành công trên giao diện Web
      Given người dùng đã đăng nhập thành công vào hệ thống
      When người dùng mở form đặt lệnh và đặt mua mã từ fixture Metabase
      Then hiển thị pop-up thông báo "Đặt lệnh thành công"

    ⚠️ DATA NOTE:
    - valid_order_symbol fixture lấy dữ liệu thật từ Metabase UAT (TimescaleDB).
    - TUYỆT ĐỐI KHÔNG hardcode mã CK hoặc giá vào test code.
    """
    # test-intent: E2E đặt lệnh thật trên giao diện Web với dữ liệu thị trường thực
    order_page = OrderPage(auth_page)
    auth_page.goto(f"{trading_web_url}/trading/order")

    # [ĐẦU VÀO] Lấy dữ liệu thật từ fixture Metabase UAT
    symbol = valid_order_symbol.get("symbol", os.getenv("TEST_ORDER_SYMBOL", "HPG"))
    price = float(valid_order_symbol.get("reference_price", os.getenv("TEST_ORDER_PRICE", "0")))
    qty = int(os.getenv("TEST_ORDER_QTY", "100"))

    # [HỆ THỐNG TRẢ RA] Đặt lệnh và xử lý dialog
    order_page.place_order(symbol=symbol, side="BUY", quantity=qty, price=price)
    order_page.confirm_modal_if_present()

    # [KẾT QUẢ] Xác minh pop-up thành công — auto-retry assertion
    expect(order_page.success_modal).to_be_visible()
