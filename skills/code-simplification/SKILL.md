---
name: code-simplification
description: Đơn giản hóa code cho rõ ràng. Phân chia logic theo persona: Dev (tối ưu hóa app code, kiến trúc) và QA (tối ưu hóa automation test, BDD, data mock). Sử dụng khi code hiện tại đang chạy tốt nhưng quá khó đọc, khó bảo trì, hoặc chứa sự phức tạp thừa thãi.
---

# Kỹ năng: Đơn giản hóa Code (Code Simplification)

## Tổng quan

Đơn giản hóa code bằng cách giảm bớt sự phức tạp trong khi vẫn giữ nguyên vẹn hành vi của nó. Mục tiêu không phải là viết ít số dòng đi — mục tiêu là viết ra đoạn code dễ đọc hơn, dễ hiểu hơn, dễ sửa đổi, và dễ debug hơn. Mọi nỗ lực đơn giản hóa phải vượt qua bài test: "Liệu một thành viên mới đọc vào cái này có hiểu nó nhanh hơn so với phiên bản gốc không?"

## Khi nào cần sử dụng
- Sau khi tính năng (hoặc test) đã chạy tốt, nhưng cảm giác đang bị nặng nề hơn mức cần thiết.
- Khắc phục sự phức tạp, hàm quá dài, hoặc logic lồng nhau quá sâu.
- Khi refactor lại những đoạn code được viết gấp gáp.

**Khi nào KHÔNG nên sử dụng:**
- Đừng cố làm nó "đơn giản" hơn chỉ vì ngứa tay nếu code đã sạch (clean).
- Bạn chưa thực sự hiểu đoạn code đó làm gì.
- Chuẩn bị đập đi viết lại (rewrite) toàn bộ module đó.

## Phân chia theo Persona (Persona-based Simplification)

Tuỳ thuộc vào việc bạn đang ở vai trò nào, trọng tâm của việc đơn giản hóa sẽ thay đổi:

### 1. NẾU LÀ DEV PERSONA
Tập trung vào **App Code, Logic Nghiệp vụ, Kiến trúc**:
- **Cấu trúc lại luồng điều khiển:** Biến các chuỗi `if/else` lồng nhau thành *guard clauses* (return sớm) hoặc tách thành hàm *helper*.
- **Giảm tải (Offload):** Đưa logic không liên quan ra khỏi các hàm chính, chuyển vào các utility hoặc service tách biệt.
- **Dọn dẹp State:** Giảm thiểu số lượng biến state cần phải theo dõi trong bộ nhớ.
- **Refactor Frontend:** Đơn giản hóa prop drilling, giảm bớt component re-render vô ích, tái sử dụng hook.

### 2. NẾU LÀ QA PERSONA
Tập trung vào **Test Scripts, Automation, BDD Gherkin, Mock Data**:
- **Đơn giản hóa BDD:** Gộp các step Gherkin thừa thãi (vd: "Given I click A", "And I click B" thành "When I navigate to X"). 
- **Tối ưu Fixtures/Mocks:** Đừng truyền một cục JSON khổng lồ nếu test chỉ quan tâm 2 trường. Dùng Data Builder để tạo mock data đơn giản.
- **Gom nhóm Assertions:** Viết hàm *Custom Assertion* (VD: `assert_api_success()`) để tránh việc lặp đi lặp lại 10 dòng check status, header.
- **Dọn dẹp Page Object Model:** Xóa các element locators không dùng tới, tránh duplicate locator.
- **Teardown Gọn gàng:** Đơn giản hóa cơ chế dọn dẹp data rác sau khi test chạy xong.

## Nguyên tắc Đơn giản hóa Chung

### 1. Giữ nguyên vẹn Hành vi (Preserve Behavior Exactly)
Mọi input, output, side effects, và lỗi phải y hệt như cũ. Các bài test cũ VẪN PHẢI PASS mà không cần sửa test.

### 2. Ưu tiên sự Trong sáng hơn sự Rắc rối (Prefer Clarity Over Cleverness)
Code rõ ràng luôn tốt hơn code ngắn gọn nếu như phiên bản súc tích bắt người đọc phải khựng lại suy nghĩ.

