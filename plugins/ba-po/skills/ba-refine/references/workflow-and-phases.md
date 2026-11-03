# Quy trình Mài giũa (ba-refine Workflow)

Tài liệu này chứa chi tiết các bước từ Tải tài liệu đến Đẩy ngược lên Jira của kỹ năng `ba-refine`.

## Giai đoạn 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)

**Mục tiêu:** Quét Jira/Confluence tìm tài liệu liên quan, đối chiếu với file đã có, trình danh sách cho user duyệt TRƯỚC KHI tải

1. **Chuẩn hoá `{issueKey}` TRƯỚC MỌI THỨ KHÁC**

   User thường dán nguyên URL từ thanh địa chỉ trình duyệt. Nếu dùng thẳng chuỗi
   đó làm `{issueKey}`, cả URL sẽ trở thành tên thư mục
   (`/project-root/workspace/https:/your-domain.atlassian.net%2Fbrowse%2F.../spec/refined.md`) và
   mọi handoff phía sau đứt.

   ```bash
   # Chấp nhận: "G3PTP-17057" | ".../browse/G3PTP-17057" | ".../browse/G3PTP-17057#icft=G3PTP-17057"
   ISSUE_KEY=$(echo "$ARGUMENTS" | grep -oiE '[A-Z][A-Z0-9]*-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
   [ -z "$ISSUE_KEY" ] && { echo "❌ Không nhận diện được Jira issue key từ: $ARGUMENTS"; exit 1; }
   echo "✅ issueKey = $ISSUE_KEY"
   ```

   Từ đây trở đi, `{issueKey}` LUÔN là giá trị đã chuẩn hoá này — không bao giờ
   là chuỗi thô user nhập.

2. **Đọc credentials từ `.env`**
   ```bash
   # Nguồn chính: đọc từ plugin dir (KHÔNG HỎI user)
   source "${PLUGIN_DIR}/.env"
   # Override: nếu project có .env riêng
   [ -f "${PROJECT_ROOT}/.env" ] && source "${PROJECT_ROOT}/.env"
   ```

3. **Lấy metadata Jira issue** (chưa tải PDF) theo **n8n Fast-Path**:
   - **n8n Fast-Path (Bắt buộc):** Import và chạy hàm `prepJiraContext(issueKey)` từ `scripts/lib/n8n-client.js`. Hệ thống tự động gọi webhook `/webhook/jira-prep` để lấy metadata JSON siêu sạch (có cả `attachments` và `issueLinks`). BẮT BUỘC dùng `summary` từ đây làm Tiêu đề Task.
   - Nếu n8n offline: báo ngay cho user "n8n chưa chạy — khởi động bằng `npm run n8n`" và **DỪNG**.

4. **Trích xuất danh sách liên kết & Tìm kiếm mở rộng qua Từ khóa Tiêu đề (Summary Keywords):**
   - **Bóc tách Từ khóa Tiêu đề:** Bóc tách các từ khóa nghiệp vụ từ trường `summary` (loại bỏ prefix `[WEB]`, `[APP]` và stopwords) để đưa vào mảng `extractedKeywords`.
   - **Tìm kiếm Task liên quan:** Tự động chạy JQL tìm top 3-5 issue tương đồng trong cùng project (lưu vào `relatedSearchIssues`).
   - Từ `issuelinks`: Lấy Confluence pages được link
   - **Gọi Remote Links:** Dùng danh sách `issueLinks` từ payload n8n hoặc gọi `GET /rest/api/3/issue/{issueKey}/remotelink` → Lấy link Confluence.
   - Từ `description`: Regex quét URL pattern `*/wiki/spaces/*` hoặc `*/wiki/pages/*`
   - Từ `attachment`: Lấy danh sách file đính kèm (tên, dung lượng, định dạng)

5. **Kiểm tra Cache — file đã tải trước đó:**
   - Với mỗi Confluence pageId → Quét `workspace/issues/{issueKey}/source/refs/` xem đã có `*-{pageId}.pdf` chưa (kể cả từ lần chạy `ba-spec` trước — cả hai skill dùng chung thư mục này)
   - Với mỗi attachment → Kiểm tra tên file đã tồn tại chưa

