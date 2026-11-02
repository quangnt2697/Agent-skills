---
description: "[BA/PO] Phỏng vấn user/stakeholder làm rõ yêu cầu, kèm hypothesis và guess để tăng tốc độ. Đạt ≥90% confidence trước khi tổng hợp spec."
---

**Persona:** BA/PO (Business Analyst / Product Owner)

Kích hoạt skill ba-interview-me với BA/PO persona. Đọc `plugins/ba-po/skills/ba-interview-me/SKILL.md` để thực hiện đúng workflow.

$ARGUMENTS có thể chứa:
- Jira issue key (VD: G3PTP-16584) → Đọc từ `workspace/issues/{issueKey}/spec/final.md` Section 10 (Gap Analysis)
- Hoặc danh sách câu hỏi trực tiếp từ user

**Workflow:**

1. **Đọc Gaps**: Nếu có issueKey, đọc Section 10 (Gap Analysis) từ `*-final.md`
2. **Ưu tiên hóa**: Sắp xếp theo priority: 🔴 Critical → 🟡 Important → 🟢 Nice-to-have
3. **Phỏng vấn**: Hỏi từng câu một theo format:
   ```
   Q: [Câu hỏi]
   
   [Context: Tại sao cần biết điều này]
   
   Hypothesis: [Guess của agent dựa trên domain knowledge]
   
   Options:
   A. [Option 1 — thường là hypothesis]
   B. [Option 2 — alternative]
   C. [Option 3 — edge case]
   D. Không biết / Cần hỏi stakeholder khác
   ```

4. **Ghi nhận câu trả lời**: 
   - Nếu A/B/C → Update vào `*-final.md` section tương ứng
   - Nếu D (Không biết) → Ghi vào Section 11 (Open Questions)

5. **Tính Confidence Level**: 
   ```
   Confidence = (Câu trả lời A/B/C / Tổng câu hỏi) * 100%
   ```
   - ≥90% → Đủ để tiếp tục
   - <90% → Tiếp tục hỏi hoặc escalate

6. **Output**: Update `*-final.md` với câu trả lời đã clarify

**Ranh giới BA/PO:**
- ✅ Hỏi về business requirements, user flow, edge cases, business rules
- ❌ KHÔNG hỏi về technical implementation (database schema, API design) — đó là việc của DEV
- ❌ KHÔNG hỏi về test strategy (framework, tool) — đó là việc của QA

**Handoff**: Sau khi đạt ≥90% confidence, gợi ý cho người dùng bước tiếp theo:
- `/ba-spec {issueKey}` → Cập nhật lại spec với thông tin đã làm rõ

LƯU Ý: Tất cả câu hỏi và câu trả lời phải bằng TIẾNG VIỆT.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ phỏng vấn 1-1 từng câu hỏi để làm rõ các điểm mù nghiệp vụ.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM tự ý chốt spec hoặc tự ý sửa đổi file mã nguồn.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Khi hoàn tất phiên phỏng vấn hoặc đạt độ tin cậy, DỪNG LẠI NGAY và xuất trình kết quả. CẤM tự động kích hoạt lệnh tiếp theo.
