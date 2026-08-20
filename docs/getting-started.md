# Bắt Đầu Với agent-skills

`agent-skills` hoạt động với bất kỳ AI coding agent nào hỗ trợ lệnh Markdown. Hướng dẫn này bao quát cách tiếp cận phổ quát nhất. Để xem hướng dẫn cài đặt cho từng công cụ cụ thể, vui lòng tham khảo các hướng dẫn chuyên biệt.

## Cách Thức Hoạt Động Của Skills

Mỗi skill là một file Markdown (`SKILL.md`) mô tả một quy trình công việc (workflow) kỹ thuật cụ thể. Khi được tải vào ngữ cảnh (context) của agent, agent sẽ tuân theo quy trình đó — bao gồm các bước xác minh, các phản mẫu (anti-patterns) cần tránh và tiêu chí hoàn thành.

**Skills không phải là tài liệu tham khảo.** Chúng là các quy trình từng-bước-một để agent làm theo.

## Bắt Đầu Nhanh (Cho Mọi Agent)

### 1. Clone repository

```bash
git clone https://github.com/addyosmani/agent-skills.git
```

### 2. Chọn một skill

Duyệt qua thư mục `skills/`. Mỗi thư mục con chứa một file `SKILL.md` với các phần sau:
- **Khi nào sử dụng** — Các dấu hiệu cho thấy skill này nên được dùng
- **Quy trình** — Quy trình công việc từng-bước-một
- **Xác minh** — Cách xác nhận công việc đã hoàn thành
- **Những sự ngụy biện phổ biến** — Những lý do agent có thể dùng để bỏ qua các bước
- **Cờ đỏ (Red flags)** — Các dấu hiệu cho thấy skill đang bị vi phạm

### 3. Load skill vào agent của bạn

Sao chép nội dung `SKILL.md` tương ứng vào system prompt, rules file hoặc khung chat của agent. Các cách tiếp cận phổ biến nhất:

**System prompt:** Dán nội dung skill vào lúc bắt đầu phiên làm việc.

**Rules file:** Thêm nội dung skill vào file rules của dự án (như CLAUDE.md, .cursorrules, v.v.).

**Trong khung chat:** Nhắc đến skill khi đưa ra yêu cầu: "Hãy làm theo quy trình dev-test-driven-development cho thay đổi này."

### 4. Sử dụng meta-skill để định tuyến

Bắt đầu bằng việc load skill `meta-using-agent-skills`. Nó chứa một sơ đồ luồng (flowchart) giúp ánh xạ các loại task tới đúng skill cần thiết.

## Thiết Lập Khuyên Dùng

Áp dụng vào một dự án thực tế? **[Cẩm Nang Áp Dụng](adoption-guide.md)** bao quát hai lộ trình từ-đầu-đến-cuối: toàn bộ vòng đời phát triển ngay từ ngày đầu tiên cho một dự án mới tinh, và việc áp dụng từ từ, chú trọng vào xác minh cho một codebase đã có sẵn. Hướng dẫn thiết lập dưới đây là phiên bản tóm tắt nhanh.

### Tối Thiểu (Bắt đầu từ đây)

Load 3 skills thiết yếu sau vào rules file của bạn:

1. **dev-spec-driven-development** — Để định nghĩa xem cần xây dựng cái gì
2. **dev-test-driven-development** — Để chứng minh code hoạt động đúng
3. **review-code-and-quality** — Để xác minh chất lượng trước khi merge

Ba skill này bao phủ các khoảng trống về chất lượng quan trọng nhất trong việc phát triển phần mềm với AI.

### Toàn Bộ Vòng Đời

Để đạt độ bao phủ toàn diện, hãy load các skills theo từng giai đoạn:

```
Bắt đầu dự án:  dev-spec-driven-development → planning-and-task-breakdown
Trong lúc Dev:  incremental-implementation + dev-test-driven-development
Trước khi merge: review-code-and-quality + dev-security
```

### Load Ngữ Cảnh Có Chọn Lọc

Đừng load tất cả skills cùng lúc — việc này lãng phí ngữ cảnh. Hãy load các skills liên quan tới task hiện tại:

- Làm việc với UI? Load `dev-frontend-engineering`
- Debugging? Load `dev-debugging`

## Cấu Phẫu Của Skill

Mọi skill đều tuân theo cùng một cấu trúc:

