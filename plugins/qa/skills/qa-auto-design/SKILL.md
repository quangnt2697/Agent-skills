---
name: qa-auto-design
description: 'Sinh mã kiểm thử tự động (Automation Test Code) từ kịch bản Gherkin (.feature) và checklist bằng Playwright/Pytest theo chuẩn POM/Service. Áp dụng Reuse-First Scan trước khi viết bất kỳ file mới nào. KHÔNG thực thi test, KHÔNG debug hệ thống. Viết test code cho scenarios đã có.'
trigger: Khi đã có kịch bản Gherkin (.feature) và checklist, cần viết test code và sinh mã automation test. Trigger bằng lệnh /qa-auto-design.
---

# Thiết Kế & Sinh Mã Automation Test (qa-auto-design)

## ⚠️ RANH GIỚI NHIỆM VỤ (Bắt buộc đọc trước)

| ✅ qa-auto-design LÀM | ❌ qa-auto-design KHÔNG LÀM |
|---|---|
| Đọc `.feature`, thiết kế kiến trúc test | Chạy test thực sự lên server UAT |
| Viết `conftest.py`, `services/`, `pages/`, `test_*.py` | Debug lỗi hệ thống backend trả về |
| Chạy `pytest --collect-only` (kiểm tra cú pháp) | Điều tra root cause của API fail |
| Tạo `.env` từ template, ghi biến cần thiết | Sửa code để ép test từ FAIL → PASS |
| Bàn giao mã hoàn chỉnh cho `qa-run-test` | Thực thi test và viết báo cáo kết quả |

> ⚠️ **QUY TẮC KHÔNG TỰ SUY DIỄN (No-Inference Rule — luôn bật):**
> - **NGHIÊM CẤM** tự số suy diễn / assumed / guess expected value trong assertions khi không có cơ sở trong Jira.
> - **Nguồn duy nhất hợp lệ** cho giá trị `assert ... == X`: Acceptance Criteria / mô tả task Jira / Gherkin `Then` đã thiết kế.
> - Nếu Jira chưa mô tả rõ → ghi comment `# NEEDS-SPEC` và dừng để hỏi lại trước khi tiếp tục.
> - Đây là tương đương với quy tắc 1.9 (Self-fix Loop): không bao giờ sửa assertion để ép match response thực tế (green-washing).

**Khi có test fail sau khi `qa-run-test` chạy:** Bàn giao cho `dev-debugging` (lỗi hệ thống) hoặc cập nhật script qua `qa-auto-design` nếu script bị lỗi kỹ thuật (ImportError, fixture sai).

## 1. Khi nào dùng?
- Đã có kịch bản BDD Gherkin (`workspace/issues/{issueKey}/test/{issueKey}.feature`) và Checklist kiểm thử (`checklist.md`).
- Cần sinh mã kiểm thử tự động phân tầng (POM/Service layer + Test steps) bằng Pytest/Playwright.
- Thẩm định cú pháp test (`pytest --collect-only`) trước khi bàn giao cho `qa-run-test`.

**Khi KHÔNG sử dụng:**
- Chưa có kịch bản Gherkin hoặc Checklist → dùng `qa-test-design` trước.
- Chỉ cần chạy test suite và xuất báo cáo kết quả → dùng `qa-run-test`.
- Cần debug lỗi hệ thống hoặc tìm root cause → dùng `dev-debugging` hoặc `cr-review-code-and-quality`.

## 2. Quy trình 6 Giai đoạn Thực thi

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 50 dòng.

- **Giai đoạn 0 (Preflight Gate):**
  - Kiểm tra `sha256` của `.feature` so với `workspace/issues/{issueKey}/.pipeline-state.json`.
  - Chạy tất định SDK preflight (1 lệnh): `node ${AGENT_SKILLS_HOME:-.}/scripts/qa/check-sdk.js`. Dừng nếu thiếu dependency.

