# Hướng Dẫn Cài Đặt (Installation Guide)

Tài liệu này là nguồn chân lý duy nhất cho việc thiết lập `agent-skills` trên máy mới. Chọn mức độ cài đặt bạn cần:

| Mức | Bạn muốn | Làm các giai đoạn | Thời gian |
|---|---|---|---|
| **Tối thiểu** | Dùng skills/slash commands trong AI Agent (Claude Code / Antigravity / Gemini CLI) | 0 → 1 → 2 | ~5 phút |
| **Đầy đủ** | Thêm n8n Fast-Path + ChatOps Mattermost `/agent` | 0 → 1 → 2 → 3 (→ 4 nếu muốn tự chạy cùng máy) | ~20 phút |

---

## Giai đoạn 0: Yêu cầu hệ thống

| Thành phần | Yêu cầu | Kiểm tra | Bắt buộc cho |
|---|---|---|---|
| Git + quyền truy cập GitLab (SSH key) | — | `git --version` | Mọi mức |
| Node.js | **>= 20** | `node -v` | Mọi mức |
| n8n CLI | Cài toàn cục (script tự cài) | `n8n --version` | Mức đầy đủ |
| ngrok | Tài khoản ngrok miễn phí | `ngrok version` | Chỉ ChatOps/Mattermost |
| Hệ điều hành | macOS (tự động hoá hoàn toàn); Windows/Linux làm thủ công (Tuỳ chọn B) | — | — |

> PM2 **không cần cài riêng**: đã nằm trong `dependencies`, các lệnh `npm run n8n:*` tự dùng bản cục bộ.

---

## Giai đoạn 1: Cài đặt dự án

### Tùy chọn A: Một lệnh cho macOS (khuyên dùng)
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm run setup:mac
```
Script tự động: cài Homebrew/Node/ngrok/n8n nếu thiếu → tạo `.env`, `config/projects.json`, `config/sm-config.yaml` từ file mẫu → `npm install` → khởi tạo database n8n và nạp workflows mẫu → đồng bộ plugins + rules vào `~/.gemini/config/` (Giai đoạn 2).

### Tùy chọn B: Thủ công (Windows/Linux, hoặc macOS đã có sẵn công cụ)
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
cp .env.example .env
cp config/projects.json.example config/projects.json
cp config/sm-config.example.yaml config/sm-config.yaml
npm install
npm run n8n:setup        # cài n8n nếu thiếu và nạp workflows mẫu (chỉ cần cho mức Đầy đủ)
```

### Điền file `.env`
Mở `.env` và điền theo mức bạn dùng. File `.env`, `config/projects.json`, `config/sm-config.yaml` đã nằm trong `.gitignore` — **không commit**.

| Biến | Cần cho | Ghi chú |
|---|---|---|
| `AGENT_WORKSPACE_DIR` | Mọi mức | Đường dẫn tuyệt đối tới thư mục repo này |
| `PROJECT_SCAN_DIRS` | Tuỳ chọn | Các thư mục chứa repo cần agent scan, phân tách bằng dấu phẩy |
| `GEMINI_API_KEY` | ChatOps | Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `MATTERMOST_WEBHOOK_URL` | ChatOps | Incoming Webhook của Mattermost |
| `NGROK_DOMAIN` | ChatOps | Static domain ngrok, không gồm `https://` |
| `ATLASSIAN_*`, `SQUASH_*`, `GITLAB_*`, `METABASE_*` | Skill tương ứng | Chỉ điền cho tích hợp bạn thực sự dùng |

### Kiểm tra cài đặt
```bash
npm test      # validate skills/commands/links + unit tests + evals
```
Tất cả phải PASS trước khi chuyển sang giai đoạn tiếp theo.

---

## Giai đoạn 2: Tích hợp AI Agent CLI (Claude Code / Antigravity / Gemini)

`agent-skills` gồm 6 plugins chuyên biệt (`ba-po`, `qa`, `code-reviewer`, `scrum-master`, `fintech-data`, `core`). Cần đồng bộ chúng vào cấu hình của Agent CLI để sử dụng.

### Claude Code (toàn máy, tự cập nhật)
```bash
npm run setup:claude
```
Lệnh này (idempotent, `setup:mac` đã chạy sẵn) làm 2 việc:
1. Tạo symlink `~/.claude/skills/agent-skills` → thư mục repo. Claude Code nạp nó như plugin `agent-skills@skills-dir` ở **mọi project**, gồm 30 skills, 29 slash commands và 6 subagents (`agent-skills:ba-po`, `agent-skills:qa`, `agent-skills:code-reviewer`…).
2. Ghi `env.AGENT_SKILLS_HOME` vào `~/.claude/settings.json` để skill gọi được script của repo (`node ${AGENT_SKILLS_HOME}/scripts/...`) từ bất kỳ thư mục làm việc nào. Bản sao lưu: `settings.json.agent-skills.bak`.

