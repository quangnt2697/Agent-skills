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
├── ba/                                # Domain BA / Product Owner (WF-01, WF-03, WF-04)
│   ├── confluence-clean-payload.js    # Bóc tách Confluence XHTML sang Markdown
│   ├── jira-clean-payload.js          # Lọc sạch metadata Jira & giải nén ADF
│   ├── jira-prepare-request.js        # Chuẩn hóa params trước khi gọi Jira API
│   ├── jira-push-format-response.js   # Format response cập nhật Jira description
│   └── jira-push-preflight.js         # Preflight kiểm tra quyền & chuẩn bị ADF
├── cr/                                # Domain Code Review (WF-07)
│   └── cr-filter-diff.js              # Lọc bỏ lockfiles, binary và phân tầng diff
├── db/                                # Domain Cơ Sở Dữ Liệu & MDDS Recon (WF-09, WF-10, WF-12)
│   ├── db-recon-core-format.js        # Tách kết quả đối chiếu thành 4 tin nhắn Mattermost
│   ├── db-recon-core-runner.js        # Thực thi runner db-recon-core.js
│   ├── metabase-normalize-response.js # Chuẩn hóa bảng kết quả truy vấn Metabase
│   ├── metabase-prepare-query.js      # Kiểm tra sanitizer & chuẩn bị câu SQL Metabase
│   ├── watchdog-prepare-query.js      # SQL Bước 1: Kiểm tra Security Definition V3
│   ├── watchdog-prepare-query-realtime.js # SQL Bước 2: Kiểm tra reset 21 trường realtime
│   └── watchdog-verify-health.js      # Hợp nhất 2 bước kiểm tra & đánh giá trạng thái
├── qa/                                # Domain QA / Automation Testing (WF-02, WF-05, WF-06, WF-11)
│   ├── jira-ready-to-test-filter.js   # Lọc sự kiện Jira Ready to Test (Board G.3.1)
│   ├── qa-extract-issuekey.js         # Trích xuất issueKey và params kiểm thử
│   ├── qa-format-result.js            # Định dạng kết quả Pytest & tổng hợp log
│   ├── qa-run-pytest.js               # Kích hoạt lệnh chạy Pytest ngầm
│   ├── securities-fixture-engine.js   # Tạo bộ test fixtures chứng khoán 4 sàn
│   ├── squash-format-report.js        # Định dạng báo cáo Markdown đẩy Squash TM
│   └── squash-push-engine.js          # Batch push test cases lên Squash TM API
├── router/                            # Domain Mattermost Routing (WF-00)
│   └── router-parse-ai-output.js      # Phân tích cú pháp lệnh `/agent` từ Mattermost
├── security/                          # Domain Bảo Mật (WF-08)
│   └── security-digest-engine.js      # Trích xuất CVE High/Critical & quét secret rò rỉ
└── sm/                                # Domain Scrum Master (WF-13)
    └── sm-prepare-standup.js          # Chuẩn bị dữ liệu Sprint cho Standup hàng ngày
```

---

## 🗺️ Bảng Ánh Xạ Node Script -> Workflow JSON

| Domain | Node Script File | Workflow File | Node Name |
| :--- | :--- | :--- | :--- |
| **BA** | `ba/jira-prepare-request.js` | `n8n-workflows/jira-fast-ingestor.json` | `Prepare Jira Request` |
| **BA** | `ba/jira-clean-payload.js` | `n8n-workflows/jira-fast-ingestor.json` | `Filter & Clean Payload` |
| **BA** | `ba/jira-push-preflight.js` | `n8n-workflows/jira-spec-pusher.json` | `Pre-flight Gate & ADF Converter` |
| **BA** | `ba/jira-push-format-response.js` | `n8n-workflows/jira-spec-pusher.json` | `Format Response & Audit` |
| **BA** | `ba/confluence-clean-payload.js` | `n8n-workflows/confluence-doc-fetcher.json` | `Confluence Clean Payload` |
| **QA** | `qa/qa-extract-issuekey.js` | `n8n-workflows/qa-run-test-workflow.json` | `Extract issueKey` |
| **QA** | `qa/qa-run-pytest.js` | `n8n-workflows/qa-run-test-workflow.json` | `Run Pytest` |
| **QA** | `qa/qa-format-result.js` | `n8n-workflows/qa-run-test-workflow.json` | `Format Result` |
| **QA** | `qa/squash-push-engine.js` | `n8n-workflows/squash-batch-pusher.json` | `Execute Squash Push Engine` |
| **QA** | `qa/squash-format-report.js` | `n8n-workflows/squash-batch-pusher.json` | `Format Squash Report Markdown` |
| **QA** | `qa/securities-fixture-engine.js` | `n8n-workflows/securities-fixture-generator.json` | `Securities Fixture Engine` |
| **QA** | `qa/jira-ready-to-test-filter.js` | `n8n-workflows/jira-ready-to-test-notifier.json` | `Filter Board G31 & Ready to Test` |
| **DB** | `db/metabase-prepare-query.js` | `n8n-workflows/metabase-query-executor.json` | `Prepare & Sanitize Query` |
| **DB** | `db/metabase-normalize-response.js` | `n8n-workflows/metabase-query-executor.json` | `Normalize & Format Response` |
| **DB** | `db/watchdog-prepare-query.js` | `n8n-workflows/db-mdds-recon-watchdog.json` | `Prepare Watchdog Query` |
| **DB** | `db/watchdog-verify-health.js` | `n8n-workflows/db-mdds-recon-watchdog.json` | `Verify Health & Parity` |
| **DB** | `db/db-recon-core-runner.js` | `n8n-workflows/db-mdds-recon-core.json` | `Run Core Recon Engine` |
| **DB** | `db/db-recon-core-format.js` | `n8n-workflows/db-mdds-recon-core.json` | `Format 4 Separate Messages` |
| **SM** | `sm/sm-prepare-standup.js` | `n8n-workflows/sm-daily-standup-cron.json` | `Prepare Standup Request` |
| **CR** | `cr/cr-filter-diff.js` | `n8n-workflows/cr-diff-cleaner.json` | `CR Filter Diff` |
| **Security** | `security/security-digest-engine.js` | `n8n-workflows/security-vulnerability-digest.json` | `Security Digest Engine` |
| **Router** | `router/router-parse-ai-output.js` | `n8n-workflows/mattermost-single-router.json` | `Parse AI Output` |
