# Cấu Trúc Thư Mục Scripts (`scripts/`)

Thư mục `scripts/` chứa toàn bộ các công cụ dòng lệnh (CLI), kịch bản tự động hóa, kiểm định chất lượng (validators), kiểm thử (tests) và các engine tích hợp n8n phục vụ hệ sinh thái `agent-skills`.

---

## 📂 Sơ Đồ Cây Thư Mục

```text
scripts/
├── README.md                 # Tài liệu tổng quan cấu trúc & hướng dẫn sử dụng scripts
│
├── tests/                    # Toàn bộ Unit Test Suite (19 file test suites, 172 test cases)
│   ├── archive-issues-test.js       # Kiểm thử lưu trữ archive workspace issue
│   ├── ba-refine-push-spec-test.js  # Kiểm thử nén spec và đẩy spec lên Jira qua n8n
│   ├── db-recon-core-test.js        # Kiểm thử suite 4 query cốt lõi TimescaleDB
│   ├── db-recon-test.js             # Kiểm thử CLI parser, thay thế tham số & catalog đối chiếu
│   ├── n8n-client-test.js           # Kiểm thử n8n fast-path client & retry logic
│   ├── qa-init-test.js              # Kiểm thử khởi tạo thư mục test, fixtures & scaffolding
│   ├── qa-validate-test.js          # Kiểm thử quy tắc checklist & BDD syntax
│   ├── repo-sync-test.js            # Kiểm thử tính năng Git fetch/pull đa nhánh & 2-tier scanning
│   ├── router-verify-token-test.js  # Kiểm thử xác thực slash token Mattermost
│   ├── run-evals-test.js            # Kiểm thử runner đánh giá trigger rank-1
│   ├── setup-claude-test.js         # Kiểm thử tạo symlink & biến môi trường Claude Code
│   ├── skill-lint-test.js           # Kiểm thử lint cấu trúc SKILL.md đa ngôn ngữ
│   ├── squash-push-scope-test.js    # Kiểm thử đồng bộ & xóa phạm vi test case Squash TM
│   ├── sync-n8n-nodes-test.js       # Kiểm thử đồng bộ code node JavaScript vào workflow JSON
│   ├── trace-check-test.js          # Kiểm thử ma trận truy vết BR/AC giữa spec và test
│   ├── validate-artifact-paths-test.js # Kiểm thử ranh giới 5 thư mục canonical workspace
│   ├── validate-commands-test.js    # Kiểm thử tính đồng bộ TOML và Markdown commands
│   ├── validate-reference-links-test.js# Kiểm thử liên kết tương đối nội bộ SKILL.md
│   └── validate-versions-test.js    # Kiểm thử tính nhất quán phiên bản manifests
│
├── validators/               # Bộ công cụ kiểm định chất lượng & tính toàn vẹn (8 CI/CD Gates)
│   ├── validate-skills.js           # Gate 1: Kiểm tra cấu trúc SKILL.md, frontmatter, keywords
│   ├── validate-commands.js         # Gate 2: Kiểm định đồng bộ giữa TOML và Markdown commands
│   ├── validate-versions.js         # Gate 3: Kiểm tra nhất quán phiên bản giữa các manifests
│   ├── validate-reference-links.js  # Gate 4: Kiểm tra liên kết tương đối tham chiếu tài liệu
│   ├── validate-artifact-paths.js   # Gate 5: Kiểm tra quy chuẩn đường dẫn workspace/issues/{issueKey}/
│   └── validate-skill-tokens.js     # Gate 8: Kiểm định độ dài & ngân sách token cho SKILL.md
│
├── db/                       # Bộ công cụ kết nối & đối chiếu dữ liệu TimescaleDB / Metabase
│   ├── db-recon.js                  # Engine đối chiếu chung TimescaleDB KRX MDDS (Master Dashboard)
│   ├── db-recon-prod.js             # Engine đối chiếu chuyên dụng trên môi trường Production (Lock hardcoded)
│   ├── db-recon-core.js             # Bộ đối chiếu 4 query cốt lõi & volume traded (16:00 daily)
│   └── metabase-sso-login.js        # Helper đăng nhập SSO tự động qua Playwright lấy Session Token
│
├── setup/                    # Bộ cài đặt môi trường & liên kết Plugins
│   ├── setup-mac.sh                 # Script bootstrap môi trường macOS (asdf, tools, config)
│   ├── setup-plugins.js             # Symlink/copy plugins vào thư mục cấu hình của agent
│   ├── setup-n8n.js                 # Khởi tạo n8n workspace, webhook tunnel và workflow import
│   ├── setup-claude.js              # Cài đặt / gỡ liên kết agent-skills cho Claude Code
│   ├── n8n-autostart.js             # Cấu hình tự khởi động background daemon n8n qua PM2
│   └── build-commands.js            # Tạo tự động .claude/commands/*.md từ commands/*.toml của plugins
│
├── sync/                     # Bộ công cụ đồng bộ mã nguồn các microservices trong hệ thống
│   ├── repo-sync.js                 # Smart Git pull đa repo, tự động stash/reset & chuyển nhánh
│   └── daily-repo-sync.sh           # Shell script wrapper chạy cron sync đầu ngày
│
├── n8n/                      # Các script bảo trì hạ tầng & workflow n8n
│   ├── sync-n8n-nodes.js            # Đồng bộ trực tiếp mã nguồn từ scripts/n8n-nodes/ vào JSON
│   ├── n8n-clean-workflows.js       # Format, làm sạch và chuẩn hóa các file n8n-workflows/*.json
│   └── export-workflows.js          # Xuất và phân loại tự động workflows vào 4 thư mục con
│
├── evals/                    # Runner đánh giá chất lượng kỹ năng (Routing & Behavioral Evals)
│   └── run-evals.js                 # Runner thực thi Tier 2 (lexical trigger) & Tier 3 (behavioral)
│
├── lib/                      # Các thư viện dùng chung cốt lõi (Core Libraries)
│   ├── n8n-client.js                # Client giao tiếp n8n Fast-Path (HTTP Webhooks n8n-only)
│   ├── db-client.js                 # Client kết nối Metabase API & TimescaleDB
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

## 🚀 Toàn Bộ 42 Lệnh NPM Được Hỗ Trợ

### 1. Kiểm định Chất lượng & Kiểm thử (Validation & Testing)

| Lệnh | Mô Tả | Script / Công Cụ Thực Thi |
|---|---|---|
| `npm test` | Chạy toàn bộ pipeline: 8 validators + 19 unit test suites + evals | `npm run validate && npm run test:unit && npm run evals` |
| `npm run lint` | Alias của `npm run validate` | `npm run validate` |
| `npm run pretest` | Alias chuẩn bị kiểm thử | `npm run validate` |
| `npm run validate` | Chạy toàn bộ 8 cổng kiểm định hệ thống | Cả 8 script kiểm định dưới đây |
| `npm run validate:skills` | Gate 1: Kiểm định cấu trúc SKILL.md, frontmatter, trigger keywords | `node scripts/validators/validate-skills.js` |
| `npm run validate:commands` | Gate 2: Kiểm định đồng bộ giữa TOML và Markdown commands | `node scripts/validators/validate-commands.js` |
| `npm run validate:versions` | Gate 3: Kiểm tra nhất quán phiên bản giữa các manifests | `node scripts/validators/validate-versions.js` |
| `npm run validate:links` | Gate 4: Kiểm tra tính toàn vẹn liên kết tương đối references/ | `node scripts/validators/validate-reference-links.js` |
| `npm run validate:paths` | Gate 5: Kiểm định ranh giới 5 thư mục canonical workspace | `node scripts/validators/validate-artifact-paths.js` |
| `npm run validate:icons` | Gate 6: Kiểm tra thư viện icon gallery của flowchart | `node plugins/ba-po/skills/ba-design-flowchart/assets/build_icons_gallery.mjs --check` |
| `npm run validate:nodes` | Gate 7: Kiểm định đồng bộ code node JavaScript với n8n JSON | `node scripts/n8n/sync-n8n-nodes.js --check` |
| `npm run validate:tokens` | Gate 8: Kiểm định ngân sách token cho 30 file SKILL.md | `node scripts/validators/validate-skill-tokens.js` |
| `npm run test:unit` | Thực thi toàn bộ 19 file unit test suites (172 test cases) | `node --test scripts/tests/*-test.js` |
| `npm run evals` | Đo lường độ nhạy kích hoạt kỹ năng (Rank-1 trigger rate ≥ 90%) | `node scripts/evals/run-evals.js --min-rank1 90` |

### 2. Quản lý Không gian Làm việc & Snapshot (Workspace & Checkpoints)

| Lệnh | Mô Tả | Script / Công Cụ Thực Thi |
|---|---|---|
| `npm run workspace:archive` | Nén và đóng gói thư mục `workspace/` phục vụ lưu trữ | `node -e "/* archive script */"` |
| `npm run checkpoint:diff` | So sánh biến động file `workspace/` so với snapshot gần nhất | `git diff --stat workspace/` |

