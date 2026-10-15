---
name: dev-doubt-driven-development
description: Đưa mọi quyết định vào đánh giá đối kháng. Kiểm chứng các giả định rủi ro cao ngay lập tức.
trigger: Sử dụng khi độ chính xác quan trọng hơn tốc độ, khi làm việc với code lạ, khi mức độ rủi ro cao (production, logic nhạy cảm về bảo mật, các thao tác không thể đảo ngược), hoặc bất cứ khi nào một kết quả tuy tự tin nhưng thà kiểm chứng ngay bây giờ còn rẻ hơn là debug sau này.
---

# Phát triển Hướng Hoài nghi (Doubt-Driven Development)

## Tổng quan

Một câu trả lời tự tin không hẳn là một câu trả lời đúng. Những phiên làm việc dài tích tụ bối cảnh, âm thầm biến các giả định thành "sự thật" mà không ai để ý. Phát triển hướng hoài nghi là kỷ luật về việc tạo ra một người đánh giá có bối cảnh mới (fresh-context reviewer) — với khuynh hướng **bác bỏ**, chứ không phải phê duyệt — trước khi bất kỳ kết quả phức tạp nào được chấp nhận.

Đây không phải là `/cr-review`. `/cr-review` là phán quyết cuối cùng về một tạo tác đã hoàn thành. Đây là một tư thế trong quá trình làm việc (in-flight posture): các quyết định phức tạp sẽ bị chất vấn chéo trong khi việc điều chỉnh hướng đi vẫn còn rẻ.

## Khi nào sử dụng

Một quyết định được coi là **không hề đơn giản (non-trivial)** khi có ít nhất một trong các điều kiện sau:

- Nó đưa ra hoặc sửa đổi logic rẽ nhánh (branching logic)
- Nó vượt qua ranh giới của một module hoặc service
- Nó khẳng định một thuộc tính mà type system hoặc trình biên dịch không thể kiểm chứng (thread safety, tính lũy đẳng (idempotence), thứ tự, bất biến (invariants))
- Tính đúng đắn của nó phụ thuộc vào bối cảnh mà người đọc trong tương lai không thể thấy
- Phạm vi ảnh hưởng (blast radius) của nó không thể đảo ngược (triển khai production, di chuyển dữ liệu, thay đổi API công khai)

Áp dụng kỹ năng này khi:

- Chuẩn bị đưa ra một quyết định kiến trúc trong tình trạng không chắc chắn
- Chuẩn bị commit đoạn code phức tạp
- Chuẩn bị tuyên bố một sự thật không hiển nhiên ("cái này an toàn", "cái này mở rộng được", "cái này khớp với spec")
- Làm việc trong một đoạn code bạn không hiểu rõ hoàn toàn

**Khi KHÔNG sử dụng:**

- Các thao tác cơ học (đổi tên, format, di chuyển file)
- Làm theo hướng dẫn rõ ràng, không mơ hồ của người dùng
- Đọc hoặc tóm tắt code hiện có
- Sửa đổi một dòng với tính đúng đắn quá rõ ràng
- Các thao tác công cụ thuần túy (chạy test, liệt kê file)
- Người dùng đã yêu cầu rõ ràng là ưu tiên tốc độ hơn việc xác minh

Nếu bạn nghi ngờ từng lần gõ phím, bạn sẽ không thể làm ra được gì. Kỹ năng này chỉ áp dụng cho các quyết định không hề đơn giản như định nghĩa ở trên.

## Các Ràng buộc Tải (Loading Constraints)

Kỹ năng này được thiết kế cho **agent điều phối ở phiên làm việc chính (main-session orchestrator)**, nơi Bước 3 (HOÀI NGHI, chi tiết bên dưới) có thể sinh ra một người đánh giá fresh-context.

- **KHÔNG thêm kỹ năng này vào `skills:` frontmatter của bất kỳ persona nào.** Một persona tuân theo Bước 3 sẽ lại sinh ra một persona khác — đây là anti-pattern điều phối bị nghiêm cấm rõ ràng trong `../../../../../docs/architecture/orchestration-patterns.md` ("persona không được gọi persona khác").
- **Nếu bạn thấy mình đang áp dụng kỹ năng này từ bên trong ngữ cảnh subagent** (nơi Claude Code chặn việc sinh subagent lồng nhau): cách tốt nhất là báo cáo với người dùng rằng "hoài nghi" không thể chạy lồng nhau và để phiên chính xử lý. Chỉ trong trường hợp vạn bất đắc dĩ, có một biện pháp tự vấn xuống cấp (degraded self-questioning fallback) — viết lại ARTIFACT + CONTRACT dưới dạng một self-prompt mới với một vách ngăn tinh thần cứng ngắc khỏi những lý luận trước đó của bạn, và đi theo Bước 1–5. Đây **không phải là fresh-context review** (bạn vẫn mang theo bối cảnh cũ của mình), vì vậy hãy đánh dấu kết quả là "bị xuống cấp" (degraded) và ưu tiên leo thang (escalation) bất cứ khi nào có thể tiếp cận được người dùng.

