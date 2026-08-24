---
name: ba-refine
description: 'Download Jira task có ý tưởng thô/mơ hồ, mài giũa (refine) thành spec chi tiết và rõ ràng thông qua tư duy phân kỳ-hội tụ, sau đó push lại lên Jira theo cấu trúc chuẩn. Sử dụng khi Jira task thiếu chi tiết, mơ hồ, hoặc cần làm rõ requirements. Trigger: "/ba-refine {issueKey}", "refine jira task", "clarify requirements".'
---

# Skill: ba-refine — Mài giũa Spec nghiệp vụ

Download Jira task có ý tưởng thô/mơ hồ → Mài giũa (refine) thành spec chi tiết rõ ràng → Push lại lên Jira theo cấu trúc chuẩn.

## Ranh giới: ba-spec vs ba-refine

| Khía cạnh     | ba-spec                             | ba-refine                                |
|---------------|-------------------------------------|------------------------------------------|
| **Đầu vào**   | Jira task có requirements rõ ràng   | Jira task có ý tưởng thô/mơ hồ           |
| **Tập trung** | Tính đầy đủ (đủ 13 sections)        | Tính rõ ràng & Chi tiết (làm rõ ý tưởng) |
| **Quy trình** | Import → Phân tích → Phát hiện gaps | Download → Phân kỳ → Hội tụ → Mài sắc    |
| **Đầu ra**    | File `*-final.md` (để handoff)      | Cập nhật Jira description (có cấu trúc)  |
| **Use case**  | Requirements đã có, cần phân tích   | Requirements thiếu, cần brainstorm       |

## Workflow Tổng quan

```
Giai đoạn 0: Tải Jira task
    ↓
Giai đoạn 1: Thấu hiểu & Mở rộng (Phân kỳ)
    ↓
Giai đoạn 2: Đánh giá & Hội tụ
    ↓
Giai đoạn 3: Mài sắc & Cấu trúc
    ├── 3.1: Tạo bản nháp (refined-draft.md)
    ├── 3.2: Show toàn bộ draft → User review → ⛔ APPROVAL GATE
    │         ↺ (vòng lặp sửa/trình lại cho đến khi user "OK")
    └── 3.3: Chốt bản cuối (refined.md) → Hỏi push Jira
    ↓
Giai đoạn 4: Đẩy lên Jira (chỉ khi user đồng ý)
```

## Điều kiện Tiên quyết (Authentication)

Agent **BẮT BUỘC TỰ ĐỘNG** đọc file `.env` tại workspace root để lấy credentials:

```
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

(Chỉ báo lỗi nếu file `.env` thực sự không tồn tại hoặc thiếu biến)

## Cấu trúc Thư mục

```
/project-root/workspace/{issueKey}/
├── source/
│   ├── {issueKey}-original.pdf
│   ├── metadata.json
│   └── refs/
│       ├── {tên-slug}-{pageId}.pdf          # Confluence tham chiếu
│       ├── wireframe-v3.pdf                  # Attachment gốc
│       └── flowchart-order-flow.png          # Ảnh đính kèm
└── spec/
    ├── refined.md
    └── push-log.json
```

### Quy ước Đặt tên File

**Confluence pages:** `{tên-ngắn-gọn-slug}-{pageId}.pdf`
- Viết thường, bỏ dấu tiếng Việt, thay khoảng trắng bằng `-`
- Cắt tối đa 50 ký tự phần tên (trước pageId)
- VD: `"Thiết kế luồng Thanh Toán VNPay"` (pageId: 12345) → `thiet-ke-luong-thanh-toan-vnpay-12345.pdf`

**File đính kèm:** Giữ nguyên tên gốc từ Jira/Confluence

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

## Cụm từ Kích hoạt

- `/ba-refine {issueKey}` — Mài giũa Jira task cụ thể
- `/ba-refine PROJ-123` — Tương tự
- "Refine jira task PROJ-456"
- "Làm rõ requirements cho PROJ-789"

## Hướng dẫn Chi tiết (Detailed Instructions)

### Giai đoạn 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)

**Mục tiêu:** Quét Jira/Confluence tìm tài liệu liên quan, đối chiếu với file đã có, trình danh sách cho user duyệt TRƯỚC KHI tải

1. **Chuẩn hoá `{issueKey}` TRƯỚC MỌI THỨ KHÁC**

   User thường dán nguyên URL từ thanh địa chỉ trình duyệt. Nếu dùng thẳng chuỗi
   đó làm `{issueKey}`, cả URL sẽ trở thành tên thư mục
   (`/project-root/workspace/https:/entrade.atlassian.net%2Fbrowse%2F.../spec/refined.md`) và
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
   # Tự động đọc từ workspace root/.env (KHÔNG HỎI user)
   ATLASSIAN_BASE_URL=...
   ATLASSIAN_EMAIL=...
   ATLASSIAN_API_TOKEN=...
   ```

3. **Sử dụng lệnh `curl` gọi API lấy metadata Jira** (chưa tải PDF). BẮT BUỘC phải trích xuất chính xác trường `fields.summary` từ JSON trả về để làm Tiêu đề Task:
   ```bash
   curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
     -H "Accept: application/json" \
     "${ATLASSIAN_BASE_URL}/rest/api/3/issue/{issueKey}?fields=summary,description,attachment,issuelinks,status,priority,assignee,reporter,labels"
   ```

4. **Trích xuất danh sách liên kết tham chiếu:**
   - Từ `issuelinks`: Lấy Confluence pages được link
   - Gọi Remote Links: `GET /rest/api/3/issue/{issueKey}/remotelink` → Lấy link Confluence
   - Từ `description`: Regex quét URL pattern `*/wiki/spaces/*` hoặc `*/wiki/pages/*`
   - Từ `attachment`: Lấy danh sách file đính kèm (tên, dung lượng, định dạng)

