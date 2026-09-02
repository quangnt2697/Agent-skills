---
name: security-audit
description: Audit bảo mật mã nguồn, phát hiện lỗ hổng OWASP và các vấn đề bảo mật khác
---

# Security Audit

Sử dụng persona Security Auditor để quét mã nguồn, phát hiện các lỗ hổng bảo mật theo chuẩn OWASP Top 10 và các best practices về bảo mật.

## Cách sử dụng

```bash
/security-audit [path]
```

**Tham số:**
- `path` (optional): Đường dẫn đến thư mục hoặc file cần audit. Mặc định là thư mục hiện tại.

## Skills được sử dụng

- `security-code-audit` — Quét mã nguồn để phát hiện lỗ hổng
- `security-owasp-scan` — Kiểm tra theo OWASP Top 10

## Output

Báo cáo bảo mật chi tiết với:
- Danh sách lỗ hổng tìm thấy (theo mức độ: Critical, High, Medium, Low)
- Giải thích từng lỗ hổng
- Code snippet minh họa
- Khuyến nghị cách fix

## Ví dụ

```bash
# Audit toàn bộ dự án
/security-audit

# Audit một thư mục cụ thể
/security-audit src/auth

# Audit một file
/security-audit src/utils/crypto.ts
```