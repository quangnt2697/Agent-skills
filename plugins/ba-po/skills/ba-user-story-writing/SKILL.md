---
name: ba-user-story-writing
description: Viết User Stories chuẩn mực theo nguyên tắc INVEST ("As a... I want... So that...") kèm tiêu chí chấp nhận Acceptance Criteria bằng định dạng Gherkin.
trigger: Khi cần chuyển hóa yêu cầu nghiệp vụ thành User Stories, chuẩn hóa backlog Jira hoặc nhận yêu cầu "viết user story".
---

# Kỹ Năng Viết User Stories (ba-user-story-writing)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Yêu cầu/nhu cầu nghiệp vụ có nguồn. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Mỗi story có AC Gherkin truy được về yêu cầu nguồn.

## 1. Khi nào dùng?
- Có tài liệu Business-Spec (`final.md`) hoặc yêu cầu nghiệp vụ thô cần bóc tách thành các User Stories cho Sprint Backlog.
- Chuẩn hóa các task Jira chưa có Acceptance Criteria hoặc chưa đáp ứng nguyên tắc **INVEST**.
- Chuẩn bị đầu vào cho DEV lập kế hoạch công việc (`dev-planning-and-task-breakdown`) và QA thiết kế test (`qa-test-design`).

**Khi KHÔNG sử dụng:**
- Yêu cầu còn quá mơ hồ, chưa rõ bài toán kinh doanh → Dùng `ba-refine` hoặc `ba-interview-me`.
- Thiết kế đặc tả kỹ thuật kiến trúc → Dùng `dev-spec-driven-development`.

## 2. Quy trình Thực hiện 5 Bước
- **Bước 1 (Xác định Tác nhân - Role/Persona):** Làm rõ người dùng cụ thể là ai (Nhà đầu tư cá nhân, Môi giới, Quản trị viên hệ thống...), không dùng chung chung "Người dùng".
- **Bước 2 (Trích xuất Mục tiêu & Giá trị - Goal & Value):** Định hình hành động mong muốn và lý do vì sao tính năng đó mang lại giá trị thiết thực.
- **Bước 3 (Định dạng User Story):** Viết theo cấu trúc chuẩn: *"Là một [vai trò], tôi muốn [hành động], để [giá trị đạt được]"*.
- **Bước 4 (Viết Acceptance Criteria dạng Gherkin):** Mô tả tối thiểu 2-3 kịch bản Given-When-Then bao quát luồng chuẩn (Happy Path) và ngoại lệ (Error Path).
- **Bước 5 (Kiểm định chuẩn INVEST):** Đánh giá xem Story có độc lập (Independent), thương lượng được (Negotiable), có giá trị (Valuable), ước lượng được (Estimable), vừa vặn (Small) và kiểm thử được (Testable).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Tiêu chuẩn chất lượng (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 7 bước triển khai, định dạng xuất file Jira Description và Template mẫu.
  - [invest-criteria.md](references/invest-criteria.md): Chi tiết 6 tiêu chuẩn INVEST, bảng kiểm tra Red Flags và Anti-patterns.

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** Tính năng hủy lệnh chờ khớp trên sàn chứng khoán.
- **Output:**
  ```markdown
  ### US-04: Hủy Lệnh Chờ Khớp
  **Là một** Nhà đầu tư chứng khoán,
  **Tôi muốn** hủy một lệnh đang ở trạng thái Chờ khớp (Receive/Pending),
  **Để** giải phóng sức mua hoặc thay đổi chiến lược giao dịch kịp thời.
  
  **Acceptance Criteria (Gherkin):**
  - **Kịch bản 1 (Thành công):** 
    Given Lệnh mua HPG đang ở trạng thái "RECEIVE" trên sổ lệnh
    When Nhà đầu tư bấm nút "Hủy lệnh" và xác nhận
    Then Hệ thống đổi trạng thái lệnh sang "CANCELLED" và hoàn lại sức mua ngay lập tức.
  - **Kịch bản 2 (Lệnh đã khớp một phần):**
    Given Lệnh mua đã khớp 50% khối lượng
    When Nhà đầu tư thực hiện hủy lệnh
    Then Hệ thống chỉ hủy khối lượng còn lại và cập nhật trạng thái "PARTIAL_CANCEL".
  ```

---