### 3. Duy trì sự Cân bằng (Maintain Balance)
Tránh đơn giản hóa quá đà: gộp hàm quá hung hãn, gộp các logic không liên quan, xóa bớt sự trừu tượng có mục đích.

### 4. Chỉ gói gọn ở Chỗ Vừa Sửa (Scope to What Changed)
Chỉ đơn giản hóa ở những đoạn code vừa mới bị sửa đổi gần đây, tránh refactor lan man.

## Quy trình Đơn giản hóa

1. Hiểu Hàng rào Chesterton: Tại sao nó tồn tại?
2. Triển khai các thay đổi Từng bước một. Chạy bộ test suite sau mỗi lần sửa.
3. Nếu test Pass → commit (hoặc đi tiếp). Nếu test Fail → Revert lại ngay.
4. Kiểm chứng kết quả cuối cùng xem có thực sự "đơn giản hơn" không.

## Các Biện hộ Thường gặp

| Lý do biện hộ | Thực tế |
|---|---|
| "Code này chạy tốt rồi, đơn giản hoá làm gì cho rủi ro" | Rủi ro nằm ở lần sửa tiếp theo, không phải hôm nay. Hàm 200 dòng lồng 5 tầng `if` là chỗ bug tiếp theo sẽ sinh ra. |
| "Tôi gộp luôn việc đơn giản hoá vào PR tính năng cho tiện" | Reviewer không phân biệt được đâu là thay đổi hành vi, đâu là dọn dẹp. Diff trộn lẫn thì lỗi hành vi trôi qua review. |
| "Test fail sau khi refactor, sửa test một chút là xong" | Test fail nghĩa là hành vi đã đổi — đó không còn là đơn giản hoá nữa. Revert, rồi làm lại từng bước nhỏ hơn. |
| "Đoạn này thừa, tôi xoá cho gọn" | Hàng rào Chesterton. Chưa biết vì sao nó tồn tại thì chưa được xoá — `git log -S` đoạn code đó trước. |
| "Gộp 3 hàm giống nhau thành 1 hàm tổng quát sẽ DRY hơn" | Ba thứ trông giống nhau nhưng thay đổi vì ba lý do khác nhau thì phải tách riêng. Trừu tượng hoá sai còn đắt hơn lặp code. |
| "Ít dòng hơn nghĩa là đơn giản hơn" | Một biểu thức ba tầng ternary ngắn hơn nhưng khó đọc hơn `if/else`. Thước đo là thời gian người mới hiểu được, không phải số dòng. |

## Xác minh

Chỉ coi là hoàn thành khi tất cả các mục sau đúng:

- [ ] Toàn bộ test suite pass **mà không sửa một dòng test nào**
- [ ] `git diff` chỉ chạm vào các file nằm trong phạm vi đã khai báo — không lan sang module lân cận
- [ ] Không có đoạn `try/except`, kiểm tra null, hay xử lý lỗi nào bị xoá
- [ ] Không có PR nào trộn chung đơn giản hoá với thay đổi tính năng
- [ ] Với persona QA: test vẫn chạy độc lập được (chạy riêng lẻ từng file vẫn pass, không phụ thuộc thứ tự)
- [ ] Trả lời được câu hỏi "người mới đọc bản này có hiểu nhanh hơn bản cũ không?" bằng một lý do cụ thể, không phải cảm tính

## Dấu hiệu Cảnh báo (Red Flags)
- Phải đi sửa lại cả bộ Tests để nó pass (đồng nghĩa đã làm thay đổi hành vi).
- Xóa các đoạn xử lý lỗi (error handling) chỉ để code trông "clean".
- Đổi tên biến vì lý do cá nhân thay vì tuân theo chuẩn dự án.
- Refactor trộn chung PR với chức năng mới.

## Kết hợp
- **Kích hoạt trực tiếp qua:** lệnh `/code-simplify` (áp dụng tự động tuỳ thuộc vào persona hiện tại).
