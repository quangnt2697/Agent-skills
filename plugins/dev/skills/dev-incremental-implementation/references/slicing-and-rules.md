## Chiến lược Cắt lát (Slicing Strategies)

### Lát cắt Dọc (Vertical Slices - Ưu tiên dùng)

Xây dựng một luồng hoàn chỉnh chạy xuyên suốt qua toàn bộ hệ thống (stack):

```
Lát cắt 1: Tạo một task (DB + API + UI cơ bản)
    → Tests pass, user có thể tạo task từ UI

Lát cắt 2: Danh sách tasks (query + API + UI)
    → Tests pass, user nhìn thấy các task của họ

Lát cắt 3: Chỉnh sửa một task (update + API + UI)
    → Tests pass, user có thể sửa tasks

Lát cắt 4: Xóa một task (delete + API + UI + hộp thoại xác nhận)
    → Tests pass, hoàn thành bộ CRUD đầy đủ
```

Mỗi lát cắt đều mang lại một chức năng end-to-end hoạt động được.

### Cắt lát Ưu tiên Hợp đồng (Contract-First Slicing)

Khi backend và frontend cần được phát triển song song:

```
Lát cắt 0: Định nghĩa hợp đồng API (types, interfaces, OpenAPI spec)
Lát cắt 1a: Implement backend bám sát hợp đồng + viết API tests
Lát cắt 1b: Implement frontend bám sát mock data tuân theo hợp đồng
Lát cắt 2: Tích hợp và test end-to-end
```

### Cắt lát Ưu tiên Rủi ro (Risk-First Slicing)

Giải quyết phần rủi ro nhất hoặc mông lung nhất trước tiên:

```
Lát cắt 1: Chứng minh rằng kết nối WebSocket hoạt động (rủi ro cao nhất)
Lát cắt 2: Xây dựng tính năng cập nhật task realtime trên cái kết nối đã được chứng minh
Lát cắt 3: Thêm hỗ trợ offline và tính năng tự động reconnect lại
```

Nếu Lát cắt 1 thất bại, bạn sẽ biết điều đó trước khi đổ mồ hôi sôi nước mắt vào Lát cắt 2 và 3.

## Các Quy tắc Triển khai (Implementation Rules)

### Quy tắc 0: Sự đơn giản là trên hết (Simplicity First)

Trước khi viết bất kỳ dòng code nào, hãy tự hỏi: "Cách đơn giản nhất có thể chạy được là gì?"

Sau khi viết code xong, hãy tự review lại nó bằng các câu hỏi:
- Có thể làm điều này với ít dòng code hơn không?
- Những lớp trừu tượng (abstractions) này có xứng đáng với sự phức tạp mà nó mang lại không?
- Liệu một staff engineer nhìn vào cái này có hỏi "sao mày không đơn giản là..."?
- Tôi đang build tính năng này cho một yêu cầu giả định ở tương lai, hay là cho đúng cái task hiện tại?

```
KIỂM TRA ĐỘ ĐƠN GIẢN:
✗ Dùng một Generic EventBus kèm cả một pipeline middleware chỉ cho một cái notification
✓ Dùng một cái function call đơn giản

✗ Áp dụng Abstract factory pattern cho hai cái component na ná nhau
✓ Viết hai component thẳng tuột chia sẻ chung vài cái utilities

✗ Build cả một hệ thống Config-driven form builder chỉ để làm 3 cái forms
✓ Viết luôn 3 cái form components cho nhanh
```

Ba dòng code na ná nhau vẫn tốt hơn là một sự trừu tượng hóa sớm (premature abstraction). Hãy implement phiên bản ngây thơ, đúng-một-cách-hiển-nhiên trước. Chỉ tối ưu (optimize) SAU KHI tính đúng đắn đã được chứng minh qua các bài test.

### Quy tắc 0.5: Kỷ luật về Phạm vi (Scope Discipline)

Chỉ đụng vào đúng những thứ mà task yêu cầu.

KHÔNG ĐƯỢC:
- "Dọn dẹp tiện tay" những đoạn code nằm gần chỗ bạn sửa
- Refactor các imports ở những file bạn không hề chủ ý sửa
- Xóa các comment mà bạn không hoàn toàn hiểu hết
- Thêm thắt các tính năng không có trong spec chỉ vì "thấy nó cũng tiện"
- Hiện đại hóa (Modernize) syntax trong những file mà bạn chỉ mở ra để đọc

