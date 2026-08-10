---
name: qa-code-simplify
description: Đơn giản hóa code cho rõ ràng. Sử dụng khi refactor code cho sạch đẹp mà không làm thay đổi hành vi. Sử dụng khi code hiện tại đang chạy tốt nhưng quá khó đọc, khó bảo trì, hoặc khó mở rộng hơn mức cần thiết. Sử dụng khi review một đoạn code đang bị tích tụ quá nhiều sự phức tạp thừa thãi.
---

# Kỹ năng: Đơn giản hóa Code (Code Simplification)

> Lấy cảm hứng từ plugin [Claude Code Simplifier](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md). Được điều chỉnh tại đây như một kỹ năng độc lập với model (model-agnostic), hướng-quy-trình dành cho bất kỳ AI coding agent nào.

## Tổng quan

Đơn giản hóa code bằng cách giảm bớt sự phức tạp trong khi vẫn giữ nguyên vẹn hành vi của nó. Mục tiêu không phải là viết ít số dòng đi — mục tiêu là viết ra đoạn code dễ đọc hơn, dễ hiểu hơn, dễ sửa đổi, và dễ debug hơn. Mọi nỗ lực đơn giản hóa phải vượt qua một bài test rất đơn giản: "Liệu một thành viên mới trong team đọc vào cái này có hiểu nó nhanh hơn so với phiên bản gốc không?"

## Khi nào cần sử dụng

- Sau khi tính năng đã chạy ngon và pass test, nhưng việc implement có cảm giác đang nặng nề hơn mức cần thiết.
- Trong quá trình review code khi phát hiện ra các vấn đề về khả năng đọc hoặc sự phức tạp cồng kềnh.
- Khi bạn bắt gặp logic bị lồng quá sâu, các function dài dằng dặc, hoặc đặt tên tối nghĩa.
- Khi refactor lại những đoạn code được viết gấp gáp dưới áp lực thời gian.
- Khi cần gom gọn lại các logic liên quan đang bị rải rác ở nhiều file.
- Sau khi merge code xong bị lòi ra sự trùng lặp hoặc thiếu nhất quán.

**Khi nào KHÔNG nên sử dụng:**

- Code vốn dĩ đã rất sạch (clean) và dễ đọc rồi — đừng cố làm nó "đơn giản" hơn chỉ vì ngứa tay.
- Bạn chưa thực sự hiểu đoạn code đó làm gì — phải hiểu ngọn ngành trước khi đi đơn giản hóa nó.
- Đoạn code đó quan trọng về mặt hiệu năng (performance-critical) và phiên bản "đơn giản hơn" của bạn sẽ làm nó chạy chậm đi có thể đo lường được.
- Bạn chuẩn bị đập đi viết lại (rewrite) toàn bộ module đó — đơn giản hóa đống code chuẩn bị vứt đi là một sự lãng phí công sức.

## Năm Nguyên tắc (The Five Principles)

### 1. Giữ nguyên vẹn Hành vi (Preserve Behavior Exactly)

Đừng thay đổi những gì đoạn code đó làm — chỉ thay đổi cách nó thể hiện điều đó ra. Mọi input, output, side effects (tác dụng phụ), hành vi khi gặp lỗi, và xử lý các trường hợp ngoại lệ (edge cases) đều phải y hệt như cũ. Nếu bạn không chắc 100% rằng một pha dọn code có giữ nguyên hành vi hay không, ĐỪNG làm.

```text
HÃY TỰ HỎI TRƯỚC MỖI LẦN THAY ĐỔI:
→ Cái này có tạo ra cùng một output cho mọi input tương tự bản cũ không?
→ Cái này có duy trì cách xử lý lỗi y hệt bản cũ không?
→ Cái này có giữ nguyên các side effects và thứ tự chạy không?
→ Liệu tất cả các bài test cũ vẫn pass mà không cần phải đi sửa test không?
```

