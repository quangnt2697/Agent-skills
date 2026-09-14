"""
InfoCog: !help, !skills, !projects, !status — các lệnh thông tin/tra cứu.
"""

import os
from pathlib import Path

import discord
from discord.ext import commands

from config import (
    is_authorized, project_manager,
    CLAUDE_CLI, AGY_CLI, DEFAULT_CLI, WORKSPACE_DIR,
    CURRENT_TASK_INFO, ACTIVE_THREADS
)
from engine import load_all_commands
from help_builder import (
    build_help_embed, build_help_text,
    build_command_help_embed, build_command_help_text
)


class InfoCog(commands.Cog):
    """Lệnh thông tin: !help, !skills, !projects, !status"""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="help")
    async def show_help(self, ctx, *, command_name: str = None):
        """Hiển thị bảng hướng dẫn sử dụng bot tổng quan hoặc chi tiết từng lệnh"""
        bot_name = self.bot.user.name if self.bot.user else "Agent Assistant"
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

    @commands.command(name="skills", aliases=["commands"])
    async def list_skills(self, ctx, *, filter_query: str = None):
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

        if filter_query and filter_query.strip().lower() in ["reload", "refresh"]:
            import config
            config._commands_cache["data"] = None
            config._commands_cache["timestamp"] = 0
            new_cats = load_all_commands()
            total = sum(len(items) for items in new_cats.values())
            return await ctx.send(f"🔄 **Đã làm mới bộ nhớ cache kỹ năng!** Đã nạp thành công `{total}` skills từ các plugins.")

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
        matched = [
            (cat_title, cmd)
            for cat_title, items in categories.items()
            for cmd in items
            if q in cmd["name"].lower() or q in cmd["desc"].lower()
            or q in cmd["plugin"].lower() or q in cat_title.lower()
        ]

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

    @commands.command(name="status")
    async def check_status(self, ctx):
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

        from datetime import datetime
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

    @commands.command(name="projects")
    async def list_projects_cmd(self, ctx, *, filter_query: str = None):
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
        for name, path in list(matched.items())[:15]:
            embed.add_field(name=f"📁 `{name}`", value=f"↳ `{path}`", inline=False)

        if len(matched) > 15:
            embed.set_footer(text=f"Và còn {len(matched) - 15} projects khác. Gõ '!projects <từ_khóa>' để tìm kiếm.")
        else:
            embed.set_footer(text=f"Tổng cộng: {len(matched)} projects khả dụng.")

        await ctx.send(embed=embed)

    @commands.command(name="sync-slash", aliases=["sync-commands"])
    async def sync_slash(self, ctx):
        """Đồng bộ cưỡng bức toàn bộ Slash Commands với Discord"""
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền truy cập bot này.")

        status_msg = await ctx.send("⏳ Đang đồng bộ Slash Commands với Discord...")
        try:
            for guild in self.bot.guilds:
                try:
                    self.bot.tree.copy_global_to(guild=guild)
                    await self.bot.tree.sync(guild=guild)
                except Exception:
                    pass
            synced = await self.bot.tree.sync()
            cmd_names = ", ".join(f"/{c.name}" for c in synced)
            await status_msg.edit(content=f"✨ **Đã đồng bộ thành công {len(synced)} Slash Commands ({cmd_names})!** Gợi ý đã sẵn sàng trên Discord.")
        except Exception as e:
            await status_msg.edit(content=f"⚠️ Lỗi đồng bộ Slash Commands: {e}")


async def setup(bot: commands.Bot):
    await bot.add_cog(InfoCog(bot))
