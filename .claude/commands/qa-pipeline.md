---
description: Chạy full QA pipeline tự động — ba-spec → qa-test-design → qa-auto-design → qa-run-test → báo cáo. Tự động duyệt giữa các phase dựa trên Confidence Level, chỉ dừng khi confidence < 90% hoặc có blockers.
---

Chạy pipeline QA đầy đủ cho $ARGUMENTS (Jira issue key) ở CHẾ ĐỘ SEMI-AUTO (default) hoặc FULL-AUTO.

## Modes

### 1. Semi-Auto Mode (Default, Recommended)

Pipeline tự động chuyển giữa các phase **CHỈ KHI confidence ≥ 90%**. Dừng lại và hỏi user khi:
- Confidence < 90% (Medium hoặc Low)
- Có blockers critical
- Có open questions không thể tự suy luận

**Usage:**
```bash
/qa-pipeline JIRA-123
# hoặc explicit
/qa-pipeline JIRA-123 --mode semi-auto
```

**Flow:**
```
Phase 1: ba-spec
   ↓ Check confidence
   ├─ ≥90% → Auto continue
   └─ <90% → ASK USER: "Confidence 85%, có 3 open questions. Continue? (Y/n)"
       ├─ Y → Continue
       └─ n → STOP

Phase 2: qa-test-design
   ↓ Check confidence
   ├─ ≥90% → Auto continue
   └─ <90% → ASK USER

... (same for all phases)
```

### 2. Full-Auto Mode (Advanced, Use with Caution)

Pipeline chạy **xuyên suốt không dừng** bất kể confidence. CHỈ dừng khi:
- Gặp lỗi nghiêm trọng không thể self-fix
- User chủ động yêu cầu dừng

**Usage:**
```bash
/qa-pipeline JIRA-123 --mode full-auto
```

**⚠️ Warning:** Full-auto có thể sinh output low-quality nếu confidence thấp. Chỉ dùng khi:
- Đã chạy pipeline này trước đó thành công (retry)
- Issue rất đơn giản, ít rủi ro
- Prototype/spike (không cần chất lượng cao)

### 3. Manual Mode (No Auto-Approve)

Dừng sau MỖI phase để user review và approve.

**Usage:**
```bash
/qa-pipeline JIRA-123 --mode manual
```

---

## Nguyên tắc Semi-Auto (Default Behavior)

**Pipeline tự động approve phase tiếp theo KHI:**
✅ Confidence ≥ 90% (High)
✅ Blockers = 0
✅ Critical errors = 0

**Pipeline dừng lại và hỏi user KHI:**
⚠️ Confidence 70-89% (Medium) — "Có 3 gaps nhỏ, continue? (Y/n)"
❌ Confidence < 70% (Low) — "Output chất lượng thấp, không nên continue. Fix issues trước. (Continue anyway? y/N)"
❌ Có blockers critical — "1 critical blocker: API endpoint missing. Cannot continue."
⚠️ User cần quyết định — "2 implementation approaches possible. Which one? (1/2)"

**Ví dụ Semi-Auto Flow:**

```
[Phase 1: ba-spec]
✅ Completed
📊 Confidence: 92% (High)
   - PDF downloaded ✅
   - Task type: [WEB] ✅
   - Sections: 8/8 ✅
   - Open questions: 1 (minor)
🔄 Auto-continuing to Phase 2...

[Phase 2: qa-test-design]
✅ Completed
📊 Confidence: 78% (Medium)
   - Checklist: 25/30 items (83%)
   - Gherkin: 22/25 scenarios (88%)
   - Missing: 5 edge cases
   
⚠️ Medium confidence detected.
   Issue: 5 edge cases chưa cover (không ảnh hưởng P0/P1)
   
   Continue to Phase 3? (Y/n): _
   
[User: Y]
🔄 Continuing to Phase 3...

[Phase 3: qa-auto-design]
✅ Completed
📊 Confidence: 95% (High)
   - Code: 22/22 scenarios ✅
   - Tests pass: ✅
   - Reuse: 80% ✅
🔄 Auto-continuing to Phase 4...

[Phase 4: qa-run-test]
❌ Completed with failures
📊 Confidence: 65% (Low)
   - Pass rate: 65% (13/20)
   - Failed: 7 tests
   - Critical: 3 tests block release
   
❌ Low confidence detected.
   Issue: 7 failed tests, 3 critical
   Recommendation: Fix tests before proceeding
   
   Continue anyway? (y/N): _
   
[User: N]
⛔ Pipeline STOPPED. Fix issues and re-run.
```

