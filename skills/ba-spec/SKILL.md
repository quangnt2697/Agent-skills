---
name: ba-spec
description: >
  Download Jira issue dưới dạng PDF theo {issueKey}, tự động nhận diện loại task
  ([APP]/[WEB]/[OpenAPI]/[BE]) từ tên issue, chọn bộ trích xuất & câu hỏi phù hợp,
  chạy interview-me để làm rõ yêu cầu, tổng hợp thành bản markdown chi tiết.
  Trigger: "biz-spec", "import jira", "lấy task jira", "/ba-spec {issueKey}".
---

# Skill: biz-spec

## Mục đích

Tự động hoá quy trình: **Jira Task → PDF → Trích xuất → Phân tích → Làm rõ → Markdown chi tiết**.

Agent nhận `{issueKey}` từ user, tải task Jira về dạng PDF, nhận diện loại task từ tên, trích xuất thông tin có cấu trúc theo profile phù hợp, chạy interview-me để làm rõ
các điểm mơ hồ, rồi tổng hợp thành 1 file markdown chi tiết.

---

## Workflow — 6 Phase

```
Phase 1          Phase 1.5          Phase 2           Phase 3
Download PDF ──→ Nhận diện     ──→ Trích xuất    ──→ Phân tích &
                 loại task          theo profile       xác định gaps
    │                │                  │                  │
    ▼                ▼                  ▼                  ▼
  [Auto]           [Auto]            [Auto]            [Auto]

              Phase 4           Phase 5
          ──→ Interview-me ──→ Tổng hợp
              làm rõ gaps       final.md
                  │                │
                  ▼                ▼
            [Interactive]      [Auto]
```

---

## Phase 1: Download PDF từ Jira

### Điều kiện tiên quyết
- File `.env` phải tồn tại tại workspace root với các biến: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- Nếu chưa có `.env`, hướng dẫn user tạo theo `.env.example`

### Các bước thực hiện
1. Đọc file `.env` để lấy credentials
2. Chạy script `jira-auth-check.sh` để kiểm tra kết nối
3. Gọi REST API: `GET /rest/api/3/issue/{issueKey}` để lấy JSON metadata
4. Trích xuất từ JSON: `summary`, `status`, `priority`, `assignee`, `reporter`, `labels`, `sprint`, `attachment list`
5. Export issue thành PDF:
   - **Phương án A** (ưu tiên): Gọi endpoint HTML view → dùng `wkhtmltopdf` convert thành PDF
   - **Phương án B** (fallback): Dùng browser subagent mở trang issue → Print to PDF
6. Download tất cả file attachment đính kèm (giữ nguyên format gốc: .pdf, .doc, .png, .xlsx...)
7. Tạo file `metadata.json` chứa thông tin issue
8. Lưu tất cả vào `specs/jira-import/{issueKey}/ba-spec/source/`

### Cấu trúc thư mục output
```
specs/jira-import/{issueKey}/ba-spec/
├── source/
│   ├── {issueKey}.pdf            # PDF chính (issue content + ảnh)
│   ├── attachment-*.{ext}         # File đính kèm gốc
│   └── metadata.json              # Metadata + task_type
└── {issueKey}-final.md           # ← Output cuối cùng (Phase 5)
```

---

## Phase 1.5: Nhận diện loại task

### Quy tắc nhận diện (case-insensitive)

Đọc trường `summary` (tên task) từ JSON metadata, tìm tag prefix:

| Tag trong tên task | Loại task | Profile áp dụng |
|-------------------|-----------|-----------------|
| `[APP]` | 📱 Mobile App | `references/profile-app.md` |
| `[WEB]` | 🌐 Web Application | `references/profile-web.md` |
| `[OpenAPI]` hoặc `[BE]` hoặc `[WS]` hoặc `[WebSocket]`| 🔌 Backend / API / WebSocket | `references/profile-api.md` |
| Không có tag / Nhiều tag | 🔀 Hybrid | Kết hợp tất cả profiles |

### Logic phát hiện
```
summary.lower() chứa "[app]"       → task_type = "APP"
summary.lower() chứa "[web]"       → task_type = "WEB"
summary.lower() chứa "[openapi]"   → task_type = "API"
summary.lower() chứa "[be]"        → task_type = "API"
summary.lower() chứa "[websocket]" → task_type = "API"
summary.lower() chứa "[ws]"        → task_type = "API"
không match nào                    → task_type = "HYBRID"
```

### Ghi nhận vào metadata.json
```json
{
  "task_type": "APP",
  "task_type_detected_from": "[APP] in summary"
}
```

### Xử lý khi không chắc chắn
Nếu summary không chứa tag nhưng nội dung PDF gợi ý rõ ràng 1 loại cụ thể,
agent hỏi user **1 câu duy nhất** để confirm trước khi tiếp tục:

```
Tên task không chứa tag [APP]/[WEB]/[OpenAPI]/[BE]/[WS]/[WebSocket].
Từ nội dung PDF, tôi nhận thấy đây có vẻ là task về {task_type}.
Bạn xác nhận đây là task loại gì?
```

---

## Phase 2: Trích xuất có cấu trúc theo Profile

Agent đọc PDF + tất cả attachments, sau đó đọc file profile tương ứng:
- 📱 APP → đọc `references/profile-app.md`
- 🌐 WEB → đọc `references/profile-web.md`
- 🔌 API → đọc `references/profile-api.md`
- 🔀 HYBRID → đọc tất cả profiles

