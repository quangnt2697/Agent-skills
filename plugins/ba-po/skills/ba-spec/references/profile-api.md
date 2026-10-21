# Profile API — Bộ trích xuất cho OpenAPI / Backend / WebSocket

## Hướng dẫn cho Agent

Khi `task_type = "API"`, sử dụng bộ **14 chiều phân tích** dưới đây để trích xuất thông tin
từ PDF và attachments. Profile này bao phủ cả **REST API**, **OpenAPI spec** và **WebSocket**.

Đối với mỗi chiều, đánh dấu trạng thái:
- ✅ Rõ ràng — đủ thông tin
- ⚠️ Mơ hồ — có nhưng chưa rõ
- ❌ Thiếu — không tìm thấy
- ➖ Không áp dụng — không liên quan đến task này

---

## 14 Chiều phân tích

### 1. 🔌 REST Endpoints Overview
**Cần trích xuất:**
- Danh sách tất cả endpoints (dạng bảng: method, path, mô tả, auth required)
- HTTP Method: GET, POST, PUT, PATCH, DELETE
- URL path & path parameters (VD: `/api/v2/orders/{orderId}`)
- Query parameters (tên, kiểu, bắt buộc/tùy chọn, giá trị mặc định)
- Mô tả mục đích của từng endpoint
- API versioning strategy: URL path (`/v1/`, `/v2/`) hay header (`Accept-Version`)
- Content negotiation: JSON, XML, multipart
- Deprecated endpoints (nếu có)
- Idempotent endpoints (đánh dấu)

**Câu hỏi cần làm rõ nếu thiếu:**
- Versioning: endpoint thuộc API version nào (v1, v2, v3)?
- Base path cụ thể? (VD: `/api/v2/` hay `/internal/`)
- Có endpoint nào deprecated không? Timeline sunset?
- Endpoint nào là internal-only vs public-facing?

### 2. 📨 Request Schema
**Cần trích xuất:**
- Headers yêu cầu (Authorization, Content-Type, X-Request-Id, X-Idempotency-Key, custom headers)
- Request body schema (JSON) — tốt nhất dạng JSON Schema hoặc bảng
- Trường bắt buộc vs tùy chọn (đánh dấu rõ)
- Kiểu dữ liệu từng trường (string, number, boolean, array, object, date, enum)
- Enum values (danh sách giá trị cho phép + mô tả từng giá trị)
- Constraints: min/max length, min/max value, regex pattern
- Nested object schema (chi tiết đến level sâu nhất)
- Ví dụ request body (happy path + edge case)
- File upload: max size, allowed mime types (nếu có)

**Câu hỏi cần làm rõ nếu thiếu:**
- Content-Type là JSON hay form-data hay multipart?
- Trường nào bắt buộc, trường nào tùy chọn?
- Có nested object không? Schema chi tiết?
- Giá trị enum cụ thể cho từng trường?
- Date format: ISO 8601, Unix timestamp, hay custom?

### 3. 📩 Response Schema & Error Codes
**Cần trích xuất:**
- Response body schema cho từng status code (đầy đủ các case)
- Success responses: 200 OK, 201 Created, 202 Accepted, 204 No Content
- Client error responses: 400, 401, 403, 404, 409 Conflict, 422 Unprocessable, 429 Too Many Requests
- Server error responses: 500, 502, 503 Service Unavailable
- Error response format chuẩn: `{ code, message, details, traceId }`
- Business error codes mapping (VD: `ORD_001` = "Lệnh không hợp lệ", `BAL_002` = "Số dư không đủ")
- Pagination response: `{ total, page, pageSize, items[], hasNext }`
- Empty response handling (empty array vs null vs 204)
- Response headers quan trọng (X-Total-Count, X-Rate-Limit-Remaining, ETag)
- Ví dụ response body cho từng case

**Câu hỏi cần làm rõ nếu thiếu:**
- Error response format chuẩn của hệ thống là gì?
- Có error code mapping riêng không (VD: E001, E002)? Danh sách đầy đủ?
- Pagination response format? Cursor-based hay offset-based?
- Empty list trả `[]` hay `null`? Status 200 hay 204?
- Có trả traceId trong error response không?

