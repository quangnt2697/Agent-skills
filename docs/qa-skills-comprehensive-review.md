# Review Chi tiết QA/SDET Skills & Quy trình

**Ngày:** 2026-08-13  
**Mục đích:** Review toàn diện 5 QA skills và agents/qa.md để đảm bảo consistency, completeness, và workflow rõ ràng

---

## 📊 Tổng quan QA/SDET Persona

### QA Skills Matrix (5 total)

| # | Skill | Purpose | Input | Output | Phase in Pipeline |
|---|-------|---------|-------|--------|-------------------|
| 1 | **qa-test-design** | Thiết kế test artifacts (Checklist + Gherkin) | `*-final.md` (from BA/PO) | Checklist.md + .feature files | Phase 2 |
| 2 | **qa-auto-design** | Sinh automation test code | Checklist + .feature files | test_*.py (Playwright/Pytest) | Phase 3 |
| 3 | **qa-run-test** | Chạy test và xuất báo cáo | test_*.py files | Test report + metrics | Phase 4 |
| 4 | **qa-code2spec** | Reverse engineer code → spec | Source code files | `*-final.md` (like BA output) | Alternative entry |
| 5 | **qa-squash-push** | Push test cases lên Squash TM | .feature files | Squash TM sync | Integration |

### QA Pipeline (Standard Flow)

```
BA/PO → QA Handoff
     ↓
Phase 1: [BA DONE] *-final.md exists at specs/imports/jira/{issueKey}/{issueKey}-final.md
     ↓
Phase 2: /qa-test-design {issueKey}
         ├─ Read *-final.md (ALL 13 sections)
         ├─ Phase 2.1: Design Checklist (10+ dimensions, P0/P1/P2)
         ├─ [GATE] User approval (manual) or auto-approve (pipeline)
         └─ Phase 2.2: Generate Gherkin (.feature file)
     ↓
Phase 3: /qa-auto-design {issueKey}
         ├─ Read Checklist + .feature files
         ├─ Recon (UI DOM / API spec / WS docs)
         ├─ Design POM/Service Objects
         ├─ Generate test_*.py (Playwright/Pytest)
         └─ Self-fix loop (run → fix syntax errors → re-run)
     ↓
Phase 4: /qa-run-test {issueKey}
         ├─ Pre-flight check (dependencies, .env)
         ├─ Run test suite (pytest)
         ├─ Parse results (passed/failed/skipped)
         ├─ Analyze failures (root cause, priority)
         └─ Generate report (Markdown + HTML + JUnit XML)
     ↓
Phase 5 (Optional): /qa-squash-push {issueKey}
         └─ Sync .feature files to Squash TM
```

### Alternative Flow: qa-code2spec (Reverse Engineering)

```
Scenario: "Có Code nhưng không có Jira/Spec"

Phase 0: /qa-code2spec {file_path}
         ├─ Deep Trace: Read source code + dependencies
         ├─ Extract: Endpoints, Schemas, Business Rules, Error Codes
         ├─ Gap Analysis: Find missing validations
         ├─ Interview: Use ba-interview-me to clarify
         └─ Output: *-final.md at specs/code-import/{filename}/{filename}-final.md
     ↓
[Continue with standard flow from Phase 2: /qa-test-design]
```

---

## ✅ Strengths (Điểm mạnh)

### 1. **Clear Separation of Concerns**

Mỗi skill có vai trò rõ ràng, không overlap:
- `qa-test-design` — WHAT to test (thiết kế)
- `qa-auto-design` — HOW to test (code generation)
- `qa-run-test` — Execute & Report (chạy + phân tích)
- `qa-code2spec` — Alternative entry (reverse engineering)
- `qa-squash-push` — Integration (sync với external system)

### 2. **2-Phase Gated Workflow trong qa-test-design**

**Giai đoạn 1: Checklist → [GATE] → Giai đoạn 2: Gherkin**

- ✅ Checklist là "single source of truth" cho phạm vi test
- ✅ User approval gate đảm bảo không bỏ sót requirements
- ✅ Gherkin scenarios truy vết 1-1 về checklist items
- ✅ Auto-approve mode cho pipeline automation

**Benefit:** Tránh tình trạng "viết Gherkin xong mới nhận ra thiếu test cases"

### 3. **Comprehensive Coverage Rules**

