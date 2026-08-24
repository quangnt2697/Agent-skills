---
name: ba-spec
description: >
  Import tài liệu từ Jira/Confluence, tự động scan tài liệu tham chiếu,
  trình danh sách duyệt trước khi tải, nhận diện loại task, trích xuất &
  phân tích đa nguồn, chạy interview-me làm rõ, tổng hợp thành markdown chi tiết.
  Sử dụng khi cần import và phân tích một Jira issue hoặc trang Confluence thành Business-Spec (*-final.md) để bàn giao cho QA/DEV.
  Trigger: "import jira", "/ba-spec {issueKey}", "/ba-spec confluence {keyword}".
---

# Skill: ba-spec

## Mục đích

Tự động hoá quy trình import và phân tích tài liệu từ **Jira** và **Confluence**:

- **Luồng Jira:** `{issueKey}` → Scan tham chiếu → Duyệt → Tải → Phân tích đa nguồn → `final.md`
- **Luồng Confluence:** `{keyword}` → Tìm kiếm → Duyệt → Tải → Phân tích đa nguồn → `final.md`

---

## Khi nào sử dụng

- Có issueKey Jira với yêu cầu tương đối rõ ràng, cần phân tích và tổng hợp thành Business-Spec
- Có keyword Confluence, cần gom tài liệu thiết kế rải rác thành một nguồn sự thật duy nhất
- Bắt đầu bất kỳ pipeline nào cần spec làm đầu vào (`/qa-test-design`, `/tech-spec`, `/e2e-delivery`)
- Cần tài liệu bàn giao cho QA và DEV cùng đọc, thay vì mỗi bên tự diễn giải Jira theo cách riêng

**KHÔNG sử dụng khi:**
- Jira chỉ có ý tưởng thô, mơ hồ, cần brainstorm để làm rõ trước → dùng `ba-refine`
- Không có Jira/Confluence, chỉ có code đang chạy → dùng `qa-code2spec`
- Đã có `/project-root/workspace/{issueKey}/spec/final.md` và không có gì thay đổi — đọc file đó, đừng import lại
- Chỉ cần làm rõ vài điểm mơ hồ trong spec đã có → dùng `ba-interview-me`

## Điều kiện Tiên quyết (Authentication)

Agent **BẮT BUỘC TỰ ĐỘNG** đọc file `.env` để lấy các biến môi trường mà **KHÔNG CẦN HỎI** người dùng.

**Thứ tự tìm file `.env`** — lấy file đầu tiên tồn tại:
1. `${CLAUDE_PROJECT_DIR}/.env` — trong repo hiện tại
2. `${CLAUDE_PROJECT_DIR}/../.env` — workspace root (thư mục cha của repo)
3. `.env` tại thư mục làm việc hiện tại

```bash
# Tìm .env theo thứ tự ưu tiên
for p in "${CLAUDE_PROJECT_DIR:-.}/.env" "${CLAUDE_PROJECT_DIR:-.}/../.env" ".env"; do
  [ -f "$p" ] && ENV_FILE="$p" && break
done
```

Các biến cần có:

```
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

Chỉ báo lỗi khi không tìm thấy `.env` ở cả 3 vị trí, hoặc file có nhưng thiếu biến — khi đó dừng theo **trường hợp 2** của `.claude/rules/autonomy-contract.md`. Tuyệt đối không dừng lại để xin phép truy cập file.

---

## Cấu trúc Thư mục

Cả hai luồng (Jira và Confluence) đều sinh ra **cùng một cấu trúc** — chỉ khác khoá của
đơn vị công việc: luồng Jira dùng `{issueKey}`, luồng Confluence dùng `{keyword}`.
Nguồn gốc (jira hay confluence) được ghi trong `metadata.json`, không nằm trong tên thư mục.

```text
/project-root/workspace/{issueKey}/                                  # LUỒNG A — /ba-spec {issueKey}
├── source/
│   ├── {issueKey}.pdf
│   ├── metadata.json
│   └── refs/
│       ├── {tên-slug}-{pageId}.pdf                    # Confluence tham chiếu
│       ├── wireframe-v3.pdf                           # Attachment gốc
│       └── flowchart-order-flow.png                   # Ảnh đính kèm
└── spec/
    └── final.md

