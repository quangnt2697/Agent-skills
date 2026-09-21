# agent-skills

Đây là dự án agent-skills — bộ sưu tập kỹ năng (skills) cấp sản xuất cho các AI coding agents.

> **Phạm vi:** File này cấu hình agent Claude làm việc trong repo [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills). Không copy file này vào dự án khác hay cấu hình agent toàn cục; tài sản tái sử dụng được nằm trong `plugins/`.

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
n8n-workflows/                    → Các n8n workflow tự động (ChatOps, Cron)
scripts/                          → Các script hỗ trợ, tool cài đặt (A-Z)
references/                       → Domain knowledge & checklists dùng chung
  └── securities/                 → 8 modules nghiệp vụ chứng khoán
docs/                             → Hướng dẫn cài đặt và thiết kế kiến trúc (dành cho user)
```

## Quy Tắc Dùng Chung (Shared Rules)

> 📖 **Toàn bộ định nghĩa 7 Personas, Pipelines, Ma trận trách nhiệm, Git Workflow và Confidence Level System được chuẩn hóa tập trung tại:** **[AGENTS.md](AGENTS.md)**

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

> 📖 **Xem toàn bộ danh sách kỹ năng theo Persona tại:** **[AGENTS.md#1-vai-tro-cot-loi-core-persona](AGENTS.md)**

## Quy ước

- Mỗi kỹ năng nằm trong `plugins/<plugin-name>/skills/<tên>/SKILL.md`
- YAML frontmatter có trường `name` và `description`
- Description bắt đầu bằng mô tả kỹ năng (ngôi thứ ba), theo sau là điều kiện kích hoạt ("Sử dụng khi...")
- Mỗi kỹ năng có: Tổng quan, Khi nào sử dụng, Quy trình, Các biện hộ thường gặp, Dấu hiệu cảnh báo, Xác minh
- Tài liệu tham khảo dùng chung nằm trong thư mục gốc `references/`; kỹ năng độc lập giữ tham khảo trong `plugins/<plugin-name>/skills/<tên>/references/`
- File bổ trợ chỉ tạo khi nội dung vượt quá 100 dòng

## Git Workflow & Autonomy

Xem chi tiết tại [`AGENTS.md`](AGENTS.md) (Section 5 — Tự Chủ & Chủ Động) và [`.claude/rules/git-workflow.md`](.claude/rules/git-workflow.md).