- **Giai đoạn 1 (Reuse Scan & Recon):**
  - Đọc `workspace/issues/{issueKey}/test/fixtures/data-grounding.json` nếu tồn tại. Sử dụng dữ liệu định danh đã grounding.
  - Khảo sát mã nguồn tái sử dụng bằng script tất định:
    ```bash
    node ${AGENT_SKILLS_HOME:-.}/scripts/qa/reuse-scan.js {issueKey} "từ_khóa_từ_feature"
    ```
  - Ghi kết quả vào `workspace/issues/{issueKey}/test/reuse-scan.json`. Dùng code tái sử dụng theo JSON này.
  - Lấy dữ liệu chứng khoán: chuỗi ưu tiên bắt buộc là `fixture valid_order_symbol` (nguồn Metabase UAT) → `getSecuritiesFixture` (n8n) → `.env`.
  - Web UI: Dùng n8n `discoverWebUILocators` hoặc Playwright thủ công, verify locators trước khi dùng.

- **Giai đoạn 2 (Thiết kế Kiến trúc Phân tầng):**
  - Tạo Page Object Model (Web UI) hoặc Service Client (API/WS, kế thừa SDK có sẵn).
  - Áp dụng kết quả Reuse Scan (`reuse-scan.json`): import trực tiếp, chỉ viết mới những thứ chưa có.
  - Toàn bộ assertions BẮT BUỘC nằm ở tầng test, không để lọt vào tầng POM/Service.

- **Giai đoạn 3 (Sinh Mã Kiểm thử `test_*.py`):**
  - Ánh xạ 1-1 từng Scenario Gherkin thành test case. Sử dụng marker ID liên kết: `@pytest.mark.cl("CL-xxx")`.
  - Gắn tag, decorator và áp dụng chuẩn ghi log 4 thẻ tiếng Việt (`[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`).
  - Gắn comment `# test-intent: <mục tiêu>` đầu mỗi test function.
  - Toàn bộ tham số kiểm thử gọi từ `.env` hoặc fixture động. Cấm hardcode (`https?://`, `wss?://` ngoài `.env`).
  - **GraphQL Task — BẮT BUỘC tham chiếu [automation_rules.md Section 3.5](references/automation_rules.md) trước khi sinh mã:**
    - Thiết kế đủ 4 nhóm: `full_query`, `partial_query`, `empty_query`, `invalid_query`.
    - Thực hiện đủ 8 bước assertions cho mỗi test case.
    - Assertions lấy expected value **nguyên văn** từ Jira. **NGHIÊM CẤM** tự suy diễn hoặc green-washing.

- **Giai đoạn 4 (Simplification Pass — trước khi bàn giao):**
  - Xác nhận **Never-Cut List**: không xóa assert, teardown, boundary `[P0]`, error-path check.
  - Kiểm tra comment `# test-intent:` có ở đầu mỗi test function chưa.
  - Xóa locator/method thừa trong POM chưa được dùng đến.

- **Giai đoạn 5 (GATE: Thẩm định Cú pháp, Lint & Bàn giao):**
  - Chạy lệnh kiểm tra cú pháp và ngữ nghĩa test:
    ```bash
    pytest "workspace/issues/{issueKey}/test/steps" -o python_files="test_*.py *_test.py" --collect-only
    node ${AGENT_SKILLS_HOME:-.}/scripts/qa/qa-lint.js {issueKey}
    ```
  - `qa-lint.js` sẽ kiểm tra: Phủ đủ Scenario, cấm sleep/mock/hardcode, assert đúng tầng.
  - Nếu có lỗi cú pháp/lint ➤ Tự sửa (≤ 3 vòng).
  - Cập nhật kết quả vào `workspace/issues/{issueKey}/.pipeline-state.json` và bàn giao cho `qa-run-test`.

## ⚡ Quy Tắc Output File (Output File Rules — Bắt buộc tuân thủ)

> 📌 **1 skill call = 1 lần ghi. Gọi lại skill → ghi đè hoàn toàn các file đã sinh.**

| File Output | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| conftest.py | `workspace/issues/{issueKey}/test/steps/conftest.py` | **Ghi đè** hoàn toàn |
| Test steps | `workspace/issues/{issueKey}/test/steps/test_*.py` | **Ghi đè** từng file tương ứng |
| Service layer | `workspace/issues/{issueKey}/test/steps/services/*.py` | **Ghi đè** từng file tương ứng |
| Page Object (Web UI) | `workspace/issues/{issueKey}/test/steps/pages/*.py` | **Ghi đè** từng file tương ứng |

