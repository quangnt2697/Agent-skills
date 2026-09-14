---
name: dev-test-driven-development
description: Hướng dẫn phát triển dựa trên kiểm thử (TDD) theo chu trình Red-Green-Refactor, đảm bảo tính đúng đắn trước khi bàn giao.
trigger: Khi triển khai logic nghiệp vụ mới, sửa lỗi (bug fixing) hoặc thay đổi hành vi của chức năng hiện có.
---

# Phát Triển Hướng Kiểm Thử (Test-Driven Development)

## 1. Khi nào dùng?
- Triển khai bất kỳ hàm, module hoặc nghiệp vụ tính toán mới.
- Nhận báo cáo lỗi (Bug fix) → Bắt buộc viết test tái hiện lỗi trước khi sửa (Prove-It pattern).
- Sửa đổi hoặc mở rộng logic của hệ thống hiện hữu.

**Khi KHÔNG sử dụng:**
- Đang thử nghiệm ý tưởng (Spike / Prototyping) và sẽ vứt bỏ mã thử nghiệm sau đó.
- Cấu hình hạ tầng hoặc tài liệu không thể chạy unit test tự động.

## 2. Chu trình TDD Cốt lõi (Vòng lặp 3 Bước)
- **Bước 1 (RED — Viết Test Lỗi):** Viết một test case nhỏ mô tả hành vi mong muốn. Chạy test và **bắt buộc thấy test FAIL** với lý do rõ ràng (chứng minh test không bị false-positive).
- **Bước 2 (GREEN — Làm Test Pass):** Viết lượng code tối thiểu chỉ vừa đủ để test chuyển sang màu XANH. Không thêm logic dư thừa ngoài phạm vi của bài test.
- **Bước 3 (REFACTOR — Dọn dẹp):** Cải thiện cấu trúc mã, loại bỏ trùng lặp, nâng cao tính dễ đọc mà vẫn giữ 100% bài test vượt qua thành công.

## 3. Quy trình Fix Bug "Prove-It"
1. **Viết Reproducing Test:** Viết 1 bài test mô phỏng đúng dữ liệu đầu vào gây ra lỗi.
2. **Chứng kiến Fail:** Chạy test để thấy đúng lỗi đang được báo cáo (RED).
3. **Sửa nguyên nhân gốc rễ:** Áp dụng bản vá tối thiểu vào mã nguồn.
4. **Chứng kiến Pass:** Chạy lại test để xác nhận lỗi đã được khắc phục (GREEN).

## 4. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu nghiên cứu & Kỹ thuật chuyên sâu (references/):**
  - [tdd_patterns_and_best_practices.md](references/tdd_patterns_and_best_practices.md): Kim tự tháp kiểm thử (Test Pyramid), mẫu Arrange-Act-Assert, nguyên tắc DAMP over DRY, hướng dẫn sử dụng DevTools và Subagent.
  - [tdd_verification_and_red_flags.md](references/tdd_verification_and_red_flags.md): Checklist xác minh chất lượng test, các Red Flags cảnh báo (test pass mà không bao giờ fail, test mock quá đà).

## 5. Ví dụ mẫu (Few-shot Example)
- **Yêu cầu:** Thêm hàm tính phí giao dịch chứng khoán: Phí 0.15% giá trị, tối thiểu 10,000 VNĐ.
- **Thực thi:**
  ```python
  # Bước 1 (RED): Viết test trước khi có code hàm
  def test_calculate_fee_minimum():
      assert calculate_trading_fee(order_value=1_000_000) == 10_000

  # Bước 2 (GREEN): Viết mã vừa đủ để pass test
  def calculate_trading_fee(order_value: float) -> float:
      fee = order_value * 0.0015
      return max(fee, 10_000)
  ```
