# Phân tích Overlap: BA AC vs QA Test Design

**Ngày:** 2026-08-13  
**Vấn đề:** Overlap giữa `ba-acceptance-criteria` và `qa-test-design` trong việc viết BDD Gherkin

---

## ❌ Vấn đề Hiện tại

### Skill 1: `ba-acceptance-criteria` (BA/PO)
**Mô tả:** "Viết Acceptance Criteria (AC) dạng BDD Given-When-Then từ User Stories"

**Output:**
```gherkin
Scenario: Đặt lệnh mua với tài khoản đủ tiền
  Given khách hàng đã đăng nhập với tài khoản "1234567890"
  And tài khoản có số dư 10,000,000 VND
  When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
  Then hệ thống ghi nhận lệnh thành công
  And khách hàng nhận được mã lệnh
```

### Skill 2: `qa-test-design` (QA)
**Mô tả:** "Thiết kế test artifacts — Checklist + BDD Gherkin feature files"

**Output:**
```gherkin
Feature: Đặt lệnh mua/bán cổ phiếu

Scenario: Đặt lệnh mua với tài khoản đủ tiền
  Given khách hàng đã đăng nhập với tài khoản "1234567890"
  And tài khoản có số dư 10,000,000 VND
  When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
  Then hệ thống ghi nhận lệnh thành công
  And khách hàng nhận được mã lệnh
```

### ⚠️ Overlap: CẢ HAI viết BDD Gherkin giống y hệt!

---

## 🤔 Root Cause: Confusion về Role của AC

### Câu hỏi: AC là gì?

**Định nghĩa truyền thống (Agile/Scrum):**
> Acceptance Criteria là **điều kiện** mà User Story phải đáp ứng để được coi là "Done".

**Format phổ biến:**

#### Format 1: Checklist-style (Rule-based)
```markdown
## Acceptance Criteria

- [ ] Khách hàng có thể đặt lệnh mua/bán qua app
- [ ] Thời gian hoàn tất < 30 giây
- [ ] Hệ thống kiểm tra đủ tiền trước khi gửi lệnh
- [ ] Khách hàng nhận notification khi lệnh thành công
- [ ] Lệnh bị reject nếu không đủ tiền (margin)
```

**Đây là AC thuần túy** — Business rules, không phải test scenarios.

#### Format 2: BDD Given-When-Then
```gherkin
Scenario: Đặt lệnh mua với tài khoản đủ tiền
  Given khách hàng đã đăng nhập
  When khách hàng đặt lệnh mua 100 cổ phiếu
  Then hệ thống ghi nhận lệnh thành công
```

**Đây là Test Scenario** — Executable specification, QA dùng để viết automation.

---

## 🎯 Quyết định: BA viết AC nào? QA viết Gherkin nào?

### Industry Best Practice (ATDD - Acceptance Test-Driven Development)

```
BA/PO → Define AC (WHAT)     → Checklist-style, rule-based
                ↓
        Three Amigos Meeting (BA + DEV + QA)
                ↓
QA → Transform AC to Gherkin (HOW TO TEST) → Executable scenarios
```

**Separation:**

| Role | Output | Format | Purpose |
|------|--------|--------|---------|
| **BA/PO** | Acceptance Criteria | Checklist, Rules, Constraints | Define WHAT is "Done" |
| **QA** | Test Scenarios | BDD Gherkin (.feature files) | Define HOW TO VERIFY |

**Ví dụ:**

**BA writes (Checklist-style AC):**
```markdown
## Acceptance Criteria

### Functional Requirements
- [ ] Khách hàng có thể đặt lệnh mua/bán qua app
- [ ] Hỗ trợ 2 loại lệnh: LO (Limit Order), MP (Market Price)
- [ ] Số lượng phải là bội số của 100 (1 lô = 100 CP)
- [ ] Hệ thống kiểm tra margin trước khi gửi lệnh (margin >= 150% giá trị lệnh)

### Non-Functional Requirements
- [ ] Thời gian đặt lệnh < 30 giây (từ khi nhập đến khi lên sàn)
- [ ] Error messages rõ ràng (tiếng Việt, không dùng code lỗi)
- [ ] App không crash khi network chậm

### Edge Cases
- [ ] Nếu không đủ margin → Reject với message "Tài khoản không đủ tiền"
- [ ] Nếu ngoài giờ giao dịch → Reject với message "Thị trường đóng cửa"
- [ ] Nếu mã CK không hợp lệ → Reject với message "Mã chứng khoán không tồn tại"
```

