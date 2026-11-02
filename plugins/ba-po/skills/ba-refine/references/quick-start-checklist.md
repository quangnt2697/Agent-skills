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

## BƯỚC 2 — Lấy Metadata, Trích xuất Từ khóa & Quét Tài Liệu

1. Lấy Jira metadata: n8n Fast-Path `prepJiraContext({issueKey})`
2. Trích xuất `fields.summary` làm Tiêu đề Task; tự động bóc tách từ khóa nghiệp vụ (`extractedKeywords`) và tìm kiếm các issue liên quan (`relatedSearchIssues`)
3. Quét: `issuelinks` (Confluence), `attachment`, `description` (URL pattern `*/wiki/*`)
4. Kiểm tra cache: `workspace/issues/{issueKey}/source/refs/` đã có file nào chưa
5. Nếu task liên quan UI (WEB/APP) — **ba-design-mockup Protocol (BẮT BUỘC):**
   - 5a. Chạy bóc tách AS-IS tự động: `node plugins/ba-po/skills/ba-design-mockup/assets/extract-asis-ui.js --project <web-trading|mobile-trading> --screen <ScreenKey> --output "workspace/issues/{issueKey}/spec"`
   - 5b. Chọn Production App Shell phù hợp (`web-trading-shell.html`, `mobile-order-sheet-shell.html`...)
   - 5c. Chèn Delta-Only (`data-change="added|modified"`) kèm badge `①`, `②`, `③`
   - 5d. Chạy Hard Gate kiểm định: `node plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js "workspace/issues/{issueKey}/spec/diagrams/mockup.html" "workspace/issues/{issueKey}/spec/asis-inventory.json"` (Fidelity Score ≥ 90%)
   - 5e. Render ảnh Retina 2x: `node plugins/ba-po/skills/ba-refine/assets/render-mockup.js "mockup.html" "mockup.png" fit 2 all`
   - **⛔ GATE CỨNG:** CẤM trình Gate 2 khi chưa có `asis-inventory.md` và 3 ảnh `mockup-case-*.png` đạt Fidelity Score ≥ 90%

---

## BƯỚC 3 — Trình Bảng cho User → **GATE 1**

```markdown
- **Từ khóa trích xuất (`extractedKeywords`):** `{kw1}`, `{kw2}`, `{kw3}`
- **Task liên quan (`relatedSearchIssues`):** `[{relatedKey1}] {summary1}`

| # | Loại | Tên | Trạng thái | Hành động |
|---|------|-----|------------|-----------|
| 1 | 📄 Jira PDF | {issueKey} - {summary} | 🆕 Chưa tải | → Sẽ tải |
| 2 | 🔗 Task liên quan | {relatedKey1} - {summary1} | ✅ Đã quét JQL | `source/jira-issue.json` |
| 3 | 📝 Confluence | {tên page} | ✅ Đã có | {path} |
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

## BƯỚC 5 — Phase 3: Draft (kèm Mockup) → **GATE 2** → Chốt

```
Bước 3.1: Tạo refined-draft.md (Khung Jira Description chuẩn 6 phần)
          └─ Copy skeleton từ assets/jira-description-template.md:
             1. ## 🧩 User Story (As a / I want / So that)
             2. ## 💼 Business Context (Problem / Goal / Urgency / Scope)
             3. ## 📜 Business Rules ([BR-01], [BR-02]...)
             4. ## ✅ Acceptance Criteria (Gherkin sạch: KHÔNG @tag, KHÔNG [AC-x.y])
             5. ## 🎨 UI Design / Mockup (Ảnh inline từng Case & UI Delta)
             6. ## ☀️ Success Criteria & Tracking (Metrics & Tracking)
          └─ Nếu task liên quan UI (WEB hoặc APP):
             • Tra cứu ../ba-design-mockup/references/ui-component-map.json (chống thiết kế bừa)
             • Dựng Delta-Only: Giữ 90% AS-IS mờ nhẹ, viền nhấn added/modified kèm badge ① ② ③
             • Phân tách theo từng Case: Case 1 (Thao tác chính), Case 2 (Ngoại lệ/Lỗi), Case 3 (Khóa phiên/Biên)
             • CẤM mô tả design bằng text lan man; mỗi ảnh đi kèm ghi chú thao tác người dùng (Action) & phản hồi hệ thống (Response) gắn [BR-*]
             • Dựng spec/diagrams/mockup.html → Chạy render-mockup.js sinh đủ mockup-case-1.png, mockup-case-2.png, mockup-case-3.png
             • Hoàn thành Mục UI kèm Bảng chú thích UI Delta Mapping
          └─ Chạy Hard Gate Validator:
             node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined-draft.md"