Nếu bạn chú ý thấy thứ gì đó đáng để cải thiện nằm ngoài phạm vi task (scope), hãy ghi chú nó lại — đừng có tự ý sửa:

```
THẤY NHƯNG KHÔNG ĐỤNG:
- src/utils/format.ts có một cái import không dùng tới (không liên quan tới task này)
- Cái auth middleware nên có thông báo lỗi tốt hơn (nên tách thành task riêng)
→ Bạn có muốn tôi tạo task cho những việc này không?
```

### Quy tắc 1: Mỗi lúc một việc (One Thing at a Time)

Mỗi increment chỉ thay đổi đúng một logic. Đừng trộn lẫn nhiều mối quan tâm (concerns):

**TỒI:** Một lần code bao gồm cả việc thêm component mới, refactor một cái cũ, và tiện tay sửa luôn build config.

**TỐT:** Chia làm ba phiên code riêng biệt — mỗi cái cho một mục đích rõ ràng. Khi task hoàn thành, tạo một commit duy nhất cho toàn bộ thay đổi liên quan.

### Quy tắc 2: Giữ cho nó Build được (Keep It Compilable)

Sau mỗi increment, dự án BẮT BUỘC phải build được và các test hiện có phải pass. Đừng bỏ mặc codebase trong tình trạng tan nát giữa các lát cắt.

### Quy tắc 3: Feature Flags cho các tính năng chưa hoàn thiện

Nếu một tính năng chưa sẵn sàng để show cho user nhưng bạn cần phải merge code:

```typescript
// Feature flag cho phần tính năng đang làm dở (work-in-progress)
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // UI giao diện Sharing mới
}
```

Cách này giúp bạn có thể merge các increment nhỏ gọn vào main branch mà không làm lộ các phần việc còn dang dở.

### Quy tắc 4: Mặc định an toàn (Safe Defaults)

Code mới nên để mặc định ở hành vi an toàn, bảo thủ:

```typescript
// An toàn: mặc định là tắt, người dùng phải chủ động bật (opt-in)
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```

### Quy tắc 5: Thân thiện với Rollback (Rollback-Friendly)

Task nên được thiết kế để có thể dễ dàng đảo ngược (revertable):

- Thay đổi mang tính cộng dồn (thêm file mới, thêm function mới) thì rất dễ revert
- Sửa đổi trên code cũ thì phải thật nhỏ gọn và bám đúng trọng tâm
- Quá trình Database migrations luôn phải đi kèm với file rollback migration tương ứng
- Nếu cần tách refactor ra khỏi feature, tạo feature branch riêng cho refactor

## Làm việc với các Agents

Khi chỉ đạo một agent implement theo hướng tăng dần (incrementally):

```
"Hãy implement Task 3 từ bản kế hoạch.

Bắt đầu trước với phần đổi database schema và cái API endpoint thôi nhé.
Khoan đụng vào UI — chúng ta sẽ làm cái đó ở increment tiếp theo.

Sau khi implement xong, hãy chạy lệnh test và build của repository để
xác minh không có gì bị hỏng. KHÔNG commit — chờ tôi approve."
```

Hãy nêu thật rõ ràng cái gì nằm trong scope và cái gì KHÔNG NẰM TRONG scope cho mỗi increment.

## Checklist Increment

Sau mỗi increment, hãy xác minh bằng các công cụ nội bộ của repository (xem phần Khám phá Stack của skill dev-test-driven-development):

- [ ] Thay đổi chỉ tập trung vào một việc và làm trọn vẹn việc đó
- [ ] Tất cả các tests hiện tại vẫn pass (lệnh test của repo: `npm test`, `./gradlew test`, `pytest`, ...)
- [ ] Build thành công (lệnh build của repo)
- [ ] Quét type checking thành công (nếu stack đó có: `npx tsc --noEmit`, `mypy`, ...)
- [ ] Quét Linting không lỗi (lệnh lint của repo)
- [ ] Tính năng mới chạy đúng y như kỳ vọng
- [ ] Sự thay đổi đã được ghi nhận trong working memory (KHÔNG commit — commit chỉ xảy ra 1 lần cuối khi task hoàn thành)

**Lưu ý:** Chạy mỗi câu lệnh xác minh ngay sau khi đoạn code liên quan vừa thay đổi. Nếu nó đã chạy pass rồi, đừng chạy lại lần nữa trừ khi code có thay đổi thêm — chạy lại code không thay đổi chẳng cung cấp thêm thông tin gì.