### 4. ✅ Validation Rules
**Cần trích xuất:**
- Validation từng trường: format, length, range, regex, allowed chars
- Cross-field validation (VD: endDate > startDate, confirmPassword == password)
- Business validation (VD: số dư >= số tiền giao dịch, KL >= KL tối thiểu)
- Conditional validation (VD: trường X bắt buộc khi type = "margin")
- Validation error response format & error codes
- Validation layer: controller, service, domain

**Câu hỏi cần làm rõ nếu thiếu:**
- Validation xảy ra ở layer nào (controller vs service vs domain)?
- Cross-field validation rules cụ thể?
- Validation có khác nhau theo loại tài khoản / loại sản phẩm?
- Conditional validation: khi nào thì trường nào bắt buộc?

### 5. 🌊 User Flow / Sequence Diagram
**Cần trích xuất:**
- Sequence diagram hoặc flowchart thể hiện luồng giao tiếp giữa client, API gateway, backend service, và external systems
- Luồng xử lý bất đồng bộ (async flow) nếu có (VD: nhận webhook, xử lý queue)
- Fallback/Error flow (VD: khi external service sập thì API trả về gì)
- Trạng thái hệ thống trước và sau khi gọi API
- Event trigger (ai hoặc sự kiện gì trigger luồng này)

**Câu hỏi cần làm rõ nếu thiếu:**
- Luồng giao tiếp hệ thống diễn ra như thế nào? (Gọi service nào trước/sau)
- Khi external service lỗi thì hệ thống xử lý fallback ra sao?
- Có luồng xử lý bất đồng bộ nào sau khi trả response 200/202 không?

### 6. 🔐 Security & Authentication
**Cần trích xuất:**
- Authentication method: API Key, Bearer Token, OAuth 2.0, JWT, mTLS
- Signature mechanism: HMAC-SHA256, RSA-SHA256, ED25519
- Signature payload format (nội dung nào được sign, thứ tự fields)
- Rate limiting: bao nhiêu request/s/phút/giờ, per user hay per API key
- IP whitelist / CIDR range (nếu có)
- CORS policy (allowed origins, methods, headers)
- Replay attack prevention: timestamp window, nonce
- Token lifetime & refresh mechanism
- API key rotation policy
- Encryption in transit: TLS version yêu cầu
- Encryption at rest: dữ liệu nhạy cảm (PII, financial data)

**Câu hỏi cần làm rõ nếu thiếu:**
- Signature algorithm cụ thể? Payload được sign gồm những gì?
- Rate limit bao nhiêu? Per user hay per API key? Burst limit?
- Có replay attack prevention (timestamp check, nonce) không?
- Token hết hạn sau bao lâu? Refresh như thế nào?
- Có mã hóa dữ liệu nhạy cảm (số tài khoản, CMND/CCCD) không?

### 7. 💼 Business Rules
**Cần trích xuất:**
- Giới hạn giá / khối lượng / số tiền (min, max, bước giá)
- Giờ giao dịch (trading hours): giờ mở cửa, đóng cửa, nghỉ trưa
- Quy tắc matching (nếu là trading system): price-time priority, pro-rata
- Thứ tự xử lý (FIFO, priority-based, weighted...)
- Quy tắc tính phí, thuế, lãi (công thức cụ thể)
- Trạng thái lifecycle (VD: PENDING → MATCHED → SETTLED → COMPLETED)
- Settlement rules: T+0, T+1, T+2
- Margin rules: tỷ lệ ký quỹ, margin call, force sell
- Cut-off time: deadline xử lý cho từng loại giao dịch

**Câu hỏi cần làm rõ nếu thiếu:**
- Giới hạn cụ thể cho từng loại sản phẩm?
- Quy tắc có thay đổi theo giờ giao dịch?
- Phí tính thế nào (cố định, %, bậc thang)? Công thức?
- Trạng thái lifecycle đầy đủ là gì? Transition conditions?
- Settlement cycle là gì (T+0, T+1, T+2)?

### 8. 🔗 Dependencies & Data Flow
**Cần trích xuất:**
- Upstream services (API này gọi service nào, timeout từng service)
- Downstream services (service nào gọi API này)
- Event-driven: publish event nào, subscribe event nào (topic, schema)
- Message queue: Kafka/RabbitMQ topic, format, consumer group, partitioning
- Database interactions: read/write, transaction scope
- Cache layer: Redis/Memcached, cache key pattern, TTL, invalidation strategy
- External gateway: payment gateway, exchange gateway, KYC service
- Service mesh / API gateway routing

