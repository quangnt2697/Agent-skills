---
name: dev-security
description: Gia cố mã nguồn và thiết kế phòng thủ (Security Hardening), kiểm soát ranh giới tin cậy, ngăn ngừa OWASP Top 10 và bảo vệ dữ liệu nhạy cảm.
trigger: Khi xử lý đầu vào từ người dùng, triển khai xác thực (auth), phân quyền (authz), lưu trữ dữ liệu hoặc tích hợp API bên ngoài.
---

# Bảo Mật & Gia Cố Mã Nguồn (Security and Hardening)

## 1. Khi nào dùng?
- Xây dựng tính năng tiếp nhận dữ liệu không đáng tin (HTTP request, form, file upload, webhook).
- Triển khai xác thực (Authentication), phân quyền (Authorization) hoặc quản lý phiên (Sessions).
- Lưu trữ dữ liệu nhạy cảm (PII, thông tin tài khoản ngân hàng, token bảo mật).
- Tích hợp dịch vụ bên thứ ba hoặc các tính năng tích hợp AI/LLM.

## 2. Quy trình Mô hình hóa Mối đe dọa (Threat Model First)
Trước khi viết mã bảo vệ, thực hiện 4 bước phân tích ranh giới:
- **Bước 1 (Xác định ranh giới niềm tin - Trust Boundaries):** Xác định mọi điểm dữ liệu bên ngoài đi vào hệ thống (API params, Headers, Cookies, LLM output...).
- **Bước 2 (Định danh tài sản cần bảo vệ):** Access tokens, mật khẩu, số dư ký quỹ, thông tin tài khoản.
- **Bước 3 (Quét qua mô hình STRIDE):** Spoofing (Giả mạo), Tampering (Sửa đổi), Repudiation (Chối bỏ), Info Disclosure (Lộ lọt thông tin), DoS (Từ chối dịch vụ), Elevation of Privilege (Leo thang đặc quyền).
- **Bước 4 (Áp dụng các biện pháp phòng vệ theo chuẩn OWASP):** Sử dụng parameterized queries, schema validation, rate limiting, hashing an toàn.

## 3. 3 Ranh Giới Bất Di Bất Dịch
- **LUÔN LUÔN LÀM:** Tham số hóa 100% câu truy vấn SQL; Schema validation chặt chẽ tại API gateway; Encode output chống XSS; Dùng HTTPS, HttpOnly/Secure cookies; Băm mật khẩu bằng Argon2/Bcrypt.
- **HỎI TRƯỚC (Cần Human Approval):** Thay đổi logic auth, lưu trữ thêm loại dữ liệu PII mới, mở cấu hình CORS hoặc nới lỏng rate limit.
- **TUYỆT ĐỐI CẤM:** Không commit secrets/API keys vào Git; Không log password/token ra console; Không tin tưởng xác thực ở client; Không dùng `eval()` hoặc ghép chuỗi SQL.

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu kỹ thuật chuyên sâu (references/):**
  - [owasp_mitigations.md](references/owasp_mitigations.md): Mẫu code phòng ngừa chi tiết cho 10 lỗ hổng OWASP (SQL Injection, XSS, CSRF, SSRF, Rate Limiting, File Upload an toàn, LLM Injection).
  - [security_audit_checklist.md](references/security_audit_checklist.md): Hệ thống Ranh giới Ba Cấp, Checklist review bảo mật 7 phương diện, Red Flags và Biện hộ thường gặp.

## 5. Ví dụ mẫu (Few-shot Example)
- **Input:** Kiểm tra tính năng tìm kiếm lịch sử lệnh: `GET /api/v1/orders?symbol=...&from_date=...`
- **Output:**
  ```python
  # Áp dụng Pydantic Schema Validation & Parameterized Query
  class OrderHistoryQuery(BaseModel):
      symbol: constr(regex="^[A-Z0-9]{3,8}$")
      from_date: date
      limit: conint(ge=1, le=100) = 50

  # Truy vấn tham số hóa an toàn, không ghép chuỗi
  query = "SELECT * FROM orders WHERE user_id = :user_id AND symbol = :symbol AND created_at >= :from_date LIMIT :limit"
  ```
