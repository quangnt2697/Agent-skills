---
name: planning-and-task-breakdown
description: Chia nhỏ công việc thành các task theo thứ tự. Sử dụng khi bạn có một đặc tả (spec) hoặc yêu cầu rõ ràng và cần chia công việc thành các task có thể thực thi được. Sử dụng khi một task có vẻ quá lớn để bắt đầu, khi bạn cần ước lượng khối lượng công việc, hoặc khi có thể làm việc song song.
---

# Lên Kế hoạch và Chia nhỏ Task

## Tổng quan

Phân rã công việc thành các task nhỏ, có thể xác minh được (verifiable) với các tiêu chí nghiệm thu (acceptance criteria) rõ ràng. Kỹ năng chia nhỏ task tốt chính là ranh giới phân biệt giữa một agent hoàn thành công việc ổn định, đáng tin cậy với một agent tạo ra một mớ bòng bong. Mỗi task phải đủ nhỏ để có thể implement, test, và verify (xác minh) trong một phiên làm việc tập trung duy nhất.

## Khi nào sử dụng

- Bạn có một bản spec và cần chia nó thành các đơn vị có thể code được
- Một task cho cảm giác quá khổng lồ hoặc quá mơ hồ để bắt đầu
- Công việc cần được làm song song (parallelized) qua nhiều agents hoặc nhiều phiên làm việc
- Bạn cần truyền đạt quy mô công việc (scope) cho một con người hiểu
- Thứ tự implement không được rõ ràng cho lắm

**Khi KHÔNG sử dụng:** Những thay đổi chỉ diễn ra trên 1 file duy nhất với phạm vi rõ ràng, hoặc khi bản spec vốn đã vạch sẵn các task rất chi tiết rồi.

## Quy trình Lên kế hoạch

### Bước 1: Bật Chế độ Kế hoạch (Plan Mode)

Trước khi viết bất kỳ đoạn code nào, hãy vận hành ở chế độ read-only (chỉ đọc):

- Đọc spec và các khu vực codebase liên quan
- Nhận diện các pattern và quy ước hiện có
- Vẽ sơ đồ phụ thuộc (dependencies) giữa các component
- Ghi chú lại các rủi ro và các điểm chưa rõ ràng

**TUYỆT ĐỐI KHÔNG viết code trong lúc lên kế hoạch.** Kết quả đầu ra phải là một tài liệu kế hoạch lưu tại `workspace/{issueKey}/tasks/plan.md` và một danh sách task lưu tại `workspace/{issueKey}/tasks/todo.md`, chứ không phải là code.

### Bước 2: Nhận diện Đồ thị Phụ thuộc (Dependency Graph)

Vẽ sơ đồ xem cái gì phụ thuộc vào cái gì:

```
Database schema (Cấu trúc DB)
    │
    ├── API models/types
    │       │
    │       ├── API endpoints
    │       │       │
    │       │       └── Frontend API client
    │       │               │
    │       │               └── UI components
    │       │
    │       └── Validation logic (Logic xác thực)
    │
    └── Seed data / migrations
```

Thứ tự code (Implementation order) sẽ đi theo đồ thị phụ thuộc từ dưới lên trên (bottom-up): xây dựng nền móng trước.

### Bước 3: Cắt lát Dọc (Slice Vertically)

Thay vì xây toàn bộ database, rồi xây toàn bộ API, rồi xây toàn bộ UI — hãy xây dựng trọn vẹn một luồng tính năng mỗi lần:

**Tồi (Cắt lát ngang - horizontal slicing):**
```
Task 1: Xây toàn bộ cấu trúc database (schema)
Task 2: Xây toàn bộ API endpoints
Task 3: Xây toàn bộ UI components
Task 4: Kết nối mọi thứ lại
```

**Tốt (Cắt lát dọc - vertical slicing):**
```
Task 1: User có thể tạo tài khoản (schema + API + UI cho phần đăng ký)
Task 2: User có thể login (schema auth + API + UI cho phần login)
Task 3: User có thể tạo task (schema task + API + UI cho tính năng tạo)
Task 4: User có thể xem danh sách task (câu query + API + UI cho danh sách)
```

Mỗi lát cắt dọc đều mang lại một tính năng có thể chạy được, test được.

