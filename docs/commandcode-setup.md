# Sử dụng agent-skills với Command Code

[Command Code](https://commandcode.ai) có sẵn một hệ thống skills tự nhiên (native skills system). Lệnh `cmd skills` được tích hợp sẵn sẽ clone một GitHub repo, quét đệ quy (recursively discovers) mọi file `SKILL.md` và cài đặt những skills mà bạn chọn.

Binary của Command Code có tên là `cmd` (với bí danh là `cmdc` trên Windows và `command-code`). Các ví dụ bên dưới sẽ sử dụng `cmd`.

## Cài Đặt (Install)

**Phạm vi dự án (Project scope)** (cài đặt vào `.commandcode/skills/` tại thư mục git root hiện tại — đây là mặc định):

```bash
cmd skills add addyosmani/agent-skills
```

Trong một terminal tương tác, lệnh này sẽ hiển thị một menu đa chọn (multi-select) để bạn có thể chọn cài đặt những skill nào trong số 24 skills. Nếu chạy qua pipe hoặc môi trường không tương tác (non-interactive), nó sẽ cài đặt tất cả các skills tìm thấy.

**Cài đặt một skill cụ thể:**

```bash
cmd skills add addyosmani/agent-skills -s dev-spec-driven-development
```

**Phạm vi người dùng (User scope)** (cài đặt vào `~/.commandcode/skills/`, có sẵn để dùng trong mọi dự án):

```bash
cmd skills add addyosmani/agent-skills --global
```

**Các định dạng được hỗ trợ khác:**

```bash
cmd skills add addyosmani/agent-skills@main            # cài từ một branch cụ thể
cmd skills add addyosmani/agent-skills/skills/ba-interview-me   # cài từ một đường dẫn cụ thể trong repo
cmd skills add addyosmani/agent-skills --force         # ghi đè / cập nhật nếu đã cài đặt trước đó
```

## Quản Lý (Manage)

```bash
cmd skills list                       # liệt kê các skills đã cài (project + user + bundled)
cmd skills remove dev-spec-driven-development           # gỡ bỏ một skill ở phạm vi dự án
cmd skills remove dev-spec-driven-development --global  # gỡ bỏ một skill ở phạm vi người dùng
```

Cờ `--force` khi gọi `add` sẽ tải lại và ghi đè một skill hiện có, đây cũng là cách để bạn cập nhật (update) lên phiên bản mới nhất.

## Cách Sử Dụng (Usage)

Các skills đã cài đặt sẽ được phát hiện tự động và xuất hiện trong slash menu (menu dấu gạch chéo) của giao diện dòng lệnh (TUI), được gắn tag `[skill]`:

```
/dev-spec-driven-development   [skill] Write a spec before writing code…
```

Nhấn phím `/` để duyệt menu, hoặc bắt đầu gõ tên một skill để lọc. Sử dụng `/skills` để bật/tắt (enable/disable) các skills.

## Nơi lưu trữ skills

Command Code tìm kiếm skills từ các vị trí sau (các mục của project sẽ được giải quyết dựa trên thư mục git root gần nhất):

| Phạm vi | Đường dẫn (Path) |
|-------|------|
| Project | `.commandcode/skills/<name>/SKILL.md` |
| Project (agents-compat) | `.agents/skills/<name>/SKILL.md` |
| User | `~/.commandcode/skills/<name>/SKILL.md` |
| User (agents-compat) | `~/.agents/skills/<name>/SKILL.md` |

Lệnh `cmd skills add` sẽ ghi dữ liệu vào `.commandcode/skills/` (project) hoặc `~/.commandcode/skills/` (nếu dùng `--global`).
