# Phân tích Ranh giới: BA/PO Acceptance Criteria vs QA Gherkin Scenarios

**Mục đích:** Làm rõ sự khác biệt giữa AC của BA/PO và Gherkin của QA để tránh overlap và duplicate công việc.

---

## 🎯 Nguyên tắc vàng

> **BA/PO viết AC = High-level business rules và trường hợp chính (WHAT must be true)**
> 
> **QA viết Gherkin = Chi tiết test scenarios với test data, cover đủ các trường hợp ngoại lệ (HOW to test)**

**KHÔNG overlap:** BA viết high-level rules, QA expand thành low-level test scenarios với data cụ thể.

---

## 📋 BA/PO: Acceptance Criteria (Section 9 trong *-final.md)

### Format

**Business Checklist** — Không phải Gherkin, không phải test case, chỉ là business rules.

### Đặc điểm

- ✅ High-level (không chi tiết kỹ thuật)
- ✅ Tập trung vào **trường hợp chính** (happy path + main alternatives)
- ✅ Dùng ngôn ngữ business (không technical jargon)
- ✅ Mỗi item là một **điều kiện nghiệp vụ** cần đạt được
- ❌ KHÔNG có test data cụ thể
- ❌ KHÔNG cover đủ edge cases
- ❌ KHÔNG phải Gherkin format

### Ví dụ

```markdown
## 9. Acceptance Criteria

### AC1: Đặt lệnh Limit Order (LO)
- [ ] Người dùng có thể đặt lệnh LO với giá > 0
- [ ] Hệ thống kiểm tra margin trước khi cho phép đặt lệnh
- [ ] Lệnh được gửi đến sàn trong vòng 500ms
- [ ] Người dùng nhận được thông báo xác nhận khi lệnh đặt thành công

### AC2: Validation
- [ ] Hệ thống từ chối lệnh nếu giá ≤ 0
- [ ] Hệ thống từ chối lệnh nếu margin không đủ
- [ ] Hệ thống hiển thị lỗi rõ ràng khi validation fail

### AC3: Edge Cases
- [ ] Hệ thống xử lý đúng khi giá là số thập phân (ví dụ: 80.5)
- [ ] Hệ thống xử lý đúng khi khối lượng rất lớn (> 1,000,000)
```

**Lưu ý:**
- Chỉ liệt kê **trường hợp chính** và **edge cases quan trọng** (không liệt kê đủ mọi boundary)
- Không có Given-When-Then
- Không có test data cụ thể (ví dụ: "VNM", 80000, 100 shares)

---

## 🧪 QA: Gherkin Scenarios (trong {issueKey}.feature)

### Format

**BDD Gherkin** — Given-When-Then với test data cụ thể.

### Đặc điểm

- ✅ Chi tiết với test data cụ thể
- ✅ Cover **ĐỦ CÁC TRƯỜNG HỢP**: happy path + alternative flows + edge cases + negative cases + boundary values
- ✅ Dùng BDD format (Given-When-Then)
- ✅ Có assertions rõ ràng (response time, error messages, v.v.)
- ✅ Testable và executable
- ✅ Mỗi scenario là một **test case** có thể chạy được

### Ví dụ (Transform từ AC của BA)

