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
2. **Sinh Mã HTML & Inline SVG:**
   - Tuân thủ cấu trúc khung và Design Tokens tại [references/style-guide.md](references/style-guide.md) và [references/output-spec.md](references/output-spec.md).
   - Đảm bảo SVG responsive (`viewBox`), nhãn trên mũi tên có masking rect che đường kẻ.
3. **Xuất Ảnh PNG/SVG:**
   - Sử dụng script tại `assets/export.py` hoặc Playwright theo hướng dẫn [references/export.md](references/export.md).

## Verification (Xác minh)

- [ ] Sơ đồ sinh ra là file HTML độc lập chứa inline SVG (không dùng Mermaid).
- [ ] Tuân thủ bảng màu Editorial (Coral/Accent chỉ dùng cho 1–2 điểm nhấn chính).
- [ ] Mật độ thông tin đạt chuẩn (Target Density 4/10, tối đa 9 nodes trên 1 sơ đồ).
- [ ] File ảnh xuất ra (PNG/SVG) hiển thị rõ nét, không lỗi font hoặc vỡ layout.

## Red Flags (Cờ đỏ)

- Dùng Mermaid thay vì HTML/inline SVG.
- Áp dụng dark mode kết hợp hiệu ứng neon xanh tím làm rối mắt.
- Tô màu nhấn (Accent) bừa bãi trên nhiều hơn 2 nodes.
- Quên thêm masking rect cho nhãn text trên đường nối dẫn tới chữ bị gạch ngang.

## Common Rationalizations (Những lời Biện minh Thường gặp)

- *"Dùng Mermaid cho nhanh, vẽ HTML/SVG chi cho phức tạp"* → Mermaid render thô, dễ vỡ khung và không thể hiện được tính chuyên nghiệp của sản phẩm.
- *"Thêm nhiều màu và hiệu ứng dạ quang cho sơ đồ sinh động"* → Vi phạm phong cách Editorial, làm phân tán sự tập trung của người đọc khỏi logic chính.
