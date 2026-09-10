"""
Engine module: load_all_commands và run_agent_turn.
Tách riêng phần I/O nặng (subprocess, file upload) khỏi Discord event handlers.
"""

import asyncio
import subprocess
import tempfile
import time
import tomllib
from datetime import datetime
from pathlib import Path

import discord

from config import (
    WORKSPACE_DIR, ROOT_DIR, CURRENT_TASK_INFO, TASK_LOCK,
    _commands_cache, COMMANDS_CACHE_TTL, logger
)
import config  # để mutate CURRENT_PROCESS


def load_all_commands() -> dict:
    """Đọc toàn bộ TOML commands từ plugins/ và trả về dict theo category"""
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


def load_all_commands_cached() -> dict:
    """Phiên bản có cache TTL=5 phút, dùng cho Autocomplete (tránh I/O mỗi keystroke)"""
    now = time.time()
    if _commands_cache["data"] and (now - _commands_cache["timestamp"]) < COMMANDS_CACHE_TTL:
        return _commands_cache["data"]
    result = load_all_commands()
    _commands_cache["data"] = result
    _commands_cache["timestamp"] = now
    return result


async def run_agent_turn(
    channel_or_thread,
    prompt: str,
    cli_path: str,
    is_continue: bool = False,
    author=None
):
    """
    Thực thi 1 lượt chạy Agent (lượt đầu hoặc tiếp tục multi-turn session).
    - Quản lý TASK_LOCK để tuần tự hóa tác vụ
    - Chạy CLI trong executor thread (non-blocking)
    - Gửi kết quả về Thread, upload file nếu output > 1800 ký tự
    """
    engine_name = Path(cli_path).name.upper()

    # Chuẩn hóa tiền tố / nếu người dùng gõ thiếu
    if not is_continue:
        first_word = prompt.split()[0]
        if not first_word.startswith("/"):
            clean_first = first_word.lstrip("/")
            matching_toml = list((ROOT_DIR / "plugins").glob(f"*/commands/{clean_first}.toml"))
            if matching_toml:
                prompt = "/" + prompt

    # Thông báo xếp hàng nếu đang bận
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
        CURRENT_TASK_INFO.update({
            "running": True,
            "prompt": prompt,
            "engine": engine_name,
            "started_at": datetime.now(),
            "user": user_label,
        })
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
            cmd = [cli_path]
            if is_continue:
                cmd.append("-c")
            cmd.extend(["-p", prompt, "--dangerously-skip-permissions"])

            config.CURRENT_PROCESS = subprocess.Popen(
                cmd,
                cwd=WORKSPACE_DIR,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            try:
                stdout, stderr = config.CURRENT_PROCESS.communicate(timeout=1800)  # 30 phút
                return config.CURRENT_PROCESS.returncode, stdout, stderr
            except subprocess.TimeoutExpired:
                config.CURRENT_PROCESS.kill()
                stdout, stderr = config.CURRENT_PROCESS.communicate()
                return -2, stdout, "⏰ Agent CLI đã vượt quá thời gian giới hạn (30 phút) và bị hủy tự động."
            finally:
                config.CURRENT_PROCESS = None

        loop = asyncio.get_running_loop()
        try:
            async with channel_or_thread.typing():
                returncode, stdout, stderr = await loop.run_in_executor(None, run_cli_subprocess)
        except Exception as e:
            returncode, stdout, stderr = -1, "", str(e)
        finally:
            CURRENT_TASK_INFO.update({
                "running": False, "prompt": None,
                "engine": None, "started_at": None, "user": None
            })

        end_time = datetime.now()
        mins, secs = divmod(int((end_time - start_time).total_seconds()), 60)
        time_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"

        if returncode == 0:
            status_prefix = "💬" if is_continue else "✅"
            header_status = f"{status_prefix} **[{engine_name}] Phản hồi của Agent** (`{time_str}`):"
            output_content = stdout if stdout.strip() else "*(Không có text output từ CLI)*"
        else:
            header_status = f"❌ **[{engine_name}] Agent kết thúc với lỗi (Exit Code {returncode})** (`{time_str}`):"
            output_content = f"Lỗi (stderr):\n{stderr}\n\nOutput (stdout):\n{stdout}"

        if len(output_content) <= 1800:
            await channel_or_thread.send(f"{header_status}\n```text\n{output_content}\n```")
        else:
            log_filename = f"agent_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            tmp_fd = tempfile.NamedTemporaryFile(
                mode='w', suffix='.txt', prefix='agent_output_',
                delete=False, encoding='utf-8'
            )
            try:
                tmp_fd.write(output_content)
                tmp_fd.close()
                await channel_or_thread.send(
                    content=f"{header_status}\n📄 Kết quả dài hơn 2000 ký tự, xem chi tiết trong file log đính kèm:",
                    file=discord.File(tmp_fd.name, filename=log_filename)
                )
            finally:
                Path(tmp_fd.name).unlink(missing_ok=True)
