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

## Tổng quan

Quét toàn bộ mã nguồn để phát hiện các lỗ hổng bảo mật theo OWASP Top 10 và các best practices về bảo mật. Skill này tập trung vào static code analysis để tìm ra các vấn đề tiềm ẩn trước khi chúng trở thành lỗ hổng thực sự.

## Khi nào sử dụng

- Trước khi deploy lên production environment
- Sau khi implement tính năng liên quan đến:
  - Authentication / Authorization
  - Payment processing
  - Data encryption
  - File upload / download
  - API endpoints xử lý dữ liệu nhạy cảm
- Khi review code của developer mới
- Định kỳ hàng tuần/tháng để đảm bảo không có lỗ hổng mới xuất hiện

**Khi KHÔNG sử dụng:**
- Đánh giá kiến trúc, clean code, và độ bao phủ test nghiệp vụ thông thường → Dùng `cr-review-code-and-quality`.
- Tối ưu hóa độ phức tạp mã nguồn hoặc tinh gọn test mock → Dùng `cr-code-simplification`.
- Kiểm thử thâm nhập (Penetration Testing) trên môi trường live hoặc quét hạ tầng mạng/máy chủ.

## Quy trình

> ⚡ **Fast-Path Quét Lỗ Hổng & Secret:** Chạy `node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js runSecurityDigest <projectPath>` để tự động trích xuất các CVEs High/Critical từ `npm audit` và phát hiện secrets rò rỉ trong working tree trong < 3s trước khi phân tích sâu.
>
> 🧠 **CHỈ THỊ EXTENDED THINKING (Ngân sách suy luận 4k - 8k tokens):**
> Trong suốt quá trình audit, kích hoạt tư duy chuỗi suy luận sâu (Extended Thinking) để truy vết toàn bộ luồng dữ liệu ô nhiễm (Tainted Data Flow) từ điểm nhập liệu không tin cậy (Untrusted Input Sources: query parameters, request headers, cookies, Webhook payloads) tới các điểm thực thi nhạy cảm (Sinks: SQL queries, shell commands, file path joins, deserialization logic). Phân tích kỹ lưỡng nguy cơ IDOR phân quyền ngang và SSRF ẩn sau internal gateways.

### 1. Scan OWASP Top 10

Kiểm tra các lỗ hổng phổ biến nhất:

**A01: Broken Access Control**
- Missing authorization checks
- Insecure Direct Object References (IDOR)
- Path traversal vulnerabilities

**A02: Cryptographic Failures**
- Hardcoded secrets/passwords
- Weak encryption algorithms
- Missing encryption cho sensitive data

**A03: Injection**
- SQL Injection
- NoSQL Injection
- Command Injection
- LDAP Injection

**A04: Insecure Design**
- Missing rate limiting
- Lack of security boundaries
- Missing security requirements

**A05: Security Misconfiguration**
- Default credentials
- Unnecessary features enabled
- Missing security headers

**A06: Vulnerable Components**
- Outdated dependencies with known CVEs
- Unmaintained packages

**A07: Authentication Failures**
- Weak password policies
- Missing MFA
- Session fixation vulnerabilities

**A08: Software and Data Integrity Failures**
- Unsigned updates
- Missing integrity checks
- Insecure deserialization

**A09: Security Logging and Monitoring Failures**
- Missing audit logs
- Sensitive data in logs
- No alerting for suspicious activities

**A10: Server-Side Request Forgery (SSRF)**
- Unvalidated URL inputs
- Missing allowlist/blocklist

### 2. Check Best Practices

- Input validation và sanitization
- Output encoding
- Secure session management
- CSRF protection
- CORS configuration
- Content Security Policy (CSP)
- X-Frame-Options, X-Content-Type-Options headers

### 3. Report Findings

Phân loại theo mức độ nghiêm trọng:
- 🔴 **Critical**: Có thể bị exploit ngay, dẫn đến data breach
- 🟠 **High**: Lỗ hổng nghiêm trọng nhưng cần điều kiện cụ thể
- 🟡 **Medium**: Vấn đề bảo mật cần fix nhưng không nguy hiểm ngay
- 🟢 **Low**: Best practice nên tuân thủ

## Output Format

> 📌 **Output duy nhất:** Ghi báo cáo vào `workspace/issues/{issueKey}/trace/security-audit-report.md` (nếu có `{issueKey}`), hoặc `workspace/adhoc/security/trace/security-audit-report.md` (nếu quét toàn project). Gọi lại skill → **ghi đè** file cũ, không tạo file mới.
> ⚠️ **TUYỆT ĐỐI CẤM tạo thư mục `reports/` tại gốc dự án.**

## ⚡ Quy Tắc Output File (Output File Rules)

| Trường hợp | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Audit theo issueKey | `workspace/issues/{issueKey}/trace/security-audit-report.md` | **Ghi đè** hoàn toàn |
| Audit toàn project | `workspace/adhoc/security/trace/security-audit-report.md` | **Ghi đè** hoàn toàn |

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD
**Scope:** [Thư mục/file được scan]
**Total Issues:** X (Critical: Y, High: Z, Medium: A, Low: B)

---

## 🔴 Critical Issues (Must Fix Immediately)

### 1. SQL Injection in Login Endpoint
**File:** `src/auth/login.ts:45`
**OWASP:** A03 - Injection
**Description:** Direct string concatenation in SQL query allows SQL injection
**Code:**
\`\`\`typescript
const query = `SELECT * FROM users WHERE email='${email}' AND password='${password}'`;
\`\`\`
**Impact:** Attacker có thể bypass authentication và truy cập toàn bộ database
**Fix:**
\`\`\`typescript
const query = 'SELECT * FROM users WHERE email=$1 AND password=$2';
const result = await db.query(query, [email, hashedPassword]);
\`\`\`

---

## 🟠 High Issues

[...]

## ✅ Security Score: 6.5/10

**Recommendations:**
1. Fix tất cả Critical issues trước khi deploy
2. Implement rate limiting cho API endpoints
3. Add security headers (CSP, X-Frame-Options)
4. Upgrade vulnerable dependencies
```

## Các biện hộ thường gặp

> "Code này chỉ chạy internal, không public"

**Phản bác:** Internal systems vẫn có thể bị tấn công qua phishing, insider threats, hoặc lateral movement sau khi attacker breach được một service khác.

> "Chúng ta chưa từng bị hack"

**Phản bác:** Việc chưa phát hiện breach không có nghĩa là chưa bị hack. Nhiều breach chỉ được phát hiện sau hàng tháng/năm.

> "Fix sau, deploy trước đã"

**Phản bác:** Critical security issues PHẢI được fix trước khi deploy. Việc deploy lỗ hổng bảo mật có thể dẫn đến data breach, loss of customer trust, và legal consequences.

## Dấu hiệu cảnh báo

- Developer bỏ qua security warnings từ linter
- Hardcoded credentials trong code
- Disable CORS check hoặc set `Access-Control-Allow-Origin: *`
- SQL queries sử dụng string concatenation
- Missing input validation ở API endpoints
- Sensitive data trong logs

## Xác minh

Sau khi report findings:
- [ ] Tất cả Critical issues đã được acknowledged
- [ ] Developer có plan fix rõ ràng (timeline + approach)
- [ ] Đã tạo tickets để track từng issue
- [ ] Đã set priority cho từng issue
- [ ] Nếu không thể fix ngay: Đã có compensating controls (WAF rules, monitoring alerts)

---
