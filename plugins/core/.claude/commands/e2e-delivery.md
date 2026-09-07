---
description: "Chạy full end-to-end delivery pipeline từ Jira issue đến code + test hoàn chỉnh. Bao gồm cả QA và DEV workflows — ba-spec → tech-spec → plan → build → qa-test → review → report."
---

Thực hiện **end-to-end delivery** cho $ARGUMENTS (Jira issue key), bao gồm cả QA/BA và DEV workflows trong 1 pipeline duy nhất.

## Tổng quan

Command này orchestrate cả 2 personas (QA/BA và DEV) để deliver một feature hoàn chỉnh từ Jira issue đến production-ready code + tests.

**Input:** Jira Issue Key (VD: JIRA-123)

**Output:**
- ✅ Business Spec analyzed
- ✅ Tech Spec designed
- ✅ Implementation plan
- ✅ Code implemented
- ✅ QA test cases designed
- ✅ Automation tests written + passed
- ✅ Code reviewed
- ✅ Ready for merge

## Pipeline Flow (8 Phases — Optimized)

```
Phase 1:  ba-spec                    [BA/PO] Import & analyze Jira
   ↓
Phase 2:  tech-spec                  [DEV]   Design technical solution
   ↓
Phase 3:  cross-validation           [Meta]  Verify BR → Tech-Spec mapping
   ↓
Phase 4:  plan                       [DEV]   Break down into tasks
   ↓
Phase 5:  build                      [DEV]   Implement code
   ↓
Phase 6:  unit-test                  [DEV]   Write & run unit tests
   ↓
Phase 7:  qa-full-pipeline           [QA]    Full QA workflow (design → automation → execution)
         (replaces old Phases 7-10)
   ↓
Phase 8:  review                     [DEV+QA] Final review before merge
```

**Major change:** Phases 7-10 consolidated into single `/qa-full-pipeline` command for efficiency.

## Cú pháp

```bash
# Mặc định: chạy xuyên suốt 8 phase, không dừng
/e2e-delivery {issueKey}

# Dừng sau mỗi phase để review (opt-in)
/e2e-delivery {issueKey} --step
```

| Cờ | Ý nghĩa |
|---|---|
| _(không cờ)_ | Chạy tự động xuyên suốt — đây là mặc định |
| `--step` | Dừng sau mỗi phase chờ user review |

Bộ cờ giống hệt `/qa-full-pipeline` và `/qa-pipeline`. Cú pháp
`--mode semi-auto|full-auto|manual` cũ **không còn dùng**.

**Chỉ dừng luồng** khi rơi vào một trong 5 trường hợp của
`.claude/rules/autonomy-contract.md` — trong đó phase 8 (trước khi merge vào
`main`) là cổng người bắt buộc theo `.claude/rules/git-workflow.md`.
Confidence Level chỉ dùng để báo cáo, không chặn luồng.

## Detailed Phase Breakdown

### Phase 1: ba-spec (QA/BA) — Import & Analyze Jira

**Invoke:** `ba-spec JIRA-123`

**Output:**
- `/project-root/workspace/JIRA-123/spec/final.md`
- Confidence level

**Gate Check:**
- File `final.md` tồn tại và không rỗng → Continue
- Ghi nhận Confidence level vào báo cáo (không chặn luồng)
- Nếu có câu hỏi 🔴 Critical thay đổi bản chất nghiệp vụ → Dừng hỏi user theo `autonomy-contract.md` mục 2.3

---

### Phase 2: dev-spec-driven-development (DEV) — Tech Spec

**Invoke:** `dev-spec-driven-development`

**Input:** Business-Spec từ Phase 1

**Output:**
- `/project-root/workspace/JIRA-123/tech/tech-spec.md`
- Architecture decisions
- API contracts
- Data models
- Confidence level

**Gate Check:**
- File `tech-spec.md` tồn tại và không rỗng → Continue
- Ghi nhận Confidence level vào báo cáo (không chặn luồng)

---

### Phase 3: meta-cross-validation (Meta) — Traceability Check #1

**Invoke:** `meta-cross-validation`

**Input:**
- `/project-root/workspace/JIRA-123/spec/final.md` (Business Rules)
- `/project-root/workspace/JIRA-123/tech/tech-spec.md` (Tech-Spec)

