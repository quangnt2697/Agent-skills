---
name: incremental-implementation
description: Triển khai các thay đổi theo từng bước tăng dần (incremental). Sử dụng khi implement bất kỳ tính năng hoặc thay đổi nào chạm đến nhiều hơn 1 file. Sử dụng khi bạn định viết một lượng lớn code cùng một lúc, hoặc khi một task có vẻ quá lớn để xử lý trong một bước.
---

# Kỹ năng: Triển khai Từng bước (Incremental Implementation)

## Tổng quan

Xây dựng theo các lát cắt dọc mỏng — implement một phần, test nó, verify nó, sau đó mới mở rộng tiếp. Tránh việc implement toàn bộ một tính năng trong một lần viết code duy nhất. Mỗi bước tăng dần (increment) phải để lại hệ thống trong trạng thái hoạt động tốt và có thể test được. Đây là kỷ luật thực thi giúp các tính năng lớn trở nên dễ quản lý.

## Khi nào cần sử dụng

- Triển khai bất kỳ thay đổi nào ảnh hưởng tới nhiều file.
- Xây dựng tính năng mới từ bảng phân rã công việc (task breakdown).
- Refactoring lại code cũ.
- Bất cứ khi nào bạn có ý định viết nhiều hơn ~100 dòng code trước khi chạy test.

**Khi nào KHÔNG nên sử dụng:** Những thay đổi nhỏ gọn trong 1 file, 1 function mà phạm vi vốn đã rất tối thiểu.

## Chu trình Tăng dần (The Increment Cycle)

```text
┌──────────────────────────────────────┐
│                                      │
│   Code (Implement) ──→ Test ──→ Verify ──┐  │
│       ▲                           │  │
│       └───── Commit ◄─────────────┘  │
│              │                       │
│              ▼                       │
│          Lát cắt tiếp theo           │
│                                      │
└──────────────────────────────────────┘
```

Đối với mỗi lát cắt (slice):

1. **Implement (Code)** đoạn chức năng hoàn chỉnh nhỏ nhất có thể.
2. **Test** — chạy bộ test suite (hoặc viết thêm test nếu chưa có).
3. **Verify** — xác minh rằng lát cắt hoạt động đúng kỳ vọng (test pass, build thành công, check thủ công).
4. **Commit** — lưu lại tiến độ với một thông điệp commit mô tả rõ ràng (xem `git-workflow-and-versioning` để biết hướng dẫn commit nguyên tử).
5. **Chuyển sang lát cắt tiếp theo** — đi tiếp, không phải làm lại từ đầu.

## Các chiến lược Cắt lát (Slicing Strategies)

### Cắt lát dọc (Vertical Slices - Khuyên dùng)

Xây dựng một luồng (path) hoàn chỉnh đi xuyên qua toàn bộ stack:

```text
Lát cắt 1: Tạo một task (DB + API + UI cơ bản)
    → Test pass, người dùng có thể tạo task qua UI.

Lát cắt 2: Lấy danh sách task (Câu query + API + UI)
    → Test pass, người dùng thấy được danh sách task của họ.

Lát cắt 3: Sửa một task (Lệnh update + API + UI)
    → Test pass, người dùng có thể chỉnh sửa task.

Lát cắt 4: Xóa một task (Lệnh delete + API + UI + popup xác nhận)
    → Test pass, luồng CRUD hoàn thiện.
```

Mỗi lát cắt đều giao (deliver) một tính năng hoạt động được end-to-end.

### Cắt lát Hợp đồng-trước (Contract-First Slicing)

Khi backend và frontend cần được phát triển song song:

```text
Lát cắt 0: Định nghĩa Hợp đồng API (types, interfaces, OpenAPI spec).
Lát cắt 1a: Implement backend dựa trên hợp đồng + API tests.
Lát cắt 1b: Implement frontend dựa trên dữ liệu mock đúng chuẩn hợp đồng.
Lát cắt 2: Tích hợp và test end-to-end.
```

### Cắt lát Ưu tiên Rủi ro (Risk-First Slicing)

Xử lý phần rủi ro cao nhất hoặc phần không chắc chắn nhất đầu tiên:

```text
Lát cắt 1: Chứng minh kết nối WebSocket hoạt động (rủi ro cao nhất).
Lát cắt 2: Xây dựng cơ chế cập nhật task realtime trên kết nối đã hoạt động.
Lát cắt 3: Thêm hỗ trợ offline và tính năng tự reconnect.
```

Nếu Lát cắt 1 thất bại, bạn phát hiện ra nó trước khi đầu tư thời gian vào Lát cắt 2 và 3.

## Các quy tắc Triển khai

### Quy tắc 0: Ưu tiên sự Đơn giản (Simplicity First)

Trước khi viết bất kỳ dòng code nào, hãy hỏi: "Đâu là cách đơn giản nhất để nó chạy được?"

