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

**Khi có test fail sau khi `qa-run-test` chạy:** Bàn giao cho `dev-debugging` (lỗi hệ thống) hoặc cập nhật script qua `qa-auto-design` nếu script bị lỗi kỹ thuật (ImportError, fixture sai).

## 1. Khi nào dùng?
- Đã có kịch bản BDD Gherkin (`workspace/{issueKey}/test/{issueKey}.feature`) và Checklist kiểm thử (`checklist.md`).
- Cần sinh mã kiểm thử tự động phân tầng (POM/Service layer + Test steps) bằng Pytest/Playwright.
- Thẩm định cú pháp test (`pytest --collect-only`) trước khi bàn giao cho `qa-run-test`.

**Khi KHÔNG sử dụng:**
- Chưa có kịch bản Gherkin hoặc Checklist → dùng `qa-test-design` trước.
- Chỉ cần chạy test suite và xuất báo cáo kết quả → dùng `qa-run-test`.
- Cần debug lỗi hệ thống hoặc tìm root cause → dùng `dev-debugging` hoặc `cr-review-code-and-quality`.

## 2. Quy trình 5 Giai đoạn Thực thi

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 50 dòng cho toàn bộ quy trình.

- **Giai đoạn 0 (Reuse-First Codebase Scan — Bắt buộc trước bước Recon):**

  Áp dụng **7-Rung Ladder** (`cr-code-simplification`) rung 2 *"Đã có trong codebase? → tái sử dụng"*.
  
  > 🛑 **Anti-Bloat Guardrails (Chống quét lan man khi có 50-100+ folders):**
  > - **Hard Cap:** Tối đa **5 thư mục gần nhất** (`head -5`). CẤM quét toàn bộ thư mục `workspace/`.
  > - **Path Boundary:** CHỈ quét `workspace/{target_issue}/test/steps/`, CẤM quét vào `source/`, `spec/`, `tech/`, `result/`.
  > - **File Filter:** Chỉ quét `*.py`, bỏ qua log, json, markdown.
  > - **Early Exit:** Tìm thấy component cần dùng $\rightarrow$ DỪNG NGAY, không quét tiếp các tier sau.

  ### Chiến lược 3-Tier Quét Có Giới Hạn

  **Tier 1 — Cùng prefix issueKey (Tối đa 5 folder gần nhất cùng domain):**
  ```bash
  # 1. Trích xuất prefix domain (VD: STK-201 -> prefix STK)
  PREFIX=$(echo "{issueKey}" | cut -d'-' -f1)

  # 2. Lấy tối đa 5 folder gần nhất cùng prefix có chứa test/steps
  MATCHED_DIRS=$(ls -td workspace/${PREFIX}-*/test/steps 2>/dev/null | head -5)

  # 3. Quét nhanh các thành phần có thể tái sử dụng
  grep -rnE "(class .*Service|@pytest\.fixture|class .*Page|def assert_)" $MATCHED_DIRS 2>/dev/null | head -20
  ```
  *(Nếu dùng tool `grep_search`: chỉ truyền `SearchPath` là từng folder cụ thể trong 5 folder trên)*
  $\rightarrow$ **Tìm thấy match? Dừng ngay, dùng luôn. Không chuyển sang Tier 2.**

  **Tier 2 — Top 5 folder gần nhất trong workspace (Fallback khi khác prefix hoặc Tier 1 rỗng):**
  ```bash
  # Lấy tối đa 5 folder test/steps có thời gian sửa đổi gần nhất
  RECENT_DIRS=$(ls -td workspace/*/test/steps 2>/dev/null | head -5)
  grep -rnE "(class .*Service|@pytest\.fixture|def assert_)" $RECENT_DIRS 2>/dev/null | head -20
  ```
  $\rightarrow$ **Tìm thấy match? Dừng ngay. Không quét thêm.**

  **Tier 3 — Centralized SDK Map (Đọc trực tiếp, 0-hop, không quét workspace):**
  ```bash
  cat plugins/qa/skills/qa-auto-design/references/sdk-map.json
  ```
  $\rightarrow$ Class chuẩn trong SDK (`DNSEClient`, `TradingAPI`, `WSClient`, Auth) luôn có độ ưu tiên cao nhất, không tự viết lại logic xác thực hay gọi core API.

  ### Quyết định theo kết quả scan

  | Kết quả | Hành động |
  |---|---|
  | Tier 1: `class {Name}Service` trùng chức năng | Import trực tiếp, không viết lại |
  | Tier 1: fixture cùng tên/scope | Copy vào `conftest.py` mới, chỉnh path |
  | Tier 1: `def assert_api_success` | Import helper |
  | Tier 1: POM Page cùng màn hình | Extend class, override locator đã đổi |
  | Tier 2: tìm thấy ở folder gần nhất | Dùng, ghi chú nguồn rõ ràng |
  | Tier 3: có trong sdk-map.json | Dùng SDK, không wrap thêm |
  | Không tìm thấy ở cả 3 tier | Viết mới — chuẩn hoá để Tier 1 sau dùng lại |

  **Ghi kết quả scan vào comment đầu `conftest.py`:**
  ```python
  # reuse-scan: Tier1/STK — kế thừa OrderService từ STK-190/test/steps/services/order_service.py
  # reuse-scan: Tier3/SDK — dùng DNSEClient, không viết lại HMAC signing
  # ponytail: Tier1 match — không viết lại assert_order_status (đã có STK-185)
  ```

  > 🔗 Liên kết skill: **`cr-code-simplification`** — 7-Rung Ladder, Never-Cut List.
  > 🚫 **Bỏ qua bước pull code** — n8n workflow đã pull code mới nhất đầu ngày.

