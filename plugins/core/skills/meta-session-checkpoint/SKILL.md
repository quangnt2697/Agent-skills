---
name: meta-session-checkpoint
description: Kỹ năng Siêu cấp giúp Agent nén lại toàn bộ ngữ cảnh (context) từ một phiên làm việc dài thành Checkpoint nhỏ gọn, hoặc khôi phục lại trạng thái từ Checkpoint đó.
trigger: Sử dụng khi chat history đã quá dài, khi muốn tạm dừng công việc để hôm sau làm tiếp, hoặc khi người dùng gọi `/save-checkpoint` / `/load-checkpoint`.
---

# Kỹ năng Nén & Khôi phục Ngữ cảnh (Session Checkpoint)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Lịch sử phiên làm việc thực. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** `.agents/workspace_state.md` tồn tại với đủ 3 nhóm Facts/Progress/Next Steps.

## Tổng quan

Một phiên làm việc dài tích tụ ngữ cảnh nhanh hơn nhiều so với lượng ngữ cảnh thực sự cần để
làm tiếp: hàng chục lần đọc file, thử-sai, và output công cụ — trong khi thứ quyết định bước
tiếp theo chỉ là vài quyết định đã chốt và một danh sách việc còn dang dở.

Kỹ năng này nén phần cần giữ vào `.agents/workspace_state.md` theo đúng 3 nhóm — **Facts**,
**Progress**, **Next Steps** — để phiên sau mở lên là chạy tiếp được ngay, không phải giải
thích lại từ đầu. Đây là trạng thái **tạm thời và bị ghi đè**; tri thức cần giữ lâu dài thuộc
về [meta-continuous-learning](../meta-continuous-learning/SKILL.md).

## Khi nào sử dụng kỹ năng này?
- Người dùng sử dụng lệnh `/save-checkpoint` hoặc `/load-checkpoint`.
- Khi độ dài của chat history đã quá lớn, Token sử dụng cao dẫn đến agent bị quên hoặc xử lý chậm.
- Khi người dùng muốn tạm dừng công việc hiện tại (dừng phiên) và muốn tiếp tục vào hôm sau mà không muốn mất thời gian giải thích lại từ đầu.

**Khi KHÔNG sử dụng:**
- Muốn đúc kết quy tắc, bài học kinh nghiệm dài hạn cho các phiên sau → Dùng `meta-continuous-learning`.
- Tối ưu ngữ cảnh hiện tại đang chạy trong cửa sổ chat mà không ngắt phiên → Dùng `meta-context`.
- Kiểm tra ma trận truy vết giữa Spec và Test → Dùng `meta-cross-validation`.

## Ranh giới & Quyền hạn
- **Không thay đổi Codebase:** Kỹ năng này chỉ tạo ra tài liệu quản lý trạng thái, TUYỆT ĐỐI không sửa đổi code ứng dụng hoặc xóa các file code.
- **Nơi lưu trữ Checkpoint:** Mọi checkpoint BẮT BUỘC phải được lưu vào file `{PROJECT_ROOT}/.agents/workspace_state.md`. (Trong đó `{PROJECT_ROOT}` là thư mục gốc của dự án đang mở, xác định qua `git rev-parse --show-toplevel`).

## Quy trình Thực thi (The Checkpoint Pipeline)

Kỹ năng này có hai chế độ: LƯU (Save) và TẢI (Load). Agent dựa vào yêu cầu của người dùng để quyết định gọi quy trình nào.

### Chế độ LƯU (Trigger: `/save-checkpoint`)
1. **Quét toàn bộ ngữ cảnh hiện tại:** Đọc lại chat history (hoặc tự nhận thức những gì vừa làm).
2. **Tổng hợp 3 nhóm thông tin chính:**
   - **Sự thật (Facts):** Các file nào đã được sửa/tạo? Môi trường, cấu hình nào đang được thiết lập? Quyết định kiến trúc nào đã được chốt? (Rất quan trọng).
   - **Tiến độ (Progress):** Chúng ta đang ở bước nào trong bản kế hoạch (task.md) hoặc đặc tả (final.md)? Cái gì đã làm xong? Cái gì đang bị lỗi? (Phải trích dẫn mã lỗi nếu có).
   - **Bước tiếp theo (Next Steps):** Ngay khi mở lại chat, Agent phải làm chính xác hành động gì tiếp theo? (Ví dụ: "Chạy file test X", "Sửa bug Y trong file Z").
3. **Lưu file:** Ghi đè (hoặc tạo mới) file `{PROJECT_ROOT}/.agents/workspace_state.md` với định dạng Markdown thật rõ ràng và ngắn gọn.
4. **Báo cáo:** Nhắc người dùng: "Checkpoint đã được lưu. Bạn có thể xóa lịch sử chat, mở phiên chat mới và gọi lệnh `/load-checkpoint` để tiếp tục."

