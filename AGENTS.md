# AGENTS.md

Tệp này cung cấp hướng dẫn cho các AI coding agents Gemini khi làm việc với các dự án.

> **Phạm vi:** Tệp này cấu hình các quy tắc và định hướng cho agent. Các tài sản có thể tái sử dụng nằm trong thư mục `skills/` và `commands/`.

## Tổng quan Quy trình làm việc (Workflow)

Agent **BẮT BUỘC** phải tuân thủ quy trình phát triển theo hướng dữ liệu từ Jira, bắt đầu từ lúc lấy yêu cầu đến khi bàn giao mã nguồn:

1. **Nhập yêu cầu từ Jira (`/biz-spec {issueKey}`)**: Bước khởi đầu.
   - Tải PDF task từ Jira và nhận diện loại task (APP, WEB, API).
   - Trích xuất thông tin theo profile, xác định các điểm mơ hồ (gaps).
   - Sử dụng kỹ năng `interview-me` để tương tác, hỏi người dùng nhằm làm rõ yêu cầu.
   - Tổng hợp kết quả thành file `{issueKey}-final.md`.
2. **Viết Đặc tả kỹ thuật (`/tech-spec`)**: Dựa trên bản tổng hợp final từ Jira, viết tài liệu đặc tả kỹ thuật chi tiết.
3. **Phân rã Công việc (`/planning`)**: Chia nhỏ tài liệu spec thành các task/sub-task có thể thực thi được.
4. **Thiết kế Kiểm thử (`/qa`)**: Tạo checklist kiểm thử và viết kịch bản BDD (các tệp `.feature`).
5. **Triển khai (Build)**: Dùng các kỹ năng `incremental-implementation` và `test-driven-development` để tiến hành viết code dựa trên plan và QA đã duyệt.
6. **Sửa lỗi & Tối ưu (Verify/Review)**: Dùng `code-review-and-quality` hoặc `debugging-and-error-recovery` để rà soát mã nguồn.
7. **Bàn giao (`/ship`)**: Gọi các subagent (như Code Reviewer, QA, Security Auditor) chạy song song để đánh giá chéo toàn diện trước khi hoàn tất.

## Quy tắc Điều phối (Orchestration)

Kho lưu trữ này hoạt động dựa trên 3 lớp thành phần chính, có vai trò riêng biệt và không được nhầm lẫn:

- **Slash commands** (`commands/*.toml`) — Điểm đầu vào dành cho người dùng (Ví dụ: `/biz-spec`, `/tech-spec`). Đây là lớp điều phối (khi nào thì chạy).
- **Skills** (`skills/<name>/SKILL.md`) — Các quy trình công việc cụ thể với từng bước và tiêu chí hoàn thành. Đây là cách thức thực hiện (làm như thế nào).
- **Personas/Subagents** (`agents/<role>.md`) — Các agent đóng vai chuyên gia (như Reviewer, QA) với góc nhìn và định dạng đầu ra riêng. Đây là người thực hiện (ai làm).

**Quy tắc cấu trúc:** Người dùng (hoặc slash command) là người điều phối. Personas KHÔNG ĐƯỢC gọi các personas khác. Một persona có thể gọi các skills. Lệnh `/ship` là lệnh duy nhất thực hiện mô hình chạy đa luồng (gọi cùng lúc nhiều subagents rồi tổng hợp kết quả).

**Tích hợp với Gemini:** Các personas trong `agents/` hoạt động như các subagents của Gemini và có thể được gọi ra dưới dạng các tools. Agent KHÔNG ĐƯỢC tự ý bỏ qua các bước trong quy trình, đặc biệt là giai đoạn làm rõ yêu cầu từ Jira.
