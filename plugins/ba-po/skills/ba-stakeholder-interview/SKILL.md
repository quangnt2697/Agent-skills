---
name: ba-stakeholder-interview
description: Phỏng vấn đa đối tượng liên quan (CEO, Product Manager, Tech Lead, Compliance, End User), thu thập yêu cầu từ nhiều góc nhìn và giải quyết xung đột nghiệp vụ.
trigger: Khi cần thu thập yêu cầu từ nhiều phòng ban, giải quyết mâu thuẫn về phạm vi/ưu tiên hoặc nhận yêu cầu "phỏng vấn stakeholders".
---

# Kỹ Năng Phỏng Vấn Stakeholders (ba-stakeholder-interview)

## 1. Khi nào dùng?
- Dự án có nhiều bên tham gia với các mục tiêu và ràng buộc khác nhau (Kinh doanh, Kỹ thuật, Vận hành, Tuân thủ).
- Cần ghi nhận nhu cầu, ràng buộc (budget, compliance, timeline) và tổng hợp thành Ma trận Stakeholders (Stakeholder Matrix).
- Xuất hiện mâu thuẫn về độ ưu tiên tính năng giữa các phòng ban cần hòa giải (Conflict Resolution).

**Khi KHÔNG sử dụng:**
- Chỉ phỏng vấn 1 người dùng trực tiếp để làm rõ ý định cá nhân → Dùng `ba-interview-me`.
- Yêu cầu đã được các bên phê duyệt chính thức và bàn giao thành Spec.

## 2. Quy trình Thực hiện 5 Bước
- **Bước 1 (Xác định Đối tượng - Stakeholder Mapping):** Lập danh sách các bên liên quan theo sơ đồ Quyền lực/Mức độ quan tâm (Power vs Interest).
- **Bước 2 (Chuẩn bị Câu hỏi Chuyên biệt):** Thiết lập bộ câu hỏi riêng cho từng vai trò (Kinh doanh quan tâm ROI, Kỹ thuật quan tâm Scale, Compliance quan tâm Pháp lý).
- **Bước 3 (Tiến hành Thu thập & Phỏng vấn):** Ghi nhận nhu cầu, mối lo ngại và các giả định ngầm của từng bên.
- **Bước 4 (Tổng hợp & Hòa giải Xung đột):** Đối chiếu các điểm mâu thuẫn, tìm phương án dung hòa (Trade-off Matrix) và chốt lại yêu cầu thống nhất.
- **Bước 5 (Xác nhận & Ký duyệt):** Chia sẻ bản tổng hợp phản hồi và lấy xác nhận đồng thuận từ các bên.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu phương pháp & Bộ câu hỏi (references/):**
  - [workflow.md](references/workflow.md): Hướng dẫn chi tiết 5 bước, kỹ thuật giải quyết mâu thuẫn và mẫu Stakeholder Matrix.
  - [questions.md](references/questions.md): Bộ câu hỏi mẫu chuẩn hóa cho từng vai trò (CEO/Executive, PM, Tech Lead, CSKH, Pháp chế).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Khảo sát yêu cầu tính năng: "Tự động kích hoạt đòn bẩy Margin cho tài khoản mới".
- **Output:** Ma trận tóm tắt Stakeholders:
  | Nhóm Stakeholder | Nhu cầu chính | Mối lo ngại / Ràng buộc | Hướng giải quyết |
  |---|---|---|---|
  | **Kinh doanh (Sales/BD)** | Tăng tỷ lệ mở tài khoản và khối lượng vay | Thủ tục eKYC quá phức tạp làm rơi rụng khách | Tối giản bước nộp hồ sơ trực tuyến |
  | **Quản trị Rủi ro (Risk)** | Đảm bảo an toàn vốn vay | Khách hàng mới chưa đủ lịch sử tín dụng | Thiết lập hạn mức margin ban đầu thấp (dưới 50 triệu) |
  | **Pháp chế (Compliance)** | Tuân thủ quy định UBCK | Bắt buộc có hợp đồng điện tử có chữ ký số | Tích hợp ký số qua OTP trước khi giải ngân |
