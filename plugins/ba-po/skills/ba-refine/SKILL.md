---
name: ba-refine
description: "Brainstorm, phân kỳ-hội tụ (refine) các ý tưởng thô/mơ hồ thành spec chi tiết rõ ràng, sau đó cập nhật lại lên Jira. Dùng khi có Jira task ý tưởng sơ khai/mơ hồ cần làm rõ; không dùng để import Jira lần đầu khi đã có spec rõ ràng."
metadata:
  version: "1.0.0"
  short-description: "Brainstorm, phân kỳ-hội tụ (refine) ý tưởng thô thành spec Jira..."
  disable-auto-invoke: true
---

# Kỹ năng Mài giũa Spec (ba-refine)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey` Jira + ý tưởng thô; metadata Jira lấy qua n8n (`prepJiraContext`). Thiếu input thì DỪNG và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** File `refined.md`/`final.md` pass `validate-ba-refine.js`, `testability-manifest.json` tồn tại; chỉ báo đã đẩy Jira khi có phản hồi HTTP thật; không dựng mockup khi chưa có `spec/asis-inventory.md`.

## Tổng quan & Ranh giới Nghiệp vụ (WHAT & WHY)

Tải Jira task thô → Brainstorm 5 chiều nghiệp vụ & phản biện xung đột (Zero Technical Noise) → Dựng mockup Prod-Twin (nếu có UI) → Xuất bản `spec/final.md` và cập nhật lên Jira.

- **Dùng khi:** Jira task chỉ có ý tưởng sơ khai/mơ hồ cần phân kỳ-hội tụ, làm rõ AC hoặc dựng mockup.
- **KHÔNG dùng khi:** Jira/Confluence đã có đặc tả đầy đủ cần tổng hợp bàn giao ngay → dùng `ba-spec`.

| Khía cạnh | ✅ ba-refine LÀM (Ngôn ngữ Nghiệp vụ) | ❌ NGHIÊM CẤM (Nhiễu Kỹ thuật & Vượt phạm vi) |
|---|---|---|
| **Phạm vi** | Phân tích Jira/Confluence, brainstorm 5 chiều, viết `refined.md` 5 phần & `final.md` | Viết code, SQL, test script; bàn kiến trúc/DB Schema; tự push Jira khi chưa qua Gate |
| **Dữ liệu & Lỗi** | Tên thông tin nghiệp vụ (Mã CK, Giá trần, Tỷ lệ ký quỹ), tình huống ngoại lệ (mất kết nối Sở, hụt sức mua) | Tên bảng (`security_definition_v3`), kiểu cột (`int64`, `JSONB`), HTTP Method/Status, JSON keys, Exception/Stack trace |
| **UI & Trạng thái** | Hành vi người dùng, trạng thái nghiệp vụ (Chờ gửi → Đã vào sổ → Khớp), nhúng ảnh mockup highlight `added/modified` | Cờ code (`is_active`), suy diễn phong cách UI, mô tả design bằng text hoặc chèn ghi chú QA/BA trong ảnh mockup |

> ⚠️ **DOMAIN CHỨNG KHOÁN:** Khi liên quan đặt/sửa/hủy lệnh, sổ lệnh, bảng giá, KRX/MDDS, ký quỹ — bắt buộc đối chiếu [securities-domain-rules.md](../../../../references/securities-domain-rules.md).

## 1. Hai Approval Gates Bắt buộc

| Gate | Vị trí | Hành động bắt buộc |
|---|---|---|
| **Gate 1** | Cuối Phase 0 | Trình bảng tài liệu + task liên quan + UI inventory (nếu có) → **DỪNG chờ user gõ OK** |
| **Gate 2** | Cuối Phase 3 | Trình toàn bộ `refined-draft.md` 5 phần chuẩn Jira (đã pass `validate-ba-refine.js`, mục UI chỉ nhúng ảnh mockup) → **DỪNG chờ user approve** trước khi lưu `refined.md` & push |

## 2. Quy trình 4 Giai đoạn Thực thi Ngay

