---
description: Dịch ngược Code thành Spec (Reverse Engineering) hỗ trợ đa ngôn ngữ
---

Kích hoạt skill `qa-code2spec`. Đọc file SKILL.md trong thư mục `qa-code2spec` để hiểu luồng thực thi.

$ARGUMENTS chứa đường dẫn tới file mã nguồn (VD: `src/controllers/order.py` hoặc `src/routes/payment.ts`).

## Nguyên tắc thực thi:
1. **KHÔNG** giả định ngôn ngữ lập trình. Tự nhận diện cấu trúc code.
2. Dùng kỹ năng `qa-code-review` để truy vết sâu vào các file được import (Model, Service, DTO). Đừng chỉ đọc file gốc.
3. Kích hoạt `ba-interview-me` để phỏng vấn user về các Điểm mù (Gaps) hoặc Edge cases mà dev chưa xử lý trong code.
4. Tổng hợp thành file `{tên_file}-final.md` xuất ra thư mục `specs/code-import/`. Cấu trúc file final giống hệt như output của lệnh `/ba-spec`.

Sau khi ghi file final thành công, hướng dẫn user gõ `/qa-test-design` để tiếp tục luồng QA automation.
