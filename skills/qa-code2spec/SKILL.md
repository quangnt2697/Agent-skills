---
name: qa-code2spec
description: >
  Dịch ngược mã nguồn (Code) thành Tài liệu Đặc tả (Spec) thông qua việc truy vết đồ thị phụ thuộc (Deep Trace) đa ngôn ngữ. 
  Sử dụng kỹ năng qa-code-review để đọc code và ba-interview-me để làm rõ với user. Đầu ra là file final.md chuẩn tắc.
  Trigger: "/qa-code2spec {đường_dẫn_file_api}".
---

# Skill: qa-code2spec

## Mục đích

Giải quyết bài toán "Có Code nhưng không có Jira/Spec". 
Skill này đóng vai trò như một Reverse Engineer, đọc hiểu mã nguồn thực tế (Python, TypeScript, Java...) của Developer, tìm ra các luật nghiệp vụ (Business Rules), sau đó phỏng vấn user để chốt lại thành file Đặc tả (Spec) chuẩn xác.

Từ file Đặc tả này, hệ thống sẽ sử dụng lại luồng QA tiêu chuẩn (`/qa-test-design` → `/qa-auto-design`) để sinh code Automation Test.

---

## Workflow — 4 Bước (Đa ngôn ngữ)

### Bước 1: Deep Trace (Sử dụng kỹ năng `qa-code-review`)
Agent nhận đường dẫn file (VD: file API Controller hoặc Router) từ $ARGUMENTS và bắt đầu truy vết:
1. Đọc nội dung file đầu vào.
2. Tìm kiếm các file được import (Services, Models, DTOs, Schemas, Utils).
3. Chủ động dùng công cụ đọc file (`view_file`) để "chui sâu" vào các file import đó.
4. Thu thập các thông tin sau (bất kể là ngôn ngữ nào):
   - **Endpoints:** HTTP Method, URL path.
   - **Payload/Schema:** Các trường dữ liệu, kiểu dữ liệu, bắt buộc/tùy chọn (Từ Pydantic/Zod/Interfaces). **BẮT BUỘC trích xuất chính xác cấu trúc JSON mẫu của Request/Response (đối với API) và Event Payload (đối với WebSocket). Ghi chú rõ các trường có thể null hoặc bị ẩn (hidden fields).**
   - **Validation Rules:** Độ dài tối đa/tối thiểu, Regex, các kiểm tra tính hợp lệ.
   - **Business Logic & Error Handling:** Các câu lệnh `if/else`, vòng lặp, các logic ném ngoại lệ (`raise Exception`, `throw Error`) để bắt Edge Cases. **Tìm kiếm và trích xuất cụ thể các mã lỗi (Error Codes) và thông báo lỗi (Error Messages) tương ứng được định nghĩa trong mã nguồn.**
   - **Dependencies:** Lời gọi đến Database hoặc API bên thứ ba.
   - **🔥 [CỐT LÕI BACKEND] Yêu cầu bắt buộc phải truy vết sâu 5 yếu tố sau:**
     1. **Database Schema & ORM:** Trích xuất các trường `nullable=False`, `unique=True` để tìm Test Case (VD: nhập trùng email).
     2. **Transaction Scope:** Tìm `@transactional` hoặc `db.commit()`. Bóc tách nguy cơ kẹt giao dịch.
     3. **Message Queue / Async:** Nếu API đẩy event vào Kafka/RabbitMQ sau khi chạy xong, phải trích xuất cấu trúc Payload của event đó.
     4. **Security & Middleware:** API có được bảo vệ bởi JWT/RBAC không? Ai được phép gọi?
     5. **WebSocket (Nếu có):** Cấu trúc gói tin Broadcast, Ping/Pong interval, cơ chế Reconnect nằm trong Socket Manager.

### Bước 2: Gap Analysis (Tìm góc khuất)
Từ đống logic thu thập được, đối chiếu với các nguyên tắc cơ bản của domain Chứng khoán - Tài chính - Ngân hàng:
- Code có thiếu kiểm tra số dư (Balance check) trước khi trừ tiền không?
- Có chặn giao dịch số âm không?
- Có Rate limit hay Idempotency key chống double-spending không?
- Lập danh sách các Điểm mù (Gaps) hoặc các logic có vẻ bị "hardcode".

### Bước 3: Interview (Sử dụng kỹ năng `ba-interview-me`)
- Báo cáo cho User biết những logic nghiệp vụ bạn đã tìm thấy trong code.
- Kích hoạt kỹ năng `ba-interview-me` để đặt câu hỏi cho User.
- *Mẫu câu hỏi:* 
  - "Code hiện tại đang bắt lỗi khi Amount > 100M. Con số này là rule cố định hay do dev hardcode tạm?"
  - "Tôi không thấy code xử lý trường hợp API bên thứ 3 bị timeout. Nếu timeout xảy ra, ta nên fail giao dịch hay trả về pending?"
- Hỏi đến khi đạt độ tự tin cao về luồng nghiệp vụ chuẩn.

### Bước 4: Chốt hạ Đặc tả (`final.md`)
- Sau khi được User xác nhận qua phỏng vấn, tổng hợp toàn bộ thành 1 file Markdown.
- Lấy tên file gốc làm gốc (VD: `order_api`), xuất file vào: 
  `specs/code-import/{tên_file}/{tên_file}-final.md`.
- Cấu trúc file `final.md` phải tuân thủ chuẩn của bộ `ba-spec` (Gồm: Overview, Endpoints, Request/Response, Validation, Business Rules, Edge Cases...).

---

## Sau khi hoàn thành
Hướng dẫn User chạy lệnh `/qa-test-design` để tạo Checklist & Gherkin từ file `final.md` vừa sinh ra, tiếp tục chu trình QA quen thuộc.
