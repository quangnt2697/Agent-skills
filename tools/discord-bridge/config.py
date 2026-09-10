"""
Cấu hình chung cho Discord Bot Bridge.
Tập trung toàn bộ biến môi trường, hằng số, shared state vào 1 nơi.
"""

import os
import sys
import shutil
import asyncio
import logging
import time
from pathlib import Path

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("discord-bridge")

# ================= ĐƯỜNG DẪN GỐC =================
ROOT_DIR = Path(__file__).resolve().parents[2]

# ================= BIẾN MÔI TRƯỜNG =================
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
ALLOWED_USER_IDS_RAW = os.getenv("DISCORD_ALLOWED_USER_ID", "")
WORKSPACE_DIR = os.getenv("AGENT_WORKSPACE_DIR", str(ROOT_DIR))

# Parse danh sách User ID được phép
ALLOWED_USER_IDS = set()
for uid in ALLOWED_USER_IDS_RAW.replace(";", ",").split(","):
    cleaned = uid.strip()
    if cleaned.isdigit():
        ALLOWED_USER_IDS.add(int(cleaned))

# ================= CLI AGENT =================
CLAUDE_CLI = shutil.which("claude") or str(Path.home() / ".local/bin/claude")
AGY_CLI = shutil.which("agy") or str(Path.home() / ".local/bin/agy")

DEFAULT_CLI = os.getenv("AGENT_CLI_PATH")
if not DEFAULT_CLI:
    DEFAULT_CLI = AGY_CLI if os.path.exists(AGY_CLI) else CLAUDE_CLI

# ================= PROJECT MANAGER =================
sys.path.insert(0, str(Path(__file__).resolve().parent))
from project_manager import ProjectManager
project_manager = ProjectManager(workspace_root=ROOT_DIR)

# ================= SHARED STATE =================
TASK_LOCK = asyncio.Lock()
CURRENT_TASK_INFO = {"running": False, "prompt": None, "started_at": None, "user": None, "engine": None}
ACTIVE_THREADS = {}

# Cache cho commands autocomplete
_commands_cache = {"data": None, "timestamp": 0}
COMMANDS_CACHE_TTL = 300  # 5 phút

# Process đang chạy — cho phép cancel từ lệnh !cancel
CURRENT_PROCESS = None


# ================= UTILITY =================
def is_authorized(user_id: int) -> bool:
    if not ALLOWED_USER_IDS:
        return False
    return user_id in ALLOWED_USER_IDS