## Pipeline 4 Phase

### Phase 1: Import & Phân tích Yêu cầu (ba-spec)
- Invoke skill `ba-spec` với issue key từ $ARGUMENTS
- Tự động chạy 6 phase: Download PDF → Nhận diện → Trích xuất → Gap analysis
- **Dừng lại NẾU** cần ba-interview-me (hỏi user từng câu một để làm rõ gaps)
- Output: `specs/jira-import/{issueKey}/{issueKey}-final.md`
- → Tự động chuyển Phase 2

### Phase 2: Thiết kế Test (qa-test-design)
- Invoke skill `qa-test-design` với mode từ pipeline
- **Pass parameters:**
  - `autoApprove=true` (nếu mode=full-auto)
  - `autoApprove=false` (nếu mode=manual)
  - Nếu mode=semi-auto: autoApprove dựa trên confidence Phase 1
- Giai đoạn 1: Viết Checklist (P0/P1/P2)
- Giai đoạn 2: Viết Gherkin (.feature) từ checklist
- Chạy `qa-validate.sh` kiểm tra format
- **Output:**
  - `tests/qa-test-design/{issueKey}/features/{issueKey}-checklist.md` + `{issueKey}.feature`
  - `confidence_level: XX%`
- **Check confidence:**
  - If confidence ≥ 90% AND mode != manual → Auto continue Phase 3
  - If confidence 70-89% AND mode = semi-auto → Ask user
  - If confidence < 70% → STOP (recommend fix)
  - If mode = full-auto → Always continue
  - If mode = manual → Always ask user

### Phase 3: Sinh Code & Chạy Test (qa-auto-design)
- Invoke skill `qa-auto-design` với issue key
- Bước 0-2: Scan workspace + đối chiếu .feature
- Bước 3: Tìm & tái sử dụng code dev có sẵn
- Bước 4-5: Sinh test scripts (`test_*.py`)
- Bước 6: Gọi lệnh `/review` hoặc dùng kỹ năng `review-code-and-quality` dưới vai trò QA để review tự động
- Bước 7: Chạy pytest + self-fix loop (chỉ sửa script error, KHÔNG ép FAIL→PASS)
- Output: `tests/qa-test-design/{issueKey}/steps/test_*.py`
- → Tự động chuyển Phase 4

### Phase 4: Xuất Báo cáo
- Sinh báo cáo Markdown từ kết quả pytest
- Bao gồm bảng truy vết end-to-end: Ba-spec → Checklist → Gherkin → Test → Kết quả
- Output: `tests/qa-test-design/{issueKey}/reports/{issueKey}-report.md`

## Sau khi hoàn thành

### Success Case (All phases pass với confidence ≥90%)

```markdown
✅ **QA Pipeline COMPLETED Successfully**

**Issue:** JIRA-123
**Mode:** Semi-Auto
**Duration:** 8 phút 34 giây

**Phase Results:**
| Phase | Status | Confidence | Duration |
|-------|--------|------------|----------|
| ba-spec | ✅ Pass | 92% (High) | 2m 15s |
| qa-test-design | ✅ Pass | 95% (High) | 3m 42s |
| qa-auto-design | ✅ Pass | 97% (High) | 2m 10s |
| qa-run-test | ✅ Pass | 100% (High) | 27s |

**Overall Confidence:** 96% (High)

**Deliverables:**
- Business-Spec: `specs/jira-import/JIRA-123/JIRA-123-final.md`
- Test Checklist: `tests/qa-test-design/JIRA-123/JIRA-123-checklist.md`
- Gherkin Feature: `tests/qa-test-design/JIRA-123/features/JIRA-123.feature`
- Test Code: `tests/qa-test-design/JIRA-123/steps/test_*.py`
- Test Report: `tests/qa-test-design/JIRA-123/reports/JIRA-123-report.md`

**Test Results:**
- Total: 28 tests
- Passed: 28 (100%)
- Failed: 0
- Pass Rate: 100%

**Ready for:** Development (DEV can start coding)
```

### Partial Success Case (Stopped at medium confidence)

