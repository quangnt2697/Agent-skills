---
name: repo-group-sync
description: Đồng bộ, fetch và pull mã nguồn mới nhất của các dự án hoặc microservices trong group về máy cục bộ. Hỗ trợ tra cứu theo alias projects.json, cờ chuẩn discord-bridge (-p, --project, project:), an toàn working tree (--ff-only, auto-stash). Sử dụng khi cần cập nhật code trước khi phân tích spec, viết test, review code hoặc chạy pipeline e2e-delivery.
---

# Kỹ Năng: Đồng Bộ Mã Nguồn Dự Án (repo-group-sync)

## Tổng quan

Trong kiến trúc microservices và đa kho lưu trữ (multi-repo), mã nguồn thường xuyên được các đội ngũ cập nhật liên tục trên GitLab. Khi AI Agent hoặc kỹ sư làm việc trên môi trường cục bộ (Local Workspace):
1. Mã nguồn cũ (stale code) sẽ làm sai lệch kết quả phân tích đặc tả (`qa-code2spec`, `dev-spec-driven-development`).
2. Giao thức API, Data Contracts, Event schemas không khớp dẫn đến kiểm thử tự động thất bại giả (false failures).
3. Thao tác kéo mã thủ công cho từng thư mục rất mất thời gian và dễ bỏ sót các dịch vụ phụ thuộc.

Kỹ năng `repo-group-sync` tự động hóa việc rà soát, kiểm tra trạng thái an toàn của working tree và kéo mã nguồn mới nhất (`git fetch && git pull --ff-only`) cho từng repository đơn lẻ hoặc toàn bộ cụm dịch vụ trong một thư mục/nhóm dự án. Kỹ năng hỗ trợ định danh qua alias cấu hình trong `tools/discord-bridge/projects.json`, tương thích hoàn toàn với hệ thống cờ của Discord Bridge và có thể kích hoạt trực tiếp từ terminal, Agent chat hoặc Discord.

## Khi nào sử dụng

- Trước khi bắt đầu phân tích mã nguồn để dịch ngược đặc tả (`/qa-code2spec`).
- Trước khi thiết kế kỹ thuật (`/tech-spec`) hoặc thực hiện kiểm thử toàn trình (`/e2e-delivery`).
- Khi tiếp nhận một tính năng mới cần đảm bảo các microservices phụ thuộc đều ở commit mới nhất.
- Khi người dùng yêu cầu "pull code mới", "sync repo", "cập nhật code dự án", "fetch code mới nhất về local".
- Khi điều phối Agent từ xa qua Discord thông qua lệnh `/sync` hoặc `!sync -p <project>`.

**Khi KHÔNG sử dụng:**
- Khi bạn đang trong quá trình commit hoặc rebase dở dang trên repository và chưa muốn đồng bộ từ xa.
- Khi mục tiêu là push mã nguồn lên remote (kỹ năng này chỉ thực hiện kéo về: fetch/pull an toàn, không push).
- Khi repository không có upstream tracking branch và chưa được cấu hình remote origin.

## Quy trình Thực hiện (5 Bước)

```
[NHẬN DIỆN THAM SỐ & TARGET]
            │
            ▼
[BƯỚC 1: TRA CỨU ALIAS & ĐỊNH VỊ REPO]
  ├── Alias đơn: /path/to/services/order-service
  └── Alias cụm: /path/to/services (chứa nhiều repos con)
            │
            ▼
[BƯỚC 2: PRE-FLIGHT SAFETY GATE]
  ├── Kiểm tra git status --porcelain
  └── Dirty? ──→ SKIP (hoặc git stash nếu có cờ --stash)
            │
            ▼
[BƯỚC 3: FETCH & SO SÁNH DELTA]
  ├── git fetch origin --prune
  └── So sánh HEAD vs @{u} (Behind / Ahead / Diverged)
            │
            ▼
[BƯỚC 4: PULL CODE AN TOÀN]
  └── git pull --ff-only (chỉ fast-forward, cấm merge commit rác)
            │
            ▼
[BƯỚC 5: XUẤT BÁO CÁO TRỰC QUAN]
  └── Render Markdown Table tóm tắt kết quả
```

### Bước 1: Tra Cứu Alias & Định Vị Repository
Phân tích tham số người dùng truyền vào (hoặc directive từ Discord):
- Nếu có cờ `-p <tên>`, tra cứu trong `tools/discord-bridge/projects.json`.
- Nếu alias trỏ tới một git repository cụ thể (chứa thư mục `.git`): Chọn duy nhất repo đó.
- Nếu alias trỏ tới một thư mục cha chứa nhiều repo con (ví dụ folder `3.1`): Quét và thu thập toàn bộ các git repository con bên trong.
- Nếu không truyền `-p`: Tự động nhận diện thư mục làm việc hiện tại (CWD).

### Bước 2: Pre-flight Safety Gate (Bảo Vệ Working Tree)
Tại từng repository mục tiêu:
1. Kiểm tra trạng thái: `git status --porcelain`.
2. Nếu có file sửa dở chưa commit (dirty working tree):
   - **Mặc định:** Đánh dấu trạng thái `DIRTY_SKIPPED`, ghi rõ cảnh báo và bỏ qua repo này để tránh nguy cơ mất code của kỹ sư.
   - **Khi có cờ `--stash`:** Thực hiện `git stash push -u -m "auto-stash-before-repo-sync"`, lưu lại cờ để tự động pop sau khi pull.

