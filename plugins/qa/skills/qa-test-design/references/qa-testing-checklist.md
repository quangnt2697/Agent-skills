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
| Dữ liệu mẫu        | Cụ thể, thực tế: `"VNM"`, `"50000"`, `"SSI"` — KHÔNG dùng `"foo"`, `"bar"` |

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
