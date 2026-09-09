# Chiến Lược Truy Cập GitLab (MCP — Chỉ Đọc)

## Tổng Quan

Dự án dùng [`@zereight/mcp-gitlab`](https://github.com/zereight/gitlab-mcp) (community, MIT license)
để agent đọc dữ liệu GitLab (issue, merge request, pipeline, code, file, commit) trực tiếp qua MCP
tool — không qua `git` CLI hay `curl` REST thủ công.

**Nguyên tắc bất biến: LUÔN LUÔN CHỈ ĐỌC.** Server này không có nghĩa vụ và không được cấp quyền
tạo, sửa, xoá bất kỳ resource nào trên GitLab (issue, MR, file, branch, pipeline...). Agent có thể
**chọn nhánh/tag/commit cụ thể để đọc** khi cần so sánh hoặc truy vết code, nhưng không bao giờ
ghi vào GitLab qua kênh này.

Việc thực thi read-only được ép ở **2 lớp độc lập**, không chỉ dựa vào 1 cấu hình:

1. **`GITLAB_PERMISSION_MODE=readonly`** — ép cứng trong `.agents/gitlab-mcp-launcher.js`
   (không đọc từ `.env`, không thể bị override bằng cách sửa `.env`).
2. **`GITLAB_DENIED_TOOLS_REGEX`** — deny-list theo tên tool (`create_|update_|delete_|push_|merge_|
   approve_|unapprove_|resolve_|retry_|cancel_|mark_`), ép cứng trong launcher như lớp phòng thủ
   thứ hai, độc lập với lớp 1.

Nếu `@zereight/mcp-gitlab` phiên bản sau này đổi hành vi của `readonly` mode (bug hoặc thay đổi
default), lớp 2 vẫn chặn được vì nó lọc theo **tên tool**, không phụ thuộc vào cách package tự
phân loại nội bộ.

---

## Vì Sao Launcher, Không Gọi `npx` Trực Tiếp

`mcp_config.json` không nội suy biến `${VAR}` — các host (Claude Desktop/Antigravity/Gemini CLI)
không tự đọc `.env` khi spawn tiến trình con qua `command/args`. Package `@zereight/mcp-gitlab` là
bên thứ 3, không tự gọi `loadEnv()` như `atlassian-mcp-proxy.js` hay `squash-tm-mcp.js`.

`.agents/gitlab-mcp-launcher.js` giải quyết việc này: đọc `.env`, ép cứng 2 lớp readonly ở trên,
rồi `spawn` tiến trình `npx -y @zereight/mcp-gitlab@2.1.54` (version pin, tránh breaking change
ngầm từ npx luôn kéo `latest`), forward stdio nguyên vẹn để giữ đúng giao thức MCP.

```json
// .agents/mcp_config.json
"gitlab": {
  "command": "node",
  "args": ["/đường-dẫn-tuyệt-đối/.agents/gitlab-mcp-launcher.js"]
}
```

---

## Danh Sách Tool Khả Dụng (64 tool, đã verify — 0 tool ghi lọt lưới)

Toàn bộ tool bên dưới **chỉ đọc**, đã xác nhận bằng cách gọi `tools/list` thật qua JSON-RPC sau khi
áp 2 lớp readonly — không phải danh sách suy đoán từ tài liệu package.

### Merge Request

| Tool | Mục đích | Tham số chọn nhánh/nguồn |
|:---|:---|:---|
| `list_merge_requests` | Liệt kê MR theo project | — |
| `list_group_merge_requests` | Liệt kê MR theo group | — |
| `get_merge_request` | Chi tiết 1 MR | — |
| `get_merge_request_diffs` | Diff của MR | `source_branch` |
| `list_merge_request_diffs` | Diff dạng list, hỗ trợ phân trang | — |
| `list_merge_request_changed_files` | **Bước 1** khi review — liệt kê file đã đổi | — |
| `get_merge_request_file_diff` | **Bước 2** — diff từng file (gọi 3-5 file/lần) | — |
| `get_merge_request_approval_state` | Trạng thái approve | — |
| `get_merge_request_conflicts` | Xung đột merge (chỉ xem, không tự resolve) | — |
| `get_merge_request_version` / `list_merge_request_versions` | Lịch sử version của MR | — |
| `get_merge_request_note` / `list_merge_request_notes` | Bình luận/thảo luận trên MR | — |
| `list_merge_request_emoji_reactions` / `list_merge_request_note_emoji_reactions` | Reaction | — |
| `list_merge_request_pipelines` | Pipeline gắn với MR | — |
| `get_draft_note` / `list_draft_notes` | Draft note (chưa publish) | — |

### Branch / Commit / Repository

| Tool | Mục đích | Tham số chọn nhánh/nguồn |
|:---|:---|:---|
| `list_branches` | Liệt kê nhánh (hỗ trợ `search`, `page`, `per_page`) | — |
| `get_branch` | Chi tiết 1 nhánh | `branch_name` |
| `get_branch_diffs` | So sánh 2 điểm bất kỳ (nhánh/tag/commit) | `from`, `to` (+ `straight`, `excluded_file_patterns`) |
| `get_protected_branch` / `list_protected_branches` | Xem nhánh được bảo vệ | — |
| `list_commits` | Lịch sử commit | `ref_name` (nhánh/tag/revision range, mặc định default branch) |
| `get_commit` | Chi tiết 1 commit | `sha` |
| `get_commit_diff` | Diff của 1 commit | `sha` (+ `full_diff`) |
| `get_file_blame` | Blame theo dòng | — |
| `get_repository_tree` | Cây thư mục | `ref` (**tên nhánh/tag, mặc định default branch nếu bỏ trống**) |
| `get_file_contents` | Nội dung file | `ref` (**branch/tag/commit — chọn nguồn đọc tại đây**) |
| `search_repositories` | Tìm kiếm code trong repo | — |
| `list_commit_statuses` | Trạng thái CI của commit | — |

### Issue / Project / Khác (chỉ đọc)

`get_issue`, `get_issue_link`, `get_label`, `get_project`, `get_project_events`, `get_namespace`,
`get_user`, `get_users`, `list_group_iterations`, `list_group_members`, `list_group_projects`,
`list_events`, `list_ci_catalog_resources`, `get_ci_catalog_resource`, `download_attachment`,
`health_check`, `discover_tools` (tool meta — kích hoạt nhóm tool khác theo nhu cầu, không tự thêm
quyền ghi).

**Không có trong danh sách:** bất kỳ tool nào bắt đầu bằng `create_`, `update_`, `delete_`, `push_`,
`merge_`, `approve_`, `unapprove_`, `resolve_`, `retry_`, `cancel_`, `mark_` — các tool ghi đã bị
loại hoàn toàn bởi `readonly` mode và deny-regex trước khi agent nhìn thấy chúng.

---

## Cách Chọn Nhánh/Tag/Commit Khi Đọc

Khi cần đọc dữ liệu từ một nguồn cụ thể (không phải default branch), dùng tham số tương ứng:

| Muốn đọc | Tool | Cách chỉ định nguồn |
|:---|:---|:---|
| Nội dung file ở nhánh `feature/xyz` | `get_file_contents` | `ref: "feature/xyz"` |
| Cây thư mục ở tag `v1.2.0` | `get_repository_tree` | `ref: "v1.2.0"` |
| Lịch sử commit của 1 nhánh cụ thể | `list_commits` | `ref_name: "feature/xyz"` |
| So sánh 2 nhánh (hoặc nhánh vs tag) | `get_branch_diffs` | `from: "main"`, `to: "feature/xyz"` |
| Diff của MR theo nhánh nguồn | `get_merge_request_diffs` | `source_branch: "feature/xyz"` |
| Diff 1 commit cụ thể | `get_commit_diff` | `sha: "<commit-hash>"` |

Nếu bỏ trống tham số nhánh, các tool đều fallback về **default branch** của project — không có
tool nào tự đoán "nhánh hiện tại" theo working directory local, vì MCP server không biết gì về git
repo local của bạn, chỉ biết về state trên GitLab server.

---

## Setup

### Bước 1 — Personal Access Token

Tạo token tại **Avatar → Edit profile → Access Tokens** trên GitLab instance:
- Scope: `read_api` (đủ cho toàn bộ tool đọc ở trên — **không cấp `api` hay `write_repository`**)
- Expiration: đặt ngày cụ thể (khuyến nghị 90 ngày), không để "không giới hạn"

### Bước 2 — `.env`

```
GITLAB_API_URL=https://<domain-gitlab-của-bạn>/api/v4
GITLAB_PERSONAL_ACCESS_TOKEN=<token-vừa-tạo>
```

`GITLAB_PERMISSION_MODE` trong `.env` **không còn có tác dụng** — launcher ép cứng `readonly`
trong code, không đọc giá trị này từ `.env` nữa. Giữ biến này trong `.env` chỉ để tài liệu hoá ý
định, xoá hay sửa nó không ảnh hưởng đến hành vi thực tế.

### Bước 3 — `.agents/mcp_config.json`

```json
"gitlab": {
  "command": "node",
  "args": ["/đường-dẫn-tuyệt-đối/.agents/gitlab-mcp-launcher.js"]
}
```

### Bước 4 — Restart host, verify

Restart Claude Desktop/Antigravity/Gemini CLI, sau đó hỏi thử: *"Liệt kê MR đang mở trong project
GitLab X"*. Nếu agent trả JSON có cấu trúc từ `list_merge_requests` → cấu hình đúng.

---

## Nếu Cần Agent Ghi Vào GitLab (Ngoài Phạm Vi Server Này)

Server này **cố tình không hỗ trợ** tạo/sửa MR, issue, hay push code — đây là quyết định thiết kế,
không phải hạn chế tạm thời. Nếu về sau có nhu cầu thật (ví dụ: agent tự tạo MR sau khi code xong),
đó là một quyết định riêng cần bàn với user trước (nâng scope token lên `api`, đổi
`GITLAB_PERMISSION_MODE` trong launcher, cân nhắc thêm approval gate) — không tự ý mở rộng quyền
của server hiện tại.

## Xem thêm

- [`atlassian-mcp-strategy.md`](atlassian-mcp-strategy.md) — chiến lược MCP tương tự cho Jira/Confluence
- `.agents/gitlab-mcp-launcher.js` — launcher enforce 2 lớp readonly
- `.agents/mcp_config.json` — cấu hình MCP servers của dự án
