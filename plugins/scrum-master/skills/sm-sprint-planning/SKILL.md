---
name: sm-sprint-planning
description: Kỹ năng lập kế hoạch Sprint. Tự động tính toán chu kỳ Sprint hiện tại, pull backlog và sprint tới (hoặc hiện tại) từ Jira.
trigger: Use when cần lập kế hoạch (planning) cho Sprint mới hoặc phân bổ công việc.
---

# sm-sprint-planning

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `sm-config.yaml`, `.env` Jira. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Dữ liệu Sprint/Backlog từ Jira thật; `sprint-plan.md` tồn tại.

## Khi nào dùng?
- Lập kế hoạch Sprint mới, tính toán Velocity trung bình và phân bổ Story Points vào Sprint Backlog.
- Chuẩn bị danh sách User Stories ưu tiên trước buổi họp Sprint Planning.

**Khi KHÔNG sử dụng:**
- Điều phối Daily Standup trong chu kỳ Sprint đang mở → Dùng `sm-daily-standup`.
- Xử lý các blocker / ticket bị kẹt → Dùng `sm-impediment-triage`.
- Đánh giá tổng kết Sprint sau khi kết thúc chu kỳ → Dùng `sm-sprint-retrospective`.

## Đầu vào
1. Đọc cấu hình team từ file `sm-config.yaml` tại `PLUGIN_DIR` (thư mục plugin `agent-skills`, cố định).
2. Đọc thông tin xác thực Jira từ file `.env` tại `PLUGIN_DIR` (cố định). Nếu `PROJECT_ROOT/.env` tồn tại → ghi đè biến trùng tên.
3. Dữ liệu từ Jira (Sprint & Backlog) lấy qua REST API.

## Template báo cáo
- File template: `assets/sprint-plan.md` (nằm trong thư mục skill này).
- Khi xuất kế hoạch, bạn **PHẢI** sử dụng template trên làm khung, thay thế các placeholder `{...}` bằng dữ liệu thực tế từ Jira.

## Hướng dẫn thực thi (Instructions)

### Bước 0: Khởi tạo — Đọc config & xác thực Jira

#### 0.1. Xác định các đường dẫn
- **`PLUGIN_DIR`** = Thư mục plugin `agent-skills`, nơi chứa file `sm-config.yaml` và thư mục `skills/`. Đường dẫn cố định, không thay đổi theo dự án.
- **`PROJECT_ROOT`** = Thư mục gốc mà user đang mở trong IDE. Đây là nơi ghi file output.

#### 0.2. Đọc file `sm-config.yaml` (từ PLUGIN_DIR)
- Đọc file `{PLUGIN_DIR}/sm-config.yaml` (file này nằm **cố định** trong plugin, KHÔNG nằm ở project root).
- Trích xuất: `anchor_start_date`, `duration_days`, danh sách `team` (tên + role), và cấu hình `jira_board` (`id` và `name`).

#### 0.3. Đọc file `.env` để lấy Jira credentials
- File `.env` nằm **cố định** trong plugin (giống `sm-config.yaml`):
  ```bash
  # Nguồn chính: .env trong plugin dir (luôn có sẵn)
  ENV_FILE="{PLUGIN_DIR}/.env"

  # Override: nếu project hiện tại có .env riêng → ghi đè biến cùng tên
  if [ -f "{PROJECT_ROOT}/.env" ]; then
    ENV_FILE_OVERRIDE="{PROJECT_ROOT}/.env"
  fi
  ```
- Trích xuất 3 biến bắt buộc:
  ```
  ATLASSIAN_BASE_URL   # VD: https://example.atlassian.net
  ATLASSIAN_EMAIL      # VD: user@example.com
  ATLASSIAN_API_TOKEN  # Token xác thực
  ```
- Nếu **thiếu bất kỳ biến nào** trong 3 biến trên → Dừng lại, báo lỗi cho user, KHÔNG tiếp tục.

### Bước 1: Tính toán thời gian Sprint & Tìm Sprint trên Jira

#### 1.1. Tính toán Sprint hiện tại từ config
- Công thức:
  ```
  days_since_anchor = (today - anchor_start_date).days
  sprint_index = floor(days_since_anchor / duration_days)
  current_sprint_start = anchor_start_date + (sprint_index * duration_days)
  current_sprint_end = current_sprint_start + duration_days - 1
  day_in_sprint = days_since_anchor - (sprint_index * duration_days) + 1
  next_sprint_start = current_sprint_end + 1
  next_sprint_end = next_sprint_start + duration_days - 1
  ```

---

## Chiến lược Truy cập Jira/Confluence

Skill này truy xuất dữ liệu Backlog và Sprint từ Jira REST API với cấu hình xác thực từ `.env`.

---

#### 1.2. Tìm Sprint trên Jira
Gọi Jira Agile REST API để lấy Sprint `active` và `future` (dùng Board ID đọc từ `sm-config.yaml`):
```bash
# Sprint active (đang chạy)
curl -s \
  -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
  -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/sprint?state=active"

# Sprint future (sprint tiếp theo)
curl -s \
  -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
  -H "Accept: application/json" \
  "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/sprint?state=future"
```
- Lấy `sprint.id` và `sprint.name` từ kết quả.

#### 1.3. Lấy ticket trong Sprint & Backlog
- **Ticket trong Sprint hiện tại** (chỉ khi cần carry-over — xem Bước 2):
  ```bash
  curl -s \
    -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
    -H "Accept: application/json" \
    "${ATLASSIAN_BASE_URL}/rest/agile/1.0/sprint/{sprintId}/issue?maxResults=200&fields=summary,status,assignee,customfield_10022,customfield_10026,priority,created,updated"
  ```
