---
name: dev-audit-and-fix
description: Kiểm toán (audit) toàn diện kiến trúc, techstack, tìm bug và đề xuất tối ưu. Sau khi người dùng đồng ý (OK), tự động chạy quy trình sửa lỗi/code từ đầu đến cuối (tương đương build auto).
---

# Kỹ năng: Kiểm toán & Tự động Sửa (Dev Audit & Auto-Fix)

## Tổng quan
Kỹ năng này cung cấp một quy trình khép kín, một chạm cho Developer: từ việc tự động đánh giá chuyên sâu (Review) một chức năng, tìm ra lỗ hổng/bug, cho đến việc lập kế hoạch (Plan) và tự động sửa chữa (Auto-Build) sau khi nhận được sự phê duyệt của người dùng. Kỹ năng này đóng vai trò như một Pipeline Orchestrator tận dụng các kỹ năng khác.

## Quy trình Thực thi Chặt chẽ (4 Bước)

Bạn BẮT BUỘC phải thực hiện quy trình này một cách tuần tự, không được bỏ qua hay gộp bước:

### Bước 1: Kiểm toán Toàn diện (Audit & Review)
*Tận dụng lăng kính của `review-code-and-quality`, `dev-debugging`, `dev-security` và `dev-performance`.*
- Đọc kỹ mã nguồn của chức năng được yêu cầu (files, folder).
- Đánh giá Kiến trúc (Architecture) & Techstack.
- Tìm kiếm Bug tiềm ẩn, lỗ hổng bảo mật, hoặc những đoạn code quá phức tạp cần đơn giản hoá (Code Smell).
- Trích xuất ra danh sách các vấn đề (Issues) cần giải quyết. KHÔNG tự ý sửa code ở Bước 1.

### Bước 2: Thiết kế Kế hoạch Đề xuất (Planning)
*Tận dụng lăng kính của `planning-and-task-breakdown`.*
- Từ danh sách vấn đề ở Bước 1, lập ra một kế hoạch thực thi rõ ràng.
- BẮT BUỘC lưu kế hoạch ra artifact `tasks-agent/plan.md` với định dạng checklist (`- [ ] Task 1...`) để chuẩn bị cho việc Auto-Build.
- Phân chia các task nhỏ, ưu tiên các lỗi nghiêm trọng hoặc vấn đề kiến trúc cốt lõi làm trước.

### Bước 3: Cổng Chờ Phê duyệt (Approval Gate) - BẮT BUỘC DỪNG
- Trình bày tóm tắt bản Audit và Kế hoạch (Plan) cho người dùng một cách rõ ràng.
- Đặt câu hỏi rõ ràng: *"Tôi đã lập xong kế hoạch tối ưu. Bạn có đồng ý với đề xuất này không? Vui lòng gõ **'OK'** để tôi tự động tiến hành sửa toàn bộ các mục (Auto-Fix)."*
- **DỪNG LẠI (PAUSE LẠI CHỜ NGƯỜI DÙNG PHẢN HỒI).** Tuyệt đối KHÔNG viết mã hoặc chạy lệnh thay đổi code khi chưa có "OK".

### Bước 4: Tự động Thực thi (Auto-Fix / Build Auto)
*Tận dụng lăng kính của `incremental-implementation`, `dev-test-driven-development`, `source-driven-development`, `dev-frontend-engineering`, `dev-api-design`.*
- Khi người dùng phản hồi "OK" hoặc "Đồng ý", hãy bắt tay vào thực thi Kế hoạch ở Bước 2.
- Tuân thủ nguyên tắc `build auto`: Thực hiện từng task một trong `tasks-agent/plan.md`, cập nhật trạng thái `[x]` vào file plan, chạy bộ test nếu có (`dev-test-driven-development`), tự động sửa lỗi (Fix) nếu gặp fail (`dev-debugging`).
- Trong lúc code, BẮT BUỘC tham khảo tài liệu chính thức (`source-driven-development`), thiết kế giao diện chuẩn production (`dev-frontend-engineering`), hoặc định nghĩa API/Types chặt chẽ (`dev-api-design`) tuỳ theo tính chất của task.
- Hoàn thành toàn bộ kế hoạch từ đầu đến cuối MÀ KHÔNG CẦN DỪNG LẠI HỎI Ý KIẾN giữa chừng (trừ khi gặp lỗi nghiêm trọng block toàn bộ).

## Nguyên tắc Chất lượng
- **Đóng khung Phạm vi:** Đừng lan man sang các module không liên quan. Nếu Audit phần Thanh toán, chỉ tập trung vào Thanh toán.
- **Tính An toàn:** Bất kỳ refactor nào cũng phải được chứng minh bằng cách không phá vỡ logic cũ.
- **Tiêu chuẩn Cao:** Mã nguồn sau khi fix phải tuân thủ nghiêm ngặt các quy ước chung (Clean Code, DRY, SOLID).

## Dấu hiệu Cảnh báo (Red Flags)
- Bỏ qua Bước 3 (Approval Gate) và nhảy thẳng vào viết code sửa lỗi.
- Đề xuất kế hoạch quá sơ sài, thiếu đánh giá tận gốc về kiến trúc.
- Khi thực thi (Bước 4) lại dừng liên tục để hỏi người dùng dù họ đã duyệt "chạy tự động".

## Kết hợp
- **Kích hoạt trực tiếp qua:** lệnh `/dev-audit`
- **Kích hoạt thông qua:** Việc người dùng yêu cầu "Hãy review và tự sửa lỗi cho tôi".
