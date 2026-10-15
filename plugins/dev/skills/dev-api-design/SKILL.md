---
name: dev-api-design
description: Hướng dẫn thiết kế API endpoint REST/GraphQL và giao diện public interface ổn định. Giúp define schema, hợp đồng contract giữa frontend và backend service, xác định ranh giới module.
trigger: Sử dụng khi thiết kế API, ranh giới module, hoặc bất kỳ giao diện công khai nào. Sử dụng khi tạo các endpoint REST hoặc GraphQL, định nghĩa hợp đồng kiểu (type contracts) giữa các module, hoặc thiết lập ranh giới giữa frontend và backend.
---

# Thiết kế API và Giao diện (API and Interface Design)

## Tổng quan

Thiết kế các giao diện ổn định, được tài liệu hóa tốt và khó bị dùng sai. Những giao diện tốt làm cho việc làm đúng trở nên dễ dàng và việc làm sai trở nên khó khăn. Điều này áp dụng cho REST API, GraphQL schema, ranh giới module, component props, và bất kỳ bề mặt nào nơi một đoạn code giao tiếp với đoạn code khác.

## Khi nào sử dụng

- Thiết kế các endpoint API mới
- Định nghĩa ranh giới module hoặc hợp đồng giữa các team
- Tạo giao diện cho component props
- Thiết lập schema cơ sở dữ liệu có ảnh hưởng đến hình dạng API
- Thay đổi các giao diện công khai hiện có

## Các Nguyên tắc Cốt lõi

### Định luật Hyrum (Hyrum's Law)

> Với một số lượng đủ lớn người dùng của một API, tất cả các hành vi có thể quan sát được của hệ thống sẽ bị một ai đó phụ thuộc vào, bất kể bạn hứa hẹn điều gì trong hợp đồng.

Điều này có nghĩa là: mọi hành vi công khai — bao gồm cả những đặc thù không được ghi chép (undocumented quirks), nội dung thông báo lỗi, timing, và thứ tự — sẽ trở thành một hợp đồng thực tế (de facto contract) một khi người dùng phụ thuộc vào nó. Hệ quả trong thiết kế:

- **Hãy chủ đích về những gì bạn phơi bày (expose).** Mọi hành vi có thể quan sát được đều là một cam kết tiềm năng.
- **Không làm rò rỉ chi tiết triển khai (implementation details).** Nếu người dùng có thể quan sát nó, họ sẽ phụ thuộc vào nó.
- **Lên kế hoạch loại bỏ (deprecation) ngay từ lúc thiết kế.** Xem `dev-deprecation-and-migration` để biết cách xóa an toàn những thứ người dùng phụ thuộc vào.
- **Test là không đủ.** Ngay cả với các bài test hợp đồng hoàn hảo, Định luật Hyrum đồng nghĩa với việc các thay đổi "an toàn" vẫn có thể làm hỏng hệ thống của những người dùng thực tế đang phụ thuộc vào hành vi không được tài liệu hóa.

### Quy tắc Một-Phiên-bản (The One-Version Rule)

Tránh buộc những người tiêu thụ (consumers) phải chọn giữa nhiều phiên bản của cùng một dependency hoặc API. Các vấn đề phụ thuộc kim cương (Diamond dependency problems) phát sinh khi các consumer khác nhau cần các phiên bản khác nhau của cùng một thứ. Hãy thiết kế cho một thế giới nơi chỉ có một phiên bản tồn tại tại một thời điểm — mở rộng (extend) thay vì phân nhánh (fork).

### 1. Hợp đồng đi trước (Contract First)

Định nghĩa giao diện trước khi triển khai nó. Hợp đồng chính là bản đặc tả — việc triển khai sẽ theo sau.

```typescript
// Define the contract first
interface TaskAPI {
  // Creates a task and returns the created task with server-generated fields
  createTask(input: CreateTaskInput): Promise<Task>;

  // Returns paginated tasks matching filters
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Returns a single task or throws NotFoundError
  getTask(id: string): Promise<Task>;

  // Partial update — only provided fields change
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Idempotent delete — succeeds even if already deleted
  deleteTask(id: string): Promise<void>;
}
```

