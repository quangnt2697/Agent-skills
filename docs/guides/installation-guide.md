# Hướng Dẫn Cài Đặt Từ A–Z Cho Người Mới (Installation Guide)

Tài liệu này hướng dẫn từng bước cầm tay chỉ việc để bất kỳ ai — **kể cả người mới chưa từng cài đặt môi trường hay dùng Docker trước đây** — cũng có thể tự thiết lập thành công `agent-skills` trên máy tính mới trong chưa đầy 10 phút.

### Chọn mức độ cài đặt phù hợp với bạn:

| Mức độ | Dành cho ai? | Các giai đoạn cần làm | Thời gian |
|---|---|---|---|
| **1. Tối thiểu** | Chỉ muốn dùng các lệnh AI (`/ba-spec`, `/qa-test-design`, `/cr-review`...) trong khung chat | **Giai đoạn 0** (bỏ qua bước Docker) → **Giai đoạn 1** → **Giai đoạn 2** | ~5 phút |
| **2. Đầy đủ (Khuyên dùng)** | Muốn có thêm hệ thống tự động hóa **n8n Fast-Path** (tự động kéo Jira/Confluence siêu tốc, bắn báo cáo Daily Standup sang Slack lúc 08:50 sáng, lấy dữ liệu chứng khoán Metabase/Squash TM) | **Giai đoạn 0** → **Giai đoạn 1** → **Giai đoạn 2** → **Giai đoạn 3** | ~8 phút |

---

## Giai đoạn 0: Chuẩn Bị Công Cụ Nền Tảng Trên Máy Mới (Chỉ làm 1 lần)

Mở ứng dụng **Terminal** trên máy Mac của bạn (nhấn `Command + Space`, gõ `Terminal` rồi nhấn `Enter`) và kiểm tra/cài đặt lần lượt 4 công cụ sau:

### Bước 0.1: Cài đặt Homebrew (Trình quản lý gói của macOS)
Kiểm tra xem máy đã có Homebrew chưa bằng cách gõ:
```bash
brew --version
```
- Nếu hiện ra số phiên bản (ví dụ `Homebrew 4.x.x`) → **Đã có, chuyển sang Bước 0.2.**
- Nếu báo `command not found: brew`, hãy copy và dán lệnh sau vào Terminal để cài đặt:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

### Bước 0.2: Cài đặt Git & Node.js (Phiên bản >= 20)
Kiểm tra xem máy đã có Git và Node.js chưa:
```bash
git --version && node -v
```
- Nếu `node -v` hiện từ `v20.x.x` trở lên → **Đã đạt yêu cầu, chuyển sang Bước 0.3.**
- Nếu chưa có hoặc phiên bản thấp hơn 20, chạy lệnh sau để cài đặt:
  ```bash
  brew install git node
  ```

### Bước 0.3: Cài đặt bộ 3 `Colima` + `Docker CLI` + `Docker Compose` (Dành cho mức Đầy đủ)
Dự án sử dụng **n8n** để chạy các luồng tự động hóa (Jira, Confluence, Slack, Metabase). Thay vì phải cài đặt trực tiếp vào máy (dễ lỗi quyền `sudo`/Admin trên máy công ty và làm nặng thư mục dự án) hoặc cài ứng dụng Docker Desktop nặng nề, chúng ta dùng bộ 3 gọn nhẹ **Colima + Docker CLI + Docker Compose**:
- **Colima (`colima`):** Tạo một máy ảo Linux siêu nhẹ chạy ngầm trên Mac (chỉ tốn 2GB RAM, miễn phí 100%, không cần giao diện nặng nề).
- **Docker CLI (`docker`):** Công cụ dòng lệnh để bật/tắt container.
- **Docker Compose (`docker-compose`):** Tự động đọc file [`docker-compose.yml`](../../docker-compose.yml) có sẵn trong dự án để tải và cấu hình n8n chuẩn xác 100%.

Chạy đúng **1 lệnh duy nhất** dưới đây để cài đặt cả 3 công cụ (không cần mật khẩu Admin/`sudo`):
```bash
brew install colima docker docker-compose
```
Kiểm tra sau khi cài xong:
```bash
colima version && docker --version && docker-compose --version
```
*(Nếu cả 3 đều in ra số phiên bản là bạn đã hoàn tất Giai đoạn 0!).*

---

## Giai đoạn 1: Tải Dự Án, Cấu Hình `.env` & Khởi Chạy Hệ Thống

Bạn có thể chọn **Tùy chọn A (Tự động 1 lệnh)** hoặc **Tùy chọn B (Tự chạy từng bước để hiểu rõ bản chất)**.