### 3. Cài đặt Môi trường, Plugins & Hooks (Setup & Plugins)

| Lệnh | Mô Tả | Script / Công Cụ Thực Thi |
|---|---|---|
| `npm run setup:mac` | Cài đặt trọn bộ môi trường macOS (asdf, tools, config) | `bash scripts/setup/setup-mac.sh` |
| `npm run setup:plugins` | Cài đặt/liên kết 6 plugins vào cấu hình agent CLI | `node scripts/setup/setup-plugins.js` |
| `npm run unlink:plugins` | Gỡ bỏ liên kết plugins khỏi cấu hình agent CLI | `node scripts/setup/setup-plugins.js --unlink` |
| `npm run plugin:export` | Đóng gói 1 plugin độc lập ra thư mục hoặc tarball | `node scripts/setup/export-plugin.js` |
| `npm run setup:claude` | Cài đặt symlink agent-skills cho Claude Code (toàn máy) | `node scripts/setup/setup-claude.js` |
| `npm run unlink:claude` | Gỡ bỏ cài đặt agent-skills khỏi Claude Code | `node scripts/setup/setup-claude.js --unlink` |
| `npm run setup:hooks` | Kích hoạt bộ hooks bảo vệ nhánh và workspace | `git config core.hooksPath .agents/hooks` |
| `npm run build` | Đồng bộ sinh tự động lệnh Markdown từ file TOML | `node scripts/setup/build-commands.js` |
| `npm run scan:ui-components` | Quét UI components từ web/mobile trading sang dictionary | `node plugins/ba-po/skills/ba-refine/assets/generate-ui-component-map.js` |