Vì là symlink nên **sửa nội dung skill trong repo là có hiệu lực ngay** ở mọi project (phiên mới). Thêm/xoá skill thì gõ `/reload-plugins` trong phiên đang mở. `git pull` cũng tự cập nhật, không cần chạy lại lệnh nào. Gỡ bỏ: `npm run unlink:claude`.

> Mỗi máy chỉ cần chạy 1 lần. Nếu di chuyển thư mục repo, chạy lại `npm run setup:claude`.
> Không cài qua `/plugin marketplace add`: cách đó sao chép plugin vào cache và phải `plugin update` mỗi lần đổi.

### Antigravity / Gemini CLI
**Bước 1: Đồng bộ plugins & rules** *(Tuỳ chọn A đã chạy sẵn bước này; chạy lại khi pull bản mới)*
```bash
npm run setup:plugins
```
Lệnh này sao chép plugins, `references/`, một số script, `AGENTS.md` và `.agents/rules/` vào `~/.gemini/config/`. Gỡ bỏ: `npm run unlink:plugins`. Dành cho người phát triển skill: `npm run setup:plugins -- --symlink` để sửa trong repo là có hiệu lực ngay.

> Sau khi `git pull`, hãy chạy lại `npm run setup:plugins` để máy bạn nhận skills mới.

**Bước 2: Kích hoạt Git Protection Hooks (Bắt buộc)**
```bash
npm run setup:hooks
```
Lệnh này cài đặt pre-commit hook chặn commit trực tiếp vào nhánh `main`/`master` (tuân thủ Rule 5.1). Kỹ sư bắt buộc làm việc trên nhánh tính năng (`git checkout -b feature/<tên-nhánh>`).

**Bước 3: Dùng trong khung chat của agent** — mở lại Agent CLI/IDE, gõ các slash command:

| Lệnh | Chức năng | Skill tương ứng |
|---|---|---|
| `/ba-spec {issueKey}` | Import & phân tích Jira/Confluence → Business-Spec | `ba-spec` |
| `/qa-test-design {issueKey}` | Thiết kế Checklist BVA/EP và kịch bản BDD Gherkin | `qa-test-design` |
| `/qa-auto-design {issueKey}` | Sinh mã test automation Playwright/Pytest chuẩn POM | `qa-auto-design` |
| `/qa-run-test {issueKey}` | Chạy test automation và ghi log 100% request/response | `qa-run-test` |
| `/cr-review` | Review code đa chiều (kiến trúc, logic, hiệu năng, an ninh) | `cr-review-code-and-quality` |
| `/security-audit` | Quét lỗ hổng bảo mật mã nguồn theo chuẩn OWASP Top 10 | `security-code-audit` |

Nếu agent không nhận ra lệnh: kiểm tra `ls ~/.gemini/config/plugins` có đủ 6 plugin và khởi động lại agent.

---

## Giai đoạn 3: Tích hợp ChatOps (n8n + Mattermost + ngrok)

*Bỏ qua giai đoạn này nếu bạn chỉ dùng skills trong Agent CLI.*

n8n giúp tạo **Mattermost Slash Command** `/agent` với chi phí $0 và phản hồi < 1s (Fast-Path).

