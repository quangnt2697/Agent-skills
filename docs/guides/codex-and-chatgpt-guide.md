# Hướng Dẫn Sử Dụng `agent-skills` Trên OpenAI Codex & ChatGPT

Tài liệu này hướng dẫn cài đặt và vận hành đầy đủ **31 skills · 6 persona roles** trên hệ sinh thái OpenAI (**Codex CLI**, **Codex App/IDE**, **Codex Cloud** và **ChatGPT Projects / Custom GPTs**).

---

## 1. OpenAI Codex CLI & Codex App (Local Machine)

### Bước 1: Cài đặt trọn gói qua 1 lệnh (`setup:codex`)
Chạy lệnh duy nhất từ thư mục gốc repo:
```bash
npm run setup:codex
```
Lệnh này (idempotent, tự động tạo `.agent-skills.bak` trước khi sửa file sẵn có) thực hiện đầy đủ 4 việc:
1. Tạo **31 symlinks** từ `plugins/*/skills/*` sang `~/.codex/skills/` (giữ nguyên đường dẫn thật 4 cấp để mọi liên kết `../../../../references/...` hoạt động chuẩn).
2. Symlink `AGENTS.md` gốc sang `~/.codex/AGENTS.md` để Codex ở mọi project khác đều tự động nhận đầy đủ rules hệ thống.
3. Cấu hình `~/.codex/config.toml`: ghi `AGENT_SKILLS_HOME` dưới `[shell_environment_policy.set]`, bật `[features] hooks` & `multi_agent`, và đăng ký **6 Persona Subagents (`[agents.*]`)** trỏ tuyệt đối tới `config/codex/agents/*.toml` (các vai trò Tier 1 `code_reviewer`, `security_auditor`, `webperf_auditor` được ép cứng `sandbox_mode = "read-only"` ở tầng OS Sandbox).
4. Merge **4 Lifecycle Hooks** (`.agents/hooks/codex/*.sh`) vào `~/.codex/hooks.json` kèm `AGENT_SKILLS_HOME` inline: chặn rò rỉ secret (`glpat-`, `AIzaSy...`, JWT), chặn ghi ngoài `workspace/`, chặn `pytest` thiếu log và tự lưu `.checkpoints/auto-save.json` khi kết thúc phiên.

> 💡 **Tùy chọn cài tối giản / Gỡ bỏ:**
> - Chỉ cài skills + `AGENTS.md` + `AGENT_SKILLS_HOME` (bỏ qua `hooks.json` & `[agents.*]`): `npm run setup:codex -- --no-hooks`
> - Gỡ bỏ sạch toàn bộ symlinks, agent roles và hooks của repo (vẫn giữ nguyên cấu hình riêng của bạn): `npm run unlink:codex`
> - **Vì sao nên dùng `npm run setup:codex` thay cho `codex plugin add`?** Khi cài qua Marketplace cache (`~/.codex/plugins/cache/`), các liên kết tương đối `../../../../references/securities-domain-rules.md` sẽ trỏ ra ngoài thư mục cache; `setup:codex` giữ nguyên cây thư mục monorepo nên không bị gãy liên kết.

### Bước 2: Tùy biến Sandbox & Network nâng cao (Tùy chọn)
Tham khảo mẫu cấu hình đầy đủ tại [`config/codex/config.toml.example`](../../config/codex/config.toml.example) và [`config/codex/hooks.json.example`](../../config/codex/hooks.json.example) để bổ sung khi cần:
- **Network Access:** Thêm `[sandbox_workspace_write]` với `network_access = true` nếu cần các skill gọi Jira, n8n `localhost:5678` hoặc Metabase UAT.
- **Writable Roots:** Thêm `writable_roots = ["/abs/path"]` (dùng **đường dẫn tuyệt đối** khi đặt trong `~/.codex/config.toml`) nếu cần ghi ngoài thư mục project hiện tại.

### Bước 3: Cú pháp gọi Skill trên Codex
- **Gọi tường minh:** Dùng tiền tố **`$`** (ví dụ: `$ba-spec G3PTP-17396`, `$qa-test-design PROJ-100`).
- **12 skills có tác dụng phụ** (`ba-refine`, `qa-squash-push`, `qa-run-test`, `repo-group-sync`, `sm-*`...) có file `agents/openai.yaml` đặt `allow_implicit_invocation: false` — chỉ chạy khi bạn gọi `$skill-name`.
- **Chống `$imagegen` chiếm quyền Mockup:** Khi dựng UI Mockup hoặc Sơ đồ, luôn gọi `$ba-design-mockup` hoặc `$ba-design-flowchart` (không dùng `$imagegen` vẽ ảnh bitmap).

---

## 2. OpenAI Codex Cloud (Container Từ Xa)

Codex Cloud chạy pha **Setup Script** có internet, nhưng khi sang pha **Agent Execution**:
1. **Internet bị tắt mặc định** (trừ khi bật Domain Allowlist cho Jira / Metabase UAT).
2. **Biến Secrets bị xóa sạch** trước khi Agent khởi chạy (chỉ `Environment Variables` thường được giữ lại).

**Khuyến nghị:**
- Không lưu `ATLASSIAN_API_TOKEN` hay `METABASE_UAT_API_TOKEN` vào mục *Secrets* nếu skill cần đọc chúng lúc chạy.
- Trên Codex Cloud không có mạng nội bộ, ưu tiên dùng cho các tác vụ offline trên mã nguồn: `$cr-review-code-and-quality`, `$cr-code-simplification`, `$security-code-audit`, `$qa-test-design` (khi đã có sẵn `spec/final.md` trong nhánh Git).

---

## 3. ChatGPT (Web / Desktop — Projects & Custom GPTs)

ChatGPT không kết nối trực tiếp filesystem máy cục bộ hay n8n `localhost`, nhưng tận dụng tốt **Code Interpreter** (tạo & nén file tải về) và **Canvas** (xem trước HTML/SVG).

### Bước 1: Đóng gói 7 Knowledge Files
```bash
npm run chatgpt:export
```
Lệnh sẽ tạo **7 files** sạch secret tại `dist/chatgpt/`:
1. `00-INSTRUCTIONS-SYSTEM-PROMPT.md` (**< 8.000 ký tự**) — dán toàn bộ nội dung vào ô **Instructions** của Custom GPT hoặc ChatGPT Project.
2. `01-BUNDLE-BA-PO-SKILLS.md` — 10 skills BA/PO.
3. `02-BUNDLE-QA-SDET-SKILLS.md` — 6 skills QA/SDET.
4. `03-BUNDLE-CR-SECURITY-WEBPERF.md` — 4 skills Review/Security/WebPerf.
5. `04-BUNDLE-SCRUM-MASTER-CORE.md` — 11 skills SM, Core & Data Ops.
6. `05-SECURITIES-DOMAIN-HANDBOOK.md` — Cẩm nang chứng khoán KRX & TimescaleDB.
7. `06-UI-MOCKUP-SHELLS-AND-TOKENS.md` — Production HTML Shells & Design Tokens.

### Bước 2: Upload & Sử dụng
- Kéo thả 6 file `01..06-*.md` vào phần **Files / Knowledge** (tải lên **1 lượt duy nhất**, nằm gọn trong trần 10 files/lượt upload và trần 20–25 files của Custom GPT / ChatGPT Plus).
- Đính kèm file `.pdf` / `.json` của Jira hoặc `.zip` mã nguồn vào khung chat → ChatGPT Code Interpreter sẽ tạo cấu trúc `workspace/issues/{issueKey}/...` và trả link tải file `.zip` về để bạn giải nén vào dự án.
