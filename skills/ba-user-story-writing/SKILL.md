---
name: ba-user-story-writing
description: Kỹ năng bổ trợ (Sub-process) được gọi bởi ba-refine hoặc ba-spec. Có thể hoạt động độc lập nếu user yêu cầu. Viết User Story chuẩn INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) từ Business-Spec hoặc requirements thô. Transform business requirements thành User Stories có cấu trúc "As a [role], I want [goal], so that [value]" với validation chặt chẽ. Sử dụng khi có Business-Spec hoặc requirements cần chuyển thành User Stories, khi cần validate existing User Stories, hoặc khi user yêu cầu "viết user story", "tạo user stories từ spec".
---

# Skill: ba-user-story-writing

## Tổng quan

User Story là đơn vị công việc nhỏ nhất trong Agile, mô tả một tính năng từ góc nhìn người dùng cuối. Một User Story tốt phải tuân thủ nguyên tắc **INVEST**:

- **I**ndependent — Độc lập, không phụ thuộc vào story khác
- **N**egotiable — Có thể thương lượng, không phải spec chi tiết cứng nhắc
- **V**aluable — Mang lại giá trị cho business hoặc người dùng
- **E**stimable — Có thể ước lượng được effort
- **S**mall — Đủ nhỏ để hoàn thành trong 1 sprint (thường 1-3 ngày)
- **T**estable — Có thể viết test để verify

Skill này transform business requirements thành User Stories chuẩn, với validation tự động và gợi ý cải thiện.

## Khi nào sử dụng

Kích hoạt skill này khi:

- Có file `*-final.md` từ BA/PO persona cần chuyển thành User Stories
- Có requirements thô (từ meeting, email, hoặc brainstorming) cần cấu trúc hóa
- Cần validate existing User Stories xem có đạt chuẩn INVEST không
- User yêu cầu: "viết user story", "tạo user stories từ spec", "validate user stories"

**Khi KHÔNG nên sử dụng:**

- Requirements quá mơ hồ (chạy `ba-interview-me` trước để làm rõ)
- Chưa có User Stories, đang ở giai đoạn ideation (dùng `ba-refine` trước)
- User Stories đã tồn tại và đạt chuẩn INVEST (không cần viết lại)

## Quy trình thực hiện

### Bước 1: Đọc Input (Business-Spec hoặc Requirements)

**Input A: File `*-final.md`**
```bash
# Đọc file Business-Spec từ ba-spec
/project-root/workspace/{issueKey}/spec/final.md
```

Trích xuất:
- Section 1: Summary → Feature name
- Section 9: Acceptance Criteria → Transform thành User Stories
- Section 5: User Flow → Identify actors và goals
- Section 8: Business Rules → Value proposition

**Input B: Requirements thô (text từ user)**

User cung cấp requirements dạng text, VD:
```
"Khách hàng cần đặt lệnh mua cổ phiếu nhanh chóng.
Hiện tại họ phải qua 5 bước, mất 2 phút.
Cần giảm xuống còn 3 bước, dưới 30 giây."
```

### Bước 2: Identify Actors (WHO)

Từ requirements, xác định **ai** là người dùng cuối (end-users), KHÔNG dùng role chung chung.

**❌ BAD (Chung chung):**
- "Người dùng", "User", "Khách hàng"

**✅ GOOD (Cụ thể):**
- "Khách hàng giao dịch cổ phiếu có tài khoản Margin"
- "Nhân viên môi giới xử lý lệnh offline"
- "Quản lý chi nhánh xem báo cáo hàng ngày"

**Cách identify:**
- Đọc Section 5 (User Flow) → Ai thực hiện action?
- Hỏi: "Ai được hưởng lợi trực tiếp từ tính năng này?"
- Nếu có nhiều actors → Tạo nhiều User Stories, mỗi actor một story

### Bước 3: Extract Goals (WHAT) và Values (WHY)

Với mỗi actor, xác định:

**Goal (WHAT):**
- Họ muốn đạt được gì? (động từ hành động: đặt lệnh, xem báo cáo, xuất file)
- KHÔNG mô tả giải pháp kỹ thuật ("click nút Export PDF")
- Mô tả mục tiêu nghiệp vụ ("xuất dữ liệu lệnh để lưu trữ")

**Value (WHY):**
- Tại sao họ cần điều đó? Giá trị gì nó mang lại?
- Business value: Tăng doanh thu? Giảm chi phí? Tuân thủ pháp lý?
- User value: Tiết kiệm thời gian? Giảm lỗi? Tăng sự tự tin?

**Example:**
```
Requirements: "Khách hàng cần đặt lệnh nhanh hơn"

Actor: Khách hàng giao dịch cổ phiếu (trader)
Goal: Đặt lệnh mua/bán nhanh chóng
Value (WHY): 
  - User value: Bắt được giá tốt trong thời điểm thị trường biến động
  - Business value: Tăng khối lượng giao dịch (revenue)
```

