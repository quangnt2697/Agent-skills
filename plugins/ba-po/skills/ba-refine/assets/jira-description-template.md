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

<!-- CHỈ SỬ DỤNG ẢNH MOCKUP TRONG PHẦN DESIGN, TUYỆT ĐỐI KHÔNG MÔ TẢ DESIGN BẰNG TEXT VÀ KHÔNG GHI CHÚ GÌ THÊM (GHI N/A NẾU TASK BACKEND) -->
![Case 1: Giao diện chuẩn](workspace/issues/{issueKey}/spec/diagrams/mockup-case-1.png)
![Case 2: Trạng thái cảnh báo / ngoại lệ](workspace/issues/{issueKey}/spec/diagrams/mockup-case-2.png)
![Case 3: Trạng thái khóa / điều kiện biên](workspace/issues/{issueKey}/spec/diagrams/mockup-case-3.png)

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
