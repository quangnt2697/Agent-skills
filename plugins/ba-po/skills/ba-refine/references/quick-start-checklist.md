# Quick-Start Checklist — ba-refine

> **Mục đích:** Tờ nhắc cực ngắn. Đọc trước khi bắt đầu mỗi task refine.
> Chi tiết từng bước tại `references/workflow-and-phases.md`.

---

## ⚠️ RANH GIỚI — ba-refine chỉ phân tích & viết spec

| ✅ LÀM | ❌ KHÔNG LÀM |
|---|---|
| Phân tích Jira, viết refined.md, push ADF | Viết code, test script |
| Gọi ba-interview-me, ba-user-story-writing | Tự ý push Jira khi chưa user approve |
| Dry-run ADF trước khi push thật | Bàn giao sang qa-test-design khi chưa push xong |

---

## ⛔ 2 APPROVAL GATES — KHÔNG ĐƯỢC BỎ QUA

```
Gate 1 (Cuối Phase 0): Trình bảng tài liệu → DỪNG, chờ user gõ "OK"
Gate 2 (Bước 3.2):    Trình toàn bộ draft → DỪNG, chờ user approve trước khi lưu refined.md
```

---

## BƯỚC 0 — Chuẩn hóa issueKey (Luôn làm đầu tiên)

```bash
# Tự động extract từ URL hoặc raw text user nhập
ISSUE_KEY=$(echo "$ARGUMENTS" | grep -oiE '[A-Z][A-Z0-9]*-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
```

Nếu không extract được → Hỏi user ngay, không tiếp tục.

---

## BƯỚC 1 — Đọc Credentials (Tự động, không hỏi user)

```bash
source "${PLUGIN_DIR}/.env"
[ -f "${PROJECT_ROOT}/.env" ] && source "${PROJECT_ROOT}/.env"
```

Cần: `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`

---

## BƯỚC 2 — Lấy Metadata & Quét Tài Liệu

1. Lấy Jira metadata: n8n Fast-Path `prepJiraContext({issueKey})`
2. Trích xuất `fields.summary` làm Tiêu đề Task (KHÔNG dùng chuỗi placeholder)
3. Quét: `issuelinks` (Confluence), `attachment`, `description` (URL pattern `*/wiki/*`)
4. Kiểm tra cache: `workspace/{issueKey}/source/refs/` đã có file nào chưa

---

## BƯỚC 3 — Trình Bảng cho User → **GATE 1**

```markdown
| # | Loại | Tên | Trạng thái | Hành động |
|---|------|-----|------------|-----------|
| 1 | 📄 Jira PDF | {issueKey} - {summary} | 🆕 Chưa tải | → Sẽ tải |
| 2 | 📝 Confluence | {tên page} | ✅ Đã có | {path} |
```

**→ DỪNG, hỏi: "Bạn có muốn tôi tiến hành tải không? (Gõ OK)"**

---

## BƯỚC 4 — Phase 1-2: Phân kỳ → Hội tụ

| Phase | Việc cần làm | Điều kiện tiếp theo |
|---|---|---|
| **Phase 1 (Phân kỳ)** | HMW statement → `ba-interview-me` → 5-8 idea variations | Confidence ≥ 90% |
| **Phase 2 (Hội tụ)** | Gom 2-3 hướng đi → Stress-test → Surface assumptions | User chọn 1 hướng |

> Xem rubric stress-test: [refinement-criteria.md](refinement-criteria.md)
> Xem lăng kính ideation: [frameworks.md](frameworks.md)
> Nếu domain chứng khoán: đọc `references/securities-domain-rules.md`

---

## BƯỚC 5 — Phase 3: Draft → **GATE 2** → Chốt

```
Bước 3.1: Tạo refined-draft.md
          └─ Copy skeleton từ assets/jira-description-template.md
          └─ Thay TẤT CẢ placeholder [...] bằng nội dung thật
          └─ Xóa heading không có nội dung, xóa --- giữa sections

Bước 3.2: TRÌNH TOÀN BỘ NỘI DUNG cho user
          → DỪNG, chờ user "OK"
          → Revision loop ≤ 5 vòng nếu cần sửa

Bước 3.3: Copy refined-draft.md → refined.md
          → Gọi ba-user-story-writing để tinh chỉnh AC
          → Hỏi user có muốn tạo flow diagram không (Mermaid/Text/Skip)
          → Tính Confidence Score (ngưỡng ≥ 90%)
```

**Checklist refined.md trước khi push:**
- [ ] Không có placeholder `[...]` còn sót
- [ ] AC có ≥ 3 Scenario (Happy, Edge, Validation) dạng Given/When/Then
- [ ] Không có heading nội bộ: "Giả định & Rủi ro", "Đánh giá Độ tin cậy"
- [ ] Không có đường kẻ ngang `---` giữa sections

---

## BƯỚC 6 — Phase 4: Push Jira (Sau khi user approve)

```bash
# 1. Dry-run preview (không gọi Jira)
DRY_RUN=1 bash plugins/ba-po/skills/ba-refine/assets/jira-push-spec.sh {issueKey} \
  "workspace/{issueKey}/spec/refined.md" | head -40

# 2. Push thật sau khi xác nhận ADF đúng
bash plugins/ba-po/skills/ba-refine/assets/jira-push-spec.sh {issueKey} \
  "workspace/{issueKey}/spec/refined.md"
```

→ Push thành công: Tự động chuyển sang `/qa-test-design {issueKey}`

---

## Verification Checklist Cuối

- [ ] Gate 1 đã qua (user gõ OK ở Phase 0)
- [ ] Gate 2 đã qua (user approve draft ở Bước 3.2)
- [ ] `refined.md` đã push lên Jira thành công
- [ ] `push-log.json` đã ghi
- [ ] Confidence ≥ 90%
- [ ] Đã handoff `/qa-test-design {issueKey}`
