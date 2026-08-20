---
description: Chạy full QA pipeline tự động — ba-spec → qa-test-design → qa-auto-design → qa-run-test → báo cáo. Chạy xuyên suốt theo autonomy-contract, thêm --step nếu muốn dừng review sau mỗi phase.
---

Chạy QA pipeline đầy đủ cho `$ARGUMENTS` (Jira issue key), **bao gồm cả bước import Jira**.

Lệnh này = `/ba-spec` + `/qa-full-pipeline`. Phần orchestrate QA nằm trong kỹ năng
`qa-full-pipeline` — đọc `skills/qa-full-pipeline/SKILL.md` và làm theo, không diễn giải lại.

## Quy trình

```
Phase 0: ba-spec           Import Jira/Confluence → {issueKey}-final.md
   ↓
Phase 1-4: qa-full-pipeline   Test design → Automation → Execution → Summary
```

**Phase 0 — `ba-spec`**
1. Kích hoạt kỹ năng `ba-spec` với issue key, truyền nguyên `$ARGUMENTS` xuống.
2. Output: `workspace/{issueKey}/spec/final.md`
3. Cổng chuyển Phase 1: file tồn tại, không rỗng, có mục Acceptance Criteria.
   Đạt → chạy tiếp ngay, log một dòng. Không đạt → xem `autonomy-contract.md`.

**Phase 1-4 — `qa-full-pipeline`**
Kích hoạt kỹ năng `qa-full-pipeline` với cùng `$ARGUMENTS`. Kỹ năng đó tự lo
test design, automation, execution, báo cáo, resume và xử lý lỗi.

## Cú pháp

```bash
# Mặc định: chạy thẳng từ import Jira đến báo cáo, không dừng
/qa-pipeline {issueKey}

# Dừng sau mỗi phase để review (opt-in)
/qa-pipeline {issueKey} --step

# Đã có *-final.md rồi, bỏ qua Phase 0
/qa-full-pipeline {issueKey}
```

Bộ cờ giống hệt `/qa-full-pipeline` — xem bảng trong `.claude/commands/qa-full-pipeline.md`.

> Cú pháp `--mode semi-auto|full-auto|manual` cũ **không còn dùng**. Confidence Level
> chỉ dùng để **báo cáo chất lượng**, không còn chặn luồng — xem
> `.claude/rules/confidence-level.md` và `.claude/rules/autonomy-contract.md`.

## Khi nào dùng lệnh nào

| Tình huống | Lệnh |
|---|---|
| Có issue key, chưa có `*-final.md` | `/qa-pipeline {issueKey}` |
| Đã có `*-final.md` từ BA/PO | `/qa-full-pipeline {issueKey}` |
| Cần cả DEV (tech-spec, code, unit test) lẫn QA | `/e2e-delivery {issueKey}` |
| Chỉ thiết kế test, không automation | `/qa-full-pipeline {issueKey} --no-automation` |
| Đã có test code, chỉ cần chạy lại | `/qa-run-test {issueKey}` |

## Đầu ra

```
workspace/{issueKey}/
├── spec/final.md                    # Phase 0
└── test/
    ├── checklist.md                 # Phase 1
    ├── {issueKey}.feature           # Phase 1
    ├── steps/test_*.py              # Phase 2
    └── result/summary.md            # Phase 4
```

## Báo cáo cuối

Trình bày cho user:
1. Bảng kết quả từng phase (trạng thái, số artifact, thời gian)
2. Tổng kết test: X passed / Y failed / Z skipped
3. Nếu có test FAILED → chi tiết lỗi kèm Request/Response và đề xuất hành động
4. Ma trận truy vết end-to-end: Business Rule → Checklist → Gherkin → Test → Kết quả
5. Đường dẫn tới tất cả output files

LƯU Ý: Mọi output bằng TIẾNG VIỆT (trừ code và tags).

## Xem thêm

- `skills/qa-full-pipeline/SKILL.md` — quy trình QA đầy đủ (nguồn sự thật)
- `skills/ba-spec/SKILL.md` — quy trình import Jira/Confluence
- `.claude/rules/autonomy-contract.md` — cổng dừng/chạy tiếp