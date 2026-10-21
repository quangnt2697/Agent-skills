# Hướng Dẫn Chi Tiết Ma Trận Truy Vết (Traceability Guide)

Tài liệu tham chiếu chi tiết cho skill `meta-cross-validation`: Quy trình trích xuất Business Rules, ánh xạ Tech-Spec, Test Cases và lập báo cáo Gap Analysis.

---

## 1. Trích Xuất Business Rules (Phase 1)

Đọc Business-Spec (`workspace/issues/{issueKey}/spec/final.md`) và trích xuất tất cả Business Rules:

| Rule ID   | Rule Name           | Description                               | Priority   | Source      |
|-----------|---------------------|-------------------------------------------|------------|-------------|
| BR-001    | Quantity Validation | Khối lượng phải > 0 và bội số của 100     | P0         | Section 3.1 |
| BR-002    | Price Ceiling/Floor | Giá trong khoảng ±7% giá tham chiếu       | P0         | Section 3.1 |
| BR-003    | Buying Power Check  | Sức mua phải đủ để đặt lệnh               | P0         | Section 3.2 |
| BR-004    | Trading Hours       | Chỉ cho phép đặt lệnh 09:00-15:00         | P1         | Section 3.3 |
| BR-005    | Order Status FSM    | Lệnh chuyển trạng thái theo state machine | P0         | Section 3.4 |

### Cách nhận diện Business Rules:
- Tiêu đề section: "Business Rules", "Validation Rules", "Acceptance Criteria"
- Động từ ràng buộc: "PHẢI", "BẮT BUỘC", "KHÔNG ĐƯỢC", "CHỈ KHI"
- Biểu thức điều kiện: "X >= Y", "X nằm trong [A, B]"
- Kịch bản lỗi và xử lý ngoại lệ (negative cases)

---

## 2. Ánh Xạ Tech-Spec (Phase 2)

Đọc Tech-Spec (`workspace/issues/{issueKey}/tech/tech-spec.md`) và xác minh vị trí hiện thực của từng rule:

| Rule ID   | Covered in Tech-Spec   | Section              | Implementation Note                            |
|-----------|------------------------|----------------------|------------------------------------------------|
| BR-001    | ✅ YES                 | 5.2 Validation Rules | Function `validate_quantity()`                 |
| BR-002    | ✅ YES                 | 5.2 Validation Rules | Function `validate_price()` with floor/ceiling |
| BR-003    | ✅ YES                 | 5.2 Business Logic   | Function `check_buying_power()`                |
| BR-004    | ❌ NO                  | —                    | **GAP: Trading hours check missing**           |
| BR-005    | ✅ YES                 | 4.3 State Machine    | Diagram + transitions table                    |

---

## 3. Ánh Xạ Test Coverage (Phase 3)

Đọc Test Checklist (`test/checklist.md`) và Gherkin Feature (`test/{issueKey}.feature`):

| Rule ID   | Covered by Test   | Test Case ID   | Test Type  | Gherkin Scenario                               |
|-----------|-------------------|----------------|------------|------------------------------------------------|
| BR-001    | ✅ YES            | TC-001         | Positive   | Scenario: Đặt lệnh với quantity=100            |
| BR-001    | ✅ YES            | TC-002         | Negative   | Scenario: Từ chối lệnh với quantity=50         |
| BR-002    | ✅ YES            | TC-003         | Negative   | Scenario: Từ chối lệnh giá vượt trần           |
| BR-003    | ✅ YES            | TC-004         | Negative   | Scenario: Từ chối lệnh khi sức mua không đủ    |
| BR-004    | ❌ NO             | —              | —          | **GAP: No test for trading hours**             |
| BR-005    | ⚠️ PARTIAL        | TC-005         | Positive   | Only PENDING→FILLED, missing other transitions |

---

## 4. Báo Cáo Ma Trận & Gap Analysis (Phase 4)

### Mẫu Full Traceability Matrix (`workspace/issues/{issueKey}/trace/matrix.md`):

```markdown
# Full Traceability Matrix

| Rule ID   | Rule Name           | Business-Spec   | Tech-Spec Coverage   | Test Coverage       | Status            |
|-----------|---------------------|-----------------|----------------------|---------------------|-------------------|
| BR-001    | Quantity Validation | Section 3.1     | ✅ Section 5.2       | ✅ TC-001, TC-002   | ✅ COMPLETE       |
| BR-002    | Price Ceiling/Floor | Section 3.1     | ✅ Section 5.2       | ✅ TC-003           | ✅ COMPLETE       |
| BR-003    | Buying Power Check  | Section 3.2     | ✅ Section 5.2       | ✅ TC-004           | ✅ COMPLETE       |
| BR-004    | Trading Hours       | Section 3.3     | ❌ Missing           | ❌ Missing          | ❌ GAP (Critical) |
| BR-005    | Order Status FSM    | Section 3.4     | ✅ Section 4.3       | ⚠️ TC-005 (partial) | ⚠️ INCOMPLETE     |

**Summary:**
- Total Business Rules: 5
- Complete: 3 (60%)
- Incomplete: 1 (20%)
- Gap: 1 (20%)
```

### Mẫu Gap Analysis Report (`workspace/issues/{issueKey}/trace/gaps.md`):

```markdown
# Gap Analysis Report

**Project:** Order Management System
**Issue Key:** JIRA-123
**Date:** 2026-10-15
**Status:** ❌ NOT READY FOR RELEASE

---

## Executive Summary
- Business Rules: 5 total
- Tech-Spec Coverage: 4/5 (80%)
- Test Coverage: 3/5 (60%)
- Overall Completeness: 60%
- Gaps Found: 2 (1 Critical, 1 High)

---

## Critical Gaps (Blocking Release)

### GAP-001: Trading Hours Validation Missing
- **Business Rule:** BR-004 — Trading Hours
- **Impact:** User có thể đặt lệnh ngoài giờ → lỗi không kiểm soát
- **Action Required:**
  1. DEV: Thêm check_trading_hours() vào Tech-Spec Section 5.2
  2. QA: Thêm positive test (trong giờ) và negative test (ngoài giờ)
- **Priority:** P0 (Must Fix Before Release)

---

## High Gaps (Should Fix)

### GAP-002: Order Status FSM Incomplete Test Coverage
- **Business Rule:** BR-005 — State Machine
- **Tech-Spec:** ✅ Covered
- **Test Coverage:** ⚠️ PARTIAL — chỉ test PENDING → FILLED
- **Action Required:** QA bổ sung test cho PARTIAL_FILLED và CANCELLED
- **Priority:** P1 (High)
```
