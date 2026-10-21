# Quy trình Thiết kế Kịch bản BDD (qa-test-design)

## 1. 7 Nguyên Tắc Vàng Khi Thiết Kế Test
1. **Nghiệp Vụ Là Trung Tâm (Domain-Driven):** Mọi test case cho chứng khoán, fintech bắt buộc tuân thủ quy tắc thị trường (biên độ trần/sàn, bước giá, cờ phiên). Tham chiếu [Cẩm nang nghiệp vụ chứng khoán](../../../../../references/securities-domain-rules.md).
2. **Ngôn Ngữ Miền Thuần Nghiệp Vụ (Ubiquitous Language):** Tuyệt đối KHÔNG đưa biến code, tên file cấu hình (như `MAX_CONNECTOR`, `.env`, `WS_URL`) hay selector automation (`xpath`, `url`) vào Gherkin.
3. **Mô Hình Ranh Giới Tượng Trưng (Symbolic Boundaries):** Kiểm thử biên cho quota/rate limit phải dùng các vị trí biên tượng trưng (`TAI_HAN_MUC`, `VUOT_HAN_MUC`, `TRONG_NGUONG`, `VUOT_NGUONG`) thay vì số cứng.
4. **Chuẩn BVA 3 Giá Trị (3-Value BVA):** Giá trị tài chính, khối lượng, tiền phải test đủ bộ: `{Boundary - ε, Boundary, Boundary + ε}`.
5. **Tham Số Hóa Đa Sàn / Đa Mã (Multi-Symbol Parameterization):** Khi kiểm thử tính năng liên quan đến từ 2 sàn hoặc 2 mã chứng khoán có đặc thù phiên/khung giờ/topic khác nhau, **BẮT BUỘC** phải tách riêng Scenario độc lập hoặc sử dụng `Scenario Outline` kèm bảng `Examples` tham số hóa chi tiết. **CẤM TUYỆT ĐỐI** viết scenario gộp chung làm mờ ranh giới thời gian và kênh dữ liệu.
6. **Grounding Dữ Liệu Định Danh Thật:** Mọi dữ liệu định danh (accountNo, symbol, orderId) dùng trong test happy-path/precondition (loại a) phải được tra cứu từ môi trường UAT thật và ghi nhận vào `data-grounding.json`. Nếu không thể, BẮT BUỘC gắn thẻ `[DATA-ASSUMED]` cảnh báo.
7. **Cổng Kiểm Tra Tự Động:** File `.feature` bắt buộc chạy qua script `qa-validate.sh` và tự sửa lỗi (Self-fix Loop ≤ 3 vòng) trước khi bàn giao.

## 2. Quy Trình 3 Giai Đoạn Thiết Kế

### Giai đoạn 1: Thiết kế Checklist Thực thi (`checklist.md`)
- **Nguồn:** Đọc `workspace/issues/{issueKey}/spec/final.md`.
- **Phân loại:** Phân bổ vào 6 chiều kiểm thử chuẩn (Bảo mật, Quy tắc, Toàn vẹn, Dữ liệu, Đường dẫn, Ngoại lệ).
- **Nguyên tắc:** Mỗi item viết bắt đầu bằng động từ hành động, lượng hoá rõ, gán nhãn [P0], [P1], hoặc [P2].
- **Output:** `workspace/issues/{issueKey}/test/checklist.md`

### Giai đoạn 2: Thiết kế Kịch bản BDD Gherkin (`{issueKey}.feature`)
- **Đúng 1 file `.feature`** duy nhất cho toàn bộ task.
- Chứa 1 khối `Feature:` kèm 3 dòng User Story (As a / I want / So that).
- Ánh xạ 1-1 từ Checklist sang Gherkin.
- Gắn tag bắt buộc: `@smoke`, `@regression`, `@happy-path`, `@negative`, `@tier`, `@JIRA-{issueKey}`, `@domain-securities`.
- Bọc payload JSON vào doc strings (`"""..."""`), không viết trên 1 dòng dài.
- **Output:** `workspace/issues/{issueKey}/test/{issueKey}.feature`

### Giai đoạn 3: Xác minh Cú pháp & Bàn giao
Chạy script kiểm tra định dạng Gherkin:
```bash
bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-test-design/assets/qa-validate.sh "workspace/issues/{issueKey}/test/{issueKey}.feature"
```
- Nếu lỗi: Kích hoạt Self-fix Loop (sửa lỗi $\le$ 3 vòng).
- Nếu pass: Gợi ý chạy `/qa-auto-design {issueKey}` hoặc `/qa-squash-push {issueKey}`.

## 3. Anti-patterns (Cấm kỵ)
❌ Nhảy thẳng vào viết Gherkin bỏ qua checklist.
❌ Tự động push Squash TM (đó là trách nhiệm của qa-squash-push).
❌ Để lộ biến kỹ thuật, selector UI, hoặc SQL vào kịch bản BDD.
❌ Hardcode các số chết cho quota thay vì dùng ranh giới tượng trưng.
❌ Tự bịa mã chứng khoán hoặc giá vi phạm biên độ sàn của Sở giao dịch.
❌ Viết scenario gộp chung nhiều sàn hoặc nhiều mã chứng khoán có đặc thù phiên/khung giờ/topic khác nhau vào cùng một Scenario thay vì tách riêng độc lập hoặc dùng `Scenario Outline` kèm `Examples`.

## 4. Cờ Đỏ Cảnh Báo (Red Flags)
- File `.feature` chứa cú pháp kỹ thuật: `#submit-btn`, `//button`, `SELECT *`.
- Scenarios quá dài (> 10 steps) hoặc lặp chu kỳ Given/When/Then.
- Thiếu các ca kiểm thử biên (BVA) hoặc negative cases.
- Bỏ qua bước xác minh `qa-validate.sh`.

## 5. Xác minh (Verification Checklist)
- [ ] Tồn tại `checklist.md` (đủ 6 chiều, gán P0/P1/P2).
- [ ] Đã thực hiện data grounding, có file `data-grounding.json` trong `test/fixtures/`.
- [ ] Tồn tại `{issueKey}.feature` (1 khối Feature, có User Story).
- [ ] Mọi Scenario ánh xạ 1-1 về checklist, có gắn tags chuẩn.
- [ ] Dùng ranh giới tượng trưng (`TAI_HAN_MUC`).
- [ ] Dữ liệu định danh đã được grounded vào UAT hoặc có nhãn `[DATA-ASSUMED]`.
- [ ] Sạch bóng biến code, selector, query SQL.
- [ ] Pass 100% khi chạy `qa-validate.sh`.

---
