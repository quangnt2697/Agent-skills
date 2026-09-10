#!/usr/bin/env python3
"""
Discord Bot Bridge for Agent Skills Workspace
- Điều khiển Agent từ xa qua Discord (Prefix commands !agent hoặc Slash commands /agent)
- Hỗ trợ Autocomplete gợi ý toàn bộ skill/command khi người dùng gõ
- Hội thoại đa lượt (Multi-turn) liên tục trong Thread: Agent hỏi làm rõ -> User chat trả lời -> Agent tiếp tục
- Tự động lưu trữ/đóng Thread khi hoàn thành (!done / !close)
"""

import os
import sys
import shutil
import asyncio
import subprocess
import tomllib
from pathlib import Path
from datetime import datetime

# Tự động cài đặt thư viện nếu user mới clone repo mà chưa chạy pip install
try:
    import discord
    from discord import app_commands
    from discord.ext import commands
    from dotenv import load_dotenv
except ImportError:
    print("📦 Chưa tìm thấy thư viện Discord. Đang tự động cài đặt (pip3 install)...", flush=True)
    req_path = Path(__file__).resolve().parent / "requirements.txt"
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(req_path)])
    import discord
    from discord import app_commands
    from discord.ext import commands
    from dotenv import load_dotenv
    print("✅ Đã cài đặt xong thư viện!", flush=True)

# Tự động nạp file .env từ root của workspace
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

# ================= CẤU HÌNH =================
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
ALLOWED_USER_IDS_RAW = os.getenv("DISCORD_ALLOWED_USER_ID", "")
WORKSPACE_DIR = os.getenv("AGENT_WORKSPACE_DIR", str(ROOT_DIR))

# Khởi tạo ProjectManager (Auto-discovery & Registry)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from project_manager import ProjectManager
project_manager = ProjectManager(workspace_root=ROOT_DIR)

# Đường dẫn các CLI Agent
CLAUDE_CLI = shutil.which("claude") or str(Path.home() / ".local/bin/claude")
AGY_CLI = shutil.which("agy") or str(Path.home() / ".local/bin/agy")

# Tìm CLI Agent mặc định (ưu tiên agy, fallback sang claude)
DEFAULT_CLI = os.getenv("AGENT_CLI_PATH")
if not DEFAULT_CLI:
    DEFAULT_CLI = AGY_CLI if os.path.exists(AGY_CLI) else CLAUDE_CLI

# Parse danh sách User ID được phép gọi
ALLOWED_USER_IDS = set()
for uid in ALLOWED_USER_IDS_RAW.replace(";", ",").split(","):
    cleaned = uid.strip()
    if cleaned.isdigit():
        ALLOWED_USER_IDS.add(int(cleaned))

# Queue / Lock để đảm bảo mỗi thời điểm chỉ có 1 tác vụ chạy trên Workspace
TASK_LOCK = asyncio.Lock()
CURRENT_TASK_INFO = {"running": False, "prompt": None, "started_at": None, "user": None, "engine": None}

# Lưu các Thread đang trong phiên làm việc liên tục: thread_id -> {"cli": cli_path, "user_id": user_id, "prompt": prompt}
ACTIVE_THREADS = {}

# ================= DISCORD CLIENT =================
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


def is_authorized(user_id: int) -> bool:
    if not ALLOWED_USER_IDS:
        return False
    return user_id in ALLOWED_USER_IDS


def load_all_commands():
    root = Path(WORKSPACE_DIR)
    cmds_by_cat = {}
    cat_names = {
        "ba-po": "📊 Phân Tích Nghiệp Vụ (BA/PO)",
        "dev": "💻 Phát Triển Phần Mềm (DEV)",
        "qa": "🧪 Kiểm Thử Tự Động (QA/SDET)",
        "scrum-master": "🏃 Scrum Master (SM)",
        "code-reviewer": "🔍 Code Review (CR)",
        "security-auditor": "🛡️ Kiểm Toán Bảo Mật (Security)",
        "web-performance-auditor": "⚡ Hiệu Năng Web (WebPerf)",
        "core": "⚙️ Công Cụ Cốt Lõi (Core/Data)"
    }
    for toml_file in sorted(root.glob("plugins/*/commands/*.toml")):
        try:
            plugin_id = toml_file.parts[-3] if len(toml_file.parts) >= 3 else "other"
            cat_title = cat_names.get(plugin_id, plugin_id.upper())
            if cat_title not in cmds_by_cat:
                cmds_by_cat[cat_title] = []
            with open(toml_file, "rb") as fp:
                data = tomllib.load(fp)
                cmd_name = "/" + toml_file.stem
                desc = data.get("description", "")
                cmds_by_cat[cat_title].append({
                    "name": cmd_name,
                    "desc": desc,
                    "plugin": plugin_id
                })
        except Exception:
            pass
    return cmds_by_cat