Checklist design có 10+ dimensions với priority rõ ràng:
- 🔐 Bảo mật & Phân quyền (P0) — Security first
- 🌐 Đường dẫn & HTTP (P1) — Routing
- 📝 Dữ liệu đầu vào & Validation (P1) — Input validation
- 📊 Quy tắc nghiệp vụ (P0) — Business rules (CORE)
- ⚡ Ngoại lệ & Hiệu năng (P2) — Edge cases
- ✅ Luồng thành công (P0) — Happy path

**Ordered by risk** — Security bugs found late cost more than validation bugs.

### 4. **Symmetry Coverage (Bao phủ đối xứng)**

Rule quan trọng trong qa-test-design:
```markdown
Khi spec có nhiều phần tử cùng behavior (nút MUA/BÁN/SỬA, loại lệnh LO/ATO/MOK)
→ BẮT BUỘC test TẤT CẢ, không test 1 rồi bỏ qua
→ Dùng Scenario Outline + Examples table
```

**Prevents:** "Tested Buy button, assumed Sell button works the same" → Bug in production

### 5. **Self-Fix Loop trong qa-auto-design**

```python
while True:
    result = run_test()
    if result.exit_code == 0:
        break
    if is_syntax_error(result):
        fix_syntax_error(result.traceback)
        continue
    else:
        break  # Logic error, không tự fix
```

**Agent tự chạy → tự phát hiện lỗi syntax → tự sửa → chạy lại**

**KHÔNG tự sửa logic errors** — test failed do app bug thì không được sửa test để pass.

### 6. **Traceability End-to-End**

```
Business-Spec (*-final.md) Section 9: AC
    ↓
QA Checklist Item CHK-001 (P0)
    ↓
Gherkin Scenario: "Từ chối lệnh với quantity=0"
    ↓
Test Code: test_order_creation_with_invalid_quantity()
    ↓
Test Result: ❌ FAILED → App bug found
```

Mỗi test case trace ngược về Business Rule gốc.

### 7. **Smart Reuse trong qa-auto-design**

**Ưu tiên tái sử dụng code có sẵn:**
1. Quét workspace tìm existing API/WS clients
2. Import và sử dụng trực tiếp (không viết lại)
3. Chỉ viết tầng Test (Arrange → Act → Assert)

**Benefit:** Test code nhất quán với codebase, dễ đọc, dễ maintain.

### 8. **Comprehensive Test Reports**

qa-run-test xuất báo cáo đầy đủ:
- Summary metrics (pass rate, duration)
- Failed tests với chi tiết: Request/Response, Stack trace, Root cause
- Phân loại failures: Critical, Flaky, Environment
- Traceability matrix: Business Rule → Test → Result
- Action items với priority (P0/P1/P2)

**Not just numbers** — actionable insights để fix.

---

## ⚠️ Issues & Gaps (Vấn đề phát hiện)

### Issue 1: ❌ Overlap giữa BA AC và QA Checklist (ĐÃ FIX)

**Trước đây:**
- BA viết AC dạng Checklist
- QA viết lại Checklist chi tiết hơn
- Duplicate work, QA không tiết kiệm công sức

**Đã fix:**
- XÓA skill `ba-acceptance-criteria`
- BA chỉ viết AC trong `*-final.md` Section 9 (rule-based, high-level)
- QA đọc Section 9 → transform thành Test Checklist (P0/P1/P2, chi tiết)

**Status:** ✅ Resolved

---

### Issue 2: ⚠️ Không rõ BA/PO persona nào chịu trách nhiệm handoff

**Hiện tại:**
- File `agents/qa.md` nói "nhận `*-final.md` từ BA/PO"
- NHƯNG: Chưa có file `agents/ba-po.md` chính thức
- BA skills (`ba-spec`, `ba-interview-me`) nằm rời rạc

**Đề xuất:**
- ✅ Đã tạo `agents/ba-po.md` (trong PR này)
- ✅ Clarify BA/PO là upstream, QA là downstream
- ✅ Ranh giới rõ ràng: BA viết Spec, QA viết Test

**Status:** ✅ Resolved (pending commit)

---

### Issue 3: ⚠️ qa-test-design quá dài (600+ lines)

**Vấn đề:**
- File `qa-test-design/SKILL.md` có 600+ dòng
- Khó đọc, khó maintain
- Mix giữa instructions, templates, và examples

**Đề xuất:**
- Tách thành nhiều files:
  ```
  skills/qa-test-design/
  ├── SKILL.md                    # Main instructions (200 lines)
  ├── references/
  │   ├── checklist-template.md   # Template riêng
  │   ├── gherkin-template.md     # Template riêng
  │   └── examples.md             # Examples riêng
  └── scripts/
      └── qa-init.sh
  ```