5. **Kiểm tra Cache — file đã tải trước đó:**
   - Với mỗi Confluence pageId → Quét `/project-root/workspace/{issueKey}/source/refs/` xem đã có `*-{pageId}.pdf` chưa (kể cả từ lần chạy `ba-spec` trước — cả hai skill dùng chung thư mục này)
   - Với mỗi attachment → Kiểm tra tên file đã tồn tại chưa

6. **Trình bảng Danh sách cho User duyệt:**

   ```markdown
   
📋 **Danh sách tài liệu liên quan đến {issueKey}:**

| # | Loại            | Tên                                      | Trạng thái         | Đường dẫn / Hành động                                        |
|---|------------------------------------------------------------|--------------------|--------------------------------------------------------------|
| 1 | 📄 Jira PDF     | {issueKey} - {Tiêu đề Task}              | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 2 | 📝 Confluence   | Thiết kế luồng thanh toán (ID: 12345)    | ✅ Đã có           | `/project-root/workspace/{issueKey}/source/refs/thiet-ke-luong-12345.pdf`  |
| 3 | 📝 Confluence   | API Spec v2 (ID: 67890)                  | 🆕 Chưa tải        | → `api-spec-v2-67890.pdf`                                    |
| 4 | 📎 File         | wireframe-v3.pdf (2.1MB)                 | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 5 | 🖼️ Ảnh          | flowchart.png (800KB)                    | 🆕 Chưa tải        | → Sẽ tải mới                                                 |
| 6 | 🎬 Video        | demo.mp4 (50MB)                          | ⏭️ Bỏ qua          | Định dạng không hỗ trợ                                       |

   **Tổng cộng:** 4 file cần tải mới, 1 file đã có sẵn, 1 file bỏ qua.

   Bạn có muốn tôi tiến hành tải không? (Gõ **OK** hoặc chỉnh sửa)
   ```

7. **DỪNG LẠI (Approval Gate):** Chờ User phản hồi "OK" hoặc chỉnh sửa danh sách.

8. **Sau khi User đồng ý → Tạo thư mục làm việc TRƯỚC (BẮT BUỘC, không được bỏ qua):**

   Luôn neo (anchor) vào root của repo git rồi `cd` vào đó trước khi chạy bất kỳ lệnh tải file nào — KHÔNG dùng đường dẫn tương đối theo cwd hiện tại của agent, vì cwd có thể đang ở một thư mục con khác nhau giữa các lần chạy. Đây là nguyên nhân gây ra lệch đường dẫn (VD: tạo nhầm `project/{issueKey}/...` thay vì `/project-root/workspace/{issueKey}/...`).

   ```bash
   cd "$(git rev-parse --show-toplevel)"
   mkdir -p "/project-root/workspace/{issueKey}/source/refs"
   ```

   Tài liệu tải về ghi vào `/project-root/workspace/{issueKey}/source/`, spec mài giũa ghi vào
   `/project-root/workspace/{issueKey}/spec/` — tính từ root repo. Không tự ý đổi tên thư mục gốc
   (`project/`, `data/`, `output/`...) và không tạo thêm gốc thứ 6.

9. **Tải file thiếu vào thư mục vừa tạo:**

   - **Tải Jira task PDF:** Dùng script từ ba-spec (script tự `mkdir -p` bên trong `OUTPUT_DIR`, nhưng vẫn phải chạy từ root repo — đã `cd` ở Bước 8 — để path tương đối không lệch)
     ```bash
     bash skills/ba-spec/scripts/jira-fetch-pdf.sh {issueKey} workspace
     ```

   - **Tải Confluence pages chưa có:**
     ```bash
     curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
       "${ATLASSIAN_BASE_URL}/wiki/spaces/flyingpdf/pdfpageexport.action?pageId={pageId}" \
       -o "/project-root/workspace/{issueKey}/source/refs/{tên-slug}-{pageId}.pdf"
     ```

   - **Tải attachments chưa có:** Giữ nguyên tên gốc, lưu vào cùng thư mục `source/refs/`
     ```bash
     curl -s -u "${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}" \
       "{attachment_content_url}" \
       -o "/project-root/workspace/{issueKey}/source/refs/{tên-file-gốc}"
     ```

   - ⚠️ **LƯU Ý:** File tạm phải tạo trong `/tmp/` hoặc system scratch, KHÔNG tạo `scratch/` trong dự án user

10. **Kết quả cấu trúc thư mục sau Bước 8-9:**
   ```
   /project-root/workspace/{issueKey}/
   ├── source/
   │   ├── {issueKey}-original.pdf
   │   ├── metadata.json
   │   └── refs/
   │       ├── {tên-slug}-{pageId}.pdf          # Confluence
   │       ├── wireframe-v3.pdf                  # Attachment
   │       └── flowchart.png                     # Ảnh
   └── spec/                                     # (các file khác tạo sau)
   ```

11. **Cập nhật hoặc tạo `metadata.json` (BẮT BUỘC dùng đúng `summary` đã trích xuất ở Bước 3):**
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

**Kết quả Giai đoạn 0:**
- ✅ Danh sách tài liệu đã quét
- ✅ File đã có đã nhận diện
- ✅ User đã duyệt danh sách
- ✅ File thiếu đã tải xong
- ✅ Metadata đã tạo

---

### Giai đoạn 1: Thấu hiểu & Mở rộng (Phân kỳ)

**Mục tiêu:** Hiểu vấn đề gốc và mở rộng các hướng đi có thể

1. **Tái trình bày vấn đề dưới dạng câu hỏi "Làm sao để..." (How Might We)**
   (BẮT BUỘC sử dụng Tiêu đề Task thật sự đã lấy được ở Phase 0, KHÔNG dùng câu ví dụ bên dưới).
   
   Ví dụ (Chỉ là mẫu):
   ```
   Jira gốc: "[Tên task của user]"
   
   Câu HMW: "Làm sao để khách hàng có thể lưu trữ và chia sẻ 
   báo cáo giao dịch của họ một cách dễ dàng và bảo mật?"
   ```

