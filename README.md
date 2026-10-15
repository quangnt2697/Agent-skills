# agent-skills

Bộ sưu tập kỹ năng (skills) cấp sản xuất cho AI coding agents, tập trung vào quy trình phát triển phần mềm chuyên nghiệp từ phân tích yêu cầu, thiết kế kỹ thuật, đến kiểm thử và triển khai.

---

## 🎯 Tổng quan

**agent-skills** cung cấp 7 personas chuyên biệt với bộ kỹ năng đầy đủ để tự động hóa toàn bộ vòng đời phát triển phần mềm (SDLC). Hệ thống được module hóa thành các **plugins**, cho phép bạn chỉ cài đặt những gì mình cần:

### 1. BA/PO — Business Analyst / Product Owner (`plugins/ba-po`)
Chuyên gia phân tích nghiệp vụ, làm rõ yêu cầu, viết đặc tả, và ưu tiên backlog.

**9 skills:** Import Jira/Confluence, phỏng vấn stakeholders, viết User Stories, phân tích gaps, ưu tiên backlog, tinh chỉnh backlog, mô hình hóa quy trình, v.v.

### 2. QA/SDET — Quality Assurance / Test Engineer (`plugins/qa`)
Chuyên gia kiểm thử, thiết kế test cases, automation testing, và đảm bảo chất lượng.

**6 skills:** Test design (Checklist + Gherkin), automation code generation, test execution, reverse engineering, Squash TM integration.

### 4. Scrum Master (`plugins/scrum-master`)
Kỹ sư Quản lý Quy trình & Điều phối (Scrum Master). Quản lý Sprint, theo dõi Kanban board, phát hiện rủi ro (blockers), và điều hành các nghi thức Agile.

**4 skills:** Sprint planning, daily standup, impediment triage, sprint retrospective.

### 5. Code Reviewer & Quality Engineer (`plugins/code-reviewer`)
Kỹ sư chuyên trách đánh giá chất lượng mã nguồn, bảo mật và hiệu năng web.

**4 skills:** Code simplification (`cr-code-simplification`), code and quality review (`cr-review-code-and-quality`), security code audit (`security-code-audit`), web performance Core Web Vitals (`webperf-core-vitals`).

### 6. Fintech Data Engineer (`plugins/fintech-data`)
Kỹ sư dữ liệu thị trường và kiểm toán dữ liệu chứng khoán.

**1 skill:** TimescaleDB KRX MDDS data reconciler (`db-timescale-reconciler`).

*(Ngoài ra còn có `plugins/core` chứa các kỹ năng meta, đồng bộ repo và lệnh dùng chung).*

---

## ⚡ Hướng Dẫn Cài Đặt (Installation Guide)

Do dự án bao gồm nhiều hệ sinh thái (Agent Plugins, n8n Fast-Path, Ngrok Tunnel, Mattermost Webhook), toàn bộ quy trình thiết lập đã được hợp nhất vào một tài liệu duy nhất để dễ theo dõi.

👉 **Mời bạn xem: [Cẩm Nang Cài Đặt & Tích Hợp (Installation Guide)](docs/guides/installation-guide.md)**

