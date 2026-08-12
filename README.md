# Agent-Skills: Bộ Công Cụ Tự Động Hóa QA/BA

Agent-Skills (Phiên bản Tối ưu QA/BA) là một plugin chứa bộ công cụ được thiết kế chuyên biệt để tự động hóa toàn bộ vòng đời phân tích và kiểm thử phần mềm, từ lúc tiếp nhận yêu cầu trên Jira cho đến lúc xuất báo cáo chạy Test.

> ⚠️ **Lưu ý:** Plugin này đã được "Deep Clean" (loại bỏ hoàn toàn các tính năng thuần lập trình, DevOps, UI Design) để tập trung 100% năng lực xử lý của AI vào nghiệp vụ Phân tích Nghiệp vụ (BA) và Kiểm thử Chất lượng (QA).

## 🚀 Tính năng Cốt lõi

1. **Phân tích Tự động (BA):** Kéo thông tin từ Jira, tự động nhận diện loại task, đọc hiểu PDF đính kèm, phân tích Gaps, và chủ động phỏng vấn bạn để làm rõ các góc khuất trước khi chốt Đặc tả Yêu cầu (Spec).
2. **Thiết kế Kiểm thử (QA):** Dựa trên Spec, tự động sinh ra Checklist kiểm thử chuẩn xác (sử dụng kỹ thuật BVA, EP chuyên cho domain Tài chính), sau đó tự viết kịch bản BDD (Gherkin).
3. **Sinh Code Automation (QA):** Biến kịch bản Gherkin thành code chạy test tự động (Pytest/Playwright). Trí tuệ nhân tạo sẽ tự quét mã nguồn hiện có của Developer để tái sử dụng, tự động bắt lỗi và tự sửa (self-fix) các lỗi cú pháp.
4. **Báo cáo Truy vết (Report):** Sinh báo cáo Markdown chứa ma trận truy vết từ Yêu cầu gốc → Checklist → Kịch bản → Code Test, kèm log chi tiết (Request/Response) cho API/WS.

## 🛠 Bộ Lệnh (Slash Commands)

Bạn chỉ cần gõ các lệnh sau vào khung chat:

| Lệnh | Chức năng | Phân hệ |
|------|-----------|----------|
| `/ba-spec {Mã_Jira}` | Phân tích Jira, tạo Spec chuẩn. Gọi `ba-refine` và `ba-interview-me` ngầm. | BA |
| `/qa-code2spec {path}`| Dịch ngược (Reverse Engineer) Code thành Spec chuẩn, hỗ trợ đa ngôn ngữ. | BA/RE |
| `/qa-test-design` | Viết Checklist + kịch bản Gherkin từ Spec. | QA |
| `/qa-auto-design {Mã_Jira}` | Sinh code automation từ kịch bản + Chạy test. | QA |
| `/qa-run-test {Mã_Jira}` | CHỈ chạy test đã có + Báo cáo (không sinh code). | QA |
| **`/qa-pipeline {Mã_Jira}`** | **Chạy tự động toàn trình từ BA → QA (Bỏ qua Approval Gate).** | BA+QA |
| **`/dev-audit {path}`** | **Audit kiến trúc toàn diện & Tự động Code/Fix từ đầu đến cuối.** | Dev |
| `/review` | Review chất lượng code/test theo tiêu chuẩn. | Bổ trợ |
| `/code-simplify` | Rút gọn, làm sạch code (app hoặc test) theo persona. | Bổ trợ |

## 📚 Cấu trúc Thư mục

- `/commands/`: Chứa định nghĩa các Slash Commands (`.toml`).
- `/skills/`: Chứa não bộ của các kỹ năng (`SKILL.md` hướng dẫn AI cách làm).
- `/references/`: Chứa các chuẩn mực (Checklist mẫu, Rule Automation, Template Báo cáo) để nạp vào ngữ cảnh của AI.
- `/agents/`: Chứa định nghĩa nhân cách phụ (QA, Code Reviewer).

---

Sẵn sàng? Hãy khởi động quy trình bằng lệnh: **`/ba-spec [Mã_Jira]`**
