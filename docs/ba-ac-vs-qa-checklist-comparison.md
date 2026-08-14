# So sánh: ba-acceptance-criteria vs qa-test-design

**Ngày:** 2026-08-13  
**Mục đích:** Phân tích overlap giữa 2 skills và quyết định có nên giữ `ba-acceptance-criteria` hay không

---

## 📊 Comparison Matrix

| Aspect | ba-acceptance-criteria (BA/PO) | qa-test-design (QA) |
|--------|-------------------------------|---------------------|
| **Input** | User Stories, `*-final.md` Section 9 | `*-final.md` (toàn bộ 13 sections) |
| **Output Format** | Checklist (3 categories: Functional, Non-Functional, Edge Cases) | Checklist (10+ dimensions: Security, Routing, Input Validation, Business Rules, etc.) + Gherkin |
| **Level of Detail** | High-level business rules | Low-level test items với priority (P0/P1/P2) |
| **Checklist Content** | Generic rules ("đủ tiền", "< 30 giây") | Specific test cases ("Account 123 với 10M VND", "Response time < 2s") |
| **Gherkin** | ❌ KHÔNG viết | ✅ Viết (Phase 2) |
| **Audience** | Stakeholders, PO, DEV | QA team, Automation engineers |
| **Purpose** | Define "Done" criteria | Design test plan + automation spec |
| **Coverage** | Business perspective (WHAT) | Test perspective (HOW to verify) |
| **Priority** | Không gán P0/P1/P2 | Gán priority cho mọi item |
| **Traceability** | Map về User Story | Map về `*-final.md` sections + Checklist items |

---

## 🔍 Detailed Analysis

### 1. Input Sources

**BA AC:**
- Primary: User Stories (`docs/user-stories/{issueKey}-user-stories.md`)
- Secondary: `*-final.md` Section 9 only

**QA Test Design:**
- Primary: `*-final.md` (ALL 13 sections)
- Mapping logic:
  - Section 3 (Authentication) → Security dimension (P0)
  - Section 4 (Endpoints) → Routing dimension (P1)
  - Section 5 (User Flow) → Happy Path scenarios (P0)
  - Section 6 (Input Validation) → Input Validation dimension (P1)
  - Section 8 (Business Rules) → Business Rules dimension (P0)
  - Section 9 (AC) → Source cho Happy Path scenarios
  - Section 10 (Edge Cases) → Exception & Performance (P2)

**Verdict:** ❌ OVERLAP — Cả 2 đều đọc `*-final.md` Section 9, nhưng QA đọc sâu hơn (toàn bộ sections)

---

### 2. Output Format

**BA AC Checklist Example:**
```markdown
## Acceptance Criteria

### Functional Requirements
- [ ] Khách hàng có thể đặt lệnh mua/bán qua app
- [ ] Số lượng phải là bội số của 100
- [ ] Hệ thống kiểm tra margin trước khi gửi lệnh

### Non-Functional Requirements
- [ ] Thời gian đặt lệnh < 30 giây
- [ ] Error messages bằng tiếng Việt

### Edge Cases & Error Handling
- [ ] Số lượng không phải bội số 100 → Error: "Số lượng phải là bội số của 100"
- [ ] Không đủ margin → Error: "Tài khoản không đủ tiền"
```

**QA Test Design Checklist Example:**
```markdown
## Checklist: Đặt lệnh mua/bán

### 🔐 Bảo mật & Phân quyền (P0)
- [ ] [P0] Yêu cầu authentication: Access token hợp lệ trong header Authorization
- [ ] [P0] User chỉ xem được lệnh của chính mình (isolation)
- [ ] [P0] Session timeout sau 30 phút không hoạt động

### 📊 Quy tắc nghiệp vụ (P0)
- [ ] [P0] Số lượng phải là bội số của 100 (1 lô = 100 CP)
- [ ] [P0] Kiểm tra margin: margin >= 150% giá trị lệnh
- [ ] [P0] Nếu không đủ margin → HTTP 400 với error code "INSUFFICIENT_MARGIN"
- [ ] [P0] Chỉ cho phép đặt lệnh trong giờ giao dịch (9:00-11:30, 13:00-14:30)

### ✅ Validation Response (P1)
- [ ] [P1] Success response: HTTP 201 với orderId, status, timestamp
- [ ] [P1] Error response: HTTP 400/403/500 với errorCode, message (tiếng Việt)
- [ ] [P1] Error message format: "Tài khoản không đủ tiền. Cần nạp thêm X VND"

### ⚡ Ngoại lệ & Hiệu năng (P2)
- [ ] [P2] Response time < 2 giây cho mọi request
- [ ] [P2] Timeout 30 giây nếu backend không phản hồi
- [ ] [P2] Concurrent requests: 100 orders/giây không bị rate limit
```

