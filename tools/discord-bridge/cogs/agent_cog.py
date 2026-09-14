"""
AgentCog: Slash Command /agent, Prefix !run, !cancel và autocomplete.
Tách riêng khỏi god file để dễ test và bảo trì độc lập.
"""

import time
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands

from config import (
    DEFAULT_CLI, ACTIVE_THREADS, is_authorized, project_manager, CURRENT_PROCESS
)
import config
from engine import run_agent_turn, load_all_commands_cached


class AgentCog(commands.Cog):
    """Xử lý /agent slash command, !run, !cancel, và autocomplete"""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ── SLASH COMMAND ──────────────────────────────────────────────────────────

    @app_commands.command(name="agent", description="Kích hoạt Agent thực thi một skill với Project trên máy")
    @app_commands.describe(
        skill="Chọn skill bạn muốn gọi (gõ ký tự để gợi ý)",
        project="Tên Project trên máy để Agent tự động scan code (gõ để gợi ý)",
        des="Mô tả nhiệm vụ, phạm vi scan code hoặc tham số (VD: review auth, G3PTP-17093)"
    )
    async def slash_agent(self, interaction: discord.Interaction, skill: str, project: str = "", des: str = ""):
        if not is_authorized(interaction.user.id):
            return await interaction.response.send_message("⛔ Bạn không có quyền điều khiển Agent này.", ephemeral=True)

        resolved_proj = project_manager.resolve_project(project) if project and project.strip() else None
        if resolved_proj:
            proj_name, proj_path = resolved_proj
            full_prompt = project_manager.build_project_directive(skill, proj_name, proj_path, des)
            title_summary = f"{skill} [{proj_name}] {des}".strip()
        else:
            full_prompt = f"{skill} {des}".strip()
            title_summary = full_prompt

        await interaction.response.send_message(f"🎯 Đang khởi tạo session cho: `{title_summary}`...")

        msg = await interaction.original_response()
        clean_title = title_summary.replace("\n", " ")[:50]
        engine_name = Path(DEFAULT_CLI).name.upper()
        thread_name = f"[{engine_name}] {clean_title}..."

        try:
            thread = await msg.create_thread(name=thread_name)
        except Exception:
            thread = interaction.channel

        if isinstance(thread, discord.Thread):
            ACTIVE_THREADS[thread.id] = {
                "cli": DEFAULT_CLI,
                "user_id": interaction.user.id,
                "prompt": full_prompt,
                "created_at": time.time()
            }

        await run_agent_turn(thread, full_prompt, DEFAULT_CLI, is_continue=False, author=interaction.user)

    @slash_agent.autocomplete("skill")
    async def skill_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        all_cmds = []
        for items in load_all_commands_cached().values():
            all_cmds.extend(items)

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
    async def project_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        choices = []
        for label, proj_name, _path_str in project_manager.search_projects(current, limit=25):
            choices.append(app_commands.Choice(name=label, value=proj_name))
        return choices

    # ── PREFIX COMMANDS ────────────────────────────────────────────────────────

    @commands.cooldown(1, 30, commands.BucketType.user)
    @commands.command(name="run", aliases=["agent"])
    async def execute_run(self, ctx, *, prompt: str = None):
        """Kích hoạt Agent thực thi skill. Ví dụ: !run /cr-review-code-and-quality -p my-project"""
        await self._execute_from_prefix(ctx, prompt, DEFAULT_CLI)

    @commands.command(name="cancel", aliases=["abort", "stop"])
    async def cancel_task(self, ctx):
        """Hủy tác vụ Agent đang chạy"""
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền điều khiển Agent này.")

        if config.CURRENT_PROCESS and config.CURRENT_PROCESS.poll() is None:
            config.CURRENT_PROCESS.terminate()
            await ctx.send("⛔ **Đã gửi tín hiệu hủy tác vụ đang chạy!** Đang chờ Agent dừng...")
        else:
            await ctx.send("ℹ️ Hiện tại không có tác vụ nào đang chạy.")

    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        """Xử lý lỗi cooldown và các lỗi command khác"""
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(f"⏳ Vui lòng chờ {error.retry_after:.0f}s trước khi gọi lại lệnh này.")
            return
        raise error

    # ── INTERNAL HELPER ────────────────────────────────────────────────────────

    async def _execute_from_prefix(self, ctx, prompt: str, cli_path: str):
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền điều khiển Agent này.")

        if not prompt or not prompt.strip():
            return await ctx.send("⚠️ Vui lòng cung cấp kỹ năng cần chạy.\nVí dụ: `!run /cr-review-code-and-quality -p order-service -d review auth`")

        prompt = prompt.strip()
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
                "prompt": full_prompt,
                "created_at": time.time()
            }

        await run_agent_turn(thread, full_prompt, cli_path, is_continue=False, author=ctx.author)


    # ── DIRECT SYNC COMMANDS (CHỈ TẬP TRUNG PULL CODE, KHÔNG QUA LLM) ─────────

    async def _execute_direct_sync(self, prompt_args: str) -> str:
        """Thực thi trực tiếp node scripts/repo-sync.js mà không cần tạo Thread hay gọi LLM"""
        import asyncio
        import shlex

        cmd = ["node", "scripts/repo-sync.js"]
        if prompt_args and prompt_args.strip():
            try:
                cmd.extend(shlex.split(prompt_args.strip()))
            except Exception:
                cmd.extend(prompt_args.strip().split())

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(config.WORKSPACE_DIR),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            out = stdout.decode("utf-8", errors="replace").strip()
            err = stderr.decode("utf-8", errors="replace").strip()
            if proc.returncode != 0:
                return f"❌ **Lỗi thực thi repo-sync (mã {proc.returncode}):**\n```\n{err or out}\n```"
            return out or err or "ℹ️ Hoàn tất đồng bộ (không có output)."
        except Exception as e:
            return f"❌ **Không thể khởi chạy scripts/repo-sync.js:** {e}"

    @commands.cooldown(1, 5, commands.BucketType.user)
    @commands.command(name="sync", aliases=["reposync", "pull"])
    async def execute_sync(self, ctx, *, prompt: str = ""):
        """Kéo code mới nhất trực tiếp về máy local (phản hồi tức thì trong kênh chat, không qua LLM)"""
        if not is_authorized(ctx.author.id):
            return await ctx.send("⛔ Bạn không có quyền điều khiển Agent này.")

        status_msg = await ctx.send("⏳ Đang kéo code mới nhất về máy...")
        output = await self._execute_direct_sync(prompt)

        if len(output) <= 1950:
            await status_msg.edit(content=output)
        else:
            import io
            file = discord.File(io.BytesIO(output.encode("utf-8")), filename="repo-sync-report.md")
            summary = output[:1800] + "\n\n*(Báo cáo chi tiết xem tệp đính kèm)*"
            await status_msg.edit(content=summary, attachments=[file])

    @app_commands.command(name="sync", description="Kéo code mới nhất trực tiếp về máy local (phản hồi tức thì, không qua LLM)")
    @app_commands.describe(
        project="Tên Project trên máy (gõ để gợi ý)",
        branch="Nhánh cần pull (tùy chọn)",
        des="Cờ bổ sung như --stash, --dry-run"
    )
    async def slash_sync(self, interaction: discord.Interaction, project: str = "", branch: str = "", des: str = ""):
        if not is_authorized(interaction.user.id):
            return await interaction.response.send_message("⛔ Bạn không có quyền điều khiển Agent này.", ephemeral=True)

        await interaction.response.defer(thinking=True)
        flags = []
        if project and project.strip():
            flags.append(f"-p {project.strip()}")
        if branch and branch.strip():
            flags.append(f"-b {branch.strip()}")
        if des and des.strip():
            flags.append(des.strip())
        prompt_str = " ".join(flags)

        output = await self._execute_direct_sync(prompt_str)
        if len(output) <= 1950:
            await interaction.followup.send(output)
        else:
            import io
            file = discord.File(io.BytesIO(output.encode("utf-8")), filename="repo-sync-report.md")
            summary = output[:1800] + "\n\n*(Báo cáo chi tiết xem tệp đính kèm)*"
            await interaction.followup.send(summary, file=file)

    @slash_sync.autocomplete("project")
    async def sync_project_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        return await self.project_autocomplete(interaction, current)


async def setup(bot: commands.Bot):
    await bot.add_cog(AgentCog(bot))

