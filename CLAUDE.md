# agent-skills — Project Instructions & Memory

Hệ thống kỹ năng (skills) cấp sản xuất cho AI coding agents — chuyên trách Phân tích Nghiệp vụ (BA), Đảm bảo Chất lượng (QA/SDET), Điều phối Agile (Scrum Master) và Kiểm toán Mã nguồn (Code Reviewer & Security/Performance) cho lĩnh vực Tài chính — Chứng khoán (KRX).

> 📖 **Single Source of Truth:**
> Toàn bộ luật (Rules), Vai trò (Personas), Ma trận trách nhiệm và Quy trình Pipeline chi tiết được chuẩn hóa tại: [AGENTS.md](AGENTS.md).
> Tra cứu nhanh toàn bộ 30 skills và 29 commands tại: [CATALOG.md](CATALOG.md).
> Hướng dẫn lộ trình làm quen từng bước tại: [LEARNING-ROADMAP.md](LEARNING-ROADMAP.md).

---

## ⚡ Lệnh Thực Thi & Kiểm Định (Essential Commands)

```bash
# Kích hoạt hooks bảo vệ nhánh main và workspace
npm run setup:hooks

# Kiểm tra toàn bộ validators hệ thống (skills, commands, versions, links, paths, icons, nodes)
npm run validate

# Chạy toàn bộ test suite (unit tests + eval benchmark)
npm test

# Chạy riêng bộ đo lường chất lượng kỹ năng (Rank-1 trigger rate >= 90%)
npm run evals

# Đồng bộ mã nguồn các microservices trong nhóm
npm run sync

# Khởi động n8n automation engine cục bộ
npm run n8n
```

---

## 🛡️ Các Bất Biến Cốt Lõi (Architectural Invariants)

1. **Git Workflow Safety (Tự động bảo vệ qua Hook):**
   - ❌ **TUYỆT ĐỐI KHÔNG commit trực tiếp vào `main`/`master`** (Được chặn bởi `.git/hooks/pre-commit` và Agent Hook).
   - Tạo nhánh tính năng (`feature/{issueKey}`, `fix/{issueKey}`) → Code & Verify (`npm test`) → Trình bày user → Commit sau khi approve → Merge vào main.
2. **Quy Chuẩn Thư Mục Artifacts (Tự động bảo vệ qua Hook):**
   - Mọi file sinh ra bắt buộc nằm trong `workspace/issues/{issueKey}/` theo đúng 5 thư mục con chuẩn: `source/`, `spec/`, `tech/`, `test/`, `trace/`. Cấm tạo thư mục rác ở gốc repo (`reports/`, `output/`).
3. **Action-First & Focus Protocol (Always-on):**
   - Dòng đầu tiên của phản hồi luôn là kết quả hoặc lệnh hành động cụ thể.
   - Báo lỗi trung thực: `Dòng lỗi` + `Nguyên nhân` + `Cách khắc phục`. Không cảm thán hay giải thích lan man.
   - Giữ vững 1 task duy nhất, không rẽ nhánh (No rabbit holes).
4. **Nghiệp Vụ Chứng Khoán (KRX):**
   - Đọc dữ liệu kiểm thử từ Metabase UAT / TimescaleDB (`${METABASE_UAT_DB_TIMESCALE_ID}`). Cấm tự bịa giá vi phạm biên độ trần/sàn HOSE (±7%), HNX (±10%), UPCoM (±15%).
   - Bắt buộc dùng kiểu dữ liệu `Decimal` cho bước giá (tick size), cấm dùng float gây sai số số học.
5. **Progressive Disclosure 3 Tầng:**
   - Khi chỉnh sửa hoặc tạo mới Skill: Giữ `SKILL.md` tinh gọn (50-100 dòng), chuyển tài liệu tham chiếu sâu vào `references/` và mẫu thực thi vào `assets/` / `templates/`.

---

## 📌 Chỉ Mục Tra Cứu Nhanh (Pointers)

- **Master Feature Catalog:** [`CATALOG.md`](CATALOG.md)
- **Lộ trình Làm chủ (Roadmap):** [`LEARNING-ROADMAP.md`](LEARNING-ROADMAP.md)
- **Bản đồ Vai trò & Trách nhiệm:** [`AGENTS.md §1 & §2`](AGENTS.md)
- **Cấu trúc Chi tiết Artifacts:** [`.agents/rules/workspace-paths.md`](.agents/rules/workspace-paths.md)
- **Quy trình Phân nhánh Git:** [`.agents/rules/git-workflow.md`](.agents/rules/git-workflow.md)
- **Domain Chứng khoán KRX:** [`references/securities-domain-rules.md`](references/securities-domain-rules.md)
- **SDK Index cho QA Automation:** [`plugins/qa/skills/qa-auto-design/references/sdk-map.json`](plugins/qa/skills/qa-auto-design/references/sdk-map.json)