6. **Trình bảng Danh sách Tài liệu & Kết quả Tìm kiếm theo Từ khóa cho User duyệt (Gate 1):**

   ```markdown
📋 **Danh sách tài liệu & task liên quan đến {issueKey}:**
- **Từ khóa trích xuất từ Tiêu đề (`extractedKeywords`):** `{kw1}`, `{kw2}`, `{kw3}`
- **Task liên quan tìm được qua Từ khóa (`relatedSearchIssues`):** `[{relatedKey1}] {summary1}`, `[{relatedKey2}] {summary2}`

| # | Loại            | Tên                                      | Trạng thái         | Đường dẫn / Hành động                                        |
|---|------------------------------------------------------------|--------------------|--------------------------------------------------------------|
| 1 | 📄 Jira PDF     | {issueKey} - {Tiêu đề Task}              | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 2 | 🔗 Task liên quan| {relatedKey1} - {summary1}              | ✅ Đã quét JQL     | `workspace/issues/{issueKey}/source/jira-issue.json`         |
| 3 | 📝 Confluence   | Thiết kế luồng thanh toán (ID: 12345)    | ✅ Đã có           | `workspace/issues/{issueKey}/source/refs/thiet-ke-luong-12345.pdf`  |
| 4 | 📝 Confluence   | API Spec v2 (ID: 67890)                  | 🆕 Chưa tải        | → `api-spec-v2-67890.pdf`                                    |
| 5 | 📎 File         | wireframe-v3.pdf (2.1MB)                 | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 6 | 🖼️ Ảnh          | flowchart.png (800KB)                    | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 7 | 🎬 Video        | demo.mp4 (50MB)                          | ⏭️ Bỏ qua          | Định dạng không hỗ trợ                                       |

   **Tổng cộng:** 4 file cần tải mới, 2 mục đã có sẵn, 1 file bỏ qua.

   Bạn có muốn tôi tiến hành tải không? (Gõ **OK** hoặc chỉnh sửa)
   ```

7. **DỪNG LẠI (Approval Gate):** Chờ User phản hồi "OK" hoặc chỉnh sửa danh sách.

8. **Sau khi User đồng ý → Tạo thư mục làm việc TRƯỚC (BẮT BUỘC, không được bỏ qua):**

   Luôn neo (anchor) vào root của repo git rồi `cd` vào đó trước khi chạy bất kỳ lệnh tải file nào — KHÔNG dùng đường dẫn tương đối theo cwd hiện tại của agent.

   ```bash
   cd "$(git rev-parse --show-toplevel)"
   mkdir -p "workspace/issues/{issueKey}/source/refs"
   ```

9. **Tải file thiếu vào thư mục vừa tạo:**

   - **Tải Jira task PDF:** Dùng script từ ba-spec (cập nhật đường dẫn script):
     ```bash
     bash ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-spec/assets/jira-fetch-pdf.sh {issueKey} workspace
     ```

   - **Tải Confluence pages chưa có:**
     ```bash
     curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
       "${ATLASSIAN_BASE_URL}/wiki/spaces/flyingpdf/pdfpageexport.action?pageId={pageId}" \
       -o "workspace/issues/{issueKey}/source/refs/{tên-slug}-{pageId}.pdf"
     ```

   - **Tải attachments chưa có:** Giữ nguyên tên gốc, lưu vào cùng thư mục `source/refs/`
     ```bash
     curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
       "{attachment_content_url}" \
       -o "workspace/issues/{issueKey}/source/refs/{tên-file-gốc}"
     ```

   - ⚠️ **LƯU Ý:** File tạm phải tạo trong `/tmp/` hoặc system scratch, KHÔNG tạo `scratch/` trong dự án user

