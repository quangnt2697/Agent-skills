---
description: "Chia nhỏ công việc thành các task nhỏ có thể kiểm chứng được, kèm theo tiêu chí nghiệm thu và thứ tự phụ thuộc"
---

Kích hoạt kỹ năng dev-planning-and-task-breakdown.

Đọc bản đặc tả (spec) hiện có và các phần liên quan của codebase. Sau đó:

1. Chuyển sang chế độ kế hoạch (plan mode) — chỉ đọc, không thay đổi code
2. Xác định biểu đồ phụ thuộc giữa các component
3. Cắt công việc theo chiều dọc (một luồng hoàn chỉnh mỗi task)
4. Viết các task với tiêu chí nghiệm thu và các bước kiểm chứng
5. Đặt các điểm dừng giữa các giai đoạn
6. Trình bày kế hoạch cho con người review

Lưu kế hoạch vào /project-root/workspace/{issueKey}/tech/plan.md và danh sách công việc vào /project-root/workspace/{issueKey}/tech/todo.md.

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