2. **Làm rõ các thành phần cốt lõi bằng AskUserQuestion**
   
   Sử dụng tool `AskUserQuestion` để thu thập:
   
   - **User Story:**
     - Role cụ thể là gì? (VD: KH giao dịch cổ phiếu có dùng Margin)
     - Mục tiêu muốn đạt được?
     - Giá trị kinh doanh/người dùng mang lại?
   
   - **Bối cảnh Nghiệp vụ:**
     - Nhu cầu kinh doanh cốt lõi?
     - Tại sao bây giờ? (Tính cấp thiết)
   
   - **Tiêu chí Nghiệm thu:**
     - Tiêu chí nghiệm thu dưới góc nhìn nghiệp vụ?
     - Các điều kiện thành công đo được?
   
   - **User Flow & UI:**
     - Có thay đổi UI không?
     - Flow thao tác như thế nào?
   
   - **Tiêu chí Thành công:**
     - Thế nào gọi là thành công?
     - Metrics đo lường?
   
   - **Ghi chú Kỹ thuật:**
     - Ràng buộc kỹ thuật, API, Database?
     - Tuân thủ pháp lý/bảo mật?
     - Yêu cầu về hiệu năng?

   **TUYỆT ĐỐI KHÔNG BƯỚC TIẾP cho tới khi đạt ≥90% confidence về hiểu biết.**

3. **Đẻ ra 5-8 biến thể ý tưởng (idea variations)**
   
   Áp dụng các lăng kính:
   
   - **Đảo ngược (Inversion):** "Nếu làm điều NGƯỢC LẠI hoàn toàn thì sao?"
   - **Đạp đổ Ràng buộc (Constraint removal):** "Nếu tiền/thời gian/công nghệ không phải vấn đề?"
   - **Đổi Target Audience:** "Nếu xây cho [user khác] thì sao?"
   - **Lai tạp (Combination):** "Nếu gộp với [ý tưởng lân cận]?"
   - **Đơn giản hóa cực đoan:** "Phiên bản đơn giản gấp 10 lần?"
   - **Nhân 10 lên (10x version):** "Nếu chạy ở Scale lớn?"
   - **Lăng kính Chuyên gia:** "Chuyên gia trong ngành coi điều gì là hiển nhiên?"

   **Nếu đang trong codebase có sẵn:** Dùng `Glob`, `Grep`, `Read` để scan:
   - Kiến trúc hiện tại
   - Các patterns đã có
   - Constraints kỹ thuật
   - Prior art (code tương tự)
   
   Cite các file và patterns cụ thể khi cần.

**Kết quả Giai đoạn 1:**
- Câu hỏi HMW rõ ràng
- Các thành phần cốt lõi đã làm rõ (≥90% confidence)
- 5-8 biến thể ý tưởng có lý do rõ ràng

---

### Giai đoạn 2: Đánh giá & Hội tụ

**Mục tiêu:** Đánh giá, gom nhóm, và chốt hướng đi tốt nhất

1. **Gom nhóm (Cluster) các biến thể thành 2-3 hướng đi khác biệt**
   
   Mỗi hướng đi phải có SỰ KHÁC BIỆT THỰC SỰ, không chỉ biến thể nhỏ.
   
   Ví dụ:
   ```
   Hướng A: Quick win — Nút PDF export đơn giản
   Hướng B: Platform play — Thư viện báo cáo với chia sẻ
   Hướng C: Compliance first — Audit trail + encrypted export
   ```

2. **Thử lửa (Stress-test) từng hướng đi**
   
   Đánh giá theo tiêu chí:
   
   - **Giá trị Người dùng:** Ai được lợi? Đến mức nào? Painkiller hay vitamin?
   - **Tính Khả thi:** Chi phí kỹ thuật và tài nguyên? Đoạn khó nhất?
   - **Sự Khác biệt:** Điều gì làm cho khác biệt? Có đủ hấp dẫn để chuyển đổi?
   - **Rủi ro (Fintech/Banking):** Rủi ro mất tiền, lừa đảo, lộ dữ liệu? ACID compliance?

3. **Vạch trần các giả định ẩn (Surface hidden assumptions)**
   
   Với mỗi hướng đi, GỌI TÊN RÕ:
   - Những gì đang CƯỢC là đúng (nhưng chưa verify)
   - Những gì có thể GIẾT CHẾT ý tưởng
   - Những gì QUYẾT ĐỊNH NGÓ LƠ (và tại sao OK)

**Giọng điệu:** Trung thực, không vuốt đuôi. Nếu ý tưởng yếu, nói ra một cách tử tế. Chỉ ra phức tạp cồng kềnh, đặt dấu hỏi về giá trị thực.

**Kết quả Giai đoạn 2:**
- 2-3 hướng đi khác biệt
- Kết quả stress-test cho từng hướng
- Các giả định ẩn đã được ghi nhận

---

### Giai đoạn 3: Mài sắc & Cấu trúc

**Mục tiêu:** Chốt hướng đi và cấu trúc thành spec rõ ràng

Sau khi user chọn hướng đi cuối cùng, thực hiện **3 bước tuần tự** — KHÔNG được nhảy cóc:

#### Bước 3.1: Tạo bản nháp (Draft)

Tạo file nháp tại: `/project-root/workspace/{issueKey}/spec/refined-draft.md`

📄 **Template chuẩn:** `skills/ba-refine/templates/jira-description-template.md`

File template là **skeleton thuần** — mọi dòng trong đó đều là nội dung sẽ lên Jira. Agent copy skeleton, thay các placeholder `[...]` bằng nội dung thật, và **không thêm bất cứ dòng nào của riêng mình** vào đầu/cuối file.

| Section                        | Bắt buộc?                       | Bỏ nội dung section khi              |
|--------------------------------|---------------------------------|--------------------------------------|
| 🧩 User Story                  | Có                              | —                                    |
| 💼 Business Context            | Có                              | —                                    |
| ✅ Acceptance Criteria         | Có                              | —                                    |
| 🎨 User Flow / Design          | Có (nếu đổi UI, cần link figma) | Task không đụng tới UI               |
| ☀️ Success Criteria & Tracking | Có                              | —                                    |
| 🧱 Technical Notes             | Không                           | Không có thông tin kỹ thuật đáng ghi |

