# Quick-Start Checklist — ba-spec

> **Mục đích:** Tờ nhắc cực ngắn. Đọc trước khi bắt đầu import Jira/Confluence.
> Chi tiết kỹ thuật tại `references/workflow-and-phases.md` và `references/rules-and-guidelines.md`.

---

## ⚠️ RANH GIỚI — ba-spec LÀM gì và KHÔNG LÀM gì?

| ✅ ba-spec LÀM | ❌ ba-spec KHÔNG LÀM |
|---|---|
| Quét Jira metadata & refs (Confluence, attachments) | Viết code, DB schema, API contract tech (việc của DEV) |
| Trình bảng tài liệu & chờ user duyệt (Gate 1) | Viết test cases, Gherkin scenarios (việc của QA) |
| Đọc ĐA NGUỒN (toàn bộ file đã tải, không đọc sót) | Tự đoán yêu cầu thay vì phỏng vấn (`ba-interview-me`) |
| Phát hiện gaps (Thiếu / Mơ hồ / Xung đột) | Tự tiện tải file khi chưa có user approval |
| Phỏng vấn từng câu một qua `ba-interview-me` (≥90% confidence) | Bỏ trống các section trong 13 sections chuẩn |
| Xuất `final.md` chuẩn 13 sections bàn giao cho QA/DEV | Dừng hỏi user "có chạy tiếp sang QA không" (tự chuyển tiếp) |

**Phân định với các kỹ năng khác:**
- **ba-spec**: Yêu cầu đã có sẵn trên Jira/Confluence → Import, đọc đa nguồn, làm rõ gap → `final.md`.
- **ba-refine**: Jira chỉ có ý tưởng thô/mơ hồ → Brainstorm, phân kỳ/hội tụ → Cập nhật Jira + `refined.md`.
- **ba-interview-me**: Phỏng vấn tương tác từng câu làm rõ gaps.
- **qa-test-design**: Nhận `final.md` từ BA → Thiết kế checklist & BDD Gherkin.

---

## ⛔ CỔNG CHẶN BẮT BUỘC (Approval Gates & Interview Rules)

```text
⛔ GATE 1 (Cuối Phase 0):
   Trình bảng Markdown danh sách file (Tải / Đã có / Bỏ qua)
   → DỪNG LẠI CHỜ USER GÕ "OK" (Chỉ tải những file được duyệt)

⛔ INTERVIEW RULE (Phase 4):
   Gọi `ba-interview-me` → Hỏi TỪNG CÂU MỘT kèm hypothesis + guess
   → Bắt đầu từ 🔴 Critical → Lặp lại cho đến khi Confidence ≥ 90%
   → User trả lời "Không biết" → Ghi vào Section 11: Open Questions (KHÔNG block)
```

---

## 🚀 QUY TRÌNH 6 BƯỚC THỰC THI NHANH

1. **Phase 0 — Scan & Duyệt (GATE 1):**
   - Đọc credentials từ `.env` (`ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`).
   - Lấy metadata Jira thô (REST API curl, tránh MCP làm sai lệch `summary`).
   - Quét link Confluence + attachments + kiểm tra cache trong `workspace/{issueKey}/source/refs/`.
   - Trình bảng danh sách cho user → **DỪNG chờ "OK"**.

2. **Phase 1 — Download:**
   - Tải file PDF Jira (`assets/jira-fetch-pdf.sh`) + Confluence PDF + attachments còn thiếu.
   - Ghi thông tin nguồn vào `workspace/{issueKey}/source/metadata.json`.

3. **Phase 1.5 — Nhận diện Task Type:**
   - Xác định: 📱 `[APP]`, 🌐 `[WEB]`, hoặc 🔌 `[API]`. Nếu chưa rõ, hỏi 1 câu duy nhất.

4. **Phase 2 — Đọc Đa Nguồn & Trích Xuất (Multi-source Reading):**
   - **BẮT BUỘC ĐỌC TOÀN BỘ:** Jira PDF + tất cả Confluence refs + attachments + wireframes.
   - Đối chiếu theo profile tương ứng: `references/profile-api.md`, `profile-app.md`, `profile-web.md`.
   - ⚠️ **Chứng khoán / Fintech:** BẮT BUỘC đọc `references/securities-domain-rules.md` (phiên ATO/LO/ATC, biên độ giá trần/sàn, mã lỗi ORS, KRX/MDDS).

5. **Phase 3 & 4 — Phát hiện Gaps & Phỏng vấn (Interview-me):**
   - Phân loại gap: ❌ Thiếu | ⚠️ Mơ hồ | 🔀 Xung đột (mức độ 🔴 Critical, 🟡 Important, 🟢 Nice-to-have).
   - Phỏng vấn qua `ba-interview-me`: từng câu một kèm guess, đạt ≥90% confidence.

6. **Phase 5 — Tổng Hợp `final.md` (Handoff Artifact):**
   - Dùng template chuẩn: `assets/spec-final-template.md`.
   - Ghi file vào: `workspace/{issueKey}/spec/final.md`.
   - Đầy đủ 13 sections (section không có ghi "Không áp dụng" kèm lý do, không bỏ trống).
   - Section 9 (AC): Viết dạng **Checklist Tiêu Chí Pass/Fail** (WHAT must be true), KHÔNG viết Gherkin.
   - Đính kèm Section 14 `## 📊 Confidence Assessment`.

---

## ✅ VERIFICATION CHECKLIST (Trước khi bàn giao)

- [ ] File tồn tại tại `workspace/{issueKey}/spec/final.md` và không rỗng.
- [ ] 100% tài liệu tải về trong `source/` và `source/refs/` được trích dẫn trong spec.
- [ ] Đủ 13 sections theo template `assets/spec-final-template.md`.
- [ ] Section 8 có Symmetry Coverage (mô tả đủ Mua/Bán, Thêm/Xóa, Bật/Tắt).
- [ ] Section 9 (AC) là các mệnh đề Pass/Fail kiểm thử được, không viết Gherkin.
- [ ] Task chứng khoán đã tuân thủ `references/securities-domain-rules.md`.
- [ ] Điểm Confidence Score đạt ≥90% kèm bảng đánh giá.
- [ ] **Next Step:** Tự động chuyển giao sang `/qa-test-design {issueKey}` theo Autonomy Contract.
