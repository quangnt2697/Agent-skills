# agent-skills

Đây là dự án agent-skills — bộ sưu tập kỹ năng (skills) cấp sản xuất cho các AI coding agents.

> **Phạm vi:** File này cấu hình agent Claude làm việc trong repo [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills). Không copy file này vào dự án khác hay cấu hình agent toàn cục; tài sản tái sử dụng được nằm trong `skills/`.

## Cấu trúc Dự án

```
skills/          → Kỹ năng cốt lõi (SKILL.md cho mỗi thư mục, tổ chức theo persona)
  ba-*           → Kỹ năng Phân tích Nghiệp vụ (BA)
  qa-*           → Kỹ năng Kiểm thử & Tự động hóa (QA/SDET)
  dev-*          → Kỹ năng Phát triển phần mềm (DEV)
  meta-*         → Kỹ năng siêu cấp (Meta-skills)
agents/          → Các persona agent tái sử dụng (qa, dev, code-reviewer, security-auditor, web-performance-auditor)
hooks/           → Hook vòng đời phiên làm việc
.claude/commands/→ Slash commands cho Claude (/ba-spec, /qa-test-design, /build, /ship...)
commands/        → Slash commands cho Gemini (format .toml)
references/      → Checklist bổ trợ (testing, performance, security, accessibility, observability)
evals/           → Trường hợp đánh giá skill + framework (xem evals/README.md)
docs/            → Hướng dẫn cài đặt cho các công cụ
```

## 3 Personas & Pipelines

### Persona 1: BA/PO — Business Analyst / Product Owner

**Vai trò:** Cầu nối giữa stakeholders và implementation teams (QA + DEV), đảm bảo requirements được import đầy đủ, phân tích kỹ lưỡng, làm rõ mọi gaps, và tổng hợp thành `*-final.md` (Single Source of Truth).

**Pipeline BA/PO:**
```
Phase 1-2: Import & Analyze
/ba-spec {issueKey} → Import Jira/Confluence → Scan references → Download → Extract → Gap detection

Phase 3: Clarify
ba-interview-me (auto-invoke) → Hỏi từng câu một kèm guess → Đạt ≥90% confidence

Phase 4: Consolidate & Handoff
Tổng hợp *-final.md → Handoff to QA (/qa-test-design) or DEV (/tech-spec)
```

**Ranh giới:**
- CHỈ viết Business-Spec (`*-final.md`), User Stories, Acceptance Criteria **Checklist** (rule-based)
- KHÔNG viết Tech-Spec, API Contract, Database Schema (đó là việc của DEV)
- KHÔNG viết Test Cases, Gherkin scenarios, Automation Code (đó là việc của QA)
- HANDOFF rõ ràng: `*-final.md` → QA/DEV

**Lưu ý quan trọng về AC (Acceptance Criteria):**
- BA/PO viết AC = **Checklist** với business rules (WHAT must be true)
- QA transforms AC = **Gherkin** scenarios với test data (HOW to test)
- Không overlap: BA viết high-level rules, QA viết low-level test scenarios
- Chi tiết: `docs/ba-ac-vs-qa-gherkin-overlap-analysis.md`

**Skills:** `ba-spec`, `ba-refine`, `ba-interview-me`, `ba-gap-analysis` (new), `ba-user-story-writing` (new), `ba-acceptance-criteria` (new), `ba-backlog-prioritization` (new), `ba-stakeholder-interview` (new), `ba-process-modeling` (new)

---

### Persona 2: QA — Quality Assurance Engineer / SDET

**Vai trò:** Đảm bảo chất lượng phần mềm thông qua thiết kế test, automation, và validation trong domain Tài chính - Chứng khoán - Ngân hàng.

**Pipeline QA:**
```
(Nhận *-final.md từ BA/PO) → /qa-test-design → /qa-auto-design → /qa-run-test
                                       └─── hoặc chạy full: /qa-pipeline ───┘
```

**Ranh giới:**
- CHỈ viết test code (trong `tests/`)
- KHÔNG tự ý sửa app code
- KHÔNG viết Business-Spec (nhận từ BA/PO)
- TÁI SỬ DỤNG code dev có sẵn

**Input từ BA/PO:** `*-final.md` (Acceptance Criteria, User Flow, Edge Cases)  
**Output:** Checklist + Gherkin + Test Automation Code

