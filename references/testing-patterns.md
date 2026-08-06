# Testing Patterns Reference (Python: Pytest & Playwright)

Tài liệu tham khảo nhanh các mẫu code (patterns) dành cho kỹ sư Tự động hóa Kiểm thử (QA/SDET) sử dụng **Pytest** và **Playwright Python**. Các nguyên tắc thiết kế (Arrange-Act-Assert, naming conventions) áp dụng chung cho mọi bài toán kiểm thử, đặc biệt tối ưu cho domain **Tài chính - Ngân hàng - Chứng khoán**.

## Mục lục

- [Cấu trúc Test (Arrange-Act-Assert)](#cấu-trúc-test-arrange-act-assert)
- [Quy tắc Đặt tên Test](#quy-tắc-đặt-tên-test)
- [Mẫu Assertions Phổ biến](#mẫu-assertions-phổ-biến)
- [Xử lý Số thập phân (Tiền tệ)](#xử-lý-số-thập-phân-tiền-tệ)
- [Mẫu API Testing (REST)](#mẫu-api-testing-rest)
- [Mẫu WebSocket Testing](#mẫu-websocket-testing)
- [Mẫu UI E2E Testing (Playwright)](#mẫu-ui-e2e-testing-playwright)
- [Mocking & Bypassing trong Test](#mocking--bypassing-trong-test)
- [Anti-Patterns cần tránh](#anti-patterns-cần-tránh)

---

## Cấu trúc Test (Arrange-Act-Assert)

Mọi test case đều phải tuân thủ nghiêm ngặt 3 bước: Chuẩn bị (Arrange), Hành động (Act), Kiểm tra (Assert).

```python
def test_create_order_success(api_client, auth_token):
    # Arrange: Chuẩn bị dữ liệu và tiền kiện
    payload = {
        "symbol": "VND",
        "side": "buy",
        "quantity": 100,
        "price": 25.5
    }
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Act: Gọi API hoặc tương tác UI
    response = api_client.post("/api/v1/orders", json=payload, headers=headers)
    result = response.json()

    # Assert: Xác minh kết quả thực tế với mong đợi
    assert response.status_code == 201
    assert result["data"]["status"] == "pending"
    assert result["data"]["symbol"] == "VND"
```

---

## Quy tắc Đặt tên Test

Sử dụng định dạng `test_<chức_năng>_<điều_kiện>_<kết_quả>`:

```python
class TestOrderPlacement:
    def test_place_order_with_valid_balance_returns_success(self):
        pass

    def test_place_order_exceeds_balance_returns_insufficient_funds_error(self):
        pass

    def test_place_order_outside_trading_hours_returns_time_error(self):
        pass
```

---

## Mẫu Assertions Phổ biến

```python
# Bằng nhau (Equality)
assert result == expected
assert response.status_code == 200

# Chứa trong (Containment)
assert "error_message" in result
assert "Thành công" in page.content()

# Danh sách (Collections)
assert len(data_list) == 3
assert any(item["status"] == "active" for item in data_list)

# Kiểu dữ liệu (Type checking)
assert isinstance(result["balance"], float)

# Bắt Exception
import pytest
with pytest.raises(ValueError) as exc_info:
    process_transaction(invalid_data)
assert "Số tiền không hợp lệ" in str(exc_info.value)
```

---

## Xử lý Số thập phân (Tiền tệ)

Trong domain Tài chính, **TUYỆT ĐỐI KHÔNG** dùng `float` để so sánh số tiền do lỗi sai số nhị phân. Luôn dùng `Decimal`.

```python
from decimal import Decimal

def test_balance_deduction():
    # Arrange
    initial_balance = Decimal("10000.50")
    deduction = Decimal("100.10")
    expected_balance = Decimal("9900.40")
    
    # Act
    actual_balance = calculate_new_balance(initial_balance, deduction)
    
    # Assert
    assert actual_balance == expected_balance
```

---

## Mẫu API Testing (REST)

```python
import pytest
import requests

@pytest.fixture
def api_base_url():
    return "https://api-staging.bank.com"

class TestTransferAPI:
    def test_transfer_unauthorized_returns_401(self, api_base_url):
        response = requests.post(f"{api_base_url}/api/transfer", json={"amount": 100})
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    def test_transfer_success_deducts_balance(self, api_base_url, valid_token):
        headers = {"Authorization": f"Bearer {valid_token}"}
        payload = {"to_account": "123456789", "amount": 50000}
        
        response = requests.post(
            f"{api_base_url}/api/transfer", 
            json=payload, 
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["transaction_status"] == "SUCCESS"
        assert "transaction_id" in data
```

---

## Mẫu WebSocket Testing

Test luồng real-time (vd: đẩy giá cổ phiếu).

```python
import pytest
import asyncio
import websockets
import json

@pytest.mark.asyncio
async def test_websocket_price_stream():
    uri = "wss://stream-staging.stock.com/market"
    
    async with websockets.connect(uri) as websocket:
        # Subscribe vào mã cổ phiếu
        subscribe_msg = {"action": "subscribe", "symbol": "VN30"}
        await websocket.send(json.dumps(subscribe_msg))
        
        # Chờ và đọc bản tin trả về
        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        data = json.loads(response)
        
        # Assertions
        assert data["type"] == "price_update"
        assert data["symbol"] == "VN30"
        assert float(data["price"]) > 0
```

---

## Mẫu UI E2E Testing (Playwright)

Sử dụng Page Object Model (POM) và Auto-retrying assertions.

```python
# --- File: pages/login_page.py ---
class LoginPage:
    def __init__(self, page):
        self.page = page
        self.username_input = page.locator("input[name='username']")
        self.password_input = page.locator("input[name='password']")
        self.login_btn = page.locator("button[type='submit']")
        
    def login(self, username, password):
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.login_btn.click()

# --- File: tests/test_login.py ---
from playwright.sync_api import expect

def test_user_can_login_successfully(page):
    # Arrange
    login_page = LoginPage(page)
    page.goto("https://staging.bank.com/login")
    
    # Act
    login_page.login("testuser", "Password123!")
    
    # Assert (Sử dụng expect của Playwright để tự động đợi)
    dashboard_header = page.locator("h1:has-text('Tổng quan tài sản')")
    expect(dashboard_header).to_be_visible(timeout=5000)
    
    balance_amount = page.locator(".balance-amount")
    expect(balance_amount).not_to_be_empty()
```

---

## Mocking & Bypassing trong Test

Trong môi trường Test (Staging), thường xuyên phải bypass mã OTP hoặc mock dữ liệu từ 3rd-party.

```python
# Bypass OTP trên UI Test (Yêu cầu backend support "static OTP" cho account test)
def test_transfer_with_static_otp(page):
    page.locator("#otp-input-1").fill("1")
    page.locator("#otp-input-2").fill("2")
    page.locator("#otp-input-3").fill("3")
    page.locator("#otp-input-4").fill("4")
    page.locator("#otp-input-5").fill("5")
    page.locator("#otp-input-6").fill("6")
    page.locator("button:has-text('Xác nhận OTP')").click()
    
    expect(page.locator(".success-message")).to_be_visible()

# Mocking API Response (dùng pytest-mock / responses library)
import responses

@responses.activate
def test_kyc_third_party_timeout():
    # Giả lập bên thứ 3 trả về 504 Gateway Timeout
    responses.add(
        responses.POST, 
        "https://national-id-service.gov/verify",
        json={"error": "timeout"}, 
        status=504
    )
    
    response = requests.post("/api/kyc/verify", json={"id_number": "00123456789"})
    
    # Hệ thống của mình phải bắt được lỗi và trả về 503 cho App
    assert response.status_code == 503
    assert response.json()["message"] == "Hệ thống xác thực quốc gia đang gián đoạn"
```

---

## Anti-Patterns cần tránh

| Anti-Pattern | Vấn đề | Cách khắc phục |
|---|---|---|
| **Hard Sleep** (`time.sleep(5)`) | Làm chậm test, gây flaky test. | Dùng `expect(locator).to_be_visible()` hoặc `wait_for_condition`. |
| **Chia sẻ state giữa các test** | Test A fail làm Test B fail theo (Cascading failure). | Dùng Pytest Fixtures để setup/teardown data cho MỖI test case độc lập. |
| **Dùng `float` cho tiền tệ** | `0.1 + 0.2 = 0.30000000000000004` (Lỗi Assertion). | LUÔN dùng `from decimal import Decimal`. |
| **Lấy Locator theo Class ngẫu nhiên** | `.button-xyz-123` thay đổi mỗi lần build. | Dùng text, role (`get_by_role`), hoặc data-testid. |
| **Bỏ qua Assert Response Body** | Chỉ check status code 200 là không đủ an toàn. | Assert cả status code LẪN cấu trúc JSON trả về. |