**Quy tắc:**
- **KHÔNG** tạo file mới với suffix (_v2.py, _new.py, ...).
- **KHÔNG** append vào file cũ — luôn overwrite hoàn toàn.
- File chưa tồn tại → tạo mới đúng đường dẫn. File đã tồn tại → ghi đè không cần xác nhận.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC (task API/WS):**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc quy trình ≤ 50 dòng.
  - [sdk-map.json](references/sdk-map.json): SDK Index — đọc ngay trước khi recon, tránh grep toàn repo.

- 🛠️ **Công cụ & Mã nguồn mẫu (assets/):**
  - [conftest_core.py](assets/conftest_core.py): File Core bất biến (Env loader, UAT DB guard, Pytest hooks ghi test-output.log & report.md, Composable `pytest_plugins` dynamic loader).
  - Fixture Modules lắp ghép (Composable): [fixtures_api.py](assets/fixtures_api.py), [fixtures_ws.py](assets/fixtures_ws.py), [fixtures_web_ui.py](assets/fixtures_web_ui.py), [fixtures_mobile.py](assets/fixtures_mobile.py).
  - [conftest_template.py](assets/conftest_template.py): Master composite reference wrapper (tái xuất toàn bộ fixtures).
  - [api_ws_service.py](assets/api_ws_service.py), [test_api_example.py](assets/test_api_example.py), [web_ui_pom.py](assets/web_ui_pom.py), [mobile_app_pom.py](assets/mobile_app_pom.py): Mẫu code hoàn chỉnh kế thừa SDK.

- 📋 **Template môi trường (references/env-templates/):**
  - [api.env.example](references/env-templates/api.env.example): Biến môi trường cho REST API task.
  - [ws.env.example](references/env-templates/ws.env.example): Biến môi trường cho WebSocket task.
  - [web-ui.env.example](references/env-templates/web-ui.env.example): Biến môi trường cho Web UI / Mobile task.

- 📖 **Tài liệu quy trình & Hướng dẫn kỹ thuật (references/):**
  - [automation_rules.md](references/automation_rules.md): 14 Quy tắc vàng đầy đủ, Anti-patterns.
  - [shared_fixtures_and_env.md](references/shared_fixtures_and_env.md): Cơ chế `.env` phân tầng.
  - [test_logging_guidelines.md](references/test_logging_guidelines.md): Chuẩn log 4 thẻ, Fixed-Width.
  - [folder_structure_blueprint.md](references/folder_structure_blueprint.md): Sơ đồ cây thư mục chuẩn.
  - [order_state_testing.md](references/order_state_testing.md): Test E2E Order State Machine.
  - [known-errors-and-fixes.md](references/known-errors-and-fixes.md): Lỗi phổ biến & cách fix nhanh.

## 4. Ví dụ mẫu (Few-shot Example)
- **Input:** Scenario Gherkin: `Scenario: Đặt lệnh mua cổ phiếu hợp lệ`
- **Output:** Test step trong `test_orders.py` (toàn bộ tham số lấy từ `.env` / fixture, không hardcode):
  ```python
  import os
  import pytest

  @pytest.mark.scenario("Đặt lệnh mua cổ phiếu hợp lệ")
  @pytest.mark.cl("CL-001")
  @pytest.mark.jira("STK-101")
  @pytest.mark.happy_path
  def test_buy_order_success(order_service, uat_account, valid_order_symbol):
      """
      Given khách hàng có thông tin xác thực hợp lệ
      When đặt lệnh mua cổ phiếu với tham số hợp lệ từ fixture
      Then hệ thống tạo lệnh thành công và trả về trạng thái RECEIVE
      """
      # [KỊCH BẢN] Đặt lệnh mua cổ phiếu hợp lệ
      symbol = os.getenv("TEST_ORDER_SYMBOL", valid_order_symbol.get("symbol"))
      price = float(os.getenv("TEST_ORDER_PRICE", valid_order_symbol.get("reference_price")))

      qty = int(os.getenv("TEST_ORDER_QTY", "100"))

      # [ĐẦU VÀO] Gửi yêu cầu đặt lệnh mua
      payload = {"account": uat_account, "symbol": symbol, "price": price, "qty": qty}
      status_code, body, headers, elapsed_ms = order_service.place_order(payload)

      # [HỆ THỐNG TRẢ RA] Phản hồi từ hệ thống
      # [KẾT QUẢ] Kiểm tra mã phản hồi và trạng thái lệnh
      assert status_code == 200
      assert body["data"]["status"] == "RECEIVE"
      assert elapsed_ms < 2000  # SLA
  ```

---
