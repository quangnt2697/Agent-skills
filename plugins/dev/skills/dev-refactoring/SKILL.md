---
name: dev-refactoring
description: Thực hiện refactoring an toàn với checklist TDD Red-Green-Refactor (cleanup code, reduce duplication, improve structure không đổi behavior; extract function, class, rename, move file module và giữ tests pass).
trigger: Sử dụng khi code cần cleanup, giảm duplication (DRY), cải thiện cấu trúc hoặc giải quyết nợ kỹ thuật (tech debt).
---

# Tái Cấu Trúc An Toàn (Safe Refactoring)

## 1. Khi nào dùng?
- Code bị trùng lặp logic (vi phạm DRY) → cần tách hàm/module dùng chung.
- Hàm/lớp quá dài hoặc đảm nhận quá nhiều trách nhiệm (God Object, Long Method).
- Tên biến, tên hàm không rõ nghĩa hoặc chứa các giá trị ma thuật (Magic Numbers).
- Cần dọn dẹp cấu trúc code cũ trước khi thêm tính năng mới.

**Khi KHÔNG sử dụng:**
- Chưa có test suite hoặc các test hiện tại đang bị fail → Phải fix test trước.
- Không refactor lẫn lộn trong cùng một commit với tính năng mới (Tách riêng feature vs refactor).
- Đang gấp deadline không đủ thời gian chạy hồi quy kiểm thử.

## 2. 3 Nguyên Tắc Vàng
1. **Tests MUST Pass trước và sau:** Trước refactor test phải XANH (Green), sau refactor test vẫn phải XANH mà không được sửa logic của bài test.
2. **Refactor riêng, Feature riêng:** Mỗi commit refactor chỉ tập trung dọn code, tuyệt đối không thêm logic nghiệp vụ mới.
3. **Baby Steps (Từng bước nhỏ):** Chia nhỏ thành từng nhịp thay đổi (< 50 dòng), có thể chạy test verify trong vài giây và rollback dễ dàng.

## 3. Quy trình 5 bước thực hiện
- **Bước 0 (Pre-flight Check):** Chạy toàn bộ test suite hiện có để bảo đảm 100% test pass. Tạo branch refactor riêng: `git checkout -b refactor/{task}`.
- **Bước 1 (Nhận diện Code Smell):** Phân tích điểm nghẽn (Trùng lặp, Hàm quá dài, God Object...). Tra cứu mẫu chuẩn tại [code_smells_and_catalog.md](references/code_smells_and_catalog.md).
- **Bước 2 (Chọn kỹ thuật):** Quyết định phương pháp an toàn (Extract Method, Rename, Introduce Parameter Object, Replace Conditional with Polymorphism).
- **Bước 3 (Thực hiện từng bước):** Áp dụng thay đổi code từng bước nhỏ theo đúng nguyên mẫu kỹ thuật.
- **Bước 4 (Verify & Test):** Chạy lại test suite, type-check, linter. Đảm bảo không phát sinh lỗi hoặc cảnh báo mới.
- **Bước 5 (Commit):** Lưu trữ thay đổi với thông điệp rõ ràng (`Refactor: Extract order validation to function`) trước khi chuyển sang bước kế tiếp.

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu nghiên cứu & Danh mục kỹ thuật (references/):**
  - [code_smells_and_catalog.md](references/code_smells_and_catalog.md): Bảng phân loại 8 code smells phổ biến kèm ví dụ Before/After của từng kỹ thuật (Extract Method, Parameter Object, Polymorphism...).
  - [safe_refactoring_checklist.md](references/safe_refactoring_checklist.md): Checklist xác minh an toàn, quy trình branch Git, và các Anti-patterns cần tránh.

## 5. Ví dụ mẫu (Few-shot Example)
- **Input:** Hàm `process_order()` dài 120 dòng chứa cả logic validate số lượng, tính phí và gửi thông báo.
- **Output:**
  ```python
  # Bước 1: Trích xuất logic kiểm tra tính hợp lệ
  def validate_order_quantity(quantity: int) -> None:
      if quantity <= 0 or quantity % 100 != 0:
          raise ValueError("Khối lượng lệnh phải là bội số của 100 và lớn hơn 0")

  # Bước 2: Thay thế trong hàm chính và chạy test
  def process_order(order_data: dict) -> OrderResult:
      validate_order_quantity(order_data["quantity"])
      # ... tiếp tục các bước nhỏ tiếp theo
  ```

---
