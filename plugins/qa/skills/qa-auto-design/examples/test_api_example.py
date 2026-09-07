"""
File mẫu: Automation Test cho REST API — 7 Assertions chuẩn
==============================================================
NGUYÊN TẮC QUAN TRỌNG:
  - File này là VÍ DỤ MINH HOẠ cấu trúc 7 assertions.
  - Khi triển khai thực tế, Agent BẮT BUỘC phải:
    1. Tái sử dụng class Service/Client đã có trong workspace
    2. Tạo Pydantic Model từ spec/Jira thực tế, KHÔNG copy model mẫu này
    3. Đọc credentials từ .env, KHÔNG hardcode

Sơ đồ 7 assertions cho mỗi test case API:
  [1] Request Schema  → validate payload trước khi gửi
  [2] Status Code     → kiểm tra HTTP code trả về
  [3] Response Schema → validate cấu trúc JSON response
  [4] Business Fields → kiểm tra logic nghiệp vụ (giá trị, trạng thái, tính toán)
  [5] Error Detail    → (kịch bản lỗi) message lỗi đúng spec
  [6] SLA             → response time < ngưỡng quy định
  [7] Headers         → Content-Type, CORS, Rate-Limit headers
"""

import time
import uuid
import pytest
from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ==========================================================
# PYDANTIC MODELS — Agent tạo dựa trên spec/Jira thực tế
# ==========================================================

class ExampleOrderRequest(BaseModel):
    """Request Model — định nghĩa từ API spec. Dùng cho Assertion [1]."""
    symbol: str = Field(..., min_length=2, max_length=10)
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    order_type: str = Field(default="LO", pattern=r"^(LO|MP|ATO|ATC)$")

    @field_validator("symbol", mode="after")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class ExampleOrderResponse(BaseModel):
    """Response Model — định nghĩa từ API spec. Dùng cho Assertion [3]."""
    order_id: str
    status: str = Field(..., pattern=r"^(PENDING|ACTIVE|FILLED|REJECTED)$")
    symbol: str
    quantity: int
    price: float
    created_at: str
    message: Optional[str] = None


class ExampleErrorResponse(BaseModel):
    """Error Response Schema — dùng cho Assertion [5]."""
    code: str
    message: str
    details: Optional[dict] = None


# ==========================================================
# SERVICE CLASS — Agent thay bằng import service đã có trong workspace
# ==========================================================

class ExampleOrderService:
    """
    Ví dụ Service Object. Trong thực tế Agent BẮT BUỘC tìm và import
    class Service đã có sẵn trong project thay vì viết lại class này.

    Ví dụ:
        from src.services.order_api import OrderAPI   # <- dùng cái này
    """
    def __init__(self, base_url: str, api_key: str):
        import requests
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        self._base_url = base_url

    def create_order(self, payload: dict) -> tuple:
        """
        Gửi request và trả về (status_code, body, headers, elapsed_ms).
        Service KHÔNG assert.
        """
        import requests
        start = time.perf_counter()
        resp = self._session.post(f"{self._base_url}/api/v1/orders", json=payload)
        elapsed_ms = (time.perf_counter() - start) * 1000
        try:
            body = resp.json()
        except Exception:
            body = {}
        return resp.status_code, body, dict(resp.headers), elapsed_ms


# ==========================================================
# TEST CASES — 7 Assertions đầy đủ
# ==========================================================