**Câu hỏi cần làm rõ nếu thiếu:**
- Có gọi external service nào không? Timeout bao nhiêu ms?
- Có publish event/message không? Topic + schema?
- Transaction scope bao gồm những gì? Distributed transaction?
- Có cache layer không? Cache invalidation strategy?
- Có cần gọi gateway bên ngoài (VD: payment, exchange) không?

### 8. 📊 Data & Database
**Cần trích xuất:**
- Entities liên quan (table, collection) — dạng bảng: tên, mô tả
- Schema changes: thêm/sửa/xóa column (chi tiết: tên, kiểu, nullable, default)
- Migration plan (nếu có schema change): backward compatible?
- Indexing cần thiết cho performance (composite index, partial index)
- Quan hệ dữ liệu (FK, references, cascade behavior)
- Soft delete vs hard delete
- Audit trail: cần lưu lịch sử thay đổi không?
- Data retention: giữ dữ liệu bao lâu? Archive policy?
- Seed data / default data cần insert

**Câu hỏi cần làm rõ nếu thiếu:**
- Database nào (PostgreSQL, MongoDB, Redis...)?
- Có cần migration không? Backward compatible?
- Index nào cần tạo cho query mới?
- Có cần audit trail (lưu lịch sử ai sửa gì khi nào)?
- Soft delete hay hard delete?

### 9. ⚠️ Edge Cases & Error Handling
**Cần trích xuất:**
- Race condition scenarios (2 request đồng thời)
- Idempotency: duplicate request handling (idempotency key, header)
- Timeout handling: upstream service timeout → rollback hay retry?
- Retry logic: strategy (fixed, exponential backoff), max retries, jitter
- Circuit breaker: threshold, half-open state, fallback response
- Concurrent write: optimistic locking (ETag/version) vs pessimistic locking
- Data consistency: eventual vs strong consistency
- Partial failure: batch API có 1 item fail → fail all hay skip?
- Dead letter queue: xử lý message không process được
- Graceful degradation: khi dependency down, trả gì?

**Câu hỏi cần làm rõ nếu thiếu:**
- Có idempotency key không? Header nào? (VD: `X-Idempotency-Key`)
- Retry bao nhiêu lần? Backoff strategy? Có jitter?
- Locking strategy: optimistic hay pessimistic?
- Consistency requirement: eventual hay strong?
- Batch có 1 item fail: fail all hay partial success?

---

### 10. 🔌 WebSocket & Real-time
> **Chỉ áp dụng khi task liên quan đến WebSocket / real-time communication.**
> Nếu task không có WebSocket, đánh dấu ➖ Không áp dụng.

