# Antigravity Hooks — Hướng dẫn và Tương thích

Thư mục `hooks/antigravity/` chứa các hook tương thích với Antigravity/Gemini, song song với hooks Claude ở `hooks/`.

## Tổng quan

| Hook | Claude | Antigravity | Trạng thái |
|------|--------|-------------|-----------|
| **session-start** | `hooks/session-start.sh` | `hooks/antigravity/session-start.sh` | ✅ Fully ported |
| **sdd-cache-pre** | `hooks/sdd-cache-pre.sh` | `hooks/antigravity/sdd-cache-pre.sh` | ✅ Ported (adapted) |
| **sdd-cache-post** | `hooks/sdd-cache-post.sh` | `hooks/antigravity/sdd-cache-post.sh` | ✅ Ported (adapted) |
| **simplify-ignore** | `hooks/simplify-ignore.sh` | — | ⛔ Không port (xem lý do) |

## Cấu hình

Hooks config nằm tại `.agents/hooks.json` — Antigravity tự phát hiện file này khi khởi động.

## Khác biệt giữa Claude và Antigravity

### 1. Format `hooks.json`

| Aspect | Claude | Antigravity |
|--------|--------|-------------|
| **Cấu trúc** | `"hooks": { "SessionStart": [...] }` | Named hooks: `"session-start": { "PreInvocation": [...] }` |
| **Event types** | `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop` | `PreInvocation`, `PostInvocation`, `PreToolUse`, `PostToolUse`, `Stop` |
| **Matcher** | Không dùng | `"matcher": "read_url_content"` (regex) |
| **CWD** | `$CLAUDE_PROJECT_DIR` | Thư mục chứa `hooks.json` |

### 2. Input/Output contract

| Aspect | Claude | Antigravity |
|--------|--------|-------------|
| **Tool input** | `tool_input.url` | `toolCall.args.Url` |
| **Tool response** | `tool_response.result` | Không có trong PostToolUse input |
| **Block fetch** | Exit code 2, content trên stderr | `{"decision": "deny", "reason": "..."}` |
| **Inject context** | `hookSpecificOutput.additionalContext` | `{"injectSteps": [{"ephemeralMessage": "..."}]}` |

### 3. Tool name mapping

| Claude Tool | Antigravity Tool |
|-------------|-----------------|
| `WebFetch` | `read_url_content` |
| `Read` | `view_file` |
| `Edit` | `replace_file_content`, `multi_replace_file_content` |
| `Write` | `write_to_file` |

## Tại sao không port simplify-ignore

`simplify-ignore.sh` phụ thuộc sâu vào đặc thù Claude Code:

1. **File manipulation in-place**: Claude's `Read` hook cho phép thay đổi nội dung file trước khi agent đọc. Antigravity `view_file` PreToolUse chỉ có thể `allow`/`deny`/`ask`, không thể thay đổi nội dung trả về.
2. **Block/restore pattern**: Cần `PreToolUse Read` sửa file → `PostToolUse Edit` mở rộng placeholder → `Stop` khôi phục — pattern này yêu cầu hook sửa file on-disk, có thể gây lỗi với Antigravity vì nó đọc file theo cách riêng.
3. **`overwrite` field**: Antigravity PreToolUse có `overwrite` nhưng chỉ shallow merge args, không thể thay thế nội dung file.

**Giải pháp thay thế**: Dùng `.gitignore` hoặc `.agentignore` để exclude files không muốn agent thấy. Hoặc sử dụng `simplify-ignore` markers trực tiếp trong SKILL.md instructions.

## Cache location

| Platform | Cache dir |
|----------|-----------|
| Claude | `.claude/sdd-cache/` |
| Antigravity | `.agents/sdd-cache/` |

Hai cache độc lập — không chia sẻ dữ liệu. Thêm `.agents/sdd-cache/` vào `.gitignore`.

## Debug

```bash
# Bật debug logging cho Antigravity hooks
SDD_CACHE_DEBUG=1 agy

# Hoặc sentinel file
mkdir -p .agents/sdd-cache && touch .agents/sdd-cache/.debug

# Xem log
cat .agents/sdd-cache/.debug.log
```

## Yêu cầu

- `jq`, `curl`, `shasum` hoặc `sha256sum`, Bash 3.2+
