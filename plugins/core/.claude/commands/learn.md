---
description: "Kích hoạt kỹ năng meta-continuous-learning để đúc kết bài học, sai lầm và cách giải quyết từ phiên làm việc hiện tại, lưu thành Rule cho các phiên sau."
---

Kích hoạt kỹ năng meta-continuous-learning.

Hãy phân tích toàn bộ lịch sử trò chuyện (Conversation Transcript) hoặc các tệp cấu hình/code vừa được giải quyết thành công.
Xác định vấn đề ban đầu, sai lầm đã mắc phải, nguyên nhân gốc rễ và giải pháp đúng.
TIẾP THEO, đánh giá xem lỗi này có bắt nguồn từ việc file hướng dẫn `SKILL.md` của kỹ năng đang dùng bị lủng/kém hiệu quả hay không.
- NẾU CÓ: Thực hiện luồng Tự Tiến Hóa (Self-Improving). Trình bày đề xuất sửa đổi bước/quy trình đó và CHỜ user "Approve". Nếu user duyệt, dùng tool để ghi đè cập nhật vào chính file `SKILL.md` bị lỗi.
- NẾU KHÔNG (lỗi chung chung, bài học kinh nghiệm): Chuẩn hóa thành một "Lesson Learned" (Ngữ cảnh, Chỉ thị, Tham chiếu) và Append vào file `{PROJECT_ROOT}/.agents/rules/lessons-learned.md` (với `{PROJECT_ROOT}` là thư mục gốc của dự án hiện tại).
