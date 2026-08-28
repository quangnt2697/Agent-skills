# Chiến Lược Truy Cập Atlassian (MCP + Fallback)

## Tổng Quan

Dự án hỗ trợ 2 phương thức truy cập Jira/Confluence, theo thứ tự ưu tiên:

1. **MCP Tool** (ưu tiên): Atlassian Rovo MCP Server — agent gọi tool trực tiếp, nhận JSON có cấu trúc.
2. **Shell Script / curl** (fallback): Gọi REST API thủ công qua `.env` credentials.

**Nguyên tắc:** MCP chỉ thay thế **lớp I/O** (tìm kiếm, fetch, push metadata).
Lớp xử lý (phân tích, render, convert) **giữ nguyên** bất kể nguồn dữ liệu.

---

## Danh Sách MCP Tools Khả Dụng

### Jira

| MCP Tool | Mục đích | Thay thế REST API |
|:---------|:---------|:------------------|
| `getAccessibleAtlassianResources` | Lấy `cloudId` (BẮT BUỘC gọi đầu tiên) | — |
| `getJiraIssue` | Lấy chi tiết issue theo key | `GET /rest/api/3/issue/{key}` |
| `searchJiraIssuesUsingJql` | Tìm kiếm bằng JQL | `GET /rest/api/3/search?jql=...` + `GET /rest/agile/1.0/sprint/{id}/issue` + `GET /rest/agile/1.0/board/{id}/backlog` |
| `editJiraIssue` | Sửa fields (description, summary, ...) | `PUT /rest/api/3/issue/{key}` |
| `transitionJiraIssue` | Chuyển trạng thái issue | `POST /rest/api/3/issue/{key}/transitions` |
| `getTransitionsForJiraIssue` | Liệt kê transitions khả dụng | `GET /rest/api/3/issue/{key}/transitions` |
| `addCommentToJiraIssue` | Thêm comment | `POST /rest/api/3/issue/{key}/comment` |
| `createJiraIssue` | Tạo issue mới | `POST /rest/api/3/issue` |

### Confluence

| MCP Tool | Mục đích | Thay thế REST API |
|:---------|:---------|:------------------|
| `searchConfluenceUsingCql` | Tìm kiếm bằng CQL | `GET /wiki/rest/api/search?cql=...` |
| `getConfluencePage` | Lấy nội dung trang (Markdown) | `GET /wiki/rest/api/content/{pageId}` |
| `getConfluenceSpaces` | Liệt kê spaces | `GET /wiki/rest/api/space` |
| `createConfluencePage` | Tạo trang mới | `POST /wiki/rest/api/content` |

### Không hỗ trợ qua MCP (Giữ script/curl)

| Hành động | Lý do | Giải pháp |
|:----------|:------|:----------|
| PDF export (Jira HTML→PDF) | MCP không hỗ trợ binary export | Giữ `jira-fetch-pdf.sh` |
| PDF export (Confluence flyingpdf) | MCP không hỗ trợ PDF export | Giữ `curl flyingpdf` |
| Download binary attachment | MCP trả metadata, không stream file | Giữ `curl` download |
| Upload attachment lên Jira | `addAttachment` không có trong Rovo MCP | Giữ `curl POST /attachments` |
| Markdown→ADF conversion + push | Logic xử lý phức tạp đặc thù | Giữ `jira-push-spec.sh/js` |
| Agile Board API (getSprint, getBoard) | Rovo MCP không expose Agile endpoints trực tiếp | Dùng `searchJiraIssuesUsingJql` với JQL: `sprint in openSprints()` |

---

## Hướng Dẫn Sử Dụng Trong Skill

### Pattern chung: MCP-first, Script-fallback

Khi skill cần truy cập Jira/Confluence, agent thực hiện theo thứ tự:

1. **Thử MCP tool trước** — nếu Atlassian MCP server đã cài và khả dụng
2. **Nếu MCP không khả dụng hoặc lỗi** → chuyển sang shell script / curl (đọc credentials từ `.env`)

### Lưu ý quan trọng

- **`getAccessibleAtlassianResources`** phải gọi **MỘT LẦN** đầu tiên để lấy `cloudId` — tất cả MCP tool khác đều cần tham số này.
- MCP tool trả về **JSON có cấu trúc** — agent đọc trực tiếp, không cần parse output shell.
- Dữ liệu trả về từ MCP và REST API là **tương đương nhau** — lớp xử lý phía sau hoạt động giống nhau.

### JQL thay thế Agile API

Rovo MCP **không có** Agile Board/Sprint endpoints. Thay thế bằng JQL:

| Cần lấy | Agile API (cũ) | JQL qua MCP (mới) |
|:--------|:---------------|:-------------------|
| Issues trong sprint hiện tại | `GET /rest/agile/1.0/sprint/{id}/issue` | `searchJiraIssuesUsingJql(jql="sprint in openSprints() AND project = {project}")` |
| Sprint active | `GET /rest/agile/1.0/board/{id}/sprint?state=active` | `searchJiraIssuesUsingJql(jql="sprint in openSprints()")` → trích sprint name từ issue fields |
| Backlog | `GET /rest/agile/1.0/board/{id}/backlog` | `searchJiraIssuesUsingJql(jql="sprint is EMPTY AND project = {project} AND statusCategory != Done")` |
| Issues stuck | Custom logic | `searchJiraIssuesUsingJql(jql="sprint in openSprints() AND statusCategory != Done AND updated <= -3d")` |
| Velocity (done in sprint) | Custom logic | `searchJiraIssuesUsingJql(jql="sprint in openSprints() AND statusCategory = Done")` |

### Credentials Fallback (.env)

Khi MCP không khả dụng, đọc từ `.env`:

```
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

Nguồn chính: `PLUGIN_DIR/.env` (cố định). Override: `PROJECT_ROOT/.env` (nếu có).
