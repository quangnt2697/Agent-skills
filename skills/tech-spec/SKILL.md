---
name: tech-spec
description: Tạo đặc tả (specs) trước khi lập trình. Sử dụng khi bắt đầu một dự án mới, một tính năng mới, hoặc một thay đổi lớn mà chưa có tài liệu đặc tả nào. Sử dụng khi yêu cầu không rõ ràng, mơ hồ, hoặc chỉ tồn tại như một ý tưởng chung chung.
---

# Kỹ năng: Tech-Spec (Phát triển Dựa trên Đặc tả Kỹ thuật)

## Tổng quan

Viết một tài liệu đặc tả có cấu trúc trước khi viết bất kỳ đoạn code nào. Tài liệu đặc tả (spec) là nguồn sự thật (source of truth) chung giữa bạn và kỹ sư con người — nó định nghĩa những gì chúng ta đang xây dựng, tại sao phải làm, và làm thế nào để biết nó đã hoàn thành. Code mà không có spec thì chỉ là đang đoán mò.

## Khi nào cần sử dụng

- Bắt đầu một dự án hoặc một tính năng mới
- Yêu cầu còn mơ hồ hoặc không đầy đủ
- Thay đổi ảnh hưởng đến nhiều file hoặc nhiều module
- Bạn chuẩn bị đưa ra một quyết định về kiến trúc
- Task đó sẽ mất hơn 30 phút để triển khai

**Khi nào KHÔNG nên sử dụng:** Sửa lỗi một dòng, sửa lỗi chính tả (typo), hoặc các thay đổi có yêu cầu đã rất rõ ràng và độc lập.

## Quy trình Có kiểm soát (Gated Workflow)

Phát triển dựa trên đặc tả có bốn giai đoạn. Đừng chuyển sang giai đoạn tiếp theo cho đến khi giai đoạn hiện tại được xác nhận (validated).

```text
ĐẶC TẢ ──→ LÊN KẾ HOẠCH ──→ CHIA TASKS ──→ TRIỂN KHAI CODE
  │             │              │               │
  ▼             ▼              ▼               ▼
 Người        Người          Người           Người
 Duyệt        Duyệt          Duyệt           Duyệt
```

### Giai đoạn 1: Lên Đặc tả (Specify)

Bắt đầu bằng một tầm nhìn tổng quan. Đặt câu hỏi làm rõ với con người cho đến khi yêu cầu trở nên cụ thể.

**Đưa ra các giả định (assumptions) ngay lập tức.** Trước khi viết bất kỳ nội dung nào của spec, hãy liệt kê những gì bạn đang giả định:

```text
NHỮNG GIẢ ĐỊNH TÔI ĐANG ĐƯA RA:
1. Nền tảng: Đây là một ứng dụng web (không phải mobile app native hay OpenAPI). Nếu yêu cầu làm OpenAPI, nó phải tuân theo thiết kế API-first.
2. Ngữ cảnh Nghiệp vụ: Cái này KHÔNG yêu cầu tuân thủ các chuẩn khắt khe về Fintech/Chứng khoán/Ngân hàng.
3. Xác thực sử dụng cookie dựa trên session (không phải JWT).
4. Database là PostgreSQL (dựa trên schema Prisma hiện có).
→ Hãy sửa tôi ngay bây giờ, nếu không tôi sẽ tiếp tục với những giả định này.
```

Đừng âm thầm lấp đầy những yêu cầu mơ hồ. Toàn bộ mục đích của spec là phơi bày những hiểu lầm *trước khi* code được viết — các giả định ngầm chính là dạng hiểu lầm nguy hiểm nhất.

**Viết một tài liệu spec bao gồm các phần cốt lõi sau:**

1. **Mục tiêu** — Chúng ta đang xây dựng cái gì và tại sao? Ai là người dùng? Thế nào là thành công?

2. **Yêu cầu Nghiệp vụ Đặc thù (Tập trung vào Fintech/Ngân hàng/Chứng khoán)** — 
   - Định nghĩa các cơ chế Bảo mật (Xác thực/Phân quyền, mã hóa).
   - Định nghĩa yêu cầu Độ chính xác (ví dụ: làm tròn số thực float, định dạng tiền tệ).
   - Định nghĩa Khả năng Kiểm toán (Audit logs, lịch sử giao dịch, tính bất biến - immutability).

3. **Đặc tả Nền tảng (Platform Specs)** — 
   - **OpenAPI/Backend:** Định nghĩa schema và hợp đồng API trước tiên (thiết kế API-first).
   - **Web/App:** Định nghĩa xử lý trạng thái mạng (chế độ offline, logic thử lại - retry), kỳ vọng về độ trễ, và quản lý state.

