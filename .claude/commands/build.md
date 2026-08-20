---
description: Triển khai các task một cách tăng dần — viết test, code, xác minh. Thêm "auto" để chạy toàn bộ kế hoạch trong một lần duyệt. Tự động tạo feature branch, chỉ commit & merge SAU KHI user approve.
---

Kích hoạt kỹ năng incremental-implementation (triển khai tăng dần) cùng với dev-test-driven-development (TDD).

## Git Workflow Tích hợp

**BẮT BUỘC:** Trước khi bắt đầu code, agent tạo feature branch:
```bash
git checkout -b feature/{issueKey}  # Nếu có issueKey
git checkout -b feature/{task-name}  # Nếu không có issueKey
```

**KHÔNG commit** trong quá trình triển khai. Chỉ commit & merge vào `main` SAU KHI:
- ✅ Toàn bộ tasks hoàn thành
- ✅ Tests pass
- ✅ Build success
- ✅ User approve (trả lời "Yes", "Approve", "OK")

Xem chi tiết: `.claude/rules/git-workflow.md`

## Các chế độ

- **`/build`** — triển khai task *tiếp theo* trong kế hoạch, sau đó dừng lại (cẩn thận, làm từng phần một).
- **`/build auto`** — tạo kế hoạch nếu cần, lấy sự phê duyệt một lần, sau đó triển khai *mọi* task mà không dừng lại ở giữa.

`$ARGUMENTS` xác định chế độ. Chế độ `auto` hoặc `all` là chế độ tự động; bất kỳ thứ gì khác (hoặc để trống) là chế độ mặc định làm từng task một. Lưu ý: chế độ tự động không nhanh hơn *trên mỗi task* — nó vẫn chạy cùng vòng lặp TDD — nó chỉ loại bỏ sự can thiệp của con người *ở giữa* các task.

## Mặc định: một task

Lấy task chưa hoàn thành tiếp theo từ kế hoạch. Sau đó:

1. Đọc các tiêu chí nghiệm thu của task
2. Tải bối cảnh liên quan (code hiện có, pattern, type)
3. Viết một bài test thất bại (RED) mô tả hành vi mong đợi
4. Cài đặt lượng code tối thiểu để pass test (GREEN)
5. Chạy toàn bộ test suite để kiểm tra hồi quy (regression)
6. Chạy build để xác minh không lỗi biên dịch
7. Đánh dấu task đã hoàn thành và dừng lại
8. **KHÔNG commit** — chờ user approve (xem Git Workflow phía trên)

## Tự động: toàn bộ kế hoạch (`/build auto`)

Sử dụng chế độ này khi đã có spec và bạn muốn gộp quá trình lên kế hoạch + lập trình vào một lần chạy. Nó loại bỏ bước duyệt thủ công giữa các task — **không phải** bỏ qua bước xác minh. Mỗi task vẫn phải có một test pass.

1. **Yêu cầu phải có spec.** Chỉ tìm spec ở đường dẫn đã biết: `SPEC.md` tại thư mục gốc, `docs/SPEC.md`, hoặc một file trong `spec/`. README hay tài liệu bất kỳ **không** được tính. Nếu không có spec, dừng lại và yêu cầu user chạy `/spec` trước — không tự bịa ra yêu cầu.
2. **Tạo feature branch.** Kiểm tra xem đã có branch feature chưa. Nếu chưa, tạo branch mới (xem Git Workflow phía trên).
3. **Thiết lập baseline sạch sẽ.** Chạy `git status --porcelain`. Nếu có thay đổi chưa stage ngoài các artifact kế hoạch dự kiến (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tech/plan.md`, `tech/todo.md`), dừng lại và hỏi user để xác nhận cách xử lý.
4. **Lên kế hoạch nếu cần.** Nếu chưa có `tech/plan.md`, gọi kỹ năng planning-and-task-breakdown để tạo.
5. **Một điểm dừng (checkpoint) duy nhất.** Trình bày toàn bộ kế hoạch và chờ câu trả lời đồng ý rõ ràng (vd: "approve", "go", "yes"). Những câu trả lời lấp lửng ("looks reasonable", "I guess") được coi là **không** đồng ý. Đây là cổng kiểm soát duy nhất của con người — sau khi được duyệt, hãy chạy tự động.
6. **Thực thi mọi task theo thứ tự phụ thuộc.** Sử dụng các phụ thuộc (dependency) được khai báo của mỗi task; nếu không khai báo, chạy theo thứ tự liệt kê trong kế hoạch. Với mỗi task, chạy vòng lặp mặc định ở trên (RED → GREEN → hồi quy → build → đánh dấu hoàn thành). **KHÔNG commit** sau mỗi task — tất cả thay đổi được ghi nhận trong working tree.
7. **Dừng lại và hỏi user** (không tự ý đẩy qua) khi:
    - một test không thể pass hoặc build bị hỏng mà không có cách sửa rõ ràng → làm theo kỹ năng dev-debugging
    - spec mơ hồ, hoặc task cần một quyết định mà spec không đề cập
    - một task có rủi ro cao hoặc không thể đảo ngược — thay đổi quyền/auth, di chuyển dữ liệu có tính phá hủy, thanh toán, xóa, deploy, bất kỳ thứ gì đụng đến secret, **hoặc bất kỳ thứ gì bạn không thể hoàn tác (undo) bằng `git revert`** → làm theo kỹ năng dev-doubt-driven-development và yêu cầu ký duyệt rõ ràng trước khi tiếp tục

   Sau khi user giải quyết xong điểm nghẽn, họ gọi lại `/build auto` — nó sẽ tiếp tục từ task chưa hoàn thành tiếp theo.
8. **Trình bày kết quả và chờ approval.** Sau khi hoàn thành tất cả tasks:
   ```markdown
   ✅ Hoàn thành toàn bộ kế hoạch
   
   **Branch:** feature/{branch-name}
   **Tasks hoàn thành:** X/X
   **Tests:** Y passed, 0 failed
   **Build:** Success
   
   **Files changed:**
   - [Liệt kê file đã sửa/thêm/xóa]
   
   **Sẵn sàng commit & merge vào main?** (Yes/No)
   ```
9. **Commit & Merge CHỈ KHI user approve.** Khi user trả lời "Yes", "Approve", "OK":
   ```bash
   git add .
   git commit -m "[{issueKey}] {Summary}
   
   - {Chi tiết task 1}
   - {Chi tiết task 2}
   
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
   
   git checkout main
   git merge --no-ff feature/{branch-name}
   ```

Nếu bất kỳ bước nào thất bại, làm theo kỹ năng dev-debugging.