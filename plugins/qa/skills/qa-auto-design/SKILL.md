---
name: qa-auto-design
description: Sinh mã kiểm thử tự động (Automation Test Code) từ kịch bản Gherkin (.feature) và checklist bằng Playwright/Pytest theo chuẩn POM/Service.
trigger: Khi đã có kịch bản Gherkin (.feature) và checklist, cần viết test code và sinh mã automation test. Trigger bằng lệnh /qa-auto-design.
---

# Thiết Kế & Sinh Mã Automation Test (qa-auto-design)

## 1. Khi nào dùng?
- Đã có kịch bản BDD Gherkin (`workspace/{issueKey}/test/{issueKey}.feature`) và Checklist kiểm thử (`checklist.md`).
- Cần sinh mã kiểm thử tự động phân tầng (POM/Service layer + Test steps) bằng Pytest/Playwright.
- Thẩm định cú pháp test (`pytest --collect-only`) trước khi bàn giao cho `qa-run-test`.

**Khi KHÔNG sử dụng:**
- Chưa có kịch bản Gherkin hoặc Checklist → dùng `qa-test-design` trước.
- Chỉ cần chạy test suite và xuất báo cáo kết quả → dùng `qa-run-test`.

## 2. Quy trình 4 Giai đoạn Thực thi
- **Giai đoạn 1 (Khảo sát & Kế thừa - Recon Gate):** Setup thư mục, nạp cấu hình `.env`, quét codebase tái sử dụng 100% module Auth, Token, HMAC, WebSocket Client có sẵn của DEV. Cấm mock server.
- **Giai đoạn 2 (Thiết kế Kiến trúc Phân tầng):** Tạo Page Object Model (Web UI) hoặc Service Client (API/WS). Toàn bộ assertions BẮT BUỘC nằm ở tầng test, không để lọt vào tầng POM/Service.
- **Giai đoạn 3 (Sinh Mã Kiểm thử `test_*.py`):** Ánh xạ 1-1 từng Scenario Gherkin thành test case. Gắn tag, decorator và áp dụng chuẩn ghi log 4 thẻ tiếng Việt (`[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`).
- **Giai đoạn 4 (Thẩm định Cú pháp & Bàn giao):** Chạy lệnh kiểm tra cú pháp không thực thi:
  ```bash
  pytest "workspace/{issueKey}/test/steps" -o python_files="test_*.py *_test.py" --collect-only
  ```
  Nếu có lỗi cú pháp ➔ Tự sửa. Nếu Pass 100% ➔ Bàn giao cho `qa-run-test`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mã nguồn mẫu (assets/):**
  - [conftest_template.py](assets/conftest_template.py): Cấu hình fixture và logging interceptor mẫu.
  - [api_ws_service.py](assets/api_ws_service.py), [test_api_example.py](assets/test_api_example.py), [web_ui_pom.py](assets/web_ui_pom.py): Mẫu code hoàn chỉnh.
- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 6 Nguyên Tắc Vàng, 4 Giai đoạn, Anti-patterns và Verification checklist.
  - [automation_rules.md](references/automation_rules.md), [test_logging_guidelines.md](references/test_logging_guidelines.md), [order_state_testing.md](references/order_state_testing.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Scenario Gherkin: `Scenario: Đặt lệnh mua cổ phiếu HPG hợp lệ`
- **Output:** Test step trong `test_orders.py`:
  ```python
  @pytest.mark.jira("STK-101")
  def test_buy_order_success(order_service, uat_account):
      # [KỊCH BẢN] Đặt lệnh mua cổ phiếu HPG hợp lệ
      payload = {"account": uat_account, "symbol": "HPG", "price": 28500, "qty": 100}
      response = order_service.place_order(payload)
      
      # [KẾT QUẢ] Kiểm tra mã phản hồi và trạng thái lệnh
      assert response.status_code == 200
      assert response.json()["data"]["status"] == "RECEIVE"
  ```
