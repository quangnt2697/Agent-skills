# ba-refine — Phiên Refine Mẫu

Ví dụ về một phiên refine ý tưởng chất lượng cao.

---

## Ví dụ 1: Refine Tính năng Export Báo cáo

### Jira Task Gốc

**Issue Key:** PROJ-456  
**Summary:** "Add export button to reports"  
**Description:** "Users want to export their trading reports"

---

### Giai đoạn 0: Tải về & Tìm hiểu

```
Agent: Đang tải PROJ-456...

✅ Tải thành công

**Metadata:**
- Loại: Story
- Người tạo: john@company.com
- Người nhận: Chưa có
- Độ ưu tiên: Medium
- Labels: [feature-request, reports]

**Mô tả gốc:**
"Users want to export their trading reports"

📊 Đánh giá ban đầu: Mô tả khá mơ hồ. Cần làm rõ:
- Users nào? (Nhà đầu tư cá nhân, tổ chức, admin?)
- Báo cáo nào? (P&L hàng ngày, lịch sử giao dịch, tất cả?)
- Export ra định dạng gì? (PDF, Excel, CSV?)
- Export để làm gì? (Kiểm toán, phân tích, chia sẻ?)

Chuyển sang Giai đoạn 1...
```

---

### Giai đoạn 1: Thấu hiểu & Mở rộng (Phân kỳ)

#### Câu hỏi HMW

```
Agent: Tái trình bày vấn đề:

**Làm sao để** traders có thể lưu trữ và sử dụng dữ liệu giao dịch ngoài nền tảng theo cách phục vụ đúng workflow cụ thể của họ?

Câu hỏi này chuyển trọng tâm từ "thêm nút bấm" sang "giải quyết nhu cầu thực sự".
```

#### Làm rõ Thành phần Cốt lõi

```
Agent: Trước khi sinh ra các biến thể, tôi cần làm rõ các thành phần cốt lõi.

Cho phép tôi hỏi bạn vài câu:
```

**[AskUserQuestion được kích hoạt]**

```
Câu 1: Ai thực sự cần tính năng export này?
Tùy chọn:
- Nhà đầu tư lướt sóng (giao dịch thường xuyên, cần tổng hợp hàng ngày)
- Nhà đầu tư dài hạn (review danh mục theo quý)
- Trader chuyên nghiệp (yêu cầu tuân thủ/kiểm toán)
- Quản lý tài khoản (báo cáo cho khách hàng)

User: "Nhà đầu tư lướt sóng và trader chuyên nghiệp"
```

```
Câu 2: Bối cảnh kinh doanh là gì? Tại sao bây giờ?
Tùy chọn:
- Đối thủ ra tính năng tương tự (theo kịp thị trường)
- Yêu cầu tuân thủ (quy định pháp lý)
- Yêu cầu hàng đầu từ người dùng (nhu cầu thực tế)
- Sáng kiến chiến lược (tầm nhìn sản phẩm)

User: "Yêu cầu hàng đầu - 87 ticket hỗ trợ trong Q3"
```

```
Câu 3: Mục đích chính khi export dữ liệu là gì?
Tùy chọn:
- Khai thuế (cuối năm)
- Lưu trữ cá nhân (backup)
- Chia sẻ với tư vấn tài chính (cộng tác)
- Phân tích offline bằng Excel/Python (power users)

User: "Kết hợp khai thuế và phân tích offline"
```

```
Câu 4: Có ràng buộc kỹ thuật nào không?
User: "Báo cáo có thể rất lớn (10K+ giao dịch), cần xử lý hiệu năng"
```

#### Kiểm tra Độ tin cậy

```
Agent: Dựa trên câu trả lời:

✅ User Story: Rõ ràng (trader lướt sóng + chuyên nghiệp, khai thuế + phân tích)
✅ Bối cảnh: Rõ ràng (nhu cầu cao, 87 tickets)
✅ Use Cases: Rõ ràng (thuế + phân tích)
⚠️  Acceptance Criteria: Cần xác định thêm
⚠️  Success Metrics: Cần xác định thêm

Confidence: 75% — Cần làm rõ thêm một chút...
```

**[Hỏi thêm qua AskUserQuestion]**

```
Agent: Thêm 2 câu nhanh:

C5: Đo lường thành công bằng gì?
User: "Giảm ticket hỗ trợ + tỷ lệ sử dụng tính năng"

C6: Có yêu cầu tuân thủ/bảo mật không?
User: "Có, cần audit trail ghi nhận ai export gì"

✅ Confidence hiện tại: 92% — Sẵn sàng sinh biến thể!
```