### 2. Tuân thủ Quy ước Dự án (Follow Project Conventions)

Đơn giản hóa nghĩa là làm cho code trở nên đồng nhất hơn với toàn bộ codebase, chứ không phải mang cái gu sở thích cá nhân của bạn áp đặt vào dự án. Trước khi dọn code:

```text
1. Đọc các quy ước của dự án.
2. Học cách các đoạn code lân cận xử lý các pattern tương tự.
3. Phải làm cho giống style của dự án về mặt:
   - Thứ tự import và hệ thống module
   - Phong cách khai báo hàm
   - Quy ước đặt tên
   - Các pattern xử lý lỗi
   - Mức độ chi tiết của Type annotation (khai báo kiểu dữ liệu)
```

Sự đơn giản hóa mà phá vỡ tính đồng nhất của dự án thì không phải là sự đơn giản — nó là sự xáo trộn (churn).

### 3. Ưu tiên sự Trong sáng hơn sự Rắc rối (Prefer Clarity Over Cleverness)

Code rõ ràng tường minh luôn tốt hơn code ngắn gọn súc tích nếu như cái phiên bản súc tích đó bắt người đọc phải khựng lại suy nghĩ mới hiểu được.

```typescript
// KHÔNG RÕ RÀNG: Dùng chuỗi toán tử 3 ngôi (ternary) quá dày đặc
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// RÕ RÀNG: Dùng ánh xạ dễ đọc
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

```typescript
// KHÔNG RÕ RÀNG: Dùng reduce chắp nối logic loằng ngoằng
const result = items.reduce((acc, item) => ({
  ...acc,
  [item.id]: { ...acc[item.id], count: (acc[item.id]?.count ?? 0) + 1 }
}), {});

