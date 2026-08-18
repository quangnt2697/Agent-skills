---
name: qa-run-test
description: Chạy automation test đã có sẵn và xuất báo cáo kết quả. KHÔNG sinh code test mới. Sử dụng khi cần chạy regression test, verify sau khi fix bug, hoặc kiểm tra test suite hiện tại.
---

# Chạy Automation Test (QA Run Test)

## Tổng quan

Chạy automation test đã có sẵn trong project và xuất báo cáo kết quả chi tiết. Skill này **KHÔNG sinh code test mới** — chỉ chạy test hiện có và phân tích kết quả. Phù hợp cho regression testing, verification sau fix, hoặc kiểm tra health của test suite.

## Khi nào sử dụng

- Chạy regression test suite sau khi merge code mới
- Verify sau khi fix bug (đảm bảo fix không làm vỡ test khác)
- Kiểm tra test suite hiện tại có pass không
- Chạy test cho một module/feature cụ thể
- Generate test report để gửi cho team/stakeholders
- Phân tích flaky tests hoặc test failures

**Khi KHÔNG sử dụng:**
- Cần viết test case mới → dùng `qa-test-design`
- Cần sinh automation test code từ Gherkin → dùng `qa-auto-design`
- Cần full pipeline từ Jira → dùng `qa-pipeline`

## Quy trình 5 Bước

### Bước 0: Xác định Scope

Trước khi chạy test, xác định:

1. **Test directory:** Test nằm ở đâu?
   - `tests/` (convention phổ biến)
   - `workspace/{issueKey}/tests/qa-test-design/{issueKey}/steps/` (theo qa-auto-design)
   - `tests/e2e/`, `tests/integration/`
   - Hoặc đường dẫn custom user chỉ định

2. **Test framework:** Dự án đang dùng framework gì?
   ```bash
   # Detect test framework
   if [ -f "pytest.ini" ] || grep -q "pytest" requirements.txt; then
       FRAMEWORK="pytest"
   elif [ -f "package.json" ] && grep -q "jest" package.json; then
       FRAMEWORK="jest"
   elif [ -f "package.json" ] && grep -q "mocha" package.json; then
       FRAMEWORK="mocha"
   elif [ -f "pom.xml" ] && grep -q "junit" pom.xml; then
       FRAMEWORK="junit"
   else
       # Hỏi user
       echo "Không detect được test framework. Bạn đang dùng framework gì?"
   fi
   ```

3. **Test pattern:** Chạy tất cả hay chỉ một phần?
   - Tất cả: `pytest tests/`
   - Theo tag: `pytest -m smoke`
   - Theo file: `pytest tests/test_login.py`
   - Theo pattern: `pytest tests/test_order*.py`

### Bước 1: Kiểm tra Môi trường (Pre-flight Check)

Trước khi chạy test, verify dependencies:

```bash
# 1. Check test framework installed
pytest --version || echo "pytest not installed"

# 2. Check test files exist
ls -la tests/ || echo "No tests/ directory"

# 3. Check environment variables (nếu test cần)
# VD: API_BASE_URL, DB_CONNECTION_STRING
[ -f .env ] && echo ".env found" || echo ".env missing"

# 4. Check test dependencies
# Python: pip list | grep selenium
# Node: npm list --depth=0
```

**Nếu thiếu dependencies:**
```markdown
⚠️ **Pre-flight Check Failed**

Thiếu dependencies:
- `pytest` not installed → Run: `pip install pytest`
- `.env` file missing → Cần tạo với: API_BASE_URL, DB_HOST, ...

Bạn muốn tôi:
1. Install missing dependencies?
2. Tạo .env template?
3. Skip và chạy anyway? (không khuyến khích)
```

### Bước 2: Chạy Test Suite

Chạy test với options phù hợp cho framework:

#### **Pytest (Python)**
```bash
# Basic run
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html --cov-report=term

# With markers (tags)
pytest tests/ -m "smoke or regression" -v

# With output format
pytest tests/ --junitxml=reports/junit.xml --html=reports/report.html

# Parallel execution
pytest tests/ -n auto  # requires pytest-xdist

# Stop on first failure
pytest tests/ -x

# Full command (recommended)
pytest tests/ \
  -v \
  --tb=short \
  --junitxml=reports/junit.xml \
  --html=reports/report.html \
  --self-contained-html \
  --cov=src \
  --cov-report=html:reports/coverage
```

#### **Jest (JavaScript/TypeScript)**
```bash
# Basic run
npm test

# With coverage
npm test -- --coverage

# Specific file
npm test -- tests/login.test.js

# Watch mode
npm test -- --watch

# With reporters
npm test -- --reporters=default --reporters=jest-junit

# Full command
npm test -- \
  --coverage \
  --coverageDirectory=reports/coverage \
  --testResultsProcessor=jest-junit \
  --verbose
```

