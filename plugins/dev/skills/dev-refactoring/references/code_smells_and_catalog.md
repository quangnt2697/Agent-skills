# Cẩm Nang Code Smells & Kỹ Thuật Refactoring (Martin Fowler)

### Bước 1: Identify Code Smell

Xác định code smell cần refactor:

#### **1.1. Duplication (Trùng lặp)**

```python
# BEFORE: Duplication
def create_order(data):
    if data['quantity'] <= 0:
        raise ValueError("Invalid quantity")
    if data['quantity'] % 100 != 0:
        raise ValueError("Quantity must be multiple of 100")
    # ... create order

def update_order(order_id, data):
    if data['quantity'] <= 0:
        raise ValueError("Invalid quantity")
    if data['quantity'] % 100 != 0:
        raise ValueError("Quantity must be multiple of 100")
    # ... update order
```

**Code smell:** Validation logic duplicated

#### **1.2. Long Function (Hàm quá dài)**

```python
# BEFORE: 80 dòng trong 1 function
def process_order(order_data):
    # Validate (20 dòng)
    # Check buying power (15 dòng)
    # Create order (20 dòng)
    # Send to exchange (15 dòng)
    # Update account (10 dòng)
```

**Code smell:** Function làm quá nhiều việc

#### **1.3. Bad Names (Tên không rõ nghĩa)**

```python
# BEFORE
def f(x, y):
    return x * y * 1.07

result = f(100, 50000)
```

**Code smell:** Không biết `f` là gì, `1.07` là gì

#### **1.4. God Object (Class quá lớn)**

```python
# BEFORE
class OrderService:
    def create_order(self): ...
    def validate_order(self): ...
    def calculate_fees(self): ...
    def send_to_exchange(self): ...
    def update_account(self): ...
    def send_notification(self): ...
    def log_audit(self): ...
    # ... 20 methods total
```

**Code smell:** Class làm quá nhiều responsibilities

### Bước 2: Choose Refactoring Technique

Chọn kỹ thuật phù hợp:

| Code Smell          | Refactoring Technique      | Ví dụ                                         |
|---------------------|----------------------------|-----------------------------------------------|
| Duplication         | Extract Function           | Extract validation logic                      |
| Long Function       | Extract Method             | Split 80-line function → 4 functions          |
| Bad Names           | Rename                     | `f()` → `calculate_total_with_tax()`          |
| Magic Numbers       | Extract Constant           | `1.07` → `TAX_RATE = 1.07`                    |
| Long Parameter List | Introduce Parameter Object | 5 params → 1 object                           |
| God Object          | Extract Class              | OrderService → OrderValidator, OrderNotifier  |
| Feature Envy        | Move Method                | Method uses data from another class → move it |
| Data Clumps         | Extract Class              | 3 fields always together → 1 object           |

### Bước 3: Apply Refactoring (với IDE hoặc thủ công)

#### **3.1. Extract Function (Duplication)**

```python
# STEP 1: Extract validation to new function
def validate_quantity(quantity):
    """Validate order quantity."""
    if quantity <= 0:
        raise ValueError("Invalid quantity")
    if quantity % 100 != 0:
        raise ValueError("Quantity must be multiple of 100")

# STEP 2: Replace duplication with function call
def create_order(data):
    validate_quantity(data['quantity'])  # ← Use extracted function
    # ... create order

def update_order(order_id, data):
    validate_quantity(data['quantity'])  # ← Use extracted function
    # ... update order
```

**Verify:**
```bash
pytest tests/ -v
# All tests should pass (same behavior)
```

**Commit:**
```bash
git add .
git commit -m "Refactor: Extract validate_quantity() function

- Extracted quantity validation logic to reusable function
- Replaced duplication in create_order() and update_order()
- No behavior change, all tests pass"
```

#### **3.2. Extract Method (Long Function)**

```python
# STEP 1: Extract each section to method
def process_order(order_data):
    validated_data = _validate_order(order_data)
    _check_buying_power(validated_data)
    order = _create_order_record(validated_data)
    _send_to_exchange(order)
    _update_account_balance(order)
    return order

def _validate_order(data):
    # Validation logic (20 dòng)
    return validated_data

def _check_buying_power(data):
    # Buying power check (15 dòng)
    pass

def _create_order_record(data):
    # Create order (20 dòng)
    return order

def _send_to_exchange(order):
    # Send to exchange (15 dòng)
    pass

def _update_account_balance(order):
    # Update account (10 dòng)
    pass
```

**Verify + Commit** sau mỗi extract.

#### **3.3. Rename (Bad Names)**

```python
# STEP 1: Rename function
def calculate_total_with_tax(quantity, price):
    TAX_RATE = 1.07
    return quantity * price * TAX_RATE

# STEP 2: Update all call sites
result = calculate_total_with_tax(100, 50000)
```

**Tip:** Dùng IDE refactor tool (Ctrl+R trong VS Code, Refactor → Rename) để rename tất cả references tự động.

**Verify + Commit.**

#### **3.4. Extract Class (God Object)**