### 2. Ngữ nghĩa Lỗi Nhất quán (Consistent Error Semantics)

Chọn một chiến lược xử lý lỗi và sử dụng nó ở mọi nơi:

```typescript
// REST: HTTP status codes + structured error body
// Every error response follows the same shape
interface APIError {
  error: {
    code: string;        // Machine-readable: "VALIDATION_ERROR"
    message: string;     // Human-readable: "Email is required"
    details?: unknown;   // Additional context when helpful
  };
}

// Status code mapping
// 400 → Client sent invalid data
// 401 → Not authenticated
// 403 → Authenticated but not authorized
// 404 → Resource not found
// 409 → Conflict (duplicate, version mismatch)
// 422 → Validation failed (semantically invalid)
// 500 → Server error (never expose internal details)
```

**Không trộn lẫn các pattern.** Nếu một số endpoint ném lỗi (throw), số khác trả về null, và số khác lại trả về `{ error }` — consumer sẽ không thể đoán trước được hành vi.

### 3. Xác thực tại Ranh giới (Validate at Boundaries)

Tin tưởng internal code. Xác thực tại các rìa hệ thống nơi có dữ liệu đầu vào từ bên ngoài:

```typescript
// Validate at the API boundary
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task data',
        details: result.error.flatten(),
      },
    });
  }

  // After validation, internal code trusts the types
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Nơi nên đặt validation:
- API route handlers (user input)
- Form submission handlers (user input)
- Phân tích phản hồi từ dịch vụ bên ngoài (third-party data -- **luôn coi là không đáng tin cậy**)
- Load biến môi trường (configuration)

> **Phản hồi từ API bên thứ ba là dữ liệu không đáng tin cậy.** Xác thực cấu trúc và nội dung của chúng trước khi sử dụng trong bất kỳ logic, rendering, hay ra quyết định nào. Một dịch vụ bên ngoài bị hack hoặc hoạt động sai có thể trả về các type không mong đợi, nội dung độc hại, hoặc văn bản chứa mã độc.

Nơi KHÔNG nên đặt validation:
- Giữa các internal function có chia sẻ type contracts
- Trong các utility function được gọi bởi code đã qua validation
- Trên dữ liệu vừa lấy ra từ chính cơ sở dữ liệu của bạn

### 4. Ưu tiên Thêm mới hơn Sửa đổi (Prefer Addition Over Modification)

Mở rộng giao diện mà không làm hỏng các consumer hiện tại:

```typescript
// Good: Add optional fields
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Added later, optional
  labels?: string[];                       // Added later, optional
}

// Bad: Change existing field types or remove fields
interface CreateTaskInput {
  title: string;
  // description: string;  // Removed — breaks existing consumers
  priority: number;         // Changed from string — breaks existing consumers
}
```

### 5. Đặt tên Dễ đoán (Predictable Naming)

| Pattern         | Convention                           | Example                             |
|-----------------|--------------------------------------|-------------------------------------|
| REST endpoints  | Danh từ số nhiều, không dùng động từ | `GET /api/tasks`, `POST /api/tasks` |
| Query params    | camelCase                            | `?sortBy=createdAt&pageSize=20`     |
| Response fields | camelCase                            | `{ createdAt, updatedAt, taskId }`  |
| Boolean fields  | Tiền tố is/has/can                   | `isComplete`, `hasAttachments`      |
| Enum values     | UPPER_SNAKE                          | `"IN_PROGRESS"`, `"COMPLETED"`      |

## Các Pattern cho REST API

### Thiết kế Resource

```
GET    /api/tasks              → List tasks (có query params để lọc)
POST   /api/tasks              → Create a task
GET    /api/tasks/:id          → Get a single task
PATCH  /api/tasks/:id          → Update a task (partial update)
DELETE /api/tasks/:id          → Delete a task

