---
name: code-review-and-quality
description: Thực hiện đánh giá code đa chiều (multi-axis code review). Sử dụng trước khi merge bất kỳ thay đổi nào. Sử dụng khi đánh giá code do chính bạn viết, do một agent khác viết, hoặc do con người viết. Sử dụng khi bạn cần đánh giá chất lượng code trên nhiều phương diện trước khi đưa nó vào nhánh chính.
---

# Kỹ năng: Đánh giá Chất lượng Code (Code Review and Quality)

## Tổng quan

Đánh giá code đa chiều thông qua các cổng kiểm soát chất lượng (quality gates). Mọi thay đổi đều phải được review trước khi merge — không có ngoại lệ. Việc đánh giá (review) bao phủ năm trục: tính chính xác, khả năng đọc hiểu, kiến trúc, bảo mật, và hiệu năng.

**Tiêu chuẩn phê duyệt (Approval standard):** Hãy phê duyệt một thay đổi khi nó chắc chắn cải thiện được sức khỏe tổng thể của codebase, ngay cả khi nó không hoàn hảo. Không tồn tại thứ gọi là code hoàn hảo — mục tiêu là sự cải tiến liên tục. Đừng chặn (block) một thay đổi chỉ vì nó không được viết chính xác theo cách bạn muốn. Nếu nó làm codebase tốt lên và tuân thủ các quy ước của dự án, hãy approve nó.

## Khi nào cần sử dụng

- Trước khi merge bất kỳ PR (Pull Request) hoặc thay đổi nào.
- Sau khi hoàn tất việc triển khai một tính năng.
- Khi một agent khác hoặc mô hình (model) sinh ra đoạn code mà bạn cần đánh giá.
- Khi refactor các đoạn code hiện tại.
- Sau bất kỳ lần sửa bug nào (review cả bản sửa lỗi lẫn bài test chống tái diễn - regression test).

## 5 Trục Đánh giá (The Five-Axis Review)

Mọi lượt review đều đánh giá code dựa trên các phương diện sau:

### 1. Tính Chính xác (Correctness)

Code có làm đúng những gì nó tuyên bố không?

- Nó có khớp với spec hoặc yêu cầu của task không?
- Đã xử lý các trường hợp ngoại lệ (edge cases) chưa (null, rỗng, giá trị biên)?
- Đã xử lý các luồng lỗi (error paths) chưa (không chỉ test mỗi luồng thành công - happy path)?
- Nó có pass tất cả các bài test không? Các bài test có đang thực sự đi test đúng trọng tâm không?
- Có bị lỗi việt vị 1 đơn vị (off-by-one errors), lỗi tương tranh (race conditions), hay state bị thiếu nhất quán không?

### 2. Khả năng Đọc hiểu & Sự Đơn giản (Readability & Simplicity)

Một kỹ sư khác (hoặc agent khác) có thể hiểu đoạn code này mà không cần tác giả phải giải thích không?

- Tên biến có mang tính mô tả và nhất quán với quy ước của dự án không? (Tuyệt đối không dùng `temp`, `data`, `result` nếu không có bối cảnh rõ ràng).
- Luồng điều khiển (control flow) có dễ nhìn không (tránh dùng if/else bậc ba lồng nhau, callback lồng sâu)?
- Code có được tổ chức logic không (các đoạn code liên quan gom lại với nhau, ranh giới module rõ ràng)?
- Có các mẹo (tricks) "tỏ ra nguy hiểm/thông minh" (clever) nào cần được viết lại cho đơn giản không?
- **Có thể viết cái này bằng ít số dòng code hơn không?** (Viết 1000 dòng trong khi 100 dòng là đủ, đó là một sự thất bại).
- **Những lớp trừu tượng (abstractions) này có xứng đáng với sự phức tạp mà nó mang lại không?** (Đừng viết abstract hóa sớm cho đến khi bạn gặp trường hợp sử dụng thứ ba).
- Có cần thêm comments để giải thích cho những đoạn không rõ ràng không? (Tuy nhiên đừng comment cho những đoạn code đã quá hiển nhiên).
- Có tồn tại "xác chết" (dead code) nào không: các biến thừa thãi (`_unused`), các đoạn code tương thích ngược (shims) không còn dùng, hay các comment kiểu `// removed`?
- **Có câu lệnh điều kiện (conditional) mới nào vừa bị "bắn đinh" vào một luồng không hề liên quan không?** Đó là dấu hiệu (smell) của thiết kế tồi, không phải chuyện nhỏ (nit) — hãy đẩy phần logic đó vào một file helper, state, hoặc policy riêng của nó thay vì làm rối tung một luồng đang có.
- **Các câu lệnh if/else kiểm tra cùng một cấu trúc dữ liệu có xuất hiện lặp đi lặp lại không?** Nó báo hiệu sự vắng mặt của một Model hoặc Dispatcher. Một nhánh code "chỉ dùng tạm" thường trở thành cục nợ vĩnh viễn.