**Skills:** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-code2spec`, `qa-squash-push`, `review-code-and-quality`, `code-simplification`

---

### Persona 3: DEV — Software Developer / Engineer

**Vai trò:** Thiết kế, xây dựng, và triển khai phần mềm chất lượng cao.

**Pipeline DEV:**
```
(Nhận *-final.md từ BA/PO) → /tech-spec → /plan → /build [auto] → /review → /unit-test → /ship
```

**Ranh giới:**
- Viết code ứng dụng, kiến trúc, API, Database Schema
- KHÔNG can thiệp vào test code QA (E2E/Integration)
- KHÔNG viết Business-Spec (nhận từ BA/PO)
- Tuân thủ TDD (Red → Green → Refactor)

**Input từ BA/PO:** `*-final.md` (Business Rules, Data Requirements, Dependencies)  
**Output:** Tech-Spec + App Code + Unit Tests

**Skills:** `dev-spec-driven-development`, `dev-api-design`, `dev-test-driven-development`, `dev-doubt-driven-development`, `dev-frontend-engineering`, `dev-browser-testing-with-devtools`, `dev-debugging`, `dev-deprecation-and-migration`, `dev-performance`, `dev-security`, `dev-refactoring`

---

### Skills dùng chung (cả 3 personas):
`planning-and-task-breakdown`, `incremental-implementation`, `source-driven-development`, `documentation-and-adrs`, `observability-and-instrumentation`, `meta-context`, `meta-using-agent-skills`, `meta-cross-validation`

---

## Ranh giới Persona — Chi tiết

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
- Local: `specs/refine/jira/{issueKey}/{issueKey}-refined.md`
- Jira: Updated description với cấu trúc chuẩn

**Ranh giới:**

| Aspect | ba-spec | ba-refine |
|--------|---------|-----------|
| **Input** | Jira có requirements rõ ràng | Jira có ý tưởng thô/mơ hồ |
| **Process** | Import → Analyze → Gap detection | Download → Diverge → Converge → Sharpen |
| **Output** | `*-final.md` file (for handoff) | Updated Jira description + local file |
| **Focus** | Completeness (13 sections) | Clarity & Detail (brainstorm) |
| **Handoff** | QA/DEV read from file | QA/DEV read from Jira or file |

---

### Unit Test: Thuộc DEV

**Khi nào:**
- Test các function/class riêng lẻ (pure logic)
- Test không cần khởi động app (fast, isolated)
- Mock dependencies (database, API, external services)

**Đặt ở đâu:**
- `tests/unit/` hoặc `src/__tests__/` (cùng folder với code)

**Framework:**
- Python: `pytest`, `unittest`
- JavaScript: `jest`, `vitest`, `mocha`
- Java: `JUnit`, `TestNG`

**Ai viết:**
- ✅ DEV viết unit test cho code của mình
- ✅ DEV maintain unit test khi refactor code
- ❌ QA không viết unit test (QA focus E2E/integration)

**Example:**
```python
# tests/unit/test_order_service.py (DEV writes this)
def test_validate_quantity_valid():
    assert validate_quantity(100) == True

def test_validate_quantity_invalid():
    with pytest.raises(ValueError):
        validate_quantity(50)  # Not multiple of 100
```

---

### Integration Test: DEV + QA Collaboration

**Khi nào:**
- Test tương tác giữa nhiều components (API + DB, Service + Service)
- Test cần khởi động app (slower than unit test)
- Test với real dependencies (không mock)

**Đặt ở đâu:**
- `tests/integration/`

**Ai viết:**
- ✅ DEV viết integration test cho API endpoints, service interactions
- ✅ QA có thể viết integration test cho complex workflows
- **Collaboration:** DEV design, QA expand coverage

**Example:**
```python
# tests/integration/test_order_api.py (DEV or QA)
def test_create_order_api():
    response = client.post("/api/v1/orders", json={
        "symbol": "VNM",
        "quantity": 100,
        "price": 50000
    })
    assert response.status_code == 201
    assert "orderId" in response.json()
```

---

### E2E (End-to-End) Test: Thuộc QA

**Khi nào:**
- Test toàn bộ flow từ UI đến Database
- Test như user thực tế (click button, fill form, verify result)
- Test business scenarios (Gherkin scenarios)

**Đặt ở đâu:**
- `workspace/{issueKey}/tests/qa-test-design/{issueKey}/steps/`
- `tests/e2e/`

**Framework:**
- Web: Selenium, Playwright, Cypress
- API: requests, httpx
- Mobile: Appium

**Ai viết:**
- ✅ QA viết E2E test dựa trên test design (checklist + Gherkin)
- ✅ QA maintain E2E test khi requirements thay đổi
- ❌ DEV không viết E2E test (DEV focus unit/integration)

**Example:**
```python
# workspace/JIRA-123/tests/qa-test-design/JIRA-123/steps/test_order.py (QA writes this)
@given('người dùng đã đăng nhập với tài khoản "1234567890"')
def step_impl(context):
    login("1234567890", "password")

