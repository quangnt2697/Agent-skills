---
name: sm-daily-standup
description: Điều hành Daily Standup tự động, thống kê tiến độ Sprint từ Jira, phân tích cân bằng tải cho DEV và lưu báo cáo vào workspace trace (hỗ trợ Mattermost khi bật).
trigger: Khi cần tạo báo cáo daily standup tự động cho team hoặc phân tích cân bằng tải giữa các lập trình viên.
disable-auto-invoke: true
---

# Kỹ Năng Điều Hành Daily Standup (sm-daily-standup)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `sm-config.yaml`, `.env` Jira (Mattermost tùy chọn khi `NOTIFY_CHANNEL=mattermost`) và n8n đang chạy. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Phản hồi webhook thật và file `daily-standup-report.md` tồn tại.

## 1. Khi nào dùng?
- Tạo báo cáo Daily Standup hằng ngày trong chu kỳ Sprint đang mở.
- Phân tích tiến độ hoàn thành Story Points và cân bằng tải công việc giữa các lập trình viên.
- Xuất báo cáo tóm tắt ra workspace trace; gửi thông báo chat chỉ khi `NOTIFY_CHANNEL=mattermost` và được người dùng duyệt.

**Khi KHÔNG sử dụng:**
- Lập kế hoạch cho Sprint mới sắp tới → Dùng `sm-sprint-planning`.
- Tổng kết Sprint sau khi kết thúc chu kỳ → Dùng `sm-sprint-retrospective`.

## 2. Đầu vào & Cấu hình
1. File cấu hình team: `sm-config.yaml` tại thư mục gốc dự án.
2. Biến môi trường kết nối Jira từ `.env` (biến Mattermost chỉ cần khi `NOTIFY_CHANNEL=mattermost`).
3. Dữ liệu các Issues trong Open Sprint trên Jira REST API.

## 3. Quy trình Thực hiện 3 Bước
- **Bước 1 (Tạo Báo cáo Daily Standup):** Gọi `getStandupReport()` từ `scripts/lib/n8n-client.js`.
  ```bash
  node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js getStandupReport
  ```
  Webhook `/webhook/sm-standup` trả về báo cáo phân tích tiến độ Sprint (chỉ gửi Mattermost nếu `NOTIFY_CHANNEL=mattermost`).
  > ⛔ Nếu n8n offline hoặc lỗi: báo ngay "n8n chưa chạy — khởi động bằng `npm run n8n`" và **DỪNG**. CẤM tự bịa số liệu SP.
- **Bước 2 (Lưu Trữ Báo Cáo):** Nhận nội dung markdown từ phản hồi của n8n và ghi vào file `{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/daily-standup-report.md` (mặc định `{sprintId}` là `sprint` khi không chỉ định; tạo thư mục cha nếu chưa có).
- **Bước 3 (Xác Minh & Tóm tắt Kết quả):** Xác minh file đã tồn tại trên đĩa bằng công cụ đọc file. Chỉ sau khi file tồn tại mới gửi tóm tắt ngắn gọn 1-2 câu cho người dùng kèm liên kết tới file vừa lưu.

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & File mẫu thực thi (assets/):**
  - [daily-standup-report.md](assets/daily-standup-report.md): Template Markdown chuẩn của báo cáo Daily Standup.

## 5. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Output:** Tóm tắt trên màn hình:
  ```markdown
  ### ☀️ Báo Cáo Daily Standup: Sprint 34 (Ngày 4/10)
  - **Tiến độ Story Points:** 28/45 SP hoàn thành (62.2%).
  - **Cân bằng tải:** 
    - DEV 1: 3 In Progress (8 SP) - Bình thường
    - DEV 2: 5 In Progress (16 SP) - ⚠️ Quá tải, cần hỗ trợ
  - **Báo cáo chi tiết:** Đã xuất file `workspace/sprints/{sprintId}/trace/daily-standup-report.md` (kênh chat tắt khi `NOTIFY_CHANNEL=none`).
  ```

---
