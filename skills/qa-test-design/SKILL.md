---
name: qa-test-design
description: Designs test artifacts in two phases — first a structured execution checklist, then BDD Gherkin feature files. Use when creating test plans, execution checklists, .feature files, BDD scenarios, or converting requirements into executable specifications for securities, fintech, and banking domains.
---

# QA Test Design

## Overview

Design test artifacts in a two-phase gated workflow: first produce a structured execution checklist (the what to test), then produce BDD Gherkin feature files (the how to automate). The checklist is the input to the Gherkin — every `.feature` scenario should trace back to a checklist item. Skipping the checklist leads to BDD scenarios that miss edge cases and lack traceability.

## When to Use

- Creating test plans, execution checklists, or `.feature` files
- Converting requirements or specs into testable artifacts
- Designing acceptance tests in Given/When/Then format
- Preparing structured verification documents with priority tiers (P0/P1/P2)
- Building data-driven Scenario Outlines from API validation rules

**When NOT to use:** Unit tests for pure logic (use `test-driven-development`), performance benchmarks, or infrastructure configuration tests.

## The Two-Phase Workflow

```
PHASE 1: CHECKLIST           PHASE 2: GHERKIN
  Gather requirements           Pre-Flight (from checklist)
       │                              │
       ▼                              ▼
  Group by test concern         Write Feature & Background
       │                              │
       ▼                              ▼
  Write each item              Design Scenarios
       │                              │
       ▼                              ▼
  Assign priority              Apply Given/When/Then
       │                              │
       ▼                              ▼
  ✅ Checklist complete    ──→   Outline, Tables & Tags
                                      │
                                      ▼
                                ✅ Feature file complete
```

Do not advance to Phase 2 until Phase 1 is complete. The checklist is the source of truth for scenario coverage.

---

## Phase 1: Checklist Design

Optionally initialize the output directory before starting:

```bash
bash skills/qa-test-design/scripts/qa-init.sh [output-dir]
```

This creates `checklists/` and `features/` sub-directories under the specified path (default: `tests/qa/`).

### Step 1: Gather Requirements

Before writing any checklist item, collect the inputs:

1. **Read the spec or requirements** — identify validation rules, error codes, state transitions, business constraints
2. **Review API documentation** — extract endpoints, request/response schemas, authentication requirements
3. **Identify test boundaries** — what is in scope (this checklist) vs out of scope (another checklist or automated tests)
4. **Note environment requirements** — which environment (UAT/Staging/Production), which devices, which build version
5. **Identify symmetric elements** — List all buttons, tabs, sections, input triggers, or values that share the same behavior or processing flow. Record them as **symmetry groups** to ensure the checklist and scenarios cover ALL elements in each group.
6. **Enumerate closed lists** — When the spec lists a finite, closed set of values (order types, account statuses, security types, exchanges...), record ALL values explicitly. Do not sample — every value in a closed list MUST appear in at least one checklist item and one Examples row.

If `spec-driven-development` has produced a spec, use it as the primary source. Do not re-extract what is already documented.

### Step 2: Group by Test Concern

Organize checklist items into logical groups based on the testing dimension. This ordering reflects risk priority — security issues found late are more expensive than validation issues:

| Group | Priority | What it covers |
|-------|----------|----------------|
| **Security & Auth** | P0 | API key, signature, tokens, authorization, permission |
| **Routing & HTTP** | P1 | HTTP methods, endpoints, URL validation, market type routing |
| **Payload Validation** | P1 | Required fields, data types, format validation |
| **Business Rules** | P0 | Price limits, quantity rules, balance checks, time restrictions |
| **Edge Cases & Performance** | P2 | Race conditions, overflow, rate limiting, cross-asset conflicts |
| **Happy Path & Data Consistency** | P0 | Successful flows, response schema, end-to-end data verification |

### Step 3: Write Each Item

Every checklist item must follow these rules:

**Start with an action verb** — each item is a command, not a description:

| ❌ Wrong | ✅ Right |
|---|---|
| Màn hình lỗi | Xác nhận hệ thống hiển thị màn hình lỗi khi token hết hạn |
| Nút đăng nhập | Nhấn nút "Đăng nhập", xác nhận hệ thống chuyển đến trang Dashboard |
| Check form đăng ký | Nhập email thiếu "@", xác nhận hệ thống báo lỗi viền đỏ |
| Test khi rớt mạng | Tắt Wi-Fi/4G khi đang load, xác nhận app hiện pop-up "Mất kết nối" |

