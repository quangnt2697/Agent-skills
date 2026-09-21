# Hướng Dẫn Cài Đặt (Installation Guide)

Tài liệu này là "Single Source of Truth" (nguồn chân lý duy nhất) cho toàn bộ quy trình thiết lập dự án `agent-skills`. Quy trình được chia thành các giai đoạn từ cơ bản (Quick Start) đến nâng cao (n8n, Ngrok, Mattermost) để bạn dễ dàng theo dõi.

---

## Giai đoạn 1: Chuẩn bị Môi trường (Quick Start)

Dự án yêu cầu **Node.js >= v20** và công cụ quản lý tiến trình **PM2** (sẽ được tự động cài cục bộ).

### Tùy chọn A: Cài đặt Tất Cả Từ A-Z (Khuyên dùng cho macOS)
Nếu đây là một thiết bị macOS mới tinh, bạn chỉ cần chạy duy nhất 1 lệnh này sau khi clone repo:

```bash
git clone https://gitlab.example.com/org/agent-skills.git
cd agent-skills
npm run setup:mac
```
Kịch bản tự động này sẽ cài đặt Homebrew, Node.js, Ngrok, copy `.env.example` thành `.env`, chạy `npm install` và nạp sẵn toàn bộ Workflows mẫu vào n8n.

### Tùy chọn B: Cài đặt Thủ Công (Cho Windows/Linux)
```bash
git clone https://gitlab.example.com/org/agent-skills.git
cd agent-skills
cp .env.example .env
npm install
npm run n8n:setup
```

---

## Giai đoạn 2: Tích hợp AI Agent CLI (Antigravity/Gemini/Claude)

Do `agent-skills` được tổ chức theo kiến trúc modular gồm 8 plugins chuyên biệt (`ba-po`, `qa`, `dev`, `scrum-master`, v.v.), bạn cần link chúng vào công cụ Agent CLI trên máy của mình.

**Bước 1: Link Plugins**
Chạy lệnh sau để hệ thống tự động nhận diện toàn bộ skills (dùng được cho cả Antigravity CLI và Gemini CLI):
```bash
npm run setup:plugins
```
*(Lệnh trên tạo các symlinks an toàn từ 8 sub-plugins vào thư mục cấu hình toàn cục `~/.gemini/config/plugins/`. Nếu muốn gỡ bỏ, chỉ cần chạy: `npm run unlink:plugins`).*

**Bước 2: Sử dụng với AI Agent**
Bây giờ, bạn có thể gọi trực tiếp các lệnh (slash commands) tích hợp sẵn trong khung chat của agent. Dưới đây là các lệnh phổ biến:

| Lệnh | Chức năng | Kích hoạt skill tương ứng |
|---|---|---|
| `/tech-spec` | Viết đặc tả cấu trúc trước khi code | `dev-spec-driven-development` |
| `/plan` | Chia nhỏ công việc | `planning-and-task-breakdown` |
| `/build` | Code từng bước (incrementally) | `incremental-implementation` |
| `/unit-test` | Chạy workflow TDD | `dev-test-driven-development` |
| `/review` | Review code 5 phương diện | `review-code-and-quality` |

---

## Giai đoạn 3: Tích hợp ChatOps (n8n + Mattermost + Ngrok)

Hệ thống n8n giúp bạn xây dựng **Mattermost Slash Command** `/agent` với chi phí $0, tăng tốc xử lý (Fast-Path) với thời gian < 1s.

### Bước 1: Khởi động n8n chạy ngầm (Background Daemon)
```bash
npm run n8n:bg
```
*Ghi chú: Lệnh này dùng PM2 (được tự động cài ở Giai đoạn 1) ẩn dưới nền với lượng RAM rất nhỏ (~100MB). Bạn có thể tắt Terminal thoải mái.*

### Bước 2: Thiết lập Ngrok Static Domain
Để Mattermost Cloud gọi được webhook về máy tính cục bộ của bạn, bạn cần một Webhook URL công khai và cố định.
1. Đăng ký tài khoản miễn phí tại [ngrok.com](https://ngrok.com/).
2. Lấy **Authtoken** và chạy lệnh: `ngrok config add-authtoken <TOKEN_CỦA_BẠN>`
3. Tạo 1 **Static Domain** miễn phí trên giao diện web của Ngrok (VD: `dinosaur-cute.ngrok-free.app`).
4. Khởi động Ngrok chạy ngầm qua PM2 để nó luôn sống chung với n8n:
   ```bash
   npx pm2 start ngrok --name "ngrok-tunnel" -- http --domain=TEN_DOMAIN_CUA_BAN 5678
   ```

### Bước 3: Cấu hình File `.env`
Mở file `.env` tại thư mục gốc của dự án và điền các thông tin quan trọng:
```env
# Lấy miễn phí tại: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Webhook lấy từ Mattermost (Incoming Webhooks) để n8n trả lời tin nhắn
MATTERMOST_WEBHOOK_URL=https://mattermost.example.com/hooks/xxx-yyy-zzz
```
Sau khi lưu file `.env`, bắt buộc phải khởi động lại n8n để nạp cấu hình mới:
```bash
npm run n8n:restart
```

### Bước 4: Tạo Slash Command `/agent` trên Mattermost
1. Đăng nhập Mattermost (yêu cầu quyền Admin).
2. Vào **Main Menu** (☰) → **Integrations** → **Slash Commands** → **Add Slash Command**.
3. Điền thông tin:
   - **Command Trigger Word:** `agent`
   - **Request URL:** `https://TEN_DOMAIN_CUA_BAN/webhook/mattermost-router` *(Nhớ thay bằng domain Ngrok của bạn và bắt buộc dùng `https://`)*.
   - **Request Method:** `POST`
   - **Autocomplete Hint:** `[standup|jira <ISSUE-KEY>|test|squash|help]`
4. Lưu lại.

Bây giờ vào bất kỳ kênh nào trên Mattermost và gõ: `/agent help`. Nếu hệ thống trả lời ngay lập tức, chúc mừng bạn đã cấu hình hoàn tất toàn bộ hệ sinh thái!

---

## Phụ Lục: Các Lệnh Quản Lý Tiện Ích

Tất cả các lệnh đều được tích hợp sẵn qua hệ thống `npm run`, bạn không cần nhớ cú pháp pm2 gốc:

| Lệnh npm | Chức năng |
|---|---|
| `npm run n8n:setup` | Chạy lại nạp workflows nếu vô tình xoá |
| `npm run n8n:bg` | Khởi động n8n chạy ngầm |
| `npm run n8n:status` | Kiểm tra trạng thái n8n & ngrok |
| `npm run n8n:logs` | Xem Logs thời gian thực của n8n |
| `npm run n8n:restart`| Khởi động lại (cần thiết khi sửa `.env`) |
| `npm run n8n:stop` | Tạm dừng n8n |

---

## Kiến Trúc và Các Bước Tiếp Theo
Sau khi thiết lập xong, bạn có thể tìm hiểu thêm về kiến trúc sâu hơn của dự án:
- Tham khảo cách tổ chức nội bộ của một skill: [Cấu phẫu Skill (Skill Anatomy)](skill-anatomy.md)
- Hiểu về chiến lược kết nối n8n: [Kiến trúc n8n Integration](../architecture/n8n-integration-strategy.md)
- Nguyên tắc thiết kế kiểm thử: [Test Ownership](../architecture/test-ownership.md)
