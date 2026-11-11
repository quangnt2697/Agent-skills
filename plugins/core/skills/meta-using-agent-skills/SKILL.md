---
name: meta-using-agent-skills
description: Khám phá và gọi các kỹ năng (skills) của agent.
trigger: Sử dụng khi bắt đầu một phiên làm việc hoặc khi bạn cần tìm xem kỹ năng nào áp dụng cho task hiện tại. Đây là kỹ năng siêu cấp (meta-skill) chi phối cách tất cả các kỹ năng khác được phát hiện và sử dụng.
---

# Kỹ năng: Sử dụng các Kỹ năng của Agent (Using Agent Skills)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Yêu cầu của user. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Chỉ đề xuất skill có thật trong danh mục; không bịa tên skill.

## 1. Tổng quan & Khám phá Kỹ năng (Skill Discovery)

Khi nhận được một task, xác định giai đoạn phát triển và định tuyến vào kỹ năng tương ứng:

```text
Task đến
    ├── Nghiệp vụ / Phân tích (BA/PO):
    │   ├── Ý tưởng mơ hồ, cần phỏng vấn? ──────→ ba-interview-me / ba-stakeholder-interview
    │   ├── Có mã Jira, cần lập đặc tả? ────────→ ba-spec / ba-refine
    │   ├── Cần viết User Stories + ACs? ───────→ ba-user-story-writing
    │   ├── Cần phân tích AS-IS vs TO-BE? ──────→ ba-gap-analysis
    │   ├── Cần sắp xếp backlog Sprint/Release? → ba-backlog-prioritization
    │   ├── Cần vẽ quy trình / sơ đồ kiến trúc? ─→ ba-process-modeling / ba-design-flowchart
    │   └── Cần thiết kế mockup UI (Web/App)? ──→ ba-design-mockup
    ├── Kiểm thử & Chất lượng (QA/SDET):
    │   ├── Có code sẵn, cần dịch ra spec? ─────→ qa-code2spec
    │   ├── Thiết kế checklist & BDD Gherkin? ──→ qa-test-design
    │   ├── Sinh code kiểm thử tự động? ────────→ qa-auto-design
    │   ├── Chạy kiểm thử tự động / đo lường? ──→ qa-run-test
    │   ├── Đẩy test cases lên Squash TM? ──────→ qa-squash-push
    │   └── Chạy toàn bộ pipeline QA E2E? ──────→ qa-full-pipeline
    ├── Đánh giá Code & An ninh (Review & Security):
    │   ├── Review kiến trúc, logic, hiệu năng? ─→ cr-review-code-and-quality
    │   ├── Đơn giản hóa, refactor code? ────────→ cr-code-simplification
    │   ├── Quét lỗ hổng bảo mật OWASP? ────────→ security-code-audit
    │   └── Đo Core Web Vitals, hiệu năng Web? ─→ webperf-core-vitals
    ├── Scrum Master & Vận hành Sprint:
    │   ├── Lập kế hoạch Sprint? ───────────────→ sm-sprint-planning
    │   ├── Họp Daily Standup tự động? ─────────→ sm-daily-standup
    │   ├── Xử lý ticket bị nghẽn (impediment)? ─→ sm-impediment-triage
    │   └── Họp tổng kết Sprint (Retro)? ───────→ sm-sprint-retrospective
    └── Hạ tầng & Siêu kỹ năng (Core & Data Ops):
        ├── Đồng bộ code các kho microservices? ─→ repo-group-sync
        ├── Đối chiếu dữ liệu KRX TimescaleDB? ──→ db-timescale-reconciler
        ├── Kiểm tra ma trận truy vết Spec-Test? ─→ meta-cross-validation
        ├── Đúc kết bài học thành Rule mới? ─────→ meta-continuous-learning
        ├── Tối ưu hóa ngữ cảnh hội thoại? ─────→ meta-context
        └── Lưu / Khôi phục snapshot phiên? ────→ meta-session-checkpoint
```

## 2. Bảy Hành vi Vận hành Cốt lõi (Core Operating Behaviors — Bắt buộc)

1. **Phơi bày Giả định (Surface Assumptions):** Nêu rõ các giả định về nghiệp vụ, kiến trúc, phạm vi trước khi làm; không âm thầm đoán mò.
2. **Quản lý Sự bối rối (Manage Confusion):** Khi spec và code mâu thuẫn → **DỪNG LẠI**, chỉ rõ điểm xung đột và hỏi user.
3. **Phản biện Kỹ thuật (Push Back):** Chỉ ra rủi ro định lượng và đề xuất phương án thay thế khi hướng tiếp cận có lỗi rõ ràng.
4. **Buộc Đơn giản (Enforce Simplicity):** Ưu tiên giải pháp tối giản, không tạo abstraction thừa.
5. **Kỷ luật Phạm vi (Scope Discipline):** Chỉ sửa đúng phạm vi yêu cầu; không tự ý xóa comment hay refactor code lân cận.
6. **Xác minh Bằng chứng (Verify, Don't Assume):** Phải có test pass, build exit 0 theo `../../../../docs/guides/definition-of-done.md`.
7. **Tuân thủ Domain Fintech/KRX:** Bảo mật Auth, số học `Decimal` chính xác tuyệt đối, thiết kế API-first.

## 3. Tài nguyên mở rộng (Level 3 - Progressive Disclosure)
- 📖 [operating-behaviors.md](references/operating-behaviors.md): Chi tiết 7 hành vi cốt lõi và trình tự vòng đời SDLC 14 bước.

## 4. Bảng Tra cứu Nhanh (Quick Reference)

| Phân hệ | Kỹ năng cốt lõi | Đầu ra chính |
|---|---|---|
| **BA/PO** | `ba-spec`, `ba-refine`, `ba-interview-me`, `ba-gap-analysis`, `ba-user-story-writing`, `ba-backlog-prioritization`, `ba-stakeholder-interview`, `ba-process-modeling`, `ba-design-flowchart`, `ba-design-mockup` | `spec/final.md`, `refined.md`, User Stories, Mockup PNG, Diagram SVG |
| **QA/SDET** | `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-squash-push`, `qa-code2spec`, `qa-full-pipeline` | `checklist.md`, `.feature`, Pytest/Playwright, `report.md` |
| **Scrum** | `sm-sprint-planning`, `sm-daily-standup`, `sm-impediment-triage`, `sm-sprint-retrospective` | Kế hoạch Sprint, Standup, Triage blockers, Retro |
| **Review** | `cr-review-code-and-quality`, `cr-code-simplification`, `security-code-audit`, `webperf-core-vitals` | Code Review, Refactor, OWASP Audit, CWV Report |
| **Core/Data** | `meta-context`, `meta-cross-validation`, `meta-session-checkpoint`, `meta-continuous-learning`, `meta-using-agent-skills`, `repo-group-sync`, `db-timescale-reconciler` | Context, Traceability `matrix.md`, Checkpoint, DB Recon |