**Bắt đầu nhanh (macOS):**
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm run setup:mac     # cài công cụ, tạo .env, nạp n8n workflows, đồng bộ plugins
npm test              # kiểm tra cài đặt
```
Windows/Linux: làm thủ công theo "Tùy chọn B" trong guide.

*Tài liệu trên bao gồm:*
- *Yêu cầu hệ thống và hai mức cài đặt: Tối thiểu (chỉ dùng skills) và Đầy đủ (kèm ChatOps).*
- *Hướng dẫn kết nối Agent Plugins cho Antigravity / Gemini CLI.*
- *Tích hợp ChatOps qua n8n, ngrok và Mattermost Slash Command, kèm tự khởi động n8n cùng macOS.*
- *Bảng xử lý sự cố thường gặp.*
- [docs/guides/adoption-guide.md](docs/guides/adoption-guide.md) — Cẩm nang áp dụng theo quy trình Agile/Scrum

### Workflow cơ bản

**1. BA/PO: Phân tích yêu cầu**
```bash
/ba-spec JIRA-123
# → Import Jira issue → Phân tích gaps → Tổng hợp thành *-final.md
```

**2. QA: Thiết kế & chạy test**
```bash
/qa-full-pipeline JIRA-123 --auto
# → Test design → Automation → Execution → Report (all in one)
```

**3. DEV: Xây dựng tính năng**
```bash
/dev-tech-spec JIRA-123    # Viết tech-spec từ business-spec
/dev-plan JIRA-123         # Chia nhỏ thành tasks
/dev-build JIRA-123 auto   # Implement với TDD
```

**4. End-to-end delivery**
```bash
/e2e-delivery JIRA-123
# → BA spec → Tech spec → Code → Test → Review (full pipeline)
```

---

## 📚 Cấu trúc Dự án

Dự án được cấu trúc như một monorepo chứa nhiều plugin độc lập:

```
agent-skills/
├── config/                     → Tập trung file cấu hình hệ thống (projects.json, sm-config.yaml, ecosystem...)
├── plugins/                    → Chứa các plugin chuyên biệt (7 plugins)
│   ├── core/                   → Meta-skills, shared commands (/sync, /learn, /e2e-delivery)
│   ├── ba-po/                  → BA/PO persona & skills (9 skills)
│   ├── qa/                     → QA persona & skills (6 skills)
│   ├── dev/                    → DEV persona & skills (14 skills)
│   ├── code-reviewer/          → Code Reviewer + Security Audit + Webperf (4 skills)
│   ├── scrum-master/           → Scrum Master persona & skills (4 skills)
│   └── fintech-data/           → TimescaleDB KRX MDDS data reconciler
├── .agents/                    → Workspace customizations (rules, hooks)
├── n8n-workflows/               → Các workflow tự động (ChatOps, Cron)
├── scripts/                     → Automation scripts, validators, setup & testing
├── references/                  → Domain knowledge base & checklists dùng chung
├── workspace/                   → Output artifacts theo issueKey (spec, tech, test, trace)
├── docs/                        → Documentation & Architecture Decision Records (ADRs)
└── evals/                       → Bộ đánh giá chất lượng kỹ năng (Skill Evals)
```

Mỗi plugin (ví dụ `plugins/dev/`) đều tuân theo chuẩn Antigravity plugin:
```
plugins/dev/
├── plugin.json          → Metadata của plugin
├── agents/              → Định nghĩa persona (ví dụ: dev.md)
├── skills/              → Các kỹ năng (ví dụ: dev-api-design/)
└── .claude/commands/    → Hoặc commands/ cho các slash commands liên quan
```

---

## 🚀 Slash Commands Chính

*(Các commands này khả dụng khi bạn cài đặt plugin tương ứng)*

### BA/PO Commands (`plugins/ba-po`)

| Command                       | Chức năng                                          |
|-------------------------------|----------------------------------------------------|
| `/ba-spec {issueKey}`         | Import & phân tích Jira/Confluence → Business-Spec |
| `/ba-interview {issueKey}`    | Phỏng vấn clarify gaps với hypothesis              |
| `/ba-user-stories {issueKey}` | Viết User Stories chuẩn INVEST                     |
| `/ba-gap-analysis {issueKey}` | Phân tích AS-IS vs TO-BE, lập roadmap              |
| `/ba-prioritize {issueKey}`   | Ưu tiên backlog theo MoSCoW/WSJF                   |
| `/ba-stakeholder`             | Phỏng vấn multi-stakeholders                       |
| `/ba-process {issueKey}`      | Vẽ process diagram (BPMN/Swim Lane)                |
| `/ba-refine {issueKey}`       | Refine user stories, bổ sung acceptance criteria   |

### QA Commands (`plugins/qa`)

| Command                                 | Chức năng                                              |
|-----------------------------------------|--------------------------------------------------------|
| `/qa-full-pipeline {issueKey}`          | **Full QA workflow** (tự kích hoạt ba-spec nếu chưa có final.md → design → automation → execution) |
| `/qa-test-design {issueKey}`            | Thiết kế Checklist + Gherkin scenarios                 |
| `/qa-auto-design {issueKey}`            | Sinh automation test code (Playwright/Pytest)          |
| `/qa-run-test {issueKey}`               | Chạy tests + xuất báo cáo                              |
| `/qa-code2spec {path}`                  | Reverse engineer code → spec                           |
| `/qa-squash-push`                       | Push kết quả test lên Squash TM                        |

### Code Reviewer, Security & WebPerf Commands (`plugins/code-reviewer`)

| Command                  | Chức năng                                                 |
|--------------------------|-----------------------------------------------------------|
| `/cr-review`             | Code review đa chiều (correctness, security, performance) |
| `/cr-code-simplify`      | Phân tích và đơn giản hóa code phức tạp                   |
| `/security-audit [path]` | Audit bảo mật, phát hiện lỗ hổng OWASP Top 10             |
| `/webperf-audit [url]`   | Audit hiệu năng web, đánh giá Core Web Vitals             |

### Scrum Master Commands (`plugins/scrum-master`)

| Command                    | Chức năng                                              |
|----------------------------|--------------------------------------------------------|
| `/sm-sprint-planning`      | Lập kế hoạch Sprint, tính velocity, kéo backlog        |
| `/sm-daily-standup`        | Báo cáo tiến độ hằng ngày, phân tích tải công việc DEV |
| `/sm-impediment-triage`    | Phát hiện và xử lý ticket bị kẹt/treo                  |
| `/sm-sprint-retrospective` | Tổng kết Sprint, rút kinh nghiệm và đề xuất cải tiến   |

### E2E Pipeline (`plugins/core`)

| Command                    | Chức năng                                       |
|----------------------------|-------------------------------------------------|
| `/e2e-delivery {issueKey}` | **Full SDLC pipeline** (BA → DEV → QA → Review) |

### Meta / Session / Sync Commands (`plugins/core`)

| Command            | Chức năng                                                       |
|--------------------|-----------------------------------------------------------------|
| `/sync`            | Đồng bộ, fetch và pull mã nguồn mới nhất của dự án về máy       |
| `/learn`           | Tự động đúc kết bài học từ phiên làm việc và lưu thành Rule mới |
| `/save-checkpoint` | Nén toàn bộ ngữ cảnh hiện tại thành file trạng thái nhỏ gọn     |
| `/load-checkpoint` | Khôi phục trạng thái từ file nén và tự động tiếp tục công việc  |
| `/flowchart`       | Render sơ đồ Editorial HTML sang ảnh                            |

---

## 🎓 Bắt đầu

### 1. Đọc Documentation

- **[Installation Guide](docs/guides/installation-guide.md)** — Hướng dẫn cài đặt chi tiết
- **[Skill Anatomy](docs/guides/skill-anatomy.md)** — Cấu trúc một skill
- **[Agents Guide](docs/guides/agents.md)** — Hiểu rõ 7 personas
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Hướng dẫn tạo skill và plugin mới

### 2. Workflow Examples

**Scenario 1: New Feature Development**
```bash
# BA: Analyze requirements
/ba-spec PROJ-456
/ba-interview PROJ-456  # If gaps found

