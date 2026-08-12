# Confidence Level System

## Tổng quan

Mỗi skill output có **Confidence Level** (mức độ tin cậy) để agent/user đánh giá chất lượng output và quyết định có cần review thêm không. Confidence Level giúp:

1. **Auto/Manual gating** — Pipeline tự động duyệt khi confidence cao (≥90%), dừng lại khi thấp (<90%)
2. **Risk assessment** — User biết output nào cần review kỹ
3. **Quality metrics** — Track chất lượng output theo thời gian

## Confidence Levels

### Level Definitions

| Level | Range | Meaning | Action |
|-------|-------|---------|--------|
| 🟢 **High** | 90-100% | Output hoàn chỉnh, đã verify đầy đủ | Auto-approve OK |
| 🟡 **Medium** | 70-89% | Output đầy đủ nhưng có gaps nhỏ | Ask user confirm 1 lần |
| 🔴 **Low** | <70% | Output thiếu sót hoặc uncertain | STOP, không chạy tiếp |

### Confidence Score Calculation

Mỗi skill tính confidence dựa trên **completeness** và **certainty**:

```python
confidence = (completeness * 0.6) + (certainty * 0.4)

# Completeness: Đã làm xong bao nhiêu % công việc?
# Certainty: Agent chắc chắn bao nhiêu % output đúng?
```

**Example:**

```python
# Skill: qa-test-design
completeness = 0.95  # Đã có checklist + Gherkin đầy đủ
certainty = 0.90     # 90% items có coverage rõ ràng, 10% items edge case chưa chắc

confidence = (0.95 * 0.6) + (0.90 * 0.4) = 0.57 + 0.36 = 0.93 (93%)
# → High confidence ✅
```

## Implementation per Skill

### 1. ba-spec (Import & Analyze Jira)

**Factors affecting confidence:**
- ✅ PDF downloaded successfully → +20%
- ✅ Task type detected (APP/WEB/API) → +15%
- ✅ All sections extracted → +25%
- ✅ No open questions after gap analysis → +40%

**Confidence calculation:**
```python
confidence = 0.0
if pdf_downloaded: confidence += 0.20
if task_type_detected: confidence += 0.15
if all_sections_extracted: confidence += 0.25
if open_questions == 0: confidence += 0.40
elif open_questions <= 3: confidence += 0.30  # Có gaps nhỏ
elif open_questions <= 6: confidence += 0.20  # Có gaps trung bình
else: confidence += 0.10  # Nhiều gaps

# Example: PDF OK, type OK, sections OK, 2 open questions
# confidence = 0.20 + 0.15 + 0.25 + 0.30 = 0.90 (90%) → High
```

**Output format:**
```markdown
**Confidence Level:** 🟢 High (90%)
**Factors:**
- ✅ PDF downloaded and parsed successfully
- ✅ Task type: [WEB] identified
- ✅ All sections extracted: 8/8
- ⚠️ Open questions: 2 (minor gaps in error handling)

**Blockers:** None
```

---

### 2. qa-test-design (Test Design)

**Factors affecting confidence:**
- ✅ Checklist has all P0 items → +30%
- ✅ Gherkin has scenarios for all checklist items → +30%
- ✅ Gherkin passes validation (syntax, format) → +20%
- ✅ Symmetry coverage applied → +20%

**Confidence calculation:**
```python
checklist_p0_coverage = count_p0_items() / expected_p0_items()
gherkin_coverage = count_scenarios() / count_checklist_items()
validation_passed = run_gherkin_validator()
symmetry_applied = check_symmetry_patterns()

confidence = (
    checklist_p0_coverage * 0.30 +
    gherkin_coverage * 0.30 +
    (1.0 if validation_passed else 0.5) * 0.20 +
    (1.0 if symmetry_applied else 0.7) * 0.20
)

# Example: 100% P0, 95% Gherkin coverage, validation pass, symmetry applied
# confidence = (1.0 * 0.30) + (0.95 * 0.30) + (1.0 * 0.20) + (1.0 * 0.20)
#            = 0.30 + 0.285 + 0.20 + 0.20 = 0.985 (98.5%) → High
```

