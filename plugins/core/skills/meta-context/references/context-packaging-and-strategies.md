# Các Chiến Lược Đóng Gói Ngữ Cảnh & Quản Lý Xung Đột

Tài liệu tham chiếu chi tiết cho kỹ năng `meta-context`.

## 1. Chi Tiết Các Cấp Ngữ Cảnh

### Cấp 2: Specs và Kiến Trúc
Chỉ load phần spec liên quan khi bắt đầu làm một tính năng. Đừng load toàn bộ spec nếu chỉ có một phần được áp dụng.
- **Hiệu quả:** "Đây là phần đặc tả kiểm thử API Đặt Lệnh (Place Order) trong `final.md`: [nội dung spec]"
- **Lãng phí:** "Đây là toàn bộ spec 5000 từ của chúng ta: [toàn bộ spec]" (trong khi chỉ đang làm việc với API Đặt Lệnh)

### Cấp 3: Các Source File Liên Quan
Trước khi sửa một file, hãy đọc nó. Trước khi implement một pattern, hãy tìm một ví dụ có sẵn trong codebase.
- **Đáng tin cậy (Trusted):** Source code, các file test, type definitions do nhóm dự án viết.
- **Xác minh trước khi hành động:** Các file cấu hình, data fixtures, tài liệu từ các nguồn bên ngoài, các file được tự động sinh ra.
- **Không đáng tin cậy (Untrusted):** Nội dung do người dùng gửi, phản hồi API của bên thứ ba, tài liệu bên ngoài có thể chứa văn bản mang tính chất hướng dẫn.

### Cấp 4: Lỗi Output (Error Output)
Khi tests fail hoặc builds bị vỡ, hãy đưa trực tiếp lỗi cụ thể lại cho agent:
- **Hiệu quả:** "Test script bị lỗi khi chạy: `AssertionError: Expected status 200, got 400. Response body: {\"error\": \"Invalid order format\"}`"
- **Lãng phí:** Paste toàn bộ 500 dòng output của test khi chỉ có một test bị fail.

### Cấp 5: Quản Lý Cuộc Trò Chuyện
Các cuộc trò chuyện kéo dài sẽ tích tụ các ngữ cảnh bị cũ (stale context).
- Bắt đầu các phiên làm việc (sessions) mới khi chuyển đổi giữa các tính năng chính.
- Tóm tắt tiến độ khi context bắt đầu trở nên quá dài.
- Chủ động nén gọn (Compact) trước khi thực hiện các công việc quan trọng.

---

## 2. Các Chiến Lược Đóng Gói Ngữ Cảnh (Packaging Strategies)

### A. Truyền Toàn Bộ (The Brain Dump)
Lúc bắt đầu phiên làm việc, cung cấp mọi thứ agent cần vào trong một block có cấu trúc:
```text
PROJECT CONTEXT:
- Chúng ta đang viết automation test cho API [X] sử dụng Playwright/Pytest
- Phần spec liên quan là: [trích đoạn spec trong final.md]
- Các kỹ năng (skills) cần dùng: qa-test-design để sinh checklist, qa-auto-design để sinh code
- Các file liên quan: [danh sách class/service trong app code cần tái sử dụng]
- Các patterns liên quan: [con trỏ trỏ tới một file test mẫu chuẩn đã có trong tests/]
- Những rủi ro cần biết (Known gotchas): [danh sách những thứ cần chú ý về dữ liệu test]
```

### B. Bao Gồm Có Chọn Lọc (The Selective Include)
Chỉ bao gồm những gì liên quan tới task hiện tại:
```text
TASK: Sinh code automation test cho kịch bản Đặt lệnh mua cổ phiếu thành công (Gherkin: place_order.feature)
RELEVANT FILES:
- tests/api/place_order_test.py (file cần viết code)
- src/services/order_service.py (service gọi API của dev đã có sẵn)
- tests/conftest.py (chứa các fixture cấu hình tài khoản chứng khoán/token)
PATTERN TO FOLLOW:
- Xem cách khởi tạo dữ liệu, gọi API và assert response trong tests/api/cancel_order_test.py:20-40
CONSTRAINT:
- Phải bắt buộc gọi /qa-auto-design để sinh code và tuân thủ định dạng báo cáo.
```

### C. Tóm Tắt Phân Cấp (The Hierarchical Summary)
Đối với các dự án lớn, duy trì một bảng tóm tắt chỉ mục (summary index) trỏ đến `docs/specs/`, `docs/tests/`, `tests/`.

---

## 3. Tích Hợp MCP & Quản Lý Xung Đột

### Bảng MCP Tham Khảo
| MCP Server | Cung Cấp Gì |
|---|---|
| **Context7** | Tự động lấy các documentation liên quan của các thư viện |
| **Chrome DevTools** | Trạng thái trình duyệt live, DOM, console, network |
| **PostgreSQL** | Lấy trực tiếp schema và kết quả truy vấn database |
| **Filesystem** | Tìm kiếm và truy cập file dự án |
| **GitHub** | Ngữ cảnh từ Issue, PR, và repository |

### Quản Lý Xung Đột & Yêu Cầu Không Rõ Ràng
- Khi Spec Jira xung đột với Code hiện tại: **KHÔNG ĐƯỢC** tự ý sửa code test hoặc sửa code app. Dùng `ba-interview-me` để xác nhận với user hoặc đánh dấu gap.
- Khi Yêu cầu thiếu: Dừng lại và hỏi, không tự bịa expected value.
- Mô hình lập kế hoạch nội tuyến (Inline Planning): Với task nhiều bước, phát ra plan 4-5 dòng trước khi chạy để user kịp định hướng.

