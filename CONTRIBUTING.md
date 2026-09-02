# Hướng dẫn Đóng góp (Contributing)

Cảm ơn bạn đã đóng góp! Dự án này tập trung vào việc tự động hóa quy trình phát triển phần mềm, bắt đầu từ việc lấy yêu cầu từ Jira cho đến khi bàn giao code (Jira BA Pipeline).

## 1. Mục tiêu của Repository

Cung cấp một hệ sinh thái kỹ năng (skills) và lệnh (commands) cho AI Agent (Claude/Gemini/Antigravity) nhằm chuẩn hóa quy trình làm việc:
`Business-Spec` ➔ `Tech-Spec` ➔ `Planning` ➔ `QA/Test` ➔ `Code` ➔ `Ship`.

Hệ thống được chia thành các plugin (trong thư mục `plugins/`) tương ứng với các vai trò (personas) khác nhau để người dùng dễ dàng tùy chỉnh và cài đặt theo nhu cầu.

## 2. Quy Trình Tạo Mới (Persona & Skill)

Dưới đây là luồng quy trình (workflow) hướng dẫn từng bước để tạo một **Persona (Subagent)** hoặc một **Skill** mới, giúp bạn dễ dàng đọc và theo dõi trực tiếp bằng văn bản thuần túy.

### Luồng Quy Trình Tổng Thể (End-to-End Flow)

**Text Flow:**
`[1. Tạo Persona]` ➔ `[2. Thêm Skills]` ➔ `[3. Tạo Command]` ➔ `[4. Cập Nhật Tài Liệu]`

**Chi tiết từng bước:**

**Bước 1: Tạo Persona (Subagent)**
- **Mục đích:** Xác định một vai trò duy nhất với góc nhìn chuyên biệt (vd: `security-auditor`).
- **Thực thi:** Tạo file `plugins/<plugin-name>/agents/<role-name>.md`.
- **Nội dung:** Viết YAML frontmatter (chứa `role`, `description`). Định nghĩa rõ ràng nhiệm vụ cốt lõi, ranh giới (boundaries), định dạng đầu ra mong muốn và phần **Composition** ở cuối file.

**Bước 2: Thêm Kỹ Năng (Skills) cho Persona**
- **Kiểm tra:** Xem kỹ năng đã tồn tại hay chưa, ưu tiên tái sử dụng.
- **Thực thi:** Tạo thư mục `plugins/<plugin-name>/skills/<ten-ky-nang>/`.
- **Nội dung:** Bắt buộc tạo file `SKILL.md` chuẩn YAML frontmatter (chứa `name` và `description`). Khai báo hành động cụ thể, quy trình từng bước, cờ đỏ (red flags) và tiêu chí đầu ra.
- **Tùy chọn:** Thêm các script hỗ trợ vào thư mục `scripts/` và viết test trong `evals/cases/` để kiểm tra độ chính xác.

**Bước 3: Tạo Lệnh (Slash Command)**
- **Mục đích:** Bọc Persona và Skill lại thành một lệnh dễ nhớ cho người dùng (ví dụ: `/dev-audit`).
- **Thực thi:** Tạo file command tại `plugins/<plugin-name>/.claude/commands/<command-name>.md`.
- **Nội dung:** Khai báo mô tả lệnh, hướng dẫn agent cách phối hợp các persona và gọi các skill tương ứng khi người dùng gõ lệnh. (Với Gemini, thiết lập file `.toml` tương ứng trong thư mục `commands/`).

**Bước 4: Cập Nhật Tài Liệu (Docs & Quy Trình Tổng)**
- Bổ sung Persona, Skills và Commands mới vào các bảng thống kê tại `README.md`.
- Cập nhật ranh giới và danh sách kỹ năng vào `AGENTS.md` và `CLAUDE.md`.
- Bổ sung mô tả Persona mới vào file hướng dẫn chi tiết `docs/guides/agents.md`.

*Lưu ý: Bạn có thể tham khảo [docs/guides/skill-anatomy.md](docs/guides/skill-anatomy.md) để biết chi tiết cách thiết kế cấu trúc bên trong một kỹ năng.*

## 3. Chỉnh sửa Kỹ năng hiện có

- Khi cập nhật `business-spec` hoặc các lệnh trong chuỗi workflow (`tech-spec`, `planning`, `qa`), phải đảm bảo đầu ra (output) của bước trước là đầu vào (input) hợp lệ cho bước sau.
- Giữ các thay đổi nhỏ, gọn và không phá vỡ cấu trúc YAML.

## 4. Quy tắc Ngôn ngữ

- Toàn bộ đầu ra (output) của quy trình phân tích yêu cầu (Jira, Tech-Spec, QA, v.v.) **BẮT BUỘC** bằng **TIẾNG VIỆT**.
- Do đó, các prompt, hướng dẫn và tài liệu đóng góp trong kho lưu trữ này cũng được ưu tiên sử dụng Tiếng Việt để đảm bảo tính đồng bộ cao nhất cho hệ thống.

## 5. Báo cáo Lỗi

Mở Issue nếu bạn phát hiện:
- Một kỹ năng đưa ra hướng dẫn sai hoặc quy trình bị lỗi thời.
- Chuỗi workflow `Business-Spec -> Tech-Spec -> QA` bị nghẽn ở một bước nào đó.
- Cần bổ sung profile nhận diện task mới trong bước Jira import (ngoài APP/WEB/API).
- Lỗi cú pháp trong các file lệnh `.toml`.