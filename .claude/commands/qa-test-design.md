---
description: Thiết kế test artifacts — checklist kiểm thử thực thi và BDD Gherkin feature files
---

Kích hoạt skill qa-test-design theo vai trò QA/SDET.
Tuân thủ chính xác workflow 2 phase có cổng kiểm soát (gated) được định nghĩa trong skill.
KHÔNG được bỏ qua Phase 1 — checklist là nguồn sự thật duy nhất cho phạm vi kịch bản.

## Nguồn đầu vào

1. **Ưu tiên cao nhất:** Đọc file `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md` nếu tồn tại.
   - File này là **single source of truth** sau khi import từ Jira, đã qua phân tích và interview.
   - Sử dụng trực tiếp các sections: Business Rules, Acceptance Criteria, User Flow, Form & Input, Edge Cases, API endpoints... làm đầu vào cho checklist.
   - Nhận diện loại task từ header `**Loại task:**` (APP/WEB/API) để điều chỉnh chiều kiểm thử phù hợp.
   - Trích xuất **Open Questions** → ghi nhận vào checklist dạng `[Blocked]` items.
2. **Nếu không có final.md:** Hỏi user cung cấp spec, PRD, hoặc mô tả yêu cầu.

Trình bày checklist cho user review trước khi chuyển sang Phase 2.

## Quy tắc

1. Checklist và file .feature **BẮT BUỘC** viết bằng tiếng Việt, sử dụng thuật ngữ chuyên ngành chứng khoán, fintech, ngân hàng, tài chính.
2. Mỗi scenario trong .feature phải truy vết được về 1 item trong checklist.
3. Tham khảo `references/qa-testing-checklist.md` cho bảng BVA, phân vùng tương đương (equivalence partitioning), và các mẫu validation domain tài chính.
4. KHÔNG tạo code implementation test — command này chỉ thiết kế test artifacts. Dùng `/qa-auto-design` để sinh code automation.
5. BẮT BUỘC chỉ sinh ra chính xác 1 file checklist và 1 file .feature duy nhất cho toàn bộ Jira task. Gom tất cả các tính năng/kịch bản vào chung 1 file `.feature`. Output lưu tại đường dẫn `workspace/{issueKey}/tests/qa-test-design/{issueKey}/` với định dạng tên 2 file là: `{issueKey}-checklist.md` và `{issueKey}.feature`.
