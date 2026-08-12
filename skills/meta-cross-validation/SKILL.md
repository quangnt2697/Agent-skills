---
name: meta-cross-validation
description: Xác thực truy vết (traceability) giữa Business-Spec, Tech-Spec, và Test Cases. Tạo ma trận ánh xạ Business Rule → Spec Section → Test Case, phát hiện gaps. Sử dụng khi cần kiểm tra độ bao phủ của test cases so với yêu cầu nghiệp vụ.
---

# Cross-Validation — Xác thực Truy vết (Meta)

## Tổng quan

Xác thực truy vết (traceability) giữa các artifacts trong SDLC: Business-Spec → Tech-Spec → Test Cases. Tạo ma trận ánh xạ để đảm bảo mọi Business Rule đều được:
1. Translate sang Tech-Spec (thiết kế kỹ thuật)
2. Cover bởi Test Cases (kiểm thử)

Phát hiện **gaps** (thiếu sót) và **redundancies** (trùng lặp) để đảm bảo độ bao phủ 100%.

## Khi nào sử dụng

- Sau khi DEV viết Tech-Spec, trước khi code
- Sau khi QA thiết kế Test Cases, trước khi automation
- Trước release, kiểm tra toàn bộ feature có bao phủ đủ không
- Code review hoặc QA review muốn verify completeness
- Audit compliance (ISO, FDA, SOX) yêu cầu traceability matrix

**Khi KHÔNG sử dụng:**
- Chưa có Business-Spec hoặc Tech-Spec → tạo chúng trước
- Feature quá đơn giản (1 rule, 1 test case) → overkill
- Prototype hoặc spike (không cần đầy đủ)

## Input & Output

**Input (bắt buộc):**
1. Business-Spec: `specs/jira-import/{issueKey}/{issueKey}-final.md` hoặc `workspace/{issueKey}/specs/`
2. Tech-Spec: `workspace/{issueKey}/planning/tech-spec.md`
3. Test Checklist: `tests/qa-test-design/{issueKey}/{issueKey}-checklist.md`
4. Test Feature: `tests/qa-test-design/{issueKey}/features/{issueKey}.feature`

**Output:**
- Traceability Matrix: `workspace/{issueKey}/reports/traceability-matrix.md`
- Gap Analysis Report: `workspace/{issueKey}/reports/gap-analysis.md`

## Quy trình 4 Phase

### Phase 1: Extract Business Rules

Đọc Business-Spec và trích xuất tất cả Business Rules:

```markdown
## Business Rules từ Business-Spec

| Rule ID | Rule Name | Description | Priority | Source |
|---------|-----------|-------------|----------|--------|
| BR-001 | Quantity Validation | Khối lượng phải > 0 và bội số của 100 | P0 | Section 3.1 |
| BR-002 | Price Ceiling/Floor | Giá trong khoảng ±7% giá tham chiếu | P0 | Section 3.1 |
| BR-003 | Buying Power Check | Sức mua phải đủ để đặt lệnh | P0 | Section 3.2 |
| BR-004 | Trading Hours | Chỉ cho phép đặt lệnh 09:00-15:00 | P1 | Section 3.3 |
| BR-005 | Order Status FSM | Lệnh chuyển trạng thái theo state machine | P0 | Section 3.4 |
```

**Cách detect Business Rules:**
- Section có tiêu đề: "Business Rules", "Validation Rules", "Acceptance Criteria"
- Câu có động từ: "PHẢI", "BẮT BUỘC", "KHÔNG ĐƯỢC", "CHỈ KHI"
- Câu định nghĩa constraint: "X >= Y", "X nằm trong [A, B]"
- Error scenarios (negative cases)

### Phase 2: Map Tech-Spec Coverage

Đọc Tech-Spec và ánh xạ từng Business Rule đã được cover ở đâu:

```markdown
## Tech-Spec Coverage Matrix

| Rule ID | Covered in Tech-Spec | Section | Implementation Note |
|---------|----------------------|---------|---------------------|
| BR-001 | ✅ YES | 5.2 Validation Rules | Function `validate_quantity()` |
| BR-002 | ✅ YES | 5.2 Validation Rules | Function `validate_price()` with floor/ceiling |
| BR-003 | ✅ YES | 5.2 Business Logic | Function `check_buying_power()` |
| BR-004 | ❌ NO | — | **GAP: Trading hours check missing** |
| BR-005 | ✅ YES | 4.3 State Machine | Diagram + transitions table |
```