@when('đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000')
def step_impl(context):
    context.response = create_order("VNM", 100, 50000)

@then('hệ thống ghi nhận lệnh thành công')
def step_impl(context):
    assert context.response.status_code == 201
```

---

### Performance Test: Thuộc QA (hoặc DEV support)

**Khi nào:**
- Load test (1000 requests/sec)
- Stress test (find breaking point)
- Soak test (sustained load 24h)

**Ai viết:**
- ✅ QA design performance test scenarios
- ✅ DEV support với profiling tools, optimization
- **Collaboration:** QA run tests, DEV analyze results

**Tools:**
- JMeter, Locust, k6, Artillery

---

### Security Test: Thuộc Security-Auditor (hoặc QA)

**Khi nào:**
- Penetration testing
- Vulnerability scanning
- Auth/authorization testing

**Ai viết:**
- ✅ Security-Auditor persona (agent)
- ✅ QA có thể viết basic security tests (SQL injection, XSS)
- ✅ DEV fix vulnerabilities found

---

### Code Review: DEV self-review + QA review

**2 rounds:**

#### Round 1: DEV Self-Review
- **Khi nào:** Sau khi code xong, trước khi commit
- **Ai làm:** DEV tự review code của mình
- **Focus:**
  - Correctness (logic đúng không?)
  - Readability (code dễ đọc không?)
  - Architecture (design tốt không?)
  - Performance (có bottleneck không?)
- **Command:** `/review` với persona=dev

#### Round 2: QA Review (Optional)
- **Khi nào:** Sau DEV self-review, trước merge
- **Ai làm:** QA review từ góc độ testability
- **Focus:**
  - Test coverage (đủ test chưa?)
  - Edge cases (có miss scenario nào không?)
  - Error handling (handle lỗi đúng không?)
  - Logging (đủ log để debug không?)
- **Command:** `/review` với persona=qa

**Không bắt buộc QA review mọi PR** — chỉ review:
- Critical features (payment, auth, security)
- Complex features (nhiều edge cases)
- Bug fixes (verify fix đúng root cause)

---

## Tổng kết Ranh giới

| Hoạt động | BA/PO | QA | DEV | Collaboration |
|-----------|-------|----|----|--------------|
| **Import & Analyze Requirements** | ✅ Owner | ❌ | ❌ | — |
| **Gap Analysis & Clarification** | ✅ Owner | ❌ | ❌ | — |
| **Business-Spec Writing** | ✅ Owner | ❌ | ❌ | — |
| **Unit Test** | ❌ | ❌ | ✅ Owner | — |
| **Integration Test** | ❌ | ✅ Owner | ✅ Support | 50/50 |
| **E2E Test** | ❌ | ✅ Owner | ❌ | — |
| **Performance Test** | ❌ | ✅ Owner | 🔧 Support | QA design, DEV optimize |
| **Security Test** | ❌ | ✅ Test | 🔧 Fix | QA test, DEV fix |
| **Code Review (app code)** | ❌ | ✅ Optional QA review | ✅ Self-review | DEV first, QA second |
| **Code Review (test code)** | ❌ | ✅ Self-review | ❌ | — |
| **Refactoring** | ❌ | ❌ | ✅ Owner | — |
| **Bug Fix** | ❌ | ✅ Verify fix + regression | ✅ Fix code | DEV fix, QA verify |
| **Tech-Spec Writing** | ❌ | ❌ | ✅ Owner | — |

**Legend:**
- ✅ Owner — responsible cho hoạt động này
- 🔧 Support — hỗ trợ khi cần
- ❌ — không làm

---

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

**Chi tiết:** Xem `.claude/commands/e2e-delivery.md`

## Kỹ năng theo Giai đoạn

**Xác định (Define — BA/PO):** `ba-spec`, `ba-interview-me`, `ba-refine`, `ba-gap-analysis`
**Lên kế hoạch (Plan — ALL):** `planning-and-task-breakdown`
**Xây dựng (Build — DEV):** `incremental-implementation`, `dev-spec-driven-development`, `dev-test-driven-development`, `meta-context`, `source-driven-development`, `dev-doubt-driven-development`, `dev-frontend-engineering`, `dev-api-design`
**Xác minh (Verify — DEV):** `dev-browser-testing-with-devtools`, `dev-debugging`
**Đánh giá (Review — DEV+QA):** `review-code-and-quality`, `code-simplification`, `dev-security`, `dev-performance`, `dev-audit-and-fix`
**Kiểm thử (Test — QA):** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-code2spec`

## Quy ước

