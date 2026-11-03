---
name: meta-cross-validation
description: 'Xác thực truy vết traceability giữa Spec và Test Cases. Kiểm tra độ bao phủ coverage của test cases so với yêu cầu nghiệp vụ, phát hiện gaps.'
trigger: Sử dụng khi cần kiểm tra độ bao phủ của test cases so với yêu cầu nghiệp vụ.
disable-auto-invoke: true
---

# Cross-Validation — Xác thực Truy vết (Meta)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `spec/final.md` có mã `[BR-xx]`/`[AC-xx]` và test artifacts. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Exit code của `trace-check.js` và `trace/matrix.md` tồn tại; exit 2 thì ghi gap, không đoán.

## Overview (Tổng quan)

Xác thực truy vết (traceability) đa tầng giữa các artifacts trong SDLC: Business-Spec (`spec/final.md`) → Tech-Spec (`tech/tech-spec.md`) → Test Cases (`test/checklist.md`, `test/*.feature`). Tạo ma trận ánh xạ 1-1 để phát hiện gaps (thiếu sót) và redundancies (trùng lặp), đảm bảo 100% Business Rules được kiểm thử.

## When to Use (Khi nào sử dụng)

- Sau khi DEV viết Tech-Spec, trước khi code (e2e Phase 3).
- Sau khi QA thiết kế Test Cases và sinh automation code (e2e Phase 7e).
- Trước release hoặc khi audit compliance yêu cầu ma trận truy vết.

**Khi KHÔNG sử dụng:**
- Chưa có Business-Spec (`final.md`) hoặc Tech-Spec.
- Feature dạng spike/prototype không yêu cầu bàn giao sản xuất.

## Quy trình 4 Bước (Execution Workflow)

### Bước 0: Ma trận xác định bằng script (BẮT BUỘC)

```bash
# Chạy script xác định theo mã BR/AC (từ assets/ hoặc scripts/):
node ${AGENT_SKILLS_HOME:-.}/plugins/core/skills/meta-cross-validation/assets/trace-check.js \
  workspace/{issueKey} --stage=tech   # sau Tech-Spec
#                     --stage=all     # sau test design / automation
```

- **Exit 0:** Coverage ≥ 90% ở mọi stage được kiểm tra.
- **Exit 1:** Coverage < 90% → bổ sung test scenario cho mã thiếu.
- **Exit 2:** `final.md` thiếu mã `[BR-xx]`/`[AC-xx]` → ghi gap vào `trace/gaps.md`.

### Bước 1–4: Chi tiết trích xuất & đánh giá chất lượng
Xem cẩm nang chi tiết và mẫu báo cáo đầy đủ tại: [references/traceability-guide.md](references/traceability-guide.md).

## Verification (Xác minh)

- [ ] Đã chạy `trace-check.js` và dùng con số coverage của script (không tự chấm lại).
- [ ] Ma trận `workspace/issues/{issueKey}/trace/matrix.md` ghi nhận đủ các mã `[BR-xx]`/`[AC-xx]`.
- [ ] Báo cáo `workspace/issues/{issueKey}/trace/gaps.md` phân loại rõ gaps P0/P1 kèm Action Items cụ thể.

## Red Flags (Cờ đỏ)

- Coverage đạt 100% ngay lần chạy đầu tiên mà không phát hiện bất kỳ gap nào.
- Map dựa trên keyword ngẫu nhiên thay vì mã `[BR-xx]`/`[AC-xx]` xác định.
- Business Rule chỉ có kịch bản Happy Path, hoàn toàn thiếu kịch bản phủ định (Negative Cases).
- Tự ý hạ độ nghiêm trọng của Critical Gap xuống để kịp tiến độ release.

## Common Rationalizations (Ngụy biện thường gặp)

- *"Tech-spec đã cover hết rồi nên không cần map lại sang test cases"* → Sai lầm; code có thể lệch với spec nếu thiếu test case xác nhận.
- *"Chỉ cần chạy thử pass là đủ, ma trận truy vết chỉ là thủ tục giấy tờ"* → Không có ma trận sẽ không thể đo lường rủi ro khi có yêu cầu thay đổi (CR).

---
