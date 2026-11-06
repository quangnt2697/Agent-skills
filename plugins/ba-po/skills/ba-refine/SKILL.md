---
name: ba-refine
description: Brainstorm, phân kỳ-hội tụ (refine) các ý tưởng thô/mơ hồ thành spec chi tiết rõ ràng, sau đó cập nhật lại lên Jira. Không dùng để import Jira lần đầu khi đã có spec rõ ràng.
trigger: Khi có Jira task ý tưởng sơ khai/mơ hồ cần brainstorm hoặc làm rõ yêu cầu. Kích hoạt bằng lệnh /ba-refine {issueKey}.
disable-auto-invoke: true
---

# Kỹ năng Mài giũa Spec (ba-refine)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey` Jira và ý tưởng thô; metadata Jira lấy qua n8n (`prepJiraContext`). Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** File `refined.md`/`final.md` tồn tại; chỉ báo đã đẩy Jira khi nhận phản hồi HTTP thật; không dựng mockup khi chưa có `spec/asis-inventory.md` hoặc snapshot từ link/codebase.

Download Jira task có ý tưởng thô/mơ hồ → Mài giũa (refine) thuần túy theo tư duy nghiệp vụ (Zero Technical Noise) → Push lại lên Jira theo cấu trúc chuẩn và xuất bản `spec/final.md`.

## ⚠️ RANH GIỚI NHIỆM VỤ & BỘ LỌC CHỐNG KỸ THUẬT (Bắt buộc đọc trước)

| ✅ ba-refine LÀM (WHAT & WHY) | ❌ ba-refine KHÔNG LÀM (HOW TO BUILD) |
|---|---|
| Tải và phân tích Jira task, Confluence, attachments | Viết code, test script, SQL, API contract |
| Khai phóng ý tưởng theo 5 chiều nghiệp vụ cốt lõi | Bàn luận kiến trúc hệ thống, microservices, DB Schema |
| Stress-test xung đột quy tắc nghiệp vụ và phiên giao dịch | Viết JSON payload mẫu (camelCase, snake_case) |
| Viết `refined.md` 5 phần chuẩn Jira thuần nghiệp vụ (kèm ảnh Mockup trong mục UI khi có thay đổi màn hình) & push lên Jira | Tự ý push Jira trước khi user duyệt qua 2 gates |
| Xuất bản `spec/final.md` chuẩn hóa bàn giao cho DEV & QA | Tự suy diễn giao diện/phong cách hoặc viết mô tả design bằng text trong mục UI |

### 🛡️ Bảng Ranh giới Ngôn ngữ Bất biến (Strict Business-Only Guardrail)

| Khía cạnh | ❌ NGHIÊM CẤM xuất hiện trong ba-refine | ✅ BẮT BUỘC dùng Ngôn ngữ Nghiệp vụ thay thế |
|---|---|---|
| **Dữ liệu** | Tên bảng DB (`security_definition_v3`), kiểu dữ liệu kỹ thuật (`varchar(50)`, `int64`, `JSONB`), câu lệnh SQL | Tên thông tin nghiệp vụ (Mã chứng khoán, Giá trần, Tỷ lệ ký quỹ ban đầu), quy tắc định dạng hiển thị & làm tròn |
| **Giao tiếp hệ thống** | HTTP Method (`POST /api/v1/orders`), JSON key (`camelCase`, `snake_case`), HTTP Status (`400`, `500`), Kafka topic, Redis cache | Hành động của người dùng/hệ thống (Nhà đầu tư gửi yêu cầu đặt lệnh, Hệ thống từ chối và thông báo lý do...) |
| **Xử lý lỗi** | Exception name, Stack trace, Timeout ms kỹ thuật, Deadlock, Thread pool | Tình huống ngoại lệ nghiệp vụ (Khi lệnh chưa nhận được phản hồi từ Sở giao dịch, Khi sức mua thay đổi trong lúc chờ duyệt) |
| **Luồng trạng thái** | Biến cờ trong code (`status = 2`, `is_active = true`) | Trạng thái nghiệp vụ của đối tượng (Chờ gửi lên Sở → Đã vào sổ lệnh → Khớp một phần → Hoàn tất) |

