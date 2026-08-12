# Business Specification: [JIRA-123] Order Management System

**Issue Key:** JIRA-123
**Issue Type:** New Feature
**Priority:** High
**Reporter:** Business Analyst
**Created:** 2024-01-10

---

## Tóm tắt

Xây dựng hệ thống quản lý lệnh (Order Management) cho sàn chứng khoán, cho phép khách hàng đặt lệnh mua/bán chứng khoán qua API.

---

## User Stories

### US-1: Đặt lệnh mua chứng khoán
**As a** trader
**I want to** đặt lệnh mua chứng khoán qua API
**So that** tôi có thể mua cổ phiếu một cách nhanh chóng

**Acceptance Criteria:**
- User có thể đặt lệnh mua với thông tin: mã CK, số lượng, giá
- Hệ thống validate thông tin đầu vào
- Hệ thống kiểm tra sức mua
- Lệnh được ghi nhận và trả về orderId

### US-2: Xem chi tiết lệnh
**As a** trader
**I want to** xem chi tiết lệnh đã đặt
**So that** tôi có thể theo dõi trạng thái lệnh

**Acceptance Criteria:**
- User có thể lấy chi tiết lệnh bằng orderId
- Hệ thống trả về đầy đủ thông tin: orderId, symbol, quantity, price, status
- Nếu lệnh không tồn tại, trả về lỗi 404

### US-3: Xem danh sách lệnh
**As a** trader
**I want to** xem danh sách tất cả lệnh của tôi
**So that** tôi có thể quản lý portfolio

**Acceptance Criteria:**
- User có thể lấy danh sách lệnh với pagination
- Hỗ trợ filter theo: accountNo, status, symbol
- Trả về tối đa 100 lệnh mỗi page

---

## Business Rules

### BR-1: Validation Rules

**Khối lượng (Quantity):**
- Phải là số nguyên dương (> 0)
- Phải là bội số của 100
- Tối đa 999,900

**Giá (Price):**
- Với lệnh LO (Limit Order): bắt buộc
- Với lệnh MP, ATO, ATC: không cần giá
- Phải trong khoảng Sàn-Trần (±7% so với giá tham chiếu)
- Phải nằm trên lưới giá (tick size) hợp lệ

**Mã chứng khoán (Symbol):**
- 3-4 ký tự viết hoa
- Phải tồn tại trong danh sách mã giao dịch

**Loại lệnh (Order Type):**
- LO: Limit Order (giới hạn)
- MP: Market Price (thị trường)
- ATO: At The Open (khớp mở cửa)
- ATC: At The Close (khớp đóng cửa)

### BR-2: Sức mua (Buying Power)

- Trước khi tạo lệnh mua, hệ thống PHẢI kiểm tra sức mua
- Sức mua cần thiết = Quantity × Price
- Nếu sức mua không đủ, từ chối lệnh với mã lỗi `INSUFFICIENT_BUYING_POWER`
- Sau khi tạo lệnh, sức mua bị giữ (reserved) cho đến khi lệnh khớp hoặc hủy

### BR-3: Giờ giao dịch

- Giờ giao dịch: 09:00 - 15:00 (giờ Việt Nam)
- Lệnh đặt ngoài giờ giao dịch bị từ chối với mã lỗi `OUTSIDE_TRADING_HOURS`
- Ngày nghỉ lễ, ngày cuối tuần không cho phép giao dịch

### BR-4: Trạng thái lệnh (Order Status)

**PENDING:** Lệnh đã tạo, chờ khớp
**FILLED:** Lệnh khớp hết
**PARTIAL_FILLED:** Lệnh khớp 1 phần
**CANCELLED:** Lệnh bị hủy
**REJECTED:** Lệnh bị từ chối (validation fail)

**State transitions:**
- PENDING → FILLED (khớp hết)
- PENDING → PARTIAL_FILLED (khớp 1 phần)
- PENDING → CANCELLED (user hủy)
- PARTIAL_FILLED → FILLED (khớp tiếp)
- PARTIAL_FILLED → CANCELLED (user hủy)

---

## API Requirements

### Endpoint 1: POST /api/v1/orders

**Purpose:** Tạo lệnh mới

**Request:**
```json
{
  "accountNo": "1234567890",
  "symbol": "VNM",
  "side": "BUY",
  "orderType": "LO",
  "quantity": 100,
  "price": 50000
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD-20240115-001",
    "status": "PENDING"
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "errorCode": "INSUFFICIENT_BUYING_POWER",
  "message": "Sức mua không đủ"
}
```

### Endpoint 2: GET /api/v1/orders/{orderId}

**Purpose:** Lấy chi tiết lệnh

**Response:**
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD-20240115-001",
    "accountNo": "1234567890",
    "symbol": "VNM",
    "side": "BUY",
    "quantity": 100,
    "price": 50000,
    "status": "FILLED",
    "filledQuantity": 100,
    "avgPrice": 49900
  }
}
```

### Endpoint 3: GET /api/v1/orders

**Purpose:** Lấy danh sách lệnh

**Query Parameters:**
- accountNo (optional)
- status (optional)
- symbol (optional)
- page (default=1)
- limit (default=20, max=100)

**Response:**
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## Error Scenarios

### Scenario 1: Khối lượng không hợp lệ
**Input:** quantity = 50 (không phải bội số 100)
**Expected:** HTTP 400, errorCode = INVALID_QUANTITY

### Scenario 2: Giá vượt trần
**Input:** price = 100000 (vượt trần 7%)
**Expected:** HTTP 400, errorCode = INVALID_PRICE

### Scenario 3: Sức mua không đủ
**Input:** Lệnh mua 10M nhưng sức mua chỉ 5M
**Expected:** HTTP 422, errorCode = INSUFFICIENT_BUYING_POWER

### Scenario 4: Đặt lệnh ngoài giờ giao dịch
**Input:** Lệnh đặt lúc 16:00
**Expected:** HTTP 422, errorCode = OUTSIDE_TRADING_HOURS

---

## Non-Functional Requirements

### Performance
- API response time < 200ms (p95)
- Throughput: 1000 requests/sec
- Database query < 50ms

### Security
- Authentication: JWT Bearer Token
- Authorization: User chỉ xem được lệnh của mình
- Encryption: TLS 1.3

### Availability
- Uptime: 99.9% (8.76 giờ downtime/năm)
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour

### Scalability
- Horizontal scaling: Auto-scale 2-10 pods
- Database: Read replicas cho read-heavy queries

---

## Out of Scope

- UI/UX (chỉ API backend)
- Matching engine (đã có sẵn)
- Real-time market data streaming
- Portfolio analytics

---

## Dependencies

### External Services
- Exchange Matching Engine API
- Market Data Service (giá tham chiếu, sàn-trần)

### Internal Services
- Auth Service (JWT validation)
- Account Service (sức mua, account info)

---

## Acceptance Criteria (Overall)

- [ ] API endpoints hoạt động đúng spec
- [ ] Tất cả Business Rules được implement
- [ ] Error scenarios được handle đầy đủ
- [ ] Unit test coverage ≥ 80%
- [ ] Integration test pass 100%
- [ ] Load test đạt performance target
- [ ] Security audit pass
- [ ] Tech-Spec được approve bởi Tech Lead

---

**Approved by:** Business Analyst, Product Owner
**Date:** 2024-01-12