Trong 🧱 Technical Notes, xoá luôn các sub-heading không có nội dung — đừng để lại heading rỗng hay `[placeholder]` chưa thay.

**❌ TUYỆT ĐỐI KHÔNG được xuất hiện trong draft/refined.md**:

- Tiêu đề/mô tả của bản thân file template ("Jira Description Template for ba-refine"...)
- Câu hướng dẫn dành cho agent ("Viết dưới góc nhìn nghiệp vụ...", "Đính kèm User Flow...", "Thông tin kỹ thuật tham khảo...")
- Nhãn chọn format ("Format 1: BDD Style", "Format 2: AC List")
- Footer chữ ký ("Generated by: ba-refine skill", "Local file: ...")
- Placeholder `[...]` còn sót chưa thay
- Đường kẻ ngang `---` giữa các section (heading đã đủ phân tách; `---` render thành gạch ngang thừa trên Jira)

**Acceptance Criteria dùng đúng MỘT format:** 

- Gherkin trong code block ```` ```gherkin ````.
- Nếu AC không mang tính hành vi (VD: ràng buộc dữ liệu, chính sách), viết bullet list `- [ ]` — **không** dùng bảng, vì bảng AC lồng Given/When/Then rất khó đọc trên Jira.

**Bảng markdown:** chỉ dùng ở Success Metrics và Tracking. Script push dựng bảng ADF thật, nên phải viết đúng cú pháp GFM (có hàng phân cách `|---|`) và mọi hàng phải cùng số cột.

**LƯU Ý QUAN TRỌNG:**
- ❌ KHÔNG bao gồm: "Giả định & Rủi ro", "Ngoài Phạm vi", "Đánh giá Độ tin cậy"
- ✅ Các phần trên CHỈ dùng nội bộ trong quá trình refine, KHÔNG push lên Jira
- ✅ Spec push lên Jira phải ngắn gọn, tập trung vào User Story + AC + Success Metrics

#### Bước 3.2: Trình bày bản nháp cho User duyệt (APPROVAL GATE — BẮT BUỘC)

**⚠️ ĐÂY LÀ CỔNG DUYỆT BẮT BUỘC — KHÔNG ĐƯỢC BỎ QUA.**

Sau khi tạo xong `refined-draft.md`, agent **BẮT BUỘC** phải:

1. **Trình bày TOÀN BỘ nội dung bản nháp** cho user xem trực tiếp trong chat. Không được chỉ nói "file đã tạo" hoặc "spec đã sẵn sàng" mà phải **in ra nội dung đầy đủ** theo format sau:

   ```markdown
📝 **BẢN NHÁP SPEC — Vui lòng review kỹ trước khi chốt:**

📄 **File:** `/project-root/workspace/{issueKey}/spec/refined-draft.md`

────────────────────────────────────────────
[TOÀN BỘ NỘI DUNG CỦA FILE refined-draft.md ĐƯỢC IN RA ĐÂY]
────────────────────────────────────────────

📊 **Đánh giá Chất lượng Nội bộ:**
- Độ đầy đủ User Story: X%
- Tính testable của AC: X%
- Giả định được vạch ra: X%
- Kết quả stress-test: X%
- **Confidence tổng: X%**

🔍 **Checklist nhanh:**
- ✅/❌ User Story có đầy đủ Role + Goal + Value?
- ✅/❌ AC đều testable (Given-When-Then)?
- ✅/❌ Success Metrics có baseline + target?
- ✅/❌ Không còn placeholder chưa thay?

⏳ **Bạn hãy review và phản hồi:**
- ✅ **"OK"** hoặc **"Đồng ý"** → Tôi chốt thành bản cuối và hỏi push Jira
- ✏️ **Góp ý cụ thể** → Tôi sửa bản nháp và trình lại
- 🔄 **"Làm lại"** → Tôi viết lại từ đầu
   ```

2. **DỪNG LẠI VÀ CHỜ USER PHẢN HỒI.** Tuyệt đối KHÔNG được:
   - ❌ Tự ý chuyển sang Bước 3.3 hoặc Giai đoạn 4
   - ❌ Tự ý lưu file cuối cùng `refined.md`
   - ❌ Hỏi "push lên Jira không?" khi user chưa duyệt nội dung
   - ❌ Coi câu trả lời của Phase 2 (chọn hướng đi) là approval cho Phase 3

3. **Vòng lặp chỉnh sửa (Revision Loop):**

   Nếu user **chưa đồng ý** (góp ý sửa, yêu cầu thêm/bớt nội dung):

   a. Ghi nhận feedback cụ thể của user
   b. Sửa file `refined-draft.md` theo feedback
   c. **In lại TOÀN BỘ nội dung đã sửa** (không chỉ in phần diff)
   d. Hỏi lại: "Bản sửa đã đúng ý bạn chưa?"
   e. Lặp lại cho đến khi user nói **"OK"**, **"Đồng ý"**, **"Chốt"**, hoặc tương đương rõ ràng

   **Số vòng lặp tối đa: 5.** Nếu sau 5 vòng vẫn chưa đạt, thông báo:
   ```
   "Đã qua 5 vòng chỉnh sửa. Bạn có muốn:
   1. Tiếp tục chỉnh sửa thêm
   2. Chốt bản hiện tại dù chưa hoàn hảo
   3. Hoãn lại — tôi lưu draft, bạn quay lại sau"
   ```

#### Bước 3.3: Chốt bản cuối cùng

**Chỉ thực hiện khi user đã nói "OK" / "Đồng ý" / "Chốt" ở Bước 3.2.**

1. Copy `refined-draft.md` → `refined.md` (bản cuối cùng)
2. Tính confidence score:

   **Công thức:**
   ```
   confidence = (user_story * 0.30) + (ac_complete * 0.30) + (assumptions_surfaced * 0.20) + (stress_test * 0.20)
   ```

3. Thông báo cho user:
   ```markdown