**QA transforms (Gherkin scenarios):**
```gherkin
Feature: Đặt lệnh mua/bán cổ phiếu

  Scenario: Đặt lệnh mua LO với tài khoản đủ margin
    Given khách hàng đã đăng nhập với tài khoản "1234567890"
    And tài khoản có số dư 10,000,000 VND
    When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
    Then hệ thống ghi nhận lệnh trong vòng 30 giây
    And khách hàng nhận được mã lệnh
    And số dư tài khoản giảm 7,500,000 VND (50,000 * 100 * 1.5)

  Scenario: Reject lệnh khi không đủ margin
    Given khách hàng đã đăng nhập với tài khoản "9999999999"
    And tài khoản có số dư 1,000,000 VND
    When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
    Then hệ thống reject lệnh
    And hiển thị message "Tài khoản không đủ tiền"
```

**Key Differences:**

| Aspect | BA AC (Checklist) | QA Gherkin (Scenarios) |
|--------|------------------|------------------------|
| **Level** | High-level rules | Low-level test steps |
| **Data** | Generic ("đủ tiền") | Concrete ("10,000,000 VND") |
| **Format** | Checklist [ ] | Given-When-Then |
| **Executable** | ❌ No (manual verification) | ✅ Yes (automation) |
| **Audience** | Stakeholders, PO, DEV | QA, Automation engineers |
| **When** | During User Story writing | After AC approved, before coding |

---

## ✅ Đề xuất: Tái định nghĩa Ranh giới

### Giải pháp 1: BA viết Checklist, QA viết Gherkin (RECOMMENDED)

**Bước 1: BA/PO viết AC dạng Checklist**

Skill: `ba-acceptance-criteria`

**Input:** User Story  
**Output:** Checklist-style AC (KHÔNG phải Gherkin)

```markdown
## Acceptance Criteria

### Happy Path
- [ ] Khách hàng có thể đặt lệnh mua/bán qua app
- [ ] Hệ thống kiểm tra margin trước khi gửi lệnh
- [ ] Thời gian hoàn tất < 30 giây
- [ ] Khách hàng nhận notification real-time

### Edge Cases
- [ ] Reject nếu không đủ margin
- [ ] Reject nếu ngoài giờ giao dịch
- [ ] Reject nếu mã CK không hợp lệ

### Non-Functional
- [ ] App không crash khi network chậm
- [ ] Error messages bằng tiếng Việt
```

**Bước 2: QA transform AC → Gherkin**

Skill: `qa-test-design`

**Input:** AC Checklist (từ BA)  
**Output:** Gherkin .feature file

```gherkin
Feature: Đặt lệnh mua/bán cổ phiếu

  Scenario: Happy path - Đặt lệnh mua với tài khoản đủ margin
    Given khách hàng đã đăng nhập với tài khoản "1234567890"
    And tài khoản có số dư 10,000,000 VND
    When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
    Then hệ thống ghi nhận lệnh trong vòng 30 giây
    And khách hàng nhận notification "Lệnh đã gửi lên sàn"

  Scenario: Edge case - Reject khi không đủ margin
    Given khách hàng đã đăng nhập với tài khoản "9999999999"
    And tài khoản có số dư 1,000,000 VND
    When khách hàng đặt lệnh mua 100 cổ phiếu "VNM" tại giá 50,000 VND
    Then hệ thống reject lệnh
    And hiển thị message "Tài khoản không đủ tiền"
```

**Benefits:**
- ✅ Clear separation: BA defines WHAT, QA defines HOW TO TEST
- ✅ AC dễ đọc cho stakeholders (không technical)
- ✅ QA có freedom để design test scenarios (thêm test data, edge cases)
- ✅ Align với industry best practice (ATDD)

---

### Giải pháp 2: BA viết AC Gherkin (High-level), QA expand (Low-level)

**Nếu BA insist viết Gherkin** (một số org muốn AC dạng Gherkin):

**Bước 1: BA viết AC dạng Gherkin ABSTRACT (high-level, no concrete data)**

```gherkin
Scenario: Đặt lệnh mua với tài khoản đủ margin
  Given khách hàng đã đăng nhập
  And tài khoản có đủ tiền
  When khách hàng đặt lệnh mua cổ phiếu
  Then hệ thống ghi nhận lệnh thành công
  And khách hàng nhận được mã lệnh
```

**Bước 2: QA expand thành Gherkin CONCRETE (low-level, with test data)**

```gherkin
Scenario Outline: Đặt lệnh mua với tài khoản đủ margin
  Given khách hàng đã đăng nhập với tài khoản "<account_id>"
  And tài khoản có số dư <balance> VND
  When khách hàng đặt lệnh mua <quantity> cổ phiếu "<symbol>" tại giá <price> VND
  Then hệ thống ghi nhận lệnh trong vòng <timeout> giây
  And khách hàng nhận được mã lệnh
  And số dư tài khoản giảm <margin_required> VND

  Examples:
    | account_id | balance     | symbol | quantity | price  | timeout | margin_required |
    | 1234567890 | 10,000,000  | VNM    | 100      | 50,000 | 30      | 7,500,000       |
    | 9876543210 | 50,000,000  | VCB    | 200      | 80,000 | 30      | 24,000,000      |
```

