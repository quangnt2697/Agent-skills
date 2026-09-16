# Danh Sách Lỗi Phổ Biến & Cách Sửa Nhanh (qa-auto-design)

> Tài liệu này phục vụ Self-fix Loop (Quy tắc 1.9 trong `automation_rules.md`).
> CHỈ dùng để sửa lỗi kỹ thuật của script. KHÔNG sửa code để ép test từ FAIL thành PASS.

---

## Loại 1: Import / ModuleNotFoundError

### E001 — `ModuleNotFoundError: No module named 'dnse'`
**Nguyên nhân:** `pytest.ini` thiếu `pythonpath` trỏ đến SDK.
**Fix:**
```ini
[pytest]
pythonpath = . steps ../../.. ../../../openapi-tyk/sdk/python
```

### E002 — `ModuleNotFoundError: No module named 'src'`
**Nguyên nhân:** `pythonpath` chưa trỏ đúng đến root của project dev.
**Fix:** Thêm đường dẫn tương đối đến project root vào `pythonpath` trong `pytest.ini`.

### E003 — `ImportError: cannot import name 'XXX' from 'conftest'`
**Nguyên nhân:** Import fixture từ `conftest.py` bằng tên trực tiếp thay vì để Pytest inject tự động.
**Fix:** Xóa `from conftest import xxx`. Pytest tự inject fixtures thông qua tên tham số hàm.

---

## Loại 2: Pydantic Syntax Error

### E010 — `NameError: name 'validator' is not defined`
**Nguyên nhân:** Dùng cú pháp Pydantic v1 (`@validator`) trong môi trường Pydantic v2.
**Fix:**
```python
# ❌ Pydantic v1 — DEPRECATED
from pydantic import validator
@validator("field")
def check(cls, v): ...

# ✅ Pydantic v2 — ĐÚNG
from pydantic import field_validator
@field_validator("field", mode="after")
@classmethod
def check(cls, v: str) -> str: ...
```

### E011 — `ValidationError: ... model_validate()`
**Nguyên nhân:** Dùng `Model(**dict)` thay vì `Model.model_validate(dict)` cho Pydantic v2.
**Fix:** `result = MyModel.model_validate(response_body)`

---

## Loại 3: Fixture Scope Conflict

### E020 — `ScopeMismatch: You tried to access the function scoped fixture ... from a session scoped fixture`
**Nguyên nhân:** Fixture `session`-scoped đang gọi fixture `function`-scoped.
**Fix:** Đảm bảo fixture cấp cao hơn (session) chỉ gọi fixture cùng cấp hoặc cao hơn. Di chuyển fixture lên scope `session` nếu cần.

### E021 — `FixtureError: fixture 'xxx' not found`
**Nguyên nhân:** Fixture chưa được khai báo trong `conftest.py` hoặc `conftest.py` không nằm đúng thư mục.
**Fix:** Đặt `conftest.py` trực tiếp trong `steps/`. Pytest tìm conftest theo hierarchy thư mục.

---

## Loại 4: Async / WebSocket

### E030 — `RuntimeError: no running event loop`
**Nguyên nhân:** Dùng `asyncio.run()` bên trong test function async.
**Fix:** Thêm `@pytest.mark.asyncio` và dùng `async def test_...`. Không gọi `asyncio.run()` trong test.

### E031 — `PytestUnraisableExceptionWarning: ... in teardown`
**Nguyên nhân:** WebSocket client không được đóng đúng cách trong teardown.
**Fix:**
```python
@pytest.fixture
async def ws_client():
    client = WSClient(...)
    await client.connect()
    try:
        yield client
    finally:
        await client.disconnect()  # ← bắt buộc trong finally
```

### E032 — `asyncio.TimeoutError` khi nhận event
**Nguyên nhân:** Timeout quá ngắn hoặc server chưa push event.
**Fix:** Tăng `WS_EVENT_TIMEOUT_SEC` trong `.env`. Kiểm tra subscription đã thành công trước khi `receive_event()`.

---

## Loại 5: Môi Trường & Biến .env

### E040 — `AssertionError: API_KEY chưa được set trong .env`
**Nguyên nhân:** File `.env` chưa có giá trị hoặc chưa được load.
**Fix:** Kiểm tra `load_hierarchical_env()` đã được gọi trong `conftest.py`. Kiểm tra file `.env` tồn tại tại đúng đường dẫn.

### E041 — `requests.exceptions.ConnectionError`
**Nguyên nhân:** `BASE_URL` trong `.env` sai hoặc UAT server đang down.
**Fix:** Verify URL bằng `curl $BASE_URL/health`. Kiểm tra VPN/network.

### E042 — `401 Unauthorized` khi test chạy
**Nguyên nhân:** Token hết hạn hoặc API_KEY/SECRET sai.
**Fix:** Refresh token. Đảm bảo `auth_token` fixture có `scope="session"` để tránh re-auth mỗi test.

---

## Loại 6: Playwright / Web UI

### E050 — `TimeoutError: Timeout 30000ms exceeded`
**Nguyên nhân:** Locator không tìm thấy element hoặc element chưa hiển thị.
**Fix:**
```python
# ❌ Không dùng
page.wait_for_timeout(3000)
# ✅ Dùng Web-First Assertions (auto-retry)
expect(page.get_by_role("button", name="Submit")).to_be_visible()
```

### E051 — `StrictModeViolation: locator resolved to N elements`
**Nguyên nhân:** Locator khớp nhiều hơn 1 element.
**Fix:** Dùng locator chính xác hơn: `page.get_by_role("button", name="Submit").first` hoặc thêm `.nth(0)`.

### E052 — `Error: page.click: Target page, context or browser has been closed`
**Nguyên nhân:** Browser context bị đóng trước khi test hoàn thành, thường do fixture teardown sớm.
**Fix:** Đảm bảo `browser_context` fixture dùng đúng scope (`function` cho UI test).

---

## Loại 7: Collect Error

### E060 — `ERRORS during collection`
**Nguyên nhân:** Syntax error trong Python file.
**Fix:** Chạy `python -m py_compile steps/test_xxx.py` để locate dòng lỗi cụ thể.

### E061 — `PytestCollectionWarning: cannot collect test class 'TestXxx' because it has a __init__`
**Nguyên nhân:** Test class có `__init__` method.
**Fix:** Xóa `__init__` khỏi test class. Pytest không cho phép `__init__` trong test class.
