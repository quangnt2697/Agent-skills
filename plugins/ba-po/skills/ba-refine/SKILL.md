---
name: ba-refine
description: Brainstorm, phân kỳ-hội tụ (refine) các ý tưởng thô/mơ hồ thành spec chi tiết rõ ràng, sau đó cập nhật lại lên Jira. Không dùng để import Jira lần đầu khi đã có spec rõ ràng.
trigger: Khi có Jira task ý tưởng sơ khai/mơ hồ cần brainstorm hoặc làm rõ yêu cầu. Kích hoạt bằng lệnh /ba-refine {issueKey}.
---

# Kỹ năng Mài giũa Spec (ba-refine)

Download Jira task có ý tưởng thô/mơ hồ → Mài giũa (refine) thuần túy theo tư duy nghiệp vụ (Zero Technical Noise) → Push lại lên Jira theo cấu trúc chuẩn và xuất bản `spec/final.md`.

## ⚠️ RANH GIỚI NHIỆM VỤ & BỘ LỌC CHỐNG KỸ THUẬT (Bắt buộc đọc trước)

| ✅ ba-refine LÀM (WHAT & WHY) | ❌ ba-refine KHÔNG LÀM (HOW TO BUILD) |
|---|---|
| Tải và phân tích Jira task, Confluence, attachments | Viết code, test script, SQL, API contract |
| Khai phóng ý tưởng theo 5 chiều nghiệp vụ cốt lõi | Bàn luận kiến trúc hệ thống, microservices, DB Schema |
| Stress-test xung đột quy tắc nghiệp vụ và phiên giao dịch | Viết JSON payload mẫu (camelCase, snake_case) |
| Viết `refined.md` 8 mục thuần nghiệp vụ (kèm Mục 8 UI khi có thay đổi màn hình) & push lên Jira | Tự ý push Jira trước khi user duyệt qua 2 gates |
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
| **Gate 2** | Bước 3.2 | Trình đồng thời: Toàn bộ draft 8 mục nghiệp vụ + Ảnh `mockup.png` + Bảng chú thích UI Delta ① ② ③ → **DỪNG chờ user approve** trước khi lưu `refined.md` |

## 2. Quy trình 4 Giai đoạn Theo Tư Duy Nghiệp Vụ

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 50 dòng.

- **Giai đoạn 0 (Thu thập Ý tưởng & Đối chiếu Quy tắc Ngành — Gate 1):**
  - Chuẩn hóa `{issueKey}`, đọc `.env`, lấy metadata Jira qua n8n Fast-Path (`prepJiraContext(issueKey)` từ `scripts/lib/n8n-client.js`).
  - Tự động tra cứu các quy định nghiệp vụ liên quan trong `references/securities/` (cấu trúc thị trường, phiên giao dịch, vòng đời lệnh, quy tắc margin) để nắm vững nền tảng nghiệp vụ trước khi phân tích.
  - **AS-IS Screen Discovery (Chốt chặn 2):** Khi task liên quan UI (WEB/APP), tra cứu `references/ui-component-map.json` và đọc trực tiếp file màn hình thực tế từ `dnse-trading` hoặc `mobile/arrow-app` để nắm đúng 90% khung màn hình cũ làm nền ngữ cảnh.
  - Quét Confluence + attachments, trình bảng tài liệu cho user duyệt qua **Gate 1**.

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
  - Tạo `refined-draft.md` theo cấu trúc **8 mục chuẩn nghiệp vụ**:
    1. **Mục tiêu & Giá trị Nghiệp vụ (Business Objective & Value)**
    2. **Phạm vi & Đối tượng Áp dụng (Scope & Actors — In/Out of Scope)**
    3. **Luồng Nghiệp vụ Chính (Main Business Flow — góc nhìn người dùng)**
    4. **Luồng Nghiệp vụ Phụ & Xử lý Ngoại lệ (Alternative & Exception Flows)**
    5. **Danh mục Quy tắc Nghiệp vụ & Công thức tính ([BR-01], [BR-02]...)**
    6. **Tiêu chí Nghiệm thu Nghiệp vụ ([AC-1.1], [AC-1.2]... dạng Business Checklist)**
    7. **Giả định Nghiệp vụ & Đo lường Thành công (Business Assumptions & Success Metrics)**
    8. **Thiết kế Giao diện & Điểm chạm Thao tác (UI/UX Mockup) — BẮT BUỘC khi task có UI**
  - **Quy tắc Dựng Mockup (Kiến trúc 4 Chốt Chặn & Case-Based):**
    - **Chốt chặn 1:** Tra cứu `references/ui-component-map.json` — Bắt buộc dùng component chuẩn, cấm viết inline CSS tự do.
    - **Chốt chặn 3 (Delta-Only & Case-Based):** Tái hiện khung màn hình cũ làm nền ngữ cảnh (as-is, opacity 0.75), làm nổi bật phần thay đổi kèm Huy hiệu đánh số chú thích `①`, `②`, `③`. **BẮT BUỘC chia theo từng Case/Kịch bản thao tác cụ thể** (Case 1: Thao tác chính / Luồng chuẩn, Case 2: Cảnh báo ngoại lệ / Lỗi, Case 3: Tình huống biên / Khóa phiên). **CẤM mô tả design bằng text lan man**, thay vào đó mỗi ảnh đều có ghi chú thao tác người dùng (Action) và phản hồi hệ thống (Response) gắn với `[BR-*]`, `[AC-*]`.
    - **Kết xuất Mockup ngay tại Bước 3.1:** Dựng `spec/diagrams/mockup.html` và chạy `render-mockup.js "mockup.html" "mockup.png" fit 2 all` sinh đủ ảnh `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png` để trình user duyệt tại Gate 2.
  - Trình toàn bộ draft 8 mục kèm ảnh Mockup từng Case và Ghi chú thao tác qua **Gate 2** để user phê duyệt.