**Ranh giới với ba-spec:**
- **ba-spec**: Yêu cầu đã rõ ràng → tổng hợp + phát hiện gap → handoff `final.md`
- **ba-refine**: Yêu cầu thô/mơ hồ → brainstorm 5 chiều nghiệp vụ + hội tụ → cập nhật Jira + handoff `spec/final.md`

> ⚠️ **DOMAIN CHỨNG KHOÁN & FINTECH:**
> Khi spec liên quan đến giao dịch tài chính, đặt/sửa/hủy lệnh, sổ lệnh, bảng giá, KRX/MDDS, ký quỹ — **BẮT BUỘC** đọc `../../../../references/securities-domain-rules.md` trong suốt Phase 0-3.

## 1. Các Approval Gates Bắt buộc

> 📌 **ĐÂY LÀ 2 CỔNG CHẶN — vi phạm = lỗi nghiêm trọng.**

| Gate | Vị trí | Hành động bắt buộc |
|---|---|---|
| **Gate 1** | Cuối Phase 0 | Trình bảng tài liệu → **DỪNG chờ user gõ OK** |
| **Gate 2** | Bước 3.2 | Trình đồng thời: Toàn bộ draft 5 phần chuẩn Jira (trong đó mục `## 🎨 UI Design / Mockup` chỉ nhúng ảnh mockup đã highlight phần thiết kế mới, không mô tả bằng text) → **DỪNG chờ user approve** trước khi lưu `refined.md` |

## 2. Quy trình 4 Giai đoạn Theo Tư Duy Nghiệp Vụ

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 50 dòng.

- **Giai đoạn 0 (Thu thập Ý tưởng, Trích xuất Từ khóa & Đối chiếu Quy tắc Ngành — Gate 1):**
  - Chuẩn hóa `{issueKey}`, đọc `.env`, lấy metadata Jira qua n8n Fast-Path (`prepJiraContext(issueKey)` từ `scripts/lib/n8n-client.js`).
  - **Trích xuất từ khóa từ Tiêu đề Task (Summary):** Tự động bóc tách từ khóa nghiệp vụ (loại bỏ prefix `[WEB]`, `[APP]` và stopwords) để tìm kiếm các task Jira và trang Confluence liên quan mật thiết.
  - Tự động tra cứu các quy định nghiệp vụ liên quan trong `references/securities/` (cấu trúc thị trường, phiên giao dịch, vòng đời lệnh, quy tắc margin) để nắm vững nền tảng nghiệp vụ trước khi phân tích.
  - **AS-IS Screen Discovery & Mockup Generation (ba-design-mockup):** Khi task liên quan UI (WEB/APP), ủy quyền cho kỹ năng `ba-design-mockup` thực hiện:
    1. Trích xuất giao diện gốc từ link được cung cấp (`capture-asis-dom.js` ở độ phân giải Full HD `1920x1080`) hoặc đọc trực tiếp từ codebase (`extract-asis-ui.js`) để sinh `spec/asis-inventory.json` và `spec/asis-inventory.md`. **⛔ CẤM dựng mockup khi chưa có dữ liệu gốc, CẤM tự suy diễn phong cách.**
    2. Thiết kế giao diện đúng theo phong cách có sẵn của web/mobile được cung cấp, đảm bảo **độ phân giải tối thiểu Full HD (`1920x1080`)** đối với Web.
    3. Trong mockup **chỉ thiết kế theo đúng các yêu cầu của task**, đồng thời **highlight vào phần được thiết kế mới/sửa đổi (`data-change="added|modified"`)** để client dễ nhận ra đâu là phần mới so với thiết kế cũ. **TUYỆT ĐỐI KHÔNG thiết kế các ghi chú cho QA/BA** (không gắn huy hiệu `① ② ③`, không chèn bảng `UI Delta Mapping` vào mockup).
    4. Chạy `validate-mockup-fidelity.js` chấm điểm tự động (Fidelity Score ≥ 90%).
    5. Render ảnh Retina 2x qua `render-mockup.js`, kiểm tra `layout_check.layoutValid === true` và **bắt buộc dùng `read_file` mở ảnh `.png` để review trực quan đảm bảo không bị vỡ layout**.
  - Quét Confluence + attachments, trình bảng tài liệu và task liên quan cho user duyệt qua **Gate 1**.