#### Các Biến thể Ý tưởng (5-8)

```
Agent: Dựa trên thông tin thu thập, đây là 6 biến thể từ các góc nhìn khác nhau:

---

**A. Quick Win: Export PDF Đơn giản**

*Lăng kính: Đơn giản hóa cực đoan*

Nút bấm 1 lần → Tải view hiện tại thành PDF

**Ưu điểm:**
- Triển khai nhanh nhất (2-3 ngày)
- Rủi ro thấp
- Giải quyết ngay nỗi đau trước mắt

**Nhược điểm:**
- Không tốt cho dữ liệu lớn
- Hạn chế tùy chỉnh
- Ai cũng có (không khác biệt)

**Giả định:**
- Users muốn PDF cụ thể
- View hiện tại có đủ dữ liệu cần thiết

---

**B. Power User: Export Đa định dạng**

*Lăng kính: Đổi Target User (power users)*

Wizard export với tùy chọn định dạng (PDF, Excel, CSV, JSON) + chọn khoảng thời gian + chọn cột

**Ưu điểm:**
- Phục vụ cả casual và power users
- Khác biệt mạnh (hầu hết đối thủ chỉ làm PDF)
- Hỗ trợ workflow phân tích nâng cao

**Nhược điểm:**
- Chi phí phát triển cao hơn (1-2 tuần)
- UI phức tạp hơn

**Giả định:**
- Users biết mình cần định dạng nào
- Nhiều tùy chọn = tốt hơn (có thể sai!)

---

**C. Tuân thủ Trước tiên: Export với Audit Trail**

*Lăng kính: Chuyên gia (Compliance) + Bảo mật*

Export bao gồm:
- Audit trail chống giả mạo (ai, khi nào, cái gì)
- Định dạng PDF/A (chuẩn lưu trữ)
- Chữ ký số + watermark
- Link tải mã hóa

**Ưu điểm:**
- Giải quyết nỗi đau compliance (rất lớn với trader chuyên nghiệp)
- Hào phòng thủ mạnh (khó copy tốt)
- Thực sự giảm rủi ro pháp lý

**Nhược điểm:**
- Chi phí cao hơn (2 tuần)
- Cần hạ tầng (audit DB, dịch vụ ký số)

**Giả định:**
- Compliance là nỗi đau đủ lớn
- Có thể triển khai PDF signing đúng cách

---

**D. Đảo ngược: Không Export, Chia sẻ Trực tiếp**

*Lăng kính: Đảo ngược + First Principles*

Thay vì export → Tạo link chia sẻ mã hóa với:
- Tự động cập nhật (live)
- Hết hạn (24h, 7d, 30d)
- Chỉ đọc (read-only)

**Ưu điểm:**
- Thực sự khác biệt (không ai làm)
- Luôn cập nhật (không bị stale)
- Dễ cộng tác hơn

**Nhược điểm:**
- Không giải quyết use case "phân tích offline"
- Cần internet

**Giả định:**
- Users có internet ổn định
- "Export" không bắt buộc phải có

---

**E. Nền tảng: Thư viện Báo cáo**

*Lăng kính: Lai tạp (Export + Lưu trữ + Chia sẻ)*

Không chỉ export, mà còn:
- Snapshot tự động hàng ngày/tuần
- Thư viện báo cáo cá nhân (lịch sử)
- Chia sẻ với tư vấn/kế toán
- Ghi chú cộng tác

**Ưu điểm:**
- Chiến lược (tăng stickiness cho nền tảng)
- Network effects (tư vấn tham gia nền tảng)
- Cơ hội upsell (gói pro)

**Nhược điểm:**
- Phạm vi lớn (1-2 tháng)
- Cần hạ tầng lưu trữ
- Ngoài phạm vi quick win

**Giả định:**
- Users muốn lịch sử báo cáo
- Tư vấn sẽ dùng nền tảng của ta

---

**F. Quy mô 10x: Hàng đợi Export Bất đồng bộ**

*Lăng kính: Quy mô 10x + Hiệu năng*

Cho export lớn:
- Hàng đợi background job
- Thông báo email khi xong
- Snapshot tạo sẵn (cached)
- Streaming cho dataset khổng lồ

**Ưu điểm:**
- Xử lý mượt 10K+ giao dịch
- UX tốt hơn (không timeout trình duyệt)
- Kiến trúc mở rộng được

**Nhược điểm:**
- Triển khai phức tạp (2-3 tuần)
- Cần hạ tầng queue (Redis/Bull)

**Giả định:**
- Export lớn xảy ra đủ thường xuyên
- Users chấp nhận async (không tức thì)

---

**Bảng Tổng hợp:**

| Biến thể | Thời gian | Giá trị User | Khác biệt | Rủi ro | Tổng |
|----------|-----------|-------------|-----------|--------|------|
| A. PDF Đơn giản | 3 ngày | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 12/20 |
| B. Đa định dạng | 1 tuần | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 14/20 |
| C. Tuân thủ | 2 tuần | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 18/20 |
| D. Chia sẻ trực tiếp | 1.5 tuần | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 14/20 |
| E. Thư viện | 2 tháng | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 16/20 |
| F. Hàng đợi Async | 2 tuần | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 15/20 |

Bạn thấy hướng nào hay? Hay có góc nhìn nào tôi bỏ sót?
```

