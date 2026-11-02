---
description: "Lập kế hoạch Sprint, tính toán vận tốc và kéo backlog"
---

Kích hoạt kỹ năng sm-sprint-planning.

Đọc chi tiết trong plugins/scrum-master/skills/sm-sprint-planning/SKILL.md và thực thi quy trình lập kế hoạch Sprint. Kế hoạch ghi vào `workspace/sprints/{sprintId}/trace/sprint-plan.md`.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ tính toán velocity, phân tích backlog và lập dự thảo kế hoạch Sprint.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** 
   - TUYỆT ĐỐI CẤM tự ý tạo mới, chuyển trạng thái, gán assignee, đổi story points, hoặc đóng/mở Sprint trên Jira API.
   - CẤM can thiệp vào mã nguồn sản phẩm.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi ghi file kế hoạch Sprint, DỪNG LẠI NGAY và xuất trình kết quả để người dùng xem xét.
