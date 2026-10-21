## 1. Mục tiêu & Giá trị Nghiệp vụ (Business Objective & Value)

- **Bối cảnh & Nỗi đau (Problem):** [1-2 câu nêu đúng nỗi đau/tình trạng hiện tại của người dùng hoặc yêu cầu từ UBCKNN/KRX]
- **Mục tiêu (Goal):** [1 câu về kết quả kỳ vọng và giá trị kinh doanh mang lại]
- **Tính cấp thiết (Urgency):** [1 câu giải thích lý do cần triển khai ngay]

## 2. Phạm vi & Đối tượng Áp dụng (Scope & Actors)

- **Đối tượng áp dụng (In-Scope Actors):** [Nhà đầu tư cá nhân / VIP / Tiểu khoản Thường (đuôi 1) / Tiểu khoản Ký quỹ (đuôi 6)...]
- **Phạm vi chức năng (In-Scope):** [Các nghiệp vụ/sàn giao dịch/loại lệnh nằm trong phạm vi]
- **Ngoài phạm vi (Out-of-Scope):** [Các nghiệp vụ, loại tài khoản hoặc tính năng chưa xử lý trong kỳ này]

## 3. Luồng Nghiệp vụ Chính (Main Business Flow)

<!-- Mô tả luồng thao tác từ góc nhìn người dùng/nghiệp vụ theo các bước có đánh số. TUYỆT ĐỐI KHÔNG dùng sơ đồ Mermaid. -->
1. **Bước 1:** [Người dùng thực hiện hành động gì]
2. **Bước 2:** [Hệ thống kiểm tra điều kiện nghiệp vụ gì]
3. **Bước 3:** [Hệ thống phản hồi kết quả và cập nhật trạng thái nghiệp vụ]

## 4. Luồng Nghiệp vụ Phụ & Xử lý Ngoại lệ (Alternative & Exception Flows)

- **Hủy / Thay đổi giữa chừng:** [Hành vi nghiệp vụ khi người dùng hủy thao tác hoặc thay đổi yêu cầu]
- **Từ chối từ Sở giao dịch / Đối tác:** [Cách xử lý quyền lợi người dùng khi lệnh/yêu cầu bị từ chối]
- **Xử lý khi gián đoạn:** [Quy tắc bảo lưu trạng thái hoặc hoàn trả sức mua/tiền khi phát sinh ngoại lệ]

## 5. Danh mục Quy tắc Nghiệp vụ & Công thức ([BR-xx])

- **[BR-01]** [Tên quy tắc]: [Mô tả chi tiết quy tắc, điều kiện ràng buộc hoặc công thức tính toán làm tròn]
- **[BR-02]** [Tên quy tắc]: [Mô tả chi tiết quy tắc, điều kiện ràng buộc hoặc công thức tính toán làm tròn]

## 6. Tiêu chí Nghiệm thu Nghiệp vụ ([AC-x.y])

```gherkin
Feature: [Tên tính năng nghiệp vụ]

  @happy-path @persona
  Scenario: [AC-1.1] [Luồng thành công chính theo phân khúc người dùng]
    Given [Điều kiện tiên quyết nghiệp vụ của người dùng]
    When [Người dùng thực hiện hành động]
    Then [Kết quả nghiệp vụ kỳ vọng hiển thị hoặc ghi nhận]

  @negative
  Scenario: [AC-1.2] [Từ chối khi vi phạm điều kiện nghiệp vụ]
    Given [Điều kiện tiên quyết nghiệp vụ của người dùng]
    When [Người dùng thực hiện hành động không hợp lệ]
    Then [Hệ thống từ chối và hiển thị thông báo nghiệp vụ rõ ràng]

  @boundary
  Scenario: [AC-1.3] [Kiểm tra tại ngưỡng giá trị biên nghiệp vụ]
    Given [Người dùng tại ngưỡng hạn mức hoặc biên độ]
    When [Thực hiện giao dịch tại giá trị biên]
    Then [Hệ thống xử lý đúng theo ranh giới quy tắc]
```

## 7. Giả định Nghiệp vụ & Đo lường Thành công (Business Assumptions & Success Metrics)

- **Giả định nghiệp vụ (Assumptions):** [Các tiền đề nghiệp vụ được mặc định là đúng để triển khai]
- **Câu hỏi mở (Open Questions):** [Các điểm cần thống nhất thêm với Product Owner / Risk / Compliance nếu có]

### Success Metrics

