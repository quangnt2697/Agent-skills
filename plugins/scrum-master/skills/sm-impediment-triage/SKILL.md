---
name: sm-impediment-triage
description: Kỹ năng xử lý sự cố. Lấy danh sách ticket bị treo quá lâu trên một trạng thái (Open, In progress, Ready to test...) và đề xuất chiến lược giải quyết.
trigger: Use when cần khơi thông luồng công việc Sprint.
---

# sm-impediment-triage

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `sm-config.yaml`, `.env` Jira. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Ticket lấy từ Jira thật; `blockers-triage.md` tồn tại.

## Khi nào dùng?
- Cần khơi thông luồng công việc Sprint, phát hiện các ticket bị treo quá lâu (stale) trên các trạng thái.
- Đề xuất giải pháp và phân bổ lại nguồn lực giải tỏa blocker cho lập trình viên.

**Khi KHÔNG sử dụng:**
- Báo cáo tiến độ Daily Standup hằng ngày → Dùng `sm-daily-standup`.
- Lập kế hoạch Sprint mới → Dùng `sm-sprint-planning`.
- Tổng kết Sprint sau khi đóng Sprint → Dùng `sm-sprint-retrospective`.

## Đầu vào
1. Đọc cấu hình team từ file `sm-config.yaml` tại `PLUGIN_DIR` (thư mục plugin `agent-skills`, cố định).
2. Đọc thông tin xác thực Jira từ file `.env` tại `PLUGIN_DIR` (cố định). Nếu `PROJECT_ROOT/.env` tồn tại → ghi đè biến trùng tên.
3. Dữ liệu các ticket trong Sprint hiện tại (từ Jira REST API).

> **Thuật ngữ:**
> - **`PLUGIN_DIR`** = Thư mục plugin `agent-skills` (chứa `sm-config.yaml`, `skills/`, `agents/`). Cố định, không đổi theo project.
> - **`PROJECT_ROOT`** = Thư mục gốc mà user đang mở trong IDE. Thay đổi tùy dự án.

## Chiến lược Truy cập Jira/Confluence

Skill này truy xuất dữ liệu ticket từ Jira REST API với cấu hình xác thực từ `.env`.

---

## Hướng dẫn thực thi (Instructions)
1. **Đọc config & credentials**:
   - Đọc `{PLUGIN_DIR}/sm-config.yaml` để lấy danh sách team và cấu hình Sprint.
   - Đọc `{PLUGIN_DIR}/.env` (nguồn chính, cố định trong plugin) để lấy `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`. Nếu `{PROJECT_ROOT}/.env` tồn tại → các biến trùng tên sẽ ghi đè.
2. **Lấy dữ liệu từ Jira REST API**:
   - Gọi Jira REST API với JQL `sprint in openSprints() AND statusCategory != Done` để lấy toàn bộ ticket chưa hoàn thành.
3. **Phát hiện nút thắt**:
   - Lọc ra các ticket có thời gian nằm ở một trạng thái (`Open`, `In Progress`, `Ready to test`, v.v.) **vượt quá 3 ngày**.
4. **Phân loại**:
   - Tra cứu danh sách `team` trong `sm-config.yaml` để xác định ticket đó thuộc domain của ai đang giữ (ví dụ assign cho Developer APP -> APP, Developer Backend -> Backend) để nắm ngữ cảnh.
5. **Chiến lược xử lý (Triage Strategy)**:
   - Viết chiến lược xử lý cụ thể cho từng ticket bị treo:
   - Nguyên nhân có thể là gì? (Thiếu tài liệu từ BA? Đang chờ QA? Đang chờ bên thứ 3?).
   - Đề xuất Action Item cụ thể để gỡ rối (Unblock).
6. **Xuất file**:
   - Nếu thư mục `{PROJECT_ROOT}/workspace/sprint/` chưa tồn tại, chạy `mkdir -p` để tạo.
   - Ghi đè file **`{PROJECT_ROOT}/workspace/sprints/sprint/trace/blockers-triage.md`**. File cập nhật hằng ngày.
   - ⚠️ Lưu ý: `workspace` ở đây là **tên thư mục con** bên trong PROJECT_ROOT, KHÔNG phải "workspace root" của IDE.


## When to Use

Kích hoạt kỹ năng này khi:
- Phát hiện có ticket bị kẹt (block) hoặc không đổi trạng thái quá 3 ngày.
- Cần khơi thông luồng công việc trong Sprint hiện tại.

## Common Rationalizations

- "Cứ đợi thêm vài ngày chắc sẽ xong." -> Tránh điều này, cần triage sớm để không trễ Sprint.

## Red Flags

- Ticket bị kẹt nhưng thiếu thông tin assignee hoặc domain.

## Verification

- File `blockers-triage.md` được sinh ra đúng tại `workspace/sprints/sprint/trace/` chứa action items chi tiết.

---