- **Giai đoạn 0 (Thu thập & Đối chiếu Ngành — Gate 1):**
  - Chuẩn hóa `{issueKey}`, gọi n8n `prepJiraContext(issueKey)` (`scripts/lib/n8n-client.js`), quét Confluence/attachments, bóc tách từ khóa tiêu đề (bỏ `[WEB]`/`[APP]`) để tìm task liên quan, đối chiếu quy tắc ngành tại `../../../../references/securities-domain-rules.md`.
  - **Nếu có thay đổi UI (WEB/APP):** Ủy quyền `ba-design-mockup` trích xuất AS-IS (`capture-asis-dom.js`/`extract-asis-ui.js`), dựng HTML Full HD `1920x1080`, highlight phần mới (`data-change="added|modified"`), chạy `validate-mockup-fidelity.js` (≥90%) và render ảnh Retina 2x qua `render-mockup.js`.
  - Trình bảng tài liệu cho user duyệt tại **Gate 1**.
- **Giai đoạn 1 (Phân kỳ 5 Chiều Nghiệp vụ):**
  - Mở rộng theo 5 chiều: **(1) Who** (Nhóm KH: Normal/VIP/Ultimate, tiểu khoản Thường/Margin) · **(2) Why** (Mục tiêu kinh doanh, quy định KRX/UBCKNN) · **(3) What Rules** (Điều kiện, công thức sức mua/phí/thuế/ký quỹ, biên) · **(4) When** (Phiên ATO/Liên tục/ATC/PLO/Nghỉ × Sàn HOSE/HNX/UPCoM/Phái sinh) · **(5) User Journey**.
  - Chất vấn gap 🔴 Critical qua `ba-interview-me` (chỉ hỏi theo `autonomy-contract.md`) đến khi confidence ≥ 90%.
- **Giai đoạn 2 (Phản biện & Hội tụ):** Stress-test xung đột quy tắc nghiệp vụ (sức mua, lô lẻ, cảnh báo CR/CA/RES/SUS, hủy/sửa khi chờ Sở, đình chỉ giữa phiên, call margin) và chốt 2–3 phương án để user chọn.
- **Giai đoạn 3 (Soạn Spec 5 Phần & Kiểm định — Gate 2):**
  - Tạo `workspace/issues/{issueKey}/spec/refined-draft.md` gồm đúng 5 phần chuẩn Jira:
    1. `## 🧩 User Story` (`**As a** ... **I want** ... **So that** ...`)
    2. `## 💼 Business Context` (`Vấn đề`, `Mục tiêu`, `Tính cấp thiết`, `Phạm vi`)
    3. `## ✅ Acceptance Criteria` (Khối `gherkin` sạch: **không `@tags` automation**, **không `[AC-x.y]`**, dùng `Scenario: Happy - ...`, `Validation - ...`, `Edge - ...`)
    4. `## 🎨 UI Design / Mockup` (**CHỈ nhúng ảnh `![...](...)`**, tuyệt đối không text mô tả thêm; ghi `N/A` nếu backend)
    5. `## ☀️ Success Criteria & Tracking` (Bảng Success Metrics & Tracking)
  - Chạy Hard Gate: `node scripts/validators/validate-ba-refine.js "workspace/issues/{issueKey}/spec/refined-draft.md" [--ui]` (bắt buộc PASS 100%), sau đó trình **Gate 2**.
- **Giai đoạn 4 (Push Jira, Dọn Nháp & Handoff):**
  - Đẩy mô tả Jira qua n8n hoặc `jira-push-spec.js` (tự upload + nhúng ảnh mockup inline ADF `mediaSingle`, tự sinh `spec/testability-manifest.json`, và dọn các file nháp `refined-draft.md`, `adf.json`, `.scratch/` để giữ bộ `refined.md`, `final.md`, `testability-manifest.json`, mockup chính thức). Handoff DEV/QA (`/qa-test-design`).

## 3. Tài nguyên Mở rộng (Chỉ mở khi cần)

