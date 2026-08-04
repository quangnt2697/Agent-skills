---
name: api-and-interface-design
description: Hướng dẫn thiết kế các giao diện và API ổn định. Sử dụng khi thiết kế APIs, các ranh giới module, hoặc bất kỳ giao diện công khai nào. Sử dụng khi tạo REST hoặc GraphQL endpoints, định nghĩa các hợp đồng kiểu dữ liệu (type contracts) giữa các module, hoặc thiết lập ranh giới giữa frontend và backend.
---

# Kỹ năng: Thiết kế API và Giao diện (API and Interface Design)

## Tổng quan

Thiết kế các giao diện ổn định, được document tốt, và khó bị dùng sai (hard to misuse). Một giao diện tốt là làm cho việc dùng đúng thì dễ dàng, còn dùng sai thì khó khăn. Điều này áp dụng cho REST APIs, GraphQL schemas, ranh giới giữa các module, các props của component, và bất kỳ bề mặt giao tiếp nào mà đoạn code này nói chuyện với đoạn code khác.

## Khi nào cần sử dụng

- Khi thiết kế các endpoint API mới.
- Khi định nghĩa ranh giới giữa các module hoặc các hợp đồng giao kèo (contracts) giữa các team.
- Khi tạo các component prop interfaces.
- Khi thiết lập cấu trúc database (database schema) có ảnh hưởng đến định dạng của API.
- Khi thay đổi các giao diện công khai (public interfaces) đang tồn tại.

## Các Nguyên tắc Cốt lõi (Core Principles)

### Định luật Hyrum (Hyrum's Law)

> Khi có đủ số lượng người dùng sử dụng API của bạn, thì tất cả những hành vi có thể quan sát được của hệ thống đều sẽ bị một ai đó dựa dẫm vào (depended on), bất kể bạn có hứa hẹn gì trong cái hợp đồng API hay không.

Điều này có nghĩa là: Mọi hành vi quan sát được — bao gồm cả những đặc tính kỳ cục không hề ghi trong tài liệu, nội dung câu báo lỗi, độ trễ (timing), hay thứ tự sắp xếp — đều sẽ tự động trở thành một bản hợp đồng thực tế (de facto contract) một khi user đã trót phụ thuộc vào nó. Ý nghĩa đối với việc thiết kế:

- **Phải có chủ đích về những gì bạn phơi bày ra ngoài (expose).** Mọi hành vi quan sát được đều là một sự cam kết tiềm tàng.
- **Đừng để rò rỉ chi tiết cài đặt bên trong (implementation details).** Nếu user có thể nhìn thấy nó, họ sẽ phụ thuộc vào nó.
- **Lên kế hoạch loại bỏ (deprecation) ngay từ khâu thiết kế.** Xem kỹ năng `deprecation-and-migration` để biết cách tháo gỡ an toàn những thứ mà user đang phụ thuộc vào.
- **Tests thôi là chưa đủ.** Ngay cả với những bài test hợp đồng (contract tests) hoàn hảo nhất, Định luật Hyrum nói rằng những thay đổi tưởng như "an toàn" vẫn có thể đấm vỡ mặt các user ngoài đời thực vì họ lỡ phụ thuộc vào một hành vi ngầm không được ghi trong tài liệu.

### Quy tắc Một-Phiên-bản (The One-Version Rule)

Tránh việc ép người dùng (consumers) phải chọn lựa giữa nhiều versions khác nhau của cùng một dependency hoặc API. Vấn đề phụ thuộc hình kim cương (Diamond dependency) sẽ phát sinh khi các consumer khác nhau lại cần các version khác nhau của cùng một thứ. Hãy thiết kế cho một thế giới nơi chỉ có một phiên bản duy nhất tồn tại ở một thời điểm — hãy mở rộng (extend) thay vì chẻ nhánh (fork).

### 1. Hợp đồng đi trước (Contract First)

Định nghĩa cái Giao diện/Hợp đồng (Interface/Contract) trước khi bắt tay vào code nó. Hợp đồng chính là bản đặc tả (spec) — việc code (implementation) đi theo sau.

```typescript
// Định nghĩa hợp đồng (contract) trước
interface TaskAPI {
  // Tạo task và trả về task đã tạo bao gồm các trường do server tự sinh (server-generated)
  createTask(input: CreateTaskInput): Promise<Task>;

  // Trả về danh sách task có phân trang khớp với các điều kiện lọc
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Trả về 1 task hoặc quăng lỗi NotFoundError
  getTask(id: string): Promise<Task>;

  // Update một phần — chỉ thay đổi những trường được truyền vào
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Xóa có tính lũy đẳng (Idempotent) — báo thành công ngay cả khi nó đã bị xóa từ trước rồi
  deleteTask(id: string): Promise<void>;
}
```