## Quy trình

Sao chép checklist này khi áp dụng kỹ năng:

```
Vòng lặp Hoài nghi (Doubt cycle):
- [ ] Bước 1: KHẲNG ĐỊNH (CLAIM) — viết claim + lý do tại sao nó quan trọng
- [ ] Bước 2: TRÍCH XUẤT (EXTRACT) — cô lập artifact + contract, loại bỏ các lý luận
- [ ] Bước 3: HOÀI NGHI (DOUBT) — gọi fresh-context reviewer với prompt đối kháng
- [ ] Bước 4: ĐỐI CHIẾU (RECONCILE) — phân loại từng phát hiện đối chiếu với đoạn text của artifact
- [ ] Bước 5: DỪNG (STOP) — thỏa điều kiện dừng (chỉ toàn lỗi vụn vặt, đã qua 3 vòng lặp, hoặc user bỏ qua)
```

### Bước 1: KHẲNG ĐỊNH (CLAIM) — Làm rõ những gì sẽ được giữ lại

Chỉ định tên của quyết định trong hai hoặc ba dòng:

```
KHẲNG ĐỊNH: "Lớp caching mới là thread-safe dưới tải trọng thiên về đọc (read-heavy) như mô tả trong spec."
TẠI SAO QUAN TRỌNG: một race condition ở đây sẽ làm hỏng dữ liệu người dùng và rất khó phát hiện trong QA.
```

Nếu bạn không thể viết claim gọn gàng như vậy, nghĩa là bạn mới chỉ có cảm giác (vibe), chứ chưa có một quyết định rõ ràng. Hãy bộc lộ nó ra trước khi mổ xẻ nó.

### Bước 2: TRÍCH XUẤT (EXTRACT) — Đơn vị nhỏ nhất có thể review được

Một người đánh giá bối cảnh mới cần **tạo tác (artifact)** và **hợp đồng (contract)**, chứ không cần biết quá trình đi đến đó.

- Code: diff hoặc một hàm — không phải toàn bộ file
- Quyết định: đề xuất gói gọn trong 3–5 câu cộng với những ràng buộc nó phải thỏa mãn
- Khẳng định: cái claim cùng với các bằng chứng được cho là ủng hộ nó (giữ tách biệt khỏi phần CLAIM ở Bước 1, vốn là giả thuyết của người điều phối đang bị săm soi)

Loại bỏ mọi lý luận của bạn. Nếu bạn đưa cho reviewer các kết luận của bạn, bạn sẽ chỉ nhận lại được sự xác nhận cho các kết luận đó. Đơn vị này phải đủ nhỏ để reviewer có thể ghi nhớ trong một lần đọc — nếu nó là một PR dài 500 dòng, hãy chia nhỏ nó ra trước.

### Bước 3: HOÀI NGHI (DOUBT) — Gọi người đánh giá bối cảnh mới (fresh-context reviewer)

Prompt của reviewer **phải có tính đối kháng**. Cách đặt vấn đề (framing) sẽ quyết định câu trả lời.

```
Đánh giá đối kháng. Hãy tìm xem có gì sai trong artifact này.
Giả định tác giả đang quá tự tin. Hãy tìm kiếm:
- Các giả định không được nói ra (Unstated assumptions)
- Các trường hợp ngoại lệ (Edge cases) chưa được xử lý
- Tight coupling bị giấu kín hoặc state dùng chung
- Những cách mà hợp đồng (contract) có thể bị vi phạm
- Những quy ước hiện có có thể bị phá vỡ
- Các cách thất bại (Failure modes) khi nhận input không mong muốn

KHÔNG ĐƯỢC khen ngợi hay xác nhận. KHÔNG ĐƯỢC tóm tắt. Hãy tìm ra vấn đề,
hoặc nói rõ ràng rằng bạn không thể tìm ra vấn đề nào sau khi đã kiểm tra kỹ.

ARTIFACT: <paste artifact>
CONTRACT: <paste contract>
```