@bot.event
async def on_ready():
    print(f"=================================================", flush=True)
    print(f"🤖 Discord Agent Bridge đã online!", flush=True)
    print(f"👤 Bot: {bot.user.name} (ID: {bot.user.id})", flush=True)
    print(f"📂 Workspace: {WORKSPACE_DIR}", flush=True)
    print(f"📁 Projects Detected: {len(project_manager.list_projects())} projects", flush=True)
    print(f"⚡ CLI Executable: {DEFAULT_CLI}", flush=True)
    print(f"🔒 Allowed User IDs: {list(ALLOWED_USER_IDS) if ALLOWED_USER_IDS else 'CHƯA CẤU HÌNH (Sẽ chặn mọi lệnh)'}", flush=True)
    
    # Đồng bộ Slash Commands với Discord
    try:
        synced = await bot.tree.sync()
        print(f"✨ Đã đồng bộ {len(synced)} Slash Commands (/agent) với Discord!", flush=True)
    except Exception as e:
        print(f"⚠️ Lỗi đồng bộ Slash Commands: {e}", flush=True)
    print(f"=================================================", flush=True)


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
            "• Gõ `/agent` trên thanh chat để Discord tự động gợi ý toàn bộ kỹ năng và dự án.\n"
            "• **Cú pháp:** `/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`\n"
            "• **Ví dụ:** `/agent skill: /cr-review-code-and-quality project: my-project des: review auth`"
        ),
        inline=False
    )

    embed.add_field(
        name="⚡ 2. Bộ 5 Lệnh Prefix Tối Giản",
        value=(
            "• `!run <kỹ_năng> [-p project] [-d des]` : Kích hoạt Agent thực thi\n"
            "  ↳ *Ví dụ:* `!run /cr-review-code-and-quality -p my-project -d review auth`\n"
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

    return None


def build_command_help_text(command_name: str, bot_name: str = "Agent Assistant") -> str:
    """Phiên bản text markdown thuần cho hướng dẫn từng lệnh khi không có quyền embed"""
    cmd = command_name.lower().lstrip("!/").strip()
    if cmd in ["run", "agent"]:
        return (
            "📖 **Hướng Dẫn Lệnh: !run & /agent**\n\n"
            "• **Slash Command:** `/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`\n"
            "• **Prefix Command:** `!run <kỹ_năng> [-p <project>] [-d <mô_tả>]`\n"
            "• **Các cờ:** `-p` (chọn dự án), `-d` (mô tả task/issue)\n"
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
    return build_help_text(bot_name=bot_name)


def build_help_text(bot_name: str = "Agent Assistant") -> str:
    """Phiên bản text markdown thuần phòng trường hợp kênh chat không cho gửi Embed"""
    return (
        f"👋 **Xin chào!** Cảm ơn bạn đã thêm **{bot_name}** vào server.\n\n"
        "🤖 **HƯỚNG DẪN ĐIỀU KHIỂN AGENT SKILLS BRIDGE**\n\n"
        "🎯 **1. Slash Command (Khuyên dùng — Tự động gợi ý):**\n"
        "• `/agent skill: <kỹ_năng> project: <tên_project> des: <mô_tả>`\n"
        "  ↳ *Ví dụ:* `/agent skill: /cr-review-code-and-quality project: my-project des: review auth`\n\n"
        "⚡ **2. Bộ 5 Lệnh Prefix Tối Giản:**\n"
        "• `!run <kỹ_năng> [-p project] [-d des]` : Kích hoạt Agent thực thi\n"
        "  ↳ *Ví dụ:* `!run /cr-review-code-and-quality -p my-project -d review auth`\n"
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


@bot.event
async def on_guild_join(guild: discord.Guild):
    """
    Tự động gửi tin nhắn hướng dẫn các lệnh khả dụng khi bot được thêm vào một Server mới
    """
    print(f"🎉 Bot vừa được thêm vào Server: {guild.name} (ID: {guild.id})", flush=True)

    me = guild.me
    if not me and bot.user:
        me = guild.get_member(bot.user.id)

    def can_send(channel) -> bool:
        if not channel:
            return False
        if not me:
            return True
        perms = channel.permissions_for(me)
        return getattr(perms, 'send_messages', False) and getattr(perms, 'view_channel', True)

    target_channel = None

    # 1. Thử system channel nếu có quyền gửi
    if guild.system_channel and can_send(guild.system_channel):
        target_channel = guild.system_channel

    # 2. Thử tìm các channel tên phổ biến: general, chung, bot, commands, agent, chat, welcome, main
    if not target_channel:
        preferred_names = ["general", "chung", "bot", "bots", "commands", "agent", "chat", "welcome", "main"]
        for ch in guild.text_channels:
            if ch.name.lower() in preferred_names and can_send(ch):
                target_channel = ch
                break

    # 3. Fallback sang text channel đầu tiên có quyền gửi
    if not target_channel:
        for ch in guild.text_channels:
            if can_send(ch):
                target_channel = ch
                break

    if target_channel:
        bot_name = bot.user.name if bot.user else "Agent Assistant"
        embed = build_help_embed(bot_name=bot_name)
        welcome_header = (
            "👋 **Xin chào!** Cảm ơn bạn đã thêm Agent Assistant vào server.\n"
            "Dưới đây là cẩm nang toàn bộ các lệnh sẵn sàng để bạn điều khiển Agent từ Discord:"
        )
        try:
            await target_channel.send(content=welcome_header, embed=embed)
            print(f"✅ Đã tự động gửi tin nhắn hướng dẫn (embed) tới #{target_channel.name} ({guild.name})", flush=True)
        except discord.Forbidden:
            # Fallback sang plain-text nếu channel chặn Embed Links
            try:
                fallback_msg = build_help_text(bot_name=bot_name)
                await target_channel.send(content=fallback_msg)
                print(f"✅ Đã tự động gửi tin nhắn hướng dẫn (text fallback) tới #{target_channel.name} ({guild.name})", flush=True)
            except Exception as e:
                print(f"⚠️ Lỗi gửi fallback tới #{target_channel.name}: {e}", flush=True)
        except Exception as e:
            print(f"⚠️ Không thể gửi tin nhắn hướng dẫn tới #{target_channel.name}: {e}", flush=True)
    else:
        print(f"⚠️ Không tìm thấy channel nào có quyền gửi tin nhắn trong Server {guild.name}", flush=True)


# ================= XỬ LÝ CHẠY AGENT =================

async def run_agent_turn(channel_or_thread, prompt: str, cli_path: str, is_continue: bool = False, author=None):
    """
    Thực thi 1 lượt chạy Agent (hoặc mở đầu hoặc tiếp tục phiên làm việc)
    """
    engine_name = Path(cli_path).name.upper()

    # Chuẩn hóa tiền tố / nếu người dùng gõ thiếu trong lượt đầu
    if not is_continue:
        first_word = prompt.split()[0]
        if not first_word.startswith("/"):
            clean_first = first_word.lstrip("/")
            matching_toml = list((ROOT_DIR / "plugins").glob(f"*/commands/{clean_first}.toml"))
            if matching_toml:
                prompt = "/" + prompt

    # Quản lý hàng đợi concurrency
    if TASK_LOCK.locked():
        queue_msg = await channel_or_thread.send(f"⏳ Đang có tác vụ khác đang chạy. Yêu cầu (`{prompt[:50]}`) đã được xếp hàng...")
    else:
        queue_msg = None

    async with TASK_LOCK:
        if queue_msg:
            try:
                await queue_msg.delete()
            except Exception:
                pass

        user_label = f"{author.name} ({author.id})" if author else "Unknown"
        CURRENT_TASK_INFO["running"] = True
        CURRENT_TASK_INFO["prompt"] = prompt
        CURRENT_TASK_INFO["engine"] = engine_name
        CURRENT_TASK_INFO["started_at"] = datetime.now()
        CURRENT_TASK_INFO["user"] = user_label

        start_time = datetime.now()

        if is_continue:
            await channel_or_thread.send(f"💬 **Nhận câu trả lời:** `{prompt[:100]}`\n⏳ *Agent đang suy luận tiếp...*")
        else:
            await channel_or_thread.send(
                f"🚀 **Đã kích hoạt Agent!**\n"
                f"• **Lệnh:** `{prompt}`\n"
                f"• **Engine:** `{engine_name}`\n"
                f"• **Thời gian bắt đầu:** {start_time.strftime('%H:%M:%S')}\n"
                f"⏳ *Đang xử lý, bot sẽ thông báo ngay khi hoàn tất...*\n\n"
                f"💡 _Mẹo: Nếu Agent hỏi làm rõ, bạn chỉ cần **chat trả lời trực tiếp trong Thread này**._\n"
                f"🔒 _Khi xong việc, gõ `!done` để đóng thread._"
            )

        def run_cli_subprocess():
            # Nếu là tiếp tục phiên thì truyền cờ -c (--continue)
            cmd = [cli_path]
            if is_continue:
                cmd.append("-c")
            cmd.extend(["-p", prompt, "--dangerously-skip-permissions"])

            process = subprocess.run(
                cmd,
                cwd=WORKSPACE_DIR,
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True
            )
            return process.returncode, process.stdout, process.stderr

        loop = asyncio.get_running_loop()
        try:
            async with channel_or_thread.typing():
                returncode, stdout, stderr = await loop.run_in_executor(None, run_cli_subprocess)
        except Exception as e:
            returncode = -1
            stdout = ""
            stderr = str(e)
        finally:
            CURRENT_TASK_INFO["running"] = False
            CURRENT_TASK_INFO["prompt"] = None
            CURRENT_TASK_INFO["engine"] = None
            CURRENT_TASK_INFO["started_at"] = None
            CURRENT_TASK_INFO["user"] = None

        end_time = datetime.now()
        duration = end_time - start_time
        mins, secs = divmod(int(duration.total_seconds()), 60)
        time_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"

        if returncode == 0:
            status_prefix = "✅" if not is_continue else "💬"
            header_status = f"{status_prefix} **[{engine_name}] Phản hồi của Agent** (`{time_str}`):"
            output_content = stdout if stdout.strip() else "*(Không có text output từ CLI)*"
        else:
            header_status = f"❌ **[{engine_name}] Agent kết thúc với lỗi (Exit Code {returncode})** (`{time_str}`):"
            output_content = f"Lỗi (stderr):\n{stderr}\n\nOutput (stdout):\n{stdout}"

        # Gửi output về Thread
        if len(output_content) <= 1800:
            await channel_or_thread.send(f"{header_status}\n```text\n{output_content}\n```")
        else:
            log_filename = f"agent_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            temp_file = Path("/tmp") / log_filename
            temp_file.write_text(output_content, encoding="utf-8")
            await channel_or_thread.send(
                content=f"{header_status}\n📄 Kết quả dài hơn 2000 ký tự, xem chi tiết trong file log đính kèm:",
                file=discord.File(str(temp_file), filename=log_filename)
            )


# ================= SỰ KIỆN NHẬN TIN NHẮN (MULTI-TURN & COMMANDS) =================

@bot.event
async def on_message(message: discord.Message):
    if message.author == bot.user:
        return

    # Nếu người dùng chat trong một Thread đang theo dõi session
    if isinstance(message.channel, discord.Thread) and message.channel.id in ACTIVE_THREADS:
        if not is_authorized(message.author.id):
            return

        content = message.content.strip()

        # 1. Lệnh đóng & lưu trữ Thread khi kết thúc phiên
        if content in ["!done", "!close", "!finish"]:
            ACTIVE_THREADS.pop(message.channel.id, None)
            await message.channel.send("🔒 **Phiên làm việc đã kết thúc.** Đang đóng và lưu trữ (archive) Thread này...")
            try:
                await message.channel.edit(archived=True, locked=True)
            except Exception:
                pass
            return

        # 2. Lệnh xóa vĩnh viễn Thread
        if content in ["!delete", "!del"]:
            ACTIVE_THREADS.pop(message.channel.id, None)
            await message.channel.send("🗑️ Đang xóa Thread này...")
            try:
                await message.channel.delete()
            except Exception:
                pass
            return

        # 3. Chat bình thường trong Thread -> Tiếp tục phiên làm việc (Multi-turn session)
        if not content.startswith("!"):
            session_info = ACTIVE_THREADS[message.channel.id]
            cli_path = session_info["cli"]
            await run_agent_turn(
                channel_or_thread=message.channel,
                prompt=content,
                cli_path=cli_path,
                is_continue=True,
                author=message.author
            )
            return

    # Xử lý các lệnh prefix thông thường
    await bot.process_commands(message)


# ================= SLASH COMMANDS (VỚI AUTOCOMPLETE) =================

@bot.tree.command(name="agent", description="Kích hoạt Agent thực thi một skill với Project trên máy")
@app_commands.describe(
    skill="Chọn skill bạn muốn gọi (gõ ký tự để gợi ý)",
    project="Tên Project trên máy để Agent tự động scan code (gõ để gợi ý)",
    des="Mô tả nhiệm vụ, phạm vi scan code hoặc tham số (VD: review auth, G3PTP-17093)"
)
async def slash_agent(interaction: discord.Interaction, skill: str, project: str = "", des: str = ""):
    if not is_authorized(interaction.user.id):
        return await interaction.response.send_message("⛔ Bạn không có quyền điều khiển Agent này.", ephemeral=True)

    # Xử lý directive cho Project nếu người dùng cung cấp
    resolved_proj = project_manager.resolve_project(project) if project and project.strip() else None
    if resolved_proj:
        proj_name, proj_path = resolved_proj
        full_prompt = project_manager.build_project_directive(skill, proj_name, proj_path, des)
        title_summary = f"{skill} [{proj_name}] {des}".strip()
    else:
        full_prompt = f"{skill} {des}".strip()
        title_summary = full_prompt

    await interaction.response.send_message(f"🎯 Đang khởi tạo session cho: `{title_summary}`...")

    # Tạo thread từ message phản hồi
    msg = await interaction.original_response()
    clean_title = title_summary.replace("\n", " ")[:50]
    engine_name = Path(DEFAULT_CLI).name.upper()
    thread_name = f"[{engine_name}] {clean_title}..."

    try:
        thread = await msg.create_thread(name=thread_name)
    except Exception:
        thread = interaction.channel

    # Đăng ký thread vào active sessions
    if isinstance(thread, discord.Thread):
        ACTIVE_THREADS[thread.id] = {
            "cli": DEFAULT_CLI,
            "user_id": interaction.user.id,
            "prompt": full_prompt
        }

    # Thực thi lượt đầu
    await run_agent_turn(thread, full_prompt, DEFAULT_CLI, is_continue=False, author=interaction.user)


@slash_agent.autocomplete("skill")
async def skill_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
    all_cmds = []
    categories = load_all_commands()
    for cat_title, items in categories.items():
        for item in items:
            all_cmds.append(item)

    cur_lower = current.lower().strip()
    choices = []
    for cmd in all_cmds:
        raw_name = cmd["name"].lstrip("/")
        if not cur_lower or cur_lower in raw_name.lower() or cur_lower in cmd["desc"].lower():
            label = f"{cmd['name']} - {cmd['desc'][:60]}"[:100]
            choices.append(app_commands.Choice(name=label, value=cmd["name"]))
            if len(choices) >= 25:
                break
    return choices


@slash_agent.autocomplete("project")
async def project_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
    choices = []
    results = project_manager.search_projects(current, limit=25)
    for label, proj_name, _path_str in results:
        choices.append(app_commands.Choice(name=label, value=proj_name))
    return choices


# ================= CÁC LỆNH TEXT PREFIX TRUYỀN THỐNG =================

@bot.command(name="help")
async def show_help(ctx, *, command_name: str = None):
    """Hiển thị bảng hướng dẫn sử dụng bot tổng quan hoặc chi tiết từng lệnh"""
    bot_name = bot.user.name if bot.user else "Agent Assistant"
    if command_name:
        cmd_embed = build_command_help_embed(command_name, bot_name=bot_name)
        if cmd_embed:
            try:
                return await ctx.send(embed=cmd_embed)
            except discord.Forbidden:
                return await ctx.send(content=build_command_help_text(command_name, bot_name=bot_name))
        else:
            await ctx.send(f"❓ Không tìm thấy hướng dẫn cho `{command_name}`. Dưới đây là bảng hướng dẫn tổng quan:")

    embed = build_help_embed(bot_name=bot_name)
    try:
        await ctx.send(embed=embed)
    except discord.Forbidden:
        await ctx.send(content=build_help_text(bot_name=bot_name))


@bot.command(name="skills", aliases=["commands"])
async def list_skills(ctx, *, filter_query: str = None):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

    categories = load_all_commands()

    if not filter_query:
        embed = discord.Embed(
            title="📋 Danh Sách Kỹ Năng Của Agent",
            description=(
                "Dưới đây là các kỹ năng sẵn sàng phục vụ bạn:\n"
                "💡 _Mẹo: Bạn có thể gõ `/agent` để Discord tự gợi ý khi gõ phím!_"
            ),
            color=0x3498DB
        )
        total_cmds = 0
        for cat_title, items in categories.items():
            total_cmds += len(items)
            cmd_list = " ".join([f"`{cmd['name']}`" for cmd in items])
            embed.add_field(
                name=f"{cat_title} ({len(items)})",
                value=cmd_list or "*(Trống)*",
                inline=False
            )
        embed.set_footer(text=f"Tổng cộng: {total_cmds} kỹ năng. Gọi: /agent hoặc !run <tên_lệnh>")
        return await ctx.send(embed=embed)

    q = filter_query.lower().strip()
    matched = []
    for cat_title, items in categories.items():
        for cmd in items:
            if (q in cmd["name"].lower() or 
                q in cmd["desc"].lower() or 
                q in cmd["plugin"].lower() or 
                q in cat_title.lower()):
                matched.append((cat_title, cmd))

    if not matched:
        return await ctx.send(f"🔍 Không tìm thấy kỹ năng nào khớp với từ khóa: `{filter_query}`.")

    embed = discord.Embed(
        title=f"🔍 Kết Quả Tìm Kiếm Kỹ Năng: `{filter_query}` ({len(matched)} lệnh)",
        description="Gọi nhanh bằng `/agent` hoặc `!run <lệnh>`:",
        color=0x2ECC71
    )

    for cat_title, cmd in matched[:12]:
        short_desc = (cmd["desc"][:140] + "...") if len(cmd["desc"]) > 140 else (cmd["desc"] or "Không có mô tả")
        embed.add_field(
            name=f"`{cmd['name']}` — {cmd['plugin'].upper()}",
            value=f"{short_desc}\n↳ Gọi: `!run {cmd['name']}`",
            inline=False
        )

    await ctx.send(embed=embed)


@bot.command(name="status")
async def check_status(ctx):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

    default_name = Path(DEFAULT_CLI).name.upper()
    claude_status = "✅ Có sẵn" if os.path.exists(CLAUDE_CLI) else "❌ Chưa cài"
    agy_status = "✅ Có sẵn" if os.path.exists(AGY_CLI) else "❌ Chưa cài"

    if CURRENT_TASK_INFO["running"]:
        elapsed = datetime.now() - CURRENT_TASK_INFO["started_at"]
        mins, secs = divmod(int(elapsed.total_seconds()), 60)
        msg = (
            f"🔄 **Agent đang bận!**\n"
            f"• Lệnh đang chạy: `{CURRENT_TASK_INFO['prompt']}`\n"
            f"• Engine: `{CURRENT_TASK_INFO.get('engine', default_name)}`\n"
            f"• Người gọi: {CURRENT_TASK_INFO['user']}\n"
            f"• Thời gian đã chạy: {mins}m {secs}s\n"
            f"• Số session Thread đang mở: {len(ACTIVE_THREADS)}"
        )
    else:
        msg = (
            f"🟢 **Agent đang sẵn sàng!**\n"
            f"• Engine mặc định: **{default_name}** (`{DEFAULT_CLI}`)\n"
            f"• Claude CLI: `{CLAUDE_CLI}` ({claude_status})\n"
            f"• Antigravity (AGY) CLI: `{AGY_CLI}` ({agy_status})\n"
            f"• Workspace: `{WORKSPACE_DIR}`\n"
            f"• Projects trên máy: `{len(project_manager.list_projects())}` projects (gõ `!projects` để xem)\n"
            f"• Số session Thread đang mở: {len(ACTIVE_THREADS)}"
        )
    await ctx.send(msg)


@bot.command(name="projects")
async def list_projects_cmd(ctx, *, filter_query: str = None):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

    if filter_query and filter_query.strip().lower() in ["reload", "refresh", "scan"]:
        project_manager.reload()
        total = len(project_manager.list_projects())
        return await ctx.send(f"🔄 **Đã quét lại hệ thống tệp!** Phát hiện `{total}` projects trên máy.")

    all_projects = project_manager.list_projects()
    if not all_projects:
        return await ctx.send("⚠️ Chưa phát hiện project nào trên máy. Bạn có thể kiểm tra cấu hình `PROJECT_SCAN_DIRS` trong `.env`.")

    if filter_query:
        q = filter_query.strip().lower()
        matched = {k: v for k, v in all_projects.items() if q in k or q in str(v).lower()}
    else:
        matched = all_projects

    if not matched:
        return await ctx.send(f"🔍 Không tìm thấy project nào khớp với từ khóa: `{filter_query}`.")

    embed = discord.Embed(
        title=f"📂 Danh Sách Project Trên Máy ({len(matched)}/{len(all_projects)})",
        description=(
            "Gõ `/agent` trên Discord và chọn ô **project** để Agent tự động scan code!\n"
            "Hoặc dùng cú pháp: `!run <kỹ_năng> -p <tên_project> [args]`\n"
            "💡 _Gõ `!projects reload` để quét lại khi vừa clone repo mới._"
        ),
        color=0x1ABC9C
    )

    items = list(matched.items())[:15]
    for name, path in items:
        embed.add_field(
            name=f"📁 `{name}`",
            value=f"↳ `{path}`",
            inline=False
        )

    if len(matched) > 15:
        embed.set_footer(text=f"Và còn {len(matched) - 15} projects khác. Gõ '!projects <từ_khóa>' để tìm kiếm.")
    else:
        embed.set_footer(text=f"Tổng cộng: {len(matched)} projects khả dụng.")

    await ctx.send(embed=embed)


async def execute_from_prefix(ctx, prompt: str, cli_path: str):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền điều khiển Agent này.")

    if not prompt or not prompt.strip():
        return await ctx.send("⚠️ Vui lòng cung cấp kỹ năng cần chạy.\nVí dụ: `!run /cr-review-code-and-quality -p dnse-trading -d review auth`")

    prompt = prompt.strip()

    # Phân tích cú pháp: skill, project (-p) và des (-d)
    skill, proj_query, des = project_manager.parse_command_args(prompt)
    if not skill:
        skill = prompt.split()[0] if prompt else ""

    resolved_proj = project_manager.resolve_project(proj_query) if proj_query else None
    if resolved_proj:
        proj_name, proj_path = resolved_proj
        full_prompt = project_manager.build_project_directive(skill, proj_name, proj_path, des)
        clean_title = f"{skill} [{proj_name}] {des}".strip()[:50]
    else:
        full_prompt = f"{skill} {des}".strip() if des else skill
        clean_title = full_prompt.replace("\n", " ")[:50]

    engine_name = Path(cli_path).name.upper()
    thread_name = f"[{engine_name}] {clean_title}..."

    try:
        thread = await ctx.message.create_thread(name=thread_name)
    except Exception:
        thread = ctx.channel

    if isinstance(thread, discord.Thread):
        ACTIVE_THREADS[thread.id] = {
            "cli": cli_path,
            "user_id": ctx.author.id,
            "prompt": full_prompt
        }

    await run_agent_turn(thread, full_prompt, cli_path, is_continue=False, author=ctx.author)


@bot.command(name="run", aliases=["agent"])
async def execute_run(ctx, *, prompt: str = None):
    """
    Lệnh duy nhất để chạy Agent từ Discord.
    Ví dụ:
      !run /qa-run-test
      !run /cr-review-code-and-quality -p dnse-trading review auth
    """
    await execute_from_prefix(ctx, prompt, DEFAULT_CLI)


def main():
    if not BOT_TOKEN:
        print("❌ LỖI: Chưa tìm thấy DISCORD_BOT_TOKEN!", flush=True)
        sys.exit(1)

    bot.run(BOT_TOKEN)


if __name__ == "__main__":
    main()
