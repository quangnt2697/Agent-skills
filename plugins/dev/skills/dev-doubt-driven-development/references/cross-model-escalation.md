# Nâng cấp kiểm tra chéo mô hình (Cross-model escalation)

Một reviewer dùng chung một mô hình (single-model) sẽ chia sẻ chung điểm mù với tác giả ban đầu — một mô hình hoàn toàn khác, kiến trúc khác sẽ bắt được những điểm mù đó. Doubt-driven vốn dĩ đã là tùy chọn áp dụng cho các quyết định không hề đơn giản, vì vậy trong phạm vi đó việc cung cấp tính năng cross-model (kiểm tra chéo) là một phần giá trị của kỹ năng này, không phải là một sự phiền hà tùy chọn.

**Với phiên tương tác (interactive sessions): luôn luôn đề nghị (offer). Không bao giờ âm thầm bỏ qua.**

**Bước 1: Hỏi người dùng**

Sau lượt review bằng một model ở Bước 3 trên đây, nhưng trước khi ĐỐI CHIẾU, hãy dừng lại và hỏi:

> *"Đã hoàn thành single-model review. Bạn có muốn ý kiến thứ hai từ cross-model không? Tùy chọn: Gemini CLI, Codex CLI, review thủ công bên ngoài (bạn paste nó ra chỗ khác), hoặc skip (bỏ qua)."*

Câu hỏi này là bắt buộc trong MỌI vòng lặp hoài nghi tương tác — ngay cả với những artifact tưởng chừng ít quan trọng. Người dùng — không phải agent — sẽ quyết định xem cái giá phải trả có xứng đáng không. Công việc của agent là đưa ra lựa chọn đó.

**Bước 2: Nếu người dùng chọn một CLI — xác minh, rồi chạy**

1. Kiểm tra tool có nằm trong PATH không (`which gemini`, `which codex`).
2. Kiểm tra xem nó có hoạt động không (`gemini --version` hoặc tương đương) trước khi truyền toàn bộ prompt — một file thực thi cũ hoặc hỏng có thể qua được lệnh `which` nhưng lại fail khi chạy thực tế.
3. Xác nhận chính xác cú pháp lệnh với người dùng, bao gồm các flag bắt buộc, thông tin xác thực, và các biến môi trường (ví dụ: API keys). Cách triển khai ở mỗi nơi có thể khác nhau; đừng bao giờ đoán mò.
4. CHỈ truyền ARTIFACT + CONTRACT + prompt đối kháng. Không truyền context của session, không truyền CLAIM.
5. Chú ý tới shell escaping (ký tự đặc biệt). Nếu artifact chứa dấu ngoặc kép, `$(...)`, hoặc backticks, hãy ưu tiên stdin (`echo … | gemini`) hoặc heredoc hơn là dòng lệnh nội tuyến `-p "…"`. Nếu không chắc chắn, hãy yêu cầu người dùng xác nhận lại lệnh trước khi chạy nó.
6. Mang output sang Bước 4 (ĐỐI CHIẾU).

**Không bao giờ chèn (interpolate) artifact trực tiếp vào tham số (argument) được bao quanh bởi dấu nháy (shell-quoted).** Code, markdown, và prompt đánh giá thường chứa backticks, `$(...)`, và dấu ngoặc kép có thể làm cắt xén prompt hoặc thậm chí vô tình thực thi lệnh shell được nhúng bên trong. Hãy ghi toàn bộ prompt ra một file và pipe nó qua stdin.

Các dạng ví dụ (hãy xác minh các cờ đối với công cụ đã cài đặt của bạn — cú pháp thay đổi tùy theo bản cài đặt và phiên bản):

```bash
# Viết prompt đối kháng + ARTIFACT + CONTRACT ra một file tạm trước.
# Sau đó pipe qua stdin để các ký tự đặc biệt của shell trong artifact bị vô hiệu.

# Codex (sandbox read-only giữ cho CLI không ghi đè vào không gian làm việc của bạn):
codex exec --sandbox read-only -C <repo-path> - < /tmp/doubt-prompt.md

# Gemini ('--approval-mode plan' là read-only; '-p ""' kích hoạt chế độ
# phi tương tác và prompt được đọc từ stdin):
gemini --approval-mode plan -p "" < /tmp/doubt-prompt.md
```

Một sandbox read-only (chỉ đọc) là chi tiết chịu tải trọng (load-bearing detail): một artifact đang bị nghi ngờ bản thân nó có thể chứa các chỉ dẫn (dù cố ý hay vô tình là prompt injection) mà nếu không có sandbox, CLI chéo mô hình sẽ thực thi chúng vào thư mục làm việc của bạn.

**Bước 3: Nếu CLI không khả dụng hoặc bị lỗi**

Đưa ra lỗi một cách rõ ràng. Đề xuất: chạy nó thủ công, thử công cụ khác, hoặc bỏ qua. Đừng bao giờ âm thầm lùi về single-model — người dùng phải biết rằng cross-model đã không diễn ra.

**Bước 4: Nếu người dùng bỏ qua (skip)**

Hãy xác nhận việc bỏ qua này trong output (*"Đang tiếp tục chỉ với các phát hiện từ single-model"*) và đi tiếp tới RECONCILE. Bỏ qua thì không sao; nhưng âm thầm bỏ qua thì không được.

**Các bối cảnh phi tương tác (non-interactive)** (CI, `/loop`, autonomous-loop, scheduled runs):

- Cross-model sẽ bị **bỏ qua**, và việc bỏ qua này phải được **thông báo** trong output: *"Đã bỏ qua cross-model: bối cảnh phi tương tác."*
- **Không bao giờ gọi một external CLI mà không có sự ủy quyền rõ ràng của người dùng** — đây là một thuộc tính an toàn chịu lực (load-bearing safety property).

Cross-model làm tăng thêm chi phí, độ trễ và sự mong manh của công cụ. Agent phải đưa ra lựa chọn này mỗi chu kỳ; người dùng quyết định xem artifact này có xứng đáng hay không.