- Mỗi kỹ năng nằm trong `skills/<tên>/SKILL.md`
- YAML frontmatter có trường `name` và `description`
- Description bắt đầu bằng mô tả kỹ năng (ngôi thứ ba), theo sau là điều kiện kích hoạt ("Sử dụng khi...")
- Mỗi kỹ năng có: Tổng quan, Khi nào sử dụng, Quy trình, Các biện hộ thường gặp, Dấu hiệu cảnh báo, Xác minh
- Tài liệu tham khảo dùng chung nằm trong thư mục gốc `references/`; kỹ năng độc lập giữ tham khảo trong `skills/<tên>/references/`
- File bổ trợ chỉ tạo khi nội dung vượt quá 100 dòng

## Chuẩn mực Đầu ra

- **Ngôn ngữ:** Mọi tài liệu (Spec, Checklist, Kịch bản, Báo cáo) BẮT BUỘC viết bằng Tiếng Việt
- **Truy vết (Traceability):** Test case phải map 1-1 với Checklist và Spec
- **Log Lỗi:** Trong báo cáo test API/WebSocket, bắt buộc in ra Request (Headers, Body) và Response (Status, Body)

## Đóng góp

Trước khi thêm kỹ năng mới hoặc chỉnh sửa lớn một kỹ năng hiện có, chạy kiểm tra sơ bộ trong [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill): tìm trong catalog, kiểm tra PR đang mở, xác nhận ý tưởng phù hợp [docs/skill-anatomy.md](docs/skill-anatomy.md), và giải trình khoảng trống. Ưu tiên mở rộng kỹ năng hiện có thay vì thêm bản gần trùng lặp.

## Lệnh

- `npm test` — chạy toàn bộ cổng chất lượng: 5 validator + unit test (phải xanh trước khi merge)
- `npm run validate` — chỉ chạy 5 validator (skills, commands, versions, links, artifact paths)
- `npm run test:unit` — chỉ chạy unit test của các script
- `npm run evals` — đánh giá trigger/routing cho mọi kỹ năng; `node scripts/run-evals.js --behavioral <skill>` cho chạy có chấm điểm

Chạy riêng từng validator khi cần khoanh vùng lỗi:

| Lệnh | Kiểm tra |
|---|---|
| `npm run validate:skills` | SKILL.md có frontmatter hợp lệ, `name` khớp thư mục, đủ 5 section bắt buộc |
| `npm run validate:commands` | `.claude/commands` và `commands/` khớp nhau về tên lệnh và description |
| `npm run validate:versions` | Các plugin manifest khai báo cùng một version |
| `npm run validate:links` | Link tới `references/` trong skill giải được đúng đường dẫn |
| `npm run validate:paths` | Đường dẫn artifact trong tài liệu theo đúng quy ước |

## Ranh giới

- Luôn: Chạy kiểm tra sơ bộ CONTRIBUTING.md trước khi tạo thư mục kỹ năng mới
- Luôn: Tuân theo format skill-anatomy.md cho kỹ năng mới
- Luôn: Kiểm tra PR và issue đang mở trên repo upstream trước khi mở PR mới
- Không bao giờ: Thêm kỹ năng chỉ là lời khuyên chung thay vì quy trình hành động cụ thể
- Không bao giờ: Duplicate nội dung giữa các kỹ năng — tham chiếu chéo thay vì copy

## Git Workflow

**Branch-based Development (BẮT BUỘC):**
- ❌ KHÔNG commit trực tiếp vào `main`/`master`
- ✅ Tạo feature branch cho MỌI thay đổi code app: `feature/{issueKey}` hoặc `feature/{feature-name}`
- ✅ Verify nhiều lần (test + build) trong quá trình code, NHƯNG chỉ commit 1 lần SAU KHI hoàn thành task
- ✅ Merge vào main CHỈ SAU KHI: (1) Test pass + (2) Build success + (3) User approve
- 📖 Xem chi tiết: `.claude/rules/git-workflow.md`

## Tự chủ (Autonomy)

**Mặc định là TỰ CHẠY.** Agent chỉ dừng hỏi user khi rơi vào 5 trường hợp của danh sách đóng:
1. Thiếu file input bắt buộc không thể tự tạo
2. Thiếu credential/secret không thể tự lấy
3. Có câu hỏi 🔴 Critical làm thay đổi bản chất output
4. Sắp commit/merge vào `main`
5. Hành động không thể hoàn tác bằng `git revert`

Mọi trường hợp khác: tự quyết, ghi giả định vào output, chạy tiếp. Confidence Level chỉ dùng
để **báo cáo**, không dùng chặn luồng.

- 📖 Xem chi tiết: `.claude/rules/autonomy-contract.md`