4. **Câu lệnh (Commands)** — Ghi đầy đủ các câu lệnh có thể thực thi với các tham số cờ (flags), đừng chỉ ghi tên công cụ.
   ```text
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

5. **Cấu trúc Dự án** — Mã nguồn (source code) nằm ở đâu, file test đặt ở đâu, tài liệu (docs) thuộc về đâu.
   ```text
   src/           → Mã nguồn ứng dụng
   src/components → Các component React
   src/lib        → Các tiện ích dùng chung
   tests/         → Unit test và integration test
   e2e/           → End-to-end test
   docs/          → Tài liệu dự án
   ```

6. **Phong cách Code (Code Style)** — Một đoạn code snippet thực tế thể hiện phong cách của bạn sẽ tốt hơn ba đoạn văn mô tả nó. Bao gồm các quy ước đặt tên, quy tắc định dạng (formatting), và ví dụ về output chuẩn.

7. **Chiến lược Kiểm thử (Testing Strategy)** — Dùng framework gì, file test nằm ở đâu, kỳ vọng độ phủ (coverage) là bao nhiêu, mức độ test nào cho khía cạnh nào.

8. **Ranh giới (Boundaries)** — Hệ thống 3 cấp độ:
   - **Luôn luôn làm:** Chạy test trước khi commit, tuân thủ quy ước đặt tên, validate dữ liệu đầu vào.
   - **Phải hỏi trước:** Thay đổi schema Database, thêm thư viện mới (dependencies), thay đổi cấu hình CI.
   - **Tuyệt đối KHÔNG làm:** Commit các khóa bí mật (secrets), chỉnh sửa trực tiếp trong thư mục vendor/node_modules, xóa các test đang bị lỗi mà không được phê duyệt.

**Template mẫu cho Spec:**

```markdown
# Spec: [Tên Dự án/Tính năng]

## Mục tiêu
[Chúng ta đang xây dựng gì và tại sao. User stories hoặc acceptance criteria.]

## Yêu cầu Nghiệp vụ Đặc thù
[Yêu cầu về Fintech/Ngân hàng/Chứng khoán: Bảo mật, Độ chính xác, Kiểm toán]

## Đặc tả Nền tảng
[OpenAPI schemas, Xử lý trạng thái mạng Web/App, và độ trễ]

## Tech Stack
[Framework, ngôn ngữ, các thư viện chính kèm phiên bản]

## Các Câu lệnh
[Build, test, lint, dev — viết lệnh đầy đủ]

## Cấu trúc Dự án
[Sơ đồ thư mục kèm mô tả]

## Code Style
[Ví dụ snippet + quy ước chính]

## Chiến lược Kiểm thử
[Framework, vị trí file test, yêu cầu coverage, các cấp độ test]

## Ranh giới
- Luôn luôn: [...]
- Phải hỏi trước: [...]
- Tuyệt đối Không: [...]

## Tiêu chí Thành công
[Làm sao để biết tính năng đã hoàn thành — các điều kiện cụ thể, có thể test được]

## Câu hỏi Mở (Open Questions)
[Bất kỳ điều gì chưa được giải quyết và cần con người nhập liệu/quyết định]
```

**Tái cấu trúc (Reframe) các hướng dẫn thành tiêu chí thành công.** Khi nhận được các yêu cầu mơ hồ, hãy dịch chúng thành các điều kiện cụ thể:

```text
YÊU CẦU: "Làm cho dashboard nhanh hơn"

TIÊU CHÍ THÀNH CÔNG (ĐÃ ĐƯỢC LÀM RÕ):
- Dashboard LCP < 2.5s trên kết nối 4G
- Tải dữ liệu ban đầu hoàn tất trong < 500ms
- Không bị nhảy layout trong lúc tải (CLS < 0.1)
→ Đây có đúng là những mục tiêu cần đạt không?
```

Điều này cho phép bạn lặp lại, thử lại và giải quyết vấn đề hướng tới một mục tiêu rõ ràng thay vì đoán xem "nhanh hơn" nghĩa là gì.

### Giai đoạn 2: Lên Kế hoạch (Plan)

Với bản spec đã được duyệt, hãy tạo ra một kế hoạch triển khai kỹ thuật:

1. Xác định các component chính và sự phụ thuộc giữa chúng.
2. Xác định thứ tự triển khai (cái gì phải được xây dựng trước).
3. Ghi chú các rủi ro và chiến lược giảm thiểu.
4. Xác định cái gì có thể xây dựng song song và cái gì phải tuần tự.
5. Định nghĩa các điểm kiểm tra (checkpoints) để xác minh giữa các giai đoạn.

> Hãy tuân theo kỹ năng `planning-and-task-breakdown` để biết cơ chế ánh xạ sơ đồ phụ thuộc (dependency-graph mapping) và cắt lát dọc (vertical-slicing) đằng sau các bước này; đó là nguồn hướng dẫn chuẩn mực. Các gạch đầu dòng ở trên chỉ là bản tóm tắt nhẹ; nếu chúng có sự khác biệt, hãy ưu tiên làm theo `planning-and-task-breakdown`.
>
> **Quy ước Đầu ra:** Lưu bản kế hoạch vào `tasks/plan.md` và danh sách công việc vào `tasks/todo.md`, theo quy ước của lệnh `/plan`. Hãy tạo thư mục `tasks/` nếu nó chưa tồn tại. Các lệnh tiếp theo (`/build`, v.v.) sẽ mong đợi đọc từ các đường dẫn này.

Bản kế hoạch phải review được: con người phải có thể đọc nó và nói "đúng, đó là cách tiếp cận chuẩn" hoặc "không, hãy thay đổi chỗ X."

### Giai đoạn 3: Phân rã Tasks

Chia nhỏ kế hoạch thành các task riêng biệt, có thể triển khai được:

- Mỗi task nên có thể hoàn thành trong một phiên làm việc tập trung (single focused session).
- Mỗi task phải có các tiêu chí chấp thuận (acceptance criteria) rõ ràng.
- Mỗi task bao gồm một bước xác minh (verify) (chạy test, build, hoặc kiểm tra thủ công).
- Các task được sắp xếp theo thứ tự phụ thuộc (dependency), KHÔNG phải theo mức độ quan trọng cảm tính.
- Không task nào được phép yêu cầu thay đổi nhiều hơn ~5 files.

> Hãy tuân theo kỹ năng `planning-and-task-breakdown` để biết toàn bộ cơ chế định cỡ task (task-sizing) và sắp xếp thứ tự; đó là nguồn chuẩn mực. Template bên dưới chỉ là một hình thức tham khảo nhanh; nếu có sự khác biệt, hãy ưu tiên làm theo `planning-and-task-breakdown`.

**Template cho Task:**
```markdown
- [ ] Task: [Mô tả]
  - Tiêu chí chấp thuận: [Điều gì phải ĐÚNG khi làm xong]
  - Xác minh: [Làm sao để xác nhận — câu lệnh test, build, check bằng tay]
  - Files: [Những file nào sẽ bị chỉnh sửa]