**Benefits:**
- ✅ BA AC vẫn dạng Gherkin (satisfy stakeholder muốn "executable spec")
- ✅ QA có space để add test data, scenario outlines, tags
- ⚠️ Risk: Có thể vẫn duplicate nếu không clear về "abstract vs concrete"

---

## 🎯 Recommendation: Chọn Giải pháp 1

**Lý do:**

1. **Industry Standard:** BA viết checklist, QA viết Gherkin là best practice (ATDD, BDD)
2. **Clear Separation:** Không overlap, mỗi persona có output riêng biệt
3. **Audience-appropriate:** Checklist dễ đọc cho business stakeholders, Gherkin dễ execute cho QA automation
4. **Flexibility:** QA có freedom design test scenarios (data-driven, tags, scenario outlines)

---

## 📝 Action Items

### 1. Sửa skill `ba-acceptance-criteria`

**Thay đổi:**
- ❌ Xóa phần "viết BDD Given-When-Then"
- ✅ Focus vào Checklist-style AC (rule-based)
- ✅ Output: `docs/acceptance-criteria/{issueKey}-ac.md` (Checklist format)

**New Template:**
```markdown
## Acceptance Criteria

### Functional Requirements
- [ ] [Business rule 1]
- [ ] [Business rule 2]

### Non-Functional Requirements
- [ ] [Performance requirement]
- [ ] [Usability requirement]

### Edge Cases & Error Handling
- [ ] [Edge case 1 → Expected behavior]
- [ ] [Error scenario 2 → Expected error message]
```

---

### 2. Giữ nguyên `qa-test-design`

**QA skill:**
- ✅ Đọc AC Checklist từ BA
- ✅ Transform AC → Gherkin scenarios
- ✅ Add test data, scenario outlines, tags
- ✅ Output: `.feature` files

**Input sources:**
1. `docs/acceptance-criteria/{issueKey}-ac.md` (BA's checklist)
2. `specs/imports/jira/{issueKey}/{issueKey}-final.md` (Business-Spec)
3. User Stories

---

### 3. Update Pipeline

**Before (Overlap):**
```
/ba-user-stories → /ba-ac (Gherkin) → /qa-test-design (Gherkin again??) → Confusion
```

**After (Clean):**
```
/ba-user-stories → /ba-ac (Checklist) → /qa-test-design (Transform to Gherkin) → /qa-auto-design
```

**Handoff:**
- BA/PO: Viết AC Checklist → Save to `docs/acceptance-criteria/`
- QA: Đọc AC Checklist → Transform thành Gherkin → Save to `tests/qa-test-design/{issueKey}/features/`

---

## 📊 Before/After Comparison

| Aspect | Before (Overlap) | After (Clean Separation) |
|--------|-----------------|--------------------------|
| **BA Output** | BDD Gherkin (Given-When-Then) | Checklist (Rule-based) |
| **QA Output** | BDD Gherkin (Given-When-Then) | BDD Gherkin (Executable) |
| **Overlap** | ❌ 90% duplicate | ✅ 0% duplicate |
| **BA focuses on** | Test scenarios (wrong!) | Business rules (correct!) |
| **QA focuses on** | Duplicate work (wrong!) | Test design + automation (correct!) |
| **Handoff** | ⚠️ Unclear | ✅ Clear: AC Checklist → Gherkin |

---

## ✅ Next Steps

**Implement this fix:**

1. **Sửa `skills/ba-acceptance-criteria/SKILL.md`**
   - Xóa tất cả references về BDD Given-When-Then
   - Thêm Checklist-style templates
   - Update examples với Checklist format

2. **Sửa `.claude/commands/ba-ac.md`**
   - Update description: "Viết AC dạng Checklist (rule-based)"
   - Remove Gherkin references

3. **Update `agents/ba-po.md`**
   - Clarify: BA writes Checklist, QA writes Gherkin

4. **Update `CLAUDE.md`**
   - Section "Ranh giới Persona": Add "AC format"

5. **Test workflow:**
   ```bash
   /ba-user-stories G3PTP-16584
   /ba-ac G3PTP-16584           # Output: Checklist
   /qa-test-design G3PTP-16584  # Input: Checklist → Output: Gherkin
   ```

Bạn muốn tôi implement fix này ngay không?
