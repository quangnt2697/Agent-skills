---
name: security-code-audit
description: Quét mã nguồn để phát hiện lỗ hổng bảo mật theo chuẩn OWASP Top 10 và các best practices.
trigger: Sử dụng khi cần audit bảo mật trước khi deploy production hoặc sau khi thêm tính năng liên quan đến auth, payment, hoặc xử lý dữ liệu nhạy cảm.
---

# Kỹ năng: Security Code Audit

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Đường dẫn mã nguồn cần audit. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Mỗi lỗ hổng trích `file:dòng` thật; kết quả `npm audit` là output thật.

## ⚠️ RANH GIỚI NHIỆM VỤ (Strict Boundary - Tier 1 Read-Only)

| ✅ security-code-audit LÀM | ❌ security-code-audit KHÔNG LÀM |
|---|---|
| Quét tĩnh/động mã nguồn và dependencies | Tự ý sửa đổi file mã nguồn dự án |
| Truy vết luồng dữ liệu ô nhiễm (Tainted data flow) | Tự ý refactor hoặc vá lỗi trực tiếp |
| Phát hiện secrets và phân cấp lỗ hổng OWASP | Chạy live penetration testing lên production |
| Xuất báo cáo tại `workspace/.../trace/` | Gọi tool write/edit ngoài thư mục workspace |

## 1. Tổng quan & Khi nào sử dụng

Quét toàn bộ mã nguồn để phát hiện các lỗ hổng bảo mật theo OWASP Top 10 và các best practices an toàn thông tin trước khi phần mềm được triển khai.

- **Khi sử dụng:** Trước khi deploy production; sau khi thêm tính năng auth, thanh toán, mã hóa, upload file; review định kỳ.
- **Khi KHÔNG sử dụng:**
  - Review kiến trúc, clean code và coverage nghiệp vụ → Dùng `cr-review-code-and-quality`.
  - Đơn giản hóa mã nguồn hoặc dọn dẹp test code → Dùng `cr-code-simplification`.
  - Penetration testing trên môi trường live hoặc quét hạ tầng mạng máy chủ.

## 2. Quy Trình Thực Hiện & Tiêu Chuẩn OWASP

> ⚡ **Fast-Path Quét Lỗ Hổng & Secret:** Chạy `node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js runSecurityDigest <projectPath>` để tự động trích xuất các CVEs High/Critical từ `npm audit` và phát hiện secrets rò rỉ trong working tree trong < 3s trước khi phân tích sâu.
>
> 🧠 **CHỈ THỊ EXTENDED THINKING (Ngân sách suy luận 4k - 8k tokens):**
> Trong suốt quá trình audit, kích hoạt tư duy chuỗi suy luận sâu (Extended Thinking) để truy vết toàn bộ luồng dữ liệu ô nhiễm (Tainted Data Flow) từ điểm nhập liệu không tin cậy (Untrusted Input Sources: query parameters, request headers, cookies, Webhook payloads) tới các điểm thực thi nhạy cảm (Sinks: SQL queries, shell commands, file path joins, deserialization logic). Phân tích kỹ lưỡng nguy cơ IDOR phân quyền ngang và SSRF ẩn sau internal gateways.

### 3 Bước Audit
1. **Rà soát OWASP Top 10:** Broken Access Control (IDOR, Path traversal), Cryptographic Failures (Secrets lộ, thuật toán yếu), Injection (SQL/Command/LDAP), Insecure Design, Security Misconfiguration, Vulnerable Components (CVEs), Auth Failures (Missing MFA/Rate limit), Software/Data Integrity, Logging Failures, SSRF.
2. **Kiểm tra Best Practices:** Input sanitization, Output encoding, CSRF tokens, CSP headers, X-Frame-Options.
3. **Phân cấp Mức độ:** 🔴 **Critical** (Khai thác ngay gây mất dữ liệu/auth bypass) → 🟠 **High** (Lỗ hổng nặng cần điều kiện phụ) → 🟡 **Medium** → 🟢 **Low**.

## 3. Tài Nguyên Mở Rộng (Level 3 - Progressive Disclosure)
- 📖 [security-checklist.md](references/security-checklist.md): Bảng kiểm tra toàn diện 13 danh mục an ninh, threat modeling STRIDE và hướng dẫn fix chi tiết.

## 4. Quy Tắc Output File (Output File Rules)

> 📌 **Output duy nhất:** Ghi báo cáo vào `workspace/issues/{issueKey}/trace/security-audit-report.md` (nếu có `{issueKey}`), hoặc `workspace/adhoc/security/trace/security-audit-report.md` (nếu quét toàn project). Gọi lại skill → **ghi đè** file cũ, không tạo file mới.
> ⚠️ **TUYỆT ĐỐI CẤM tạo thư mục `reports/` tại gốc dự án.**

| Trường hợp | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Audit theo issueKey | `workspace/issues/{issueKey}/trace/security-audit-report.md` | **Ghi đè** hoàn toàn |
| Audit toàn project | `workspace/adhoc/security/trace/security-audit-report.md` | **Ghi đè** hoàn toàn |

## 5. Dấu Hiệu Cảnh Báo & Xác Minh (Verification)

**Cờ đỏ cần chặn:** Bỏ qua cảnh báo linter; hardcoded API keys/passwords; `Access-Control-Allow-Origin: *`; SQL query cộng chuỗi; thiếu rate limit; sensitive data ghi ra console/log.

### Checklist Xác Nhận Hoàn Thành
- [ ] 100% cảnh báo Critical được đối chiếu với code thật (`file:line`)
- [ ] Không có false positive (xác thực luồng tainted input thật)
- [ ] Có phương án khắc phục (Remediation code snippet) cho mọi lỗi Critical/High
- [ ] Báo cáo ghi đúng thư mục `workspace/...` chuẩn mực
