# Phân Quyền Sở Hữu Kiểm Thử & Đánh Giá Chất Lượng (Test Ownership)

> Tài liệu tham chiếu kèm ví dụ minh họa. Bảng tổng kết ma trận trách nhiệm nằm ở
> [AGENTS.md](../../AGENTS.md#ma-trận-trách-nhiệm-responsibility-matrix). File này giải thích chi tiết ranh giới giữa đội phát triển (DEV trên repo microservice) và các Personas tự động hóa trên nhánh `main` (**QA/SDET**, **Code Reviewer**, **Security Auditor**, **Web Performance Auditor**).

### Unit Test: Thuộc DEV

**Khi nào:**
- Test các function/class riêng lẻ (pure logic)
- Test không cần khởi động app (fast, isolated)
- Mock dependencies (database, API, external services)

**Đặt ở đâu:**
- `tests/unit/` hoặc `src/__tests__/` (cùng folder với code)

**Framework:**
- Python: `pytest`, `unittest`
- JavaScript: `jest`, `vitest`, `mocha`
- Java: `JUnit`, `TestNG`

**Ai viết:**
- ✅ DEV viết unit test cho code của mình
- ✅ DEV maintain unit test khi refactor code
- ❌ QA không viết unit test (QA focus E2E/integration)

**Example:**
```python
# tests/unit/test_order_service.py (DEV writes this)
def test_validate_quantity_valid():
    assert validate_quantity(100) == True

def test_validate_quantity_invalid():
    with pytest.raises(ValueError):
        validate_quantity(50)  # Not multiple of 100
```

---

### Integration Test: DEV + QA Collaboration

**Khi nào:**
- Test tương tác giữa nhiều components (API + DB, Service + Service)
- Test cần khởi động app (slower than unit test)
- Test với real dependencies (không mock)

**Đặt ở đâu:**
- `tests/integration/`

**Ai viết:**
- ✅ DEV viết integration test cho API endpoints, service interactions
- ✅ QA có thể viết integration test cho complex workflows
- **Collaboration:** DEV design, QA expand coverage

**Example:**
```python
# tests/integration/test_order_api.py (DEV or QA)
def test_create_order_api():
    response = client.post("/api/v1/orders", json={
        "symbol": "VNM",
        "quantity": 100,
        "price": 50000
    })
    assert response.status_code == 201
    assert "orderId" in response.json()
```

---

### E2E (End-to-End) Test: Thuộc QA

**Khi nào:**
- Test toàn bộ flow từ UI đến Database
- Test như user thực tế (click button, fill form, verify result)
- Test business scenarios (Gherkin scenarios)

**Đặt ở đâu:**
- `/project-root/workspace/issues/{issueKey}/test/steps/`
- `tests/e2e/`

**Framework:**
- Web: Selenium, Playwright, Cypress
- API: requests, httpx
- Mobile: Appium

**Ai viết:**
- ✅ QA viết E2E test dựa trên test design (checklist + Gherkin)
- ✅ QA maintain E2E test khi requirements thay đổi
- ❌ DEV không viết E2E test (DEV focus unit/integration)

**Example:**
```python
# /project-root/workspace/issues/JIRA-123/test/steps/test_order.py (QA writes this)
@given('người dùng đã đăng nhập với tài khoản "1234567890"')
def step_impl(context):
    login("1234567890", "password")

@when('đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000')
def step_impl(context):
    context.response = create_order("VNM", 100, 50000)

@then('hệ thống ghi nhận lệnh thành công')
def step_impl(context):
    assert context.response.status_code == 201
```

---

### Performance Test: Thuộc QA (hoặc DEV support)

**Khi nào:**
- Load test (1000 requests/sec)
- Stress test (find breaking point)
- Soak test (sustained load 24h)

**Ai viết:**
- ✅ QA design performance test scenarios
- ✅ DEV support với profiling tools, optimization
- **Collaboration:** QA run tests, DEV analyze results

**Tools:**
- JMeter, Locust, k6, Artillery

---

### Security Test: Thuộc Security-Auditor (hoặc QA)

**Khi nào:**
- Penetration testing
- Vulnerability scanning
- Auth/authorization testing

**Ai viết:**
- ✅ Security-Auditor persona (agent)
- ✅ QA có thể viết basic security tests (SQL injection, XSS)
- ✅ DEV fix vulnerabilities found

---

### Code Review: CR Multi-Axis Review (`cr-review-code-and-quality`) + QA Testability Review

**2 góc nhìn bổ trợ trong `/cr-review`:**

#### Góc nhìn 1: Code Reviewer Persona (Kiến trúc & Chất lượng Mã nguồn)
- **Khi nào:** Sau khi code xong (application code hoặc test code), trước khi merge MR/PR
- **Ai làm:** Code Reviewer persona (`code-reviewer.md`) hoặc DEV tự kiểm tra
- **Focus (5 trục đánh giá):**
  - Correctness (logic đúng với spec, không có lỗi tiềm ẩn?)
  - Architecture & Clean Code (design rõ ràng, dễ đọc, tuân thủ quy ước?)
  - Security & Data Integrity (không rò rỉ dữ liệu, validate đầu vào?)
  - Performance (có N+1, memory leak hay bottleneck không?)
- **Command:** `/cr-review` (hoặc `/cr-code-simplify` để giảm độ phức tạp mã nguồn/test mock)

#### Góc nhìn 2: QA Review (Testability & Độ bao phủ kịch bản)
- **Khi nào:** Trước khi merge MR hoặc khi review bộ test automation
- **Ai làm:** QA review từ góc độ khả năng kiểm thử (testability) và độ phủ nghiệp vụ
- **Focus:**
  - Test coverage (đã bao phủ đủ kịch bản từ `checklist.md` và `.feature` chưa?)
  - Edge cases (có bỏ sót biên độ giá, phiên giao dịch, hay mã lỗi nào không?)
  - Error handling & Observability (xử lý lỗi đúng chuẩn và đủ log để truy vết không?)
- **Command:** `/cr-review` (tập trung trục QA Testability)

**Ưu tiên QA review kỹ các MR:**
- Tính năng trọng yếu (đặt lệnh, thanh toán, xác thực, bảo mật)
- Tính năng nghiệp vụ phức tạp (nhiều edge cases, đa sàn HSX/HNX/UPCOM)
- Các bản vá lỗi (verify fix đúng root cause và có regression test đi kèm)

---