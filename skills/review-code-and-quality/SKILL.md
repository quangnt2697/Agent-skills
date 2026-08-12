---
name: review-code-and-quality
description: Thực hiện đánh giá code đa chiều (multi-axis code review) kết hợp kiểm soát chất lượng. Kỹ năng này phân chia nhiệm vụ review rõ ràng theo persona: Dev (tập trung vào kiến trúc, logic, hiệu năng, clean code) và QA (tập trung vào độ bao phủ test, edge cases, automation). Sử dụng trước khi merge bất kỳ thay đổi nào vào nhánh chính.
---

# Kỹ năng: Đánh giá Code và Chất lượng (Review Code and Quality)

## Tổng quan

Đánh giá code đa chiều thông qua các cổng kiểm soát chất lượng (quality gates). Mọi thay đổi đều phải được review trước khi merge — không có ngoại lệ. Việc đánh giá (review) bao phủ năm trục: tính chính xác, khả năng đọc hiểu, kiến trúc, bảo mật, và hiệu năng.

**Tiêu chuẩn phê duyệt (Approval standard):** Hãy phê duyệt một thay đổi khi nó chắc chắn cải thiện được sức khỏe tổng thể của codebase, ngay cả khi nó không hoàn hảo. Không tồn tại thứ gọi là code hoàn hảo — mục tiêu là sự cải tiến liên tục. Đừng chặn (block) một thay đổi chỉ vì nó không được viết chính xác theo cách bạn muốn. Nếu nó làm codebase tốt lên và tuân thủ các quy ước của dự án, hãy approve nó.

## Phân chia Trách nhiệm theo Persona (Persona-based Review)

Tuỳ thuộc vào việc bạn đang đóng vai trò (persona) nào, trọng tâm đánh giá của bạn sẽ khác nhau để đảm bảo chất lượng toàn diện mà không giẫm chân lên nhau:

### 1. Góc nhìn của Dev (Software Developer)
Trọng tâm: **Chất lượng mã nguồn, Kiến trúc, và Hiệu năng.**
- **Kiến trúc & Clean Code:** Code mới có tuân thủ SOLID, DRY không? Ranh giới module có bị phá vỡ không? Việc trừu tượng hóa (abstraction) có hợp lý hay đang over-engineering?
- **Hiệu năng & Tối ưu:** Có bị N+1 query không? Các luồng dữ liệu (data flow) và xử lý bất đồng bộ (async/await) đã tối ưu chưa? Có rò rỉ bộ nhớ hay re-render thừa thãi trên UI không?
- **Bảo mật:** Dữ liệu đầu vào có được sanitize không? Tránh lỗi Injection, XSS, v.v.
- **Dọn dẹp:** Xác định "dead code", "magic numbers", code lặp lặp lại để refactor.

### 2. Góc nhìn của QA / SDET
Trọng tâm: **Tính chính xác, Độ bao phủ kiểm thử, và Automation.**
- **Tính chính xác (Correctness):** Code thay đổi có đáp ứng đúng Acceptance Criteria / Tech-Spec không? Các cases có thể gây lỗi (negative cases) đã được lường trước chưa?
- **Độ bao phủ Test (Test Coverage):** Lập trình viên đã viết Unit Test cho logic mới chưa? Test có đi thẳng vào trọng tâm hay chỉ viết cho đủ coverage? Có bỏ sót edge cases hay giá trị biên nào không?
- **Chất lượng Test Code:** Nếu PR có bao gồm code Automation Test, hãy review xem test có độc lập không, dọn dẹp dữ liệu (teardown) có sạch không, mock data có hợp lệ không.
- **Rủi ro hồi quy (Regression Risks):** Thay đổi này có khả năng làm vỡ tính năng ở khu vực nào khác không? Cần thêm test E2E/Integration nào không?

## 5 Trục Đánh giá Cốt lõi (The Five-Axis Review)

Dù ở persona nào, bạn cũng cần quét qua các trục sau:

### 1. Tính Chính xác (Correctness)
- Khớp với spec/task yêu cầu chưa?
- Đã xử lý các trường hợp ngoại lệ (edge cases) chưa (null, rỗng, giá trị biên)?
- Đã xử lý các luồng lỗi (error paths) chưa?
- Các bài test có đang thực sự đi test đúng trọng tâm không?
- Có bị lỗi tương tranh (race conditions) hay state bị thiếu nhất quán không?

