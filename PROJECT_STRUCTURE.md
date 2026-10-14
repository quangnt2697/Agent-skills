# 📁 Cấu Trúc Dự Án: `agent-skills`

> **Phiên bản**: 1.0.0 | **Node**: >=20 | **License**: MIT  
> **Mô tả**: Bộ sưu tập kỹ năng cấp sản xuất cho AI coding agents — BA, DEV, QA, Scrum Master, Code Reviewer, Security Auditor, Web Performance Auditor.

---

## 🗂️ Tổng quan cấu trúc (đã chuẩn hóa)

```
agent-skills/
├── 📄 AGENTS.md                    # Rules & persona definitions cho tất cả agents
├── 📄 CLAUDE.md                    # Rules riêng cho Claude agent
├── 📄 CONTEXT.md                   # Context chung của dự án
├── 📄 CONTRIBUTING.md              # Hướng dẫn đóng góp
├── 📄 README.md                    # Tài liệu chính của dự án
├── 📄 LICENSE                      # MIT License
├── 📄 plugin.json                  # Plugin metadata (root level)
├── 📄 package.json                 # Node.js dependencies & npm scripts
│
├── 📁 config/                      # ★ [MỚI] Tập trung file cấu hình hệ thống
│   ├── projects.json               # Danh sách microservices/repos cần sync
│   ├── sm-config.yaml              # Config cho Scrum Master persona
│   └── ecosystem.config.cjs        # PM2 config cho n8n background process
│
├── 📁 plugins/                     # ★ CORE: 8 plugin persona
├── 📁 .agents/                     # Workspace-level customizations (rules, hooks)
├── 📁 scripts/                     # Automation scripts (Node.js)
├── 📁 n8n-workflows/               # n8n workflow definitions (JSON) — phân theo domain
├── 📁 docs/                        # Architecture & technical documentation
├── 📁 references/                  # Domain knowledge base (chứng khoán, fintech)
├── 📁 workspace/                   # ★ [CẤU TRÚC MỚI] Output artifacts
├── 📁 evals/                       # Evaluation cases & fixtures
└── 📄 .env / .env.example          # Biến môi trường
```

> **⚠️ Đã loại bỏ khỏi root:** `hooks/` (→ `.agents/hooks/`), `reports/` (→ `workspace/adhoc/reports/`), `sm-config.yaml` / `projects.json` / `ecosystem.config.cjs` (→ `config/`)

---

## 📦 `plugins/` — 8 Persona Plugins

Mỗi plugin theo cấu trúc chuẩn: `plugin.json` + `skills/` + `agents/` + `commands/`