### Bước 4: Write User Stories (Template)

Áp dụng template chuẩn:

```markdown
As a [SPECIFIC ROLE — cụ thể, không chung chung]
I want [GOAL — mục tiêu nghiệp vụ, không phải giải pháp kỹ thuật]
So that [VALUE — giá trị business/user, không phải mô tả tính năng]
```

**✅ GOOD Example:**
```markdown
As a **khách hàng giao dịch cổ phiếu có tài khoản Margin**
I want **đặt lệnh mua/bán trong 3 bước (thay vì 5 bước hiện tại)**
So that **tôi có thể bắt được mức giá tốt khi thị trường biến động nhanh**
```

**❌ BAD Examples (vi phạm INVEST):**

```markdown
# Vi phạm I (Independent) — Phụ thuộc vào story khác
As a khách hàng
I want tiếp tục từ bước 3 của luồng đặt lệnh
So that hoàn tất giao dịch

# Vi phạm N (Negotiable) — Quá chi tiết, cứng nhắc
As a khách hàng
I want click nút "Đặt lệnh" màu xanh ở góc phải màn hình, sau đó nhập mã CK vào ô input có placeholder "VD: VNM"
So that đặt được lệnh

# Vi phạm V (Valuable) — Không có value rõ ràng
As a khách hàng
I want có thêm 1 nút mới trên giao diện
So that giao diện đẹp hơn

# Vi phạm E (Estimable) — Quá mơ hồ, không ước lượng được
As a khách hàng
I want hệ thống hoạt động tốt hơn
So that trải nghiệm tốt hơn

# Vi phạm S (Small) — Quá lớn, không thể làm trong 1 sprint
As a khách hàng
I want một hệ thống giao dịch hoàn chỉnh với đầy đủ tính năng
So that giao dịch được mọi loại chứng khoán

# Vi phạm T (Testable) — Không thể test được
As a khách hàng
I want giao diện thân thiện
So that cảm thấy dễ chịu khi dùng
```

### Bước 5: Validate theo INVEST

Với mỗi User Story đã viết, chạy validation:

```markdown
## User Story: [Title]

As a [role]
I want [goal]
So that [value]

### INVEST Validation

| Tiêu chí        | ✅/❌   | Giải thích                                                     |
|-----------------|---------|----------------------------------------------------------------|
| **I**ndependent | ✅      | Story không phụ thuộc vào story khác, có thể implement độc lập |
| **N**egotiable  | ✅      | Mô tả goal, không prescribe giải pháp kỹ thuật chi tiết        |
| **V**aluable    | ✅      | Rõ ràng value: "bắt được giá tốt khi thị trường biến động"     |
| **E**stimable   | ✅      | Team có thể ước lượng: ~2-3 ngày (giảm từ 5 bước xuống 3 bước) |
| **S**mall       | ✅      | Đủ nhỏ để làm xong trong 1 sprint                              |
| **T**estable    | ✅      | Test được: Verify số bước giảm từ 5 → 3, thời gian < 30s       |

### Acceptance Criteria (BẮT BUỘC — Gherkin codeblock)

**Mỗi User Story BẮT BUỘC phải có AC viết trong codeblock ```gherkin``` với cấu trúc:**
- `Feature:` — Tên chức năng nghiệp vụ
- ≥1 `Scenario:` **Happy Case** — Luồng thành công chính
- ≥1 `Scenario:` **Edge Case** — Trường hợp biên/ngoại lệ
- ≥1 `Scenario:` **Validation Case** — Kiểm tra dữ liệu đầu vào
- Mỗi Scenario có đầy đủ `Given` + `When` + `Then` (+ `And` nếu cần)
- Keywords `Given/When/Then/And` giữ nguyên tiếng Anh, nội dung viết Tiếng Việt

```gherkin
Feature: Đặt lệnh mua cổ phiếu nhanh

  Scenario: Happy - Đặt lệnh thành công trong 3 bước
    Given khách hàng đã đăng nhập và có tài khoản Margin
    When thực hiện luồng đặt lệnh mua
    Then hoàn tất trong 3 bước: nhập mã CK, nhập số lượng và giá, xác nhận
    And thời gian hoàn tất < 30 giây

  Scenario: Edge - Đặt lệnh khi thị trường đóng cửa
    Given khách hàng đã đăng nhập
    And thời gian hiện tại ngoài giờ giao dịch
    When nhấn nút đặt lệnh mua
    Then hệ thống hiển thị thông báo "Ngoài giờ giao dịch"
    And lệnh không được gửi lên sàn

  Scenario: Validation - Đặt lệnh với số lượng không hợp lệ
    Given khách hàng đã đăng nhập và đang ở form đặt lệnh
    When nhập số lượng cổ phiếu là 0 hoặc số âm
    Then hệ thống hiển thị lỗi "Số lượng phải lớn hơn 0"
    And nút xác nhận bị vô hiệu hóa