**Output:**
- Traceability matrix: BR → Tech-Spec
- Gap report

**Gate Check:**
- If coverage ≥ 90% → Continue
- If coverage < 90% → Tự bổ sung gaps vào Tech-Spec rồi chạy tiếp

---

### Phase 4: dev-planning-and-task-breakdown (DEV) — Plan

**Invoke:** Skill `dev-planning-and-task-breakdown`

**Input:** Tech-Spec từ Phase 2

**Output:**
- `/project-root/workspace/JIRA-123/tech/plan.md`
- Task list với dependencies

**Gate Check:**
- Always continue (planning phase rarely blocks)

---

### Phase 5: dev-incremental-implementation (DEV) — Build

**Invoke:** `/build auto`

**Input:**
- Plan từ Phase 4
- Tech-Spec từ Phase 2

**Output:**
- Application code trong feature branch
- Git commits (1 commit sau khi done)

**Gate Check:**
- If build success + no syntax errors → Continue
- If build fails → Tự sửa lỗi và chạy lại

---

### Phase 6: dev-test-driven-development (DEV) — Unit Tests

**Invoke:** Skill `dev-test-driven-development`

**Output:**
- Unit test files (`tests/unit/test_*.py` hoặc `*.spec.ts`)
- Test coverage report

**Gate Check:**
- All tests pass → Continue
- If tests fail → Tự debug và sửa test (tối đa 3 vòng theo `autonomy-contract.md`)

---

### Phase 7: qa-full-pipeline (QA) — Full QA Workflow

**Invoke:** `/qa-full-pipeline {issueKey}` (truyền tiếp `--step` nếu có)

**Input:** Business-Spec từ Phase 1

**Includes 5 sub-phases:**
- Phase 7a: Test Design (Checklist + Gherkin)
- Phase 7b: [CỔNG TỰ ĐỘNG] Kiểm tra checklist + P0 + không có [Blocked] → chạy tiếp
- Phase 7c: Test Automation (Generate test code)
- Phase 7d: Test Execution (Run tests + report)
- Phase 7e: Final Traceability Check (meta-cross-validation — BR → Tech-Spec → Tests)

**Output:**
- `/project-root/workspace/JIRA-123/test/checklist.md`
- `/project-root/workspace/JIRA-123/test/JIRA-123.feature`
- `/project-root/workspace/JIRA-123/test/steps/test_*.py`
- `/project-root/workspace/JIRA-123/test/result/summary.md`
- `/project-root/workspace/JIRA-123/trace/matrix.md` (end-to-end traceability)

**Gate Check:**
- If pass rate ≥ 90% AND traceability coverage ≥ 90% → Continue
- If pass rate < 90% → STOP
  - Automation tests fail → QA fix test code
  - Need re-run → `/qa-full-pipeline JIRA-123 --resume=phase3`
- If traceability coverage < 90% → STOP, fix gaps in test design

**Why consolidated:**
- Old layout had Phases 7-10 as separate steps; now unified into `/qa-full-pipeline`
- Reduces context switches (1 command vs 4)
- Auto-handles gates and resume logic
- Traceability check embedded as sub-phase 7e

---

### Phase 8: review (DEV + QA) — Final Review

**Invoke:** `/review` với persona=dev, sau đó persona=qa

**Input:** All code từ Phase 5, 6, 7 + traceability matrix từ Phase 7e

**Output:**
- Code review report
- List of findings (bugs, improvements)

**Gate Check:**
- If 0 critical findings → DONE ✅
- If has critical findings → STOP, fix, re-review
- Phase 8 là cổng người bắt buộc theo `.claude/rules/git-workflow.md` (trước khi merge)

---

## Final Output

Sau khi hoàn thành 8 phases thành công:

