# ==========================================================
# conftest_template.py — Master Composite Reference Wrapper
# ==========================================================
# Tổng hợp và tái xuất (re-export) toàn bộ fixtures từ 5 modules:
# 1. conftest_core: Cơ chế nạp môi trường, logging interceptor, JIT data grounding
# 2. fixtures_api: REST OpenAPI client, Dashboard BFF token, ORS admin simulator
# 3. fixtures_ws: WebSocket client, stream monitor, watchdog
# 4. fixtures_web_ui: Playwright web desktop & locators loader
# 5. fixtures_mobile: Playwright mobile emulation & Appium native driver
#
# Đảm bảo 100% tính tương thích ngược cho các test suite kế thừa template cũ.
# ==========================================================

import pytest

# 1. Core Fixtures & Logging Hooks
from .conftest_core import (
    load_hierarchical_env,
    EnvConfig,
    TestLogCollector,
    test_log_collector,
    step,
    unique_id,
    target_environment,
    market_fixture,
    valid_order_symbol,
    order_book_fixture,
    pytest_runtest_makereport,
)

# 2. REST API & ORS Admin Fixtures
from .fixtures_api import (
    base_url,
    api_key,
    api_secret,
    user_b_api_key,
    user_b_api_secret,
    auth_token,
    auth_token_user_b,
    dashboard_url,
    dashboard_username,
    dashboard_password,
    dashboard_token,
    ors_admin_url,
    ors_fo_url,
    ors_admin_username,
    ors_admin_password,
    LoggingSession,
    api_session,
    user_b_api_session,
    OrsAdminClient,
    ors_admin_client,
)

# 3. WebSocket Fixtures
from .fixtures_ws import (
    ws_url,
    ws_admin_url,
    ws_encoding,
    WSClient,
    ws_client,
    WSAdminClient,
    ws_admin_client,
    ws_session_factory,
)

# 4. Web UI Fixtures
from .fixtures_web_ui import (
    web_base_url,
    trading_username,
    trading_password,
    trading_investor_id,
    web_api_token,
    browser_context_args,
    web_page,
    authenticated_page,
    locators,
)

# 5. Mobile Fixtures
from .fixtures_mobile import (
    mobile_context,
    mobile_page,
    appium_driver,
    MobileActions,
    mobile_actions,
)

# Đăng ký tổng hợp CLI options
def pytest_addoption(parser):
    from . import conftest_core, fixtures_api, fixtures_ws, fixtures_web_ui, fixtures_mobile
    conftest_core.pytest_addoption(parser)
    fixtures_api.pytest_addoption(parser)
    fixtures_ws.pytest_addoption(parser)
    fixtures_web_ui.pytest_addoption(parser)
    fixtures_mobile.pytest_addoption(parser)

__all__ = [
    "load_hierarchical_env",
    "EnvConfig",
    "TestLogCollector",
    "test_log_collector",
    "step",
    "unique_id",
    "target_environment",
    "market_fixture",
    "valid_order_symbol",
    "order_book_fixture",
    "pytest_runtest_makereport",
    "base_url",
    "api_key",
    "api_secret",
    "user_b_api_key",
    "user_b_api_secret",
    "auth_token",
    "auth_token_user_b",
    "dashboard_url",
    "dashboard_username",
    "dashboard_password",
    "dashboard_token",
    "ors_admin_url",
    "ors_fo_url",
    "ors_admin_username",
    "ors_admin_password",
    "LoggingSession",
    "api_session",
    "user_b_api_session",
    "OrsAdminClient",
    "ors_admin_client",
    "ws_url",
    "ws_admin_url",
    "ws_encoding",
    "WSClient",
    "ws_client",
    "WSAdminClient",
    "ws_admin_client",
    "ws_session_factory",
    "web_base_url",
    "trading_username",
    "trading_password",
    "trading_investor_id",
    "web_api_token",
    "browser_context_args",
    "web_page",
    "authenticated_page",
    "locators",
    "mobile_context",
    "mobile_page",
    "appium_driver",
    "MobileActions",
    "mobile_actions",
]