```gherkin
Feature: Đặt lệnh Limit Order (LO)
  As a trader
  I want to đặt lệnh LO với giá xác định
  So that tôi có thể mua/bán cổ phiếu tại mức giá mong muốn

  Background:
    Given người dùng đã đăng nhập với username "trader001"
    And tài khoản có margin available = 100,000,000 VNĐ

# === HAPPY PATH (từ AC1) ===
  Scenario: Đặt lệnh LO thành công với giá hợp lệ
    Given mã cổ phiếu "VNM" đang giao dịch
    And giá thị trường hiện tại của "VNM" = 79,500 VNĐ
    When người dùng đặt lệnh LO mua "VNM" với:
      | Giá    | Khối lượng |
      | 80,000 | 100        |
    Then hệ thống kiểm tra margin: 80,000 * 100 * 1.1 = 8,800,000 < 100,000,000 ✅
    And lệnh được chấp nhận
    And lệnh được gửi đến sàn trong vòng 500ms
    And người dùng nhận được thông báo: "Đặt lệnh thành công. Mã lệnh: ORD-123456"
    And balance mới = 100,000,000 - 8,800,000 = 91,200,000 VNĐ

# === NEGATIVE CASES (từ AC2) ===
  Scenario Outline: Validation fail - Giá không hợp lệ
    When người dùng đặt lệnh LO mua "VNM" với giá <giá> và khối lượng 100
    Then hệ thống từ chối lệnh
    And hiển thị lỗi: "<error_message>"

    Examples:
      | giá  | error_message      |
      | 0    | Giá phải lớn hơn 0 |
      | -100 | Giá phải lớn hơn 0 |
      | null | Giá là bắt buộc    |

  Scenario: Validation fail - Margin không đủ
    Given margin available = 5,000,000 VNĐ
    When người dùng đặt lệnh LO mua "VNM" với giá 80,000 và khối lượng 100
    Then hệ thống tính margin cần: 80,000 * 100 * 1.1 = 8,800,000 VNĐ
    And hệ thống từ chối lệnh vì margin không đủ
    And hiển thị lỗi: "Margin không đủ. Cần 8,800,000 VNĐ, có 5,000,000 VNĐ"

# === EDGE CASES (từ AC3) ===
  Scenario: Edge case - Giá là số thập phân
    When người dùng đặt lệnh LO mua "VNM" với giá 80.5 và khối lượng 100
    Then hệ thống làm tròn giá về số nguyên gần nhất: 81 VNĐ
    And lệnh được chấp nhận với giá 81,000 VNĐ

  Scenario: Edge case - Khối lượng rất lớn
    Given margin available = 10,000,000,000 VNĐ
    When người dùng đặt lệnh LO mua "VNM" với giá 80,000 và khối lượng 1,200,000
    Then hệ thống kiểm tra margin: 80,000 * 1,200,000 * 1.1 = 105,600,000,000 VNĐ
    And hệ thống từ chối lệnh vì vượt quá giới hạn khối lượng cho phép
    And hiển thị lỗi: "Khối lượng tối đa: 1,000,000 cổ phiếu"

# === BOUNDARY VALUES (QA TỰ BỔ SUNG) ===
  Scenario Outline: Boundary value testing - Giá
    When người dùng đặt lệnh LO mua "VNM" với giá <giá> và khối lượng 100
    Then kết quả là: <result>

    Examples:
      | giá       | result   |             |
      | 1         | Accepted | # Min valid |  
      | 1,000     | Accepted |             |
      | 999,999   | Accepted | # Max valid |  
      | 1,000,000 | Rejected | # Over max  |  
```

**Lưu ý:**
- QA expand từ 3 AC items của BA thành **8 scenarios** với test data cụ thể
- Cover đủ: Happy path + Negative cases + Edge cases + Boundary values
- Mỗi scenario có thể chạy được (executable)

---

## 📊 So sánh Trực tiếp

| Aspect         | BA/PO Acceptance Criteria                | QA Gherkin Scenarios                                   |
|----------------|------------------------------------------|--------------------------------------------------------|
| **Format**     | Business Checklist                       | Given-When-Then                                        |
| **Level**      | High-level                               | Chi tiết                                               |
| **Test Data**  | Không có                                 | Có cụ thể (VNM, 80000, 100)                            |
| **Coverage**   | Trường hợp chính + edge cases quan trọng | ĐỦ CÁC trường hợp (happy + negative + edge + boundary) |
| **Ngôn ngữ**   | Business terms                           | Technical + Business                                   |
| **Executable** | Không                                    | Có (automation test)                                   |
| **Audience**   | Stakeholders, DEV, QA                    | QA, Automation Engineers                               |
| **Số lượng**   | 3-10 items                               | 8-30 scenarios (expansion 3-5x)                        |

---

## 🔄 Workflow Transform