**Status:** 🔴 TODO

---

### Issue 4: ⚠️ Thiếu skill "qa-pipeline" để orchestrate toàn bộ

**Hiện tại:**
- User phải chạy manually: `/qa-test-design` → `/qa-auto-design` → `/qa-run-test`
- Không có auto-approve mode end-to-end

**Trong CLAUDE.md có reference đến `/qa-pipeline`:**
```bash
/ba-spec → /qa-test-design → /qa-auto-design → /qa-run-test
                    └─── hoặc chạy full: /qa-pipeline ───┘
```

**NHƯNG:** Không tìm thấy skill `qa-pipeline` trong codebase!

**Đề xuất:**
- Tạo skill `qa-pipeline` với workflow:
  ```python
  def qa_pipeline(issueKey, autoApprove=False):
      # Phase 1: Check *-final.md exists
      spec_path = f"specs/imports/jira/{issueKey}/{issueKey}-final.md"
      if not exists(spec_path):
          error("Cần chạy /ba-spec trước")
      
      # Phase 2: Test Design
      invoke_skill("qa-test-design", issueKey, autoApprove=autoApprove)
      
      # Phase 3: Auto Design
      invoke_skill("qa-auto-design", issueKey)
      
      # Phase 4: Run Test
      result = invoke_skill("qa-run-test", issueKey)
      
      # Phase 5 (Optional): Push to Squash
      if user_confirm("Push to Squash TM?"):
          invoke_skill("qa-squash-push", issueKey)
      
      return result
  ```

**Status:** 🔴 TODO

---

### Issue 5: ⚠️ qa-auto-design dependency trên Browser MCP

**Trong qa-auto-design SKILL.md:**
```markdown
**Với UI (Web/App):**
- Sử dụng browser MCP (Playwright) để **tự mở trình duyệt** và inspect DOM thật.
```

**Vấn đề:**
- Không rõ "browser MCP" là gì — MCP server? Tool?
- Không có instructions để setup browser MCP
- Nếu browser MCP không available → skill fails

**Đề xuất:**
- Clarify "browser MCP" trong docs
- Hoặc fallback: Nếu không có browser MCP → yêu cầu user cung cấp locators manually
- Add pre-flight check trong qa-auto-design

**Status:** 🔴 TODO

---

### Issue 6: ⚠️ qa-code2spec không có template output

**Skill nói:**
```markdown
Cấu trúc file `final.md` phải tuân thủ chuẩn của bộ `ba-spec`
```

**NHƯNG:** Không có reference đến template cụ thể.

**Vấn đề:**
- Agent không biết format chính xác của `*-final.md`
- Output có thể không consistent với output từ `ba-spec`

**Đề xuất:**
- Link đến template: `skills/ba-spec/references/final-md-template.md`
- Hoặc tạo template riêng: `skills/qa-code2spec/references/final-md-template.md`

**Status:** 🔴 TODO

---

### Issue 7: ⚠️ qa-squash-push hardcode EnTrade Sprint

**Trong script logic:**
```markdown
Tìm Sprint Mới Nhất: Dùng regex tìm `EnTrade Sprint xxx`
```

**Vấn đề:**
- Hardcode "EnTrade" — specific cho một company
- Không work cho projects khác

**Đề xuất:**
- Move "EnTrade" vào `.env`:
  ```bash
  SQUASH_SPRINT_PREFIX="EnTrade Sprint"
  ```
- Script detect prefix từ .env

**Status:** 🔴 TODO

---

### Issue 8: ⚠️ Thiếu Unit Test guidelines cho QA

**Hiện tại:**
- `agents/qa.md` có table:
  ```markdown
  | Scenario | Test Level |
  |----------|------------|
  | Logic thuần, không I/O → Unit test
  | Vượt qua ranh giới hệ thống → Integration test
  | Luồng người dùng quan trọng → E2E test
  ```

**NHƯNG:**
- Không rõ QA có viết Unit Test không?
- Theo CLAUDE.md: "Unit Test thuộc DEV"

**Confusion:**
- `agents/qa.md` line 75-80 nói QA viết Unit test
- `CLAUDE.md` line 50-60 nói Unit Test thuộc DEV