### 2. Khả năng Đọc hiểu & Sự Đơn giản (Readability & Simplicity)
- Tên biến có mang tính mô tả và nhất quán với quy ước của dự án không?
- Luồng điều khiển (control flow) có dễ nhìn không (tránh dùng if/else lồng nhau quá sâu)?
- Code có được tổ chức logic không?
- Có thể viết bằng ít số dòng code hơn không?
- Có các "xác chết" (dead code) cần xóa không?

### 3. Kiến trúc (Architecture)
- Tuân theo các mô hình (patterns) hiện tại hay đang đẻ ra cái mới?
- Đoạn refactor này làm giảm độ phức tạp hay chỉ đơn giản là bê độ phức tạp đi chỗ khác?
- Logic của một tính năng cụ thể có đang bị rò rỉ vào trong một module dùng chung (shared) không?
- Ranh giới kiểu dữ liệu (type boundaries) có rõ ràng không?

### 4. Bảo mật (Security)
- Dữ liệu người dùng nhập (user input) đã được validate và làm sạch chưa?
- Các khóa bí mật (secrets) đã được giấu khỏi code chưa?
- Phân quyền (Auth) đã đặt đúng chỗ chưa?
- Các câu query SQL đã được tham số hóa chưa?

### 5. Hiệu năng (Performance)
- Có N+1 query patterns nào không?
- Có vòng lặp vô tận hay lấy dữ liệu không giới hạn nào không?
- Endpoint lấy danh sách có quên phân trang (pagination) không?

## Phân loại Các Ghi chú (Categorize Findings)

Dán nhãn cho mọi comment với mức độ nghiêm trọng (severity) để tác giả biết đâu là bắt buộc vs tùy chọn:

| Tiền tố (Prefix) | Ý nghĩa | Hành động của Tác giả (Author Action) |
|--------|---------|---------------|
| *(Không có tiền tố)* | Bắt buộc phải thay đổi | Bắt buộc phải sửa trước khi merge |
| **Critical:** | Chặn không cho merge | Lỗ hổng bảo mật, mất data, tính năng hỏng |
| **Nit:** | Lặt vặt, tùy chọn | Tác giả có thể kệ (ignore) — format, style cá nhân |
| **Optional:** / **Consider:** | Gợi ý | Đáng để cân nhắc nhưng không bắt buộc |
| **FYI** | Chỉ mang tính cung cấp thông tin | Không cần làm gì — chỉ để tham khảo sau này |

## Checklist cho việc Đánh giá (Review Checklist)

```markdown
## Đánh giá Chất lượng Code: [Tên PR/Thay đổi]

### Góc nhìn (Persona) áp dụng: [Dev / QA]

### Bối cảnh (Context)
- [ ] Tôi hiểu thay đổi này làm gì và tại sao cần làm

### Các vấn đề Nghiêm trọng (Critical & Required)
- [Liệt kê các vấn đề bắt buộc phải sửa - Phân loại theo Trục Đánh giá]

### Đề xuất Cải thiện (Optional & Nit)
- [Liệt kê các gợi ý]

### Những Điểm Làm Tốt (What's Done Well)
- [Lời khen ngợi cụ thể]

### Phán quyết cuối cùng (Verdict)
- [ ] **Approve** — Đã sẵn sàng để Merge
- [ ] **Yêu cầu thay đổi (Request changes)** — Bắt buộc phải giải quyết các issues
```

## Các Dấu hiệu Cảnh báo (Red Flags)
- Type "LGTM" trong khi chả có mẩu bằng chứng nào chứng minh bạn đã đọc code.
- Chấp nhận câu chót lưỡi đầu môi "I'll fix it later" — yêu cầu dọn dẹp trước khi merge.
- Thay đổi khiến cái file đang to vãi cứt còn to hơn, thay vì chặt nhỏ nó ra.
- Fix Bug tạo PR mà không thèm kèm cái bài test regression vào.

## Kết hợp
- **Kích hoạt trực tiếp khi:** user yêu cầu đánh giá chất lượng (review code) của một đoạn mã, file, hoặc một Pull Request cụ thể.
- **Lệnh tương tác:** Gọi thông qua lệnh `/review`. Lệnh này sẽ định tuyến prompt dựa trên persona hiện tại (Dev hoặc QA) để đưa ra lăng kính đánh giá phù hợp nhất.
