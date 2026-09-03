# Chiến Lược Truy Cập Cơ Sở Dữ Liệu (Database MCP — Read-Only)

## 1. Tổng Quan

Dự án cung cấp một Custom MCP Server độc lập (`.agents/db-mcp.js`) dựa trên chuẩn giao thức Model Context Protocol (Stdio Transport), cho phép AI Agent tương tác trực tiếp với Cơ sở dữ liệu (PostgreSQL) mà không cần qua các công cụ GUI hay chạy script ad-hoc không an toàn.

**Nguyên tắc bất biến: MẶC ĐỊNH LUÔN LUÔN READ-ONLY.**
Database MCP được thiết kế chủ yếu phục vụ tra cứu schema, kiểm thử dữ liệu và phân tích truy vấn. Agent TUYỆT ĐỐI không được cấp quyền ghi, xóa, hoặc thay đổi cấu trúc dữ liệu qua kênh này.

---

## 2. Cơ Chế Bảo Mật & An Toàn 2 Lớp (Defense-in-Depth)

Hệ thống bảo vệ dữ liệu được thực thi ở 2 lớp độc lập:

1. **Lớp 1 (Connection / Transaction Level):**
   - Ngay khi connection pool kết nối tới DB, server tự động thực thi:
     `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;`
   - Gắn `statement_timeout = 5000` (5 giây) để ngăn chặn các truy vấn khóa bảng hoặc treo tài nguyên.
2. **Lớp 2 (Query Sanitizer Regex):**
   - Toàn bộ câu lệnh SQL trước khi gửi tới driver `pg` đều được làm sạch (strip comments) và quét qua bộ lọc Regex.
   - **Chặn đa câu lệnh:** Không cho phép chuỗi SQL chứa dấu chấm phẩy `;` nối nhiều câu lệnh (chống SQL Injection smuggling).
   - **Chỉ chấp nhận từ khóa đọc:** Bắt buộc bắt đầu bằng `SELECT`, `WITH`, `EXPLAIN`, hoặc `SHOW`.
   - **Deny-list từ khóa nguy hiểm:** Chặn tuyệt đối:
     `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `REINDEX`, `VACUUM`, `COPY`, `EXECUTE`, `EXEC`.
3. **Chống tràn Ngữ cảnh (Token Protection):**
   - Tự động bổ sung mệnh đề `LIMIT 50` vào cuối câu lệnh `SELECT` nếu câu lệnh chưa có `LIMIT`.
   - Ép trần giới hạn tối đa `HARD_CAP_MAX_ROWS = 200`.

---

## 3. Danh Sách Tools Khả Dụng

| Tool Name | Tham số | Mô tả & Chức năng |
| :--- | :--- | :--- |
| `db_ping` | *(Không có)* | Kiểm tra kết nối DB (qua Metabase API hoặc PostgreSQL), đo latency, lấy danh sách database. |
| `db_list_tables` | `schema` *(string, default: "public")*,<br>`database` *(string, default: "timescale")* | Liệt kê danh sách bảng và view. Hỗ trợ chọn database (`timescale` [644], `openapi` [535], `openapi-sandbox` [655]). |
| `db_describe_table` | `tableName` *(string, required)*,<br>`schema` *(string, default: "public")*,<br>`database` *(string, default: "timescale")* | Lấy chi tiết metadata: danh sách cột, kiểu dữ liệu, Primary Key, Foreign Key. |
| `db_query` | `sql` *(string, required)*,<br>`maxRows` *(number, default: 50, max: 200)*,<br>`database` *(string, default: "timescale")* | Thực thi câu lệnh `SELECT` an toàn qua Metabase dataset API hoặc PostgreSQL. |
| `db_explain_query` | `sql` *(string, required)*,<br>`analyze` *(boolean, default: false)*,<br>`database` *(string, default: "timescale")* | Phân tích kế hoạch thực thi câu lệnh truy vấn. |

---

## 4. Hướng Dẫn Cấu Hình Biến Môi Trường (`.env`)

### Cách 1: Sử dụng Metabase API Engine (Khuyến nghị cho hạ tầng DNSE)
Metabase đã kết nối thông suốt tới cụm TimescaleDB và OpenAPI nội bộ K8s, Agent chỉ cần gọi qua HTTPS:
```bash
# === DATABASE (MCP VIA METABASE) ===
METABASE_URL=https://mb-uat.dnse.com.vn
METABASE_API_TOKEN=mb_...hoặc_session_token
METABASE_DEFAULT_DATABASE=timescale

# Metabase Database IDs
METABASE_DB_TIMESCALE_ID=644
METABASE_DB_OPENAPI_ID=535
METABASE_DB_OPENAPI_SANDBOX_ID=655
```

### Cách 2: Sử dụng PostgreSQL Trực Tiếp (Dự phòng / Local)
```bash
DATABASE_URL=postgresql://read_user:secret_password@localhost:5432/securities_db
DB_STATEMENT_TIMEOUT=5000
```

---

## 5. Ứng Dụng Thực Tế Trong Quy Trình Làm Việc

### 5.1. Dành cho Chuyên gia Phân tích Nghiệp vụ (BA / PO)
- **Truy vấn Schema thực tế:** Dùng `db_list_tables` và `db_describe_table` khi phân tích nghiệp vụ các tính năng Deal Margin, danh mục, bảng giá để đảm bảo Business Spec (`*-final.md`) khớp 100% với cấu trúc dữ liệu thực tế của hệ thống.
- **Phân tích Gap (AS-IS vs TO-BE):** Đối chiếu các bảng hiện tại để phát hiện các trường thông tin còn thiếu.

### 5.2. Dành cho Developer (DEV) & Web Performance Auditor
- **Thiết kế Kỹ thuật (`/tech-spec`):** Sinh Tech-Spec và Data Contract dựa trên cấu trúc bảng chính xác mà không cần đoán mò.
- **Tối ưu hóa Truy vấn (`dev-performance`):** Dùng `db_explain_query` để kiểm tra Index Scan vs Sequential Scan, phát hiện Missing Index trước khi đưa code lên review.

### 5.3. Dành cho Kỹ sư Kiểm thử (QA / SDET)
- **Kiểm tra trạng thái sau khi gọi API (`/qa-auto-design`, `/qa-run-test`):** Sau khi gửi lệnh hoặc giao dịch qua API Sandbox/Staging, dùng `db_query` để xác minh:
  - Trạng thái đơn hàng trong bảng `orders`.
  - Tỷ lệ an toàn tài khoản $R_{deal}$ trong bảng `deals`.
  - Biến động số dư khả dụng trong bảng `balances`.

---

## 6. Kiểm Tra Nhanh (CLI Dry-Run)

Bạn có thể chạy thử trực tiếp script từ Terminal để kiểm tra kết nối:
```bash
node .agents/db-mcp.js --test
```