// RÕ RÀNG: Có bước trung gian được đặt tên tử tế
const countById = new Map<string, number>();
for (const item of items) {
  countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
}
```

### 4. Duy trì sự Cân bằng (Maintain Balance)

Đơn giản hóa có một cái bẫy chết người: đơn giản hóa quá đà (over-simplification). Cẩn thận với các cạm bẫy này:

- **Gộp hàm (inlining) quá hung hãn** — xóa đi một hàm helper vốn đang giúp một khái niệm có tên gọi rõ ràng, khiến chỗ gọi hàm trở nên cực kỳ khó đọc.
- **Gộp các logic không liên quan** — nhập 2 cái function đơn giản lại thành 1 cái function phức tạp vãi nồi KHÔNG PHẢI là làm cho nó đơn giản hơn.
- **Xóa bớt sự trừu tượng "thừa thãi"** — một số sự trừu tượng tồn tại là để dễ mở rộng (extensibility) hoặc để dễ test (testability), không phải tự nhiên nó sinh ra làm cồng kềnh.
- **Tối ưu vì muốn ít dòng code** — số lượng dòng không phải mục tiêu; tốc độ lĩnh hội đoạn code mới là thứ quyết định.

### 5. Chỉ gói gọn ở những Chỗ Vừa Sửa (Scope to What Changed)

Mặc định là chỉ đơn giản hóa ở những đoạn code vừa mới bị sửa đổi gần đây. Tránh kiểu vừa lái xe vừa bắn tỉa refactor mấy đoạn code chả liên quan, trừ phi được chủ động yêu cầu mở rộng phạm vi. Đơn giản hóa lang man không có phạm vi sẽ tạo ra một đống rác nhiễu (noise) trong diff và đem lại rủi ro làm hỏng cả những thứ chả có tội tình gì.

## Quy trình Đơn giản hóa

### Bước 1: Hiểu nó trước khi Chạm vào (Nguyên lý Hàng rào của Chesterton)

Trước khi thay đổi hoặc xóa bỏ bất cứ thứ gì, BẠN PHẢI HIỂU TẠI SAO NÓ TỒN TẠI. Đây gọi là Hàng rào của Chesterton: nếu bạn thấy một cái hàng rào bắc ngang đường và không hiểu tại sao nó ở đó, đừng có dỡ nó đi. Phải tìm hiểu lý do tại sao nó ở đó trước, rồi mới quyết định xem cái lý do đó giờ có còn hợp lý không.

```text
TRƯỚC KHI ĐƠN GIẢN HÓA, HÃY TRẢ LỜI ĐƯỢC:
- Trách nhiệm của đoạn code này là gì?
- Cái gì gọi tới nó? Nó đang gọi tới cái gì?
- Các trường hợp ngoại lệ (edge cases) và luồng lỗi (error paths) là gì?
- Có bài test nào mô tả hành vi dự kiến của nó không?
- Tại sao người ta lại viết nó theo cách kỳ cục này? (Do hiệu năng? Ràng buộc nền tảng? Lý do lịch sử?)
- Check git blame: cái ngữ cảnh gốc khi viết đống code này là gì?
```

Nếu không trả lời được, bạn chưa đủ tư cách để đơn giản hóa. Đọc thêm code xung quanh đi.

### Bước 2: Nhận diện Cơ hội Đơn giản hóa

Scan code tìm các pattern sau đây — mỗi cái là một Tín hiệu rất cụ thể, chứ không phải là cái cảm giác mơ hồ:

**Sự phức tạp về cấu trúc (Structural complexity):**

| Pattern | Tín hiệu | Cách làm đơn giản hóa |
|---------|--------|----------------|
| Lồng ghép sâu (3+ levels) | Rất khó lướt luồng điều khiển | Tách các điều kiện ra thành Guard clauses (return sớm) hoặc viết thành Helper functions |
| Hàm dài lê thê (50+ lines) | Ôm rơm rặm bụng nhiều trách nhiệm | Cắt nhỏ thành các hàm tập trung, đặt tên thật tử tế |
| Toán tử 3 ngôi (Ternaries) lồng nhau | Đòi hỏi bộ não phải duy trì 1 cái stack để dịch | Thay bằng chuỗi if/else, lệnh switch, hoặc dùng object tra cứu (lookup objects) |
| Cờ tham số (Boolean flags) | Dạng `doThing(true, false, true)` | Thay bằng Options objects hoặc viết tách cmn thành các hàm riêng biệt |
| If lặp đi lặp lại | Cùng 1 cái check `if` nhưng nằm ở n chỗ | Tách đoạn if đó ra thành 1 cái hàm Predicate function có tên gọi đàng hoàng |

**Việc đặt tên và tính Dễ đọc:**

| Pattern | Tín hiệu | Cách làm đơn giản hóa |
|---------|--------|----------------|
| Tên quá chung chung | Dạng `data`, `result`, `temp`, `val`, `item` | Đổi tên để miêu tả cái lõi của nó: `userProfile`, `validationErrors` |
| Tên viết tắt cụt lủn | Dạng `usr`, `cfg`, `btn`, `evt` | Dùng nguyên chữ đầy đủ trừ khi đó là mấy từ viết tắt quốc dân (`id`, `url`, `api`) |
| Tên lừa đảo (Misleading) | Hàm tên là `get` nhưng lại đi đổi state (mutate) bên trong | Đổi tên để phản ánh đúng bản chất tội lỗi của nó |
| Comment để giải thích "Cái Gì (what)" | Comment kiểu `// tăng biến đếm` phía trên dòng `count++` | XÓA MẸ NÓ ĐI — dòng code kia vốn đã quá rõ ràng rồi |
| Comment để giải thích "Tại Sao (why)" | `// Thử lại vì cái API này cùi bắp hay sập khi load nặng` | GIỮ LẠI — nó mang theo ý đồ mà bản thân code đéo bao giờ có thể diễn đạt được |

**Sự Thừa thãi (Redundancy):**

