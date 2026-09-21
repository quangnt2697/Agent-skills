# Quy Trình Thực Thi & Các Phase (ba-spec)

## 1. Chiến lược Truy cập Jira/Confluence

> **Tham chiếu đầy đủ:** `../../../../../docs/architecture/n8n-integration-strategy.md`

Skill này tương tác với Jira/Confluence theo **Chiến lược 3-Tier Fallback** (theo thứ tự ưu tiên):

1. **Tier 1 - n8n Fast-Path Webhook (Ưu tiên số 1):** Chạy đoạn mã qua `scripts/lib/n8n-client.js` để gọi n8n Webhook. Cách này lấy dữ liệu tức thì, lọc sạch nhiễu và không tốn token LLM đọc hiểu ADF rác.
2. **Tier 2 - MCP Tool (Ưu tiên số 2):** Nếu n8n không khả dụng, sử dụng Rovo MCP (`getJiraIssue`, `searchConfluenceUsingCql`). Hạn chế dùng `getJiraIssue` nếu có thể vì AI agent MCP có thể tóm tắt lại `summary` gây sai lệch.
3. **Tier 3 - Shell Script / curl (Dự phòng cuối):** Nếu cả 2 cách trên thất bại hoặc cần tải binary (ví dụ PDF), agent chạy REST API qua `curl` hoặc `jira-fetch-pdf.sh` để đảm bảo độ chính xác.

**Lưu ý:** Lớp xử lý (Phase 2–5: phân tích, interview, tổng hợp) hoạt động **giống nhau** bất kể nguồn dữ liệu là MCP hay REST API.

**Các hành động GIỮ NGUYÊN shell script** (MCP không hỗ trợ):
- Tải Jira PDF (`jira-fetch-pdf.sh`) — MCP không export binary
- Tải Confluence PDF (`flyingpdf`) — MCP không export PDF
- Download binary attachment — MCP trả metadata, không stream file

---

## 2. LUỒNG A: `/ba-spec {issueKey}` — Import từ Jira

### Workflow tổng quan

```
Phase 0              Phase 1              Phase 1.5           Phase 2
Scan & Duyệt   ──→  Tải file thiếu  ──→  Nhận diện     ──→  Trích xuất
danh sách                                 loại task          theo profile
    │                    │                    │                   │
    ▼                    ▼                    ▼                   ▼
[Auto+Approval]       [Auto]              [Auto]              [Auto]

            Phase 3           Phase 4           Phase 5
        ──→ Phân tích &  ──→  Interview-me ──→  Tổng hợp
            xác định gaps     làm rõ gaps       final.md
                │                 │                │
                ▼                 ▼                ▼
              [Auto]        [Interactive]       [Auto]
```

### Phase 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)

**Mục tiêu:** Trước khi tải bất kỳ file nào, quét nhanh Jira task để tìm tất cả tài liệu Confluence/file đính kèm liên quan, đối chiếu với file đã có trong dự án, rồi trình danh sách cho User duyệt.

**Các bước:**

1. **Lấy metadata Jira issue** (chưa tải PDF):
   - **Ưu tiên (n8n Fast-Path):** Import và chạy hàm `prepJiraContext(issueKey)` từ `scripts/lib/n8n-client.js`. Hệ thống sẽ tự động gọi n8n webhook `/webhook/jira-prep` để trả về JSON siêu sạch gồm các trường quan trọng và danh sách `attachments`, `issueLinks`.
   - **Fallback 1 (MCP):** Dùng `getJiraIssue(issueKey)` nhưng BẮT BUỘC cẩn thận với trường `summary` bị LLM tóm tắt sai.
   - **Fallback 2 (REST API):** Chạy `curl GET /rest/api/3/issue/{issueKey}?fields=summary,description,attachment,issuelinks,status,priority,assignee,reporter,labels,sprint`.

2. **Trích xuất danh sách liên kết tham chiếu:**
   - Từ field `issuelinks`: Lấy các Confluence page được link.
   - Từ field `description`: Dùng Regex quét URL chứa pattern `*/wiki/spaces/*` hoặc `*/wiki/pages/*`.
   - Từ field `attachment`: Lấy danh sách file đính kèm.
   - ⚠️ **LỌC BỎ (Ignore):** Tự động loại bỏ các link tham chiếu là tài liệu chung của dự án (Guidelines, Template, v.v.).

3. **Tìm kiếm mở rộng bằng Tên Task (Summary):**
   - Lấy giá trị trường `summary` của Jira.
   - Lọc các từ khóa chính từ `summary` để tạo `{keyword}`.
   - **Tìm kiếm Confluence:** (Ưu tiên MCP: `searchConfluenceUsingCql`, fallback: `GET /wiki/rest/api/search`).
   - **Tìm kiếm Jira task liên quan:** (Ưu tiên MCP: `searchJiraIssuesUsingJql`, fallback: `GET /rest/api/3/search`).
   - Gộp các kết quả tìm được vào danh sách tài liệu cần duyệt.