### Bước 4: Viết Tasks

Mỗi task tuân theo cấu trúc sau:

```markdown
## Task [N]: [Tiêu đề ngắn gọn mô tả task]

**Mô tả:** Một đoạn văn ngắn giải thích task này sẽ hoàn thành điều gì.

**Tiêu chí nghiệm thu (Acceptance criteria):**
- [ ] [Điều kiện cụ thể, test được]
- [ ] [Điều kiện cụ thể, test được]

**Xác minh (Verification):**
- [ ] Tests pass: [câu lệnh test bám sát trọng tâm của repo]
- [ ] Build thành công: [câu lệnh build của repo]
- [ ] Kiểm tra thủ công: [mô tả những gì cần tự kiểm tra]

**Phụ thuộc (Dependencies):** [Các số hiệu task mà task này phụ thuộc vào, hoặc "None"]

**Các file có khả năng sẽ đụng tới:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Ước tính quy mô:** [Nhỏ: 1-2 files | Vừa: 3-5 files | Lớn: 5+ files]
```

### Bước 5: Sắp xếp và Đặt Chốt kiểm (Checkpoint)

Sắp xếp các task sao cho:

1. Các phụ thuộc (Dependencies) được đáp ứng (xây nền móng trước)
2. Mỗi task đều để lại hệ thống trong một trạng thái hoạt động tốt
3. Chốt kiểm tra xác minh (Verification checkpoints) xuất hiện sau mỗi 2-3 tasks
4. Đẩy các tasks có rủi ro cao lên làm sớm (mô hình fail fast)

Thêm các chốt kiểm tra (checkpoints) rõ ràng:

```markdown
## Chốt kiểm tra: Sau Task 1-3
- [ ] Toàn bộ tests pass
- [ ] Ứng dụng build không lỗi
- [ ] Luồng người dùng (user flow) cốt lõi chạy tốt end-to-end
- [ ] Review với con người trước khi làm tiếp
```

## Hướng dẫn Ước lượng Kích cỡ Task

| Kích cỡ | Files | Quy mô (Scope) | Ví dụ |
|------|-------|-------|---------|
| **XS** | 1 | Một hàm duy nhất hoặc đổi config | Thêm một rule validation |
| **S** | 1-2 | Một component hoặc endpoint | Thêm một API endpoint mới |
| **M** | 3-5 | Một lát cắt tính năng (feature slice) | Luồng đăng ký user |
| **L** | 5-8 | Tính năng gồm nhiều component kết hợp | Tìm kiếm có phân trang và bộ lọc (filtering) |
| **XL** | 8+ | **Quá lớn — phải chia nhỏ tiếp ra** | — |

Nếu một task có size từ L trở lên, nó nên được băm nhỏ thành các task nhỏ hơn. Agent hoạt động tốt nhất với các task size S và M.

**Khi nào cần chia nhỏ task thêm:**
- Nó có vẻ sẽ ngốn nhiều hơn 1 phiên làm việc tập trung (tương đương khoảng hơn 2 tiếng làm việc của agent)
- Bạn không thể mô tả các tiêu chí nghiệm thu (acceptance criteria) gói gọn trong 3 gạch đầu dòng trở xuống
- Nó đụng tới từ hai hệ thống phụ (subsystems) độc lập trở lên (ví dụ: đụng cả auth và thanh toán)
- Bạn phát hiện ra mình đang dùng từ "và" trong tiêu đề task (đây là dấu hiệu nó là 2 tasks gộp lại)

## Đầu ra các File

- **Tài liệu Kế hoạch:** Lưu bản kế hoạch triển khai (implementation plan) vào `workspace/{issueKey}/tasks/plan.md`.
- **Danh sách Task:** Lưu danh sách task theo kiểu checklist vào `workspace/{issueKey}/tasks/todo.md`.

Hãy tự tạo thư mục `workspace/{issueKey}/tasks/` nếu nó chưa tồn tại. Đường dẫn này là quy ước tiêu chuẩn để lệnh `/build` và các tool hạ nguồn (downstream tooling) có thể đọc được.

## Template Tài liệu Kế hoạch (Plan Document Template)