**Đề xuất:**
- Clarify trong `agents/qa.md`:
  ```markdown
  ## Ranh giới Test Levels
  
  - **Unit Test** — DEV writes (cho pure logic, isolated functions)
  - **Integration Test** — DEV + QA collaboration
  - **E2E Test** — QA owns (end-to-end business scenarios)
  ```

**Status:** 🔴 TODO

---

### Issue 9: ⚠️ qa-run-test không handle concurrent runs

**Scenario:**
- CI/CD chạy test suite 2 lần cùng lúc (parallel builds)
- Cả 2 ghi vào `reports/junit.xml` và `reports/report.html`
- File conflicts, results bị ghi đè

**Đề xuất:**
- Unique output directory với timestamp:
  ```python
  output_dir = f"reports/{issueKey}-{timestamp}"
  pytest tests/ --junitxml={output_dir}/junit.xml
  ```

**Status:** 🔴 TODO

---

### Issue 10: ⚠️ Thiếu Flaky Test Detection

**Hiện tại:**
- qa-run-test chỉ chạy test 1 lần
- Không detect flaky tests (pass/fail không ổn định)

**Đề xuất:**
- Add option `--flaky-detection`:
  ```bash
  pytest tests/ --count=3  # Run 3 times
  # If test pass 2/3 → Mark as flaky
  ```

**Status:** 🔴 TODO

---

## 📋 Detailed Skill Reviews

### 1. qa-test-design ⭐⭐⭐⭐⭐ (5/5)

**Strengths:**
- ✅ 2-phase gated workflow (Checklist → Gherkin)
- ✅ 10+ test dimensions với priority rõ ràng
- ✅ Symmetry coverage rules
- ✅ Auto-approve mode cho pipeline
- ✅ Comprehensive templates
- ✅ Traceability: Section mapping → Checklist items

**Weaknesses:**
- ⚠️ File quá dài (600+ lines) → Cần tách
- ⚠️ Một số examples hardcode "VNM", "SSI" (stock symbols) → Nên genericize

**Recommendations:**
1. Tách file thành SKILL.md + references/ + examples/
2. Add examples cho domains khác (không chỉ chứng khoán)

---

### 2. qa-auto-design ⭐⭐⭐⭐ (4/5)

**Strengths:**
- ✅ Self-fix loop (tự chạy → fix syntax → re-run)
- ✅ Smart reuse (prefer existing code over rewrite)
- ✅ Clear POM pattern cho UI
- ✅ API Object Pattern cho API/WS
- ✅ 100% coverage rule (mọi Gherkin scenario phải có test code)

**Weaknesses:**
- ⚠️ Dependency trên "browser MCP" không rõ
- ⚠️ Không có fallback nếu browser MCP unavailable
- ⚠️ Self-fix loop có thể infinite nếu lỗi lặp lại

**Recommendations:**
1. Clarify browser MCP hoặc remove dependency
2. Add max iterations cho self-fix loop (VD: 3 attempts)
3. Add pre-flight check: Verify Checklist + .feature files exist before generating code

---

### 3. qa-run-test ⭐⭐⭐⭐⭐ (5/5)

**Strengths:**
- ✅ Comprehensive pre-flight checks (dependencies, .env, framework detection)
- ✅ Support multiple frameworks (pytest, jest, junit)
- ✅ Detailed failure analysis (root cause, priority, action items)
- ✅ Traceability matrix (Business Rule → Test → Result)
- ✅ Multiple report formats (Markdown, HTML, JUnit XML)
- ✅ Clear action items với P0/P1/P2 priority

**Weaknesses:**
- ⚠️ Không handle concurrent runs (file conflicts)
- ⚠️ Không detect flaky tests
- ⚠️ Report hardcode output path (`reports/`)

**Recommendations:**
1. Add unique output directory với timestamp
2. Add `--flaky-detection` mode (run tests N times)
3. Add `--output-dir` parameter để customize report location

---

### 4. qa-code2spec ⭐⭐⭐⭐ (4/5)

**Strengths:**
- ✅ Giải quyết pain point thực tế: "Có code nhưng không có spec"
- ✅ Deep trace logic (follow imports, dependencies)
- ✅ Extract schemas, validation rules, error codes
- ✅ Gap analysis (find missing validations)
- ✅ Interview mode để clarify (sử dụng ba-interview-me)
- ✅ Output format giống ba-spec → seamless integration với QA pipeline