---

### Giai đoạn 2: Đánh giá & Hội tụ

```
User: "C và B nghe hay. C có vẻ chiến lược nhưng B có quá mức không?"

Agent: Câu hỏi tốt. Để tôi gom nhóm và thử lửa:

**Nhóm Hướng đi 1: Tuân thủ Trước tiên (C)**
**Nhóm Hướng đi 2: Nhiều tính năng (B + F kết hợp)**

Để tôi thử lửa cả hai...

---

## Hướng đi 1: Export Ưu tiên Tuân thủ

### Thử lửa

**Giá trị Người dùng: ⭐⭐⭐⭐ (4/5)**
- Trader chuyên nghiệp CẦN audit trail (painkiller)
- Nhà đầu tư cá nhân cũng hưởng lợi (yên tâm)
- Lượng hóa: Giải quyết 60% ticket hỗ trợ (liên quan compliance)

**Tính Khả thi: ⭐⭐⭐ (3/5)**
- Chi phí trung bình: 2 tuần
- Phần khó nhất: Tích hợp dịch vụ ký số PDF
- Phụ thuộc: Cần schema DB audit

**Sự Khác biệt: ⭐⭐⭐⭐⭐ (5/5)**
- Đối thủ không có
- Khó copy tốt (cần hiểu sâu compliance)
- Hào phòng thủ mạnh

**Rủi ro: ⭐⭐⭐⭐⭐ (5/5)**
- Thực sự GIẢM rủi ro
- Audit trail = minh bạch
- Pháp chế rất thích

**Tổng: 17/20 (Mạnh)**

### Giả định Ẩn

**Đang đặt cược (chưa xác minh):**
- Compliance là nỗi đau đủ lớn để đầu tư 2 tuần
- Có thể triển khai PDF signing đúng cách
- Chi phí lưu trữ audit không phình quá

**Có thể giết chết ý tưởng:**
- Bộ phận pháp chế/compliance không duyệt cách tiếp cận
- Dịch vụ ký PDF quá đắt
- Ảnh hưởng hiệu năng do audit logging

**Quyết định ngó lơ:**
- Tính năng nâng cao (export theo lịch, template)
- Lý do: Tập trung vào giá trị compliance trước, mở rộng sau

---

## Hướng đi 2: Nhiều Tính năng (Đa định dạng + Async)

### Thử lửa

**Giá trị Người dùng: ⭐⭐⭐⭐ (4/5)**
- Phục vụ power users tốt
- Xử lý dataset lớn
- Nhưng không "phải có" với đa số

**Tính Khả thi: ⭐⭐⭐ (3/5)**
- Chi phí kết hợp: 2-3 tuần
- Hai hệ thống con (chuyển đổi định dạng + hàng đợi)
- Phức tạp hơn = nhiều bug hơn

**Sự Khác biệt: ⭐⭐⭐⭐ (4/5)**
- Tốt hơn đối thủ
- Nhưng không phải góc nhìn độc đáo

**Rủi ro: ⭐⭐⭐ (3/5)**
- Rủi ro trung bình (độ phức tạp)
- Hàng đợi có thể fail âm thầm
- Bề mặt tấn công lớn hơn

**Tổng: 14/20 (Trung bình)**

### Giả định Ẩn

**Đang đặt cược (chưa xác minh):**
- Users cần nhiều định dạng (có khi chỉ PDF là đủ?)
- Export lớn xảy ra thường xuyên (cần dữ liệu xác nhận)
- UX async là chấp nhận được (tức thì có thể tốt hơn)

**Có thể giết chết ý tưởng:**
- Users bối rối vì quá nhiều tùy chọn
- Hạ tầng queue trở thành gánh nặng vận hành
- Đa số export nhỏ thôi (overkill)

---

## Khuyến nghị

Chọn **Hướng đi 1: Tuân thủ Trước tiên** cho v1.

**Lý do:**
- Điểm tổng cao hơn (17 vs 14)
- Khác biệt rõ ràng (hào phòng thủ chiến lược)
- Giải quyết nỗi đau cụ thể (compliance)
- Giảm rủi ro (pháp chế rất ủng hộ)

**Sau đó mở rộng dần:**
- Giai đoạn 2: Thêm đa định dạng nếu dữ liệu cho thấy nhu cầu
- Giai đoạn 3: Thêm hàng đợi async nếu hiệu năng là vấn đề

**Đừng over-engineer v1.** Bắt đầu với giá trị cốt lõi mạnh (compliance),
mở rộng dựa trên dữ liệu sử dụng thực tế.

Nghe ổn không, hay bạn thấy khác?
```

