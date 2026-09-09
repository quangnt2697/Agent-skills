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
> 💡 *Lưu ý: Nếu bạn quên chạy bước 2, script bot sẽ **tự động phát hiện và cài đặt giúp bạn** khi khởi động lần đầu tiên.*

### Bước 2: Tạo file `.env` và điền cấu hình
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
Mở file `.env` vừa tạo và điền 2 thông tin cơ bản:
```env
# Token lấy từ Discord Developer Portal (xem mục hướng dẫn bên dưới nếu chưa có)
DISCORD_BOT_TOKEN=your_bot_token_here

# User ID Discord của bạn (để bảo mật chỉ bạn mới ra lệnh được)
DISCORD_ALLOWED_USER_ID=your_discord_user_id_here
```

### Bước 3: Khởi động Bot
```bash
npm run bridge:discord
```
Khi thấy dòng thông báo:
```text
🤖 Discord Agent Bridge đã online!
⚡ CLI Executable: /Users/.../.local/bin/agy
✨ Đã đồng bộ 1 Slash Commands (/agent) với Discord!
```
$\rightarrow$ Bot đã sẵn sàng nhận lệnh từ Discord!

---

## 🛠️ Hướng dẫn lấy Token & Cấp Quyền Bot Discord (Dành cho người mới)

Nếu bạn chưa có Bot trên Discord, làm theo các bước sau (~3 phút):

1. **Tạo Bot:**
   * Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
   * Bấm **New Application** $\rightarrow$ Đặt tên (VD: `Agent Assistant`) $\rightarrow$ Bấm **Create**.
2. **Lấy Token & Bật Intent:**
   * Vào tab **Bot** (cột trái) $\rightarrow$ Bấm **Reset Token** $\rightarrow$ Copy mã token và dán vào `DISCORD_BOT_TOKEN` trong `.env`.
   * Cuộn xuống mục **Privileged Gateway Intents** $\rightarrow$ **BẮT BUỘC BẬT toggle: `MESSAGE CONTENT INTENT`** $\rightarrow$ Bấm **Save Changes**.
3. **Mời Bot vào Server của bạn:**
   * Vào tab **OAuth2** $\rightarrow$ **URL Generator**.
   * Mục **Scopes**: Tích chọn `bot` và `applications.commands`.
   * Mục **Bot Permissions**: Tích chọn:
     * `Send Messages`
     * `Create Public Threads`
     * `Send Messages in Threads`
     * `Attach Files`
     * `Read Message History`
   * Copy đường link ở dưới cùng $\rightarrow$ Dán vào trình duyệt $\rightarrow$ Chọn server riêng của bạn để mời bot vào.
4. **Lấy User ID của bạn:**
   * Trong Discord: Vào **Cài đặt (User Settings)** $\rightarrow$ **Advanced** $\rightarrow$ Bật **Developer Mode**.
   * Chuột phải vào Avatar của bạn ở khung chat $\rightarrow$ Chọn **Copy User ID** $\rightarrow$ Dán vào `DISCORD_ALLOWED_USER_ID` trong `.env`.

---

## 💬 Hướng dẫn Sử dụng trên Discord

### 1. Slash Command với Tự Động Gợi Ý (Autocomplete - Khuyên dùng)
Gõ trên thanh chat Discord:
```text
/agent
```
* Discord sẽ lập tức **bật lên menu gợi ý danh sách toàn bộ 36+ skill**.
* Bạn chỉ cần gõ vài chữ (VD: `sm`, `qa`, `dev`, `ba`), menu sẽ tự động lọc ngay lập tức. Nhấn **Tab** hoặc chạm tay để chọn lệnh.
* Điền thêm tham số (như mã Jira `G3PTP-17093`) vào ô `args` nếu có.

### 2. Các lệnh Prefix truyền thống

| Lệnh | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| `/agent` *(Khuyên dùng)* | **Slash command với gợi ý tự động (Autocomplete)** khi gõ | `/agent skill: sm-daily-standup` |
| `!skills` | Xem toàn bộ danh sách kỹ năng phân loại theo vai trò | `!skills` |
| `!skills <từ khóa>` | Tìm kiếm skill/command theo vai trò hoặc từ khóa | `!skills qa` hoặc `!skills dev` |
| `!agent <lệnh>` | Chạy skill/command của Agent bằng AGY mặc định | `!agent /ba-spec G3PTP-17093` |
| `!claude <lệnh>` | Ép chạy bằng Claude Code CLI | `!claude /qa-run-test` |
| `!agy <lệnh>` | Ép chạy bằng Google Antigravity CLI | `!agy /sm-daily-standup` |
| `!status` | Kiểm tra trạng thái Agent và Engine đang dùng | `!status` |
| `!help` | Xem hướng dẫn sử dụng | `!help` |

---

## 🔄 Hội thoại Đa Lượt (Multi-turn) trong Thread

1. **Khi Agent đặt câu hỏi làm rõ (VD: phỏng vấn BA, hỏi thêm context):**
   * Bạn **chỉ cần chat trả lời trực tiếp trong Thread** do bot tạo ra (không cần gõ lại bất kỳ cú pháp nào).
   * Bot sẽ tự động nối tiếp ngữ cảnh (`--continue`) để Agent xử lý tiếp câu trả lời của bạn.
2. **Khi công việc hoàn tất:**
   * Gõ `!done` hoặc `!close` trong Thread: Bot sẽ **đóng và lưu trữ (archive)** Thread lại, giúp kênh chat chính luôn sạch sẽ nhưng vẫn giữ trọn vẹn log để tra cứu sau này.
   * Gõ `!delete`: Xóa vĩnh viễn Thread nếu không muốn giữ lại.

---

## 🚀 Chạy Ngầm 24/7 trên macOS với PM2 (Không cần mở Terminal)

```bash
# 1. Cài pm2 toàn cục (nếu chưa có)
npm install -g pm2

# 2. Khởi chạy bot ngầm
pm2 start tools/discord-bridge/discord_bot.py --name "agent-discord" --interpreter python3

# 3. Xem logs hoạt động
pm2 logs agent-discord

# 4. Cấu hình tự khởi động lại cùng macOS khi bật máy
pm2 startup
pm2 save
```