**Verdict:** ❌ HUGE OVERLAP
- BA AC: 3 categories, ~7-10 items, high-level
- QA Checklist: 10+ dimensions, 50-100 items, low-level với priority

**QA checklist bao trùm hoàn toàn BA AC** + thêm rất nhiều chi tiết (P0/P1/P2, specific error codes, timeouts, concurrent scenarios)

---

### 3. Level of Detail

**BA AC:**
```markdown
- [ ] Nếu không đủ margin → Error message rõ ràng
```

**QA Test Design:**
```markdown
- [ ] [P0] Nếu margin < 150% → HTTP 400 với errorCode "INSUFFICIENT_MARGIN"
- [ ] [P0] Error message: "Tài khoản không đủ tiền. Cần nạp thêm {amount} VND"
- [ ] [P1] Frontend hiển thị error trong toast notification (5 giây)
- [ ] [P2] Log error vào Sentry với context: accountId, orderId, margin
```

**Verdict:** ❌ OVERLAP — QA chi tiết hơn nhiều, BA chỉ là subset

---

### 4. Workflow Position

**BA Workflow:**
```
User Story → BA AC (Checklist) → Handoff to QA
```

**QA Workflow:**
```
*-final.md (from BA) → QA Test Design (Checklist + Gherkin) → QA Automation
```

**Reality Check:**

Nếu BA đã viết AC Checklist trong `*-final.md` Section 9:
- QA vẫn phải đọc lại Section 9
- QA vẫn phải transform AC → Test Checklist (với P0/P1/P2, error codes, timeouts)
- QA vẫn phải thêm rất nhiều items mà BA không có (security, routing, performance)

→ **BA AC Checklist không tiết kiệm công việc cho QA**, QA vẫn phải viết lại checklist chi tiết hơn

---

## 🎯 Kết luận: Nên BỎ `ba-acceptance-criteria`

### Lý do:

#### 1. **Overlap 90% với QA Test Design Checklist**
- QA checklist bao trùm toàn bộ BA AC + thêm nhiều dimensions
- BA AC là subset của QA Checklist
- Không có giá trị độc lập

#### 2. **BA không cần viết Checklist riêng**
BA đã viết AC trong `*-final.md` Section 9:

**Hiện tại (trong `*-final.md` Section 9):**
```markdown
## 9. Acceptance Criteria (Reframed)

### Happy Path
- Khách hàng đăng nhập → Nhập thông tin lệnh → Xác nhận → Lệnh gửi lên sàn < 30 giây
- Hiển thị popup xác nhận trước khi gửi
- Nhận notification khi lệnh thành công/thất bại

### Edge Cases
- Số lượng không phải bội số 100 → Error: "Số lượng phải là bội số của 100"
- Không đủ margin → Error: "Tài khoản không đủ tiền"
- Ngoài giờ giao dịch → Error: "Thị trường đã đóng cửa"
```

**Đây đã là AC đầy đủ!** Không cần một skill riêng để viết lại dưới dạng Checklist.

#### 3. **QA cần chi tiết hơn nhiều**
QA test design checklist có:
- Priority (P0/P1/P2)
- Error codes (HTTP 400/403/500, errorCode strings)
- Timeouts, rate limits, concurrent scenarios
- Security checks (authentication, authorization, session)
- Performance metrics (< 2 giây, 100 req/s)
- Traceability về `*-final.md` sections

→ BA AC checklist (generic, high-level) không giúp QA tiết kiệm công sức

#### 4. **Duplicate Work**
Workflow hiện tại:
```
BA writes AC in Section 9 → BA runs /ba-ac → BA AC Checklist
                                ↓
QA reads Section 9 → QA runs /qa-test-design → QA Test Checklist (chi tiết hơn)
```

→ BA viết 2 lần (Section 9 + AC Checklist), QA vẫn phải viết lại → Waste!

