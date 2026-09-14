---
name: sm-daily-standup
description: Điều hành Daily Standup tự động, thống kê tiến độ Sprint từ Jira, phân tích cân bằng tải cho DEV và gửi báo cáo qua Mattermost.
trigger: Khi cần tạo báo cáo daily standup tự động cho team hoặc phân tích cân bằng tải giữa các lập trình viên.
---

# Kỹ Năng Điều Hành Daily Standup (sm-daily-standup)

## 1. Khi nào dùng?
- Tạo báo cáo Daily Standup hằng ngày trong chu kỳ Sprint đang mở.
- Phân tích tiến độ hoàn thành Story Points và cân bằng tải công việc giữa các lập trình viên.
- Tự động bắn thông báo tóm tắt lên kênh chat Mattermost/Discord của team.

**Khi KHÔNG sử dụng:**
- Lập kế hoạch cho Sprint mới sắp tới → Dùng `sm-sprint-planning`.
- Tổng kết Sprint sau khi kết thúc chu kỳ → Dùng `sm-sprint-retrospective`.

## 2. Đầu vào & Cấu hình
1. File cấu hình team: `sm-config.yaml` tại thư mục gốc dự án.
2. Biến môi trường kết nối Jira & Mattermost từ `.env`.
3. Dữ liệu các Issues trong Open Sprint trên Jira REST API.

## 3. Quy trình Thực hiện 3 Bước
- **Bước 1 (Chạy Script Tự động Tạo Báo cáo):** Chạy script Python có sẵn trong thư mục `assets/`:
  ```bash
  python3 plugins/scrum-master/skills/sm-daily-standup/assets/generate_report.py --project-root "."
  ```
  Script tự động tính toán số ngày còn lại của Sprint, tỷ lệ hoàn thành Story Points, số ngày ticket tồn đọng, render báo cáo theo `assets/daily-standup-report.md` và bắn webhook lên Mattermost.
- **Bước 2 (Gửi lại Báo cáo - Tùy chọn):** Nếu cần gửi lại thông báo sau khi chỉnh sửa thủ công:
  ```bash
  python3 plugins/scrum-master/skills/sm-daily-standup/assets/send_mattermost.py --project-root "."
  ```
- **Bước 3 (Tóm tắt Kết quả):** Kiểm tra file báo cáo tại `workspace/sprint/trace/daily-standup-report.md` và thông báo ngắn gọn cho người dùng.

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & File mẫu thực thi (assets/):**
  - [generate_report.py](assets/generate_report.py): Script Python chính lấy dữ liệu Jira và render báo cáo.
  - [send_mattermost.py](assets/send_mattermost.py): Script gửi nội dung báo cáo lên Mattermost qua webhook.
  - [daily-standup-report.md](assets/daily-standup-report.md): Template Markdown chuẩn của báo cáo Daily Standup.

## 5. Ví dụ mẫu (Few-shot Example)
- **Output:** Tóm tắt trên màn hình:
  ```markdown
  ### ☀️ Báo Cáo Daily Standup: Sprint 34 (Ngày 4/10)
  - **Tiến độ Story Points:** 28/45 SP hoàn thành (62.2%).
  - **Cân bằng tải:** 
    - DEV 1: 3 In Progress (8 SP) - Bình thường
    - DEV 2: 5 In Progress (16 SP) - ⚠️ Quá tải, cần hỗ trợ
  - **Báo cáo chi tiết:** Đã xuất file `workspace/sprint/trace/daily-standup-report.md` và gửi lên kênh #dev-standup.
  ```
