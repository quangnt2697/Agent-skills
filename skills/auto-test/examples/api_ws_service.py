# ==========================================================
# File mẫu: Automation Test cho API & WebSocket
# ==========================================================
#
# NGUYÊN TẮC QUAN TRỌNG:
# - Các class/model trong file này CHỈ LÀ VÍ DỤ MINH HOẠ cấu trúc.
# - Khi triển khai thực tế, Agent BẮT BUỘC phải:
#   1. Quét workspace để tìm code API/WS đã có sẵn (Rule 1.2)
#   2. Import trực tiếp code của developer thay vì viết lại
#   3. Tạo Pydantic model dựa trên spec/Jira thực tế, KHÔNG copy mẫu này
#
# ==========================================================


# ============================
# PHẦN 1: CÁCH TÌM VÀ TÁI SỬ DỤNG CODE CÓ SẴN
# ============================
#
# Trước khi viết bất kỳ class nào, Agent cần thực hiện:
#
# Bước 1: Quét workspace
#   - Tìm file `.py` chứa `requests`, `httpx`, `websockets`...
#   - Tìm file có tên liên quan đến task Jira
#     VD: task G3PTP-16810 về "event order" → tìm folder *websocket*,
#         file *order*, *event_order*...
#
# Bước 2: Đọc code tìm được
#   - Xác định class/function nào gọi API hoặc kết nối WS
#   - Xác định interface: tên method, tham số, kiểu trả về
#
# Bước 3: Import trực tiếp
#   - from src.services.order_api import OrderAPI
#   - from src.services.ws_client import WSClient
#   - KHÔNG viết lại class mới nếu đã có sẵn
#
# Bước 4: Chỉ bổ sung khi cần
#   - Chỉ thêm wrapper/helper nếu code có sẵn thiếu method cụ thể
#   - VD: developer có hàm connect() nhưng thiếu subscribe_channel()
#         → Agent thêm 1 method nhỏ, KHÔNG viết lại toàn bộ class


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
from pydantic import BaseModel, Field, validator
from typing import Optional, List


# --- Ví dụ: Model tạo từ API spec của task cụ thể ---
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
    details: Optional[str] = None

class ExampleEventModel(BaseModel):
    """
    Ví dụ WebSocket Event Model — tạo từ Event Schema trong tài liệu Jira.
    Dùng để validate event payload (Rule 4, Assertion #2).
    """
    eventType: str
    timestamp: int

    @validator("timestamp")
    def timestamp_must_be_positive(cls, v):
        assert v > 0, "Timestamp phải > 0"
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
    """Teardown: dọn dẹp data rác sau test."""
    created_ids = []
    yield created_ids
    for item_id in created_ids:
        api_service.delete(item_id)


def test_api_happy_path(api_service, cleanup):
    """
    Minh hoạ đủ 7 Assertions cho API test.
    Agent thay thế tên method, payload, expected values
    theo spec thực tế của task.
    """
    # Arrange: Sinh dữ liệu động
    unique = f"auto_api_test_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    payload = {"symbol": "VNM", "side": "BUY", "quantity": 100, "price": 50000.0}

    # Assert 1: REQUEST SCHEMA — Validate payload trước khi gửi
    request_model = ExampleRequestModel(**payload)  # Raise nếu sai schema

    # Act: Gọi hàm có sẵn của developer
    start = time.time()
    response = api_service.create(payload)
    elapsed_ms = (time.time() - start) * 1000

    # Teardown tracking
    if response.status_code == 201:
        cleanup.append(response.json().get("id"))

    # Assert 2: HTTP STATUS CODE
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"

    # Assert 3: RESPONSE SCHEMA — Pydantic validate toàn bộ cấu trúc
    body = response.json()
    result = ExampleResponseModel(**body)

    # Assert 4: KEY BUSINESS FIELDS
    assert result.status == "PendingNew"

    # Assert 5: (Không áp dụng cho happy path — xem test negative bên dưới)

    # Assert 6: RESPONSE TIME / SLA
    assert elapsed_ms < 2000, f"Response quá chậm: {elapsed_ms:.0f}ms (SLA < 2000ms)"

    # Assert 7: HEADERS CHECK
    assert "application/json" in response.headers.get("content-type", "")


@pytest.mark.parametrize("missing_field", ["symbol", "side", "quantity"])
def test_api_negative_missing_field(api_service, missing_field):
    """
    Negative test: Request Schema sai → kiểm tra API trả lỗi đúng.
    Minh hoạ Assertion #1 (Request Schema negative) + #5 (Error Detail).
    """
    payload = {"symbol": "VNM", "side": "BUY", "quantity": 100, "price": 50000.0}
    del payload[missing_field]

    # Assert 1 (negative): Request thiếu field → gửi đi để test API validation
    response = api_service.create(payload)

    # Assert 2: HTTP STATUS CODE
    assert response.status_code == 400

    # Assert 5: ERROR RESPONSE DETAIL
    body = response.json()
    error = ExampleErrorModel(**body)
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
    yield client
    await client.disconnect()


@pytest.mark.asyncio
async def test_ws_event_schema_and_timestamp_sequence(ws_client):
    """
    Tái sử dụng WSClient có sẵn → chỉ viết Assertions.
    Minh hoạ: Schema validation + Timestamp tuần tự.
    """
    events = []

    # Act: Nhận event bằng method có sẵn của developer
    for _ in range(3):
        raw = await ws_client.receive_event(timeout=10.0)
        # Assert: Validate Schema bằng Pydantic model tạo từ spec
        event = ExampleEventModel(**raw)
        events.append(event)

    # Assert: Time-series validation — timestamp tăng dần
    for i in range(1, len(events)):
        assert events[i].timestamp > events[i - 1].timestamp, (
            f"Event [{i}] timestamp ({events[i].timestamp}) "
            f"phải lớn hơn event [{i-1}] ({events[i - 1].timestamp})"
        )


@pytest.mark.asyncio
async def test_ws_data_isolation(auth_token):
    """User A không được nhận event của User B."""
    import os
    from src.services.ws_client import WSClient

    token_b = os.getenv("API_TOKEN_USER_B")
    client_a = WSClient(token=auth_token)
    client_b = WSClient(token=token_b)

    await client_a.connect()
    await client_b.connect()

    # User B nhận event
    event_b = await client_b.receive_event(timeout=10.0)
    assert event_b is not None

    # User A KHÔNG nhận event nào trong 3 giây
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(client_a.receive_event(), timeout=3.0)

    await client_a.disconnect()
    await client_b.disconnect()
