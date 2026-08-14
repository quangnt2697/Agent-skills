# agent-skills

Bộ sưu tập kỹ năng (skills) cấp sản xuất cho AI coding agents, tập trung vào quy trình phát triển phần mềm chuyên nghiệp từ phân tích yêu cầu, thiết kế kỹ thuật, đến kiểm thử và triển khai.

---

## 🎯 Tổng quan

**agent-skills** cung cấp 3 personas chuyên biệt với bộ kỹ năng đầy đủ để tự động hóa toàn bộ vòng đời phát triển phần mềm (SDLC):

### 1. BA/PO — Business Analyst / Product Owner
Chuyên gia phân tích nghiệp vụ, làm rõ yêu cầu, viết đặc tả, và ưu tiên backlog.

**8 skills:** Import Jira/Confluence, phỏng vấng stakeholders, viết User Stories, phân tích gaps, ưu tiên backlog, mô hình hóa quy trình.

### 2. QA/SDET — Quality Assurance / Test Engineer
Chuyên gia kiểm thử, thiết kế test cases, automation testing, và đảm bảo chất lượng.

**5 skills:** Test design (Checklist + Gherkin), automation code generation, test execution, reverse engineering, Squash TM integration.

### 3. DEV — Software Developer
Kỹ sư phần mềm, thiết kế kiến trúc, viết code, unit testing, và review.

**15+ skills:** Spec-driven development, TDD, API design, frontend engineering, debugging, performance, security, refactoring.

---

## ⚡ Quick Start

### Cài đặt với Claude Code

```bash
# Clone repository
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills

# Skills sẽ tự động load khi Claude Code chạy trong thư mục này
# Kiểm tra skills đã load:
# Gõ `/` trong Claude Code để xem danh sách slash commands
```

### Cài đặt với Gemini CLI

```bash
# Clone repository
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills

# Install skills vào Gemini
gemini skills install ./skills --path skills

# Hoặc cài đặt trực tiếp từ repo
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

### Cài đặt với Antigravity CLI

```bash
# Install từ remote repository
agy plugin install https://github.com/addyosmani/agent-skills.git

# Hoặc từ local clone
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
agy plugin install .
```

**Xem chi tiết:** 
- [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md) — Gemini CLI
- [docs/antigravity-setup.md](docs/antigravity-setup.md) — Antigravity CLI

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

```
agent-skills/
├── agents/              → Định nghĩa 3 personas (BA/PO, QA, DEV)
├── skills/              → 28+ kỹ năng chuyên môn (SKILL.md cho mỗi thư mục)
│   ├── ba-*/            → 8 BA/PO skills
│   ├── qa-*/            → 5 QA/SDET skills  
│   ├── dev-*/           → 15+ DEV skills
│   └── meta-*/          → Meta-skills (planning, cross-validation)
├── .claude/
│   ├── commands/        → Slash commands (*.md)
│   └── rules/           → Quy tắc dự án (git workflow, confidence level)
├── references/          → Checklists & templates dùng chung
├── docs/                → Documentation
│   ├── getting-started.md
│   ├── skill-anatomy.md
│   └── agents.md
└── CLAUDE.md            → Hướng dẫn cho Claude agent
```

---

## 🚀 Slash Commands Chính

### BA/PO Commands

| Command | Chức năng |
|---------|-----------|
| `/ba-spec {issueKey}` | Import & phân tích Jira/Confluence → Business-Spec |
| `/ba-interview {issueKey}` | Phỏng vấn clarify gaps với hypothesis |
| `/ba-user-stories {issueKey}` | Viết User Stories chuẩn INVEST |
| `/ba-gap-analysis {issueKey}` | Phân tích AS-IS vs TO-BE, lập roadmap |
| `/ba-prioritize {issueKey}` | Ưu tiên backlog theo MoSCoW/WSJF |
| `/ba-stakeholder` | Phỏng vấn multi-stakeholders |
| `/ba-process {issueKey}` | Vẽ process diagram (BPMN/Swim Lane) |

### QA Commands

| Command | Chức năng |
|---------|-----------|
| `/qa-full-pipeline {issueKey} [--auto]` | **Full QA workflow** (design → automation → execution) |
| `/qa-test-design {issueKey}` | Thiết kế Checklist + Gherkin scenarios |
| `/qa-auto-design {issueKey}` | Sinh automation test code (Playwright/Pytest) |
| `/qa-run-test {issueKey}` | Chạy tests + xuất báo cáo |
| `/qa-code2spec {path}` | Reverse engineer code → spec |

### DEV Commands

| Command | Chức năng |
|---------|-----------|
| `/tech-spec {issueKey}` | Viết tech-spec từ business-spec |
| `/plan {issueKey}` | Chia tasks + dependencies |
| `/build {issueKey} [auto]` | TDD implementation (Red → Green → Refactor) |
| `/review` | Code review đa chiều (correctness, security, performance) |
| `/unit-test` | Viết unit tests trước khi code |

### E2E Pipeline

| Command | Chức năng |
|---------|-----------|
| `/e2e-delivery {issueKey}` | **Full SDLC pipeline** (BA → DEV → QA → Review) |

---

## 🎓 Bắt đầu

### 1. Đọc Documentation

- **[Getting Started](docs/getting-started.md)** — Hướng dẫn cài đặt chi tiết
- **[Skill Anatomy](docs/skill-anatomy.md)** — Cấu trúc một skill
- **[Agents Guide](docs/agents.md)** — Hiểu rõ 3 personas

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

1. Tạo thư mục: `skills/your-skill-name/`
2. Viết `SKILL.md` với YAML frontmatter:
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

3. (Optional) Tạo slash command: `.claude/commands/your-command.md`

**Xem:** [Skill Anatomy](docs/skill-anatomy.md) và [CONTRIBUTING.md](CONTRIBUTING.md)

### Tùy chỉnh Agents

Sửa file `agents/{persona}.md` để thay đổi:
- Tools available
- Ranh giới trách nhiệm
- Skills được sử dụng

---

## 📖 Documentation

| Doc | Nội dung |
|-----|----------|
| [CLAUDE.md](CLAUDE.md) | Project instructions cho Claude agent |
| [Getting Started](docs/getting-started.md) | Hướng dẫn cài đặt & sử dụng |
| [Skill Anatomy](docs/skill-anatomy.md) | Cấu trúc một skill, best practices |
| [Agents Guide](docs/agents.md) | Chi tiết 3 personas và ranh giới |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Hướng dẫn đóng góp |

### Analysis & Review Docs

| Doc | Nội dung |
|-----|----------|
| [BA/PO Separation Proposal](docs/ba-po-separation-proposal.md) | Tại sao tách BA/PO khỏi QA |
| [BA AC vs QA Checklist](docs/ba-ac-vs-qa-checklist-comparison.md) | So sánh AC vs Test Checklist |
| [QA Skills Review](docs/qa-skills-comprehensive-review.md) | Review toàn diện 5 QA skills |

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

- **3 Personas** (BA/PO, QA, DEV)
- **28+ Skills** (8 BA + 5 QA + 15+ DEV)
- **25+ Slash Commands**
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