```
plugins/
├── 📁 ba-po/                       # Business Analyst / Product Owner
│   └── skills/
│       ├── ba-backlog-prioritization/   # Sắp xếp backlog (MoSCoW, WSJF)
│       ├── ba-design-flowchart/         # Tạo sơ đồ SVG/HTML (không dùng Mermaid)
│       ├── ba-gap-analysis/             # Phân tích khoảng cách AS-IS → TO-BE
│       ├── ba-interview-me/             # Phỏng vấn khai thác yêu cầu (single)
│       ├── ba-process-modeling/         # Vẽ sơ đồ nghiệp vụ (Swimlane, BPMN)
│       ├── ba-refine/                   # Refine ý tưởng thô → spec chi tiết
│       ├── ba-spec/                     # Import Jira/Confluence → *-final.md
│       ├── ba-stakeholder-interview/    # Phỏng vấn đa đối tượng stakeholder
│       └── ba-user-story-writing/       # Viết User Stories + Gherkin AC
│       ┌─────────────────────────────────────────────────────────────┐
│       │ Phân biệt: ba-interview-me (đơn nhân, khai thác yêu cầu)  │
│       │            ba-stakeholder-interview (đa đối tượng, multi)  │
│       └─────────────────────────────────────────────────────────────┘
│
├── 📁 dev/                         # Software Developer
│   └── skills/
│       ├── dev-api-design/              # Thiết kế REST/GraphQL API contracts
│       ├── dev-audit-and-fix/           # Audit kiến trúc + tự động sửa
│       ├── dev-browser-testing-with-devtools/  # Debug với Chrome DevTools
│       ├── dev-debugging/               # Root cause analysis & bug fix
│       ├── dev-doubt-driven-development/       # Đánh giá đối kháng rủi ro cao
│       ├── dev-frontend-engineering/    # UI/UX frontend, WCAG, responsive
│       ├── dev-incremental-implementation/     # Triển khai từng bước an toàn
│       ├── dev-performance/             # Tối ưu Core Web Vitals, N+1, DB  [Shift-Left]
│       ├── dev-planning-and-task-breakdown/    # Chia nhỏ task theo thứ tự
│       ├── dev-refactoring/             # Red-Green-Refactor TDD
│       ├── dev-security/                # Hardening OWASP, auth, sessions  [Shift-Left]
│       ├── dev-source-driven-development/      # Dựa trên official docs
│       ├── dev-spec-driven-development/        # Viết Tech-Spec từ Business-Spec
│       └── dev-test-driven-development/        # TDD unit tests
│
├── 📁 qa/                          # QA / SDET Automation Engineer
│   └── skills/
│       ├── qa-auto-design/              # Sinh automation code (Playwright/Pytest POM)
│       ├── qa-code2spec/                # Dịch ngược code → spec nghiệp vụ
│       ├── qa-full-pipeline/            # E2E pipeline: design→auto→run→report
│       ├── qa-run-test/                 # Chạy Pytest, đo lường kết quả
│       ├── qa-squash-push/              # Sync Gherkin lên Squash TM
│       └── qa-test-design/              # Thiết kế Checklist + BDD Gherkin
│       ┌─────────────────────────────────────────────────────────────────────┐
│       │ ⚠️ TEST DATA: BẮT BUỘC chỉ dùng Metabase UAT ($METABASE_UAT_DB) │
│       │ NGHIÊM CẤM kết nối Production DB trong bất kỳ skill QA nào       │
│       └─────────────────────────────────────────────────────────────────────┘
│
├── 📁 core/                        # Core / Meta Skills (KHÔNG chứa domain skills)
│   └── skills/
│       ├── meta-context/                # Tối ưu thiết lập context cho agent
│       ├── meta-continuous-learning/    # Đúc kết bài học → Rules
│       ├── meta-cross-validation/       # Xác thực traceability Spec↔Test
│       ├── meta-session-checkpoint/     # Nén/khôi phục context session
│       ├── meta-using-agent-skills/     # Khám phá và gọi skills
│       └── repo-group-sync/             # Sync code từ nhiều microservice repos
│       [Đã tách: db-timescale-reconciler → fintech-data plugin riêng]
│
├── 📁 scrum-master/                # Scrum Master
│   └── skills/
│       ├── sm-daily-standup/            # Daily Standup tự động từ Jira
│       ├── sm-impediment-triage/        # Xử lý ticket bị block
│       ├── sm-sprint-planning/          # Lập kế hoạch Sprint từ backlog
│       └── sm-sprint-retrospective/     # Tổng kết Sprint, Velocity
│
├── 📁 code-reviewer/               # Code Reviewer + Audit Gate
│   └── skills/
│       ├── cr-code-simplification/      # Simplify code, giảm complexity
│       ├── cr-review-code-and-quality/  # Multi-axis review (Alibaba-style)
│       ├── security-code-audit/         # OWASP Top 10 scan  [Gate Phase]
│       └── webperf-core-vitals/         # Đo LCP, FID, CLS   [Gate Phase]
│       ┌────────────────────────────────────────────────────────────────────┐
│       │ Phân biệt phase:                                                  │
│       │   dev-security / dev-performance  → Shift-Left (khi viết code)   │
│       │   security-code-audit / webperf   → Gate/Audit (sau khi hoàn thành) │
│       └────────────────────────────────────────────────────────────────────┘
│
└── 📁 fintech-data/                # ★ [MỚI] Domain chứng khoán & Data Ops
    └── skills/
        └── db-timescale-reconciler/     # Đối chiếu dữ liệu KRX MDDS TimescaleDB
```

