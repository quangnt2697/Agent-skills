---
name: sm-sprint-retrospective
description: Kỹ năng tổng kết Sprint. Phân tích Velocity, rút ra bài học cải tiến (What went well, What to improve) từ dữ liệu Jira.
trigger: Use when kết thúc Sprint và cần đánh giá để cải tiến tiến trình.
disable-auto-invoke: true
---

# sm-sprint-retrospective

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `sm-config.yaml`, `.env` Jira. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Dữ liệu Sprint từ Jira thật; báo cáo retrospective tồn tại.

## Khi nào dùng?
- Tổng kết Sprint vào ngày cuối cùng của chu kỳ để phân tích Velocity, tỷ lệ cam kết vs hoàn thành, và đưa ra Action Items cải tiến.
- Rút ra bài học kinh nghiệm (What went well, What needs improvement).

**Khi KHÔNG sử dụng:**
- Đang trong chu kỳ Sprint cần báo cáo hằng ngày → Dùng `sm-daily-standup`.
- Xử lý các blocker / ticket bị treo → Dùng `sm-impediment-triage`.
- Chuẩn bị kế hoạch cho Sprint mới sắp mở → Dùng `sm-sprint-planning`.

## Đầu vào
1. Đọc cấu hình team từ file `sm-config.yaml` tại `PLUGIN_DIR` (thư mục plugin `agent-skills`, cố định).
2. Đọc thông tin xác thực Jira từ file `.env` tại `PLUGIN_DIR` (cố định). Nếu `PROJECT_ROOT/.env` tồn tại → ghi đè biến trùng tên.
3. Dữ liệu Sprint từ Jira REST API.

> **Thuật ngữ:**
> - **`PLUGIN_DIR`** = Thư mục plugin `agent-skills` (chứa `sm-config.yaml`, `skills/`, `agents/`). Cố định, không đổi theo project.
> - **`PROJECT_ROOT`** = Thư mục gốc mà user đang mở trong IDE. Thay đổi tùy dự án.

## Chiến lược Truy cập Jira/Confluence

Skill này truy xuất dữ liệu Sprint từ Jira REST API với cấu hình xác thực từ `.env`.

---

## Hướng dẫn thực thi (Instructions)
1. **Đọc config & credentials**:
   - Đọc `{PLUGIN_DIR}/sm-config.yaml` để lấy `anchor_start_date`, `duration_days`, và danh sách team.
   - Đọc `{PLUGIN_DIR}/.env` (nguồn chính, cố định trong plugin) để lấy `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`. Nếu `{PROJECT_ROOT}/.env` tồn tại → các biến trùng tên sẽ ghi đè.
2. **Kiểm tra thời điểm**:
   - Tính toán Sprint End Date dựa trên `sm-config.yaml` (anchor_start_date & duration_days).
   - Nếu hôm nay chưa phải cuối Sprint (vẫn đang ở giữa chừng), hãy xuất ra thông báo: "Sprint vẫn đang diễn ra, dữ liệu Retro có thể chưa hoàn chỉnh".
3. **Tổng hợp dữ liệu Jira**:
   - Gọi Jira REST API với JQL `sprint in openSprints()` để lấy toàn bộ issues. Dựa vào `statusCategory` và `customfield_10022` / `customfield_10026` (Story Points) để tính:
     - Velocity: Điểm đã cam kết (Committed Points) vs Điểm hoàn thành (Completed Points).
     - Cycle Time trung bình của các ticket.
     - Số lượng bug phát sinh trong Sprint.
4. **Đánh giá & Insight**:
   - **What went well**: Điểm sáng của Sprint này (chẳng hạn không có blocker quá hạn lâu, hoặc nhóm Backend chia việc đều).
   - **What needs improvement**: Các vấn đề kẹt ticket, mất cân bằng tải, scope creep. Tham khảo lại dữ liệu từ `{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/blockers-triage.md` nếu có.
   - **Action Items**: Nhiệm vụ cải tiến cụ thể cho Sprint sau (Ví dụ: Yêu cầu QA test sớm hơn, BA viết doc rõ hơn, v.v.).
5. **Xuất file**:
   - Nếu thư mục `{PROJECT_ROOT}/workspace/sprints/{sprintId}/` chưa tồn tại, chạy `mkdir -p` để tạo.
   - Tạo file **`{PROJECT_ROOT}/workspace/sprints/{sprintId}/trace/sprint-retrospective-report.md`** (mặc định `{sprintId}` là `sprint` khi không chỉ định).
   - ⚠️ Lưu ý: `workspace` ở đây là **tên thư mục con** bên trong PROJECT_ROOT, KHÔNG phải "workspace root" của IDE.


## When to Use

Kích hoạt kỹ năng này khi:
- Một Sprint kết thúc.
- Scrum Master cần đánh giá lại khối lượng hoàn thành (velocity) và phân tích các bài học.

## Common Rationalizations

- "Sprint này bận quá, bỏ qua retrospective cũng được." -> Không nên, vì bỏ qua sẽ mất cơ hội cải tiến quy trình.

## Red Flags

- Velocity sụt giảm nghiêm trọng mà không có giải thích.
- Số lượng bug sinh ra quá cao so với trung bình.

## Verification

- Báo cáo `sprint-retrospective-report.md` chứa rõ ràng ít nhất 1 action item để cải tiến cho Sprint tới.

---
