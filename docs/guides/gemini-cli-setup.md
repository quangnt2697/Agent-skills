# Sử dụng agent-skills với Gemini CLI

## Cài Đặt (Setup)

### Lựa chọn 1: Cài đặt dưới dạng Skills (Khuyên dùng)

Gemini CLI có một hệ thống skills tự nhiên giúp tự động phát hiện (auto-discover) các file `SKILL.md` nằm trong thư mục `.gemini/skills/` hoặc `.agents/skills/`. Mỗi skill sẽ tự động kích hoạt khi có nhu cầu dựa trên sự khớp (match) với task của bạn.

**Cài đặt từ repo:**

```bash
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

**Hoặc cài đặt từ một bản clone cục bộ:**

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
npm install
gemini skills install /path/to/agent-skills/skills/
```

**Chỉ cài đặt riêng cho workspace cụ thể:**

```bash
gemini skills install /path/to/agent-skills/skills/ --scope workspace
```

Các skills cài đặt ở phạm vi workspace sẽ nằm trong `.gemini/skills/` (hoặc `.agents/skills/`). Các skills cấp user sẽ nằm ở `~/.gemini/skills/`.

Sau khi cài đặt xong, hãy xác minh bằng lệnh:

```
/skills list
```

Gemini CLI sẽ tự động tiêm (inject) tên và mô tả của skill vào prompt. Khi nó nhận diện được task phù hợp, nó sẽ hỏi quyền để kích hoạt skill đó trước khi tải toàn bộ tài liệu hướng dẫn của skill.

### Lựa chọn 2: Dùng GEMINI.md (Ngữ cảnh cố định)

Đối với các skills mà bạn muốn luôn được load làm ngữ cảnh cố định (persistent context) cho dự án (thay vì kích hoạt khi cần), hãy thêm chúng vào file `GEMINI.md` của dự án:

```bash
# Tạo GEMINI.md chứa các skills cốt lõi làm ngữ cảnh cố định
cat /path/to/agent-skills/skills/incremental-implementation/SKILL.md > GEMINI.md
echo -e "\n---\n" >> GEMINI.md
cat /path/to/agent-skills/skills/review-code-and-quality/SKILL.md >> GEMINI.md
```

Bạn cũng có thể module hóa bằng cách import từ các file riêng biệt:

```markdown
# Hướng dẫn dự án

@skills/dev-test-driven-development/SKILL.md
@skills/incremental-implementation/SKILL.md
```

Sử dụng `/memory show` để kiểm tra ngữ cảnh đã được load, và `/memory reload` để làm mới sau khi thay đổi.

> **Skills so với GEMINI.md:** Skills là những chuyên môn theo yêu cầu, chỉ kích hoạt khi thực sự cần, giúp context window của bạn gọn gàng. GEMINI.md cung cấp các ngữ cảnh cố định (persistent context) được load cho mọi prompt. Hãy dùng skills cho các luồng công việc theo từng giai đoạn nhất định và dùng GEMINI.md cho các quy ước chung của toàn dự án.

## Thiết Lập Khuyên Dùng

### Luôn Bật (Always-On với GEMINI.md)

Thêm các skills này làm ngữ cảnh cố định cho mọi phiên làm việc:

- `incremental-implementation` — Xây dựng bằng các phần cắt nhỏ có thể xác minh được
- `review-code-and-quality` — Review 5 phương diện

### Gọi Khi Cần (On-Demand với Skills)

Hãy cài đặt các skills này để chúng chỉ kích hoạt khi liên quan:

- `dev-test-driven-development` — Kích hoạt khi implement logic hoặc sửa bug
- `dev-spec-driven-development` — Kích hoạt khi bắt đầu một dự án hoặc tính năng mới
- `dev-frontend-engineering` — Kích hoạt khi xây dựng UI (giao diện)
- `dev-security` — Kích hoạt trong quá trình rà soát bảo mật
- `dev-performance` — Kích hoạt khi làm các việc liên quan đến tối ưu hiệu năng

## Cấu Hình Nâng Cao

### Tích Hợp MCP

Nhiều skills trong bộ này tận dụng các công cụ [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) để tương tác với môi trường. Ví dụ:

- `dev-browser-testing-with-devtools` sử dụng MCP extension `chrome-devtools`.
- `dev-performance` có thể hưởng lợi từ các MCP tools liên quan đến hiệu năng.

Để kích hoạt chúng, hãy đảm bảo bạn đã cài đặt các MCP extensions tương ứng trong file cấu hình Gemini CLI của bạn (`~/.gemini/config.json`).

