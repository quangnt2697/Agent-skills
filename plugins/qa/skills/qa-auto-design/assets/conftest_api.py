# ==========================================================
# conftest_api.py — REST API, OpenAPI Dashboard & ORS Admin Fixtures
# ==========================================================
# Cung cấp:
# 1. CLI options & session fixtures cho REST API & Dashboard
# 2. Token authentication cache cho Dashboard OpenAPI (/api/v5/login)
# 3. LoggingSession tích hợp HTTP interceptor tự động ghi log vào TestLogCollector
# 4. api_session & user_b_api_session fixtures cho kiểm thử đơn & đối ứng
# 5. OrsAdminClient & ors_admin_client fixture mô phỏng khớp lệnh UAT
# ==========================================================

import os
import json
import time
import urllib.request
from urllib.parse import urlparse
from pathlib import Path
import pytest
import requests

from .conftest_core import TestLogCollector

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

@pytest.fixture(scope="session")
def dashboard_auth_token(dashboard_url, dashboard_username, dashboard_password):
    """
    Đăng nhập Dashboard OpenAPI tự động để lấy Bearer token.
    Tích hợp cache cục bộ (~/.cache/dashboard_test_token_cache.json) tái sử dụng trong 45 phút.
    """
    if not dashboard_url or not dashboard_username or not dashboard_password:
        return None

    cache_file = Path.home() / ".cache" / "dashboard_test_token_cache.json"
    cache_key = f"{dashboard_username}@{dashboard_url}"

    if cache_file.exists():
        try:
            with open(cache_file, "r") as f:
                data = json.load(f)
                entry = data.get(cache_key)
                if entry and (time.time() - entry.get("timestamp", 0) < 2700):
                    return entry.get("token")
        except Exception:
            pass

    parsed = urlparse(dashboard_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    login_url = f"{origin}/api/v5/login"

    payload = json.dumps({
        "username": dashboard_username,
        "password": dashboard_password,
    }).encode("utf-8")

    req = urllib.request.Request(
        login_url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("token")
            if token:
                try:
                    cache_file.parent.mkdir(parents=True, exist_ok=True)
                    cache_data = {}
                    if cache_file.exists():
                        with open(cache_file, "r") as f:
                            cache_data = json.load(f)
                    cache_data[cache_key] = {"token": token, "timestamp": time.time()}
                    with open(cache_file, "w") as f:
                        json.dump(cache_data, f)
                except Exception:
                    pass
            return token
    except Exception as e:
        print(f"\n⚠️ Không thể lấy token Dashboard tại {login_url}: {e}")
        return None

# ==========================================================
# LOGGING SESSION (REST CLIENT INTERCEPTOR)
# ==========================================================
class LoggingSession:
    """Wrapper HTTP Session tích hợp Logging Interceptor cho TestLogCollector."""
    def __init__(self, collector: TestLogCollector = None, base_headers: dict = None):
        self._session = requests.Session()
        if base_headers:
            self._session.headers.update(base_headers)
        self.collector = collector

    def set_collector(self, collector: TestLogCollector):
        self.collector = collector

    def request(self, method: str, url: str, **kwargs):
        start = time.perf_counter()
        req_body = kwargs.get("json") or kwargs.get("data")
        resp = self._session.request(method, url, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        try:
            resp_body = resp.json()
        except Exception:
            resp_body = resp.text

        if self.collector:
            self.collector.record_http(
                method=method,
                url=url,
                headers=dict(self._session.headers),
                request_body=req_body,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp_body,
            )
        return resp

    def get(self, url, **kwargs): return self.request("GET", url, **kwargs)
    def post(self, url, **kwargs): return self.request("POST", url, **kwargs)
    def put(self, url, **kwargs): return self.request("PUT", url, **kwargs)
    def delete(self, url, **kwargs): return self.request("DELETE", url, **kwargs)

@pytest.fixture
def api_session(auth_token, test_log_collector):
    """Fixture cung cấp LoggingSession có sẵn Auth token và kết nối test_log_collector."""
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    return LoggingSession(collector=test_log_collector, base_headers=headers)

@pytest.fixture
def user_b_api_session(user_b_api_key, test_log_collector):
    """Fixture cung cấp LoggingSession cho User B (kiểm thử đối ứng UAT)."""
    headers = {"Content-Type": "application/json"}
    if user_b_api_key:
        headers["Authorization"] = f"Bearer {user_b_api_key}"
    return LoggingSession(collector=test_log_collector, base_headers=headers)

# ==========================================================
# ORS ADMIN CLIENT (Order Execution Report Simulator)
# ==========================================================
class OrsAdminClient:
    """Client gọi API ORS Admin UAT để giả lập các sự kiện khớp lệnh (Execution Reports)."""
    def __init__(self, admin_url: str = None, fo_url: str = None, collector=None):
        self._admin_url = (admin_url or os.getenv("ORS_ADMIN_URL", "")).rstrip("/")
        self._fo_url = (fo_url or os.getenv("ORS_FO_URL", "")).rstrip("/")
        self._session = requests.Session()
        self._token = None
        self._collector = collector

    def _resolve_prefix(self, is_derivative: bool = False, symbol: str = None) -> str:
        if is_derivative:
            return "/ors-derivative"
        if symbol:
            sym_upper = symbol.strip().upper()
            if (
                sym_upper.startswith(("VN30F", "GB05", "GB10"))
                or len(sym_upper) >= 8
                or (len(sym_upper) > 6 and any(c.isdigit() for c in sym_upper))
            ):
                return "/ors-derivative"
        return "/ors"

    def login(self, username: str = None, password: str = None) -> str:
        username = username or os.getenv("ORS_ADMIN_USERNAME", "")
        password = password or os.getenv("ORS_ADMIN_PASSWORD", "")
        if not username or not password:
            raise ValueError("ORS Admin login yêu cầu ORS_ADMIN_USERNAME và ORS_ADMIN_PASSWORD trong .env")
        resp = self._session.post(
            f"{self._admin_url}/admin-service/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code in (200, 201), f"ORS Admin login thất bại: {resp.text}"
        data = resp.json()
        self._token = data.get("token") or data.get("accessToken") or data.get("data", {}).get("token") or resp.text.strip('"')
        self._session.headers.update({"Authorization": f"Bearer {self._token}"})
        return self._token

    def get_orders(self, start: int = 0, end: int = 100, is_derivative: bool = False, symbol: str = None) -> list:
        if not self._token:
            self.login()
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        url = f"{self._fo_url}{prefix}/orders?_start={start}&_end={end}"
        start_time = time.perf_counter()
        resp = self._session.get(url)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="GET",
                url=url,
                headers=dict(self._session.headers),
                request_body=None,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text[:500],
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            return data if isinstance(data, list) else (data.get("data") or data.get("orders") or [])
        return []

    def get_order_detail(self, account_no: str, order_id: str | int, is_derivative: bool = False, symbol: str = None) -> dict:
        if not self._token:
            self.login()
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        order_id_str = str(order_id)
        url = f"{self._fo_url}{prefix}/accounts/{account_no}/orders/{order_id_str}"
        start_time = time.perf_counter()
        resp = self._session.get(url)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="GET",
                url=url,
                headers=dict(self._session.headers),
                request_body=None,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text[:500],
            )
        return resp.json() if resp.status_code in (200, 201) else {"status_code": resp.status_code, "text": resp.text}

    def find_order(self, client_ref: str = None, symbol: str = None, account_no: str = None, is_derivative: bool = False) -> dict:
        orders = self.get_orders(start=0, end=50, is_derivative=is_derivative, symbol=symbol)
        for o in orders:
            if client_ref and str(o.get("clOrdId")) == str(client_ref):
                return o
        for o in orders:
            if symbol and o.get("symbol") == symbol:
                if not account_no or str(o.get("accountNo")) == str(account_no):
                    return o
        return orders[0] if orders else {}

    def inject_execution_report(
        self,
        account_no: str,
        order_id: str | int,
        symbol: str,
        last_quantity: int,
        last_price: float,
        is_full_fill: bool = False,
        cl_ord_id: str = None,
        is_derivative: bool = False,
    ) -> dict:
        if not self._token:
            self.login()

        order_status = "Filled" if is_full_fill else "PartiallyFilled"
        order_id_str = str(order_id)
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        payload = {
            "clOrdId": str(cl_ord_id or order_id),
            "id": order_id,
            "symbol": symbol,
            "orderStatus": order_status,
            "lastQuantity": last_quantity,
            "lastPrice": last_price,
            "fillQuantity": "",
            "avgPrice": "",
            "execType": "F",
            "execId": "",
        }
        url = f"{self._fo_url}{prefix}/accounts/{account_no}/orders/{order_id_str}/reports"
        start_time = time.perf_counter()
        resp = self._session.post(url, json=payload)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        if self._collector:
            self._collector.record_http(
                method="POST",
                url=url,
                headers=dict(self._session.headers),
                request_body=payload,
                status_code=resp.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(resp.headers),
                response_body=resp.text,
            )
        return resp.json() if resp.text and resp.status_code in (200, 201) else {"status_code": resp.status_code, "text": resp.text}

@pytest.fixture(scope="session")
def ors_admin_client(ors_admin_url, ors_fo_url, ors_admin_username, ors_admin_password, test_log_collector):
    """Fixture khởi tạo và login ORS Admin Client."""
    client = OrsAdminClient(admin_url=ors_admin_url, fo_url=ors_fo_url, collector=test_log_collector)
    try:
        client.login(username=ors_admin_username, password=ors_admin_password)
    except Exception as e:
        print(f"⚠️ ORS Admin Client login warning: {e}")
    return client