**Output format:**
```markdown
**Confidence Level:** 🟢 High (98%)
**Coverage:**
- Checklist P0 items: 12/12 (100%)
- Gherkin scenarios: 28/30 checklist items (93%)
- Validation: ✅ Pass
- Symmetry patterns: ✅ Applied

**Missing:**
- 2 P2 edge cases not yet covered (low priority)
```

---

### 3. qa-auto-design (Generate Automation Code)

**Factors affecting confidence:**
- ✅ All Gherkin scenarios have test code → +35%
- ✅ Tests pass (at least syntax valid) → +35%
- ✅ Reused existing code (not all from scratch) → +15%
- ✅ No hardcoded credentials/secrets → +15%

**Confidence calculation:**
```python
code_coverage = count_test_files() / count_gherkin_scenarios()
tests_pass = run_tests_dry()  # Just syntax check
reuse_ratio = count_reused_functions() / count_total_functions()
security_check = not has_hardcoded_secrets()

confidence = (
    code_coverage * 0.35 +
    (1.0 if tests_pass else 0.3) * 0.35 +
    reuse_ratio * 0.15 +
    (1.0 if security_check else 0.5) * 0.15
)

# Example: 100% code, tests pass, 80% reuse, no secrets
# confidence = (1.0 * 0.35) + (1.0 * 0.35) + (0.8 * 0.15) + (1.0 * 0.15)
#            = 0.35 + 0.35 + 0.12 + 0.15 = 0.97 (97%) → High
```

**Output format:**
```markdown
**Confidence Level:** 🟢 High (97%)
**Quality:**
- Code coverage: 28/28 scenarios (100%)
- Syntax validation: ✅ Pass
- Code reuse: 24/30 functions (80%)
- Security: ✅ No hardcoded secrets

**Warnings:** None
```

---

### 4. qa-run-test (Run Tests)

**Factors affecting confidence:**
- ✅ Test pass rate ≥90% → High
- ⚠️ Test pass rate 70-89% → Medium
- ❌ Test pass rate <70% → Low

**Confidence calculation:**
```python
pass_rate = passed_tests / total_tests

if pass_rate >= 0.90:
    confidence = 0.90 + (pass_rate - 0.90) * 1.0  # 90-100%
elif pass_rate >= 0.70:
    confidence = 0.70 + (pass_rate - 0.70) * 1.0  # 70-89%
else:
    confidence = pass_rate  # <70%

# Example: 88% pass rate
# confidence = 0.70 + (0.88 - 0.70) * 1.0 = 0.70 + 0.18 = 0.88 (88%) → Medium
```

**Output format:**
```markdown
**Confidence Level:** 🟡 Medium (88%)
**Test Results:**
- Total: 45 tests
- Passed: 40 (88.9%)
- Failed: 3 (6.7%)
- Skipped: 2 (4.4%)

**Action Required:**
- Fix 3 failed tests before proceeding
- Re-run to achieve ≥90% pass rate
```

---

### 5. dev-spec-driven-development (Tech-Spec)

**Factors affecting confidence:**
- ✅ All Business Rules covered in Tech-Spec → +40%
- ✅ API Contract complete (all endpoints) → +25%
- ✅ Data Model complete (schema + ERD) → +20%
- ✅ No open questions → +15%

**Confidence calculation:**
```python
br_coverage = covered_business_rules / total_business_rules
api_completeness = defined_endpoints / expected_endpoints
data_model_completeness = (has_schema and has_erd)
open_questions_penalty = max(0, 1.0 - (open_questions_count * 0.05))

confidence = (
    br_coverage * 0.40 +
    api_completeness * 0.25 +
    (1.0 if data_model_completeness else 0.5) * 0.20 +
    open_questions_penalty * 0.15
)

# Example: 100% BR, 100% API, full data model, 2 open questions
# confidence = (1.0 * 0.40) + (1.0 * 0.25) + (1.0 * 0.20) + (0.90 * 0.15)
#            = 0.40 + 0.25 + 0.20 + 0.135 = 0.985 (98.5%) → High
```