10. **Cập nhật hoặc tạo `metadata.json` (BẮT BUỘC dùng đúng `summary` đã trích xuất ở Bước 3):**
   ```json
   {
     "issueKey": "PROJ-123",
     "summary": "{Tiêu đề Task đã trích xuất ở Bước 3}",
     "task_type": "APP",
     "references": [
       {
         "type": "confluence",
         "pageId": "12345",
         "title": "Thiết kế luồng thanh toán",
         "status": "cached",
         "path": "../../imports/confluence/.../thiet-ke-luong-12345.pdf"
       },
       {
         "type": "confluence",
         "pageId": "67890",
         "title": "API Spec v2",
         "status": "downloaded",
         "path": "source/refs/api-spec-v2-67890.pdf"
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

11. **Tự động Quét Màn hình Hiện tại & Thiết kế Mockup Prod-Twin (ba-design-mockup):**
   Khi phát hiện task có liên quan tới giao diện (`task_type = "WEB"` hoặc `"APP"`):
   - **Ủy quyền cho kỹ năng `ba-design-mockup` thực thi:**
     1. Chạy script bóc tách tự động từ `origin/master`:
        ```bash
        node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/extract-asis-ui.js \
          --project web-trading --screen {ScreenKey} --output "workspace/issues/{issueKey}/spec"
        ```
        *(Sinh ra cặp file: `spec/asis-inventory.json` và `spec/asis-inventory.md`)*
     2. Chọn Production App Shell phù hợp trong `plugins/ba-po/skills/ba-design-mockup/assets/shells/`:
        - `web-trading-shell.html` (Giao dịch 2 cột)
        - `web-assets-dashboard-shell.html` (Quản lý tài sản & Dashboard)
        - `web-modal-confirm-shell.html` (Modal xác nhận lệnh / OTP)
        - `mobile-order-sheet-shell.html` (Đặt lệnh Mobile)
        - `mobile-app-shell.html` (Sổ lệnh & Quản lý Deal)
        - `mobile-bottom-sheet-shell.html` (Xác thực Smart OTP)
     3. Copy shell vào `workspace/issues/{issueKey}/spec/diagrams/mockup.html` và chèn phần tử Delta-Only (`data-change="added|modified"`) kèm huy hiệu `①`, `②`, `③`.
     4. Chạy kiểm định Hard Gate độ giống Prod:
        ```bash
        node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js \
          "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
          "workspace/issues/{issueKey}/spec/asis-inventory.json"
        ```
        *(Bắt buộc đạt Fidelity Score ≥ 90% trước khi chuyển sang Gate 2)*
     5. Render ảnh Retina 2x đa Case qua Playwright:
        ```bash
        node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/render-mockup.js \
          "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
          "workspace/issues/{issueKey}/spec/diagrams/mockup.png" fit 2 all
        ```
   - Quét Confluence + attachments, trình bảng tài liệu và task liên quan cho user duyệt qua **Gate 1**.

---

## Giai đoạn 1: Khai phóng theo 5 Chiều Nghiệp vụ (Business-Driven Divergence)

**Mục tiêu:** Mở rộng từ ý tưởng sơ khai/mơ hồ theo 5 câu hỏi nghiệp vụ cốt lõi, tuyệt đối không bàn luận kỹ thuật (API/DB/JSON):

1. **Đối tượng & Phân quyền (Who):**
   - Những nhóm khách hàng/vai trò nào tham gia?
   - Quyền hạn của từng nhóm khác nhau ra sao (Normal User, VIP, Ultimate; Khách hàng cá nhân vs tổ chức; Tiểu khoản Thường đuôi 1 vs Tiểu khoản Margin đuôi 6)?

2. **Giá trị & Mục tiêu Kinh doanh (Why):**
   - Vấn đề thực tế của khách hàng là gì?
   - Nhu cầu kinh doanh hay quy định pháp lý (KRX, UBCKNN, VSD) nào thúc đẩy tính năng này?

3. **Điều kiện & Quy tắc Định lượng (What Rules):**
   - Các điều kiện tiên quyết trước khi thực hiện hành động?
   - Công thức tính toán (sức mua, tỷ lệ ký quỹ ban đầu/duy trì, phí, thuế), quy tắc làm tròn số thập phân (Decimal)?
   - Các ranh giới định lượng (hạn mức lệnh, số lượng stream tối đa)?

4. **Thời điểm & Trạng thái Phiên (When):**
   - Tính năng hoạt động khác nhau như thế nào giữa các phiên giao dịch (ATO: 9h00-9h15, Liên tục: 9h15-11h30 & 13h00-14h30, ATC: 14h30-14h45, PLO: 14h45-15h00, Nghỉ trưa)?
   - Áp dụng trên sàn nào (HOSE, HNX, UPCoM, Phái sinh VN30F)?

5. **Hành trình Người dùng (User Journey):**
   - Người dùng bắt đầu từ màn hình/kênh nào (Web/App)?
   - Các bước thao tác tuần tự là gì?
   - Kết quả phản hồi nhận được (thành công, thông báo lỗi, thông báo đẩy)?

Chất vấn user qua kỹ năng `/ba-interview-me` (chỉ hỏi khi có điểm mù 🔴 Critical ảnh hưởng bản chất nghiệp vụ theo `autonomy-contract.md`). Đạt ≥90% confidence về hiểu biết nghiệp vụ trước khi chuyển sang Phase 2.

---

## Giai đoạn 2: Phản biện Nghiệp vụ & Tình huống Biên (Business Stress-Test & Convergence)

**Mục tiêu:** Đánh giá, gom nhóm thành 2-3 hướng đi nghiệp vụ và stress-test xung đột quy tắc:

1. **Phản biện Tác động chéo (Cross-rule Impact):**
   - Quy tắc mới này có xung đột với các quy tắc nghiệp vụ hiện hành không? (VD: quy tắc tính sức mua PP, quy tắc tỷ lệ vay margin, quy tắc làm tròn lô lẻ 1-99)?
   - Có vi phạm danh sách cổ phiếu diện cảnh báo/kiểm soát/đình chỉ (CR, CA, RES, SUS) không?

2. **Xử lý Ngoại lệ Nghiệp vụ (Business Exception Handling):**
   - Khách hàng hủy/sửa khi lệnh đang chờ xác nhận từ Sở giao dịch?
   - Lệnh bị Sở từ chối (Reject) do biến động biên độ giá hoặc trần/sàn trong phiên?
   - Tài khoản bị chạm ngưỡng cảnh báo Call Margin hoặc Force Sell trong lúc thực hiện giao dịch?

3. **Gom nhóm thành 2-3 Hướng đi Nghiệp vụ Khác biệt:**
   - Trình bày rõ: Hướng đi A (Tối giản / Quick win), Hướng đi B (Toàn diện / Chuẩn KRX), Hướng đi C (Nâng cao cho VIP).
   - Gọi tên rõ các Giả định Nghiệp vụ (Business Assumptions) đi kèm.

---

## Giai đoạn 3: Mài sắc & Cấu trúc (Business Spec Sharpening)

**Mục tiêu:** Chốt hướng đi và cấu trúc thành spec thuần nghiệp vụ theo khung Jira Description chuẩn 5 phần (kèm Mockup trực quan nếu task có UI).

### Bước 3.1: Tạo bản nháp (Draft) theo Khung Jira Description Chuẩn mực

Tạo file nháp tại: `workspace/issues/{issueKey}/spec/refined-draft.md` từ template `jira-description-template.md`:

1. **`## 🧩 User Story`** (`**As a** [role/persona cụ thể]`, `**I want** [hành động]`, `**So that** [giá trị đạt được]`)
2. **`## 💼 Business Context`** (`Vấn đề (Problem)`, `Mục tiêu (Goal)`, `Tính cấp thiết (Urgency)`, `Phạm vi (Scope)`)
3. **`## ✅ Acceptance Criteria`** (Khối `gherkin` sạch: **tuyệt đối không có automation `@tags`**, **không có tiền tố `[AC-x.y]`**, sử dụng `Scenario: Happy - ...`, `Scenario: Validation - ...`, `Scenario: Edge - ...`)
4. **`## 🎨 UI Design / Mockup`** (BẮT BUỘC khi task có UI: ảnh inline từng Case kèm điểm chạm thao tác `①`, `②`, `③` và Bảng UI Delta Mapping; ghi `N/A` nếu task backend)
5. **`## ☀️ Success Criteria & Tracking`** (Bảng Success Metrics & Tracking)

