#!/bin/bash
set -e

echo "🚀 Bắt đầu cài đặt toàn bộ môi trường Agent Skills cho macOS..."

# 1. Kiểm tra & Cài đặt Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 Homebrew chưa được cài đặt. Đang tiến hành cài đặt..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Cố gắng load brew vào shell hiện tại tuỳ theo chip Intel hay Apple Silicon
    if [ -x "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew đã sẵn sàng."
fi

# 2. Kiểm tra & Cài đặt Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Node.js chưa được cài đặt. Đang cài đặt Node.js qua Homebrew..."
    brew install node
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js đã sẵn sàng ($NODE_VERSION)."
fi

# 3. Kiểm tra & Cài đặt Ngrok
if ! command -v ngrok &> /dev/null; then
    echo "📦 Ngrok chưa được cài đặt. Đang cài đặt Ngrok qua Homebrew..."
    brew install ngrok/ngrok/ngrok
else
    echo "✅ Ngrok đã sẵn sàng."
fi

# 4. Tạo .env nếu chưa có
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📄 Tạo file .env từ .env.example..."
        cp .env.example .env
    else
        echo "⚠️ Không tìm thấy file .env.example để tạo .env!"
    fi
else
    echo "✅ File .env đã tồn tại."
fi

# 5. Cài đặt các thư viện npm
echo "📦 Cài đặt các thư viện Node.js (Dependencies)..."
npm install

# 5b. Cài n8n CLI toàn cục (cần có trước khi khởi tạo database)
if ! command -v n8n &> /dev/null; then
    echo "📦 n8n chưa được cài đặt. Đang cài n8n (npm install -g n8n)..."
    npm install -g n8n
else
    echo "✅ n8n đã sẵn sàng ($(n8n --version))."
fi

# 5c. Tạo file cấu hình cục bộ từ mẫu (nếu chưa có)
mkdir -p config
[ -f config/projects.json ] || [ -f projects.json ] || { [ -f config/projects.json.example ] && cp config/projects.json.example config/projects.json && echo "📄 Tạo config/projects.json từ mẫu."; }
[ -f config/sm-config.yaml ] || [ -f sm-config.yaml ] || { [ -f config/sm-config.example.yaml ] && cp config/sm-config.example.yaml config/sm-config.yaml && echo "📄 Tạo config/sm-config.yaml từ mẫu."; }

# 6. Khởi động n8n lần đầu để tạo database, sau đó import workflows
echo "⚙️ Khởi động n8n lần đầu để khởi tạo cơ sở dữ liệu..."
# Cần chạy n8n 1 lần để tạo file database.sqlite trước khi import workflow
n8n start &
N8N_INIT_PID=$!
echo "⏳ Đợi n8n khởi tạo DB (8 giây)..."
sleep 8
kill $N8N_INIT_PID 2>/dev/null || true
wait $N8N_INIT_PID 2>/dev/null || true
echo "✅ Database n8n đã được khởi tạo."

# 6b. Import workflows mẫu
echo "⚙️ Đang nạp các Workflow mẫu vào n8n..."
npm run n8n:setup

# 7. Đồng bộ plugins và rules toàn cục cho Antigravity / Gemini CLI
echo "🔌 Đang đồng bộ Agent Plugins và Global Rules (bao gồm Focus ADHD)..."
npm run setup

# 8. Cài skills cho Claude Code (toàn máy, tự cập nhật qua symlink)
echo "🔌 Đang cài agent-skills cho Claude Code..."
npm run setup:claude

echo ""
echo "🎉 XONG! TOÀN BỘ MÔI TRƯỜNG ĐÃ ĐƯỢC CÀI ĐẶT THÀNH CÔNG."
echo "============================================================"
echo "Các bước tiếp theo dành cho bạn:"
echo "1. Điền API keys/token vào file .env (tối thiểu: GEMINI_API_KEY, MATTERMOST_WEBHOOK_URL)."
echo "2. (Chỉ khi dùng ChatOps) Lấy Authtoken tại ngrok.com:"
echo "   ngrok config add-authtoken <TOKEN_CỦA_BẠN>"
echo "   rồi điền NGROK_DOMAIN=<static-domain>.ngrok-free.app vào .env"
echo "3. Khởi động n8n (+ ngrok nếu có NGROK_DOMAIN) chạy ngầm:"
echo "   npm run n8n:bg"
echo "4. (Tuỳ chọn) Tự khởi động cùng macOS:"
echo "   npm run n8n:autostart   # rồi chạy lệnh sudo mà script in ra"
echo "Chi tiết: docs/guides/installation-guide.md"
echo "============================================================"
