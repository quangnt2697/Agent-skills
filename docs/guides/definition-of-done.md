# Tiêu Chuẩn Hoàn Thành (Definition of Done)

Ngưỡng chuẩn mực cố định toàn dự án mà mọi thay đổi đều phải vượt qua trước khi được tính là hoàn thành. Khác với tiêu chí chấp nhận (Acceptance Criteria) thay đổi theo từng task và trả lời câu hỏi *"chúng ta đã xây đúng thứ được yêu cầu chưa?"*, Tiêu chuẩn Hoàn thành (Definition of Done) luôn giữ nguyên cho mọi lần bàn giao và trả lời câu hỏi *"sản phẩm này đã hoàn thiện đạt chuẩn chất lượng của chúng ta chưa?"*. Hãy dùng tài liệu này làm cổng kiểm tra cuối cùng trong quy trình triển khai và nghiệm thu.

## Definition of Done vs. Acceptance Criteria

| Tiêu chí | Acceptance Criteria (Tiêu chí chấp nhận) | Definition of Done (Tiêu chuẩn hoàn thành) |
|---|---|---|
| **Phạm vi** | Riêng biệt cho từng task hoặc bản đặc tả | Áp dụng cho mọi bản bàn giao (increment) |
| **Tính biến đổi** | Khác nhau ở mỗi hạng mục công việc | Cố định và tái sử dụng xuyên suốt |
| **Câu hỏi trả lời** | *"Chúng ta đã làm đúng tính năng này chưa?"* | *"Nó đã sẵn sàng để bàn giao/merge chưa?"* |
| **Người định nghĩa** | Được xác định khi lập đặc tả / kế hoạch cho task | Được định nghĩa một lần cho toàn dự án |
| **Ví dụ** | *"Người dùng có thể đặt lại mật khẩu qua link email"* | *"Tests pass 100%, không gây lỗi hồi quy, tài liệu đã cập nhật"* |

Hai khái niệm này bổ trợ cho nhau. Một task chỉ thực sự hoàn tất khi **thỏa mãn toàn bộ Acceptance Criteria của riêng nó** **VÀ** **đáp ứng đầy đủ Tiêu chuẩn Hoàn thành (Definition of Done) chung**. Bỏ qua một trong hai sẽ tạo ra những công việc nhìn tưởng như đã xong nhưng thực chất chưa thể đưa vào vận hành.

## Danh Mục Kiểm Tra Cố Định (The Standing Checklist)

Áp dụng danh sách này cho mọi thay đổi trước khi tuyên bố hoàn thành.

### 1. Tính Đúng Đắn (Correctness)
- [ ] Mọi tiêu chí chấp nhận (Acceptance Criteria) của task đều đã đạt
- [ ] Code chạy và hoạt động đúng như thiết kế, đã được kiểm chứng lúc thực thi (runtime) chứ không chỉ biên dịch hoặc kiểm tra kiểu (typecheck)
- [ ] Hành vi mới được bao phủ bởi các bài test (test sẽ fail nếu chưa có thay đổi và pass khi có thay đổi)
- [ ] Toàn bộ các bài test hiện có vẫn pass; không làm phát sinh lỗi hồi quy (regression)
- [ ] Các trường hợp biên (edge cases) và luồng lỗi (error paths) đều được xử lý triệt để, không chỉ riêng luồng thành công (happy path)

### 2. Chất Lượng Mã Nguồn (Quality)
- [ ] Code thể hiện rõ ý đồ thông qua cách đặt tên và cấu trúc; không cần comment chỉ để giải thích code *đang làm cái gì*
- [ ] Không lặp lại logic nghiệp vụ (No duplicated business logic)
- [ ] Không để sót code chết (dead code), lệnh in debug, hoặc các khối code bị comment
- [ ] Phạm vi thay đổi bám sát đúng task hiện tại; không tự ý trộn lẫn các chỉnh sửa/refactor ngoài luồng
- [ ] Vượt qua toàn bộ các bước kiểm tra linter, validator và định dạng chuẩn (`npm test`)

