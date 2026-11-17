---
name: sm-impediment-triage
description: "Kỹ năng xử lý sự cố. Lấy danh sách ticket bị treo quá lâu trên một trạng thái (Open, In progress, Ready to test...) và đề xuất chiến lược giải quyết. Use when cần khơi thông luồng công việc Sprint."
metadata:
  version: "1.0.0"
  short-description: "Kỹ năng xử lý sự cố. Lấy danh sách ticket bị treo quá lâu trê..."
  disable-auto-invoke: true
---

# sm-impediment-triage

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `config/sm-config.yaml`, biến môi trường kết nối Jira đã cấu hình sẵn. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Ticket lấy từ Jira thật; `blockers-triage.md` tồn tại.

## Khi nào dùng?
- Cần khơi thông luồng công việc Sprint, phát hiện các ticket bị treo quá lâu (stale) trên các trạng thái (Open, In Progress, Ready to test...).
- Đề xuất giải pháp và phân bổ lại nguồn lực giải tỏa blocker cho lập trình viên.

**Khi KHÔNG sử dụng:**
- Báo cáo tiến độ Daily Standup hằng ngày → Dùng `sm-daily-standup`.
- Lập kế hoạch Sprint mới → Dùng `sm-sprint-planning`.
- Tổng kết Sprint sau khi đóng Sprint → Dùng `sm-sprint-retrospective`.

## Đầu vào & Hướng dẫn thực thi (Instructions)
> - **`PLUGIN_DIR`:** Thư mục plugin `agent-skills` (chứa `config/sm-config.yaml`, `skills/`, `agents/`).
> - **`PROJECT_ROOT`:** Thư mục gốc user đang mở trong IDE (nơi chứa `workspace/sprints/{sprintId}/`).

1. **Đọc cấu hình team:** Đọc `{PLUGIN_DIR}/config/sm-config.yaml` để lấy danh sách `team` và cấu hình Sprint (không mở hay in nội dung file `.env`; sử dụng biến môi trường hoặc n8n khi gọi Jira API).
2. **Lấy dữ liệu từ Jira REST API:** Gọi JQL `sprint in openSprints() AND statusCategory != Done` để lấy toàn bộ ticket chưa hoàn thành.
3. **Phát hiện nút thắt & Phân loại:** Lọc ticket nằm ở cùng trạng thái vượt quá 3 ngày, đối chiếu `team` trong `config/sm-config.yaml` để xác định domain phụ trách (APP, Backend...).
4. **Chiến lược xử lý (Triage Strategy):** Phân tích nguyên nhân (thiếu spec BA, chờ QA, chờ bên thứ 3...) và đề xuất Action Item gỡ rối cụ thể cho từng ticket.
5. **Xuất file:** `mkdir -p` và ghi đè **`{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/blockers-triage.md`** (mặc định `{sprintId}` là `sprint`).

## Common Rationalizations

- "Cứ đợi thêm vài ngày chắc sẽ xong." -> Tránh điều này, cần triage sớm để không trễ Sprint.

## Red Flags

- Ticket bị kẹt nhưng thiếu thông tin assignee hoặc domain.

## Verification

- File `blockers-triage.md` được sinh ra đúng tại `workspace/sprints/{sprintId}/trace/` chứa action items chi tiết.

---
