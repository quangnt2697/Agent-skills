# ==========================================================
# fixtures_web_ui.py — Web Trading UI (Playwright) Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & credentials cho Web Trading Dashboard
# 2. Playwright Desktop Fixtures (Full HD 1920x1080, ignore_https_errors)
# 3. authenticated_page: Tự động đăng nhập vào Web Trading
# 4. locators: Tự động nạp bảng locator từ test/fixtures/locators.json
# ==========================================================

import os
import json
from pathlib import Path
from typing import Optional, Any, Dict
import pytest

# ==========================================================
# CLI OPTIONS REGISTRATION FOR WEB UI
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho Web UI."""
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

@pytest.fixture
def web_page(page, web_base_url):
    """Page cơ bản đã mở sẵn trang chủ Web Trading."""
    if web_base_url:
        page.goto(web_base_url)
    return page

@pytest.fixture
def authenticated_page(page, web_base_url, trading_username, trading_password, locators):
    """Page tự động hoàn tất đăng nhập vào Web Trading Dashboard."""
    if not web_base_url:
        return page

    page.goto(f"{web_base_url.rstrip('/')}/login")
    user_sel = locators.get("login", {}).get("username_input", "input[name='username'], input[type='text']")
    pass_sel = locators.get("login", {}).get("password_input", "input[name='password'], input[type='password']")
    btn_sel = locators.get("login", {}).get("submit_button", "button[type='submit']")

    if trading_username and trading_password:
        try:
            page.fill(user_sel, trading_username)
            page.fill(pass_sel, trading_password)
            page.click(btn_sel)
            page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"⚠️ Lỗi trong quá trình tự động đăng nhập Web UI: {e}")

    return page

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
