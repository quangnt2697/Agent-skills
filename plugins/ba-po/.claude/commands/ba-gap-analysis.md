---
description: "[BA/PO] Phân tích khoảng cách AS-IS vs TO-BE, identify gaps (features, process, data, infrastructure), propose roadmap với priority và timeline."
---

**Persona:** BA/PO (Business Analyst / Product Owner)

Kích hoạt skill ba-gap-analysis với BA/PO persona. Đọc `plugins/ba-po/skills/ba-gap-analysis/SKILL.md` để thực hiện đúng workflow.

$ARGUMENTS có thể chứa:
- Jira issue key (VD: G3PTP-16584) → Đọc từ `/project-root/workspace/{issueKey}/spec/final.md`
- Hoặc requirements từ user (text input)

**Workflow:**

1. **Document AS-IS (Current State)**:
   - Process/Workflow: Quy trình hiện tại (actors, steps, tools, timing)
   - Pain Points: Điểm đau cụ thể (chậm, lỗi, không scalable)
   - Limitations: Hạn chế kỹ thuật/nghiệp vụ
   - Current Metrics: Baseline số liệu (thời gian, lỗi, chi phí, NPS)

2. **Define TO-BE (Target State)**:
   - Target Process: Quy trình mục tiêu
   - Expected Benefits: Lợi ích cho user và business
   - Success Criteria: Measurable targets (< 30s, < 0.5% error, ≥ 4.2/5.0 NPS)

3. **Identify Gaps**:
   - Gap Categories: Process, Features, Data, Infrastructure, Skills
   - Với mỗi gap: Impact, Effort, Cost, Risk, Dependencies, Priority
   - Gap Prioritization Matrix: Value vs Effort

4. **Phased Roadmap**:
   - Phase 0: Team Building (hire, training)
   - Phase 1: Backend Foundation
   - Phase 2: Frontend/Mobile
   - Phase 3: Enhancement
   - Post-launch: Monitoring & Iteration

5. **Risk Mitigation**:
   - Identify risks (hiring, migration, timeline)
   - Mitigation plans cho từng risk

6. **Output**: Lưu vào `/project-root/workspace/{issueKey}/spec/gap-analysis.md`

**Template Gap:**

```markdown
#### Gap N: [Gap Name]

**AS-IS:** [Trạng thái hiện tại]
**TO-BE:** [Trạng thái mục tiêu]
**Gap:** [Những gì thiếu]

**Impact:**
- **Effort:** [Thời gian ước lượng]
- **Cost:** [Chi phí ước lượng]
- **Risk:** [High/Medium/Low + lý do]

**Dependencies:**
- [Gap X phải hoàn thành trước]
- [Cần resource Y]

**Priority:** 🔴 Critical / 🟡 Important / 🟢 Nice-to-have
```

**Ranh giới BA/PO:**
- ✅ Phân tích AS-IS vs TO-BE từ góc nhìn business/user
- ✅ Identify gaps (features, process, data)
- ❌ KHÔNG làm technical architecture design chi tiết (đó là việc của DEV)
- ❌ KHÔNG làm effort estimation chi tiết cho từng task (đó là việc của DEV/QA)

**Handoff**: Sau khi hoàn thành Gap Analysis:
- **Planning:** `/dev-plan {issueKey}` → Breakdown roadmap thành tasks
- **Prioritization:** `/ba-prioritize {issueKey}` → Prioritize gaps theo MoSCoW/WSJF
- **DEV:** `/dev-tech-spec {issueKey}` → Transform gaps thành Tech-Spec
- **Stakeholder:** Present Gap Analysis document cho leadership approval (budget + timeline)

LƯU Ý: Tất cả output phải bằng TIẾNG VIỆT.
