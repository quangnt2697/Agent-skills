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
- **Giai đoạn 1 (Khảo sát & Kế thừa - Recon Gate):**
  - Setup thư mục và nạp cấu hình `.env` phân tầng.
  - **Quét Codebase SDK & Dev Code:** Với task API/WS, BẮT BUỘC quét thêm folder `openapi-tyk/sdk/python/` (qua `projects.json`, biến môi trường `OPENAPI_TYK_PATH`, hoặc đường dẫn tương đối) để tìm kiếm codebase SDK Python sẵn có (`DNSEClient`, `trading-api`, `marketdata-api`, `websocket-trading`, `websocket-marketdata`, `examples`), kết hợp quét codebase DEV tái sử dụng 100% module Auth, Token, HMAC, WebSocket Client có sẵn. Cấm mock server.
  - **Quy Tắc Quản Lý Biến `.env` Bắt Buộc (Zero-Hardcode Policy):** Toàn bộ các giá trị biến (endpoints, credentials, account numbers, test symbols, limits, timeouts, threshold params) BẮT BUỘC phải được tạo và lưu trữ trong file `.env`. Trong toàn bộ test script (`test_*.py`, `conftest.py`, `services/`), code CHỈ ĐƯỢC PHÉP gọi/lấy giá trị từ `.env` (qua `os.getenv()`, `EnvConfig`, hoặc fixtures), TUYỆT ĐỐI KHÔNG hardcode bất kỳ giá trị nào.
- **Giai đoạn 2 (Thiết kế Kiến trúc Phân tầng):** Tạo Page Object Model (Web UI) hoặc Service Client (API/WS kế thừa hoặc wrap SDK `openapi-tyk/sdk/python/`). Toàn bộ assertions BẮT BUỘC nằm ở tầng test, không để lọt vào tầng POM/Service.
- **Giai đoạn 3 (Sinh Mã Kiểm thử `test_*.py`):** Ánh xạ 1-1 từng Scenario Gherkin thành test case. Gắn tag, decorator và áp dụng chuẩn ghi log 4 thẻ tiếng Việt (`[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`). Toàn bộ tham số kiểm thử gọi từ `.env` hoặc fixture động.
- **Giai đoạn 4 (Thẩm định Cú pháp & Bàn giao):** Chạy lệnh kiểm tra cú pháp không thực thi:
  ```bash
  pytest "workspace/{issueKey}/test/steps" -o python_files="test_*.py *_test.py" --collect-only
  ```
  Nếu có lỗi cú pháp ➔ Tự sửa. Nếu Pass 100% ➔ Bàn giao cho `qa-run-test`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mã nguồn mẫu (assets/):**
  - [conftest_template.py](assets/conftest_template.py): Cấu hình fixture và logging interceptor mẫu.
  - [api_ws_service.py](assets/api_ws_service.py), [test_api_example.py](assets/test_api_example.py), [web_ui_pom.py](assets/web_ui_pom.py): Mẫu code hoàn chỉnh kế thừa SDK và nạp biến `.env`.
- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [workflow.md](references/workflow.md): Chi tiết 6 Nguyên Tắc Vàng, 4 Giai đoạn, Anti-patterns và Verification checklist.
  - [recon_guide.md](references/recon_guide.md): Cẩm nang trinh sát, quét `openapi-tyk/sdk/python/` và codebase DEV.
  - [automation_rules.md](references/automation_rules.md), [shared_fixtures_and_env.md](references/shared_fixtures_and_env.md), [test_logging_guidelines.md](references/test_logging_guidelines.md), [order_state_testing.md](references/order_state_testing.md).

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Scenario Gherkin: `Scenario: Đặt lệnh mua cổ phiếu hợp lệ`
- **Output:** Test step trong `test_orders.py` (toàn bộ tham số lấy từ `.env` / fixture, không hardcode):
  ```python
  import os
  import pytest

  @pytest.mark.jira("STK-101")
  def test_buy_order_success(order_service, uat_account, valid_order_symbol):
      # [KỊCH BẢN] Đặt lệnh mua cổ phiếu hợp lệ
      # Giá trị tham số đọc từ .env hoặc fixture, TUYỆT ĐỐI KHÔNG hardcode
      symbol = os.getenv("TEST_ORDER_SYMBOL", valid_order_symbol.get("symbol"))
      price = float(os.getenv("TEST_ORDER_PRICE", valid_order_symbol.get("reference_price", 28500)))
      qty = int(os.getenv("TEST_ORDER_QTY", "100"))

      payload = {"account": uat_account, "symbol": symbol, "price": price, "qty": qty}
      response = order_service.place_order(payload)
      
      # [KẾT QUẢ] Kiểm tra mã phản hồi và trạng thái lệnh
      assert response.status_code == 200
      assert response.json()["data"]["status"] == "RECEIVE"
  ```
