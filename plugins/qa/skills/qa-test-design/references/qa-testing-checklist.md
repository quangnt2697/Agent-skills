# Tài liệu Tham khảo: Checklist Kiểm Thử QA

> Tài liệu này cung cấp các mẫu (templates), kỹ thuật, và quy ước để viết checklist kiểm thử và kịch bản BDD Gherkin — tập trung cho domain chứng khoán, fintech, ngân hàng.

---

## 1. Phân tích Giá trị Biên (Boundary Value Analysis — BVA)

### Nguyên tắc
Giá trị biên (boundary values) nằm ở rìa các phân vùng hợp lệ/không hợp lệ. Đây là nơi bugs thường xuất hiện nhiều nhất.

### Template BVA cho Domain Tài chính

#### a. Giá lệnh chứng khoán (VD: sàn HOSE)

| Điều kiện                       | Giá trị                  | Mong đợi             |
|---------------------------------|--------------------------|----------------------|
| Dưới giá sàn                    | `floor_price - step`     | ❌ Từ chối           |
| Đúng giá sàn                    | `floor_price`            | ✅ Chấp nhận         |
| Giá sàn + 1 bước giá            | `floor_price + step`     | ✅ Chấp nhận         |
| Giá tham chiếu                  | `ref_price`              | ✅ Chấp nhận         |
| Giá trần - 1 bước giá           | `ceiling_price - step`   | ✅ Chấp nhận         |
| Đúng giá trần                   | `ceiling_price`          | ✅ Chấp nhận         |
| Trên giá trần                   | `ceiling_price + step`   | ❌ Từ chối           |
| Giá = 0                         | `0`                      | ❌ Từ chối           |
| Giá âm                          | `-100`                   | ❌ Từ chối           |
| Giá không chia hết cho bước giá | `ref_price + (step / 2)` | ❌ Từ chối (tuỳ sàn) |

#### b. Khối lượng lệnh

| Điều kiện                | Giá trị                    | Mong đợi                                          |
|--------------------------|----------------------------|---------------------------------------------------|
| KL = 0                   | `0`                        | ❌ Từ chối                                        |
| KL < lô tối thiểu        | `lot_size - 1` (VD: `99`)  | ❌ Từ chối                                        |
| KL = lô tối thiểu        | `lot_size` (VD: `100`)     | ✅ Chấp nhận                                      |
| KL không chia hết cho lô | `lot_size + 1` (VD: `101`) | ❌ Từ chối (lô chẵn) hoặc ✅ (lô lẻ nếu cho phép) |
| KL = max cho phép        | `max_qty`                  | ✅ Chấp nhận                                      |
| KL > max                 | `max_qty + 1`              | ❌ Từ chối                                        |
| KL âm                    | `-100`                     | ❌ Từ chối                                        |

#### c. Số tiền giao dịch / Chuyển khoản

| Điều kiện          | Giá trị          | Mong đợi                     |
|--------------------|------------------|------------------------------|
| Dưới mức tối thiểu | `min_amount - 1` | ❌ Từ chối                   |
| Đúng mức tối thiểu | `min_amount`     | ✅ Chấp nhận                 |
| Trên mức tối đa    | `max_amount + 1` | ❌ Từ chối                   |
| Đúng mức tối đa    | `max_amount`     | ✅ Chấp nhận                 |
| Vượt số dư         | `balance + 1`    | ❌ Từ chối                   |
| Đúng bằng số dư    | `balance`        | ✅ Chấp nhận                 |
| Số thập phân       | `100.50`         | ✅ hoặc ❌ (tuỳ quy ước sàn) |
| Rất lớn (overflow) | `999999999999`   | ❌ Từ chối hoặc xử lý tràn   |

---

## 2. Phân vùng Tương đương (Equivalence Partitioning — EP)

### Nguyên tắc
Chia miền đầu vào thành các lớp tương đương. Chọn **1 giá trị đại diện** từ mỗi lớp. Kết hợp với BVA cho rìa mỗi lớp.

### Ví dụ EP cho Mã chứng khoán