Sau khi viết code, hãy review nó theo các check sau:
- Code này có thể viết ngắn gọn hơn không?
- Các lớp trừu tượng (abstractions) này có đáng giá so với sự phức tạp mà nó gây ra không?
- Một staff engineer nhìn vào liệu có bảo "sao bạn không làm thế này cho nhanh..." không?
- Tôi đang code cho một yêu cầu xa xôi trong tương lai, hay là cho task hiện tại?

```text
KIỂM TRA SỰ ĐƠN GIẢN:
✗ Dùng Generic EventBus cùng với middleware pipeline chỉ để bắn 1 cái thông báo
✓ Dùng hàm function call đơn giản

✗ Dùng Abstract factory pattern cho 2 components na ná nhau
✓ Viết thẳng 2 components đơn giản và share chung vài hàm utilities

✗ Xây hẳn 1 bộ config-driven form builder chỉ để làm 3 cái form
✓ Code thẳng 3 form components
```

Ba dòng code tương tự nhau vẫn tốt hơn là một sự trừu tượng hóa quá sớm. Hãy implement phiên bản thô sơ, rõ-ràng-là-đúng trước tiên. Chỉ tối ưu sau khi sự chính xác đã được chứng minh qua test.

### Quy tắc 0.5: Kỷ luật về Phạm vi (Scope Discipline)

Chỉ chạm vào những gì mà task yêu cầu.

TUYỆT ĐỐI KHÔNG:
- "Dọn dẹp" (Clean up) các đoạn code nằm cạnh chỗ bạn đang sửa.
- Refactor các câu lệnh import ở những file bạn không định sửa.
- Xóa các comments mà bạn không hiểu ngọn ngành.
- Thêm tính năng không có trong spec chỉ vì nó "có vẻ hữu ích".
- Hiện đại hóa cú pháp (modernize syntax) ở những file mà bạn chỉ mở lên để đọc.

Nếu bạn nhận thấy có gì đó đáng được cải thiện nằm ngoài phạm vi task, hãy ghi chú lại — đừng sửa nó vội:

```text
NHẬN THẤY NHƯNG KHÔNG ĐỤNG VÀO:
- File src/utils/format.ts có 1 import không dùng tới (nhưng không liên quan task này).
- Auth middleware có thể cải thiện câu thông báo lỗi cho hay hơn (tách thành task riêng).
→ Bạn có muốn tôi tạo các task mới cho những việc này không?
```

### Quy tắc 1: Mỗi lần làm Một việc (One Thing at a Time)

Mỗi lần tăng dần (increment) chỉ làm thay đổi một thứ logic duy nhất. Không trộn lẫn các mối quan tâm:

**Sai:** Gộp 1 commit chứa việc tạo component mới, refactor một component cũ, và update cấu hình build.

**Đúng:** 3 commits tách biệt — mỗi cái cho một thay đổi riêng.

### Quy tắc 2: Giữ code luôn Compile được (Keep It Compilable)

Sau mỗi lần tăng dần, dự án phải build được và các test cũ phải pass. Đừng để codebase nằm trong trạng thái hỏng hóc vỡ lở giữa các lát cắt.

### Quy tắc 3: Dùng Cờ Tính năng (Feature Flags) cho tính năng chưa xong

Nếu một tính năng chưa sẵn sàng tung ra cho user nhưng bạn cần merge các bước tăng dần vào nhánh chính:

```typescript
// Feature flag cho chức năng đang code dở (WIP)
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // UI chức năng sharing mới
}
```

Điều này cho phép bạn merge từng phần nhỏ vào branch chính mà không làm phơi bày tính năng chưa hoàn thiện ra ngoài.

### Quy tắc 4: Các thiết lập Mặc định An toàn (Safe Defaults)

Code mới viết nên để mặc định là hành vi an toàn, bảo thủ (conservative):

```typescript
// An toàn: mặc định là tắt, opt-in mới bật
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```

### Quy tắc 5: Thân thiện với việc Rollback

Mỗi increment phải có khả năng được revert (hoàn tác) một cách độc lập:

- Các thay đổi mang tính thêm mới (file mới, function mới) thì rất dễ revert.
- Sửa đổi code cũ phải được thực hiện tối thiểu và tập trung nhất có thể.
- Database migrations phải đi kèm file rollback migrations tương ứng.
- Tránh việc vừa xóa một thứ đi rồi thay thế nó bằng thứ khác trong cùng một commit — hãy tách riêng ra.

## Phối hợp cùng Agents

Khi chỉ thị agent implement theo kiểu incremental:

