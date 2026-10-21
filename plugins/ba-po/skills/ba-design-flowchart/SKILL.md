---
name: ba-design-flowchart
description: Tạo và render sơ đồ kiến trúc, nghiệp vụ (flowchart, sequence, ERD...) dạng HTML/SVG tĩnh với hệ thống thiết kế Editorial (không dùng Mermaid). Tích hợp khả năng xuất PNG/SVG qua Playwright.
trigger: Khi cần vẽ flowchart, sequence, ERD, kiến trúc hệ thống, hoặc chuyển đổi file HTML diagram sang hình ảnh PNG/SVG để đính kèm Jira/báo cáo.
metadata:
  version: "3.1"
---

# ba-design-flowchart

## Overview (Tổng quan)

Tạo sơ đồ nghiệp vụ và kiến trúc dưới dạng file HTML độc lập chứa SVG nội tuyến theo hệ thống thiết kế Editorial chuẩn mực. Hỗ trợ các loại sơ đồ trực quan cốt lõi (flowchart, sequence, swimlane, er, db-schema, architecture, deployment, state, process, data-flow) và xuất file PNG/SVG chất lượng cao qua Playwright, thay thế hoàn toàn Mermaid.

## When to Use (Khi nào sử dụng)

- Khi cần vẽ sơ đồ luồng quy trình (Flowchart, Swimlane), kiến trúc hệ thống (Architecture, Deployment), hoặc cơ sở dữ liệu (ERD).
- Khi tài liệu kỹ thuật/nghiệp vụ cần trực quan hóa thay vì mô tả bằng bảng hoặc văn bản dài dòng.
- Khi cần xuất ảnh PNG/SVG chất lượng cao gắn vào Jira ticket hoặc báo cáo Sprint.

## Quy Trình Thực Thi & Tài Liệu Tham Chiếu

1. **Chọn Semantic Pattern & Visual Type:**
   - Tra cứu [references/visual-types-catalog.md](references/visual-types-catalog.md) để chọn loại sơ đồ phù hợp nhất.
   - Tham chiếu [references/semantic-patterns.md](references/semantic-patterns.md) khi sơ đồ mô tả hành vi/kiểm soát.

2. **Sinh Mã HTML & Inline SVG (Chuẩn hóa Full HD & Không Lỗi SVG):**
   - **Tối ưu Canvas cho màn hình Full HD trở lên (≥ 1920x1080):**
     - Mặc định sử dụng tỷ lệ chuẩn `16:9` (`viewBox="0 0 1920 1080"` cho canvas Full HD hoặc `1280 720`).
     - **Quy tắc Bẻ dòng (Multi-row Flow Wrapping / Z-Pattern):** CẤM TUYỆT ĐỐI vẽ luồng trải dài 1 hàng ngang duy nhất vượt quá 6 nodes (khiến viewBox bị dẹt > 2500px, khi snapshot vào màn hình Full HD chữ bị thu nhỏ còn 3-4px không đọc được). Nếu luồng dài > 5 bước, BẮT BUỘC gập dòng theo hình chữ Z hoặc bố cục Swimlane/Cột.
     - **Safe Margin:** Duy trì khoảng trống an toàn tối thiểu 40px - 60px ở 4 mép canvas để khi snapshot không bị sát viền hay cắt cụt thông tin.
   - **Tiêu chuẩn SVG thuần (Chống lỗi font và mất chữ):**
     - **CẤM DÙNG `<foreignObject>`:** Toàn bộ nhãn text BẮT BUỘC dùng thẻ `<text>` và `<tspan>` SVG thuần để tương thích 100% với mọi trình xem ảnh, Figma, PowerPoint và Jira (không bị rỗng chữ).
     - Nhãn trên mũi tên bắt buộc có thẻ `<rect>` masking nền để che đường line.
   - Tuân thủ Design Tokens tại [references/style-guide.md](references/style-guide.md) và [references/output-spec.md](references/output-spec.md).

3. **Xuất Ảnh PNG Sắc Nét & SVG Chuẩn Mực:**
   - Sử dụng script nâng cấp tại `assets/export.py`:
     ```bash
     python3 ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-flowchart/assets/export.py <diagram.html> --both 2.0
     ```
   - **PNG Snapshot:** Chạy qua Playwright với Viewport Full HD `1920x1080`, device scale factor 2.0, đợi `document.fonts.ready` đảm bảo ảnh không bị nhòe hay nhảy font.
   - **SVG Export:** Tự động chuẩn hóa XML 1.1, escape `&amp;` trong Google Fonts URL, chuyển đổi `rgba(...)` sang hex + opacity tương thích mọi nền tảng.

## Verification (Xác minh)

- [ ] Sơ đồ sinh ra là file HTML độc lập chứa inline SVG (không dùng Mermaid).
- [ ] Canvas tối ưu tỷ lệ 16:9 Full HD, luồng dài được gập dòng gọn gàng, không kéo dẹt ngang.
- [ ] Không chứa thẻ `<foreignObject>` — toàn bộ text dùng thẻ `<text>` SVG thuần.
- [ ] Tuân thủ bảng màu Editorial (Coral/Accent chỉ dùng cho 1–2 điểm nhấn chính).
- [ ] Mật độ thông tin đạt chuẩn (Target Density 4/10, tối đa 9 nodes trên 1 sơ đồ).
- [ ] File ảnh xuất ra (PNG/SVG) hiển thị rõ nét, không lỗi font hoặc vỡ layout.

## Red Flags (Cờ đỏ)

- Dùng Mermaid thay vì HTML/inline SVG.
- Vẽ sơ đồ 1 hàng ngang dài ngoằng (> 6 nodes) làm chữ bị teo nhỏ khi snapshot Full HD.
- Dùng thẻ `<foreignObject>` chứa HTML div/p bên trong SVG dẫn tới mất trắng text trên các viewer ngoài.
- Áp dụng dark mode kết hợp hiệu ứng neon xanh tím làm rối mắt.
- Tô màu nhấn (Accent) bừa bãi trên nhiều hơn 2 nodes.
- Quên thêm masking rect cho nhãn text trên đường nối dẫn tới chữ bị gạch ngang.

## Common Rationalizations (Những lời Biện minh Thường gặp)

- *"Dùng Mermaid cho nhanh, vẽ HTML/SVG chi cho phức tạp"* → Mermaid render thô, tạo foreignObject gây lỗi file SVG và không đọc được trên nhiều trình xem.
- *"Vẽ 1 hàng ngang cho liền mạch"* → Khi snapshot vào màn hình Full HD 1920x1080, sơ đồ bị nén dẹt như sợi chỉ, mất thông tin và không đọc được chữ.
- *"Thêm nhiều màu và hiệu ứng dạ quang cho sơ đồ sinh động"* → Vi phạm phong cách Editorial, làm phân tán sự tập trung của người đọc khỏi logic chính.
