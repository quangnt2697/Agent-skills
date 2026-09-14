# Discord Bot Bridge for Agent Skills

Cầu nối giúp bạn điều khiển và giao tiếp với Agent trên máy Mac từ xa qua Discord (trên điện thoại, máy tính bảng hoặc máy tính khác).

---

## ⚡ Hướng dẫn Setup Nhanh (Khi mới Clone Repo)

Khi bạn hoặc đồng nghiệp vừa `git clone` repository này về một máy mới, chỉ cần thực hiện đúng **3 bước** sau:

### Bước 1: Cài đặt Dependencies
Mở Terminal tại thư mục dự án và chạy:
```bash
# 1. Cài đặt các gói Node.js
npm install

# 2. Cài đặt thư viện Python cho Discord Bot
npm run setup:discord
```
> 💡 *Nếu bạn quên chạy bước 2, script bot sẽ **tự động phát hiện và cài đặt giúp bạn** khi khởi động lần đầu tiên.*

### Bước 2: Tạo file `.env` và điền cấu hình
```bash
cp .env.example .env
```
Mở file `.env` và điền 2 thông tin cơ bản:
```env
# Token lấy từ Discord Developer Portal (xem mục hướng dẫn bên dưới)
DISCORD_BOT_TOKEN=your_bot_token_here

# User ID Discord của bạn (chỉ bạn mới ra lệnh được)
DISCORD_ALLOWED_USER_ID=your_discord_user_id_here
```

### Bước 3: Cấu hình Alias Dự Án Mục Tiêu (`projects.json`)
Để Bot nhận diện nhanh các dự án/thư mục trên máy và hỗ trợ tự động gợi ý (autocomplete) khi chạy `/agent` hoặc `/sync`:
```bash
cp tools/discord-bridge/projects.json.example tools/discord-bridge/projects.json
```
Mở file `tools/discord-bridge/projects.json` và cấu hình các đường dẫn tương ứng trên máy bạn:
```json
{
  "openapi-tyk": "/Users/qa-quangnt/Desktop/Project/3.1/openapi-tyk",
  "openapi": "/Users/qa-quangnt/Desktop/Project/3.1",
  "agent-skills": "/Users/qa-quangnt/Desktop/Project/Test/agent-skills"
}
```
> 💡 *Nếu trỏ vào một repo đơn lẻ (chứa `.git`), bot sẽ chỉ thao tác trên repo đó. Nếu trỏ vào thư mục mẹ (như `openapi` -> `3.1`), bot sẽ tự động nhận diện và quét tất cả các microservices bên trong!*

### Bước 4: Khởi động Bot
```bash
npm run bridge:discord
```
Khi thấy thông báo:
```
🤖 Discord Agent Bridge đã online!
⚡ CLI Executable: ~/.local/bin/agy
✨ Đã đồng bộ 2 Slash Commands (/agent, /sync) với Discord!
```
→ Bot đã sẵn sàng nhận lệnh!

---

## 🛠️ Hướng dẫn lấy Token & Cấp Quyền Bot Discord (Dành cho người mới)

