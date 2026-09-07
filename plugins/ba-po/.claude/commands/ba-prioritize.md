---
description: "[BA/PO] Ưu tiên backlog theo MoSCoW (Must/Should/Could/Won't) hoặc WSJF (Weighted Shortest Job First). Sắp xếp User Stories/Features theo priority dựa trên business value, urgency, risk, dependencies."
---

**Persona:** BA/PO (Business Analyst / Product Owner)

Kích hoạt skill ba-backlog-prioritization với BA/PO persona. Đọc `plugins/ba-po/skills/ba-backlog-prioritization/SKILL.md` để thực hiện đúng workflow.

$ARGUMENTS có thể chứa:
- Jira issue key (VD: G3PTP-16584) → Đọc từ `/project-root/workspace/{issueKey}/spec/user-stories.md`
- Hoặc đọc từ `/project-root/workspace/{issueKey}/spec/gap-analysis.md`

**Workflow:**

1. **Chọn Framework**:
   - **MoSCoW** (Must/Should/Could/Won't) — Qualitative, nhanh, dễ consensus
   - **WSJF** (Weighted Shortest Job First) — Quantitative, data-driven, objective
   - **Hybrid** — MoSCoW trước → WSJF cho Must/Should items (recommended)

2. **Gather Scoring Data** (cho mỗi User Story/Gap):
   - Business Value (1-10)
   - Time Criticality (1-10)
   - Risk Reduction (1-10)
   - Job Duration (Story Points hoặc days)

3. **Apply Framework**:

   **MoSCoW:**
   - **Must have** — Bắt buộc (blocker, regulatory, core MVP)
   - **Should have** — Nên có (high value, có workaround)
   - **Could have** — Nice-to-have (low priority, defer OK)
   - **Won't have** — Không làm trong release này

   **WSJF:**
   ```
   WSJF = Cost of Delay / Job Duration
   Cost of Delay = Business Value + Time Criticality + Risk Reduction
   ```
   - Rank từ cao xuống thấp → Top items làm trước

4. **Create Sprint/Release Plan**:
   - Group stories theo Sprint dựa trên priority + dependencies + velocity
   - Sprint 1: MVP Foundation (Must + dependencies)
   - Sprint 2-3: Core Features
   - Sprint 4: Polish & Testing
   - Sprint 5+: Nice-to-have

5. **Dependency Map**: Visualize dependencies giữa các stories

6. **Output**: Lưu vào `/project-root/workspace/{issueKey}/spec/backlog.md`

**WSJF Scoring Template:**

```markdown
### Story X: [Story Name]

| Dimension | Score (1-10) | Justification |
|-----------|--------------|---------------|
| Business Value | [1-10] | [Tại sao score này?] |
| Time Criticality | [1-10] | [Có deadline? Competitor pressure?] |
| Risk Reduction | [1-10] | [Giảm thiểu risk gì?] |
| Cost of Delay | [Sum] | (BV + TC + RR) |
| Job Duration | [SP] | [Ước lượng effort] |
| **WSJF** | [Score] | (Cost of Delay / Duration) |
```

**Sprint Plan Template:**

```markdown
**Sprint 1 (MVP Foundation):** [Total SP]
- Story X: [Name] ([SP]) — WSJF [score]
- Story Y: [Name] ([SP]) — Dependency của Story X

**Sprint 2 (Core Features):** [Total SP]
- Story A: [Name] ([SP])
- Story B: [Name] ([SP])
```

**Ranh giới BA/PO:**
- ✅ Prioritize backlog dựa trên business value + urgency + risk
- ✅ Facilitate stakeholder consensus (MoSCoW workshop)
- ✅ Create high-level sprint/release plan
- ❌ KHÔNG làm detailed task breakdown (đó là việc của team trong sprint planning)
- ❌ KHÔNG commit team velocity mà chưa consult team (đó là team self-organize)

**Handoff**: Sau khi hoàn thành Prioritization:
- **Planning:** `/plan {issueKey}` → Breakdown prioritized stories thành tasks
- **DEV:** DEV làm stories theo priority order (Sprint 1 trước)
- **QA:** `/qa-test-design {issueKey}` → Design test cases theo priority order
- **Sprint Planning:** Present prioritized backlog cho team, adjust dựa trên team feedback

LƯU Ý: Tất cả output phải bằng TIẾNG VIỆT.
