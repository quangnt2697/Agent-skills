# ARCHITECTURE.md — Discord Bot Bridge

Tài liệu kỹ thuật mô tả kiến trúc, luồng xử lý và quy tắc đóng góp cho module `tools/discord-bridge`.

---

## Tổng Quan

Bot được refactor từ god file đơn (1091 LOC) thành **6 module** theo nguyên tắc Single Responsibility, sử dụng chuẩn **discord.py Cog** để tổ chức commands.

```
tools/discord-bridge/
├── discord_bot.py      ~180 LOC  Entry point
├── config.py            ~65 LOC  Cấu hình & shared state
├── engine.py           ~140 LOC  Business logic (subprocess, I/O)
├── help_builder.py     ~220 LOC  Pure functions tạo Embed/Text
├── project_manager.py  ~300 LOC  Project auto-discovery & resolve
└── cogs/
    ├── agent_cog.py    ~130 LOC  /agent slash + !run + !cancel
    └── info_cog.py     ~130 LOC  !help + !skills + !projects + !status
```

---

## Sơ Đồ Phụ Thuộc Module

```
discord_bot.py
  ├── config.py           (env, state)
  ├── engine.py           (run_agent_turn)
  │     └── config.py
  ├── help_builder.py     (pure — không phụ thuộc gì khác ngoài discord)
  └── cogs/
        ├── agent_cog.py
        │     ├── config.py
        │     └── engine.py
        └── info_cog.py
              ├── config.py
              ├── engine.py  (load_all_commands)
              └── help_builder.py
```

> **Quy tắc vàng:** `help_builder.py` là **pure module** — không được import `config` hay `engine`. Chỉ phụ thuộc vào `discord`.

---

## Mô Tả Chi Tiết Từng Module

### `discord_bot.py` — Entry Point
**Trách nhiệm:** Khởi tạo bot, đăng ký Cogs, xử lý lifecycle events.

| Thành phần | Mô tả |
|:-----------|:------|
| `on_ready()` | In thông tin startup, sync slash commands, khởi động `cleanup_stale_threads` |
| `on_guild_join()` | Gửi bảng hướng dẫn tự động khi bot vào server mới |
| `on_message()` | Multi-turn routing: chat trong Thread → `run_agent_turn()` hoặc `process_commands()` |
| `cleanup_stale_threads` | `@tasks.loop(hours=1)` — dọn ACTIVE_THREADS cũ hơn 24h |
| `main()` | Load Cogs, đăng ký SIGINT/SIGTERM handler, `asyncio.run(_start())` |
| `graceful_shutdown()` | Thông báo Thread, kill subprocess, cancel task, `bot.close()` |

---

### `config.py` — Cấu Hình & Shared State
**Trách nhiệm:** Single source of truth cho toàn bộ biến môi trường và shared mutable state.

| Biến | Kiểu | Mô tả |
|:-----|:-----|:------|
| `BOT_TOKEN` | `str` | Discord Bot Token từ `.env` |
| `ALLOWED_USER_IDS` | `set[int]` | User IDs được phép ra lệnh |
| `DEFAULT_CLI` | `str` | Đường dẫn CLI Agent (agy hoặc claude) |
| `WORKSPACE_DIR` | `str` | Root workspace để chạy CLI |
| `ACTIVE_THREADS` | `dict` | `{thread_id: {cli, user_id, prompt, created_at}}` |
| `TASK_LOCK` | `asyncio.Lock` | Tuần tự hóa: chỉ 1 Agent chạy tại 1 thời điểm |
| `CURRENT_TASK_INFO` | `dict` | Metadata tác vụ đang chạy (cho `!status`) |
| `CURRENT_PROCESS` | `subprocess.Popen \| None` | Process đang chạy (cho `!cancel`) |
| `project_manager` | `ProjectManager` | Singleton quản lý dự án |
| `is_authorized()` | `fn` | Kiểm tra quyền user |

> ⚠️ **Lưu ý:** `CURRENT_PROCESS` là biến module-level được mutate qua `config.CURRENT_PROCESS`. Các module khác phải import `config` (không import trực tiếp `CURRENT_PROCESS`) để đảm bảo tham chiếu luôn tươi.

---

### `engine.py` — Business Logic
**Trách nhiệm:** Tất cả I/O nặng — chạy subprocess, gửi file lên Discord.

| Hàm | Mô tả |
|:----|:------|
| `load_all_commands()` | Đọc `plugins/*/commands/*.toml`, trả về `dict[cat → list[cmd]]` |
| `load_all_commands_cached()` | Wrapper TTL=5 phút, dùng cho autocomplete |
| `run_agent_turn()` | Async: quản lý TASK_LOCK, chạy CLI trong executor, gửi kết quả |