### 3. Kiến trúc (Architecture)

Sự thay đổi này có vừa vặn với thiết kế của hệ thống không?

- Nó có tuân theo các mô hình (patterns) hiện tại hay đang đẻ ra cái mới? Nếu đẻ ra cái mới, nó có lý do chính đáng không?
- Nó có duy trì được ranh giới gọn gàng giữa các module không?
- Có đoạn code trùng lặp nào đáng lẽ nên được gom lại dùng chung không?
- Các sự phụ thuộc (dependencies) có đang đi đúng hướng không (không có phụ thuộc vòng - circular dependencies)?
- Mức độ trừu tượng (abstraction level) có phù hợp không (không over-engineered, không quá dính chặt/coupled)?
- **Đoạn refactor này làm giảm độ phức tạp hay chỉ đơn giản là bê độ phức tạp đi chỗ khác?** Hãy đếm số lượng khái niệm mà người đọc phải ghi nhớ để hiểu được phần thay đổi. Nếu một phiên bản "cleaner" vẫn bắt người đọc nhớ ngần ấy thứ, nó chưa sạch (clean) hơn — hãy ưu tiên cách cấu trúc lại nào giúp xóa sổ hoàn toàn các nhánh con, các trạng thái phụ, hoặc cả một layer, hơn là việc dồn cục mớ logic đó vào một chỗ khác (re-centralize). Hãy ưu tiên xóa bỏ một lớp trừu tượng hơn là cố gắng đánh bóng nó.
- **Logic của một tính năng cụ thể có đang bị rò rỉ (leaking) vào trong một module dùng chung (shared/general-purpose) không?** Hãy giữ logic ở đúng layer sở hữu nó, tái sử dụng các hàm helper chuẩn mực đã có (canonical helper) thay vì viết thêm một bản sao na ná, và đừng bình thường hóa sự chệch hướng kiến trúc.
- **Ranh giới kiểu dữ liệu (type boundaries) có rõ ràng không?** Hãy đặt câu hỏi nếu thấy lạm dụng `any`/`unknown`/optional/ép-kiểu và các pha fallback âm thầm che đậy một cấu trúc dữ liệu không rõ ràng — việc làm rõ ranh giới kiểu dữ liệu thường khiến luồng điều khiển bao quanh nó trở nên đơn giản hơn rất nhiều.

### 4. Bảo mật (Security)

Để có hướng dẫn bảo mật chi tiết, xem `security-and-hardening`. Thay đổi này có đem theo lỗ hổng bảo mật nào không?

- Dữ liệu người dùng nhập (user input) đã được validate và làm sạch (sanitized) chưa?
- Các khóa bí mật (secrets) đã được giấu khỏi code, khỏi log, và khỏi version control (Git) chưa?
- Các phần kiểm tra Auth/Phân quyền đã được đặt đúng chỗ chưa?
- Các câu query SQL đã được tham số hóa chưa (tuyệt đối không nối chuỗi string concatenation)?
- Các giá trị output đã được mã hóa (encoded) để chống XSS chưa?
- Các thư viện phụ thuộc (dependencies) có đến từ các nguồn uy tín và không có lỗ hổng đã biết nào không?
- Dữ liệu từ các nguồn bên ngoài (APIs, logs, user content, config files) có được coi là dữ liệu không đáng tin cậy (untrusted) không?
- Dòng dữ liệu từ bên ngoài có được validate tại các ranh giới hệ thống trước khi đem vào xử lý logic hoặc render lên giao diện không?

### 5. Hiệu năng (Performance)

Để biết cách profiling và tối ưu chi tiết, xem `performance-optimization`. Thay đổi này có gây ra vấn đề hiệu năng nào không?

- Có mô hình truy vấn N+1 (N+1 query patterns) nào không?
- Có vòng lặp vô tận (unbounded loops) hay lấy dữ liệu không giới hạn nào không?
- Có thao tác đồng bộ (synchronous) nào đáng lẽ phải viết thành bất đồng bộ (async) không?
- Có component UI nào bị re-render không cần thiết không?
- Có endpoint lấy danh sách nào mà quên phân trang (pagination) không?
- Có khởi tạo object nào quá lớn bên trong các luồng chạy nóng (hot paths) không?

## Các Biện pháp Khắc phục Kiến trúc (Structural Remedies)

Khi bạn cảnh báo một vấn đề về kiến trúc, hãy đề xuất hướng dịch chuyển cụ thể — không chỉ nói mỗi cái lỗi ra. Một đánh giá chỉ có câu "chỗ này phức tạp quá" sẽ bỏ lại tác giả trong sự hoang mang. Hãy đưa ra các cách cấu trúc lại có tên gọi rõ ràng:

- **Thay thế một chuỗi if/else dài dằng dặc** bằng một model có Type hoặc một Dispatcher rõ ràng.
- **Thu gọn các nhánh if/else trùng lặp** thành một luồng (flow) duy nhất và trong sáng hơn.
- **Tách biệt phần điều phối (orchestration) ra khỏi logic nghiệp vụ** để mỗi phần đều dễ đọc độc lập.
- **Di chuyển logic chuyên biệt của tính năng** ra khỏi module dùng chung (shared), đưa nó về đúng package chịu trách nhiệm quản lý khái niệm đó.
- **Tái sử dụng hàm helper chuẩn mực (canonical helper)** thay vì đẻ ra một bản sao chỉ hơi khang khác một xíu.
- **Làm cho ranh giới kiểu dữ liệu (type boundary) trở nên tường minh** để các nhánh phân xử phức tạp ở phía sau sẽ tự động biến mất.
- **Xóa bỏ lớp vỏ bọc vô dụng (pass-through wrapper)** chỉ làm tăng thêm tầng gián tiếp (indirection) mà không làm cho API rõ ràng hơn.
- **Trích xuất ra một helper, hoặc chẻ nhỏ một file bự** thành các modules tập trung (focused modules).

Ưu tiên giải pháp làm giảm bớt số lượng các phần tử chuyển động (moving pieces), thay vì giải pháp đem cái sự phức tạp ấy ném rải rác đi khắp nơi.

## Cỡ của Thay đổi (Change Sizing)

Những thay đổi nhỏ gọn, có trọng tâm sẽ dễ review hơn, merge nhanh hơn và deploy an toàn hơn. Nhắm tới các size sau:

```text
Sửa ~100 dòng code   → Tốt. Đủ để review xong trong một lần ngồi.
Sửa ~300 dòng code   → Chấp nhận được nếu đó chỉ là MỘT thay đổi mang tính logic duy nhất.
Sửa ~1000 dòng code  → Quá lớn. Hãy chia nhỏ nó ra.
```

**Hãy chú ý tổng kích thước file, chứ không chỉ quan tâm Diff.** Một cái Diff nhỏ vẫn có thể nhồi nhét một cái file phình to quá giới hạn an toàn — con số khoảng 1000 *tổng* số dòng code trong một file duy nhất (khác với ngưỡng ~1000 dòng *thay đổi* ở trên) là tín hiệu phổ biến cần phải soi kỹ, chứ không phải là một cái trần cứng. Khi một thay đổi làm béo thêm một cái file vốn đã bự, hãy hỏi xem có nên trích xuất các hàm helpers, components con, hoặc modules ra *trước*, rồi hẵng nhồi thêm code vào. Hãy phân tách (decompose) trước, sau đó mới thêm mới (add).

**Thế nào được coi là "một thay đổi (one change)":** Một chỉnh sửa hoàn toàn độc lập, giải quyết đúng một thứ, bao gồm cả các bài test liên quan, và đảm bảo hệ thống vẫn sống sau khi submit. Chỉ là một mảng của tính năng — KHÔNG PHẢI là toàn bộ tính năng.

**Các chiến lược chia nhỏ nếu thay đổi quá lớn:**

| Chiến lược | Cách làm | Khi nào dùng |
|----------|-----|------|
| **Chồng lên nhau (Stack)** | Submit một cái PR nhỏ, bắt đầu PR tiếp theo base trên cái PR đó | Các thay đổi phụ thuộc nhau tuần tự |
| **Gom theo file** | Tách các PR riêng cho từng nhóm cần Reviewers khác nhau | Các vấn đề cắt ngang hệ thống (Cross-cutting concerns) |
| **Cắt lát Ngang (Horizontal)** | Tạo PR cho shared code/stubs trước, sau đó mới đến các phần tiêu thụ | Kiến trúc nhiều Tầng (Layered architecture) |
| **Cắt lát Dọc (Vertical)** | Chia nhỏ tính năng thành các lát full-stack siêu mỏng | Làm tính năng mới |

**Trường hợp nào thay đổi khổng lồ vẫn được chấp nhận:** Việc xóa hoàn toàn các file, hoặc chạy lệnh refactor tự động (automated refactoring) mà Reviewer chỉ cần check "Mục đích", chứ không cần soi từng dòng code.

**Tách bạch việc Refactoring khỏi việc Làm tính năng.** Một cái PR vừa đi dọn dẹp (refactor) đống code cũ lại vừa thêm hành vi mới (new behavior) thực chất là hai PR gộp làm một — hãy submit chúng tách biệt ra. Việc dọn dẹp nhỏ (như đổi tên biến) có thể được cho qua tùy thuộc vào sự dễ tính của Reviewer.

## Mô tả Thay đổi (Change Descriptions)

Mọi thay đổi đều cần một nội dung mô tả (description) để có thể đứng độc lập trong lịch sử version control.