```markdown
🎉 **E2E Delivery COMPLETED Successfully**

**Issue:** JIRA-123 — Order Management System
**Total Duration:** 26 phút 40 giây
**Overall Confidence:** 94% (High)

---

## 📊 Phase Summary

| # | Phase | Persona | Status | Confidence | Duration |
|---|-------|---------|--------|------------|----------|
| 1 | ba-spec | BA/PO | ✅ Pass | 92% | 2m 15s |
| 2 | tech-spec | DEV | ✅ Pass | 95% | 4m 30s |
| 3 | cross-validation | Meta | ✅ Pass | 100% | 1m 10s |
| 4 | plan | DEV | ✅ Pass | 90% | 2m 05s |
| 5 | build | DEV | ✅ Pass | 93% | 6m 20s |
| 6 | unit-test | DEV | ✅ Pass | 88% | 3m 15s |
| 7 | qa-full-pipeline | QA | ✅ Pass | 96% | 6m 20s |
| 8 | review | DEV+QA | ✅ Pass | 92% | 45s |

---

## 📦 Deliverables

### Documentation
- ✅ Business Spec: `/project-root/workspace/JIRA-123/spec/final.md`
- ✅ Tech Spec: `/project-root/workspace/JIRA-123/tech/tech-spec.md`
- ✅ Implementation Plan: `/project-root/workspace/JIRA-123/tech/plan.md`
- ✅ Traceability Report: `/project-root/workspace/JIRA-123/trace/matrix.md`

### Code
- ✅ Application Code: `src/services/order_service.py` (+ 5 files)
- ✅ Unit Tests: `tests/unit/test_order_service.py` (+ 3 files)
- ✅ QA Automation: `/project-root/workspace/JIRA-123/test/steps/test_*.py` (8 files)

### Test Artifacts
- ✅ Test Checklist: `/project-root/workspace/JIRA-123/test/checklist.md` (42 items)
- ✅ Gherkin Features: `/project-root/workspace/JIRA-123/test/JIRA-123.feature` (28 scenarios)
- ✅ QA Pipeline Summary: `/project-root/workspace/JIRA-123/test/result/summary.md`
- ✅ Test Report: `/project-root/workspace/JIRA-123/test/result/report.md`

### Git
- ✅ Feature Branch: `feature/JIRA-123-order-management`
- ✅ Commits: 3 commits (clean history)

---

## 🧪 Test Results

### Unit Tests (DEV)
- Total: 24 tests
- Passed: 24 (100%)
- Coverage: 87%

### Automation Tests (QA)
- Total: 28 scenarios
- Passed: 28 (100%)
- Failed: 0

### Overall Pass Rate: 100% ✅

---

## 🔍 Code Review Summary

### DEV Review
- 0 Critical findings
- 2 High findings (code style, minor refactor suggestions)
- 5 Medium findings (documentation improvements)

### QA Review
- 0 Critical findings
- 1 High finding (test data cleanup missing)
- 3 Medium findings (assertions could be more specific)

**All findings documented in:** `/project-root/workspace/JIRA-123/trace/review-report.md`

---

## ✅ Traceability Coverage

### Business Rules → Tech-Spec: 100% (5/5)
### Tech-Spec → Test Cases: 96% (27/28)
### Test Cases → Automation: 100% (28/28)

**Gap:** 1 Tech-Spec item (error handling for timeout) chưa có test case → Low priority edge case

---

## 🚀 Next Steps

1. ✅ **Fix review findings** (optional, non-blocking)
   - 2 High + 8 Medium findings
   - ETA: 30 phút

2. ✅ **Merge to main**
   ```bash
   git checkout main
   git merge --no-ff feature/JIRA-123-order-management
   git push origin main
   ```

3. ✅ **Deploy** (if CI/CD configured)
   - Run deployment pipeline
   - Monitor production

4. ✅ **Close Jira issue**
   - Update status: In Progress → Done
   - Add comment với link to PR/commit

---

## 📈 Metrics

- **Cycle Time:** 28 minutes (Jira → Production-ready)
- **Code Quality:** High (0 critical bugs)
- **Test Coverage:** 87% (unit) + 100% (E2E scenarios)
- **Confidence:** 94% (High)
- **User Interventions:** 0 (chỉ dừng ở cổng commit/merge)

**Estimated Manual Effort Saved:** ~6-8 hours

---

**Ready for Production:** ✅ YES

Tất cả acceptance criteria đã pass, tests đã xanh, code đã review. Feature sẵn sàng merge và deploy.
```

---

## Error Handling

### Error tại Phase X → Rollback Strategy