- **Giai đoạn 1 (Khai phóng theo 5 Chiều Nghiệp vụ — Business-Driven Divergence):**
  - Mở rộng ý tưởng thô theo 5 câu hỏi nghiệp vụ cốt lõi:
    1. **Đối tượng & Phân quyền (Who):** Nhóm khách hàng/nhân sự nào tham gia? Quyền hạn khác nhau thế nào (Normal vs VIP/Ultimate, Thường vs Margin)?
    2. **Giá trị & Mục tiêu (Why):** Nhu cầu kinh doanh hay quy định pháp lý (KRX/UBCKNN) nào thúc đẩy tính năng này?
    3. **Điều kiện & Công thức (What Rules):** Điều kiện tiên quyết, công thức tính toán (sức mua, phí, thuế, tỷ lệ ký quỹ), ranh giới định lượng?
    4. **Thời điểm & Trạng thái (When):** Tính năng hoạt động khác nhau ra sao giữa các phiên (ATO, Liên tục, ATC, PLO, Nghỉ) và các sàn (HOSE, HNX, UPCoM, Phái sinh)?
    5. **Hành trình Người dùng (User Journey):** Người dùng bắt đầu từ đâu, thao tác bước nào, và nhận được kết quả/thông báo gì?
  - Chất vấn user qua `ba-interview-me` (chỉ hỏi câu 🔴 Critical theo `autonomy-contract.md`), đạt ≥90% confidence.

- **Giai đoạn 2 (Phản biện Nghiệp vụ & Tình huống Biên — Business Stress-Test & Convergence):**
  - Loại bỏ hoàn toàn việc stress-test hạ tầng kỹ thuật. Tập trung 100% vào phản biện xung đột nghiệp vụ:
    - **Tác động chéo:** Có mâu thuẫn với quy tắc tính sức mua, quy tắc lô lẻ, hay cảnh báo cổ phiếu (CR/CA/RES/SUS) hiện hành không?
    - **Xử lý ngoại lệ nghiệp vụ:** Khách hàng hủy/sửa khi lệnh đang chờ Sở, cổ phiếu bị đình chỉ giữa phiên, hoặc tài khoản chạm tỷ lệ call margin thì xử lý thế nào?
  - Gom các biến thể thành 2-3 hướng đi nghiệp vụ rõ ràng để user lựa chọn.