4. **Kiểm tra Cache — file đã tải trước đó:**
   - Với mỗi Confluence pageId → Quét `/project-root/workspace/{issueKey}/source/refs/` xem đã có file `*-{pageId}.pdf` chưa.
   - Với mỗi attachment → Kiểm tra tên file đã tồn tại chưa.

5. **Trình bảng Danh sách cho User duyệt:** (Hiển thị Markdown Table các file sẽ tải / bỏ qua / đã có).

6. **DỪNG LẠI (Approval Gate):** Chờ User phản hồi "OK" hoặc chỉnh sửa.

### Phase 1: Download (Chỉ tải những gì còn thiếu)

Sau khi User đồng ý:
1. **Tải Jira task thành PDF:** Gọi endpoint HTML view → dùng `wkhtmltopdf` convert thành PDF (hoặc script Python). *LƯU Ý: Tạo file tạm trong `/tmp/`, KHÔNG tạo thư mục `scratch/` trong dự án.*
2. **Tải các Confluence page chưa có:** Dùng MCP `getConfluencePage(pageId)` (lưu Markdown) hoặc Export PDF (`pdfpageexport.action`). Tải attachment.
3. **Tải các file attachment Jira chưa có.**
4. **Tạo `metadata.json`** liệt kê chi tiết các references và trạng thái.
5. **Lưu tất cả vào:** `/project-root/workspace/{issueKey}/source/` và `source/refs/`.

### Phase 1.5: Nhận diện loại task
Đọc trường `summary`, tìm tag prefix: `[APP]`, `[WEB]`, `[OpenAPI]/[BE]/[WS]`.
Nếu không chắc chắn, hỏi user **1 câu duy nhất**.

### Phase 2: Trích xuất có cấu trúc theo Profile (ĐỌC ĐA NGUỒN)
Agent **BẮT BUỘC ĐỌC QUA TOÀN BỘ** các tài liệu đã tải về (PDF Jira, Confluence, attachments) và đối chiếu với các profile trong `references/profile-*.md`.
**Đối chiếu chứng khoán:** Bắt buộc áp dụng `securities-domain-rules.md` nếu liên quan đến tài chính/giao dịch.

### Phase 3: Phân tích yêu cầu & Xác định gaps (ĐỌC ĐA NGUỒN)
Đối chiếu thông tin để phát hiện gaps toàn diện (Xung đột logic, Assumptions ngầm, Thiếu criteria). Đánh giá độ nghiêm trọng (Critical, Important, Nice-to-have).

### Phase 4: Interview-me — Làm rõ yêu cầu
Gọi skill `interview-me` để hỏi user từng điểm mơ hồ (ưu tiên Critical). Ghi nhận câu trả lời vào draft.

### Phase 5: Tổng hợp bản Markdown chi tiết
Tạo file `/project-root/workspace/{issueKey}/spec/final.md`. Ghi đè nếu đã tồn tại. Áp dụng template 13 sections chuẩn.
*Tích hợp kỹ năng:*
- Hỏi user về User Flow format (Mermaid Diagram / Text Flow / Không cần flow).
- Dùng `/ba-user-story-writing` cho Section 9.

---

## 3. LUỒNG B: `/ba-spec confluence {keyword}` — Import từ Confluence

**Phase 1A: Tìm kiếm & Xác nhận (APPROVAL GATE)**
Tìm kiếm bằng CQL (MCP hoặc REST). Hiển thị top 3-5 kết quả. Dừng chờ User chọn.

**Phase 1B: Scan & Duyệt References (APPROVAL GATE)**
Quét trang đã chọn (Depth=1) tìm link/attachments. Trình danh sách duyệt. Dừng chờ User đồng ý.

**Phase 1C: Download**
Tải trang gốc và references vào `/project-root/workspace/{keyword}/source/`.

**Phase 2 → Phase 5: Phân tích & Tổng hợp**
Chạy y hệt Luồng A (Jira) từ Phase 2 trở đi.

---

## 4. Chiến lược Scan Hiệu quả (Chống Tốn Thời Gian)

- **Depth = 1:** Chỉ scan link ở tầng trực tiếp. KHÔNG đào sâu thêm.
- **API-first:** Ưu tiên dùng REST API thay vì để AI đọc text tìm link.
- **Cache Check:** Luôn kiểm tra file đã có trong dự án (`/project-root/workspace/{issueKey}/source/refs/`).
- **Smart Filter:** Chỉ tải file trong bộ lọc cho phép. Bỏ qua video, file nén.
- **Approval Gate:** Luôn trình danh sách cho User duyệt trước khi tải.
