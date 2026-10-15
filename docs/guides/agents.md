# Các Agent Personas

Các personas chuyên biệt đóng một vai trò duy nhất với một góc nhìn duy nhất. Mỗi persona là một file Markdown được sử dụng làm system prompt cho công cụ của bạn (Claude Code, Cursor, Copilot, v.v.).

| Persona                                                                                            | Plugin                    | Vai Trò                          | Phù hợp nhất cho                                                       |
|----------------------------------------------------------------------------------------------------|---------------------------|----------------------------------|------------------------------------------------------------------------|
| [ba-po](../../plugins/ba-po/agents/ba-po.md)                                                       | `ba-po`                   | Business Analyst & Product Owner | Phân tích requirements, xác định gaps, lập tài liệu *-final.md         |
| [qa](../../plugins/qa/agents/qa.md)                                                                | `qa`                      | QA Engineer                      | Chiến lược test, phân tích độ bao phủ, thiết kế checklist, BDD Gherkin |
| [scrum-master](../../plugins/scrum-master/agents/scrum-master.md)                                  | `scrum-master`            | Scrum Master                     | Lập kế hoạch, daily standup, xử lý rủi ro, retrospective               |
| [code-reviewer](../../plugins/code-reviewer/agents/code-reviewer.md)                               | `code-reviewer`           | Senior Staff Engineer            | Review code 5 phương diện trước khi merge                              |
| [security-auditor](../../plugins/code-reviewer/agents/security-auditor.md)                      | `code-reviewer`           | Security Engineer                | Phát hiện lỗ hổng, audit theo chuẩn OWASP                              |
| [web-performance-auditor](../../plugins/code-reviewer/agents/web-performance-auditor.md) | `code-reviewer`           | Web Performance Engineer         | Audit Core Web Vitals, phân tích load/render/network                   |

## Personas liên quan đến skills và lệnh như thế nào

Có ba tầng (layers), mỗi tầng đảm nhiệm một công việc riêng biệt:

| Tầng               | Định nghĩa                                        | Ví dụ                     | Vai trò trong bố cục                                                     |
|--------------------|---------------------------------------------------|---------------------------|--------------------------------------------------------------------------|
| **Skill**          | Một quy trình với các bước và tiêu chí hoàn thành | `review-code-and-quality` | Từ *như thế nào* (how) — được gọi từ bên trong một persona hoặc một lệnh |
| **Persona**        | Một vai trò với góc nhìn và định dạng đầu ra      | `code-reviewer`           | Từ *ai* (who) — nhận một góc nhìn, đưa ra một báo cáo                    |
| **Lệnh (Command)** | Điểm bắt đầu dành cho người dùng                  | `/cr-review`, `/dev-audit`   | Từ *khi nào* (when) — kết hợp personas và skills                         |

Người dùng (hoặc một slash command) đóng vai trò điều phối (orchestrator). **Personas không gọi các personas khác.** Skills là các bước bắt buộc bên trong quy trình làm việc của một persona.

## Khi nào nên dùng cái nào

### Gọi trực tiếp persona
Hãy chọn cách này khi bạn muốn có một góc nhìn cho thay đổi hiện tại và người dùng đang trực tiếp làm việc.

- "Hãy review PR này" → gọi trực tiếp `code-reviewer`
- "Có vấn đề bảo mật nào trong `auth.ts` không?" → gọi trực tiếp `security-auditor`
- "Luồng checkout (thanh toán) đang thiếu những tests nào?" → gọi trực tiếp `qa`
- "Audit Core Web Vitals trên trang sản phẩm" → gọi trực tiếp `web-performance-auditor`

### Slash command (chỉ có 1 persona đứng sau)
Hãy chọn cách này khi có một quy trình lặp đi lặp lại mà bình thường bạn sẽ phải giải thích lại mỗi lần.

- `/cr-review` → bọc `code-reviewer` với skill review của dự án
- `/dev-unit-test` → bọc `qa` với skill TDD
- `/qa` → bọc `qa` với skill qa-test-design để thiết kế checklist + BDD Gherkin
- `/webperf` → bọc `web-performance-auditor` để audit chuyên sâu hiệu năng trên web apps

### Slash command (điều phối viên — chạy song song / fan-out)
Chỉ chọn cách này khi các đánh giá **độc lập** có thể chạy song song và tạo ra các báo cáo để một agent duy nhất có thể tổng hợp sau đó.

- `/dev-audit` → chạy song song `code-reviewer` + `security-auditor` + `qa`, sau đó tổng hợp các báo cáo của chúng thành quyết định có nên duyệt (go/no-go) hay không.

Đây là mô hình điều phối duy nhất mà kho lưu trữ này ủng hộ. Hãy xem [orchestration-patterns.md](../architecture/orchestration-patterns.md) để biết thêm danh mục đầy đủ các mẫu và phản mẫu.

## Ma trận quyết định

```
Công việc có phải là một góc nhìn duy nhất trên một tài liệu/thay đổi duy nhất không?
├── Có → Gọi trực tiếp persona
└── Không  → Các công việc con có độc lập không (không chia sẻ trạng thái, không phụ thuộc thứ tự)?
         ├── Có → Slash command với chạy song song (VD: /dev-audit)
         └── Không  → Slash commands chạy tuần tự bởi người dùng (/dev-tech-spec → /dev-plan → /qa → /dev-build → /dev-unit-test → /cr-review)
```

