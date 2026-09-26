# Hướng dẫn Đóng góp (Contributing)

Cảm ơn bạn đã đóng góp! Dự án này tập trung vào việc tự động hóa quy trình phát triển phần mềm, bắt đầu từ việc lấy yêu cầu từ Jira cho đến khi bàn giao code (Jira BA Pipeline).

## 1. Mục tiêu của Repository

Cung cấp một hệ sinh thái kỹ năng (skills) và lệnh (commands) cho AI Agent (Claude/Gemini/Antigravity) nhằm chuẩn hóa quy trình làm việc:
`Business-Spec` ➔ `Tech-Spec` ➔ `Planning` ➔ `QA/Test` ➔ `Code` ➔ `Ship`.

Hệ thống được chia thành các plugin (trong thư mục `plugins/`) tương ứng với các vai trò (personas) khác nhau để người dùng dễ dàng tùy chỉnh và cài đặt theo nhu cầu.

## 2. Quy Trình Tạo Mới Plugin & Kỹ Năng (Progressive Disclosure)

Mọi đóng góp Plugin và Skill mới trong repository này **BẮT BUỘC** tuân thủ nguyên lý **Progressive Disclosure (Lazy Loading 3 tầng)** nhằm tối ưu hóa chi phí token và tốc độ phản hồi của AI Agent.

> 📖 **Xem hướng dẫn chi tiết từng bước tại:** [docs/guides/create-new-plugin.md](docs/guides/create-new-plugin.md)

### Luồng Quy Trình Tổng Thể
`[1. Tạo Plugin & Persona]` ➔ `[2. Thêm Skills chuẩn 3 Tầng]` ➔ `[3. Tạo Slash Command]` ➔ `[4. Đăng Ký & Kiểm Định]`

1. **Bước 1: Khởi tạo Plugin (`plugin.json`) & Persona Subagent (`agents/<role>.md`):**
   - Định nghĩa metadata plugin và thiết lập ranh giới (boundaries), danh sách kỹ năng sở hữu cho Persona.
2. **Bước 2: Xây dựng Kỹ Năng theo Chuẩn 3 Tầng (`skills/<skill-name>/`):**
   - **Level 1 (Metadata):** Frontmatter trong `SKILL.md` gồm `name`, `description` (1-2 câu) và trường `trigger:` riêng biệt.
   - **Level 2 (Body):** Phần thân `SKILL.md` tinh gọn (50–100 dòng), gồm *Khi nào dùng*, *Quy trình tóm tắt*, liên kết tới Level 3 và bắt buộc có ít nhất 1 *Ví dụ mẫu Few-shot*.
   - **Level 3 (Thực thi):** Phân định rạch ròi:
     - `assets/`: Chứa file mẫu (templates), script thực thi (.py, .js, .sh), mock data copy-paste chạy trực tiếp.
     - `references/`: Chứa tài liệu nghiên cứu, quy chuẩn nghiệp vụ, cẩm nang chi tiết và checklist nghiệm thu.
     - *Tuyệt đối không dùng các thư mục phi chuẩn như `templates/`, `scripts/`, `examples/`.*
3. **Bước 3: Tạo Slash Command:**
   - Tạo file command tại `plugins/<plugin-name>/commands/<cmd>.toml` (Gemini) và `.claude/commands/<cmd>.md` (Claude).
4. **Bước 4: Đăng ký & Kiểm định Toàn vẹn:**
   - Cập nhật danh sách vai trò và kỹ năng vào `AGENTS.md`, `CLAUDE.md`, `README.md`.
   - Chạy script kiểm tra không có liên kết markdown nào bị gãy (Zero broken links).

*Xem thêm: [docs/guides/skill-anatomy.md](docs/guides/skill-anatomy.md) để nắm rõ cấu phẫu chuẩn của tệp `SKILL.md`.*

## 3. Quy tắc Vị trí Rule Files

Khi tạo hoặc cập nhật rule:

| Thư mục | Dùng cho | Ai đọc |
|---|---|---|
| `.claude/rules/` | Source of truth — nơi soạn thảo và cập nhật | Claude Code, Cursor, Copilot |
| `.agents/rules/` | Mirror của `.claude/rules/` — **PHẢI đồng bộ** | Antigravity IDE, Gemini |

**Quy trình bắt buộc:** Sau mỗi lần sửa file trong `.claude/rules/`, phải chạy:
```bash
cp .claude/rules/<file>.md .agents/rules/<file>.md
```

Rule mới tạo trong `.claude/rules/` **phải được copy ngay** vào `.agents/rules/` trong cùng commit.

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