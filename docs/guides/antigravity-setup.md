# Sử dụng agent-skills với Antigravity CLI (agy)

Gói `agent-skills` có thể được cài đặt dưới dạng một native plugin (plugin bản địa) trong Antigravity CLI (`agy`), cung cấp cho agent quyền truy cập vào các workflows có cấu trúc, các personas và các slash commands tùy chỉnh.

## Cài Đặt (Quick Setup)

### Lựa chọn 1: Cài đặt Tự Động qua npm script (Khuyên dùng)

Do `agent-skills` được tổ chức theo kiến trúc modular gồm 8 plugins chuyên biệt (`ba-po`, `qa`, `dev`, `scrum-master`, `code-reviewer`, `security-auditor`, `web-performance-auditor`, `core`), cách cài đặt chuẩn xác và tiện lợi nhất cho Antigravity và Gemini CLI là:

1. Clone repository về máy của bạn:
   ```bash
   git clone https://gitlab.example.com/org/agent-skills.git
   cd agent-skills
   npm install
   ```

2. Chạy script thiết lập tự động:
   ```bash
   npm run setup:plugins
   ```

Script sẽ tự động tạo các symbolic links tương ứng từ 8 sub-plugins trong `plugins/` sang thư mục cấu hình toàn cục `~/.gemini/config/plugins/`.
- Khi bạn cập nhật hoặc `git pull` code mới trong repo `agent-skills`, các plugins trên Antigravity sẽ tự động cập nhật ngay lập tức mà không cần cài đặt lại.
- Nếu muốn gỡ bỏ, chỉ cần chạy: `npm run unlink:plugins`.

### Lựa chọn 2: Cài đặt Native Plugin qua agy CLI

Bạn cũng có thể cài đặt từng sub-plugin cụ thể bằng lệnh của Antigravity CLI:
```bash
agy plugin install /path/to/agent-skills/plugins/ba-po
agy plugin install /path/to/agent-skills/plugins/qa
agy plugin install /path/to/agent-skills/plugins/dev
```

### Lựa chọn 2: Import từ Gemini CLI

Nếu bạn đã cài đặt sẵn `agent-skills` trong phiên bản Gemini CLI cũ, bạn có thể import nó trực tiếp sang:
```bash
agy plugin import gemini
```

Sau khi cài đặt, hãy xác minh plugin đang hoạt động:
```bash
agy plugin list
```

---

## Các Lệnh (Slash Commands)

Plugin đăng ký 7 lệnh tùy chỉnh (slash commands): 6 lệnh theo vòng đời phát triển cộng thêm `/webperf` chuyên biệt cho audit hiệu năng:

| Lệnh             | Chức Năng                                           | Kích Hoạt Skill               |
|------------------|-----------------------------------------------------|-------------------------------|
| `/tech-spec`     | Viết đặc tả có cấu trúc trước khi viết code         | `dev-spec-driven-development` |
| `/plan`          | Chia nhỏ công việc thành các task có thể kiểm chứng | `planning-and-task-breakdown` |
| `/build`         | Code từng bước (incrementally) cho task tiếp theo   | `incremental-implementation`  |
| `/unit-test`     | Chạy workflow TDD — red, green, refactor            | `dev-test-driven-development` |
| `/dev-audit`     | Audit toàn diện và tự động sửa (Auto-Fix)           | `dev-audit-and-fix`           |
| `/review`        | Review code 5 phương diện                           | `review-code-and-quality`     |
| `/code-simplify` | Giảm độ phức tạp mà không thay đổi hành vi code     | `code-simplification`         |
| `/webperf`       | Audit hiệu năng và Core Web Vitals cho web apps     | `web-performance-auditor`     |

Mỗi lệnh sẽ tự động kích hoạt skill tương ứng và hướng dẫn agent theo từng bước một.

---

## Skills & Sự Khám Phá (Discovery)

Antigravity tự động phát hiện (discover) các skills nằm trong thư mục `skills/` của plugin. 
* Antigravity sẽ tự động khớp (match) các tasks và ý định (intents) của người dùng tới các skills liên quan khi có nhu cầu (on-demand).
* Nếu một task khớp với một skill, agent sẽ load skill đó và xin phép bạn trước khi thực thi.

---

## Xác Minh & Thẩm Định (Verification & Validation)

Để kiểm tra xem plugin ở local của bạn đã được cấu trúc đúng hay chưa và có chứa đầy đủ tất cả các skills không, hãy chạy:
```bash
agy plugin validate /path/to/agent-skills
```

---

## Cách Hoạt Động (How It Works)

### 1. Kích Hoạt Skill Theo Nhu Cầu (On-Demand Activation)
Antigravity CLI tự động phát hiện các file `SKILL.md` nằm trong thư mục `skills/` của plugin đã cài đặt. Sử dụng phần mô tả trigger (điều kiện kích hoạt) trong frontmatter của mỗi skill, agent sẽ linh hoạt (dynamically) kích hoạt workflow phù hợp khi nó nhận diện được ý định (intent) tương ứng từ phía lập trình viên.

Ví dụ, khi bạn yêu cầu agent:
- **Thiết kế một hệ thống mới** &rarr; Nó sẽ gợi ý/kích hoạt `dev-spec-driven-development`.
- **Implement một tính năng** &rarr; Nó sẽ kích hoạt `incremental-implementation` và `dev-test-driven-development`.
- **Sửa một bug** &rarr; Nó sẽ kích hoạt `dev-debugging`.

### 2. Các Personas Chuyên Biệt (Specialized Agent Personas)
Plugin đăng ký các định nghĩa subagent (có thể tái sử dụng) từ thư mục `agents/`:
- `code-reviewer.md`
- `security-auditor.md`
- `qa.md`

Bạn có thể gọi trực tiếp các personas này ngay trong phiên làm việc của bạn, hoặc gọi khi ủy thác công việc (delegating) qua các subagents.

---

## Cấu Hình & Tùy Biến (Configuration & Customization)

### Ép Buộc Quy Tắc Riêng Của Dự Án (`AGENTS.md`)
Để ép buộc hệ thống phải tuân thủ nghiêm ngặt các skills (ví dụ: bắt buộc phải có tech-spec hoặc plan trước khi viết code), hãy copy hoặc link file `AGENTS.md` vào gốc (root) của workspace của bạn. Antigravity CLI sẽ đọc file này để uốn nắn hành vi và quá trình lập kế hoạch của agent sao cho khớp với các quy ước của team bạn.

### Chế Độ Sandbox
Nếu bạn muốn chạy các skills hoặc scripts với quyền hạn terminal bị giới hạn (vì lý do an toàn, ví dụ như khi chạy các bài test xác minh từ bên thứ ba), hãy khởi chạy CLI với:

```bash
agy --sandbox
```

---

## Mẹo Sử Dụng (Usage Tips)

1. **Luôn cập nhật plugins:** Bạn có thể update CLI hoặc kiểm tra các phiên bản plugin mới hơn bằng lệnh:
   ```bash
   agy update
   ```
2. **Review trước khi thực thi:** Khi các agents thực hiện các tác vụ refactor phức tạp thông qua những skills này, hãy nhấn `Ctrl+r` để vào màn hình **Artifact Review**. Tại đây bạn có thể xem lại, chỉnh sửa hoặc duyệt (approve) code trước khi nó được commit.
3. **Kiểm soát quyền:** Bạn chỉ nên sử dụng cờ `--dangerously-skip-permissions` trong các dự án local hoàn toàn tin tưởng, nơi bạn muốn bỏ qua các lời nhắc phê duyệt công cụ (tool approval prompts) thủ công.
