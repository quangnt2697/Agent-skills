---
name: qa-full-pipeline
description: Điều phối toàn bộ quy trình kiểm thử QA end-to-end từ phân tích đặc tả, thiết kế test, sinh mã automation đến thực thi và xuất báo cáo trong 1 lệnh duy nhất.
trigger: Khi cần thực hiện toàn trình quy trình QA cho một task Jira hoặc feature mới. Trigger bằng lệnh /qa-full-pipeline {issueKey}.
---

# Kỹ Năng Điều Phối Toàn Trình QA (qa-full-pipeline)

## 1. Khi nào dùng?
- Đã nhận bàn giao file đặc tả nghiệp vụ `workspace/{issueKey}/spec/final.md` từ BA/PO.
- Cần tự động chạy xuyên suốt toàn bộ chuỗi: Thiết kế Checklist & Gherkin (`qa-test-design`) ➔ Đồng bộ Squash TM (`qa-squash-push`) ➔ Sinh mã kiểm thử (`qa-auto-design`) ➔ Thực thi và xuất báo cáo (`qa-run-test`).

**Khi KHÔNG sử dụng:**
- Chưa có `final.md` từ BA/PO → Cần chạy `/ba-spec {issueKey}` trước.
- Chỉ muốn thực hiện riêng lẻ một bước (chỉ viết Gherkin hoặc chỉ chạy test).

## 2. Quy trình 5 Phase Điều phối
- **Phase 0 (Pre-flight Validation):** Kiểm tra sự tồn tại của `final.md`, nạp biến môi trường `.env`, thiết lập trạng thái pipeline.
- **Phase 1 (Test Design - `qa-test-design`):** Sinh `checklist.md`, sinh `{issueKey}.feature` và tự động đồng bộ lên Squash TM (`qa-squash-push`).
- **Phase 2 (Test Automation - `qa-auto-design`):** Khảo sát codebase (Recon), sinh mã phân tầng POM/Service + Test steps, thẩm định cú pháp (`pytest --collect-only`).
- **Phase 3 (Test Execution - `qa-run-test`):** Thực thi toàn bộ test suite, ghi nhận log vào `test-output.log` và xuất báo cáo chi tiết `report.md`.
- **Phase 4 (Summary & Traceability):** Tạo ma trận truy vết (Traceability Matrix) từ Spec ➔ Checklist ➔ Gherkin ➔ Code test ➔ Báo cáo nghiệm thu. Lưu tại `workspace/{issueKey}/trace/traceability-matrix.md`.

## 3. Cú pháp và Tham số Lệnh
- `/qa-full-pipeline {issueKey}`: Chạy tự động xuyên suốt từ Phase 0 đến Phase 4 (tuân thủ Autonomy Contract).
- `/qa-full-pipeline {issueKey} --step`: Dừng lại sau mỗi phase để người dùng duyệt kết quả.
- `/qa-full-pipeline {issueKey} --resume=phase2`: Tiếp tục chạy từ một phase cụ thể nếu trước đó bị gián đoạn.

## ⚡ Quy Tắc Output File (Output File Rules — Bắt buộc tuân thủ)

> 📌 **1 skill call = 1 lần ghi. Gọi lại skill → ghi đè toàn bộ file output của từng phase.**

| Phase | File Output | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|---|
| Phase 1 (Test Design) | checklist.md | `workspace/{issueKey}/test/checklist.md` | **Ghi đè** |
| Phase 1 (Test Design) | Gherkin feature | `workspace/{issueKey}/test/{issueKey}.feature` | **Ghi đè** |
| Phase 2 (Automation) | Test code | `workspace/{issueKey}/test/steps/*.py` | **Ghi đè** từng file |
| Phase 3 (Execution) | Test log | `workspace/{issueKey}/test/result/test-output.log` | **Ghi đè** |
| Phase 3 (Execution) | Report | `workspace/{issueKey}/test/result/report.md` | **Ghi đè** |
| Phase 4 (Summary) | Traceability | `workspace/{issueKey}/trace/traceability-matrix.md` | **Ghi đè** |

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Điều phối (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 Phase, Phase Gates, cơ chế Resume, Red Flags và Verification checklist.
  - [pipeline-states.md](references/pipeline-states.md): Quản lý file trạng thái pipeline và xử lý ngoại lệ.

## 5. Ví dụ mẫu (Few-shot Example)
- **Input:** `/qa-full-pipeline STK-101`
- **Output:**
  ```markdown
  ### 🏁 QA Full Pipeline Hoàn Tất: STK-101
  - **Phase 1 (Test Design):** Đã tạo 12 mục checklist và 5 scenarios BDD.
  - **Phase 2 (Automation):** Đã sinh 5 hàm test Pytest đạt chuẩn POM.
  - **Phase 3 (Execution):** 5/5 PASSED (100%), độ trễ trung bình 120ms.
  - **Phase 4 (Bàn giao):** Ma trận truy vết 1-1 hoàn chỉnh tại `workspace/STK-101/trace/traceability-matrix.md`.
  ```
