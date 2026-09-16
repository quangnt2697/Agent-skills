# ==========================================================
# File mẫu: Automation Test cho API & WebSocket
# ==========================================================
#
# NGUYÊN TẮC QUAN TRỌNG:
# - Các class/model trong file này CHỈ LÀ VÍ DỤ MINH HOẠ cấu trúc.
# - Khi triển khai thực tế, Agent BẮT BUỘC phải:
#   1. Pre-generation Code Recon: Quét workspace để tìm module Auth, Token, và WebSocket Client đã có sẵn (Rule 9)
#   2. Import trực tiếp code của developer thay vì viết lại từ đầu
#   3. TUYỆT ĐỐI KHÔNG MOCK TRÊN UAT: Bắt buộc gọi trực tiếp BASE_URL (openapi-uat) và WS_URL (ws-openapi-uat)
#   4. FULL REQUEST/RESPONSE LOGGING: Bọc qua LoggingSession / TestLogCollector để ghi lại đầy đủ
#      payload & response của 100% test case (cả PASSED và FAILED) vào test-output.log và report.md.
#   5. ORDER STATE MACHINE E2E (Rule 10): Khi test event lệnh, kết hợp API đặt lệnh + WebSocket subscribe +
#      ORS Admin Execution Report (POST /ors/accounts/{accountNo}/orders/{orderId}/reports) để verify chuỗi event.
#   6. Tạo Pydantic model dựa trên spec/Jira thực tế, KHÔNG copy mẫu này

#
# ==========================================================


# ============================
# PHẦN 1: CÁCH TÌM VÀ TÁI SỬ DỤNG CODE CÓ SẴN (CODE RECON GATE)
# ============================
#
# Trước khi viết bất kỳ class nào, Agent BẮT BUỘC thực hiện:
#
# Bước 1: Quét thư mục SDK Python chính thức: openapi-tyk/sdk/python/
#   - Tra cứu qua projects.json (key "openapi-tyk") hoặc biến OPENAPI_TYK_PATH hoặc đường dẫn tương đối
#   - Khảo sát:
#     + dnse/: DNSEClient (xác thực API Key/Secret, auto signing HMAC SHA256, version header)
#     + trading-api/: post_order, cancel_order, replace_order, get_ppse, get_balances
#     + marketdata-api/: get_security_definition, get_trades, get_ohlc
#     + websocket-trading/: TradingClient.subscribe_order_event()
#     + websocket-marketdata/: quote, trade, ohlc, expected_price
#     + examples/: Mẫu gọi thực tế
#   - Bổ sung vào pytest.ini: pythonpath = . steps ../../../openapi-tyk/sdk/python
#
# Bước 2: Quét codebase của Developer trong workspace
#   - Quét Auth & Signature: tìm các hàm login, get_token, HMAC SHA256 signer
#   - Quét API Client: tìm file `.py` chứa `requests`, `httpx`
#   - Quét WebSocket Client: tìm file chứa `websockets`, `websocket-client`, hàm `subscribe`, `msgpack`
#   - Tìm file có tên liên quan đến task Jira:
#     VD: task G3PTP-16810 về "event order" → tìm folder *websocket*, file *order*, *event_order*...
#
# Bước 3: Import và Kế thừa trực tiếp (CẤM viết lại từ đầu)
#   - from dnse import DNSEClient
#   - from src.services.order_api import OrderAPI
#   - from src.services.ws_client import WSClient
#
# Bước 4: Zero-Hardcode & .env Mandatory Rule
#   - Toàn bộ URLs, token, secret, account, symbol, price, quantity, timeouts BẮT BUỘC lưu ở .env
#   - Test script CHỈ gọi qua os.getenv(), TUYỆT ĐỐI KHÔNG hardcode trong script.


# ============================
# PHẦN 2: TẠO PYDANTIC MODEL TỪ SPEC THỰC TẾ
# ============================
#
# Model PHẢI được tạo dựa trên Response/Event Schema từ:
#   - Tài liệu Jira (spec, acceptance criteria)
#   - Swagger/OpenAPI definition
#   - Code có sẵn trong project (nếu developer đã định nghĩa DTO)
#
# VÍ DỤ MINH HOẠ (Agent thay thế bằng schema thực tế):

import pytest
import time
import uuid
import asyncio
from pydantic import BaseModel, Field, field_validator


# --- Ví dụ: Model tạo từ API spec của task cụ thể (Pydantic v2) ---
# Agent đọc spec → thấy API POST /orders trả về các field sau → tạo model

