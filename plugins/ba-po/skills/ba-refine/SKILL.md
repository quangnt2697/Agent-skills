---
name: ba-refine
description: Brainstorm, phân kỳ-hội tụ (refine) các ý tưởng thô/mơ hồ thành spec chi tiết rõ ràng, sau đó cập nhật lại lên Jira. Không dùng để import Jira lần đầu khi đã có spec rõ ràng.
trigger: Khi có Jira task ý tưởng sơ khai/mơ hồ cần brainstorm hoặc làm rõ yêu cầu. Kích hoạt bằng lệnh /ba-refine {issueKey}.
disable-auto-invoke: true
---

# Kỹ năng Mài giũa Spec (ba-refine)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey` Jira và ý tưởng thô; metadata Jira lấy qua n8n (`prepJiraContext`). Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** File `refined.md`/`final.md` tồn tại; chỉ báo đã đẩy Jira khi nhận phản hồi HTTP thật; không dựng mockup khi chưa có `spec/asis-inventory.md`.

Download Jira task có ý tưởng thô/mơ hồ → Mài giũa (refine) thuần túy theo tư duy nghiệp vụ (Zero Technical Noise) → Push lại lên Jira theo cấu trúc chuẩn và xuất bản `spec/final.md`.

## ⚠️ RANH GIỚI NHIỆM VỤ & BỘ LỌC CHỐNG KỸ THUẬT (Bắt buộc đọc trước)

| ✅ ba-refine LÀM (WHAT & WHY) | ❌ ba-refine KHÔNG LÀM (HOW TO BUILD) |
|---|---|
| Tải và phân tích Jira task, Confluence, attachments | Viết code, test script, SQL, API contract |
| Khai phóng ý tưởng theo 5 chiều nghiệp vụ cốt lõi | Bàn luận kiến trúc hệ thống, microservices, DB Schema |
| Stress-test xung đột quy tắc nghiệp vụ và phiên giao dịch | Viết JSON payload mẫu (camelCase, snake_case) |
| Viết `refined.md` 6 phần chuẩn Jira thuần nghiệp vụ (kèm Mục UI khi có thay đổi màn hình) & push lên Jira | Tự ý push Jira trước khi user duyệt qua 2 gates |
| Xuất bản `spec/final.md` chuẩn hóa bàn giao cho DEV & QA | Tự ý thiết kế bừa, lệch khỏi `ui-component-map.json` |

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
| **Gate 2** | Bước 3.2 | Trình đồng thời: Toàn bộ draft 6 phần chuẩn Jira + Ảnh `mockup.png` + Bảng chú thích UI Delta ① ② ③ → **DỪNG chờ user approve** trước khi lưu `refined.md` |

## 2. Quy trình 4 Giai đoạn Theo Tư Duy Nghiệp Vụ

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 50 dòng.

- **Giai đoạn 0 (Thu thập Ý tưởng, Trích xuất Từ khóa & Đối chiếu Quy tắc Ngành — Gate 1):**
  - Chuẩn hóa `{issueKey}`, đọc `.env`, lấy metadata Jira qua n8n Fast-Path (`prepJiraContext(issueKey)` từ `scripts/lib/n8n-client.js`).
  - **Trích xuất từ khóa từ Tiêu đề Task (Summary):** Tự động bóc tách từ khóa nghiệp vụ (loại bỏ prefix `[WEB]`, `[APP]` và stopwords) để tìm kiếm các task Jira và trang Confluence liên quan mật thiết.
  - Tự động tra cứu các quy định nghiệp vụ liên quan trong `references/securities/` (cấu trúc thị trường, phiên giao dịch, vòng đời lệnh, quy tắc margin) để nắm vững nền tảng nghiệp vụ trước khi phân tích.
  - **AS-IS Screen Discovery (Chốt chặn 2 — MASTER-BRANCH-FIRST):** Khi task liên quan UI (WEB/APP), tra cứu `references/ui-component-map.json` và **thực hiện toàn bộ Bước 11.A trong `workflow-and-phases.md`**: đọc các file màn hình đích trực tiếp từ **nhánh master/main** của `dnse-trading` hoặc `arrow-app` bằng `git show origin/master:<file>` (KHÔNG checkout), trích xuất bảng AS-IS DOM Inventory, đọc token CSS thực tế, và tạo file `spec/asis-inventory.md`. **⛔ CẤM dựng mockup khi chưa có file này.**
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
  - Tạo `refined-draft.md` theo cấu trúc **Jira Description chuẩn mực 6 phần**:
    1. **`## 🧩 User Story`** (`**As a** [role/persona cụ thể]`, `**I want** [hành động]`, `**So that** [giá trị đạt được]`)
    2. **`## 💼 Business Context`** (`Vấn đề (Problem)`, `Mục tiêu (Goal)`, `Tính cấp thiết (Urgency)`, `Phạm vi (Scope)`)
    3. **`## 📜 Business Rules`** (Danh mục quy tắc nghiệp vụ `[BR-01]`, `[BR-02]`, công thức tính toán)
    4. **`## ✅ Acceptance Criteria`** (Khối `gherkin` sạch: **tuyệt đối không có automation `@tags`**, **không có tiền tố `[AC-x.y]`**, sử dụng `Scenario: Happy - ...`, `Scenario: Validation - ...`, `Scenario: Edge - ...`)
    5. **`## 🎨 UI Design / Mockup`** (BẮT BUỘC khi task có UI: ảnh inline từng Case kèm điểm chạm thao tác `①`, `②`, `③` và Bảng UI Delta Mapping; ghi `N/A` nếu task backend)
    6. **`## ☀️ Success Criteria & Tracking`** (Bảng Success Metrics & Tracking)
  - **Kiểm định Hard Gate trước Gate 2:** Chạy lệnh `node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined-draft.md"` — BẮT BUỘC PASS 100% trước khi trình user.
  - **Quy tắc Dựng Mockup (Kiến trúc 4 Chốt Chặn & Case-Based):**
    - **Chốt chặn 0 (asis-inventory.md):** Tất cả phần tử UI trong mockup **BẮT BUỘC** có nguồn gốc trong `spec/asis-inventory.md` (sinh ra từ Bước 11.A). CẤM dựng mockup khi file này chưa tồn tại.
    - **Chốt chặn 1:** Tra cứu `references/ui-component-map.json` — Bắt buộc dùng component chuẩn, cấm viết inline CSS tự do.
    - **Chốt chặn 3 (Delta-Only & Case-Based):** Tái hiện khung màn hình cũ làm nền ngữ cảnh (as-is, opacity 0.75), làm nổi bật phần thay đổi kèm Huy hiệu đánh số chú thích `①`, `②`, `③`. **BẮT BUỘC chia theo từng Case/Kịch bản thao tác cụ thể** (Case 1: Thao tác chính / Luồng chuẩn, Case 2: Cảnh báo ngoại lệ / Lỗi, Case 3: Tình huống biên / Khóa phiên). **CẤM mô tả design bằng text lan man**, thay vào đó mỗi ảnh đều có ghi chú thao tác người dùng (Action) và phản hồi hệ thống (Response) gắn với `[BR-*]`.
    - **Kết xuất Mockup ngay tại Bước 3.1:** Dựng `spec/diagrams/mockup.html` và chạy `render-mockup.js "mockup.html" "mockup.png" fit 2 all` sinh đủ ảnh `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png` để trình user duyệt tại Gate 2.
    - **Chốt chặn 4 (Fidelity Check trước Gate 2):** Tính Fidelity Score = (số phần tử mockup khớp với asis-inventory.md) / (tổng) × 100%. **Ngưỡng bắt buộc ≥ 90%** trước khi trình Gate 2. Ghi Fidelity Score vào đầu Mục UI của `refined-draft.md`.
  - Trình toàn bộ draft kèm ảnh Mockup từng Case và Ghi chú thao tác qua **Gate 2** để user phê duyệt.

