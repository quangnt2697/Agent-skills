---
name: qa-test-design
description: Thiết kế bộ artifacts kiểm thử 2 giai đoạn chuẩn mực gồm Checklist kiểm thử thực thi (checklist.md) và kịch bản BDD Gherkin (.feature). Chỉ thiết kế — KHÔNG viết code test, KHÔNG thực thi test.
trigger: Khi cần thiết kế test plan, tạo checklist kiểm thử hoặc viết kịch bản BDD Gherkin từ đặc tả nghiệp vụ. Trigger bằng lệnh /qa-test-design.
---

# Kỹ Năng Thiết Kế Kiểm Thử QA (qa-test-design)

## ⚠️ RANH GIỚI NHIỆM VỤ (Bắt buộc đọc trước)

| ✅ qa-test-design LÀM | ❌ qa-test-design KHÔNG LÀM |
|---|---|
| Đọc spec/final.md, phân tích yêu cầu | Viết code Python/Pytest/Playwright |
| Thiết kế `checklist.md` theo 6 chiều | Chạy test thực sự lên server |
| Viết kịch bản BDD Gherkin `.feature` | Debug lỗi hệ thống backend |
| Chạy `qa-validate.sh` (kiểm tra cú pháp Gherkin) | Tạo file conftest.py, services/, pages/ |
| Bàn giao artifacts cho `qa-auto-design` | Viết báo cáo kết quả test |

## 1. Khi nào dùng?
- Đã có tài liệu đặc tả nghiệp vụ (`workspace/{issueKey}/spec/final.md`).
- Cần chuyển hóa spec thành 2 artifacts kiểm thử chuẩn mực: `checklist.md` (Kiểm thử cái gì) và `{issueKey}.feature` (Kiểm thử như thế nào).
- Chuẩn bị đầu vào cho quá trình sinh mã tự động (`qa-auto-design`) hoặc đồng bộ lên Squash TM (`qa-squash-push`).

**Khi KHÔNG sử dụng:**
- Chưa có spec rõ ràng → Dùng `ba-spec` hoặc `ba-interview-me` trước.
- Đã có kịch bản `.feature` và cần viết code test tự động → Dùng `qa-auto-design`.

## 2. Quy trình 3 Giai đoạn Thiết kế

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 40 dòng cho toàn bộ quy trình.

- **Giai đoạn 1 (Phân tích Spec & Thiết kế Checklist `checklist.md`):**
  - Đọc `workspace/{issueKey}/spec/final.md` và `../../../../references/securities-domain-rules.md` (nếu domain fintech/chứng khoán).
  - Phân tích theo 6 chiều kiểm thử (Bảo mật, Quy tắc nghiệp vụ, Toàn vẹn dữ liệu, Đường dẫn chuẩn, Ngoại lệ, Ranh giới BVA).
  - Gán nhãn ưu tiên `[P0]`, `[P1]`, `[P2]`. Mỗi item bắt đầu bằng **động từ hành động**, lượng hóa rõ ràng.
  - Tham chiếu kỹ thuật BVA/EP: [qa-testing-checklist.md](references/qa-testing-checklist.md).

- **Giai đoạn 1.5 (Jev Severity Scoring — Optional, sau khi có checklist thô):**

  Nếu `TYPESAFE_API_KEY` có trong env, agent chạy Jev để auto-label severity cho từng test case:

  ```python
  # Gửi state = nội dung test case (mô tả + điều kiện + kết quả kỳ vọng)
  questions = [
      score("Mức độ critical của test case này đối với hệ thống chứng khoán?",
            legend={0: "low — UX phụ, không ảnh hưởng giao dịch",
                    1: "medium — tính năng phụ, có workaround",
                    2: "high — luồng chính, ảnh hưởng trải nghiệm",
                    3: "critical — giao dịch/tiền/bảo mật bị ảnh hưởng"}),
      choice("Test case này thuộc loại nào?",
             options=["happy-path", "edge-case", "negative", "security", "performance", "boundary-bva"])
  ]
  # Mapping score → nhãn ưu tiên:
  # score >= 2.5 → [P0], score >= 1.5 → [P1], score < 1.5 → [P2]
  ```

  **Fallback thủ công (không có API key):** Tiếp tục dùng quy tắc gán nhãn hiện tại:
  - `[P0]`: Boundary BVA + Security + giao dịch tiền/cổ phiếu
  - `[P1]`: Happy path chính + Negative scenario ảnh hưởng UX
  - `[P2]`: Nice-to-have, tính năng phụ, performance không critical