**Cách map:**
- Grep trong Tech-Spec với keywords từ Business Rule
- Check từng section: API Contract, Data Model, Business Logic, Error Handling
- Nếu không tìm thấy → đánh dấu GAP

### Phase 3: Map Test Coverage

Đọc Test Checklist và Gherkin Feature file, ánh xạ test cases:

```markdown
## Test Coverage Matrix

| Rule ID | Covered by Test | Test Case ID | Test Type | Gherkin Scenario |
|---------|-----------------|--------------|-----------|------------------|
| BR-001 | ✅ YES | TC-001 | Positive | Scenario: Đặt lệnh với quantity=100 |
| BR-001 | ✅ YES | TC-002 | Negative | Scenario: Từ chối lệnh với quantity=50 |
| BR-002 | ✅ YES | TC-003 | Negative | Scenario: Từ chối lệnh giá vượt trần |
| BR-003 | ✅ YES | TC-004 | Negative | Scenario: Từ chối lệnh khi sức mua không đủ |
| BR-004 | ❌ NO | — | — | **GAP: No test for trading hours** |
| BR-005 | ⚠️ PARTIAL | TC-005 | Positive | Only PENDING→FILLED, missing other transitions |
```

**Cách map:**
- Parse Gherkin file, extract scenarios
- Match Scenario description với Business Rule
- Check cả positive và negative test cases
- Nếu thiếu negative case → đánh dấu PARTIAL

### Phase 4: Generate Traceability Matrix & Gap Report

Tổng hợp tất cả vào 1 bảng:

```markdown
## Full Traceability Matrix

| Rule ID | Rule Name | Business-Spec | Tech-Spec Coverage | Test Coverage | Status |
|---------|-----------|---------------|-------------------|---------------|--------|
| BR-001 | Quantity Validation | Section 3.1 | ✅ Section 5.2 | ✅ TC-001, TC-002 | ✅ COMPLETE |
| BR-002 | Price Ceiling/Floor | Section 3.1 | ✅ Section 5.2 | ✅ TC-003 | ✅ COMPLETE |
| BR-003 | Buying Power Check | Section 3.2 | ✅ Section 5.2 | ✅ TC-004 | ✅ COMPLETE |
| BR-004 | Trading Hours | Section 3.3 | ❌ Missing | ❌ Missing | ❌ GAP (Critical) |
| BR-005 | Order Status FSM | Section 3.4 | ✅ Section 4.3 | ⚠️ TC-005 (partial) | ⚠️ INCOMPLETE |

**Summary:**
- Total Business Rules: 5
- Complete: 3 (60%)
- Incomplete: 1 (20%)
- Gap: 1 (20%)
```

## Gap Analysis Report