- **Giai đoạn 1 (Khảo sát & Kế thừa SDK - Recon Gate):**
  - Đọc `plugins/qa/skills/qa-auto-design/references/sdk-map.json` để xác định class Auth/Client có sẵn — KHÔNG grep toàn repo.
  - **Fast-Path Dữ liệu Chứng khoán:** Chạy `node scripts/lib/n8n-client.js getSecuritiesFixture` để lấy tức thì giá trần/sàn/TC chuẩn sàn cho Phái sinh (`41I1GA0000`), HOSE (`SHB`), UPCOM (`OIL`), HNX (`SHS`) kèm API Key/Secret từ `.env` mà không cần query SQL thủ công.
  - Copy template `.env` phù hợp từ `references/env-templates/{api|ws|web-ui}.env.example`.
  - Xác định task type (API / WebSocket / Web UI) từ `.feature`.

- **Giai đoạn 2 (Thiết kế Kiến trúc Phân tầng):**
  - Tạo Page Object Model (Web UI) hoặc Service Client (API/WS, kế thừa SDK có sẵn).
  - Áp dụng kết quả Reuse Scan: import trực tiếp, chỉ viết mới những thư chưa có.
  - Toàn bộ assertions BẮT BUỘC nằm ở tầng test, không để lọt vào tầng POM/Service.

- **Giai đoạn 3 (Sinh Mã Kiểm thử `test_*.py`):**
  - Ánh xạ 1-1 từng Scenario Gherkin thành test case.
  - Gắn tag, decorator và áp dụng chuẩn ghi log 4 thẻ tiếng Việt (`[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`).
  - Gắn comment `# test-intent: <mục tiêu>` đầu mỗi test function theo quy ước `cr-code-simplification`.
  - Toàn bộ tham số kiểm thử gọi từ `.env` hoặc fixture động.

- **Giai đoạn 4 (Simplification Pass — trước khi bàn giao):**

  Sau khi viết xong toàn bộ code, chạy lượt rà soát `cr-code-simplification` cho test code:
  - Xác nhận **Never-Cut List**: không xóa assert, teardown, boundary `[P0]`, error-path check.
  - Kiểm tra comment `# test-intent:` có ở đầu mỗi test function chưa.
  - Gộp fixture trùng lặp nếu có — dán nhãn `# simplify: gộp X fixture giống nhau`.
  - Xóa locator/method thừa trong POM chưa được dùng đến.

- **Giai đoạn 5 (Thẩm định Cú pháp & Bàn giao):** Chạy lệnh kiểm tra cú pháp — **KHÔNG phải chạy test thực sự:**
  ```bash
  pytest "workspace/{issueKey}/test/steps" -o python_files="test_*.py *_test.py" --collect-only
  ```
  Nếu có lỗi cú pháp ➤ Tự sửa (xem `references/known-errors-and-fixes.md`). Nếu Pass 100% ➤ Bàn giao cho `qa-run-test`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC (task API/WS):**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc quy trình ≤ 50 dòng.
  - [sdk-map.json](references/sdk-map.json): SDK Index — đọc ngay trước khi recon, tránh grep toàn repo.

- 🛠️ **Công cụ & Mã nguồn mẫu (assets/):**
  - [conftest_template.py](assets/conftest_template.py): Template đầy đủ mọi loại task.
  - [api_ws_service.py](assets/api_ws_service.py), [test_api_example.py](assets/test_api_example.py), [web_ui_pom.py](assets/web_ui_pom.py): Mẫu code hoàn chỉnh kế thừa SDK.

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
      price = float(os.getenv("TEST_ORDER_PRICE", valid_order_symbol.get("reference_price", 28500)))
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