**One item, one action** — each line is a single Pass/Fail gate. Never combine multiple actions:

```markdown
# Bad — two actions in one item
- [ ] Xác nhận API từ chối request không có x-api-key và trả về lỗi 401

# Good — split into atomic items
- [ ] Xác nhận API từ chối request không có x-api-key
- [ ] Xác nhận response trả về mã HTTP status 401 Unauthorized
```

**Quantify and specify** — avoid subjective adjectives:

| ❌ Vague | ✅ Quantified |
|---|---|
| Load nhanh | Load dưới 2 giây |
| Giá hợp lệ | Xác nhận giá đặt nằm trong khoảng Giá Sàn (90,000) đến Giá Trần (110,000) |
| Nút bấm hiển thị bình thường | Xác nhận nút "Đồng ý" hiển thị bo góc, kích thước 44px |

### Step 4: Assign Priority and Metadata

Every checklist must include these columns:

| Column | Required | Description |
|--------|----------|-------------|
| **Hạng mục kiểm tra** | ✅ | The test item with action verb |
| **Mức độ ưu tiên** | ✅ | P0 (must pass before release), P1 (should pass), P2 (nice to have) |
| **Trạng thái** | ✅ | Pass / Fail / Blocked / N/A |
| **Ghi chú / Mã Bug** | ✅ | Bug ID or observation notes |

**Header metadata** — every checklist must declare at the top:

```markdown
**Môi trường:** [UAT / Staging / Production]
**Phiên bản / Nhánh:** [Build Version / Branch]
**Thiết bị:** [Device model, if applicable]
```

### Checklist Template

```markdown
# Checklist Kiểm Thử Thực Thi - [Tên tính năng / API]

**Môi trường:** [UAT / Staging / Production]
**Phiên bản / Nhánh:** [Build Version / Branch]

## 1. Kiểm tra Bảo mật & Phân quyền (Security & Auth)
- [ ] Xác nhận API **từ chối** request không có `x-api-key` — [P0]
- [ ] Xác nhận API **từ chối** `x-api-key` sai, hết hạn hoặc đã bị revoke — [P0]
- [ ] Xác nhận API **từ chối** request không có `signature` — [P0]
- [ ] Xác nhận API **từ chối** request có `signature` không khớp với payload — [P0]
- [ ] Xác nhận hệ thống chặn khi `accountNo` không thuộc tài khoản sở hữu API Key — [P0]

## 2. Kiểm tra Đường dẫn & Điều hướng (Routing)
- [ ] Xác nhận hệ thống báo lỗi khi dùng sai HTTP method cho endpoint — [P1]
- [ ] Xác nhận hệ thống báo lỗi khi viết sai URL — [P1]

## 3. Kiểm tra Dữ liệu đầu vào (Payload Validation)
- [ ] Xác nhận API báo lỗi khi bỏ trống body `{}` — [P1]
- [ ] Xác nhận API báo lỗi khi thiếu trường bắt buộc: [liệt kê] — [P1]
- [ ] Xác nhận API **từ chối** nếu sai định dạng dữ liệu — [P1]

## 4. Kiểm tra Logic Nghiệp vụ (Business Rules)
- [ ] Xác nhận API **từ chối** khi giá vượt quá Giá Trần — [P0]
- [ ] Xác nhận API **từ chối** khi giá thấp hơn Giá Sàn — [P0]
- [ ] Xác nhận API **từ chối** khi giá không đúng bước giá quy định — [P0]
- [ ] Xác nhận hệ thống chặn đặt lệnh ngoài giờ giao dịch — [P0]

## 5. Kiểm tra Ngoại lệ & Hiệu năng (Edge Cases)
- [ ] **Race Condition:** Gửi 2 request giống hệt cùng lúc, xác nhận không trừ đúp — [P2]
- [ ] **Overflow:** Gửi giá trị khổng lồ, xác nhận API bắt lỗi không crash — [P2]
- [ ] **Rate Limit:** Gửi liên tục 100 request/giây, xác nhận trả về 429 — [P2]

## 6. Kiểm tra Luồng Thành công & Nhất quán Dữ liệu (Happy Path)
- [ ] Xác nhận thao tác thành công với toàn bộ dữ liệu hợp lệ (HTTP 200) — [P0]
- [ ] Xác nhận response trả về đủ các fields theo schema — [P0]
- [ ] **Data Consistency:** Xác nhận dữ liệu nhất quán sau thao tác thành công — [P0]
```