class ExampleRequestModel(BaseModel):
    """
    Ví dụ Request Model — Agent tạo model này dựa trên API spec thực tế.
    Dùng để validate request payload TRƯỚC khi gửi (Rule 3, Assertion #1).
    """
    symbol: str = Field(..., description="Mã chứng khoán")
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    quantity: int = Field(..., gt=0, description="Số lượng > 0")
    price: float = Field(..., gt=0)

class ExampleResponseModel(BaseModel):
    """
    Ví dụ Response Model — Agent tạo model này dựa trên API spec thực tế.
    Dùng để validate response schema (Rule 3, Assertion #3).
    """
    id: str
    status: str
    createdAt: str

class ExampleErrorModel(BaseModel):
    """Ví dụ Error Model — dùng cho negative test (Rule 3, Assertion #5)."""
    errorCode: str
    message: str
    details: str | None = None

class ExampleEventModel(BaseModel):
    """
    Ví dụ WebSocket Event Model — tạo từ Event Schema trong tài liệu Jira.
    Dùng Pydantic v2 để validate event payload (Rule 4, Assertion #2).
    """
    eventType: str
    timestamp: int

    @field_validator("timestamp", mode="after")
    @classmethod
    def timestamp_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Timestamp phải > 0")
        return v


# ============================
# PHẦN 3: API TEST — TÁI SỬ DỤNG CODE CÓ SẴN
# ============================
# Minh hoạ đủ 7 Assertions bắt buộc theo automation_rules.md

@pytest.fixture(scope="session")
def auth_token():
    """Đọc token từ .env, KHÔNG hardcode."""
    import os
    token = os.getenv("API_TOKEN")
    assert token, "API_TOKEN chưa được set trong .env"
    return token


@pytest.fixture
def api_service(auth_token):
    """
    Import class có sẵn của developer.
    Agent thay 'src.services.xxx' bằng đường dẫn thực tế tìm được.
    """
    # ↓↓↓ THAY THẾ bằng import và return thực tế từ workspace ↓↓↓
    from src.services.order_api import OrderAPI
    return OrderAPI(token=auth_token)


@pytest.fixture
def cleanup(api_service):
    """Teardown an toàn: dọn dẹp data rác sau test bằng try...finally."""
    created_ids = []
    yield created_ids
    for item_id in created_ids:
        try:
            api_service.delete(item_id)
        except Exception:
            # Ghi nhận log cảnh báo, không để teardown crash làm hỏng kết quả test
            pass


@pytest.mark.jira("G3PTP-XXXX")
@pytest.mark.scenario("Đặt lệnh thành công với toàn bộ dữ liệu hợp lệ")
def test_api_happy_path(api_service, cleanup):
    """
    Gherkin Binding:
    Feature: G3PTP-XXXX.feature
    Scenario: Đặt lệnh thành công với toàn bộ dữ liệu hợp lệ
      Given khách hàng có thông tin xác thực hợp lệ
      When gửi yêu cầu đặt lệnh mua cổ phiếu "VNM" với khối lượng "100" và giá "50000.0"
      Then hệ thống phản hồi mã trạng thái HTTP "201"
      And thông tin lệnh trả về có trạng thái "PendingNew"
    """
    # Arrange: Đọc tham số từ .env hoặc fixture (TUYỆT ĐỐI KHÔNG hardcode)
    import os
    unique = f"auto_api_test_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    symbol = os.getenv("TEST_ORDER_SYMBOL", "VNM")
    quantity = int(os.getenv("TEST_ORDER_QTY", "100"))
    price = float(os.getenv("TEST_ORDER_PRICE", "50000.0"))
    payload = {"symbol": symbol, "side": "BUY", "quantity": quantity, "price": price}

    # Assert 1: REQUEST SCHEMA — Pydantic v2 validate payload trước khi gửi
    request_model = ExampleRequestModel.model_validate(payload)

    # Act: Gọi hàm có sẵn của developer
    start = time.time()
    response = api_service.create(payload)
    elapsed_ms = (time.time() - start) * 1000

    # Teardown tracking
    if response.status_code == 201:
        cleanup.append(response.json().get("id"))

    # Assert 2: HTTP STATUS CODE
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"

    # Assert 3: RESPONSE SCHEMA — Pydantic v2 validate toàn bộ cấu trúc
    body = response.json()
    result = ExampleResponseModel.model_validate(body)

    # Assert 4: KEY BUSINESS FIELDS
    assert result.status == "PendingNew"

    # Assert 5: (Không áp dụng cho happy path — xem test negative bên dưới)

    # Assert 6: RESPONSE TIME / SLA
    assert elapsed_ms < 2000, f"Response quá chậm: {elapsed_ms:.0f}ms (SLA < 2000ms)"

    # Assert 7: HEADERS CHECK
    assert "application/json" in response.headers.get("content-type", "")


