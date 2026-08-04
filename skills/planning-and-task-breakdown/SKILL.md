---
name: planning-and-task-breakdown
description: Chia nhỏ công việc thành các task có thứ tự. Sử dụng khi bạn đã có một bản spec hoặc yêu cầu rõ ràng và cần phân rã công việc thành các task có thể triển khai. Sử dụng khi một task có vẻ quá lớn để bắt đầu, khi bạn cần ước lượng khối lượng (scope), hoặc khi có thể làm song song nhiều việc.
---

# Kỹ năng: Lên Kế hoạch và Phân rã Công việc (Planning and Task Breakdown)

## Tổng quan

Phân rã công việc thành các task nhỏ, có thể kiểm chứng với các tiêu chí chấp thuận (acceptance criteria) rõ ràng. Việc phân rã task tốt chính là ranh giới giữa một agent hoàn thành công việc một cách đáng tin cậy và một agent tạo ra một mớ bòng bong. Mỗi task nên đủ nhỏ để có thể triển khai, chạy test và xác minh (verify) trong một phiên làm việc tập trung (single focused session).

## Khi nào cần sử dụng

- Bạn đã có một bản spec và cần chia nó thành các đơn vị có thể triển khai.
- Một task có vẻ quá lớn hoặc quá mơ hồ để bắt đầu.
- Công việc cần được làm song song trên nhiều agent hoặc nhiều phiên (sessions).
- Bạn cần truyền đạt phạm vi khối lượng (scope) cho con người.
- Thứ tự triển khai không rõ ràng một cách hiển nhiên.

**Khi nào KHÔNG nên sử dụng:** Các thay đổi chỉ trên một file với phạm vi hiển nhiên, hoặc khi bản spec đã chứa sẵn các task được định nghĩa tốt.

## Quy trình Lên kế hoạch

### Bước 1: Vào Chế độ Lên kế hoạch (Plan Mode)

Trước khi viết bất kỳ đoạn code nào, hãy hoạt động trong chế độ chỉ-đọc (read-only mode):

- Đọc bản spec và các phần code liên quan.
- Xác định các mô hình (patterns) và quy ước (conventions) đang có.
- Ánh xạ sự phụ thuộc (dependencies) giữa các components.
- Ghi chú các rủi ro và những điều chưa biết.

**KHÔNG viết code trong lúc lên kế hoạch.** Đầu ra của bước này là một tài liệu kế hoạch được lưu ở `tasks/plan.md` và một danh sách task được lưu ở `tasks/todo.md`, KHÔNG phải là code thực thi.

### Bước 2: Xác định Đồ thị Phụ thuộc (Dependency Graph)

Ánh xạ cái gì phụ thuộc vào cái gì:

```text
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

Thứ tự triển khai đi theo đồ thị phụ thuộc từ dưới lên (bottom-up): xây dựng nền móng trước. **Đối với các dự án đa nền tảng sử dụng OpenAPI, Hợp đồng API (API Contract - Swagger/OpenAPI spec) phải nằm ở đỉnh cao nhất của đồ thị và được chốt đầu tiên. Điều này cho phép các team Web, App, và Backend làm việc song song.**

### Bước 3: Cắt Lát Dọc (Slice Vertically)

Thay vì xây dựng toàn bộ database, rồi toàn bộ API, rồi toàn bộ UI — hãy xây dựng một luồng tính năng hoàn chỉnh tại một thời điểm:

**Cách làm Tồi (cắt lát ngang):**
```text
Task 1: Xây dựng toàn bộ database schema
Task 2: Xây dựng tất cả các API endpoints
Task 3: Xây dựng tất cả các UI components
Task 4: Kết nối mọi thứ lại
```

**Cách làm Tốt (cắt lát dọc):**
```text
Task 1: Người dùng có thể tạo tài khoản (schema + API + UI cho Đăng ký)
Task 2: Người dùng có thể đăng nhập (schema + API + UI cho Đăng nhập)
Task 3: Người dùng có thể tạo một task (schema + API + UI cho Tạo task)
Task 4: Người dùng có thể xem danh sách task (query + API + UI cho Xem danh sách)
```

**Cách làm Tốt (cắt lát dọc cho lĩnh vực Tài chính/Chứng khoán):**
```text
Task 1: Xác thực số dư tài khoản và quyền (schema + API + UI cho check số dư)
Task 2: Tạo giao dịch nháp (schema + API + UI cho tạo nháp)
Task 3: Gửi và xác minh 2FA/OTP (auth + API + UI cho 2FA)
Task 4: Commit giao dịch với tính ACID (DB transaction + API + UI trạng thái thành công)
```

Mỗi lát cắt dọc sẽ giao (deliver) một tính năng hoạt động được và có thể test được.

### Bước 4: Viết Tasks

Mỗi task tuân theo cấu trúc sau:

```markdown
## Task [N]: [Tiêu đề ngắn gọn mang tính mô tả]

