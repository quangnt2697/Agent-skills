# Quy trình Full Pipeline QA (qa-full-pipeline)

## 1. Quy trình 4 Phases

Pipeline tự động gọi các skills con theo thứ tự:

```text
Phase 0: Validation (Pre-flight)
         └─ Check *-final.md exists from BA/PO

Phase 1: Test Design (qa-test-design)
         ├─ Generate Checklist
         └─ Generate Gherkin (.feature files) + qa-validate.sh (exit 0)

Phase 2: Test Automation (qa-auto-design)
         ├─ Recon & Generate POM/Service
         ├─ Generate test_*.py
         └─ Self-fix loop (syntax errors tối đa 1 vòng)

Phase 3: Test Execution (qa-run-test)
         ├─ Run test suite (pytest)
         └─ Generate report.md

Phase 4: Summary & Traceability
         ├─ trace-check.js --stage=all → trace/matrix.md (exit code là cổng)
         ├─ Tạo summary.md
         └─ Push Squash TM (qa-squash-push) — CHỈ khi pass rate ≥ 90%, bỏ qua nếu có --no-squash
```

> Squash push nằm cuối pipeline vì `squash-push.sh` **xoá** test case/execution cũ theo issueKey
> (không hoàn tác được — trường hợp #5 của `autonomy-contract.md`). Đẩy `.feature` chưa qua
> thực thi lên rồi xoá bản cũ là mất dữ liệu nếu test sau đó fail.

## 2. Command Syntax (Cú pháp lệnh)

- `/qa-full-pipeline {issueKey}`: Chạy thẳng từ Phase 0 đến 4 không dừng.
- `/qa-full-pipeline {issueKey} --step`: Dừng sau mỗi phase để user review.
- `/qa-full-pipeline {issueKey} --resume=phase2`: Resume từ một phase.
- `/qa-full-pipeline {issueKey} --no-automation`: Chỉ chạy thiết kế test (Phase 0-1), skip automation.
- `/qa-full-pipeline {issueKey} --no-squash`: Không đẩy lên Squash TM ở Phase 4.

## 3. Cổng Chuyển Phase (Phase Gate)

Theo hợp đồng tự trị (`autonomy-contract.md`), tự động chạy tiếp nếu:
- File output tồn tại và không rỗng.
- Script validate exit code = 0.
- Số test case sinh ra $\ge$ số scenario.

**Pass rate < 90% ở Phase 3:** dừng báo cáo phân loại lỗi (Loại 1/2/3), KHÔNG push Squash. Tuyệt đối không tự ý sửa assertion hay app code.

**Chỉ dừng khi:** Thiếu file đầu vào bắt buộc, hoặc có item `[Blocked]`, hoặc ở mode `--step`, hoặc có test fail / syntax fail sau 1 vòng tự sửa.

## 4. Cơ chế Phục hồi (Graceful Degradation & Resume)
- **Tự sửa cú pháp tối đa 1 vòng:** Chỉ áp dụng cho lỗi syntax/import của script test vừa sinh theo `autonomy-contract.md`. Nếu vẫn lỗi $\rightarrow$ Dừng và báo cáo nguyên văn cho user.
- **Tự động Resume:** Nếu phát hiện file của phase trước đã tồn tại, báo `Skipping Phase X...` và chạy tiếp.

## 5. Cờ Đỏ Cảnh Báo (Red Flags)
- Pipeline chạy xong quá nhanh (một phase bị skip âm thầm).
- Số test case sinh ra ở Phase 2 ít hơn số scenario trong Gherkin.
- Vòng self-fix chạy quá 1 vòng.
- Dừng lại hỏi user ở chỗ không nằm trong danh sách đóng của hợp đồng tự trị.
- File trạng thái `.pipeline-state.json` bị commit vào git.

## 6. Anti-patterns (Cấm kỵ)
❌ Chạy pipeline khi chưa có file `final.md` từ BA/PO.
❌ Hỏi user xin phép chuyển phase trong khi cổng tự động đã báo PASS.
❌ Bỏ qua các lỗi chặn luồng (blockers) từ phase trước.

## 7. Verification Checklist (Xác minh kết thúc)
- [ ] Cả 4 phase đều có artifact tồn tại.
- [ ] `qa-validate.sh` exit code = 0.
- [ ] Số scenario trong `.feature` $\ge$ số mục P0 trong checklist.
- [ ] Số test case ở Phase 2 $\ge$ số scenario.
- [ ] Có kết quả thực thi thật ở Phase 3 (tổng test > 0).
- [ ] `trace-check.js --stage=all` đã chạy, `trace/matrix.md` tồn tại.
- [ ] Squash push chỉ chạy sau khi pass rate ≥ 90% (hoặc bị bỏ qua bởi `--no-squash`).
- [ ] `.pipeline-state.json` KHÔNG nằm trong staging area của Git.

---
