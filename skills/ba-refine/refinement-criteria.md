# Tiêu chí Đánh giá & Mài giũa

Sử dụng bảng tiêu chí này trong Giai đoạn 2 (Đánh giá & Hội tụ) để thử lửa (stress-test) các hướng ý tưởng. Không phải tiêu chí nào cũng áp dụng cho mọi ý tưởng — hãy dùng phán đoán xem khía cạnh nào quan trọng nhất cho bối cảnh cụ thể.

## Các Khía cạnh Đánh giá Cốt lõi

### 1. Giá trị Người dùng (User Value)

Khía cạnh quan trọng nhất. Nếu giá trị không rõ ràng, mọi thứ khác đều vô nghĩa.

**Thuốc giảm đau (Painkiller) vs. Vitamin:**
- **Thuốc giảm đau:** Giải quyết một vấn đề nhức nhối, thường xuyên. Người dùng sẽ chủ động tìm kiếm nó. Họ sẽ từ bỏ giải pháp hiện tại để chuyển sang xài nó. Dấu hiệu: người ta nói về vấn đề với nhiều cảm xúc, họ phải tự chế ra các cách làm thủ công (workarounds), họ sẵn sàng trả tiền cho một giải pháp.
- **Vitamin:** Có thì tốt (Nice to have). Làm cho thứ gì đó tốt hơn một chút xíu. Người dùng sẽ không tốn công chuyển đổi. Dấu hiệu: người ta gật gù lịch sự, khen "nghe hay đấy", rồi sau đó chả thay đổi hành vi mẹ gì.

**Các câu hỏi cần đặt ra:**
- Bạn có thể chỉ đích danh 3 người cụ thể đang gặp vấn đề này ngay lúc này không?
- Hiện tại họ đang làm gì để giải quyết nó? (Đối thủ cạnh tranh thực sự luôn luôn là cái cách làm thủ công hiện tại).
- Họ có chịu từ bỏ cách làm hiện tại không? Điều gì sẽ khiến họ chuyển đổi?
- Họ gặp vấn đề này với tần suất thế nào? (Vấn đề hàng ngày > vấn đề hàng tháng).
- Đây là bài toán dạng "pull" (người dùng đang kêu gào đòi hỏi) hay dạng "push" (bạn tự nghĩ là họ sẽ cần)?

**Cờ Đỏ (Red flags):**
- "Ai cũng có thể dùng cái này" — nếu không gọi tên được một tập user cụ thể, giá trị là không rõ ràng.
- "Nó giống cái X nhưng tốt hơn" — những cải tiến nhỏ giọt hiếm khi khiến người dùng chuyển đổi.
- Vấn đề là có thật nhưng rất hiếm khi xảy ra — cường độ cao nhưng tần suất thấp thì hiếm khi đáng để xây thành một sản phẩm.

### 2. Độ Khả thi (Feasibility)

Bạn có THỰC SỰ xây được cái này không? Không chỉ về mặt kỹ thuật, mà là trong thực tế.

**Khả thi về kỹ thuật (Technical feasibility):**
- Công nghệ lõi đã tồn tại và hoạt động ổn định chưa?
- Bài toán kỹ thuật khoai nhất là gì? Đó là một bài toán khó đã biết cách giải, hay là một bài toán mới toanh?
- Có bị phụ thuộc vào bên thứ 3, API, hay nguồn dữ liệu nào mà mình đéo kiểm soát được không?
- Tech stack tối thiểu cần có là gì? (Nếu câu trả lời là "cần rất nhiều thứ", đó là một dấu hiệu cảnh báo).

**Khả thi về nguồn lực (Resource feasibility):**
- Team tối thiểu / effort tối thiểu để ra được MVP là bao nhiêu?
- Có cần chuyên môn đặc thù nào mà team đang thiếu không?
- Có vướng mắc gì về quy định, pháp lý hay tuân thủ (compliance) không?

**Thời gian ra giá trị (Time-to-value):**
- Bao lâu thì có thể mang một cái gì đó ra cho người dùng dùng thử?
- Có phiên bản nào mang lại giá trị trong vài ngày/tuần thay vì vài tháng không?
- Đâu là con đường trọng yếu (critical path)? Việc gì bắt buộc phải xảy ra đầu tiên?

**Cờ Đỏ (Red flags):**
- "Chúng ta chỉ cần giải quyết xong [bài toán research cực khó] trước đã"
- Phụ thuộc vào quá nhiều thứ cần phải hoàn thành cùng một lúc
- MVP mà vẫn đòi hỏi làm mất vài tháng — khả năng cao là chưa đủ "tối thiểu" (minimal).

### 3. Sự Khác Biệt (Differentiation)

Cái đéo gì làm cho ý tưởng này thực sự khác bọt? Không phải tốt hơn — mà là *khác biệt*.

**Các câu hỏi cần đặt ra:**
- Nếu một user mô tả cái này cho bạn bè, họ sẽ nói gì? Lời mô tả đó nghe có hấp dẫn không?
- Đâu là MỘT thứ mà cái này làm được trong khi đéo có thằng nào khác làm được? (Nếu không kể ra được 1 thứ, đó là vấn đề).
- Sự khác biệt này có bền vững không? Đối thủ có copy được nó trong 1 tuần không?
- Sự khác biệt này có phải là thứ người dùng THỰC SỰ quan tâm, hay chỉ là thứ mấy ông builder thấy thú vị?