**Dòng đầu tiên:** Ngắn gọn, dùng câu mệnh lệnh (imperative), đứng độc lập. "Xóa API FizzBuzz" (Delete the FizzBuzz RPC) chứ không phải là "Đang xóa cái API FizzBuzz" (Deleting the FizzBuzz RPC). Phải đủ thông tin để người tìm kiếm trong lịch sử (git log) có thể hiểu bạn thay đổi cái gì mà chả cần mở file Diff ra xem.

**Phần Thân (Body):** Sửa cái gì và tại sao. Bao gồm bối cảnh (context), các quyết định, và các lập luận không thể hiện rõ ở bên trong code. Gắn link tới bug id, kết quả benchmark, hoặc tài liệu thiết kế (design docs) nếu có liên quan. Cần thừa nhận các khuyết điểm/đánh đổi (shortcomings) của cách giải quyết hiện tại nếu chúng có tồn tại.

**Các kiểu viết (Anti-patterns) CẦN TRÁNH:** "Fix bug", "Fix build", "Add patch", "Chuyển code từ A sang B", "Giai đoạn 1 (Phase 1)", "Bổ sung vài hàm tiện ích (Add convenience functions)".

## Quy trình Đánh giá (Review Process)

### Bước 1: Hiểu Bối cảnh (Understand the Context)

Trước khi nhìn vào code, hãy hiểu ý đồ:

```text
- Sự thay đổi này đang cố gắng hoàn thành mục tiêu gì?
- Nó đang triển khai spec nào hoặc task nào?
- Hành vi được kỳ vọng sẽ thay đổi ra sao?
```

### Bước 2: Đánh giá Test trước (Review the Tests First)

Code Test sẽ tiết lộ ý đồ và độ phủ (coverage):

```text
- Đã có test viết cho thay đổi này chưa?
- Chúng có đi test hành vi (behavior) không (chứ không phải test implementation)?
- Đã cover các trường hợp ngoại lệ (edge cases) chưa?
- Tên các test có mô tả rõ ràng không?
- Các bài test này có bắt được lỗi regression nếu như code bị thay đổi trong tương lai không?
```

### Bước 3: Đánh giá quá trình triển khai (Review the Implementation)

Duyệt qua code với năm trục đánh giá trong tâm trí:

```text
Với mỗi file bị thay đổi:
1. Chính xác: Đoạn code này có làm đúng như những gì test đang viết không?
2. Dễ đọc: Tôi có hiểu được code này mà chả cần hỏi ai không?
3. Kiến trúc: Cái này có ăn khớp với cả hệ thống không?
4. Bảo mật: Có lỗ hổng rò rỉ nào không?
5. Hiệu năng: Có nút thắt (bottleneck) làm nghẽn cổ chai không?
```

### Bước 4: Phân loại các Ghi chú (Categorize Findings)

Dán nhãn cho mọi comment với mức độ nghiêm trọng (severity) để tác giả biết đâu là bắt buộc (required) vs tùy chọn (optional):

| Tiền tố (Prefix) | Ý nghĩa | Hành động của Tác giả (Author Action) |
|--------|---------|---------------|
| *(Không có tiền tố)* | Bắt buộc phải thay đổi | Bắt buộc phải sửa trước khi merge |
| **Critical:** | Chặn không cho merge | Lỗ hổng bảo mật, mất data, tính năng hỏng |
| **Nit:** | Lặt vặt, tùy chọn | Tác giả có thể kệ (ignore) — format, style cá nhân |
| **Optional:** / **Consider:** | Gợi ý | Đáng để cân nhắc nhưng không bắt buộc |
| **FYI** | Chỉ mang tính cung cấp thông tin | Không cần làm gì — chỉ để tham khảo sau này |

Điều này tránh việc tác giả coi mọi ý kiến của bạn đều là lệnh bắt buộc và lãng phí thời gian vào những góp ý râu ria.

**Ưu tiên những thứ quan trọng lên đầu.** Sắp xếp comment theo mức độ đòn bẩy (leverage): tính chính xác và bảo mật phải lên hàng đầu, sau đó là sự xuống cấp về cấu trúc và bỏ lỡ cơ hội làm đơn giản code, cuối cùng mới tới những thứ khác. Đừng vùi dập một lỗi thiết kế nghiêm trọng xuống dưới một đống bình luận (nits) về làm đẹp code — chốt vài comment chất lượng vẫn hơn một cái sớ dài dằng dặc. Nếu bạn thấy 1 lỗi nghiêm trọng về cấu trúc nhưng lại có tận 10 cái nits (lỗi vụn vặt), thì cái lỗi cấu trúc đó CHÍNH LÀ cốt lõi của buổi review.

### Bước 5: Xác nhận lại việc Kiểm chứng (Verify the Verification)

Check lại lời khai xác minh (verification story) của tác giả:

