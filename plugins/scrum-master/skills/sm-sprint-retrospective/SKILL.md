---
name: sm-sprint-retrospective
description: "Kỹ năng tổng kết Sprint. Phân tích Velocity, rút ra bài học cải tiến (What went well, What to improve) từ dữ liệu Jira. Use when kết thúc Sprint và cần đánh giá để cải tiến tiến trình."
metadata:
  version: "1.0.0"
  short-description: "Kỹ năng tổng kết Sprint"
  disable-auto-invoke: true
---

# sm-sprint-retrospective

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `config/sm-config.yaml`, biến môi trường kết nối Jira đã cấu hình sẵn. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Dữ liệu Sprint từ Jira thật; `sprint-retrospective-report.md` tồn tại.

## Khi nào dùng?
- Tổng kết Sprint vào ngày cuối cùng của chu kỳ để phân tích Velocity, tỷ lệ cam kết vs hoàn thành, và đưa ra Action Items cải tiến (What went well, What needs improvement).

**Khi KHÔNG sử dụng:**
- Đang trong chu kỳ Sprint cần báo cáo hằng ngày → Dùng `sm-daily-standup`.
- Xử lý các blocker / ticket bị treo → Dùng `sm-impediment-triage`.
- Chuẩn bị kế hoạch cho Sprint mới sắp mở → Dùng `sm-sprint-planning`.

## Đầu vào & Hướng dẫn thực thi (Instructions)
> - **`PLUGIN_DIR`:** Thư mục plugin `agent-skills` (chứa `config/sm-config.yaml`, `skills/`, `agents/`).
> - **`PROJECT_ROOT`:** Thư mục gốc user đang mở trong IDE (nơi chứa `workspace/sprints/{sprintId}/`).

1. **Đọc cấu hình Sprint:** Đọc `{PLUGIN_DIR}/config/sm-config.yaml` để lấy `anchor_start_date`, `duration_days`, và danh sách `team` (không mở hay in nội dung file `.env`; sử dụng biến môi trường hoặc n8n khi gọi Jira API).
2. **Kiểm tra thời điểm:** Tính Sprint End Date từ `anchor_start_date` và `duration_days`. Nếu chưa cuối Sprint, ghi chú rõ dữ liệu Retro có thể chưa hoàn chỉnh.
3. **Tổng hợp dữ liệu Jira:** Gọi JQL `sprint in openSprints()` (sử dụng `statusCategory` và `customfield_10022` / `customfield_10026`) để tính Velocity (Committed vs Completed Points), Cycle Time trung bình và số bug phát sinh trong Sprint.
4. **Đánh giá & Insight:** Tổng hợp *What went well*, *What needs improvement* (tham khảo `{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/blockers-triage.md` nếu có) và *Action Items* cụ thể cho Sprint tới.
5. **Xuất file:** `mkdir -p` và ghi đè **`{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/sprint-retrospective-report.md`** (mặc định `{sprintId}` là `sprint`).

## Common Rationalizations

- "Sprint này bận quá, bỏ qua retrospective cũng được." -> Không nên, vì bỏ qua sẽ mất cơ hội cải tiến quy trình.

## Red Flags

- Velocity sụt giảm nghiêm trọng mà không có giải thích.
- Số lượng bug sinh ra quá cao so với trung bình.

## Verification

- Báo cáo `sprint-retrospective-report.md` chứa rõ ràng ít nhất 1 action item để cải tiến cho Sprint tới.

---