> **Gộp plugin:** `security-auditor` và `web-performance-auditor` đơn skill đã được gộp vào `code-reviewer` để giảm chi phí quản lý symlink và tránh intent collision cho Agent Router.

---

## 🤖 `.agents/` — Workspace Customizations

```
.agents/
├── 📁 hooks/                       # ★ [GỘP] Từ /hooks root vào đây
│   ├── hooks.json                  # Hook definitions
│   ├── antigravity/                # Hooks cho Antigravity (AGY) agent
│   └── claude/                     # Hooks cho Claude agent
├── 📁 plugins/
│   └── marketplace.json            # Plugin marketplace registry
└── 📁 rules/
    ├── action-first-adhd.md        # Chuẩn giao tiếp Action-First (Always-on)
    ├── autonomy-contract.md        # Điều kiện dừng hỏi user (5 cases)
    ├── confidence-level.md         # Hệ thống Confidence Level (90/70/<70%)
    ├── git-workflow.md             # Branch-based git workflow rules
    ├── skills-contributing.md      # Hướng dẫn đóng góp skill mới
    └── workspace-paths.md          # ★ Chuẩn đường dẫn artifact + LUẬT UAT
```

> **Đã loại bỏ:** `.agents/db-client.js` → chuyển về `scripts/lib/db-client.js`

---

## ⚙️ `scripts/` — Automation Scripts (Node.js)

```
scripts/
├── 📄 README.md
├── 📄 daily-repo-sync.sh           # Shell script sync repos hàng ngày
├── 📁 lib/                         # ★ Tất cả shared clients tập trung ở đây
│   ├── figma-client.js             # Figma API client
│   ├── n8n-client.js               # n8n webhook client (fast-path)
│   ├── db-client.js                # ★ [MỚI VỊ TRÍ] Metabase READ-ONLY client
│   └── skill-lint.js               # Skill linter utility
├── 📁 db/                          # Database scripts (chỉ db-recon ops)
│   ├── db-recon.js                 # DB recon UAT (mặc định METABASE_ENV=uat)
│   ├── db-recon-prod.js            # DB recon Production (Production LOCK)
│   ├── db-recon-core.js            # DB recon core 4 bài kiểm tra (Production LOCK)
│   └── metabase-sso-login.js       # Metabase SSO auth
├── 📁 setup/                       # Setup & installation scripts
│   ├── setup-mac.sh                # macOS environment setup
│   ├── setup-plugins.js            # Install/symlink plugins
│   ├── setup-claude.js             # Claude agent setup
│   ├── setup-n8n.js                # n8n initial setup
│   ├── n8n-autostart.js            # n8n autostart on/off
│   └── build-commands.js           # Build slash commands
├── 📁 sync/
│   └── repo-sync.js                # Multi-repo sync logic
├── 📁 n8n/
│   ├── n8n-clean-workflows.js      # Clean old n8n workflows
│   └── sync-n8n-nodes.js           # Sync custom n8n nodes
├── 📁 workspace/                   # ★ [PLANNED] Workspace management scripts
│   └── archive-issues.js           # Nén issues cũ > 30 ngày sang workspace/archive/
├── 📁 validators/                  # Validation scripts (chạy trong CI)
│   ├── validate-skills.js
│   ├── validate-commands.js
│   ├── validate-versions.js
│   ├── validate-reference-links.js
│   └── validate-artifact-paths.js  # Kiểm tra chuẩn workspace/issues|sprints|adhoc
├── 📁 qa/
│   └── qa-validate.js
├── 📁 evals/
│   └── run-evals.js
└── 📁 tests/
    └── *-test.js
```

