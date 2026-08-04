# Tham khảo Jira REST API

## Endpoints sử dụng trong skill jira-import

### 1. Kiểm tra xác thực
```
GET /rest/api/3/myself
Authorization: Basic base64(email:api_token)
```
Trả về thông tin user hiện tại. Dùng để verify credentials.

### 2. Lấy thông tin issue
```
GET /rest/api/3/issue/{issueKey}
Authorization: Basic base64(email:api_token)
Accept: application/json
```

**Trường quan trọng trong response:**
```json
{
  "key": "G3PTP-16584",
  "fields": {
    "summary": "[APP] Tên task...",
    "status": { "name": "To Do" },
    "priority": { "name": "High" },
    "assignee": { "displayName": "Nguyễn Văn A" },
    "reporter": { "displayName": "Trần Thị B" },
    "labels": ["api", "trading"],
    "created": "2026-08-01T10:00:00.000+0700",
    "description": { ... },
    "attachment": [
      {
        "filename": "mockup.png",
        "content": "https://jira.example.com/secure/attachment/12345/mockup.png",
        "size": 245760,
        "mimeType": "image/png"
      }
    ],
    "customfield_10020": [{ "name": "Sprint 42" }]
  }
}
```

### 3. Export HTML view
```
GET /si/jira.issueviews:issue-html/{issueKey}/{issueKey}.html
Authorization: Basic base64(email:api_token)
```
Trả về HTML view của issue — dùng để convert sang PDF bằng `wkhtmltopdf`.

### 4. Tải attachment
```
GET {attachment.content}
Authorization: Basic base64(email:api_token)
```
URL lấy từ trường `attachment[].content` trong response issue.

---

## Cách tạo API Token

1. Đăng nhập tài khoản Atlassian
2. Truy cập: https://id.atlassian.com/manage-profile/security/api-tokens
3. Nhấn **Create API token**
4. Đặt tên (VD: "jira-import-agent")
5. Copy token → lưu vào file `.env`

---

## Lưu ý quan trọng

### Rate Limiting
- Jira Cloud: tối đa khoảng 50 requests/giây (tùy plan)
- Script nên có delay giữa các request nếu tải nhiều attachment

### Encoding
- Jira REST API v3 trả description dạng **Atlassian Document Format (ADF)** — không phải plain text
- Cần parse ADF để lấy text content

### Custom Fields
- Sprint thường nằm ở `customfield_10020` hoặc `customfield_10007` (tùy Jira instance)
- Story Points: `customfield_10028` (phổ biến)
- Epic Link: `customfield_10014` (phổ biến)
- Các custom field ID có thể khác nhau giữa các Jira instance

### Base URL format
- Jira Cloud: `https://{workspace}.atlassian.net`
- Jira Server: `https://jira.{company}.com` (hoặc custom domain)
