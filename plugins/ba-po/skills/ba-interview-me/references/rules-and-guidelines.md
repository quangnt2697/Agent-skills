# Nguyên tắc Phỏng vấn (ba-interview-me Rules)

## Khi nào cần sử dụng

Kích hoạt kỹ năng này khi:
- Yêu cầu bị thiếu ít nhất một trong các yếu tố: **ai** là người dùng, **tại sao** họ muốn nó, **thành công** trông như thế nào, hoặc **ràng buộc** chính là gì.
- Yêu cầu mang tính chung chung thay vì cụ thể ("xây dựng cho tôi X", "làm cho nó nhanh hơn") và bạn không thể giải nén ý nghĩa của nó mà không phải đoán.
- Bạn cảm thấy bị cám dỗ muốn bắt đầu làm ngay với những giả định (assumptions) mà bạn chưa hề xác nhận lại.
- Người dùng chưa nói rõ họ đang tối ưu hóa giá trị nào khi có hai giá trị hợp lý đang xung đột (sự đơn giản vs. tính linh hoạt, chi phí vs. tốc độ).
- Người dùng gọi trực tiếp: "interview me", "phỏng vấn tôi đi", "trước khi bắt đầu, chúng ta chắc chắn chứ?", "stress-test tư duy của tôi".

**Khi nào KHÔNG nên sử dụng:**
- Yêu cầu không có sự mơ hồ và độc lập ("đổi tên biến này", "sửa lỗi typo này").
- Người dùng đã yêu cầu rõ ràng là cần ưu tiên tốc độ thay vì việc xác minh.
- Các yêu cầu thuần túy về thông tin ("X hoạt động như thế nào?", "Đoạn code này làm gì?").
- Các thao tác cơ học (đổi tên, định dạng, di chuyển file).
- Bạn đã có độ tự tin ≥95%.

## Ràng buộc môi trường

Kỹ năng này cần một người dùng thực tế, có thể phản hồi trực tiếp. **Không gọi kỹ năng này trong các ngữ cảnh không tương tác** như CI pipelines, các chu trình chạy tự động (scheduled runs), `/loop`, hoặc autonomous-loop. Nếu bạn đang ở trong một môi trường như vậy và yêu cầu bị thiếu thông tin, hãy gắn cờ đó là một điểm tắc nghẽn (blocker) cần người dùng xác nhận thay vì tự đoán.

## Những lời Biện minh Thường gặp (Rationalizations)

