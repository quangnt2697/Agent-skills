# Kiến Trúc Các MCP Servers (.agents/)

Tài liệu này tổng hợp thiết kế kiến trúc, vai trò, cơ chế bảo mật và giao thức giao tiếp của hệ thống Model Context Protocol (MCP) servers nằm trong thư mục `.agents/` của dự án `agent-skills`.

---

## 1. Danh Sách MCP Servers

| MCP Server | File Thực Thi | Runtime | Giao Thức / Mục Đích |
| :--- | :--- | :--- | :--- |
| **TimescaleDB & OpenAPI Query** | `.agents/db-mcp.js` | Node.js (ESM) | STDIO MCP Server truy vấn SQL an toàn tới TimescaleDB và OpenAPI DB qua Metabase API hoặc Direct Connection. |
| **Test Data Engine** | `.agents/test-data-mcp.js` | Node.js (ESM) | STDIO MCP Server chuyên dụng cho QA cung cấp 10 tools truy xuất dữ liệu thị trường, snapshot, tài khoản, deal, và xuất fixture. |
| **Squash TM Bridge** | `.agents/squash-tm-mcp.js` | Node.js (ESM) | Tích hợp Squash TM REST API để đồng bộ Gherkin test cases, tự động binding test plan vào Campaign/Iteration. |
| **Playwright Automation** | `.agents/playwright-mcp.js` | Node.js (ESM) | Điều khiển trình duyệt không đầu (headless browser) để kiểm thử E2E giao diện web. |
| **Atlassian Proxy** | `.agents/atlassian-mcp-proxy.js` | Node.js (ESM) | Proxy điều hướng request Jira/Confluence API qua HTTP Agent/Token quản lý tập trung. |
| **GitLab Launcher** | `.agents/gitlab-mcp-launcher.js` | Node.js (ESM) | Khởi chạy và điều phối container/process của GitLab MCP Server phục vụ code review MR và pipelines. |

---

## 2. Các Tiêu Chuẩn Thiết Kế & Nguyên Tắc Bảo Mật

### 2.1. Read-Only SQL Sanitization
Các query chạy qua `db-mcp.js` hoặc `test-data-mcp.js` bắt buộc phải đi qua bộ lọc SQL Sanitizer:
- **Chặn DML / DDL:** Tuyệt đối chặn các từ khóa `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`.
- **Chặn Multi-Statements:** Cấm sử dụng dấu chấm phẩy (`;`) để gộp nhiều câu query nhằm ngăn ngừa SQL injection.
- **Chặn DML ẩn danh:** Bắt và từ chối các câu lệnh DML ngụy trang trong Common Table Expressions (CTEs: `WITH ... DELETE`) hoặc subqueries.

### 2.2. Enforced Auto-Limit
- Tự động bổ sung `LIMIT 200` vào các câu lệnh `SELECT` chưa có mệnh đề `LIMIT`.
- Kiểm tra và ép trần tối đa (ví dụ: `MAX_LIMIT = 500`) nếu truy vấn yêu cầu số lượng dòng quá lớn, bảo vệ bộ nhớ và tốc độ phản hồi.
- Bỏ qua việc thêm `LIMIT` cho các câu lệnh siêu dữ liệu như `EXPLAIN` hoặc `SHOW`.

### 2.3. Smart Environment Routing
Hệ thống hỗ trợ cơ chế định tuyến thông minh giữa các môi trường dữ liệu:
- **TimescaleDB Production / Staging:** Database ID `644`.
- **OpenAPI UAT:** Database ID `535`.
- **OpenAPI Sandbox:** Database ID `655`.
Tùy thuộc vào cấu hình `NODE_ENV` hoặc cờ `--env`, MCP server tự động nạp đúng Database ID tương ứng mà không yêu cầu agent phải ghi nhớ số ID.

### 2.4. Session & SSO Token Management
- MCP servers ưu tiên đọc token đăng nhập từ biến môi trường (`METABASE_SESSION_TOKEN`, `ATLASSIAN_API_TOKEN`, `GITLAB_PERSONAL_ACCESS_TOKEN`).
- Khi token hết hạn, các script tiện ích (như `scripts/metabase-sso-login.js`) có thể tự động gia hạn phiên đăng nhập và ghi nhận an toàn vào file cấu hình `.env` cục bộ.

---

## 3. Khởi Chạy & Kiểm Thử MCP Servers

### 3.1. Chạy MCP Server Độc Lập
Có thể kiểm tra trực tiếp MCP Server qua CLI:
```bash
# Khởi chạy Database MCP Server kết nối TimescaleDB
node .agents/db-mcp.js --db timescale

# Khởi chạy Test Data MCP Server kết nối OpenAPI UAT
node .agents/test-data-mcp.js --env uat
```

### 3.2. Chạy Bộ Test Unit
Toàn bộ logic bảo mật SQL, Auto-Limit, phân giải Database ID và Export Fixture đều được kiểm thử tự động:
```bash
node --test scripts/db-mcp-test.js
node --test scripts/test-data-mcp-test.js
```
