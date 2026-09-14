---
name: dev-spec-driven-development
description: Viết Tech-Spec (đặc tả kỹ thuật) dựa trên Business-Spec bao gồm Architecture Decision, API Contract, Data Model và Error Handling.
trigger: Khi bắt đầu implement feature mới cần thiết kế kỹ thuật, chạy lệnh /tech-spec, hoặc đã có Business-Spec (*-final.md).
---

# Phát triển Hướng Đặc tả (Spec-Driven Development)

## 1. Khi nào dùng?
- Đã có Business-Spec (`workspace/{issueKey}/spec/final.md` từ BA) và cần chuyển hóa sang Tech-Spec chi tiết.
- Cần thống nhất quyết định kiến trúc (Architecture Decisions), API Contract, Data Model trước khi phân chia task và bắt tay vào code.
- Refactor lớn cần thiết kế lại hệ thống.

**Khi KHÔNG sử dụng:**
- Chưa có Business-Spec → dùng `ba-spec` trước.
- Đã có Tech-Spec và cần code → dùng `dev-planning-and-task-breakdown` hoặc `dev-incremental-implementation`.
- Bug fix nhỏ không thay đổi kiến trúc → code trực tiếp.

## 2. Quy trình thực hiện từng bước
Khi nhận diện khớp yêu cầu, thực hiện tuần tự qua 7 giai đoạn tóm tắt:

- **Phase 0 (Đọc Business-Spec):** Quét file đặc tả nghiệp vụ tại `workspace/{issueKey}/spec/final.md` để trích xuất User Stories, Acceptance Criteria, Business Rules, và Edge Cases.
- **Phase 1 (Architecture Decision):** Xác định Technology Stack, cấu trúc thành phần (Component Breakdown), và các Design Patterns phù hợp với hiện trạng dự án.
- **Phase 2 (API Contract):** Định nghĩa chi tiết Endpoints (REST/GraphQL/WS), Request/Response schema, Headers, và Bảng mã lỗi (Error Codes).
- **Phase 3 (Data Model):** Thiết kế Database Schema, quan hệ thực thể (ERD), và Máy trạng thái (State Machine).
- **Phase 4 (Business Logic):** Chi tiết hóa luồng xử lý chính và các quy tắc kiểm tra tính hợp lệ (Validation Rules).
- **Phase 5 (Error Handling & Resilience):** Thiết lập chiến lược Thử lại (Retry), Circuit Breaker, Idempotency-Key và xử lý trường hợp biên (Edge Cases).
- **Phase 6 (Testing Strategy):** Định hình phạm vi Unit Tests, Integration Tests và tiêu chí bàn giao cho QA.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mẫu thực thi (assets/):**
  - [tech_spec_template.md](assets/tech_spec_template.md): Khung sườn Tech-Spec chuẩn 13 phần để copy và điền nội dung.
- 📖 **Tài liệu nghiên cứu & Hướng dẫn kỹ thuật (references/):**
  - [tech_spec_phases_guide.md](references/tech_spec_phases_guide.md): Cẩm nang chi tiết hướng dẫn từng bước triển khai Phase 0 đến Phase 6.
  - [spec_verification_checklist.md](references/spec_verification_checklist.md): Checklist xác minh chất lượng, Red Flags và Anti-patterns cần tránh.
  - Tra cứu quy tắc nghiệp vụ tài chính/chứng khoán: [securities-domain-rules.md](../../../../references/securities-domain-rules.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** `final.md` yêu cầu tính năng: "Đặt lệnh điều kiện Stop Loss cho tài khoản phái sinh".
- **Output:** File `workspace/PHAI-102/tech/tech-spec.md` hoàn chỉnh theo mẫu:
  ```markdown
  # Tech-Spec: [PHAI-102] Đặt lệnh điều kiện Stop Loss
  
  ## 1. Overview
  Cung cấp API và worker kích hoạt lệnh Stop Loss khi giá thị trường chạm ngưỡng kích hoạt.
  
  ## 2. Architecture Decision
  - Service: Python FastAPI (orders-service) + Redis (cache giá kích hoạt) + TimescaleDB.
  
  ## 3. API Contract
  - `POST /api/v1/orders/stop-loss` -> Request: `{ "symbol": "VN30F2409", "triggerPrice": 1250.0, "orderPrice": 1248.0, "volume": 1 }`
  - Response: `201 Created` kèm `orderId` và status `PENDING_TRIGGER`.
  
  ## 4. Data Model
  - Table: `conditional_orders` (id, account_no, symbol, trigger_price, status, created_at).
  ```