**🛡️ KIỂM ĐỊNH HARD GATE TRƯỚC GATE 2 (BẮT BUỘC):**
Chạy lệnh kiểm định trước khi trình user:
```bash
node ${AGENT_SKILLS_HOME:-.}/scripts/validators/validate-ba-refine.js \
  "workspace/issues/{issueKey}/spec/refined-draft.md"
```
*Script sẽ kiểm tra: Cấu trúc User Story, AC sạch không chứa `@tag` hay `[AC]`, bộ lọc Zero Technical Noise và tính đầy đủ của các sections. BẮT BUỘC PASS 100% (Exit 0).*

**❌ BỘ LỌC CHỐNG KỸ THUẬT (BẮT BUỘC):**
- TUYỆT ĐỐI KHÔNG đưa vào: Tên bảng DB, kiểu dữ liệu SQL, HTTP Methods, JSON keys, Kafka topic, Exception names, section `## 🧱 Technical Notes`.
- HỦY BỎ hoàn toàn sơ đồ luồng Mermaid.

**🎨 QUY TRÌNH DỰNG MOCKUP GIAO DIỆN CHUẨN PROD (Kỹ năng ba-design-mockup):**
Nếu task liên quan đến thay đổi giao diện Web hoặc Mobile App, kích hoạt kỹ năng chuyên biệt `ba-design-mockup`:
1. **Trích xuất AS-IS Codebase:** Chạy `extract-asis-ui.js` từ `origin/master` (hoặc `origin/main`) sinh `spec/asis-inventory.json` và `spec/asis-inventory.md`.
2. **Chọn Production App Shell:** Chọn 1 trong 6 khung shell chuẩn từ `plugins/ba-po/skills/ba-design-mockup/assets/shells/` chép vào `spec/diagrams/mockup.html`.
3. **Lắp ghép Delta-Only & Đa trạng thái:**
   - Giữ nguyên 90% khung màn hình gốc làm nền ngữ cảnh (`class="as-is-context"`, opacity 0.75).
   - Điểm thay đổi gắn viền nhấn (`data-change="added|modified"`) kèm **Huy hiệu đánh số chú thích `①`, `②`, `③`**.
   - Cài đặt hàm `switchState(state)` hỗ trợ 3 trạng thái: `default` (Luồng chuẩn), `error` (Cảnh báo lỗi/vượt hạn mức), `locked` (Khóa phiên/điều kiện biên).
   - Điền **Bảng Chú Thích Thay Đổi Giao Diện (UI Delta Mapping)** ở cuối file mockup khớp 1-1 các huy hiệu `①`, `②`, `③`.