```
BA/PO writes AC (Section 9)
         ↓
      *-final.md
         ↓
QA reads AC ────────────────────┐
         ↓                      │
QA creates Checklist            │
  (P0/P1/P2 priority)           │
         ↓                      │
QA writes Gherkin               │← Expansion 3-5x
  - Happy path (từ AC)          │
  - Alternative flows (từ AC)   │
  - Edge cases (từ AC + tự bổ sung)
  - Negative cases (tự bổ sung) │
  - Boundary values (tự bổ sung)│
         ↓                      │
   {issueKey}.feature ──────────┘
```

---

## ✅ CHECKLIST: BA/PO viết AC

Khi viết Acceptance Criteria trong `*-final.md`, BA/PO cần:

- [ ] Dùng **Business Checklist format** (không phải Gherkin)
- [ ] Tập trung vào **trường hợp chính** (happy path + main alternatives)
- [ ] Bổ sung **edge cases quan trọng** (không cần liệt kê đủ mọi boundary)
- [ ] Dùng ngôn ngữ business (tránh technical jargon)
- [ ] KHÔNG viết test data cụ thể (để QA bổ sung)
- [ ] KHÔNG viết Given-When-Then (để QA transform)
- [ ] Mỗi AC item phải **testable** (QA có thể verify được)

---

## ✅ CHECKLIST: QA transform AC

Khi nhận `*-final.md` từ BA/PO, QA cần:

- [ ] Đọc Section 9 (Acceptance Criteria)
- [ ] Transform mỗi AC item thành **nhiều Gherkin scenarios**
- [ ] Bổ sung test data cụ thể cho mỗi scenario
- [ ] Cover **ĐỦ CÁC trường hợp**:
  - [ ] Happy path
  - [ ] Alternative flows
  - [ ] Edge cases (từ AC + tự bổ sung)
  - [ ] Negative cases (tự bổ sung)
  - [ ] Boundary values (tự bổ sung)
- [ ] Viết assertions rõ ràng (expected results)
- [ ] Đảm bảo mỗi scenario **executable**
- [ ] Nếu AC mơ hồ → Feedback cho BA/PO (KHÔNG tự đoán)

---

## 🚫 Anti-patterns (Tránh)

### ❌ BA/PO viết quá chi tiết

```markdown
## 9. Acceptance Criteria (SAI)

Scenario: Đặt lệnh LO thành công
  Given người dùng đã đăng nhập với username "trader001"
  And margin available = 100,000,000 VNĐ
  When người dùng đặt lệnh LO mua "VNM" với giá 80,000 và khối lượng 100
  Then lệnh được chấp nhận
```

**Vấn đề:** BA đã viết Gherkin → QA chỉ cần copy → Duplicate công việc

**Sửa:** BA chỉ viết high-level checklist, để QA expand thành Gherkin

---

### ❌ QA chỉ copy AC của BA

```gherkin
Feature: Đặt lệnh LO (SAI)

Scenario: AC1
  Given người dùng có thể đặt lệnh LO với giá > 0
  Then hệ thống kiểm tra margin trước khi cho phép đặt lệnh
```

**Vấn đề:** QA chỉ copy AC → Không có test data, không executable, không cover đủ

**Sửa:** QA phải expand với test data cụ thể và cover đủ các trường hợp

---

### ❌ QA tự quyết định thay đổi Business Rules

```gherkin
# BA viết: "Giá phải > 0"
# QA tự đổi thành: "Giá phải >= 1000" (SAI)

Scenario: Validation (SAI)
  When người dùng đặt lệnh với giá 500
  Then hệ thống từ chối vì giá < 1000
```

**Vấn đề:** QA thay đổi business rule (>0 thành >=1000) mà không hỏi BA

**Sửa:** Nếu có thắc mắc → Feedback cho BA/PO, KHÔNG tự đoán

---

## 🎯 Kết luận

**BA/PO và QA KHÔNG overlap:**
- BA viết **WHAT** (business rules, trường hợp chính)
- QA viết **HOW TO TEST** (test scenarios chi tiết, cover đủ các trường hợp)

**Transform ratio:** 1 AC item (BA) → 3-5 Gherkin scenarios (QA)

**Feedback loop:** QA phát hiện AC mơ hồ → Feedback BA/PO → BA update `*-final.md` → QA đọc lại → Continue

---

**Generated by:** Claude Sonnet 5  
**Date:** 2026-08-30  
**Version:** 1.0