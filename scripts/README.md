# Cấu Trúc Thư Mục Scripts (`scripts/`)

Thư mục `scripts/` chứa toàn bộ các công cụ dòng lệnh (CLI), kịch bản tự động hóa, kiểm định chất lượng (validators), kiểm thử (tests) và các engine tích hợp n8n phục vụ hệ sinh thái `agent-skills`.

---

## 📂 Sơ Đồ Cây Thư Mục

```text
scripts/
├── README.md                 # Tài liệu tổng quan cấu trúc & hướng dẫn sử dụng scripts
│
├── tests/                    # Toàn bộ Unit Test Suite (Node.js native test runner)
│   ├── ba-refine-push-spec-test.js
│   ├── db-recon-core-test.js
│   ├── db-recon-test.js
│   ├── n8n-client-test.js
│   ├── repo-sync-test.js
│   ├── run-evals-test.js
│   ├── skill-lint-test.js
│   ├── validate-artifact-paths-test.js
│   ├── validate-commands-test.js
│   ├── validate-reference-links-test.js
│   └── validate-versions-test.js
│
├── validators/               # Bộ công cụ kiểm định chất lượng & tính toàn vẹn (CI/CD Gates)
│   ├── validate-skills.js           # Kiểm tra cấu trúc SKILL.md, frontmatter, keywords
│   ├── validate-commands.js         # Kiểm định tính đồng bộ giữa TOML và Markdown commands
│   ├── validate-versions.js         # Kiểm tra tính nhất quán phiên bản giữa các manifests
│   ├── validate-reference-links.js  # Kiểm tra liên kết tương đối tham chiếu tài liệu
│   └── validate-artifact-paths.js   # Kiểm tra quy chuẩn đường dẫn workspace/{issueKey}/
│
├── db/                       # Bộ công cụ kết nối & đối chiếu dữ liệu TimescaleDB / Metabase
│   ├── db-recon.js                  # Engine đối chiếu chung TimescaleDB KRX MDDS (Master Dashboard)
│   ├── db-recon-prod.js             # Engine đối chiếu chuyên dụng trên môi trường Production
│   ├── db-recon-core.js             # Bộ đối chiếu 4 query cốt lõi & volume traded (16:00 daily)
│   └── metabase-sso-login.js        # Helper đăng nhập SSO tự động qua Playwright lấy Session Token
│
├── setup/                    # Bộ cài đặt môi trường & liên kết Plugins
│   ├── setup-mac.sh                 # Script bootstrap môi trường macOS (asdf, tools, config)
│   ├── setup-plugins.js             # Symlink/copy plugins vào thư mục cấu hình của agent
│   ├── setup-n8n.js                 # Khởi tạo n8n workspace, webhook tunnel và workflow import
│   └── build-commands.js            # Tạo tự động .claude/commands/*.md từ commands/*.toml của plugins
│
├── sync/                     # Bộ công cụ đồng bộ mã nguồn các microservices trong hệ thống
│   ├── repo-sync.js                 # Smart Git pull đa repo, tự động stash/reset & chuyển nhánh
│   └── daily-repo-sync.sh           # Shell script wrapper chạy cron sync đầu ngày
│
├── n8n/                      # Các script bảo trì hạ tầng & workflow n8n
│   ├── sync-n8n-nodes.js            # Đồng bộ trực tiếp mã nguồn từ scripts/n8n-nodes/ vào JSON
│   └── n8n-clean-workflows.js       # Format, làm sạch và chuẩn hóa các file n8n-workflows/*.json
│
├── evals/                    # Runner đánh giá chất lượng kỹ năng (Routing & Behavioral Evals)
│   └── run-evals.js                 # Runner thực thi Tier 2 (lexical trigger) & Tier 3 (behavioral)
│
├── lib/                      # Các thư viện dùng chung cốt lõi (Core Libraries)
│   ├── n8n-client.js                # Client giao tiếp n8n Fast-Path (HTTP Webhooks n8n-only)
│   └── skill-lint.js                # Bộ parser và ruleset kiểm tra cấu trúc SKILL.md (đa ngôn ngữ)
│
└── n8n-nodes/                # Clean JavaScript source code của các Code Node trong n8n workflows
    ├── README.md                    # Catalog chi tiết 22 code nodes ánh xạ vào từng workflow
    ├── ba/                          # Node scripts domain BA / PO (Jira prep, push, Confluence clean)
    ├── qa/                          # Node scripts domain QA (Pytest, Squash batch, Fixtures, Ready to test)
    ├── db/                          # Node scripts domain Database (Recon runner, format, Watchdog)
    ├── sm/                          # Node scripts domain Scrum Master (Daily standup aggregator)
    ├── cr/                          # Node scripts domain Code Review (Diff cleaner & layer classifier)
    ├── security/                    # Node scripts domain Security (Audit digest & secrets scanner)
    └── router/                      # Node scripts Router (Mattermost parser & action dispatcher)
```

---

## 🚀 Các Lệnh NPM Thường Dùng

| Lệnh | Mô Tả | Script Thực Thi |
|---|---|---|
| `npm run test:unit` | Chạy toàn bộ 13 file unit tests | `node --test scripts/tests/*-test.js` |
| `npm run validate` | Chạy 5 bộ kiểm định chất lượng | `scripts/validators/validate-*.js` |
| `npm run evals` | Chạy routing evals (Tier 2) | `node scripts/evals/run-evals.js` |
| `npm run db:recon:core` | Chạy đối chiếu 4 query cốt lõi | `node scripts/db/db-recon-core.js` |
| `npm run db:recon:prod` | Chạy đối chiếu TimescaleDB Prod | `node scripts/db/db-recon-prod.js` |
| `npm run metabase:login` | Đăng nhập SSO Metabase qua Playwright | `node scripts/db/metabase-sso-login.js` |
| `npm run sync` | Đồng bộ git các repo microservice | `node scripts/sync/repo-sync.js` |
| `npm run n8n:sync-nodes` | Đồng bộ 22 node scripts vào workflows | `node scripts/n8n/sync-n8n-nodes.js` |
| `npm run n8n:clean` | Làm sạch & format n8n JSON workflows | `node scripts/n8n/n8n-clean-workflows.js` |
| `npm run setup:plugins` | Cài đặt / cập nhật plugins vào agent | `node scripts/setup/setup-plugins.js` |
| `npm run build` | Build các file command twins | `node scripts/setup/build-commands.js` |
