# Quy trình Phỏng vấn (ba-interview-me Workflow)

## Quy trình thực hiện

### Bước 1: Đưa ra Giả thuyết (Hypothesis), kèm theo điểm tự tin

Trước khi hỏi bất cứ điều gì, hãy viết ra phán đoán tốt nhất hiện tại của bạn về những gì người dùng muốn trong **một câu duy nhất**, cộng với một con số tự tự tin trung thực (0–100%):

```
GIẢ THUYẾT: Bạn muốn một cách để trả lời "tiến độ của chúng ta đến đâu rồi?" trong buổi standup, và "dashboard" là quy ước xuất hiện trong đầu bạn.
ĐỘ TỰ TIN: ~30% — thiếu: dành cho ai, "số liệu" có ý nghĩa gì trong ngữ cảnh này, và thành công trông như thế nào.
```

Con số này ép bạn phải trung thực. Nếu bạn ghi một con số cao nhưng không thể thực sự dự đoán được phản ứng của người dùng với ba câu hỏi tiếp theo bạn định hỏi, con số đó là sai. Hãy bắt đầu ở mức tự tin mà bạn có thể bảo vệ được.

Khi độ tự tin dưới ~70%, hãy thêm một lý do ngắn gọn trên cùng dòng đó — những gì vẫn chưa được giải quyết hoặc bị thiếu. Điều này cho người dùng biết chính xác cuộc phỏng vấn cần làm sáng tỏ điều gì, và ngăn con số này trở thành một tín hiệu sáo rỗng.

### Bước 2: Hỏi từng câu một, mỗi câu đi kèm một phỏng đoán

Định dạng:

```
CÂU HỎI: <một câu hỏi tập trung>
PHỎNG ĐOÁN: <giả thuyết của bạn cho câu trả lời, kèm theo lý do tạo ra giả thuyết đó>
```

Đợi người dùng phản hồi trước khi hỏi câu tiếp theo.

**Tại sao phải hỏi từng câu một, thay vì hỏi cả chùm:**
- Người dùng không thể phản ứng với các giả thuyết của bạn nếu bạn vùi lấp chúng trong một danh sách.
- Hỏi một chùm sẽ khuyến khích người dùng đọc lướt và trả lời hời hợt.
- Câu hỏi thứ ba thường phụ thuộc vào câu trả lời cho câu hỏi đầu tiên; hỏi tất cả cùng lúc sẽ khóa chặt cuộc hội thoại vào một khuôn khổ sai lầm.
- Năng lượng để suy nghĩ thấu đáo của người dùng là có hạn; hãy tiêu tốn nó cho từng câu hỏi một.

**Tại sao phải đính kèm phỏng đoán:**
- Người dùng phản ứng nhanh hơn với một phỏng đoán sai so với việc phải tự nghĩ ra một câu trả lời từ đầu.
- Nó buộc bạn phải cam kết với một giả thuyết mà bạn hoàn toàn có thể sai, điều này giữ cho bạn tính trung thực.
- Nó phơi bày những giả định của *bạn*, đó cũng là mục đích cốt lõi của cuộc phỏng vấn này.

### Bước 3: Lắng nghe sự khác biệt giữa "Muốn" vs. "Nên muốn"

Những câu trả lời nguy hiểm nhất là những câu mà người dùng nói những gì nghe có vẻ *như một câu trả lời chu đáo* thay vì những gì họ thực sự muốn. Cảnh giác với:
- Những câu trả lời sao chép theo tiêu chuẩn ngành ("Tôi muốn nó có thể mở rộng", "kiến trúc sạch") mà không có chi tiết cụ thể.
- Những câu trả lời dựa dẫm vào lối mòn ("cách mà hầu hết các ứng dụng đều làm", "cách tiếp cận tiêu chuẩn").
- Những cụm từ như "Chắc tôi nên…", "Tôi nghĩ tôi phải làm…", "thực hành kỹ thuật tốt khuyên rằng…".
- Dùng từ ngữ đao to búa lớn như một mục tiêu.

Khi bạn nghe thấy những điều này, câu hỏi cần đặt ra là:
> *"Nếu bạn không cần phải giải trình điều này với bất kỳ ai, thì thực sự bạn muốn gì?"*

### Bước 4: Viết lại ý định bằng ngôn từ của chính người dùng

Khi độ tự tin của bạn đã cao, hãy viết lại những gì bạn nghĩ người dùng muốn lúc này. Giữ cho nó ngắn gọn (5–8 dòng), sử dụng ngôn ngữ của họ nếu có thể, và cấu trúc nó sao cho người dùng có thể xác nhận hoặc sửa chữa từng dòng một:

```
Dưới đây là những gì tôi nghĩ bạn thực sự muốn lúc này:

- Kết quả:        <một dòng>
- Người dùng:     <một dòng — ai được hưởng lợi>
- Tại sao lúc này:<một dòng — điều gì đã thay đổi>
- Thành công:     <một dòng — làm sao chúng ta biết nó hiệu quả>
- Ràng buộc:      <một dòng — giới hạn bắt buộc>
- Nằm ngoài phạm vi:<một dòng — những gì chúng ta xác định rõ là SẼ KHÔNG làm>

Đúng / Sai / Cần tinh chỉnh thêm?
```