**Output format:**
```markdown
**Confidence Level:** 🟢 High (98%)
**Completeness:**
- Business Rules: 5/5 (100%)
- API Endpoints: 3/3 (100%)
- Data Model: ✅ Complete (schema + ERD + state machine)
- Open Questions: 2 (non-blocking)

**Ready for:** Planning & Implementation
```

---

### 6. meta-cross-validation (Traceability)

**Factors affecting confidence:**
- ✅ All Business Rules mapped → +40%
- ✅ Tech-Spec coverage ≥90% → +30%
- ✅ Test coverage ≥90% → +30%

**Confidence calculation:**
```python
br_mapped = mapped_business_rules / total_business_rules
tech_coverage = tech_covered_rules / total_business_rules
test_coverage = test_covered_rules / total_business_rules

confidence = (
    br_mapped * 0.40 +
    min(tech_coverage / 0.90, 1.0) * 0.30 +
    min(test_coverage / 0.90, 1.0) * 0.30
)

# Example: 100% mapped, 80% tech, 60% test
# confidence = (1.0 * 0.40) + (0.89 * 0.30) + (0.67 * 0.30)
#            = 0.40 + 0.267 + 0.201 = 0.868 (86.8%) → Medium
```

**Output format:**
```markdown
**Confidence Level:** 🟡 Medium (87%)
**Traceability:**
- Business Rules mapped: 5/5 (100%)
- Tech-Spec coverage: 4/5 (80%)
- Test coverage: 3/5 (60%)

**Gaps Found:** 2 (1 Critical, 1 High)
**Action Required:** Fix gaps before release
```

---

## Output Format Standard

Tất cả skills BẮT BUỘC xuất confidence level ở cuối output theo format:

```markdown
---

## 📊 Confidence Assessment

**Confidence Level:** 🟢 High (95%)

**Calculation Breakdown:**
- Completeness: 95% (38/40 items)
- Certainty: 95% (high confidence in output quality)

**Factors:**
- ✅ Factor 1: Description (weight: 30%)
- ✅ Factor 2: Description (weight: 25%)
- ⚠️ Factor 3: Description (weight: 20%) — Minor issue
- ✅ Factor 4: Description (weight: 25%)

**Blockers:** None

**Recommendations:**
- [If Medium/Low] Action 1: Fix this
- [If Medium/Low] Action 2: Review that
```

## Pipeline Auto-Approve Logic

Pipeline (như `/qa-pipeline`) check confidence để quyết định auto-approve:

```python
def should_auto_approve(skill_output):
    confidence = skill_output.get("confidence_level")
    blockers = skill_output.get("blockers", [])
    
    if blockers:
        return False  # Có blockers → STOP
    
    if confidence >= 0.90:
        log(f"[AUTO-APPROVE] Confidence {confidence*100:.0f}% ≥ 90%")
        return True
    elif confidence >= 0.70:
        log(f"[ASK USER] Confidence {confidence*100:.0f}% between 70-90%")
        return ask_user_confirm()
    else:
        log(f"[STOP] Confidence {confidence*100:.0f}% < 70%")
        return False
```

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Tự assigned confidence 100% mặc định
- Bỏ qua confidence assessment
- Confidence dựa trên "cảm giác" thay vì metrics
- Confidence không phản ánh thực tế (test failed nhưng confidence 95%)

✅ **NÊN:**
- Calculate confidence từ metrics đo được
- Honest assessment (thà thấp hơn là overconfident)
- Document factors ảnh hưởng confidence
- Update confidence nếu có thêm thông tin

## Xem thêm

- `qa-pipeline` — Sử dụng confidence cho auto-approve
- `incremental-implementation` — Verify sau mỗi increment
