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

# 3. Kiểm tra & Cài đặt Colima + Docker CLI + Docker Compose (Không cần quyền root/admin)
if ! command -v colima &> /dev/null || ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "🐳 Đang cài đặt Colima + Docker CLI + Docker Compose qua Homebrew..."
    brew install colima docker docker-compose
else
    echo "✅ Colima ($(colima version | head -n 1)), Docker CLI và Docker Compose đã sẵn sàng."
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

# 5b. Tạo file cấu hình cục bộ từ mẫu (nếu chưa có)
mkdir -p config
[ -f config/projects.json ] || [ -f projects.json ] || { [ -f config/projects.json.example ] && cp config/projects.json.example config/projects.json && echo "📄 Tạo config/projects.json từ mẫu."; }
[ -f config/sm-config.yaml ] || [ -f sm-config.yaml ] || { [ -f config/sm-config.example.yaml ] && cp config/sm-config.example.yaml config/sm-config.yaml && echo "📄 Tạo config/sm-config.yaml từ mẫu."; }

# 6. Khởi động Colima + n8n Container & Nạp + Kích hoạt (active = 1) toàn bộ 18 Workflows
echo "⚙️ Đang khởi tạo Colima VM, container agent-skills-n8n và nạp 18 Workflows..."
npm run n8n:setup

# 7. Đồng bộ plugins và rules toàn cục cho Antigravity / Gemini CLI
echo "🔌 Đang đồng bộ Agent Plugins và Global Rules (bao gồm Focus ADHD)..."
npm run setup:plugins

# 8. Cài skills cho Claude Code (toàn máy, tự cập nhật qua symlink)
echo "🔌 Đang cài agent-skills cho Claude Code..."
npm run setup:claude

echo ""
echo "🎉 XONG! TOÀN BỘ MÔI TRƯỜNG ĐÃ ĐƯỢC CÀI ĐẶT THÀNH CÔNG."
echo "============================================================"
echo "Các bước tiếp theo dành cho bạn:"
echo "1. Điền API keys/token vào file .env (tối thiểu: thông tin Jira/Atlassian, SLACK_WEBHOOK_URL)."
echo "   Sau khi sửa .env, chạy lại: npm run n8n:up"
echo "2. Quản lý Colima + n8n Container hàng ngày:"
echo "   • npm run autostart:status # Kiểm tra trạng thái tự khởi động & n8n"
echo "   • npm run autostart:off    # Tắt tự khởi động cùng máy"
echo "   • npm run autostart:on     # Bật lại tự khởi động cùng máy"
echo "   • npm run colima:start     # Bật máy ảo Colima thủ công"
echo "   • npm run n8n:up           # Bật n8n Container & kích hoạt 18 workflows"
echo "   • npm run n8n:logs         # Xem log n8n Container"
echo "   • npm run n8n:down         # Dừng n8n Container"
echo "3. Chế độ Tự Động Khởi Động (macOS LaunchAgent):"
echo "   Đã được kích hoạt tự động! Colima và n8n sẽ tự bật khi đăng nhập macOS"
echo "   kèm cơ chế Watchdog giám sát và tự động chạy bù Daily Standup nếu mở máy trễ."
echo "Chi tiết: docs/guides/installation-guide.md"
echo "============================================================"
