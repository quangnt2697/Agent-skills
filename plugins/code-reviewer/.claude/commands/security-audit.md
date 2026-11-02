---
description: "Audit bảo mật mã nguồn, phát hiện lỗ hổng OWASP và các vấn đề bảo mật khác"
---

Kích hoạt kỹ năng security-code-audit.

Sử dụng persona Security Auditor để quét mã nguồn, phát hiện các lỗ hổng bảo mật theo chuẩn OWASP Top 10 và các best practices về bảo mật.

Cách sử dụng:
/security-audit [path]

Tham số:
- path (optional): Đường dẫn đến thư mục hoặc file cần audit. Mặc định là thư mục hiện tại.

Quy trình thực hiện:
1. Quét mã nguồn để phát hiện lỗ hổng và kiểm tra theo OWASP Top 10.
2. Xuất báo cáo bảo mật chi tiết:
   - Danh sách lỗ hổng (Critical, High, Medium, Low) kèm `file:line` chính xác
   - Giải thích từng lỗ hổng và code snippet minh họa
   - Khuyến nghị và hướng dẫn fix cụ thể vào `workspace/issues/{issueKey}/trace/security-audit-report.md` (hoặc `workspace/adhoc/security/trace/security-audit-report.md`).

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 1 - READ-ONLY):** Lệnh này CHỈ làm nhiệm vụ quét tĩnh/động phát hiện lỗ hổng và lập báo cáo kiểm toán bảo mật.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM gọi tool `edit_file` hoặc `write_file` để tự ý sửa đổi file mã nguồn dự án. Mọi thay đổi mã nguồn phải do Developer quyết định sau khi đọc báo cáo.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi xuất báo cáo bảo mật, DỪNG LẠI NGAY và bàn giao cho người dùng. CẤM tự ý kích hoạt các skill downstream.