| Pattern | Tín hiệu | Cách làm đơn giản hóa |
|---------|--------|----------------|
| Logic nhân bản | Chừng 5+ dòng code y chang nhau nằm rải rác | Tách mẹ nó ra thành một shared function |
| Xác chết (Dead code) | Nhánh code đéo bao giờ chạy tới, biến khai báo để đấy, đống code bị comment-out (bôi xám) | Xóa luôn (sau khi chốt sổ 100% là nó đã chết thật) |
| Sự trừu tượng vô dụng | Lớp vỏ bọc (wrapper) đéo mang lại tí giá trị nào | Đập bỏ cái wrapper đi, gọi thẳng vào cái hàm lõi bên trong |
| Vẽ rắn thêm chân (Over-engineered) | Factory đẻ ra factory, Strategy pattern nhưng chỉ có 1 cái strategy | Thay bằng cách gọi hàm trực tiếp thẳng thắn ngây thơ nhất có thể |
| Ép kiểu thừa thãi | Ép một kiểu (Casting) mà Type inference nó đã tự suy ra được rồi | Bỏ cmn cái assertion đó đi |

### Bước 3: Triển khai các thay đổi Từng bước một

Mỗi lần chỉ thực hiện một thay đổi đơn giản hóa duy nhất. Chạy test sau mỗi lần thay đổi đó. **Lưu ý: Submit các thay đổi Refactoring hoàn toàn TÁCH BIỆT với các thay đổi làm Tính năng hoặc Fix bug.** Một cái PR vừa đi refactor code dọn rác, lại vừa đắp thêm chức năng mới, thực chất đó là 2 cái PR gộp làm một — Xé nó ra làm 2 đi.

```text
CHO MỖI LẦN ĐƠN GIẢN HÓA:
1. Sửa code
2. Chạy bộ test suite
3. Nếu test Pass → commit (hoặc tiếp tục đi làm cái simplification tiếp theo)
4. Nếu test Fail → Revert lại (quay xe) và nghĩ lại đi
```

Tránh kiểu dồn cục gom 1 đống các pha dọn code vào chung 1 cái mẻ (commit) to bự và chưa thèm chạy test. Lỡ có gì đó hỏng, bạn bắt buộc phải biết rõ chính xác cú simplification nào là thủ phạm đâm lén.

**Quy tắc của con số 500:** Nếu việc refactoring cần đụng chạm tới hơn 500 dòng code, hãy đầu tư vào automation (như dùng codemods, sed scripts, AST transforms) thay vì hì hục sửa bằng cơm. Việc gõ tay ở quy mô bự như vậy rất dễ đẻ ra lỗi và làm reviewer mệt mỏi đéo chịu nổi.

### Bước 4: Kiểm chứng kết quả (Verify the Result)

Sau khi dọn sạch sẽ xong xuôi, hãy lùi lại và đánh giá lại toàn cục:

```text
SO SÁNH TRƯỚC VÀ SAU:
- Phiên bản dọn xong này có THỰC SỰ dễ hiểu hơn không?
- Bạn có lỡ mồm đẻ ra mấy cái pattern mới phá vỡ sự đồng bộ của codebase không?
- Cái Diff nhìn có sạch sẽ và dễ review không?
- Một đồng nghiệp trong team nhìn cái này liệu có Approve không?
```

Nếu phiên bản "được đơn giản hóa" của bạn lại hóa ra khó hiểu hay khó review hơn lúc đầu, REVERT NGAY. Không phải nỗ lực đơn giản hóa nào cũng mang lại thành công đâu.

## Hướng dẫn theo Ngôn ngữ Cụ thể

### TypeScript / JavaScript

