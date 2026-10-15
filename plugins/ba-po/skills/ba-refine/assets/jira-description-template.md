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

<!-- LƯU Ý BỔ SUNG (NẾU TASK CÓ THAY ĐỔI GIAO DIỆN NGƯỜI DÙNG VÀ CÓ CỜ --mockup):
## 🎨 UI Design & Mockup Deliverables
- Mockup HTML: workspace/{issueKey}/tech/mockup.html
- Mockup Snapshot: workspace/{issueKey}/tech/mockup.png
- Ghi chú tương tác UI: [Mô tả tương tác]
-->
