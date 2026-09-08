# docs/

Thư mục này chứa documentation cho agent-skills repository.

---

## 📚 Core Documentation (Guides)

### [guides/getting-started.md](guides/getting-started.md)
Hướng dẫn cài đặt và bắt đầu sử dụng agent-skills. Bao gồm:
- Cài đặt với Claude Code
- Workflow cơ bản cho từng persona (BA/PO, QA, DEV)
- Examples với real Jira issues
- Troubleshooting common issues

### [guides/adoption-guide.md](guides/adoption-guide.md)
Cẩm nang áp dụng Agent Skills trong doanh nghiệp:
- Phối hợp liên vai trò từ BA -> QA -> DEV -> Review
- Quy ước lưu trữ workspace chuẩn
- Cơ chế Continuous Learning & Checkpoints

### [guides/skill-anatomy.md](guides/skill-anatomy.md)
Cấu trúc chi tiết của một skill. Đọc file này trước khi tạo skill mới. Bao gồm:
- YAML frontmatter requirements
- Sections bắt buộc (Tổng quan, Quy trình, Xác minh)
- Best practices
- Template & examples

### [guides/agents.md](guides/agents.md)
Chi tiết về các personas và ranh giới trách nhiệm:
- BA/PO: Requirements analysis, User Stories, Prioritization
- QA/SDET: Test design, Automation, Quality assurance
- DEV: Tech spec, Implementation, Unit testing
- Code Reviewer & Auditors: Đánh giá chất lượng đa chiều

---

## 📖 Tài liệu kiến trúc (Architecture & Ranh giới)

### [architecture/test-ownership.md](architecture/test-ownership.md)
**Ai viết loại test nào**

Chi tiết từng loại test kèm ví dụ code: unit (DEV), integration (DEV + QA),
E2E (QA), performance, security, và hai vòng code review.

### [architecture/ba-workflow-detail.md](architecture/ba-workflow-detail.md)
**Ranh giới BA/PO — chi tiết**

Trách nhiệm đầy đủ của BA/PO, handoff sang QA/DEV, và so sánh `ba-spec` với `ba-refine`.

### [architecture/ba-ac-vs-qa-gherkin-overlap-analysis.md](architecture/ba-ac-vs-qa-gherkin-overlap-analysis.md)
**BA có nên viết Gherkin không?**

Phân tích ai nên viết BDD Gherkin scenarios:
- BA viết AC dạng Checklist (rule-based)
- QA transform AC thành Gherkin (executable)
- Industry best practice: ATDD workflow
- Ranh giới: BA = WHAT must be true, QA = HOW to test

### [architecture/gitlab-mcp-integration-roadmap.md](architecture/gitlab-mcp-integration-roadmap.md)
**Lộ trình tích hợp GitLab MCP vào quy trình**

Chi tiết tích hợp Phase A (Code Reviewer đọc MR thật, pipeline, threads) và Phase B (Traceability).

### [architecture/mcp-overview.md](architecture/mcp-overview.md)
**Kiến trúc các MCP Servers (.agents/)**

Tổng hợp thiết kế, vai trò, tiêu chuẩn bảo mật (SQL Sanitizer, Auto-limit, Session/Token) cho 6 MCP servers trong `.agents/`.

---

## 🔧 Setup Guides (Multi-Platform)

agent-skills hỗ trợ nhiều AI coding platforms:

### [guides/gemini-cli-setup.md](guides/gemini-cli-setup.md)
**Hướng dẫn cài đặt agent-skills với Gemini CLI**

Gemini CLI có skills system tương tự Claude Code. File này hướng dẫn cài đặt từ repo hoặc local clone.

### [guides/antigravity-setup.md](guides/antigravity-setup.md)
**Hướng dẫn cài đặt agent-skills với Antigravity CLI (agy)**

Antigravity CLI có native plugin system. File này hướng dẫn cài đặt dưới dạng plugin và cách sử dụng custom commands.

**Platforms tested:**
- ✅ **Claude Code** — Primary platform, fully tested
- ✅ **Gemini CLI** — Full compatibility
- ✅ **Antigravity CLI** — Full compatibility

---

## 📖 Đọc tiếp

- [../CLAUDE.md](../CLAUDE.md) — Project instructions cho Claude agent
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — Hướng dẫn đóng góp
- [../README.md](../README.md) — Repository overview

---

**Tip:** Bắt đầu với [guides/getting-started.md](guides/getting-started.md) nếu bạn mới sử dụng agent-skills.
