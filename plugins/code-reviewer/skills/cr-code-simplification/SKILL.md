---
name: cr-code-simplification
description: 'Đơn giản hóa, simplify code cho rõ ràng, giảm bớt sự phức tạp thừa thãi, tối ưu hóa mã nguồn và test mock nhưng không thay đổi hành vi logic. Dùng khi code chạy tốt nhưng khó đọc, khó bảo trì.'
trigger: Sử dụng khi code hiện tại đang chạy tốt nhưng quá khó đọc, khó bảo trì, hoặc chứa sự phức tạp thừa thãi. Trigger bằng lệnh '/cr-code-simplify' hoặc '/cr-simplify'.
---

# Kỹ năng: Đơn giản hóa Code (Code Simplification)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Đường dẫn file hoặc diff cụ thể cần đơn giản hóa. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Test chạy trước và sau đều exit code 0 (hành vi không đổi); diff thực tế được trình bày.

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

### Quy Ước Comment cho Test Code (QA-exclusive)

Test code có quy ước comment **khác** với app code. Lý do: test code cần rõ **mục tiêu kiểm thử**, không chỉ giải thích code làm gì.

| Convention | Vị trí áp dụng | Mục đích | Ví dụ |
|---|---|---|---|
| `# test-intent: <mục tiêu>` | Đầu mỗi test function | Ghi rõ test này đang kiểm tra điều gì — thay cho "# test case X" mơ hồ | `# test-intent: vượt hạn mức → hệ thống từ chối lệnh` |
| `# simplify: <lý do>` | Trước khi gộp/rút gọn | Gộp test data/assert có chủ ý, ghi rõ tradeoff | `# simplify: gộp 3 assert status thành 1 custom helper` |
| `# boundary: <giá trị>` | Tại giá trị biên trong test data | Phân biệt TRONG/TAI/VUOT hạn mức — tài liệu hóa BVA | `# boundary: 500_001 = VUOT_HAN_MUC_HOSE` |
| `# fixture-scope: <scope>` | Đầu fixture phức tạp | Giải rõ lý do dùng session/module scope | `# fixture-scope: session — auth token tốn 2s khởi tạo` |

**Khác với Ponytail `# ponytail: <lý do>` (chỉ dùng cho app code):**
- Ponytail đánh dấu **simplification trong lúạ code** — áp dụng khi chọn giải pháp đơn giản hơn có chủ ý
- Test conventions đánh dấu **ý định kiểm thử** — giúp QA khác hiểu test này cover gì và vì sao viết vậy

**Never-Cut List cho Test Code** — cấm đơn giản hóa các yếu tố sau:
- ❌ `assert` / `expect` — không xóa assertion dù nó có vẻ thừa
- ❌ `teardown` / `finally` block — data cleanup là bắt buộc
- ❌ Boundary test case `[P0]` — VUOT/TAI/DUOI là một bộ 3, không cắt
- ❌ Error path assertion — kiểm tra mã lỗi là minh chứng hợp đồng phi trực tiếp

## Nguyên tắc Đơn giản hóa Chung

### 1. Giữ nguyên vẹn Hành vi (Preserve Behavior Exactly)
Mọi input, output, side effects, và lỗi phải y hệt như cũ. Các bài test cũ VẪN PHẢI PASS mà không cần sửa test.

### 2. Ưu tiên sự Trong sáng hơn sự Rắc rối (Prefer Clarity Over Cleverness)
Code rõ ràng luôn tốt hơn code ngắn gọn nếu như phiên bản súc tích bắt người đọc phải khựng lại suy nghĩ.

### 3. Duy trì sự Cân bằng (Maintain Balance)
Tránh đơn giản hóa quá đà: gộp hàm quá hung hãn, gộp các logic không liên quan, xóa bớt sự trừu tượng có mục đích.

### 4. Chỉ gói gọn ở Chỗ Vừa Sửa (Scope to What Changed)
Chỉ đơn giản hóa ở những đoạn code vừa mới bị sửa đổi gần đây, tránh refactor lan man.

## 0. Kiểm Tra Trước Khi Đơn Giản Hóa — 7-Rung Ladder (Bắt buộc)

Trước khi viết bất kỳ dòng code thay thế nào, dừng lại và leo theo thước:

```
1. Có cần tồn tại không?       → Không: xóa đi (YAGNI)
2. Đã có trong codebase này?   → Tái sử dụng, không viết lại
3. Stdlib/built-in làm được?   → Dùng ngay, không wrap thêm
4. Platform native hỗ trợ?       → Dùng platform (vd: `input[type=date]` thay date-picker lib)
5. Dependency đã cài có giải?  → Dùng API có sẵn
6. Viết được 1 dòng?           → Viết 1 dòng
7. Không có bước nào ở trên?  → Viết minimum cần thiết
```

**Ladder chạy SAU khi đã hiểu vấn đề** — không phải thay thế việc đọc code.
**"Lazy"** nghĩa là hiệu quả, không cẩu thả: validation, error handling, security, a11y luôn được giữ nguyên.

> Khi động chạm vào simplification có chủ ý (cắt tối đa nhưng vẫn đủ đúng), gọi rõ bằng comment:
> - **App code:** `# ponytail: <lý do>` (VD: `# ponytail: browser has one`)
> - **Test code:** xem Quy ước Comment phía dưới

---

## Quy Ước

## Các Biện hộ Thường gặp

| Lý do biện hộ                                              | Thực tế                                                                                                                            |
|------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| "Code này chạy tốt rồi, đơn giản hoá làm gì cho rủi ro"    | Rủi ro nằm ở lần sửa tiếp theo, không phải hôm nay. Hàm 200 dòng lồng 5 tầng `if` là chỗ bug tiếp theo sẽ sinh ra.                 |
| "Tôi gộp luôn việc đơn giản hoá vào PR tính năng cho tiện" | Reviewer không phân biệt được đâu là thay đổi hành vi, đâu là dọn dẹp. Diff trộn lẫn thì lỗi hành vi trôi qua review.              |
| "Test fail sau khi refactor, sửa test một chút là xong"    | Test fail nghĩa là hành vi đã đổi — đó không còn là đơn giản hoá nữa. Revert, rồi làm lại từng bước nhỏ hơn.                       |
| "Đoạn này thừa, tôi xoá cho gọn"                           | Hàng rào Chesterton. Chưa biết vì sao nó tồn tại thì chưa được xoá — `git log -S` đoạn code đó trước.                              |
| "Gộp 3 hàm giống nhau thành 1 hàm tổng quát sẽ DRY hơn"    | Ba thứ trông giống nhau nhưng thay đổi vì ba lý do khác nhau thì phải tách riêng. Trừu tượng hoá sai còn đắt hơn lặp code.         |
| "Ít dòng hơn nghĩa là đơn giản hơn"                        | Một biểu thức ba tầng ternary ngắn hơn nhưng khó đọc hơn `if/else`. Thước đo là thời gian người mới hiểu được, không phải số dòng. |

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
- **Kích hoạt trực tiếp qua:** lệnh `/cr-code-simplify` (áp dụng tự động tuỳ thuộc vào persona hiện tại).


---
