"""
File mẫu: Automation Test cho WebSocket — 8 Assertions chuẩn
==============================================================
NGUYÊN TẮC QUAN TRỌNG:
  - File này là VÍ DỤ MINH HOẠ cấu trúc 8 assertions WebSocket.
  - Khi triển khai thực tế, Agent BẮT BUỘC phải:
    1. Đọc code WebSocket client đã có sẵn trong workspace và tái sử dụng
    2. Tạo Pydantic Model từ Event Payload Schema trong spec/Jira, KHÔNG copy mẫu này
    3. Đọc WS_URL, API_KEY từ .env qua EnvConfig — KHÔNG hardcode

Sơ đồ 8 assertions cho mỗi test case WebSocket:
  [WS-1] Handshake & Auth        → kết nối thành công / từ chối đúng
  [WS-2] Subscribe ACK           → server phản hồi xác nhận subscribe
  [WS-3] Event Payload Schema    → cấu trúc JSON event khớp spec (Pydantic v2)
  [WS-4] Business Fields         → giá trị nghiệp vụ đúng (price, symbol, side...)
  [WS-5] Time-series Consistency → timestamp event tăng dần không lùi
  [WS-6] Data Isolation          → event kênh A không leak sang kênh B
  [WS-7] Fail-fast Timeout       → asyncio.wait_for, không hard sleep
  [WS-8] Close Frame & Cleanup   → teardown đóng socket sạch (yield fixture)
"""

import asyncio
import json
import time
import uuid
import pytest
import pytest_asyncio
from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ==========================================================
# PYDANTIC MODELS — Agent tạo từ Event Payload Schema trong spec
# ==========================================================

class ExampleSubscribeRequest(BaseModel):
    """Payload gửi lên để subscribe channel. Dùng cho Assertion [WS-2]."""
    action: str = Field(default="SUBSCRIBE")
    channel: str  # VD: "tick", "top_price", "order_event"
    symbol: Optional[str] = None  # bắt buộc với channel tick/top_price
    account_no: Optional[str] = None  # bắt buộc với channel order_event


class ExampleSubscribeACK(BaseModel):
    """Server phản hồi xác nhận subscribe. Dùng cho Assertion [WS-2]."""
    type: str = Field(..., pattern=r"^(SUBSCRIBED|ERROR)$")
    channel: str
    status: str
    message: Optional[str] = None


class ExampleTickEvent(BaseModel):
    """Event dữ liệu tick khớp lệnh realtime. Dùng cho Assertion [WS-3] & [WS-4]."""
    type: str = Field(default="TICK")
    symbol: str
    price: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    timestamp: int = Field(..., gt=0, description="Unix timestamp milliseconds")

    @field_validator("symbol", mode="after")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


# ==========================================================
# WEBSOCKET CLIENT — Agent thay bằng import client đã có trong workspace
# ==========================================================

class ExampleWSClient:
    """
    Ví dụ WS Client. Trong thực tế Agent BẮT BUỘC tìm và import
    client đã có sẵn trong project:

        from src.services.ws_client import WSClient   # <- dùng cái này
    """
    def __init__(self, ws_url: str, api_key: str):
        self._ws_url = ws_url
        self._api_key = api_key
        self._ws = None

    async def connect(self) -> bool:
        """
        [WS-1] Kết nối và xác thực. Trả về True nếu thành công.
        Raises: ConnectionRefusedError nếu auth thất bại.
        """
        import websockets
        self._ws = await websockets.connect(
            self._ws_url,
            extra_headers={"Authorization": f"Bearer {self._api_key}"},
            open_timeout=5,
        )
        return True

    async def subscribe(self, channel: str, symbol: str = None) -> dict:
        """
        [WS-2] Gửi subscribe và đợi ACK (timeout 5s).
        """
        payload = {"action": "SUBSCRIBE", "channel": channel}
        if symbol:
            payload["symbol"] = symbol
        await self._ws.send(json.dumps(payload))
        raw = await asyncio.wait_for(self._ws.recv(), timeout=5.0)
        return json.loads(raw)

    async def receive_event(self, timeout: float = 10.0) -> dict:
        """
        [WS-7] Nhận event với fail-fast timeout. KHÔNG hard sleep.
        """
        raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        return json.loads(raw)

    async def close(self, code: int = 1000):
        """[WS-8] Đóng kết nối sạch với close code chuẩn."""
        if self._ws and not self._ws.closed:
            await self._ws.close(code=code)


# ==========================================================
# FIXTURES — Session scoped auth, teardown yield
# ==========================================================

@pytest_asyncio.fixture
async def ws_client(ws_url, api_key):
    """
    [WS-8] Fixture với teardown yield — đảm bảo socket luôn được đóng sạch
    kể cả khi test fail.
    """
    client = ExampleWSClient(ws_url=ws_url, api_key=api_key)
    await client.connect()
    yield client
    # Teardown: đóng socket sau khi test xong
    try:
        await client.close(code=1000)
    except Exception:
        pass  # Không raise nếu socket đã bị đóng


# ==========================================================
# TEST CASES — 8 Assertions WebSocket đầy đủ
# ==========================================================