**Weaknesses:**
- ⚠️ Không có template output (`*-final.md` format)
- ⚠️ Multi-language support không rõ (Python? TypeScript? Java?)
- ⚠️ Không rõ handle complex dependency graphs như thế nào (circular imports)

**Recommendations:**
1. Add reference template: `references/final-md-template.md`
2. Clarify supported languages (Python, TypeScript, Java) với examples
3. Add max depth cho deep trace (VD: 5 levels) để tránh infinite loops

---

### 5. qa-squash-push ⭐⭐⭐ (3/5)

**Strengths:**
- ✅ Automation: Tự động sync test cases lên Squash TM
- ✅ Smart logic: Tự tìm Sprint mới nhất, tự tạo folder nếu chưa có
- ✅ Idempotent: Có thể chạy lại nhiều lần (overwrite test case)
- ✅ Single bash script call → user chỉ approve 1 lần

**Weaknesses:**
- ⚠️ Hardcode "EnTrade Sprint" → không work cho projects khác
- ⚠️ Require Squash TM specific setup → narrow use case
- ⚠️ Không có error handling cho API failures
- ⚠️ Không có retry logic cho network errors

**Recommendations:**
1. Move "EnTrade Sprint" prefix vào `.env`
2. Add retry logic (3 attempts) cho REST API calls
3. Add dry-run mode: `--dry-run` để preview changes trước khi push
4. Optional: Support TestRail, Jira Xray (không chỉ Squash TM)

---

## 🎯 Consistency Check: agents/qa.md vs Skills

### ✅ Consistent Areas

1. **Ranh giới với BA/PO:**
   - agents/qa.md: "KHÔNG làm Business Analysis, nhận `*-final.md` từ BA/PO"
   - Skills: Tất cả đều đọc `*-final.md` làm input, không tự viết spec

2. **Test Artifacts Format:**
   - agents/qa.md: "Checklist + BDD Gherkin"
   - qa-test-design: Output Checklist.md + .feature files

3. **Tiếng Việt Requirement:**
   - agents/qa.md line 153: "Checklist và file `.feature` BẮT BUỘC viết bằng tiếng Việt"
   - qa-test-design: All templates và examples dùng tiếng Việt

4. **Priority System:**
   - agents/qa.md: P0 (blocking) / P1 (should) / P2 (nice to have)
   - qa-test-design: Consistent P0/P1/P2 trong checklist
   - qa-run-test: Consistent P0/P1/P2 trong action items

### ⚠️ Inconsistent Areas

#### Issue 1: Unit Test Ownership

**agents/qa.md line 74-80:**
```markdown
### 2. Test ở đúng cấp độ

Logic thuần, không I/O       → Unit test
Vượt qua ranh giới hệ thống → Integration test
Luồng người dùng quan trọng → E2E test
```

**CLAUDE.md section "Ranh giới Persona":**
```markdown
### Unit Test: Thuộc DEV
- ✅ DEV viết unit test cho code của mình
- ❌ QA không viết unit test (QA focus E2E/integration)
```

**Conflict:** agents/qa.md implies QA viết unit test, CLAUDE.md nói DEV viết.

**Resolution:**
- QA persona chỉ viết **Integration + E2E tests**
- DEV persona viết **Unit tests**
- Update agents/qa.md line 74-80 để clarify

---

#### Issue 2: Slash Command References

**agents/qa.md line 163:**
```markdown
Kích hoạt thông qua: `/unit-test` (workflow TDD) hoặc `/ship`
```

**Vấn đề:**
- Không tìm thấy command `/unit-test` trong `.claude/commands/`
- Không tìm thấy command `/ship` trong `.claude/commands/`

**Resolution:**
- Xóa references đến commands không tồn tại
- Hoặc tạo commands này nếu cần

---

## 📊 Coverage Gaps Matrix

| Area | Covered by | Gap |
|------|------------|-----|
| **Business Analysis** | BA/PO persona | ✅ Complete (9 skills) |
| **Test Design** | qa-test-design | ✅ Complete |
| **Test Automation** | qa-auto-design | ✅ Complete |
| **Test Execution** | qa-run-test | ✅ Complete |
| **Reverse Engineering** | qa-code2spec | ✅ Complete |
| **External Integration** | qa-squash-push | ✅ Complete |
| **Full Pipeline Orchestration** | ❌ Missing | 🔴 **qa-pipeline skill needed** |
| **Performance Testing** | ❌ Missing | 🟡 Optional (out of scope?) |
| **Load/Stress Testing** | ❌ Missing | 🟡 Optional (JMeter, k6) |
| **Visual Regression Testing** | ❌ Missing | 🟡 Optional (Percy, BackstopJS) |
| **Accessibility Testing** | ❌ Missing | 🟡 Optional (axe, pa11y) |
| **Security Testing** | ❌ Missing | 🟡 Có security-auditor agent riêng |
| **Mobile App Testing** | ❌ Missing | 🟡 Optional (Appium) |
| **API Contract Testing** | ❌ Missing | 🟡 Optional (Pact, Postman) |