### Các Session Hooks (Móc sự kiện phiên)

Gemini CLI hỗ trợ session lifecycle hooks (các mốc sự kiện vòng đời phiên). Bạn có thể sử dụng chúng để tự động tiêm context hoặc chạy các script xác nhận vào lúc khởi tạo một phiên.

Để có trải nghiệm `agent-skills` giống như ở các công cụ khác, bạn có thể cấu hình một `SessionStart` hook để nhắc bạn về các skills đang có hoặc load luôn meta-skill.

### Load Ngữ Cảnh Tường Minh (Explicit Context Loading)

Bạn có thể ép buộc (explicitly load) bất kỳ skill nào vào session hiện tại bằng cách gọi tên (tag) nó bằng ký hiệu `@` trong prompt của bạn:

```markdown
Hãy dùng skill @skills/dev-test-driven-development/SKILL.md để làm bản sửa lỗi (fix) này.
```

Điều này rất hữu dụng khi bạn muốn chắc chắn một quy trình công việc cụ thể được tuân thủ mà không cần chờ tính năng tự phát hiện (auto-discovery) bắt sóng được.

## Các Lệnh (Slash Commands)

> **Lưu ý:** Bản fork này **không ship thư mục `.gemini/commands/`**. Slash commands chỉ có sẵn cho Claude Code (`.claude/commands/`, định dạng `.md`) và Antigravity CLI (`commands/`, định dạng `.toml`).
>
> Nếu bạn muốn dùng slash commands với Gemini CLI, copy các file `.toml` từ `commands/` sang `.gemini/commands/`:
>
> ```bash
> mkdir -p .gemini/commands && cp commands/*.toml .gemini/commands/
> ```
>
> Phần còn lại của tài liệu này (skills auto-discovery) vẫn áp dụng bình thường cho Gemini CLI.

Danh sách lệnh hiện có trong `commands/` (24 lệnh, cùng bộ với Claude Code):

| Lệnh                | Chức năng                                              |
|---------------------|--------------------------------------------------------|
| `/ba-spec`          | Import & phân tích Jira/Confluence thành Business-Spec |
| `/ba-refine`        | Mài giũa ý tưởng thô trong Jira thành spec rõ ràng     |
| `/tech-spec`        | Viết đặc tả kỹ thuật trước khi viết code               |
| `/plan`             | Chia nhỏ công việc thành các task có thể kiểm chứng    |
| `/build`            | Viết code cho task hiện tại                            |
| `/unit-test`        | Chạy workflow TDD — red, green, refactor               |
| `/review`           | Review code 5 phương diện                              |
| `/code-simplify`    | Giảm độ phức tạp mà không làm thay đổi hành vi         |
| `/qa-test-design`   | Thiết kế Checklist + Gherkin                           |
| `/qa-auto-design`   | Sinh code automation từ Gherkin                        |
| `/qa-run-test`      | Chạy test đã có và xuất báo cáo                        |
| `/qa-full-pipeline` | Chạy toàn bộ QA pipeline trong 1 lệnh                  |
| `/webperf`          | Audit Core Web Vitals và hiệu năng cho web apps        |

Xem đầy đủ bằng `ls commands/`.

## Mẹo Sử Dụng (Usage Tips)

1. **Ưu tiên Skills thay vì GEMINI.md** — Skills kích hoạt on-demand và giúp context window của bạn luôn tập trung. Chỉ bỏ những skills nào bạn muốn lúc nào cũng phải load vào GEMINI.md.
2. **Descriptions (Phần mô tả) của skill rất quan trọng** — Mỗi SKILL.md có một trường `description` trong cấu trúc frontmatter để nói cho agents biết khi nào cần kích hoạt nó. Các descriptions trong repo này đã được tối ưu hóa để tính năng auto-discovery có thể hoạt động tốt trên tất cả các công cụ hỗ trợ (Claude Code, Gemini CLI, v.v.) bằng cách khai báo rõ ràng *những gì* skill đó làm và *khi nào* nó nên được gọi.
3. **Sử dụng agents để review** — Hãy copy nội dung của `agents/code-reviewer.md` khi bạn muốn yêu cầu một bài review code có cấu trúc.
4. **Kết hợp với các tài liệu tham khảo (references)** — Tham chiếu tới các checklists từ thư mục `references/` khi làm việc trên một khu vực chất lượng cụ thể nào đó (như testing hoặc hiệu năng).