Chi tiết chuyên sâu của các mục này nằm trong kỹ năng `cr-review-code-and-quality` (review 5 trục) và `cr-code-simplification` (tối giản độ phức tạp mà không làm đổi hành vi).

### 3. Tính Tích Hợp (Integration)
- [ ] Thay đổi hoạt động trơn tru với phần còn lại của hệ thống, không chỉ chạy đúng khi đứng độc lập
- [ ] Đã tính đến kịch bản migration cơ sở dữ liệu, thay đổi cấu hình (`.env`, `config/`), và cờ tính năng (feature flags)
- [ ] Đã kiểm tra tính tương thích ngược (backward compatibility) đối với mọi thay đổi trên giao diện công khai (public interface) hoặc hợp đồng API

### 4. Tài Liệu Hóa (Documentation)
- [ ] Các giao diện công khai, API, kỹ năng mới và hành vi hướng người dùng đã được cập nhật vào tài liệu (`CATALOG.md`, `AGENTS.md`, `README.md`)
- [ ] Các quyết định kiến trúc quan trọng cần lưu giữ đã được ghi nhận rõ ràng
- [ ] Tài liệu mô tả trạng thái hiện tại của hệ thống bằng ngôn ngữ chuẩn xác, không viết kiểu nhật ký lịch sử thay đổi rời rạc

### 5. Sẵn Sàng Triển Khai (Ship-readiness)
- [ ] Đã rà soát các tác động bảo mật đối với mọi đầu vào từ người dùng, xác thực/phân quyền, hoặc xử lý dữ liệu nhạy cảm (xem `security-code-audit`)
- [ ] Đã có cơ chế quan sát và ghi vết (logs, metrics, traces) cho các luồng xử lý trọng yếu mới
- [ ] Có phương án hoàn tác (rollback path) an toàn cho mọi thay đổi tiềm ẩn rủi ro (xem `.agents/rules/git-workflow.md`)
- [ ] Đã được người dùng / reviewer kiểm tra và phê duyệt trước khi merge vào nhánh chính hoặc triển khai

## Cách Áp Dụng

- **Theo từng task (Per task):** Xác nhận hoàn tất mục *Tính Đúng Đắn* và *Chất Lượng Mã Nguồn* trước khi đánh dấu xong task.
- **Theo từng tính năng (Per feature):** Xác nhận mục *Tính Tích Hợp* và *Tài Liệu Hóa* trước khi coi tính năng là hoàn chỉnh.
- **Theo từng bản phát hành (Per release):** Toàn bộ checklist này là mức sàn tối thiểu; `.agents/rules/git-workflow.md` bổ sung thêm các cổng kiểm soát phân nhánh và merge ở tầng trên.

Hãy chuẩn hóa danh sách này một lần cho dự án, sau đó áp dụng nhất quán. Một Tiêu chuẩn Hoàn thành bị thương lượng lại ở mỗi sprint thì không còn là Tiêu chuẩn Hoàn thành nữa.

## Dấu Hiệu Cảnh Báo (Red Flags)

- *"Xong rồi, tôi chỉ chưa chạy thử thôi"*: Công việc chưa được kiểm chứng thực tế thì chưa phải là đã xong.
- Dùng câu *"Tests pass"* như từ đồng nghĩa với *"Đã hoàn thành"* trong khi bỏ qua cập nhật tài liệu, kiểm tra hồi quy, hoặc xác minh runtime.
- Áp dụng tiêu chuẩn chất lượng thấp hơn khi gặp áp lực tiến độ.
- Coi Acceptance Criteria là rào cản duy nhất mà bỏ qua sàn chất lượng chung (Definition of Done).
- Tự tuyên bố *"Đã xong"* trước khi có sự phê duyệt của con người đối với các thay đổi bắt buộc phải duyệt.