```text
"Hãy implement Task 3 trong bản kế hoạch.

Bắt đầu trước với việc sửa DB schema và cái API endpoint thôi.
Đừng đụng vào UI vội — chúng ta sẽ làm UI ở phần increment tiếp theo.

Sau khi code xong, hãy chạy các lệnh test và lệnh build của repo
để chắc chắn không có gì bị hỏng nhé."
```

Hãy đưa ra định nghĩa thật rõ ràng về việc cái gì thuộc phạm vi (in scope) và KHÔNG thuộc phạm vi (NOT in scope) cho mỗi increment.

## Checklist cho mỗi Increment

Sau mỗi lần tăng dần, hãy kiểm tra lại bằng các lệnh của chính repository đó (xem phần *Khám phá Stack trước tiên* trong skill `test-driven-development`):

- [ ] Thay đổi chỉ thực hiện một việc duy nhất và thực hiện nó trọn vẹn.
- [ ] Tất cả các bài test cũ vẫn pass (dùng lệnh test của repo: `npm test`, `./gradlew test`, `pytest`, ...).
- [ ] Build thành công (dùng lệnh build của repo).
- [ ] Type checking pass (nếu stack có hỗ trợ: `npx tsc --noEmit`, `mypy`, ...).
- [ ] Lệnh Linting không báo lỗi.
- [ ] Tính năng mới hoạt động chính xác như kỳ vọng.
- [ ] Thay đổi đã được commit kèm một mô tả có ý nghĩa.

**Lưu ý:** Chỉ chạy các lệnh kiểm tra sau khi vừa có một thay đổi có khả năng gây ảnh hưởng tới lệnh đó. Sau khi lệnh chạy thành công, đừng lặp lại câu lệnh đó lần nữa trừ khi code lại vừa được sửa — việc chạy lại test trên đống code không đổi chẳng cung cấp thêm thông tin gì.

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Tí nữa làm xong tôi test một thể" | Bugs bị dồn ứ lại. Một bug ở Lát cắt 1 sẽ làm các Lát cắt 2-5 bị sai theo. Hãy test từng lát cắt. |
| "Cứ làm tuốt luốt một cục cho nhanh" | Cảm giác *có vẻ* nhanh cho đến khi cái gì đó lăn ra hỏng, và bạn không thể tìm ra nguyên nhân ở 500 dòng code vừa đổi. |
| "Cái này đổi ít quá, commit mất công" | Commit nhỏ không tốn tiền. Commit to giấu kín bug và biến việc rollback thành một nỗi đau khổ. |
| "Để tí nữa tôi nhét cái feature flag vào sau" | Nếu tính năng chưa hoàn thiện, user không được phép thấy nó. Hãy cài cờ (flag) ngay từ đầu. |
| "Cái đoạn refactor này có tý xíu, gộp chung luôn" | Trộn lẫn refactoring vào chung với code tính năng mới khiến cả hai đều khó review và khó debug. Tách ra. |
| "Để tôi chạy lại lệnh build phát nữa cho chắc củ" | Nếu đã chạy pass rồi, chạy lại lần nữa là vô dụng nếu không có dòng code nào thay đổi giữa hai lần chạy. Chỉ chạy lại sau khi sửa code, không phải để tự trấn an bản thân. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Viết quá 100 dòng code mà chưa chạy test phát nào.
- Gộp quá nhiều thay đổi không liên quan vào chung 1 increment.
- Tiện tay mở rộng phạm vi: "để tôi thêm nhanh cái này vào luôn".
- Bỏ qua bước test/verify để làm cho lẹ.
- Build hoặc test bị hỏng giữa chừng giữa các increments.
- Đống thay đổi khổng lồ nằm ụ lại chưa được commit.
- Viết các lớp abstract khi chưa có đủ 3 use cases đòi hỏi nó.
- Chạm vào các file ngoài phạm vi task với lý do "tiện tay ở đây thì sửa luôn".
- Đẻ ra một đống file utility mới chỉ để dùng 1 lần duy nhất.
- Chạy đi chạy lại cùng một lệnh build/test 2 lần liên tiếp dù chẳng sửa thêm dòng code nào.

## Xác minh (Verification)

Sau khi hoàn tất mọi increments của một task:

- [ ] Từng increment đã được test và commit một cách độc lập.
- [ ] Toàn bộ test suite đều pass.
- [ ] Build hoàn toàn sạch sẽ.
- [ ] Tính năng hoạt động end-to-end theo đúng spec.
- [ ] Không còn đoạn code thay đổi nào bị bỏ quên chưa commit.

## Xem thêm

Kiểm chứng (verification) ở từng increment là việc check ở cấp độ cục bộ. Trước khi tuyên bố một task đã xong toàn bộ, hãy đối chiếu với Định nghĩa Hoàn thành (Definition of Done) của dự án — đây là rào chắn chốt sổ cuối cùng mà mọi thay đổi đều phải vượt qua. Xem `references/definition-of-done.md`.
