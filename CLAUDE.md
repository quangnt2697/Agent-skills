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

**Xác định (Define — BA/PO):** `ba-spec`, `ba-interview-me`, `ba-refine`, `ba-gap-analysis`, `ba-process-modeling`, `ba-user-story-writing`, `ba-backlog-prioritization`, `ba-design-flowchart`
**Lên kế hoạch (Plan — ALL):** `dev-planning-and-task-breakdown`
**Xây dựng (Build — DEV):** `dev-incremental-implementation`, `dev-spec-driven-development`, `dev-test-driven-development`, `dev-source-driven-development`, `dev-doubt-driven-development`, `dev-frontend-engineering`, `dev-api-design`
**Xác minh (Verify — DEV):** `dev-browser-testing-with-devtools`, `dev-debugging`
**Đánh giá (Review — DEV+QA+CR):** `cr-review-code-and-quality`, `cr-code-simplification`, `dev-security`, `dev-performance`, `dev-audit-and-fix`
**Kiểm thử (Test — QA):** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-code2spec`, `qa-squash-push`, `qa-full-pipeline`
**Quản lý Phiên & Đồng bộ (Session & Sync - ALL):** `repo-group-sync`, `meta-continuous-learning`, `meta-session-checkpoint`, `meta-cross-validation`, `meta-context`, `meta-using-agent-skills`, `db-timescale-reconciler`

## Quy ước

- Mỗi kỹ năng nằm trong `plugins/<plugin-name>/skills/<tên>/SKILL.md`
- YAML frontmatter có trường `name` và `description`
- Description bắt đầu bằng mô tả kỹ năng (ngôi thứ ba), theo sau là điều kiện kích hoạt ("Sử dụng khi...")
- Mỗi kỹ năng có: Tổng quan, Khi nào sử dụng, Quy trình, Các biện hộ thường gặp, Dấu hiệu cảnh báo, Xác minh
- Tài liệu tham khảo dùng chung nằm trong thư mục gốc `references/`; kỹ năng độc lập giữ tham khảo trong `plugins/<plugin-name>/skills/<tên>/references/`
- File bổ trợ chỉ tạo khi nội dung vượt quá 100 dòng

## Git Workflow & Autonomy

Xem chi tiết tại [`AGENTS.md`](AGENTS.md) (Section 5 — Tự Chủ & Chủ Động) và [`.claude/rules/git-workflow.md`](.claude/rules/git-workflow.md).