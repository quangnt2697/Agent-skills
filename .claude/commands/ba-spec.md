---
description: [BA/PO] Tải Jira issue thành PDF, tự động nhận diện loại task, trích xuất & phân tích yêu cầu, tổng hợp thành *-final.md (Business-Spec)
---

**Persona:** BA/PO (Business Analyst / Product Owner)

Kích hoạt skill ba-spec với BA/PO persona. Đọc file SKILL.md để thực hiện đúng workflow.

**Output:** `/project-root/workspace/{issueKey}/spec/final.md` — Single Source of Truth cho QA và DEV

$ARGUMENTS chứa Jira issue key (VD: G3PTP-16584). Chạy workflow 6 phase:

1. **Download PDF**: Fetch issue theo key → Download PDF + attachments
   - Chạy script `jira-auth-check.sh` để kiểm tra kết nối
   - Chạy script `jira-fetch-pdf.sh {issueKey}` để tải về
   - Lưu vào `/project-root/workspace/{issueKey}/source/`

2. **Nhận diện loại task** từ tên issue (case-insensitive):
   - Chứa [APP] → dùng profile APP → đọc `references/profile-app.md`
   - Chứa [WEB] → dùng profile WEB → đọc `references/profile-web.md`
   - Chứa [OpenAPI] hoặc [BE] hoặc [WebSocket] hoặc [WS] → dùng profile API → đọc `references/profile-api.md`
   - Không có tag → hỏi user xác nhận hoặc dùng profile HYBRID (đọc tất cả profiles)

3. **Trích xuất có cấu trúc**: Đọc PDF + attachments → trích xuất theo các chiều
   phân tích được định nghĩa trong profile tương ứng.
   Đánh dấu mỗi chiều: ✅ Rõ ràng / ⚠️ Mơ hồ / ❌ Thiếu

4. **Phân tích gaps**: Xác định xung đột logic, assumptions ngầm, missing AC,
   business rule gaps. Sinh câu hỏi theo đúng loại task.

5. **Interview-me**: Invoke skill ba-interview-me để hỏi user từng câu một
   (kèm hypothesis + guess). Bắt đầu từ câu Critical. Tiếp tục cho đến khi
   đạt ≥90% confidence. Nếu user trả lời "không biết" → ghi Open Question.

6. **Tổng hợp final.md**: Tổng hợp tất cả thành file markdown chi tiết:
   `/project-root/workspace/{issueKey}/spec/final.md`
   - Header: metadata + loại task
   - Sections 2-8: theo profile tương ứng
   - Sections 9-12: AC, Assumptions, Open Questions, Tham khảo

7. **Handoff**: Sau khi hoàn thành, hỏi user muốn tiếp tục với pipeline nào:
   - **QA/SDET:** `/qa-test-design {issueKey}` → Transform AC thành Checklist + Gherkin
   - **DEV:** `/tech-spec {issueKey}` → Transform Business Rules thành Tech-Spec
   - **Full E2E:** `/e2e-delivery {issueKey}` → Orchestrate cả 3 personas (BA/PO → DEV → QA)

**Ranh giới BA/PO:**
- ✅ Import, phân tích, làm rõ gaps, tổng hợp Business-Spec
- ❌ KHÔNG viết Tech-Spec, API Contract, Database Schema (đó là việc của DEV)
- ❌ KHÔNG viết Test Cases, Gherkin, Automation Code (đó là việc của QA)

LƯU Ý: Tất cả output phải bằng TIẾNG VIỆT.
