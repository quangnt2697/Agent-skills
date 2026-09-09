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

# Đường dẫn các CLI Agent
CLAUDE_CLI = shutil.which("claude") or "/Users/qa-quangnt/.local/bin/claude"
AGY_CLI = shutil.which("agy") or "/Users/qa-quangnt/.local/bin/agy"

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
    print(f"⚡ CLI Executable: {DEFAULT_CLI}", flush=True)
    print(f"🔒 Allowed User IDs: {list(ALLOWED_USER_IDS) if ALLOWED_USER_IDS else 'CHƯA CẤU HÌNH (Sẽ chặn mọi lệnh)'}", flush=True)
    
    # Đồng bộ Slash Commands với Discord
    try:
        synced = await bot.tree.sync()
        print(f"✨ Đã đồng bộ {len(synced)} Slash Commands (/agent) với Discord!", flush=True)
    except Exception as e:
        print(f"⚠️ Lỗi đồng bộ Slash Commands: {e}", flush=True)
    print(f"=================================================", flush=True)


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
                f"• **Engine:** `{engine_name}` (`{cli_path}`)\n"
                f"• **Thời gian bắt đầu:** {start_time.strftime('%H:%M:%S')}\n"
                f"⏳ *Đang xử lý, bot sẽ thông báo ngay khi hoàn tất...*\n\n"
                f"💡 _Mẹo: Nếu Agent có câu hỏi làm rõ, bạn chỉ cần **chat trả lời trực tiếp trong Thread này**._\n"
                f"🔒 _Khi xong việc, gõ `!done` để đóng thread hoặc `!delete` để xóa._"
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

@bot.tree.command(name="agent", description="Kích hoạt Agent thực thi một skill hoặc câu lệnh")
@app_commands.describe(
    skill="Chọn skill bạn muốn gọi (gõ ký tự để gợi ý)",
    args="Tham số bổ sung nếu có (ví dụ: issueKey như G3PTP-17093)"
)
async def slash_agent(interaction: discord.Interaction, skill: str, args: str = ""):
    if not is_authorized(interaction.user.id):
        return await interaction.response.send_message("⛔ Bạn không có quyền điều khiển Agent này.", ephemeral=True)

    full_prompt = f"{skill} {args}".strip()
    await interaction.response.send_message(f"🎯 Đang khởi tạo session cho: `{full_prompt}`...")

    # Tạo thread từ message phản hồi
    msg = await interaction.original_response()
    clean_title = full_prompt.replace("\n", " ")[:50]
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


# ================= CÁC LỆNH TEXT PREFIX TRUYỀN THỐNG =================

@bot.command(name="help", aliases=["help_agent"])
async def show_help(ctx):
    help_text = (
        "🛠️ **CÁC LỆNH ĐIỀU KHIỂN AGENT:**\n\n"
        "• `/agent`: **Gõ `/agent` trên Discord** để hiện bảng gợi ý (Autocomplete) toàn bộ danh sách skill!\n"
        "• `!skills` hoặc `!commands`: Xem danh sách tất cả skill theo vai trò.\n"
        "• `!skills <từ khóa>`: Tìm kiếm skill (VD: `!skills qa`, `!skills dev`, `!skills standup`).\n"
        "• `!agent <lệnh>` hoặc `!run <lệnh>`: Chạy bằng Engine mặc định (AGY).\n"
        "• `!claude <lệnh>`: Ép chạy bằng **Claude Code CLI**.\n"
        "• `!agy <lệnh>`: Ép chạy bằng **Google Antigravity CLI**.\n\n"
        "💬 **Hội thoại đa lượt trong Thread:**\n"
        "• Khi Agent hỏi làm rõ, bạn chỉ cần **chat trả lời trực tiếp trong Thread**.\n"
        "• Khi hoàn thành, gõ `!done` để lưu trữ thread hoặc `!delete` để xóa thread.\n\n"
        "• `!status`: Kiểm tra trạng thái Agent và Engine đang dùng.\n"
        "• `!help`: Xem hướng dẫn này."
    )
    await ctx.send(help_text)


@bot.command(name="skills", aliases=["commands", "list"])
async def list_skills(ctx, *, filter_query: str = None):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

    categories = load_all_commands()

    if not filter_query:
        embed = discord.Embed(
            title="📋 Danh Sách Commands & Skills Của Agent",
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
        embed.set_footer(text=f"Tổng cộng: {total_cmds} lệnh. Gọi: /agent hoặc !agent <tên_lệnh>")
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
        return await ctx.send(f"🔍 Không tìm thấy skill hoặc command nào khớp với từ khóa: `{filter_query}`.")

    embed = discord.Embed(
        title=f"🔍 Kết Quả Tìm Kiếm: `{filter_query}` ({len(matched)} lệnh)",
        description="Copy lệnh và gọi qua `/agent` hoặc `!agent <lệnh>`:",
        color=0x2ECC71
    )

    for cat_title, cmd in matched[:12]:
        short_desc = (cmd["desc"][:140] + "...") if len(cmd["desc"]) > 140 else (cmd["desc"] or "Không có mô tả")
        embed.add_field(
            name=f"`{cmd['name']}` — {cmd['plugin'].upper()}",
            value=f"{short_desc}\n↳ Gọi: `!agent {cmd['name']}`",
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
            f"• Số session Thread đang mở: {len(ACTIVE_THREADS)}"
        )
    await ctx.send(msg)


async def execute_from_prefix(ctx, prompt: str, cli_path: str):
    if not is_authorized(ctx.author.id):
        return await ctx.send("⛔ Bạn không có quyền điều khiển Agent này.")

    if not prompt or not prompt.strip():
        return await ctx.send("⚠️ Vui lòng cung cấp lệnh cần chạy. Ví dụ: `!agent /qa-run-test` hoặc `!agent /sm-daily-standup`")

    prompt = prompt.strip()
    clean_title = prompt.replace("\n", " ")[:50]
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
            "prompt": prompt
        }

    await run_agent_turn(thread, prompt, cli_path, is_continue=False, author=ctx.author)


@bot.command(name="agent", aliases=["run"])
async def execute_agent(ctx, *, prompt: str = None):
    await execute_from_prefix(ctx, prompt, DEFAULT_CLI)


@bot.command(name="claude")
async def execute_claude(ctx, *, prompt: str = None):
    await execute_from_prefix(ctx, prompt, CLAUDE_CLI)


@bot.command(name="agy")
async def execute_agy(ctx, *, prompt: str = None):
    await execute_from_prefix(ctx, prompt, AGY_CLI)


def main():
    if not BOT_TOKEN:
        print("❌ LỖI: Chưa tìm thấy DISCORD_BOT_TOKEN!", flush=True)
        sys.exit(1)

    bot.run(BOT_TOKEN)


if __name__ == "__main__":
    main()
