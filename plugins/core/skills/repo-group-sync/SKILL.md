---
name: repo-group-sync
description: Đồng bộ, fetch và pull mã nguồn mới nhất của các dự án hoặc microservices trong group về máy cục bộ. Bỏ qua repo dirty (chỉ reset working tree khi có --force), fetch toàn bộ các nhánh (--all --prune) và pull code toàn bộ các nhánh local (--ff-only). Sử dụng khi cần cập nhật code trước khi phân tích spec, viết test, review code hoặc chạy pipeline e2e-delivery.
trigger: Khi cần cập nhật code mới nhất của các repo/microservices trong group trước khi phân tích spec, viết test hoặc review code. Trigger bằng lệnh /repo-group-sync.
disable-auto-invoke: true
---

# Kỹ Năng: Đồng Bộ Mã Nguồn Dự Án (repo-group-sync)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2b (EXTERNAL-WRITE) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Cấu hình dự án/group cần đồng bộ. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Output thật của `repo-sync` (số repo, trạng thái); repo dirty được báo là đã bỏ qua.

## Tổng quan

Trong kiến trúc microservices và đa kho lưu trữ (multi-repo), mã nguồn thường xuyên được các đội ngũ cập nhật liên tục trên GitLab. Khi AI Agent hoặc kỹ sư làm việc trên môi trường cục bộ (Local Workspace):
1. Mã nguồn cũ (stale code) sẽ làm sai lệch kết quả phân tích đặc tả (`qa-code2spec`).
2. Giao thức API, Data Contracts, Event schemas không khớp dẫn đến kiểm thử tự động thất bại giả (false failures).
3. Các file sửa dở (uncommitted/untracked) cản trở quá trình checkout và pull các nhánh mới.
4. Thao tác kéo mã thủ công cho từng nhánh và từng thư mục rất mất thời gian và dễ bỏ sót các dịch vụ phụ thuộc.

Kỹ năng `repo-group-sync` tự động hóa việc đồng bộ mã nguồn an toàn: tải về toàn bộ metadata và commit của tất cả các nhánh từ remote (`git fetch --all --prune`), và kéo mã nguồn mới nhất (`git pull --ff-only`) cho toàn bộ các nhánh local trong từng repository đơn lẻ hoặc toàn bộ cụm dịch vụ. Mặc định an toàn: hệ thống tự động bỏ qua các repository có uncommitted changes để chống mất code dở dang. Chỉ khi có cờ `--force` và được sự đồng ý rõ ràng của người dùng, hệ thống mới thực hiện reset sạch (`git reset --hard HEAD && git clean -fd`). Sau khi đồng bộ, hệ thống tự động checkout trả lại nhánh ban đầu cho kỹ sư. Kỹ năng hỗ trợ định danh qua alias cấu hình trong `projects.json`, có thể kích hoạt trực tiếp từ terminal.

## Khi nào sử dụng

- Trước khi bắt đầu phân tích mã nguồn để dịch ngược đặc tả (`/qa-code2spec`).
- Trước khi thực hiện kiểm thử toàn trình (`/e2e-delivery` hoặc `/qa-full-pipeline`).
- Khi tiếp nhận một tính năng mới cần đảm bảo các microservices phụ thuộc đều ở commit mới nhất.
- Khi người dùng yêu cầu "pull code mới", "sync repo", "cập nhật code dự án", "fetch code mới nhất về local".

**Khi KHÔNG sử dụng:**
- Khi bạn đang trong quá trình commit hoặc rebase dở dang trên repository và muốn giữ nguyên thay đổi cục bộ (trừ khi bật cờ `--stash` hoặc `--no-reset`).
- Khi mục tiêu là push mã nguồn lên remote (kỹ năng này chỉ thực hiện kéo về: fetch/pull an toàn, **nghiêm cấm tuyệt đối mọi lệnh push**).
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
[BƯỚC 2: TỰ ĐỘNG RESET WORKING TREE (NẾU DIRTY)]
  ├── Kiểm tra git status --porcelain
  ├── Mặc định: SKIP (DIRTY_SKIPPED) để tránh mất code
  ├── Nếu bật --stash: git stash trước khi pull, pop lại sau
  └── Nếu bật --force: git reset --hard HEAD && git clean -fd (KHÔNG hoàn tác được)
            │
            ▼
