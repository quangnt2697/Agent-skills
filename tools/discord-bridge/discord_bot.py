#!/usr/bin/env python3
"""
Discord Bot Bridge for Agent Skills Workspace — Entry Point
- Điều khiển Agent từ xa qua Discord (Prefix commands !run hoặc Slash commands /agent)
- Hỗ trợ Autocomplete gợi ý toàn bộ skill/command khi người dùng gõ
- Hội thoại đa lượt (Multi-turn) liên tục trong Thread
- Tự động lưu trữ/đóng Thread khi hoàn thành (!done / !close)

Kiến trúc:
  discord_bot.py  ← Entry point (file này): bot events, on_ready, on_message, main()
  config.py       ← Env vars, shared state, is_authorized()
  engine.py       ← run_agent_turn(), load_all_commands()
  help_builder.py ← build_help_embed(), build_help_text()
  cogs/
    agent_cog.py  ← /agent slash command, !run, !cancel
    info_cog.py   ← !help, !skills, !projects, !status
"""

import sys
import signal
import subprocess
from pathlib import Path

# Tự động cài đặt thư viện nếu user mới clone repo mà chưa chạy pip install
try:
    import discord
    from discord.ext import commands, tasks
    from dotenv import load_dotenv
except ImportError:
    print("📦 Chưa tìm thấy thư viện Discord. Đang tự động cài đặt (pip3 install)...", flush=True)
    req_path = Path(__file__).resolve().parent / "requirements.txt"
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(req_path)])
    import discord
    from discord.ext import commands, tasks
    from dotenv import load_dotenv
    print("✅ Đã cài đặt xong thư viện!", flush=True)

# Nạp .env từ root workspace
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH if ENV_PATH.exists() else None)

# Sau khi có env → import config (phụ thuộc os.getenv)
from config import (
    BOT_TOKEN, ALLOWED_USER_IDS, DEFAULT_CLI, WORKSPACE_DIR,
    ACTIVE_THREADS, project_manager, logger, is_authorized
)
import config
from engine import run_agent_turn
from help_builder import build_help_embed, build_help_text

# ================= DISCORD CLIENT =================
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


# ================= BACKGROUND TASKS =================
@tasks.loop(hours=1)
async def cleanup_stale_threads():
    """Tự động dọn Thread cũ hơn 24h để tránh memory leak"""
    import time
    now = time.time()
    stale = [tid for tid, info in ACTIVE_THREADS.items()
             if now - info.get("created_at", 0) > 86400]
    for tid in stale:
        ACTIVE_THREADS.pop(tid, None)
    if stale:
        logger.info(f"🧹 Đã dọn {len(stale)} thread cũ khỏi ACTIVE_THREADS")


# ================= BOT EVENTS =================
@bot.event
async def on_ready():
    print("=================================================", flush=True)
    print(f"🤖 Discord Agent Bridge đã online!", flush=True)
    print(f"👤 Bot: {bot.user.name} (ID: {bot.user.id})", flush=True)
    print(f"📂 Workspace: {WORKSPACE_DIR}", flush=True)
    print(f"📁 Projects Detected: {len(project_manager.list_projects())} projects", flush=True)
    print(f"⚡ CLI Executable: {DEFAULT_CLI}", flush=True)
    print(f"🔒 Allowed User IDs: {list(ALLOWED_USER_IDS) if ALLOWED_USER_IDS else 'CHƯA CẤU HÌNH (Sẽ chặn mọi lệnh)'}", flush=True)

    try:
        # Đồng bộ nhanh cho các Guild hiện tại để hiển thị gợi ý ngay lập tức trên Discord client
        for guild in bot.guilds:
            try:
                bot.tree.copy_global_to(guild=guild)
                await bot.tree.sync(guild=guild)
            except Exception as ge:
                logger.warning(f"Không thể sync guild {guild.name}: {ge}")

        synced = await bot.tree.sync()
        cmd_names = ", ".join(f"/{c.name}" for c in synced)
        print(f"✨ Đã đồng bộ {len(synced)} Slash Commands ({cmd_names}) với Discord!", flush=True)
    except Exception as e:
        print(f"⚠️ Lỗi đồng bộ Slash Commands: {e}", flush=True)
    print("=================================================", flush=True)

    if not ALLOWED_USER_IDS:
        print("⚠️ CẢNH BÁO: DISCORD_ALLOWED_USER_ID chưa được cấu hình! Bot sẽ CHẶN MỌI lệnh.", flush=True)

    if not cleanup_stale_threads.is_running():
        cleanup_stale_threads.start()