Agent trích xuất thông tin theo **9 chiều phân tích** được định nghĩa trong profile.

### Đánh dấu trạng thái mỗi chiều
- ✅ **Rõ ràng** — thông tin đầy đủ, không cần hỏi thêm
- ⚠️ **Mơ hồ** — có thông tin nhưng chưa rõ chi tiết
- ❌ **Thiếu** — không tìm thấy trong tài liệu

---

## Phase 3: Phân tích yêu cầu & Xác định gaps

### Gaps chung (tất cả loại task)
1. **Xung đột logic** — Acceptance Criteria nói A nhưng User Flow mô tả B
2. **Assumptions ngầm** — thông tin bị bỏ qua mà agent phải giả định
3. **Missing acceptance criteria** — luồng ngoại lệ chưa có tiêu chí chấp nhận
4. **Business rule gaps** — quy tắc chưa rõ giới hạn cụ thể

### Gaps riêng theo loại task

| Loại | Gaps đặc thù |
|------|-------------|
| 📱 APP | Behavior khi app background/foreground? Offline mode? Permission denied? Biometric fallback? Deep link format? Push notification payload? |
| 🌐 WEB | Responsive breakpoint cụ thể? Browser support? SEO impact? URL state khi back/refresh? Real-time hay polling? Export format? |
| 🔌 API | Idempotency key? Rate limit rule? Error code mapping? Pagination strategy? Webhook vs polling? Schema versioning? |

### Output Phase 3
Danh sách câu hỏi cần làm rõ, sắp xếp theo mức độ:
1. 🔴 **Critical** — block nếu không có câu trả lời
2. 🟡 **Important** — ảnh hưởng đáng kể đến implementation
3. 🟢 **Nice-to-have** — có thể quyết định sau

---

## Phase 4: Interview-me — Làm rõ yêu cầu

### Quy trình
1. Agent tự động invoke skill `interview-me`
2. Trình bày **hypothesis** kèm **confidence level** cho từng điểm mơ hồ
3. Hỏi user **từng câu một** (kèm guess) — bắt đầu từ câu 🔴 Critical
4. Ghi nhận câu trả lời, cập nhật vào draft
5. Tiếp tục cho đến khi đạt **≥90% confidence** trên tất cả các chiều

### Xử lý "không biết"
Nếu user trả lời "không biết" hoặc "cần confirm với team khác":
- Agent ghi nhận thành **Open Question** trong file final
- **KHÔNG block pipeline** — tiếp tục sang Phase 5

---

## Phase 5: Tổng hợp bản Markdown chi tiết

### File output
📄 `specs/jira-import/{issueKey}/ba-spec/{issueKey}-final.md`

### Template header (chung cho tất cả loại task)
```markdown
# [{issueKey}] <Summary>

**Jira Link:** {JIRA_BASE_URL}/browse/{issueKey} ← cho phép click vào link để mở Jira
**Loại task:** 📱 APP | 🌐 WEB | 🔌 API  | OpenAPI | WebSocket ← tự detect
**Priority:** <Priority> | **Status:** <Status>
**Assignee:** <Assignee> | **Reporter:** <Reporter>
**Labels:** <Labels> | **Sprint:** <Sprint>
**Ngày trích xuất:** <Date>
**Source PDF:** [{issueKey}.pdf](./source/{issueKey}.pdf)
```

### Sections 2–8 thay đổi theo loại task

| Section | 📱 APP | 🌐 WEB | 🔌 API |
|---------|--------|--------|--------|
| 2 | Màn hình & Navigation | Page & Layout & URL Routing | Endpoints Overview |
| 3 | UI Components & Platform | UI Components & Responsive | Request Schema |
| 4 | Form & Input | Form & Input | Response Schema & Error Codes |
| 5 | User Flow & Gesture | User Flow & Redirect | Security (Key, Signature, Auth) |
| 6 | Authentication (PIN/OTP/Bio) | Authentication (Session/SSO) | Validation Rules |
| 7 | Offline & Push Notification | Data Display & Real-time | Dependencies & Data Flow |
| 8 | Business Rules & Edge Cases | Business Rules & Edge Cases | Business Rules & Edge Cases |

### Sections cố định (9–12)
- **9. Acceptance Criteria (Reframed)**
- **10. Assumptions & Decisions**
- **11. Open Questions**
- **12. Tham khảo**

### Quy tắc quan trọng
> File `*-final.md` là **single source of truth** sau khi import từ Jira.
> Tất cả các bước tiếp theo (`/tech-spec`, `/planning`, `/qa-test-design`) đều đọc từ file này.

---

## Sau khi hoàn thành

Hỏi user muốn tiếp tục với pipeline nào:

| Tùy chọn | Command | Mô tả |
|-----------|---------|-------|
| Thiết kế test | `/qa-test-design` | Tạo checklist + BDD Gherkin |
| Sinh automation test | `/qa-auto-design` | Sinh code test từ Gherkin file (yêu cầu đã có `.feature`) |
| Full QA pipeline | `/qa-pipeline` | Tự động: ba-spec → checklist → Gherkin → sinh code → chạy test → báo cáo |

### Quy trình QA tổng thể

```
Giai đoạn 1              Giai đoạn 2              Giai đoạn 3              Giai đoạn 4
/ba-spec            →   /qa-test-design      →   /qa-auto-design           →   Báo cáo
Import Jira              Thiết kế Checklist       Sinh code automation     Chạy test &
→ Phân tích spec         → Viết Gherkin file      → Review code            Xuất report
                                                  → Chạy test
```

