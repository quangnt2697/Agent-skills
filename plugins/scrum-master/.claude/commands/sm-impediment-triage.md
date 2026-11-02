---
description: "Xử lý sự cố kẹt ticket và đề xuất chiến lược giải quyết"
---

Kích hoạt kỹ năng sm-impediment-triage.

Đọc chi tiết trong plugins/scrum-master/skills/sm-impediment-triage/SKILL.md và thực thi quy trình gỡ rối. Báo cáo ghi vào `workspace/sprints/{sprintId}/trace/impediment-report.md`.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ quét các ticket bị kẹt lâu và đề xuất phương án xử lý bottleneck.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM tự ý thay đổi status hoặc đóng ticket trên Jira. CẤM can thiệp mã nguồn.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi ghi file báo cáo gỡ rối, DỪNG LẠI NGAY và xuất trình kết quả.
