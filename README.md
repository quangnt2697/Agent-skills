# agent-skills

Bộ sưu tập kỹ năng (skills) cấp sản xuất cho AI coding agents, chuyên trách Phân tích Yêu cầu (BA/PO), Tự động hóa Kiểm thử (QA/SDET), Điều phối Agile (Scrum Master) và Đánh giá Chất lượng Mã nguồn (Code Reviewer & Security).

👉 **[Bảng Tra cứu Master (CATALOG.md)](CATALOG.md)** | **[Lộ trình Tiếp cận (LEARNING-ROADMAP.md)](LEARNING-ROADMAP.md)** | **[Cẩm nang Cài đặt](docs/guides/installation-guide.md)**

---

## 🎯 Tổng quan

**agent-skills** cung cấp hệ thống kỹ năng chuyên biệt để tự động hóa quy trình phân tích và kiểm thử phần mềm chuyên nghiệp. Hệ thống được module hóa thành **6 plugins**, cho phép bạn chỉ cài đặt những gì mình cần:

### 1. BA/PO — Business Analyst / Product Owner (`plugins/ba-po`)
Chuyên gia phân tích nghiệp vụ, làm rõ yêu cầu, viết đặc tả, và ưu tiên backlog.

**10 skills:** Import Jira/Confluence, phỏng vấn stakeholders, viết User Stories, phân tích gaps, ưu tiên backlog, tinh chỉnh backlog, mô hình hóa quy trình, thiết kế sơ đồ & mockup giao diện Prod-Twin, v.v.

### 2. QA/SDET — Quality Assurance / Test Engineer (`plugins/qa`)
Chuyên gia kiểm thử, thiết kế test cases, automation testing, và đảm bảo chất lượng.

**6 skills:** Test design (Checklist + Gherkin), automation code generation, test execution, reverse engineering, Squash TM integration.

### 3. Scrum Master (`plugins/scrum-master`)
Kỹ sư Quản lý Quy trình & Điều phối (Scrum Master). Quản lý Sprint, theo dõi Kanban board, phát hiện rủi ro (blockers), và điều hành các nghi thức Agile.

**4 skills:** Sprint planning, daily standup, impediment triage, sprint retrospective.

### 4. Code Reviewer & Quality Engineer (`plugins/code-reviewer`)
Kỹ sư chuyên trách đánh giá chất lượng mã nguồn, bảo mật và hiệu năng web.

**4 skills:** Code simplification (`cr-code-simplification`), code and quality review (`cr-review-code-and-quality`), security code audit (`security-code-audit`), web performance Core Web Vitals (`webperf-core-vitals`).

### 5. Fintech Data Engineer (`plugins/fintech-data`)
Kỹ sư dữ liệu thị trường và kiểm toán dữ liệu chứng khoán.

**1 skill:** TimescaleDB KRX MDDS data reconciler (`db-timescale-reconciler`).

*(Ngoài ra còn có `plugins/core` chứa các kỹ năng meta, đồng bộ repo và lệnh dùng chung).*

---

## ⚡ Hướng Dẫn Cài Đặt (Installation Guide)

Toàn bộ quy trình thiết lập từ A–Z (dành cho cả người mới bắt đầu chưa cài môi trường) được trình bày chi tiết tại:
👉 **[Cẩm Nang Cài Đặt Chi Tiết Cho Người Mới (Installation Guide)](docs/guides/installation-guide.md)**

### Cách 1: Cài đặt tự động 1 lệnh trên macOS (Khuyên dùng)
Script sẽ tự động kiểm tra và cài đặt **Homebrew, Node.js (>=20), Colima, Docker CLI, Docker Compose**, tạo file cấu hình `.env`, khởi chạy container `n8n` (nạp sẵn 18 workflows) và đồng bộ toàn bộ kỹ năng vào AI Agent:
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm run setup:mac     # Tự động cài Colima + Docker + n8n + đồng bộ Agent Plugins
npm test              # Kiểm tra toàn bộ hệ thống
```

### Cách 2: Cài đặt từng bước tường minh (Step-by-Step)
Nếu bạn muốn tự cài đặt và kiểm soát từng thành phần:
```bash
# 1. Cài đặt Node.js và bộ 3 Colima + Docker CLI + Docker Compose qua Homebrew (không cần quyền sudo)
brew install node colima docker docker-compose

# 2. Tải dự án & cài đặt thư viện
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm install

# 3. Tạo các file cấu hình từ file mẫu (sau đó mở file .env để điền Jira/Slack token)
cp .env.example .env
cp config/projects.json.example config/projects.json
cp config/sm-config.example.yaml config/sm-config.yaml

# 4. Bật máy ảo Colima, nạp chứng chỉ mạng công ty & khởi chạy n8n Container (18 workflows)
npm run n8n:setup