### Bước 1: Thiết lập ngrok Static Domain
1. Đăng ký tài khoản miễn phí tại [ngrok.com](https://ngrok.com/).
2. Lấy **Authtoken** và chạy: `ngrok config add-authtoken <TOKEN_CỦA_BẠN>`
3. Tạo 1 **Static Domain** miễn phí trên giao diện web ngrok (VD: `dinosaur-cute.ngrok-free.app`).
4. Điền vào `.env`: `NGROK_DOMAIN=dinosaur-cute.ngrok-free.app`

### Bước 2: Điền khoá tích hợp vào `.env`
```env
GEMINI_API_KEY=...                    # https://aistudio.google.com/app/apikey
MATTERMOST_WEBHOOK_URL=https://mattermost.example.com/hooks/xxx-yyy-zzz
NGROK_DOMAIN=dinosaur-cute.ngrok-free.app
```

### Bước 3: Khởi động n8n (+ ngrok) chạy ngầm
```bash
npm run n8n:bg        # n8n và ngrok-tunnel (nếu có NGROK_DOMAIN) chạy dưới PM2
npm run n8n:status    # cả hai phải ở trạng thái "online"
```
Mở http://localhost:5678 để vào giao diện n8n (lần đầu sẽ yêu cầu tạo tài khoản owner cục bộ). Bạn có thể tắt Terminal thoải mái. **Mỗi lần sửa `.env` phải chạy `npm run n8n:restart`** để nạp cấu hình mới.

> Không tự chạy thêm `pm2 start ngrok` thủ công — `ecosystem.config.cjs` đã quản lý tiến trình ngrok, chạy thêm sẽ bị trùng.

### Bước 4: Tạo Slash Command `/agent` trên Mattermost
1. Đăng nhập Mattermost (yêu cầu quyền Admin).
2. Vào **Main Menu** (☰) → **Integrations** → **Slash Commands** → **Add Slash Command**.
3. Điền thông tin:
   - **Command Trigger Word:** `agent`
   - **Request URL:** `https://<NGROK_DOMAIN>/webhook/mattermost-router` *(thay bằng domain ngrok của bạn, bắt buộc `https://`)*.
   - **Request Method:** `POST`
   - **Autocomplete Hint:** `[standup|jira <ISSUE-KEY>|test|squash|help]`
4. Lưu lại.

Vào bất kỳ kênh nào trên Mattermost và gõ: `/agent help`. Nếu hệ thống trả lời ngay, ChatOps đã hoạt động.

---

## Giai đoạn 4 (Tuỳ chọn): Tự khởi động n8n cùng macOS

Mặc định, sau khi reboot máy thì n8n **không** tự chạy lại. Để bật tự khởi động (PM2 + launchd):
```bash
npm run n8n:autostart
```
Script sẽ in ra 1 lệnh bắt đầu bằng `sudo ...` — **copy và chạy lệnh đó trong terminal** (cần mật khẩu admin). Kiểm tra: `ls ~/Library/LaunchAgents | grep pm2` phải thấy file `pm2.<tên-user>.plist`. Gỡ bỏ: `npm run n8n:autostart -- off`.

> Nếu bạn thêm/xoá tiến trình PM2 sau đó, chạy lại `npx pm2 save` để cập nhật danh sách khởi động.

---

## Giai đoạn 5: Hướng Dẫn Cài Đặt Từng Plugin Độc Lập Cho Dự Án Microservice (Standalone Plugin Installation)

Trong môi trường thực tế, các repo microservice (như trading gateway, market data, mobile web app, hoặc repo test độc lập) thường **chỉ cần 1-2 persona chuyên biệt** (ví dụ chỉ cần QA testing `agent-skills-qa` hoặc chỉ cần Code Review & An ninh `agent-skills-code-reviewer`) thay vì toàn bộ 6 plugins monorepo.

Bạn có thể xuất và nạp từng plugin độc lập theo 3 kịch bản dưới đây:

### Bước 1: Xuất Plugin Độc Lập Từ Monorepo
Repo đã tích hợp sẵn công cụ export tự động thu thập plugin kèm toàn bộ tài liệu nghiệp vụ dùng chung (`references/securities/`):

```bash
# Xuất plugin QA dạng thư mục độc lập
npm run plugin:export -- --plugin qa

# Hoặc đóng gói thành file nén .tgz để chuyển giao/CI-CD
npm run plugin:export -- --plugin qa --tar
```
Plugin độc lập sẽ được sinh tại:
- Thư mục: `dist/plugins/agent-skills-qa/`
- Tarball (nếu dùng `--tar`): `dist/plugins/agent-skills-qa-<version>.tgz`

> **Lưu ý Quan Trọng:** Thư mục xuất ra đã có sẵn file `README.md` riêng, file cấu hình `plugin.json`, các kỹ năng con `skills/`, persona `agents/` và toàn bộ các rule chứng khoán dùng chung đi kèm. Không phát sinh broken link khi mang sang máy hoặc repo khác.

---

### Bước 2: Nạp Plugin Vào Công Cụ AI Của Dự Án Microservice

#### Cách 1: Sử dụng trong Claude Code CLI

**Lựa chọn A — Dùng tạm thời qua cờ runtime:**
Khi khởi chạy Claude Code trong thư mục dự án microservice của bạn:
```bash
claude --plugin-dir /path/to/agent-skills/dist/plugins/agent-skills-qa
```

**Lựa chọn B — Cấu hình cố định cho microservice:**
Tạo hoặc sửa file `.claude/settings.json` tại thư mục gốc của repo microservice:
```json
{
  "plugins": [
    "/absolute/path/to/dist/plugins/agent-skills-qa"
  ]
}
```
Khởi động `claude` tại thư mục dự án, gõ `/plugin list` để kiểm tra plugin đã nạp thành công.

---

#### Cách 2: Sử dụng trong Google Antigravity / Gemini CLI

**Lựa chọn A — Nạp cục bộ cho riêng repo microservice (Khuyến nghị):**
Tạo symlink thư mục plugin độc lập vào thư mục `.agents/plugins/` của repo microservice:
```bash
mkdir -p /path/to/my-microservice/.agents/plugins
ln -s /path/to/dist/plugins/agent-skills-qa /path/to/my-microservice/.agents/plugins/agent-skills-qa
```

**Lựa chọn B — Nạp Global vào cấu hình người dùng máy tính:**
Nếu muốn plugin luôn khả dụng ở mọi dự án mở bằng Antigravity:
```bash
ln -s /path/to/dist/plugins/agent-skills-qa ~/.gemini/config/plugins/agent-skills-qa
```
Khởi động lại Antigravity IDE, agent sẽ tự động nhận diện toàn bộ skills và subagents của plugin đó.

---

#### Cách 3: Symlink Trực Tiếp Từ Monorepo (Dành Cho Máy Cục Bộ Của Bạn)
Nếu bạn đã clone sẵn monorepo `agent-skills` trên máy và muốn bất kỳ thay đổi nào trong `plugins/qa/` tự động phản ánh vào microservice mà không cần chạy lệnh export:
```bash
mkdir -p /path/to/my-microservice/.agents/plugins
ln -s /path/to/agent-skills/plugins/qa /path/to/my-microservice/.agents/plugins/agent-skills-qa
```

---

## Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `n8n: command not found` | Chưa cài n8n toàn cục | `npm run n8n:setup` hoặc `npm install -g n8n` |
| `EADDRINUSE :5678` | n8n đã chạy (PM2 hoặc `npm run n8n`) | `npm run n8n:status`; dừng bản trùng bằng `npm run n8n:stop` |
| Mattermost báo timeout/404 | ngrok chưa chạy hoặc sai domain | `npm run n8n:status` phải có `ngrok-tunnel online`; kiểm tra `NGROK_DOMAIN` rồi `npm run n8n:restart` |
| Sửa `.env` nhưng không có tác dụng | n8n chưa nạp lại cấu hình | `npm run n8n:restart` |
| Lỗi `sqlite3`/native build khi import workflow | n8n thiếu binary sqlite3 | `npm run n8n:setup` (tự biên dịch lại) |
| `sudo ... pm2: No such file or directory` | Dùng lệnh `pm2 startup` tự gõ | Chạy `npm run n8n:autostart` và dùng đúng lệnh script in ra |
| Agent không thấy skills mới sau `git pull` | Chưa đồng bộ plugins | Gemini/Antigravity: `npm run setup:plugins` rồi khởi động lại agent. Claude Code: `/reload-plugins` |
| Claude Code ở project khác không thấy skill | Chưa chạy setup Claude | `npm run setup:claude`, rồi mở phiên mới. Kiểm tra: `claude plugin list` phải có `agent-skills@skills-dir ✔ loaded` |
| Skill báo `No such file` khi gọi script ở project khác | Thiếu `AGENT_SKILLS_HOME` | `npm run setup:claude` rồi mở phiên mới; kiểm tra `~/.claude/settings.json` có `env.AGENT_SKILLS_HOME` |

---

## Phụ Lục: Các Lệnh Quản Lý Tiện Ích

Tất cả các lệnh đều được tích hợp sẵn qua hệ thống `npm run`, bạn không cần nhớ cú pháp pm2 gốc:

| Lệnh npm | Chức năng |
|---|---|
| `npm run n8n:setup` | Chạy lại nạp workflows nếu vô tình xoá |
| `npm run n8n:bg` | Khởi động n8n chạy ngầm |
| `npm run n8n:autostart` | Tự khởi động n8n cùng macOS (PM2 + launchd). Cần chạy thêm 1 lệnh `sudo` do script in ra |
| `npm run n8n:autostart -- off` | Gỡ tự khởi động |
| `npm run n8n:status` | Kiểm tra trạng thái n8n & ngrok |
| `npm run n8n:logs` | Xem Logs thời gian thực của n8n |
| `npm run n8n:restart`| Khởi động lại (cần thiết khi sửa `.env`) |
| `npm run n8n:stop` | Tạm dừng n8n |
| `npm run plugin:export -- --plugin <id>` | Xuất plugin độc lập cho các microservice bên ngoài |

---

## Kiến Trúc và Các Bước Tiếp Theo
Sau khi thiết lập xong, bạn có thể tìm hiểu thêm về kiến trúc sâu hơn của dự án:
- Tham khảo cách tổ chức nội bộ của một skill: [Cấu phẫu Skill (Skill Anatomy)](skill-anatomy.md)
- Hiểu về chiến lược kết nối n8n: [Kiến trúc n8n Integration](../architecture/n8n-integration-strategy.md)
- Nguyên tắc thiết kế kiểm thử: [Test Ownership](../architecture/test-ownership.md)
