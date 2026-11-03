# Quy Tắc, Hướng Dẫn & Đánh Giá (ba-spec)

> 📖 **Quy tắc Chung về Xác thực & Cấu trúc:**
> Xem chi tiết tại [../../../../references/atlassian-rules.md](../../../../references/atlassian-rules.md) về cấu hình `.env`, biến `ATLASSIAN_*`, cấu trúc thư mục `workspace/issues/{issueKey}/` và bộ lọc định dạng file được phép tải.

---

## 4. Các Biện hộ Thường gặp (Rationalizations)

| Lý do biện hộ | Thực tế |
|---|---|
| "Jira mô tả đủ rồi, khỏi cần scan Confluence tham chiếu" | Phần lớn business rule chi tiết nằm ở trang thiết kế được link. Bỏ scan là bỏ sót nguồn chính. |
| "Ảnh wireframe/flowchart không đọc được, bỏ qua" | Wireframe và flowchart là nơi luồng được định nghĩa rõ nhất. Tải về và đọc. |
| "Có 3 chỗ mơ hồ nhưng tôi đoán được, viết luôn cho nhanh" | Đoán sai sẽ nhân lên thành test sai. Đây là lý do Phase 4 tồn tại. |
| "Confidence mới 78%, cứ ghi vào rồi chạy tiếp" | Đúng — nhưng phải ghi gap vào mục *Giả định & Rủi ro*, không tự lấp đầy chỗ trống. |
| "File `final.md` đã tồn tại, hỏi user có ghi đè không" | Tự động ghi đè theo `autonomy-contract.md`. |
| "Task này đơn giản, không cần đủ 13 section" | Phải ghi "Không áp dụng" kèm lý do, không được bỏ trống. |
| "Copy nguyên mô tả Jira vào final.md cho nhanh" | `final.md` là kết quả phân tích, không phải bản sao chép. |

---

## 5. Dấu hiệu Cảnh báo (Red Flags)

- File `final.md` không có mục Acceptance Criteria, hoặc AC viết dạng mô tả thay vì checklist rule.
- Mục Open Questions rỗng ở một task phức tạp — chưa phân tích đủ sâu.
- Business Rule viết bằng tính từ mơ hồ: "hợp lệ", "nhanh", "phù hợp".
- Không có mục *Giả định & Rủi ro* dù quá trình phân tích có chỗ phải đoán.
- Chỉ đọc file PDF của Jira, bỏ qua toàn bộ file trong `source/refs/`.
- Task liên quan đến chứng khoán/đặt lệnh/bảng giá nhưng không tham chiếu `securities-domain-rules.md`, tự bịa quy tắc phiên, thiếu điều kiện Random End, hoặc thiếu mã lỗi ORS.

---

## 6. Xác minh (Verification Checklist)

Trước khi bàn giao spec cho QA hoặc DEV:
- [ ] File tồn tại tại `workspace/issues/{issueKey}/spec/final.md` và không rỗng.
- [ ] Đủ 13 section — section không áp dụng phải ghi "Không áp dụng".
- [ ] Mỗi tài liệu đã tải trong `source/` và `source/refs/` được trích dẫn ít nhất một lần.
- [ ] Mỗi Acceptance Criteria là một mệnh đề Pass/Fail duy nhất.
- [ ] Câu hỏi 🔴 Critical đã được trả lời qua Phase 4, hoặc được nêu rõ là điểm dừng theo trường hợp 3 của `autonomy-contract.md`.
- [ ] Gap chưa giải quyết được ghi vào mục *Giả định & Rủi ro* kèm mức ảnh hưởng.
- [ ] **Nếu là bài toán chứng khoán:** Đã đối chiếu và tuân thủ các quy tắc trong `securities-domain-rules.md`.

---

## 7. Sau khi hoàn thành (Next Steps)

**BẮT BUỘC (Single-Task Hard Stop):** Sau khi xuất bản file `final.md`, Agent **DỪNG LẠI NGAY** theo `autonomy-contract.md` §7.4. Kết thúc bằng đúng 1 gợi ý bước tiếp theo bằng văn bản (ví dụ: `/qa-test-design {issueKey}`). TUYỆT ĐỐI CẤM tự ý kích hoạt các lệnh downstream nếu người dùng không truyền cờ `--auto` hoặc không gọi Orchestrator toàn trình.
