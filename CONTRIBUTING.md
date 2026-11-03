# Hướng Dẫn Đóng Góp (Contributing Guide)

Cảm ơn bạn đã đóng góp cho **agent-skills**! Tài liệu này quy định phạm vi dự án, chuẩn kiến trúc kỹ năng, quy trình phát triển nhánh (Git Workflow) và các cổng kiểm định tự động bắt buộc trước khi merge vào nhánh `main`.

---

## 1. Phạm Vi & Kiến Trúc Hệ Sinh Thái (`agent-skills`)

Repository cung cấp hệ thống kỹ năng (Skills), lệnh tắt (Slash Commands), luật vận hành (Core Rules) và luồng tự động hóa (n8n Fast-Path) cấp sản xuất cho AI Agent (Claude Code, Antigravity IDE, Gemini CLI) trong lĩnh vực **Tài chính — Chứng khoán (KRX)**.

Hệ thống được module hóa thành **6 Plugins (31 Skills, 29 Slash Commands, 6 Personas)**:

| Plugin | Vị trí | Số lượng Skills | Phạm vi chuyên môn cốt lõi |
|---|---|:---:|---|
| **BA / PO** | `plugins/ba-po/` | 10 | Phân tích yêu cầu (`ba-spec`), mài giũa ý tưởng & đồng bộ Jira ADF (`ba-refine`), phỏng vấn (`ba-interview-me`), vẽ sơ đồ Editorial (`ba-design-flowchart`) và dựng Prod-Twin UI Mockup (`ba-design-mockup`). |
| **QA / SDET** | `plugins/qa/` | 6 | Thiết kế Checklist BVA + Gherkin (`qa-test-design`), sinh mã Automation POM tái sử dụng SDK (`qa-auto-design`), thực thi test & ghi log 100% (`qa-run-test`), dịch ngược code (`qa-code2spec`), đồng bộ Squash TM (`qa-squash-push`). |
| **Scrum Master** | `plugins/scrum-master/` | 4 | Lập kế hoạch Sprint (`sm-sprint-planning`), Daily Standup tự động (`sm-daily-standup`), gỡ điểm nghẽn (`sm-impediment-triage`), tổng kết Sprint (`sm-sprint-retrospective`). |
| **Code Reviewer & Auditors** | `plugins/code-reviewer/` | 4 | Review code đa chiều 5 trục (`cr-review-code-and-quality`), đơn giản hóa code (`cr-code-simplification`), kiểm toán bảo mật OWASP (`security-code-audit`), đo lường Core Web Vitals (`webperf-core-vitals`). |
| **Fintech Data** | `plugins/fintech-data/` | 1 | Đối chiếu dữ liệu thị trường KRX MDDS trên TimescaleDB (`db-timescale-reconciler`). |
| **Core / Meta** | `plugins/core/` | 6 | Tối ưu ngữ cảnh (`meta-context`), định tuyến kỹ năng (`meta-using-agent-skills`), nén phiên (`meta-session-checkpoint`), đúc kết bài học (`meta-continuous-learning`), truy vết chéo (`meta-cross-validation`), đồng bộ nhóm repo (`repo-group-sync`). |

> 📖 **Tra cứu toàn bộ danh mục tại:** [CATALOG.md](CATALOG.md) và [AGENTS.md](AGENTS.md).

---

## 2. Quy Trình Tạo Mới & Cập Nhật Plugin / Skill (Progressive Disclosure 3 Tầng)

Mọi đóng góp Plugin và Skill mới **BẮT BUỘC** tuân thủ kiến trúc **Progressive Disclosure (Lazy Loading 3 tầng)** để tối ưu ngân sách token và chống ảo giác (Anti-Hallucination).

> 📖 **Xem hướng dẫn chi tiết tại:** [docs/guides/create-new-plugin.md](docs/guides/create-new-plugin.md) và [docs/guides/skill-anatomy.md](docs/guides/skill-anatomy.md).

### Luồng Thực Hiện 5 Bước

`[1. Tạo Nhánh & Hooks]` ➔ `[2. Xây Skill 3 Tầng]` ➔ `[3. Khai Báo Command .toml & Build]` ➔ `[4. Viết Eval Cases & Unit Test]` ➔ `[5. Chạy npm test & Đồng Bộ Docs]`

1. **Bước 1 — Khởi tạo môi trường & nhánh làm việc:**
   - Kích hoạt Git hooks bảo vệ nhánh `main` và ranh giới workspace:
     ```bash
     npm run setup:hooks
     ```
   - Tạo nhánh mới từ `main` (`feature/<ten-tinh-nang>`, `fix/<ten-loi>`, `docs/<ten-tai-lieu>`). **Tuyệt đối không commit trực tiếp vào `main`.**