```
User: "Hợp lý. Chọn C."

Agent: Tuyệt. Chuyển sang Giai đoạn 3 để mài sắc spec...
```

---

### Giai đoạn 3: Mài sắc & Cấu trúc

```
Agent: Bắt đầu Giai đoạn 3...

[Bước 3.1] Tạo bản nháp spec...
📁 File: /project-root/workspace/issues/PROJ-456/spec/refined-draft.md
```

```
[Bước 3.2] 📝 BẢN NHÁP SPEC — Vui lòng review kỹ trước khi chốt:

📄 File: /project-root/workspace/issues/PROJ-456/spec/refined-draft.md
────────────────────────────────────────────
```

```markdown
## 🧩 User Story

**As a** trader chuyên nghiệp chịu yêu cầu kiểm toán pháp quy,
**I want** xuất báo cáo giao dịch kèm nhật ký kiểm toán chống giả mạo,
**So that** cung cấp tài liệu tuân thủ hợp lệ cho kiểm toán viên và giảm rủi ro pháp lý.

## 💼 Business Context

- **Vấn đề (Problem):** 87 ticket hỗ trợ trong Q3 yêu cầu xuất báo cáo phục vụ kiểm toán thuế; giải pháp chụp màn hình thủ công dễ sai lệch và không có giá trị pháp lý.
- **Mục tiêu (Goal):** Cung cấp tính năng xuất báo cáo kèm nhật ký kiểm toán chống giả mạo, giúp giảm ~60% tải hỗ trợ và đáp ứng yêu cầu tuân thủ của trader chuyên nghiệp.
- **Tính cấp thiết (Urgency):** Mùa quyết toán thuế Q4 đang tới gần và cần đóng lỗ hổng thiếu nhật ký kiểm toán theo cảnh báo của bộ phận pháp chế.
- **Phạm vi (Scope):**
  - *Trong phạm vi (In-Scope):* Xuất báo cáo P&L, Lịch sử giao dịch và Tổng hợp danh mục sang định dạng PDF/A có chữ ký số và nhật ký kiểm toán.
  - *Ngoài phạm vi (Out-of-Scope):* Xuất báo cáo tự động định kỳ theo lịch hoặc tùy chỉnh mẫu báo cáo riêng.

## 📜 Business Rules

- **[BR-01] Định dạng chuẩn pháp quy:** Báo cáo xuất ra bắt buộc ở định dạng PDF/A kèm chữ ký số của hệ thống và đóng dấu mờ (watermark) mã định danh nhà đầu tư.
- **[BR-02] Thời hạn đường dẫn tải:** Đường dẫn tải báo cáo được mã hóa bảo mật và tự động hết hiệu lực sau 24 giờ kể từ thời điểm khởi tạo.
- **[BR-03] Ngưỡng xử lý báo cáo lớn:** Báo cáo có từ 10.000 giao dịch trở xuống được tải trực tiếp; báo cáo trên 10.000 giao dịch được xử lý nền và gửi thông báo qua email trong vòng tối đa 5 phút.
- **[BR-04] Giới hạn tần suất xuất báo cáo:** Mỗi nhà đầu tư được phép yêu cầu xuất tối đa 10 báo cáo trong mỗi khung giờ 60 phút.

## ✅ Acceptance Criteria

```gherkin
Feature: Xuất Báo cáo Giao dịch Ưu tiên Tuân thủ

  Scenario: Happy - Xuất báo cáo thành công kèm nhật ký kiểm toán
    Given nhà đầu tư chuyên nghiệp đã đăng nhập và đang ở màn hình Báo cáo
    When nhà đầu tư chọn loại báo cáo "Lịch sử Giao dịch" và nhấn nút "Xuất Báo cáo"
    Then hệ thống khởi tạo tệp báo cáo chuẩn PDF/A có chữ ký số và dấu mờ định danh
    And hệ thống ghi nhận bản ghi nhật ký kiểm toán cho lần xuất báo cáo này
    And đường dẫn tải báo cáo có hiệu lực trong vòng 24 giờ

  Scenario: Validation - Từ chối khi vượt quá giới hạn số lần xuất báo cáo trong giờ
    Given nhà đầu tư đã thực hiện đủ 10 lần xuất báo cáo trong vòng 60 phút gần nhất
    When nhà đầu tư tiếp tục nhấn nút "Xuất Báo cáo" lần thứ 11
    Then hệ thống từ chối yêu cầu và hiển thị thông báo đã vượt quá hạn mức xuất báo cáo trong giờ

  Scenario: Edge - Xử lý báo cáo dung lượng lớn trên 10.000 giao dịch
    Given nhà đầu tư chọn khoảng thời gian báo cáo có hơn 10.000 giao dịch
    When nhà đầu tư nhấn nút "Xuất Báo cáo"
    Then hệ thống hiển thị thông báo báo cáo đang được tổng hợp và sẽ gửi qua email
    And nhà đầu tư nhận được email kèm đường dẫn tải báo cáo hoàn tất trong vòng 5 phút