@pytest.mark.jira("G3PTP-XXXX")
@pytest.mark.scenario("Hệ thống từ chối yêu cầu khi thiếu trường bắt buộc")
@pytest.mark.parametrize("missing_field", ["symbol", "side", "quantity"])
def test_api_negative_missing_field(api_service, missing_field):
    """
    Gherkin Binding:
    Feature: G3PTP-XXXX.feature
    Scenario Outline: Hệ thống từ chối yêu cầu khi thiếu trường bắt buộc
      Given khách hàng có thông tin xác thực hợp lệ
      When gửi yêu cầu đặt lệnh thiếu trường "<missing_field>"
      Then hệ thống từ chối và trả về mã HTTP "400"
    """
    payload = {"symbol": "VNM", "side": "BUY", "quantity": 100, "price": 50000.0}
    del payload[missing_field]

    # Assert 1 (negative): Request thiếu field → gửi đi để test API validation
    response = api_service.create(payload)

    # Assert 2: HTTP STATUS CODE
    assert response.status_code == 400

    # Assert 5: ERROR RESPONSE DETAIL
    body = response.json()
    error = ExampleErrorModel.model_validate(body)
    assert error.errorCode is not None
    assert missing_field.lower() in error.message.lower()


# ============================
# PHẦN 4: WEBSOCKET TEST — TÁI SỬ DỤNG CODE CÓ SẴN
# ============================
# Minh hoạ: Schema validation, Timestamp sequence, Data Isolation

@pytest.fixture
async def ws_client(auth_token):
    """
    Import class WebSocket có sẵn của developer.
    Agent thay 'src.services.xxx' bằng đường dẫn thực tế tìm được.
    """
    # ↓↓↓ THAY THẾ bằng import thực tế từ workspace ↓↓↓
    from src.services.ws_client import WSClient
    client = WSClient(token=auth_token)
    await client.connect()
    try:
        yield client
    finally:
        await client.disconnect()


@pytest.mark.jira("G3PTP-XXXX")
@pytest.mark.scenario("Validate schema sự kiện WebSocket và tính tuần tự của timestamp")
@pytest.mark.asyncio
async def test_ws_event_schema_and_timestamp_sequence(ws_client):
    """
    Gherkin Binding:
    Feature: G3PTP-XXXX.feature
    Scenario: Validate schema sự kiện WebSocket và tính tuần tự của timestamp
      Given kết nối WebSocket đã được thiết lập thành công
      When hệ thống nhận các gói tin sự kiện đẩy về
      Then cấu trúc payload sự kiện phải khớp schema định nghĩa
      And timestamp của các sự kiện phát sinh sau phải lớn hơn sự kiện trước
    """
    events = []

    # Act: Nhận event bằng method có sẵn của developer (fail-fast timeout 5s)
    for _ in range(3):
        raw = await asyncio.wait_for(ws_client.receive_event(), timeout=5.0)
        # Assert: Validate Schema bằng Pydantic v2 model tạo từ spec
        event = ExampleEventModel.model_validate(raw)
        events.append(event)

    # Assert: Time-series validation — timestamp tăng dần
    for i in range(1, len(events)):
        assert events[i].timestamp > events[i - 1].timestamp, (
            f"Event [{i}] timestamp ({events[i].timestamp}) "
            f"phải lớn hơn event [{i-1}] ({events[i - 1].timestamp})"
        )


@pytest.mark.jira("G3PTP-XXXX")
@pytest.mark.scenario("Đảm bảo tính cô lập dữ liệu người dùng qua WebSocket")
@pytest.mark.asyncio
async def test_ws_data_isolation(auth_token):
    """
    Gherkin Binding:
    Feature: G3PTP-XXXX.feature
    Scenario: Đảm bảo tính cô lập dữ liệu người dùng qua WebSocket
      Given người dùng A và người dùng B cùng kết nối WebSocket
      When có sự kiện phát sinh dành riêng cho người dùng B
      Then chỉ người dùng B nhận được sự kiện
      And người dùng A không nhận được sự kiện của người dùng B
    """
    import os
    from src.services.ws_client import WSClient

    token_b = os.getenv("API_TOKEN_USER_B")
    client_a = WSClient(token=auth_token)
    client_b = WSClient(token=token_b)

    await client_a.connect()
    await client_b.connect()

    try:
        # User B nhận event
        event_b = await asyncio.wait_for(client_b.receive_event(), timeout=5.0)
        assert event_b is not None

        # User A KHÔNG nhận event nào trong 3 giây
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(client_a.receive_event(), timeout=3.0)
    finally:
        await client_a.disconnect()
        await client_b.disconnect()