### Bước 3: Fetch & Phân Tích Độ Lệch Commit
1. Thực hiện kéo thông tin nhánh mới nhất: `git fetch origin --prune`.
2. Kiểm tra tracking branch thượng nguồn: `git rev-parse --abbrev-ref @{u}`.
3. So sánh số lượng commit chênh lệch: `git rev-list --left-right --count HEAD...@{u}`.
4. Xác định trạng thái:
   - `0 0`: `UP_TO_DATE` (Đã ở bản mới nhất).
   - `0 >0`: `BEHIND` (Cần kéo commit mới).
   - `>0 0`: `AHEAD` (Local có commit mới chưa push lên remote).
   - `>0 >0`: `DIVERGED` (Phân kỳ cả 2 phía, cần rebase thủ công).

### Bước 4: Pull Mã Nguồn An Toàn
- Nếu ở trạng thái `BEHIND` (và không bật `--dry-run`): Chạy lệnh `git pull --ff-only`.
- Nếu cờ `--stash` được kích hoạt ở Bước 2: Chạy `git stash pop` để trả lại trạng thái code đang làm dở cho kỹ sư.
- Lấy commit SHA ngắn mới nhất: `git rev-parse --short HEAD`.

### Bước 5: Báo Cáo Kết Quả Chi Tiết
Xuất bảng tổng hợp Markdown đầy đủ các cột: Repository, Branch, Trạng Thái, Delta, Commit SHA, Thời gian thực thi và Ghi chú.

## Cú pháp & Hệ thống Cờ (CLI & Discord)

Kỹ năng hỗ trợ trọn bộ cú pháp cờ tương thích với `discord-bridge`:

| Cờ | Biến thể cú pháp | Ý nghĩa |
|:---|:---|:---|
| **Project** | `-p <name>`, `--project <name>`, `project: <name>` | Chỉ định alias dự án từ `projects.json` hoặc đường dẫn |
| **Branch** | `-b <name>`, `--branch <name>`, `branch: <name>` | Chỉ định nhánh muốn checkout và pull |
| **Ghi chú** | `-d <text>`, `--des <text>`, `des: <text>` | Mô tả thêm mục đích đồng bộ |
| **Auto-stash**| `--stash` | Tự động stash thay đổi chưa commit trước khi pull |
| **Dry-run** | `--dry-run` | Chỉ kiểm tra chênh lệch commit, không pull thật |
| **Toàn bộ** | `--all` | Đồng bộ toàn bộ các dự án trong cấu hình |
| **Danh sách** | `--list` | Liệt kê danh sách các dự án có trong cấu hình |

**Ví dụ thực tế:**
- `/sync -p order-service`
- `/repo-sync project: order-service`
- `/sync -p backend --stash`
- CLI: `npm run repo:sync -- -p order-service`
- Discord: `!sync -p order-service` hoặc `!run /sync -p order-service`

## Những lời Biện minh Thường gặp

- *"Chỉ cần chạy git pull thông thường là xong, sao phải dùng --ff-only?"* ➔ Lệnh `git pull` mặc định có thể tự động tạo merge commit rác ngoài ý muốn hoặc kẹt interactive merge editor khi có phân kỳ. Chuẩn `--ff-only` bảo đảm lịch sử commit sạch sẽ và an toàn.
- *"Cứ pull đè lên code đang sửa rồi giải quyết conflict sau"* ➔ Vi phạm nghiêm trọng nguyên tắc an toàn Zero Data Loss. Code chưa commit của kỹ sư có thể bị ghi đè hoặc hỏng hóc working tree.
- *"Chạy sync hết tất cả các thư mục trên máy cho tiện"* ➔ Làm chậm hệ thống, lãng phí tài nguyên và có thể đụng tới các thư mục cá nhân hoặc dự án không liên quan. Bắt buộc phải cô lập theo project alias hoặc thư mục cụ thể.

## Dấu hiệu Cảnh báo

- 🚩 Cố tình ép `git pull` khi `git status` đang dirty mà không dùng cơ chế stash an toàn.
- 🚩 Bỏ qua bước kiểm tra upstream remote khiến lệnh pull bị treo hoặc báo lỗi không rõ nguyên nhân.
- 🚩 Tự ý chạy `git reset --hard` hoặc `git clean -fd` khi gặp lỗi pull.
- 🚩 Quét đệ quy quá sâu vào các thư mục phụ thuộc như `node_modules`, `venv`, `.git`.

## Xác minh

Sau khi thực hiện kỹ năng, việc kiểm tra đạt chuẩn khi:
1. Toàn bộ repository mục tiêu đều được liệt kê rõ ràng trong bảng báo cáo Markdown.
2. Không có bất kỳ file sửa dở nào của người dùng bị mất mát hoặc thất lạc.
3. Commit SHA sau khi kéo trùng khớp với commit mới nhất trên remote tracking branch.
4. Báo cáo phản ánh chính xác số lượng commit đã kéo về (`+N commits`) hoặc trạng thái `Up-to-date`.