```typescript
// DỌN: Lớp bọc (wrapper) async rườm rà vô dụng
// Lúc trước
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// Sau khi dọn
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// DỌN: Gán giá trị điều kiện (conditional assignment) dài dòng
// Lúc trước
let displayName: string;
if (user.nickname) {
  displayName = user.nickname;
} else {
  displayName = user.fullName;
}
// Sau khi dọn
const displayName = user.nickname || user.fullName;

// DỌN: Gom array bằng cơm cực khổ
// Lúc trước
const activeUsers: User[] = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}
// Sau khi dọn
const activeUsers = users.filter((user) => user.isActive);

// DỌN: Return boolean rườm rà vãi
// Lúc trước
function isValid(input: string): boolean {
  if (input.length > 0 && input.length < 100) {
    return true;
  }
  return false;
}
// Sau khi dọn
function isValid(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
```

### Python

```python
# DỌN: Gom từ điển (dictionary) rườm rà
# Lúc trước
result = {}
for item in items:
    result[item.id] = item.name
# Sau khi dọn
result = {item.id: item.name for item in items}

# DỌN: Câu điều kiện lồng ghép sâu hoắm, hãy xài Early return (Thoát sớm)
# Lúc trước
def process(data):
    if data is not None:
        if data.is_valid():
            if data.has_permission():
                return do_work(data)
            else:
                raise PermissionError("No permission")
        else:
            raise ValueError("Invalid data")
    else:
        raise TypeError("Data is None")
# Sau khi dọn
def process(data):
    if data is None:
        raise TypeError("Data is None")
    if not data.is_valid():
        raise ValueError("Invalid data")
    if not data.has_permission():
        raise PermissionError("No permission")
    return do_work(data)

# DỌN: Code Test API rườm rà lặp đi lặp lại (API Test Assertions)
# Lúc trước
def test_create_order(api_client):
    response = api_client.post("/orders", json={"symbol": "AAPL", "qty": 10})
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["symbol"] == "AAPL"
    assert data["qty"] == 10
    assert data["status"] == "PENDING"
# Sau khi dọn (Tạo Custom Assertion Helper dùng chung)
def test_create_order_clean(api_client):
    response = api_client.post("/orders", json={"symbol": "AAPL", "qty": 10})
    assert_api_success(response, expected_status=201, expected_data={
        "symbol": "AAPL", "qty": 10, "status": "PENDING"
    })
```

### React / JSX

