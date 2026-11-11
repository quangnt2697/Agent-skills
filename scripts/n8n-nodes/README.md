# Danh Mục Node Scripts Tự Động Hóa n8n (`scripts/n8n-nodes/`)

Thư mục này chứa toàn bộ mã nguồn JavaScript nguyên bản (clean source code) của các **Code Nodes** được sử dụng trong các n8n Workflows (`n8n-workflows/*.json`).

---

## 🏗️ Triết Lý Thiết Kế & Quản Lý

1. **Single Source of Truth (Mã nguồn chuẩn duy nhất):**
   - Không viết hoặc chỉnh sửa trực tiếp mã JavaScript dài trong giao diện Web UI của n8n hay chuỗi escape JSON (`\n`, `\"`).
   - Mọi logic xử lý của Code Node được viết tại đây bằng cú pháp JavaScript sạch, có syntax highlighting, linter, formatting và version control.

2. **Chống Trôi Lệch Mã Nguồn (Anti-Code-Drift):**
   - Khi chỉnh sửa bất kỳ node script nào, chạy lệnh sau để tự động nhúng lại code vào workflow JSON tương ứng:
     ```bash
     npm run n8n:sync-nodes
     # hoặc: node scripts/n8n/sync-n8n-nodes.js
     ```

3. **Phân Vùng Theo Domain Nghiệp Vụ:**
   - Các file được tổ chức vào các thư mục con tương ứng với vai trò và domain thay vì để phẳng trong 1 thư mục lớn.

---

## 📂 Cấu Trúc Thư Mục

```text
scripts/n8n-nodes/
├── README.md                          # Tài liệu hướng dẫn & tra cứu cấu trúc
├── atlassian/                         # Domain Tích hợp Atlassian (Jira My Tasks, Action Skills)
│   ├── jira-action-skill-dispatcher.js# Điều hướng kích hoạt skill tự động
│   ├── jira-action-skill-pre-respond.js# Trả về HTML tự động đóng tab trình duyệt
│   ├── jira-my-tasks-delta.js         # Phát hiện chênh lệch danh sách task Jira mới
│   ├── jira-my-tasks-query.js         # Truy vấn danh sách task Jira được gán
│   └── jira-my-tasks-slack.js         # Xây dựng Slack blocks thông báo task
├── ba/                                # Domain BA / Product Owner (Jira prep, push, Confluence)
│   ├── confluence-clean-payload.js    # Bóc tách Confluence XHTML sang Markdown
│   ├── jira-clean-payload.js          # Lọc sạch metadata Jira & giải nén ADF
│   ├── jira-prepare-request.js        # Chuẩn hóa params trước khi gọi Jira API
│   ├── jira-push-format-response.js   # Format response cập nhật Jira description
│   └── jira-push-preflight.js         # Preflight kiểm tra quyền & chuẩn bị ADF
├── cr/                                # Domain Code Review
│   └── cr-filter-diff.js              # Lọc bỏ lockfiles, binary và phân tầng diff
├── db/                                # Domain Cơ Sở Dữ Liệu & MDDS Recon
│   ├── db-recon-core-format.js        # Tách kết quả đối chiếu thành 4 mục riêng biệt
│   ├── db-recon-core-runner.js        # Thực thi runner db-recon-core.js
│   ├── metabase-normalize-response.js # Chuẩn hóa bảng kết quả truy vấn Metabase
│   ├── metabase-prepare-query.js      # Kiểm tra sanitizer & chuẩn bị câu SQL Metabase
│   ├── watchdog-prepare-query.js      # SQL kiểm tra dữ liệu MDDS TimescaleDB
│   └── watchdog-verify-health.js      # Đánh giá trạng thái sức khỏe và tính toàn vẹn
├── qa/                                # Domain QA / Automation Testing
│   ├── jira-poll-prepare.js           # Chuẩn bị truy vấn Jira polling
│   ├── jira-ready-to-test-filter.js   # Lọc sự kiện Jira Ready to Test (Board G.3.1)
│   ├── qa-extract-issuekey.js         # Trích xuất issueKey và params kiểm thử
│   ├── qa-format-result.js            # Định dạng kết quả Pytest & tổng hợp log
│   ├── qa-run-pytest.js               # Kích hoạt lệnh chạy Pytest ngầm
│   ├── securities-domain-engine.js    # Ma trận quy tắc nghiệp vụ & lint Gherkin
│   ├── securities-fixture-engine.js   # Tạo bộ test fixtures chứng khoán 4 sàn
│   ├── squash-format-report.js        # Định dạng báo cáo Markdown đẩy Squash TM
│   └── squash-push-engine.js          # Batch push test cases lên Squash TM API
├── ops/                               # Domain Vận hành (Global Error Handler)
│   └── error-log-writer.js            # Ghi lỗi workflow ra workspace/.n8n-errors.log
├── security/                          # Domain Bảo Mật
│   └── security-digest-engine.js      # Trích xuất CVE High/Critical & quét secret rò rỉ
├── sm/                                # Domain Scrum Master
│   ├── sm-analyze-standup.js          # Phân tích tiến độ Sprint và blockers
│   ├── sm-prepare-issues.js           # Chuẩn bị danh sách issue trong Sprint
│   └── sm-prepare-standup.js          # Chuẩn bị dữ liệu Sprint cho Standup hàng ngày
└── sync/                              # Domain Đồng bộ Kho Mã Nguồn
    └── daily-repo-sync-node.js        # Kích hoạt git fetch/pull tự động hàng ngày
```