**CHỈ truyền vào ARTIFACT + CONTRACT. KHÔNG truyền vào CLAIM.** Việc đưa cho reviewer kết luận của bạn sẽ khiến nó có xu hướng đồng ý. Reviewer phải độc lập xác định xem artifact có thỏa mãn hợp đồng hay không.

Trong Claude Code, các reviewer theo vai trò (role-based) trong `agents/` bắt đầu với context bị cô lập theo thiết kế và có thể dùng được ở đây — xem `agents/` để biết danh sách và cách phân chia theo lĩnh vực.

**Prompt đối kháng ở trên được ưu tiên (takes precedence) hơn khuôn mẫu trả lời mặc định của persona.** Những persona như `code-reviewer` được viết để đưa ra các phán quyết cân bằng khen chê; nhưng doubt-driven chỉ cần đầu ra là "vấn đề". Paste chính xác prompt đối kháng vào phần gọi agent để nó ghi đè lên mặc định của persona. Nếu hình dạng câu trả lời của persona không thể ghi đè một cách sạch sẽ, hãy dùng fallback là một subagent chung chung (generic subagent) cùng với prompt đối kháng này.

#### Nâng cấp kiểm tra chéo mô hình (Cross-model escalation)

Sau lượt review single-model, trước khi ĐỐI CHIẾU: **phiên tương tác luôn phải hỏi người dùng** có muốn ý kiến thứ hai từ cross-model (Gemini CLI, Codex CLI, review thủ công, hoặc skip) — không bao giờ âm thầm bỏ qua. **Phi tương tác (CI, `/loop`): bỏ qua và thông báo; không bao giờ gọi external CLI khi chưa được người dùng cho phép.** Chỉ truyền ARTIFACT + CONTRACT, dùng stdin + sandbox read-only.

Quy trình đầy đủ (kiểm tra CLI, shell escaping, ví dụ lệnh, xử lý lỗi/skip): xem [references/cross-model-escalation.md](references/cross-model-escalation.md).

### Bước 4: ĐỐI CHIẾU (RECONCILE) — Kết hợp các phát hiện vào

Output của reviewer là dữ liệu, không phải phán quyết. **Bạn vẫn là người điều phối (orchestrator).** Đọc lại đoạn văn bản của artifact đối chiếu với từng phát hiện trước khi phân loại — việc nhắm mắt đồng ý (rubber-stamping) với reviewer cũng là một kiểu thất bại giống y như việc phớt lờ nó.

Đối với mỗi phát hiện, hãy phân loại theo **thứ tự ưu tiên** sau đây (loại nào khớp đầu tiên thì tính theo loại đó):

1. **Hiểu sai hợp đồng (Contract misread)** — reviewer cảnh báo điều gì đó vì CONTRACT bạn cung cấp chưa rõ ràng hoặc không đầy đủ. Sửa contract trước, rồi phân loại lại ở vòng lặp tiếp theo.
2. **Hợp lệ + Có thể hành động (Valid + actionable)** — vấn đề có thật và cần phải thay đổi artifact. Thay đổi nó, và lặp lại (re-loop).
3. **Đánh đổi hợp lý (Valid trade-off)** — vấn đề là thật nhưng chi phí sửa chữa vượt quá chi phí chấp nhận. Tài liệu hóa sự đánh đổi này một cách rõ ràng để người dùng thấy được.
4. **Nhiễu (Noise)** — reviewer cảnh báo điều gì đó mà thực chất là đúng dưới bối cảnh (context) mà reviewer không được cung cấp. Ghi chú lại, tiếp tục, và tự hỏi: liệu thêm context đó vào hợp đồng thì có ngăn được cảnh báo sai không?

Một reviewer fresh-context có thể bị sai vì nó thiếu context. Đừng vội chiều theo ý nó chỉ vì nó "mới".

### Bước 5: DỪNG (STOP) — Vòng lặp có giới hạn, không phải đệ quy

Dừng lại khi:

- Lượt lặp tiếp theo chỉ trả về những lỗi lặt vặt hoặc đã được xem xét, **hoặc**
- Hoàn thành đủ 3 chu kỳ (hãy leo thang báo cáo cho người dùng, đừng hì hục cày chu kỳ 4 một mình), **hoặc**
- Người dùng nói rõ ràng "duyệt đi" (ship it)

Nếu sau 3 chu kỳ mà reviewer vẫn đưa ra các vấn đề nghiêm trọng, thì rất có thể artifact chưa sẵn sàng. Hãy nói điều này cho người dùng — ba chu kỳ không thể giải quyết là thông tin về chất lượng của artifact, chứ không phải là lý do để tiếp tục lặp lại mù quáng.

