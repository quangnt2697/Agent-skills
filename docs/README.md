# docs/

Thư mục này chứa documentation cho agent-skills repository.

---

## 📚 Core Documentation

### [getting-started.md](getting-started.md)
Hướng dẫn cài đặt và bắt đầu sử dụng agent-skills. Bao gồm:
- Cài đặt với Claude Code
- Workflow cơ bản cho từng persona (BA/PO, QA, DEV)
- Examples với real Jira issues
- Troubleshooting common issues

### [skill-anatomy.md](skill-anatomy.md)
Cấu trúc chi tiết của một skill. Đọc file này trước khi tạo skill mới. Bao gồm:
- YAML frontmatter requirements
- Sections bắt buộc (Tổng quan, Quy trình, Xác minh)
- Best practices
- Template & examples

### [agents.md](agents.md)
Chi tiết về 3 personas và ranh giới trách nhiệm:
- BA/PO: Requirements analysis, User Stories, Prioritization
- QA/SDET: Test design, Automation, Quality assurance
- DEV: Tech spec, Implementation, Unit testing

---

## 🔍 Analysis & Review Documents

### [ba-po-separation-proposal.md](ba-po-separation-proposal.md)
**Tại sao tách BA/PO khỏi QA?**

Chi tiết lý do tách BA/PO thành persona độc lập:
- Vấn đề: BA skills đang bị gộp vào QA persona
- Giải pháp: Tạo BA/PO persona với 9 skills độc lập
- Ranh giới rõ ràng: BA/PO → QA handoff workflow
- Implementation plan: 4 phases

### [ba-ac-vs-qa-checklist-comparison.md](ba-ac-vs-qa-checklist-comparison.md)
**So sánh BA Acceptance Criteria vs QA Test Checklist**

Phân tích overlap giữa 2 skills:
- BA AC = High-level rules (generic)
- QA Checklist = Low-level test cases (concrete data)
- Kết luận: BA viết AC trong Section 9 của `*-final.md`, QA transform thành Test Checklist
- Lý do xóa skill `ba-acceptance-criteria`

### [ba-ac-vs-qa-gherkin-overlap-analysis.md](ba-ac-vs-qa-gherkin-overlap-analysis.md)
**BA có nên viết Gherkin không?**

Phân tích ai nên viết BDD Gherkin scenarios:
- BA viết AC dạng Checklist (rule-based)
- QA transform AC thành Gherkin (executable)
- Industry best practice: ATDD workflow
- Ranh giới: BA = WHAT must be true, QA = HOW to test

### [qa-skills-comprehensive-review.md](qa-skills-comprehensive-review.md)
**Review toàn diện 5 QA skills** (40+ pages)

Chi tiết:
- Phân tích từng skill (qa-test-design, qa-auto-design, qa-run-test, qa-code2spec, qa-squash-push)
- 10 issues found với priority (P0/P1/P2)
- Recommendations & action items
- Coverage gaps matrix
- Quality metrics (average 3.9/5 stars)

---

## 🔧 Setup Guides (Multi-Platform)

agent-skills hỗ trợ nhiều AI coding platforms:

### [gemini-cli-setup.md](gemini-cli-setup.md)
**Hướng dẫn cài đặt agent-skills với Gemini CLI**

Gemini CLI có skills system tương tự Claude Code. File này hướng dẫn cài đặt từ repo hoặc local clone.

### [antigravity-setup.md](antigravity-setup.md)
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

**Tip:** Bắt đầu với [getting-started.md](getting-started.md) nếu bạn mới sử dụng agent-skills.