#### **JUnit (Java)**
```bash
# Maven
mvn test

# Gradle
./gradlew test

# With reports
mvn test -Dsurefire.reports.directory=reports/junit
```

**Lưu output vào file:**
```bash
# Capture stdout + stderr
pytest tests/ -v 2>&1 | tee reports/test-output.log
```

### Bước 3: Phân tích Kết quả

Sau khi test chạy xong, phân tích kết quả:

#### **3.1. Tổng hợp Metrics**

```python
# Parse pytest output
import re

output = open('reports/test-output.log').read()

# Extract metrics
total = re.search(r'(\d+) passed', output)
failed = re.search(r'(\d+) failed', output)
skipped = re.search(r'(\d+) skipped', output)
errors = re.search(r'(\d+) errors', output)
duration = re.search(r'in ([\d.]+)s', output)

metrics = {
    'total': int(total.group(1)) if total else 0,
    'passed': int(total.group(1)) if total else 0,
    'failed': int(failed.group(1)) if failed else 0,
    'skipped': int(skipped.group(1)) if skipped else 0,
    'errors': int(errors.group(1)) if errors else 0,
    'duration': float(duration.group(1)) if duration else 0,
    'pass_rate': (passed / total * 100) if total > 0 else 0
}
```

#### **3.2. Phân loại Failures**

```markdown
## Test Failures Breakdown

### Critical Failures (Blocking)
- `test_user_login` — AssertionError: Expected 200, got 401
  - Root cause: API endpoint changed
  - File: tests/test_auth.py:45
  
### Flaky Failures (Intermittent)
- `test_websocket_reconnect` — TimeoutError (failed 2/3 runs)
  - Root cause: Hard-coded wait 1s, cần tăng lên 3s
  - File: tests/test_websocket.py:89

### Environment Issues
- `test_db_connection` — ConnectionError: Cannot connect to DB
  - Root cause: Missing DB_HOST in .env
  - File: tests/test_database.py:12
```

#### **3.3. Trace Error Details**

Với mỗi failed test, lấy chi tiết:
- Assertion message
- Stack trace
- Request/Response (nếu test API)
- Screenshot (nếu test UI)
- Log output

**Ví dụ chi tiết 1 failed test:**
```markdown
### ❌ test_order_creation_with_invalid_quantity

**File:** `tests/test_order.py:67`

**Error:**
```
AssertionError: Expected API to reject order with quantity=0
  Expected status: 400
  Actual status: 200
```

**Request:**
```json
POST /api/orders
{
  "symbol": "VNM",
  "quantity": 0,
  "price": 50000
}
```

**Response:**
```json
{
  "status": "success",
  "orderId": "ORD-12345"
}
```

**Root Cause:** API validation rule thiếu check `quantity > 0`

**Recommended Fix:**
1. Thêm validation trong `src/api/orders.py:validate_order()`
2. Test case này ĐÚNG, cần fix app code (không fix test)
```

### Bước 4: Sinh Báo cáo (Generate Report)

Xuất báo cáo dạng Markdown với cấu trúc chuẩn:

#### **Template Báo cáo**

```markdown
# Báo cáo Kết quả Kiểm thử Automation

**Ngày chạy:** 2024-01-15 10:30:00
**Test Suite:** `workspace/{issueKey}/tests/qa-test-design/JIRA-123/steps/`
**Framework:** pytest 7.4.0
**Environment:** UAT
**Triggered by:** Manual / CI/CD / Regression

---

## 📊 Tổng quan (Summary)

| Metric | Value |
|--------|-------|
| **Total Tests** | 45 |
| **Passed** | 40 (88.9%) |
| **Failed** | 3 (6.7%) |
| **Skipped** | 2 (4.4%) |
| **Duration** | 2m 34s |
| **Pass Rate** | 88.9% |

**Status:** ⚠️ **FAILED** (3 critical failures)

---

## ✅ Passed Tests (40)

<details>
<summary>Xem chi tiết 40 tests passed</summary>

- `test_user_login_with_valid_credentials` ✅ (0.5s)
- `test_order_creation_with_valid_data` ✅ (1.2s)
- `test_portfolio_balance_calculation` ✅ (0.8s)
...
</details>

---

## ❌ Failed Tests (3)

### 1. test_order_creation_with_invalid_quantity — CRITICAL

**File:** `tests/test_order.py:67`
**Duration:** 0.3s
**Error Type:** AssertionError

**Chi tiết:**
```
Expected API to reject order with quantity=0
  Expected status: 400
  Actual status: 200