4. **Kiểm định Fidelity tự động (Automated Hard Gate):**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/asis-inventory.json"
   ```
   *Bắt buộc PASS (Fidelity Score ≥ 90%).*
5. **Render ảnh Retina 2x đa trạng thái:**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/render-mockup.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.png" fit 2 all
   ```
   *Tự động sinh: `mockup.png`, `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png`.*
6. **Điền Mục `## 🎨 UI Design / Mockup` vào `refined-draft.md`:** Khai báo Fidelity Score, nhúng ảnh 3 Case kèm ghi chú thao tác người dùng (Action) và phản hồi hệ thống (Response) gắn với `[BR-*]`.

### Bước 3.2: Trình bày bản nháp cho User duyệt (Gate 2 — APPROVAL GATE)

**[Bước 3.2.0 — Xác thực Fidelity Gate TRƯỚC khi trình user]**
- Chạy lệnh kiểm định: `node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined-draft.md"`
- Bắt buộc kiểm định PASS 100% với Fidelity Score ≥ 90% (tính tự động bởi `validate-mockup-fidelity.js`).
- CẤM trình Gate 2 nếu script báo lỗi hoặc thiếu bộ 3 ảnh render đa Case.

**Fidelity Score được ghi nhận vào đầu Mục `## 🎨 UI Design / Mockup` của `refined-draft.md`:**
```markdown
## 🎨 UI Design / Mockup
> 🎯 Fidelity Score: XX% (kiểm định tự động qua validate-mockup-fidelity.js từ origin/master @ {commit-hash})
```

