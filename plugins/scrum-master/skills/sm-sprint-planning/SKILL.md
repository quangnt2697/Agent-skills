---
name: sm-sprint-planning
description: Kỹ năng lập kế hoạch Sprint. Tự động tính toán chu kỳ Sprint hiện tại, pull backlog và sprint tới (hoặc hiện tại) từ Jira.
trigger: Use when cần lập kế hoạch (planning) cho Sprint mới hoặc phân bổ công việc.
disable-auto-invoke: true
---

# Kỹ năng Lập Kế Hoạch Sprint (sm-sprint-planning)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `sm-config.yaml`, `.env` Jira. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Dữ liệu Sprint/Backlog từ Jira thật; `workspace/sprints/{sprintId}/tech/sprint-plan.md` tồn tại.

## 1. Khi nào dùng?
- Lập kế hoạch Sprint mới, tính toán Velocity trung bình và phân bổ Story Points vào Sprint Backlog.
- Chuẩn bị danh sách User Stories ưu tiên trước buổi họp Sprint Planning.

**Khi KHÔNG sử dụng:**
- Điều phối Daily Standup trong chu kỳ Sprint đang mở → Dùng `sm-daily-standup`.
- Xử lý các blocker / ticket bị kẹt → Dùng `sm-impediment-triage`.
- Đánh giá tổng kết Sprint sau khi kết thúc chu kỳ → Dùng `sm-sprint-retrospective`.

## 2. Quy Trình Thực Hiện 5 Bước

- **Bước 0 (Khởi tạo & Cấu hình):**
  - Đọc `sm-config.yaml` tại plugin dir hoặc `config/sm-config.yaml` (trích xuất `anchor_start_date`, `duration_days`, danh sách `team`, `jira_board`).
  - Đọc `.env` (lấy `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`). Dừng ngay nếu thiếu credentials.
- **Bước 1 (Tính toán & Pull Jira):**
  - Tự động tính chỉ số Sprint theo công thức ngày mỏ neo (Anchor date).
  - Gọi Jira Agile API lấy danh sách Active/Future Sprint và Backlog (Chi tiết curl tại [jira-sprint-api.md](references/jira-sprint-api.md)).
- **Bước 2 (Kiểm tra thời điểm & Carry-over):**
  - Giữa Sprint: Lấy Backlog + Future Sprint (Section Carry-over ghi: "Không áp dụng – Sprint hiện tại đang diễn ra").
  - Cuối Sprint: Lấy Active Sprint để rà soát ticket dở dang đưa vào Carry-over + Backlog mới.
- **Bước 3 (Phân bổ Khối lượng Công việc):**
  - Xác định Sprint Goal dựa trên task ưu tiên High/Critical.
  - Phân bổ ticket theo role: Web/Mobile/Backend/QA tương ứng.
- **Bước 4 (Xuất bản Báo cáo Kế hoạch):**
  - Đảm bảo thư mục tồn tại: `mkdir -p workspace/sprints/{sprintId}/tech/`.
  - Ghi đè vào file **`workspace/sprints/{sprintId}/tech/sprint-plan.md`** (mặc định `{sprintId}` là `sprint` khi không chỉ định) sử dụng template tại `assets/sprint-plan.md`.

## 3. Tài Nguyên Mở Rộng (Level 3 - Progressive Disclosure)
- 📖 [jira-sprint-api.md](references/jira-sprint-api.md): Công thức tính chu kỳ Sprint tự động và tài liệu Jira REST API endpoints.
- 📄 `assets/sprint-plan.md`: Khung mẫu Markdown cho tài liệu kế hoạch Sprint.

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng. TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Output:** File `workspace/sprints/{sprintId}/tech/sprint-plan.md` chuẩn:
  ```markdown
  # Sprint 35 Planning
  - **Mục tiêu Sprint:** Hoàn thiện luồng xác thực Smart OTP và đặt lệnh phái sinh.
  - **Thời gian:** 2026-09-15 đến 2026-09-29 (10 ngày làm việc).
  - **Tổng Story Points:** 42 SP (DEV 1: 20 SP, DEV 2: 22 SP).
  ```

## 5. Dấu Hiệu Cảnh Báo & Xác Minh (Verification)
- [ ] File `workspace/sprints/{sprintId}/tech/sprint-plan.md` tồn tại và thay thế 100% placeholders bằng số liệu Jira thật
- [ ] Sprint có mục tiêu rõ ràng (Sprint Goal)
- [ ] Phân bổ tải công việc cân bằng giữa các thành viên theo role
