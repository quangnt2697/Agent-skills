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

## 7 Personas & Pipelines

### Persona 1: BA/PO — Business Analyst / Product Owner

**Vai trò:** Cầu nối giữa stakeholders và implementation teams (QA + DEV), đảm bảo requirements được import đầy đủ, phân tích kỹ lưỡng, làm rõ mọi gaps, và tổng hợp thành `*-final.md` (Single Source of Truth).

**Pipeline BA/PO:**
```
Phase 1-2: Import & Analyze
/ba-spec {issueKey} → Import Jira/Confluence → Scan references → Download → Extract → Gap detection

Phase 3: Clarify
ba-interview-me (auto-invoke) → Hỏi từng câu một kèm guess → Đạt ≥90% confidence

Phase 4: Consolidate & Handoff
Tổng hợp *-final.md → Handoff to QA (/qa-test-design) or DEV (/tech-spec)
```

**Ranh giới:**
- CHỈ viết Business-Spec (`*-final.md`), User Stories, Acceptance Criteria **Checklist** (rule-based)
- KHÔNG viết Tech-Spec, API Contract, Database Schema (đó là việc của DEV)
- KHÔNG viết Test Cases, Gherkin scenarios, Automation Code (đó là việc của QA)
- HANDOFF rõ ràng: `*-final.md` → QA/DEV

**Lưu ý quan trọng về AC (Acceptance Criteria):**
- BA/PO viết AC = **Checklist** với business rules (WHAT must be true)
- QA transforms AC = **Gherkin** scenarios với test data (HOW to test)
- Không overlap: BA viết high-level rules, QA viết low-level test scenarios
- Chi tiết: `docs/architecture/ba-ac-vs-qa-gherkin-overlap-analysis.md`

**Skills:** `ba-spec`, `ba-refine`, `ba-interview-me`, `ba-gap-analysis`, `ba-user-story-writing`, `ba-backlog-prioritization`, `ba-stakeholder-interview`, `ba-process-modeling`, `ba-design-flowchart`

---

### Persona 2: QA — Quality Assurance Engineer / SDET

**Vai trò:** Đảm bảo chất lượng phần mềm thông qua thiết kế test, automation, và validation trong domain Tài chính - Chứng khoán - Ngân hàng.

**Pipeline QA:**
```
(Nhận *-final.md từ BA/PO) → /qa-test-design → /qa-auto-design → /qa-run-test
                                       └─── hoặc chạy full: /qa-full-pipeline ───┘
```

**Ranh giới:**
- CHỈ viết test code (trong `tests/`)
- KHÔNG tự ý sửa app code
- KHÔNG viết Business-Spec (nhận từ BA/PO)
- TÁI SỬ DỤNG code dev có sẵn

**Input từ BA/PO:** `*-final.md` (Acceptance Criteria, User Flow, Edge Cases)  
**Output:** Checklist + Gherkin + Test Automation Code