**Cần trích xuất:**
- WebSocket endpoint URL & protocol (ws:// hay wss://)
- Connection lifecycle: handshake, auth, keep-alive, reconnect
- Authentication khi connect: token trong query param, header, hay message đầu tiên
- Channels / Topics / Rooms: danh sách kênh subscribe
- Message format (JSON, Protobuf, MessagePack):
  ```json
  { "type": "subscribe", "channel": "order.{accountId}", "data": {...} }
  ```
- Message types:
  - **Client → Server**: subscribe, unsubscribe, ping, auth, action messages
  - **Server → Client**: data update, ack, error, pong, heartbeat
- Heartbeat / Ping-Pong: interval bao nhiêu giây?
- Reconnection strategy: auto-reconnect? backoff? max retries?
- Connection lost behavior: buffer messages? replay missed?
- Message ordering guarantee: có đảm bảo thứ tự không?
- Backpressure: khi client xử lý chậm, server xử lý thế nào?
- Max connections per user / per account
- Message size limit

**Câu hỏi cần làm rõ nếu thiếu:**
- WebSocket endpoint URL cụ thể?
- Auth khi connect: token đặt ở đâu (query param, header, first message)?
- Danh sách channels / topics có thể subscribe?
- Message format cho từng loại event?
- Heartbeat interval? Timeout bao lâu thì coi như disconnect?
- Mất kết nối thì có buffer/replay messages đã miss không?
- Giới hạn bao nhiêu connection cùng lúc?

---

### 11. 📘 OpenAPI Spec & Documentation
> **Chỉ áp dụng khi task yêu cầu tạo/update OpenAPI spec hoặc API documentation.**
> Nếu không, đánh dấu ➖ Không áp dụng.

**Cần trích xuất:**
- OpenAPI version: 3.0 hay 3.1?
- Swagger file path / URL
- Schema definitions ($ref, components/schemas)
- Security schemes (định nghĩa trong OpenAPI spec)
- Tags & grouping (nhóm endpoints theo module)
- Examples trong spec (request/response examples)
- Server URLs (dev, staging, prod)
- Webhook definitions (nếu có)
- SDK generation: có cần generate client SDK không?

**Câu hỏi cần làm rõ nếu thiếu:**
- OpenAPI spec file đã có chưa? Đường dẫn?
- Có cần generate client SDK (TypeScript, Java, Python...)?
- API documentation host ở đâu (Swagger UI, Redoc, Stoplight)?
- Có cần tạo/update webhook spec không?

---

### 12. 🧪 Testing & Contract
**Cần trích xuất:**
- Unit test: service layer, validation logic
- Integration test: API endpoints, database
- Contract testing: consumer-driven contracts (Pact, Spring Cloud Contract)
- Performance test: target throughput (RPS), latency (p50, p95, p99)
- Load test scenarios: peak trading hours
- Test data: seed data, fixtures, test accounts
- Backward compatibility test: có break client cũ không?

**Câu hỏi cần làm rõ nếu thiếu:**
- Có contract testing với FE/consumer không?
- Target performance: bao nhiêu RPS? Latency p99 bao nhiêu ms?
- Cần test data gì? Môi trường test nào?
- API change có backward compatible không?

---

### 13. 📊 Logging, Monitoring & Audit
**Cần trích xuất:**
- Structured logging: fields bắt buộc (traceId, userId, action, timestamp)
- Log level: đâu INFO, đâu WARN, đâu ERROR
- Audit trail: hành động nào cần ghi audit (tạo/sửa/xóa/duyệt)
- Metrics: custom business metrics (số lệnh, giá trị giao dịch, error rate)
- Alerting: điều kiện trigger alert (error rate > X%, latency > Y ms)
- Health check endpoint: `/health`, `/ready`
- Distributed tracing: OpenTelemetry, Jaeger, Zipkin

**Câu hỏi cần làm rõ nếu thiếu:**
- Có cần audit trail cho hành động này không?
- Custom metrics nào cần track?
- Alert rules cụ thể?
- Có health check endpoint chưa?

---

### 14. 🚀 Versioning & Migration
**Cần trích xuất:**
- API versioning strategy: URL, header, content negotiation
- Breaking changes: có break API cũ không?
- Deprecation plan: sunset timeline, migration guide
- Feature flag: tính năng mới có ẩn sau feature flag không?
- Database migration: up/down scripts, rollback plan
- Data migration: cần migrate dữ liệu cũ không? Script?
- Rollback strategy: nếu deploy fail, rollback như thế nào?
- Blue-green / canary deployment?

**Câu hỏi cần làm rõ nếu thiếu:**
- API change có backward compatible không?
- Có cần deprecate API cũ không? Timeline?
- Feature flag có cần không?
- Rollback plan nếu deploy lỗi?
- Có cần migrate dữ liệu cũ không?

---

## Template Final.md cho API

Lưu file output tại `workspace/issues/{issueKey}/spec/final.md`. Gọi lại skill → ghi đè hoàn toàn file cũ, không tạo file mới với suffix. Sử dụng structure sau:

```
## 1. Tổng quan
## 2. REST Endpoints Overview
## 3. Request Schema
## 4. Response Schema & Error Codes
## 5. Security & Authentication
## 6. Validation Rules
## 7. Business Rules
## 8. Dependencies & Data Flow
## 9. Data & Database
## 10. Edge Cases & Error Handling
## 11. WebSocket & Real-time (nếu áp dụng)
## 12. OpenAPI Spec & Documentation (nếu áp dụng)
## 13. Testing & Contract
## 14. Logging, Monitoring & Audit
## 15. Versioning & Migration
## 16. Acceptance Criteria
## 17. Assumptions & Decisions
## 18. Open Questions
## 19. Tham khảo
```