- **Workflow & Rubric:** [quick-start-checklist.md](references/quick-start-checklist.md) · [workflow-and-phases.md](references/workflow-and-phases.md) · [quality-rules.md](references/quality-rules.md) · [refinement-criteria.md](references/refinement-criteria.md) · [frameworks.md](references/frameworks.md) · [securities-domain-rules.md](../../../../references/securities-domain-rules.md)
- **Assets & Mockup:** [jira-push-spec.js](assets/jira-push-spec.js) · [jira-description-template.md](assets/jira-description-template.md) · [render-mockup.js](assets/render-mockup.js) · [generate-ui-component-map.js](assets/generate-ui-component-map.js) · [ui-component-map.json](../ba-design-mockup/references/ui-component-map.json)

## 4. Ví dụ mẫu Đầu Ra Thuần Nghiệp Vụ

> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

```markdown
## 🧩 User Story
**As a** Nhà đầu tư giao dịch ký quỹ (Margin)  
**I want** chủ động lựa chọn gói phí ưu đãi theo kỳ hạn  
**So that** tối ưu hóa chi phí vay vốn phù hợp chiến lược nắm giữ

## 💼 Business Context
- **Vấn đề:** Khách hàng giao dịch ngắn hạn đang chịu mức lãi suất thả nổi cố định cả kỳ.
- **Mục tiêu:** Cung cấp gói T+10, T+30 giúp tăng dư nợ margin và giữ chân nhà đầu tư.
- **Tính cấp thiết:** Đối thủ đã triển khai gói linh hoạt trước mùa báo cáo quý.
- **Phạm vi:** Tài khoản ký quỹ cá nhân đã kích hoạt hạn mức (loại trừ tài khoản thường/phái sinh).

## ✅ Acceptance Criteria
```gherkin
Feature: Đăng ký gói vay margin ưu đãi theo kỳ hạn

  Scenario: Happy - Đăng ký gói T+10 thành công
    Given Tài khoản ký quỹ đang hoạt động bình thường
    When Nhà đầu tư chọn gói T+10 và xác nhận đăng ký
    Then hệ thống áp dụng lãi suất ưu đãi cho các món giải ngân mới phát sinh

  Scenario: Validation - Từ chối khi chưa kích hoạt hạn mức ký quỹ
    Given Tài khoản chưa hoàn tất hợp đồng ký quỹ
    When Nhà đầu tư chọn đăng ký gói vay
    Then hệ thống từ chối và hướng dẫn kích hoạt hạn mức

  Scenario: Edge - Hết thời hạn gói ưu đãi
    Given Gói lãi suất ưu đãi đã quá ngày hết hạn
    When phát sinh dư nợ mới sau ngày hết hạn
    Then lãi suất tự động quay về mức thả nổi theo biểu phí hiện hành
```

## 🎨 UI Design / Mockup

![Đăng ký gói vay margin ưu đãi](workspace/issues/PROJ-123/spec/diagrams/mockup-case-1.png)

## ☀️ Success Criteria & Tracking

| Metric | Current | Target | Measurement | Event | Dashboard | Owner |
|---|---|---|---|---|---|---|
| Tỷ lệ kích hoạt gói | 0% | 35% | Báo cáo dư nợ Margin hàng tuần | Đăng ký gói ưu đãi | Margin Growth Dashboard | Khối Nguồn vốn |
```

## Red Flags & Xác minh (Verification)

- **Biện minh sai:** *"Thêm tên bảng DB/API cho dev dễ hiểu"* hoặc *"Tự vẽ mockup theo cảm tính"* → Vi phạm Zero Technical Noise & Prod-Twin Fidelity Gate.
- **Red Flags:** Push Jira trước Gate 1/2; chèn ghi chú QA/BA (`① ② ③`, `UI Delta Mapping`) hoặc mô tả text vào mục `## 🎨 UI Design / Mockup`.
- [ ] `refined.md`, `final.md`, `testability-manifest.json` tồn tại và pass `validate-ba-refine.js`.
- [ ] Nếu có UI: `validate-mockup-fidelity.js` ≥ 90% và đã review ảnh Retina 2x chống vỡ layout.