```markdown
⚠️ **QA Pipeline STOPPED at Phase 2**

**Issue:** JIRA-123
**Mode:** Semi-Auto
**Stop Reason:** Medium confidence (78%), user chose to stop

**Phase Results:**
| Phase | Status | Confidence | Duration |
|-------|--------|------------|----------|
| ba-spec | ✅ Pass | 92% (High) | 2m 15s |
| qa-test-design | ⚠️ Medium | 78% (Medium) | 3m 42s |
| qa-auto-design | ⏭️ Skipped | — | — |
| qa-run-test | ⏭️ Skipped | — | — |

**Issues Found in Phase 2:**
- 5 edge cases chưa cover trong checklist
- 3 Gherkin scenarios thiếu Examples table

**Recommendations:**
1. Add 5 edge case items vào checklist
2. Update Gherkin scenarios với Examples
3. Re-run pipeline: `/qa-pipeline JIRA-123`

**Next Steps:**
- Fix issues manually, hoặc
- Re-run với `--mode full-auto` để skip (not recommended)
```

### Failure Case

```markdown
❌ **QA Pipeline FAILED at Phase 4**

**Issue:** JIRA-123
**Mode:** Semi-Auto
**Failure Reason:** Test pass rate < 70%

**Phase Results:**
| Phase | Status | Confidence | Duration |
|-------|--------|------------|----------|
| ba-spec | ✅ Pass | 92% (High) | 2m 15s |
| qa-test-design | ✅ Pass | 95% (High) | 3m 42s |
| qa-auto-design | ✅ Pass | 97% (High) | 2m 10s |
| qa-run-test | ❌ Fail | 65% (Low) | 27s |

**Test Results:**
- Total: 28 tests
- Passed: 18 (64.3%)
- Failed: 10 (35.7%)
- Critical Failures: 5

**Failed Tests:**
1. test_order_with_invalid_quantity — API validation missing
2. test_order_outside_trading_hours — Time check not implemented
3. test_insufficient_buying_power — Buying power logic wrong
... (7 more)

**Root Causes:**
- API validation rules not implemented yet (need DEV)
- Test code có bug (need QA fix)

**Recommendations:**
1. **If API not ready:** Wait for DEV implement, then re-run
2. **If test code bug:** Fix test code, then re-run Phase 4 only: `/qa-run-test`

**DO NOT:**
- Merge this test suite to main (failures present)
- Start DEV work based on this (tests not validated)
```

---

## Comparison: Semi-Auto vs Full-Auto vs Manual

| Aspect | Semi-Auto (Default) | Full-Auto | Manual |
|--------|---------------------|-----------|--------|
| **Stop when** | Confidence < 90% | Never (except errors) | After every phase |
| **User intervention** | Only when needed | Minimal | Maximum |
| **Quality assurance** | ✅ High | ⚠️ Variable | ✅ Highest |
| **Speed** | ⚠️ Medium | ✅ Fastest | ❌ Slowest |
| **Risk** | 🟡 Low | 🔴 Medium | 🟢 None |
| **Use case** | Production work | Prototypes, retries | Critical features |
| **Recommended for** | Most cases | Experienced users | New users, critical |

---

## Troubleshooting

### "Pipeline stopped at Phase 2 with 85% confidence"

**Reason:** Semi-auto mode detected medium confidence.

**Solution:**
1. Review output từ Phase 2
2. Fix issues nếu có
3. Chọn:
   - Continue: Type "Y" khi được hỏi
   - Stop & Fix: Type "n", fix manually, re-run
   - Force continue: Re-run với `--mode full-auto`

### "All phases passed but confidence low in Phase 4"

**Reason:** Tests failed (pass rate < 90%).

**Solution:**
1. Review failed tests in report
2. Determine root cause:
   - API not ready → wait for DEV
   - Test code bug → fix test code
   - Requirements changed → update spec, re-run full pipeline
3. Re-run appropriate phase

### "Want to skip Phase 2 approval in semi-auto"

**Reason:** Bạn muốn auto-approve Phase 2 dù confidence medium.

**Solution:**
- Không nên (risk quality)
- Nếu thực sự cần: dùng `--mode full-auto`
- Hoặc: fix issues để đạt ≥90% confidence

---

## Best Practices

1. **Default to semi-auto** — balance tốt nhất giữa speed và quality
2. **Review medium confidence outputs** — 70-89% có thể có gaps
3. **Never ignore low confidence** — <70% gần như chắc chắn có vấn đề
4. **Use full-auto only for retries** — khi đã chạy thành công 1 lần trước đó
5. **Manual mode cho critical features** — features ảnh hưởng tiền/data/security

---

Trình bày cho user:
1. Tổng kết: X passed / Y failed / Z skipped
2. Nếu có test FAILED → hiển thị chi tiết lỗi + đề xuất hành động
3. Đường dẫn đến tất cả output files

LƯU Ý: Tất cả output phải bằng TIẾNG VIỆT (trừ code và tags).