### Tùy chọn A: Cài Đặt Tự Động Bằng 1 Lệnh (Khuyên dùng cho macOS)
Copy và chạy 3 dòng lệnh sau trong Terminal:
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm run setup:mac
```
**Lệnh `npm run setup:mac` sẽ tự động làm thay bạn toàn bộ các việc sau:**
1. Kiểm tra và tự cài `Homebrew`, `Node.js`, `colima`, `docker`, `docker-compose` nếu bước 0 bạn chưa cài.
2. Tạo sẵn các file cấu hình cá nhân (`.env`, `config/projects.json`, `config/sm-config.yaml`) từ file mẫu.
3. Cài đặt thư viện của dự án (`npm install`).
4. Bật máy ảo `Colima`, tự động nạp chứng chỉ bảo mật mạng công ty (như `DNSE Santa CA`) từ macOS Keychain vào máy ảo để không bị chặn mạng khi tải Docker image.
5. Khởi chạy container `agent-skills-n8n` và **tự động nạp + bật (`Active = ON`) toàn bộ 18 workflows**.
6. Đồng bộ toàn bộ 6 bộ kỹ năng (Plugins) vào công cụ AI trên máy của bạn.

👉 *Sau khi chạy xong Tùy chọn A, bạn chỉ cần xem tiếp **Mục 1.3 (Điền thông tin vào file `.env`)** bên dưới.*

---

### Tùy chọn B: Cài Đặt Từng Bước Tường Minh (Step-by-Step)
Nếu bạn muốn tự tay thực hiện từng bước hoặc đang dùng Windows/Linux:

**Bước 1.1 — Tải dự án và cài đặt thư viện:**
```bash
git clone git@gitlab.dnse.com.vn:my-project/agent-skills.git
cd agent-skills
npm install
```

**Bước 1.2 — Tạo 3 file cấu hình cá nhân từ file mẫu:**
```bash
cp .env.example .env
cp config/projects.json.example config/projects.json
cp config/sm-config.example.yaml config/sm-config.yaml
```

**Bước 1.3 — Mở và điền thông tin vào file `.env`:**
Mở file `.env` bằng trình soạn thảo bất kỳ (VS Code, Antigravity, hoặc gõ `open -e .env` trên Mac). Các file `.env`, `config/projects.json`, `config/sm-config.yaml` và thư mục `.n8n-data/` đã được khóa trong `.gitignore` nên thông tin bí mật của bạn **không bao giờ bị đẩy nhầm lên Git**.

Dưới đây là cách lấy từng thông tin cơ bản để điền vào `.env`:

| Biến trong `.env` | Bắt buộc? | Cách lấy giá trị (Dành cho người mới) |
|---|---|---|
| `AGENT_WORKSPACE_DIR` | **Bắt buộc** | Đường dẫn tới thư mục dự án này trên máy bạn. Gõ lệnh `pwd` trong Terminal rồi copy kết quả dán vào (ví dụ: `/Users/ten.ban/Projects/agent-skills`). |
| `ATLASSIAN_BASE_URL` | Khi dùng Jira / Confluence | Điền: `https://entrade.atlassian.net` |
| `ATLASSIAN_EMAIL` | Khi dùng Jira / Confluence | Email công ty của bạn dùng để đăng nhập Jira (ví dụ: `ten.ban@dnse.com.vn`). |
| `ATLASSIAN_API_TOKEN` | Khi dùng Jira / Confluence | 1. Truy cập [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)<br/>2. Bấm **Create API token** → đặt tên bất kỳ → bấm **Copy** và dán vào đây. |
| `SLACK_WEBHOOK_URL` | Khi dùng Báo cáo Slack | URL Incoming Webhook của kênh Slack nhận báo cáo Daily Standup / thông báo task Jira (ví dụ: `https://hooks.slack.com/services/...`). |
| `PROJECT_SCAN_DIRS` | Tuỳ chọn | Đường dẫn thư mục chứa các repo code khác trên máy bạn để Agent tự động đồng bộ mỗi sáng (phân tách bằng dấu phẩy). |
| `SQUASH_*`, `METABASE_*`, `GITLAB_*` | Tuỳ chọn | Chỉ cần điền nếu vai trò của bạn có dùng đến Squash TM (QA) hoặc Metabase TimescaleDB. |

**Bước 1.4 — Khởi động Colima & Container n8n (Nạp tự động 18 Workflows):**
Sau khi lưu file `.env`, chạy lệnh sau:
```bash
npm run n8n:setup
```
*(Lệnh này sẽ tự động bật máy ảo Colima, nạp chứng chỉ mạng công ty, tải container `agent-skills-n8n` và kích hoạt sẵn 18 workflows).*

