# Checklist An Toàn, Git Workflow & Anti-Patterns Khi Refactor

## Checklist Xác minh

Trước khi merge refactor branch:

- [ ] Mỗi refactoring step có 1 commit riêng
- [ ] Tất cả tests pass (before và after)
- [ ] Type check pass (nếu có)
- [ ] Linter pass (nếu có)
- [ ] Code coverage không giảm (nếu có)
- [ ] Performance không giảm (nếu quan trọng)
- [ ] Commit messages rõ ràng ("Refactor: Extract ...")
- [ ] KHÔNG có behavior change (functional tests pass)
- [ ] Code review approved (nếu có quy trình)

## Tích hợp với Git Workflow

```bash
# 1. Tạo refactor branch
git checkout -b refactor/extract-order-validator

# 2. Refactor từng bước nhỏ
# ... Extract function
git commit -m "Refactor: Extract validate_quantity()"

# ... Rename
git commit -m "Refactor: Rename f() to calculate_total()"

# ... Extract class
git commit -m "Refactor: Extract OrderValidator class"

# 3. Verify toàn bộ
npm test
npm run lint

# 4. Merge vào main (sau khi user approve)
git checkout main
git merge --no-ff refactor/extract-order-validator
```

**KHÔNG merge refactor branch VÀO feature branch đang code.**

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Refactor khi tests chưa pass
- Trộn refactor với feature mới trong 1 commit
- Refactor quá nhiều trong 1 lần (> 200 dòng)
- Refactor mà không chạy tests
- Refactor code không có tests (viết tests trước)
- Refactor để "làm cho đẹp" mà không có lý do thực tế

✅ **NÊN:**
- Tests pass trước và sau
- Mỗi refactor step = 1 commit nhỏ
- Verify sau mỗi step
- Có lý do rõ ràng (reduce duplication, improve readability)
- Refactor trước khi thêm feature mới (prep work)

## Dấu hiệu Cảnh báo (Red Flags)

Khác với mục Anti-patterns ở trên (những việc không được làm), đây là các **triệu chứng quan sát được** cho thấy đợt refactor đang đi sai hướng. Gặp bất kỳ dấu hiệu nào → dừng, revert về commit xanh gần nhất, chia nhỏ bước lại:

- Phải sửa test để nó pass — hành vi đã đổi, đây không còn là refactor
- Số test pass sau ít hơn trước, dù "chỉ vài test không quan trọng"
- Diff phình quá 200 dòng mà chưa tới điểm dừng an toàn nào
- Không giải thích được vì sao đoạn code cũ tồn tại (Hàng rào Chesterton) nhưng vẫn xoá
- Xuất hiện tham số kiểu boolean/flag mới chỉ để giữ cho hai luồng cũ cùng chạy được
- Lớp trừu tượng mới chỉ có đúng một nơi gọi
- Phải mở quá 3 file cùng lúc mới hiểu được một luồng vừa tách ra — đã tách sai chỗ
- Đang refactor mà phát hiện bug thật, rồi sửa luôn bug đó trong cùng diff
- Chạy test mất quá lâu nên bắt đầu bỏ bước verify giữa các step
- Commit message phải dùng chữ "và" để mô tả (dấu hiệu một commit đang làm hai việc)

## Khi nào dừng Refactor?

**Dừng lại khi:**
- Code đã clean, không còn code smell
- Tests vẫn pass, coverage không giảm
- Team agree code đã "đủ tốt"
- Đã hết thời gian allocated cho refactor
- Risk cao (code critical, không đủ tests)

**Quote:**

> "Make it work, make it right, make it fast."
> — Kent Beck

Refactor nằm ở "make it right".