- **Giai đoạn 3 (Chuẩn hóa Tài liệu Đặc tả Nghiệp vụ & Dựng Mockup — Gate 2):**
  - Tạo `refined-draft.md` theo cấu trúc **Jira Description chuẩn mực 5 phần**:
    1. **`## 🧩 User Story`** (`**As a** [role/persona cụ thể]`, `**I want** [hành động]`, `**So that** [giá trị đạt được]`)
    2. **`## 💼 Business Context`** (`Vấn đề (Problem)`, `Mục tiêu (Goal)`, `Tính cấp thiết (Urgency)`, `Phạm vi (Scope)`)
    3. **`## ✅ Acceptance Criteria`** (Khối `gherkin` sạch: **tuyệt đối không có automation `@tags`**, **không có tiền tố `[AC-x.y]`**, sử dụng `Scenario: Happy - ...`, `Scenario: Validation - ...`, `Scenario: Edge - ...`)
    4. **`## 🎨 UI Design / Mockup`** (**CHỈ sử dụng hình ảnh mockup `![...](...)` trong phần design, TUYỆT ĐỐI KHÔNG mô tả design bằng text và KHÔNG ghi chú gì thêm**; ghi `N/A` nếu task backend)
    5. **`## ☀️ Success Criteria & Tracking`** (Bảng Success Metrics & Tracking)
  - **Quy tắc Dựng & Kiểm định Mockup (Khi task có UI):**
    - Thiết kế đúng theo phong cách có sẵn của web/mobile được cung cấp qua codebase hoặc link (không tự suy diễn).
    - Độ phân giải tối thiểu **Full HD (`1920x1080`)** đối với Web.
    - Trong mockup chỉ thiết kế theo các yêu cầu của task và **highlight vào phần được thiết kế mới (`data-change="added|modified"`)** để client dễ nhận ra; không thiết kế các ghi chú cho QA/BA (`① ② ③`, bảng `UI Delta Mapping`).
    - Sau khi render ảnh bằng `render-mockup.js`, **bắt buộc review ảnh `.png` để đảm bảo không bị vỡ layout**.
    - Trên file `refined-draft.md`, mục `## 🎨 UI Design / Mockup` chỉ nhúng ảnh mockup đó, không viết bất kỳ mô tả text hay ghi chú nào thêm.
  - **Kiểm định Hard Gate trước Gate 2:** Chạy lệnh `node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined-draft.md" --ui` — BẮT BUỘC PASS 100% trước khi trình user.
  - Trình toàn bộ draft kèm ảnh Mockup qua **Gate 2** để user phê duyệt.

- **Giai đoạn 4 (Đồng bộ lên Jira, Tự động Dọn dẹp Workspace & Handoff Kỹ thuật):**
  - Cập nhật mô tả Jira qua n8n hoặc CLI helper `jira-push-spec.js`.
  - **Tự động upload toàn bộ ảnh `mockup*.png` và dán trực tiếp (inline image ADF `mediaSingle`) vào Mục UI Design / Mockup trong Description của Jira ticket** (không chỉ đính kèm file ở tab attachments).
  - **Tự động xuất bản `spec/testability-manifest.json`** để QA tự động sinh test code POM.
  - **Tự động Dọn dẹp Workspace sau khi Push (Post-Push Cleanup):** Hệ thống tự động xóa sạch các file nháp (`refined-draft.md`, `adf.json`, `*.mmd`, `.scratch/`, file backup cũ và ảnh render thử nghiệm không được nhúng vào spec) để chỉ giữ lại bộ thành quả cuối cùng (`refined.md`, `final.md`, `testability-manifest.json`, `mockup.html`, script render và ảnh mockup chính thức).
  - Handoff sang DEV và QA (`/qa-test-design`).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC:**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc 5 bước ≤ 50 dòng.

- 🛠️ **Công cụ & Assets:**
  - [jira-push-spec.js](assets/jira-push-spec.js): CLI helper push ADF, upload ảnh Mockup và xuất manifest.
  - [jira-description-template.md](assets/jira-description-template.md): Template skeleton 5 phần chuẩn Jira.
  - [mockup-harness.html](assets/mockup-harness.html): Bộ khung HTML UI Kit chuẩn Full HD và styling Highlight.
  - [render-mockup.js](assets/render-mockup.js): Script chụp ảnh Retina 2x Full HD kèm kiểm tra vỡ layout qua Playwright.
  - [generate-ui-component-map.js](assets/generate-ui-component-map.js): Script quét tự động codebase Web & Mobile.