```

## 🎨 UI Design / Mockup

> 🎯 Fidelity Score: 96% (đọc từ origin/master)

- **Màn hình gốc (AS-IS Screen):** Màn hình Báo cáo Giao dịch (`ReportExportModal`, `ExportButton`)

### Kịch bản 1 (Case 1): Luồng thao tác chuẩn — Xuất báo cáo tức thời

![Mockup Case 1 - Xuất báo cáo tức thời](./diagrams/mockup-case-1.png)

- **Điểm chạm & Phản hồi nghiệp vụ trên giao diện:**
  - **① Chọn loại báo cáo:** Nhà đầu tư chọn loại báo cáo cần xuất (P&L Hàng ngày, Lịch sử Giao dịch, Tổng hợp Danh mục).
  - **② Nhấn nút "Xuất Báo cáo":** Hệ thống kiểm tra hạn mức `[BR-04]` và khởi tạo tệp PDF/A có chữ ký số `[BR-01]`.

### Bảng Chú thích Thay đổi Giao diện (UI Delta Mapping)

| Ký hiệu | Tên phần tử / Trường thông tin | Loại thay đổi | Mô tả hành vi & Quy tắc hiển thị | Quy tắc áp dụng |
|:---:|---|---|---|---|
| **①** | Bộ chọn Loại Báo Cáo | Giữ nguyên | Cho phép chọn loại báo cáo giao dịch cần trích xuất | `[BR-01]` |
| **②** | Nút "Xuất Báo cáo" | Thêm mới | Kích hoạt xuất báo cáo PDF/A hoặc chuyển sang xử lý nền nếu > 10.000 dòng | `[BR-01]`, `[BR-03]`, `[BR-04]` |

## ☀️ Success Criteria & Tracking

### Success Metrics

| Chỉ số | Hiện tại | Mục tiêu | Cách đo |
|---|---|---|---|
| Ticket hỗ trợ (liên quan xuất báo cáo) | 87/quý | <30/quý | Phân tích nhãn hỗ trợ khách hàng |
| Tỷ lệ sử dụng tính năng xuất báo cáo | 0% | >40% nhà đầu tư hoạt động | Báo cáo phân tích sản phẩm |
| Thời gian phản hồi truy vấn kiểm toán | Thủ công (chậm) | <1 giờ phản hồi | Thời gian tra cứu nhật ký kiểm toán |

### Tracking

| Sự kiện | Dashboard / Báo cáo | Chủ sở hữu |
|---|---|---|
| Khởi tạo yêu cầu xuất báo cáo | Bảng theo dõi tăng trưởng sản phẩm | Product |
| Hoàn tất xuất báo cáo PDF/A | Bảng theo dõi tăng trưởng sản phẩm | Product |
| Xuất báo cáo thất bại hoặc chạm hạn mức | Bảng cảnh báo vận hành | Vận hành |
```

