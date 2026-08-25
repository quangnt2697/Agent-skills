---
description: Render Mermaid diagrams thành SVG, PNG hoặc ASCII/Unicode bằng skill ba-design-flowchart.
---

Kích hoạt skill `ba-design-flowchart` (thư mục `skills/ba-design-flowchart/SKILL.md`).

$ARGUMENTS có thể chứa:
- Đường dẫn file `.mmd` hoặc nội dung mã Mermaid thô.
- Các yêu cầu về theme (VD: tokyo-night, dracula), định dạng (png, svg, ascii).

**Workflow:**
1. Đọc nội dung file `SKILL.md` của thư mục `skills/ba-design-flowchart` để hiểu cách sử dụng.
2. Lưu nội dung Mermaid vào một file `.mmd` trong thư mục tạm hoặc thư mục làm việc.
3. Chạy script CLI tương ứng (VD: `node skills/ba-design-flowchart/scripts/render.mjs`) để render diagram thành file SVG, PNG, hoặc in ra Terminal (ASCII).
4. Nếu CLI báo lỗi cú pháp (Exit Code > 0), tự động nhận diện dòng lỗi và sửa lại mã Mermaid, sau đó thử lại.
5. Trả kết quả (đường dẫn file ảnh) hoặc nội dung đã sửa lỗi cho người dùng.
