"""
File mẫu: Automation Test cho WebSocket — 8 Assertions chuẩn & E2E Order State Transitions
========================================================================================
NGUYÊN TẮC QUAN TRỌNG:
  - File này là VÍ DỤ MINH HOẠ cấu trúc 8 assertions WebSocket và luồng chuyển trạng thái lệnh.
  - Khi triển khai thực tế, Agent BẮT BUỘC phải:
    1. Pre-generation Code Recon: Quét codebase để tái sử dụng module WebSocket client, channel helpers có sẵn
    2. TUYỆT ĐỐI KHÔNG MOCK TRÊN UAT: Bắt buộc kết nối trực tiếp vào WS_URL từ .env
    3. GHI LOG ĐẦY ĐỦ 100%: Tự động ghi lại toàn bộ Outgoing Action và Inbound Event của TẤT CẢ các test case
       (cả PASSED và FAILED) vào test-output.log và report.md qua TestLogCollector.
    4. E2E Order State Transition Testing: Khi test event lệnh, bắt buộc thiết kế song hành:
       Gọi REST API đặt/hủy lệnh $\rightarrow$ Lắng nghe và verify event chuyển trạng thái tương ứng.
    5. Đọc credentials và WS_URL từ .env, KHÔNG hardcode

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
import os
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


class ExampleOrderEvent(BaseModel):
    """
    Event thông báo trạng thái lệnh realtime từ kênh order_events.
    Dùng cho kiểm thử luồng chuyển trạng thái lệnh (Order State Transition).
    """
    type: str = Field(default="ORDER_EVENT")
    order_id: str
    account_no: str
    symbol: str
    status: str = Field(..., pattern=r"^(PendingNew|New|PartiallyFilled|Filled|Cancelled|Rejected|Replaced)$")
    order_type: str = Field(default="LO", pattern=r"^(LO|MP|ATO|ATC)$")
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    filled_quantity: int = Field(default=0, ge=0)
    timestamp: int = Field(..., gt=0)


class ExampleConditionalOrderEvent(BaseModel):
    """
    Event thông báo trạng thái lệnh điều kiện realtime từ kênh conditional_orders.
    Dùng cho kiểm thử luồng chuyển trạng thái lệnh điều kiện (Conditional Order State Transition).
    """
    type: str = Field(default="CONDITIONAL_ORDER_EVENT")
    order_id: str
    account_no: str
    symbol: str
    order_category: str = Field(default="STOP", pattern=r"^(STOP|OCO|TRAILING_STOP)$")
    status: str = Field(..., pattern=r"^(NEW|ACTIVATED|CANCELLED|CANCELLED_AFTER_TRIGGER|REJECTED|EXPIRED)$")
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)
    stop_price: Optional[float] = None
    target_order_id: Optional[str] = None
    timestamp: int = Field(..., gt=0)


# ==========================================================
# WEBSOCKET CLIENT — Agent thay bằng import client đã có trong workspace
# ==========================================================

class ExampleWSClient:
    """
    Ví dụ WS Client tích hợp Logging Collector. Trong thực tế Agent BẮT BUỘC tìm và import
    client đã có sẵn trong project thay vì viết lại class này:

        from src.services.ws_client import WSClient   # <- dùng cái này
    """
    def __init__(self, ws_url: str, api_key: str, collector=None):
        self._ws_url = ws_url
        self._api_key = api_key
        self._collector = collector
        self._ws = None

    async def connect(self) -> bool:
        """
        [WS-1] Kết nối và xác thực tới Real WS_URL UAT. Trả về True nếu thành công.
        """
        import websockets
        start = time.perf_counter()
        self._ws = await websockets.connect(
            self._ws_url,
            extra_headers={"Authorization": f"Bearer {self._api_key}"},
            open_timeout=5,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        if self._collector:
            self._collector.record_ws("CONNECT", url=self._ws_url, latency_ms=elapsed_ms)
        return True

    async def subscribe(self, channel: str, symbol: str = None, account_no: str = None) -> dict:
        """
        [WS-2] Gửi subscribe và đợi ACK (timeout 5s). Tự động ghi log.
        """
        payload = {"action": "SUBSCRIBE", "channel": channel}
        if symbol:
            payload["symbol"] = symbol
        if account_no:
            payload["account_no"] = account_no

        start = time.perf_counter()
        await self._ws.send(json.dumps(payload))
        if self._collector:
            self._collector.record_ws("SUBSCRIBE_SEND", channel=channel, payload=payload)

        raw = await asyncio.wait_for(self._ws.recv(), timeout=5.0)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(raw)
        if self._collector:
            self._collector.record_ws("SUBSCRIBE_ACK", channel=channel, payload=data, latency_ms=elapsed_ms)
        return data

    async def receive_event(self, timeout: float = 10.0) -> dict:
        """
        [WS-7] Nhận event với fail-fast timeout. Tự động ghi nhận vào TestLogCollector.
        """
        start = time.perf_counter()
        raw = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
        elapsed_ms = (time.perf_counter() - start) * 1000
        data = json.loads(raw)
        if self._collector:
            channel_name = data.get("channel") or data.get("type", "EVENT")
            self._collector.record_ws("RECEIVE_EVENT", channel=channel_name, payload=data, latency_ms=elapsed_ms)
        return data

    async def close(self, code: int = 1000):
        """[WS-8] Đóng kết nối sạch với close code chuẩn."""
        if self._ws and not self._ws.closed:
            await self._ws.close(code=code)
            if self._collector:
                self._collector.record_ws("CLOSE", payload={"code": code})


# ==========================================================
# ORS ADMIN CLIENT — Giả lập khớp lệnh UAT (Cơ sở & Phái sinh)
# ==========================================================

class OrsAdminClient:
    """
    Client gọi API ORS Admin UAT để giả lập các sự kiện khớp lệnh (Execution Reports)
    từ Sở Giao dịch về Core ORS cho cả CƠ SỞ (/ors) và PHÁI SINH (/ors-derivative).
    Tự động ghi nhận interaction vào TestLogCollector.
    """
    def __init__(self, admin_url: str = None, fo_url: str = None, collector=None):
        import os
        import requests
        self._admin_url = (admin_url or os.getenv("ORS_ADMIN_URL", "")).rstrip("/")
        self._fo_url = (fo_url or os.getenv("ORS_FO_URL", "")).rstrip("/")
        self._session = requests.Session()
        self._token = None
        self._collector = collector

    def _resolve_prefix(self, is_derivative: bool = False, symbol: str = None) -> str:
        """
        Xác định prefix endpoint theo loại chứng khoán:
        - Phái sinh: /ors-derivative (khi is_derivative=True hoặc mã phái sinh: VN30F..., GB05..., 41I1G9000...)
        - Cơ sở: /ors (mặc định)
        """
        if is_derivative:
            return "/ors-derivative"
        if symbol:
            sym_upper = symbol.strip().upper()
            if (
                sym_upper.startswith(("VN30F", "GB05", "GB10"))
                or len(sym_upper) >= 8  # Mã hợp đồng KRX phái sinh, VD: 41I1G9000
                or (len(sym_upper) > 6 and any(c.isdigit() for c in sym_upper))
            ):
                return "/ors-derivative"
        return "/ors"

    def login(self, username: str = None, password: str = None) -> str:
        """Đăng nhập lấy Bearer token của ORS Admin."""
        import os
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
        """
        Tra cứu danh sách orders trên ORS:
        - Cơ sở: GET /ors/orders?_start=0&_end=100
        - Phái sinh: GET /ors-derivative/orders?_start=0&_end=100
        """
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
        """
        Xem chi tiết lệnh:
        - Cơ sở: GET /ors/accounts/{accountNo}/orders/{orderId}
        - Phái sinh: GET /ors-derivative/accounts/{accountNo}/orders/{orderId}
        """
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
        """
        Tìm kiếm order trên ORS để lấy chính xác order_id (chuỗi ký tự hoặc số) và accountNo.
        Tự động chọn sổ lệnh Cơ sở hoặc Phái sinh theo cờ is_derivative hoặc mã symbol.
        """
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
        """
        Bắn Execution Report vào ORS để chuyển trạng thái lệnh sang PartiallyFilled hoặc Filled.
        - Tự động điều hướng:
          + Cơ sở: POST /ors/accounts/{accountNo}/orders/{orderId}/reports
          + Phái sinh: POST /ors-derivative/accounts/{accountNo}/orders/{orderId}/reports
        - order_id: có thể là chuỗi ký tự (string) hoặc số nguyên (int).
        - is_full_fill=False (lastQuantity < orderQuantity) -> PartiallyFilled
        - is_full_fill=True (lastQuantity == orderQuantity) -> Filled
        """
        if not self._token:
            self.login()

        order_status = "Filled" if is_full_fill else "PartiallyFilled"
        order_id_str = str(order_id)
        prefix = self._resolve_prefix(is_derivative=is_derivative, symbol=symbol)
        payload = {
            "clOrdId": str(cl_ord_id or order_id),
            "id": order_id,  # Có thể là chuỗi ký tự (str) hoặc số (int)
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




# ==========================================================
# FIXTURES — Session scoped auth, teardown yield
# ==========================================================

@pytest_asyncio.fixture
async def ws_client(ws_url, api_key, test_log_collector):
    """
    [WS-8] Fixture kết nối Real WS_URL UAT và tự động gắn test_log_collector.
    Teardown yield đóng socket sạch.
    """
    client = ExampleWSClient(ws_url=ws_url, api_key=api_key, collector=test_log_collector)
    await client.connect()
    yield client
    try:
        await client.close(code=1000)
    except Exception:
        pass


@pytest.fixture(scope="session")
def ors_admin_client(test_log_collector):
    """
    Fixture khởi tạo và login ORS Admin Client (tự động kế thừa từ .env: ORS_ADMIN_URL, ORS_FO_URL).
    Dùng để bắn Execution Reports giả lập khớp lệnh trên UAT.
    """
    import os
    import pytest
    admin_url = os.getenv("ORS_ADMIN_URL")
    fo_url = os.getenv("ORS_FO_URL")
    username = os.getenv("ORS_ADMIN_USERNAME")
    password = os.getenv("ORS_ADMIN_PASSWORD")

    if not all([admin_url, fo_url, username, password]):
        pytest.skip("Chưa cấu hình đầy đủ ORS Admin credentials trong .env")

    client = OrsAdminClient(admin_url=admin_url, fo_url=fo_url, collector=test_log_collector)
    client.login(username=username, password=password)
    return client


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


# ==========================================================
# TEST CASES CHUYỂN TRẠNG THÁI LỆNH (ORDER STATE MACHINE E2E)
# ==========================================================

class TestOrderEventsWebSocket:
    """
    Kiểm thử luồng chuyển trạng thái lệnh (Order State Transitions) qua WebSocket.
    Áp dụng mô hình Trigger - Listen - Verify:
    1. Kết nối WS & Subscribe kênh order_events
    2. Kích hoạt lệnh qua REST API
    3. Đón nhận và kiểm tra chuỗi event trạng thái (New -> Cancelled / Filled / Rejected)
    """

    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh mới sinh event New và hủy lệnh sinh event Cancelled")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_order_state_new_then_cancel(self, ws_client, base_url, api_session, valid_order_symbol, unique_id):
        """
        Given nhà đầu tư đã kết nối WebSocket và subscribe kênh order_events
        When gửi API đặt lệnh LO mua với giá sát sàn
        Then nhận event trạng thái New trên WebSocket
        When gửi API hủy lệnh vừa đặt
        Then nhận event trạng thái Cancelled trên WebSocket
        """
        sym = valid_order_symbol["symbol"]
        floor_price = float(valid_order_symbol["floor_price"])
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        # 1. Subscribe kênh order_event của tài khoản
        ack = await ws_client.subscribe(channel="order_events", account_no=test_account)
        assert ack.get("type") in ("SUBSCRIBED", "ACK"), f"Subscribe thất bại: {ack}"

        # 2. TRIGGER: Gọi REST API đặt lệnh LO giá sát sàn (chưa khớp ngay -> vào sổ New)
        order_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 100,
            "price": floor_price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_LO",
        }
        resp = api_session.post(f"{base_url}/api/v1/orders", json=order_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh thất bại: {resp.text}"
        order_id = resp.json().get("order_id", f"ORD_{unique_id}")

        # 3. LISTEN & VERIFY 1: Đón nhận event New qua WebSocket
        event_raw = await ws_client.receive_event(timeout=5.0)
        event_new = ExampleOrderEvent(**event_raw)
        assert event_new.order_id == order_id or event_new.symbol == sym
        assert event_new.status in ("PendingNew", "New"), f"Trạng thái không phải New: {event_new.status}"
        assert event_new.side == "BUY"
        assert event_new.price == floor_price

        # 4. TRIGGER: Gọi REST API Hủy lệnh
        cancel_resp = api_session.delete(f"{base_url}/api/v1/orders/{order_id}")
        assert cancel_resp.status_code in (200, 204), f"Hủy lệnh thất bại: {cancel_resp.text}"

        # 5. LISTEN & VERIFY 2: Đón nhận event Cancelled qua WebSocket
        cancel_event_raw = await ws_client.receive_event(timeout=5.0)
        cancel_event = ExampleOrderEvent(**cancel_event_raw)
        assert cancel_event.status == "Cancelled", f"Kỳ vọng Cancelled nhưng nhận: {cancel_event.status}"

    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh vi phạm biên độ giá sinh event Rejected")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.negative
    async def test_order_state_rejected_out_of_band(self, ws_client, base_url, api_session, valid_order_symbol, unique_id):
        """
        Given nhà đầu tư đã subscribe kênh order_events
        When cố tình đặt lệnh với giá vượt trần (ceiling_price + 2000)
        Then hệ thống OMS/Sở từ chối và đẩy event Rejected
        """
        sym = valid_order_symbol["symbol"]
        ceil_price = float(valid_order_symbol["ceiling_price"])
        invalid_price = ceil_price + 2000.0  # Vượt trần -> kích hoạt reject
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="order_events", account_no=test_account)

        order_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 100,
            "price": invalid_price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_REJECT",
        }
        # Gọi API - hệ thống có thể trả 400 hoặc 200 kèm event Rejected
        resp = api_session.post(f"{base_url}/api/v1/orders", json=order_payload)

        # Chờ event Rejected bắn về trên WebSocket nếu API tiếp nhận nhưng core reject
        if resp.status_code in (200, 202):
            event_raw = await ws_client.receive_event(timeout=5.0)
            event = ExampleOrderEvent(**event_raw)
            assert event.status == "Rejected", f"Kỳ vọng Rejected nhưng nhận: {event.status}"
        else:
            assert resp.status_code in (400, 422), f"Kỳ vọng HTTP lỗi nhưng nhận {resp.status_code}"

    @pytest.mark.asyncio
    @pytest.mark.scenario("Giả lập khớp 1 phần lệnh Cơ sở qua ORS Admin Execution Report sinh event PartiallyFilled")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_order_state_partially_filled_via_ors(
        self, ws_client, base_url, api_session, ors_admin_client, valid_order_symbol, unique_id
    ):
        """
        Kỹ thuật chuẩn trên UAT cho CƠ SỞ (Equities):
        1. User A đặt lệnh LO mua 200 cổ phiếu giá sàn -> Nhận event New (chờ khớp)
        2. Gọi API ORS Admin Cơ sở: POST /ors/accounts/{accountNo}/orders/{orderId}/reports
           với lastQuantity=100 (< 200) -> Giả lập Sở khớp 100 cổ
        3. WebSocket nhận event trạng thái PartiallyFilled (filled_quantity=100)
        """
        sym = valid_order_symbol["symbol"]
        floor_price = float(valid_order_symbol["floor_price"])
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="order_events", account_no=test_account)

        # 1. Đặt lệnh Mua 200 cổ giá sàn để vào sổ lệnh chờ
        order_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 200,
            "price": floor_price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_PF_ORS",
        }
        resp = api_session.post(f"{base_url}/api/v1/orders", json=order_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh mua thất bại: {resp.text}"
        order_id = resp.json().get("order_id", f"ORD_{unique_id}")

        # 2. Đón nhận event New trên WS
        event_raw = await ws_client.receive_event(timeout=5.0)
        event_new = ExampleOrderEvent(**event_raw)
        assert event_new.status in ("PendingNew", "New")

        # 3. TRIGGER: Tìm ID chính xác trong ORS Cơ Sở & Gọi ORS Admin Execution Report giả lập khớp 100 cổ (< 200)
        ors_order = ors_admin_client.find_order(client_ref=order_payload["client_ref"], symbol=sym, account_no=test_account, is_derivative=False)
        target_id = ors_order.get("id") or order_id
        target_account = ors_order.get("accountNo") or test_account

        ors_resp = ors_admin_client.inject_execution_report(
            account_no=target_account,
            order_id=target_id,
            symbol=sym,
            last_quantity=100,
            last_price=floor_price,
            is_full_fill=False,
            cl_ord_id=order_payload["client_ref"],
            is_derivative=False,
        )

        # 4. LISTEN & VERIFY: Đón nhận event PartiallyFilled trên WS
        event_pf_raw = await ws_client.receive_event(timeout=5.0)
        event_pf = ExampleOrderEvent(**event_pf_raw)
        assert event_pf.status == "PartiallyFilled", f"Kỳ vọng PartiallyFilled nhưng nhận: {event_pf.status}"
        assert event_pf.filled_quantity == 100

    @pytest.mark.asyncio
    @pytest.mark.scenario("Giả lập khớp toàn phần lệnh Cơ sở qua ORS Admin Execution Report sinh event Filled")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_order_state_filled_via_ors(
        self, ws_client, base_url, api_session, ors_admin_client, valid_order_symbol, unique_id
    ):
        """
        Kỹ thuật chuẩn trên UAT cho CƠ SỞ (Equities):
        1. User A đặt lệnh LO mua 100 cổ phiếu giá sàn -> Nhận event New
        2. Gọi API ORS Admin Cơ sở: POST /ors/accounts/{accountNo}/orders/{orderId}/reports
           với lastQuantity=100 (bằng full khối lượng đặt) -> Giả lập Sở khớp toàn phần
        3. WebSocket nhận event trạng thái Filled (filled_quantity=100)
        """
        sym = valid_order_symbol["symbol"]
        floor_price = float(valid_order_symbol["floor_price"])
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="order_events", account_no=test_account)

        # 1. Đặt lệnh Mua 100 cổ
        order_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 100,
            "price": floor_price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_FULL_ORS",
        }
        resp = api_session.post(f"{base_url}/api/v1/orders", json=order_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh mua thất bại: {resp.text}"
        order_id = resp.json().get("order_id", f"ORD_{unique_id}")

        # 2. Đón nhận event New trên WS
        await ws_client.receive_event(timeout=5.0)

        # 3. TRIGGER: Tìm ID chính xác trong ORS Cơ Sở & Gọi ORS Admin Execution Report khớp đủ 100 cổ (is_full_fill=True)
        ors_order = ors_admin_client.find_order(client_ref=order_payload["client_ref"], symbol=sym, account_no=test_account, is_derivative=False)
        target_id = ors_order.get("id") or order_id
        target_account = ors_order.get("accountNo") or test_account

        ors_admin_client.inject_execution_report(
            account_no=target_account,
            order_id=target_id,
            symbol=sym,
            last_quantity=100,
            last_price=floor_price,
            is_full_fill=True,
            cl_ord_id=order_payload["client_ref"],
            is_derivative=False,
        )

        # 4. LISTEN & VERIFY: Đón nhận event Filled trên WS
        event_filled_raw = await ws_client.receive_event(timeout=5.0)
        event_filled = ExampleOrderEvent(**event_filled_raw)
        assert event_filled.status == "Filled", f"Kỳ vọng Filled nhưng nhận: {event_filled.status}"
        assert event_filled.filled_quantity == 100

    @pytest.mark.asyncio
    @pytest.mark.scenario("Giả lập khớp 1 phần lệnh Phái sinh qua ORS Derivative Execution Report sinh event PartiallyFilled")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_derivative_order_state_partially_filled_via_ors(
        self, ws_client, base_url, api_session, ors_admin_client, unique_id
    ):
        """
        Kỹ thuật chuẩn trên UAT cho PHÁI SINH (Derivatives):
        1. User đặt lệnh phái sinh (ví dụ mã 41I1G9000 hoặc VN30F2409) -> Nhận event New
        2. Gọi API ORS Admin Phái sinh: POST /ors-derivative/accounts/{accountNo}/orders/{orderId}/reports
           với lastQuantity=1, lastPrice=2000 -> Giả lập Sở khớp 1 HĐ
        3. WebSocket nhận event trạng thái PartiallyFilled (filled_quantity=1)
        """
        sym = "41I1G9000"  # Mã hợp đồng tương lai phái sinh chuẩn KRX
        price = 2000.0
        derivative_account = "0335001078"

        await ws_client.subscribe(channel="order_events", account_no=derivative_account)

        # 1. Đặt lệnh phái sinh Mua 2 HĐ
        order_payload = {
            "account_no": derivative_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 2,
            "price": price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_DERIV_PF",
        }
        resp = api_session.post(f"{base_url}/api/v1/derivative/orders", json=order_payload)
        order_id = resp.json().get("order_id", f"ORD_DERIV_{unique_id}") if resp.status_code in (200, 201) else "896"

        # 2. Đón nhận event New trên WS
        event_raw = await ws_client.receive_event(timeout=5.0)
        event_new = ExampleOrderEvent(**event_raw)
        assert event_new.status in ("PendingNew", "New")

        # 3. TRIGGER: Tìm ID chính xác trong ORS Phái Sinh & Bắn Execution Report khớp 1 HĐ (< 2 HĐ)
        # Helper tự động nhận diện '41I1G9000' hoặc is_derivative=True để gọi endpoint /ors-derivative/...
        ors_order = ors_admin_client.find_order(
            client_ref=order_payload["client_ref"],
            symbol=sym,
            account_no=derivative_account,
            is_derivative=True
        )
        target_id = ors_order.get("id") or order_id
        target_account = ors_order.get("accountNo") or derivative_account

        ors_resp = ors_admin_client.inject_execution_report(
            account_no=target_account,
            order_id=target_id,
            symbol=sym,
            last_quantity=1,
            last_price=price,
            is_full_fill=False,
            cl_ord_id=order_payload["client_ref"],
            is_derivative=True,
        )

        # 4. LISTEN & VERIFY: Đón nhận event PartiallyFilled trên WS
        event_pf_raw = await ws_client.receive_event(timeout=5.0)
        event_pf = ExampleOrderEvent(**event_pf_raw)
        assert event_pf.status == "PartiallyFilled", f"Kỳ vọng PartiallyFilled nhưng nhận: {event_pf.status}"
        assert event_pf.filled_quantity == 1


    @pytest.mark.asyncio
    @pytest.mark.scenario("Khớp lệnh trên UAT bằng Lệnh Đối Ứng 2 Tài Khoản sinh event Filled (Phương Án Dự Phòng)")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_order_state_matching_cross_pair(self, ws_client, base_url, api_session, user_b_api_session, valid_order_symbol, unique_id):
        """
        Kỹ thuật giả lập khớp lệnh trên UAT (Dự phòng nếu engine sàn UAT có auto-match):
        - User B (Tài khoản bán) đặt lệnh Bán 100 cổ FPT giá P
        - User A (Tài khoản mua) subscribe WS và đặt lệnh Mua 100 cổ FPT giá P
        - Matching engine UAT khớp 2 lệnh -> User A nhận event Filled
        """
        sym = valid_order_symbol["symbol"]
        price = float(valid_order_symbol["reference_price"])
        test_account_a = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="order_events", account_no=test_account_a)

        # 1. User B đặt lệnh BÁN chờ
        sell_payload = {
            "symbol": sym, "side": "SELL", "quantity": 100, "price": price,
            "order_type": "LO", "client_ref": f"{unique_id}_SELL_B",
        }
        sell_resp = user_b_api_session.post(f"{base_url}/api/v1/orders", json=sell_payload)

        # 2. User A đặt lệnh MUA đối ứng cùng mức giá
        buy_payload = {
            "account_no": test_account_a,
            "symbol": sym, "side": "BUY", "quantity": 100, "price": price,
            "order_type": "LO", "client_ref": f"{unique_id}_BUY_A",
        }
        buy_resp = api_session.post(f"{base_url}/api/v1/orders", json=buy_payload)
        assert buy_resp.status_code in (200, 201), f"User A đặt mua thất bại: {buy_resp.text}"

        # 3. Lắng nghe event trên WebSocket của User A: New -> Filled (hoặc nhận thẳng Filled nếu khớp ngay)
        event_raw = await ws_client.receive_event(timeout=5.0)
        event = ExampleOrderEvent(**event_raw)
        assert event.status in ("New", "PartiallyFilled", "Filled")
        if event.status != "Filled":
            # Chờ tiếp event Filled nếu có event New trước
            event_filled_raw = await ws_client.receive_event(timeout=5.0)
            event_filled = ExampleOrderEvent(**event_filled_raw)
            assert event_filled.status == "Filled"
            assert event_filled.filled_quantity == 100


    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh sửa khối lượng/giá sinh event Replaced")
    @pytest.mark.jira("JIRA-789")
    @pytest.mark.happy_path
    async def test_order_state_replace_order(self, ws_client, base_url, api_session, valid_order_symbol, unique_id):
        """
        Given nhà đầu tư đã subscribe kênh order_events
        When đặt lệnh LO mua chờ khớp (giá sàn) -> nhận New
        When gọi PUT sửa giảm khối lượng (từ 200 xuống 100)
        Then nhận event trạng thái Replaced trên WebSocket
        """
        sym = valid_order_symbol["symbol"]
        floor_price = float(valid_order_symbol["floor_price"])
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="order_events", account_no=test_account)

        # 1. Đặt lệnh LO 200 cổ chờ khớp
        order_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 200,
            "price": floor_price,
            "order_type": "LO",
            "client_ref": f"{unique_id}_REP_ORIG",
        }
        resp = api_session.post(f"{base_url}/api/v1/orders", json=order_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh thất bại: {resp.text}"
        order_id = resp.json().get("order_id", f"ORD_{unique_id}")

        # 2. Đón New
        event_raw = await ws_client.receive_event(timeout=5.0)
        assert ExampleOrderEvent(**event_raw).status in ("PendingNew", "New")

        # 3. Sửa lệnh (giảm khối lượng xuống 100)
        replace_payload = {"quantity": 100, "price": floor_price}
        replace_resp = api_session.put(f"{base_url}/api/v1/orders/{order_id}", json=replace_payload)
        assert replace_resp.status_code in (200, 204), f"Sửa lệnh thất bại: {replace_resp.text}"

        # 4. Đón Replaced
        rep_event_raw = await ws_client.receive_event(timeout=5.0)
        rep_event = ExampleOrderEvent(**rep_event_raw)
        assert rep_event.status == "Replaced", f"Kỳ vọng Replaced nhưng nhận {rep_event.status}"
        assert rep_event.quantity == 100


# ==========================================================
# TEST CASES CHUYỂN TRẠNG THÁI LỆNH ĐIỀU KIỆN (CONDITIONAL ORDER STATE MACHINE)
# ==========================================================

class TestConditionalOrderEventsWebSocket:
    """
    Kiểm thử luồng chuyển trạng thái lệnh điều kiện (Conditional Orders) qua WebSocket:
    Kênh: conditional_orders
    Vòng đời trạng thái: NEW -> ACTIVATED / CANCELLED / CANCELLED_AFTER_TRIGGER / REJECTED / EXPIRED
    Kỹ thuật giả lập UAT:
    - Kích hoạt (ACTIVATED): Khớp chéo User B và C tại giá điều kiện để sinh tick thị trường
    - Hủy sau kích hoạt (CANCELLED_AFTER_TRIGGER): Hủy lệnh thường trên sàn sau khi lệnh điều kiện đã bắn
    - Từ chối khi kích hoạt (REJECTED): Rút cạn sức mua sau khi đặt lệnh điều kiện
    """

    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh điều kiện Stop Buy tạo mới (NEW) và hủy chủ động (CANCELLED)")
    @pytest.mark.jira("JIRA-890")
    @pytest.mark.happy_path
    async def test_conditional_order_state_new_then_cancel(self, ws_client, base_url, api_session, valid_order_symbol, unique_id):
        """
        Given nhà đầu tư subscribe kênh conditional_orders
        When đặt lệnh Stop Mua với stop_price vượt xa giá hiện tại
        Then nhận event trạng thái NEW trên WebSocket
        When gọi DELETE hủy lệnh điều kiện
        Then nhận event trạng thái CANCELLED trên WebSocket
        """
        sym = valid_order_symbol["symbol"]
        ceil_price = float(valid_order_symbol["ceiling_price"])
        test_account = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="conditional_orders", account_no=test_account)

        # 1. Đặt lệnh Stop Mua (giá kích hoạt bằng trần - chưa chạm)
        cond_payload = {
            "account_no": test_account,
            "symbol": sym,
            "side": "BUY",
            "quantity": 100,
            "order_category": "STOP",
            "stop_price": ceil_price,
            "order_type": "LO",
            "price": ceil_price,
            "client_ref": f"{unique_id}_COND_NEW",
        }
        resp = api_session.post(f"{base_url}/order-service/conditional-orders", json=cond_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh điều kiện thất bại: {resp.text}"
        cond_id = resp.json().get("order_id", f"COND_{unique_id}")

        # 2. Đón nhận event NEW
        event_raw = await ws_client.receive_event(timeout=5.0)
        cond_event = ExampleConditionalOrderEvent(**event_raw)
        assert cond_event.status == "NEW"
        assert cond_event.order_category == "STOP"

        # 3. Hủy lệnh điều kiện
        del_resp = api_session.delete(f"{base_url}/order-service/conditional-orders/{cond_id}")
        assert del_resp.status_code in (200, 204), f"Hủy lệnh điều kiện thất bại: {del_resp.text}"

        # 4. Đón nhận event CANCELLED
        del_event_raw = await ws_client.receive_event(timeout=5.0)
        del_event = ExampleConditionalOrderEvent(**del_event_raw)
        assert del_event.status == "CANCELLED"

    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh điều kiện kích hoạt thành công (ACTIVATED) qua tạo tick khớp chéo")
    @pytest.mark.jira("JIRA-890")
    @pytest.mark.happy_path
    async def test_conditional_order_state_activated_via_cross_tick(
        self, ws_client, base_url, api_session, user_b_api_session, valid_order_symbol, unique_id
    ):
        """
        Kỹ thuật giả lập kích hoạt lệnh điều kiện trên UAT:
        - User A đặt Stop Buy tại giá P_trigger (bằng giá tham chiếu)
        - User B (bán) và User A (hoặc tài khoản đối ứng khác) khớp 1 lệnh nhỏ tại P_trigger
        - MDDS sinh tick khớp -> Evaluator kích hoạt -> Bắn ACTIVATED trên kênh conditional_orders
        """
        sym = valid_order_symbol["symbol"]
        ref_price = float(valid_order_symbol["reference_price"])
        test_account_a = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="conditional_orders", account_no=test_account_a)

        # 1. User A đặt lệnh Stop Buy tại ref_price
        cond_payload = {
            "account_no": test_account_a,
            "symbol": sym,
            "side": "BUY",
            "quantity": 100,
            "order_category": "STOP",
            "stop_price": ref_price,
            "order_type": "LO",
            "price": ref_price,
            "client_ref": f"{unique_id}_COND_ACT",
        }
        resp = api_session.post(f"{base_url}/order-service/conditional-orders", json=cond_payload)
        assert resp.status_code in (200, 201), f"Đặt lệnh điều kiện thất bại: {resp.text}"

        # Đón NEW
        new_raw = await ws_client.receive_event(timeout=5.0)
        assert ExampleConditionalOrderEvent(**new_raw).status == "NEW"

        # 2. Tạo tick thị trường bằng khớp chéo User B bán tại ref_price
        sell_payload = {
            "symbol": sym, "side": "SELL", "quantity": 100, "price": ref_price,
            "order_type": "LO", "client_ref": f"{unique_id}_TICK_SELL",
        }
        user_b_api_session.post(f"{base_url}/api/v1/orders", json=sell_payload)

        # 3. Lắng nghe event ACTIVATED khi tick kích hoạt
        act_raw = await ws_client.receive_event(timeout=10.0)
        act_event = ExampleConditionalOrderEvent(**act_raw)
        assert act_event.status == "ACTIVATED", f"Kỳ vọng ACTIVATED nhưng nhận: {act_event.status}"
        assert act_event.target_order_id is not None, "Phải có target_order_id khi ACTIVATED"

    @pytest.mark.asyncio
    @pytest.mark.scenario("Hủy lệnh thường sau khi lệnh điều kiện kích hoạt sinh event CANCELLED_AFTER_TRIGGER")
    @pytest.mark.jira("JIRA-890")
    @pytest.mark.happy_path
    async def test_conditional_order_state_cancelled_after_trigger(
        self, ws_client, base_url, api_session, user_b_api_session, valid_order_symbol, unique_id
    ):
        """
        Given lệnh điều kiện của User A đã ACTIVATED và sinh target order trên sàn
        When User A gọi DELETE hủy target order trên sàn
        Then lệnh điều kiện cập nhật trạng thái CANCELLED_AFTER_TRIGGER
        """
        sym = valid_order_symbol["symbol"]
        ref_price = float(valid_order_symbol["reference_price"])
        test_account_a = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="conditional_orders", account_no=test_account_a)

        # 1. Đặt Stop Buy
        cond_payload = {
            "account_no": test_account_a, "symbol": sym, "side": "BUY", "quantity": 100,
            "order_category": "STOP", "stop_price": ref_price, "order_type": "LO", "price": ref_price,
            "client_ref": f"{unique_id}_COND_CAT",
        }
        resp = api_session.post(f"{base_url}/order-service/conditional-orders", json=cond_payload)
        await ws_client.receive_event(timeout=5.0)  # NEW

        # 2. Tạo tick kích hoạt
        user_b_api_session.post(f"{base_url}/api/v1/orders", json={
            "symbol": sym, "side": "SELL", "quantity": 100, "price": ref_price, "order_type": "LO",
        })

        # 3. Nhận ACTIVATED kèm target_order_id
        act_raw = await ws_client.receive_event(timeout=10.0)
        act_event = ExampleConditionalOrderEvent(**act_raw)
        assert act_event.status == "ACTIVATED"
        target_order_id = act_event.target_order_id

        # 4. Hủy target order trên sàn
        del_resp = api_session.delete(f"{base_url}/api/v1/orders/{target_order_id}")
        assert del_resp.status_code in (200, 204)

        # 5. Nhận CANCELLED_AFTER_TRIGGER
        cat_raw = await ws_client.receive_event(timeout=5.0)
        cat_event = ExampleConditionalOrderEvent(**cat_raw)
        assert cat_event.status == "CANCELLED_AFTER_TRIGGER"

    @pytest.mark.asyncio
    @pytest.mark.scenario("Lệnh điều kiện bị từ chối khi kích hoạt do cạn sức mua sinh event REJECTED")
    @pytest.mark.jira("JIRA-890")
    @pytest.mark.negative
    async def test_conditional_order_state_rejected_insufficient_margin(
        self, ws_client, base_url, api_session, user_b_api_session, valid_order_symbol, unique_id
    ):
        """
        Given User A đặt lệnh điều kiện Stop Mua
        When User A rút cạn toàn bộ sức mua (PP0 -> 0) bằng một lệnh mua khác
        When tick kích hoạt xuất hiện -> Lệnh điều kiện bắn ra sàn nhưng bị ORS từ chối vì thiếu tiền
        Then nhận event trạng thái REJECTED trên WebSocket conditional_orders
        """
        sym = valid_order_symbol["symbol"]
        ref_price = float(valid_order_symbol["reference_price"])
        test_account_a = os.getenv("ACCOUNT_NO", "SAMPLE_ACCOUNT_01")

        await ws_client.subscribe(channel="conditional_orders", account_no=test_account_a)

        # 1. Đặt Stop Buy
        cond_payload = {
            "account_no": test_account_a, "symbol": sym, "side": "BUY", "quantity": 100,
            "order_category": "STOP", "stop_price": ref_price, "order_type": "LO", "price": ref_price,
            "client_ref": f"{unique_id}_COND_REJ",
        }
        resp = api_session.post(f"{base_url}/order-service/conditional-orders", json=cond_payload)
        await ws_client.receive_event(timeout=5.0)  # NEW

        # 2. Rút cạn sức mua (PP0 -> 0)
        # Bằng cách đặt một lệnh thường mua mã cổ phiếu khác với khối lượng và giá lớn để phong tỏa toàn bộ tiền
        drain_payload = {
            "account_no": test_account_a, "symbol": "TCB", "side": "BUY", "quantity": 50000, 
            "price": 100000.0, "order_type": "LO", "client_ref": f"{unique_id}_DRAIN"
        }
        api_session.post(f"{base_url}/api/v1/orders", json=drain_payload)

        # 3. Tạo tick kích hoạt
        user_b_api_session.post(f"{base_url}/api/v1/orders", json={
            "symbol": sym, "side": "SELL", "quantity": 100, "price": ref_price, "order_type": "LO",
        })

        # 3. Khi Evaluator bắn lệnh đích vào ORS -> ORS trả 'cash not enough' -> Event REJECTED
        rej_raw = await ws_client.receive_event(timeout=10.0)
        rej_event = ExampleConditionalOrderEvent(**rej_raw)
        assert rej_event.status in ("REJECTED", "ACTIVATED")
        if rej_event.status == "ACTIVATED":
            final_raw = await ws_client.receive_event(timeout=5.0)
            final_event = ExampleConditionalOrderEvent(**final_raw)
            assert final_event.status == "REJECTED"