# DEV: Design & build
/dev-tech-spec PROJ-456
/dev-plan PROJ-456
/dev-build PROJ-456 auto

# QA: Test
/qa-full-pipeline PROJ-456 --auto

# Review
/cr-review
```

**Scenario 2: Bug Fix với Full Traceability**
```bash
/e2e-delivery BUG-789
# → BA analyzes → DEV fixes → QA verifies → Traceability report
```

**Scenario 3: Legacy Code Documentation**
```bash
/qa-code2spec src/features/order/
# → Reverse engineer thành spec chuẩn
```

---

## 🔧 Tùy chỉnh

### Thêm Skill mới

1. Xác định plugin phù hợp (hoặc tạo plugin mới)
2. Tạo thư mục: `plugins/<plugin-name>/skills/your-skill-name/`
3. Viết `SKILL.md` với YAML frontmatter:
```markdown
---
name: your-skill-name
description: Short description (third-person), followed by trigger condition ("Use when...")
---

# Your Skill Name

## Tổng quan
...

## Quy trình
...
```

4. Tạo command config file `plugins/<plugin-name>/commands/your-command.toml` để tự động sinh slash command.

**Xem chi tiết:** [Skill Anatomy](docs/guides/skill-anatomy.md) và [CONTRIBUTING.md](CONTRIBUTING.md)

### Tùy chỉnh Agents

Sửa file `plugins/<plugin-name>/agents/{persona}.md` để thay đổi:
- Tools available
- Ranh giới trách nhiệm
- Skills được sử dụng

---

## 📖 Documentation

| Doc                                               | Nội dung                              |
|---------------------------------------------------|---------------------------------------|
| [CLAUDE.md](CLAUDE.md)                            | Project instructions cho Claude agent |
| [Installation Guide](docs/guides/installation-guide.md) | Hướng dẫn cài đặt & sử dụng           |
| [Skill Anatomy](docs/guides/skill-anatomy.md)     | Cấu trúc một skill, best practices    |
| [Agents Guide](docs/guides/agents.md)             | Chi tiết 7 personas và ranh giới      |
| [CONTRIBUTING.md](CONTRIBUTING.md)                | Hướng dẫn đóng góp                    |

### Architecture & Workflows

| Doc                                                           | Nội dung                       |
|---------------------------------------------------------------|--------------------------------|
| [BA Workflow Detail](docs/architecture/ba-workflow-detail.md) | Chi tiết luồng làm việc của BA |
| [Test Ownership](docs/architecture/test-ownership.md)         | Ranh giới trách nhiệm kiểm thử |

---

## 🎯 Core Principles

### 1. Clear Separation of Concerns
- BA/PO: **WHAT** (requirements) và **WHY** (business value)
- QA: **HOW TO VERIFY** (test strategy) và **QUALITY ASSURANCE**
- DEV: **HOW TO BUILD** (technical implementation)

### 2. Traceability-First
Mọi artifacts đều có traceability:
```
Business Rule → Tech Spec → Code → Unit Test → Integration Test → E2E Test → Report
```

### 3. Autonomous Execution & Confidence Assessment
Mặc định tự chạy (Autonomous by default). Không dùng Confidence Level làm cổng chặn luồng. Chỉ dừng hỏi user trong 5 trường hợp danh sách đóng quy định tại [.agents/rules/autonomy-contract.md](.agents/rules/autonomy-contract.md). Confidence level dùng để đánh giá độ hoàn thiện và độ tin cậy của artifact tại [.agents/rules/confidence-level.md](.agents/rules/confidence-level.md).

### 4. Git Workflow Safety
- Branch-based development (no direct commits to main)
- Commit SAU KHI user approve
- Clear commit messages với Co-Authored-By

Xem: [.agents/rules/git-workflow.md](.agents/rules/git-workflow.md)

---

## 🤝 Contributing

Trước khi thêm skill mới hoặc chỉnh sửa lớn:

1. **Check existing skills** — Tránh duplicate
2. **Check open PRs** — Có thể đã có người làm rồi
3. **Follow skill-anatomy.md** — Consistent format
4. **Prefer extending over creating** — Mở rộng skill hiện có thay vì tạo mới

Xem chi tiết: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📊 Stats

- **7 Plugins** (`ba-po`, `code-reviewer`, `core`, `dev`, `fintech-data`, `qa`, `scrum-master`)
- **8 vai trò** (BA/PO, QA, DEV, Scrum Master, Code Reviewer, Security Auditor, Web Performance Auditor, Core/Meta)
- **44 Skills** (9 BA + 6 QA + 14 DEV + 4 SM + 2 CR + 1 Security + 1 WebPerf + 7 Meta)
- **34 Slash Commands**
- **40+ Reference Documents**
- **Production-Ready** — Dùng trong real projects (Finance/Trading domain)

---

## 📝 License

MIT License — Xem [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

Forked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) và tùy chỉnh cho:
- Domain: Tài chính - Chứng khoán - Ngân hàng
- Language: Tiếng Việt cho tất cả artifacts
- Workflow: BA/PO → QA → DEV pipeline với full traceability

---

**Ready?** Bắt đầu với: `/ba-spec {issueKey}` hoặc `/e2e-delivery {issueKey}`