**Skills:** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-code2spec`, `qa-squash-push`, `qa-full-pipeline`

---

### Persona 3: DEV — Software Developer / Engineer

**Vai trò:** Thiết kế, xây dựng, và triển khai phần mềm chất lượng cao.

**Pipeline DEV:**
```
(Nhận *-final.md từ BA/PO) → /tech-spec → /plan → /build [auto] → /review → /unit-test → /ship
```

**Ranh giới:**
- Viết code ứng dụng, kiến trúc, API, Database Schema
- KHÔNG can thiệp vào test code QA (E2E/Integration)
- KHÔNG viết Business-Spec (nhận từ BA/PO)
- Tuân thủ TDD (Red → Green → Refactor)

**Input từ BA/PO:** `*-final.md` (Business Rules, Data Requirements, Dependencies)  
**Output:** Tech-Spec + App Code + Unit Tests

**Skills:** `dev-spec-driven-development`, `dev-api-design`, `dev-test-driven-development`, `dev-doubt-driven-development`, `dev-frontend-engineering`, `dev-browser-testing-with-devtools`, `dev-debugging`, `dev-performance`, `dev-security`, `dev-refactoring`, `dev-audit-and-fix`, `dev-incremental-implementation`, `dev-planning-and-task-breakdown`, `dev-source-driven-development`

---

### Persona 4: Scrum Master

**Vai trò:** Bảo vệ quy trình làm việc Agile, phát hiện các chướng ngại vật (impediments), cân bằng tải khối lượng công việc cho DEV, và hỗ trợ các vai trò khác (BA, QA, DEV) hoàn thành tốt Sprint.

**Pipeline Scrum Master:**
```
Lập kế hoạch: /sm-sprint-planning → Tính toán velocity & pull backlog
Theo dõi: /sm-daily-standup → Thống kê tiến độ & tải DEV
Xử lý sự cố: /sm-impediment-triage → Gỡ rối ticket kẹt
Tổng kết: /sm-sprint-retrospective → Rút kinh nghiệm
```

**Ranh giới:**
- CHỈ đọc dữ liệu cấu hình từ `sm-config.yaml` và hệ thống Jira/Confluence.
- KHÔNG can thiệp vào code, test hay business spec.
- Mọi artifacts được phân bổ vào các thư mục `trace/` (báo cáo) và `tech/` (kế hoạch) bên dưới `workspace/sprint/`.

**Skills:** `sm-sprint-planning`, `sm-daily-standup`, `sm-impediment-triage`, `sm-sprint-retrospective`

---

### Persona 5: Code Reviewer
**Vai trò:** Đánh giá mã nguồn, đơn giản hóa và đảm bảo chất lượng code.
**Skills:** `cr-review-code-and-quality`, `cr-code-simplification`

---

### Persona 6: Security Auditor
**Vai trò:** Đánh giá bảo mật, phát hiện lỗ hổng theo chuẩn OWASP.
**Skills:** `security-code-audit`
**Commands:** `/security-audit`

---

### Persona 7: Web Performance Auditor
**Vai trò:** Đánh giá hiệu năng web, Core Web Vitals, v.v.
**Skills:** `webperf-core-vitals`
**Commands:** `/webperf-audit`

---

### Skills dùng chung (Meta - `plugins/core`):
`meta-context`, `meta-using-agent-skills`, `meta-cross-validation`, `meta-continuous-learning`, `meta-session-checkpoint`

---

## Git Workflow & Branch-based Development

**Nguyên tắc vàng:** ❌ KHÔNG BAO GIỜ commit trực tiếp vào `main`/`master`

### Workflow chuẩn
```
1. Tạo feature branch    git checkout -b feature/{issueKey}
2. Code & verify         [Write code → Run tests → Build]
3. Trình bày cho user    [Show changes → Wait approval]
4. Commit & merge        [git add → commit → merge to main]
```

**Commit CHỈ SAU KHI user approve.** Một task = một commit duy nhất khi hoàn thành.

### Branch naming
- `feature/{issueKey}` — Tính năng mới
- `fix/{issueKey}` — Sửa bug
- `refactor/{description}` — Refactor code

### Commit message format
```
[{issueKey}] Short description

- Chi tiết thay đổi 1
- Chi tiết thay đổi 2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

**📖 Chi tiết đầy đủ:** `.claude/rules/git-workflow.md`

---

## Confidence Level System

Mỗi skill output có **Confidence Level** để đánh giá chất lượng:

### Levels
| Level         | Range   | Meaning                  | Action                      |
|---------------|---------|--------------------------|-----------------------------|
| 🟢 **High**   | 90-100% | Đầy đủ, đã verify        | Chạy tiếp                   |
| 🟡 **Medium** | 70-89%  | Đầy đủ nhưng có gaps nhỏ | Ghi gap, chạy tiếp          |
| 🔴 **Low**    | <70%    | Thiếu sót hoặc uncertain | Cảnh báo rõ, đề xuất review |

### Calculation
```python
confidence = (completeness * 0.6) + (certainty * 0.4)

# completeness: % công việc hoàn thành
# certainty: % chắc chắn output đúng
```

