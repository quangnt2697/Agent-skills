---
name: ba-design-flowchart
description: Tạo và render sơ đồ Mermaid cho tài liệu kiến trúc, PR và tài liệu nghiệp vụ dưới dạng SVG, PNG hoặc ASCII qua CLI với 2 engine mmdc và beautiful.
trigger: Khi cần vẽ flowchart, sequence, ERD, kiến trúc hệ thống bằng Mermaid hoặc chuyển đổi file .mmd sang hình ảnh PNG/SVG.
---

# Kỹ Năng Thiết Kế & Render Sơ Đồ Mermaid (ba-design-flowchart)

## 1. Khi nào dùng?
- Cần trực quan hóa kiến trúc hệ thống, luồng dữ liệu, quy trình BPMN hoặc mô hình ERD trong tài liệu Spec/README.
- Chuyển đổi mã Mermaid (`.mmd`) thành hình ảnh chất lượng cao (PNG/SVG) hoặc dạng ASCII art cho terminal.
- Tự động hóa kết xuất sơ đồ trong CI/CD pipeline.

**Khi KHÔNG sử dụng:**
- Chỉ phân tích nghiệp vụ mà không cần vẽ sơ đồ → Dùng `ba-spec`.
- Thiết kế giao diện người dùng (UI Mockup) → Dùng công cụ thiết kế frontend.

## 2. Quy trình Thực hiện 4 Bước
- **Bước 1 (Soạn mã sơ đồ `.mmd`):** Bắt buộc tuân thủ Engine ELK (`flowchart LR`, orthogonal routing, straight spine, node taxonomy chuẩn).
- **Bước 2 (Lựa chọn Engine):**
  - **`mmdc` (Mặc định & Khuyến nghị):** Dùng Chrome headless, bố cục thẳng hàng chính xác tuyệt đối, hỗ trợ đầy đủ mũi tên nét đứt quay lại.
  - **`beautiful`:** Chạy thuần Node.js không cần trình duyệt, hỗ trợ 15 theme màu sắc hoặc xuất định dạng ASCII.
- **Bước 3 (Chạy CLI Render):**
  ```bash
  node plugins/ba-po/skills/ba-design-flowchart/scripts/render.mjs \
    --input flow.mmd --output flow.png --format png --bg '#ffffff' --fg '#000000'
  ```
- **Bước 4 (Kiểm định Hình ảnh):** Mở xem file ảnh kết xuất, đảm bảo các đường nối vuông góc 90 độ, mũi tên chĩa đúng tâm node và nhãn không bị cắt.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy chuẩn & Hướng dẫn kỹ thuật (references/):**
  - [mermaid_rules.md](references/mermaid_rules.md): Quy tắc thiết kế chuẩn ELK, Node Shape Taxonomy, 2 Layout Patterns (Straight Spine & Sequential Pipeline), và giới hạn engine Beautiful.
  - [workflow.md](references/workflow.md): Chi tiết các cờ lệnh CLI (`--engine`, `--format`, `--theme`, `--width`), troubleshooting và checklist.

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** File `order_flow.mmd`
- **Output:** Render ra file `order_flow.png` với lệnh:
  ```bash
  node plugins/ba-po/skills/ba-design-flowchart/scripts/render.mjs -i order_flow.mmd -o order_flow.png -f png
  ```