| Lớp tương đương           | Giá trị đại diện   | Mong đợi                  |
|---------------------------|--------------------|---------------------------|
| Mã hợp lệ — cổ phiếu HOSE | `VNM`              | ✅ Tìm thấy               |
| Mã hợp lệ — cổ phiếu HNX  | `SHB`              | ✅ Tìm thấy               |
| Mã hợp lệ — ETF           | `E1VFVN30`         | ✅ Tìm thấy               |
| Mã hợp lệ — chứng quyền   | `CVNM2301`         | ✅ Tìm thấy               |
| Mã không tồn tại          | `ZZZZZ`            | ❌ Không tìm thấy         |
| Mã rỗng                   | `""`               | ❌ Lỗi validation         |
| Mã chứa ký tự đặc biệt    | `VN@M`             | ❌ Lỗi validation         |
| Mã quá dài                | `ABCDEFGHIJK`      | ❌ Lỗi validation         |
| Mã chữ thường             | `vnm`              | ✅ hoặc ❌ (tuỳ hệ thống) |

### Ví dụ EP cho Loại tài khoản

| Lớp tương đương        | Giá trị        | Mong đợi               |
|------------------------|----------------|------------------------|
| Tài khoản cá nhân      | `INDIVIDUAL`   | ✅ Schema cá nhân      |
| Tài khoản doanh nghiệp | `CORPORATE`    | ✅ Schema doanh nghiệp |
| Tài khoản ủy thác      | `TRUST`        | ✅ Schema ủy thác      |
| Giá trị không hợp lệ   | `UNKNOWN_TYPE` | ❌ Lỗi validation      |
| Giá trị null           | `null`         | ❌ Lỗi validation      |

---

## 3. Mẫu Bao phủ Đối xứng (Symmetric Coverage Pattern)

### Nguyên tắc
Khi spec mô tả nhiều phần tử (nút, tab, giá trị, loại lệnh...) có **cùng hành vi hoặc luồng xử lý**, BẮT BUỘC bao phủ **TẤT CẢ** phần tử. Không test chỉ 1 rồi bỏ qua các phần tử đối xứng.

### Ví dụ — Nút lệnh

```gherkin
# ❌ CHỈ TEST 1 PHẦN TỬ — Thiếu bao phủ
Scenario: Mở form đặt lệnh khi nhấn MUA
  When người dùng nhấn nút "MUA"

# ✅ BAO PHỦ ĐỐI XỨNG — Tất cả phần tử
Scenario Outline: Mở form đặt lệnh khi nhấn <loại_lệnh>
  When người dùng nhấn nút "<loại_lệnh>"
  Then hệ thống hiển thị form đặt lệnh "<loại_lệnh>"
  Examples:
    | loại_lệnh  |
    | MUA        |
    | BÁN        |
```

### Ví dụ — Loại thị trường

```gherkin
Scenario Outline: Hiển thị dữ liệu theo thị trường <thị_trường>
  Given người dùng đã đăng nhập
  When chọn tab thị trường "<thị_trường>"
  Then hệ thống hiển thị danh sách mã thuộc "<thị_trường>"
  Examples:
    | thị_trường |
    | HOSE       |
    | HNX        |
    | UPCOM      |
```

### Quy tắc
1. **Liệt kê danh sách đóng:** Khi spec liệt kê tập hữu hạn (loại lệnh, trạng thái, sàn...), TẤT CẢ giá trị phải xuất hiện ít nhất 1 lần
2. **Dùng Scenario Outline:** Khi nhiều giá trị có cùng luồng → gom vào `Examples`
3. **Tách scenario riêng:** Khi khác giá trị dẫn đến luồng xử lý khác nhau hoàn toàn

---

## 4. Quy ước Viết Checklist & Gherkin

### 4.1. Ngôn ngữ

| Phần                                      | Ngôn ngữ                            |
|-------------------------------------------|-------------------------------------|
| Tiêu đề Feature, Scenario                 | Tiếng Việt                          |
| User story (As a / I want / So that)      | Tiếng Việt                          |
| Text step (Given / When / Then)           | Tiếng Việt                          |
| Item checklist                            | Tiếng Việt                          |
| Tags (`@smoke`, `@negative`, `@JIRA-XXX`) | Tiếng Anh (quy ước)                 |
| Tên biến trong `<angle_brackets>`         | Tiếng Anh hoặc Tiếng Việt không dấu |
| Giá trị mẫu trong `"quotes"`              | Ngôn ngữ gốc của dữ liệu            |

