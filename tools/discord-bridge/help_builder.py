"""
Help Embed & Text Builders cho Discord Bot Bridge.
Tất cả là pure functions (không phụ thuộc bot instance).
"""

import discord


def build_help_embed(bot_name: str = "Agent Assistant") -> discord.Embed:
    """Tạo Embed hướng dẫn sử dụng bot trực quan, đầy đủ"""
    embed = discord.Embed(
        title="🤖 HƯỚNG DẪN ĐIỀU KHIỂN AGENT SKILLS BRIDGE",
        description=(
            "Chào mừng bạn đến với **Agent Skills Bridge**! Bot cho phép bạn điều khiển và giao tiếp "
            "với Kỹ sư AI Toàn năng (BA, DEV, QA, Scrum Master, Code Reviewer, Security Auditor) "
            "trực tiếp từ xa qua Discord.\n\n"
            "Dưới đây là các lệnh sẵn sàng để bạn sử dụng:"
        ),
        color=0x1ABC9C
    )

    embed.add_field(
        name="🎯 1. Slash Command (Khuyên dùng — Tự động gợi ý)",
        value=(
            "• Gõ `/agent` : Điều khiển Agent thực thi kỹ năng với đầy đủ tham số.\n"
            "  ↳ *Ví dụ:* `/agent skill: /cr-review-code-and-quality project: my-project des: review auth`\n"
            "• Gõ `/sync` : Fetch & pull mã nguồn mới nhất của dự án về máy local an toàn.\n"
            "  ↳ *Ví dụ:* `/sync project: openapi-tyk` hoặc `/sync project: openapi`"
        ),
        inline=False
    )

    embed.add_field(
        name="⚡ 2. Bộ Lệnh Prefix Tối Giản",
        value=(
            "• `!sync -p <project> [--stash]` : Kéo code mới nhất về local (VD: `!sync -p openapi-tyk`)\n"
            "• `!run <kỹ_năng> [-p project] [-d des]` : Kích hoạt Agent thực thi kỹ năng\n"
            "  ↳ *Ví dụ:* `!run /cr-review-code-and-quality -p my-project -d review auth`\n"
            "• `!cancel` : Hủy tác vụ Agent đang chạy (hoặc `!abort`, `!stop`)\n"
            "• `!skills [từ_khóa]` : Xem danh sách 36+ kỹ năng hoặc tìm kiếm (VD: `!skills qa`)\n"
            "• `!projects [reload]` : Xem danh sách dự án trên máy hoặc quét lại khi vừa clone repo\n"
            "• `!status` : Kiểm tra trạng thái Agent đang bận hay rảnh\n"
            "• `!help` : Xem lại bảng hướng dẫn này"
        ),
        inline=False
    )

    embed.add_field(
        name="💬 3. Hội Thoại Đa Lượt Trong Thread",
        value=(
            "• Khi chạy lệnh, bot sẽ **tự tạo một Thread riêng** để giữ kênh chat chính luôn sạch sẽ.\n"
            "• Nếu Agent hỏi làm rõ, bạn chỉ cần **chat trả lời trực tiếp trong Thread**.\n"
            "• Khi hoàn thành, gõ **`!done`** để đóng và lưu trữ Thread."
        ),
        inline=False
    )

    embed.add_field(
        name="🔒 4. Phân Quyền & Bảo Mật",
        value=(
            "• Chỉ những User ID được cấu hình trong `DISCORD_ALLOWED_USER_ID` mới có thể ra lệnh.\n"
            "• Để lấy ID của bạn: Cài đặt (User Settings) $\\rightarrow$ Advanced $\\rightarrow$ Bật Developer Mode $\\rightarrow$ Chuột phải Avatar $\\rightarrow$ Copy User ID."
        ),
        inline=False
    )

    embed.set_footer(text=f"Bot: {bot_name} | Gõ !help <tên_lệnh> (VD: !help run) để xem chi tiết!")
    return embed