### Output format trong mọi artifacts
```markdown
## 📊 Confidence Assessment

**Confidence Level:** 🟢 High (95%)

**Factors:**
- ✅ Factor 1: Description (weight: 30%)
- ⚠️ Factor 2: Minor issue (weight: 20%)

**Blockers:** None
```

**QUAN TRỌNG:** Confidence Level CHỈ dùng để **báo cáo chất lượng**, KHÔNG dùng làm cổng chặn luồng. Việc dừng hay chạy tiếp do `.claude/rules/autonomy-contract.md` quyết định.

**📖 Chi tiết đầy đủ:** `.claude/rules/confidence-level.md`

---

## Ranh giới Persona — Chi tiết

BA/PO sở hữu `*-final.md`; QA sở hữu test artifacts; DEV sở hữu app code + Tech-Spec.
Hai skill BA chính:

|            | `ba-spec`                    | `ba-refine`                               |
|------------|------------------------------|-------------------------------------------|
| **Input**  | Jira có requirements rõ ràng | Jira có ý tưởng thô/mơ hồ                 |
| **Focus**  | Completeness (13 sections)   | Clarity & Detail (brainstorm)             |
| **Output** | `*-final.md` để bàn giao     | Jira description đã cập nhật + file local |

📖 Chi tiết trách nhiệm, quy trình và handoff: [docs/architecture/ba-workflow-detail.md](docs/architecture/ba-workflow-detail.md)

---

### Ai viết loại test nào

| Loại test   | Chủ sở hữu                          | Đặt ở đâu                                        |
|-------------|-------------------------------------|--------------------------------------------------|
| Unit        | DEV                                 | `tests/unit/` hoặc `src/__tests__/`              |
| Integration | DEV thiết kế, QA mở rộng            | `tests/integration/`                             |
| E2E         | QA                                  | `/project-root/workspace/{issueKey}/test/steps/` |
| Performance | QA thiết kế, DEV tối ưu             | —                                                |
| Security    | Security-Auditor / QA test, DEV fix | —                                                |

Code review: DEV tự review trước khi trình kết quả; QA review thêm ở góc độ testability
cho feature critical (tiền/auth/bảo mật), feature nhiều edge case, và bug fix.

📖 Chi tiết kèm ví dụ code từng loại: [docs/architecture/test-ownership.md](docs/architecture/test-ownership.md)

## Tổng kết Ranh giới

| Hoạt động                         | BA/PO    | QA                         | DEV            | Collaboration           |
|-----------------------------------|----------|----------------------------|----------------|-------------------------|
| **Import & Analyze Requirements** | ✅ Owner | ❌                         | ❌             | —                       |
| **Gap Analysis & Clarification**  | ✅ Owner | ❌                         | ❌             | —                       |
| **Business-Spec Writing**         | ✅ Owner | ❌                         | ❌             | —                       |
| **Unit Test**                     | ❌       | ❌                         | ✅ Owner       | —                       |
| **Integration Test**              | ❌       | ✅ Owner                   | ✅ Support     | 50/50                   |
| **E2E Test**                      | ❌       | ✅ Owner                   | ❌             | —                       |
| **Performance Test**              | ❌       | ✅ Owner                   | 🔧 Support     | QA design, DEV optimize |
| **Security Test**                 | ❌       | ✅ Test                    | 🔧 Fix         | QA test, DEV fix        |
| **Code Review (app code)**        | ❌       | ✅ Optional QA review      | ✅ Self-review | DEV first, QA second    |
| **Code Review (test code)**       | ❌       | ✅ Self-review             | ❌             | —                       |
| **Refactoring**                   | ❌       | ❌                         | ✅ Owner       | —                       |
| **Bug Fix**                       | ❌       | ✅ Verify fix + regression | ✅ Fix code    | DEV fix, QA verify      |
| **Tech-Spec Writing**             | ❌       | ❌                         | ✅ Owner       | —                       |

**Legend:**
- ✅ Owner — responsible cho hoạt động này
- 🔧 Support — hỗ trợ khi cần
- ❌ — không làm

---

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