### 4.2. Checklist — Quy tắc viết

| Quy tắc                   | Ví dụ                                             |
|---------------------------|---------------------------------------------------|
| Bắt đầu bằng động từ      | "Xác nhận...", "Kiểm tra...", "Nhập...", "Gửi..." |
| 1 item = 1 cổng Pass/Fail | KHÔNG gộp 2+ hành động                            |
| Lượng hoá cụ thể          | "Load dưới 2 giây" thay vì "Load nhanh"           |
| Ghi rõ giá trị kỳ vọng    | "HTTP 200 OK" thay vì "thành công"                |
| Gán ưu tiên               | `[P0]`, `[P1]`, `[P2]`                            |

### 4.3. Gherkin — Quy tắc viết

| Quy tắc            | Chi tiết                                                                   |
|--------------------|----------------------------------------------------------------------------|
| Thụt vào           | 2 spaces                                                                   |
| Độ dài dòng        | Dưới 120 ký tự                                                             |
| Steps mỗi scenario | Tối đa 10                                                                  |
| Thứ tự             | Given → When → Then (không lặp vòng)                                       |
| Tham số chuỗi      | Đặt trong ngoặc kép: `"giá trị"`                                           |
| Payload nhiều dòng | Dùng doc strings `"""..."""`                                               |
| Dữ liệu mẫu        | **Loại (a) Precondition**: Phải lấy từ UAT, VD: `"0001170086"`. <br>**Loại (b) Negative**: Giá trị giả để test lỗi, VD: `"99999"`. <br>**Loại (c) Ranh giới**: Giữ nhãn, VD: `"TAI_HAN_MUC"`. |

---

## 5. Validation Domain Tài chính — Checklist Baseline

### 5.1. Bảo mật & Phân quyền (P0)
- [ ] Xác nhận API từ chối request thiếu API key / token
- [ ] Xác nhận hệ thống chặn khi accountNo không thuộc sở hữu API key
- [ ] Xác nhận token hết hạn → trả 401 Unauthorized
- [ ] Xác nhận cross-account access bị chặn

### 5.2. Tính toàn vẹn Giao dịch (P0)
- [ ] Xác nhận số dư trước giao dịch − giá trị giao dịch = số dư sau giao dịch
- [ ] Xác nhận race condition: 2 giao dịch đồng thời không trừ/cộng sai
- [ ] Xác nhận idempotency: gửi trùng request không tạo giao dịch trùng
- [ ] Xác nhận rollback khi giao dịch thất bại giữa chừng

### 5.3. Quy tắc Thời gian (P0)
- [ ] Xác nhận từ chối giao dịch ngoài giờ giao dịch
- [ ] Xác nhận xử lý đúng khi đặt lệnh sát giờ đóng cửa
- [ ] Xác nhận xử lý đúng timezone (UTC+7 cho HOSE/HNX)

### 5.4. Số tiền & Định dạng (P1)
- [ ] Xác nhận format số tiền đúng: `1,000,000 VND` hoặc `1.000.000`
- [ ] Xác nhận xử lý số thập phân đúng quy ước sàn
- [ ] Xác nhận không bị floating-point error (dùng Decimal thay vì Float)

### 5.5. Phân trang & Hiệu năng (P2)
- [ ] Xác nhận phân trang hoạt động đúng (Cursor-based hoặc Offset-based)
- [ ] Xác nhận response time < SLA (thường ≤ 2 giây)
- [ ] Xác nhận rate limit trả về 429 khi vượt ngưỡng

### 5.6. WebSocket: Phân tầng Bậc tài khoản (normal, vip, ultimate) & Kiểm soát tần suất (P0 - P2)
*(Áp dụng mô hình Ranh giới Tượng trưng BVA: TAI_HAN_MUC, VUOT_HAN_MUC theo cấu hình môi trường)*