Nếu 3 chu kỳ là "hiển nhiên không đủ" vì artifact quá lớn: nghĩa là artifact đó quá lớn — hãy quay lại Bước 2 và chia nhỏ (decompose) nó ra. Đừng gỡ bỏ giới hạn số vòng lặp.

## Các Biện hộ Thường gặp

| Biện hộ                                                             | Thực tế                                                                                                                                                                                                                                                                                                               |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| "Tôi tự tin rồi, bỏ qua bước hoài nghi đi"                          | Sự tự tin hiếm khi đồng nghĩa với sự chính xác đối với các vấn đề mới lạ. Những lúc bạn chắc chắn nhất lại là lúc có nhiều điểm mù nhất.                                                                                                                                                                              |
| "Sinh ra reviewer tốn tài nguyên quá"                               | Việc gỡ lỗi do commit sai trên production còn tốn kém hơn. Bài kiểm tra này có giới hạn vòng lặp; nhưng con bug thì không giới hạn tác hại.                                                                                                                                                                           |
| "Reviewer sẽ bới lông tìm vết"                                      | Chỉ khi prompt không được giới hạn. Hãy giới hạn prompt vào "các vấn đề sẽ làm artifact thất bại dưới hợp đồng (contract) này".                                                                                                                                                                                       |
| "Tôi sẽ dùng hoài nghi ở cuối cùng bằng lệnh `/cr-review`"             | `/cr-review` là cánh cửa (gate) cuối cùng. Phát triển hướng hoài nghi giúp phát hiện việc đi sai hướng từ rất sớm khi sửa sai còn rẻ. Tới lúc tạo PR thì đã quá muộn.                                                                                                                                                    |
| "Nếu bước nào tôi cũng hoài nghi thì chẳng bao giờ ship được"       | Kỹ năng này chỉ áp dụng cho quyết định không hề đơn giản, không áp dụng cho mọi lần gõ phím. Đọc lại "Khi KHÔNG sử dụng".                                                                                                                                                                                             |
| "Hai ý kiến thì luôn tốt hơn một"                                   | Không đúng khi ý kiến thứ hai ít bối cảnh hơn và chỉ gây nhiễu. Hãy đối chiếu, đừng phục tùng.                                                                                                                                                                                                                        |
| "Reviewer không đồng ý nên tôi sai rồi"                             | Reviewer thiếu bối cảnh của bạn — sự không đồng ý là luồng thông tin, không phải phán quyết. Hãy đọc lại artifact, phân loại, rồi mới quyết định.                                                                                                                                                                     |
| "Cross-model (nhiều mô hình) thì luôn tốt hơn"                      | Cross-model giúp bắt được điểm mù mà một mô hình duy nhất sẽ tự che lấp, nhưng nó làm tăng chi phí và sự rủi ro công cụ hỏng. Hãy đề nghị nó mỗi khi lặp hoài nghi tương tác — người dùng quyết định artifact có xứng đáng hay không. Nhiệm vụ của agent là cung cấp sự lựa chọn, không phải đóng vai người gác cổng. |
| "Người dùng đã nói yes 1 lần, nên tôi có thể tiếp tục gọi lệnh CLI" | Mỗi lần gọi lệnh là một lần được ủy quyền riêng biệt. Artifact, prompt, và flags thay đổi giữa các lần gọi — phải xác nhận lại chính xác lệnh với người dùng trước mọi lần chạy.                                                                                                                                      |

## Dấu hiệu Cảnh báo (Red Flags)

