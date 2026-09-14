# Checklist Xác Minh, Red Flags & Anti-Patterns

## Checklist Xác minh

Trước khi submit Tech-Spec cho review:

- [ ] Đã đọc kỹ Business-Spec
- [ ] Architecture Decision đã được discuss với team
- [ ] API Contract align với API style guide của dự án
- [ ] Data Model không conflict với schema hiện có
- [ ] Business Logic cover tất cả Business Rules từ Business-Spec
- [ ] Error Handling cover edge cases
- [ ] Testing Strategy rõ ràng với coverage target
- [ ] Non-Functional Requirements đã được quantify (số liệu cụ thể)
- [ ] Dependencies đã được xác nhận available
- [ ] Open Questions đã được list đầy đủ

## Tích hợp với DEV Pipeline

Tech-Spec nằm ở **Giai đoạn 1** trong DEV pipeline:

```
Giai đoạn 1         Giai đoạn 2         Giai đoạn 3
/tech-spec     →    /plan          →    /build
Thiết kế kỹ thuật  Chia task nhỏ      Code implementation
```

**Sau khi Tech-Spec approved:**
- Chuyển sang `/plan` để chia nhỏ thành tasks
- Hoặc nếu đơn giản, chuyển thẳng sang `/build`

## Dấu hiệu Cảnh báo (Red Flags)

Các triệu chứng cho thấy Tech-Spec chưa sẵn sàng bàn giao cho `/plan` và `/build`:

- Có Business Rule trong `*-final.md` không tìm được chỗ nào trong Tech-Spec nhắc tới
- Non-Functional Requirement viết bằng tính từ: "nhanh", "ổn định", "chịu tải tốt"
- API Contract chỉ có happy path, không định nghĩa response khi lỗi
- Error Codes có mã nhưng không nói rõ mã nào trả về trong tình huống nào
- Database Schema thiếu ràng buộc (`nullable`, `unique`, index) — QA không viết được test trùng dữ liệu
- State machine vẽ trạng thái nhưng không liệt kê các chuyển đổi bị cấm
- Mục Open Questions rỗng ở một feature không tầm thường — nghĩa là chưa nghĩ đủ sâu, không phải đã rõ hết
- Tech-Spec mô tả giải pháp mà không nói vì sao loại bỏ phương án khác (thiếu Architecture Decision)
- Dùng thư viện/pattern không có trong tech stack hiện tại mà không giải trình
- Dev đọc xong vẫn phải hỏi "cái này lưu ở đâu / gọi ai / trả về gì"

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Viết Tech-Spec mà chưa đọc Business-Spec
- Copy-paste boilerplate không customize cho project
- Over-design — thiết kế quá phức tạp cho yêu cầu đơn giản
- Under-design — thiếu chi tiết, team không biết code gì
- Bỏ qua Error Handling
- Không quantify Non-Functional Requirements (nói "nhanh" thay vì "<200ms")

✅ **NÊN:**
- Đọc kỹ Business-Spec trước
- Align với tech stack hiện có
- Chi tiết đủ để team code không cần hỏi lại
- Cover edge cases và error scenarios
- Quantify mọi requirement (số liệu cụ thể)
- Review với team trước khi submit

