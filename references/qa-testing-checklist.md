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

| Criteria | ❌ Wrong | ✅ Right |
|---|---|---|
| **Validate Form** | Check form đăng ký | Nhập email thiếu "@", xác nhận hệ thống báo lỗi viền đỏ |
| **Giao Diện** | Nút bấm hiển thị bình thường | Xác nhận nút "Đồng ý" hiển thị bo góc, kích thước 44px |
| **Tương Tác Máy** | Test trên máy thật | Thao tác vuốt từ mép trái sang phải trên iPhone 15 để quay lại |
| **Mạng Lưới** | Test khi rớt mạng | Tắt Wi-Fi/4G khi đang load, xác nhận app hiện pop-up "Mất kết nối" |
| **Nghiệp vụ Tài chính** | Kiểm tra sức mua | Xác nhận lệnh MUA bị từ chối khi khối lượng × giá vượt sức mua khả dụng (qmax) |
| **Performance** | Load nhanh | Load dưới 2 giây trên kết nối 4G |
| **Giá** | Giá hợp lệ | Xác nhận giá đặt nằm trong khoảng Giá Sàn (90,000) đến Giá Trần (110,000) |

### Gherkin Step Writing

| Criteria | ❌ Wrong | ✅ Right |
|---|---|---|
| **Declarative** | `Given người dùng nhấn nút đăng nhập, nhập user, nhập pass` | `Given người dùng đã đăng nhập với quyền "Broker"` |
| **Observable** | `Then hệ thống xử lý thành công` | `Then hệ thống trả về mã HTTP 200 và orderId hợp lệ` |
| **Concrete data** | `When nhập giá trị "test"` | `When nhập mã chứng khoán "VNM"` |
| **Single action** | `When đặt lệnh mua và kiểm tra sức mua` | `When đặt lệnh mua 500 cổ phiếu "SSI" tại giá 25,000` |
| **No DOM** | `When click vào #btn-submit` | `When nhấn nút "Đặt lệnh"` |

## Boundary Value Analysis Tables

### Numeric Fields

For any numeric input with a valid range `[min, max]`:

| Test case | Value | Expected |
|-----------|-------|----------|
| Below minimum | min - 1 | Reject |
| At minimum | min | Accept |
| Above minimum | min + 1 | Accept |
| Nominal | (min + max) / 2 | Accept |
| Below maximum | max - 1 | Accept |
| At maximum | max | Accept |
| Above maximum | max + 1 | Reject |
| Zero | 0 | Depends on domain |
| Negative | -1 | Reject (usually) |
| Empty / null | (empty) | Reject |

### String Fields

| Test case | Value | Expected |
|-----------|-------|----------|
| Empty string | `""` | Reject (if required) |
| Whitespace only | `"   "` | Reject |
| At min length | `"a"` (minLength chars) | Accept |
| At max length | `"a" × maxLength` | Accept |
| Exceeds max length | `"a" × (maxLength + 1)` | Reject |
| Special characters | `"<script>alert(1)</script>"` | Reject / sanitize |
| Unicode | `"Nguyễn Văn A"` | Accept |
| SQL injection | `"'; DROP TABLE--"` | Reject / sanitize |

## Equivalence Partitioning Reference

Group inputs into classes where all values in the same class produce the same behavior. Test one value from each class.

### Securities Order Quantity Example

| Class | Range | Representative | Expected |
|-------|-------|----------------|----------|
| Invalid (negative) | < 0 | -100 | Reject |
| Invalid (zero) | 0 | 0 | Reject |
| Invalid (not lot size) | 1-99 (not multiple of 100) | 50 | Reject |
| Valid (standard lot) | 100-999,900 (multiple of 100) | 500 | Accept |
| Invalid (exceeds max) | > 999,900 | 1,000,000 | Reject |
| Invalid (decimal) | Fractional | 100.5 | Reject |

### Securities Price Example (for a stock with ref price 100,000)

| Class | Range | Representative | Expected |
|-------|-------|----------------|----------|
| Below floor (< -7%) | < 93,000 | 92,000 | Reject |
| At floor (-7%) | 93,000 | 93,000 | Accept |
| Valid range | 93,000 - 107,000 | 100,000 | Accept |
| At ceiling (+7%) | 107,000 | 107,000 | Accept |
| Above ceiling (> +7%) | > 107,000 | 108,000 | Reject |
| Invalid tick (not step) | Not on tick grid | 93,050 | Reject (HOSE tick = 100) |

## Financial Domain Validation Patterns

### Securities Trading