| Metric   | Current    | Target   | Measurement      |
|----------|------------|----------|------------------|
| [KPI 1]  | [baseline] | [goal]   | [how to measure] |
| [KPI 2]  | [baseline] | [goal]   | [how to measure] |

### Tracking

| Event        | Dashboard / Report   | Owner         |
|--------------|----------------------|---------------|
| [Event name] | [Link to dashboard]  | [Team/Person] |

## 8. Thiết kế Giao diện & Điểm chạm Thao tác (UI/UX Mockup)

<!-- ÁP DỤNG KHI TASK CÓ THAY ĐỔI GIAO DIỆN NGƯỜI DÙNG THEO CHỐT CHẶN 3 & 4. KHÔNG MÔ TẢ DESIGN BẰNG TEXT LAN MAN; DÁN TRỰC TIẾP ẢNH TỪNG CASE VÀ GHI CHÚ THEO THAO TÁC -->
- **Màn hình gốc (AS-IS Screen):** [Tên màn hình trên Web/App hiện tại, đường dẫn file codebase tương ứng từ ui-component-map.json]
- **Mã nguồn Mockup HTML:** `workspace/issues/{issueKey}/spec/diagrams/mockup.html`

### 📱 Case 1: [Tên kịch bản thao tác chính / Luồng chuẩn]
![Case 1: Thao tác chính](workspace/issues/{issueKey}/spec/diagrams/mockup-case-1.png)

- **① [Điểm chạm thao tác 1]:** [Thao tác người dùng: Click/Nhập/Chọn...] ➔ [Phản hồi hệ thống & trạng thái UI hiển thị] `[BR-01]`, `[AC-1.1]`
- **② [Điểm chạm thao tác 2]:** [Thao tác người dùng: Click/Hover...] ➔ [Phản hồi hệ thống & trạng thái UI hiển thị] `[BR-02]`, `[AC-1.2]`

### ⚠️ Case 2: [Tình huống cảnh báo ngoại lệ / Xử lý lỗi]
![Case 2: Cảnh báo ngoại lệ](workspace/issues/{issueKey}/spec/diagrams/mockup-case-2.png)

- **③ [Điểm chạm cảnh báo]:** [Điều kiện kích hoạt lỗi/vượt hạn mức] ➔ [Hiển thị banner/thông báo lỗi & vô hiệu hóa nút bấm] `[BR-03]`, `[AC-2.1]`

### 🔒 Case 3: [Tình huống biên / Khóa điều kiện phiên giao dịch]
![Case 3: Tình huống biên](workspace/issues/{issueKey}/spec/diagrams/mockup-case-3.png)

- **④ [Điểm chạm khóa thao tác]:** [Điều kiện biên / Khung giờ đặc thù] ➔ [Trạng thái vô hiệu hóa thành phần UI & tooltip giải thích] `[BR-04]`, `[AC-3.1]`

### Bảng Chú thích Thay đổi Giao diện (UI Delta Mapping)
| Ký hiệu trên Mockup | Thành phần Giao diện | Loại thay đổi (Thêm/Sửa/Xóa) | Thao tác Người dùng & Phản hồi Hệ thống | Ràng buộc Nghiệp vụ ([BR-xx] / [AC-x.y]) |
| :---: | --- | :---: | --- | :---: |
| **①** | [Tên phần tử UI 1] | Thêm mới (Dropdown) | [Thao tác chọn giá trị] ➔ [Cập nhật thông số tương ứng] | [BR-01], [AC-1.1] |
| **②** | [Tên phần tử UI 2] | Sửa đổi (Badge/Stepper) | [Thao tác tăng giảm] ➔ [Làm tròn theo bước giá/khối lượng sàn] | [BR-02], [AC-1.2] |
| **③** | [Tên phần tử UI 3] | Thêm mới (Banner lỗi) | [Khi vi phạm hạn mức] ➔ [Hiện cảnh báo đỏ và disable nút gửi lệnh] | [BR-03], [AC-2.1] |
| **④** | [Tên phần tử UI 4] | Sửa đổi (Disabled) | [Trong phiên ATO/ATC] ➔ [Vô hiệu hóa nút hủy lệnh kèm tooltip] | [BR-04], [AC-3.1] |

> *(Lưu ý: Nếu task hoàn toàn không thay đổi giao diện người dùng, ghi rõ: `N/A — Task thuần xử lý logic nghiệp vụ backend hoặc dữ liệu`)*