---

## Phase 2: BDD Gherkin Design

### Step 5: Pre-Flight Analysis

Before writing any `.feature` file, use the Phase 1 checklist as the primary input:

1. **Map checklist groups to Features** — each checklist group (Security, Validation, Business Rules, etc.) typically becomes one `.feature` file or one Feature block
2. **Extract test-specific rules** — from the checklist items, list the rules that map to testable behaviors: validation rules, state transitions, error codes, boundary values
3. **Brainstorm scenarios** — for each rule, list candidate scenarios:
   - Happy path (at least one per rule)
   - Negative / edge cases (at least one per validation rule)
   - Boundary values where applicable (use Boundary Value Analysis and Equivalence Partitioning)

**Output the extracted rules as a comment block at the top of the `.feature` file:**

```gherkin
# Quy tắc nghiệp vụ được trích xuất (Extracted Business Rules):
#   - [Rule 1]
#   - [Rule 2]
# Danh sách các kịch bản cần test (Test Scenarios Brainstorming):
#   - [Happy Path] ...
#   - [Negative] ...
```

### Step 6: File and Format Setup

- Save files with the `.feature` extension
- Name files in kebab-case: `get-trading-token.feature`, `post-bond-order.feature`
- Define exactly one `Feature` per file
- Indent with **2 spaces** for all nested content
- Keep lines under **120 characters**
- Separate scenarios with one blank line; do not leave blank lines between steps within a scenario

### Step 7: Feature and Background

**Feature block:**

```gherkin
@domain-securities @feature-tag @JIRA-XXXX
Feature: <Short title reflecting the behavior area>
  As a <role>
  I want <goal>
  So that <reason>
```

- Feature title must be short, one line, and match the filename
- Include the 3-line user story directly below the title
- Tag the Feature with domain, feature area, and ticket number

**Background block:**

- Use Background only when multiple scenarios share the same precondition
- Never define more than one Background per file
- Keep Background short — if it grows complex, split the file

### Step 8: Scenario Design

**Coverage requirements:**

- At least one `Scenario` for the happy path (successful flow)
- At least one `Scenario` per validation rule for negative testing / edge cases
- Do not write a single catch-all scenario for all error cases — each error condition gets its own scenario
- **Symmetry coverage:** When the spec describes multiple elements (buttons, tabs, values) with the same behavior, you MUST use `Scenario Outline` with an `Examples` table listing all variants. Never test only one element and skip its symmetric counterparts.

  ```gherkin
  # ❌ Only tests one element
  Scenario: Mở form đặt lệnh khi nhấn MUA
    When người dùng nhấn nút "MUA"

  # ✅ Covers all symmetric elements via Scenario Outline
  Scenario Outline: Mở form đặt lệnh khi nhấn <loại_lệnh>
    When người dùng nhấn nút "<loại_lệnh>"
    Examples:
      | loại_lệnh |
      | MUA        |
      | BÁN        |
  ```

- **State-dependent coverage:** When the same action produces different outcomes depending on system state (logged in / not logged in, has data / empty, market hours / after hours), create a separate scenario for each state that yields a distinct outcome. Use Scenario Outline if only input/output data differs; use separate Scenarios if the entire flow differs.
- **Cross-field interaction:** When changing field A affects field B (e.g., changing price recalculates buying power which changes quantity suggestions), include at least one scenario that asserts the downstream effect on field B after modifying field A.

**Writing rules:**

- Write declarative (state-based), not imperative (step-by-step navigation):

```gherkin
# Good — declarative, state-based
Given người dùng đã đăng nhập với quyền "Broker"

# Bad — imperative, navigation-based
Given người dùng mở trang đăng nhập
And nhập tên đăng nhập "broker01"
And nhập mật khẩu "Pass123"
And nhấn nút "Đăng nhập"
```