```text
- Những test nào đã được chạy?
- Có build thành công không?
- Những thay đổi này có được test bằng tay (manual) chưa?
- Có ảnh chụp màn hình (screenshots) đính kèm cho các thay đổi UI không?
- Có phần so sánh hình ảnh Before/After không?
```

## Mô hình Đánh giá Nhiều-Model (Multi-Model Review Pattern)

Sử dụng các model khác nhau cho các góc nhìn review khác nhau:

```text
Model A tiến hành viết code
    │
    ▼
Model B review tính chính xác và đánh giá kiến trúc
    │
    ▼
Model A sửa code theo các phản hồi đó
    │
    ▼
Con người đưa ra quyết định cuối cùng
```

Quy trình này bắt được những lỗi mà một model đơn lẻ có thể bỏ sót — các model khác nhau có những điểm mù (blind spots) khác nhau.

**Ví dụ một prompt cho agent đi làm nhiệm vụ review:**
```text
Hãy review đoạn code thay đổi này để đánh giá tính chính xác, bảo mật, và
sự tuân thủ các quy ước của dự án. Đặc tả (spec) nói là [X]. Thay đổi phải làm được [Y].
Gắn cờ (flag) cho mọi vấn đề tìm thấy với nhãn Critical, Required, Optional, hoặc Nit.
```

## Dọn dẹp Xác code (Dead Code Hygiene)

Sau bất kỳ lần refactoring hay thay đổi tính năng nào, hãy kiểm tra xem có đoạn code nào bị mồ côi (orphaned) không:

1. Nhận diện các đoạn code hiện tại không còn ai gọi tới hoặc không được dùng (unused).
2. Liệt kê chúng ra một cách rõ ràng.
3. **Hỏi trước khi xóa:** "Tôi có nên xóa các thành phần không còn được sử dụng này không: [danh sách]?"

Đừng để xác chết vứt vương vãi khắp nơi — nó gây nhầm lẫn cho người đọc và cho các agents sau này. Tuy nhiên đừng âm thầm xóa mờ những thứ bạn không chắc chắn. Khi phân vân, hãy hỏi.

```text
XÁC NHẬN CÁC DEAD CODE TÌM THẤY:
- formatLegacyDate() trong file src/utils/date.ts — đã được thay thế bằng formatDate()
- component OldTaskCard trong src/components/ — đã được thay thế bằng TaskCard
- hằng số LEGACY_API_URL trong src/config.ts — không còn ai trỏ tới nữa
→ Tôi xóa chúng đi cho an toàn nhé?
```

## Tốc độ Review (Review Speed)

Review chậm chạp sẽ block cả một team. Chi phí context-switch (chuyển đổi ngữ cảnh) của người đi review vẫn còn rẻ chán so với chi phí phải chờ đợi mà bắt người khác gánh chịu.

- **Phản hồi trong vòng 1 ngày làm việc** — đây là giới hạn TỐI ĐA, không phải là mục tiêu vươn tới.
- **Nhịp điệu lý tưởng:** Phản hồi ngay sau khi có request review, trừ khi bạn đang kẹt trong một pha code cần tập trung cao độ (deep coding). Một PR thông thường có thể trải qua vài vòng (rounds) review đi review lại chỉ trong một ngày.
- **Ưu tiên các phản hồi cá nhân nhanh chóng** hơn là chờ đợi một cú "chốt sổ" approve mượt mà. Đưa ra feedback nhanh giúp giảm sự ức chế kể cả khi phải sửa đi sửa lại nhiều lần.
- **Với các PR to đùng:** Đừng cố review cả đống code khổng lồ, hãy yêu cầu tác giả chia nhỏ (split) nó ra.

## Xử lý Bất đồng (Handling Disagreements)

Khi phải giải quyết các tranh chấp trong lúc review, hãy áp dụng hệ thống phân cấp này:

1. **Dữ kiện Kỹ thuật và Số liệu (Data)** chèn ép các ý kiến và sở thích cá nhân.
2. **Quy tắc Style guides** là quyền uy tuyệt đối quyết định mọi vấn đề về hình thức.
3. **Thiết kế Phần mềm** phải được đánh giá trên các nguyên tắc kỹ thuật (engineering principles), KHÔNG phải sở thích cá nhân.
4. **Sự nhất quán Codebase (consistency)** luôn được chấp nhận trừ khi nó làm xuống cấp nghiêm trọng chất lượng tổng thể.

**Tuyệt đối không chấp nhận câu "Để tôi sửa sau/tí dọn sau (I'll clean it up later)."** Kinh nghiệm cho thấy những lời hứa dọn rác "sau này" hiếm khi xảy ra. Yêu cầu dọn dẹp trước khi submit trừ khi đó thực sự là chuyện khẩn cấp chữa cháy (emergency). Nếu các lỗi phát hiện nằm ở đoạn code liền kề mà không thể giải quyết trong PR này, yêu cầu người đó tạo một Bug ticket và tự assign (giao việc) cho chính mình.