**Các cấp độ Khác biệt (từ mạnh nhất đến yếu nhất):**
1. **Năng lực mới toanh (New capability):** Làm được việc mà trước đây bất khả thi.
2. **Cải tiến x10 (10x improvement):** Tốt hơn vượt bậc ở một khía cạnh trọng yếu khiến hành vi người dùng phải thay đổi.
3. **Tệp khách hàng mới (New audience):** Mang một tính năng sẵn có đến cho những người trước giờ bị ngó lơ.
4. **Bối cảnh mới (New context):** Hoạt động được ở những tình huống mà các giải pháp hiện tại bó tay.
5. **UX Tốt hơn (Better UX):** Cùng tính năng, nhưng trải nghiệm đơn giản hơn đáng kể.
6. **Rẻ hơn (Cheaper):** Y hệt, nhưng giá thấp hơn (Cấp độ yếu nhất — rất dễ bị đối thủ đạp giá theo).

**Cờ Đỏ (Red flags):**
- Sự khác biệt chỉ nằm ở mặt công nghệ, đéo liên quan gì đến trải nghiệm người dùng.
- "Chúng ta nhanh hơn/rẻ hơn/đẹp hơn" mà đéo có lý do nền tảng tại sao lại làm được thế.
- Cái tính năng tạo nên sự khác biệt lại đéo phải là tính năng người dùng quan tâm nhất.

## Kiểm toán Giả định (Assumption Audit)

Với mỗi hướng ý tưởng, hãy liệt kê rõ ràng các giả định thành 3 nhóm:

### BẮT BUỘC Phải Đúng (Must Be True / Dealbreakers)
Những giả định mà nếu sai, ý tưởng sẽ chết giãy đành đạch. Bọn này cần được test TRƯỚC KHI code.

Ví dụ: "Người dùng sẽ chịu chia sẻ dữ liệu của họ cho chúng ta" — nếu họ đéo chịu, toàn bộ sản phẩm vô dụng.

### NÊN Đúng (Should Be True / Important)
Những giả định có ảnh hưởng lớn đến thành công nhưng đéo làm chết ý tưởng. Bạn có thể điều chỉnh cách tiếp cận nếu bọn này sai.

Ví dụ: "Người dùng thích tự dùng (self-serve) hơn là phải nói chuyện với nhân viên" — nếu sai, bạn đổi cách go-to-market, core product vẫn sống nhăn răng.

### CÓ THỂ Đúng (Might Be True / Nice to Have)
Giả định về các tính năng phụ hoặc tối ưu hóa. Đừng cắm đầu vào test bọn này cho đến khi cái lõi đã được chứng minh.

Ví dụ: "Người dùng sẽ muốn share kết quả cho đồng nghiệp" — đây là tính năng growth, đéo phải giá trị cốt lõi.

## Ma trận Ra quyết định (Decision Framework)

Khi phải chọn giữa nhiều hướng đi, hãy xếp hạng chúng lên ma trận này:

|                    | Khả thi Cao (High Feasibility) | Khả thi Thấp (Low Feasibility) |
|--------------------|---------------------------------|---------------------------------|
| **Giá trị Cao**    | Ưu tiên làm luôn (Do this first)| Đáng để đánh cược (Worth the risk)|
| **Giá trị Thấp**   | Chỉ làm nếu cực dễ (Trivial)    | BỎ ĐI (Don't do this)           |

Sau đó, dùng *Sự khác biệt (Differentiation)* làm tiêu chí phá vỡ thế hòa (tiebreaker) nếu có 2 option nằm chung một ô.

## Nguyên tắc Lên Tài liệu & Xác định Phạm vi (Documentation & Scoping Principles)

Khi chốt lại yêu cầu cuối cùng cho hướng đi đã chọn:

1. **Một User Story rõ ràng.** Tính năng phải phục vụ một user (role) cụ thể, nêu rõ mục tiêu và có giá trị kinh doanh đéo thể chối cãi. Đừng viết story gộp cho nhiều role không liên quan.
2. **Acceptance Criteria Test được.** BẮT BUỘC DÙNG định dạng BDD (Given/When/Then) để đảm bảo logic nghiệp vụ có thể verify được mà không áp đặt giải pháp kỹ thuật.
3. **Thành công Đo lường được.** Định nghĩa các Chỉ số Thành công (Success Metrics - Hiện tại vs Mục tiêu) chính xác và cách tracking chúng (Events/Dashboards). "Mọi người sẽ thích nó" đéo phải là một metric.
4. **Luồng User Flow đi trước.** Luôn vạch ra User Flow hoặc đính kèm thiết kế prototype trước khi đụng vào code. Phải hiểu rõ chuỗi hành động từng bước một.
5. **Ranh giới Kỹ thuật rạch ròi.** Dùng mục Technical Notes để làm nổi bật các ràng buộc, các API bị phụ thuộc, và kế hoạch rollout, giữ cho phần logic business luôn sạch sẽ.