- Use business/domain language, not technical or framework language
- Do not expose automation mechanics: no selectors, xpaths, "wait for", "scroll to"
- Prefer state setup over navigation — describe meaningful starting states
- Use concrete, realistic example data (stock codes `VNM`, `SSI`, amounts `50000`) — not placeholder data (`foo`, `bar`)
- Keep each scenario under **10 steps**

### Step 9: Given / When / Then

Treat `Given / When / Then` as `Arrange / Act / Assert`:

| Keyword | Purpose | Maps to |
|---------|---------|---------|
| `Given` | Set up preconditions / context | Arrange |
| `When` | Perform the triggering action | Act |
| `Then` | Verify the observable outcome | Assert |

**Strict rules:**

- Follow the order `Given` → `When` → `Then` — never loop back
- Do not repeat Given/When/Then cycles within a single scenario — split into separate scenarios
- Use `And` to chain steps of the same type; use `But` sparingly for contrast
- `Then` assertions must be **observable and verifiable** — no vague assertions
- Place string parameters in **double quotes** (`"value"`)
- Use doc strings (`"""..."""`) for multi-line payloads (JSON, XML)

### Step 10: Scenario Outline, Tables, and Tagging

**Scenario Outline:**

- Use when the same behavior needs testing with multiple input variations
- Apply **Boundary Value Analysis** and **Equivalence Partitioning** to the `Examples` table

```gherkin
@negative @edge-case
Scenario Outline: Hệ thống từ chối lệnh khi dữ liệu không hợp lệ
  Given khách hàng có thông tin xác thực hợp lệ
  When trường "<field>" được gán giá trị "<invalid_value>"
  Then hệ thống từ chối request
  And trả về thông báo lỗi "<error_message>"

  Examples:
    | field    | invalid_value  | error_message              |
    | price    | chuỗi_chữ_abc | Định dạng không hợp lệ     |
    | quantity | -100           | Giá trị phải lớn hơn 0     |
    | quantity | 10.5           | Khối lượng phải là số nguyên |
```

**Tagging strategy:**

| Tag | Purpose |
|-----|---------|
| `@smoke` | Critical path — run on every build |
| `@regression` | Full regression suite |
| `@happy-path` | Successful flow scenarios |
| `@negative` | Error and rejection scenarios |
| `@edge-case` | Boundary and unusual conditions |
| `@api` | API-level tests |
| `@security` | Security-related scenarios |
| `@JIRA-XXXX` | Link to ticket number |
| `@domain-securities` | Domain tag for securities |

### Anti-Patterns to Avoid

| Anti-Pattern | Why it fails |
|---|---|
| Skipping Phase 1 (checklist) and jumping to Gherkin | Scenarios miss edge cases and lack traceability |
| Multiple behaviors in one scenario | Cannot isolate failures; violates one-scenario-one-behavior |
| Exposing UI DOM, selectors, or database details in steps | Breaks when implementation changes; couples tests to internals |
| Over-detailed UI navigation instead of state setup | Makes scenarios fragile and unreadable |
| Vague Then assertions without observable signals | "It works" proves nothing — specify what changed |
| Abusing Scenario Outline with duplicate rows | Adds execution time without coverage value |
| Testing only one trigger when multiple symmetric triggers exist | Misses the Bán button, the second tab, the alternate input method — same behavior, different entry point, separate bugs |
| Checklist items without action verbs | Descriptions instead of commands — cannot assign Pass/Fail |

### Gherkin Template