✅ **Bản cuối cùng đã chốt!**
📄 File: `/project-root/workspace/{issueKey}/spec/refined.md`
📊 Confidence: X%

Bạn có muốn push lên Jira không? (Gõ **OK** hoặc **Không**)
   ```

4. **DỪNG LẠI VÀ CHỜ USER trả lời có push Jira hay không** trước khi chuyển sang Giai đoạn 4.

---

### Giai đoạn 4: Đẩy lên Jira

**Mục tiêu:** Cập nhật Jira task với spec đã refine

**LƯU Ý QUAN TRỌNG:**
- ❌ KHÔNG push comment lên Jira
- ❌ KHÔNG thêm label
- ✅ CHỈ update description với spec rõ ràng

1. **Kiểm tra nội dung file trước khi push**

   `/project-root/workspace/{issueKey}/spec/refined.md` phải là file **đúng bằng** nội dung sẽ lên Jira — không cắt gọt gì thêm ở bước này. Nếu file còn chứa phần nội bộ (Giả định & Rủi ro, Ngoài Phạm vi, Đánh giá Độ tin cậy, stress-test score, Các Bước Tiếp theo) thì **quay lại Giai đoạn 3 sửa file**, chứ không lọc ngầm lúc push — lọc ngầm khiến file local và Jira lệch nhau.

   ```bash
   cd "$(git rev-parse --show-toplevel)"

   # Không được còn dấu vết của template / phần nội bộ
   grep -nE 'Jira Description Template|Format [12]:|\(Required\)|\(Optional\)|Generated by:|Giả định & Rủi ro|Ngoài Phạm vi|Đánh giá Độ tin cậy' \
     "/project-root/workspace/{issueKey}/spec/refined.md" && echo "❌ Còn dòng thừa — quay lại Giai đoạn 3"

   # Không được còn placeholder chưa thay
   grep -nE '\[(role/persona|goal/action|business value|KPI [0-9]|baseline|goal|Step [0-9]|Event name)' \
     "/project-root/workspace/{issueKey}/spec/refined.md" && echo "❌ Còn placeholder chưa thay"
   ```

   Cả hai lệnh không in ra gì → sạch, đi tiếp.

2. **Xem trước ADF (khuyến nghị, không gọi Jira)**

   ```bash
   DRY_RUN=1 bash skills/ba-refine/scripts/jira-push-spec.sh {issueKey} \
     "/project-root/workspace/{issueKey}/spec/refined.md" | head -40
   ```

   Kiểm tra dòng tóm tắt `→ N block, trong đó M bảng`: `M` phải khớp số bảng markdown trong file (Success Metrics + Tracking = 2). Nếu `M = 0` mà file có bảng → cú pháp bảng sai (thiếu hàng `|---|` hoặc lệch số cột).

3. **Cập nhật Jira description**

   Dùng đúng script này — **không** tự dựng ADF bằng `curl` thủ công. Script đã xử lý bảng, ngắt dòng mềm và chuẩn hoá issue key; ADF tự chế mỗi lần một kiểu chính là nguyên nhân description bị lệch style.

   ```bash
   bash skills/ba-refine/scripts/jira-push-spec.sh {issueKey} \
     "/project-root/workspace/{issueKey}/spec/refined.md"
   ```

   Script nhận cả issue key trần lẫn URL Jira đầy đủ, và đọc credentials
   `ATLASSIAN_BASE_URL` / `ATLASSIAN_EMAIL` / `ATLASSIAN_API_TOKEN` từ `.env`.

4. **Ghi log push history**
   
   ```json
   {
     "issueKey": "PROJ-123",
     "pushDate": "2026-08-14T10:30:00Z",
     "confidence": 0.95,
     "localFile": "/project-root/workspace/PROJ-123/spec/refined.md",
     "jiraUrl": "https://domain.atlassian.net/browse/PROJ-123",
     "sectionsIncluded": [
       "User Story",
       "Business Context",
       "Acceptance Criteria",
       "User Flow",
       "Success Criteria",
       "Technical Notes"
     ]
   }
   ```

**Kết quả Giai đoạn 4:**
- ✅ Jira description đã cập nhật (CHỈ spec nghiệp vụ)
- ✅ Push log đã tạo
- 🔗 Jira URL trả về cho user
- ❌ KHÔNG có comment (keep Jira clean)
- ❌ KHÔNG thêm label (avoid clutter)

**Thông báo cho user:**
```markdown
✅ Đã push spec lên Jira: {jiraUrl}

**Nội dung đã push:**
- User Story
- Business Context
- Acceptance Criteria (Given-When-Then)
- Success Criteria & Metrics
- Technical Notes

**File local:** `{localPath}`

