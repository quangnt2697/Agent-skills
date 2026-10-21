---
name: sm-daily-standup
description: Điều hành Daily Standup tự động, thống kê tiến độ Sprint từ Jira, phân tích cân bằng tải cho DEV và gửi báo cáo qua Mattermost.
trigger: Khi cần tạo báo cáo daily standup tự động cho team hoặc phân tích cân bằng tải giữa các lập trình viên.
---

# Kỹ Năng Điều Hành Daily Standup (sm-daily-standup)

## 1. Khi nào dùng?
- Tạo báo cáo Daily Standup hằng ngày trong chu kỳ Sprint đang mở.
- Phân tích tiến độ hoàn thành Story Points và cân bằng tải công việc giữa các lập trình viên.
- Tự động bắn thông báo tóm tắt lên kênh chat Mattermost của team.

**Khi KHÔNG sử dụng:**
- Lập kế hoạch cho Sprint mới sắp tới → Dùng `sm-sprint-planning`.
- Tổng kết Sprint sau khi kết thúc chu kỳ → Dùng `sm-sprint-retrospective`.

## 2. Đầu vào & Cấu hình
1. File cấu hình team: `sm-config.yaml` tại thư mục gốc dự án.
2. Biến môi trường kết nối Jira & Mattermost từ `.env`.
3. Dữ liệu các Issues trong Open Sprint trên Jira REST API.

## 3. Quy trình Thực hiện 3 Bước
- **Bước 1 (Tạo Báo cáo Daily Standup):** Gọi `getStandupReport()` từ `scripts/lib/n8n-client.js`.
  ```bash
  node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js getStandupReport
  ```
  Webhook `/webhook/sm-standup` trả về ngay báo cáo text và gửi Mattermost tự động.
  > Nếu n8n không phản hồi: báo ngay "n8n chưa chạy — khởi động bằng `npm run n8n`" và **DỪNG**.
- **Bước 2 (Gửi lại Báo cáo - Tùy chọn):** Call lại webhook `sm-standup` qua n8n Client nếu cần gửi lại.
- **Bước 3 (Tóm tắt Kết quả):** Kiểm tra file báo cáo tại `workspace/sprints/sprint/trace/daily-standup-report.md` và thông báo ngắn gọn cho người dùng.

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & File mẫu thực thi (assets/):**
  - [daily-standup-report.md](assets/daily-standup-report.md): Template Markdown chuẩn của báo cáo Daily Standup.

## 5. Ví dụ mẫu (Few-shot Example)
- **Output:** Tóm tắt trên màn hình:
  ```markdown
  ### ☀️ Báo Cáo Daily Standup: Sprint 34 (Ngày 4/10)
  - **Tiến độ Story Points:** 28/45 SP hoàn thành (62.2%).
  - **Cân bằng tải:** 
    - DEV 1: 3 In Progress (8 SP) - Bình thường
    - DEV 2: 5 In Progress (16 SP) - ⚠️ Quá tải, cần hỗ trợ
  - **Báo cáo chi tiết:** Đã xuất file `workspace/sprints/sprint/trace/daily-standup-report.md` và gửi lên kênh #dev-standup.
  ```

---