```python
# STEP 1: Create new classes
class OrderValidator:
    def validate(self, order_data):
        # Validation logic
        pass

class OrderNotifier:
    def send_confirmation(self, order):
        # Notification logic
        pass

# STEP 2: Refactor OrderService to use them
class OrderService:
    def __init__(self):
        self.validator = OrderValidator()
        self.notifier = OrderNotifier()
    
    def create_order(self, data):
        self.validator.validate(data)
        order = self._create_order_record(data)
        self.notifier.send_confirmation(order)
        return order
```

**Verify + Commit.**

### Bước 4: Run Tests & Verify

Sau mỗi refactoring step:

```bash
# 1. Run full test suite
npm test  # hoặc pytest, ./gradlew test

# Expect: ALL TESTS PASS (same as before refactor)
```

```bash
# 2. Run type check (nếu có)
npx tsc --noEmit  # TypeScript
mypy .            # Python

# Expect: NO TYPE ERRORS
```

```bash
# 3. Run linter (nếu có)
npm run lint     # JavaScript
pylint src/      # Python

# Expect: NO NEW WARNINGS (có thể fix existing warnings)
```

**Nếu có test fail:**

```markdown
❌ **Refactoring Failed**

Test `test_create_order_with_valid_data` failed:
```
AssertionError: Expected status 'PENDING', got 'REJECTED'
```

**Root Cause:** Extracted `validate_quantity()` thay đổi logic validation

**Action:**
1. Rollback refactoring: `git reset --hard HEAD`
2. Debug: Tại sao logic thay đổi?
3. Fix và refactor lại
```

### Bước 5: Commit & Continue

Mỗi refactoring step = 1 commit:

```bash
git add .
git commit -m "Refactor: [Technique] [What changed]

- [Chi tiết thay đổi]
- No behavior change
- All tests pass

Related: #123"
```

**Ví dụ commit messages:**

```
Refactor: Extract validate_quantity() function

- Extracted quantity validation to reusable function
- Replaced duplication in create_order() and update_order()
- No behavior change, all tests pass

Refactor: Rename f() to calculate_total_with_tax()

- Renamed function for clarity
- Updated 5 call sites
- No behavior change, all tests pass

Refactor: Extract OrderValidator class

- Moved validation logic from OrderService to new OrderValidator
- OrderService now uses composition
- No behavior change, all tests pass
```

## Refactoring Catalog (Common Techniques)

### 1. Extract Function

**When:** Code duplication, long function
**How:** Tạo function mới, move logic vào, replace với function call

```python
# Before
def a():
    x = complex_calculation()
    y = x * 2
    return y

def b():
    x = complex_calculation()  # Duplicated
    return x

# After
def complex_calculation():
    # Extracted logic
    pass

def a():
    x = complex_calculation()
    return x * 2

def b():
    return complex_calculation()
```

### 2. Inline Function

**When:** Function chỉ có 1 dòng, không reuse
**How:** Replace function call bằng function body

```python
# Before
def get_tax_rate():
    return 0.07

total = price * get_tax_rate()

# After
total = price * 0.07  # Inline
```

### 3. Extract Constant

**When:** Magic number
**How:** Tạo constant có tên rõ nghĩa

```python
# Before
total = price * 1.07

# After
TAX_RATE = 1.07
total = price * TAX_RATE
```

### 4. Rename Variable/Function

**When:** Tên không rõ nghĩa
**How:** Rename với IDE tool

```python
# Before
def calc(x, y):
    return x * y

# After
def calculate_order_total(quantity, price):
    return quantity * price
```

### 5. Extract Class

**When:** God Object
**How:** Tạo class mới, move related methods

```python
# Before
class OrderService:
    def validate(self): ...
    def create(self): ...
    def notify(self): ...

# After
class OrderValidator:
    def validate(self): ...

class OrderService:
    def __init__(self):
        self.validator = OrderValidator()
    
    def create(self):
        self.validator.validate()
        # ...
```

### 6. Introduce Parameter Object

**When:** Long parameter list (> 3 params)
**How:** Group params thành object

```python
# Before
def create_order(symbol, quantity, price, side, order_type):
    pass

# After
class OrderRequest:
    def __init__(self, symbol, quantity, price, side, order_type):
        self.symbol = symbol
        # ...

def create_order(request: OrderRequest):
    pass
```

### 7. Replace Conditional with Polymorphism

**When:** Long if-elif chain dựa trên type
**How:** Tạo subclass cho mỗi type

```python
# Before
def calculate_fee(order_type, amount):
    if order_type == "LO":
        return amount * 0.001
    elif order_type == "MP":
        return amount * 0.002
    elif order_type == "ATO":
        return amount * 0.0015

# After
class Order:
    def calculate_fee(self, amount):
        raise NotImplementedError

class LimitOrder(Order):
    def calculate_fee(self, amount):
        return amount * 0.001

class MarketOrder(Order):
    def calculate_fee(self, amount):
        return amount * 0.002

class ATOOrder(Order):
    def calculate_fee(self, amount):
        return amount * 0.0015
```

