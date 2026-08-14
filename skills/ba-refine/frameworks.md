# Ideation Frameworks

Các khung tư duy sáng tạo (ideation frameworks) để đẻ ra variations trong Phase 1.

## Core Lenses (7 lăng kính cốt lõi)

### 1. Inversion (Đảo ngược)

**Câu hỏi:** "Nếu chúng ta làm điều NGƯỢC LẠI hoàn toàn thì sao?"

**Example:**
- Original: "Add export button to reports"
- Inversion: "Instead of export, make reports live-shareable with auto-refresh"
- Inversion 2: "Instead of user exports, system auto-sends reports proactively"

**When to use:** Khi solution hiện tại quá obvious, cần break mental model

---

### 2. Constraint Removal (Đạp đổ Ràng buộc)

**Câu hỏi:** "Nếu tiền/thời gian/công nghệ không phải vấn đề thì sao?"

**Example:**
- Original: "Simple PDF export"
- No constraints: "AI-generated personalized reports with predictive insights"
- No constraints 2: "Real-time collaborative reports like Google Docs"

**When to use:** Để tìm "ideal state", sau đó work backwards về MVP

---

### 3. Audience Shift (Đổi Target User)

**Câu hỏi:** "Nếu build cho [user khác] thì sao?"

**Example:**
- Original: "Export for individual traders"
- Shift to CFO: "Consolidated portfolio reports across all accounts"
- Shift to Auditor: "Tamper-proof audit trail with blockchain"

**When to use:** Khi stuck với một user persona, cần expand perspective

---

### 4. Combination (Lai tạp)

**Câu hỏi:** "Nếu gộp với [feature lân cận] thì sao?"

**Example:**
- Original: "PDF export"
- Combine with alerts: "Export + schedule auto-send when conditions met"
- Combine with sharing: "Export + encrypted sharing with expiration"

**When to use:** Khi có nhiều related features, tìm synergy

---

### 5. Extreme Simplification (Đơn giản hóa cực đoan)

**Câu hỏi:** "Phiên bản đơn giản gấp 10 lần?"

**Example:**
- Original: "Full-featured report builder"
- 10x simpler: "One-click screenshot to clipboard"
- 10x simpler 2: "Email me current view"

**When to use:** Khi solution đang overengineered, cần MVP

---

### 6. 10x Scale (Nhân 10 lên)

**Câu hỏi:** "Nếu chạy ở quy mô lớn gấp 10x thì sao?"

**Example:**
- Original: "Export reports for 1K users"
- 10x scale: "Export for 10K users → Need async queue + CDN caching"
- 10x scale 2: "10K exports/minute → Need distributed system"

**When to use:** Để identify scalability bottlenecks sớm

---

### 7. Expert Lens (Lăng kính Chuyên gia)

**Câu hỏi:** "Chuyên gia trong ngành coi điều gì là hiển nhiên?"

**Example:**
- Original: "Export to PDF"
- Expert view (Compliance): "PDF/A format with digital signature"
- Expert view (Trader): "Export with machine-readable format for algo trading"

**When to use:** Khi thiếu domain knowledge, cần input từ experts

---

## Advanced Frameworks (Khung nâng cao)

### SCAMPER

- **S**ubstitute: Thay thế component nào?
- **C**ombine: Kết hợp với gì?
- **A**dapt: Điều chỉnh từ industry khác?
- **M**odify: Thay đổi thuộc tính nào?
- **P**ut to other use: Dùng cho mục đích khác?
- **E**liminate: Loại bỏ gì?
- **R**everse: Đảo ngược flow?

**Example:**
- Original: "PDF export button"
- Substitute: Replace PDF with interactive dashboard embed
- Combine: PDF + annotations + comments
- Adapt: Copy Notion's "Export as" multi-format
- Modify: Change export trigger (auto vs manual)
- Put to other use: Use export engine for internal audit reports
- Eliminate: Remove export entirely, just share live link
- Reverse: Instead of user pulls, system pushes

---

### Jobs to Be Done (JTBD)

**Framework:** User "hires" product to do a job

**Questions:**
- What job is user hiring this feature for?
- What alternatives are they using now?
- What would make them "fire" current solution?

**Example:**
- Original: "Export report"
- Job #1: "Help me save evidence for compliance audit"
- Job #2: "Help me share trading results with my advisor"
- Job #3: "Help me analyze patterns offline"

→ Each job suggests different solution

---

### First Principles

**Framework:** Break down to fundamental truths, rebuild from scratch

**Questions:**
- What are we REALLY trying to achieve?
- What assumptions can we challenge?
- If starting from zero today, what would we build?

**Example:**
- Original: "Export report"
- First principle: User wants to keep trading history
- Challenge: Why export? Why not just reliable access?
- Rebuild: Instead of export, guarantee data availability + API access

---

### Blue Ocean Strategy

**Framework:** Create uncontested market space

**Questions:**
- What can we eliminate (industry takes for granted)?
- What can we reduce (below standard)?
- What can we raise (above standard)?
- What can we create (never offered)?

**Example:**
- Original: "Standard PDF export"
- Eliminate: Manual export trigger
- Reduce: Feature complexity (one-click only)
- Raise: Security (encrypted + watermarked)
- Create: AI-generated insights in export

---

## Fintech-Specific Lenses

### Compliance-First Lens

**Question:** "If regulatory compliance is THE priority?"

**Example:**
- Add immutable audit trail
- PDF/A format with digital signatures
- Automatic retention policy enforcement
- Redaction for sensitive data

---

### Security-First Lens

**Question:** "If security is THE priority?"

**Example:**
- End-to-end encryption
- Watermarking with user ID + timestamp
- Time-limited access (self-destruct)
- No-download mode (view-only)

---

### Performance-First Lens

**Question:** "If speed/scale is THE priority?"

**Example:**
- Pre-generated reports (async)
- Incremental exports (delta only)
- Streaming for large datasets
- Edge caching via CDN

---

## How to Use These Frameworks

**In Phase 1 (Divergent):**

1. **Pick 2-3 lenses** that fit the problem
   - Don't force all 7 core lenses
   - Choose based on context

2. **Generate 1-2 variations per lens**
   - Quality over quantity
   - Each variation needs rationale

3. **Mix and match**
   - Combine lenses for richer ideas
   - Example: Inversion + Expert Lens

4. **Stay grounded**
   - Reference existing codebase
   - Consider technical constraints
   - Cite similar patterns in industry

**Anti-patterns:**
- ❌ Forcing all frameworks (overkill)
- ❌ Generating 20+ shallow variations
- ❌ Ignoring codebase constraints
- ❌ Pure blue-sky thinking without feasibility check

---

## Example: Applying Lenses

**Original Jira:** "Add export button to trading reports"

**Lens 1: Inversion**
→ "Instead of user exports data, system proactively sends daily digest"

**Lens 2: 10x Simplification**
→ "One-click email current screen as PDF"

**Lens 3: Expert (Compliance)**
→ "Export with tamper-proof audit trail + PDF/A format"

**Lens 4: Combination**
→ "Export + scheduled auto-send + encrypted sharing"

**Lens 5: Audience Shift (CFO)**
→ "Consolidated multi-account portfolio export with tax summary"

**Lens 6: First Principles**
→ "Why export? Give permanent API access + data warehouse connection instead"

**Result:** 6 diverse variations, each with distinct angle
