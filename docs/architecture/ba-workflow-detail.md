# Ranh Giới & Quy Trình BA/PO — Chi Tiết

> Tài liệu tham chiếu chuyên sâu. Quy trình tổng quan nằm ở [AGENTS.md](../../AGENTS.md#3-các-quy-trình-pipeline) và danh mục đầy đủ 10 kỹ năng BA/PO nằm ở [CATALOG.md](../../CATALOG.md#3-danh-mục-kỹ-năng-skills-31-skills).

### BA/PO: Thu Thập, Phân Tích, Mài Giũa & Dựng Mockup → `spec/final.md` & `spec/refined.md`

**Trách nhiệm cốt lõi:**
- Import tài liệu từ Jira/Confluence (quét liên kết, trích xuất từ khóa tiêu đề, tải tài liệu vào `source/refs/`)
- Phân tích khoảng cách (gaps) theo 3 loại: Thiếu / Mơ hồ / Xung đột
- Phỏng vấn làm rõ qua `ba-interview-me` (chỉ hỏi câu 🔴 Critical theo `autonomy-contract.md` cho tới khi đạt Confidence ≥ 90%)
- Trực quan hóa sơ đồ quy trình/kiến trúc qua `ba-design-flowchart` và dựng Prod-Twin UI Mockup bám sát codebase qua `ba-design-mockup` (Fidelity Score ≥ 90%)
- Xuất bản đặc tả chuẩn hóa (`spec/final.md` hoặc `spec/refined.md` + `spec/testability-manifest.json`) và đồng bộ lên Jira Description dạng ADF

**Output:** `workspace/issues/{issueKey}/spec/final.md`, `spec/refined.md`, `spec/testability-manifest.json`, `spec/asis-inventory.*`, `spec/diagrams/`

**Handoff sang các vai trò khác:**
- **QA/SDET:** Nhận `spec/final.md` (hoặc `spec/refined.md`) + `spec/testability-manifest.json` → Chạy `/qa-test-design` sinh `test/checklist.md` & `test/{issueKey}.feature` và `/qa-auto-design` sinh code automation POM
- **DEV:** Nhận Business Rules (`[BR-xx]`), UI Mockup đa trạng thái (`mockup-case-1..3.png`) và Acceptance Criteria → Thiết kế kỹ thuật và lập trình trên repo microservice

**KHÔNG làm:**
- ❌ Viết Tech-Spec, API Contract, Database Schema, SQL (do DEV/Architecture đảm nhiệm)
- ❌ Viết mã nguồn kiểm thử tự động, Test Cases thực thi chứa `@tags` hoặc test data cứng (do QA đảm nhiệm)
- ❌ Thiết kế đồ họa UI tự do thoát ly codebase (mọi mockup UI bắt buộc đi qua `ba-design-mockup` bám sát `ui-component-map.json` và `asis-inventory.json`)

**2 Cổng Điều Phối Đầu Vào Chính (Kết hợp cùng 8 kỹ năng bổ trợ trong `plugins/ba-po`):**

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