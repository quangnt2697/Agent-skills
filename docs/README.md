# Danh Mục Tài Liệu Hệ Thống (`docs/`)

Thư mục này chứa toàn bộ tài liệu hướng dẫn cài đặt, vận hành, cấu trúc kỹ năng và kiến trúc ranh giới của kho lưu trữ **agent-skills** (Nhánh `main` chuyên trách 6 Plugins: **BA/PO, QA/SDET, Scrum Master, Code Reviewer & Auditors, Fintech Data, Core Meta**).

---

## 📚 1. Cẩm Nang Hướng Dẫn & Vận Hành (`docs/guides/`)

### [guides/installation-guide.md](guides/installation-guide.md)
Hướng dẫn cài đặt từ A–Z trên máy mới và tích hợp vào đa nền tảng AI Agent:
- Cài đặt và đồng bộ 6 plugins (31 skills, 29 commands, 6 subagents) cho **Claude Code**, **Antigravity IDE**, **Gemini CLI**.
- Kích hoạt Git Protection Hooks (`npm run setup:hooks`).
- Khởi chạy và quản lý n8n Fast-Path daemon qua PM2 (`npm run n8n:bg`).
- Đóng gói và xuất (export) plugin độc lập sang các repo microservice (`npm run plugin:export`).

### [guides/adoption-guide.md](guides/adoption-guide.md)
Cẩm nang áp dụng Agent Skills vào quy trình thực tế của đội ngũ:
- Bản đồ phối hợp liên vai trò khép kín: **BA/PO ➔ QA/SDET ➔ Code Review & Security/WebPerf ➔ Scrum Master & Fintech Data**.
- Quy trình chuẩn theo từng vai trò chuyên môn trên nhánh `main`.
- Quy ước lưu trữ 5 thư mục chuẩn trong `workspace/issues/{issueKey}/` và cơ chế học liên tục (`/learn`, `/save-checkpoint`).

### [guides/agents.md](guides/agents.md)
Chi tiết về **6 Agent Personas** và sự phân tách giữa 3 tầng (*Persona — Skill — Slash Command*):
- **BA/PO (`ba-po`):** Phân tích yêu cầu, mài giũa ý tưởng, dựng sơ đồ Editorial & Prod-Twin UI Mockup (10 skills).
- **QA/SDET (`qa`):** Thiết kế Checklist BVA + Gherkin, sinh code Automation POM, chạy test & đồng bộ Squash TM (6 skills).
- **Scrum Master (`scrum-master`):** Lập kế hoạch Sprint, Daily Standup (lưu báo cáo vào `trace/`), xử lý điểm nghẽn, tổng kết Sprint (4 skills).
- **Code Reviewer (`code-reviewer`):** Đánh giá code đa chiều 5 trục và đơn giản hóa mã nguồn (2 skills).
- **Security Auditor (`security-auditor`):** Kiểm toán an ninh mã nguồn theo OWASP Top 10 & Supply-chain (`security-code-audit`).
- **Web Performance Auditor (`web-performance-auditor`):** Đo lường và tối ưu Core Web Vitals (`webperf-core-vitals`).

### [guides/skill-anatomy.md](guides/skill-anatomy.md)
Cấu phẫu chi tiết của một kỹ năng (`SKILL.md`). Bắt buộc đọc trước khi tạo hoặc chỉnh sửa skill:
- Cấu trúc **Progressive Disclosure 3 tầng** (Level 1 Metadata, Level 2 Body tinh gọn, Level 3 `assets/` & `references/`).
- Các mục bắt buộc của Gate 1 (`Grounding`, `Input Bắt Buộc & Bằng Chứng Hoàn Thành`, *Few-Shot Quarantine*).
- Nguyên tắc tiết kiệm ngữ cảnh (Context Efficiency) và chống ngụy biện (Anti-rationalization).

### [guides/create-new-plugin.md](guides/create-new-plugin.md)
Quy trình chuẩn 5 bước (SOP) để khởi tạo một Plugin mới, định nghĩa Persona, viết `SKILL.md`, biên dịch lệnh `.toml` qua `npm run build`, viết bộ test `evals/cases/*.json` và vượt qua 9 cổng kiểm định `npm test`.

### [guides/definition-of-done.md](guides/definition-of-done.md)
Tiêu chuẩn Hoàn thành (Definition of Done) cố định toàn dự án đối với mọi bản bàn giao: Tính đúng đắn, Chất lượng mã nguồn, Tính tích hợp, Tài liệu hóa và Sẵn sàng triển khai.

---

## 🏛️ 2. Tài Liệu Kiến Trúc & Ranh Giới Nghiệp Vụ (`docs/architecture/`)

