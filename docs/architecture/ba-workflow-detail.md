# Ranh giới BA/PO — Chi tiết

> Tài liệu tham chiếu. Luật rút gọn nằm ở [CLAUDE.md](../../CLAUDE.md#3-personas--pipelines). File này chứa phần diễn giải chi tiết, lý do thiết kế, và các case đặc biệt.

### BA/PO: Import, Analyze, Clarify → `*-final.md`

**Trách nhiệm:**
- Import tài liệu từ Jira/Confluence (scan references, download files)
- Phân tích gaps theo 3 loại: Thiếu / Mơ hồ / Xung đột
- Phỏng vấn stakeholders làm rõ gaps (chỉ phỏng vấn khi có 🔴 Critical gap theo autonomy-contract.md)
- Tổng hợp thành `*-final.md` với đầy đủ 13 sections

**Output:** `/project-root/workspace/issues/{issueKey}/spec/final.md`

**Handoff to:**
- QA: Section 9 (AC) + Section 5 (User Flow) + Section 8 (Edge Cases) → Transform thành Checklist + Gherkin
- DEV: Section 8 (Business Rules) + Data Requirements + Dependencies → Transform thành Tech-Spec

**KHÔNG làm:**
- ❌ Viết Tech-Spec, API Contract, Database Schema (do DEV/Architecture đảm nhiệm)
- ❌ Viết mã nguồn kiểm thử tự động, Test Cases chi tiết với test data cụ thể (do QA đảm nhiệm)
- ❌ Thiết kế đồ họa UI pixel-perfect trong Figma (nhưng trực tiếp dựng Prod-Twin UI Mockup bám sát codebase qua skill `ba-design-mockup` để kẹp vào đặc tả nghiệp vụ)

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

#### 2. ba-refine — Refine Jira có ý tưởng thô/mơ hồ & Dựng Mockup Prod-Twin

**Use case:** Jira task có ý tưởng thô/mơ hồ/thiếu chi tiết, cần tìm kiếm ngữ cảnh, brainstorm, dựng mockup giao diện và cập nhật Jira ADF.

**Process:**
```
/ba-refine {issueKey}
→ Phase 0: Scan, Trích xuất Từ khóa & Tổng hợp Danh sách (Gate 1)
→ Phase 1: Khai phóng theo 5 Chiều Nghiệp vụ (Divergent + ba-interview-me)
→ Phase 2: Phản biện Nghiệp vụ & Tình huống Biên (Convergent + Stress-test)
→ Phase 3: Chuẩn hóa Đặc tả 6 Mục, Dựng Prod-Twin Mockup (ba-design-mockup) & Hard Gate validate-ba-refine.js (Gate 2)
→ Phase 4: Push to Jira (update description ADF kèm inline media, KHÔNG comment/label) & xuất testability-manifest.json
```

**Focus:** Clarity & Detail (mài giũa ý tưởng thành spec 6 mục rõ ràng, kèm mockup trung thực cao ≥90% và testability manifest)

**Output:** 
- Local: `workspace/issues/{issueKey}/spec/refined.md`, `testability-manifest.json`, `spec/diagrams/mockup-*.png`, `spec/asis-inventory.*`
- Jira: Updated description dạng ADF chuẩn với inline diagrams/mockups

**Ranh giới:**

| Aspect      | ba-spec                          | ba-refine                               |
|-------------|----------------------------------|-----------------------------------------|
| **Input**   | Jira có requirements rõ ràng     | Jira có ý tưởng thô/mơ hồ               |
| **Process** | Import → Analyze → Gap detection | Ingestion → Diverge/Converge → Mockup → ADF Sync |
| **Output**  | `final.md` file (for handoff)    | Updated Jira description + `refined.md`/`final.md` + `testability-manifest.json` |
| **Focus**   | Completeness (13 sections)       | Clarity & Detail (brainstorm & Prod-Twin mockups) |
| **Handoff** | QA/DEV read from file            | QA/DEV read from `spec/final.md` hoặc Jira Description |