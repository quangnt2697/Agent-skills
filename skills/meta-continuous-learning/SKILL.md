---
name: meta-continuous-learning
description: "Kỹ năng Siêu cấp giúp Agent tự động đúc kết bài học, sai lầm, và cách giải quyết từ một phiên làm việc dài để tạo thành Rule lưu trữ cho tương lai."
---

# Kỹ năng Tự Học & Đúc Kết Kinh Nghiệm (Continuous Learning)

## Khi nào sử dụng kỹ năng này?
- Người dùng sử dụng lệnh `/learn` hoặc `/save-session`.
- Khi vừa hoàn thành một Task khó, sửa thành công một bug phức tạp mất nhiều thời gian, hoặc khi phát hiện ra một Pattern/Rule mới cần tuân thủ cho toàn dự án.
- Khi người dùng chủ động yêu cầu bạn "ghi nhớ lại cách làm này cho lần sau".

## Ranh giới & Quyền hạn
- **Không thay đổi Codebase:** Kỹ năng này chỉ tạo ra tài liệu tri thức, TUYỆT ĐỐI không sửa đổi code ứng dụng.
- **Nơi lưu trữ bài học:** Mọi bài học BẮT BUỘC phải được lưu vào file `/Users/qa-quangnt/Desktop/Project/Test/agent-skills/.agents/rules/lessons-learned.md`. (Nếu file chưa có, bạn phải dùng tool tạo mới file này).
- Do `.agents/rules/` là thư mục nạp tự động (Global Customizations Root / Workspace Customizations Root), bất kỳ nội dung markdown nào lưu trong đây sẽ nghiễm nhiên trở thành Luật (Rule) cho mọi Agent trong những phiên làm việc tiếp theo mà không cần phải có lệnh `load`.

## Quy trình Thực thi (The Learning Pipeline)

### Bước 1: Phân tích Sự kiện (Event Analysis)
1. Đọc lại toàn bộ lịch sử trò chuyện (Conversation Transcript) hoặc các tệp cấu hình/code vừa được giải quyết thành công.
2. Xác định:
   - **Vấn đề ban đầu (The Problem):** Lỗi gì đã xảy ra hoặc task gì đã làm?
   - **Sai lầm (The Mistakes):** Bạn hoặc người dùng đã thử những cách sai nào?
   - **Nguyên nhân gốc rễ (Root Cause):** Tại sao cách cũ sai?
   - **Giải pháp đúng (The Solution):** Cách giải quyết cuối cùng và tối ưu nhất là gì?

### Bước 2: Chuẩn hóa Thành "Bài Học" (Standardize the Lesson)
Một bài học hiệu quả không phải là một đoạn văn kể chuyện. Nó phải là một CHỈ THỊ (Directive).
Mỗi bài học (Lesson) phải bao gồm:
- **Ngữ cảnh (Context):** Khi nào thì áp dụng luật này?
- **Chỉ thị (Directive):** Phải làm gì hoặc không được làm gì? (Dùng TỪ NGỮ MẠNH như LUÔN LUÔN, TUYỆT ĐỐI KHÔNG).
- **Mã lỗi/Cấu hình tham chiếu (Reference):** Code snippet mẫu hoặc command đúng.

*Ví dụ:* "Khi thiết lập Firebase Firestore trên môi trường X, LUÔN LUÔN phải set tham số Y = true. TUYỆT ĐỐI KHÔNG dùng Z."

### Bước 3: Ghi nhận (Commit to Memory)
Sử dụng công cụ sửa file để cập nhật file `/Users/qa-quangnt/Desktop/Project/Test/agent-skills/.agents/rules/lessons-learned.md`.
- Nếu file đã tồn tại, hãy **Append** (Thêm vào cuối) bằng cách đọc file, tìm dòng cuối và ghi đè nội dung mới bao gồm cả nội dung cũ.
- Khuyến nghị dùng thẻ định dạng markdown rõ ràng (ví dụ: `### Bài học ngày YYYY-MM-DD: [Chủ đề]`).

## Báo cáo Khách hàng
- In ra một thông báo ngắn gọn xác nhận bài học đã được ghi nhớ thành công vào `lessons-learned.md`.
- Trích dẫn (quote) lại nội dung bài học để người dùng review.
- Chuyển trạng thái sang hoàn thành mà không cần hỏi thêm.
