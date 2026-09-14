---
name: ba-process-modeling
description: Vẽ sơ đồ quy trình nghiệp vụ (Business Process Diagram, Flowchart, Swimlane) trực quan hóa các bước xử lý, tác nhân và điểm quyết định.
trigger: Khi cần trực quan hóa quy trình phức tạp, làm rõ workflow cho stakeholders hoặc nhận yêu cầu "vẽ quy trình", "process diagram".
---

# Kỹ Năng Lập Mô Hình Quy Trình Nghiệp Vụ (ba-process-modeling)

## 1. Khi nào dùng?
- Cần mô hình hóa luồng công việc phức tạp gồm nhiều tác nhân (Actors), hệ thống và nhánh quyết định (Decisions).
- Thiết kế sơ đồ so sánh trực quan giữa quy trình hiện tại (AS-IS) và quy trình tự động hóa tương lai (TO-BE).
- Tạo tài liệu trao đổi chung giữa nghiệp vụ (BA/PO), kỹ thuật (DEV) và kiểm thử (QA).

**Khi KHÔNG sử dụng:**
- Chỉ cần vẽ sơ đồ kiến trúc hạ tầng kỹ thuật (Network/Infra diagram) → Dùng `dev-spec-driven-development`.
- Chỉ cần render một đoạn mã Mermaid có sẵn → Dùng `ba-design-flowchart`.

## 2. Quy trình Thực hiện 5 Bước
- **Bước 1 (Xác định Thành phần):** Trích xuất Tác nhân (Actors), Nhiệm vụ (Tasks), Điểm rẽ nhánh (Decision Points) và Trạng thái Đầu/Cuối (Start/End).
- **Bước 2 (Chọn Bố cục):** Lựa chọn mô hình Flowchart thẳng hàng hoặc Swimlane phân làn theo tác nhân.
- **Bước 3 (Thiết kế Mã Mermaid):** Tuân thủ nghiêm ngặt chuẩn engine ELK (`flowchart LR`, straight spine, node taxonomy chuẩnStadium/Rectangle/Diamond).
- **Bước 4 (Làm nổi bật Trạng thái):** Đánh dấu điểm nghẽn (Pain Points) trên AS-IS hoặc cải tiến tự động (Improvements) trên TO-BE.
- **Bước 5 (Render & Xuất bản):** Sử dụng `ba-design-flowchart` để xuất file PNG/SVG đính kèm tài liệu spec.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Quy chuẩn sơ đồ (references/):**
  - [workflow.md](references/workflow.md): Hướng dẫn chi tiết 7 bước, cấu trúc BPMN, quy chuẩn màu sắc và Verification Checklist.
  - Quy tắc Mermaid toàn hệ thống: [mermaid_rules.md](../ba-design-flowchart/references/mermaid_rules.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** "Mô hình hóa quy trình duyệt hồ sơ mở tài khoản ký quỹ trực tuyến".
- **Output:**
  ```mermaid
  %%{init: {"flowchart": {"defaultRenderer": "elk"}, "elk": {"edgeRouting": "ORTHOGONAL"}}}%%
  flowchart LR
      START(["🟢 Nộp hồ sơ"]) --> OCR["Quét eKYC & CCCD"]
      OCR --> CHECK{"Điểm tín dụng hợp lệ?"}
      CHECK -- "Hợp lệ" --> ACTIVE["Kích hoạt tiểu khoản Margin"] --> END(["🔴 Hoàn tất"])
      CHECK -- "Lỗi" --> REJECT["Gửi thông báo từ chối"] --> END
  ```