## Sự Trung thực trong Đánh giá (Honesty in Review)

Khi review code — bất kể là code của bạn, của một agent khác, hay của con người viết:

- **Đừng ký nháy cho qua (rubber-stamp).** Gõ "LGTM" (Looks Good To Me) mà không có bất kỳ bằng chứng nào chứng minh bạn đã soi code chẳng giúp ích được cho ai cả.
- **Đừng nói giảm nói tránh các vấn đề thật sự.** Ghi "Hình như cái này chỉ là vấn đề nhỏ (minor concern)" trong khi thực ra nó là một cái Bug có thể đánh sập hệ thống Production, đó là sự dối trá.
- **Lượng hóa các vấn đề nếu có thể.** Nói "Cái query N+1 này sẽ cộng thêm ~50ms cho mỗi item trong list" nghe uy tín hơn hẳn câu "chỗ này có vẻ sẽ chạy chậm đấy".
- **Đẩy lùi (Push back) mạnh mẽ các cách tiếp cận có vấn đề rõ ràng.** Nịnh hót (Sycophancy) là một sự thất bại thảm hại trong việc review. Nếu code implement có rủi ro, hãy nói thẳng và đề xuất luôn cách thay thế.
- **Chấp nhận việc bị "lật kèo" (override) một cách lịch sự.** Nếu tác giả có đầy đủ góc nhìn (full context) và không đồng tình, hãy nhường quyền phán quyết (judgment) cho họ. Hãy bình luận về CODE, KHÔNG bình luận về người — chuyển hướng các lời phê bình cá nhân thành phân tích chính đoạn code đó.

## Kỷ luật về Thư viện Phụ thuộc (Dependency Discipline)

Review Thư viện Phụ thuộc là một phần của Code review:

**Trước khi add bất kỳ dependency nào:**
1. Stack hiện tại của chúng ta có tự giải quyết được việc này không? (Thường là Có.)
2. Cái thư viện này dung lượng bao nhiêu? (Check độ béo của bundle size.)
3. Nó có đang được maintain tích cực không? (Check ngày commit gần nhất, số issues còn open.)
4. Nó có lỗ hổng hớ hênh nào đã biết không? (Chạy `npm audit`.)
5. Giấy phép (license) của nó là gì? (Bắt buộc phải tương thích với dự án của chúng ta.)

**Quy tắc:** Luôn ưu tiên dùng thư viện chuẩn (standard library) và các tiện ích nội bộ (existing utilities) hơn là bê thêm một thư viện mới về. Mỗi thư viện tải về là một món Nợ (liability).

**Nâng cấp thư viện hiện tại** cũng là một đoạn code thay đổi giống như bao đống code khác, và nguy cơ rủi ro cao nhất khi upgrade là kiểu làm theo bó (bulk) với dòng commit báo đời "bump deps". Hãy review nó với sự khắt khe tương tự:

1. **Đọc changelog (Lịch sử thay đổi), đừng chỉ nhìn mỗi cái version number.** Mã Semver (phiên bản) đôi khi chỉ là một lời hứa suông của mấy anh maintainer — một bản "patch" (vá lỗi xíu) vẫn có thể ngầm chứa sự thay đổi hành vi. Với các bản update lớn (major bump), đọc sạch đống migration notes và rà xem cái gì có thể vỡ (breaks).
2. **Mỗi thay đổi chỉ có 1 dependency.** Upgrade và merge chúng độc lập từng cái một (hoặc gom các nhóm liên quan nhỏ nhắn). Nếu một cú bulk bump (upgrade nguyên cụm) làm build tạch, bạn sẽ hoa mắt không biết cái package chết dẫm nào gây ra; thay vào đó, đổi từng package một khiến cho việc xác định nguyên nhân và revert (quay xe) dễ như ăn kẹo.
3. **Hãy để bài test phán xử.** Bản upgrade được chứng nhận qua bài test Suite phải Xanh (green) cả lúc trước *và* sau khi update, chứ không phải ở chỗ "cài được (installed)". Nếu vùng kiểm tra độ phủ (coverage) cho tính năng của dependency đó mỏng lét, đấy mới là cái lỗi lớn nhất mà bạn phải phát hiện ra — đi viết thêm test trước khi update.
4. **Quan sát cây phụ thuộc bắc cầu (transitive graph).** Đa số các gói package được cài vào đều là mấy thứ chả ai trực tiếp gọi tới. Review Diff của file Lockfile (ví dụ `package-lock.json`), đừng chỉ săm soi file `package.json`; một cú bump vặt trực tiếp có thể móc thêm hàng chục thứ gián tiếp cài vào theo.
5. **Giữ file Lockfile luôn trung thực.** Commit nó, review diff của nó, và KHÔNG BAO GIỜ tự tay edit bằng cơm. Cái Lockfile mới chính là thứ quyết định cái gì sẽ thực sự chạy trên server lúc ship.

