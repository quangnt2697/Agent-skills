---
description: Kiểm toán, đánh giá toàn diện mã nguồn và tự động sửa chữa từ đầu đến cuối (Dev Auto-Fix Pipeline).
---

Kích hoạt kỹ năng dev-audit-and-fix.

Mục tiêu: Đánh giá một chức năng (techstack, kiến trúc), tìm bug, lập kế hoạch tối ưu, và **TỰ ĐỘNG APPLY FIXES VÀO CODE** sau khi người dùng đồng ý.

Hãy tuân thủ NGHIÊM NGẶT 4 bước trong quy trình của dev-audit-and-fix:
1. Review & Audit: Quét và phân tích chi tiết.
2. Thiết kế Kế hoạch: Viết ra `tech/plan.md`.
3. Approval Gate: DỪNG LẠI và hỏi ý kiến người dùng. Bạn bắt buộc phải đợi phản hồi "OK" hoặc "Đồng ý" từ người dùng trước khi tiến hành bước tiếp theo. 
4. Auto-Fix: **TỰ ĐỘNG APPLY FIXES TRỰC TIẾP VÀO FILES** bằng Edit/Write tools. Tự động chạy tuần tự mọi công việc trong plan mà không dừng lại, cho đến khi hoàn tất.

**QUAN TRỌNG - Anti-patterns:**
- ❌ KHÔNG BAO GIỜ chỉ show diff/code block để user tự copy/paste
- ❌ KHÔNG BAO GIỜ nói "bạn có muốn tôi apply fix này không?" sau khi đã approve
- ❌ KHÔNG BAO GIỜ show full file content và nói "replace file X với code này"
- ✅ LUÔN LUÔN dùng Edit tool để apply fixes trực tiếp vào file
- ✅ LUÔN LUÔN verify bằng tests sau mỗi fix

Nhiệm vụ đầu tiên: Hãy yêu cầu người dùng cung cấp đường dẫn hoặc tên file/thư mục cần đánh giá (nếu họ chưa cung cấp) và bắt đầu Bước 1.