- [ ] **Chứng thực phiên theo Bậc tài khoản (P0):** Xác nhận thông tin chứng thực và phân loại đúng Bậc tài khoản (`normal`, `vip`, `ultimate`) khi mở kết nối trực tuyến.
- [ ] **Giới hạn số kết nối đồng thời theo Bậc (P0 — BVA theo hạn mức):**
  - Xác nhận tài khoản mở kết nối tại hạn mức cho phép (`TAI_HAN_MUC`) thành công.
  - Xác nhận tài khoản mở kết nối vượt quá hạn mức cho phép (`VUOT_HAN_MUC`) bị từ chối do vi phạm chính sách kết nối.
- [ ] **Quyền hạn kênh dữ liệu theo Bậc (P0):** Xác nhận tài khoản bậc `normal` không thể đăng ký theo dõi các luồng dữ liệu đặc quyền (Sổ lệnh độ sâu Top 10 giá, luồng giao dịch riêng tư của tài khoản khác).
- [ ] **Hạn mức theo dõi luồng/mã theo Bậc (P1 — BVA theo hạn mức):**
  - Xác nhận tài khoản đăng ký theo dõi số lượng mã/kênh tại hạn mức (`TAI_HAN_MUC`) thành công.
  - Xác nhận tài khoản đăng ký theo dõi vượt hạn mức (`VUOT_HAN_MUC`) bị từ chối với thông báo vượt quá hạn mức cho phép của tài khoản (`TIER_QUOTA_EXCEEDED`).
- [ ] **Kiểm soát tần suất gửi yêu cầu theo Bậc (P1):** Xác nhận client gửi yêu cầu dồn dập vượt ngưỡng tần suất của Bậc (`VUOT_NGUONG`) nhận được thông báo từ chối (`RATE_LIMIT_EXCEEDED`) kèm thời gian chờ thử lại (`retry_after`).
- [ ] **Bảo vệ chống gửi yêu cầu dồn dập / Spam (P2):** Xác nhận gửi yêu cầu liên tục với tần suất cực hạn dẫn đến hệ thống chủ động ngắt kết nối do vi phạm chính sách bảo vệ.
- [ ] **Cơ chế Cooldown & Hồi phục (P1):** Xác nhận sau khi hết thời gian chờ phạt, client gửi lại yêu cầu được hệ thống chấp nhận và xử lý bình thường.
- [ ] **Điều tiết dữ liệu đẩy về theo Bậc & Chống bão giá (P2):** Xác nhận hệ thống điều tiết tần suất đẩy dữ liệu theo Bậc tài khoản (`normal` nhận snapshot gộp khi thị trường biến động mạnh, `vip`/`ultimate` nhận dữ liệu tức thời) và áp dụng gộp dữ liệu khi có biến động giao dịch cực lớn.

---

## 6. Chiến lược Gắn Tag

| Tag                  | Khi nào dùng                           | Ưu tiên CI    |
|----------------------|----------------------------------------|---------------|
| `@smoke`             | Luồng quan trọng nhất — chạy mỗi build | 🔴 Cao        |
| `@regression`        | Bộ regression đầy đủ                   | 🟡 Trung bình |
| `@happy-path`        | Kịch bản luồng thành công              | 🟡 Trung bình |
| `@negative`          | Kịch bản lỗi / từ chối                 | 🟡 Trung bình |
| `@edge-case`         | Biên, bất thường, race condition       | 🟢 Thấp       |
| `@api`               | Test cấp API                           | -             |
| `@ui`                | Test cấp UI                            | -             |
| `@ws`                | Test WebSocket                         | -             |
| `@tier`              | Phân tầng User Tier (normal, vip...)   | -             |
| `@rate-limit`        | Giới hạn tần suất và Quota             | -             |
| `@security`          | Bảo mật / Phân quyền                   | 🔴 Cao        |
| `@JIRA-XXXX`         | Liên kết ticket                        | -             |
| `@domain-securities` | Domain chứng khoán                     | -             |
| `@domain-banking`    | Domain ngân hàng                       | -             |

---

## 7. BVA cho Trường Chuỗi & Ngày Tháng

### 7.1. Trường Chuỗi (String Fields)

