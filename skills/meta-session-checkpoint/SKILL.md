---
name: meta-session-checkpoint
description: "Kỹ năng Siêu cấp giúp Agent nén lại toàn bộ ngữ cảnh (context) từ một phiên làm việc dài thành Checkpoint nhỏ gọn, hoặc khôi phục lại trạng thái từ Checkpoint đó."
---

# Kỹ năng Nén & Khôi phục Ngữ cảnh (Session Checkpoint)

## Khi nào sử dụng kỹ năng này?
- Người dùng sử dụng lệnh `/save-checkpoint` hoặc `/load-checkpoint`.
- Khi độ dài của chat history đã quá lớn, Token sử dụng cao dẫn đến agent bị quên hoặc xử lý chậm.
- Khi người dùng muốn tạm dừng công việc hiện tại (dừng phiên) và muốn tiếp tục vào hôm sau mà không muốn mất thời gian giải thích lại từ đầu.

## Ranh giới & Quyền hạn
- **Không thay đổi Codebase:** Kỹ năng này chỉ tạo ra tài liệu quản lý trạng thái, TUYỆT ĐỐI không sửa đổi code ứng dụng hoặc xóa các file code.
- **Nơi lưu trữ Checkpoint:** Mọi checkpoint BẮT BUỘC phải được lưu vào file `/Users/qa-quangnt/Desktop/Project/Test/agent-skills/.agents/workspace_state.md`.

## Quy trình Thực thi (The Checkpoint Pipeline)

Kỹ năng này có hai chế độ: LƯU (Save) và TẢI (Load). Agent dựa vào yêu cầu của người dùng để quyết định gọi quy trình nào.

### Chế độ LƯU (Trigger: `/save-checkpoint`)
1. **Quét toàn bộ ngữ cảnh hiện tại:** Đọc lại chat history (hoặc tự nhận thức những gì vừa làm).
2. **Tổng hợp 3 nhóm thông tin chính:**
   - **Sự thật (Facts):** Các file nào đã được sửa/tạo? Môi trường, cấu hình nào đang được thiết lập? Quyết định kiến trúc nào đã được chốt? (Rất quan trọng).
   - **Tiến độ (Progress):** Chúng ta đang ở bước nào trong bản kế hoạch (task.md) hoặc đặc tả (final.md)? Cái gì đã làm xong? Cái gì đang bị lỗi? (Phải trích dẫn mã lỗi nếu có).
   - **Bước tiếp theo (Next Steps):** Ngay khi mở lại chat, Agent phải làm chính xác hành động gì tiếp theo? (Ví dụ: "Chạy file test X", "Sửa bug Y trong file Z").
3. **Lưu file:** Ghi đè (hoặc tạo mới) file `/Users/qa-quangnt/Desktop/Project/Test/agent-skills/.agents/workspace_state.md` với định dạng Markdown thật rõ ràng và ngắn gọn.
4. **Báo cáo:** Nhắc người dùng: "Checkpoint đã được lưu. Bạn có thể xóa lịch sử chat, mở phiên chat mới và gọi lệnh `/load-checkpoint` để tiếp tục."

### Chế độ TẢI (Trigger: `/load-checkpoint`)
1. **Đọc Checkpoint:** Dùng công cụ đọc file để nạp nội dung từ `/Users/qa-quangnt/Desktop/Project/Test/agent-skills/.agents/workspace_state.md`.
2. **Phục hồi Ngữ cảnh:** Tự động thiết lập lại suy nghĩ của chính bạn sao cho khớp với các Facts và Progress ghi trong đó.
3. **Hành động ngay lập tức:** Đọc mục "Next Steps" và TỰ ĐỘNG THỰC THI bước tiếp theo mà KHÔNG CẦN CHỜ NGƯỜI DÙNG XÁC NHẬN (Action Over Chat).

## Nguyên tắc cốt lõi
- Checkpoint phải "Ngắn gọn nhưng Đủ ý". Đừng copy toàn bộ code vào Checkpoint. Chỉ ghi đường dẫn file (File paths) và tên hàm/class đang sửa.
- File `.agents/workspace_state.md` chỉ lưu trạng thái tạm thời, nó sẽ bị ghi đè nhiều lần. Đừng lưu các "Bài học xương máu" vào đây (dùng `meta-continuous-learning` cho mục đích đó).
