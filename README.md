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

### 3. DEV — Software Developer (`plugins/dev`)
Kỹ sư phần mềm, thiết kế kiến trúc, viết code, unit testing, và review.

**14 skills:** Spec-driven development, TDD, API design, frontend engineering, debugging, performance, security, refactoring.

### 4. Scrum Master (`plugins/scrum-master`)
Kỹ sư Quản lý Quy trình & Điều phối (Scrum Master). Quản lý Sprint, theo dõi Kanban board, phát hiện rủi ro (blockers), và điều hành các nghi thức Agile.

**4 skills:** Sprint planning, daily standup, impediment triage, sprint retrospective.

### 5. Code Reviewer (`plugins/code-reviewer`)
Kỹ sư chuyên trách đánh giá chất lượng mã nguồn.

**2 skills:** Code simplification, code and quality review.

### 6. Security Auditor (`plugins/security-auditor`)
Kỹ sư chuyên trách phát hiện lỗ hổng và audit bảo mật mã nguồn theo chuẩn OWASP Top 10.

**1 skill:** Security code audit

### 7. Web Performance Auditor (`plugins/web-performance-auditor`)
Kỹ sư chuyên trách đánh giá hiệu năng web, Core Web Vitals (LCP, FID, CLS).

**1 skill:** Core Web Vitals audit

*(Ngoài ra còn có `plugins/core` chứa các kỹ năng meta và lệnh dùng chung).*

---

## ⚡ Quick Start

### Cài đặt Toàn Cục cho Gemini CLI & Antigravity (Khuyên dùng)

Để tất cả các dự án trên máy tự động nhận diện và gọi được toàn bộ 44 skills và 7 personas của `agent-skills`, bạn chỉ cần:

```bash
# 1. Clone repository
git clone https://gitlab.example.com/org/agent-skills.git
cd agent-skills
npm install

# 2. Thiết lập liên kết tự động tới ~/.gemini/config/plugins/
npm run setup:plugins
```

> 💡 **Lưu ý:** Lệnh trên tạo các symlinks an toàn từ 8 sub-plugins (`agent-skills-ba-po`, `agent-skills-qa`, `agent-skills-dev`, v.v.) vào thư mục cấu hình toàn cục `~/.gemini/config/plugins/`. Khi bạn `git pull` code mới, các dự án khác sẽ tự động nhận diện cập nhật ngay lập tức. Để gỡ bỏ, chỉ cần chạy `npm run unlink:plugins`.

### Cài đặt với Claude Code

```bash
# Mở thư mục gốc trong Claude Code để tải toàn bộ plugins
claude
# Hoặc gõ `/` trong chat để xem danh sách 35 slash commands
```

### Điều khiển Từ Xa qua Discord (Discord Bot Bridge)

Dự án tích hợp sẵn module điều khiển Agent từ xa qua Discord (hỗ trợ mobile/desktop, gợi ý lệnh autocomplete và chat đa lượt trong Thread):

```bash
# 1. Cài đặt thư viện Discord
npm run setup:discord

# 2. Tạo file cấu hình và điền Token
cp .env.example .env

# 3. Khởi chạy Bot
npm run bridge:discord
```

> 📖 Hướng dẫn chi tiết tạo Bot, cấp quyền Intent và sử dụng Slash Command xem tại: **[tools/discord-bridge/README.md](tools/discord-bridge/README.md)**.

**Xem tài liệu chi tiết:** 
- [docs/guides/antigravity-setup.md](docs/guides/antigravity-setup.md) — Antigravity CLI
- [docs/guides/gemini-cli-setup.md](docs/guides/gemini-cli-setup.md) — Gemini CLI
- [docs/guides/adoption-guide.md](docs/guides/adoption-guide.md) — Cẩm nang áp dụng theo quy trình Agile/Scrum
- [tools/discord-bridge/README.md](tools/discord-bridge/README.md) — Hướng dẫn Discord Bot Bridge

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
/tech-spec JIRA-123    # Viết tech-spec từ business-spec
/plan JIRA-123         # Chia nhỏ thành tasks
/build JIRA-123 auto   # Implement với TDD
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
├── plugins/                    → Chứa các plugin chuyên biệt
│   ├── core/                   → Meta-skills, shared commands
│   ├── ba-po/                  → BA/PO persona & skills
│   ├── qa/                     → QA persona & skills
│   ├── dev/                    → DEV persona & skills
│   ├── code-reviewer/          → Code Reviewer persona & skills
│   ├── scrum-master/           → Scrum Master persona & skills
│   ├── security-auditor/       → Security Auditor persona & skills
│   └── web-performance-auditor/ → Web Performance Auditor persona & skills
├── references/                  → Checklists & templates dùng chung
├── docs/                        → Documentation
│   ├── guides/                  → Hướng dẫn (setup, skills, agents)
│   └── architecture/            → Thiết kế kiến trúc (test-ownership, workflow)
└── CLAUDE.md                    → Hướng dẫn cho Claude agent
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
| `/qa-full-pipeline {issueKey} [--auto]` | **Full QA workflow** (design → automation → execution) |
| `/qa-test-design {issueKey}`            | Thiết kế Checklist + Gherkin scenarios                 |
| `/qa-auto-design {issueKey}`            | Sinh automation test code (Playwright/Pytest)          |
| `/qa-run-test {issueKey}`               | Chạy tests + xuất báo cáo                              |
| `/qa-code2spec {path}`                  | Reverse engineer code → spec                           |
| `/qa-squash-push`                       | Push kết quả test lên Squash TM                        |
| `/qa-pipeline`                          | Alias để chạy pipeline cơ bản                          |