---

## 🔄 `n8n-workflows/` — n8n Workflow Definitions (Phân nhóm theo Domain)

> 18 workflows chia theo 4 domain thay vì để phẳng

```
n8n-workflows/
├── 📁 atlassian/                   # Jira + Confluence integration
│   ├── jira-fast-ingestor.json         # Import nhanh issue từ Jira
│   ├── jira-spec-pusher.json           # Push spec lên Jira
│   ├── jira-ready-to-test-notifier.json # Thông báo Mattermost khi Ready to Test
│   └── confluence-doc-fetcher.json     # Lấy tài liệu từ Confluence
│
├── 📁 qa-squash/                   # QA & Squash TM
│   ├── squash-batch-pusher.json        # Push Gherkin lên Squash TM batch
│   ├── qa-run-test-workflow.json       # Chạy automation test qua n8n
│   └── web-ui-locator-discovery.json   # Khám phá UI locators tự động
│
├── 📁 data-recon/                  # Database & Securities domain
│   ├── db-mdds-recon-core.json         # Reconcile MDDS TimescaleDB (core)
│   ├── db-mdds-recon-watchdog.json     # Watchdog monitor DB recon
│   ├── metabase-query-executor.json    # Thực thi query Metabase
│   ├── securities-domain-engine.json   # Engine nghiệp vụ chứng khoán
│   ├── securities-fixture-generator.json # Sinh fixture dữ liệu chứng khoán
│   └── local-workspace-resolver.json   # Resolve workspace path cục bộ
│
└── 📁 ops/                         # Operations & System
    ├── mattermost-single-router.json   # Router thông báo Mattermost
    ├── sm-daily-standup-cron.json      # Daily standup cron job
    ├── daily-repo-sync-cron.json       # Cron sync repos hàng ngày
    ├── cr-diff-cleaner.json            # Làm sạch code diff trước review
    └── security-vulnerability-digest.json # Digest lỗ hổng bảo mật
```

---

## 📚 `docs/` — Architecture Documentation

```
docs/
├── 📄 README.md
├── 📁 architecture/
│   ├── ba-ac-vs-qa-gherkin-overlap-analysis.md
│   ├── ba-workflow-detail.md
│   ├── n8n-integration-strategy.md
│   ├── orchestration-patterns.md
│   └── test-ownership.md
└── 📁 guides/
```

---

## 🔬 `references/` — Domain Knowledge Base

```
references/
├── 📄 securities-domain-rules.md   # Quy tắc nghiệp vụ chứng khoán
├── 📄 timescale-schema.md          # Schema TimescaleDB (11 topics KRX MDDS)
└── 📁 securities/                  # Tài liệu chuyên sâu fintech
```

---

## 🗃️ `workspace/` — Artifact Output (Phân tầng rõ ràng)

```
workspace/
├── 📁 issues/                      # ★ Per-Issue artifacts (BA/QA/DEV)
│   └── {issueKey}/                 # VD: G3PTP-17483/
│       ├── .pipeline-state.json
│       ├── source/                 # Nguyên liệu tải về
│       ├── spec/                   # BA/PO: final.md, gap-analysis.md...
│       ├── tech/                   # DEV: tech-spec.md, plan.md...
│       ├── test/                   # QA: checklist.md, .feature, steps/, result/
│       └── trace/                  # matrix.md, gaps.md
│
├── 📁 sprints/                     # ★ Sprint-level artifacts (Scrum Master)
│   └── sprint/
│       ├── tech/                   # sprint-plan.md
│       └── trace/                  # standup, retro reports
│
├── 📁 adhoc/                       # ★ Tác vụ nội bộ không gắn ticket
│   ├── database/
│   ├── project-review/
│   ├── qa-skills-improvement/
│   └── reports/
│
└── 📁 archive/                     # ★ Issues hoàn thành > 30 ngày
    └── {issueKey}/                 # (script: npm run workspace:archive)
```