**Các bước tiếp theo:**
- `/qa-test-design {issueKey}` — Thiết kế test cases
- `/tech-spec {issueKey}` — Viết tech spec
```

---

## Triết lý (Philosophy)

- **Simplicity wins:** Đơn giản là đỉnh cao của tinh tế. Đẩy về phiên bản đơn giản nhất có thể mà vẫn giải quyết được vấn đề cốt lõi.
- **User-first, tech-second:** Bắt đầu từ trải nghiệm người dùng, sau đó mới suy ngược về công nghệ.
- **Focus beats breadth:** Dám nói KHÔNG với 1,000 thứ khác. Tập trung luôn chiến thắng dàn trải.
- **Challenge everything:** Thách thức MỌI giả định. "Xưa nay vẫn làm thế" KHÔNG phải lý do hợp lệ.
- **Show the future:** Cho người ta thấy tương lai, không chỉ cải tiến nhỏ.

## Anti-patterns (Tránh)

- ❌ **Đẻ 20+ variations hời hợt** — 5-8 variations có chiều sâu >> 20 bullet points
- ❌ **Yes-machine** — Phản bác ý tưởng yếu bằng lý lẽ cụ thể và tử tế
- ❌ **Skip "Dành cho Ai"** — Mọi ý tưởng vĩ đại bắt đầu từ User thật và Nỗi đau thật
- ❌ **Không vạch trần Assumptions** — Untested assumptions giết chết ý tưởng
- ❌ **Over-engineer** — 4 phase, mỗi phase làm TỐT 1 VIỆC
- ❌ **Chỉ liệt kê, không kể chuyện** — Mỗi variation phải có rationale
- ❌ **Bỏ qua codebase** — Existing architecture vừa là constraint, vừa là launchpad

## Red Flags

- Download Jira thất bại hoặc credentials sai
- Không làm rõ được core components (≥90% confidence)
- Không đẻ ra được 5-8 variations khác biệt
- Không stress-test các hướng đi
- Không surface hidden assumptions
- Push lên Jira mà chưa có user approval
- Spec thiếu User Flow, Success Metrics, hoặc Acceptance Criteria
- Ignore constraints của codebase hiện tại
- Nhảy cóc sang Phase 4 mà không chạy Phase 1-3
- **Không show nội dung draft cho user trước khi chốt (Bước 3.2 bị bỏ qua)**
- **Chuyển sang Phase 4 khi user chưa nói "OK/Đồng ý" ở Bước 3.2**
- **Lưu refined.md mà không qua vòng review draft với user**

## Verification Checklist

Sau khi chạy xong ba-refine session:

- [ ] **Phase 0:** Jira task downloaded, metadata parsed
- [ ] **Phase 1:** HMW statement rõ ràng, core components clarified (≥90%), 5-8 variations có rationale
- [ ] **Phase 2:** 2-3 hướng đi khác biệt, stress-test đầy đủ, assumptions documented
- [ ] **Phase 3 — Bước 3.1:** Draft file (`refined-draft.md`) created với đủ sections
- [ ] **Phase 3 — Bước 3.2:** Toàn bộ nội dung draft đã show cho user, user đã review và nói "OK/Đồng ý"
- [ ] **Phase 3 — Bước 3.3:** Draft đã chốt thành `refined.md`, user đã đồng ý push Jira
- [ ] **Phase 4:** Jira description updated (KHÔNG comment, KHÔNG label), push log created
- [ ] **Confidence:** ≥90% để đủ điều kiện handoff to QA/DEV
- [ ] **User approval:** User đã duyệt nội dung spec (Phase 3) VÀ approve push to Jira (trước Phase 4)

## Next Steps After Refinement

Sau khi push spec lên Jira thành công, **BẮT BUỘC** không được dừng lại để hỏi user. Bạn phải tự động chuyển sang kỹ năng `/qa-test-design` để bắt đầu làm Checklist cho task vừa refine. (Lưu ý: Không chạy ở chế độ auto-approve, để hệ thống vẫn dừng lại chờ user duyệt Checklist theo đúng luồng của qa-test-design).

## Example Session Flow

```
User: /ba-refine PROJ-123

Agent:
[Phase 0] Downloading PROJ-123...
✅ Task downloaded: "Add export button to report page"
📋 Type: Story | Reporter: john@company.com
📁 Files: /project-root/workspace/PROJ-123/spec/

[Phase 1] Understanding the problem...

HMW Statement: "How might we help customers save and share their 
trading reports easily and securely?"

Let me clarify core components:
🎯 Who exactly needs this? (Role)
💼 What's the business context? (Why now?)
✅ What are acceptance criteria?
🎨 Does this change UI? (Flow)
📊 How do we measure success?
🔧 Any technical constraints?

[Interactive Q&A via AskUserQuestion...]

[After answers collected]

Based on your answers, here are 5 variations:

A. Quick Win: Simple PDF export button
B. Platform Play: Report library with sharing + collaboration
C. Compliance First: Audit trail + encrypted export
D. Inversion: Instead of export, live dashboard shareable link
E. 10x Version: Smart report recommendations based on trading patterns