```

**Request:**
```json
POST /api/orders
{
  "symbol": "VNM",
  "quantity": 0,
  "price": 50000
}
```

**Response:**
```json
{
  "status": "success",
  "orderId": "ORD-12345"
}
```

**Root Cause:** API validation thiếu check `quantity > 0`

**Action Required:**
- [ ] Fix validation rule trong `src/api/orders.py`
- [ ] Re-run test sau khi fix

**Priority:** P0 (Blocking Release)

---

### 2. test_websocket_reconnect — FLAKY

**File:** `tests/test_websocket.py:89`
**Duration:** 5.1s
**Error Type:** TimeoutError

**Chi tiết:**
```
Timeout waiting for reconnect event after 1s
```

**Root Cause:** Hard-coded wait 1s không đủ, WebSocket reconnect mất ~2-3s

**Action Required:**
- [ ] Tăng timeout từ 1s lên 5s trong test
- [ ] Hoặc dùng smart wait với retry

**Priority:** P1 (Test flaky, cần fix)

---

### 3. test_db_connection — ENVIRONMENT

**File:** `tests/test_database.py:12`
**Duration:** 0.1s
**Error Type:** ConnectionError

**Chi tiết:**
```
Cannot connect to database: Missing DB_HOST
```

**Root Cause:** File `.env` thiếu biến `DB_HOST`

**Action Required:**
- [ ] Thêm `DB_HOST=localhost` vào `.env`
- [ ] Re-run test

**Priority:** P2 (Environment config)

---

## ⏭️ Skipped Tests (2)

- `test_payment_integration` — Skipped: Payment gateway not available in UAT
- `test_sms_notification` — Skipped: SMS service mocked in test env

---

## 📈 Test Coverage

**Overall Coverage:** 78%

| Module | Coverage | Missing Lines |
|--------|----------|---------------|
| `src/api/orders.py` | 92% | Lines 45-48 |
| `src/api/auth.py` | 85% | Lines 67-70, 89 |
| `src/utils/validation.py` | 65% | Lines 12-25 |

**Recommendation:** Tăng coverage cho `validation.py` (hiện chỉ 65%)

---

## 🔍 Traceability Matrix (End-to-End)

Ánh xạ từ Business Spec → Checklist → Gherkin → Test → Result:

| Business Rule | Checklist ID | Gherkin Scenario | Test Case | Result |
|---------------|--------------|------------------|-----------|--------|
| Khối lượng phải > 0 | CHK-001 | Scenario: Từ chối lệnh với quantity=0 | test_order_creation_with_invalid_quantity | ❌ FAILED |
| Giá trong Sàn-Trần | CHK-002 | Scenario: Từ chối lệnh giá vượt trần | test_order_price_ceiling_validation | ✅ PASSED |
| User đã login | CHK-003 | Scenario: API yêu cầu token hợp lệ | test_auth_required_for_orders | ✅ PASSED |

---

## 🎯 Khuyến nghị (Recommendations)

### Cần Fix Ngay (P0)
1. **API validation thiếu** — `test_order_creation_with_invalid_quantity` failed
   - Fix: Thêm rule `quantity > 0` vào `src/api/orders.py:validate_order()`
   - ETA: 15 phút

### Cần Fix Sớm (P1)
2. **Flaky test** — `test_websocket_reconnect` failed intermittently
   - Fix: Tăng timeout hoặc dùng smart wait
   - ETA: 30 phút

### Cần Fix Khi Có Thời gian (P2)
3. **Environment config** — `.env` thiếu `DB_HOST`
   - Fix: Update `.env.example` và docs
   - ETA: 10 phút

4. **Test coverage thấp** — `validation.py` chỉ 65%
   - Fix: Thêm unit tests cho validation logic
   - ETA: 1 giờ

---

## 📁 Artifacts

- **JUnit XML:** `reports/junit.xml`
- **HTML Report:** `reports/report.html`
- **Coverage Report:** `reports/coverage/index.html`
- **Log Output:** `reports/test-output.log`

---

## 🚀 Next Steps

1. Fix 3 failed tests theo priority (P0 → P1 → P2)
2. Re-run full test suite: `pytest tests/ -v`
3. Nếu pass 100% → Approve để merge vào main
4. Nếu còn fail → Debug và repeat
```

### Bước 5: Đề xuất Hành động (Action Items)

Dựa trên kết quả, đề xuất hành động cụ thể:

```markdown
## 🎯 Action Items

### Cho Developer
- [ ] Fix validation rule `quantity > 0` trong `src/api/orders.py`
- [ ] Deploy fix lên UAT
- [ ] Notify QA để re-run test

### Cho QA
- [ ] Fix flaky test `test_websocket_reconnect` (tăng timeout)
- [ ] Update `.env` với `DB_HOST=localhost`
- [ ] Re-run test suite sau khi DEV fix

### Cho DevOps
- [ ] Đảm bảo CI/CD chạy full test suite trước mỗi deploy
- [ ] Setup alert khi pass rate < 90%
```

## Output Files

Skill này tạo các output files sau:

```
reports/
├── test-output.log              # Raw output từ test runner
├── junit.xml                    # JUnit format (cho CI/CD)
├── report.html                  # HTML report (human-readable)
├── coverage/                    # Code coverage report
│   └── index.html
└── {issueKey}-test-report.md   # Markdown report (chi tiết nhất)
```

**Đường dẫn đầy đủ:** `workspace/{issueKey}/tests/qa-test-design/{issueKey}/reports/`

## Tích hợp với Pipeline

Skill này nằm ở **Giai đoạn 4** trong QA pipeline:

```
Giai đoạn 1         Giai đoạn 2         Giai đoạn 3         Giai đoạn 4
/ba-spec       →   /qa-test-design →   /qa-auto-design →   /qa-run-test ← YOU ARE HERE
Import Jira        Thiết kế test       Sinh test code      Chạy test & Report
```

**Khi nào invoke `qa-run-test`:**
- Sau khi `/qa-auto-design` sinh test code xong
- Sau khi DEV fix bug (regression check)
- Định kỳ (nightly regression)
- Trước khi release (smoke test)

## Các Tình huống Thường gặp

### Tình huống 1: Test failed do app bug

```markdown
**Kết quả:** 3 tests failed

**Root cause:** App code thiếu validation

**Action:**
1. Tạo bug ticket với chi tiết từ test report
2. Gửi cho DEV team
3. CHỜ DEV fix
4. Re-run test sau khi fix
```

### Tình huống 2: Test failed do test code sai

```markdown
**Kết quả:** 5 tests failed

**Root cause:** Assertion sai (expect 400, nhưng API spec nói 422 mới đúng)

**Action:**
1. Fix test code (không fix app code)
2. Re-run test
3. Nếu pass → Update test report
```

### Tình huống 3: Test flaky (pass/fail không ổn định)

```markdown
**Kết quả:** `test_websocket` pass 2/3 runs

**Root cause:** Race condition, hard-coded wait

**Action:**
1. Refactor test với smart wait
2. Tăng timeout
3. Re-run 10 lần để verify stability
```

### Tình huống 4: Test skip do environment

```markdown
**Kết quả:** 10 tests skipped

**Root cause:** Test cần DB nhưng DB không available trong CI

**Action:**
1. Setup DB trong CI (preferred)
2. Hoặc mock DB (fallback)
3. Hoặc accept skip (document reason)
```

## Checklist Xác minh

Trước khi xuất báo cáo:

- [ ] Test đã chạy xong (không timeout giữa chừng)
- [ ] Có log output đầy đủ
- [ ] Đã parse metrics (total, passed, failed, skipped)
- [ ] Mỗi failed test có chi tiết error + root cause
- [ ] Đã phân loại failures (critical, flaky, environment)
- [ ] Có traceability matrix (nếu test từ qa-auto-design)
- [ ] Có action items cho mỗi failure
- [ ] Report file đã được tạo tại đúng đường dẫn

## Các Lệnh Hữu ích

### Pytest
```bash
# List all tests
pytest --collect-only

# Run specific marker
pytest -m smoke

# Run last failed
pytest --lf

# Show local variables in traceback
pytest -l

# Generate HTML report
pytest --html=report.html --self-contained-html
```

### Jest
```bash
# Update snapshots
npm test -- -u

# Run in watch mode
npm test -- --watch

# Coverage threshold
npm test -- --coverage --coverageThreshold='{"global":{"branches":80}}'
```

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Chạy test mà không check dependencies trước
- Bỏ qua failed tests mà không phân tích root cause
- Report kết quả mà không có action items
- Re-run test nhiều lần mà không fix gốc rễ
- Commit test report files vào git (chỉ commit test code)

✅ **NÊN:**
- Pre-flight check dependencies
- Phân tích từng failed test chi tiết
- Đề xuất action items cụ thể với priority
- Fix root cause trước khi re-run
- Report files vào `.gitignore`, chỉ share link hoặc artifact

## Xem thêm

- `qa-auto-design` — Sinh test code từ Gherkin (giai đoạn trước)
- `qa-pipeline` — Full pipeline bao gồm chạy test
- `dev-debugging` — Debug khi test failed do app bug
- `references/qa-testing-checklist.md` — Baseline test coverage
