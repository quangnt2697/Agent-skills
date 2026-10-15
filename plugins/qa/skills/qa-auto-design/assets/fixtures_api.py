# ==========================================================
# fixtures_api.py — REST OpenAPI, Dashboard BFF & ORS Admin Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & session credentials cho REST API & Dashboard
# 2. LoggingSession tích hợp HTTP interceptor tự động ghi log vào TestLogCollector
# 3. api_session & user_b_api_session fixtures cho kiểm thử đơn & đối ứng
# 4. dashboard_token: Auto authentication cache cho Dashboard OpenAPI (/api/v5/login)
# 5. OrsAdminClient & ors_admin_client fixture mô phỏng khớp lệnh UAT
# ==========================================================

import os
import json
import time
import urllib.request
from urllib.parse import urlparse
from typing import Optional, Any
from pathlib import Path
import pytest
import requests

# ==========================================================
# CLI OPTIONS REGISTRATION FOR REST & ORS ADMIN
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho REST API và ORS Admin."""
    options = [
        ("--base-url", os.getenv("BASE_URL", ""), "Base URL của OpenAPI Trading REST"),
        ("--api-key", os.getenv("API_KEY", ""), "API Key cho OpenAPI / WebSocket"),
        ("--api-secret", os.getenv("API_SECRET", ""), "API Secret cho OpenAPI / WebSocket"),
        ("--user-b-api-key", os.getenv("NORMAL_USER_API_KEY", os.getenv("VIP_USER_API_TOKEN", "")), "API Key cho User B (Data Isolation / Đối ứng UAT)"),
        ("--user-b-api-secret", os.getenv("NORMAL_USER_API_SECRET", os.getenv("VIP_USER_API_SECRET", "")), "API Secret cho User B"),
        ("--dashboard-url", os.getenv("DASHBOARD_URL", ""), "Dashboard BFF URL"),
        ("--dashboard-username", os.getenv("DASHBOARD_USERNAME", ""), "Tài khoản đăng nhập Dashboard"),
        ("--dashboard-password", os.getenv("DASHBOARD_PASSWORD", ""), "Mật khẩu đăng nhập Dashboard"),
        ("--ors-admin-url", os.getenv("ORS_ADMIN_URL", ""), "Base URL của ORS Admin Service (Login lấy JWT)"),
        ("--ors-fo-url", os.getenv("ORS_FO_URL", ""), "Base URL của ORS FO (Execution Report)"),
        ("--ors-admin-username", os.getenv("ORS_ADMIN_USERNAME", ""), "Username đăng nhập ORS Admin"),
        ("--ors-admin-password", os.getenv("ORS_ADMIN_PASSWORD", ""), "Mật khẩu đăng nhập ORS Admin"),
    ]
    for opt, default_val, help_text in options:
        try:
            parser.addoption(opt, action="store", default=default_val, help=help_text)
        except Exception:
            pass

# ==========================================================
# SESSION FIXTURES CHO CREDENTIALS & URLS
# ==========================================================
@pytest.fixture(scope="session")
def base_url(request):
    try:
        return request.config.getoption("--base-url") or os.getenv("BASE_URL", "")
    except Exception:
        return os.getenv("BASE_URL", "")

@pytest.fixture(scope="session")
def api_key(request):
    try:
        return request.config.getoption("--api-key") or os.getenv("API_KEY", "")
    except Exception:
        return os.getenv("API_KEY", "")

@pytest.fixture(scope="session")
def api_secret(request):
    try:
        return request.config.getoption("--api-secret") or os.getenv("API_SECRET", "")
    except Exception:
        return os.getenv("API_SECRET", "")

@pytest.fixture(scope="session")
def user_b_api_key(request):
    try:
        return request.config.getoption("--user-b-api-key") or os.getenv("NORMAL_USER_API_KEY", "")
    except Exception:
        return os.getenv("NORMAL_USER_API_KEY", "")

@pytest.fixture(scope="session")
def user_b_api_secret(request):
    try:
        return request.config.getoption("--user-b-api-secret") or os.getenv("NORMAL_USER_API_SECRET", "")
    except Exception:
        return os.getenv("NORMAL_USER_API_SECRET", "")

@pytest.fixture(scope="session")
def auth_token():
    return os.getenv("API_TOKEN", "")

@pytest.fixture(scope="session")
def auth_token_user_b():
    return os.getenv("API_TOKEN_USER_B", "")

@pytest.fixture(scope="session")
def dashboard_url(request):
    try:
        return request.config.getoption("--dashboard-url") or os.getenv("DASHBOARD_URL", "")
    except Exception:
        return os.getenv("DASHBOARD_URL", "")

@pytest.fixture(scope="session")
def dashboard_username(request):
    try:
        return request.config.getoption("--dashboard-username") or os.getenv("DASHBOARD_USERNAME", "")
    except Exception:
        return os.getenv("DASHBOARD_USERNAME", "")

@pytest.fixture(scope="session")
def dashboard_password(request):
    try:
        return request.config.getoption("--dashboard-password") or os.getenv("DASHBOARD_PASSWORD", "")
    except Exception:
        return os.getenv("DASHBOARD_PASSWORD", "")

@pytest.fixture(scope="session")
def ors_admin_url(request):
    try:
        return request.config.getoption("--ors-admin-url") or os.getenv("ORS_ADMIN_URL", "")
    except Exception:
        return os.getenv("ORS_ADMIN_URL", "")

@pytest.fixture(scope="session")
def ors_fo_url(request):
    try:
        return request.config.getoption("--ors-fo-url") or os.getenv("ORS_FO_URL", "")
    except Exception:
        return os.getenv("ORS_FO_URL", "")

@pytest.fixture(scope="session")
def ors_admin_username(request):
    try:
        return request.config.getoption("--ors-admin-username") or os.getenv("ORS_ADMIN_USERNAME", "")
    except Exception:
        return os.getenv("ORS_ADMIN_USERNAME", "")

@pytest.fixture(scope="session")
def ors_admin_password(request):
    try:
        return request.config.getoption("--ors-admin-password") or os.getenv("ORS_ADMIN_PASSWORD", "")
    except Exception:
        return os.getenv("ORS_ADMIN_PASSWORD", "")

# ==========================================================
# LOGGING SESSION (HTTP INTERCEPTOR)
# ==========================================================
class LoggingSession(requests.Session):
    """
    Subclass requests.Session tự động chặn (intercept) mọi cuộc gọi HTTP
    để ghi lại Header, Payload, Status Code, Latency, và Response Body vào TestLogCollector.
    """
    def __init__(self, base_url: str = "", collector: Optional[Any] = None):
        super().__init__()
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.collector = collector

    def request(self, method, url, *args, **kwargs):
        if self.base_url and not urlparse(url).scheme:
            url = f"{self.base_url}/{url.lstrip('/')}"

        headers = kwargs.get("headers", {}) or {}
        req_headers = {**self.headers, **headers}
        req_body = kwargs.get("json") or kwargs.get("data")

        start = time.perf_counter()
        try:
            resp = super().request(method, url, *args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000

            try:
                resp_body = resp.json()
            except Exception:
                resp_body = resp.text[:1000]

            if self.collector and hasattr(self.collector, "record_http"):
                self.collector.record_http(
                    method=method,
                    url=url,
                    headers=req_headers,
                    request_body=req_body,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    response_headers=dict(resp.headers),
                    response_body=resp_body
                )
            return resp
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            if self.collector and hasattr(self.collector, "record_http"):
                self.collector.record_http(
                    method=method,
                    url=url,
                    headers=req_headers,
                    request_body=req_body,
                    status_code=0,
                    response_time_ms=elapsed_ms,
                    response_headers={},
                    response_body={"error": str(e)}
                )
            raise

# ==========================================================
# API CLIENT FIXTURES
# ==========================================================
@pytest.fixture
def api_session(base_url, api_key, auth_token, test_log_collector):
    """Session HTTP cho User chính với LoggingInterceptor và Auth Header."""
    session = LoggingSession(base_url=base_url, collector=test_log_collector)
    if auth_token:
        session.headers["Authorization"] = f"Bearer {auth_token}"
    elif api_key:
        session.headers["X-API-KEY"] = api_key
    session.headers["Content-Type"] = "application/json"
    session.headers["Accept"] = "application/json"
    return session

@pytest.fixture
def user_b_api_session(base_url, user_b_api_key, auth_token_user_b, test_log_collector):
    """Session HTTP cho User B phục vụ test phân quyền chéo (IDOR) và giao dịch đối ứng."""
    session = LoggingSession(base_url=base_url, collector=test_log_collector)
    if auth_token_user_b:
        session.headers["Authorization"] = f"Bearer {auth_token_user_b}"
    elif user_b_api_key:
        session.headers["X-API-KEY"] = user_b_api_key
    session.headers["Content-Type"] = "application/json"
    session.headers["Accept"] = "application/json"
    return session

# ==========================================================
# DASHBOARD TOKEN AUTHENTICATION
# ==========================================================
@pytest.fixture(scope="session")
def dashboard_token(dashboard_url, dashboard_username, dashboard_password):
    """Lấy JWT token từ endpoint /api/v5/login của Dashboard BFF."""
    if not dashboard_url or not dashboard_username or not dashboard_password:
        return ""
    token_url = f"{dashboard_url.rstrip('/')}/api/v5/login"
    payload = json.dumps({"username": dashboard_username, "password": dashboard_password}).encode("utf-8")
    req = urllib.request.Request(
        token_url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("access_token") or data.get("data", {}).get("token", "")
    except Exception as e:
        print(f"⚠️ Lỗi xác thực Dashboard BFF {token_url}: {e}")
        return ""

# ==========================================================
# ORS ADMIN CLIENT (SIMULATION / ORDER MATCHING UAT)
# ==========================================================
class OrsAdminClient:
    """Client giao tiếp với ORS Admin Service để can thiệp trạng thái lệnh trên UAT."""
    def __init__(self, ors_admin_url: str, username: str = "", password: str = "", collector: Optional[Any] = None):
        self.base_url = ors_admin_url.rstrip("/") if ors_admin_url else ""
        self.username = username
        self.password = password
        self.collector = collector
        self._token = None

    def login(self) -> str:
        """Đăng nhập lấy JWT admin."""
        if not self.base_url or not self.username:
            return ""
        url = f"{self.base_url}/auth/login"
        resp = requests.post(url, json={"username": self.username, "password": self.password}, timeout=10)
        if resp.status_code == 200:
            self._token = resp.json().get("token") or resp.json().get("access_token")
            return self._token
        return ""

    def simulate_order_match(self, order_id: str, match_qty: int, match_price: float) -> dict:
        """Giả lập khớp lệnh thành công trên sàn UAT qua ORS Admin."""
        if not self._token:
            self.login()
        url = f"{self.base_url}/orders/simulate-match"
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}
        payload = {"order_id": order_id, "matched_quantity": match_qty, "matched_price": match_price}
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        return resp.json() if resp.status_code == 200 else {"status": "error", "code": resp.status_code}

@pytest.fixture(scope="session")
def ors_admin_client(ors_admin_url, ors_admin_username, ors_admin_password, test_log_collector):
    """Fixture cấp OrsAdminClient phục vụ kịch bản khớp lệnh hoặc hủy lệnh cưỡng chế."""
    client = OrsAdminClient(
        ors_admin_url=ors_admin_url,
        username=ors_admin_username,
        password=ors_admin_password,
        collector=test_log_collector
    )
    return client