---

## 🗺️ Bảng Ánh Xạ Node Script -> Workflow JSON (32 Nodes)

| Domain | Node Script File | Workflow File | Node Name |
| :--- | :--- | :--- | :--- |
| **Atlassian** | `atlassian/jira-my-tasks-query.js` | `n8n-workflows/atlassian/jira-my-tasks-notifier.json` | `Prepare My Tasks Query` |
| **Atlassian** | `atlassian/jira-my-tasks-delta.js` | `n8n-workflows/atlassian/jira-my-tasks-notifier.json` | `Detect My Tasks Delta` |
| **Atlassian** | `atlassian/jira-my-tasks-slack.js` | `n8n-workflows/atlassian/jira-my-tasks-notifier.json` | `Build Slack Message` |
| **Atlassian** | `atlassian/jira-action-skill-pre-respond.js` | `n8n-workflows/atlassian/jira-my-tasks-notifier.json` | `Pre-respond Auto-Close HTML` |
| **Atlassian** | `atlassian/jira-action-skill-dispatcher.js` | `n8n-workflows/atlassian/jira-my-tasks-notifier.json` | `Dispatch Action Skill` |
| **BA** | `ba/jira-prepare-request.js` | `n8n-workflows/atlassian/jira-fast-ingestor.json` | `Prepare Jira Request` |
| **BA** | `ba/jira-clean-payload.js` | `n8n-workflows/atlassian/jira-fast-ingestor.json` | `Filter & Clean Payload` |
| **BA** | `ba/jira-push-preflight.js` | `n8n-workflows/atlassian/jira-spec-pusher.json` | `Pre-flight Gate & ADF Converter` |
| **BA** | `ba/jira-push-format-response.js` | `n8n-workflows/atlassian/jira-spec-pusher.json` | `Format Response & Audit` |
| **BA** | `ba/confluence-clean-payload.js` | `n8n-workflows/atlassian/confluence-doc-fetcher.json` | `Confluence Clean Payload` |
| **QA** | `qa/qa-extract-issuekey.js` | `n8n-workflows/qa-squash/qa-run-test-workflow.json` | `Extract issueKey` |
| **QA** | `qa/qa-run-pytest.js` | `n8n-workflows/qa-squash/qa-run-test-workflow.json` | `Run Pytest` |
| **QA** | `qa/qa-format-result.js` | `n8n-workflows/qa-squash/qa-run-test-workflow.json` | `Format Result` |
| **QA** | `qa/squash-push-engine.js` | `n8n-workflows/qa-squash/squash-batch-pusher.json` | `Execute Squash Push Engine` |
| **QA** | `qa/squash-format-report.js` | `n8n-workflows/qa-squash/squash-batch-pusher.json` | `Format Squash Report Markdown` |
| **QA** | `qa/jira-poll-prepare.js` | `n8n-workflows/atlassian/jira-ready-to-test-notifier.json` | `Prepare Jira Polling Query` |
| **QA** | `qa/jira-ready-to-test-filter.js` | `n8n-workflows/atlassian/jira-ready-to-test-notifier.json` | `Filter Board G31 & Ready to Test` |
| **QA** | `qa/securities-fixture-engine.js` | `n8n-workflows/data-recon/securities-fixture-generator.json` | `Securities Fixture Engine` |
| **QA** | `qa/securities-domain-engine.js` | `n8n-workflows/data-recon/securities-domain-engine.json` | `Securities Domain Engine` |
| **DB** | `db/metabase-prepare-query.js` | `n8n-workflows/data-recon/metabase-query-executor.json` | `Prepare & Sanitize Query` |
| **DB** | `db/metabase-normalize-response.js` | `n8n-workflows/data-recon/metabase-query-executor.json` | `Normalize & Format Response` |
| **DB** | `db/watchdog-prepare-query.js` | `n8n-workflows/data-recon/db-mdds-recon-watchdog.json` | `Prepare Watchdog Query` |
| **DB** | `db/watchdog-verify-health.js` | `n8n-workflows/data-recon/db-mdds-recon-watchdog.json` | `Verify Health & Parity` |
| **DB** | `db/db-recon-core-runner.js` | `n8n-workflows/data-recon/db-mdds-recon-core.json` | `Run Core Recon Engine` |
| **DB** | `db/db-recon-core-format.js` | `n8n-workflows/data-recon/db-mdds-recon-core.json` | `Format 4 Separate Messages` |
| **SM** | `sm/sm-prepare-standup.js` | `n8n-workflows/ops/sm-daily-standup-cron.json` | `Prepare Standup Request` |
| **SM** | `sm/sm-prepare-issues.js` | `n8n-workflows/ops/sm-daily-standup-cron.json` | `Prepare Sprint Issues Request` |
| **SM** | `sm/sm-analyze-standup.js` | `n8n-workflows/ops/sm-daily-standup-cron.json` | `Analyze Velocity & Blockers` |
| **CR** | `cr/cr-filter-diff.js` | `n8n-workflows/ops/cr-diff-cleaner.json` | `CR Filter Diff` |
| **Security** | `security/security-digest-engine.js` | `n8n-workflows/ops/security-vulnerability-digest.json` | `Security Digest Engine` |
| **Sync** | `sync/daily-repo-sync-node.js` | `n8n-workflows/ops/daily-repo-sync-cron.json` | `Execute & Parse Daily Sync` |
| **Ops** | `ops/error-log-writer.js` | `n8n-workflows/ops/global-error-handler.json` | `Write Error Log` |