GET    /api/tasks/:id/comments → List comments for a task (sub-resource)
POST   /api/tasks/:id/comments → Add a comment to a task
```

### Phân trang (Pagination)

Phân trang cho các list endpoint:

```typescript
// Request
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response
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

### Lọc (Filtering)

Sử dụng query parameters cho các bộ lọc:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Cập nhật một phần (Partial Updates - PATCH)

Chấp nhận các object không đầy đủ — chỉ cập nhật những gì được cung cấp:

```typescript
// Only title changes, everything else preserved
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## Các Pattern cho TypeScript Interface

### Sử dụng Discriminated Unions cho các Biến thể (Variants)

```typescript
// Good: Each variant is explicit
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer gets type narrowing
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `In progress (${status.assignee})`;
    case 'completed': return `Done on ${status.completedAt}`;
    case 'cancelled': return `Cancelled: ${status.reason}`;
  }
}
```

### Tách biệt Đầu vào/Đầu ra (Input/Output Separation)

```typescript
// Input: what the caller provides
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: what the system returns (includes server-generated fields)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Sử dụng Branded Types cho ID

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Prevents accidentally passing a UserId where a TaskId is expected
function getTask(id: TaskId): Promise<Task> { ... }
```

## Các Biện hộ Thường gặp

| Biện hộ                                                    | Thực tế                                                                                                                              |
|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| "Chúng ta sẽ viết tài liệu API sau"                        | Các type CHÍNH LÀ tài liệu. Hãy định nghĩa chúng trước.                                                                              |
| "Hiện tại chúng ta chưa cần phân trang"                    | Bạn sẽ cần ngay khi có ai đó đạt mức 100+ items. Hãy thêm nó ngay từ đầu.                                                            |
| "PATCH phức tạp quá, cứ dùng PUT đi"                       | PUT yêu cầu toàn bộ object mỗi lần gọi. PATCH mới là cái mà client thực sự muốn.                                                     |
| "Chúng ta sẽ đánh version cho API khi cần"                 | Những thay đổi phá vỡ (breaking changes) mà không có version sẽ làm hỏng hệ thống của consumer. Hãy thiết kế để mở rộng ngay từ đầu. |
| "Chẳng ai dùng cái hành vi không được tài liệu hóa đó đâu" | Định luật Hyrum: nếu nó quan sát được, ai đó sẽ phụ thuộc vào nó. Hãy coi mọi hành vi công khai là một cam kết.                      |
| "Chúng ta cứ duy trì hai phiên bản là được"                | Nhiều phiên bản sẽ nhân cấp số nhân chi phí bảo trì và tạo ra diamond dependency problems. Ưu tiên Quy tắc Một-Phiên-bản.            |
| "Các internal API thì không cần hợp đồng"                  | Internal consumer vẫn là consumer. Hợp đồng giúp ngăn chặn tight coupling và cho phép làm việc song song.                            |

## Dấu hiệu Cảnh báo (Red Flags)

- Endpoint trả về các hình dạng (shapes) khác nhau tùy thuộc vào điều kiện
- Định dạng lỗi không đồng nhất giữa các endpoint
- Validation nằm rải rác khắp internal code thay vì tập trung tại các ranh giới
- Thay đổi phá vỡ (Breaking changes) ở các trường hiện tại (đổi type, xóa trường)
- List endpoint không có phân trang
- Dùng động từ trong URL REST (`/api/createTask`, `/api/getUsers`)
- API bên thứ ba được sử dụng mà không có validation hoặc sanitization

## Xác minh

Sau khi thiết kế một API:

- [ ] Mọi endpoint đều có schema type cho input và output
- [ ] Các phản hồi lỗi tuân theo một định dạng nhất quán duy nhất
- [ ] Validation chỉ xảy ra tại các ranh giới hệ thống
- [ ] List endpoint hỗ trợ phân trang
- [ ] Các trường mới được thêm vào dưới dạng optional (tương thích ngược)
- [ ] Đặt tên tuân theo quy ước thống nhất trên tất cả endpoint
- [ ] Tài liệu API hoặc các type được commit cùng với file triển khai (implementation)


---
