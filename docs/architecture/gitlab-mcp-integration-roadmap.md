# Lộ trình Tích hợp GitLab MCP vào Quy trình (Chưa triển khai)

> **Trạng thái:** Đề xuất — CHƯA thực hiện. File này là backlog kỹ thuật, không phải
> hướng dẫn đang áp dụng. Chỉ triển khai khi user chủ động yêu cầu.

## Bối cảnh

GitLab MCP (`@zereight/mcp-gitlab` qua `.agents/gitlab-mcp-launcher.js`) đã được cấu
hình và verify hoạt động (xem `references/gitlab-mcp-strategy.md`), nhưng hiện đứng
**độc lập** — chưa skill nào trong `plugins/` tham chiếu tới nó. Toàn bộ pipeline
BA→QA→DEV, Scrum Master, Code Reviewer vẫn chạy đúng như trước khi có GitLab MCP.

Khi khảo sát toàn bộ `plugins/*/skills/**/SKILL.md` (2026-08-30), mọi lệnh `git diff`,
`git status`, `git log` hiện có đều là **git cục bộ** (working tree), không đụng tới
GitLab remote. Vì vậy GitLab MCP không thay thế gì đang chạy — nó là năng lực mới.

Ràng buộc bắt buộc phải giữ ở mọi phase dưới đây: **GitLab MCP luôn readonly**
(ép cứng trong `gitlab-mcp-launcher.js`, không đổi). Không phase nào được đề xuất
quyền `modify`/`full` — nếu tương lai cần agent tự tạo MR/comment, đó là một quyết
định phạm vi riêng, phải hỏi user trước, không suy ra từ file này.

## 2 Gap đã phát hiện

### Gap 1 — Scrum Master mù trước impediment dạng MR/pipeline

`plugins/scrum-master/agents/scrum-master.md` dòng 10 quy định: *"đọc thông tin từ
`sm-config.yaml` và hệ thống Jira. Không sử dụng các nguồn dữ liệu ngoài."*

Hệ quả: một ticket có thể hiện trạng thái Jira "In Progress" trong khi MR tương ứng
trên GitLab đã bị treo 5 ngày (pipeline fail, hoặc discussion thread chưa resolve).
`sm-impediment-triage` không nhìn thấy tín hiệu này vì chỉ đọc Jira.

**Quyết định của user (2026-08-30):** Giữ nguyên, không mở rộng phạm vi Scrum Master
lúc này.

### Gap 2 — Code Reviewer review dựa trên diff cục bộ, không đọc MR thật

`plugins/code-reviewer/skills/cr-review-code-and-quality/SKILL.md` nói về "PR" như
khái niệm chung nhưng không có bước fetch nội dung MR thật (description, discussion
threads, approval state, pipeline status gắn với MR) từ GitLab.

**Quyết định của user (2026-08-30):** Chưa làm, để sau.

## Nếu user quyết định triển khai — theo phase, không làm cả 2 cùng lúc

### Phase A (đề xuất làm trước — rủi ro thấp, giá trị rõ): Code Reviewer đọc MR thật

**Mục tiêu:** `cr-review-code-and-quality` có thêm bước tùy chọn — nếu user cung cấp
MR IID hoặc agent phát hiện đang review một branch có MR mở tương ứng, fetch context
thật qua GitLab MCP trước khi review, thay vì chỉ diff cục bộ.

**Tool GitLab MCP cần dùng** (đã verify tồn tại trong readonly mode — xem
`references/gitlab-mcp-strategy.md`):
- `get_merge_request` — description, state, target/source branch
- `list_merge_request_changed_files` rồi `get_merge_request_file_diff` (batch 3-5 file/lần)
- `get_merge_request_approval_state` — đã ai approve/request changes chưa
- `list_merge_request_pipelines` — pipeline status gắn với MR
- `get_merge_request_notes` — discussion threads chưa resolve

**File cần sửa:** `plugins/code-reviewer/skills/cr-review-code-and-quality/SKILL.md`
— thêm một bước "Bước 0 (tùy chọn): Nếu có MR liên quan, fetch context qua GitLab MCP"
trước phần "5 Trục Đánh giá Cốt lõi". Không đổi 5 trục hiện có, chỉ làm giàu input.

**Không đổi:** Ranh giới hiện tại (DEV tự review trước, QA review thêm cho critical
feature) — Phase A chỉ làm giàu dữ liệu đầu vào của quy trình review đã có, không đổi
ai review cái gì.

**Verification khi triển khai:** review 1 MR thật, xác nhận báo cáo review có trích
dẫn đúng approval state / pipeline status / discussion thread thật từ GitLab, không
phải suy đoán từ diff cục bộ.

### Phase B (chỉ làm sau khi Phase A ổn định): Traceability nối thêm lớp Code

**Mục tiêu:** `meta-cross-validation` mở rộng matrix từ `Business Rule → Test` thành
`Business Rule → Commit/MR → Test`, dùng `list_commits`/`get_commit` để trace commit
nào implement rule nào (dựa vào issueKey trong commit message hoặc MR title).

**File cần sửa:** `plugins/core/skills/meta-cross-validation/SKILL.md`.

**Điều kiện tiên quyết:** Phase A đã chạy ổn định ít nhất một sprint, và team có quy
ước commit message/MR title chứa issueKey nhất quán (nếu chưa có, đây là gap cần giải
quyết trước, không phải lỗi kỹ thuật của MCP).

### Phase C (yêu cầu quyết định phạm vi riêng, KHÔNG suy ra từ roadmap này): Scrum Master đọc MR

Nếu sau này user muốn giải Gap 1, đây **không** phải việc chỉnh 1 dòng — nó đổi lại
tuyên bố ranh giới cứng trong `scrum-master.md` ("không dùng nguồn ngoài Jira"). Phải:

1. Hỏi lại user có thực sự muốn đổi ranh giới này không (đây là quyết định phạm vi,
   thuộc trường hợp cần dừng hỏi theo `.claude/rules/autonomy-contract.md` mục 2.3 —
   "có 2 cách làm" áp dụng cho *việc có nên mở phạm vi*, không phải chi tiết kỹ thuật).
2. Nếu đồng ý: sửa `plugins/scrum-master/agents/scrum-master.md` dòng 10, thêm tool
   `list_group_merge_requests`/`list_merge_request_pipelines` vào `sm-impediment-triage`,
   và cập nhật bảng ánh xạ output trong file đó.

**Không tự triển khai Phase C nếu chỉ được yêu cầu "tối ưu GitLab" chung — luôn hỏi
lại trước khi đổi ranh giới persona.**

## Nguyên tắc chung khi triển khai bất kỳ phase nào

- Giữ MCP readonly tuyệt đối — không phase nào cần quyền viết.
- Mỗi phase là một thay đổi độc lập, verify riêng bằng `npm test` sau khi sửa
  `SKILL.md` (chạy `npm run validate:skills` để đảm bảo section/frontmatter còn hợp lệ).
- Không sửa nhiều skill trong 1 lần nếu không được yêu cầu rõ — mỗi phase = 1 PR/commit
  riêng theo `.claude/rules/git-workflow.md`.
- Cập nhật `references/gitlab-mcp-strategy.md` nếu phase nào cần thêm tool ngoài danh
  sách 64 tool đã liệt kê ở đó.

## Xem thêm

- `references/gitlab-mcp-strategy.md` — danh sách đầy đủ 64 tool readonly khả dụng
- `.agents/gitlab-mcp-launcher.js` — cơ chế ép cứng readonly
- `.claude/rules/autonomy-contract.md` — khi nào phải hỏi lại user
