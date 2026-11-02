## 🧩 User Story

**As a** [role/persona cụ thể]  
**I want** [hành động nghiệp vụ mong muốn]  
**So that** [giá trị kinh doanh / lợi ích người dùng đạt được]

## 💼 Business Context

- **Vấn đề (Problem):** [1-2 câu nêu đúng nỗi đau/tình trạng hiện tại của người dùng hoặc yêu cầu từ UBCKNN/KRX]
- **Mục tiêu (Goal):** [1 câu về kết quả kỳ vọng và giá trị kinh doanh mang lại]
- **Tính cấp thiết (Urgency):** [1 câu giải thích lý do cần triển khai ngay]
- **Phạm vi (Scope):** [Đối tượng áp dụng (In-Scope Actors), phạm vi chức năng, và những gì ngoài phạm vi (Out-of-Scope)]

## ✅ Acceptance Criteria

```gherkin
Feature: [Tên tính năng nghiệp vụ]

  Scenario: Happy - [Luồng thành công chính]
    Given [Điều kiện tiên quyết hợp lệ]
    When [Người dùng thực hiện hành động]
    Then [Kết quả nghiệp vụ kỳ vọng hiển thị hoặc ghi nhận]

  Scenario: Validation - [Kiểm tra ràng buộc dữ liệu hoặc từ chối hợp lệ]
    Given [Điều kiện tiên quyết]
    When [Người dùng thực hiện hành động không hợp lệ hoặc thiếu dữ liệu]
    Then [Hệ thống từ chối và hiển thị thông báo nghiệp vụ rõ ràng]

  Scenario: Edge - [Tình huống biên hoặc điều kiện chuyển phiên]
    Given [Điều kiện tại ngưỡng biên hoặc khung giờ chuyển phiên]
    When [Người dùng thực hiện giao dịch hoặc gửi yêu cầu]
    Then [Hệ thống xử lý đúng theo ranh giới quy tắc]
```

## 🎨 UI Design / Mockup

<!-- ÁP DỤNG KHI TASK CÓ THAY ĐỔI GIAO DIỆN NGƯỜI DÙNG THEO CHỐT CHẶN 3 & 4. KHÔNG MÔ TẢ DESIGN BẰNG TEXT LAN MAN; DÁN TRỰC TIẾP ẢNH TỪNG CASE VÀ GHI CHÚ THEO THAO TÁC -->
- **Màn hình gốc (AS-IS Screen):** [Tên màn hình trên Web/App hiện tại, đường dẫn file codebase tương ứng từ ui-component-map.json]
- **Mã nguồn Mockup HTML:** `workspace/issues/{issueKey}/spec/diagrams/mockup.html`

### 📱 Case 1: [Tên kịch bản thao tác chính / Luồng chuẩn]
![Case 1: Thao tác chính](workspace/issues/{issueKey}/spec/diagrams/mockup-case-1.png)

- **① [Điểm chạm thao tác 1]:** [Thao tác người dùng: Click/Nhập/Chọn...] ➔ [Phản hồi hệ thống & trạng thái UI hiển thị]
- **② [Điểm chạm thao tác 2]:** [Thao tác người dùng: Click/Hover...] ➔ [Phản hồi hệ thống & trạng thái UI hiển thị]

### ⚠️ Case 2: [Tình huống cảnh báo ngoại lệ / Xử lý lỗi]
![Case 2: Cảnh báo ngoại lệ](workspace/issues/{issueKey}/spec/diagrams/mockup-case-2.png)

- **③ [Điểm chạm cảnh báo]:** [Điều kiện kích hoạt lỗi/vượt hạn mức] ➔ [Hiển thị banner/thông báo lỗi & vô hiệu hóa nút bấm]

### 🔒 Case 3: [Tình huống biên / Khóa điều kiện phiên giao dịch]
![Case 3: Tình huống biên](workspace/issues/{issueKey}/spec/diagrams/mockup-case-3.png)

- **④ [Điểm chạm khóa thao tác]:** [Điều kiện biên / Khung giờ đặc thù] ➔ [Trạng thái vô hiệu hóa thành phần UI & tooltip giải thích]

### Bảng Chú thích Thay đổi Giao diện (UI Delta Mapping)
| Ký hiệu trên Mockup | Thành phần Giao diện | Loại thay đổi (Thêm/Sửa/Xóa) | Thao tác Người dùng & Phản hồi Hệ thống | Kịch bản / Ràng buộc áp dụng |
| :---: | --- | :---: | --- | :---: |
| **①** | [Tên phần tử UI 1] | Thêm mới (Dropdown) | [Thao tác chọn giá trị] ➔ [Cập nhật thông số tương ứng] | Scenario: Happy |
| **②** | [Tên phần tử UI 2] | Sửa đổi (Badge/Stepper) | [Thao tác tăng giảm] ➔ [Làm tròn theo bước giá/khối lượng sàn] | Scenario: Happy |
| **③** | [Tên phần tử UI 3] | Thêm mới (Banner lỗi) | [Khi vi phạm hạn mức] ➔ [Hiện cảnh báo đỏ và disable nút gửi lệnh] | Scenario: Validation |
| **④** | [Tên phần tử UI 4] | Sửa đổi (Disabled) | [Trong phiên ATO/ATC] ➔ [Vô hiệu hóa nút hủy lệnh kèm tooltip] | Scenario: Edge |

> *(Lưu ý: Nếu task hoàn toàn không thay đổi giao diện người dùng, ghi rõ: `N/A — Task thuần xử lý logic nghiệp vụ backend hoặc dữ liệu`)*

## ☀️ Success Criteria & Tracking

### Success Metrics

| Metric   | Current    | Target   | Measurement      |
|----------|------------|----------|------------------|
| [KPI 1]  | [baseline] | [goal]   | [how to measure] |
| [KPI 2]  | [baseline] | [goal]   | [how to measure] |

### Tracking

| Event        | Dashboard / Report   | Owner         |
|--------------|----------------------|---------------|
| [Event name] | [Link to dashboard]  | [Team/Person] |