- **Giai đoạn 4 (Đồng bộ lên Jira & Handoff Kỹ thuật):**
  - Cập nhật mô tả Jira qua n8n hoặc CLI helper `jira-push-spec.js`.
  - **Tự động upload toàn bộ ảnh `mockup*.png` và dán trực tiếp (inline image ADF `mediaSingle`) vào Mục UI Design / Mockup trong Description của Jira ticket**, đúng theo từng Case kèm ghi chú thao tác (không chỉ đính kèm file ở tab attachments).
  - **Tự động xuất bản `spec/testability-manifest.json`** chứa danh sách phần tử UI (kèm selector/badge/BR/AC gợi ý) để QA tự động sinh test code POM mà không phải gõ tay.
  - Handoff sang DEV (`/dev-tech-spec`) và QA (`/qa-test-design`).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC:**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc 5 bước ≤ 50 dòng.

- 🛠️ **Công cụ & Assets:**
  - [jira-push-spec.js](assets/jira-push-spec.js): CLI helper push ADF, upload ảnh Mockup và xuất manifest.
  - [jira-description-template.md](assets/jira-description-template.md): Template skeleton 6 phần chuẩn Jira.
  - [mockup-harness.html](assets/mockup-harness.html): Bộ khung HTML UI Kit chuẩn và styling Delta-Only.
  - [render-mockup.js](assets/render-mockup.js): Script chụp ảnh Retina 2x qua Playwright.
  - [generate-ui-component-map.js](assets/generate-ui-component-map.js): Script quét tự động codebase Web & Mobile.

- 📖 **Tài liệu chi tiết (references/):**
  - [ui-component-map.json](references/ui-component-map.json): Chỉ mục Màn hình UI & Component Design System chuẩn.
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

## 📜 Business Rules
- [BR-01] Lãi suất ưu đãi chỉ áp dụng cho các món giải ngân mới phát sinh trong thời gian hiệu lực của gói.
- [BR-02] Khi hết thời hạn gói, lãi suất tự động quay về mức thả nổi chuẩn theo quy định biểu phí hiện hành.

## ✅ Acceptance Criteria
```gherkin
Feature: Đăng ký gói vay margin ưu đãi theo kỳ hạn

  Scenario: Happy - Đăng ký gói vay ưu đãi T+10 thành công
    Given Tài khoản ký quỹ có trạng thái hoạt động bình thường
    When Khách hàng chọn gói vay T+10 và xác nhận đăng ký
    Then Hệ thống ghi nhận mức lãi suất ưu đãi cho các lệnh giải ngân mới trong ngày

  Scenario: Validation - Từ chối khi tài khoản đang diện Call Margin
    Given Tài khoản ký quỹ đang chạm tỷ lệ cảnh báo Call Margin
    When Khách hàng yêu cầu đăng ký gói lãi suất ưu đãi
    Then Hệ thống từ chối và hiển thị thông báo "Tài khoản đang diện cảnh báo, không thể đăng ký gói ưu đãi"

  Scenario: Edge - Giải ngân vào ngày cuối cùng của hiệu lực gói
    Given Gói ưu đãi đang ở ngày cuối cùng của chu kỳ hiệu lực
    When Lệnh mua ký quỹ khớp thành công trong phiên liên tục
    Then Món vay vẫn được áp dụng lãi suất ưu đãi cho đến hết ngày theo đúng quy chế
```
```

---
