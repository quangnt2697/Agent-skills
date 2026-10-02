## 🧩 User Story

**As a** [role/persona cụ thể]  
**I want** [goal/action]  
**So that** [business value/outcome]

## 💼 Business Context

- **Vấn đề (Problem):** [1-2 câu nêu đúng nỗi đau/tình trạng hiện tại, kèm số liệu nếu có]
- **Mục tiêu (Goal):** [1 câu về kết quả kỳ vọng và giá trị mang lại]
- **Tính cấp thiết (Urgency):** [1 câu ngắn giải thích lý do cần làm ngay]

## ✅ Acceptance Criteria

```gherkin
Feature: [Tên chức năng nghiệp vụ]

  Scenario: Happy - [Luồng thành công chính]
    Given [precondition]
    When [action/trigger]
    Then [expected outcome]
    And [additional outcome]

  Scenario: Edge - [Trường hợp biên/ngoại lệ]
    Given [precondition]
    When [edge case action]
    Then [expected handling]

  Scenario: Validation - [Kiểm tra dữ liệu đầu vào]
    Given [precondition]
    When [invalid input]
    Then [validation error message]
```

## 🎨 UI Design / Mockup

<!-- LƯU Ý: Phần này CHỈ áp dụng đối với task có thay đổi Giao diện người dùng (UI/Frontend).
Nếu task thuần Backend/API/Logic ngầm/Database: Ghi "N/A (Task không liên quan giao diện)" hoặc lược bỏ.
HỦY BỎ hoàn toàn User Flow dạng Mermaid. -->

### UI Requirements & Codebase Mapping
- **Màn hình / Component bị ảnh hưởng:** [Tên component/screen hiện hữu trong codebase cần sửa hoặc tạo mới]
- **Tái sử dụng Design Tokens:** [Color tokens, Typography, Spacing, Theme có sẵn trong codebase]
- **Cập nhật mới theo task:** [Mô tả các trường dữ liệu, controls, validation states hoặc layout mới]

### Mockup / Prototype Deliverables
- **Interactive Mockup (HTML):** [workspace/{issueKey}/tech/mockup.html hoặc Link Figma]
- **Preview Snapshot (PNG):** [workspace/{issueKey}/tech/mockup.png hoặc ảnh đính kèm]
- **Ghi chú Tương tác (UX):** [Mô tả ngắn gọn luồng thao tác/action của người dùng dạng text step-by-step nếu có]

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

## 🧱 Technical Notes

### API / Service

- [API endpoints, service dependencies]

### Database

- [Tables, schemas affected]

### Event / Message

- [Events published/consumed, message queues]

### Dependency

- [External systems, libraries, feature flags]

### Migration / Rollout

- [Rollout plan, backward compatibility, rollback strategy]