```gherkin
@domain-securities @feature-tag
Feature: <Tên khu vực hành vi hoặc Tính năng>
  As a <vai trò>
  I want <mục tiêu>
  So that <lý do>

  Background:
    Given <Trạng thái bắt đầu dùng chung cho các kịch bản>

  @happy-path @smoke
  Scenario: <Mô tả luồng hành vi thành công chính>
    Given <Ngữ cảnh tiền điều kiện cụ thể>
    And <Ngữ cảnh bổ sung nếu có>
    When <Hành động kích hoạt kịch bản>
    Then <Kết quả tích cực có thể quan sát và kiểm chứng được>
    And <Kết quả bổ sung nếu có>

  @negative @edge-case
  Scenario Outline: <Mô tả hành vi kiểm tra lỗi hoặc xác thực dữ liệu ngoại lệ>
    Given người dùng đã chuẩn bị ngữ cảnh hợp lệ
    When thực hiện hành động với loại dữ liệu "<input_type>" mang giá trị "<value>"
    Then hệ thống từ chối hành động và không xử lý
    And hiển thị thông báo lỗi chi tiết là "<error_message>"

    Examples:
      | input_type    | value | error_message                     |
      | để rỗng       |       | Trường này bắt buộc phải nhập     |
      | biên âm       | -1    | Giá trị phải lớn hơn hoặc bằng 0 |
      | sai định dạng | #@!   | Định dạng nhập vào không hợp lệ   |
```

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is too simple for a checklist" | Simple features still need documented quality gates. A 5-item checklist takes 2 minutes and catches the edge case you forgot. |
| "I'll write the scenarios without a checklist first" | Gherkin without a checklist misses edge cases. The checklist is the brainstorming artifact — the Gherkin is the automation artifact. |
| "Gherkin slows us down" | A 15-minute checklist + scenario design session prevents hours of rework from misunderstood requirements. |
| "The developer already wrote unit tests" | Unit tests verify implementation. Checklists and BDD verify behavior from the user's perspective. Different levels, different concerns. |
| "I can describe everything in one scenario" | Multi-behavior scenarios are untestable, unmaintainable, and unmergeable. One scenario, one behavior. |
| "A spreadsheet is fine for the checklist" | Spreadsheets lack standardized grouping, priority tiers, and reusable templates. A structured checklist ensures consistency across the team. |

## Red Flags

- Jumping to Phase 2 (Gherkin) without completing Phase 1 (checklist)
- Feature files without any tags — cannot be filtered for CI/CD execution
- No negative or edge-case scenarios — only happy paths tested
- Checklist items without action verbs — descriptions instead of commands
- Multiple actions combined in a single checklist item — cannot assign Pass/Fail
- Vague, subjective assertions — "looks good", "works fine", "loads fast"
- Scenarios with more than 10 steps — too complex, needs splitting
- Steps containing CSS selectors, xpaths, or SQL queries
- Given/When/Then cycles looping within a single scenario
- Missing priority assignments on checklist items
- Feature files written in English when the project convention mandates Vietnamese

## Verification

After completing both phases:

### Phase 1 — Checklist
- [ ] Every item starts with an action verb ("Xác nhận...", "Kiểm tra...", "Nhập...")
- [ ] Every item is a single Pass/Fail gate — no combined actions
- [ ] All assertions are quantified and unambiguous
- [ ] Items are grouped by test concern in priority order
- [ ] Priority (P0/P1/P2), Status, and Bug ID columns are present
- [ ] Environment and build version declared at the top

### Phase 2 — Gherkin
- [ ] Pre-Flight Analysis is documented — business rules extracted from checklist
- [ ] Every `.feature` file has exactly one `Feature` block with a user story
- [ ] At least one happy-path scenario exists per feature
- [ ] Negative and edge-case scenarios cover each validation rule
- [ ] All scenarios are tagged (`@smoke`, `@negative`, `@happy-path`, `@JIRA-XXXX`)
- [ ] Steps follow strict Given → When → Then order with no loops
- [ ] Each scenario has fewer than 10 steps
- [ ] Symmetric elements (buttons, tabs, values sharing same behavior) are covered using `Scenario Outline` with all variants in `Examples`

### Both Phases
- [ ] All output content is written in Vietnamese using domain terminology
- [ ] Every `.feature` scenario traces back to a checklist item
- [ ] No automation mechanics (selectors, xpaths, SQL) in step text
- [ ] Run `bash skills/qa-test-design/scripts/qa-validate.sh <features-dir>` and confirm all checks pass

## See Also

- Use `references/qa-testing-checklist.md` for financial domain validation patterns, BVA tables, equivalence partitioning references, and writing conventions
- If a spec exists, use the requirements from `spec-driven-development` as input to Phase 1
- For implementation-level tests after scenarios are designed, follow `test-driven-development`
- For planning and task breakdown before test design, use `planning-and-task-breakdown`