**Mô tả:** Một đoạn văn giải thích những gì task này hoàn thành.

**Tiêu chí chấp thuận (Acceptance criteria):**
- [ ] [Điều kiện cụ thể, test được]
- [ ] [Điều kiện cụ thể, test được]

**Xác minh (Verification):**
- [ ] Tests pass: [câu lệnh test trọng tâm của repo]
- [ ] Build thành công: [câu lệnh build của repo]
- [ ] Kiểm tra thủ công: [mô tả những gì cần check bằng tay]

**Phụ thuộc vào (Dependencies):** [Số thứ tự của task mà task này phụ thuộc, hoặc "Không có"]

**Các file dự kiến sẽ chạm vào:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Ước lượng quy mô:** [Nhỏ: 1-2 file | Vừa: 3-5 file | Lớn: 5+ file]
```

### Bước 5: Sắp xếp và Đặt Checkpoint

Sắp xếp các task sao cho:

1. Các phụ thuộc (dependencies) được thỏa mãn (xây nền móng trước).
2. Mỗi task đều để lại hệ thống trong trạng thái hoạt động bình thường.
3. Các điểm xác minh (checkpoints) xuất hiện sau mỗi 2-3 tasks.
4. Các task có rủi ro cao được đẩy lên sớm (để fail fast).

Thêm các checkpoints rõ ràng:

```markdown
## Checkpoint: Sau Tasks 1-3
- [ ] Tất cả các bài test đều pass
- [ ] Ứng dụng build không có lỗi
- [ ] Luồng người dùng cốt lõi hoạt động từ đầu đến cuối (end-to-end)
- [ ] Review với con người trước khi đi tiếp
```

## Hướng dẫn Định cỡ Task (Task Sizing)

| Kích cỡ | Số Files | Phạm vi (Scope) | Ví dụ |
|------|-------|-------|---------|
| **Rất nhỏ (XS)** | 1 | Đổi một function hoặc config | Thêm một luật validation |
| **Nhỏ (S)** | 1-2 | Một component hoặc endpoint | Thêm một API endpoint mới |
| **Vừa (M)** | 3-5 | Một lát cắt tính năng | Luồng đăng ký người dùng |
| **Lớn (L)** | 5-8 | Tính năng nhiều component | Tìm kiếm có filter và phân trang |
| **Rất lớn (XL)** | 8+ | **QUÁ LỚN — Cần chia nhỏ thêm** | — |

Nếu một task có size L hoặc lớn hơn, nó nên được chia nhỏ thành các task nhỏ hơn. Agent hoạt động tốt nhất trên các task cỡ S và M.

**Khi nào cần chia nhỏ task hơn nữa:**
- Nó sẽ mất hơn một phiên làm việc tập trung (khoảng 2+ giờ làm việc của agent).
- Bạn không thể mô tả các tiêu chí chấp thuận trong vòng 3 gạch đầu dòng.
- Nó chạm tới hai hoặc nhiều hệ thống con độc lập (ví dụ: auth và billing).
- Bạn thấy mình đang viết chữ "và" trong tiêu đề task (một dấu hiệu cho thấy đó là 2 task).

## Output Files

- **Tài liệu kế hoạch (Plan document):** Lưu bản kế hoạch triển khai vào `tasks/plan.md`.
- **Danh sách Task (Task list):** Lưu danh sách dạng checklist vào `tasks/todo.md`.

Tạo thư mục `tasks/` nếu nó chưa tồn tại. Các đường dẫn này là quy ước mà lệnh `/build` và các công cụ theo sau (downstream tooling) mong đợi.

## Template Tài liệu Kế hoạch (Plan Document)

```markdown
# Kế hoạch Triển khai (Implementation Plan): [Tên Tính năng/Dự án]