Workflow tối ưu:
```
BA writes AC in Section 9 (*-final.md) → QA reads Section 9 → QA Test Checklist + Gherkin
```

→ BA viết 1 lần, QA transform trực tiếp từ Section 9

---

## ✅ Đề xuất: XÓA skill `ba-acceptance-criteria`

### Lý do chi tiết:

1. **Section 9 trong `*-final.md` đã là AC**
   - BA skill `ba-spec` đã tạo Section 9: Acceptance Criteria (Reframed)
   - Section 9 có đầy đủ: Happy Path, Edge Cases, Error Messages
   - Không cần skill riêng để viết lại dưới dạng Checklist

2. **QA không cần BA AC Checklist**
   - QA đọc trực tiếp từ `*-final.md` (toàn bộ sections, không chỉ Section 9)
   - QA checklist chi tiết hơn nhiều (P0/P1/P2, error codes, timeouts)
   - BA AC Checklist là subset, không giúp QA tiết kiệm công sức

3. **Tránh duplicate work**
   - BA viết AC in Section 9 → Đủ rồi
   - BA không cần viết thêm AC Checklist riêng

4. **Industry practice: AC nằm trong User Story hoặc Spec**
   - AC không phải deliverable độc lập
   - AC là part of User Story hoặc Spec (như Section 9)

---

## 📝 Actions Required

### 1. ❌ XÓA skill `ba-acceptance-criteria`
```bash
rm -rf skills/ba-acceptance-criteria/
```

### 2. ❌ XÓA command `/ba-ac`
```bash
rm .claude/commands/ba-ac.md
```

### 3. ✏️ UPDATE `agents/ba-po.md`
**Xóa:**
```markdown
6. **ba-acceptance-criteria** — Viết AC dạng Checklist
```

**Giữ nguyên:**
- `ba-spec` → Section 9 đã là AC (đủ rồi)
- `ba-user-story-writing` → User Story có thể inline AC

### 4. ✏️ UPDATE `CLAUDE.md`
**Xóa references:**
- `ba-acceptance-criteria` khỏi skill list
- Note về "BA viết AC Checklist"

**Clarify:**
- BA viết AC trong `*-final.md` Section 9 (part of `ba-spec`)
- QA đọc Section 9 → Transform thành Test Checklist + Gherkin

### 5. ✏️ UPDATE `docs/ba-po-separation-proposal.md`
**Xóa:**
- `ba-acceptance-criteria` khỏi Priority 1 skills

**Clarify:**
- BA AC nằm trong `*-final.md` Section 9 (output của `ba-spec`)
- Không cần skill riêng

---

## 📖 Final Workflow (After removing ba-acceptance-criteria)

### BA/PO Workflow:
```
Phase 1-4: /ba-spec {issueKey}
├─ Import Jira/Confluence
├─ Extract requirements
├─ Gap detection & interview
└─ Output: *-final.md với Section 9 (Acceptance Criteria)
```

### QA Workflow:
```
Phase 1: /qa-test-design {issueKey}
├─ Read *-final.md (ALL sections, including Section 9)
├─ Map sections → Test dimensions
├─ Generate Test Checklist (P0/P1/P2, chi tiết)
└─ Generate Gherkin scenarios

Phase 2: /qa-auto-design {issueKey}
└─ Generate automation code from Gherkin
```

### Handoff:
```
BA (*-final.md Section 9) ──→ QA (Test Checklist + Gherkin)
                              ↑
                              Đọc trực tiếp, không qua AC Checklist trung gian
```

---

## ✅ Benefits of Removal

1. **Eliminate duplicate work** — BA viết 1 lần (Section 9), không viết 2 lần
2. **Clear handoff** — QA đọc trực tiếp `*-final.md`, không qua file trung gian
3. **Less confusion** — Không còn câu hỏi "BA AC vs QA Checklist khác nhau thế nào?"
4. **Align với industry** — AC nằm trong Spec/User Story, không phải deliverable độc lập

---

## 🚀 Implementation Plan

1. ✅ Analyze overlap (file này)
2. ⏳ Confirm với user: Có đồng ý xóa `ba-acceptance-criteria` không?
3. ⏳ Xóa skill folder + command
4. ⏳ Update agents/ba-po.md, CLAUDE.md, docs/
5. ⏳ Test workflow: `/ba-spec` → `/qa-test-design` (không qua `/ba-ac`)
6. ⏳ Commit changes