/project-root/workspace/{keyword}/                                   # LUỒNG B — /ba-spec confluence {keyword}
├── source/
│   ├── {tên-slug}-{pageId}.pdf                        # Trang Confluence gốc
│   ├── metadata.json
│   └── refs/
│       ├── {tên-slug-con}-{childPageId}.pdf           # Confluence con
│       ├── mockup-checkout-page.png                   # Ảnh đính kèm
│       └── data-mapping.xlsx                          # File đính kèm
└── spec/
    └── final.md
```

### Quy ước Đặt tên File

**Confluence pages:** `{tên-ngắn-gọn-slug}-{pageId}.pdf`
- Viết thường, bỏ dấu tiếng Việt, thay khoảng trắng bằng `-`.
- Cắt tối đa 50 ký tự phần tên (trước pageId).
- VD: `"Thiết kế luồng Thanh Toán VNPay"` (pageId: 12345) → `thiet-ke-luong-thanh-toan-vnpay-12345.pdf`

**File đính kèm:** Giữ nguyên tên gốc từ Jira/Confluence.

---

## Bộ lọc Định dạng File

| Nhóm           | Định dạng                              | Hành động                                  |
|----------------|----------------------------------------|--------------------------------------------|
| 📄 Văn bản     | `.pdf, .doc, .docx, .txt, .md, .rtf`   | ✅ Tải + Đọc nội dung                      |
| 📊 Bảng tính   | `.xls, .xlsx, .csv`                    | ✅ Tải + Trích xuất data                   |
| 🖼️ Hình ảnh    | `.png, .jpg, .jpeg, .gif, .svg, .webp` | ✅ Tải (wireframe, mockup, flowchart, ERD) |
| 📐 Sơ đồ       | `.drawio, .vsdx, .figma`               | ✅ Tải (giữ nguyên format)                 |
| 💻 Code/Config | `.json, .yaml, .xml, .sql`             | ✅ Tải + Đọc nội dung                      |
| 🎬 Video       | `.mp4, .mov, .avi`                     | ❌ Bỏ qua (quá nặng)                       |
| 📦 Nén         | `.zip, .rar, .7z, .tar.gz`             | ❌ Bỏ qua (không đọc trực tiếp được)       |

---

## LUỒNG A: `/ba-spec {issueKey}` — Import từ Jira

### Workflow tổng quan

```
Phase 0              Phase 1              Phase 1.5           Phase 2
Scan & Duyệt   ──→  Tải file thiếu  ──→  Nhận diện     ──→  Trích xuất
danh sách                                 loại task          theo profile
    │                    │                    │                   │
    ▼                    ▼                    ▼                   ▼
[Auto+Approval]       [Auto]              [Auto]              [Auto]

            Phase 3           Phase 4           Phase 5
        ──→ Phân tích &  ──→  Interview-me ──→  Tổng hợp
            xác định gaps     làm rõ gaps       final.md
                │                 │                │
                ▼                 ▼                ▼
              [Auto]        [Interactive]       [Auto]