class TestCreateOrderAPI:
    """Kiểm thử API tạo lệnh chứng khoán. 1 scenario Gherkin = 1 method."""

    @pytest.mark.scenario("Tạo lệnh mua hợp lệ thành công")
    @pytest.mark.jira("JIRA-123")
    @pytest.mark.happy_path
    @pytest.mark.smoke
    def test_create_order_success(self, api_service, unique_prefix, valid_order_symbol, target_environment):
        """
        Given nhà đầu tư đã xác thực với API Key hợp lệ
        When đặt lệnh mua với mã và giá lấy từ fixture thực tế
        Then hệ thống tạo lệnh thành công và trả về order_id
        """
        # -- Arrange (Lấy mã và giá thật từ fixture do test-data-mcp cung cấp) --
        sym = valid_order_symbol["symbol"]
        price = float(valid_order_symbol["reference_price"])

        payload = {
            "symbol": sym, "side": "BUY",
            "quantity": 100, "price": price, "order_type": "LO",
            "client_ref": f"{unique_prefix}_ORDER",
        }

        # Assertion [1]: Request Schema — validate payload trước khi gửi
        req = ExampleOrderRequest(**payload)
        assert req.symbol == sym and req.quantity > 0

        # -- Act --
        status_code, body, headers, elapsed_ms = api_service.create_order(payload)

        # Assertion [2]: Status Code
        assert status_code == 200, f"Expected 200, got {status_code}. Body: {body}"

        # Assertion [3]: Response Schema — Pydantic raise nếu thiếu field
        resp = ExampleOrderResponse(**body)
        assert resp.order_id, "order_id không được rỗng"

        # Assertion [4]: Business Fields — giá trị nghiệp vụ đúng
        assert resp.symbol == sym
        assert resp.status in ("PENDING", "ACTIVE")
        assert resp.quantity == 100
        assert resp.price == price

        # Assertion [6]: SLA — response time < 2000ms
        assert elapsed_ms < 2_000, f"SLA vi phạm: {elapsed_ms:.0f}ms"

        # Assertion [7]: Headers
        assert "application/json" in headers.get("Content-Type", "")

    @pytest.mark.scenario("Từ chối tạo lệnh khi thiếu trường bắt buộc")
    @pytest.mark.jira("JIRA-123")
    @pytest.mark.negative
    @pytest.mark.parametrize("missing_field,expected_code", [
        ("symbol",   "MISSING_SYMBOL"),
        ("quantity", "MISSING_QUANTITY"),
        ("price",    "MISSING_PRICE"),
    ])
    def test_create_order_missing_field(self, api_service, missing_field, expected_code):
        """
        Given nhà đầu tư đã xác thực
        When đặt lệnh thiếu trường bắt buộc <missing_field>
        Then hệ thống trả về HTTP 400 và mã lỗi <expected_code>
        """
        base = {"symbol": "VNM", "side": "BUY", "quantity": 100, "price": 50_000.0}
        payload = {k: v for k, v in base.items() if k != missing_field}

        status_code, body, headers, elapsed_ms = api_service.create_order(payload)

        # Assertion [2]: Status Code
        assert status_code == 400, f"Expected 400, got {status_code}. Body: {body}"

        # Assertion [3]: Response Schema (Error format)
        error_resp = ExampleErrorResponse(**body)

        # Assertion [5]: Error Detail — code và message đúng spec
        assert error_resp.code == expected_code, (
            f"Expected error code '{expected_code}', got '{error_resp.code}'"
        )
        assert error_resp.message, "message lỗi không được rỗng"

        # Assertion [6]: SLA
        assert elapsed_ms < 2_000, f"SLA vi phạm: {elapsed_ms:.0f}ms"

        # Assertion [7]: Headers
        assert "application/json" in headers.get("Content-Type", "")

    @pytest.mark.scenario("Từ chối tạo lệnh khi không có Authorization header")
    @pytest.mark.jira("JIRA-123")
    @pytest.mark.security
    @pytest.mark.negative
    def test_create_order_unauthorized(self, base_url):
        """
        Given người dùng không có API Key hợp lệ
        When gọi API tạo lệnh không có header Authorization
        Then hệ thống trả về HTTP 401 Unauthorized
        """
        import requests
        start = time.perf_counter()
        resp = requests.post(f"{base_url}/api/v1/orders", json={
            "symbol": "VNM", "side": "BUY", "quantity": 100, "price": 50_000.0
        })
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Assertion [2]: Status Code
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

        # Assertion [3] + [5]: Response Schema & Error Detail
        body = resp.json()
        error_resp = ExampleErrorResponse(**body)
        assert error_resp.code in ("UNAUTHORIZED", "INVALID_TOKEN", "AUTH_REQUIRED")

        # Assertion [6]: SLA — auth reject phải nhanh < 500ms
        assert elapsed_ms < 500, f"Auth rejection quá chậm: {elapsed_ms:.0f}ms"