| Điều kiện | Giá trị | Mong đợi |
|-----------|---------|----------|
| Chuỗi rỗng | `""` | ❌ Từ chối (nếu bắt buộc) |
| Chỉ có khoảng trắng | `"   "` | ❌ Từ chối |
| Đúng độ dài tối thiểu | `"a"` × minLength | ✅ Chấp nhận |
| Đúng độ dài tối đa | `"a"` × maxLength | ✅ Chấp nhận |
| Vượt độ dài tối đa | `"a"` × (maxLength + 1) | ❌ Từ chối |
| Ký tự đặc biệt | `"<script>alert(1)</script>"` | ❌ Từ chối / Sanitize |
| Unicode / Tiếng Việt | `"Nguyễn Văn A"` | ✅ Chấp nhận |
| SQL Injection | `"'; DROP TABLE--"` | ❌ Từ chối / Sanitize |

### 7.2. Trường Ngày Tháng (Date/Time Fields)

| Điều kiện | Giá trị | Mong đợi |
|-----------|---------|----------|
| Ngày trong quá khứ | Hôm qua | Tùy quy tắc nghiệp vụ |
| Ngày hiện tại | Hôm nay | ✅ Chấp nhận |
| Ngày trong tương lai | Ngày mai | Tùy quy tắc nghiệp vụ |
| Ngày không hợp lệ | 30/02, 31/04 | ❌ Từ chối |
| Năm nhuận | 29/02/2024 vs 29/02/2023 | ✅ / ❌ |
| Sai định dạng | `DD-MM-YYYY` khi cần ISO 8601 | ❌ Từ chối |
| Xử lý timezone | Có/không có `Z` hoặc `+07:00` | Phân tích đúng timezone |

---

## 8. Mẫu Kiểm thử API Phổ biến

### 8.1. Ma Trận Xác thực & Phân quyền

| Kịch bản | Request | Kết quả mong đợi |
|----------|---------|-----------------|
| Không có API key | Bỏ header `x-api-key` | 401 Unauthorized |
| API key không hợp lệ | `x-api-key: invalid_key_123` | 401 Unauthorized |
| API key đã hết hạn | Dùng key đã thu hồi | 401 Unauthorized |
| Thiếu chữ ký | Bỏ header `signature` | 401 Unauthorized |
| Chữ ký bị giả mạo | Sửa payload sau khi ký | 401 Unauthorized |
| Sai tài khoản | `accountNo` không thuộc API key | 403 Forbidden |
| Credentials hợp lệ | Đầy đủ headers đúng | 200 OK |

### 8.2. Kiểm tra HTTP Method

| Kịch bản | Request | Kết quả mong đợi |
|----------|---------|-----------------|
| Sai method | `GET` trên endpoint `POST` | 405 Method Not Allowed |
| URL không tồn tại | `POST /api/v1/nonexistent` | 404 Not Found |
| Method đúng | `POST /api/v1/orders` | 200 OK |

### 8.3. Kiểm tra Payload

| Kịch bản | Request body | Kết quả mong đợi |
|----------|-------------|-----------------|
| Body rỗng | `{}` | 400 Bad Request |
| Thiếu field bắt buộc | Bỏ một field bắt buộc | 400 + tên field trong lỗi |
| Sai kiểu dữ liệu | Chuỗi khi cần số | 400 + lỗi type mismatch |
| Field lạ không xác định | Thêm `"unknown_field": "value"` | Bỏ qua hoặc 400 (tùy strict) |
| Field bắt buộc là null | `"price": null` | 400 Bad Request |

### 8.4. Concurrency, Rate Limiting & Idempotency

| Kịch bản | Hành động | Kết quả mong đợi |
|----------|-----------|-----------------|
| Rate Limiting | Gửi request vượt ngưỡng (vd: 100 req/s) | 429 Too Many Requests |
| Race Condition | Gửi N request cùng lúc sửa cùng resource | Xử lý 1, còn lại từ chối an toàn |
| Idempotency | Gửi 2 request cùng `idempotency-key` | Xử lý lần 1, lần 2 trả response đã cache |
| Payload quá lớn | Gửi JSON payload cực lớn | 413 Payload Too Large |

---

## 9. Từ Vựng Step Gherkin Chuẩn

Từ vựng tiếng Việt chuẩn cho Gherkin trong domain tài chính:

### Given (Tiền điều kiện)

