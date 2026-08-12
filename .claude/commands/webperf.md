---
description: Chạy kiểm toán hiệu năng web qua persona web-performance-auditor
---

`/webperf` nhắm mục tiêu cụ thể vào các ứng dụng web. KHÔNG dùng nó cho thư viện tiện ích, CLI, hoặc code chỉ có trên server (không giao tiếp trình duyệt).

## Xác định chế độ chạy

**Chế độ Sâu (Deep mode)** — kích hoạt khi có một trong các dữ liệu sau:
- File báo cáo JSON của Lighthouse (ví dụ: `npx lighthouse <url> --output json --output-path ./report.json`, hoặc `npx -p chrome-devtools-mcp chrome-devtools lighthouse_audit --output-format=json` từ CLI của Chrome DevTools MCP)
- Phản hồi JSON của PageSpeed Insights (bao gồm Lighthouse + CrUX)
- Phản hồi CrUX API (yêu cầu biến môi trường `$CRUX_API_KEY` hoặc `$GOOGLE_API_KEY` — không bao giờ hard-code các giá trị này trong file cấu hình)
- File trace hiệu năng DevTools
- Một URL đang chạy live kèm server chrome-devtools MCP đã được cấu hình trong harness (lấy số liệu trực tiếp qua các tool `lighthouse_audit` và `performance_*`)
- Gọi CLI Chrome DevTools MCP cục bộ (qua `npx -p chrome-devtools-mcp chrome-devtools <tool>`), rồi đưa JSON output cho agent

**Chế độ Nhanh (Quick mode)** — mặc định khi không có sẵn các dữ liệu trên. Agent sẽ quét source code tìm các anti-pattern về kiến trúc và gắn cờ `potential impact` (tác động tiềm năng) cho mọi phát hiện.

## Chạy kiểm toán

Khởi động subagent `web-performance-auditor`. Cung cấp rõ ràng cho agent:

- Các file, component, hoặc diff đang cần kiểm tra
- Bất kỳ đường dẫn file báo cáo nào (Lighthouse JSON, PSI JSON, CrUX response, trace) hoặc paste JSON data trực tiếp
- URL đích hoặc tên trang (nếu biết)
- Một ghi chú nói rõ bạn muốn chạy chế độ nào (Nhanh hay Sâu), để agent có thể báo lỗi nếu thiếu dữ liệu đầu vào cho Chế độ Sâu.

Subagent sẽ trả về một bảng điểm (chỉ chứa các giá trị có nguồn tham chiếu), danh sách các vấn đề được sắp xếp theo mức độ ưu tiên, các điểm tốt, và các đề xuất hành động.

## Kết quả

Trình bày toàn bộ báo cáo cho người dùng. Không cần tổng hợp hay gộp — lệnh này chỉ chạy cho một persona duy nhất.