# Ranh giới BA/PO — Chi tiết

> Tài liệu tham chiếu. Luật rút gọn nằm ở [CLAUDE.md](../CLAUDE.md#3-personas--pipelines).

### BA/PO: Import, Analyze, Clarify → `*-final.md`

**Trách nhiệm:**
- Import tài liệu từ Jira/Confluence (scan references, download files)
- Phân tích gaps theo 3 loại: Thiếu / Mơ hồ / Xung đột
- Phỏng vấn stakeholders làm rõ gaps (≥90% confidence)
- Tổng hợp thành `*-final.md` với đầy đủ 13 sections

**Output:** `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md`

**Handoff to:**
- QA: Section 9 (AC) + Section 5 (User Flow) + Section 8 (Edge Cases) → Transform thành Checklist + Gherkin
- DEV: Section 8 (Business Rules) + Data Requirements + Dependencies → Transform thành Tech-Spec

**KHÔNG làm:**
- ❌ Viết Tech-Spec, API Contract, Database Schema
- ❌ Viết Test Cases, Gherkin, Automation Code
- ❌ Thiết kế UI/UX chi tiết (chỉ mô tả User Flow từ business perspective)

**2 Skills chính:**

#### 1. ba-spec — Import & Analyze Jira có requirements rõ ràng

**Use case:** Jira task đã có requirements đầy đủ, cần phân tích và tổng hợp thành Business-Spec

**Process:**
```
/ba-spec {issueKey}
→ Download Jira + attachments
→ Scan references (Confluence pages)
→ Detect task type (APP/WEB/API)
→ Extract 13 sections
→ Gap analysis
→ Interview-me (if gaps found)
→ Output: {issueKey}-final.md
```

**Focus:** Completeness (đủ 13 sections, không thiếu sót)

#### 2. ba-refine — Refine Jira có ý tưởng thô/mơ hồ

**Use case:** Jira task có ý tưởng thô/mơ hồ/thiếu chi tiết, cần brainstorm và làm rõ

**Process:**
```
/ba-refine {issueKey}
→ Phase 0: Download Jira
→ Phase 1: Divergent (HMW + clarify + 5-8 variations)
→ Phase 2: Convergent (cluster + stress-test + assumptions)
→ Phase 3: Sharpen (structured spec)
→ Phase 4: Push to Jira (update description + comment + label)
```

**Focus:** Clarity & Detail (mài giũa ý tưởng thành spec rõ ràng)

**Output:** 
- Local: `workspace/{issueKey}/specs/refine/jira/{issueKey}/{issueKey}-refined.md`
- Jira: Updated description với cấu trúc chuẩn

**Ranh giới:**

| Aspect | ba-spec | ba-refine |
|--------|---------|-----------|
| **Input** | Jira có requirements rõ ràng | Jira có ý tưởng thô/mơ hồ |
| **Process** | Import → Analyze → Gap detection | Download → Diverge → Converge → Sharpen |
| **Output** | `*-final.md` file (for handoff) | Updated Jira description + local file |
| **Focus** | Completeness (13 sections) | Clarity & Detail (brainstorm) |
| **Handoff** | QA/DEV read from file | QA/DEV read from Jira or file |