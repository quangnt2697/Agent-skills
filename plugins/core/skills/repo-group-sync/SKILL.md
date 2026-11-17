---
name: repo-group-sync
description: "Đồng bộ, fetch và pull mã nguồn mới nhất của các dự án hoặc microservices trong group về máy cục bộ. Bỏ qua repo dirty (chỉ reset working tree khi có --force), fetch toàn bộ các nhánh (--all --prune) và pull code toàn bộ các nhánh local (--ff-only). Sử dụng khi cần cập nhật code trước khi phân tích spec, viết test, review code hoặc chạy pipeline e2e-delivery."
metadata:
  version: "1.0.0"
  short-description: "Đồng bộ, fetch và pull mã nguồn mới nhất của các dự án hoặc..."
  disable-auto-invoke: true
---

# Kỹ Năng: Đồng Bộ Mã Nguồn Dự Án (repo-group-sync)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2b (EXTERNAL-WRITE) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Alias dự án/group trong `config/projects.json` hoặc đường dẫn repo mục tiêu. Thiếu input thì DỪNG và hỏi lại, không tự suy đoán.
- **Bằng chứng hoàn thành:** Output thực tế từ `scripts/sync/repo-sync.js` (exit code, trạng thái từng repo/nhánh); repo dirty được báo `DIRTY_SKIPPED`.

## Tổng quan & Khi nào sử dụng

Tự động hóa đồng bộ đa repo an toàn bằng `scripts/sync/repo-sync.js`: kiểm tra working tree sạch → `git fetch --all --prune` → `git pull --ff-only` toàn bộ nhánh local → checkout trả lại nhánh ban đầu → xuất bảng Markdown tổng hợp. Mặc định bỏ qua repo dirty (`DIRTY_SKIPPED`) để tránh mất code dở.

- **Dùng khi:** Cần cập nhật code mới nhất trước `/qa-code2spec`, `/qa-full-pipeline`, `/e2e-delivery`, review MR hoặc khi user yêu cầu pull/sync repo.
- **Khi KHÔNG sử dụng:** Repo đang commit/rebase dở cần giữ thay đổi (trừ `--stash`), chưa có remote origin, hoặc cần `git push`/`git commit` (CẤM TUYỆT ĐỐI mọi thao tác push).

## Thực thi Ngay (Deterministic Script-First)

Chạy trực tiếp CLI của hệ thống thay vì gõ tay từng lệnh git rời rạc:

```bash
node ${AGENT_SKILLS_HOME:-.}/scripts/sync/repo-sync.js [flags]
```

**Quy trình tự động bên trong `repo-sync.js`:**
1. **Định vị Repo:** Tra alias `-p <name>` từ `config/projects.json` (repo đơn hoặc quét cụm repo con, loại trừ `node_modules`/`.git`/`venv`) hoặc dùng CWD.
2. **An toàn Working Tree (`git status --porcelain`):** Lưu `initialBranch`; mặc định `DIRTY_SKIPPED` nếu dirty · `--stash` để auto-stash/pop · `--force` (chỉ khi user xác nhận) để `git reset --hard HEAD && git clean -fd`.
3. **Fetch & Pull `--ff-only`:** Chạy `git fetch --all --prune`, duyệt nhánh `refs/heads/*` kéo `git pull --ff-only` (trừ `--dry-run`), phân loại `PULLED` / `UP_TO_DATE` / `DIVERGED` / `AHEAD`.
4. **Khôi phục & Báo cáo:** Checkout về `initialBranch` và xuất bảng Markdown (Repository, Nhánh, Trạng thái, Delta, Commit SHA, Ghi chú).

### Hệ thống Cờ Hỗ Trợ
| Cờ | Biến thể | Ý nghĩa |
|---|---|---|
| `-p <name>` | `--project <name>`, `project: <name>` | Alias dự án trong `config/projects.json` hoặc đường dẫn |
| `-b <name>` | `--branch <name>`, `branch: <name>` | Checkout và ưu tiên đồng bộ nhánh chỉ định |
| `--stash` / `--force` | — | Auto-stash/pop khi dirty / Reset sạch (KHÔNG hoàn tác được) |
| `--dry-run` / `--all` / `--list` | — | Chỉ xem delta / Sync tất cả alias / Liệt kê dự án |

**Ví dụ:** `/sync -p order-service` · `/sync -p 3.1 --stash` · `npm run sync -- -p order-service`

## Red Flags, Ngụy biện & Xác minh

- **Ngụy biện sai:** *"Chạy `git pull` thường hay chỉ pull nhánh hiện tại là đủ"* → Tạo merge commit rác hoặc lệch code khi chuyển nhánh `dev`/`uat`/`master`; *"Quét hết máy cho tiện"* → Phải cô lập theo alias/repo.
- **Red Flags:** Tự ý `git commit`/`git push`; ép `--force` khi chưa được user đồng ý; bỏ qua kiểm tra remote tracking.
- [ ] Mọi repo mục tiêu có trong bảng báo cáo kèm trạng thái và Commit SHA thật.
- [ ] Repo dirty mặc định giữ nguyên (`DIRTY_SKIPPED`); các repo sạch đã cập nhật nhánh và quay lại `initialBranch`.