Bao gồm dòng "Nằm ngoài phạm vi" (Out of scope) là BẮT BUỘC. Một nửa sự không đồng điệu (misalignment) xuất phát từ sự bất đồng ngầm về những thứ *không* được xây dựng.

### Bước 5: Xác nhận — Một chữ "Có" rõ ràng, không phải là "tùy bạn"

Chốt chặn cuối cùng là một chữ "Có" (Yes) rõ ràng. Dưới đây là những câu **KHÔNG** phải là đồng ý:
- "Bạn nghĩ sao thì cứ làm vậy." → Người dùng đang ủy quyền. Hỏi lại với hai lựa chọn cụ thể được đưa ra như một sự lựa chọn.
- "Nghe có vẻ ổn." → Mơ hồ. Hỏi lại: "Có gì bạn muốn tinh chỉnh thêm không?" Im lặng không phải là xác nhận.
- "Chắc chắn rồi, bắt đầu thôi." → Thường là một lối thoát lịch sự. Áp dụng câu hỏi nối tiếp tương tự.
- Im lặng sau đó nói "ok bắt đầu thôi." → Người dùng đã bỏ cuộc. Hãy dừng lại và hỏi xem liệu bạn có bỏ lỡ điều gì không.

Nếu họ sửa bạn, hãy gộp sự sửa chữa đó vào và viết lại tóm tắt. Lặp lại cho đến khi bạn nhận được chữ đồng ý rõ ràng.

## Điểm Dừng ở mức Tự tin 95%

Bạn hoàn thành khi bạn có thể trả lời "Có" cho câu hỏi này:
> *Tôi có thể dự đoán được phản ứng của người dùng đối với ba câu hỏi tiếp theo mà tôi định hỏi không?*

Nếu có, các bạn đã có sự hiểu biết chung. Hãy dừng phỏng vấn và đưa ra bản tóm tắt (restate). Nếu không, bạn chưa hoàn thành; hãy hỏi câu tiếp theo.

## Đầu ra (Output)

Đầu ra của kỹ năng này là một **tuyên bố ý định đã được xác nhận (confirmed statement of intent)**: bản tóm tắt từ Bước 4, với một sự đồng ý rõ ràng từ Bước 5. Đó là sản phẩm bàn giao. 

Nếu người dùng muốn lưu trữ ý định này, hãy đề xuất lưu nó vào `workspace/issues/{issueKey}/spec/intent-[topic].md`. Chỉ lưu nếu họ xác nhận.

## Ví dụ

**Khi KHÔNG dùng `interview-me`:**
```
User:  xây dựng cho tôi một dashboard cho các số liệu
Agent: <bắt đầu đề xuất các thư viện biểu đồ và bố cục>
```
Agent đã giả định: nó dành cho ai, số liệu gì, "cho đội ngũ của chúng ta" nghĩa là gì, thành công trông như thế nào. 

**Khi DÙNG `interview-me`:**
```
User: xây dựng cho tôi một dashboard cho các số liệu của chúng ta

Agent:
GIẢ THUYẾT: Bạn muốn một cách để trả lời "tiến độ của chúng ta đến đâu rồi?" trong buổi standup, và "dashboard" xuất hiện trong đầu bạn vì đó là câu trả lời phổ biến.
ĐỘ TỰ TIN: ~30% — thiếu: dành cho ai, "số liệu" là gì, và thành công trông như thế nào

CÂU HỎI: Khi bạn nói "tiến độ của chúng ta đến đâu rồi?", ai là người đang hỏi — một mình bạn, đội ngũ kỹ thuật trong standup, hay cấp trên (ví dụ: sếp của bạn, ban giám đốc)?
PHỎNG ĐOÁN: đội ngũ kỹ thuật trong standup, bởi vì "chúng ta" thường ám chỉ phạm vi đó và standup là nơi câu hỏi này thường được đặt ra. Nếu nó dành cho cấp trên, các số liệu và cách tiếp cận sẽ thay đổi rất nhiều.

User: Thực ra là cho tôi. Tôi liên tục bị mất dấu xem thử nghiệm nào đang chạy và tín hiệu ban đầu của chúng trông như thế nào.

Agent:
Phân tích cập nhật: hoàn toàn không phải là một dashboard cho team. Nó là một công cụ theo dõi thử nghiệm cá nhân. Độ tự tin: ~60% — vẫn thiếu: "tín hiệu ban đầu" nghĩa là gì và hoàn thành thì trông sẽ như thế nào.

CÂU HỎI: Vấn đề hiện tại là bạn không biết thử nghiệm nào đang tồn tại, hay là bạn không thể xem kết quả của chúng ở cùng một nơi?
PHỎNG ĐOÁN: là cái thứ hai. Bạn có một danh sách các thử nghiệm ở đâu đó, nhưng kết quả của chúng lại nằm ở năm công cụ khác nhau, và bạn chán việc phải đối chiếu chúng bằng tay.

User: Thực ra là cái đầu tiên. Tôi thật sự không có danh sách nào cả. Chúng nằm rải rác ở các tài liệu khác nhau.

Agent: <tiếp tục phỏng vấn>
```

---