## Ví dụ thực tiễn: Điều phối hợp lệ

`/dev-audit` là điều phối viên fan-out tiêu chuẩn trong repo này:

```
/dev-audit
  ├── (chạy song song) code-reviewer    → báo cáo review
  ├── (chạy song song) security-auditor → báo cáo audit
  └── (chạy song song) qa               → báo cáo độ bao phủ test
                  ↓
         Giai đoạn hợp nhất (main agent)
                  ↓
      Quyết định duyệt + kế hoạch sửa lỗi tự động
```

Tại sao cách này hiệu quả:
- Mỗi sub-agent làm việc trên cùng một mã thay đổi nhưng đưa ra một **góc nhìn khác nhau**
- Chúng không phụ thuộc lẫn nhau → hoàn toàn song song, tiết kiệm thời gian thực
- Mỗi sub-agent chạy trong một context riêng biệt → phiên làm việc chính luôn gọn ngay ngắn
- Bước hợp nhất nhỏ và được hưởng lợi từ việc có đầy đủ context, do đó nó nằm ở phiên làm việc của agent chính.

## Ví dụ thực tiễn: Điều phối không hợp lệ (đừng làm theo)

Một persona `meta-orchestrator` có nhiệm vụ "quyết định xem nên gọi persona nào khác":

```
/work-on-pr → meta-orchestrator
                  ↓ (quyết định "cần review")
              code-reviewer
                  ↓ (trả về kết quả)
              meta-orchestrator (tóm tắt lại kết quả)
                  ↓
               user
```

Tại sao cách này thất bại:
- Chỉ là tầng điều hướng (routing) thuần túy không mang lại giá trị thực tế
- Thêm hai vòng tóm tắt (paraphrasing hops) → làm mất thông tin + gấp 2 lần chi phí token
- Người dùng đã biết họ muốn review; hãy để họ trực tiếp gọi `/cr-review`
- Lặp lại công việc mà slash commands và cấu hình ý định trong `AGENTS.md` đã làm tốt.

## Quy tắc dành cho personas

1. Một persona là một vai trò duy nhất với một định dạng đầu ra duy nhất. Nếu bạn thấy mình đang thêm vai trò thứ hai, hãy tạo một persona thứ hai.
2. **Personas không gọi các personas khác.** Việc kết hợp (Composition) là việc của slash commands hoặc người dùng. Trên Claude Code, đây cũng là rào cản từ hệ thống — *"subagents cannot spawn other subagents"* — nên quy tắc này đã được ép buộc sẵn.
3. Một persona có thể gọi các skills (phần *như thế nào - how*).
4. Mọi file persona phải kết thúc bằng một phần "Composition" ghi rõ nó phù hợp ở đâu.

## Khả năng tương tác với Claude Code

Các personas trong repo này được thiết kế để hoạt động như Claude Code subagents và như đồng đội trong Agent Teams mà không cần phải chỉnh sửa gì:

- **Dưới dạng subagents:** Tự động nhận diện khi plugin này được kích hoạt. Hãy sử dụng công cụ Agent với `subagent_type: code-reviewer` (hoặc `security-auditor`, `qa`). `/dev-audit` là ví dụ tiêu chuẩn.
- **Dưới dạng đồng đội trong Agent Teams** (đang thử nghiệm, yêu cầu `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): tham chiếu cùng tên persona khi gọi một đồng đội. Nội dung của persona được **nối thêm vào** system prompt của đồng đội dưới dạng chỉ dẫn bổ sung (không phải thay thế), vì vậy text của persona sẽ đè lên trên các chỉ dẫn phối hợp nhóm (SendMessage, task-list tools, v.v.).

Subagents chỉ báo cáo kết quả về lại cho agent chính. Agent Teams cho phép đồng đội nhắn tin trực tiếp với nhau. Hãy dùng subagents khi bạn chỉ cần các báo cáo; dùng Agent Teams khi subagents cần đối chất về các kết quả của nhau (VD: debug các giả thuyết cạnh tranh nhau). Xem [orchestration-patterns.md](../architecture/orchestration-patterns.md) để xem chi tiết.

Các plugin agents không hỗ trợ frontmatter `hooks`, `mcpServers`, hoặc `permissionMode` — các trường này bị bỏ qua một cách âm thầm. Tránh phụ thuộc vào chúng khi tạo personas mới ở đây.

## Thêm một persona mới

1. Tạo `agents/<role>.md` với định dạng frontmatter tương tự như các personas hiện có.
2. Định nghĩa vai trò, phạm vi, định dạng đầu ra và các quy tắc.
3. Thêm một phần **Composition** ở cuối.
4. Thêm persona vào bảng ở đầu file này.
5. Nếu persona kích hoạt một mô hình điều phối mới, hãy viết tài liệu cho nó trong `docs/architecture/orchestration-patterns.md` thay vì sáng chế ra mẫu điều phối đó bên trong chính file persona.
