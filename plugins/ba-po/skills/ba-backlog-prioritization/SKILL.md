---
name: ba-backlog-prioritization
description: Ưu tiên Product Backlog theo các framework chuẩn mực (MoSCoW, WSJF), tối ưu giá trị nghiệp vụ và giảm thiểu rủi ro cho kế hoạch Sprint/Release.
trigger: Khi có danh sách User Stories cần xếp độ ưu tiên, lập lộ trình phát hành hoặc nhận yêu cầu "ưu tiên backlog", "sắp xếp theo priority".
---

# Kỹ Năng Ưu Tiên Hóa Backlog (ba-backlog-prioritization)

## 1. Khi nào dùng?
- Có danh sách User Stories hoặc Features cần phân loại mức độ quan trọng cho Sprint hoặc Release.
- Cần giải quyết xung đột ý kiến giữa các bên liên quan (Stakeholders) bằng phương pháp định lượng hoặc định tính rõ ràng.
- Lập kế hoạch lộ trình MVP (Minimum Viable Product).

**Khi KHÔNG sử dụng:**
- Chưa có danh sách User Stories cụ thể → Dùng `ba-user-story-writing` trước.
- Khi điều hành cuộc họp Sprint Planning của Scrum Master → Dùng `sm-sprint-planning`.

## 2. Quy trình Thực hiện 5 Bước
- **Bước 1 (Thu thập Danh mục):** Đọc danh sách User Stories từ `user-stories.md` hoặc `gap-analysis.md`.
- **Bước 2 (Lựa chọn Framework):** Chọn **MoSCoW** (cho phân loại nhanh theo phạm vi phát hành) hoặc **WSJF** (cho xếp thứ tự dựa trên Cost of Delay và Job Size).
- **Bước 3 (Thu thập Tham số Chấm điểm):** Đánh giá Business Value, Time Criticality, Risk Reduction và Effort.
- **Bước 4 (Phân hạng & Thẩm định):** Tính toán điểm số, xếp hạng từ cao xuống thấp và kiểm tra các phụ thuộc kỹ thuật (Dependencies).
- **Bước 5 (Đóng gói Kế hoạch Release):** Phân bổ các hạng mục vào Sprint 1, Sprint 2 và Release Roadmap.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu phương pháp & Biểu mẫu (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 bước, cấu trúc báo cáo Backlog ưu tiên và Checklist xác minh.
  - [frameworks.md](references/frameworks.md): Hướng dẫn công thức tính điểm WSJF (Weighted Shortest Job First) và tiêu chí phân bổ MoSCoW (Must, Should, Could, Won't).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Sắp xếp 3 User Stories: (1) Đặt lệnh cơ bản, (2) Đổi ảnh đại diện, (3) Xác thực Smart OTP.
- **Output:**
  | Mã | User Story | Framework MoSCoW | WSJF Score | Phân bổ |
  |---|---|:---:|:---:|:---:|
  | US-01 | Đặt lệnh mua/bán cổ phiếu | **Must-Have** | 20.5 | Sprint 1 (Core MVP) |
  | US-02 | Kích hoạt Smart OTP | **Must-Have** | 18.0 | Sprint 1 (Bảo mật bắt buộc) |
  | US-03 | Đổi avatar người dùng | **Could-Have** | 3.2 | Backlog (Sau MVP) |
