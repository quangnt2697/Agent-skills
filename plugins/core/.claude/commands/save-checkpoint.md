---
description: "Kích hoạt kỹ năng meta-session-checkpoint ở chế độ LƯU. Đọc toàn bộ ngữ cảnh, nén các sự kiện, tiến độ và bước tiếp theo vào file workspace_state.md."
---

Kích hoạt kỹ năng meta-session-checkpoint ở chế độ LƯU.

1. Quét toàn bộ ngữ cảnh hiện tại và lịch sử chat.
2. Tổng hợp 3 nhóm thông tin chính: Sự thật (Facts), Tiến độ (Progress) và Bước tiếp theo (Next Steps).
3. Ghi đè file `{PROJECT_ROOT}/.agents/workspace_state.md` (với `{PROJECT_ROOT}` là thư mục gốc của dự án hiện tại) với định dạng Markdown.
4. Báo cáo xác nhận đã lưu checkpoint.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ nén trạng thái phiên và ghi vào `.agents/workspace_state.md`.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM can thiệp vào bất kỳ file mã nguồn nào khác.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Lưu file xong là DỪNG LẠI NGAY.
