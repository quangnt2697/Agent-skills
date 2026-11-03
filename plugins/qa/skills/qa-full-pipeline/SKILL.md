---
name: qa-full-pipeline
description: Điều phối toàn bộ quy trình kiểm thử QA end-to-end từ phân tích đặc tả, thiết kế test, sinh mã automation đến thực thi và xuất báo cáo trong 1 lệnh duy nhất.
trigger: Khi cần thực hiện toàn trình quy trình QA cho một task Jira hoặc feature mới. Trigger bằng lệnh /qa-full-pipeline {issueKey}.
disable-auto-invoke: true
---

# Kỹ Năng Điều Phối Toàn Trình QA (qa-full-pipeline)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 3 (PIPELINE ORCHESTRATOR) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey`; n8n đang chạy. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Artifact của từng bước tồn tại; `report.md` do runner ghi, agent không tự viết.

## 1. Khi nào dùng?
- Đã nhận bàn giao file đặc tả nghiệp vụ `workspace/issues/{issueKey}/spec/final.md` từ BA/PO.
- Cần tự động chạy xuyên suốt toàn bộ chuỗi: Thiết kế Checklist & Gherkin (`qa-test-design`) ➔ Sinh mã kiểm thử (`qa-auto-design`) ➔ Thực thi và xuất báo cáo (`qa-run-test`) ➔ Truy vết + đồng bộ Squash TM (`qa-squash-push`, chỉ khi test pass).

**Khi KHÔNG sử dụng:**
- Chưa có `final.md` từ BA/PO → Cần chạy `/ba-spec {issueKey}` trước.
- Chỉ muốn thực hiện riêng lẻ một bước (chỉ viết Gherkin hoặc chỉ chạy test).

## 2. Quy trình 5 Phase Điều phối
- **Phase 0 (Pre-flight Validation):** Kiểm tra sự tồn tại của `final.md`, nạp biến môi trường `.env`, thiết lập trạng thái pipeline.
- **Phase 1 (Test Design - `qa-test-design`):** Sinh `checklist.md`, sinh `{issueKey}.feature`, chạy `qa-validate.sh` (exit 0 mới được đi tiếp).
- **Phase 2 (Test Automation - `qa-auto-design`):** Khảo sát codebase (Recon), sinh mã phân tầng POM/Service + Test steps, thẩm định cú pháp (`pytest --collect-only`).
- **Phase 3 (Test Execution - `qa-run-test`):** Thực thi toàn bộ test suite, ghi nhận log vào `test-output.log` và xuất báo cáo chi tiết `report.md`.
- **Phase 4 (Summary & Traceability):** Chạy `trace-check.js --stage=all` (skill `meta-cross-validation`) sinh `workspace/issues/{issueKey}/trace/matrix.md` theo mã BR/AC. Nếu pass rate ≥ 90% và không có `--no-squash` → đẩy `.feature` lên Squash TM (`qa-squash-push`).

## 3. Cú pháp và Tham số Lệnh
- `/qa-full-pipeline {issueKey}`: Chạy tự động xuyên suốt từ Phase 0 đến Phase 4 (tuân thủ Autonomy Contract).
- `/qa-full-pipeline {issueKey} --step`: Dừng lại sau mỗi phase để người dùng duyệt kết quả.
- `/qa-full-pipeline {issueKey} --resume=phase2`: Tiếp tục chạy từ một phase cụ thể nếu trước đó bị gián đoạn.
- `/qa-full-pipeline {issueKey} --no-automation`: Chỉ Phase 0-1 (dùng cho QA track chạy song song trong `e2e-delivery`).
- `/qa-full-pipeline {issueKey} --no-squash`: Không đẩy Squash TM.

## ⚡ Quy Tắc Output File (Output File Rules — Bắt buộc tuân thủ)

> 📌 **1 skill call = 1 lần ghi. Gọi lại skill → ghi đè toàn bộ file output của từng phase.**

| Phase | File Output | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|---|
| Phase 1 (Test Design) | checklist.md | `workspace/issues/{issueKey}/test/checklist.md` | **Ghi đè** |
| Phase 1 (Test Design) | Gherkin feature | `workspace/issues/{issueKey}/test/{issueKey}.feature` | **Ghi đè** |
| Phase 2 (Automation) | Test code | `workspace/issues/{issueKey}/test/steps/*.py` | **Ghi đè** từng file |
| Phase 3 (Execution) | Test log | `workspace/issues/{issueKey}/test/result/test-output.log` | **Ghi đè** |
| Phase 3 (Execution) | Report | `workspace/issues/{issueKey}/test/result/report.md` | **Ghi đè** |
| Phase 4 (Summary) | Traceability | `workspace/issues/{issueKey}/trace/matrix.md` | **Ghi đè** |

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Điều phối (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 Phase, Phase Gates, cơ chế Resume, Red Flags và Verification checklist.
  - [pipeline-states.md](references/pipeline-states.md): Quản lý file trạng thái pipeline và xử lý ngoại lệ.

## 5. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** `/qa-full-pipeline STK-101`
- **Output:**
  ```markdown
  ### 🏁 QA Full Pipeline Hoàn Tất: STK-101
  - **Phase 1 (Test Design):** Đã tạo 12 mục checklist và 5 scenarios BDD.
  - **Phase 2 (Automation):** Đã sinh 5 hàm test Pytest đạt chuẩn POM.
  - **Phase 3 (Execution):** 5/5 PASSED (100%), độ trễ trung bình 120ms.
  - **Phase 4 (Bàn giao):** Ma trận truy vết 1-1 hoàn chỉnh tại `workspace/issues/STK-101/trace/matrix.md`.
  ```

---