> 💡 **Lưu ý:** Ở những lần sau, hoặc mỗi khi bạn vừa sửa nội dung file `.env`, chỉ cần chạy lệnh ngắn gọn:
> ```bash
> npm run n8n:up
> ```

**Bước 1.5 — Kiểm tra xem cài đặt đã thành công 100% chưa:**
1. **Kiểm tra giao diện Web của n8n:** Mở trình duyệt truy cập `http://localhost:5678` — bạn sẽ thấy n8n đang chạy với **18 workflows** đã được gạt công tắc sang trạng thái **Active (Published)**.
2. **Chạy bộ kiểm định tự động của dự án:**
   ```bash
   npm test
   ```
   Nếu màn hình hiện `PASSED` cho toàn bộ 9 cổng kiểm định, 207 unit tests và 159 skill evals là môi trường của bạn đã hoàn hảo!

---

## Giai đoạn 2: Tích hợp AI Agent CLI (Claude Code / Antigravity / Gemini)

`agent-skills` gồm 6 plugins chuyên biệt (`ba-po`, `qa`, `code-reviewer`, `scrum-master`, `fintech-data`, `core`). Cần đồng bộ chúng vào cấu hình của Agent CLI để sử dụng.

### Claude Code (toàn máy, tự cập nhật)
```bash
npm run setup:claude
```
Lệnh này (idempotent, `setup:mac` đã chạy sẵn) làm 2 việc:
1. Tạo symlink `~/.claude/skills/agent-skills` → thư mục repo. Claude Code nạp nó như plugin `agent-skills@skills-dir` ở **mọi project**, gồm 31 skills, 29 slash commands và 6 subagents (`agent-skills:ba-po`, `agent-skills:qa`, `agent-skills:code-reviewer`…).
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

## Giai đoạn 3: Thói Quen Sử Dụng Hàng Ngày & Tự Khởi Động Cùng Máy Mac

### 3.1. Bật tự động chạy ngầm mỗi khi mở máy Mac (Khuyên dùng)
Container `agent-skills-n8n` đã được cấu hình tự khôi phục (`restart: unless-stopped`) trong [`docker-compose.yml`](../../docker-compose.yml). Để Colima và n8n tự bật ngầm khi bạn đăng nhập vào macOS (không cần quyền `sudo`), hệ thống sử dụng **macOS User LaunchAgent**:
```bash
npm run autostart:on
```
Từ giờ trở đi, mỗi khi bạn khởi động lại máy Mac hoặc đăng nhập, LaunchAgent sẽ:
1. Tự động bật máy ảo Colima (2GB RAM) và container `agent-skills-n8n` trong nền.
2. Đóng vai trò **Watchdog** (kiểm tra mỗi 5 phút) để đảm bảo n8n luôn sống.
3. Tự động kích hoạt cơ chế **Catch-up Standup**: nếu MacBook gập màn hình (Sleep) qua mốc 08:50 sáng, ngay khi mở máy lại vào buổi sáng các ngày trong tuần (Thứ 2 - Thứ 6), hệ thống sẽ tự phát hiện và chạy bù báo cáo Daily Standup lên Slack!

*Các lệnh quản lý LaunchAgent:*
- Kiểm tra trạng thái: `npm run autostart:status`
- Tắt tự khởi động: `npm run autostart:off`

### 3.2. Bảng Tóm Tắt: Hàng Ngày Khi Nào Cần Gõ Lệnh Gì?

| Tình huống thực tế của bạn | Lệnh cần gõ trong Terminal |
|---|---|
| **Kiểm tra xem n8n và autostart có đang chạy không** | `npm run autostart:status` |
| **Sáng bật máy lên làm việc** *(nếu đã bật `npm run autostart:on`)* | *Không cần gõ gì, máy tự chạy ngầm và tự bù standup nếu mở trễ!* |
| **Sáng bật máy lên làm việc** *(nếu chưa bật autostart)* | `npm run colima:start && npm run n8n:up` |
| **Vừa sửa thông tin trong file `.env`** *(ví dụ đổi token Jira/Slack)* | `npm run n8n:up` *(container sẽ tự nạp lại `.env` mới)* |
| **Vừa kéo code mới của dự án về (`git pull`)** | `npm run setup:plugins && npm run n8n:up` |
| **Muốn xem n8n đang chạy gì / có báo lỗi gì không** | `npm run n8n:logs` *(nhấn `Ctrl + C` để thoát xem log)* |
| **Hết giờ làm, muốn tắt hẳn n8n và giải phóng 2GB RAM của máy ảo** | `npm run n8n:down && npm run colima:stop` |