- **Giai đoạn 2 (Thiết kế Kịch bản BDD Gherkin `{issueKey}.feature`):**
  - Viết duy nhất 1 file `.feature` ánh xạ 1-1 từ checklist.
  - Ngôn ngữ miền nghiệp vụ thuần túy — **cấm tuyệt đối** biến code, XPath, SQL, `.env` keys.
  - Dùng ranh giới tượng trưng: `TAI_HAN_MUC`, `VUOT_HAN_MUC`, `TRONG_NGUONG`.
  - Gắn thẻ bắt buộc: `@smoke/@regression`, `@happy-path/@negative`, `@JIRA-{issueKey}`, `@domain-securities`.

- **Giai đoạn 3 (Xác minh Cú pháp & Bàn giao):** Chạy script kiểm tra định dạng Gherkin:
  ```bash
  bash plugins/qa/skills/qa-test-design/assets/qa-validate.sh "workspace/{issueKey}/test/{issueKey}.feature"
  ```
  Nếu có lỗi cú pháp ➔ Tự sửa (Self-fix Loop ≤ 3 vòng). Khi pass 100% ➔ Bàn giao cho `qa-auto-design` hoặc `qa-squash-push`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC:**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc quy trình ≤ 40 dòng.

- 🛠️ **Công cụ & Script (assets/):**
  - [qa-init.sh](assets/qa-init.sh): Khởi tạo thư mục và template kiểm thử.
  - [qa-validate.sh](assets/qa-validate.sh): Script thẩm định cú pháp file Gherkin (6 quy tắc cứng).

- 📖 **Tài liệu quy trình & Kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): 5 Nguyên Tắc Vàng, Anti-patterns, Verification checklist.
  - [qa-testing-checklist.md](references/qa-testing-checklist.md): Kỹ thuật BVA, EP, mẫu kịch bản theo domain.
  - [gherkin-patterns.md](references/gherkin-patterns.md): Mẫu Gherkin chuẩn cho từng loại task (API, WS, Web UI, Securities).
  - [securities-domain-rules.md](../../../../references/securities-domain-rules.md): Cẩm nang nghiệp vụ chứng khoán.

## 4. Ví dụ mẫu (Few-shot Example)

**Input:** Yêu cầu: "Kiểm tra giới hạn đặt lệnh tối đa 500,000 cổ phiếu/lệnh trên sàn HOSE"

**Output Giai đoạn 1 — checklist.md (trích):**
```markdown
## Ranh giới [P0]
- [P0] Xác minh hệ thống TỪ CHỐI lệnh mua khi khối lượng = 500,001 cổ phiếu (VUOT_HAN_MUC) trên sàn HOSE
- [P0] Xác minh hệ thống CHẤP NHẬN lệnh mua khi khối lượng = 500,000 cổ phiếu (TAI_HAN_MUC) trên sàn HOSE
- [P1] Xác minh hệ thống CHẤP NHẬN lệnh mua khi khối lượng = 499,900 cổ phiếu (DUOI_HAN_MUC) trên sàn HOSE
```

**Output Giai đoạn 2 — STK-101.feature (trích):**
```gherkin
@regression @boundary @domain-securities @JIRA-STK-101
Scenario: Từ chối đặt lệnh mua khi khối lượng vượt hạn mức sàn HOSE
  Given Nhà đầu tư đã đăng nhập vào tài khoản giao dịch tiểu khoản đuôi 1
  And Số dư tiền mặt khả dụng đáp ứng đủ giá trị lệnh
  When Nhà đầu tư gửi lệnh mua cổ phiếu "VND" với khối lượng "VUOT_HAN_MUC_SAN"
  Then Hệ thống từ chối nhận lệnh và trả về thông báo lỗi "Khối lượng vượt quá 500,000 cổ phiếu"
```
