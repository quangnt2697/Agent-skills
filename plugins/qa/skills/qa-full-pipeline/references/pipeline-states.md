# Pipeline State & Resume

Cổng dừng/chạy tiếp do `${AGENT_SKILLS_HOME:-.}/.agents/rules/autonomy-contract.md` quyết định — file này chỉ mô tả
**resume** và **rollback**. Confidence Level KHÔNG phải cổng chặn (xem `confidence-level.md`).

## Phase & cổng (tóm tắt)

| Phase | Artifact | Cổng tự động (kiểm bằng lệnh) |
|---|---|---|
| 0 Validation | — | `spec/final.md` tồn tại, không rỗng |
| 1 Test design | `test/checklist.md`, `test/{issueKey}.feature` | `qa-validate.sh` exit 0; số scenario ≥ số mục P0 |
| 2 Automation | `test/steps/test_*.py` | `pytest --collect-only` exit 0; số test ≥ số scenario |
| 3 Execution | `test/result/report.md`, `test/result/test-output.log` | pass rate ≥ 90% (tự sửa ≤ 3 vòng) |
| 4 Summary | `trace/matrix.md`, `test/result/summary.md` | `trace-check.js --stage=all` exit 0; Squash push chỉ khi Phase 3 PASS |

Tất cả cổng đều PASS → chạy tiếp, chỉ log 1 dòng `[AUTO] Phase X → Phase Y (...)`.

## Resume

```bash
/qa-full-pipeline JIRA-123 --resume=phase2   # dùng lại checklist + .feature, sinh lại automation
/qa-full-pipeline JIRA-123 --resume=phase3   # dùng lại code test, chỉ chạy lại test
```

**Chống dùng artifact cũ (stale):** trước khi skip một phase vì artifact đã tồn tại, so thời điểm sửa
đổi với input của nó:

```bash
# final.md mới hơn checklist → checklist đã cũ, KHÔNG được skip Phase 1
[ workspace/JIRA-123/spec/final.md -nt workspace/JIRA-123/test/checklist.md ] && echo STALE
```

Input mới hơn output → chạy lại phase đó và mọi phase phía sau.

## Trạng thái `.pipeline-state.json` (tuỳ chọn)

Ghi tại `workspace/issues/{issueKey}/.pipeline-state.json` — một file cho mỗi issueKey, KHÔNG commit.
Chỉ dùng để đọc `"autoMode": false` (tắt auto) theo `autonomy-contract.md` §4 và ghi phase đã xong:

```json
{ "issueKey": "JIRA-123", "autoMode": true, "completedPhases": ["phase0", "phase1"], "lastUpdate": "2026-08-13T10:35:00Z" }
```

Nguồn sự thật để resume vẫn là artifact trên đĩa + kiểm tra stale ở trên, không phải file này.

## Rollback

| Muốn làm lại | Lệnh |
|---|---|
| Gherkin | xoá `test/{issueKey}.feature` → `--resume=phase1` |
| Code test | xoá `test/steps/` → `--resume=phase2` |
| Toàn bộ QA | xoá `test/` → chạy lại không cờ |

## Chạy song song nhiều issue

Mỗi issueKey có thư mục `workspace/{issueKey}/` riêng nên artifact không đè nhau. Hai rủi ro còn lại:
- **Cùng working tree git:** thay đổi chưa commit của issue A lẫn vào issue B. Chạy mỗi issue trong
  `git worktree add ../wt-{issueKey} -b feature/{issueKey}` riêng.
- **Cùng tài khoản test UAT:** hai bộ pytest đặt lệnh trên cùng tiểu khoản → assert fail giả. Chạy Phase 3
  tuần tự, hoặc dùng tài khoản test riêng cho mỗi issue.

## Ma trận khôi phục lỗi

| Lỗi | Phase | Xử lý |
|---|---|---|
| Thiếu spec | 0 | Dừng (trường hợp 1) — chạy `/ba-spec {issueKey}` trước |
| `qa-validate.sh` exit 1 | 1 | Tự sửa Gherkin ≤ 3 vòng |
| Syntax/import error | 2 | Tự sửa ≤ 3 vòng; thiếu package → cài rồi chạy lại |
| Pass rate < 90% | 3 | Phân loại lỗi (test code / app code / env), tự sửa test code ≤ 3 vòng, còn lại ghi bug |
| `trace-check.js` exit 1 | 4 | Bổ sung scenario cho mã BR/AC thiếu ≤ 3 vòng |
| `trace-check.js` exit 2 | 4 | Ghi gap "final.md thiếu mã BR/AC" vào `trace/gaps.md`, chạy tiếp |