### 4. Dữ liệu Fintech & Đồng bộ Mã Nguồn (Fintech Data & Git Sync)

| Lệnh | Mô Tả | Script / Công Cụ Thực Thi |
|---|---|---|
| `npm run metabase:login` | Đăng nhập SSO Metabase tự động lấy session token | `node scripts/db/metabase-sso-login.js` |
| `npm run db:recon` | Đối chiếu dữ liệu TimescaleDB UAT mặc định | `node scripts/db/db-recon.js` |
| `npm run db:recon:prod` | Chạy đối chiếu TimescaleDB Production (Production LOCK) | `node scripts/db/db-recon-prod.js` |
| `npm run db:recon:core` | Chạy suite 4 bài đối chiếu Core (Ticks, TopPrice, Trade Extra) | `node scripts/db/db-recon-core.js` |
| `npm run sync` | Smart Git sync đa repo microservices trong group | `node scripts/sync/repo-sync.js` |

### 5. Hạ tầng Tự Động Hóa n8n (n8n Workflows & Automation)

| Lệnh | Mô Tả | Script / Công Cụ Thực Thi |
|---|---|---|
| `npm run n8n` | Khởi động n8n server ở chế độ foreground | `n8n start` |
| `npm run n8n:setup` | Khởi tạo cấu hình ban đầu cho n8n | `node scripts/setup/setup-n8n.js` |
| `npm run n8n:bg` | Khởi động n8n daemon chạy ngầm qua PM2 | `pm2 start config/ecosystem.config.cjs` |
| `npm run n8n:autostart` | Cấu hình tự động bật n8n khi khởi động máy | `node scripts/setup/n8n-autostart.js` |
| `npm run n8n:stop` | Dừng daemon n8n đang chạy ngầm | `pm2 stop config/ecosystem.config.cjs` |
| `npm run n8n:restart` | Khởi động lại daemon n8n | `pm2 restart config/ecosystem.config.cjs` |
| `npm run n8n:status` | Kiểm tra trạng thái tiến trình n8n trên PM2 | `pm2 status` |
| `npm run n8n:logs` | Xem luồng logs thời gian thực của daemon n8n | `pm2 logs` |
| `npm run n8n:import` | Nạp toàn bộ workflows từ 4 thư mục con vào n8n | `for d in n8n-workflows/*/; do n8n import:workflow --separate --input=$d; done` |
| `npm run n8n:export` | Xuất và phân loại tự động workflows n8n vào đúng 4 thư mục con | `node scripts/n8n/export-workflows.js` |
| `npm run n8n:clean` | Chuẩn hóa, format và làm sạch các file JSON workflows | `node scripts/n8n/n8n-clean-workflows.js` |
| `npm run n8n:sync-nodes` | Đồng bộ 22 file code node JS vào n8n workflow JSON | `node scripts/n8n/sync-n8n-nodes.js` |