**Priority Gaps:**
1. 🔴 **HIGH:** qa-pipeline skill (để orchestrate Phase 2-4)
2. 🟡 **MEDIUM:** Performance testing skill (nếu domain cần)
3. 🟡 **LOW:** Visual regression, accessibility (nice to have)

---

## 🚀 Recommendations Summary

### Immediate Actions (Cần làm ngay)

1. **Tạo skill qa-pipeline** ⚠️ HIGH PRIORITY
   - Orchestrate qa-test-design → qa-auto-design → qa-run-test
   - Support auto-approve mode
   - Support partial runs (chỉ chạy 1 phase)

2. **Fix Unit Test Ownership Confusion** ⚠️ HIGH PRIORITY
   - Update agents/qa.md: QA không viết unit test
   - Clarify: DEV writes unit, QA writes integration + E2E

3. **Tách qa-test-design thành modules** 🟡 MEDIUM PRIORITY
   - SKILL.md (200 lines)
   - references/checklist-template.md
   - references/gherkin-template.md
   - examples/domain-securities.md

4. **Fix qa-auto-design browser MCP dependency** 🟡 MEDIUM PRIORITY
   - Clarify what "browser MCP" is
   - Add fallback nếu không có

5. **Generic-ize qa-squash-push** 🟢 LOW PRIORITY
   - Move "EnTrade Sprint" vào .env
   - Add support cho TestRail, Jira Xray

### Long-term Improvements

1. **Add Performance Testing skill**
   - Locust/k6 integration
   - Load test scenarios
   - Performance report generation

2. **Add API Contract Testing**
   - Pact integration
   - Schema validation
   - Contract-driven development

3. **Add Visual Regression Testing**
   - Percy/BackstopJS integration
   - Screenshot comparison
   - Visual diff reports

---

## 📈 Quality Metrics

### Skill Documentation Quality

| Skill | Lines | Clarity | Examples | Templates | Score |
|-------|-------|---------|----------|-----------|-------|
| qa-test-design | 600+ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **4.5/5** |
| qa-auto-design | 150 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | **4/5** |
| qa-run-test | 650 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **5/5** |
| qa-code2spec | 65 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | **3/5** |
| qa-squash-push | 67 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | **3/5** |

**Average:** 3.9/5

**Recommendations:**
- qa-code2spec: Add more examples (Python, TypeScript, Java)
- qa-squash-push: Add error handling examples

---

## ✅ Final Checklist

### Completed (trong PR này)
- [x] Review toàn bộ 5 QA skills
- [x] Review agents/qa.md
- [x] Identify 10 issues/gaps
- [x] Phân tích consistency giữa agent và skills
- [x] So sánh với CLAUDE.md (3-persona model)
- [x] Tạo comprehensive review document

### To-Do (Next Steps)
- [ ] Tạo skill `qa-pipeline`
- [ ] Fix unit test ownership confusion trong agents/qa.md
- [ ] Tách qa-test-design thành modules
- [ ] Clarify browser MCP dependency
- [ ] Generic-ize qa-squash-push
- [ ] Add qa-code2spec output template
- [ ] Fix concurrent runs trong qa-run-test
- [ ] Add flaky test detection

---

## 📚 Related Documents

- `agents/qa.md` — QA/SDET persona definition
- `agents/ba-po.md` — BA/PO persona definition (new)
- `CLAUDE.md` — 3-persona model (BA/PO, QA, DEV)
- `docs/ba-po-separation-proposal.md` — BA/PO separation rationale
- `docs/ba-ac-vs-qa-checklist-comparison.md` — AC vs Checklist overlap analysis
- `.claude/rules/git-workflow.md` — Branch-based development
- `.claude/rules/confidence-level.md` — Confidence system

---

**Reviewed by:** Claude Sonnet 5  
**Date:** 2026-08-13  
**Status:** ✅ Complete  
**Next Review:** After implementing qa-pipeline skill