```
────────────────────────────────────────────

📊 Đánh giá Chất lượng Nội bộ:
- Độ đầy đủ User Story: 95%
- Tính testable của AC: 95%
- Giả định được vạch ra: 90%
- Kết quả stress-test: 95%
- **Confidence tổng: 🟢 94%**

🔍 Checklist nhanh:
- ✅ User Story có đầy đủ Role + Goal + Value
- ✅ AC đều testable (Given-When-Then)
- ✅ Success Metrics có baseline + target
- ✅ Không còn placeholder chưa thay

⏳ Bạn hãy review và phản hồi:
- ✅ "OK" → Chốt bản cuối và hỏi push Jira
- ✏️ Góp ý cụ thể → Sửa và trình lại
- 🔄 "Làm lại" → Viết lại từ đầu
```

```
User: "AC thiếu case khi user export nhưng không có dữ liệu giao dịch.
       Và phần Technical Notes nên bỏ Celery, dùng Bull queue có sẵn."
```

```
[Bước 3.2 — Vòng 2] Đã sửa theo góp ý, trình lại toàn bộ:

────────────────────────────────────────────
[...đã sửa 2 điểm:
  1. Thêm Scenario "Export khi không có dữ liệu" vào AC
  2. Sửa dependency từ Celery+Redis thành Bull queue có sẵn
...toàn bộ nội dung được in lại đầy đủ...]
────────────────────────────────────────────

Bản sửa đã đúng ý bạn chưa?
```

```
User: "OK, chốt"
```

```
[Bước 3.3] ✅ Bản cuối cùng đã chốt!
📄 File: /project-root/workspace/issues/PROJ-456/spec/refined.md
📊 Confidence: 94%

Bạn có muốn push lên Jira không? (Gõ OK hoặc Không)
```

---

### Giai đoạn 4: Đẩy lên Jira

```
User: "OK"

Agent: Đang push lên Jira...

📝 Chuyển đổi markdown sang ADF...
🔄 Cập nhật description PROJ-456...
✅ Description đã cập nhật

📋 Tạo push log...
✅ Push log: /project-root/workspace/issues/PROJ-456/spec/push-log.json

🔗 Xem task đã cập nhật: https://your-domain.atlassian.net/browse/PROJ-456

Các bước tiếp theo:
- /qa-test-design PROJ-456 (thiết kế test)
- /dev-tech-spec PROJ-456 (viết tech spec)
- /e2e-delivery PROJ-456 (pipeline toàn trình)
```

---

## Rút ra từ Ví dụ này

✅ **Giai đoạn 0:** Tải nhanh, đánh giá ngay mức độ rõ ràng
✅ **Giai đoạn 1:** Làm rõ tương tác qua AskUserQuestion, 6 biến thể đa dạng có lý do rõ ràng
✅ **Giai đoạn 2:** Thử lửa trung thực, vạch trần giả định ẩn, khuyến nghị rõ ràng
✅ **Giai đoạn 3 — 3.1:** Bản nháp spec được tạo với đầy đủ sections
✅ **Giai đoạn 3 — 3.2:** Toàn bộ draft được trình cho user, user góp ý (AC thiếu case, sửa dependency), agent sửa và trình lại
✅ **Giai đoạn 3 — 3.3:** User nói "OK, chốt" → chốt bản cuối, hỏi push Jira
✅ **Giai đoạn 4:** Push sạch lên Jira (KHÔNG comment, KHÔNG label)

**Điều khiến phiên này tốt:**
- Không vội vàng (dành thời gian làm rõ)
- Biến thể đa dạng (không phải 20 ý tưởng nông cạn)
- Đánh giá trung thực (chỉ ra điểm yếu của Hướng đi 2)
- Có căn cứ (tham chiếu dữ liệu ticket hỗ trợ, phân tích đối thủ)
- **User review toàn bộ nội dung draft trước khi chốt** (vòng góp ý → sửa → chốt)
- Khả thi (các bước tiếp theo rõ ràng)

**Giọng điệu:**
- Trực tiếp, có chiều sâu
- Đẩy user suy nghĩ sâu hơn ("B có quá mức không?")
- Không phải yes-machine (chỉ ra over-engineering)
