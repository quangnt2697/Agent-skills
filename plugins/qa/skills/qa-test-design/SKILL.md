---
name: qa-test-design
description: Thiết kế bộ artifacts kiểm thử 2 giai đoạn chuẩn mực gồm Checklist kiểm thử thực thi (checklist.md) và kịch bản BDD Gherkin (.feature).
trigger: Khi cần thiết kế test plan, tạo checklist kiểm thử hoặc viết kịch bản BDD Gherkin từ đặc tả nghiệp vụ. Trigger bằng lệnh /qa-test-design.
---

# Kỹ Năng Thiết Kế Kiểm Thử QA (qa-test-design)

## 1. Khi nào dùng?
- Đã có tài liệu đặc tả nghiệp vụ (`workspace/{issueKey}/spec/final.md`).
- Cần chuyển hóa spec thành 2 artifacts kiểm thử chuẩn mực: `checklist.md` (Kiểm thử cái gì) và `{issueKey}.feature` (Kiểm thử như thế nào).
- Chuẩn bị đầu vào cho quá trình sinh mã tự động (`qa-auto-design`) hoặc đồng bộ lên Squash TM (`qa-squash-push`).

**Khi KHÔNG sử dụng:**
- Chưa có spec rõ ràng → Dùng `ba-spec` hoặc `ba-interview-me` trước.
- Đã có kịch bản `.feature` và cần viết code test tự động → Dùng `qa-auto-design`.

## 2. Quy trình 3 Giai đoạn Thiết kế
- **Giai đoạn 1 (Thiết kế Checklist Thực thi `checklist.md`):** Phân tích spec theo 6 chiều kiểm thử chuẩn (Bảo mật, Quy tắc, Toàn vẹn dữ liệu, Đường dẫn chuẩn, Ngoại lệ, Ranh giới). Gán nhãn ưu tiên `[P0]`, `[P1]`, `[P2]`.
- **Giai đoạn 2 (Thiết kế Kịch bản BDD Gherkin `{issueKey}.feature`):** Viết duy nhất 1 file `.feature` ánh xạ 1-1 từ checklist. Dùng ngôn ngữ miền nghiệp vụ thuần túy (cấm biến code, XPath, SQL). Gắn thẻ tags `@smoke`, `@regression`, `@JIRA-{issueKey}` và dùng ranh giới tượng trưng.
- **Giai đoạn 3 (Xác minh Cú pháp & Bàn giao):** Chạy script kiểm tra định dạng Gherkin:
  ```bash
  bash plugins/qa/skills/qa-test-design/assets/qa-validate.sh "workspace/{issueKey}/test/{issueKey}.feature"
  ```
  Nếu có lỗi cú pháp ➔ Tự sửa (Self-fix Loop ≤ 3 vòng). Khi pass ➔ Bàn giao cho `qa-auto-design` hoặc `qa-squash-push`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Script xác minh (assets/):**
  - [qa-init.sh](assets/qa-init.sh): Khởi tạo thư mục và template kiểm thử.
  - [qa-validate.sh](assets/qa-validate.sh): Script tự động thẩm định cú pháp file Gherkin.
- 📖 **Tài liệu quy trình & Checklist nghiệp vụ (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 Nguyên Tắc Vàng, cấu trúc 3 giai đoạn, Anti-patterns và Verification checklist.
  - [qa-testing-checklist.md](references/qa-testing-checklist.md): Kỹ thuật phân vùng tương đương (EP), phân tích giá trị biên (BVA 3 giá trị).
  - Quy chuẩn thị trường chứng khoán: [securities-domain-rules.md](../../../../references/securities-domain-rules.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Yêu cầu: "Kiểm tra giới hạn đặt lệnh tối đa 500,000 cổ phiếu/lệnh trên sàn HOSE".
- **Output:** Kịch bản BDD Gherkin trong `STK-101.feature`:
  ```gherkin
  @regression @boundary @domain-securities @JIRA-STK-101
  Scenario: Từ chối đặt lệnh mua khi khối lượng vượt hạn mức sàn HOSE
    Given Nhà đầu tư đã đăng nhập vào tài khoản giao dịch tiểu khoản đuôi 1
    And Số dư tiền mặt khả dụng đáp ứng đủ giá trị lệnh
    When Nhà đầu tư gửi lệnh mua cổ phiếu "VND" với khối lượng "VUOT_HAN_MUC_SAN"
    Then Hệ thống từ chối nhận lệnh và trả về thông báo lỗi "Khối lượng vượt quá 500,000 cổ phiếu"
  ```
