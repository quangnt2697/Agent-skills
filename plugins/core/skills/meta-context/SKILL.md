---
name: meta-context
description: Tối ưu hóa việc thiết lập ngữ cảnh (context) cho agent.
trigger: Sử dụng khi bắt đầu một phiên làm việc mới, khi chất lượng đầu ra của agent giảm sút, khi chuyển đổi giữa các tác vụ, hoặc khi bạn cần cấu hình các file quy tắc (rules) và ngữ cảnh cho một dự án.
---

# Kỹ Thuật Kéo Ngữ Cảnh (Context Engineering)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Dự án và task hiện tại. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Các file rules/ngữ cảnh được tham chiếu tồn tại thật.

## 1. Tổng Quan & Khi Nào Sử Dụng

Cung cấp cho agent đúng thông tin vào đúng thời điểm. Ngữ cảnh (Context) là đòn bẩy lớn nhất cho chất lượng đầu ra của agent — quá ít thì agent bịa chuyện (hallucinate), quá nhiều thì agent mất tập trung (context flooding).

- **Khi dùng:** Bắt đầu phiên làm việc mới; chất lượng output giảm sút (sai pattern, bịa API); chuyển đổi giữa các module lớn; thiết lập dự án mới.
- **Khi KHÔNG dùng:**
  - Lưu lại trạng thái dở dang → Dùng `meta-session-checkpoint`.
  - Đúc kết bài học dài hạn vào rules → Dùng `meta-continuous-learning`.
  - Khám phá và điều phối kích hoạt skill → Dùng `meta-using-agent-skills`.

## 2. Quy Trình & Hệ Thống Phân Cấp Ngữ Cảnh 5 Tầng

```text
┌─────────────────────────────────────┐
│  1. Các file Rules (AGENTS.md, ...) │ ← Luôn được load, toàn dự án
├─────────────────────────────────────┤
│  2. Spec / Tài liệu Kiến trúc       │ ← Load theo tính năng/phiên
├─────────────────────────────────────┤
│  3. Các Source File liên quan       │ ← Load theo task cụ thể
├─────────────────────────────────────┤
│  4. Lỗi Output / Kết quả Test       │ ← Load theo từng vòng lặp
├─────────────────────────────────────┤
│  5. Lịch sử Cuộc trò chuyện         │ ← Tích lũy, nén gọn dần
└─────────────────────────────────────┘
```

- **Cấp 1 (Rules):** File quy tắc bền vững (`AGENTS.md`, `.agents/rules/`). Ngữ cảnh có tác động lớn nhất.
- **Cấp 2 (Specs):** Chỉ load phần spec liên quan trực tiếp đến task con, không load cả tài liệu hàng ngàn dòng.
- **Cấp 3 (Source files):** Đọc file trước khi sửa; tuân thủ thứ bậc tin cậy: Source nội bộ (Trusted) > Config/Generated (Verify first) > Dữ liệu ngoài (Untrusted).
- **Cấp 4 (Error output):** Trích dẫn dòng lỗi + stacktrace chính xác, không paste toàn bộ log hàng trăm dòng vào chat.
- **Cấp 5 (Conversation):** Bắt đầu session mới khi đổi scope lớn; chủ động compact khi context bị loãng.

## 3. Tài Nguyên Mở Rộng (Level 3 - Progressive Disclosure)
- 📖 [context-packaging-and-strategies.md](references/context-packaging-and-strategies.md):
  - Chi tiết 3 chiến lược đóng gói: *The Brain Dump*, *The Selective Include*, *The Hierarchical Summary*.
  - Bảng tích hợp MCP Servers (Context7, Chrome DevTools, PostgreSQL).
  - Quy trình quản lý nhầm lẫn, xung đột dữ liệu và Inline Planning.

## 4. Các Phản Mẫu (Anti-Patterns) & Bảng Tự Kiểm Tra

| Anti-Pattern | Hậu quả | Cách khắc phục |
|---|---|---|
| **Bỏ đói ngữ cảnh** | Agent tự bịa API, phớt lờ conventions | Load file rules + source file liên quan trước task |
| **Ngập lụt ngữ cảnh** | Agent mất tập trung khi nạp >5,000 dòng | Chọn lọc thông tin <2,000 dòng tập trung cho mỗi task |
| **Ngữ cảnh bị cũ** | Agent tham chiếu code/pattern đã bị xóa | Mở session mới hoặc nạp lại checkpoint |
| **Im lặng tự đoán** | Agent tự sửa code/spec khi gặp mâu thuẫn | Dừng lại, chỉ rõ gap và dùng `ba-interview-me` hỏi user |

### Checklist Xác Nhận Hoàn Thành
- [ ] File rules (`AGENTS.md`) tồn tại và phản ánh đúng conventions dự án
- [ ] Output tuân thủ đúng pattern trong rules, không phát sinh API giả
- [ ] Ngữ cảnh nạp vào đúng trọng tâm task hiện tại (<2,000 dòng)