[BƯỚC 3: FETCH TOÀN BỘ CÁC NHÁNH]
  └── git fetch --all --prune (kéo toàn bộ refs & commits từ remote)
            │
            ▼
[BƯỚC 4: PULL CODE CHO TOÀN BỘ CÁC NHÁNH LOCAL]
  ├── Lấy danh sách toàn bộ local branches (refs/heads/*)
  ├── Duyệt qua từng nhánh: git checkout <branch> && git pull --ff-only
  └── Tự động checkout quay lại nhánh ban đầu (initialBranch)
            │
            ▼
[BƯỚC 5: XUẤT BÁO CÁO TRỰC QUAN]
  └── Render Markdown Table tóm tắt kết quả từng repo & từng nhánh
```

### Bước 1: Tra Cứu Alias & Định Vị Repository
Phân tích tham số người dùng truyền vào:
- Nếu có cờ `-p <tên>`, tra cứu trong `projects.json`.
- Nếu alias trỏ tới một git repository cụ thể (chứa thư mục `.git`): Chọn duy nhất repo đó.
- Nếu alias trỏ tới một thư mục cha chứa nhiều repo con (ví dụ folder `3.1`): Quét và thu thập toàn bộ các git repository con bên trong.
- Nếu không truyền `-p`: Tự động nhận diện thư mục làm việc hiện tại (CWD).

### Bước 2: Tự Động Reset Working Tree (Bảo Đảm Môi Trường Sạch)
Tại từng repository mục tiêu:
1. Lưu lại nhánh làm việc ban đầu (`git rev-parse --abbrev-ref HEAD`).
2. Kiểm tra trạng thái: `git status --porcelain`.
3. Nếu phát hiện file sửa dở hoặc untracked files (dirty working tree):
   - **Mặc định:** Bỏ qua repo này (`DIRTY_SKIPPED`).
   - **Khi có cờ `--stash`:** auto-stash rồi pop lại sau khi pull.
   - **Khi có cờ `--force`:** Thực thi `git reset --hard HEAD` và `git clean -fd` (không hoàn tác được).

### Bước 3: Fetch Toàn Bộ Các Nhánh Từ Remote
1. Thực hiện kéo metadata và commits mới nhất của tất cả các nhánh: `git fetch --all --prune`.
2. Toàn bộ các remote tracking branch (`origin/*`) đều được cập nhật mới nhất, các nhánh đã bị xóa trên remote sẽ được dọn sạch (--prune).

### Bước 4: Pull Mã Nguồn Cho Toàn Bộ Các Nhánh Local
1. Lấy danh sách toàn bộ các nhánh local: `git for-each-ref --format='%(refname:short)' refs/heads/`.
2. Với từng nhánh local:
   - Chuyển sang nhánh: `git checkout <branch>`.
   - Tự động gắn remote tracking nếu chưa có: `git branch --set-upstream-to=origin/<branch> <branch>`.
   - So sánh độ lệch commit: `git rev-list --left-right --count HEAD...@{u}`.
   - Nếu `behind > 0` (và không bật `--dry-run`): Chạy lệnh `git pull --ff-only`.
   - Ghi nhận trạng thái: `PULLED`, `UP_TO_DATE`, `DIVERGED`, `AHEAD`.
3. Sau khi duyệt hết tất cả các nhánh, tự động checkout trở lại nhánh ban đầu: `git checkout <initialBranch>`.

### Bước 5: Báo Cáo Kết Quả Chi Tiết
Xuất bảng tổng hợp Markdown đầy đủ các cột: Repository, Nhánh Đồng Bộ, Trạng Thái, Delta, Commit SHA, Thời gian thực thi và Chi tiết/Ghi chú (bao gồm chi tiết từng nhánh và thông báo reset nếu có).

## Cú pháp & Hệ thống Cờ (CLI)

Kỹ năng hỗ trợ trọn bộ cú pháp cờ tương thích:

| Cờ | Biến thể cú pháp | Ý nghĩa |
|:---|:---|:---|
| **Project** | `-p <name>`, `--project <name>`, `project: <name>` | Chỉ định alias dự án từ `projects.json` hoặc đường dẫn |
| **Branch** | `-b <name>`, `--branch <name>`, `branch: <name>` | Chỉ định thêm nhánh muốn checkout và pull |
| **Ghi chú** | `-d <text>`, `--des <text>`, `des: <text>` | Mô tả thêm mục đích đồng bộ |
| **Force**| `--force` | Reset --hard + clean -fd working tree dirty (không hoàn tác được) |
| **Auto-stash**| `--stash` | Tự động stash thay đổi chưa commit trước khi pull  |
| **Dry-run** | `--dry-run` | Chỉ kiểm tra chênh lệch commit, không pull thật |
| **Toàn bộ** | `--all` | Đồng bộ toàn bộ các dự án trong cấu hình |
| **Danh sách** | `--list` | Liệt kê danh sách các dự án có trong cấu hình |

**Ví dụ thực tế:**
- `/sync -p order-service`
- `/repo-sync project: order-service`
- `/sync -p 3.1`
- `/sync -p backend --stash`
- CLI: `npm run sync -- -p order-service`

## Những lời Biện minh Thường gặp

- *"Chỉ cần chạy git pull thông thường là xong, sao phải dùng --ff-only?"* ➔ Lệnh `git pull` mặc định có thể tự động tạo merge commit rác ngoài ý muốn hoặc kẹt interactive merge editor khi có phân kỳ. Chuẩn `--ff-only` bảo đảm lịch sử commit sạch sẽ và an toàn.
- *"Chỉ cần pull nhánh hiện tại là đủ rồi"* ➔ Trong kiến trúc microservices và phát triển đa luồng, kỹ sư thường xuyên cần chuyển đổi giữa các nhánh (`dev`, `uat`, `master`). Việc kéo toàn bộ các nhánh đảm bảo môi trường local đồng bộ hoàn toàn với remote mà không cần làm thủ công từng nhánh.
- *"Chạy sync hết tất cả các thư mục trên máy cho tiện"* ➔ Làm chậm hệ thống, lãng phí tài nguyên và có thể đụng tới các thư mục cá nhân hoặc dự án không liên quan. Bắt buộc phải cô lập theo project alias hoặc thư mục cụ thể.

## Dấu hiệu Cảnh báo

- 🚩 Vi phạm lệnh cấm: Tự ý chạy `git push` hoặc `git commit` lên repo của các dự án.
- 🚩 Bỏ qua bước kiểm tra upstream remote khiến lệnh pull bị treo hoặc báo lỗi không rõ nguyên nhân.
- 🚩 Quét đệ quy quá sâu vào các thư mục phụ thuộc như `node_modules`, `venv`, `.git`.

## Xác minh

Sau khi thực hiện kỹ năng, việc kiểm tra đạt chuẩn khi:
1. Toàn bộ repository mục tiêu đều được liệt kê rõ ràng trong bảng báo cáo Markdown kèm danh sách các nhánh.
2. Nếu có file sửa dở/untracked ban đầu, working tree được đưa về trạng thái sạch sẽ ban đầu.
3. Toàn bộ các nhánh local đều được cập nhật lên commit mới nhất của remote tương ứng.
4. Repository tự động quay trở lại đúng nhánh làm việc ban đầu của kỹ sư.

---
