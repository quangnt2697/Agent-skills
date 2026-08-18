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
- BẮT BUỘC lưu kế hoạch ra artifact `workspace/{issueKey}/tasks/plan.md` và danh sách task vào `workspace/{issueKey}/tasks/todo.md` với định dạng checklist (`- [ ] Task 1...`) để chuẩn bị cho việc Auto-Build.
- Phân chia các task nhỏ, ưu tiên các lỗi nghiêm trọng hoặc vấn đề kiến trúc cốt lõi làm trước.

### Bước 3: Cổng Chờ Phê duyệt (Approval Gate) - BẮT BUỘC DỪNG
- Trình bày tóm tắt bản Audit và Kế hoạch (Plan) cho người dùng một cách rõ ràng.
- Đặt câu hỏi rõ ràng: *"Tôi đã lập xong kế hoạch tối ưu. Bạn có đồng ý với đề xuất này không? Vui lòng gõ **'OK'** để tôi tự động tiến hành sửa toàn bộ các mục (Auto-Fix)."*
- DỪNG LẠI và chờ phản hồi từ người dùng bằng cách kết thúc lượt trả lời tại đây. Tuyệt đối KHÔNG viết mã hoặc chạy lệnh thay đổi code khi chưa có "OK".
  (Đây là cổng dừng hợp lệ theo trường hợp 5 của `.claude/rules/autonomy-contract.md` — sửa code hàng loạt là hành động khó hoàn tác. Sau khi có "OK", Bước 4 chạy thẳng đến hết, KHÔNG hỏi lại lần nào nữa.)

### Bước 4: Tự động Thực thi (Auto-Fix / Build Auto)
*Tận dụng lăng kính của `incremental-implementation`, `dev-test-driven-development`, `source-driven-development`, `dev-frontend-engineering`, `dev-api-design`.*

**QUAN TRỌNG: Tự động Apply Fixes vào Code bằng CÔNG CỤ (TOOL CALLS)**
- Khi người dùng phản hồi "OK" hoặc "Đồng ý", bạn BẮT BUỘC phải thực hiện hành động **GỌI CÔNG CỤ CỦA HỆ THỐNG** (ví dụ: `replace_file_content`, `multi_replace_file_content`, `write_to_file`, `edit_file`, hoặc bất kỳ công cụ chỉnh sửa file nào mà hệ thống cấp cho bạn) để áp dụng trực tiếp các thay đổi vào mã nguồn.
- **TUYỆT ĐỐI CẤM** việc chỉ in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste — đó là anti-pattern, gây lãng phí thời gian.
- **LUÔN LUÔN** Hành động (Action) thay vì Trò chuyện (Chat).

**Quy trình Auto-Fix (Test-Driven Fix):**
- Tuân thủ nguyên tắc `build auto`: Thực hiện từng task một trong danh sách task ở `workspace/{issueKey}/tasks/todo.md`, cập nhật trạng thái `[x]` vào file.
- **Test-Driven Fix (Bắt buộc):** Với mỗi bug/issue, bạn PHẢI tuân thủ TDD:
  1. **Viết Test trước:** Dùng **Tool Call** để thêm test case tái hiện lỗi. Run test và đảm bảo test FAIL (để chứng minh test bắt đúng lỗi).
  2. **Sửa Code:** Dùng **Tool Call** để sửa file mã nguồn trực tiếp. (Không in Markdown ra màn hình chat).
  3. **Verify:** Run lại test và đảm bảo test PASS.
  4. Nếu test vẫn fail → tự động debug và fix lại (`dev-debugging`).
  5. Đánh dấu task đã hoàn thành `[x]` trong `todo.md`.
- Trong lúc code, BẮT BUỘC tham khảo tài liệu chính thức (`source-driven-development`), thiết kế giao diện chuẩn production (`dev-frontend-engineering`), hoặc định nghĩa API/Types chặt chẽ (`dev-api-design`) tuỳ theo tính chất của task.
- Hoàn thành toàn bộ kế hoạch từ đầu đến cuối MÀ KHÔNG CẦN DỪNG LẠI HỎI Ý KIẾN giữa chừng (trừ khi gặp lỗi nghiêm trọng block toàn bộ).

**Output Format sau mỗi fix:**
```
✅ Fixed: [File path]
- Issue: [Brief description]
- Solution: [What was changed]
- Verification: [Test results if any]
```

**KHÔNG BAO GIỜ:**
- ❌ In ra Markdown code block và bảo người dùng "Hãy dán đoạn code này vào file X".
- ❌ In ra toàn bộ nội dung file mới trên màn hình chat và bảo "Cập nhật file X bằng đoạn code trên".
- ❌ Hỏi "Bạn có muốn tôi apply đoạn code này không?" sau khi đã được approve ở Bước 3.

**LUÔN LUÔN:**
- ✅ Edit file trực tiếp
- ✅ Verify bằng tests
- ✅ Report kết quả ngắn gọn

## Nguyên tắc Chất lượng
- **Đóng khung Phạm vi:** Đừng lan man sang các module không liên quan. Nếu Audit phần Thanh toán, chỉ tập trung vào Thanh toán.
- **Tính An toàn:** Bất kỳ refactor nào cũng phải được chứng minh bằng cách không phá vỡ logic cũ.
- **Tiêu chuẩn Cao:** Mã nguồn sau khi fix phải tuân thủ nghiêm ngặt các quy ước chung (Clean Code, DRY, SOLID).

## Dấu hiệu Cảnh báo (Red Flags)
- Bỏ qua Bước 3 (Approval Gate) và nhảy thẳng vào viết code sửa lỗi.
- Đề xuất kế hoạch quá sơ sài, thiếu đánh giá tận gốc về kiến trúc.
- Khi thực thi (Bước 4) lại dừng liên tục để hỏi người dùng dù họ đã duyệt "chạy tự động".
- **CHỈ show diff/code block** thay vì apply trực tiếp vào file — đây là **ANTI-PATTERN nghiêm trọng**.
- Nói "bạn có muốn tôi apply fix này không?" sau khi đã được approve ở Bước 3.
- Show full file content và nói "replace file X với code này" thay vì dùng Edit tool.

## Kết hợp
- **Kích hoạt trực tiếp qua:** lệnh `/dev-audit`
- **Kích hoạt thông qua:** Việc người dùng yêu cầu "Hãy review và tự sửa lỗi cho tôi".