- **Ticket trong Backlog**:
  ```bash
  curl -s \
    -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
    -H "Accept: application/json" \
    "${ATLASSIAN_BASE_URL}/rest/agile/1.0/board/{boardId}/backlog?maxResults=200&fields=summary,status,assignee,customfield_10022,customfield_10026,priority,labels"
  ```
    - `customfield_10022` = Story Points (field thực tế trên workspace này). Fallback về `customfield_10016` nếu `customfield_10022` là null (Jira Cloud mặc định).
- **Fallback bằng JQL** nếu không có Board ID:
  ```bash
  # Active sprint
  curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
    -H "Accept: application/json" \
    "${ATLASSIAN_BASE_URL}/rest/api/3/search?jql=sprint+in+openSprints()&maxResults=200&fields=summary,status,assignee,customfield_10016,priority"

  # Backlog
  curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
    -H "Accept: application/json" \
    "${ATLASSIAN_BASE_URL}/rest/api/3/search?jql=sprint+is+EMPTY+AND+statusCategory+!=+Done&maxResults=200&fields=summary,status,assignee,customfield_10016,priority,labels"
  ```

### Bước 2: Kiểm tra thời điểm và Chọn lọc dữ liệu
- Nếu `today` **đang ở giữa Sprint** (day_in_sprint < duration_days - 1):
  - Sử dụng dữ liệu từ **Backlog** và **Sprint tiếp theo** (future).
  - Không pull Sprint hiện tại (vì đang chạy, chưa cần carry-over).
  - Section "Carry-over" trong template ghi: "Không áp dụng – Sprint hiện tại đang diễn ra."
- Nếu `today` **là ngày cuối Sprint** (day_in_sprint >= duration_days - 1) hoặc qua Sprint mới:
  - Pull dữ liệu của **Sprint hiện tại** (để kiểm tra ticket chưa hoàn thành → carry-over).
  - Pull dữ liệu **Backlog** để lên kế hoạch cho Sprint tiếp theo.
  - Điền đầy đủ section "Carry-over" trong template.

### Bước 3: Lên kế hoạch Sprint
- Chọn lọc các User Stories/Tickets phù hợp từ Backlog (ưu tiên Priority High trước).
- Xác định Sprint Goal dựa trên những task được chọn.
- Phân bổ Ticket đề xuất cho từng member dựa trên role trong `sm-config.yaml`:
  - Ticket chuyên biệt theo nền tảng (APP, WEB, Mobile...) → Phân bổ cho member tương ứng theo role.
  - Ticket Backend hoặc dùng chung → Chia đều giữa các thành viên cùng role Backend/Developer.
- Nếu Backlog chưa rõ ràng (thiếu Acceptance Criteria), ghi vào section "Rủi ro & Lưu ý" và đề xuất BA bổ sung.
- Nếu có quyết định quan trọng (scope, priority), ghi vào section "Quyết định cần PO phê duyệt" để PO xác nhận.

### Bước 4: Xuất file
- Nếu thư mục `{PROJECT_ROOT}/workspace/sprint/` chưa tồn tại, chạy `mkdir -p` để tạo.
- Tạo hoặc ghi đè file **`{PROJECT_ROOT}/workspace/sprints/sprint/tech/sprint-plan.md`**.
  - ⚠️ Lưu ý: `workspace` ở đây là **tên thư mục con** bên trong PROJECT_ROOT, KHÔNG phải "workspace root" của IDE.
- Sử dụng **template** tại `assets/sprint-plan.md` (trong thư mục skill này) làm khung.
- Thay thế toàn bộ placeholder `{...}` bằng dữ liệu thực tế.
- Nếu một section không có dữ liệu, ghi: "Không có."

## Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** Khởi tạo Sprint 35 với Backlog 42 Story Points.
- **Output:** File `workspace/sprints/sprint/tech/sprint-plan.md` chuẩn:
  ```markdown
  # Sprint 35 Planning
  - **Mục tiêu Sprint:** Hoàn thiện luồng xác thực Smart OTP và đặt lệnh phái sinh.
  - **Thời gian:** 2026-09-15 đến 2026-09-29 (10 ngày làm việc).
  - **Tổng Story Points:** 42 SP (DEV 1: 20 SP, DEV 2: 22 SP).
  - **Danh sách Tickets:**
    - [PROD-101] (8 SP) Smart OTP Mobile Client -> Assignee: DEV 1
    - [PROD-102] (14 SP) Khớp lệnh điều kiện phái sinh -> Assignee: DEV 2
  ```


## When to Use

Kích hoạt kỹ năng này khi:
- Sắp hoặc vừa bắt đầu một Sprint mới cần phân bổ ticket cho các DEV.
- Cần tính toán khối lượng công việc và lập mục tiêu Sprint.

## Common Rationalizations

- "Chỉ cần kéo ticket vào Sprint là xong, không cần lập kế hoạch chi tiết." -> Lập kế hoạch chi tiết giúp team thấy được rủi ro và mục tiêu rõ ràng.

## Red Flags

- Sprint không có goal.
- Thiếu ticket trong Backlog cho đợt planning.

## Verification

- File `sprint-plan.md` được sinh ra đầy đủ cấu trúc và thay thế toàn bộ placeholders bằng dữ liệu Jira.

---