def build_command_help_embed(command_name: str, bot_name: str = "Agent Assistant") -> discord.Embed | None:
    """Tạo Embed hướng dẫn chi tiết cho từng lệnh cụ thể"""
    cmd = command_name.lower().lstrip("!/").strip()

    if cmd in ["run", "agent"]:
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !run & /agent",
            description="Kích hoạt Agent thực thi một kỹ năng trên dự án chỉ định.",
            color=0x3498DB
        )
        embed.add_field(
            name="🎯 Cú pháp Slash Command",
            value="`/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`",
            inline=False
        )
        embed.add_field(
            name="⚡ Cú pháp Prefix Command",
            value="`!run <kỹ_năng> [-p <project>] [-d <mô_tả>]`",
            inline=False
        )
        embed.add_field(
            name="🚩 Các cờ hỗ trợ",
            value=(
                "• `-p`, `--project`, `project:` : Tên dự án trên máy (gõ `!projects` để xem danh sách)\n"
                "• `-d`, `--des`, `des:` : Mô tả nhiệm vụ, phạm vi scan hoặc issue key Jira"
            ),
            inline=False
        )
        embed.add_field(
            name="💡 Ví dụ thực tế",
            value=(
                "• `!run /cr-review-code-and-quality -p my-project -d review auth logic`\n"
                "• `!run /qa-full-pipeline -p my-project -d G3PTP-17093`\n"
                "• `!run /dev-audit -d tối ưu hiệu năng login`\n"
                "• `/agent skill: /dev-api-design project: my-project des: thiết kế auth API`"
            ),
            inline=False
        )
        embed.add_field(
            name="⏱️ Giới hạn tần suất",
            value="Mỗi user chỉ được gọi `!run` tối đa **1 lần / 30 giây** để tránh spam.",
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd in ["skills", "commands", "skill"]:
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !skills",
            description="Xem danh sách 36+ kỹ năng của Agent hoặc tìm kiếm kỹ năng theo từ khóa.",
            color=0x9B59B6
        )
        embed.add_field(
            name="⚡ Cú pháp",
            value="`!skills [từ_khóa]`",
            inline=False
        )
        embed.add_field(
            name="💡 Ví dụ thực tế",
            value=(
                "• `!skills` : Xem toàn bộ danh sách kỹ năng phân loại theo nhóm (BA, DEV, QA, SM...)\n"
                "• `!skills qa` : Tìm các kỹ năng liên quan đến QA/Automation\n"
                "• `!skills dev` : Tìm các kỹ năng lập trình, kiểm toán, refactoring\n"
                "• `!skills review` : Tìm kỹ năng Code Review"
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd in ["projects", "project"]:
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !projects",
            description="Quản lý và tra cứu danh sách các dự án trên máy tính mà Bot phát hiện được.",
            color=0xE67E22
        )
        embed.add_field(
            name="⚡ Cú pháp",
            value=(
                "• `!projects` : Liệt kê tất cả dự án hiện tại\n"
                "• `!projects reload` : Quét lại thư mục máy tính (dùng khi bạn vừa clone repo mới)"
            ),
            inline=False
        )
        embed.add_field(
            name="⚙️ Cấu hình Alias riêng (Tùy chọn)",
            value=(
                "Bạn có thể tạo file `tools/discord-bridge/projects.json` từ file mẫu `projects.json.example` "
                "để gán tên viết tắt tùy ý cho các đường dẫn dự án."
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd == "status":
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !status",
            description="Kiểm tra trạng thái sẵn sàng của Agent.",
            color=0x2ECC71
        )
        embed.add_field(
            name="⚡ Cú pháp",
            value="`!status`",
            inline=False
        )
        embed.add_field(
            name="📊 Các trạng thái",
            value=(
                "• `🟢 Rảnh rỗi` : Agent sẵn sàng nhận lệnh mới ngay lập tức.\n"
                "• `🔴 Đang bận` : Agent đang xử lý tác vụ khác. Lệnh mới sẽ được tự động xếp hàng đợi."
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd == "done":
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !done",
            description="Đóng và lưu trữ Thread làm việc khi tác vụ đã hoàn thành.",
            color=0x95A5A6
        )
        embed.add_field(
            name="⚡ Cú pháp",
            value="`!done` *(chỉ gõ bên trong Thread do bot tạo ra)*",
            inline=False
        )
        embed.add_field(
            name="💡 Tác dụng",
            value=(
                "• Đóng (Archive) Thread để giữ kênh chat chính luôn sạch sẽ.\n"
                "• Toàn bộ lịch sử trò chuyện và kết quả vẫn được Discord lưu lại để tra cứu sau này."
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd in ["cancel", "abort", "stop"]:
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !cancel",
            description="Hủy tác vụ Agent đang chạy ngay lập tức.",
            color=0xE74C3C
        )
        embed.add_field(
            name="⚡ Cú pháp",
            value="`!cancel` *(alias: `!abort`, `!stop`)*",
            inline=False
        )
        embed.add_field(
            name="💡 Tác dụng",
            value=(
                "• Gửi tín hiệu `SIGTERM` để dừng Agent CLI subprocess đang chạy.\n"
                "• Giải phóng hàng đợi (TASK_LOCK) cho lệnh tiếp theo.\n"
                "• Nếu không có tác vụ nào đang chạy, bot sẽ thông báo tương ứng."
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    elif cmd in ["sync", "reposync", "pull"]:
        embed = discord.Embed(
            title="📖 Hướng Dẫn Chi Tiết: Lệnh !sync & /sync",
            description="Fetch và pull code mới nhất của các dự án hoặc microservices về máy local an toàn.",
            color=0x1ABC9C
        )
        embed.add_field(
            name="🎯 Cú pháp Slash Command",
            value="`/sync project: <tên_project> [branch: <nhánh>] [des: <cờ_bổ_sung>]`",
            inline=False
        )
        embed.add_field(
            name="⚡ Cú pháp Prefix Command",
            value="`!sync -p <project> [-b <nhánh>] [--stash] [--dry-run]`",
            inline=False
        )
        embed.add_field(
            name="🚩 Các cờ hỗ trợ",
            value=(
                "• `-p`, `--project`, `project:` : Tên dự án trong `projects.json` hoặc thư mục trên máy\n"
                "• `-b`, `--branch`, `branch:` : Nhánh cần pull (mặc định giữ nguyên nhánh hiện tại)\n"
                "• `--stash` : Tự động stash thay đổi chưa lưu trước khi pull và pop lại\n"
                "• `--dry-run` : Chỉ kiểm tra số commit lệch với remote mà không pull thật"
            ),
            inline=False
        )
        embed.add_field(
            name="💡 Ví dụ thực tế",
            value=(
                "• `!sync -p openapi-tyk` : Kéo code mới cho đúng repo `openapi-tyk`\n"
                "• `!sync -p openapi` : Kéo code cho toàn bộ 34 microservices trong folder 3.1\n"
                "• `!sync -p openapi-tyk --stash` : Kéo code an toàn kể cả khi đang có file sửa dở\n"
                "• `/sync project: openapi-tyk` : Kéo code qua Slash Command có autocomplete"
            ),
            inline=False
        )
        embed.set_footer(text=f"Bot: {bot_name} | Gõ !help để xem toàn bộ danh sách lệnh")
        return embed

    return None


def build_command_help_text(command_name: str, bot_name: str = "Agent Assistant") -> str:
    """Phiên bản text markdown thuần cho hướng dẫn từng lệnh khi không có quyền embed"""
    cmd = command_name.lower().lstrip("!/").strip()
    if cmd in ["sync", "reposync", "pull"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !sync & /sync**\n\n"
            "• **Slash Command:** `/sync project: <tên_project> [branch: <nhánh>] [des: <cờ>]`\n"
            "• **Prefix Command:** `!sync -p <project> [-b <nhánh>] [--stash] [--dry-run]`\n"
            "• **Các cờ:** `-p` (chọn dự án/thư mục), `-b` (nhánh), `--stash` (auto-stash), `--dry-run` (kiểm tra)\n"
            "• **Ví dụ:**\n"
            "  ↳ `!sync -p openapi-tyk` (chỉ pull đúng repo openapi-tyk)\n"
            "  ↳ `!sync -p openapi` (pull cả cụm microservices trong folder 3.1)\n"
            "  ↳ `!sync -p openapi --stash` (tự stash code chưa commit)"
        )
    if cmd in ["run", "agent"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !run & /agent**\n\n"
            "• **Slash Command:** `/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`\n"
            "• **Prefix Command:** `!run <kỹ_năng> [-p <project>] [-d <mô_tả>]`\n"
            "• **Các cờ:** `-p` (chọn dự án), `-d` (mô tả task/issue)\n"
            "• **Rate limit:** 1 lần / 30 giây / user\n"
            "• **Ví dụ:** `!run /cr-review-code-and-quality -p my-project -d review auth`"
        )
    elif cmd in ["skills", "commands", "skill"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !skills**\n\n"
            "• **Cú pháp:** `!skills [từ_khóa]`\n"
            "• **Ví dụ:** `!skills` (xem tất cả), `!skills qa` (lọc QA), `!skills dev` (lọc Dev)"
        )
    elif cmd in ["projects", "project"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !projects**\n\n"
            "• `!projects` : Xem toàn bộ dự án trên máy\n"
            "• `!projects reload` : Quét lại thư mục khi vừa clone repo mới"
        )
    elif cmd == "status":
        return (
            "📖 **Hướng Dẫn Lệnh: !status**\n\n"
            "• `!status` : Kiểm tra Agent đang rảnh hay bận."
        )
    elif cmd == "done":
        return (
            "📖 **Hướng Dẫn Lệnh: !done**\n\n"
            "• `!done` : Đóng và lưu trữ Thread sau khi hoàn thành tác vụ (gõ trong Thread)."
        )
    elif cmd in ["cancel", "abort", "stop"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !cancel**\n\n"
            "• `!cancel` (hoặc `!abort`, `!stop`) : Hủy tác vụ Agent đang chạy ngay lập tức."
        )
    return build_help_text(bot_name=bot_name)


def build_help_text(bot_name: str = "Agent Assistant") -> str:
    """Phiên bản text markdown thuần phòng trường hợp kênh chat không cho gửi Embed"""
    return (
        f"👋 **Xin chào!** Cảm ơn bạn đã thêm **{bot_name}** vào server.\n\n"
        "🤖 **HƯỚNG DẪN ĐIỀU KHIỂN AGENT SKILLS BRIDGE**\n\n"
        "🎯 **1. Slash Command (Khuyên dùng — Tự động gợi ý):**\n"
        "• `/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`\n"
        "  ↳ *Ví dụ:* `/agent skill: /cr-review-code-and-quality project: my-project des: review auth`\n"
        "• `/sync project: <tên_project>` : Đồng bộ code mới nhất của dự án về máy local\n"
        "  ↳ *Ví dụ:* `/sync project: openapi-tyk`\n\n"
        "⚡ **2. Bộ Lệnh Prefix Tối Giản:**\n"
        "• `!sync -p <project> [--stash]` : Kéo code mới nhất về local (VD: `!sync -p openapi-tyk`)\n"
        "• `!run <kỹ_năng> [-p project] [-d des]` : Kích hoạt Agent thực thi (cooldown: 30s/user)\n"
        "  ↳ *Ví dụ:* `!run /cr-review-code-and-quality -p my-project -d review auth`\n"
        "• `!cancel` : Hủy tác vụ Agent đang chạy (alias: `!abort`, `!stop`)\n"
        "• `!skills [từ_khóa]` : Xem danh sách 36+ kỹ năng hoặc tìm kiếm (VD: `!skills qa`)\n"
        "• `!projects [reload]` : Xem danh sách dự án trên máy hoặc quét lại\n"
        "• `!status` : Kiểm tra trạng thái Agent đang bận hay rảnh\n"
        "• `!help [lệnh]` : Xem lại bảng hướng dẫn này (hoặc chi tiết: `!help run`)\n\n"
        "💬 **3. Hội Thoại Đa Lượt Trong Thread:**\n"
        "• Bot sẽ tự tạo Thread riêng cho mỗi tác vụ. Bạn chỉ cần chat trả lời trực tiếp trong Thread.\n"
        "• Gõ `!done` để đóng Thread khi hoàn thành.\n\n"
        "🔒 **4. Phân Quyền & Bảo Mật:**\n"
        "• Chỉ User ID cấu hình trong `DISCORD_ALLOWED_USER_ID` mới có quyền chạy lệnh.\n"
        f"*(Gõ `/agent` hoặc `!help` bất kỳ lúc nào để xem lại hướng dẫn)*"
    )