# 5. Đồng bộ kỹ năng vào Antigravity IDE / Gemini CLI / Claude Code & kích hoạt Git Hooks
npm run setup:plugins
npm run setup:claude
npm run setup:hooks
```

*Xem thêm:*
- **[docs/guides/installation-guide.md](docs/guides/installation-guide.md)** — Hướng dẫn chi tiết cách lấy Jira/Slack token, cấu hình `.env`, tự khởi động cùng macOS và xử lý sự cố.
- **[docs/guides/adoption-guide.md](docs/guides/adoption-guide.md)** — Cẩm nang áp dụng theo quy trình Agile/Scrum.

### Workflow cơ bản

**1. BA/PO: Phân tích yêu cầu**
```bash
/ba-spec JIRA-123
# → Import Jira issue → Phân tích gaps → Tổng hợp thành *-final.md
```

**2. QA: Thiết kế & chạy kiểm thử tự động toàn diện**
```bash
/qa-full-pipeline JIRA-123 --auto
# → Phân tích Business-Spec → Sinh Checklist & BDD → Sinh mã Automation Test → Chạy Test & Báo cáo Log 100%
```

**3. Code Review & Bảo mật: Kiểm soát chất lượng mã nguồn**
```bash
/cr-review                  # Code review đa chiều (kiến trúc, logic, hiệu năng, an ninh)
/security-audit             # Quét lỗ hổng bảo mật mã nguồn theo chuẩn OWASP Top 10
```

**4. Scrum Master: Vận hành Sprint & Điều phối công việc**
```bash
/sm-daily-standup           # Báo cáo standup hằng ngày & cân bằng tải
/sm-impediment-triage       # Phát hiện & gỡ rối các ticket bị kẹt/treo
```

---

## 📚 Cấu trúc Dự án

Dự án được cấu trúc như một monorepo chứa nhiều plugin độc lập:

```
agent-skills/
├── config/                     → Tập trung file cấu hình hệ thống (projects.json, sm-config.yaml)
├── plugins/                    → Chứa các plugin chuyên biệt (6 plugins)
│   ├── core/                   → Meta-skills, shared commands (/sync, /learn, /e2e-delivery)
│   ├── ba-po/                  → BA/PO persona & skills (10 skills)
│   ├── qa/                     → QA persona & skills (6 skills)
│   ├── code-reviewer/          → Code Reviewer + Security Audit + Webperf (4 skills)
│   ├── scrum-master/           → Scrum Master persona & skills (4 skills)
│   └── fintech-data/           → TimescaleDB KRX MDDS data reconciler
├── .agents/                    → Workspace customizations (rules, hooks)
├── n8n-workflows/               → Các workflow tự động (Webhook Fast-Path, Cron)
├── scripts/                     → Automation scripts, validators, setup & testing
├── references/                  → Domain knowledge base & checklists dùng chung
├── workspace/                   → Output artifacts theo issueKey (spec, tech, test, trace)
├── docs/                        → Documentation & Architecture Decision Records (ADRs)
└── evals/                       → Bộ đánh giá chất lượng kỹ năng (Skill Evals)
```

Mỗi plugin (ví dụ `plugins/qa/`) đều tuân theo chuẩn Antigravity plugin:
```
plugins/qa/
├── plugin.json          → Metadata của plugin
├── agents/              → Định nghĩa persona (ví dụ: qa.md)
├── skills/              → Các kỹ năng (ví dụ: qa-auto-design/)
└── commands/            → Hoặc .claude/commands/ cho các slash commands liên quan
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
| `/ba-refine {issueKey}`       | Mài giũa ý tưởng, dựng mockup Prod-Twin, bổ sung Gherkin AC & cập nhật Jira ADF |

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

- **[Installation Guide](docs/guides/installation-guide.md)** — Hướng dẫn cài đặt trọn gói monorepo (kèm Colima + Docker Compose n8n Fast-Path)
- **[Cài đặt từng Plugin độc lập](docs/guides/installation-guide.md#giai-đoạn-4-hướng-dẫn-cài-đặt-từng-plugin-độc-lập-cho-dự-án-microservice-standalone-plugin-installation)** — Xuất và nạp riêng lẻ plugin vào các dự án microservice bên ngoài
- **[Skill Anatomy](docs/guides/skill-anatomy.md)** — Cấu trúc một skill
- **[Agents Guide](docs/guides/agents.md)** — Hiểu rõ 6 personas
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Hướng dẫn tạo skill và plugin mới

### 2. Workflow Examples

**Scenario 1: Delivery từ Phân tích Nghiệp vụ đến Kiểm thử & Review**
```bash
# BA: Analyze requirements
/ba-spec PROJ-456
/ba-interview PROJ-456  # If gaps found

# QA: Test design & Automation
/qa-test-design PROJ-456
/qa-auto-design PROJ-456
/qa-run-test PROJ-456

# Review & Security Audit
/cr-review
/security-audit
```

**Scenario 2: QA Kiểm thử Trọn gói Tự động Một Lệnh**
```bash
/qa-full-pipeline PROJ-456 --auto
# → Import spec → Sinh Checklist & BDD → Viết test automation → Chạy test & xuất log 100%
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
Mặc định dừng sau mỗi artifact (Single-Task Hard Stop). Chuỗi tự động chuyển phase chỉ áp dụng trong Orchestrator (`/qa-full-pipeline`, `/e2e-qa-delivery`) hoặc khi có cờ `--auto`. Trong Orchestrator, chỉ dừng hỏi user trong 5 trường hợp danh sách đóng quy định tại [.agents/rules/autonomy-contract.md](.agents/rules/autonomy-contract.md). Confidence level dùng để đánh giá độ hoàn thiện và độ tin cậy của artifact tại [.agents/rules/confidence-level.md](.agents/rules/confidence-level.md).

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

- **6 Plugins** (`ba-po`, `code-reviewer`, `core`, `fintech-data`, `qa`, `scrum-master`)
- **6 vai trò** (BA/PO, QA/SDET, Scrum Master, Code Reviewer, Security Auditor, Web Performance Auditor)
- **31 Skills** (10 BA + 6 QA + 4 SM + 4 CR/Sec/WebPerf + 1 Fintech Data + 6 Core Meta)
- **29 Slash Commands**
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