@bot.event
async def on_guild_join(guild: discord.Guild):
    """Gửi hướng dẫn tự động khi bot được thêm vào Server mới"""
    print(f"🎉 Bot vừa được thêm vào Server: {guild.name} (ID: {guild.id})", flush=True)

    me = guild.me or (guild.get_member(bot.user.id) if bot.user else None)

    def can_send(ch) -> bool:
        if not ch:
            return False
        if not me:
            return True
        perms = ch.permissions_for(me)
        return getattr(perms, "send_messages", False) and getattr(perms, "view_channel", True)

    target = guild.system_channel if can_send(guild.system_channel) else None
    if not target:
        preferred = ["general", "chung", "bot", "bots", "commands", "agent", "chat", "welcome", "main"]
        for ch in guild.text_channels:
            if ch.name.lower() in preferred and can_send(ch):
                target = ch
                break
    if not target:
        target = next((ch for ch in guild.text_channels if can_send(ch)), None)

    if not target:
        print(f"⚠️ Không tìm thấy channel nào có quyền gửi tin nhắn trong Server {guild.name}", flush=True)
        return

    bot_name = bot.user.name if bot.user else "Agent Assistant"
    header = (
        "👋 **Xin chào!** Cảm ơn bạn đã thêm Agent Assistant vào server.\n"
        "Dưới đây là cẩm nang toàn bộ các lệnh sẵn sàng để bạn điều khiển Agent từ Discord:"
    )
    try:
        await target.send(content=header, embed=build_help_embed(bot_name=bot_name))
        print(f"✅ Đã gửi hướng dẫn (embed) tới #{target.name} ({guild.name})", flush=True)
    except discord.Forbidden:
        try:
            await target.send(content=build_help_text(bot_name=bot_name))
            print(f"✅ Đã gửi hướng dẫn (text fallback) tới #{target.name} ({guild.name})", flush=True)
        except Exception as e:
            print(f"⚠️ Lỗi gửi fallback: {e}", flush=True)
    except Exception as e:
        print(f"⚠️ Lỗi gửi hướng dẫn: {e}", flush=True)


@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return

    # Multi-turn: chat trong Thread đang theo dõi session → tiếp tục phiên
    if isinstance(message.channel, discord.Thread) and message.channel.id in ACTIVE_THREADS:
        if not is_authorized(message.author.id):
            return

        content = message.content.strip()

        if content in ["!done", "!close", "!finish"]:
            ACTIVE_THREADS.pop(message.channel.id, None)
            await message.channel.send("🔒 **Phiên làm việc đã kết thúc.** Đang đóng và lưu trữ Thread này...")
            try:
                await message.channel.edit(archived=True, locked=True)
            except Exception:
                pass
            return

        if content in ["!delete", "!del"]:
            ACTIVE_THREADS.pop(message.channel.id, None)
            await message.channel.send("🗑️ Đang xóa Thread này...")
            try:
                await message.channel.delete()
            except Exception:
                pass
            return

        if not content.startswith("!"):
            session_info = ACTIVE_THREADS[message.channel.id]
            await run_agent_turn(
                channel_or_thread=message.channel,
                prompt=content,
                cli_path=session_info["cli"],
                is_continue=True,
                author=message.author
            )
            return

    await bot.process_commands(message)


# ================= ENTRY POINT =================
async def _load_cogs():
    await bot.load_extension("cogs.agent_cog")
    await bot.load_extension("cogs.info_cog")


def main():
    if not BOT_TOKEN:
        logger.error("❌ LỖI: Chưa tìm thấy DISCORD_BOT_TOKEN!")
        sys.exit(1)

    import asyncio
    asyncio.run(_load_cogs()) if False else None  # preload check

    # Graceful Shutdown
    async def graceful_shutdown():
        logger.info("🔄 Đang thực hiện graceful shutdown...")

        for tid in list(ACTIVE_THREADS.keys()):
            try:
                thread = bot.get_channel(tid)
                if thread:
                    await thread.send(
                        "⚠️ **Bot đang khởi động lại.** Phiên làm việc sẽ được tiếp tục "
                        "sau khi bot online trở lại. Vui lòng gõ lại lệnh hoặc chat trong Thread này."
                    )
            except Exception:
                pass
        ACTIVE_THREADS.clear()

        if config.CURRENT_PROCESS and config.CURRENT_PROCESS.poll() is None:
            logger.info("⛔ Đang hủy Agent CLI subprocess...")
            config.CURRENT_PROCESS.terminate()
            try:
                config.CURRENT_PROCESS.wait(timeout=5)
            except subprocess.TimeoutExpired:
                config.CURRENT_PROCESS.kill()
            config.CURRENT_PROCESS = None

        if cleanup_stale_threads.is_running():
            cleanup_stale_threads.cancel()

        logger.info("✅ Graceful shutdown hoàn tất.")
        await bot.close()

    def _handle_signal(sig, frame):
        logger.info(f"📡 Nhận tín hiệu {signal.Signals(sig).name}, bắt đầu graceful shutdown...")
        if bot.loop and bot.loop.is_running():
            bot.loop.create_task(graceful_shutdown())
        else:
            sys.exit(0)

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    async def _start():
        async with bot:
            await bot.load_extension("cogs.agent_cog")
            await bot.load_extension("cogs.info_cog")
            await bot.start(BOT_TOKEN)

    import asyncio
    asyncio.run(_start())


if __name__ == "__main__":
    main()