class TestTickWebSocket:
    """Kiểm thử WebSocket luồng dữ liệu tick realtime."""

    @pytest.mark.asyncio
    @pytest.mark.scenario("Kết nối và subscribe tick VNM thành công")
    @pytest.mark.jira("JIRA-456")
    @pytest.mark.happy_path
    @pytest.mark.smoke
    async def test_subscribe_tick_success(self, ws_client):
        """
        Given nhà đầu tư xác thực với API Key hợp lệ
        When kết nối WebSocket và subscribe kênh tick mã VNM
        Then server xác nhận subscribe và gửi event tick đúng cấu trúc
        """
        # [WS-1]: Handshake & Auth — fixture ws_client đã connect, không fail ở đây
        assert ws_client._ws is not None, "Kết nối WebSocket thất bại"

        # [WS-2]: Subscribe ACK — server phải phản hồi SUBSCRIBED
        ack_raw = await ws_client.subscribe(channel="tick", symbol="VNM")
        ack = ExampleSubscribeACK(**ack_raw)
        assert ack.type == "SUBSCRIBED", f"Subscribe ACK sai: {ack_raw}"
        assert ack.channel == "tick"

        # [WS-7]: Fail-fast Timeout — nhận event trong 10s
        event_raw = await ws_client.receive_event(timeout=10.0)

        # [WS-3]: Event Payload Schema — Pydantic v2 validate cấu trúc
        event = ExampleTickEvent(**event_raw)

        # [WS-4]: Business Fields — giá trị nghiệp vụ đúng
        assert event.symbol == "VNM"
        assert event.price > 0, "Giá tick phải > 0"
        assert event.quantity > 0, "Khối lượng tick phải > 0"
        assert event.side in ("BUY", "SELL")

    @pytest.mark.asyncio
    @pytest.mark.scenario("Timestamp các event tick tăng dần không lùi")
    @pytest.mark.jira("JIRA-456")
    @pytest.mark.happy_path
    async def test_tick_timestamp_time_series(self, ws_client):
        """
        Given nhà đầu tư đã subscribe kênh tick VNM
        When nhận nhiều event tick liên tiếp
        Then mỗi event có timestamp >= event trước (không lùi thời gian)

        [WS-5] Time-series Consistency
        """
        await ws_client.subscribe(channel="tick", symbol="VNM")

        events = []
        for _ in range(5):
            raw = await ws_client.receive_event(timeout=10.0)
            events.append(ExampleTickEvent(**raw))

        # [WS-5]: Timestamp phải tăng dần (không lùi)
        for i in range(1, len(events)):
            assert events[i].timestamp >= events[i - 1].timestamp, (
                f"Time-series vi phạm: event[{i}].timestamp ({events[i].timestamp}) "
                f"< event[{i-1}].timestamp ({events[i-1].timestamp})"
            )

    @pytest.mark.asyncio
    @pytest.mark.scenario("Event kênh VNM không leak sang kênh SSI")
    @pytest.mark.jira("JIRA-456")
    @pytest.mark.security
    async def test_tick_data_isolation(self, ws_url, api_key):
        """
        Given nhà đầu tư subscribe kênh tick SSI
        When nhận event từ kênh đó
        Then KHÔNG nhận được event của mã VNM (cross-symbol isolation)

        [WS-6] Data Isolation
        """
        import websockets
        client_ssi = ExampleWSClient(ws_url=ws_url, api_key=api_key)
        await client_ssi.connect()
        try:
            # Subscribe chỉ SSI
            await client_ssi.subscribe(channel="tick", symbol="SSI")

            # Nhận 10 events — tất cả phải là SSI, không được có VNM
            vnm_leak_count = 0
            for _ in range(10):
                try:
                    raw = await client_ssi.receive_event(timeout=5.0)
                    event = ExampleTickEvent(**raw)
                    if event.symbol == "VNM":
                        vnm_leak_count += 1
                except asyncio.TimeoutError:
                    break

            # [WS-6]: Data Isolation — không có event VNM trong kênh SSI
            assert vnm_leak_count == 0, (
                f"Data Isolation vi phạm: {vnm_leak_count} event VNM bị leak sang kênh SSI"
            )
        finally:
            # [WS-8]: Close Frame & Cleanup — teardown explicit nếu không dùng fixture
            await client_ssi.close(code=1000)

    @pytest.mark.asyncio
    @pytest.mark.scenario("Từ chối kết nối khi API Key không hợp lệ")
    @pytest.mark.jira("JIRA-456")
    @pytest.mark.security
    @pytest.mark.negative
    async def test_ws_connect_invalid_auth(self, ws_url):
        """
        Given người dùng có API Key sai/hết hạn
        When kết nối WebSocket
        Then server từ chối kết nối (raise exception)

        [WS-1] Handshake & Auth — negative case
        """
        import websockets
        invalid_client = ExampleWSClient(ws_url=ws_url, api_key="INVALID_KEY_12345")

        # [WS-7]: Fail-fast — không chờ lâu cho kết nối bị từ chối
        with pytest.raises((
            websockets.exceptions.InvalidStatusCode,
            websockets.exceptions.ConnectionClosedError,
            ConnectionRefusedError,
            OSError,
        )):
            await asyncio.wait_for(invalid_client.connect(), timeout=5.0)

    @pytest.mark.asyncio
    @pytest.mark.scenario("Kết nối bị đóng sạch sau khi test kết thúc")
    @pytest.mark.jira("JIRA-456")
    @pytest.mark.happy_path
    async def test_ws_close_frame_cleanup(self, ws_client):
        """
        Given kết nối WebSocket đang hoạt động
        When test kết thúc và fixture teardown chạy
        Then socket bị đóng với close code 1000 (Normal Closure)

        [WS-8] Close Frame & Cleanup — kiểm tra trạng thái trước teardown
        """
        # Verify socket đang open
        assert not ws_client._ws.closed, "Socket phải đang mở trước teardown"

        # Đóng chủ động và kiểm tra
        await ws_client.close(code=1000)
        assert ws_client._ws.closed, "Socket phải đã đóng sau close()"
