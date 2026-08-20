---
description: Chia nhỏ công việc thành các task nhỏ có thể kiểm chứng được, kèm theo tiêu chí nghiệm thu và thứ tự phụ thuộc
---

Kích hoạt kỹ năng planning-and-task-breakdown.

Đọc bản đặc tả (spec) hiện có (SPEC.md hoặc tương đương) và các phần liên quan của codebase. Sau đó:

1. Chuyển sang chế độ kế hoạch (plan mode) — chỉ đọc, không thay đổi code
2. Xác định biểu đồ phụ thuộc (dependency graph) giữa các component
3. Cắt công việc theo chiều dọc (mỗi task hoàn thành một luồng độc lập, không chia theo layer ngang)
4. Viết các task với tiêu chí nghiệm thu (acceptance criteria) và các bước kiểm chứng (verification steps)
5. Đặt các điểm dừng (checkpoints) giữa các giai đoạn
6. Trình bày kế hoạch cho con người review

Lưu kế hoạch vào file `tech/plan.md` và danh sách công việc vào `tech/todo.md`.