```markdown
# Kế hoạch Triển khai: [Tên Tính năng/Dự án]

## Tổng quan
[Một đoạn tóm tắt chúng ta sẽ xây dựng cái gì]

## Các Quyết định Kiến trúc
- [Quyết định then chốt 1 và lý do]
- [Quyết định then chốt 2 và lý do]

## Danh sách Task (Task List)

### Giai đoạn 1: Nền móng (Foundation)
- [ ] Task 1: ...
- [ ] Task 2: ...

### Chốt kiểm: Nền móng
- [ ] Tests pass, builds sạch sẽ

### Giai đoạn 2: Tính năng Lõi (Core Features)
- [ ] Task 3: ...
- [ ] Task 4: ...

### Chốt kiểm: Tính năng Lõi
- [ ] Luồng end-to-end hoạt động tốt

### Giai đoạn 3: Đánh bóng (Polish)
- [ ] Task 5: ...
- [ ] Task 6: ...

### Chốt kiểm: Hoàn tất
- [ ] Đạt toàn bộ tiêu chí nghiệm thu
- [ ] Sẵn sàng để review

## Rủi ro và Cách khắc phục (Mitigations)
| Rủi ro | Tác động | Khắc phục |
|------|--------|------------|
| [Rủi ro] | [High/Med/Low] | [Chiến lược] |

## Các Câu hỏi Mở (Open Questions)
- [Câu hỏi cần con người giải đáp]
```

## Cơ hội Làm song song (Parallelization)

Khi có nhiều agents hoặc nhiều phiên làm việc cùng lúc:

- **An toàn để làm song song:** Các lát cắt tính năng độc lập, viết test cho tính năng đã code xong, viết tài liệu (docs)
- **Bắt buộc phải làm tuần tự:** Database migrations, đổi thay đổi về shared state, các chuỗi có tính phụ thuộc lẫn nhau
- **Cần điều phối:** Các tính năng dùng chung một API contract (phải chốt định nghĩa contract trước, rồi mới code song song được)

## Các Biện hộ Thường gặp

| Biện hộ | Thực tế |
|---|---|
| "Tới đâu hay tới đó, tôi sẽ tính toán trên đường đi" | Đó là con đường dẫn tới một mớ bòng bong phải đập đi làm lại. 10 phút lên kế hoạch sẽ cứu bạn hàng giờ làm việc. |
| "Mấy cái task này hiển nhiên quá rồi" | Cứ viết nó ra. Đặt các task ra giấy sẽ làm lộ diện những rủi ro ngầm và các edge cases dễ bị lãng quên. |
| "Lên kế hoạch là lãng phí thời gian (overhead)" | Lên kế hoạch chính là làm task rồi. Code mà không có kế hoạch chỉ là hành động gõ phím mù quáng. |
| "Tôi nhớ hết trong đầu mà" | Bộ nhớ ngữ cảnh (Context windows) có giới hạn. Kế hoạch viết ra giấy sẽ tồn tại vượt qua các ranh giới phiên làm việc và không bị thuật toán nén chữ (compaction) nuốt mất. |

## Dấu hiệu Cảnh báo (Red Flags)

- Bắt đầu code mà chưa có một danh sách task viết ra file tử tế
- Các task có nội dung chung chung kiểu "implement tính năng này" mà chả có lấy 1 dòng tiêu chí nghiệm thu (acceptance criteria)
- Không có bước xác minh (verification steps) trong bản kế hoạch
- Toàn bộ tasks đều là size XL
- Không có các điểm chốt kiểm tra (checkpoints) giữa các tasks
- Thứ tự phụ thuộc (Dependency order) không được quan tâm

## Xác minh

Trước khi bắt tay vào code, hãy xác nhận:

- [ ] Mọi task đều có tiêu chí nghiệm thu (acceptance criteria)
- [ ] Mọi task đều có bước xác minh (verification step)
- [ ] Các phụ thuộc của task (Task dependencies) đã được nhận diện và xếp đúng thứ tự
- [ ] Không có task nào đụng tới nhiều hơn ~5 files
- [ ] Các chốt kiểm tra (Checkpoints) đã được cắm giữa các giai đoạn lớn (major phases)
- [ ] Con người đã review và duyệt bản kế hoạch này
