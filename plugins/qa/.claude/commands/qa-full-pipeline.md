---
description: "Chạy full QA pipeline từ test design đến test execution trong 1 lệnh. Orchestrate qa-test-design → qa-auto-design → qa-run-test. Sử dụng khi cần workflow tự động end-to-end cho QA testing."
---

Kích hoạt kỹ năng `qa-full-pipeline` với `$ARGUMENTS`.

Đây là **orchestrator QA chuẩn** của repo. Toàn bộ quy trình, cổng chuyển phase,
xử lý lỗi và resume nằm trong `skills/qa-full-pipeline/SKILL.md` — đọc file đó
và làm theo, không tự diễn giải lại ở đây.

## Cú pháp

```bash
# Mặc định: chạy thẳng từ Phase 0 đến Phase 4, không dừng
/qa-full-pipeline {issueKey}

# Dừng sau mỗi phase để review (opt-in)
/qa-full-pipeline {issueKey} --step

# Resume từ phase cụ thể
/qa-full-pipeline {issueKey} --resume=phase2

# Chỉ thiết kế test, không sinh automation
/qa-full-pipeline {issueKey} --no-automation

# Xem trước, không thực thi
/qa-full-pipeline {issueKey} --dry-run
```

| Cờ | Ý nghĩa |
|---|---|
| _(không cờ)_ | Chạy tự động xuyên suốt — đây là mặc định |
| `--step` | Dừng sau mỗi phase chờ user review |
| `--resume=<phase>` | Bắt đầu từ `phase1` / `phase2` / `phase3` |
| `--no-automation` | Dừng sau Phase 1 (chỉ test thủ công) |
| `--no-squash` | Bỏ qua bước đẩy lên Squash TM |
| `--dry-run` | In kế hoạch, không thực thi |

> Cú pháp `--mode semi-auto|full-auto|manual` cũ **không còn dùng**. Toàn repo
> thống nhất một bộ cờ duy nhất ở bảng trên.

## Đầu vào bắt buộc

`/project-root/workspace/{issueKey}/spec/final.md`

Thiếu file này → dừng theo trường hợp 1 của `.claude/rules/autonomy-contract.md`,
hướng dẫn user chạy `/ba-spec {issueKey}` trước. Nếu muốn chạy cả bước import
Jira trong cùng một lệnh, dùng `/qa-pipeline {issueKey}`.

## Đầu ra

```
/project-root/workspace/{issueKey}/test/
├── checklist.md
├── {issueKey}.feature
├── steps/test_*.py
└── result/summary.md
```

## Xem thêm

- `skills/qa-full-pipeline/SKILL.md` — quy trình đầy đủ (nguồn sự thật)
- `skills/qa-full-pipeline/references/pipeline-states.md` — sơ đồ trạng thái
- `/qa-pipeline` — bao gồm cả bước `ba-spec` phía trước
- `/e2e-delivery` — pipeline SDLC đầy đủ (BA → DEV → QA)
- `.claude/rules/autonomy-contract.md` — cổng dừng/chạy tiếp