[User feedback: "B sounds interesting but maybe too complex, 
let's explore A and C"]

[Phase 2] Evaluating directions A and C...

Direction A: Quick Win
- User Value: ⭐⭐⭐ (painkiller for immediate need)
- Feasibility: ⭐⭐⭐⭐⭐ (low cost, 2-3 days)
- Differentiation: ⭐⭐ (table stakes, everyone has it)
- Risk: ⭐⭐⭐⭐ (low risk if done right)

Assumptions:
- Users want PDF specifically (not Excel/CSV)
- Current report data is complete (no missing fields)
- Performance is OK for large reports (assumption!)

Direction C: Compliance First
- User Value: ⭐⭐⭐⭐ (strong for regulated customers)
- Feasibility: ⭐⭐⭐ (medium cost, 1-2 weeks)
- Differentiation: ⭐⭐⭐⭐⭐ (strong differentiator)
- Risk: ⭐⭐⭐⭐⭐ (actually reduces risk)

Assumptions:
- Compliance requirements are clear (need to verify!)
- Audit trail storage is available (need infra check)

[User: "Let's go with A for now, C is phase 2"]

[Phase 3] Sharpening Direction A...

[Bước 3.1] Creating draft spec at:
/project-root/workspace/PROJ-123/spec/refined-draft.md

[Bước 3.2] 📝 BẢN NHÁP SPEC — Vui lòng review kỹ trước khi chốt:

📄 File: /project-root/workspace/PROJ-123/spec/refined-draft.md
────────────────────────────────────────────
## 🧩 User Story
As a **khách hàng giao dịch cổ phiếu**, I want to **export báo cáo giao dịch
thành PDF** so that **lưu trữ cho mục đích đối soát cá nhân**.

## 💼 Business Context
...(full content shown)...

## ✅ Acceptance Criteria
```gherkin
Scenario: Export thành công
  Given user ở trang Báo cáo giao dịch
  When user nhấn nút "Export PDF"
  Then hệ thống tải file PDF chứa đầy đủ dữ liệu
```
...(full content shown)...
────────────────────────────────────────────

📊 Đánh giá: User Story 100% | AC 95% | Assumptions 90% | Stress-test 95%
📊 Confidence tổng: 🟢 95%

⏳ Bạn hãy review và phản hồi:
- ✅ "OK" → Chốt bản cuối
- ✏️ Góp ý → Sửa và trình lại

[User: "AC thiếu case export khi không có dữ liệu, bổ sung thêm"]

[Bước 3.2 — Vòng 2] Đã sửa, trình lại toàn bộ:
────────────────────────────────────────────
...(full revised content shown with new AC added)...
────────────────────────────────────────────

Bản sửa đã đúng ý bạn chưa?

[User: "OK, chốt"]

[Bước 3.3] ✅ Bản cuối cùng đã chốt!
📄 File: /project-root/workspace/PROJ-123/spec/refined.md
📊 Confidence: 95%

Bạn có muốn push lên Jira không?

[User: "OK"]

[Phase 4] Pushing to Jira...

✅ Description updated
✅ Push log created

🔗 View updated task: https://domain.atlassian.net/browse/PROJ-123

Next steps:
- /qa-test-design PROJ-123 (design tests)
- /tech-spec PROJ-123 (write tech spec)
- /e2e-delivery PROJ-123 (full pipeline)
```

---

## Công thức Tin cậy (Confidence Formula)

```
confidence = (user_story_completeness * 0.30) + 
             (ac_testability * 0.30) + 
             (assumptions_surfaced * 0.20) + 
             (stress_test_score * 0.20)
```

**Thang đo từng thành phần (0.0 - 1.0):**

- **user_story_completeness:**
  - 1.0: Có đầy đủ Role cụ thể + Goal + Value, không chung chung
  - 0.8: Thiếu 1 trong 3 hoặc Role hơi chung chung
  - 0.5: Role quá chung chung ("người dùng") hoặc thiếu 2/3
  - 0.0: Không có User Story hoặc hoàn toàn mơ hồ

- **ac_testability:**
  - 1.0: Tất cả AC đều có dạng Given-When-Then, testable, measurable
  - 0.8: Hầu hết AC testable, vài chỗ hơi mơ hồ
  - 0.5: Một nửa AC mơ hồ hoặc không testable
  - 0.0: Không có AC hoặc hoàn toàn không testable

- **assumptions_surfaced:**
  - 1.0: Đã gọi tên rõ ≥3 giả định quan trọng + risks + out-of-scope
  - 0.8: Có 2 giả định + risks
  - 0.5: Chỉ có 1 giả định hoặc không có risks
  - 0.0: Không surface giả định nào

- **stress_test_score:**
  - 1.0: Đã stress-test với ≥3 tiêu chí (User Value, Feasibility, Differentiation, Risk)
  - 0.8: Stress-test 2 tiêu chí
  - 0.5: Stress-test 1 tiêu chí
  - 0.0: Không stress-test

**Ngưỡng Chất lượng:**
- **≥90% (0.90):** 🟢 Cao — Sẵn sàng handoff
- **80-89% (0.80-0.89):** 🟡 Trung bình — Cần cải thiện nhỏ
- **70-79% (0.70-0.79):** 🟠 Thấp — Cần làm rõ thêm
- **<70% (<0.70):** 🔴 Rất thấp — Chưa đủ để handoff

---

## Quy tắc Chất lượng

### 1. Luôn Sử dụng AskUserQuestion

**KHI NÀO:** Mỗi khi confidence < 90% về bất kỳ thành phần nào

**KHÔNG BAO GIỜ:** Guess hoặc assume thông tin quan trọng

Ví dụ sai:
```
❌ "Tôi giả sử users muốn PDF format"
❌ "Có lẽ compliance không phải vấn đề"
```

Ví dụ đúng:
```
✅ [AskUserQuestion triggered]
Q: "Export format: PDF, Excel, CSV, hay multiple formats?"
```

---

### 2. Từ chối Spec Quá Mơ hồ

Nếu sau 2-3 vòng AskUserQuestion mà vẫn < 80% confidence, NÓI THẲNG:

```
"Tôi đã hỏi nhiều câu nhưng vẫn chưa đủ thông tin để tạo spec chất lượng cao.
Các thông tin còn thiếu:
- [Gap 1]
- [Gap 2]

Bạn có thể cung cấp thêm không, hoặc tôi nên draft một spec ở mức confidence thấp hơn?"
```

**KHÔNG BAO GIỜ** im lặng chấp nhận spec yếu.

---

### 3. Grounded trong Codebase (nếu có)

Khi đang trong một codebase, **BẮT BUỘC** phải:

1. **Scan architecture trước khi suggest solution**
   ```bash
   # Tìm patterns hiện tại
   grep -r "export" --include="*.ts" --include="*.js"
   
   # Tìm API endpoints tương tự
   find . -name "*controller.ts" -o -name "*routes.ts"
   ```

2. **Cite cụ thể các file và patterns**
   ```
   ✅ "Dựa trên src/api/reports/controller.ts:45, hệ thống đã có 
   ReportExportService. Ta có thể mở rộng service này thay vì tạo mới."
   
   ❌ "Ta có thể tạo một export service"
   ```

3. **Respect existing constraints**
   ```
   ✅ "Codebase dùng Bull queue cho async jobs (xem src/queue/), 
   nên ta dùng pattern này cho large exports."
   
   ❌ "Ta có thể dùng Celery" (khi codebase không có Python)
   ```

---

### 4. Tone: Trung thực, Không Vuốt đuôi

**Khi stress-test một ý tưởng yếu:**

Ví dụ đúng:
```
✅ "Direction B có điểm User Value thấp (⭐⭐). Lý do: Không rõ ai thực sự 
cần feature này. 87 support tickets chủ yếu về compliance (Direction C), 
không phải về multi-format export. 

Nếu chọn B, rủi ro là build xong không ai dùng."
```

Ví dụ sai:
```
❌ "Direction B cũng OK, có thể serve power users."
```

**Chỉ ra over-engineering:**

```
✅ "Direction E (Report Library) là platform play lớn, nhưng scope quá rộng 
(2 tháng). Với 87 tickets cần giải quyết ngay, Quick Win (Direction A) hoặc 
Compliance-First (Direction C) sẽ deliver value nhanh hơn."
```

---

### 5. Fintech-Specific Checks

Với mọi feature liên quan tiền/giao dịch, **BẮT BUỘC** hỏi:

- [ ] Có rủi ro mất tiền không? (Fraud, double-charging, errors)
- [ ] Có rủi ro lộ lọt dữ liệu không? (PII, financial data)
- [ ] ACID compliance? (Transaction consistency)
- [ ] Audit trail? (Compliance requirements)
- [ ] Performance at scale? (Latency, throughput)

Nếu user không mention, **PHẢI HỎI RÕ:**

```
[AskUserQuestion triggered]
Q: "Feature này có chạm vào dữ liệu giao dịch hoặc tài chính không?"
Options:
- Có, export bao gồm transaction history
- Có, export bao gồm account balance
- Không, chỉ là static reports
```

---

## Ví dụ Output Chất lượng Cao

Xem `skills/ba-refine/examples.md` để có ví dụ đầy đủ về một phiên refine tốt.

**Đặc điểm của session tốt:**
- Không vội vàng (dành thời gian làm rõ)
- Đa dạng variations (không phải 20 ý tưởng nông cạn)
- Đánh giá trung thực (chỉ ra điểm yếu trong Direction 2)
- Có căn cứ (reference support ticket data, competitor analysis)
- Khả thi (các bước tiếp theo rõ ràng)

---

## Checklist Trước khi Push to Jira

Trước khi gọi `jira-push-spec.sh`, verify:

- [ ] **User Story:** Có đầy đủ Role + Goal + Value, KHÔNG chung chung
- [ ] **Acceptance Criteria:** ≥2 scenarios, dạng Given-When-Then, testable
- [ ] **Success Metrics:** Có baseline + target + measurement method
- [ ] **Assumptions:** Đã surface ≥3 giả định + risks
- [ ] **Confidence:** ≥90%
- [ ] **Tone:** Đã review, không có weasel words ("có lẽ", "có thể", "chắc")
- [ ] **Sạch template:** 2 lệnh `grep` ở Giai đoạn 4 Bước 1 không in ra gì
- [ ] **Bảng đúng cú pháp:** `DRY_RUN=1` báo đúng số bảng mong đợi

Nếu thiếu bất kỳ điều nào, QUAY LẠI Giai đoạn 1-3 để fix.

---

## Integration với Skills Khác

### Sau ba-refine, User có thể:

1. **Thiết kế tests:**
   ```
   /qa-test-design {issueKey}
   ```
   → Generate checklist + Gherkin từ refined AC

2. **Viết tech spec:**
   ```
   /tech-spec {issueKey}
   ```
   → Transform thành API contract + data model

3. **Full pipeline:**
   ```
   /e2e-delivery {issueKey}
   ```
   → Chạy toàn bộ BA → DEV → QA workflow

---

## Anti-Patterns (Tránh xa)

❌ **Over-generation:** Đẻ ra 20 variations nông cạn
✅ Thay vào: 5-8 variations sâu, mỗi cái có rationale rõ ràng

❌ **Yes-machine:** Chấp nhận mọi ý tưởng của user
✅ Thay vào: Challenge khi thấy vấn đề, suggest alternatives

❌ **Pure blue-sky:** Ignore mọi constraints kỹ thuật
✅ Thay vào: Grounded trong codebase, cite prior art

❌ **Guess thông tin:** Assume khi không chắc
✅ Thay vào: AskUserQuestion cho tới khi ≥90% confidence

❌ **Weasel words:** "Có lẽ", "Có thể", "Chắc là"
✅ Thay vào: Nói thẳng không biết, hoặc state assumptions rõ ràng

---

## Xử lý Edge Cases

### Case 1: User không trả lời đủ questions

Sau 3 vòng AskUserQuestion mà vẫn < 80% confidence:

```
"Tôi cần thêm thông tin để tạo spec chất lượng cao. Hiện tại confidence chỉ [X%].

Các câu hỏi chưa trả lời:
- [Question 1]
- [Question 2]

Bạn có thể:
1. Cung cấp thêm thông tin → Tôi tiếp tục refine
2. Chấp nhận spec ở confidence thấp hơn → Tôi draft với disclaimer
3. Hoãn lại → Tôi lưu progress, bạn quay lại sau

Bạn muốn làm gì?"
```

### Case 2: Jira task quá lớn (Epic scope)

```
"Task này có vẻ là Epic scope (vd: 'Xây dựng hệ thống báo cáo hoàn chỉnh').

ba-refine works best với single feature (Story-level).

Bạn có thể:
1. Break thành sub-tasks nhỏ hơn → Tôi refine từng cái
2. Tiếp tục với Epic scope → Tôi sẽ focus vào MVP slice

Bạn muốn làm gì?"
```

### Case 3: Codebase constraints conflict với idea

```
"Direction B (Multi-format export) đẹp trên lý thuyết, nhưng conflict với 
codebase hiện tại:

- Codebase dùng wkhtmltopdf (chỉ support PDF)
- Thêm Excel export cần library mới (exceljs) + significant refactor
- Estimated: 2-3 weeks thay vì 1 week

Alternatives:
- Direction A: PDF-only, ship nhanh (3 days)
- Direction C: PDF với compliance features, differentiated (2 weeks)

Recommend: C over B (tính chiến lược cao hơn, cost tương đương)

Bạn nghĩ sao?"
```

---

## Success Metrics cho Skill này

Đo lường chất lượng của ba-refine:

| Metric             | Target   | Cách đo                                 |
|--------------------|----------|-----------------------------------------|
| Average Confidence | ≥90%     | Từ confidence assessment trong specs    |
| Jira Bounce Rate   | <10%     | % specs bị reject và phải refine lại    |
| Downstream Rework  | <20%     | % specs cần sửa đổi lớn trong dev phase |
| Time to Refine     | <2 hours | Từ invoke skill đến push to Jira        |