### 2. Ngữ nghĩa Báo lỗi Nhất quán (Consistent Error Semantics)

Hãy chọn ra ĐÚNG MỘT chiến lược báo lỗi và dùng nó ở mọi nơi:

```typescript
// REST: Mã HTTP status codes + Body báo lỗi có cấu trúc (structured)
// Mọi cục response báo lỗi đều phải tuân theo đúng 1 cái form này
interface APIError {
  error: {
    code: string;        // Máy đọc được: "VALIDATION_ERROR"
    message: string;     // Người đọc được: "Bắt buộc phải nhập Email"
    details?: unknown;   // Bối cảnh bổ sung nếu cần thiết
  };
}

// Bảng map các Status code
// 400 → Client gửi data láo (invalid)
// 401 → Chưa đăng nhập (Not authenticated)
// 403 → Đã đăng nhập nhưng không có quyền (Not authorized)
// 404 → Không tìm thấy tài nguyên (Resource not found)
// 409 → Xung đột (Conflict - trùng lặp, lệch version)
// 422 → Tạch Validation (sai ngữ nghĩa)
// 500 → Server hỏng (TUYỆT ĐỐI KHÔNG BẮN CHI TIẾT LỖI RA NGOÀI)
```

**Đừng trộn lẫn các pattern.** Nếu vài endpoint thì ném lỗi (throw), vài cái khác thì trả về `null`, và vài cái lại trả về `{ error }` — người dùng API sẽ đéo thể nào lường trước được hành vi.

### 3. Validate tại Ranh giới (Validate at Boundaries)

Hãy tin tưởng code nội bộ. Chỉ Validate tại các ranh giới ngoại biên nơi dữ liệu bên ngoài đi vào:

```typescript
// Validate tại ranh giới API
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu task không hợp lệ',
        details: result.error.flatten(),
      },
    });
  }

  // Sau cổng validation, code bên trong hoàn toàn tin tưởng vào cái Types đó
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Nơi BẮT BUỘC phải đặt Validation:
- Các hàm xử lý API route (dữ liệu do user nhập)
- Các hàm xử lý Form submit (dữ liệu do user nhập)
- Parse các response từ External service (dữ liệu của bên thứ ba -- **luôn coi đó là dữ liệu không đáng tin**)
- Load các biến môi trường (environment variables - cấu hình)

> **Các kết quả trả về (responses) từ API của bên thứ 3 là dữ liệu KHÔNG ĐÁNG TIN.** Hãy validate hình dáng (shape) và nội dung của chúng trước khi xài chúng vào bất kỳ logic, màn hình render, hay quyết định nào. Một dịch vụ bên ngoài bị hack hoặc dở chứng có thể trả về sai type, chứa nội dung độc hại, hoặc chứa các câu text thao túng (instruction-like text).

Nơi ĐỪNG đi Validate thừa thãi:
- Giữa các function nội bộ đang dùng chung một bộ type contracts (hợp đồng type).
- Bên trong các utility functions được gọi bởi một đoạn code đã được validate từ trước.
- Trên các cục dữ liệu vừa được móc ra từ chính cái Database nhà bạn.

### 4. Ưu tiên Thêm mới Hơn là Sửa đổi (Prefer Addition Over Modification)

Hãy mở rộng các interfaces mà không làm hỏng ứng dụng của những người đang xài nó (existing consumers):

```typescript
// Tốt (Good): Thêm các trường tự chọn (optional)
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Được thêm vào sau này, optional
  labels?: string[];                       // Được thêm vào sau này, optional
}

// Tệ (Bad): Đổi type của các trường hiện có, hoặc xóa trường đi
interface CreateTaskInput {
  title: string;
  // description: string;  // Xóa mẹ đi rồi — làm hỏng đống app đang xài
  priority: number;         // Đổi type từ string sang number — app của thiên hạ hỏng hết
}
```

### 5. Đặt tên Dễ đoán (Predictable Naming)

| Pattern | Quy ước (Convention) | Ví dụ (Example) |
|---------|-----------|---------|
| REST endpoints | Danh từ Số nhiều (Plural nouns), Không có Động từ | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | tiền tố is/has/can | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

## Các Mô hình REST API (REST API Patterns)

### Thiết kế Tài nguyên (Resource Design)

```text
GET    /api/tasks              → Lấy danh sách tasks (dùng query params để lọc)
POST   /api/tasks              → Tạo một task mới
GET    /api/tasks/:id          → Lấy chi tiết một task
PATCH  /api/tasks/:id          → Update một task (update một phần - partial)
DELETE /api/tasks/:id          → Xóa một task

GET    /api/tasks/:id/comments → Lấy danh sách comments của một task (tài nguyên con - sub-resource)
POST   /api/tasks/:id/comments → Đăng một comment vào một task
```

### Phân trang (Pagination)

Phân trang cho tất cả các endpoint trả về danh sách:

```typescript
// Yêu cầu (Request)
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Phản hồi (Response)
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Lọc dữ liệu (Filtering)

