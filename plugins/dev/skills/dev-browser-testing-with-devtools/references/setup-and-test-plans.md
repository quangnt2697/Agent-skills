# Cài đặt DevTools MCP và mẫu Test Plan

## Cài đặt Chrome DevTools MCP

### Hướng dẫn cài đặt

Thêm đoạn sau vào file `.mcp.json` của dự án hoặc cài đặt Claude Code của bạn:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    }
  }
}
```

`-y` sẽ bỏ qua bước hỏi xác nhận của lệnh `npx install`. Mặc định server sẽ khởi chạy Chrome với một profile chạy riêng biệt (nằm ở `~/.cache/chrome-devtools-mcp/`), tách biệt hoàn toàn với trình duyệt cá nhân của bạn; cờ `--isolated` còn tiến thêm một bước nữa là sử dụng một profile tạm thời và sẽ bị xóa sạch ngay khi trình duyệt đóng lại. Đây là thiết lập chuẩn nhất cho hầu hết các hoạt động testing.

Còn có cờ `--autoConnect` (Chrome 144+, yêu cầu bật remote debugging thông qua `chrome://inspect/#remote-debugging`), cờ này sẽ gắn (attach) agent vào chính Chrome đang **chạy thực** của bạn. CHỈ sử dụng nó khi bài test đó thực sự cần tới trạng thái đã-đăng-nhập của bạn — xin hãy đọc kỹ phần Cách ly Profile (Profile Isolation) ở mục Ranh giới Bảo mật (Security Boundaries) trước.

### Các Công cụ khả dụng

Chrome DevTools MCP cung cấp các khả năng sau:

| Công cụ                  | Công dụng                                             | Khi nào dùng                                                            |
|--------------------------|-------------------------------------------------------|-------------------------------------------------------------------------|
| **Screenshot**           | Chụp lại trạng thái màn hình hiện tại                 | Xác minh trực quan, so sánh trước/sau khi sửa code                      |
| **DOM Inspection**       | Đọc cấu trúc cây DOM đang chạy                        | Xác minh render của component, kiểm tra cấu trúc                        |
| **Console Logs**         | Thu thập các dòng in ra console (log, warn, error)    | Chẩn đoán lỗi, xác minh các đoạn log                                    |
| **Network Monitor**      | Bắt lại các request và response của mạng              | Xác minh các API calls, kiểm tra payload truyền đi                      |
| **Performance Trace**    | Ghi lại dữ liệu thời gian hiệu năng                   | Đo lường thời gian tải trang, tìm điểm nghẽn (bottleneck)               |
| **Element Styles**       | Đọc các style đã tính toán (computed) của các element | Debug lỗi CSS, xác minh giao diện                                       |
| **Accessibility Tree**   | Đọc cây tiếp cận (accessibility tree)                 | Xác minh trải nghiệm cho các thiết bị đọc màn hình (screen reader)      |
| **JavaScript Execution** | Chạy mã JavaScript trong ngữ cảnh của trang           | Kiểm tra trạng thái dạng read-only và debug (xem mục Ranh giới Bảo mật) |


## Viết Test Plans cho các lỗi UI phức tạp

Với những vấn đề UI phức tạp, hãy viết một test plan có cấu trúc rõ ràng để agent có thể làm theo trên trình duyệt:

```markdown
## Test Plan: Lỗi animation khi hoàn thành Task

### Setup
1. Truy cập trang http://localhost:3000/tasks
2. Đảm bảo có ít nhất 3 tasks đang hiển thị

### Các bước
1. Click vào ô checkbox của task đầu tiên
   - Kỳ vọng: Task có hiệu ứng gạch ngang (strikethrough), di chuyển xuống mục "completed"
   - Kiểm tra: Console không được có lỗi
   - Kiểm tra: Network phải gọi PATCH /api/tasks/:id với body là { status: "completed" }

2. Click hoàn tác (undo) trong vòng 3 giây
   - Kỳ vọng: Task quay trở lại danh sách active với animation đảo ngược
   - Kiểm tra: Console không được có lỗi
   - Kiểm tra: Network phải gọi PATCH /api/tasks/:id với body là { status: "pending" }

3. Bấm bật/tắt (toggle) liên tục cùng một task 5 lần
   - Kỳ vọng: Không bị giật/lag giao diện (visual glitches), trạng thái cuối cùng phải đồng nhất
   - Kiểm tra: Không lỗi console, không bị bắn trùng lặp các request mạng
   - Kiểm tra: DOM chỉ hiển thị duy nhất 1 bản sao của cái task đó

### Xác minh
- [ ] Tất cả các bước hoàn thành không có lỗi console
- [ ] Network requests đúng và không bị trùng (duplicated)
- [ ] Trạng thái giao diện đúng với kỳ vọng
- [ ] Accessibility: Các lần thay đổi trạng thái của task đều được thông báo lên screen readers
```

## Xác minh qua Ảnh chụp (Screenshot-Based)

Sử dụng ảnh chụp màn hình (screenshots) để test hồi quy giao diện (visual regression):

```
1. Chụp screenshot "trước" (before)
2. Sửa code
3. Tải lại trang (Reload)
4. Chụp screenshot "sau" (after)
5. So sánh: cái bản sửa này trông có đúng chưa?
```

Cách này đặc biệt giá trị cho:
- Những thay đổi về CSS (layout, khoảng cách, màu sắc)
- Thiết kế tương thích (Responsive) ở nhiều cỡ màn hình khác nhau
- Trạng thái loading và chuyển cảnh (transitions)
- Trạng thái trống (Empty states) và trạng thái lỗi (error states)

## Phân tích Console (Console Analysis Patterns)

### Cần tìm gì

```
Mức độ ERROR:
  ├── Ngoại lệ (Uncaught exceptions) → Bug nằm trong code
  ├── Failed network requests → Lỗi API hoặc CORS
  ├── React/Vue warnings → Component có vấn đề
  └── Cảnh báo bảo mật → CSP, mixed content

Mức độ WARN:
  ├── Cảnh báo loại bỏ (Deprecation warnings) → Các vấn đề tương thích trong tương lai
  ├── Cảnh báo hiệu năng → Tiềm ẩn điểm nghẽn
  └── Cảnh báo khả năng tiếp cận → Lỗi a11y

Mức độ LOG:
  └── Debug output → Dùng để verify luồng chạy và trạng thái của ứng dụng
```

### Tiêu chuẩn "Console Sạch" (Clean Console Standard)

Một trang web đạt chất lượng production phải có **không (0)** console error và warning nào. Nếu console không sạch sẽ, hãy sửa hết các warnings trước khi ship code.