---

1. Trình bày TOÀN BỘ 5 phần bản nháp chuẩn Jira cho user xem trực tiếp trong chat.
2. **Khi task có UI:** Trình đồng thời:
   - **Nội dung Spec 5 phần chuẩn Jira**
   - **Các ảnh Mockup trực quan theo từng Case** (`mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png`)
   - **Ghi chú điểm chạm thao tác `①`, `②`, `③` dưới từng ảnh**
   - **Bảng chú thích UI Delta Mapping tổng hợp**
   - **Fidelity Score (≥ 90% từ validate-mockup-fidelity.js)**
3. **DỪNG LẠI VÀ CHỜ USER PHẢN HỒI ("OK" hoặc chỉnh sửa).**
   User có quyền yêu cầu điều chỉnh lại vị trí nút bấm, nhãn trường, hoặc màu sắc trạng thái ngay trong vòng lặp Gate 2 (tối đa 5 vòng cho tới khi user hài lòng).

### Bước 3.3: Chốt bản cuối cùng và Lưu trữ

1. Copy `refined-draft.md` → `refined.md`.
2. Tự động tính confidence score (ngưỡng ≥90%).
3. Thông báo cho user file cuối cùng đã lưu và xin phép push lên Jira qua **Gate 2**.
4. **DỪNG LẠI VÀ CHỜ USER trả lời** trước khi sang Giai đoạn 4.

---

## Giai đoạn 4: Đẩy lên Jira & Handoff Kỹ thuật

**Mục tiêu:** Cập nhật Jira task với spec đã refine, dán trực tiếp toàn bộ ảnh Mockup vào Description và xuất bản manifest kiểm thử cho QA. ❌ KHÔNG push comment, ❌ KHÔNG thêm label.

1. **Kiểm tra nội dung file trước khi push:**
   File `refined.md` không được chứa thông tin nội bộ, không có placeholder, AC phải có `Given/When/Then` hợp lệ (≥3 scenario, ≥6 dòng).

2. **Xem trước ADF (khuyến nghị, không gọi Jira):**
   ```bash
   DRY_RUN=1 node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js {issueKey} \
     "workspace/issues/{issueKey}/spec/refined.md" | head -40
   ```

3. **Cập nhật Jira description & Dán trực tiếp ảnh Mockup vào Description:**
   - **Ưu tiên 1 (n8n Fast-Path - Tức thời):**
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js pushSpecToJira {issueKey} "workspace/issues/{issueKey}/spec/refined.md"
     ```
   - **Ưu tiên 2 (CLI Helper Độc lập - Tự động upload ảnh và nhúng inline vào Description):**
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js {issueKey} \
       "workspace/issues/{issueKey}/spec/refined.md"
     ```
     *Script `jira-push-spec.js` sẽ tự động phát hiện tất cả ảnh mockup (`mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png`...), tải lên Jira Attachments trước, sau đó chèn chính xác các node ADF `mediaSingle` để **dán trực tiếp ảnh vào Mục UI Design / Mockup trong Description** chứ không chỉ đính kèm file rời rạc.*

4. **Tự động xuất bản Testability Manifest (`spec/testability-manifest.json`):**
   Script `jira-push-spec.js` tự động trích xuất các phần tử UI từ Bảng UI Delta Mapping của Mục `## 🎨 UI Design / Mockup`, ánh xạ cùng danh sách `[BR-*]` và các Scenario AC vào `workspace/issues/{issueKey}/spec/testability-manifest.json`. File này là đầu vào chuẩn hóa để QA sinh automation test và Page Object Model (POM) mà không phải gõ tay locators.

5. **Ghi log push history** vào `push-log.json`.

---

## Các bước tiếp theo

Sau khi push spec lên Jira thành công, **BẮT BUỘC** không được dừng lại để hỏi user. Bạn phải tự động chuyển sang kỹ năng `/qa-test-design` để bắt đầu làm Checklist cho task vừa refine.

---