Dùng query parameters để làm bộ lọc:

```text
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Update Một phần (Partial Updates - dùng method PATCH)

Chấp nhận các object bị khuyết thiếu (partial objects) — user gửi lên trường (field) nào thì chỉ update trường đó:

```typescript
// Chỉ thay đổi title, các trường khác giữ nguyên
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## Các Mô hình TypeScript Interface (TypeScript Interface Patterns)

### Dùng Discriminated Unions cho Các Biến thể (Variants)

```typescript
// Tốt: Từng biến thể (variant) được định nghĩa rất rõ ràng
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer khi xài sẽ được TypeScript gánh (type narrowing)
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `Đang làm (${status.assignee})`;
    case 'completed': return `Xong lúc ${status.completedAt}`;
    case 'cancelled': return `Hủy vì: ${status.reason}`;
  }
}
```

### Tách bạch Input/Output

```typescript
// Input: những gì cái thằng gọi hàm/API truyền vào
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: những gì hệ thống trả ra (Bao gồm các trường do server tự sinh)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Dùng Branded Types cho các loại ID

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Ngăn chặn sự ngu ngốc khi lỡ tay truyền một cái UserId vào chỗ đòi TaskId
function getTask(id: TaskId): Promise<Task> { ... }
```

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Thôi để sau này viết document cho API sau cũng được" | Bản thân cái đống Types CHÍNH LÀ document rồi. Định nghĩa chúng trước đi. |
| "Bây giờ chưa cần phải Phân trang đâu" | Mày sẽ cần ngay cái khoảnh khắc có thằng lồn nào đấy tạo ra 100+ items. Nhét mẹ phân trang vào ngay từ đầu đi. |
| "PATCH lằng nhằng vãi, xài PUT cho nhanh" | PUT bắt thằng client phải gửi toàn bộ nguyên cục object to đùng mỗi lần update. PATCH mới là thứ mà bọn client thực sự muốn. |
| "Lúc nào cần thì bọn tao sẽ gắn version cho API sau" | Các Breaking changes (thay đổi làm gãy cấu trúc) mà không có versioning sẽ giết chết app của consumers. Hãy thiết kế để dễ dàng Mở rộng (extension) ngay từ ngày 1. |
| "Chả có thằng đéo nào xài mấy cái behavior ẩn đéo có trong document đó đâu" | Định luật Hyrum: Nếu mày phơi ra ngoài, sẽ có thằng dùng. Hãy coi mọi hành vi công khai (public behavior) là một lời cam kết. |
| "Bọn tao maintain 2 phiên bản song song cũng được, chả sao" | Nhiều versions sẽ nhân hệ số nhân cái chi phí maintain và đẻ ra vấn đề Diamond dependency. Hãy tuân thủ Quy tắc Một-Phiên-Bản. |
| "Mấy cái API gọi nội bộ (Internal) cần quái gì Hợp đồng (contracts)" | Consumer nội bộ bản chất VẪN LÀ consumers. Hợp đồng giúp ngăn chặn sự dính chùm (coupling) và cho phép các team làm việc song song (parallel work). |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Các endpoint trả về các cấu trúc (shapes) khác nhau tùy thuộc vào câu if/else.
- Các định dạng báo lỗi (error formats) không đồng nhất giữa các endpoints.
- Đống Validation rải rác khắp nơi bên trong lõi code thay vì đứng gác tại biên giới ranh giới (boundaries).
- Đẻ ra các breaking changes làm hỏng các trường (fields) hiện tại (đổi type, xóa trường).
- API trả về danh sách (List) mà đéo thèm làm phân trang (pagination).
- Nhét cả Động từ (Verbs) vào trong URL của REST (`/api/createTask`, `/api/getUsers`).
- Bốc nguyên cục response từ API bên thứ ba (Third-party) xài luôn mà đéo thèm validate hay làm sạch (sanitization).

## Xác minh (Verification)

Sau khi thiết kế xong một cái API:

- [ ] Mọi endpoint đều phải được define Type rõ ràng cho cả Input và Output.
- [ ] Các thông báo lỗi (Error responses) tuân thủ duy nhất 1 format đồng nhất.
- [ ] Validation chỉ được phép diễn ra tại các ranh giới của hệ thống.
- [ ] Các endpoint trả về list bắt buộc phải có phân trang.
- [ ] Các trường (fields) thêm mới phải là dạng bổ sung (additive) và không bắt buộc (optional) (để tương thích ngược - backward compatible).
- [ ] Đặt tên chuẩn chỉnh theo quy ước chung xuyên suốt mọi endpoints.
- [ ] API documentation hoặc đống Types phải được commit ngay sát sạt với code implementation.