```markdown
# Gap Analysis Report

**Project:** Order Management System
**Issue Key:** JIRA-123
**Date:** 2024-01-15
**Status:** ❌ NOT READY FOR RELEASE

---

## Executive Summary

**Coverage:**
- Business Rules: 5 total
- Tech-Spec Coverage: 4/5 (80%)
- Test Coverage: 3/5 (60%)
- **Overall Completeness: 60%**

**Gaps Found:** 2 (1 Critical, 1 High)

---

## Critical Gaps (Blocking Release)

### GAP-001: Trading Hours Validation Missing

**Business Rule:** BR-004 — Trading Hours
**Description:** Lệnh chỉ được đặt trong giờ 09:00-15:00

**Missing in:**
- ❌ Tech-Spec: Không có section nào đề cập
- ❌ Test Cases: Không có test scenario

**Impact:** 
- User có thể đặt lệnh ngoài giờ → lệnh bị từ chối bởi Exchange → bad UX
- Không có error message rõ ràng

**Action Required:**
1. **DEV:** Thêm vào Tech-Spec Section 5.2:
   ```python
   def check_trading_hours():
       now = datetime.now(timezone('Asia/Ho_Chi_Minh'))
       if not (9 <= now.hour < 15):
           raise BusinessRuleError("OUTSIDE_TRADING_HOURS", ...)
   ```
2. **QA:** Thêm test case:
   - Positive: Đặt lệnh lúc 10:00 → thành công
   - Negative: Đặt lệnh lúc 16:00 → từ chối với error code OUTSIDE_TRADING_HOURS

**Priority:** P0 (Must Fix Before Release)

---

## High Gaps (Should Fix)

### GAP-002: Order Status FSM Incomplete Test Coverage

**Business Rule:** BR-005 — Order Status State Machine
**Description:** Lệnh chuyển trạng thái theo: PENDING → FILLED/PARTIAL_FILLED/CANCELLED

**Tech-Spec:** ✅ Covered (Section 4.3 có diagram đầy đủ)
**Test Coverage:** ⚠️ PARTIAL — chỉ test PENDING→FILLED

**Missing Test Cases:**
- PENDING → PARTIAL_FILLED
- PARTIAL_FILLED → FILLED
- PARTIAL_FILLED → CANCELLED
- Invalid transitions (FILLED → CANCELLED)

**Action Required:**
1. **QA:** Thêm scenarios trong Gherkin file:
   ```gherkin
   Scenario: Lệnh khớp 1 phần
     Given user đặt lệnh mua 1000 VNM
     When hệ thống khớp được 500
     Then status = PARTIAL_FILLED

   Scenario: Lệnh không được chuyển từ FILLED sang CANCELLED
     Given lệnh đã FILLED
     When user cancel lệnh
     Then hệ thống từ chối với error INVALID_STATE_TRANSITION
   ```

**Priority:** P1 (High)

---

## Recommendations

### Immediate Actions (Before Release)
1. ✅ Fix GAP-001 (Trading Hours) — ETA: 2 hours
   - DEV: Add validation logic
   - QA: Add 2 test cases
2. ✅ Fix GAP-002 (FSM Test Coverage) — ETA: 1 hour
   - QA: Add 4 scenarios

### Process Improvements
1. **Mandatory Traceability Check:** Chạy cross-validation SAU mỗi phase:
   - After Tech-Spec → check vs Business-Spec
   - After Test Design → check vs Tech-Spec
2. **Definition of Done:** Feature chỉ considered "done" khi:
   - Traceability Matrix = 100% coverage
   - No Critical or High gaps
3. **Automation:** Tích hợp cross-validation vào CI/CD pipeline

---

## Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Tech-Spec Coverage | 80% | 100% | ❌ Below |
| Test Coverage | 60% | 100% | ❌ Below |
| Critical Gaps | 1 | 0 | ❌ Blocking |
| High Gaps | 1 | 0 | ⚠️ Warning |

---

## Sign-off

- [ ] DEV fixed GAP-001 (Trading Hours)
- [ ] QA added test cases for GAP-001
- [ ] QA added test cases for GAP-002 (FSM)
- [ ] Re-run cross-validation → 100% coverage
- [ ] Approved by Tech Lead
- [ ] Approved by QA Lead
```

## Checklist Xác minh

Trước khi xuất report:

- [ ] Đã đọc đầy đủ Business-Spec, Tech-Spec, Test Checklist, Gherkin
- [ ] Extract được tất cả Business Rules (không bỏ sót)
- [ ] Map từng Business Rule vào Tech-Spec (có hoặc không)
- [ ] Map từng Business Rule vào Test Cases (complete/partial/missing)
- [ ] Phân loại gaps theo priority (P0/P1/P2)
- [ ] Action items cụ thể cho mỗi gap
- [ ] Metrics và summary chính xác

## Tích hợp với Pipeline

Skill này nằm ở **Phase 2.5** (giữa qa-test-design và qa-auto-design):

```
Phase 1: /ba-spec
   ↓
Phase 1.5: /tech-spec (DEV)
   ↓
Phase 2: /qa-test-design
   ↓
Phase 2.5: /meta-cross-validation ← YOU ARE HERE
   ↓
Phase 3: /qa-auto-design (chỉ khi coverage ≥90%)
   ↓
Phase 4: /qa-run-test
```

**Khi nào invoke:**
- Sau khi QA thiết kế test xong
- Trước khi QA sinh automation code
- Nếu coverage < 90% → STOP, fix gaps trước

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Chạy cross-validation mà chưa có Tech-Spec
- Bỏ qua negative test cases khi đánh giá coverage
- Chấp nhận gaps mà không có action plan
- Map dựa trên keyword matching đơn giản (sai nhiều)

✅ **NÊN:**
- Đọc kỹ từng artifact
- Phân loại gaps theo priority
- Action items cụ thể với owner và ETA
- Re-run sau khi fix để verify

## Xem thêm

- `ba-spec` — Tạo Business-Spec (input)
- `dev-spec-driven-development` — Tạo Tech-Spec (input)
- `qa-test-design` — Tạo Test Cases (input)
- `qa-auto-design` — Sinh automation code (phase sau)