**Luồng `run_agent_turn()`:**
```
Kiểm tra TASK_LOCK → Gửi thông báo xếp hàng (nếu đang bận)
  → Acquire TASK_LOCK
  → Gửi thông báo "Đã kích hoạt Agent"
  → run_in_executor(run_cli_subprocess)  ← chạy trên thread riêng, non-blocking
       └─ Popen → communicate(timeout=1800) → catch TimeoutExpired → finally clear CURRENT_PROCESS
  → Gửi output (inline nếu ≤1800 ký tự, upload file nếu dài hơn)
  → Release TASK_LOCK
```

---

### `help_builder.py` — Pure Functions
**Trách nhiệm:** Tạo `discord.Embed` và text markdown cho các lệnh help.

| Hàm | Mô tả |
|:----|:------|
| `build_help_embed()` | Embed tổng quan: slash + prefix + thread + phân quyền |
| `build_help_text()` | Fallback text nếu kênh không cho phép Embed Links |
| `build_command_help_embed(cmd)` | Embed chi tiết cho `run`, `cancel`, `skills`, `projects`, `status`, `done` |
| `build_command_help_text(cmd)` | Text fallback tương ứng |

> **Pure functions** — không có side effects, không đọc env, không mutate state. Dễ unit test độc lập.

---

### `cogs/agent_cog.py` — AgentCog
**Trách nhiệm:** Xử lý tất cả lệnh liên quan đến việc chạy Agent.

| Command | Type | Mô tả |
|:--------|:-----|:------|
| `/agent` | Slash | Gọi Agent với skill + project + des, tạo Thread, chạy `run_agent_turn()` |
| `skill_autocomplete` | Autocomplete | Gợi ý từ `load_all_commands_cached()` |
| `project_autocomplete` | Autocomplete | Gợi ý từ `project_manager.search_projects()` |
| `!run` | Prefix | Alias của slash agent, hỗ trợ `-p`, `-d`. Cooldown 30s/user |
| `!cancel` | Prefix | Terminate `config.CURRENT_PROCESS` nếu đang chạy |
| `on_command_error` | Listener | Bắt `CommandOnCooldown`, re-raise lỗi khác |

---

### `cogs/info_cog.py` — InfoCog
**Trách nhiệm:** Các lệnh thông tin, tra cứu — không chạy Agent.

| Command | Mô tả |
|:--------|:------|
| `!help [lệnh]` | Tổng quan hoặc chi tiết lệnh cụ thể (embed + fallback text) |
| `!skills [từ_khóa]` | Liệt kê hoặc tìm kiếm skills theo category/plugin/name/desc |
| `!projects [reload]` | Liệt kê, tìm kiếm hoặc quét lại thư mục dự án |
| `!status` | Runtime info: CLI path, tác vụ đang chạy, số thread mở, thời gian đã chạy |

---

## Luồng Xử Lý Multi-turn Session

```
User gõ !run /qa-full-pipeline -p my-project
  → AgentCog._execute_from_prefix()
    → parse_command_args() → resolve_project()
    → tạo Discord Thread → ghi vào ACTIVE_THREADS[thread.id]
    → run_agent_turn(is_continue=False)

User chat trả lời trong Thread (không bắt đầu bằng !)
  → on_message() trong discord_bot.py
    → kiểm tra thread.id in ACTIVE_THREADS
    → run_agent_turn(is_continue=True)  ← truyền -c flag cho CLI

User gõ !done
  → on_message() → ACTIVE_THREADS.pop() → thread.edit(archived=True)
```

---

## Graceful Shutdown Sequence

```
SIGTERM/SIGINT → _handle_signal()
  → bot.loop.create_task(graceful_shutdown())
    1. Thông báo tất cả Thread trong ACTIVE_THREADS
    2. ACTIVE_THREADS.clear()
    3. CURRENT_PROCESS.terminate() → wait(5s) → kill nếu cần
    4. cleanup_stale_threads.cancel()
    5. bot.close()
```

---

## Quy Tắc Đóng Góp (Contributing)

1. **Thêm lệnh mới**: Tạo trong Cog tương ứng (`agent_cog.py` nếu chạy Agent, `info_cog.py` nếu chỉ tra cứu). Không thêm vào `discord_bot.py`.
2. **Thêm help text**: Thêm vào `help_builder.py` dưới dạng pure function. Không inline vào Cog.
3. **Thay đổi shared state**: Khai báo trong `config.py`. Không tạo global mới rải rác trong các module.
4. **Thay đổi subprocess logic**: Chỉ sửa trong `engine.py`. Các Cog chỉ gọi `run_agent_turn()`.
5. **Kiểm tra syntax trước khi commit**:
   ```bash
   python3 -m py_compile tools/discord-bridge/*.py tools/discord-bridge/cogs/*.py
   ```
