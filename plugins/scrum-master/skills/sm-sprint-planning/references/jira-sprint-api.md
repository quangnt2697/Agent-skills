# Hướng Dẫn Truy Vết Jira Sprint & Agile REST API

Tài liệu tham chiếu chi tiết cho kỹ năng `sm-sprint-planning`.

## 1. Công Thức Tính Chu Kỳ Sprint Tự Động
```text
days_since_anchor = (today - anchor_start_date).days
sprint_index = floor(days_since_anchor / duration_days)
current_sprint_start = anchor_start_date + (sprint_index * duration_days)
current_sprint_end = current_sprint_start + duration_days - 1
day_in_sprint = days_since_anchor - (sprint_index * duration_days) + 1
next_sprint_start = current_sprint_end + 1
next_sprint_end = next_sprint_start + duration_days - 1
```

## 2. Các Endpoint Jira Agile REST API

### Lấy Sprint Active & Future
```bash
# Sprint active (đang chạy)
curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/sprint?state=active"

# Sprint future (sprint tiếp theo)
curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/sprint?state=future"
```

### Lấy Ticket trong Sprint & Backlog
```bash
# Ticket trong Sprint hiện tại (dùng cho carry-over)
curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/sprint/{sprintId}/issue?maxResults=200&fields=summary,status,assignee,customfield_10022,customfield_10026,priority,created,updated"

# Ticket trong Backlog
curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/backlog?maxResults=200&fields=summary,status,assignee,customfield_10022,customfield_10026,priority,labels"
```

*Ghi chú:* `customfield_10022` = Story Points. Fallback về `customfield_10016` nếu là null (Jira Cloud standard).