### DEV Commands (`plugins/dev`)

| Command                        | Chức năng                                    |
|--------------------------------|----------------------------------------------|
| `/dev-tech-spec {issueKey}`    | Viết tech-spec từ business-spec              |
| `/dev-plan {issueKey}`         | Chia tasks + dependencies                    |
| `/dev-build {issueKey} [auto]` | TDD implementation (Red → Green → Refactor)  |
| `/dev-audit`                   | Kiểm toán, quét lỗi, và tự sửa lỗi toàn diện |
| `/dev-unit-test`               | Viết unit tests trước khi code               |

### Code Reviewer Commands (`plugins/code-reviewer`)

| Command             | Chức năng                                                 |
|---------------------|-----------------------------------------------------------|
| `/cr-review`        | Code review đa chiều (correctness, security, performance) |
| `/cr-code-simplify` | Phân tích và đơn giản hóa code phức tạp                   |

### Scrum Master Commands (`plugins/scrum-master`)

| Command                    | Chức năng                                              |
|----------------------------|--------------------------------------------------------|
| `/sm-sprint-planning`      | Lập kế hoạch Sprint, tính velocity, kéo backlog        |
| `/sm-daily-standup`        | Báo cáo tiến độ hằng ngày, phân tích tải công việc DEV |
| `/sm-impediment-triage`    | Phát hiện và xử lý ticket bị kẹt/treo                  |
| `/sm-sprint-retrospective` | Tổng kết Sprint, rút kinh nghiệm và đề xuất cải tiến   |

### Security & Performance Commands

| Command                  | Plugin                    | Chức năng                                     |
|--------------------------|---------------------------|-----------------------------------------------|
| `/security-audit [path]` | `security-auditor`        | Audit bảo mật, phát hiện lỗ hổng OWASP Top 10 |
| `/webperf-audit [url]`   | `web-performance-auditor` | Audit hiệu năng web, đánh giá Core Web Vitals |

### E2E Pipeline (`plugins/core`)

| Command                    | Chức năng                                       |
|----------------------------|-------------------------------------------------|
| `/e2e-delivery {issueKey}` | **Full SDLC pipeline** (BA → DEV → QA → Review) |

### Meta / Session Commands (`plugins/core`)

| Command                       | Chức năng                                                       |
|-------------------------------|-----------------------------------------------------------------|
| `/learn` hoặc `/save-session` | Tự động đúc kết bài học từ phiên làm việc và lưu thành Rule mới |
| `/save-checkpoint`            | Nén toàn bộ ngữ cảnh hiện tại thành file trạng thái nhỏ gọn     |
| `/load-checkpoint`            | Khôi phục trạng thái từ file nén và tự động tiếp tục công việc  |
| `/flowchart`                  | Render nội dung Mermaid sang ảnh                                |
| `/webperf`                    | Audit web performance (Core Web Vitals)                         |

---

## 🎓 Bắt đầu

### 1. Đọc Documentation

- **[Getting Started](docs/guides/getting-started.md)** — Hướng dẫn cài đặt chi tiết
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
/tech-spec PROJ-456
/plan PROJ-456
/build PROJ-456 auto

# QA: Test
/qa-full-pipeline PROJ-456 --auto

# Review
/review
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
| [Getting Started](docs/guides/getting-started.md) | Hướng dẫn cài đặt & sử dụng           |
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

### 3. Confidence-Based Gating
Skills report confidence level (90%+ = auto-approve, 70-89% = ask, <70% = stop).  
Xem: [.claude/rules/confidence-level.md](.claude/rules/confidence-level.md)

### 4. Git Workflow Safety
- Branch-based development (no direct commits to main)
- Commit SAU KHI user approve
- Clear commit messages với Co-Authored-By

Xem: [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md)

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

- **8 Plugins** (core, ba-po, qa, dev, scrum-master, code-reviewer, security-auditor, web-performance-auditor)
- **7 Personas** (BA/PO, QA, DEV, Scrum Master, Code Reviewer, Security Auditor, Web Performance Auditor)
- **44 Skills** (9 BA + 6 QA + 14 DEV + 4 SM + 2 CR + 1 Security + 1 WebPerf + 7 Meta)
- **35 Slash Commands**
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