| Validation | Rule | Test cases |
|---|---|---|
| **Trading hours** | Orders only during market hours (09:00-11:30, 13:00-14:45 for HOSE) | Before open, during session, during break, after close, on holiday |
| **Price limits** | Floor/ceiling ±7% of reference price (HOSE) | At floor, below floor, at ceiling, above ceiling, at reference |
| **Tick size** | Price must be on tick grid (100đ for 10K-50K, 500đ for ≥50K at HOSE) | On tick, between ticks, at tick boundary |
| **Lot size** | Quantity must be multiple of 100 (standard lot) | 100, 200, 50, 99, 101, 0 |
| **Buying power** | quantity × price ≤ available balance (qmax) | Under limit, at limit, over limit |
| **Account ownership** | Order account must match API key owner | Own account, other's account |
| **Duplicate order** | Prevent duplicate orders within time window | Same order twice, rapid fire |

### Banking & Fintech

| Validation | Rule | Test cases |
|---|---|---|
| **Transfer limits** | Daily/per-transaction limits by tier | Under limit, at limit, over limit, cumulative |
| **Account status** | Account must be active, not frozen/closed | Active, frozen, closed, pending |
| **Currency precision** | VND: 0 decimals, USD: 2 decimals | Exact, extra decimals, negative |
| **Beneficiary validation** | Recipient account must exist and be active | Valid, non-existent, closed, blocked |
| **OTP/2FA** | Required for transactions above threshold | With valid OTP, expired OTP, wrong OTP, no OTP |
| **Idempotency** | Same request ID must not process twice | New ID, duplicate ID, empty ID |

## Common API Testing Patterns

### Authentication & Authorization Matrix

| Test | Request | Expected |
|---|---|---|
| No API key | Remove `x-api-key` header | 401 Unauthorized |
| Invalid API key | `x-api-key: invalid_key_123` | 401 Unauthorized |
| Expired API key | Use revoked/expired key | 401 Unauthorized |
| Missing signature | Remove `signature` header | 401 Unauthorized |
| Tampered signature | Modify payload after signing | 401 Unauthorized |
| Wrong account | Use accountNo not owned by API key | 403 Forbidden |
| Valid credentials | All headers correct | 200 OK |

### HTTP Method Validation

| Test | Request | Expected |
|---|---|---|
| Wrong method | `GET` on a `POST` endpoint | 405 Method Not Allowed |
| Invalid URL | `POST /api/v1/nonexistent` | 404 Not Found |
| Correct method | `POST /api/v1/orders` | 200 OK |

### Payload Validation

| Test | Request body | Expected |
|---|---|---|
| Empty body | `{}` | 400 Bad Request |
| Missing required field | Omit one required field | 400 + field name in error |
| Wrong data type | String where number expected | 400 + type mismatch error |
| Extra unknown field | Add `"unknown_field": "value"` | Ignored or 400 (depends on strictness) |
| Null required field | `"price": null` | 400 Bad Request |

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

| Dấu hiệu trong spec | Nhóm đối xứng | Ví dụ |
|---|---|---|
| Nhiều button cùng trigger một form/action | Buttons group | Nút MUA / Nút BÁN cùng mở form đặt lệnh |
| Nhiều tab cùng layout | Tabs group | Tab "Lệnh thường" / Tab "Lệnh điều kiện" |
| Nhiều loại lệnh/tài khoản | Values group | Lệnh ATO / ATC / MOK / MAK |
| Nhiều trạng thái cùng hiển thị thông báo | States group | Chưa hoàn thiện / Chờ duyệt / Bị từ chối |
| Thao tác trên nhiều sàn/thị trường | Context group | Sàn HOSE / HNX / UPCOM |
| Nhiều input method cùng kết quả | Input group | Nhấn nút +/- / Gõ phím số cùng chuyển về lệnh LO |

### Áp dụng trong Checklist (Phase 1)

```markdown
# ❌ Thiếu đối xứng — chỉ test một phần tử
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút MUA — [P0]

# ✅ Bao phủ đối xứng — test TẤT CẢ phần tử trong nhóm
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút MUA — [P0]
- [ ] Xác nhận hệ thống mở rộng form đặt lệnh khi nhấn nút BÁN — [P0]
```

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
    | loại_lệnh |
    | MUA        |
    | BÁN        |
```

### Quy tắc quyết định

| Câu hỏi | Nếu CÓ |
|---|---|
| Spec đề cập > 1 button/tab/giá trị có cùng hành vi? | → Tạo nhóm đối xứng, dùng Scenario Outline |
| Các phần tử đối xứng có khác nhau về kết quả (Then)? | → Thêm cột kết quả vào Examples table |
| Các phần tử đối xứng hoàn toàn giống nhau về flow? | → Chỉ cần thêm row vào Examples, không cần scenario riêng |
| Chỉ có 1 phần tử duy nhất, không có đối xứng? | → Dùng Scenario bình thường, không cần Outline |