```tsx
// DỌN: Conditional rendering (Render điều kiện) dài dòng
// Lúc trước
function UserBadge({ user }: Props) {
  if (user.isAdmin) {
    return <Badge variant="admin">Admin</Badge>;
  } else {
    return <Badge variant="default">User</Badge>;
  }
}
// Sau khi dọn
function UserBadge({ user }: Props) {
  const variant = user.isAdmin ? 'admin' : 'default';
  const label = user.isAdmin ? 'Admin' : 'User';
  return <Badge variant={variant}>{label}</Badge>;
}

// DỌN: Truyền Prop xuyên táo (Prop drilling) qua 1 tỉ cái components trung gian
// Lúc trước — hãy cân nhắc xem dùng Context hay Composition có giải quyết việc này mượt hơn không.
// ĐÂY LÀ MỘT QUYẾT ĐỊNH MANG TÍNH CÂN NHẮC (Judgment call) — hãy note lại để hỏi, ĐỪNG tự ý auto-refactor.
```

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Nó đang chạy ngon rồi, đụng vào làm gì" | Code đang chạy được nhưng mà đọc đéo hiểu nổi thì đến lúc có bug đéo ai sửa nổi. Chịu khó bỏ công dọn dẹp bây giờ sẽ giúp tiết kiệm hàng đống thời gian bảo trì sau này. |
| "Cứ ít dòng hơn là auto đơn giản hơn" | Một toán tử 3 ngôi (ternary) lồng nhau vứt trên 1 dòng đéo hề "đơn giản" hơn so với 1 cụm if/else chễm chệ 5 dòng. Sự đơn giản nằm ở tốc độ lĩnh hội (comprehension speed), đéo phải ở đếm số dòng code. |
| "Tiện tay để em refactor luôn mấy cái code xung quanh chả liên quan" | Dọn code lang bạt vô kỷ luật sẽ tạo ra một cái Diff rác rưởi ồn ào và kéo theo nguy cơ làm hỏng mẹ cả cái hệ thống mà bạn đéo có ý định đụng vào. Tập trung đi. |
| "Mấy cái Types tự thân nó giải thích như Document rồi" | Types chỉ nói lên "Cấu trúc" (structure), KHÔNG HỀ nói lên "Ý Đồ" (intent). Một hàm với cái tên hay ho sẽ giải thích *tại sao* tốt hơn tỷ lần so với một cái Type signature đang cố giải thích *cái gì*. |
| "Lớp trừu tượng này về sau có khi dùng tới đấy" | Đéo. Đừng có lưu giữ mấy cái sự trừu tượng suy đoán viển vông đó. Nếu hiện tại đéo dùng tới, thì nó chỉ là một cục nợ tốn nơ ron thần kinh chả đem lại xu nào. Xóa cụ nó đi, lúc nào cần thì thêm lại. |
| "Thằng dev lúc trước viết thế này chắc phải có ý của nó" | Có thể. Check cái git blame đi — áp dụng mẹo Hàng rào Chesterton ấy. Nhưng đa phần đống rác phức tạp này chả có lý do củ cẹc gì đâu; nó chỉ là bãi nôn mửa để lại sau mấy pha chạy deadline dưới áp lực vỡ mồm thôi. |
| "Để tí em vừa thêm cái feature này vừa refactor luôn thể" | Tách cmn việc refactoring ra khỏi cái task feature dùm cái. Sửa trộn nhão 2 cái lại với nhau cực kỳ khốn nạn để đi review, để revert quay xe, hay để tra lại lịch sử. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Pha dọn dẹp (Simplification) của bạn khốn nạn tới mức phải đi sửa lại cả bộ Tests để bắt nó báo pass (chắc chắn bạn đã làm thay đổi mẹ cái hành vi của ứng dụng rồi).
- Code "đã được đơn giản" (Simplified code) nhưng còn dài dòng và khó tiêu hóa hơn cả cái máng lợn cũ.
- Đổi tên biến vì lý do cá nhân thích thế thay vì tuân theo chuẩn của dự án.
- Vui tay XÓA LUÔN các đoạn xử lý lỗi (error handling) với lý do hãm tài "làm thế này cho code nó clean (sạch)".
- Hì hục đi dọn dẹp đoạn code mà chính mình còn đéo hiểu nó đang làm cái chó gì.
- Gom một mẻ 1 tỉ cú simplification vào một cái commit to chà bá đéo ai có sức mà review.
- Rảnh háng đi refactor code chả liên quan đéo gì đến cái task hiện tại dù đéo có ai mượn.

## Xác minh (Verification)

Sau khi hoàn tất một đợt càn quét (simplification pass):

- [ ] Tất cả các test cũ đều vẫn PASS XANH LÉT mà không cần phải đi sửa nội dung test.
- [ ] Build thành công không lòi ra cảnh báo (warnings) nào mới.
- [ ] Linter/formatter báo pass (không bị phá bĩnh về mặt thẩm mỹ style).
- [ ] Mỗi thay đổi simplification đều là 1 cái commit tăng dần, có thể review được ngon lành.
- [ ] Cái cục Diff rất sạch sẽ — đéo có rác rưởi không liên quan trộn vào.
- [ ] Code sau khi dọn tuân thủ chuẩn cmn quy ước của dự án (đã đối chiếu chéo với file CLAUDE.md hoặc tương đương).
- [ ] KHÔNG CÓ cái xử lý lỗi (error handling) nào bị bốc hơi hoặc bị làm suy yếu.
- [ ] Đéo còn cái "xác chết" (dead code) nào ở lại (không còn imports dư thừa, không còn các nhánh code chả bao giờ chạy tới).
- [ ] Đồng nghiệp trong team (hoặc một con agent chuyên làm review) gật gù đồng ý là "ừ, cái này sửa trông sáng sủa hơn hẳn, duyệt".
