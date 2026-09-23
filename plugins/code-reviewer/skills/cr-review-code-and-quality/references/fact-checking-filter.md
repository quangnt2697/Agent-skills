# Bộ Lọc Phản Tư & Kiểm Chứng Sự Thật (Fact-Checking & Anti-Hallucination Filter)

Bộ lọc này lấy cảm hứng trực tiếp từ cơ chế **Review Filter / Reflection Module** của Alibaba Open Code Review. 

> **Nguyên tắc Tối thượng:**  
> *"Một cảnh báo sai (false alarm) làm mất niềm tin của lập trình viên hơn nhiều so với việc bỏ sót một góp ý phong cách nhỏ. Thà giữ im lặng khi ngữ cảnh chưa rõ ràng, quyết không đưa ra các nhận xét ảo giác."*

---

## 1. Vai Trò Của Bộ Lọc (Fact-Checker Role)

Trước khi xuất báo cáo đánh giá cuối cùng cho người dùng, Agent **BẮT BUỘC** thực hiện một lượt tự thẩm tra (self-reflection) trên từng nhận xét (finding) đã tìm thấy.

Nhiệm vụ của bộ lọc rất rõ ràng: **Loại bỏ các nhận xét mà nội dung diff CHỨNG MINH là sai sự thật hiển nhiên hoặc suy đoán vô căn cứ.**

---

## 2. Hai Căn Cứ Để Hủy Bỏ Nhận Xét (Grounds for Removal)

Một nhận xét **BẮT BUỘC PHẢI BỊ LOẠI BỎ** nếu rơi vào một trong hai trường hợp sau:

### Căn cứ A (Ground A) — Nhận xét về đoạn mã KHÔNG CÓ trong Diff
Nhận xét nhắm vào một biến, hàm, phát biểu hoặc cấu trúc logic mà **không hề xuất hiện** trong phần thay đổi (unified diff) của file được nhắc tới:
- *Ví dụ vi phạm:* Nhận xét chê logic xử lý lỗi của hàm `calculateInterest()` trong một file `.json` hoặc file khai báo interface thuần túy.
- *Ví dụ vi phạm:* Khẳng định lập trình viên "đã xóa hàm kiểm tra auth" trong khi diff không hề có dòng xóa (`-`) nào liên quan đến hàm đó.

### Căn cứ B (Ground B) — Dòng code cụ thể trong Diff MÂU THUẪN TRỰC TIẾP với nhận xét
Nhận xét khẳng định một thiếu sót, nhưng văn bản thực tế trong diff chứng minh điều ngược lại một cách rõ ràng:
- *Ví dụ vi phạm:* Nhận xét: *"Chưa kiểm tra null cho biến `accountNo`"*, nhưng dòng `+42` trong diff ghi rõ: `if (!accountNo) throw new BadRequestException(...)`.
- *Ví dụ vi phạm:* Nhận xét: *"Giá trị bị hardcode"*, nhưng diff cho thấy giá trị được đọc từ `process.env.TIMEOUT` hoặc biến truyền vào.
- *Ví dụ vi phạm:* Nhận xét: *"Biến `counter` khai báo nhưng không dùng (dead code)"*, nhưng ngay 3 dòng dưới có `counter++`.

> ⚠️ **Quy tắc phán quyết:** Nếu bạn không thể chỉ ra được dòng code cụ thể chứng minh lập trình viên sai, hoặc nếu nhận xét đòi hỏi một chuỗi suy diễn dài mà không đọc được trực tiếp từ diff → **Bỏ qua nhận xét đó hoặc hạ mức độ xuống FYI.**

---

## 3. Đặc Quyền Bảo Vệ — Tuyệt Đối Không Tự Ý Lọc Bỏ (Protected Subjects Veto)

Dù ở bước lọc phản tư bạn cảm thấy nghi ngờ, nhận xét **VẪN PHẢI ĐƯỢC GIỮ LẠI VÀ BÁO CÁO** nếu chủ đề thuộc các danh mục trọng yếu sau:

1. **An toàn bộ nhớ & Lỗi Null Pointer:**
   - Null pointer dereference, mảng ngoài biên (index out of bounds), off-by-one, memory leak trong closures / event listeners không được giải phóng.
2. **Xử lý Bất đồng bộ & Tranh chấp Dữ liệu (Concurrency & Race Conditions):**
   - Lỗi thiếu khóa (mutex), rò rỉ goroutine / Promise không bao giờ giải phóng, race condition kiểm tra - rồi - làm (check-then-act) trên state chia sẻ.
3. **Tính toán Tài chính & Nghiệp vụ Chứng khoán:**
   - Dùng số dấu phẩy động (`float`, `number`) để tính toán tiền tệ, hoa hồng, lãi suất thay vì `Decimal` / `BigNumber`.
   - Vi phạm bước giá (tick size) hoặc biên độ trần/sàn theo quy chế HOSE/HNX/UPCOM.
4. **Bảo mật & Ranh giới Tin cậy (Security Vulnerabilities):**
   - Lỗ hổng SQL Injection, XSS (`dangerouslySetInnerHTML`), Bypass Authentication / Authorization tại các network endpoints, lộ lọt secrets/tokens.
5. **Phá vỡ Hợp đồng Giao tiếp (Breaking API / Behavioral Changes):**
   - Đổi kiểu dữ liệu của trường public trong API response mà không có versioning, xóa bỏ tham số bắt buộc cũ gây lỗi cho clients.

---

## 4. Bảng Kiểm Tra Phản Tư 5 Bước (Fact-Checking Execution Checklist)

Với mỗi finding thu thập được trong quá trình review, chạy qua 5 bước sau theo thứ tự:

- [ ] **Bước 1 (Kiểm tra Veto):** Finding có thuộc 5 danh mục Trọng yếu (Protected Subjects) ở trên không?  
  → **NẾU CÓ: GIỮ LẠI NGAY** và chuyển sang finding tiếp theo.
- [ ] **Bước 2 (Kiểm tra Giá trị Thật):** Finding có phải là nhận xét style/format nhưng mô tả ĐÚNG thực tế không?  
  → **NẾU ĐÚNG: Giữ lại dưới dạng `Nit:` (không chặn merge).**
- [ ] **Bước 3 (Kiểm tra Căn cứ A):** Đoạn mã bị phàn nàn có thực sự tồn tại trong diff không?  
  → **NẾU KHÔNG CÓ TRONG DIFF: LẬP TỨC LOẠI BỎ (Drop).**
- [ ] **Bước 4 (Kiểm tra Căn cứ B):** Có dòng code nào trong diff chứng minh nhận xét này bị sai/ảo giác không?  
  → **NẾU CÓ DÒNG PHỦ ĐỊNH: LẬP TỨC LOẠI BỎ (Drop).**
- [ ] **Bước 5 (Xác nhận):** Finding vượt qua toàn bộ các bước kiểm tra → **Đưa vào Báo cáo Đánh giá chính thức.**