## Tổng quan
[Một đoạn tóm tắt chúng ta đang xây dựng gì]

## Các quyết định Kiến trúc (Architecture Decisions)
- [Quyết định chính 1 và lý do]
- [Quyết định chính 2 và lý do]

## Danh sách Task (Task List)

### Giai đoạn 1: Nền móng (Foundation)
- [ ] Task 1: ...
- [ ] Task 2: ...

### Checkpoint: Nền móng
- [ ] Test pass, build sạch sẽ

### Giai đoạn 2: Tính năng cốt lõi (Core Features)
- [ ] Task 3: ...
- [ ] Task 4: ...

### Checkpoint: Tính năng cốt lõi
- [ ] Luồng end-to-end hoạt động tốt

### Giai đoạn 3: Trau chuốt (Polish)
- [ ] Task 5: ...
- [ ] Task 6: ...

### Checkpoint: Hoàn thành
- [ ] Thỏa mãn tất cả tiêu chí chấp thuận
- [ ] Sẵn sàng để review

## Rủi ro và Cách giảm thiểu (Risks and Mitigations)
| Rủi ro | Tác động | Cách giảm thiểu |
|------|--------|------------|
| [Rủi ro] | [Cao/Vừa/Thấp] | [Chiến lược] |

## Câu hỏi mở (Open Questions)
- [Câu hỏi cần con người trả lời]
```

## Các Cơ hội Làm song song (Parallelization)

Khi có sẵn nhiều agents hoặc nhiều phiên làm việc:

- **An toàn để làm song song:** Các lát cắt tính năng độc lập, viết test cho tính năng đã code, tài liệu hóa (docs).
- **Bắt buộc phải làm tuần tự:** Migrations database, thay đổi state dùng chung, chuỗi phụ thuộc (dependency chains).
- **Cần điều phối:** Các tính năng có chung Hợp đồng API (API contract) (phải định nghĩa hợp đồng trước, rồi mới làm song song).

## Những lời Biện minh Thường gặp (Rationalizations)

| Lời biện minh | Thực tế |
|---|---|
| "Tới đâu hay tới đó, vừa làm vừa tính" | Đó là cách để biến dự án thành mớ hỗn độn và phải làm lại. 10 phút lên kế hoạch cứu vớt hàng giờ đồng hồ. |
| "Mấy cái task này quá hiển nhiên" | Cứ viết chúng ra. Các task rõ ràng sẽ làm lộ diện những dependencies bị ẩn và các edge cases bị lãng quên. |
| "Lên kế hoạch là rườm rà (overhead)" | Lên kế hoạch CHÍNH LÀ công việc. Cắm đầu code mà không có kế hoạch thì chỉ là gõ phím. |
| "Tôi có thể nhớ hết trong đầu" | Cửa sổ ngữ cảnh (Context windows) là có hạn. Kế hoạch viết ra giấy sẽ tồn tại qua các phiên làm việc và sự thanh lọc bộ nhớ (compaction). |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Bắt đầu triển khai mà không có một danh sách task được viết ra.
- Các task có nội dung kiểu "triển khai tính năng" mà không có tiêu chí chấp thuận.
- Không có các bước xác minh (verification) trong kế hoạch.
- Toàn bộ các task đều là size XL.
- Không có checkpoint nào giữa các task.
- Thứ tự phụ thuộc (dependency) không được xem xét tới.

## Xác minh (Verification)

Trước khi bắt đầu triển khai code, hãy xác nhận:

- [ ] Mọi task đều có tiêu chí chấp thuận.
- [ ] Mọi task đều có bước xác minh (verify).
- [ ] Các dependencies của task được nhận diện và sắp xếp đúng thứ tự.
- [ ] Không có task nào động vào nhiều hơn ~5 files.
- [ ] Có các checkpoints giữa các giai đoạn chính.
- [ ] Con người đã review và phê duyệt kế hoạch.

## Xem thêm

Các tiêu chí chấp thuận (Acceptance criteria) là dành cho từng task riêng lẻ và trả lời câu hỏi "chúng ta đã xây đúng thứ cần xây chưa?". Chúng nằm bên trên Định nghĩa Hoàn thành (Definition of Done) của toàn dự án — cái bar tiêu chuẩn cố định mà mọi task phải vượt qua trước khi được tính là xong. Hãy xem `references/definition-of-done.md`.