- 📖 **Tài liệu chi tiết (references/):**
  - [ui-component-map.json](../ba-design-mockup/references/ui-component-map.json): Chỉ mục Màn hình UI & Component Design System chuẩn.
  - [workflow-and-phases.md](references/workflow-and-phases.md): Chi tiết 4 phase theo tư duy nghiệp vụ.
  - [quality-rules.md](references/quality-rules.md): Bộ lọc chống kỹ thuật & Confidence Score.
  - [refinement-criteria.md](references/refinement-criteria.md): Rubric 4 tiêu chí stress-test nghiệp vụ.
  - [frameworks.md](references/frameworks.md): 5 chiều khai phóng ý tưởng nghiệp vụ.
  - [securities-domain-rules.md](../../../../references/securities-domain-rules.md): Quy tắc Domain ngành Chứng khoán.

## 4. Ví dụ mẫu Đầu Ra Thuần Nghiệp Vụ

> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

```markdown
## 🧩 User Story
**As a** Nhà đầu tư giao dịch ký quỹ (Margin)  
**I want** chủ động lựa chọn gói phí ưu đãi theo kỳ hạn  
**So that** tối ưu hóa chi phí vay vốn phù hợp với chiến lược nắm giữ cổ phiếu

## 💼 Business Context
- **Vấn đề (Problem):** Khách hàng giao dịch ngắn hạn hiện phải chịu mức lãi suất thả nổi cố định cả kỳ, làm giảm hiệu quả sinh lời và tăng tỷ lệ rời bỏ nền tảng.
- **Mục tiêu (Goal):** Cung cấp các gói lãi suất ưu đãi theo kỳ hạn (T+10, T+30), giúp tăng 20% dư nợ margin và giữ chân nhà đầu tư năng động.
- **Tính cấp thiết (Urgency):** Đối thủ đã tung các gói lãi suất linh hoạt; cần triển khai ngay trước thềm mùa báo cáo tài chính quý.
- **Phạm vi (Scope):** Áp dụng cho tài khoản ký quỹ cá nhân đã kích hoạt hạn mức; ngoài phạm vi: tài khoản thường và tài khoản phái sinh.

## ✅ Acceptance Criteria
```gherkin
Feature: Đăng ký gói vay margin ưu đãi theo kỳ hạn

  Scenario: Happy - Đăng ký gói vay ưu đãi T+10 thành công
    Given Tài khoản ký quỹ có trạng thái hoạt động bình thường
    When Nhà đầu tư chọn gói T+10 và xác nhận đăng ký
    Then hệ thống áp dụng lãi suất ưu đãi cho các món giải ngân mới phát sinh
    And hiển thị thông báo đăng ký thành công kèm ngày hết hạn gói

  Scenario: Validation - Từ chối khi tài khoản chưa kích hoạt hạn mức
    Given Tài khoản chưa hoàn tất hợp đồng ký quỹ
    When Nhà đầu tư chọn đăng ký gói vay
    Then hệ thống từ chối và hướng dẫn kích hoạt hạn mức ký quỹ

  Scenario: Edge - Hết thời hạn gói ưu đãi
    Given Gói lãi suất ưu đãi chạm mốc hết hạn
    When phát sinh dư nợ sau ngày hết hạn
    Then lãi suất tự động quay về mức thả nổi chuẩn theo quy định biểu phí hiện hành
```

## 🎨 UI Design / Mockup

![Đăng ký gói vay margin ưu đãi](workspace/issues/PROJ-123/spec/diagrams/mockup-case-1.png)

## ☀️ Success Criteria & Tracking

### Success Metrics

| Metric | Current | Target | Measurement |
|---|---|---|---|
| Tỷ lệ kích hoạt gói vay kỳ hạn | 0% | 35% | Đo lường qua báo cáo dư nợ Margin hàng tuần |

### Tracking

| Event | Dashboard / Report | Owner |
|---|---|---|
| Đăng ký gói vay ưu đãi | Margin Growth Dashboard | Khối Nguồn vốn & Margin |
```

---