```

---

### Phase 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)

**Mục tiêu:** Trước khi tải bất kỳ file nào, quét nhanh Jira task để tìm tất cả tài liệu Confluence/file đính kèm liên quan, đối chiếu với file đã có trong dự án, rồi trình danh sách cho User duyệt.

**Các bước:**

1. **Gọi API lấy metadata Jira** (chưa tải PDF):
   ```
   GET /rest/api/3/issue/{issueKey}?fields=summary,description,attachment,issuelinks,status,priority,assignee,reporter,labels,sprint
   ```

2. **Trích xuất danh sách liên kết tham chiếu:**
   - Từ field `issuelinks`: Lấy các Confluence page được link.
   - Gọi thêm Remote Links: `GET /rest/api/3/issue/{issueKey}/remotelink` — lấy link Confluence/trang ngoài.
   - Từ field `description`: Dùng Regex quét URL chứa pattern `*/wiki/spaces/*` hoặc `*/wiki/pages/*`.
   - Từ field `attachment`: Lấy danh sách file đính kèm (tên, dung lượng, định dạng).
   - ⚠️ **LỌC BỎ (Ignore):** Tự động loại bỏ các link tham chiếu là tài liệu chung của dự án (VD: "Guidelines", "Template", "Hướng dẫn", "Quy trình") thường có sẵn trong template mô tả Jira.

3. **Tìm kiếm mở rộng bằng Tên Task (Summary):**
   - Lấy giá trị trường `summary` của Jira (VD: `Là khách hàng, tôi muốn biết những mã nào giao dịch theo Random End`).
   - Lọc các từ khóa chính từ `summary` để tạo `{keyword}` (VD: `mã giao dịch theo Random End`).
   - Tìm kiếm Confluence: `GET /wiki/rest/api/search?cql=text~"{keyword}" OR title~"{keyword}"&limit=5`
   - Tìm kiếm Jira task liên quan: `GET /rest/api/3/search?jql=summary~"{keyword}" AND issuekey != {issueKey}&maxResults=5`
   - Gộp các kết quả tìm được vào danh sách tài liệu cần duyệt.

4. **Kiểm tra Cache — file đã tải trước đó:**
   - Với mỗi Confluence pageId → Quét `/project-root/workspace/{issueKey}/source/refs/` xem đã có file `*-{pageId}.pdf` chưa (kể cả từ lần chạy `ba-refine` trước — cả hai skill dùng chung thư mục này).
   - Với mỗi attachment → Kiểm tra tên file đã tồn tại trong dự án chưa.

5. **Trình bảng Danh sách cho User duyệt:**

   ```markdown
   📋 **Danh sách tài liệu liên quan đến {issueKey}:**

| # | Loại          | Tên                                          | Trạng thái   | Đường dẫn / Hành động                                       |
|---|---------------|----------------------------------------------|--------------|-------------------------------------------------------------|
| 1 | 📄 Jira PDF   | {issueKey} - {Tiêu đề Task}                  | 🆕 Chưa tải  | → Sẽ tải mới                                                |
| 2 | 📝 Confluence | Thiết kế luồng thanh toán (ID: 12345)        | ✅ Đã có     | `/project-root/workspace/{issueKey}/source/refs/thiet-ke-luong-12345.pdf` |
| 3 | 📝 Confluence | API Specification v2 (ID: 67890)             | 🆕 Chưa tải  | → `api-specification-v2-67890.pdf`                          |
| 4 | 📄 Jira PDF   | {relatedIssueKey} - {Tiêu đề Task liên quan} | 🆕 Chưa tải  | → Sẽ tải mới                                                |
| 5 | 📎 File       | wireframe-v3.pdf (2.1MB)                     | 🆕 Chưa tải  | → Sẽ tải mới                                                |
| 6 | 🖼️ Ảnh        | flowchart-order-flow.png (800KB)             | 🆕 Chưa tải  | → Sẽ tải mới                                                |
| 7 | 🎬 Video      | demo-flow.mp4 (50MB)                         | ⏭️ Bỏ qua     | Định dạng không hỗ trợ                                      |

   **Tổng cộng:** 5 file cần tải mới, 1 file đã có sẵn, 1 file bỏ qua.

   Bạn có muốn tôi tiến hành tải không? (Gõ **OK** hoặc chỉnh sửa danh sách)
   ```

6. **DỪNG LẠI (Approval Gate):** Chờ User phản hồi "OK" hoặc chỉnh sửa.

---

### Phase 1: Download (Chỉ tải những gì còn thiếu)

Sau khi User đồng ý:

1. **Tải Jira task thành PDF:**
   - **Phương án A** (ưu tiên): Gọi endpoint HTML view → dùng `wkhtmltopdf` convert thành PDF.
   - **Phương án B** (fallback): Viết script python gọi Jira API convert ADF sang Markdown rồi chuyển thành PDF.
   - ⚠️ **LƯU Ý QUAN TRỌNG VỀ FILE TẠM:** Nếu cần viết script python để convert (hoặc tải file json trung gian), **TUYỆT ĐỐI KHÔNG** tạo thư mục `scratch/` hay `temp/` trong thư mục dự án của user. Bắt buộc phải tạo file script và file json trong `/tmp/` của hệ điều hành hoặc thư mục `scratch/` của system artifacts, sau đó copy kết quả về thư mục đích và dọn dẹp file tạm.

2. **Tải các Confluence page chưa có:**
   - Lấy metadata mỗi page: `GET /wiki/rest/api/content/{pageId}`
   - Export PDF: `GET /wiki/spaces/flyingpdf/pdfpageexport.action?pageId={pageId}`
   - Tải file đính kèm của Confluence: `GET /wiki/rest/api/content/{pageId}/child/attachment`
   - Lưu với quy ước tên: `{tên-slug}-{pageId}.pdf`

3. **Tải các file attachment Jira chưa có** (giữ nguyên tên gốc).

4. **Tạo `metadata.json`:**
   ```json
   {
     "issueKey": "PROJ-123",
     "summary": "...",
     "task_type": "APP",
     "references": [
       {
         "type": "confluence",
         "pageId": "12345",
         "title": "Thiết kế luồng thanh toán",
         "status": "downloaded",
         "path": "source/refs/thiet-ke-luong-thanh-toan-12345.pdf"
       },
       {
         "type": "confluence",
         "pageId": "67890",
         "title": "API Specification v2",
         "status": "cached",
         "path": "../../confluence/api-spec/source/api-specification-v2-67890.pdf"
       },
       {
         "type": "attachment",
         "filename": "wireframe-v3.pdf",
         "status": "downloaded",
         "path": "source/refs/wireframe-v3.pdf"
       }
     ]
   }
   ```

5. **Lưu tất cả vào:** `/project-root/workspace/{issueKey}/source/` (PDF gốc + `metadata.json`) và `/project-root/workspace/{issueKey}/source/refs/` (Confluence + attachment).

---

### Phase 1.5: Nhận diện loại task

Đọc trường `summary` (tên task) từ JSON metadata, tìm tag prefix:

| Tag trong tên task                            | Loại task                    | Profile áp dụng             |
|-----------------------------------------------|------------------------------|-----------------------------|
| `[APP]`                                       | 📱 Mobile App                | `references/profile-app.md` |
| `[WEB]`                                       | 🌐 Web Application           | `references/profile-web.md` |
| `[OpenAPI]` / `[BE]` / `[WS]` / `[WebSocket]` | 🔌 Backend / API / WebSocket | `references/profile-api.md` |
| Không có tag / Nhiều tag                      | 🔀 Hybrid                    | Kết hợp tất cả profiles     |

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

### Xử lý khi không chắc chắn
Nếu summary không chứa tag nhưng nội dung PDF gợi ý rõ ràng 1 loại cụ thể,
agent hỏi user **1 câu duy nhất** để confirm trước khi tiếp tục:

```
Tên task không chứa tag [APP]/[WEB]/[OpenAPI]/[BE]/[WS]/[WebSocket].
Từ nội dung PDF, tôi nhận thấy đây có vẻ là task về {task_type}.
Bạn xác nhận đây là task loại gì?
```

---

### Phase 2: Trích xuất có cấu trúc theo Profile (ĐỌC ĐA NGUỒN)

Agent **BẮT BUỘC ĐỌC QUA TOÀN BỘ** các tài liệu đã được user cấp phép tải về (bao gồm cả các Jira task và Confluence liên quan) để lấy thông tin hoàn chỉnh. Danh sách tài liệu cần đọc bao gồm:
- File PDF gốc của Jira task chính.
- Các file PDF của **các Jira task liên quan** (từ bước tìm kiếm mở rộng).
- Các file Confluence/attachment mới tải trong `source/refs/`.
- Các file Confluence/attachment **đã có sẵn** (theo path ghi trong `metadata.json`).

Sau đó đọc file profile tương ứng:
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

### Phase 3: Phân tích yêu cầu & Xác định gaps (ĐỌC ĐA NGUỒN)

Dựa trên việc đọc **TOÀN BỘ** các Jira task, Confluence page và file tham chiếu liên quan, Agent tiến hành đối chiếu thông tin để phát hiện gaps toàn diện:

### Gaps chung (tất cả loại task)
1. **Xung đột logic** — Acceptance Criteria nói A nhưng User Flow mô tả B
2. **Assumptions ngầm** — thông tin bị bỏ qua mà agent phải giả định
3. **Missing acceptance criteria** — luồng ngoại lệ chưa có tiêu chí chấp nhận
4. **Business rule gaps** — quy tắc chưa rõ giới hạn cụ thể

### Gaps riêng theo loại task

| Loại   | Gaps đặc thù                                                                                                                              |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------|
| 📱 APP | Behavior khi app background/foreground? Offline mode? Permission denied? Biometric fallback? Deep link format? Push notification payload? |
| 🌐 WEB | Responsive breakpoint cụ thể? Browser support? SEO impact? URL state khi back/refresh? Real-time hay polling? Export format?              |
| 🔌 API | Idempotency key? Rate limit rule? Error code mapping? Pagination strategy? Webhook vs polling? Schema versioning?                         |

### Output Phase 3
Danh sách câu hỏi cần làm rõ, sắp xếp theo mức độ:
1. 🔴 **Critical** — block nếu không có câu trả lời
2. 🟡 **Important** — ảnh hưởng đáng kể đến implementation
3. 🟢 **Nice-to-have** — có thể quyết định sau

---

### Phase 4: Interview-me — Làm rõ yêu cầu

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

### Phase 5: Tổng hợp bản Markdown chi tiết

### File output
📄 `/project-root/workspace/{issueKey}/spec/final.md`
*(Hoặc `/project-root/workspace/{keyword}/spec/final.md` đối với luồng Confluence)*

⚠️ **LƯU Ý QUAN TRỌNG VỀ ĐƯỜNG DẪN:**
Luôn tạo file output tại ĐÚNG đường dẫn cấu trúc `/project-root/workspace/{issueKey}/spec/final.md` (tương đối từ thư mục gốc của dự án `${CLAUDE_PROJECT_DIR}`). TUYỆT ĐỐI KHÔNG lưu file với tên `{issueKey}-final.md` ngay tại thư mục gốc của dự án.

### Bước kiểm tra trước khi ghi đè (Overwrite check):
Trước khi tạo/ghi đè file output, Agent **BẮT BUỘC** kiểm tra xem file `/project-root/workspace/{issueKey}/spec/final.md` (hoặc đối với Confluence là `/project-root/workspace/{keyword}/spec/final.md`) đã tồn tại trong dự án chưa.
- Nếu đã tồn tại, Agent **BẮT BUỘC** hỏi người dùng: "File `/project-root/workspace/{issueKey}/spec/final.md` đã tồn tại. Bạn có muốn ghi đè lên file cũ bằng bản tổng hợp mới không? (Yes/No)".
- Nếu User chọn "No", Agent không ghi đè, giữ nguyên file cũ, và **bắt buộc tiếp tục tự động** sang bước tiếp theo của luồng (vd: chuyển sang kỹ năng `/qa-test-design` hoặc `/tech-spec`).
- Nếu User chọn "Yes" (hoặc file chưa tồn tại), Agent tiến hành tạo/ghi đè file output theo template dưới đây.

### Template header (chung cho tất cả loại task)
```markdown
# [{issueKey}] <Summary>

**Jira Link:** {ATLASSIAN_BASE_URL}/browse/{issueKey}
**Loại task:** 📱 APP | 🌐 WEB | 🔌 API | OpenAPI | WebSocket ← tự detect
**Priority:** <Priority> | **Status:** <Status>
**Assignee:** <Assignee> | **Reporter:** <Reporter>
**Labels:** <Labels> | **Sprint:** <Sprint>
**Ngày trích xuất:** <Date>
**Source PDF:** [{issueKey}.pdf](./source/{issueKey}.pdf)
**Tài liệu tham chiếu:** [Xem danh sách](./source/metadata.json)
```

### Sections 2–8 thay đổi theo loại task

| Section   | 📱 APP                       | 🌐 WEB                       | 🔌 API                          |
|-----------|------------------------------|------------------------------|---------------------------------|
| 2         | Màn hình & Navigation        | Page & Layout & URL Routing  | Endpoints Overview              |
| 3         | UI Components & Platform     | UI Components & Responsive   | Request Schema                  |
| 4         | Form & Input                 | Form & Input                 | Response Schema & Error Codes   |
| 5         | User Flow & Gesture          | User Flow & Redirect         | Security (Key, Signature, Auth) |
| 6         | Authentication (PIN/OTP/Bio) | Authentication (Session/SSO) | Validation Rules                |
| 7         | Offline & Push Notification  | Data Display & Real-time     | Dependencies & Data Flow        |
| 8         | Business Rules & Edge Cases  | Business Rules & Edge Cases  | Business Rules & Edge Cases     |

### Sections cố định (9–13)
- **9. Acceptance Criteria (Reframed)**
- **10. Assumptions & Decisions**
- **11. Open Questions**
- **12. Tài liệu Tham chiếu** — Danh sách link + path tới tất cả Confluence/file references đã sử dụng
- **13. Traceability Matrix** — Ánh xạ giữa yêu cầu nghiệp vụ ↔ tài liệu nguồn

### Quy tắc quan trọng
> File `/project-root/workspace/{issueKey}/spec/final.md` là **single source of truth** sau khi import.
> Tất cả các bước tiếp theo (`/tech-spec`, `/plan`, `/qa-test-design`) đều đọc từ file này.

---

## LUỒNG B: `/ba-spec confluence {keyword}` — Import từ Confluence

### Phase 1A: Tìm kiếm & Xác nhận (APPROVAL GATE)

1. **Tìm kiếm bằng CQL:**
   ```
   GET /wiki/rest/api/search?cql=title~"{keyword}" OR text~"{keyword}"&limit=5
   ```

2. **Hiển thị top 3-5 kết quả:**
   ```markdown
   📋 **Kết quả tìm kiếm Confluence cho "{keyword}":**

| # | Tiêu đề                         | Space   | Tác giả   | Cập nhật   |
|---|---------------------------------|---------|-----------|------------|
| 1 | Thiết kế luồng thanh toán VNPay | DEV     | Nguyen A  | 2024-01-10 |
| 2 | API Specification - Payment     | API     | Tran B    | 2024-01-08 |
| 3 | Checklist UAT thanh toán        | QA      | Le C      | 2023-12-20 |

   Bạn muốn tải tài liệu nào? (Gõ số thứ tự, VD: **1** hoặc **1,2**)
   ```

3. **DỪNG LẠI** chờ User chọn.

### Phase 1B: Scan & Duyệt References (APPROVAL GATE)

Sau khi User chọn trang, Agent quét trang đó để tìm references (Depth=1):

1. **Quét nội dung trang** để tìm link tới Confluence page khác.
2. **Lấy danh sách attachments:** `GET /wiki/rest/api/content/{pageId}/child/attachment`
3. **Kiểm tra Cache** (file đã có trong dự án chưa?).
4. **Trình danh sách cho User duyệt** (giống Phase 0 của Jira).
5. **DỪNG LẠI** chờ User đồng ý.

### Phase 1C: Download

Sau khi User đồng ý:
1. Tải trang Confluence gốc thành PDF: `{tên-slug}-{pageId}.pdf`
2. Tải các Confluence con (nếu có): `{tên-slug-con}-{childPageId}.pdf`
3. Tải các file đính kèm (giữ nguyên tên gốc).
4. Tạo `metadata.json` với danh sách references.
5. Lưu vào `/project-root/workspace/{keyword}/source/` (PDF trang gốc + `metadata.json`) và `/project-root/workspace/{keyword}/source/refs/` (trang con + attachment).

### Phase 2 → Phase 5: Phân tích & Tổng hợp

Chạy y hệt Luồng A (Jira) từ Phase 2 trở đi:
- Đọc trang gốc + tất cả references → Trích xuất → Phân tích gaps → Interview-me → Tổng hợp vào `/project-root/workspace/{keyword}/spec/final.md`.

---

## Chiến lược Scan Hiệu quả (Chống Tốn Thời Gian)

| Chiến lược | Mô tả |
|-----------|-------|
| **Depth = 1** | Chỉ scan link ở tầng trực tiếp. KHÔNG đào sâu thêm. |
| **API-first** | Ưu tiên dùng REST API (`issuelinks`, `remotelink`, `attachment`, CQL search) thay vì để AI đọc text tìm link. Nhanh hơn 10x. |
| **Cache Check** | Trước khi tải, luôn kiểm tra file đã có trong dự án (`/project-root/workspace/{issueKey}/source/refs/`). Tiết kiệm thời gian và bandwidth. |
| **Smart Filter** | Chỉ tải file trong bộ lọc cho phép (xem bảng ở trên). Bỏ qua video, file nén. |
| **Approval Gate** | Luôn trình danh sách cho User duyệt trước khi tải. User có quyền loại bỏ file không cần thiết. |

---

## Các Biện hộ Thường gặp

| Lý do biện hộ | Thực tế |
|---|---|
| "Jira mô tả đủ rồi, khỏi cần scan Confluence tham chiếu" | Phần lớn business rule chi tiết nằm ở trang thiết kế được link, không nằm trong mô tả Jira. Bỏ scan là bỏ sót nguồn chính. |
| "Ảnh wireframe/flowchart không đọc được, bỏ qua" | Wireframe và flowchart là nơi luồng người dùng được định nghĩa rõ nhất. Tải về và đọc — chúng nằm trong bộ lọc cho phép vì lý do đó. |
| "Có 3 chỗ mơ hồ nhưng tôi đoán được, viết luôn cho nhanh" | Đoán sai ở tầng spec sẽ nhân lên thành checklist sai, Gherkin sai, và test sai. Đây chính là lý do Phase 4 tồn tại. |
| "Confidence mới 78%, cứ ghi vào rồi chạy tiếp" | Đúng — chạy tiếp là hành vi đúng. Nhưng phải ghi gap vào mục *Giả định & Rủi ro*, không được im lặng lấp đầy chỗ trống. |
| "File `final.md` đã tồn tại, hỏi user có ghi đè không" | Ghi đè. Bản cũ đã nằm trong git history. Đây là câu hỏi thừa theo `autonomy-contract.md`. |
| "Task này đơn giản, không cần đủ 13 section" | Section không áp dụng thì ghi rõ "Không áp dụng" kèm lý do. Bỏ trống khiến người đọc sau không phân biệt được *không cần* với *quên mất*. |
| "Copy nguyên mô tả Jira vào final.md cho nhanh" | `final.md` là kết quả phân tích, không phải bản sao. Chép nguyên nghĩa là chưa làm gì cả. |

## Dấu hiệu Cảnh báo (Red Flags)

- File `final.md` không có mục Acceptance Criteria, hoặc AC viết dạng mô tả thay vì checklist rule
- Mục Open Questions rỗng ở một task không tầm thường — chưa phân tích đủ sâu, không phải đã rõ hết
- Business Rule viết bằng tính từ mơ hồ: "hợp lệ", "nhanh", "phù hợp" — QA không chuyển được thành test data
- Danh sách đóng (loại lệnh, trạng thái tài khoản, loại thị trường) chỉ liệt kê ví dụ thay vì liệt kê đủ
- Không có mục *Giả định & Rủi ro* dù quá trình phân tích có chỗ phải đoán
- Chỉ đọc file PDF của Jira, bỏ qua toàn bộ file trong `source/refs/`
- Có tài liệu tham chiếu tải về nhưng không đoạn nào trong `final.md` trích dẫn tới
- Spec chứa API contract, database schema, hoặc test case — vượt ranh giới BA/PO (xem CLAUDE.md)
- Loại task (APP/WEB/API) không được nhận diện, nên trích xuất theo profile sai

## Xác minh

Trước khi bàn giao spec cho QA hoặc DEV:

- [ ] File tồn tại tại `/project-root/workspace/{issueKey}/spec/final.md` và không rỗng
- [ ] Header khai báo rõ loại task (📱 APP / 🌐 WEB / 🔌 API)
- [ ] Đủ 13 section — section không áp dụng phải ghi "Không áp dụng" kèm lý do, không để trống
- [ ] Mỗi tài liệu đã tải trong `source/` và `source/refs/` được trích dẫn ít nhất một lần
- [ ] Mỗi Business Rule phát biểu được dưới dạng kiểm chứng được (có ngưỡng, có giá trị, có điều kiện)
- [ ] Mọi danh sách đóng liệt kê đủ giá trị, không dùng "v.v." hay "..."
- [ ] Mỗi Acceptance Criteria là một mệnh đề Pass/Fail duy nhất
- [ ] Câu hỏi 🔴 Critical đã được trả lời qua Phase 4, hoặc được nêu rõ là điểm dừng theo trường hợp 3 của `autonomy-contract.md`
- [ ] Gap chưa giải quyết được ghi vào mục *Giả định & Rủi ro* kèm mức ảnh hưởng
- [ ] Không chứa Tech-Spec, API contract, database schema, hay test case

---

## Sau khi hoàn thành

**BẮT BUỘC:** Không dừng lại hỏi user muốn tiếp tục với pipeline nào. Tự động chuyển sang kỹ năng `qa-test-design` để bắt đầu làm Checklist, và chạy tiếp xuyên suốt theo `.claude/rules/autonomy-contract.md` — bao gồm cả cổng Giai đoạn 1 → Giai đoạn 2 của `qa-test-design`.

> Chỉ dừng khi rơi vào danh sách đóng 5 trường hợp của `autonomy-contract.md`, hoặc khi user chạy với `--step`.

### Quy trình tổng thể

```
Giai đoạn 1              Giai đoạn 2              Giai đoạn 3              Giai đoạn 4
/ba-spec            →   /tech-spec           →   /plan                →   /build
Import Jira/Conf         Thiết kế kỹ thuật        Chia nhỏ task            Code implementation
→ Phân tích spec         → API Contract           → Kiểm soát scope       → Incremental
→ Tổng hợp final.md      → Data Model                                     → Test-driven

                    hoặc

/ba-spec            →   /qa-test-design      →   /qa-auto-design      →   Báo cáo
Import Jira/Conf         Thiết kế Checklist       Sinh code automation     Chạy test &
→ Phân tích spec         → Viết Gherkin file      → Review code            Xuất report
                                                  → Chạy test
```