Đối với việc phân loại các cảnh báo của `npm audit` và rủi ro chuỗi cung ứng (supply-chain) (ví dụ: gõ nhầm tên package bị dính mã độc - typosquatting, các maintainers bị hack), hãy xem kỹ năng `security-and-hardening` — phần này (bạn đang đọc) chỉ bao phủ *quy trình* nâng cấp (upgrade workflow), còn phần bên kia bao phủ phán quyết bảo mật.

## Checklist cho việc Đánh giá (Review Checklist)

```markdown
## Đánh giá (Review): [Tên PR/Thay đổi]

### Bối cảnh (Context)
- [ ] Tôi hiểu thay đổi này làm gì và tại sao cần làm

### Tính chính xác (Correctness)
- [ ] Thay đổi khớp với yêu cầu của spec/task
- [ ] Đã xử lý các trường hợp ngoại lệ (Edge cases)
- [ ] Đã xử lý các luồng lỗi (Error paths)
- [ ] Code test bao phủ (cover) thay đổi đầy đủ

### Khả năng đọc hiểu (Readability)
- [ ] Đặt tên rõ ràng và nhất quán
- [ ] Logic điều khiển dễ hiểu (straightforward)
- [ ] Không có sự phức tạp thừa thãi (unnecessary complexity)

### Kiến trúc (Architecture)
- [ ] Tuân theo các patterns có sẵn
- [ ] Không có sự coupling (dính chùm) hay phụ thuộc nào thừa thãi
- [ ] Tầng trừu tượng (abstraction level) phù hợp
- [ ] Việc refactor phải "giảm bớt" độ phức tạp chứ không phải "mang nó đi giấu"
- [ ] Không có feature logic nằm trong các module dùng chung (shared); file không bị vượt quá giới hạn an toàn về kích thước

### Bảo mật (Security)
- [ ] Không có khóa bí mật (secrets) trong code
- [ ] Dữ liệu đầu vào (Input) được validate ngay từ ranh giới
- [ ] Không có các lỗ hổng Injection
- [ ] Đã có các chốt chặn Auth
- [ ] Dữ liệu nguồn ngoại lai bị coi là dữ liệu không đáng tin (untrusted)

### Hiệu năng (Performance)
- [ ] Không có N+1 patterns
- [ ] Không có các phép tính/vòng lặp không bị ràng buộc giới hạn (unbounded)
- [ ] Có phân trang (pagination) trên các list endpoints

### Xác minh (Verification)
- [ ] Test chạy pass
- [ ] Build thành công
- [ ] Đã verify thủ công (nếu cần)

### Phán quyết cuối cùng (Verdict)
- [ ] **Approve** — Đã sẵn sàng để Merge
- [ ] **Yêu cầu thay đổi (Request changes)** — Bắt buộc phải giải quyết các issues
```
## Xem thêm

