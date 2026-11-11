---
description: "Xuất sơ đồ Editorial HTML/SVG tĩnh thành file PNG/SVG sắc nét (Full HD, Retina 2x) bằng skill ba-design-flowchart."
---

Kích hoạt skill `ba-design-flowchart` (thư mục `plugins/ba-po/skills/ba-design-flowchart/SKILL.md`).

$ARGUMENTS có thể chứa:
- Đường dẫn file `.html` chứa sơ đồ Editorial HTML/SVG tĩnh.
- Tùy chọn định dạng đầu ra (.png, .svg hoặc cả hai qua --both) và nền trong suốt (--transparent).

**Workflow:**
1. Đọc nội dung file `SKILL.md` của thư mục `plugins/ba-po/skills/ba-design-flowchart` để tuân thủ hệ thống thiết kế Editorial (phông chữ Instrument Serif/Geist, bảng màu, connector vuông góc, không dùng Mermaid).
2. Nếu input là mã HTML thô, lưu nội dung đó vào một file `.html` trong `workspace/issues/{issueKey}/spec/` (hoặc thư mục tạm khi chạy adhoc).
3. Chạy script kết xuất chuẩn: `python3 ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-flowchart/assets/export.py <src.html> <out.png|out.svg> [--both] [--transparent]`.
4. Mở file ảnh vừa tạo bằng `read_file` để kiểm tra trực quan, đảm bảo không bị vỡ layout, tràn chữ hay mất kết nối.
5. Trả đường dẫn file kết quả (.png/.svg) cho người dùng.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ kết xuất diagram sang ảnh PNG/SVG tĩnh.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM can thiệp vào mã nguồn ứng dụng hay tự ý thay đổi logic nghiệp vụ.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi render ra file ảnh và xác minh giao diện, DỪNG LẠI NGAY và trả đường dẫn file cho người dùng.
