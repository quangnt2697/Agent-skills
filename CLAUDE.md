# agent-skills

Đây là dự án agent-skills — bộ sưu tập kỹ năng (skills) cấp sản xuất cho các AI coding agents.

> **Phạm vi:** File này cấu hình agent Claude làm việc trong repo [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills). Không copy file này vào dự án khác hay cấu hình agent toàn cục; tài sản tái sử dụng được nằm trong `skills/`.

## Cấu trúc Dự án

```
plugins/                          → Chứa các plugin chuyên biệt
  ├── ba-po/                      → BA/PO persona & skills
  ├── qa/                         → QA persona & skills
  ├── dev/                        → DEV persona & skills
  ├── scrum-master/               → Scrum Master persona & skills
  ├── code-reviewer/              → Code Reviewer persona & skills
  ├── security-auditor/           → Security Auditor persona & skills
  ├── web-performance-auditor/    → Web Performance Auditor persona & skills
  └── core/                       → Meta-skills, shared commands (e2e-delivery, learn, checkpoint)
references/                       → Checklist bổ trợ (testing, performance, security, v.v.)
evals/                            → Trường hợp đánh giá skill + framework
docs/                             → Hướng dẫn cài đặt và thiết kế kiến trúc
```

## Quy Tắc Dùng Chung (Shared Rules)

> 📖 **Toàn bộ định nghĩa 7 Personas, Pipelines, Phân công trách nhiệm, Git Workflow và Confidence Level System được chuẩn hóa tập trung tại:**
> **[references/agent-rules-shared.md](references/agent-rules-shared.md)**

Tóm tắt nhanh các Personas:
1. **BA/PO:** Phân tích yêu cầu, làm rõ gaps (`ba-interview-me`), sở hữu Business-Spec `*-final.md`.
2. **QA/SDET:** Thiết kế test checklist, kịch bản BDD Gherkin, automation test (`qa-full-pipeline`).
3. **DEV:** Thiết kế Tech-Spec, viết code theo TDD, tuân thủ Clean Architecture (`dev-build`).
4. **Scrum Master:** Điều hành Sprint planning, daily standup, tháo gỡ blockers (`sm-config.yaml` / `.env`).
5. **Code Reviewer:** Review đa chiều và đơn giản hóa code (`cr-review-code-and-quality`).
6. **Security Auditor:** Rà soát lỗ hổng bảo mật OWASP Top 10 (`security-code-audit`).
7. **Web Performance Auditor:** Kiểm toán Core Web Vitals, tối ưu render và network (`webperf-core-vitals`).


## Pipeline Tích hợp (E2E Delivery)

Khi cần deliver một feature hoàn chỉnh, dùng `/e2e-delivery` để orchestrate cả 3 personas:

```
/e2e-delivery JIRA-123

Phase 1-3:  BA/PO → Business-Spec (*-final.md) + Gap clarification
Phase 4-6:  DEV → Tech-Spec + Code + Unit Test
Phase 7-10: QA → Test Design (Checklist + Gherkin) + Automation + Run Test
Phase 11:   DEV + QA → Review

→ Output: Production-ready code + tests
```

**Luồng Handoff:**
```
BA/PO creates *-final.md
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
    QA reads          DEV reads         Both read
    *-final.md        *-final.md        *-final.md
         │                 │                 │
         ▼                 ▼                 ▼
    /qa-test-design   /tech-spec      Parallel work
    Checklist +       API Contract +  QA: Test artifacts
    Gherkin           Data Model      DEV: Code + Unit tests
```

**Chi tiết:** Xem `plugins/core/.claude/commands/e2e-delivery.md`

## Kỹ năng theo Giai đoạn