- **Giai đoạn 4 (Đồng bộ lên Jira & Handoff Kỹ thuật):**
  - Cập nhật mô tả Jira qua n8n hoặc CLI helper `jira-push-spec.js`.
  - **Tự động upload toàn bộ ảnh `mockup*.png` và dán trực tiếp (inline image ADF `mediaSingle`) vào Mục 8 trong Description của Jira ticket**, đúng theo từng Case kèm ghi chú thao tác (không chỉ đính kèm file ở tab attachments).
  - **Tự động xuất bản `spec/testability-manifest.json`** chứa danh sách phần tử UI (kèm selector/badge/BR/AC gợi ý) để QA tự động sinh test code POM mà không phải gõ tay.
  - Handoff sang DEV (`/dev-tech-spec`) và QA (`/qa-test-design`).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC:**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc 5 bước ≤ 50 dòng.

- 🛠️ **Công cụ & Assets:**
  - [jira-push-spec.js](assets/jira-push-spec.js): CLI helper push ADF, upload ảnh Mockup và xuất manifest.
  - [jira-description-template.md](assets/jira-description-template.md): Template skeleton 8 mục chuẩn hóa.
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

```markdown
## 1. Mục tiêu & Giá trị Nghiệp vụ
Cho phép nhà đầu tư giao dịch ký quỹ (Margin) chủ động lựa chọn gói phí ưu đãi theo kỳ hạn để tối ưu chi phí vay.

## 2. Phạm vi & Đối tượng Áp dụng
- Áp dụng: Khách hàng cá nhân có tiểu khoản ký quỹ (đuôi 6) đã kích hoạt hạn mức.
- Không áp dụng: Khách hàng tổ chức, tài khoản thường (đuôi 1), tài khoản phái sinh.

## 3. Quy tắc Nghiệp vụ
- [BR-01] Lãi suất ưu đãi chỉ áp dụng cho các món giải ngân mới phát sinh trong thời gian hiệu lực của gói.
- [BR-02] Khi hết thời hạn gói, lãi suất tự động quay về mức thả nổi chuẩn theo quy định biểu phí hiện hành.

## 4. Tiêu chí Nghiệm thu Nghiệp vụ
- [AC-1.1] Xác minh hệ thống ghi nhận đúng mức lãi suất ưu đãi cho lệnh khớp mua ký quỹ trong ngày đăng ký gói.
- [AC-1.2] Xác minh hệ thống từ chối đăng ký gói khi tài khoản đang trong trạng thái bị phong tỏa hoặc diện Call Margin.
```

---
