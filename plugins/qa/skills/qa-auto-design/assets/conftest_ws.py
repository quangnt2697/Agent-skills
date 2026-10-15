# ==========================================================
# conftest_ws.py — WebSocket Testing Fixtures & Client Helpers
# ==========================================================
# Cung cấp:
# 1. CLI options & session fixtures cho WebSocket (ws_url, ws_admin_url, ws_encoding)
# 2. WSClient tích hợp TestLogCollector.record_ws ghi log trung thực mọi frame
# 3. WSAdminClient gọi Admin API tra cứu kết nối, hạn mức stream, force disconnect
# 4. ws_client & ws_admin_client fixtures tái sử dụng trong test suite
# ==========================================================

import os
import json
import time
import asyncio
from typing import Optional, Dict, Any, List
import pytest
import requests

from .conftest_core import TestLogCollector

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
    def __init__(self, ws_url: str, api_key: str = None, token: str = None, collector: TestLogCollector = None):
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
        if self._collector:
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
        if self._collector:
            self._collector.record_ws("SUBSCRIBE_SEND", channel=channel, payload=payload)

        raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(raw)
        if self._collector:
            self._collector.record_ws("SUBSCRIBE_ACK", channel=channel, payload=data, latency_ms=elapsed_ms)
        return data

    async def receive_event(self, timeout: float = 10.0) -> dict:
        """Nhận 1 message/event từ socket với fail-fast timeout."""
        start = time.perf_counter()
        raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(raw)
        if self._collector:
            channel_name = data.get("channel") or data.get("type", "EVENT")
            self._collector.record_ws("RECEIVE_EVENT", channel=channel_name, payload=data, latency_ms=elapsed_ms)
        return data

    async def drain_events(self, max_wait: float = 2.0) -> List[dict]:
        """Thu thập toàn bộ sự kiện đang dồn trong buffer cho tới khi yên ắng."""
        events = []
        while True:
            try:
                evt = await self.receive_event(timeout=max_wait)
                events.append(evt)
            except asyncio.TimeoutError:
                break
        return events

    async def close(self, code: int = 1000):
        """Đóng kết nối WebSocket an toàn."""
        if self._ws and not self._ws.closed:
            await self._ws.close(code=code)
            if self._collector:
                self._collector.record_ws("CLOSE", payload={"code": code})

# ==========================================================
# WS ADMIN CLIENT (Connection & Stream Limit Monitor)
# ==========================================================
class WSAdminClient:
    """Client tra cứu trạng thái kết nối WebSocket qua Admin API."""
    def __init__(self, admin_url: str = None, collector: TestLogCollector = None):
        self._admin_url = (admin_url or os.getenv("WS_ADMIN_URL", "")).rstrip("/")
        self._collector = collector
        self._session = requests.Session()

    def get_current_connections(self) -> List[Dict[str, Any]]:
        """Tra cứu danh sách kết nối hiện tại trên gateway."""
        if not self._admin_url:
            return []
        url = f"{self._admin_url}/monitor_current"
        start = time.perf_counter()
        resp = self._session.get(url, timeout=5)
        elapsed_ms = (time.perf_counter() - start) * 1000
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
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else data.get("connections", [])
        return []

# ==========================================================
# FIXTURES
# ==========================================================
@pytest.fixture
def ws_client(ws_url, api_key, auth_token, test_log_collector):
    """Fixture cung cấp WSClient được gắn sẵn collector."""
    client = WSClient(ws_url=ws_url, api_key=api_key, token=auth_token, collector=test_log_collector)
    yield client

@pytest.fixture(scope="session")
def ws_admin_client(ws_admin_url, test_log_collector):
    """Fixture cung cấp WSAdminClient."""
    return WSAdminClient(admin_url=ws_admin_url, collector=test_log_collector)