### Chế độ TẢI (Trigger: `/load-checkpoint`)
1. **Đọc Checkpoint:** Dùng công cụ đọc file để nạp nội dung từ `{PROJECT_ROOT}/.agents/workspace_state.md`.
2. **Phục hồi Ngữ cảnh:** Tự động thiết lập lại suy nghĩ của chính bạn sao cho khớp với các Facts và Progress ghi trong đó.
3. **Hành động ngay lập tức:** Đọc mục "Next Steps" và TỰ ĐỘNG THỰC THI bước tiếp theo mà KHÔNG CẦN CHỜ NGƯỜI DÙNG XÁC NHẬN (Action Over Chat).

## Nguyên tắc cốt lõi
- Checkpoint phải "Ngắn gọn nhưng Đủ ý". Đừng copy toàn bộ code vào Checkpoint. Chỉ ghi đường dẫn file (File paths) và tên hàm/class đang sửa.
- File `.agents/workspace_state.md` chỉ lưu trạng thái tạm thời, nó sẽ bị ghi đè nhiều lần. Đừng lưu các "Bài học xương máu" vào đây (dùng `meta-continuous-learning` cho mục đích đó).

## Những lời Biện hộ Thường gặp (Common Rationalizations)

| Lời biện hộ                                           | Thực tế                                                                                                                          |
|-------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| "Cứ copy hết vào cho chắc, thiếu còn hơn thừa."       | Checkpoint phình to thì mất đúng mục đích của nó. Ghi đường dẫn file, không ghi nội dung file.                                   |
| "Ghi Next Steps chung chung là được, lúc đó tự biết." | "Làm tiếp phần còn lại" không thực thi được. Next Steps phải là một hành động cụ thể chạy được ngay.                             |
| "Không cần ghi Facts, đọc code là ra."                | Quyết định kiến trúc và ràng buộc môi trường **không** nằm trong code. Mất Facts là mất phần đắt nhất.                           |
| "Task đang lỗi, để sửa xong rồi hẵng lưu."            | Đúng lúc đang lỗi mới là lúc cần checkpoint nhất — phải ghi kèm nguyên văn mã lỗi.                                               |
| "Chế độ TẢI xong nên hỏi lại user cho chắc."          | Trái với Action Over Chat. Đọc xong Next Steps là thực thi luôn; chỉ dừng nếu rơi vào danh sách đóng của `autonomy-contract.md`. |
| "Lưu luôn bài học vào file này cho tiện."             | File này bị ghi đè ở lần `/save-checkpoint` kế tiếp — bài học sẽ biến mất.                                                       |

## Dấu hiệu Cảnh báo (Red Flags)

❌ **Next Steps không phải là một hành động** ("tiếp tục công việc", "review lại") — phiên sau không biết gõ lệnh gì.

❌ **Progress ghi "đang lỗi" mà không có mã lỗi** — phiên sau phải chạy lại từ đầu để tái hiện lỗi.

❌ **Checkpoint chứa nguyên khối code dài** — dấu hiệu đang copy ngữ cảnh thay vì nén ngữ cảnh.

❌ **Facts chỉ liệt kê tên file đã sửa** — thiếu phần "vì sao", tức là thiếu các quyết định đã chốt; phiên sau dễ đảo ngược một quyết định đã cân nhắc kỹ.

❌ **Chế độ TẢI dừng lại hỏi "bạn có muốn tôi tiếp tục không?"** — vi phạm bước 3 của chế độ TẢI.

❌ **Ghi checkpoint ra chỗ khác `.agents/workspace_state.md`** — lệnh `/load-checkpoint` chỉ đọc đúng đường dẫn này.

## Xác minh (Verification)

**Chế độ LƯU** — chưa xong cho đến khi:

1. File `.agents/workspace_state.md` tồn tại, khác rỗng và có đủ 3 mục: Facts, Progress, Next Steps.
2. Mỗi mục Next Steps là một hành động cụ thể — nêu được lệnh sẽ chạy hoặc file sẽ sửa.
3. Nếu Progress có item đang lỗi: đã trích nguyên văn mã lỗi kèm theo.
4. Checkpoint không chứa khối code dài; các file chỉ xuất hiện dưới dạng đường dẫn.
5. Không có bài học/tri thức dài hạn nào bị lẫn vào đây.

**Chế độ TẢI** — chưa xong cho đến khi:

1. Đã đọc được file và tóm tắt lại Facts + Progress cho người dùng thấy ngữ cảnh đã khôi phục.
2. Đã **thực thi** bước đầu tiên trong Next Steps, không phải chỉ liệt kê nó ra.
3. Nếu file không tồn tại: báo rõ và hướng dẫn chạy `/save-checkpoint` trước — không tự bịa ngữ cảnh.


---