```gherkin
Given người dùng đã đăng nhập với quyền "<role>"
Given hệ thống đang trong giờ giao dịch
Given tài khoản "<account>" có sức mua khả dụng "<amount>"
Given mã chứng khoán "<symbol>" có giá tham chiếu "<ref_price>"
Given khách hàng có thông tin xác thực hợp lệ
Given hệ thống đang hoạt động bình thường
```

### When (Hành động)

```gherkin
When đặt lệnh "<side>" "<quantity>" cổ phiếu "<symbol>" tại giá "<price>"
When gửi request POST tới endpoint "<endpoint>"
When trường "<field>" được gán giá trị "<value>"
When thực hiện chuyển tiền "<amount>" từ "<from>" sang "<to>"
When xác nhận giao dịch bằng OTP "<otp>"
When gửi request không có header "<header_name>"
```

### Then (Kiểm tra)

```gherkin
Then hệ thống trả về mã HTTP "<status_code>"
Then hệ thống từ chối request
Then hệ thống ghi nhận lệnh thành công với orderId hợp lệ
Then trả về thông báo lỗi "<error_message>"
Then số dư tài khoản giảm "<amount>"
Then response chứa trường "<field>" với giá trị "<value>"
Then hệ thống không xử lý giao dịch trùng lặp
```

---

## 10. Mẫu Kiểm thử WebSocket

WebSocket là giao thức real-time hai chiều giữa client và server. Test WebSocket cần verify connection lifecycle, message flow, và error handling.

### 10.1. Vòng đời Kết nối

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Kết nối thành công | Connect tới `ws://server/channel` | Connection OPEN, nhận welcome message | P0 |
| Kết nối có Auth | Connect với valid token | Connection OPEN với user context | P0 |
| URL không hợp lệ | Connect tới `ws://invalid` | Connection CLOSED với error | P1 |
| Không có Auth | Connect không có token | Connection REJECTED, status 401 | P0 |
| Token hết hạn | Connect với expired token | Connection REJECTED, status 403 | P1 |

### 10.2. Subscribe & Unsubscribe

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Subscribe channel | Send `{"action":"subscribe","channel":"VNINDEX"}` | Nhận `{"status":"subscribed","channel":"VNINDEX"}` | P0 |
| Subscribe nhiều channel | Subscribe "VNM", "SSI", "VCB" | Nhận data từ cả 3 channels | P0 |
| Unsubscribe channel | Send `{"action":"unsubscribe","channel":"VNINDEX"}` | Stop nhận events từ channel đó | P0 |
| Subscribe channel không tồn tại | Subscribe channel lạ | Nhận `{"error":"INVALID_CHANNEL"}` | P1 |
| Subscribe trùng | Subscribe cùng channel 2 lần | Chỉ subscribe 1 lần (idempotent) | P2 |

### 10.3. Nhận Dữ liệu Real-time

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Nhận market data | Subscribe "VNM" | Nhận price updates đúng định dạng | P0 |
| Định dạng message | Parse message JSON | Đủ fields: `symbol`, `price`, `volume`, `timestamp` | P0 |
| Thứ tự message | Nhận 100 messages liên tiếp | Messages đúng thứ tự (timestamp tăng dần) | P1 |
| Tần suất cao | Server gửi 1000 msg/sec | Client xử lý không bị drop message | P1 |

### 10.4. Reconnect & Resilience

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Auto Reconnect | Server close connection | Client tự động reconnect sau 2-5s | P0 |
| Resubscribe sau Reconnect | Reconnect thành công | Client tự động resubscribe channels cũ | P0 |
| Exponential Backoff | Server reject 3 lần liên tiếp | Client retry với backoff 2s → 4s → 8s | P1 |
| Max Retry | Server down 10 phút | Client stop retry sau N attempts, show error | P1 |

### 10.5. Error Handling

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Server Error | Server gửi `{"error":"INTERNAL_ERROR"}` | Client hiển thị notification, ghi log | P0 |
| Message không hợp lệ | Server gửi JSON invalid | Client log warning, bỏ qua message đó | P1 |
| Timeout | Server không respond trong 30s | Client close connection, show timeout error | P1 |
| Rate Limit | Client gửi > 100 msg/sec | Server từ chối `{"error":"RATE_LIMIT"}` | P2 |

