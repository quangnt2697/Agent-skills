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
⚡ CLI Executable: ~/.local/bin/agy
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
     * `Embed Links` *(Khuyên dùng để hiển thị giao diện Embed đẹp mắt)*
     * `Create Public Threads`
     * `Send Messages in Threads`
     * `Attach Files`
     * `Read Message History`
   * Copy đường link ở dưới cùng $\rightarrow$ Dán vào trình duyệt $\rightarrow$ Chọn server của bạn để mời bot vào.
   * 🎉 **Tự động gửi hướng dẫn lệnh:** Ngay khi bot gia nhập server, bot sẽ **luôn tự động gửi ngay 1 tin nhắn kèm bảng Embed hướng dẫn chi tiết các lệnh** (`/agent`, `!run`, `!skills`, `!projects`, `!status`, `!help`) vào kênh hệ thống (System Channel) hoặc kênh `#general` / `#bot` để bạn và thành viên bắt đầu sử dụng được ngay lập tức!
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
* **Ô `skill`:** Discord sẽ lập tức **bật lên menu gợi ý 36+ skill**. Gõ ký tự (VD: `cr`, `qa`, `dev`, `ba`) để lọc nhanh.
* **Ô `project`:** Tự động gợi ý **toàn bộ dự án trên máy của bạn** (quét tự động từ thư mục cấu hình trong `PROJECT_SCAN_DIRS` hoặc khai báo trong `projects.json`). Bạn chỉ cần chọn tên project mà không cần nhớ đường dẫn!
* **Ô `des`:** Nhập mô tả nhiệm vụ, phạm vi cần quét hoặc từ khóa (ví dụ: `review auth`, `order module`, `G3PTP-17093`...).

> 🎯 **Ví dụ Slash Command hoàn chỉnh:**
> ```text
> /agent skill: /cr-review-code-and-quality project: my-project des: review auth
> ```

> 💡 **Cơ chế tự động:** Khi bạn truyền `project`, Bot sẽ tự động tìm đường dẫn tuyệt đối của project trên máy và chỉ đạo Agent:
> 1. Tự mở thư mục dự án đó ra và quét cấu trúc bằng `list_dir`, `grep_search`, `git status`.
> 2. Tự định vị các folder/file liên quan đến nhiệm vụ mà không bắt bạn phải chỉ định từng file.
> 3. Xuất toàn bộ artifact chuẩn hóa về workspace theo quy định.

### 2. Bộ 5 Lệnh Prefix Tối Giản (Dễ Nhớ — 1 Lệnh Cho Mỗi Tác Vụ)

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| :--- | :--- | :--- |
| `!run <kỹ_năng>` | **Chạy Agent** (hỗ trợ `-p <project>` và `-d <des>`) | `!run /cr-review-code-and-quality -p my-project -d review auth` |
| `!skills [từ_khóa]` | **Xem danh sách kỹ năng** (hoặc tìm theo từ khóa) | `!skills` hoặc `!skills qa` |
| `!projects [reload]` | **Xem danh sách dự án trên máy** (hoặc quét lại thư mục) | `!projects` hoặc `!projects reload` |
| `!status` | **Kiểm tra trạng thái Agent** (đang rảnh hay bận) | `!status` |
| `!help [lệnh]` | **Xem hướng dẫn tổng quan hoặc chi tiết từng lệnh** | `!help` hoặc `!help run` |

> 📖 **Tính năng nâng cao của `!help`:**
> * Gõ **`!help`**: Hiển thị bảng cẩm nang Embed tổng quan (hướng dẫn Slash Command, 5 lệnh Prefix, cơ chế Thread và phân quyền).
> * Gõ **`!help <tên_lệnh>`** để xem cú pháp, các cờ và ví dụ chi tiết cho lệnh đó:
>   * `!help run` (hoặc `!help agent`): Xem hướng dẫn chuyên sâu cách chạy kỹ năng, các cờ `-p`, `-d` và ví dụ.
>   * `!help skills`: Xem cách tra cứu và lọc 36+ kỹ năng.
>   * `!help projects`: Xem cách tra cứu dự án, quét lại và cấu hình alias.
>   * `!help status`: Xem các trạng thái rảnh/bận và hàng đợi của Agent.
>   * `!help done`: Xem cách kết thúc và lưu trữ Thread.

---

### ⚙️ Cấu Hình Alias Dự Án Tùy Chọn (`projects.json`)

Mặc định Bot tự động phát hiện các dự án trong thư mục cha. Nếu bạn muốn đặt tên viết tắt (alias) riêng:
1. Tạo file `projects.json` từ file mẫu:
   ```bash
   cp tools/discord-bridge/projects.json.example tools/discord-bridge/projects.json
   ```
2. Thêm alias và đường dẫn tương ứng:
   ```json
   {
     "my-project": "/path/to/my-project",
     "backend-service": "/path/to/backend-service"
   }
   ```
*(Lưu ý: File `projects.json` đã được cấu hình trong `.gitignore` để bảo mật thông tin cá nhân, không bị commit hay đẩy lên Git).*

---

## 🔄 Hội thoại Đa Lượt (Multi-turn) trong Thread

1. **Khi Agent đặt câu hỏi làm rõ (VD: phỏng vấn BA, hỏi thêm context):**
   * Bạn **chỉ cần chat trả lời trực tiếp trong Thread** do bot tạo ra (không cần gõ lại bất kỳ cú pháp nào).
   * Bot sẽ tự động nối tiếp ngữ cảnh (`--continue`) để Agent xử lý tiếp câu trả lời của bạn.
2. **Khi công việc hoàn tất:**
   * Gõ `!done` trong Thread: Bot sẽ **đóng và lưu trữ (archive)** Thread lại, giúp kênh chat chính luôn sạch sẽ nhưng vẫn giữ trọn vẹn log để tra cứu sau này.

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