```

**Nếu có tiêu chí ❌ (FAIL):**
- Ghi rõ lý do FAIL
- Đề xuất cách sửa
- Viết lại User Story theo gợi ý
- Validate lại cho đến khi tất cả ✅

### Bước 6: Group & Prioritize (Optional)

Nếu có nhiều User Stories:

**Group theo:**
- Epic / Feature (VD: "Đặt lệnh nhanh", "Quản lý danh mục")
- Actor (VD: "Trader stories", "Broker stories")
- Sprint (VD: "Sprint 1: Core flow", "Sprint 2: Edge cases")

**Prioritize theo:**
- MoSCoW: Must have / Should have / Could have / Won't have
- Value vs Effort matrix: High value + Low effort → Làm trước
- Dependencies: Story A phải xong trước Story B

## Đầu ra (Output)

### Format 1: Markdown file (Recommended)

```markdown
# User Stories: [Feature Name]

**Source:** `/project-root/workspace/{issueKey}/spec/final.md`  
**Created:** 2026-08-13  
**Author:** BA/PO Agent

---

## Epic: Đặt lệnh nhanh

### Story 1: Đặt lệnh mua trong 3 bước

**Priority:** Must have  
**Effort:** 2 days  
**Sprint:** Sprint 5

As a **khách hàng giao dịch cổ phiếu có tài khoản Margin**  
I want **đặt lệnh mua/bán trong 3 bước (thay vì 5 bước hiện tại)**  
So that **tôi có thể bắt được mức giá tốt khi thị trường biến động nhanh**

**INVEST Validation:** ✅ All passed

**Acceptance Criteria:**

```gherkin
Feature: Đặt lệnh mua cổ phiếu nhanh

  Scenario: Happy - Đặt lệnh mua thành công trong 3 bước
    Given khách hàng đã đăng nhập và có tài khoản Margin
    When thực hiện luồng đặt lệnh mua
    Then hoàn tất trong 3 bước: nhập mã CK, nhập số lượng và giá, xác nhận
    And thời gian hoàn tất < 30 giây

  Scenario: Edge - Đặt lệnh khi không đủ margin
    Given khách hàng đã đăng nhập
    And số dư margin không đủ cho lệnh
    When xác nhận đặt lệnh mua
    Then hệ thống hiển thị cảnh báo "Không đủ margin"
    And lệnh không được gửi

  Scenario: Validation - Nhập mã chứng khoán không tồn tại
    Given khách hàng đang ở form đặt lệnh
    When nhập mã CK không tồn tại trong hệ thống
    Then hiển thị lỗi "Mã chứng khoán không hợp lệ"
```

---

### Story 2: Lưu template lệnh thường dùng

**Priority:** Should have  
**Effort:** 1 day  
**Sprint:** Sprint 5

As a **khách hàng giao dịch cổ phiếu thường xuyên**  
I want **lưu các template lệnh (mã CK + số lượng) để tái sử dụng**  
So that **không phải nhập lại thông tin giống nhau mỗi lần đặt lệnh**

**INVEST Validation:** ✅ All passed

**Acceptance Criteria:**

```gherkin
Feature: Lưu template lệnh thường dùng

  Scenario: Happy - Chọn template để tự động điền form
    Given khách hàng đã có template lệnh đã lưu
    When chọn template từ danh sách
    Then form đặt lệnh tự động điền mã CK và số lượng
    And khách hàng chỉ cần nhập giá và xác nhận

  Scenario: Edge - Xóa template đang được sử dụng
    Given khách hàng đã chọn template vào form
    When xóa template đó khỏi danh sách
    Then form đặt lệnh giữ nguyên dữ liệu đã điền
    And template bị xóa khỏi danh sách

  Scenario: Validation - Lưu template với dữ liệu thiếu
    Given khách hàng đang tạo template mới
    When không nhập mã CK hoặc số lượng
    Then hiển thị lỗi "Vui lòng nhập đầy đủ mã CK và số lượng"
```

**Lưu vào:** `/project-root/workspace/{issueKey}/spec/user-stories.md`

Trước khi ghi file, BẮT BUỘC neo về root repo và tạo thư mục đích — `Write` không tự tạo
thư mục cha, và cwd của agent có thể đang lệch (xem `.claude/rules/workspace-paths.md`):

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p /project-root/workspace/{issueKey}/spec
```

### Format 2: Jira-ready (nếu user muốn push lên Jira)

```markdown
## Story 1

**Summary:** Đặt lệnh mua trong 3 bước

