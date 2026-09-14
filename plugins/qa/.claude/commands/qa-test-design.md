---
description: "Thiết kế test artifacts — checklist kiểm thử thực thi và BDD Gherkin feature files"
---

Kích hoạt skill qa-test-design theo vai trò QA/SDET.
Tuân thủ quy trình 3 giai đoạn: Thiết kế Checklist (checklist.md) → Thiết kế Kịch bản BDD Gherkin ({issueKey}.feature) → Xác minh cú pháp (qa-validate.sh) & Bàn giao.
KHÔNG được bỏ qua Giai đoạn 1 — checklist là nguồn sự thật duy nhất cho phạm vi kịch bản.

## Nguồn đầu vào

1. **Ưu tiên cao nhất:** Đọc file `/project-root/workspace/{issueKey}/spec/final.md` nếu tồn tại.
   - File này là **single source of truth** sau khi import từ Jira, đã qua phân tích và interview.
   - Sử dụng trực tiếp các sections: Business Rules, Acceptance Criteria, User Flow, Form & Input, Edge Cases, API endpoints... làm đầu vào cho checklist.
   - Nhận diện loại task từ header `**Loại task:**` (APP/WEB/API) để điều chỉnh chiều kiểm thử phù hợp.
2. **Nếu không có final.md:** Hỏi user cung cấp spec, PRD, hoặc mô tả yêu cầu.

## Quy trình

1. **Giai đoạn 1: Thiết kế Checklist thực thi:**
   - Phân nhóm theo 6 chiều kiểm thử (Bảo mật P0, Quy tắc nghiệp vụ P0, Happy path P0, Validation P1, Routing P1, Edge cases P2).
   - Viết từng item bắt đầu bằng động từ hành động, lượng hoá cụ thể, gán nhãn P0/P1/P2.
   - Lưu tại `/project-root/workspace/{issueKey}/test/checklist.md`.
2. **Giai đoạn 2: Thiết kế Kịch bản BDD Gherkin:**
   - Ánh xạ 1-1 từ checklist sang scenarios Given/When/Then trong duy nhất 1 file `{issueKey}.feature`.
   - Viết bằng ngôn ngữ thuần nghiệp vụ (Ubiquitous Language), tuyệt đối không để lộ biến code/kỹ thuật.
   - Sử dụng Ranh giới Tượng trưng (`TAI_HAN_MUC`, `VUOT_HAN_MUC`, `TRONG_NGUONG`) và BVA 3 giá trị cho tài chính.
   - Lưu tại `/project-root/workspace/{issueKey}/test/{issueKey}.feature`.
3. **Giai đoạn 3: Xác minh Cú pháp & Bàn giao:**
   - Chạy `bash plugins/qa/skills/qa-test-design/assets/qa-validate.sh workspace/{issueKey}/test/{issueKey}.feature` và tự sửa lỗi cú pháp (Self-fix Loop ≤ 3 vòng).
   - Bàn giao 2 artifacts và hướng dẫn chạy `/qa-auto-design {issueKey}` để sinh code hoặc `/qa-squash-push {issueKey}` để đẩy lên Squash TM.

## Output

- Checklist: `/project-root/workspace/{issueKey}/test/checklist.md`
- Kịch bản BDD: `/project-root/workspace/{issueKey}/test/{issueKey}.feature`

## Quy tắc

1. Checklist và file .feature **BẮT BUỘC** viết bằng tiếng Việt, sử dụng thuật ngữ chuyên ngành chứng khoán, fintech, ngân hàng, tài chính.
2. Mỗi scenario trong .feature phải truy vết được về 1 item trong checklist.
3. KHÔNG tạo code automation và KHÔNG tự động push Squash TM — việc đó thuộc về `/qa-auto-design` và `/qa-squash-push`.
4. BẮT BUỘC chỉ sinh ra chính xác 1 file checklist và 1 file .feature duy nhất cho toàn bộ Jira task.

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