```
YAML frontmatter (tên, mô tả)
├── Tổng Quan — Skill này làm gì
├── Khi Nào Sử Dụng — Triggers và điều kiện
├── Quy Trình Cốt Lõi — Quy trình từng-bước-một
├── Ví Dụ — Code mẫu và patterns
├── Những Sự Ngụy Biện Phổ Biến — Lời bào chữa và phản bác
├── Cờ Đỏ (Red Flags) — Dấu hiệu skill bị vi phạm
└── Xác Minh — Checklist tiêu chí hoàn thành
```

Xem [skill-anatomy.md](skill-anatomy.md) để biết thêm chi tiết đặc tả đầy đủ.

## Sử Dụng Các Agents

Thư mục `agents/` chứa các định nghĩa agent (personas) đã được cấu hình sẵn:

| Agent | Mục Đích |
|-------|---------|
| `code-reviewer.md` | Code review 5 phương diện |
| `qa.md` | Chiến lược kiểm thử và viết kịch bản |
| `security-auditor.md` | Phát hiện lỗ hổng bảo mật |
| `web-performance-auditor.md` | Audit hiệu năng Core Web Vitals (qua `/webperf`) |

Load một định nghĩa agent khi bạn cần sự đánh giá chuyên sâu. Ví dụ: yêu cầu coding agent của bạn "hãy review thay đổi này sử dụng persona code-reviewer" và cung cấp định nghĩa agent.

## Sử Dụng Lệnh (Commands)

Thư mục `.claude/commands/` chứa các slash commands dành cho Claude Code:

| Lệnh | Kích Hoạt Skill |
|---------|---------------|
| `/tech-spec` | dev-spec-driven-development |
| `/plan` | planning-and-task-breakdown |
| `/build` | incremental-implementation |
| `/unit-test` | dev-test-driven-development |
| `/build auto` | planning-and-task-breakdown → incremental-implementation + dev-test-driven-development (làm toàn bộ plan, chỉ duyệt 1 lần) |
| `/dev-audit` | dev-audit-and-fix (Review toàn diện, lập plan, và tự động sửa chữa toàn bộ sau khi duyệt) |
| `/review` | review-code-and-quality |
| `/code-simplify` | code-simplification |
| `/webperf` | web-performance-auditor (agent chuyên sâu, chỉ cho web app) |

> **Lưu ý:** Khi cài đặt dưới dạng plugin cho Claude Code, bạn có thể thấy cảnh báo dạng
> _"Default commands/ folder is ignored because the manifest sets 'commands'"_.
> Điều này là bình thường. Thư mục `commands/` ở thư mục gốc thuộc về Antigravity CLI
> và cố tình được tách biệt khỏi `.claude/commands/`. Mọi slash commands của Claude Code 
> đều được load chính xác từ `.claude/commands/`; cảnh báo trên chỉ là vấn đề hiển thị.

## Sử Dụng Tài Liệu Tham Khảo (References)

Thư mục `references/` chứa các checklist bổ trợ:

| Tài Liệu Tham Khảo | Dùng Với |
|-----------|----------|
| `testing-patterns.md` | dev-test-driven-development |
| `performance-checklist.md` | dev-performance |
| `security-checklist.md` | dev-security |
| `accessibility-checklist.md` | dev-frontend-engineering |
| `definition-of-done.md` | toàn bộ skills / mọi thay đổi |
| `orchestration-patterns.md` | dev-doubt-driven-development |

Load một tài liệu tham khảo khi bạn cần những patterns chi tiết vượt ra ngoài phạm vi của một skill thông thường.

## Spec và Task Artifacts

Các lệnh `/tech-spec` và `/plan` sẽ tạo ra các file làm việc (như `final.md`, `tech/plan.md`, `tech/todo.md`) trong `workspace/{issueKey}/`. Hãy đối xử với chúng như **các tài liệu sống (living documents)** khi công việc đang diễn ra:

- Lưu chúng trên version control (Git) trong quá trình phát triển để con người và agent có chung một source of truth.
- Cập nhật chúng khi phạm vi (scope) hoặc quyết định thay đổi.
- Nếu repo của bạn không muốn lưu giữ lâu dài, hãy xoá chúng trước khi merge hoặc cho thư mục đó vào `.gitignore` — quy trình này không bắt buộc chúng phải tồn tại vĩnh viễn.

## Mẹo Nhanh (Tips)

1. **Luôn bắt đầu bằng dev-spec-driven-development** cho những công việc phức tạp.
2. **Luôn load dev-test-driven-development** khi viết code.
3. **Đừng bao giờ bỏ qua bước xác minh** — đó là cốt lõi của quy trình.
4. **Load skills có chọn lọc** — ngữ cảnh dài hơn không có nghĩa là tốt hơn.
5. **Sử dụng các agents để review** — những góc nhìn khác nhau sẽ bắt được các lỗi khác nhau.
