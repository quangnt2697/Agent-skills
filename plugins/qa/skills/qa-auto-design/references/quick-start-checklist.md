# Quick-Start Checklist — qa-auto-design

> **Mục đích:** Đây là tờ giấy nhắc cực ngắn. Đọc file này trước khi bắt đầu thiết kế test script.
> Xem chi tiết từng quy tắc tại các file `references/` tương ứng khi cần.

---

## ⚠️ RANH GIỚI NHIỆM VỤ — qa-auto-design CHỈ THIẾT KẾ, KHÔNG THỰC THI

| ✅ ĐƯỢC làm | ❌ KHÔNG làm |
|---|---|
| Viết `conftest.py`, `test_*.py`, `services/`, `pages/` | Chạy test thực sự trên server UAT |
| Chạy `pytest --collect-only` để kiểm tra cú pháp | Debug lỗi trả về của hệ thống backend |
| Tạo `.env` từ template | Điều tra root cause của API trả lỗi |
| Bàn giao kết quả cho `qa-run-test` | Sửa code thành PASS khi hệ thống sai |

---

## BƯỚC 1 — Xác Định Loại Task (30 giây)

Đọc `{issueKey}.feature` → xác định:

| Feature chứa từ nào? | Task Type | Template `.env` cần dùng |
|---|---|---|
| `API`, `REST`, `HTTP`, `endpoint`, `status_code` | 🔌 REST API | `env-templates/api.env.example` |
| `WebSocket`, `WS`, `subscribe`, `event`, `stream` | ⚡ WebSocket | `env-templates/ws.env.example` |
| `trang web`, `màn hình`, `click`, `Sidebar`, `Playwright` | 🌐 Web UI | `env-templates/web-ui.env.example` |
| `màn hình di động`, `Mobile`, `Appium`, `app` | 📱 Mobile | `env-templates/web-ui.env.example` |

---

## BƯỚC 2 — Recon Gate (2 phút)

```bash
# Đọc SDK Index — nằm cùng skill, tracked bởi git, có ở mọi dự án dùng agent-skills
cat plugins/qa/skills/qa-auto-design/references/sdk-map.json
```

- Xác định class Auth/Client cần import
- Ghi chú `file` và `usage` của từng module cần dùng

---

## BƯỚC 3 — Setup `.env` (1 phút)

```bash
cp plugins/qa/skills/qa-auto-design/references/env-templates/{type}.env.example \
   workspace/{issueKey}/test/.env
```

Điền các giá trị còn thiếu (`BASE_URL`, `API_KEY`, `TEST_ORDER_SYMBOL`, v.v.).

---

## BƯỚC 4 — Tạo Cấu Trúc Thư Mục

Tuân thủ ma trận `folder_structure_blueprint.md`:

```
workspace/{issueKey}/test/
├── pytest.ini            # ← luôn phải có
├── .env                  # ← copy từ template, đã điền
├── steps/
│   ├── conftest.py       # ← copy từ assets/conftest_{type}.py
│   ├── test_{feature}.py # ← file test chính
│   ├── services/         # ← CHỈ cho API/WS
│   ├── pages/            # ← CHỈ cho Web UI
│   └── models/           # ← CHỈ cho API/WS (Pydantic v2)
└── result/               # ← để trống, qa-run-test sẽ ghi vào
```

---

## BƯỚC 5 — Viết `test_*.py` (Checklist mỗi test function)

```python
@pytest.mark.scenario("Tên scenario CHÍNH XÁC trong .feature")
@pytest.mark.jira("{issueKey}")
@pytest.mark.happy_path  # hoặc negative, edge_case, security
def test_ten_scenario(fixture_1, fixture_2):
    """
    Given ...
    When ...
    Then ...
    """
    # [KỊCH BẢN] Mô tả kịch bản test
    # [ĐẦU VÀO] Log tham số kỹ thuật
    status_code, body, headers, elapsed_ms = service.call(payload)
    # [HỆ THỐNG TRẢ RA] Log kết quả thực tế từ hệ thống
    # [KẾT QUẢ] Assert + Log verdict
```

**7 Assertions bắt buộc (API):** Request Schema → Status Code → Response Schema → Business Fields → Error Detail → SLA → Headers

---

## BƯỚC 6 — Quality Gate Trước Bàn Giao

```bash
pytest "workspace/{issueKey}/test/steps" \
  -o python_files="test_*.py *_test.py" \
  --collect-only
```

✅ **Pass 100%** → Bàn giao cho `qa-run-test`
❌ **Có lỗi cú pháp** → Tự sửa, xem `references/known-errors-and-fixes.md`

**Checklist cuối:**
- [ ] Không có `time.sleep()`, `print()`, `@patch` mock
- [ ] Không hardcode URL, token, account, symbol trong code
- [ ] Log format: `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - MESSAGE | CONTEXT`
- [ ] Không dùng ký tự cây `├─`, `└─`, `▶` trong log
- [ ] Mỗi Scenario trong `.feature` có đúng 1 test method tương ứng
