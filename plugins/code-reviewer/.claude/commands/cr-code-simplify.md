---
description: "Phân tích và đơn giản hóa mã nguồn dựa trên Persona (Dev hoặc QA). Cải thiện tính rõ ràng mà không thay đổi hành vi."
---

Kích hoạt kỹ năng cr-code-simplification.
Hãy phân tích và đơn giản hóa các file được chỉ định (hoặc những file hiện đang mở) dựa trên vai trò (persona) hiện tại của bạn:

1. NẾU LÀ DEV PERSONA:
Tập trung vào:
- Lược bỏ cấu trúc điều khiển (if/else) lồng ghép sâu bằng guard clauses.
- Tách các hàm quá dài thành hàm nhỏ gọn.
- Refactor logic thừa, mã nguồn lặp lặp lại (DRY).
- Dọn dẹp trạng thái và luồng dữ liệu (app code).

2. NẾU LÀ QA PERSONA:
Tập trung vào:
- Tối ưu hóa Gherkin BDD: Xóa bỏ các bước trùng lặp, dùng ngữ nghĩa rõ ràng hơn.
- Refactor Test script: Gộp assertions bằng các hàm tùy chỉnh, giảm thiểu vòng lặp.
- Lược giản Fixtures / Mock data: Xóa các trường JSON dư thừa, dùng Data Builder.
- Dọn dẹp code rác trong Page Object hoặc Teardown.

Dù ở persona nào, BẮT BUỘC duy trì nguyên vẹn hành vi và các bài kiểm tra (tests) hiện có vẫn phải vượt qua. Đừng đụng chạm những gì không hiểu.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 3 - REFACTOR MUTATION):** Lệnh này CHỈ làm nhiệm vụ tinh gọn, đơn giản hóa các file được chỉ định mà không thay đổi logic.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** 
   - TUYỆT ĐỐI CẤM làm sai lệch hành vi logic nghiệp vụ (Zero Behavioral Drift). Toàn bộ tests hiện hữu phải tiếp tục PASS.
   - CẤM commit trực tiếp vào nhánh `main` hoặc `master`.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi refactor và chạy test xác minh thành công, DỪNG LẠI NGAY và xuất trình diff cho người dùng.
