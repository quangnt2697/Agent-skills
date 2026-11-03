---
description: "Chạy full delivery pipeline kiểm thử và chất lượng từ Jira issue: ba-spec → qa-test-design → qa-auto-design → qa-run-test → trace-check → cr-review."
---

Thực hiện **full QA & Quality delivery pipeline** cho $ARGUMENTS (Jira issue key), tích hợp tuần tự các vai trò BA/PO, QA/SDET và Code Reviewer trong 1 pipeline duy nhất.

## Tổng quan

Lệnh này điều phối chuỗi phân tích yêu cầu, thiết kế kiểm thử, sinh mã automation, thực thi test và thẩm định chất lượng test code từ Jira issue đến bộ artifacts hoàn chỉnh.

**Input:** Jira Issue Key (VD: `JIRA-123`, `G3PTP-17057`)

**Output:**
- ✅ Business Spec analyzed (`spec/final.md`)
- ✅ QA Test Checklist (`test/checklist.md`)
- ✅ BDD Gherkin Feature (`test/{issueKey}.feature`)
- ✅ Automation Tests written (`test/steps/test_*.py`)
- ✅ Test Suite executed & logged (`test/result/report.md`, `test-output.log`)
- ✅ Traceability Matrix verified (`trace/matrix.md`)
- ✅ Test Quality & Security Reviewed (`trace/cr-review-report.md`)
- ✅ Ready for Handoff (`trace/delivery-summary.md`)

## Pipeline Flow (6 Phases Tuần Tự)

```
Phase 1: ba-spec           [BA/PO]  Import Jira/Confluence → spec/final.md
   ↓
Phase 2: qa-test-design    [QA]     Thiết kế checklist.md + {issueKey}.feature (qa-validate.sh exit 0)
   ↓
Phase 3: qa-auto-design    [QA]     Sinh mã test Playwright/Pytest (test/steps/) theo sdk-map.json
   ↓
Phase 4: qa-run-test       [QA]     Thực thi kiểm thử qua n8n runner, đo lường trung thực kết quả
   ↓
Phase 5: trace-check       [Script] Xác thực ma trận truy vết 1-1 BR/AC qua trace-check.js --stage=all
   ↓
Phase 6: cr-review         [CR]     Kiểm tra chất lượng mã test, assertions và edge-cases
```

## Cú pháp

```bash
# Mặc định: chạy tự động xuyên suốt theo các Phase Gates
/e2e-delivery {issueKey}

# Dừng sau mỗi phase để user review (opt-in)
/e2e-delivery {issueKey} --step

# Bỏ qua bước sinh mã automation (chỉ chạy spec + test design)
/e2e-delivery {issueKey} --no-automation
```

| Cờ | Ý nghĩa |
|---|---|
| _(không cờ)_ | Chạy tự động xuyên suốt qua các Phase Gate |
| `--step` | Dừng sau mỗi phase chờ user review |
| `--no-automation` | Chỉ chạy Phase 1-2 (dừng sau khi thiết kế test) |

## Chi tiết từng Phase

### Phase 1: ba-spec — Import & Phân tích Yêu cầu
- **Thực thi:** Gọi skill `ba-spec` cho `{issueKey}`.
- **Output:** `workspace/issues/{issueKey}/spec/final.md`.
- **Cổng chuyển:** File `final.md` tồn tại, không rỗng, không có câu hỏi 🔴 Critical chưa giải quyết.

### Phase 2: qa-test-design — Thiết kế Checklist & Gherkin
- **Thực thi:** Gọi skill `qa-test-design` với đầu vào `spec/final.md`.
- **Output:** `workspace/issues/{issueKey}/test/checklist.md` và `test/{issueKey}.feature`.
- **Cổng chuyển:** Script `qa-validate.sh` exit 0, số scenario Gherkin ≥ số checklist item P0.

### Phase 3: qa-auto-design — Sinh Mã Kiểm Thử Tự Động
- **Thực thi:** Gọi skill `qa-auto-design`, kế thừa SDK map và DOM recon.
- **Output:** `workspace/issues/{issueKey}/test/steps/test_*.py` và fixtures.
- **Cổng chuyển:** `pytest --collect-only` exit 0 (scripts parse OK). Nếu lỗi syntax/import, tự sửa tối đa 1 vòng duy nhất theo `autonomy-contract.md`.

### Phase 4: qa-run-test — Thực Thi Kiểm Thử & Ghi Log
- **Thực thi:** Kích hoạt n8n runner thực thi test suite (Pytest).
- **Output:** `workspace/issues/{issueKey}/test/result/report.md` và `test-output.log` (100% logs).
- **Cổng chuyển:** Pass rate ≥ 90%. Nếu < 90%: DỪNG pipeline, phân loại lỗi (Loại 1/2/3) và xuất bug report. CẤM tự ý sửa assertion hay sửa app code.

### Phase 5: trace-check — Kiểm Tra Ma Trận Truy Vết
- **Thực thi:** Chạy `node plugins/core/skills/meta-cross-validation/assets/trace-check.js workspace/issues/{issueKey} --stage=all`.
- **Output:** `workspace/issues/{issueKey}/trace/matrix.md`.
- **Cổng chuyển:** Script exit code = 0 (100% BR/AC được bao phủ).

### Phase 6: cr-review — Đánh Giá Chất Lượng Test
- **Thực thi:** Gọi skill `cr-review-code-and-quality` đánh giá toàn bộ mã test vừa sinh trong `test/steps/`.
- **Output:** `workspace/issues/{issueKey}/trace/cr-review-report.md`.
- **Bàn giao:** Xuất bản `workspace/issues/{issueKey}/trace/delivery-summary.md` tổng hợp toàn bộ kết quả.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 3 - PIPELINE ORCHESTRATOR):** Lệnh này điều phối chuỗi BA Spec → QA Test Design → QA Auto → QA Execution → Traceability → Test Review.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** 
   - TUYỆT ĐỐI CẤM sửa đổi mã nguồn ứng dụng (`src/`, `app/`). Lệnh này CHỈ sinh và sửa mã kiểm thử trong thư mục `test/` của ticket.
   - CẤM tự sửa test assertion hoặc sửa spec để lách qua cổng kiểm thử khi test FAILED.
   - CẤM tự ý cài đặt package mới qua `pip install` hoặc `npm install`.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi hoàn tất xuất bản `delivery-summary.md` ở Phase 6, DỪNG LẠI NGAY và trình kết quả cho người dùng.