| Lời biện minh | Thực tế |
|---|---|
| "Yêu cầu đã đủ rõ ràng rồi" | Nếu ngay lúc này bạn không thể viết ra kết quả mong muốn của người dùng trong MỘT câu duy nhất, thì yêu cầu đó KHÔNG rõ ràng. Hãy chạy Bước 1 trước khi quyết định. |
| "Hỏi quá nhiều câu hỏi sẽ làm lãng phí thời gian của họ" | Thời gian lãng phí cho 4–6 câu hỏi có mục tiêu là rất nhỏ. Thời gian lãng phí do xây dựng sai sản phẩm là khổng lồ, và người dùng chính là người phải gánh chịu chi phí đó. |
| "Tôi sẽ tự hình dung ra trong lúc code" | Chi phí thay đổi sau khi code đã tồn tại cao gấp 10 lần so với lúc này. Khám phá yêu cầu trong lúc triển khai chính là sự làm lại (rework). |
| "Họ nói 'tùy bạn', vì vậy tôi cứ tự quyết định thôi" | "Tùy bạn" là sự ủy quyền, không phải là một quyết định. Hãy hỏi lại với hai lựa chọn cụ thể như một câu hỏi trắc nghiệm. |
| "Tôi nên đưa cho họ một vài lựa chọn để họ chọn" | Cung cấp lựa chọn chỉ hiệu quả khi người dùng biết họ muốn gì và đang chọn giữa các sự đánh đổi (trade-offs). Lúc này họ vẫn chưa biết mình muốn gì. Đưa ra lựa chọn sẽ mở rộng phạm vi tìm kiếm; đặt câu hỏi sẽ thu hẹp nó lại. |
| "Nếu tôi đính kèm phỏng đoán của mình, tôi đang mớm lời cho họ" | Mớm lời (Leading) chính là mục đích. Phản ứng (Reacting) thì nhanh hơn là phải tạo ra (Generating) từ đầu. Rủi ro là sự xu nịnh, chứ không phải là việc mớm lời; hãy giảm thiểu nó bằng cách thể hiện rõ sự sẵn sàng sai. |
| "Chúng ta đã nói chuyện đủ rồi, tôi hiểu rồi" | Hãy thử test xem: bạn có thể dự đoán phản ứng của họ với 3 câu hỏi tiếp theo không? Nếu không, bạn vẫn chưa hiểu đâu. |
| "Người dùng nói yes, chúng ta xong rồi" | Nếu chữ "yes" đó đi sau một câu tóm tắt mơ hồ hoặc một câu "nghe có vẻ ổn" mở, thì chữ "yes" đó là sáo rỗng. Hãy tóm tắt lại một cách cụ thể và xác nhận lại. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Đặt từ ba câu hỏi trở lên trong một tin nhắn: đó là gửi theo lô (batching), không phải là phỏng vấn.
- Đặt câu hỏi mà không kèm theo giả thuyết của bạn: đó là khảo sát (surveying), không phải là cam kết.
- Chấp nhận câu "bạn nghĩ sao thì cứ làm vậy" như một câu trả lời chốt cuối cùng.
- Tạo ra một spec, plan, hoặc danh sách task trước khi người dùng xác nhận rõ ràng bản tóm tắt của bạn.
- Những câu hỏi được đóng khung dưới dạng "cách tiếp cận tiêu chuẩn/tốt nhất là gì?" thay vì "bạn thực sự muốn gì?".
- Người dùng đưa ra một câu trả lời mang tính phô diễn sự tinh vi ("có thể mở rộng", "sạch", "hiện đại") và bạn chấp nhận nó mà không thăm dò xem liệu đó có phải là điều họ thực sự muốn không.
- Quá ba vòng phỏng vấn mà độ tự tin của bạn không tăng lên rõ rệt: bạn đang hỏi sai câu hỏi, hãy lùi lại và đóng khung (reframe) lại vấn đề.
- Một con số tự tin dưới ~70% mà không kèm theo lý do: người dùng không thể giúp bạn thu hẹp khoảng cách nếu họ không biết bạn đang thiếu gì.
- Lưu tài liệu ý định (intent doc) trước khi người dùng xác nhận (bản thân tài liệu ngụ ý một chữ "yes" mà người dùng chưa hề đưa ra).
- Bỏ qua dòng "Nằm ngoài phạm vi (Out of scope)" trong bản tóm tắt (sự bất đồng ngầm về các mục tiêu KHÔNG làm chính là một nửa nguyên nhân của sự sai lệch dự án).

## Xác minh (Verification)

Sau khi áp dụng kỹ năng interview-me:
- [ ] Một giả thuyết rõ ràng với một con số tự tin đã được đưa ra ở lượt trò chuyện đầu tiên.
- [ ] Mỗi con số tự tin dưới ~70% đều được kèm theo một lý do dài một dòng (những gì còn chưa được giải quyết hoặc bị thiếu).
- [ ] Các câu hỏi được hỏi từng câu một, mỗi câu đều kèm theo phỏng đoán của agent.
- [ ] Ít nhất một lần thăm dò "bạn thực sự muốn gì nếu không cần giải trình với ai?" đã được sử dụng khi người dùng đưa ra câu trả lời theo xu hướng đám đông hoặc phô diễn thuật ngữ.
- [ ] Một bản tóm tắt cụ thể (Kết quả / Người dùng / Tại sao lúc này / Thành công / Ràng buộc / Nằm ngoài phạm vi) đã được viết lại cho người dùng.
- [ ] Người dùng đã xác nhận bản tóm tắt bằng một chữ "yes" rõ ràng (không phải là "tùy bạn," không phải là "nghe có vẻ ổn," không phải là im lặng).
- [ ] Tại thời điểm dừng, agent có thể dự đoán được các phản ứng cho ba câu hỏi tiếp theo mà nó định hỏi.
- [ ] Bất kỳ sự bàn giao nào cho kỹ năng theo sau (`idea-refine`, `tech-spec`) đều được định hướng dựa trên ý định đã được xác nhận (confirmed intent), chứ không phải là yêu cầu thiếu thông tin ban đầu.

---