1. **Tạo Bot:**
   * Truy cập [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → Đặt tên → **Create**.

2. **Lấy Token & Bật Intent:**
   * Tab **Bot** → **Reset Token** → Copy token vào `DISCORD_BOT_TOKEN` trong `.env`.
   * Bật toggle **`MESSAGE CONTENT INTENT`** → **Save Changes**.

3. **Mời Bot vào Server:**
   * Tab **OAuth2** → **URL Generator**.
   * **Scopes**: `bot` + `applications.commands`.
   * **Bot Permissions**: `Send Messages`, `Embed Links`, `Create Public Threads`, `Send Messages in Threads`, `Attach Files`, `Read Message History`.
   * Copy link → dán vào trình duyệt → chọn server.
   * 🎉 Bot sẽ **tự động gửi bảng hướng dẫn lệnh** vào kênh hệ thống khi gia nhập server.

4. **Lấy User ID:**
   * Discord **User Settings** → **Advanced** → Bật **Developer Mode**.
   * Chuột phải Avatar → **Copy User ID** → dán vào `DISCORD_ALLOWED_USER_ID` trong `.env`.

---

## 💬 Hướng dẫn Sử dụng trên Discord

### 1. Slash Command với Autocomplete (Khuyên dùng)

* **`/agent`** — Kích hoạt Agent thực thi kỹ năng:
  * **Ô `skill`**: Gợi ý 44+ skill — gõ `cr`, `qa`, `dev`, `ba`... để lọc nhanh.
  * **Ô `project`**: Tự động gợi ý toàn bộ dự án trên máy từ `projects.json`.
  * **Ô `des`**: Mô tả nhiệm vụ, phạm vi scan hoặc issue key Jira.
  > *Ví dụ:* `/agent skill: /cr-review-code-and-quality project: my-project des: review auth`

* **`/sync`** — Kéo mã nguồn mới nhất của dự án về máy local an toàn:
  * **Ô `project`**: Tự động gợi ý danh sách dự án (ví dụ `openapi-tyk`, `openapi`...).
  * **Ô `branch`**: Nhánh cần pull (tùy chọn, mặc định giữ nguyên nhánh hiện tại).
  * **Ô `des`**: Cờ bổ sung như `--stash` (auto-stash) hoặc `--dry-run` (kiểm tra trước).
  > *Ví dụ:* `/sync project: openapi-tyk` hoặc `/sync project: openapi des: --stash`

---

### 2. Bộ Lệnh Prefix (Prefix Commands)

| Lệnh | Ý nghĩa | Ví dụ |
|:-----|:--------|:------|
| `!sync -p <project>` | Kéo code mới nhất về local (hỗ trợ `--stash`, `--dry-run`) — cooldown: 10s/user | `!sync -p openapi-tyk`<br>`!sync -p openapi --stash` |
| `!run <kỹ_năng>` | Chạy Agent (hỗ trợ `-p <project>` và `-d <des>`) — cooldown: 30s/user | `!run /cr-review-code-and-quality -p my-project -d review auth` |
| `!cancel` | Hủy tác vụ đang chạy (alias: `!abort`, `!stop`) | `!cancel` |
| `!skills [từ_khóa]` | Xem danh sách kỹ năng hoặc tìm theo từ khóa | `!skills` / `!skills qa` |
| `!projects [reload]` | Xem danh sách dự án hoặc quét lại thư mục | `!projects` / `!projects reload` |
| `!status` | Kiểm tra trạng thái Agent (rảnh/bận) | `!status` |
| `!help [lệnh]` | Xem hướng dẫn tổng quan hoặc chi tiết từng lệnh | `!help` / `!help sync` / `!help run` |

> **`!help <tên_lệnh>`** hỗ trợ: `sync`, `run`, `cancel`, `skills`, `projects`, `status`, `done`.

---

### 3. Kéo Code Trực Tiếp Về Local (!sync & /sync)

> ⚡ **Tập trung 100% vào chức năng Pull Code:** Khác với các tác vụ AI phức tạp (`!run` / `/agent`), lệnh `!sync` và `/sync` được thiết kế để **kéo code trực tiếp siêu tốc** — thực thi thẳng lệnh Git trên máy trong 1-2 giây và gửi bảng báo cáo ngay tại kênh chat, **tuyệt đối không tạo Thread và không tiêu tốn token LLM**.

* **Kéo đúng 1 repository đơn lẻ:**
  ```text
  !sync -p openapi-tyk
  ```
  *(Bot tra cứu trong `projects.json` và chỉ fetch & pull duy nhất repo `openapi-tyk`, hoàn tất trong ~0.5s).*

* **Kéo toàn bộ cụm microservices trong thư mục cha:**
  ```text
  !sync -p openapi
  ```
  *(Bot nhận diện `openapi` là folder mẹ `3.1`, tự động quét và kéo song song 34 microservices bên trong).*

* **Tự động stash khi có file đang sửa dở:**
  ```text
  !sync -p openapi --stash
  ```
  *(Tự động `git stash` trước khi pull và `git stash pop` trả lại code cho bạn sau khi kéo xong).*

* **Kiểm tra trước mà không pull:**
  ```text
  !sync -p openapi --dry-run
  ```

* **Cơ chế an toàn tuyệt đối (Zero Data Loss):**
  * Luôn kiểm tra `git status`: Nếu repo dirty mà không có cờ `--stash` ➔ Tự động **SKIP** an toàn.
  * Luôn pull bằng **`git pull --ff-only`** ➔ Không bao giờ sinh merge commit rác.


---

## 🔄 Hội thoại Đa Lượt (Multi-turn) trong Thread

1. Mỗi tác vụ tự động tạo một **Thread riêng** giữ kênh chat chính sạch sẽ.
2. Khi Agent hỏi làm rõ → chỉ cần **chat trả lời trực tiếp trong Thread**, không cần cú pháp gì thêm.
3. Gõ `!done` khi xong → Thread được **đóng và lưu trữ (archive)**, giữ nguyên log để tra cứu sau.
4. Bot tự động dọn Thread cũ hơn **24h** mỗi 1 giờ để tránh rò rỉ bộ nhớ.

---

## 🛡️ Cơ Chế Bảo Vệ & Ổn Định

| Cơ chế | Mô tả |
|:-------|:------|
| **Rate Limiting** | Mỗi user chỉ được gọi `!run` tối đa 1 lần / 30 giây. |
| **Timeout 30 phút** | Agent CLI tự động bị hủy nếu chạy quá 30 phút, tránh bot treo vĩnh viễn. |
| **Hàng đợi (Queue)** | Chỉ 1 tác vụ Agent chạy tại 1 thời điểm. Lệnh mới tự động xếp hàng chờ. |
| **Graceful Shutdown** | Khi bot restart (PM2/Ctrl+C), tự thông báo các Thread đang mở và hủy subprocess sạch sẽ. |
| **Auto-cleanup** | Thread cũ hơn 24h tự động dọn khỏi bộ nhớ theo dõi để tránh memory leak. |
| **Bot-message Filter** | Bỏ qua tin nhắn từ mọi bot khác (`message.author.bot`), không chỉ bản thân. |

---

## ⚙️ Cấu Hình Alias Dự Án Tùy Chọn (`projects.json`)

```bash
cp tools/discord-bridge/projects.json.example tools/discord-bridge/projects.json
```
```json
{
  "my-project": "/path/to/my-project",
  "backend-service": "/path/to/backend-service"
}
```
> File `projects.json` đã có trong `.gitignore` — không bị commit lên Git.

---

## 🚀 Chạy Ngầm 24/7 trên macOS với PM2

```bash
# Cài pm2 toàn cục (nếu chưa có)
npm install -g pm2

# Khởi chạy bot ngầm
pm2 start tools/discord-bridge/discord_bot.py --name "agent-discord" --interpreter python3

# Xem logs hoạt động
pm2 logs agent-discord

# Cấu hình tự khởi động lại cùng macOS khi bật máy
pm2 startup && pm2 save
```
> Khi PM2 restart bot, **graceful shutdown** tự thông báo các Thread đang mở trước khi tắt.

---

## 🏗️ Kiến Trúc Module

Xem [`ARCHITECTURE.md`](./ARCHITECTURE.md) để biết chi tiết cách các module phối hợp với nhau.

```
tools/discord-bridge/
├── discord_bot.py      ← Entry point: bot events, on_ready, on_message, main()
├── config.py           ← Env vars, CLI paths, shared state, is_authorized()
├── engine.py           ← run_agent_turn(), load_all_commands()
├── help_builder.py     ← build_help_embed/text() — pure functions
├── project_manager.py  ← ProjectManager: auto-discovery, resolve, search
├── cogs/
│   ├── agent_cog.py    ← /agent slash + autocomplete + !run + !cancel
│   └── info_cog.py     ← !help + !skills + !projects + !status
├── projects.json       ← (tùy chọn) alias dự án cá nhân — không commit
└── requirements.txt    ← discord.py, python-dotenv
```