| Phase | Error | Action |
|-------|-------|--------|
| 1-2 | Spec incomplete | STOP, run ba-interview-me, re-run from Phase 1 |
| 3 | Traceability gaps | Fix Phase 2 (Tech-Spec), re-run Phase 3 |
| 5 | Build fails | Fix code, re-run Phase 5 only |
| 6 | Unit tests fail | Fix app code or tests, re-run Phase 6 |
| 7a-7b | Test design gaps | Fix checklist/Gherkin, re-run Phase 7 |
| 7c-7d | Tests fail (automation) | QA fix test code, re-run `/qa-full-pipeline --resume=phase3` |
| 7e | Traceability gaps | Fix test design, re-run Phase 7 |
| 8 | Critical findings | Fix code, re-run Phase 8 (review) |

**Partial Restart:**
```bash
# Nếu fail ở Phase 7 (test execution), chỉ cần re-run Phase 7
/qa-full-pipeline JIRA-123 --resume=phase3

# Nếu fail ở Phase 5, re-run từ Phase 5 onwards
/build auto
# ... then continue manually or re-run full pipeline
```

---

## Use Cases

### Use Case 1: New Feature (Happy Path)

```bash
/e2e-delivery JIRA-456
# → 8 phases, 25 phút, 0 interventions
# → Merge PR, deploy
```

### Use Case 2: Bug Fix (Simplified Path)

```bash
# Bug fix thường không cần full pipeline
# Chỉ cần: fix code → unit test → qa test
/build auto    # Fix bug
/unit-test     # Verify unit tests
/qa-run-test   # Regression test
```

### Use Case 3: Complex Feature (Manual Review)

```bash
/e2e-delivery JIRA-789 --step
# → Dừng sau mỗi phase
# → User review kỹ từng output
# → Phù hợp với feature critical (payment, auth, security)
```

---

## Comparison: /e2e-delivery vs Separate Commands

| Aspect | /e2e-delivery | Separate Commands |
|--------|---------------|-------------------|
| **Phases** | 8 phases tự động | Manual invoke từng command |
| **Coordination** | Auto-coordinate BA/PO + QA + DEV | User coordinate manually |
| **Duration** | ~22-26 phút | ~6-8 giờ (with manual wait) |
| **Consistency** | Consistent workflow | Có thể skip steps |
| **Traceability** | Built-in (Phase 3, embedded in Phase 7) | Manual verify |
| **Error Recovery** | Auto-detect + rollback | Manual troubleshoot |
| **Best for** | Standard features | Custom/complex flows |

---

## Best Practices

1. **Dùng mặc định (không cờ) cho production work** — pipeline tự chạy, chỉ dừng ở cổng thật
2. **Review traceability reports** — Phase 3 output và Phase 7 (embedded in qa-full-pipeline summary)
3. **Fix findings before merge** — Ít nhất critical + high findings
4. **Re-run tests after code fix** — Không assume tests vẫn pass
5. **Document deviations** — Nếu skip phase hoặc manual fix, ghi chú lý do

---

## Limitations

- **Assumes Jira issue complete** — Nếu spec thiếu, Phase 1 sẽ dừng
- **Requires working test framework** — Pytest/Jest/etc phải setup sẵn
- **No deployment** — Pipeline dừng ở "ready to merge", không auto-deploy
- **Single issue only** — Không support multi-issue features

---

## Troubleshooting

### "Phase 5 (build) takes too long"

**Reason:** Large feature, nhiều files.

**Solution:**
- Break down issue thành sub-tasks nhỏ hơn
- Run `/e2e-delivery` cho từng sub-task
- Hoặc: dùng `/plan` + `/build` riêng với manual control

### "Phase 7 (qa-full-pipeline) fails at test execution"

**Reason:** Test pass rate < 90%.

**Solution:**
1. Read pipeline summary: `/project-root/workspace/JIRA-123/test/result/summary.md`
2. Identify failed test type:
   - E2E test → app code bug OR test code bug
   - Check root cause in report
3. Fix and re-run: `/qa-full-pipeline JIRA-123 --resume=phase3`

### "Want to skip Phase 6 (unit tests)"

**Reason:** Legacy code, không có unit tests.

**Solution:**
- Không nên skip (risk quality)
- Nếu thực sự cần: dùng separate commands thay vì /e2e-delivery
- Hoặc: viết unit tests ngay (investment tốt)

---

## Xem thêm

- `/qa-full-pipeline` — QA-only pipeline (Phases 7a-7c consolidated)
- `/build` — DEV-only implementation (Phase 4-6)
- `meta-cross-validation` — Traceability validation
