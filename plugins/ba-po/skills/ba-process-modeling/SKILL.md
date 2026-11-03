---
name: ba-process-modeling
description: Vẽ sơ đồ quy trình nghiệp vụ (Business Process Diagram, Flowchart, Swimlane) trực quan hóa các bước xử lý, tác nhân và điểm quyết định.
trigger: Khi cần trực quan hóa quy trình phức tạp, làm rõ workflow cho stakeholders hoặc nhận yêu cầu "vẽ quy trình", "process diagram".
---

# Kỹ Năng Lập Mô Hình Quy Trình Nghiệp Vụ (ba-process-modeling)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Mô tả quy trình, tác nhân và điểm quyết định từ user hoặc spec. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** File sơ đồ tồn tại; mọi bước/nút đều truy được về nguồn.

## 1. Khi nào dùng?
- Cần mô hình hóa luồng công việc phức tạp gồm nhiều tác nhân (Actors), hệ thống và nhánh quyết định (Decisions).
- Thiết kế sơ đồ so sánh trực quan giữa quy trình hiện tại (AS-IS) và quy trình tự động hóa tương lai (TO-BE).
- Tạo tài liệu trao đổi chung giữa nghiệp vụ (BA/PO), kỹ thuật (DEV) và kiểm thử (QA).

**Khi KHÔNG sử dụng:**
- Chỉ cần vẽ sơ đồ kiến trúc hạ tầng kỹ thuật (Network/Infra diagram) → Việc của DEV/Architect (dùng `ba-design-flowchart`).
- Chỉ cần render một đoạn mã Mermaid có sẵn → Dùng `ba-design-flowchart`.

## 2. Quy trình Thực hiện 5 Bước
- **Bước 1 (Xác định Thành phần):** Trích xuất Tác nhân (Actors), Nhiệm vụ (Tasks), Điểm rẽ nhánh (Decision Points) và Trạng thái Đầu/Cuối (Start/End).
- **Bước 2 (Chọn Bố cục):** Lựa chọn mô hình Flowchart thẳng hàng hoặc Swimlane phân làn theo tác nhân.
- **Bước 3 (Thiết kế Luồng):** Định hình các nút (nodes) và cung (edges) rõ ràng.
- **Bước 4 (Làm nổi bật Trạng thái):** Đánh dấu điểm nghẽn (Pain Points) trên AS-IS hoặc cải tiến tự động (Improvements) trên TO-BE.
- **Bước 5 (Render & Xuất bản):** Sử dụng `ba-design-flowchart` để xuất file HTML/PNG đính kèm tài liệu spec (KHÔNG sử dụng Mermaid, tuân thủ hệ thống Editorial Design).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Quy chuẩn sơ đồ (references/):**
  - [workflow.md](references/workflow.md): Hướng dẫn chi tiết 7 bước, cấu trúc BPMN, quy chuẩn màu sắc và Verification Checklist.

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** "Mô hình hóa quy trình duyệt hồ sơ mở tài khoản ký quỹ trực tuyến".
- **Output:** Dùng lệnh sinh sơ đồ (thông qua `ba-design-flowchart`):
  ```text
  Yêu cầu vẽ sơ đồ flowchart:
  1. Node start: Nộp hồ sơ
  2. Xử lý: Quét eKYC & CCCD
  3. Quyết định: Điểm tín dụng hợp lệ?
     - Hợp lệ -> Kích hoạt tiểu khoản Margin -> Hoàn tất
     - Lỗi -> Gửi thông báo từ chối -> Hoàn tất
  ```

---
