---
description: "Dịch ngược Code thành Spec (Reverse Engineering) hỗ trợ đa ngôn ngữ"
---

Kích hoạt skill `qa-code2spec`. Đọc file SKILL.md trong thư mục `qa-code2spec` để hiểu luồng thực thi.

$ARGUMENTS chứa đường dẫn tới file mã nguồn (VD: `src/controllers/order.py` hoặc `src/routes/payment.ts`) hoặc reference trên GitLab.

## Nguyên tắc thực thi:
1. **Kiểm tra GitLab trước tiên**: Luôn kiểm tra `git status` và `git fetch` để đảm bảo đang phân tích trên commit mới nhất từ GitLab (hoặc đọc trực tiếp qua GitLab MCP nếu là MR/remote branch).
2. **KHÔNG** giả định ngôn ngữ lập trình. Tự nhận diện cấu trúc code.
3. Truy vết sâu vào các file được import (Model, Service, DTO, 5 yếu tố backend). Đừng chỉ đọc file router/controller.
4. Đối chiếu với cẩm nang nghiệp vụ chứng khoán (`references/securities-domain-rules.md`).
5. Kích hoạt `ba-interview-me` để phỏng vấn user về các Điểm mù (Gaps) hoặc Edge cases chưa rõ.
6. Xuất ra file `/project-root/workspace/issues/{tên_file}/spec/final.md`. Cấu trúc file final tuân thủ chuẩn `profile-api.md` và bắt buộc có header `**Loại task:** 🔌 API` cùng metadata Commit SHA từ GitLab.

Sau khi ghi file final thành công, hướng dẫn user gõ `/qa-test-design` để tiếp tục luồng QA automation.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ đọc hiểu mã nguồn và dịch ngược thành file đặc tả nghiệp vụ `workspace/issues/{tên_file}/spec/final.md`.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM sửa đổi, refactor hoặc xóa bất kỳ file mã nguồn ứng dụng nào đang phân tích.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi ghi file `spec/final.md`, DỪNG LẠI NGAY và xuất trình kết quả. CẤM tự động kích hoạt `/qa-test-design`.