### [architecture/ba-workflow-detail.md](architecture/ba-workflow-detail.md)
**Chi tiết Ranh giới & Quy trình BA/PO**
- Phân định rõ trách nhiệm của BA/PO và đầu ra bàn giao sang QA/DEV.
- So sánh chuyên sâu giữa 2 cổng điều phối đầu vào: **`/ba-spec`** (khi yêu cầu đã rõ, xuất `final.md` 13 mục) và **`/ba-refine`** (khi ý tưởng còn thô, mài giũa 5 chiều nghiệp vụ, dựng Prod-Twin Mockup qua `ba-design-mockup`, kiểm định `validate-ba-refine.js`, đẩy Jira ADF và xuất `testability-manifest.json`).

### [architecture/ba-ac-vs-qa-gherkin-overlap-analysis.md](architecture/ba-ac-vs-qa-gherkin-overlap-analysis.md)
**Phân tích Ranh giới: BA Acceptance Criteria vs QA Executable Gherkin**
- Phân biệt rõ **WHAT (Quy tắc & Hành vi Nghiệp vụ của BA)** và **HOW TO TEST (Kịch bản Kiểm thử Thực thi của QA)**.
- Làm rõ chuẩn **Business Gherkin sạch** trong `ba-refine` (chỉ mô tả hành vi nghiệp vụ `Happy / Validation / Edge`, cấm `@tags`, cấm `[AC-x.y]`, cấm test data cụ thể) so với **Executable Gherkin** trong `qa-test-design` (mở rộng gấp 3–5x kèm `@tags` truy vết, `Scenario Outline` đa sàn KRX và dữ liệu thực từ Metabase/TimescaleDB).

### [architecture/test-ownership.md](architecture/test-ownership.md)
**Phân quyền Sở hữu Kiểm thử & Đánh giá Chất lượng**
- Ma trận phân định ai viết và duy trì từng tầng kiểm thử: Unit Test, Integration Test, E2E/API/WebSocket Automation Test, Performance Test, Security Audit và 2 vòng Code Review.

### [architecture/subagent-handoff-protocol.md](architecture/subagent-handoff-protocol.md)
**Quy chuẩn Chuyển giao & Điều phối Subagents**
- Ba nguyên tắc: Cách ly ngữ cảnh (Context Isolation), Chuyển giao qua File Artifacts (`workspace/issues/{issueKey}/`) và Tối thiểu hóa quyền hạn (Tool Scoping) cho cả 6 Personas.
- Cơ chế cô lập môi trường chạy test bằng Git Worktree (`scripts/lib/qa-worktree.sh`).

### [architecture/orchestration-patterns.md](architecture/orchestration-patterns.md)
**Danh mục Các Mẫu Điều phối Tác tử (Orchestration Patterns)**
- 5 mẫu điều phối chuẩn được khuyến nghị (Gọi trực tiếp, Slash command đơn vai trò, Phân nhánh song song & Hợp nhất, Pipeline tuần tự, Cách ly nghiên cứu), so sánh Subagents vs Agent Teams và 4 phản mẫu cần tránh.

### [architecture/n8n-integration-strategy.md](architecture/n8n-integration-strategy.md)
**Chiến lược Tích hợp n8n Fast-Path & CLI Helpers**
- Danh mục đầy đủ các n8n Webhooks (`/webhook/jira-prep`, `/webhook/confluence-doc`, `/webhook/securities-fixture`, `/webhook/securities-rule-matrix`, `/webhook/qa-domain-lint`, `/webhook/sm-standup`...) và nguyên tắc đồng bộ node scripts (`npm run n8n:sync-nodes`).

---

## 📖 3. Tài Liệu Gốc Liên Quan Ở Thư Mục Root

- [../AGENTS.md](../AGENTS.md) — Luật cốt lõi (Core Rules), Vai trò và Quy trình Pipeline của toàn bộ Workspace.
- [../CATALOG.md](../CATALOG.md) — Bảng tra cứu nhanh toàn diện 31 Skills, 29 Slash Commands, 6 Personas và bộ lệnh CLI.
- [../LEARNING-ROADMAP.md](../LEARNING-ROADMAP.md) — Lộ trình làm chủ hệ thống theo từng cột mốc (15 phút, 1 ngày, 1 tuần).
- [../CLAUDE.md](../CLAUDE.md) — Chỉ dẫn dự án và các bất biến kiến trúc dành cho Agent.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — Hướng dẫn đóng góp và 9 cổng kiểm định tự động (`npm test`).
- [../README.md](../README.md) — Tổng quan kho lưu trữ và bắt đầu nhanh.