**Xác định (Define — BA/PO):** `ba-spec`, `ba-interview-me`, `ba-refine`, `ba-gap-analysis`, `ba-process-modeling`, `ba-user-story-writing`, `ba-backlog-prioritization`, `ba-design-flowchart`
**Lên kế hoạch (Plan — ALL):** `dev-planning-and-task-breakdown`
**Xây dựng (Build — DEV):** `dev-incremental-implementation`, `dev-spec-driven-development`, `dev-test-driven-development`, `dev-source-driven-development`, `dev-doubt-driven-development`, `dev-frontend-engineering`, `dev-api-design`
**Xác minh (Verify — DEV):** `dev-browser-testing-with-devtools`, `dev-debugging`
**Đánh giá (Review — DEV+QA+CR):** `cr-review-code-and-quality`, `cr-code-simplification`, `dev-security`, `dev-performance`, `dev-audit-and-fix`
**Kiểm thử (Test — QA):** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-code2spec`, `qa-squash-push`, `qa-full-pipeline`
**Quản lý Phiên (Session Management - ALL):** `meta-continuous-learning`, `meta-session-checkpoint`, `meta-cross-validation`, `meta-context`, `meta-using-agent-skills`

## Quy ước

- Mỗi kỹ năng nằm trong `plugins/<plugin-name>/skills/<tên>/SKILL.md`
- YAML frontmatter có trường `name` và `description`
- Description bắt đầu bằng mô tả kỹ năng (ngôi thứ ba), theo sau là điều kiện kích hoạt ("Sử dụng khi...")
- Mỗi kỹ năng có: Tổng quan, Khi nào sử dụng, Quy trình, Các biện hộ thường gặp, Dấu hiệu cảnh báo, Xác minh
- Tài liệu tham khảo dùng chung nằm trong thư mục gốc `references/`; kỹ năng độc lập giữ tham khảo trong `plugins/<plugin-name>/skills/<tên>/references/`
- File bổ trợ chỉ tạo khi nội dung vượt quá 100 dòng

## Chuẩn mực Đầu ra

- **Đường dẫn:** MỌI artifact sinh ra bởi skill BẮT BUỘC nằm dưới `/project-root/workspace/{issueKey}/`,
  trong đúng **5 thư mục gốc**: `source/` (tài liệu tải về) · `spec/` (BA) · `tech/` (DEV) ·
  `test/` (QA) · `trace/` (truy vết). Trước khi ghi file đầu tiên, luôn chạy
  `cd "$(git rev-parse --show-toplevel)"` rồi `mkdir -p /project-root/workspace/{issueKey}/<root>`.
  Không ghi ra gốc repo, không tự đặt gốc thứ 6, không lặp lại `{issueKey}` ở thư mục con.
  📖 Chi tiết + cây thư mục chuẩn: `.claude/rules/workspace-paths.md`
- **Ngôn ngữ:** Mọi tài liệu (Spec, Checklist, Kịch bản, Báo cáo) BẮT BUỘC viết bằng Tiếng Việt
- **Truy vết (Traceability):** Test case phải map 1-1 với Checklist và Spec
- **Log Lỗi:** Trong báo cáo test API/WebSocket, bắt buộc in ra Request (Headers, Body) và Response (Status, Body)

## Đóng góp

Trước khi thêm kỹ năng mới hoặc chỉnh sửa lớn một kỹ năng hiện có, chạy kiểm tra sơ bộ trong [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill): tìm trong catalog, kiểm tra PR đang mở, xác nhận ý tưởng phù hợp [docs/guides/skill-anatomy.md](docs/guides/skill-anatomy.md), và giải trình khoảng trống. Ưu tiên mở rộng kỹ năng hiện có thay vì thêm bản gần trùng lặp.

## Lệnh

- `npm test` — chạy toàn bộ cổng chất lượng: 5 validator + unit test (phải xanh trước khi merge)
- `npm run validate` — chỉ chạy 5 validator (skills, commands, versions, links, artifact paths)
- `npm run test:unit` — chỉ chạy unit test của các script
- `npm run evals` — đánh giá trigger/routing cho mọi kỹ năng; `node scripts/run-evals.js --behavioral <skill>` cho chạy có chấm điểm

Chạy riêng từng validator khi cần khoanh vùng lỗi:

| Lệnh                        | Kiểm tra                                                                                    |
|-----------------------------|---------------------------------------------------------------------------------------------|
| `npm run validate:skills`   | SKILL.md có frontmatter hợp lệ, `name` khớp thư mục, đủ 5 section bắt buộc                  |
| `npm run validate:commands` | `.claude/commands` và `commands/` bên trong các plugin khớp nhau về tên lệnh và description |
| `npm run validate:versions` | Các plugin manifest khai báo cùng một version                                               |
| `npm run validate:links`    | Link tới `references/` trong skill giải được đúng đường dẫn                                 |
| `npm run validate:paths`    | Đường dẫn artifact trong tài liệu theo đúng quy ước                                         |

Riêng skill `ba-design-flowchart` có môi trường Node độc lập:

| Lệnh (chạy trong `plugins/ba-po/skills/ba-design-flowchart`)   | Tác dụng                                                                          |
|----------------------------------------------------------------|-----------------------------------------------------------------------------------|
| `npm install`                                                  | Cài `@mermaid-js/mermaid-cli` + `beautiful-mermaid`                               |
| `npm run doctor`                                               | Chẩn đoán engine render + vị trí Chrome — chạy đầu tiên khi clone repo về máy mới |
| `npm test`                                                     | Smoke test cả hai engine                                                          |

## Ranh giới

- Luôn: Chạy kiểm tra sơ bộ CONTRIBUTING.md trước khi tạo thư mục kỹ năng mới
- Luôn: Tuân theo format docs/guides/skill-anatomy.md cho kỹ năng mới
- Luôn: Kiểm tra PR và issue đang mở trên repo upstream trước khi mở PR mới
- Không bao giờ: Thêm kỹ năng chỉ là lời khuyên chung thay vì quy trình hành động cụ thể
- Không bao giờ: Duplicate nội dung giữa các kỹ năng — tham chiếu chéo thay vì copy

## Git Workflow & Autonomy

Xem chi tiết tại [`AGENTS.md`](AGENTS.md) (Section 7 — Tự Chủ & Chủ Động) và [`.claude/rules/git-workflow.md`](.claude/rules/git-workflow.md).