**Description:**
As a khách hàng giao dịch cổ phiếu có tài khoản Margin
I want đặt lệnh mua/bán trong 3 bước (thay vì 5 bước hiện tại)
So that tôi có thể bắt được mức giá tốt khi thị trường biến động nhanh

**Acceptance Criteria:**

```gherkin
Feature: Đặt lệnh mua cổ phiếu nhanh

  Scenario: Happy - Đặt lệnh mua thành công
    Given khách hàng đã đăng nhập
    When thực hiện luồng đặt lệnh mua cổ phiếu
    Then hoàn tất trong 3 bước: nhập mã CK, nhập số lượng và giá, xác nhận
    And thời gian hoàn tất < 30 giây

  Scenario: Edge - Không đủ margin
    Given khách hàng đã đăng nhập
    And số dư margin không đủ
    When xác nhận đặt lệnh mua
    Then hiển thị thông báo "Không đủ margin"

  Scenario: Validation - Số lượng không hợp lệ
    Given khách hàng đang ở form đặt lệnh
    When nhập số lượng là 0 hoặc số âm
    Then hiển thị lỗi "Số lượng phải lớn hơn 0"
```

**Story Points:** 3  
**Priority:** Highest  
**Labels:** user-story, trading, sprint-5
```

## Tương tác với các Skills khác

- **Upstream (Before):**
  - `ba-spec` → Tạo `*-final.md` → Input cho skill này
  - `ba-interview-me` → Làm rõ requirements mơ hồ trước khi viết User Stories
  - `ba-refine` → Mài giũa ý tưởng → Input cho skill này

- **Downstream (After):**
  - `ba-acceptance-criteria` → Viết AC chi tiết cho từng User Story (nếu Story chưa có)
  - `qa-test-design` → Transform AC thành test cases
  - `dev-spec-driven-development` → Transform User Stories thành Tech-Spec

## Các Dấu hiệu Cảnh báo (Red Flags)

❌ **User Story quá dài (>3 dòng cho phần "I want"):**
- Chia nhỏ thành nhiều stories

❌ **Dùng role chung chung: "Người dùng", "User", "Khách hàng":**
- Specific hơn: "Khách hàng giao dịch Margin", "Nhân viên môi giới"

❌ **Mô tả giải pháp kỹ thuật trong "I want":**
- VD: "I want một API endpoint POST /api/orders"
- → Sửa thành: "I want đặt lệnh nhanh chóng"

❌ **So that chỉ lặp lại "I want":**
- VD: "I want đặt lệnh nhanh, So that đặt lệnh nhanh hơn"
- → Phải nói VALUE: "So that bắt được giá tốt khi thị trường biến động"

❌ **User Story không testable:**
- VD: "So that giao diện đẹp hơn" (Đẹp là chủ quan, không test được)
- → Sửa thành measurable criteria

❌ **User Story phụ thuộc vào story khác:**
- Vi phạm I (Independent)
- → Merge hoặc reorder

## Anti-patterns (Tránh)

1. **Viết User Story như Task:**
   - ❌ "As a developer, I want to create API endpoint, so that..."
   - ✅ User Story phải từ góc nhìn END-USER, không phải developer/QA

2. **Nhét Business Rules vào User Story:**
   - ❌ "I want đặt lệnh với số lượng phải chia hết cho 100..."
   - ✅ Business Rules để trong AC hoặc Tech-Spec

3. **Copy-paste template không tư duy:**
   - Mỗi User Story phải có context riêng, không giống nhau y chang

4. **Validation敷衍 (hời hợt):**
   - Tất cả User Stories đều đánh dấu ✅ mà không giải thích → Không tin được
   - Phải có justification cụ thể cho mỗi tiêu chí INVEST

## Verification Checklist

Sau khi chạy skill này:

- [ ] Mỗi User Story có đúng format: "As a [role], I want [goal], So that [value]"
- [ ] Role cụ thể (không chung chung như "User", "Khách hàng")
- [ ] Goal mô tả mục tiêu nghiệp vụ (không phải giải pháp kỹ thuật)
- [ ] Value rõ ràng (business value hoặc user value)
- [ ] Tất cả User Stories đã pass INVEST validation (6/6 tiêu chí ✅)
- [ ] Nếu có tiêu chí ❌ → Đã đề xuất cách sửa và viết lại
- [ ] User Stories đã được group (Epic/Feature) và prioritize (MoSCoW/Story Points)
- [ ] Output file đã lưu vào `/project-root/workspace/{issueKey}/spec/user-stories.md`
- [ ] User đã review và approve trước khi handoff to QA/DEV

## Ví dụ

Xem file `skills/ba-user-story-writing/examples.md` để thấy:
- Input: `*-final.md` → Output: User Stories
- Bad vs Good User Stories (phân tích vi phạm INVEST)
- Complex scenario: 1 feature → 5 User Stories với dependencies
