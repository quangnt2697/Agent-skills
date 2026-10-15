# ==========================================================
# fixtures_ws.py — WebSocket Testing Fixtures & Client Helpers
# ==========================================================
# Cung cấp:
# 1. CLI options & session fixtures cho WebSocket (ws_url, ws_admin_url, ws_encoding)
# 2. WSClient tích hợp TestLogCollector.record_ws ghi log trung thực mọi frame/event
# 3. WSAdminClient gọi Admin API tra cứu kết nối, hạn mức stream, force disconnect
# 4. ws_client & ws_admin_client fixtures tái sử dụng trong test suite
# 5. ws_session_factory: Helper tạo nhiều kết nối song song kiểm tra biên MAX_CONNECTOR
# ==========================================================

import os
import json
import time
import asyncio
from typing import Optional, Dict, Any, List
from pathlib import Path
import pytest
import requests

# ==========================================================
# CLI OPTIONS REGISTRATION FOR WEBSOCKET
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký CLI options cho WebSocket."""
    options = [
        ("--ws-url", os.getenv("WS_URL", ""), "WebSocket URL của hệ thống giao dịch/datafeed"),
        ("--ws-admin-url", os.getenv("WS_ADMIN_URL", ""), "WebSocket Admin API URL (/monitor_current, v.v.)"),
        ("--ws-encoding", os.getenv("WS_ENCODING", "json"), "Định dạng mã hóa tin nhắn (json | msgpack)"),
    ]
    for opt, default_val, help_text in options:
        try:
            parser.addoption(opt, action="store", default=default_val, help=help_text)
        except Exception:
            pass

# ==========================================================
# SESSION FIXTURES CHO WEBSOCKET
# ==========================================================
@pytest.fixture(scope="session")
def ws_url(request):
    try:
        return request.config.getoption("--ws-url") or os.getenv("WS_URL", "")
    except Exception:
        return os.getenv("WS_URL", "")

@pytest.fixture(scope="session")
def ws_admin_url(request):
    try:
        return request.config.getoption("--ws-admin-url") or os.getenv("WS_ADMIN_URL", "")
    except Exception:
        return os.getenv("WS_ADMIN_URL", "")

@pytest.fixture(scope="session")
def ws_encoding(request):
    try:
        return request.config.getoption("--ws-encoding") or os.getenv("WS_ENCODING", "json")
    except Exception:
        return os.getenv("WS_ENCODING", "json")

# ==========================================================
# WS CLIENT WITH LOGGING COLLECTOR
# ==========================================================
class WSClient:
    """
    WebSocket Client phục vụ Automation Testing.
    Tự động ghi nhận mọi sự kiện CONNECT, SUBSCRIBE, RECEIVE_EVENT, CLOSE
    vào TestLogCollector để ghi 100% bằng chứng kiểm thử ra test-output.log.
    """
    def __init__(self, ws_url: str, api_key: str = None, token: str = None, collector: Optional[Any] = None):
        self._ws_url = ws_url
        self._api_key = api_key or os.getenv("API_KEY", "")
        self._token = token or os.getenv("API_TOKEN", "")
        self._collector = collector
        self._ws = None

    async def connect(self, timeout: float = 5.0) -> bool:
        """Kết nối và xác thực tới WebSocket server UAT."""
        import websockets
        headers = {}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        elif self._api_key:
            headers["X-API-KEY"] = self._api_key

        start = time.perf_counter()
        self._ws = await websockets.connect(
            self._ws_url,
            extra_headers=headers,
            open_timeout=timeout,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        if self._collector and hasattr(self._collector, "record_ws"):
            self._collector.record_ws("CONNECT", url=self._ws_url, latency_ms=elapsed_ms)
        return True

    async def subscribe(self, channel: str, symbol: str = None, account_no: str = None, timeout: float = 5.0) -> dict:
        """Gửi lệnh subscribe và đợi nhận ACK frame."""
        payload = {"action": "SUBSCRIBE", "channel": channel}
        if symbol:
            payload["symbol"] = symbol
        if account_no:
            payload["account_no"] = account_no

        start = time.perf_counter()
        await self._ws.send(json.dumps(payload))
        resp_raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(resp_raw)

        if self._collector and hasattr(self._collector, "record_ws"):
            self._collector.record_ws("SUBSCRIBE", url=self._ws_url, channel=channel, payload=data, latency_ms=elapsed_ms)
        return data

    async def receive_event(self, timeout: float = 10.0) -> dict:
        """Chờ nhận 1 frame sự kiện từ topic stream."""
        start = time.perf_counter()
        resp_raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(resp_raw)

        if self._collector and hasattr(self._collector, "record_ws"):
            self._collector.record_ws("RECEIVE_EVENT", url=self._ws_url, channel=data.get("topic"), payload=data, latency_ms=elapsed_ms)
        return data

    async def close(self):
        """Đóng kết nối an toàn."""
        if self._ws:
            await self._ws.close()
            if self._collector and hasattr(self._collector, "record_ws"):
                self._collector.record_ws("CLOSE", url=self._ws_url)

# ==========================================================
# WS ADMIN CLIENT (TRA CỨU MONITORING & HẠN MỨC)
# ==========================================================
class WSAdminClient:
    """Gọi WebSocket Admin REST API để tra cứu số connection, stream và ép ngắt socket."""
    def __init__(self, ws_admin_url: str, collector: Optional[Any] = None):
        self._url = ws_admin_url.rstrip("/") if ws_admin_url else ""
        self._collector = collector

    def get_monitor_current(self) -> dict:
        """Tra cứu trạng thái toàn bộ kết nối hiện tại."""
        if not self._url:
            return {}
        resp = requests.get(f"{self._url}/monitor_current", timeout=5)
        return resp.json() if resp.status_code == 200 else {}

    def get_user_connections(self, user_id: str) -> List[dict]:
        """Lấy danh sách các kết nối active của một user."""
        current = self.get_monitor_current()
        connections = current.get("connections", [])
        return [c for c in connections if c.get("user_id") == user_id]

    def force_disconnect(self, connection_id: str) -> bool:
        """Ngắt cưỡng bức một kết nối từ Admin để kiểm tra cơ chế Auto-Reconnect."""
        if not self._url:
            return False
        resp = requests.post(f"{self._url}/force_disconnect", json={"connection_id": connection_id}, timeout=5)
        return resp.status_code == 200

# ==========================================================
# PYTEST FIXTURES
# ==========================================================
@pytest.fixture
def ws_client(ws_url, api_key, auth_token, test_log_collector):
    """Fixture cấp WSClient có gắn TestLogCollector."""
    return WSClient(ws_url=ws_url, api_key=api_key, token=auth_token, collector=test_log_collector)

@pytest.fixture(scope="session")
def ws_admin_client(ws_admin_url, test_log_collector):
    """Fixture cấp WSAdminClient phục vụ kiểm tra hạn mức & test disconnect."""
    return WSAdminClient(ws_admin_url=ws_admin_url, collector=test_log_collector)

@pytest.fixture
def ws_session_factory(ws_url, api_key, auth_token, test_log_collector):
    """Factory hỗ trợ sinh N kết nối WebSocket đồng thời phục vụ test biên MAX_CONNECTOR."""
    clients = []

    def _create(custom_token: str = None) -> WSClient:
        tok = custom_token or auth_token
        c = WSClient(ws_url=ws_url, api_key=api_key, token=tok, collector=test_log_collector)
        clients.append(c)
        return c

    yield _create

    # Auto cleanup sau test case
    async def _cleanup_all():
        for c in clients:
            try:
                await c.close()
            except Exception:
                pass

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(_cleanup_all())
        else:
            loop.run_until_complete(_cleanup_all())
    except Exception:
        pass