- Khởi tạo một fresh-context reviewer chỉ cho việc thay đổi định dạng hoặc đổi tên biến một dòng
- Coi output của reviewer là tiếng nói có thẩm quyền mà không đọc lại đoạn code/artifact gốc
- Lặp lại quá 3 chu kỳ mà không báo cáo leo thang cho người dùng
- Nhắc reviewer bằng prompt "thế này có tốt không?" thay vì "hãy tìm ra vấn đề"
- Bỏ qua quá trình hoài nghi dưới áp lực thời gian đối với một quyết định rủi ro cao
- Khởi tạo lại fresh-context với một artifact không hề thay đổi (bạn sẽ nhận lại cùng các lỗi; bạn chỉ đang câu giờ)
- **Kịch kịch tính (Doubt theater) (dấu hiệu có thể kiểm chứng)**: qua 2 vòng lặp trở lên mà reviewer tìm thấy vấn đề quan trọng, nhưng KHÔNG CÓ vấn đề nào được phân loại là "có thể hành động" (actionable). Bạn đang chỉ xác nhận chứ không phải đang hoài nghi. Hãy dừng lại và leo thang (escalate).
- Chỉ hoài nghi sau khi đã commit — cái đó gọi là `/cr-review`, không phải doubt-driven development
- Mã cứng (hardcode) một câu lệnh external CLI mà không xác nhận với người dùng xem công cụ đó có tồn tại, đã được cài đặt, và có chấp nhận cú pháp đó không
- **Âm thầm bỏ qua cross-model trong vòng lặp hoài nghi tương tác.** Kể cả khi bạn không khuyến nghị nó, thì tùy chọn vẫn phải được hiển thị. Bỏ qua (skip) thì được; âm thầm bỏ qua thì không.
- Âm thầm fallback khi một external CLI bị lỗi hoặc không có sẵn — hãy hiển thị lỗi đó và để người dùng chuyển hướng
- Cắt bỏ phần "contract" (hợp đồng) khỏi đầu vào của reviewer
- Gửi phần CLAIM (khẳng định) cho reviewer (dẫn tới việc reviewer có thiên kiến đồng ý với bạn)

## Tương tác với Các Kỹ năng khác

- **`qa-code-review` / `/cr-review`**: bổ sung cho nhau. `/cr-review` là phán quyết cuối cùng của PR; doubt-driven là quá trình kiểm tra trong lúc đang làm (in-flight) cho từng quyết định. Hãy dùng cả hai.
- **`source-driven-development`**: SDD kiểm chứng *các sự kiện về framework* dựa trên tài liệu chính thức. Doubt-driven kiểm chứng *suy luận của bạn về artifact*. SDD kiểm tra API có tồn tại không; doubt-driven kiểm tra xem bạn dùng nó có đúng hợp đồng không.
- **`dev-test-driven-development`**: Bước RED của TDD chính là sự hoài nghi được cụ thể hóa — một bài test fail chính là nỗ lực bác bỏ (disproof attempt). Khi áp dụng TDD, chính bài test fail đó *là* bước hoài nghi (doubt step) cho những lời khẳng định về hành vi (behavioral claims).
- **`dev-debugging`**: khi reviewer phát hiện ra một dạng lỗi có thật, chuyển sang kỹ năng gỡ lỗi để khoanh vùng và sửa.
- **Luật điều phối (Repo orchestration rules)** (`../../../../../docs/architecture/orchestration-patterns.md`): kỹ năng này hoạt động từ session chính. Việc một persona gọi một persona khác là anti-pattern B — xem mục Ràng buộc Tải ở trên.

## Xác minh

Sau khi áp dụng phát triển hướng hoài nghi (doubt-driven development):

- [ ] Mọi quyết định không hề đơn giản (như định nghĩa ở trên) đã được đặt tên rõ ràng thành một CLAIM trước khi được chấp nhận
- [ ] Có ít nhất một đợt fresh-context review cho từng non-trivial artifact (bài test fail tạo ra bởi bước RED của TDD có thể thỏa mãn điều kiện này cho các khẳng định về hành vi, xem Tương tác với Các Kỹ năng khác)
- [ ] Reviewer chỉ nhận được ARTIFACT + CONTRACT — KHÔNG nhận được CLAIM, KHÔNG nhận được lý luận của bạn
- [ ] Prompt của reviewer có tính đối kháng ("hãy tìm ra vấn đề"), không mang tính kiểm chứng ("thế này tốt không")
- [ ] Các phát hiện được phân loại đối chiếu với artifact text (chứ không phải được duyệt nhắm mắt) dùng quy tắc ưu tiên: hiểu sai hợp đồng / có thể hành động / đánh đổi / nhiễu
- [ ] Đã gặp điều kiện dừng (lỗi vặt vãnh, đã qua 3 chu kỳ, hoặc người dùng ghi đè (override))
- [ ] Ở chế độ tương tác (interactive), tính năng cross-model đã được **đề xuất rõ ràng** tới người dùng (bất kể rủi ro của artifact là bao nhiêu) và phản hồi của người dùng được xác nhận trong output
- [ ] Ở chế độ phi tương tác (non-interactive), cross-model đã được bỏ qua và việc bỏ qua này đã được thông báo
- [ ] Mọi câu lệnh chạy external CLI đều phải trải qua bước kiểm tra PATH, kiểm tra xem nhị phân (binary) có chạy được không, xác nhận cú pháp với người dùng, và có sự ủy quyền rõ ràng để thực thi


---