```

### Giai đoạn 4: Triển khai (Implement)

Thực thi các task từng cái một (one at a time) tuân theo `skills/incremental-implementation/SKILL.md` (`incremental-implementation`) và `skills/test-driven-development/SKILL.md` (`test-driven-development`). Hãy sử dụng `skills/context-engineering/SKILL.md` (`context-engineering`) để tải lên đúng các phần của spec và các file source code cần thiết ở mỗi bước, thay vì dội bom (flooding) agent với toàn bộ tài liệu spec khổng lồ.

## Giữ cho Spec luôn sống (Living Document)

Spec là một tài liệu sống, không phải là một tạo tác làm một lần rồi bỏ:

- **Cập nhật khi quyết định thay đổi** — Nếu bạn phát hiện ra data model cần thay đổi, hãy cập nhật spec trước, sau đó mới implement code.
- **Cập nhật khi phạm vi thay đổi** — Các tính năng được thêm vào hay cắt bỏ phải được phản ánh trong spec.
- **Commit spec lên git** — Bản spec thuộc về version control song hành cùng code.
- **Tham chiếu spec trong PRs (Pull Requests)** — Hãy chèn link trỏ lại phần nội dung spec mà mỗi PR đang thực hiện.

## Những lời Biện minh Thường gặp (Rationalizations)

| Lời biện minh | Thực tế |
|---|---|
| "Cái này đơn giản lắm, tôi không cần spec" | Các task đơn giản không cần spec *dài*, nhưng chúng vẫn cần tiêu chí chấp thuận. Một cái spec 2 dòng là hoàn toàn bình thường. |
| "Tôi sẽ viết spec sau khi tôi code xong" | Đó gọi là tài liệu hóa (documentation), không phải đặc tả (specification). Giá trị của spec nằm ở việc ép buộc sự rõ ràng *trước khi* có code. |
| "Viết spec sẽ làm chậm tiến độ của chúng ta" | Dành 15 phút viết spec giúp ngăn chặn hàng giờ làm lại (rework). Làm Waterfall trong 15 phút tốt hơn là đi debug suốt 15 tiếng. |
| "Đằng nào yêu cầu cũng sẽ thay đổi thôi" | Đó là lý do tại sao spec phải là một tài liệu sống. Một spec hơi lỗi thời vẫn tốt hơn là không có spec nào. |
| "Người dùng biết họ muốn gì" | Kể cả những yêu cầu có vẻ rất rõ ràng vẫn có những giả định ngầm. Spec sẽ phơi bày những giả định đó. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Bắt đầu viết code mà không có bất kỳ yêu cầu nào được viết ra.
- Hỏi "tôi cứ bắt đầu làm nhé?" trước khi làm rõ định nghĩa "thế nào là xong" (done).
- Triển khai các tính năng không được đề cập trong bất kỳ spec hoặc danh sách task nào.
- Đưa ra các quyết định về kiến trúc mà không ghi chép (document) chúng lại.
- Bỏ qua việc viết spec vì cho rằng "nó quá hiển nhiên rồi, ai cũng biết phải làm gì".

## Xác minh (Verification)

Trước khi tiến tới triển khai code, hãy xác nhận:

- [ ] Spec đã bao phủ toàn bộ 8 phần cốt lõi.
- [ ] Con người đã review và phê duyệt spec.
- [ ] Các tiêu chí thành công cụ thể và có thể kiểm thử (testable).
- [ ] Các ranh giới (Luôn luôn / Hỏi trước / Tuyệt đối không) đã được định nghĩa.
- [ ] Bản spec đã được lưu thành một file trong kho lưu trữ dự án.