2. **Bước 2 — Thiết kế Skill theo chuẩn 3 tầng (`plugins/<plugin>/skills/<skill-name>/`):**
   - **Level 1 (YAML Frontmatter):** Gồm `name` (kebab-case trùng tên thư mục), `description` (1–2 câu ngôi thứ ba) và `trigger` (điều kiện kích hoạt rõ ràng).
   - **Level 2 (`SKILL.md` Body — tinh gọn < 120 dòng):**
     - Bắt buộc có khối **`Grounding (grounding-contract)`** và mục **`## Input Bắt Buộc & Bằng Chứng Hoàn Thành`** (trừ các skill được miễn trừ cấu trúc).
     - Nêu rõ ranh giới nhiệm vụ (*Làm gì / Không làm gì*), quy trình từng bước, đường dẫn sang Level 3 và ví dụ mẫu Few-shot có cảnh báo chống sao chép số liệu giả (*Few-Shot Quarantine*).
   - **Level 3 (`assets/` và `references/`):**
     - `assets/`: Chứa templates, scripts thực thi (`.js`, `.py`, `.sh`), HTML shells/harnesses dùng trực tiếp.
     - `references/`: Chứa quy tắc nghiệp vụ, checklists, từ điển dữ liệu (`.md`, `.json`).
     - **Nghiêm cấm** tạo thư mục phi chuẩn như `templates/`, `scripts/`, `examples/`, `resources/` bên trong thư mục skill.

3. **Bước 3 — Tạo/Cập nhật Slash Command (Single Source of Truth là `.toml`):**
   - Định nghĩa hoặc chỉnh sửa file `plugins/<plugin>/commands/<cmd>.toml`.
   - **KHÔNG sửa tay** file trong `.claude/commands/<cmd>.md`. Hãy chạy lệnh build tự động:
     ```bash
     npm run build
     ```
     Script `scripts/setup/build-commands.js` sẽ tự động biên dịch toàn bộ `.toml` sang `.claude/commands/*.md` tương ứng.

4. **Bước 4 — Bổ sung Bộ Đánh Giá Kỹ Năng (`evals/`) & Unit Tests (`tests/`):**
   - Tạo hoặc cập nhật file test case tại `evals/cases/<skill-name>.json` (gồm `positive` prompts để test độ nhạy router, `negative` prompts chống kích hoạt nhầm, và `assertions` kiểm tra cấu trúc output).
   - Nếu thêm script xử lý hoặc validator mới trong `scripts/` hoặc `assets/`, bổ sung unit test tương ứng trong `tests/*.test.js`.

5. **Bước 5 — Cập nhật Tài liệu & Chạy Kiểm định Toàn diện (`npm test`):**
   - Cập nhật đồng bộ số lượng và mô tả kỹ năng tại: `AGENTS.md`, `CATALOG.md`, `README.md`, `CLAUDE.md` và `plugins/<plugin>/agents/<persona>.md`.
   - Chạy toàn bộ pipeline kiểm định:
     ```bash
     npm test
     ```

---

## 3. Hệ Thống 9 Cổng Kiểm Định Tự Động (Validation Gates)

Trước khi tạo Merge Request hoặc merge vào `main`, lệnh `npm test` (bao gồm `npm run validate`, `npm run test:unit`, `npm run evals`) **BẮT BUỘC PASS 100%**:

| Lệnh kiểm định | Cổng kiểm tra | Tiêu chí đạt (Pass Criteria) |
|---|---|---|
| `npm run validate:skills` | **Gate 1: Skills Structure** | Đủ frontmatter (`name`, `description`, `trigger`), đủ section `Grounding` & `Input Bắt Buộc`, không vượt giới hạn dòng. |
| `npm run validate:commands` | **Gate 2: Command Parity** | Đồng bộ 1-1 giữa `commands/*.toml` và `.claude/commands/*.md`. |
| `npm run validate:versions` | **Gate 3: Version Manifests** | Nhất quán phiên bản giữa `package.json` và toàn bộ `plugins/*/plugin.json`. |
| `npm run validate:links` | **Gate 4: Relative Links** | Không có markdown link tương đối nào bị gãy (broken links) trong các skills. |
| `npm run validate:refs` | **Gate 5: Script & Asset Refs** | Mọi đường dẫn gọi script/template/checklist trong `SKILL.md` đều tồn tại thực tế. |
| `npm run validate:paths` | **Gate 6: Canonical Workspace** | Mọi đường dẫn output tuân thủ đúng 5 thư mục chuẩn `workspace/issues/{issueKey}/{source,spec,tech,test,trace}/`. |
| `npm run validate:icons` | **Gate 7: Icons Gallery** | Các icon sử dụng trong sơ đồ `ba-design-flowchart` hợp lệ theo thư viện chuẩn. |
| `npm run validate:nodes` | **Gate 8: n8n Node Sync** | Code JS trong `scripts/n8n-nodes/` khớp 100% với các node trong `n8n-workflows/`. |
| `npm run validate:tokens` | **Gate 9: Token Budget** | Dung lượng token của từng file `SKILL.md` nằm trong ngưỡng ngân sách cho phép. |
| `npm run test:unit` | **Unit Test Suite** | 100% unit tests (`tests/*.test.js`) pass, 0 fail. |
| `npm run evals` | **Skill Evals Benchmark** | 100% case checks pass, **Trigger Rank-1 Rate ≥ 90%**. |

### Các Công Cụ Đồng Bộ Chuyên Biệt Khác

- **Khi chỉnh sửa code node n8n (`scripts/n8n-nodes/*.js`):**
  ```bash
  npm run n8n:sync-nodes && npm run n8n:clean
  ```
- **Khi cập nhật UI Design System từ repo Web/Mobile Trading cho `ba-design-mockup`:**
  ```bash
  npm run scan:ui-components
  ```
- **Khi kiểm định chất lượng đặc tả `ba-refine` hoặc độ trung thực UI Mockup:**
  ```bash
  node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined.md"
  node plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js "workspace/issues/{issueKey}/spec/diagrams/mockup.html" "workspace/issues/{issueKey}/spec/asis-inventory.json"
  ```

---

## 4. Quy Tắc Quản Trị Luật (`.agents/rules/`) & Ranh Giới Workspace

1. **Single Source of Truth cho Rules:**
   - Thư mục `.agents/rules/` là nơi duy nhất lưu trữ và chỉnh sửa các luật cốt lõi (`git-workflow.md`, `workspace-paths.md`, `grounding-contract.md`, `autonomy-contract.md`, `action-first-adhd.md`, `confidence-level.md`).
   - Thư mục `.claude/rules` là **Symbolic Link** trỏ trực tiếp sang `../.agents/rules`. Mọi chỉnh sửa trong `.agents/rules/` sẽ tự động có hiệu lực cho cả Antigravity, Gemini CLI và Claude Code.

2. **Ranh giới Output Artifacts (`workspace/`):**
   - Toàn bộ sản phẩm sinh ra trong quá trình chạy skill bắt buộc đặt tại `workspace/issues/{issueKey}/` (theo 5 thư mục con: `source/`, `spec/`, `tech/`, `test/`, `trace/`), `workspace/sprints/{sprintId}/` hoặc `workspace/adhoc/{slug}/`.
   - **Nghiêm cấm** tạo thư mục rác ở gốc dự án (`reports/`, `output/`, `docs/ideas/`).

3. **Quy tắc Ngôn ngữ & Bảo mật:**
   - Toàn bộ tài liệu đặc tả, checklist, báo cáo và hướng dẫn trong kho lưu trữ này **BẮT BUỘC viết bằng Tiếng Việt** rõ ràng, mạch lạc.
   - **Tuyệt đối không** hardcode API Token, mật khẩu, hoặc thông tin nhạy cảm vào code/markdown; mọi thông tin xác thực phải đọc từ biến môi trường (`.env`).

---

## 5. Báo Cáo Lỗi & Đề Xuất Cải Tiến

Hãy mở Issue hoặc tạo nhánh `fix/` / `refactor/` khi bạn phát hiện:
- Kỹ năng đưa ra hướng dẫn lệch với quy định nghiệp vụ Chứng khoán KRX (`references/securities-domain-rules.md`).
- Chuỗi bàn giao liên vai trò (`ba-spec` / `ba-refine` ➔ `qa-test-design` ➔ `qa-auto-design` ➔ `qa-run-test` ➔ `meta-cross-validation`) bị đứt gãy dữ liệu (ví dụ lệch schema `testability-manifest.json` hoặc thiếu mã `[BR-xx]`).
- Độ chính xác nhận diện kỹ năng (`npm run evals`) giảm xuống dưới ngưỡng 90% hoặc có xung đột từ khóa `trigger` giữa các skills.