Bước 3.2: TRÌNH TOÀN BỘ NỘI DUNG cho user (GATE 2)
          └─ Trình ĐỒNG THỜI: Spec 6 mục + Các ảnh mockup từng Case + Ghi chú thao tác ① ② ③ + Bảng UI Delta
          └─ DỪNG, chờ user "OK" (sửa lại vị trí nút/label ngay trong vòng lặp ≤ 5 vòng)

Bước 3.3: Copy refined-draft.md → refined.md
          └─ Tính Confidence Score (ngưỡng ≥ 90%)
```

**Checklist refined.md trước khi push:**
- [ ] Có đầy đủ `## 🧩 User Story` với `As a` cụ thể (không role chung chung)
- [ ] Business Context ngắn gọn đúng trọng tâm (đúng 3 gạch đầu dòng: Vấn đề, Mục tiêu, Tính cấp thiết; không dùng sub-heading H3 lan man)
- [ ] Không có placeholder `[...]` còn sót
- [ ] AC có ≥ 3 Scenario (Happy, Edge, Validation) dạng Given/When/Then; **TUYỆT ĐỐI KHÔNG chứa `@tags` và KHÔNG chứa `[AC-x.y]`**
- [ ] Mục UI có đầy đủ AS-IS Screen, các ảnh `mockup-case-*.png` kèm ghi chú thao tác `① ② ③` (không tả text lan man) và Bảng UI Delta
- [ ] Không có heading nội bộ: "Giả định & Rủi ro", "Đánh giá Độ tin cậy", "Technical Notes"
- [ ] Không có đường kẻ ngang `---` giữa sections
- [ ] `spec/asis-inventory.md` đã tạo (nếu task UI), đọc từ `origin/master` (ghi rõ commit hash)
- [ ] Fidelity Score ≥ 90% (ghi trong Mục UI, dạng: `🎯 Fidelity Score: XX%`)
- [ ] KHÔNG có phần tử UI tự sáng tạo không có trong `asis-inventory.md`

---

## BƯỚC 6 — Phase 4: Push Jira & Handoff (Sau khi user approve)

```bash
# 1. Dry-run preview (không gọi Jira, tự export testability-manifest.json và ADF mediaSingle preview)
DRY_RUN=1 node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js {issueKey} \
  "workspace/issues/{issueKey}/spec/refined.md" | head -40

# 2. Push thật: Tự động upload toàn bộ ảnh mockup lên Attachments + Dán trực tiếp (inline) vào Description Jira
node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js {issueKey} \
  "workspace/issues/{issueKey}/spec/refined.md"
```

→ Tự động dán trực tiếp ảnh vào Description, sinh `spec/testability-manifest.json` và chuyển sang `/qa-test-design {issueKey}`

---

## Verification Checklist Cuối

- [ ] Gate 1 đã qua (user gõ OK ở Phase 0)
- [ ] Gate 2 đã qua (user approve draft ở Bước 3.2)
- [ ] `refined.md` đã push lên Jira thành công
- [ ] `push-log.json` đã ghi
- [ ] Confidence ≥ 90%
- [ ] Đã handoff `/qa-test-design {issueKey}`
