---
name: qa-code2spec
description: Dịch ngược mã nguồn (Reverse Engineering) thành tài liệu đặc tả nghiệp vụ chuẩn (final.md) thông qua kiểm tra đồng bộ GitLab và truy vết đồ thị phụ thuộc (Deep Trace).
trigger: Khi cần dựng lại tài liệu đặc tả từ codebase sẵn có, tiếp nhận module legacy hoặc đối chiếu code thực tế với spec. Trigger bằng lệnh /qa-code2spec {đường_dẫn_file_api}.
---

# Kỹ Năng Dịch Ngược Code Sang Spec (qa-code2spec)

## 1. Khi nào dùng?
- Dự án có mã nguồn đang chạy nhưng không có tài liệu Jira/Spec tương ứng hoặc tài liệu đã lỗi thời.
- Tiếp nhận module legacy cần viết test tự động mà chưa rõ toàn bộ logic rẽ nhánh.
- Cần tạo file đặc tả `final.md` làm căn cứ bàn giao cho `qa-test-design`.

**Khi KHÔNG sử dụng:**
- Đã có sẵn issue Jira hoặc tài liệu nghiệp vụ rõ ràng từ BA → Dùng `ba-spec`.
- Chỉ cần review chất lượng code → Dùng `cr-review-code-and-quality`.

## 2. Quy trình Thực thi 5 Bước
- **Bước 0 (Pre-flight GitLab Check):** So khớp trạng thái local với remote tracking branch trên GitLab, ghi nhận Commit SHA để đảm bảo không phân tích trên mã cũ.
- **Bước 1 (Deep Trace 5 Yếu tố Backend):** Đọc code đệ quy tối đa 3 tầng, trích xuất: DB Schema, Transaction Scope, Message Queue/Kafka, Security/RBAC, và WebSocket.
- **Bước 2 (Gap Analysis & Đối chiếu Domain):** So sánh logic code với Cẩm nang nghiệp vụ chứng khoán/fintech để phát hiện điểm mù hoặc magic numbers.
- **Bước 3 (Phỏng vấn User - Interview Gate):** Kích hoạt `ba-interview-me` làm rõ các câu hỏi 🔴 Critical về luồng tiền, điều kiện giao dịch và logic ngoại lệ.
- **Bước 4 (Chốt hạ Đặc tả `final.md`):** Xuất tài liệu đặc tả kỹ thuật chuẩn tắc tại `workspace/{issueKey}/spec/final.md` kèm Metadata truy vết (Commit SHA, Source Repo).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 5 bước Deep Trace, Anti-patterns (cấm pull đè, cấm dừng ở Controller) và Verification Checklist.
  - Cẩm nang nghiệp vụ chứng khoán: [securities-domain-rules.md](../../../../references/securities-domain-rules.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** `/qa-code2spec services/orders/router.py`
- **Output:** File `workspace/orders-router/spec/final.md` cấu trúc chuẩn:
  ```markdown
  # Business-Spec: Order Placement Router
  - Source: `services/orders/router.py` (Commit: `a8f31b2`)
  - Confidence: 95% (Đã làm rõ qua interview 2 câu hỏi nghiệp vụ)
  
  ## 1. API Definition
  - Endpoint: `POST /orders` (Body: symbol, price, volume, order_type).
  - Validation Rules: Biên độ giá trần sàn sàn HOSE, bội số 100 cổ phiếu.
  - Error Codes: `INVALID_PRICE` (400), `INSUFFICIENT_FUNDS` (422).
  ```
