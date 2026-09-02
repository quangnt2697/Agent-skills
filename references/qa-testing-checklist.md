# QA Testing Checklist

Quick reference for test design in securities, fintech, banking, and financial services domains. Use alongside the `qa-test-design` skill.

## Table of Contents

- [Do and Don't Writing Reference](#do-and-dont-writing-reference)
- [Boundary Value Analysis Tables](#boundary-value-analysis-tables)
- [Equivalence Partitioning Reference](#equivalence-partitioning-reference)
- [Financial Domain Validation Patterns](#financial-domain-validation-patterns)
- [Common API Testing Patterns](#common-api-testing-patterns)
- [Gherkin Step Vocabulary](#gherkin-step-vocabulary)

## Do and Don't Writing Reference

Checklist items must be actionable, atomic, and quantified.

### Checklist Item Writing

| Criteria                | ❌ Wrong                     | ✅ Right                                                                       |
|-------------------------|------------------------------|--------------------------------------------------------------------------------|
| **Validate Form**       | Check form đăng ký           | Nhập email thiếu "@", xác nhận hệ thống báo lỗi viền đỏ                        |
| **Giao Diện**           | Nút bấm hiển thị bình thường | Xác nhận nút "Đồng ý" hiển thị bo góc, kích thước 44px                         |
| **Tương Tác Máy**       | Test trên máy thật           | Thao tác vuốt từ mép trái sang phải trên iPhone 15 để quay lại                 |
| **Mạng Lưới**           | Test khi rớt mạng            | Tắt Wi-Fi/4G khi đang load, xác nhận app hiện pop-up "Mất kết nối"             |
| **Nghiệp vụ Tài chính** | Kiểm tra sức mua             | Xác nhận lệnh MUA bị từ chối khi khối lượng × giá vượt sức mua khả dụng (qmax) |
| **Performance**         | Load nhanh                   | Load dưới 2 giây trên kết nối 4G                                               |
| **Giá**                 | Giá hợp lệ                   | Xác nhận giá đặt nằm trong khoảng Giá Sàn (90,000) đến Giá Trần (110,000)      |

### Gherkin Step Writing

| Criteria          | ❌ Wrong                                                    | ✅ Right                                              |
|-------------------|-------------------------------------------------------------|-------------------------------------------------------|
| **Declarative**   | `Given người dùng nhấn nút đăng nhập, nhập user, nhập pass` | `Given người dùng đã đăng nhập với quyền "Broker"`    |
| **Observable**    | `Then hệ thống xử lý thành công`                            | `Then hệ thống trả về mã HTTP 200 và orderId hợp lệ`  |
| **Concrete data** | `When nhập giá trị "test"`                                  | `When nhập mã chứng khoán "VNM"`                      |
| **Single action** | `When đặt lệnh mua và kiểm tra sức mua`                     | `When đặt lệnh mua 500 cổ phiếu "SSI" tại giá 25,000` |
| **No DOM**        | `When click vào #btn-submit`                                | `When nhấn nút "Đặt lệnh"`                            |

## Boundary Value Analysis Tables

### Numeric Fields

For any numeric input with a valid range `[min, max]`:

| Test case        | Value             | Expected                         |
|------------------|-------------------|----------------------------------|
| Below minimum    | min - 1           | Reject                           |
| At minimum       | min               | Accept                           |
| Above minimum    | min + 1           | Accept                           |
| Nominal          | (min + max) / 2   | Accept                           |
| Below maximum    | max - 1           | Accept                           |
| At maximum       | max               | Accept                           |
| Above maximum    | max + 1           | Reject                           |
| Numeric Overflow | INT_MAX, LONG_MAX | Reject / Handle without crashing |
| Zero             | 0                 | Depends on domain                |
| Negative         | -1                | Reject (usually)                 |
| Empty / null     | (empty)           | Reject                           |

### String Fields

| Test case          | Value                         | Expected             |
|--------------------|-------------------------------|----------------------|
| Empty string       | `""`                          | Reject (if required) |
| Whitespace only    | `"   "`                       | Reject               |
| At min length      | `"a"` (minLength chars)       | Accept               |
| At max length      | `"a" × maxLength`             | Accept               |
| Exceeds max length | `"a" × (maxLength + 1)`       | Reject               |
| Special characters | `"<script>alert(1)</script>"` | Reject / sanitize    |
| Unicode            | `"Nguyễn Văn A"`              | Accept               |
| SQL injection      | `"'; DROP TABLE--"`           | Reject / sanitize    |

### Date/Time Fields

| Test case             | Value                                  | Expected         |
|-----------------------|----------------------------------------|------------------|
| Past date             | Yesterday                              | Depends on rules |
| Current date          | Today                                  | Accept           |
| Future date           | Tomorrow                               | Depends on rules |
| Invalid calendar date | 30/02, 31/04                           | Reject           |
| Leap year validation  | 29/02/2024 vs 29/02/2023               | Accept / Reject  |
| Format mismatch       | `DD-MM-YYYY` when expecting ISO 8601   | Reject           |
| Timezone handling     | With vs without `Z` or `+07:00` offset | Parse correctly  |

## Equivalence Partitioning Reference

Group inputs into classes where all values in the same class produce the same behavior. Test one value from each class.

### Securities Order Quantity Example

| Class                  | Range                         | Representative  | Expected   |
|------------------------|-------------------------------|-----------------|------------|
| Invalid (negative)     | < 0                           | -100            | Reject     |
| Invalid (zero)         | 0                             | 0               | Reject     |
| Invalid (not lot size) | 1-99 (not multiple of 100)    | 50              | Reject     |
| Valid (standard lot)   | 100-999,900 (multiple of 100) | 500             | Accept     |
| Invalid (exceeds max)  | > 999,900                     | 1,000,000       | Reject     |
| Invalid (decimal)      | Fractional                    | 100.5           | Reject     |

### Securities Price Example (for a stock with ref price 100,000)

| Class                   | Range            | Representative  | Expected                 |
|-------------------------|------------------|-----------------|--------------------------|
| Below floor (< -7%)     | < 93,000         | 92,000          | Reject                   |
| At floor (-7%)          | 93,000           | 93,000          | Accept                   |
| Valid range             | 93,000 - 107,000 | 100,000         | Accept                   |
| At ceiling (+7%)        | 107,000          | 107,000         | Accept                   |
| Above ceiling (> +7%)   | > 107,000        | 108,000         | Reject                   |
| Invalid tick (not step) | Not on tick grid | 93,050          | Reject (HOSE tick = 100) |

## Financial Domain Validation Patterns

### Securities Trading

| Validation            | Rule                                                                 | Test cases                                                         |
|-----------------------|----------------------------------------------------------------------|--------------------------------------------------------------------|
| **Trading hours**     | Orders only during market hours (09:00-11:30, 13:00-14:45 for HOSE)  | Before open, during session, during break, after close, on holiday |
| **Price limits**      | Floor/ceiling ±7% of reference price (HOSE)                          | At floor, below floor, at ceiling, above ceiling, at reference     |
| **Tick size**         | Price must be on tick grid (100đ for 10K-50K, 500đ for ≥50K at HOSE) | On tick, between ticks, at tick boundary                           |
| **Lot size**          | Quantity must be multiple of 100 (standard lot)                      | 100, 200, 50, 99, 101, 0                                           |
| **Buying power**      | quantity × price ≤ available balance (qmax)                          | Under limit, at limit, over limit                                  |
| **Account ownership** | Order account must match API key owner                               | Own account, other's account                                       |
| **Duplicate order**   | Prevent duplicate orders within time window                          | Same order twice, rapid fire                                       |

### Banking & Fintech

| Validation                 | Rule                                       | Test cases                                     |
|----------------------------|--------------------------------------------|------------------------------------------------|
| **Transfer limits**        | Daily/per-transaction limits by tier       | Under limit, at limit, over limit, cumulative  |
| **Account status**         | Account must be active, not frozen/closed  | Active, frozen, closed, pending                |
| **Currency precision**     | VND: 0 decimals, USD: 2 decimals           | Exact, extra decimals, negative                |
| **Beneficiary validation** | Recipient account must exist and be active | Valid, non-existent, closed, blocked           |
| **OTP/2FA**                | Required for transactions above threshold  | With valid OTP, expired OTP, wrong OTP, no OTP |
| **Idempotency**            | Same request ID must not process twice     | New ID, duplicate ID, empty ID                 |

## Common API Testing Patterns

### Authentication & Authorization Matrix

| Test               | Request                            | Expected         |
|--------------------|------------------------------------|------------------|
| No API key         | Remove `x-api-key` header          | 401 Unauthorized |
| Invalid API key    | `x-api-key: invalid_key_123`       | 401 Unauthorized |
| Expired API key    | Use revoked/expired key            | 401 Unauthorized |
| Missing signature  | Remove `signature` header          | 401 Unauthorized |
| Tampered signature | Modify payload after signing       | 401 Unauthorized |
| Wrong account      | Use accountNo not owned by API key | 403 Forbidden    |
| Valid credentials  | All headers correct                | 200 OK           |

### HTTP Method Validation

| Test           | Request                    | Expected               |
|----------------|----------------------------|------------------------|
| Wrong method   | `GET` on a `POST` endpoint | 405 Method Not Allowed |
| Invalid URL    | `POST /api/v1/nonexistent` | 404 Not Found          |
| Correct method | `POST /api/v1/orders`      | 200 OK                 |

### Payload Validation

| Test                   | Request body                   | Expected                               |
|------------------------|--------------------------------|----------------------------------------|
| Empty body             | `{}`                           | 400 Bad Request                        |
| Missing required field | Omit one required field        | 400 + field name in error              |
| Wrong data type        | String where number expected   | 400 + type mismatch error              |
| Extra unknown field    | Add `"unknown_field": "value"` | Ignored or 400 (depends on strictness) |
| Null required field    | `"price": null`                | 400 Bad Request                        |

### Query & Path Parameter Validation

| Test                      | Request                                  | Expected                         |
|---------------------------|------------------------------------------|----------------------------------|
| Path variable missing     | `GET /users//orders`                     | 404 Not Found or 400 Bad Request |
| Wrong path variable type  | `GET /users/abc/orders` (when ID is int) | 400 Bad Request                  |
| Query pagination overflow | `GET /orders?page=999999&limit=50`       | Empty list or 400 Bad Request    |
| Invalid filter/sort       | `GET /orders?sort=-nonexistent_field`    | 400 Bad Request                  |

### Concurrency, Rate Limiting & Idempotency

| Test                       | Action                                                 | Expected                                         |
|----------------------------|--------------------------------------------------------|--------------------------------------------------|
| Rate Limiting (Throttling) | Send requests exceeding limit (e.g. 100 req/s)         | 429 Too Many Requests                            |
| Race Condition             | Send N requests modifying same resource simultaneously | Process 1, others rejected or handled safely     |
| Idempotency                | Send 2 requests with the same `idempotency-key`        | Process 1st, return same cached response for 2nd |
| Payload Too Large          | Send a massive JSON payload                            | 413 Payload Too Large                            |

## Gherkin Step Vocabulary

Standard Vietnamese vocabulary for Gherkin steps in financial domains:

### Given (Preconditions)

```gherkin
Given người dùng đã đăng nhập với quyền "<role>"
Given hệ thống đang trong giờ giao dịch
Given tài khoản "<account>" có sức mua khả dụng "<amount>"
Given mã chứng khoán "<symbol>" có giá tham chiếu "<ref_price>"
Given khách hàng có thông tin xác thực hợp lệ
Given hệ thống đang hoạt động bình thường
```

### When (Actions)

```gherkin
When đặt lệnh "<side>" "<quantity>" cổ phiếu "<symbol>" tại giá "<price>"
When gửi request POST tới endpoint "<endpoint>"
When trường "<field>" được gán giá trị "<value>"
When thực hiện chuyển tiền "<amount>" từ "<from>" sang "<to>"
When xác nhận giao dịch bằng OTP "<otp>"
When gửi request không có header "<header_name>"
```

### Then (Assertions)

```gherkin
Then hệ thống trả về mã HTTP "<status_code>"
Then hệ thống từ chối request
Then hệ thống ghi nhận lệnh thành công với orderId hợp lệ
Then trả về thông báo lỗi "<error_message>"
Then số dư tài khoản giảm "<amount>"
Then response chứa trường "<field>" với giá trị "<value>"
Then hệ thống không xử lý giao dịch trùng lặp
```

## Symmetry Coverage Patterns

Khi spec đề cập nhiều phần tử UI hoặc giá trị nghiệp vụ có chung hành vi, phải bao phủ TẤT CẢ trong checklist và Gherkin. Đây là lỗi phổ biến nhất khi sinh feature file — chỉ test một trigger và bỏ qua các trigger đối xứng.

### Cách phát hiện nhóm đối xứng

| Dấu hiệu trong spec                       | Nhóm đối xứng   | Ví dụ                                            |
|-------------------------------------------|-----------------|--------------------------------------------------|
| Nhiều button cùng trigger một form/action | Buttons group   | Nút MUA / Nút BÁN cùng mở form đặt lệnh          |
| Nhiều tab cùng layout                     | Tabs group      | Tab "Lệnh thường" / Tab "Lệnh điều kiện"         |
| Nhiều loại lệnh/tài khoản                 | Values group    | Lệnh ATO / ATC / MOK / MAK                       |
| Nhiều trạng thái cùng hiển thị thông báo  | States group    | Chưa hoàn thiện / Chờ duyệt / Bị từ chối         |
| Thao tác trên nhiều sàn/thị trường        | Context group   | Sàn HOSE / HNX / UPCOM                           |
| Nhiều input method cùng kết quả           | Input group     | Nhấn nút +/- / Gõ phím số cùng chuyển về lệnh LO |

### Áp dụng trong Checklist (Phase 1)

```markdown
# ❌ Thiếu đối xứng — chỉ test một phần tử
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút MUA — [P0]

# ✅ Bao phủ đối xứng — test TẤT CẢ phần tử trong nhóm
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút MUA — [P0]
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút BÁN — [P0]
```

## WebSocket Testing Patterns

WebSocket là giao thức real-time hai chiều (bidirectional) giữa client và server. Test WebSocket yêu cầu verify cả connection lifecycle, message flow, và error handling.

### WebSocket Connection Lifecycle

```
[CLOSED] ──connect()──> [CONNECTING] ──handshake OK──> [OPEN]
                              │                          │
                              │                          │
                         handshake fail           close()/error
                              │                          │
                              ▼                          ▼
                          [CLOSED] <──────────────── [CLOSING]
```

### Test Coverage Checklist

#### 1. Connection & Handshake

| Test Case                 | Action                                    | Expected Result                       | Priority   |
|---------------------------|-------------------------------------------|---------------------------------------|------------|
| **Connect Success**       | Client connect tới ws://server/channel    | Connection OPEN, nhận welcome message | P0         |
| **Connect with Auth**     | Connect với valid token trong header      | Connection OPEN với user context      | P0         |
| **Connect Invalid URL**   | Connect tới ws://invalid                  | Connection CLOSED với error           | P1         |
| **Connect No Auth**       | Connect không có token (nếu require auth) | Connection REJECTED, status 401       | P0         |
| **Connect Expired Token** | Connect với expired token                 | Connection REJECTED, status 403       | P1         |

#### 2. Subscribe & Unsubscribe

| Test Case                     | Action                                              | Expected Result                                       | Priority  |
|-------------------------------|-----------------------------------------------------|-------------------------------------------------------|-----------|
| **Subscribe Channel**         | Send `{"action":"subscribe","channel":"VNINDEX"}`   | Receive `{"status":"subscribed","channel":"VNINDEX"}` | P0        |
| **Subscribe Multiple**        | Subscribe "VNM", "SSI", "VCB"                       | Nhận data từ cả 3 channels                            | P0        |
| **Unsubscribe Channel**       | Send `{"action":"unsubscribe","channel":"VNINDEX"}` | Stop nhận events từ channel đó                        | P0        |
| **Subscribe Invalid Channel** | Subscribe channel không tồn tại                     | Receive error `{"error":"INVALID_CHANNEL"}`           | P1        |
| **Subscribe Duplicate**       | Subscribe cùng channel 2 lần                        | Chỉ subscribe 1 lần (idempotent)                      | P2        |

#### 3. Receive Real-time Data

| Test Case               | Action                      | Expected Result                                        | Priority   |
|-------------------------|-----------------------------|--------------------------------------------------------|------------|
| **Receive Market Data** | Subscribe "VNM"             | Nhận price updates theo định dạng đúng                 | P0         |
| **Message Format**      | Parse message JSON          | Có đủ fields: `symbol`, `price`, `volume`, `timestamp` | P0         |
| **Message Order**       | Nhận 100 messages liên tiếp | Messages đúng thứ tự (timestamp tăng dần)              | P1         |
| **High Frequency**      | Server gửi 1000 msg/sec     | Client xử lý không bị drop message                     | P1         |
| **Large Message**       | Nhận message 10MB           | Client parse thành công                                | P2         |

#### 4. Reconnection & Resilience

| Test Case                       | Action                        | Expected Result                                   | Priority   |
|---------------------------------|-------------------------------|---------------------------------------------------|------------|
| **Auto Reconnect**              | Server close connection       | Client tự động reconnect sau 2-5s                 | P0         |
| **Resubscribe After Reconnect** | Reconnect thành công          | Client tự động resubscribe channels cũ            | P0         |
| **Reconnect with Backoff**      | Server reject 3 lần liên tiếp | Client retry với exponential backoff (2s, 4s, 8s) | P1         |
| **Max Reconnect Attempts**      | Server down 10 phút           | Client stop retry sau N attempts, show error      | P1         |
| **Network Switch**              | Switch từ WiFi sang 4G        | Connection drop → auto reconnect                  | P1         |

#### 5. Error Handling

| Test Case             | Action                                  | Expected Result                             | Priority   |
|-----------------------|-----------------------------------------|---------------------------------------------|------------|
| **Server Error**      | Server gửi `{"error":"INTERNAL_ERROR"}` | Client hiện notification, log error         | P0         |
| **Malformed Message** | Server gửi JSON invalid                 | Client log warning, bỏ qua message đó       | P1         |
| **Timeout**           | Server không respond trong 30s          | Client close connection, show timeout error | P1         |
| **Rate Limit**        | Client gửi > 100 msg/sec                | Server từ chối với `{"error":"RATE_LIMIT"}` | P2         |

#### 6. Cross-Channel Isolation

| Test Case                | Action                       | Expected Result                              | Priority   |
|--------------------------|------------------------------|----------------------------------------------|------------|
| **Channel Isolation**    | Subscribe "VNM" và "SSI"     | VNM events không xuất hiện trong SSI channel | P0         |
| **Unsubscribe One**      | Unsubscribe "VNM", giữ "SSI" | Chỉ stop nhận VNM, vẫn nhận SSI              | P0         |
| **Error in One Channel** | Error xảy ra ở channel A     | Channel B vẫn hoạt động bình thường          | P1         |

#### 7. Ping/Pong Heartbeat

| Test Case                   | Action                                    | Expected Result                                       | Priority   |
|-----------------------------|-------------------------------------------|-------------------------------------------------------|------------|
| **Heartbeat**               | Client gửi ping frame                     | Server respond pong frame trong 5s                    | P1         |
| **Detect Stale Connection** | Server không respond pong 3 lần liên tiếp | Client close connection, reconnect                    | P1         |
| **Client Idle**             | Client không gửi message 5 phút           | Server không close connection (server-initiated ping) | P2         |

### Gherkin Examples for WebSocket

#### Connection & Subscribe

```gherkin
Scenario: Subscribe to market data channel successfully
  Given WebSocket connection đã được thiết lập tới "ws://api.example.com/market"
  When client gửi message subscribe với channel "VNINDEX"
    """
    {"action": "subscribe", "channel": "VNINDEX"}
    """
  Then client nhận được confirmation message
    """
    {"status": "subscribed", "channel": "VNINDEX"}
    """
  And client bắt đầu nhận real-time market data từ channel "VNINDEX"

Scenario: Unsubscribe from channel
  Given client đã subscribe channel "VNM"
  When client gửi message unsubscribe
    """
    {"action": "unsubscribe", "channel": "VNM"}
    """
  Then client nhận confirmation
    """
    {"status": "unsubscribed", "channel": "VNM"}
    """
  And client không còn nhận data từ channel "VNM"
```

#### Reconnection

```gherkin
Scenario: Auto-reconnect after connection drop
  Given client đã subscribe channel "SSI"
  And client đang nhận real-time data
  When server đóng connection (simulate: network interruption)
  Then client phát hiện connection closed
  And client tự động reconnect trong vòng 5 giây
  And client tự động resubscribe channel "SSI"
  And client tiếp tục nhận data sau khi reconnect

Scenario: Exponential backoff on repeated failures
  Given client đang cố gắng connect
  When server reject connection lần 1
  Then client retry sau 2 giây
  When server reject connection lần 2
  Then client retry sau 4 giây
  When server reject connection lần 3
  Then client retry sau 8 giây
```

#### Error Handling

```gherkin
Scenario: Handle invalid channel subscription
  Given WebSocket connection đã OPEN
  When client subscribe channel không tồn tại "INVALID_SYMBOL"
  Then server trả về error message
    """
    {"error": "INVALID_CHANNEL", "message": "Channel không tồn tại"}
    """
  And connection vẫn OPEN (không bị close)

Scenario: Handle malformed message from server
  Given client đã subscribe channel "VNM"
  When server gửi message JSON invalid (corrupted data)
  Then client log warning "Received malformed message"
  And client bỏ qua message đó
  And client tiếp tục nhận messages tiếp theo bình thường
```

#### Cross-Channel Isolation

```gherkin
Scenario: Events from one channel do not leak to another
  Given client đã subscribe cả 2 channels: "VNM" và "SSI"
  When server gửi event cho channel "VNM"
    """
    {"channel": "VNM", "price": 50000, "volume": 1000}
    """
  Then client chỉ nhận event trong VNM handler
  And SSI handler KHÔNG nhận event này

Scenario: Error in one channel does not affect others
  Given client subscribe "VNM", "SSI", "VCB"
  When server gửi error cho channel "SSI"
    """
    {"channel": "SSI", "error": "DATA_UNAVAILABLE"}
    """
  Then client vẫn nhận data bình thường từ "VNM" và "VCB"
  And SSI channel được đánh dấu error state
```

### WebSocket Automation Test (Python Example)

```python
import pytest
import websocket
import json
import time

@pytest.fixture
def ws_connection():
    """Setup WebSocket connection."""
    ws = websocket.create_connection("ws://api.example.com/market")
    yield ws
    ws.close()

def test_subscribe_channel(ws_connection):
    """Test subscribe to market data channel."""
    ws = ws_connection
    
    # Send subscribe message
    subscribe_msg = {"action": "subscribe", "channel": "VNINDEX"}
    ws.send(json.dumps(subscribe_msg))
    
    # Receive confirmation
    response = json.loads(ws.recv())
    assert response["status"] == "subscribed"
    assert response["channel"] == "VNINDEX"
    
    # Receive first data message
    data = json.loads(ws.recv())
    assert "symbol" in data
    assert "price" in data

def test_reconnect_after_close(ws_connection):
    """Test auto-reconnect after connection drop."""
    ws = ws_connection
    
    # Subscribe first
    ws.send(json.dumps({"action": "subscribe", "channel": "VNM"}))
    ws.recv()  # confirmation
    
    # Close connection (simulate drop)
    ws.close()
    
    # Reconnect
    time.sleep(2)
    ws_new = websocket.create_connection("ws://api.example.com/market")
    
    # Resubscribe
    ws_new.send(json.dumps({"action": "subscribe", "channel": "VNM"}))
    response = json.loads(ws_new.recv())
    
    assert response["status"] == "subscribed"
    ws_new.close()

def test_invalid_channel_error(ws_connection):
    """Test error when subscribing invalid channel."""
    ws = ws_connection
    
    # Subscribe to invalid channel
    ws.send(json.dumps({"action": "subscribe", "channel": "INVALID"}))
    
    # Expect error response
    response = json.loads(ws.recv())
    assert "error" in response
    assert response["error"] == "INVALID_CHANNEL"
    
    # Connection should still be open
    assert ws.connected
```

### WebSocket Testing Tools

- **Python:** `websocket-client`, `pytest-asyncio`
- **JavaScript:** `ws` library, `jest` with `ws`
- **Postman:** WebSocket request support
- **Manual Testing:** Browser DevTools → Network → WS tab

### Common WebSocket Issues

| Issue                   | Symptom                     | Root Cause                            | Fix                        |
|-------------------------|-----------------------------|---------------------------------------|----------------------------|
| **Message Loss**        | Client miss events          | Network congestion                    | Add buffer, batch messages |
| **Duplicate Subscribe** | Receive duplicate data      | Client không track subscription state | Idempotent subscribe       |
| **Reconnect Loop**      | Connect/disconnect liên tục | Server reject, client retry ngay      | Exponential backoff        |
| **Memory Leak**         | Client memory tăng dần      | Event listeners không cleanup         | Unsubscribe on unmount     |
| **Stale Connection**    | No data received            | Connection idle too long              | Ping/pong heartbeat        |

### Áp dụng trong Gherkin (Phase 2)

Ưu tiên dùng `Scenario Outline` để gom các biến thể đối xứng, tránh duplicate scenario:

```gherkin
# ❌ Chỉ test một trigger
@happy-path @smoke
Scenario: Hệ thống mở rộng form đặt lệnh khi nhấn MUA
  Given hệ thống đang hiển thị bottom sheet thu gọn
  When người dùng nhấn nút "MUA"
  Then hệ thống mở rộng toàn bộ form đặt lệnh

# ✅ Bao phủ đối xứng bằng Scenario Outline
@happy-path @smoke
Scenario Outline: Hệ thống mở rộng form đặt lệnh khi nhấn nút <loại_lệnh>
  Given hệ thống đang hiển thị bottom sheet thu gọn chứa sức mua, gói vay, nút MUA và nút BÁN
  When người dùng nhấn nút "<loại_lệnh>"
  Then hệ thống mở rộng toàn bộ form đặt lệnh
  And tự động chọn tab "Lệnh thường"
  And tự động focus vào ô nhập giá và hiển thị keyboard custom
  And tự động điền và bôi đen "giá hiện tại" trong ô nhập giá

  Examples:
    | loại_lệnh  |
    | MUA        |
    | BÁN        |
```

### Quy tắc quyết định

| Câu hỏi                                              | Nếu CÓ                                                    |
|------------------------------------------------------|-----------------------------------------------------------|
| Spec đề cập > 1 button/tab/giá trị có cùng hành vi?  | → Tạo nhóm đối xứng, dùng Scenario Outline                |
| Các phần tử đối xứng có khác nhau về kết quả (Then)? | → Thêm cột kết quả vào Examples table                     |
| Các phần tử đối xứng hoàn toàn giống nhau về flow?   | → Chỉ cần thêm row vào Examples, không cần scenario riêng |
| Chỉ có 1 phần tử duy nhất, không có đối xứng?        | → Dùng Scenario bình thường, không cần Outline            |