---

## Giai đoạn 4: Hướng Dẫn Cài Đặt Từng Plugin Độc Lập Cho Dự Án Microservice (Standalone Plugin Installation)

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
| `Cannot connect to the Docker daemon` | Máy ảo Colima chưa được bật | Chạy `npm run colima:start` trước khi chạy `npm run n8n:up` |
| `x509: certificate signed by unknown authority` khi pull image n8n | Mạng công ty dùng tường lửa/CA riêng (vd: DNSE Santa CA) | Chạy `npm run n8n:setup` (script tự động trích xuất CA từ macOS Keychain nạp vào Colima VM và khởi động lại Docker daemon) |
| `EADDRINUSE :5678` | Cổng 5678 đang bị chiếm bởi tiến trình khác | Kiểm tra `lsof -i :5678`; dừng container bằng `npm run n8n:down` |
| Workflow n8n lỗi âm thầm | Lỗi chỉ ghi vào execution của n8n | Xem `workspace/.n8n-errors.log` (do Global Error Handler ghi) hoặc `npm run n8n:logs` |
| Sửa `.env` nhưng không có tác dụng | Container n8n chưa nạp lại cấu hình | Chạy `npm run n8n:up` (hoặc `docker-compose up -d`) để cập nhật container |
| Agent không thấy skills mới sau `git pull` | Chưa đồng bộ plugins | Gemini/Antigravity: `npm run setup:plugins` rồi khởi động lại agent. Claude Code: `/reload-plugins` |
| Claude Code ở project khác không thấy skill | Chưa chạy setup Claude | `npm run setup:claude`, rồi mở phiên mới. Kiểm tra: `claude plugin list` phải có `agent-skills@skills-dir ✔ loaded` |
| Skill báo `No such file` khi gọi script ở project khác | Thiếu `AGENT_SKILLS_HOME` | `npm run setup:claude` rồi mở phiên mới; kiểm tra `~/.claude/settings.json` có `env.AGENT_SKILLS_HOME` |

---

## Phụ Lục: Các Lệnh Quản Lý Tiện Ích

Tất cả các lệnh đều được tích hợp sẵn qua hệ thống `npm run`:

| Lệnh npm | Chức năng |
|---|---|
| `npm run autostart:on` | Cài đặt & kích hoạt LaunchAgent tự bật Colima + n8n khi login macOS |
| `npm run autostart:status` | Kiểm tra trạng thái LaunchAgent, Colima, n8n và Standup hôm nay |
| `npm run autostart:off` | Gỡ bỏ LaunchAgent và tắt chế độ tự khởi động |
| `npm run colima:start` | Khởi động máy ảo Colima (`--cpu 2 --memory 2 --disk 20`) |
| `npm run colima:status` | Kiểm tra trạng thái máy ảo Colima |
| `npm run colima:stop` | Dừng máy ảo Colima (giải phóng hoàn toàn RAM) |
| `npm run n8n:setup` | Thiết lập tự động Colima + CA doanh nghiệp + Container n8n + Nạp 18 workflows |
| `npm run n8n:up` | Khởi động container `agent-skills-n8n` & nạp + kích hoạt (`active = 1`) 18 workflows |
| `npm run n8n:logs` | Xem Logs thời gian thực của container `agent-skills-n8n` |
| `npm run n8n:down` | Dừng và gỡ container `agent-skills-n8n` (dữ liệu vẫn giữ nguyên trong `.n8n-data/`) |
| `npm run n8n:sync-nodes` | Đồng bộ code từ `scripts/n8n-nodes/` vào các file JSON trong `n8n-workflows/` |
| `npm run n8n:export` | Xuất workflows từ container n8n ra lại thư mục `n8n-workflows/` theo phân loại |
| `npm run plugin:export -- --plugin <id>` | Xuất plugin độc lập cho các microservice bên ngoài |

---

## Kiến Trúc và Các Bước Tiếp Theo
Sau khi thiết lập xong, bạn có thể tìm hiểu thêm về kiến trúc sâu hơn của dự án:
- Tham khảo cách tổ chức nội bộ của một skill: [Cấu phẫu Skill (Skill Anatomy)](skill-anatomy.md)
- Hiểu về chiến lược kết nối n8n: [Kiến trúc n8n Integration](../architecture/n8n-integration-strategy.md)
- Nguyên tắc thiết kế kiểm thử: [Test Ownership](../architecture/test-ownership.md)