- Để xem hướng dẫn chi tiết về bảo mật, xem file `references/security-checklist.md`
- Để check các vấn đề đánh giá hiệu năng, xem file `references/performance-checklist.md`

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Nó chạy được, thế là tốt rồi" | Code chạy được nhưng không thể đọc hiểu, hổng bảo mật, hoặc sai bét về kiến trúc sẽ chất đống thành đống nợ (debt). |
| "Tôi tự viết, nên tôi biết nó đúng" | Tác giả luôn bị mù quáng trước chính những giả định của mình. Bất kỳ thay đổi nào cũng cần thêm một đôi mắt thứ hai dòm ngó. |
| "Cứ tính sau, sau này dọn dẹp tiếp" | "Sau này" chả bao giờ tới cả. Việc Review chính là cái bar barie kiểm tra chất lượng — hãy dùng nó. Yêu cầu sửa sạch sẽ TRƯỚC KHI merge, không phải SAU ĐÓ. |
| "Code do AI đẻ ra thì chắc ngon rồi" | Code của AI càng phải bị soi sét kỹ hơn, không phải ít hơn. Nó cực kỳ tự tin và hợp lý, kể cả khi sai lè lè. |
| "Test pass xanh lét rồi, thế là ngon" | Code pass các bài tests là điều kiện Cần nhưng Chưa Đủ. Bài test không chộp được mấy cái hỏng hóc về Kiến trúc, Bảo mật, hoặc vướng mắc về Khả năng đọc hiểu. |
| "Tôi refactor để cho nó cleaner (sạch hơn)" | Việc bứng độ phức tạp (complexity) đi giấu ở chỗ khác KHÔNG HỀ làm giảm bớt độ phức tạp. Nếu người đọc vẫn phải ghi nhớ ngần ấy khái niệm (concepts) trong đầu, thì cấu trúc code chẳng hề tốt lên tý nào — hãy tìm cái version nào mà các nhánh luồng lằng nhằng biến mất ấy. |
| "Em chỉ thêm có tẹo code vào cái file này thôi mà" | Mấy cái diff bé tẹo ấy vẫn đủ sức đẩy cái file của bạn phình to vượt giới hạn an toàn, và nó bắn (bolt) cọc các cụm if/else vào những đoạn luồng không liên quan. Hãy đánh giá Dựa trên Cấu trúc Cuối cùng sinh ra, chứ không phải dựa trên cái Size của Diff. |
| "Em chỉ bump mỗi cái version thôi mà" | Việc Bump version bản chất là một Sự thay đổi Hành vi mà bạn Đéo Tự tay Viết. Đọc ngay cái changelog đi; Semver đéo bảo hành việc không bị vỡ code đâu. |
| "Em sẽ upgrade một cục tát tay (everything in one PR) cho lẹ" | Một cú gộp bulk bump làm sập hệ thống build sẽ che giấu luôn thủ phạm là cái package nào. Nguyên tắc Một Dependency trên Một Lần Đổi sẽ giữ cho việc tìm nguyên nhân và Revert luôn trong sáng. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Những PR được merge một cái roẹt chả có ai thèm dòm (Review).
- Việc Review chỉ đi check mỗi xem Test có pass không (bỏ lơ mấy trục còn lại).
- Type "LGTM" trong khi chả có mẩu bằng chứng nào chứng minh bạn đã đọc code.
- Các đoạn code sửa lỗi nhạy cảm về Bảo mật mà không có người chuyên rà soát bảo mật.
- Cái PR to chà bá "too big to review properly" (cắt mẹ nó ra đi).
- Fix Bug tạo PR mà Đéo thèm kèm cái bài test regression (chống lặp lại bug) vào.
- Comment review đéo gắn cờ Severity labels (Critical, Optional...) — Đéo biết đoạn nào tác giả bắt buộc phải nghe, đoạn nào là đóng góp dạo.
- Chấp nhận câu chót lưỡi đầu môi "I'll fix it later" — đéo bao giờ có chuyện đó đâu.
- Đoạn Refactor chả làm được mẹ gì ngoài bứng code từ chỗ này quăng sang chỗ nọ mà số lượng khái niệm bắt người ta nhét vào đầu đéo giảm đi tẹo nào.
- Thay đổi khiến cái file đang to vãi cứt còn to hơn, thay vì chặt nhỏ nó ra.
- Rải truyền đơn mấy lệnh if/else vung vãi rải rác khắp các nhánh không hề dính dáng đến nhau (thiếu mẹ cái Tầng Trừu tượng - abstraction rồi).
- Đẻ thêm cái hàm helper bản thân nó clone từ cái thằng canonical đã có, hoặc vứt cái cục logic feature vào trong một module dùng chung (shared module).
- Bơm hẳn một cái PR bulk "bump dependencies" to bự không thèm đọc changelog và không thèm tách các package riêng biệt.
- Sửa cái file Lockfile bằng... Cơm (hand-edited), không thèm commit, hoặc nhấn Merge mà đéo review file Diff của cái lockfile.

## Xác minh (Verification)

Sau khi hoàn thành đợt review:

- [ ] Toàn bộ các vấn đề (issues) nhãn Critical đều đã được xử lý.
- [ ] Toàn bộ các comment Bắt buộc (không có tiền tố) đều đã được xử lý hoặc có lý do biện minh cực mạnh để bảo lưu.
- [ ] Tests pass.
- [ ] Build thành công.
- [ ] Quá trình kiểm định (verification story) được ghi chú tử tế (sửa cái gì, verify thế nào).
- [ ] Các Dependency upgrades đều đã được đối soát kỹ càng với file changelog (lịch sử cập nhật), tách riêng lẻ từng cục một, và được khẳng định thông qua việc vượt qua Test Suite cùng với file Lockfile Diff đã được review.

**Quyền phủ quyết ưu tiên (Presumptive blockers):** Hãy lôi ra và đề xuất phương án thay thế nhẹ nhàng hơn cho từng lỗi trong mớ này; chỉ gắn cờ mức Required (Bắt buộc) khi mà thay đổi đó thực sự phá hỏng cấu trúc hệ thống: tỷ dụ như đoạn refactor bứng độ phức tạp giấu đi chỗ khác thay vì làm giảm độ khó; hay đoạn code đắp thêm phình to cái file vượt ngưỡng an toàn mà chả thấy chặt nhỏ gì; cục Feature logic vứt luôn vào Share module; copy ra một bản clone na ná cái canonical helper; hay dùng cái silent fallback (phương án trượt êm) để che đậy đi cái invariant (khế ước bất biến) không rõ ràng của hệ thống.