> **Quy tắc đường dẫn:**
> - BA/QA/DEV → `workspace/issues/{issueKey}/`
> - Scrum Master → `workspace/sprints/{sprintId}/`
> - Adhoc/internal → `workspace/adhoc/{slug}/`
> - **CẤM** `reports/`, `docs/`, `output/` ở gốc repo

---

## 📋 NPM Scripts Chính

| Script | Mục đích |
|--------|----------|
| `npm run setup` | Cài đặt và symlink tất cả plugins |
| `npm run validate` | Chạy toàn bộ validators (skills, commands, paths...) |
| `npm run test` | validate + unit test + evals |
| `npm run n8n` | Khởi động n8n local |
| `npm run n8n:bg` | Chạy n8n background (PM2) |
| `npm run n8n:import` | Import tất cả workflows theo subdirectory |
| `npm run n8n:export` | Export workflows từ n8n |
| `npm run repo:sync` | Sync tất cả microservice repos |
| `npm run db:recon` | Reconcile database (UAT — mặc định) |
| `npm run db:recon:prod` | Reconcile database (Production — dùng cẩn thận) |
| `npm run metabase:login` | Login Metabase SSO |

---

## 🏗️ Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Runtime | Node.js ≥ 20 (ESM modules) |
| Process Manager | PM2 |
| Automation Engine | n8n |
| Browser Testing | Playwright |
| Test Runner | Pytest (Python) |
| TOML Parser | smol-toml |
| DB Client | `scripts/lib/db-client.js` (READ-ONLY, UAT mặc định) |
| Agent Runtimes | Antigravity (AGY), Claude, OpenAI-compatible |

---

## 🔑 Quy Ước Quan Trọng

| Quy tắc | Chi tiết |
|---------|---------|
| **Output path (Issue)** | `workspace/issues/{issueKey}/{source\|spec\|tech\|test\|trace}/` |
| **Output path (Sprint)** | `workspace/sprints/{sprintId}/{tech\|trace}/` |
| **Output path (Adhoc)** | `workspace/adhoc/{slug}/` |
| **Branch naming** | `feature/{issueKey}`, `fix/{issueKey}`, `refactor/{desc}` |
| **Ngôn ngữ tài liệu** | Tiếng Việt |
| **Commit** | Chỉ sau khi user approve + verify |
| **Skill internals** | KHÔNG leak SKILL.md ra output |
| **n8n** | Fast-path, không fallback. Offline → báo user |
| **Test data** | ✅ **CHỈ** Metabase UAT (`$METABASE_UAT_DB_TIMESCALE_ID`) |
| **Production DB** | ❌ **CẤM** dùng trong QA skills — chỉ `db-recon-prod.js` |

---

## 🔄 Lộ Trình Cải Thiện (Đã Hoàn Tất 10/10)

| # | Trạng thái | Việc cần làm |
|---|-----------|--------------|
| 1 | ✅ Done | Di chuyển `db-client.js` → `scripts/lib/` |
| 2 | ✅ Done | Phân tầng `workspace/` thành issues/sprints/adhoc |
| 3 | ✅ Done | Gộp `hooks/` vào `.agents/hooks/` |
| 4 | ✅ Done | Tạo `config/` tập trung file cấu hình root |
| 5 | ✅ Done | Phân nhóm `n8n-workflows/` theo domain |
| 6 | ✅ Done | Cập nhật `workspace-paths.md` + luật UAT |
| 7 | ✅ Done | Tạo `plugins/fintech-data/` (tách `db-timescale-reconciler`) |
| 8 | ✅ Done | Gộp `security-auditor` + `webperf` vào `code-reviewer` |
| 9 | ✅ Done | Script `scripts/workspace/archive-issues.js` + npm run workspace:archive |
| 10 | ✅ Done | Cập nhật `validate-artifact-paths.js` theo cấu trúc mới |

---

*Cập nhật: 2026-10-14 | Tác giả: AI Agent (Antigravity)*
