# Hướng dẫn Đóng góp (Contributing)

Cảm ơn bạn đã đóng góp! Dự án này tập trung vào việc tự động hóa quy trình phát triển phần mềm, bắt đầu từ việc lấy yêu cầu từ Jira cho đến khi bàn giao code (Jira BA Pipeline).

## 1. Mục tiêu của Repository

Cung cấp một hệ sinh thái kỹ năng (skills) và lệnh (commands) cho AI Agent (Gemini/Antigravity) nhằm chuẩn hóa quy trình làm việc:
`Biz-Spec` ➔ `Tech-Spec` ➔ `Planning` ➔ `QA/Test` ➔ `Code` ➔ `Ship`.

## 2. Thêm Kỹ năng (Skill) mới

Nếu bạn muốn thêm một kỹ năng mới vào hệ thống:

1. **Kiểm tra trùng lặp:** Xem kỹ năng này đã có trong thư mục `skills/` chưa.
2. **Cấu trúc thư mục:** Tạo thư mục `skills/<ten-ky-nang>/`.
3. **File SKILL.md:** Phải tuân thủ định dạng chuẩn, có YAML frontmatter chứa `name` và `description`.
4. **Nội dung:** Kỹ năng phải hành động cụ thể, có quy trình từng bước, có tiêu chí đầu ra, không được đưa ra lời khuyên chung chung.
5. **Cập nhật Evals:** Thêm kịch bản test trong `evals/cases/` để kiểm tra độ chính xác của kỹ năng.

## 3. Chỉnh sửa Kỹ năng hiện có

- Khi cập nhật `biz-spec` hoặc các lệnh trong chuỗi workflow (`tech-spec`, `planning`, `qa`), phải đảm bảo đầu ra (output) của bước trước là đầu vào (input) hợp lệ cho bước sau.
- Giữ các thay đổi nhỏ, gọn và không phá vỡ cấu trúc YAML.

## 4. Quy tắc Ngôn ngữ

- Toàn bộ đầu ra (output) của quy trình phân tích yêu cầu (Jira, Tech-Spec, QA, v.v.) **BẮT BUỘC** bằng **TIẾNG VIỆT**.
- Do đó, các prompt, hướng dẫn và tài liệu đóng góp trong kho lưu trữ này cũng được ưu tiên sử dụng Tiếng Việt để đảm bảo tính đồng bộ cao nhất cho hệ thống.

## 5. Báo cáo Lỗi

Mở Issue nếu bạn phát hiện:
- Một kỹ năng đưa ra hướng dẫn sai hoặc quy trình bị lỗi thời.
- Chuỗi workflow `Biz-Spec -> Tech-Spec -> QA` bị nghẽn ở một bước nào đó.
- Cần bổ sung profile nhận diện task mới trong bước Jira import (ngoài APP/WEB/API).
- Lỗi cú pháp trong các file lệnh `.toml`.