### 10.6. Cross-Channel Isolation

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Channel Isolation | Subscribe "VNM" và "SSI" | VNM events không xuất hiện trong SSI handler | P0 |
| Unsubscribe một channel | Unsubscribe "VNM", giữ "SSI" | Chỉ stop nhận VNM, vẫn nhận SSI | P0 |
| Lỗi ở một channel | Error xảy ra ở channel A | Channel B vẫn hoạt động bình thường | P1 |

### 10.7. Ping/Pong Heartbeat

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Heartbeat | Client gửi ping frame | Server respond pong frame trong 5s | P1 |
| Kết nối không hoạt động | Server không respond pong 3 lần | Client close connection, reconnect | P1 |
| Client idle | Client không gửi message 5 phút | Server không close (server-initiated ping) | P2 |

### 10.8. Phân Tầng Bậc Tài Khoản & Rate Limiting

*(Áp dụng mô hình BVA: TAI_HAN_MUC, VUOT_HAN_MUC theo cấu hình môi trường)*

| Kịch bản | Hành động | Kết quả mong đợi | Ưu tiên |
|----------|-----------|-----------------|---------|
| Handshake Auth theo Tier | Connect với credentials của tier `normal`/`vip`/`ultimate` | Server xác thực và gán đúng quyền/quota | P0 |
| Max connections theo Tier | Mở kết nối tại/vượt hạn mức | Tại hạn mức: thành công; vượt: từ chối | P0 |
| Quyền hạn topic theo Tier | User `normal` subscribe VIP topic | Server từ chối với thông báo không đủ quyền | P0 |
| Quota subscribe theo Tier | Subscribe số mã/kênh tại/vượt hạn mức | Tại hạn mức: thành công; vượt: `TIER_QUOTA_EXCEEDED` | P1 |
| Rate limit gửi theo Tier | Gửi message trong/vượt ngưỡng | Trong ngưỡng: xử lý; vượt: `RATE_LIMIT_EXCEEDED` + `retry_after` | P1 |
| Spam / DoS Protection | Client spam liên tục vượt ngưỡng cực hạn | Server chủ động ngắt kết nối | P2 |
| Cooldown & Recovery | Đợi hết `retry_after` rồi gửi lại | Server chấp nhận và xử lý bình thường | P1 |

### 10.9. Mẫu Gherkin cho WebSocket

```gherkin
Scenario: Subscribe kênh dữ liệu thị trường thành công
  Given WebSocket connection đã được thiết lập tới ws
  When client gửi message subscribe channel "VNINDEX"
    """
    {"action": "subscribe", "channel": "VNINDEX"}
    """
  Then client nhận được confirmation message
    """
    {"status": "subscribed", "channel": "VNINDEX"}
    """
  And client bắt đầu nhận real-time market data từ channel "VNINDEX"

Scenario: Tự động reconnect sau khi mất kết nối
  Given client đã subscribe channel "SSI"
  And client đang nhận real-time data
  When server đóng connection (simulate: network interruption)
  Then client phát hiện connection closed
  And client tự động reconnect trong vòng 5 giây
  And client tự động resubscribe channel "SSI"
  And client tiếp tục nhận data sau khi reconnect

Scenario: Retry với exponential backoff khi server từ chối liên tiếp
  Given client đang cố gắng connect
  When server reject connection lần 1
  Then client retry sau 2 giây
  When server reject connection lần 2
  Then client retry sau 4 giây
  When server reject connection lần 3
  Then client retry sau 8 giây
```

### 10.10. Các Vấn Đề WebSocket Thường Gặp

| Vấn đề | Triệu chứng | Nguyên nhân | Cách sửa |
|--------|-------------|-------------|---------|
| Mất message | Client bỏ sót events | Network congestion | Thêm buffer, batch messages |
| Duplicate subscribe | Nhận data trùng lặp | Không track subscription state | Idempotent subscribe |
| Reconnect loop | Connect/disconnect liên tục | Server reject, client retry ngay | Exponential backoff |
| Memory leak | Client memory tăng dần | Event listeners không cleanup | Unsubscribe on unmount |
| Stale connection | Không nhận data | Connection idle quá lâu | Ping/pong heartbeat |
