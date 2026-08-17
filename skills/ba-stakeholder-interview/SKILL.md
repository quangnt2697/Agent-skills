---
name: ba-stakeholder-interview
description: Phỏng vấn nhiều stakeholders (CEO, Product Manager, End Users, Support Team, etc.) để thu thập requirements từ đa nguồn. Ghi nhận needs, constraints, assumptions của từng stakeholder và tổng hợp thành stakeholder matrix. Sử dụng khi cần khai thác requirements từ nhiều nguồn, khi user yêu cầu "phỏng vấn stakeholders", "thu thập requirements từ team", hoặc khi có conflict giữa stakeholders về priority/scope.
---

# Skill: ba-stakeholder-interview

## Tổng quan

Stakeholder Interview là kỹ thuật thu thập requirements từ nhiều stakeholders khác nhau (không chỉ end-users). Mỗi stakeholder có:
- **Perspective** khác nhau (business, technical, operational)
- **Needs** khác nhau (revenue, usability, maintainability)
- **Constraints** khác nhau (budget, timeline, compliance)
- **Priorities** khác nhau (feature A vs feature B)

Skill này giúp BA/PO:
1. **Identify Stakeholders** — Ai là stakeholders? (CEO, PM, Users, Support, Compliance, IT)
2. **Prepare Questions** — Câu hỏi phù hợp cho từng stakeholder role
3. **Conduct Interviews** — Phỏng vấn từng stakeholder, ghi nhận chi tiết
4. **Synthesize** — Tổng hợp requirements từ tất cả stakeholders
5. **Resolve Conflicts** — Xử lý khi stakeholders có priorities conflict

## Khi nào sử dụng

Kích hoạt skill này khi:

- Bắt đầu project mới (greenfield) — cần thu thập requirements từ scratch
- Requirements mơ hồ hoặc conflict — stakeholder A nói X, stakeholder B nói Y
- User yêu cầu: "phỏng vấn stakeholders", "thu thập requirements từ team", "interviewing"
- Cần validate requirements draft với nhiều perspectives
- Feature lớn ảnh hưởng nhiều teams (cross-functional)

**Khi KHÔNG nên sử dụng:**

- Requirements đã rõ ràng từ 1 nguồn duy nhất (VD: CEO mandate)
- Chỉ cần clarify chi tiết nhỏ (dùng `ba-interview-me` thay vì skill này)
- Stakeholders không available (too busy, offshore timezone mismatch)
- Project quá nhỏ (1 feature đơn giản, không cần multi-stakeholder input)

## Quy trình thực hiện

### Bước 1: Identify Stakeholders (WHO)

Liệt kê tất cả stakeholders liên quan đến feature/project này:

**Stakeholder Categories:**

| Category       | Examples                           | Why Interview Them                                     |
|----------------|------------------------------------|--------------------------------------------------------|
| **Executive**  | CEO, CFO, COO                      | Business strategy, budget approval, high-level goals   |
| **Product**    | Product Manager, Product Owner     | Feature priority, roadmap, user personas               |
| **Business**   | Sales, Marketing, Business Analyst | Market needs, competitor analysis, revenue impact      |
| **End Users**  | Customers, Traders, Brokers        | Pain points, usability, actual workflows               |
| **Operations** | Support Team, Customer Success     | Common issues, workarounds, edge cases                 |
| **Technical**  | CTO, Architects, Dev Lead          | Technical constraints, integration, scalability        |
| **Compliance** | Legal, Risk Management             | Regulatory requirements, audit trails                  |
| **Finance**    | Accounting, Finance Team           | Cost tracking, billing, financial reports              |

**Example:**
```markdown
### Stakeholders for "Mobile Trading App" Project

| # | Name         | Role                | Category   | Interview Priority               |
|---|--------------|---------------------|------------|----------------------------------|
| 1 | Nguyễn Văn A | CEO                 | Executive  | 🔴 High (strategy, budget)       |
| 2 | Trần Thị B   | Product Manager     | Product    | 🔴 High (roadmap, features)      |
| 3 | Lê Văn C     | Head of Support     | Operations | 🟡 Medium (pain points)          |
| 4 | Phạm Thị D   | Senior Trader (VIP) | End User   | 🔴 High (real workflows)         |
| 5 | Hoàng Văn E  | CTO                 | Technical  | 🟡 Medium (tech constraints)     |
| 6 | Đặng Thị F   | Compliance Officer  | Compliance | 🟡 Medium (regulatory)           |
| 7 | Ngô Văn G    | CFO                 | Executive  | 🟢 Low (budget already approved) |

**Total:** 7 stakeholders, 3 High priority, 3 Medium, 1 Low
```

**Prioritization:**
- 🔴 High: Must interview (blockers, critical input)
- 🟡 Medium: Should interview (important but not blocker)
- 🟢 Low: Nice-to-have (can skip if time-constrained)

### Bước 2: Prepare Interview Questions

Với mỗi stakeholder, chuẩn bị câu hỏi phù hợp với role của họ.

**2.1. Generic Questions (cho tất cả stakeholders)**

```markdown
### Generic Questions (10-15 phút)

1. **Context:**
   - Vai trò của bạn trong tổ chức là gì?
   - Bạn tương tác với [feature/project này] như thế nào?

2. **Current State (AS-IS):**
   - Hiện tại bạn làm [task X] như thế nào?
   - Pain points lớn nhất của quy trình hiện tại là gì?
   - Có workarounds nào bạn đang dùng không?

3. **Future State (TO-BE):**
   - Bạn mong đợi [feature/project mới] sẽ giải quyết vấn đề gì?
   - Success criteria từ góc nhìn của bạn là gì?

4. **Constraints:**
   - Có limitations nào (budget, timeline, compliance) ảnh hưởng đến project này không?
   - Có risks nào bạn lo ngại không?

5. **Priority:**
   - Nếu chỉ làm được 50% scope, 50% nào bạn muốn ưu tiên?
```

**2.2. Role-Specific Questions**

#### For CEO/Executive (Business Strategy)

```markdown
### Questions for CEO

1. **Strategic Alignment:**
   - Project này fit vào company strategy như thế nào?
   - KPIs nào bạn dùng để measure success? (revenue, market share, NPS)

2. **Competitive Landscape:**
   - Competitors đang làm gì? (VPS SmartOne, SSI iBoard)
   - Chúng ta cần bắt kịp hay vượt qua họ?

3. **Investment:**
   - Budget cap là bao nhiêu? (~3 tỷ VND realistic?)
   - Timeline expectation? (Q4 2026 launch có khả thi?)

4. **Trade-offs:**
   - Nếu phải chọn: Time-to-market vs Feature completeness, bạn chọn gì?
   - Nếu phải chọn: Mobile app vs Desktop app, bạn chọn gì?
```

#### For Product Manager (Features & Roadmap)

```markdown
### Questions for Product Manager

1. **User Personas:**
   - Target users là ai? (retail traders, institutional, brokers)
   - Top 3 user needs là gì?

2. **Feature Priority:**
   - Must-have features cho MVP?
   - Nice-to-have features có thể defer?

3. **Roadmap:**
   - Release plan (1.0, 1.1, 2.0) như thế nào?
   - Dependencies giữa features?

4. **Metrics:**
   - Làm sao measure adoption? (DAU, orders via app, NPS)
   - Target numbers? (≥ 60% orders via app sau 12 tháng)
```

#### For End User (Real Workflows)

```markdown
### Questions for End User (Trader)

1. **Current Workflow:**
   - Mô tả chi tiết quy trình đặt lệnh hiện tại (từng bước)
   - Mất bao lâu? Có steps nào bạn thấy thừa không?

2. **Pain Points:**
   - Điểm nào khó chịu nhất trong quy trình hiện tại?
   - Bao nhiêu lần bạn bị lỗi/miss trade vì quy trình chậm?

3. **Ideal Solution:**
   - Nếu có magic wand, bạn muốn gì? (3 tính năng quan trọng nhất)
   - Có tính năng nào từ competitor bạn thích không?

4. **Edge Cases:**
   - Có tình huống đặc biệt nào (peak hours, thị trường sập, v.v.)?
   - Bạn xử lý như thế nào khi [edge case X] xảy ra?
```

#### For Support Team (Common Issues)

```markdown
### Questions for Support Team

1. **Top Issues:**
   - Top 5 complaints từ customers về quy trình hiện tại?
   - Có issues nào recurring (repeat nhiều lần)?

2. **Workarounds:**
   - Khi customers gặp issue X, bạn hướng dẫn họ làm gì?
   - Có workarounds nào "unofficial" (không nằm trong SOP)?

3. **Feature Requests:**
   - Customers yêu cầu tính năng gì nhiều nhất?
   - Có requests nào bạn thấy reasonable nhưng chưa được implement?

4. **Training:**
   - App mới có dễ dùng không? (từ góc nhìn support — ít phải train hơn?)
   - Documentation cần gì để giảm support tickets?
```

#### For CTO/Tech Lead (Technical Constraints)

```markdown
### Questions for CTO

1. **Tech Stack:**
   - Current tech stack limitations?
   - Có legacy systems nào phải integrate?

2. **Scalability:**
   - Expected load? (10,000 concurrent users? 1,000 orders/sec?)
   - Infrastructure ready? (cloud, on-prem, hybrid?)

3. **Security & Compliance:**
   - Security requirements? (2FA, biometric, encryption)
   - Audit trails? (HOSE regulations)

4. **Integration:**
   - External systems? (HNX/HSX FIX Gateway, banks, KYC)
   - APIs available? Documentation?
```

#### For Compliance Officer (Regulatory)

```markdown
### Questions for Compliance Officer

1. **Regulatory Requirements:**
   - HOSE/HNX rules ảnh hưởng gì đến app? (margin rules, order types)
   - SBV/SSC regulations?

2. **Audit Trails:**
   - Logs nào cần lưu? (orders, logins, changes)
   - Retention period? (7 years?)

3. **Risk Management:**
   - Red flags cần block? (suspicious orders, AML)
   - Alerts cần config?

4. **Approval Process:**
   - Feature mới cần approval từ ai? (HOSE? SBV?)
   - Timeline cho approval?
```

### Bước 3: Conduct Interviews

**3.1. Interview Format**

```markdown
### Interview Template

**Stakeholder:** [Name] — [Role]  
**Date:** 2026-08-13  
**Duration:** 45 phút  
**Interviewer:** BA/PO Agent  
**Format:** 1-on-1, recorded (with consent)

---

#### Section 1: Context (5 phút)
Q1: [Generic question 1]
A: [Stakeholder response]

Q2: [Generic question 2]
A: [Response]

---

#### Section 2: Current State (10 phút)
Q3: [Role-specific question về AS-IS]
A: [Response with pain points]

Q4: [Follow-up về specific pain point]
A: [Details...]

---

#### Section 3: Future State (15 phút)
Q5: [TO-BE expectations]
A: [Response]

Q6: [Success criteria]
A: [Response with measurable metrics]

---

#### Section 4: Constraints & Priorities (10 phút)
Q7: [Constraints (budget, timeline, compliance)]
A: [Response]

Q8: [Priority if 50% scope]
A: [Must-have: X, Y, Z. Nice-to-have: A, B]

---

#### Section 5: Wrap-up (5 phút)
Q9: Có điều gì chúng ta chưa nói đến mà bạn muốn mention?
A: [Additional insights]

Q10: Ai nữa chúng tôi nên nói chuyện?
A: [Other stakeholders suggested]
```

**3.2. Interview Tips**

✅ **DO:**
- Record với consent (để review lại sau)
- Ask open-ended questions ("Mô tả quy trình hiện tại" thay vì "Quy trình có chậm không?")
- Follow up khi có insights ("Bạn vừa nói X, có thể elaborate hơn không?")
- Take notes về body language, tone (hesitation = uncertainty)
- Ask for examples ("Cho tôi 1 ví dụ cụ thể về edge case đó")

❌ **DON'T:**
- Leading questions ("Bạn nghĩ feature X sẽ tốt, đúng không?")
- Yes/No questions (không đào sâu được)
- Interrupt stakeholder khi họ đang nói
- Argue hoặc defend current system (focus là listen, không phải defend)
- Over-promise ("Chúng tôi sẽ làm tất cả requests của bạn" — unrealistic)

### Bước 4: Synthesize Findings

**4.1. Stakeholder Matrix**

Tổng hợp findings từ tất cả interviews thành matrix:

```markdown
### Stakeholder Matrix

| Stakeholder   | Role       | Key Needs                     | Constraints             | Priority (Must-have)               | Concerns/Risks                           |
|---------------|------------|-------------------------------|-------------------------|------------------------------------|------------------------------------------|
| Nguyễn Văn A  | CEO        | Revenue growth, market share  | Budget ~3 tỷ, Q4 launch | Mobile app, LO orders              | Timeline tight (6 months ambitious)      |
| Trần Thị B    | PM         | User adoption, NPS > 4.0      | Feature parity với VPS  | Real-time notification, Templates  | Feature creep (too many nice-to-haves)   |
| Phạm Thị D    | Trader     | Speed (< 30s), reliability    | None                    | Fast order placement, Order status | App crash during peak hours              |
| Lê Văn C      | Support    | Reduce tickets, easy to train | Support bandwidth       | Clear error messages, Tutorial     | Customers không biết dùng app            |
| Hoàng Văn E   | CTO        | Scalability, maintainability  | Legacy HO system        | API-first, Cloud-native            | Integration với HO (FIX Gateway complex) |
| Đặng Thị F    | Compliance | Regulatory compliance         | HOSE rules              | Margin check, Audit logs           | Regulatory approval delay (2-3 months)   |
```

**4.2. Consolidated Requirements**

Group requirements theo categories:

```markdown
### Consolidated Requirements (from 7 stakeholders)

#### Functional Requirements

**Core (Mentioned by ≥ 4 stakeholders):**
1. Đặt lệnh LO (Limit Order) — 6/7 stakeholders
2. Real-time order status — 5/7 stakeholders
3. Account balance view — 4/7 stakeholders
4. Margin checking — 4/7 stakeholders (including Compliance — mandatory)

**Important (Mentioned by 2-3 stakeholders):**
5. Lưu template lệnh — 3/7 (PM, Trader, Support)
6. Push notification — 3/7 (PM, Trader)
7. Order history — 2/7 (Trader, Support)

**Nice-to-have (Mentioned by 1 stakeholder):**
8. Dark mode — 1/7 (Trader)
9. Export to Excel — 1/7 (Trader)

---

#### Non-Functional Requirements

**Performance:**
- < 30s to place order (Trader, PM)
- < 2s response time (CTO)
- Support 10,000 concurrent users (CTO)

**Security:**
- 2FA authentication (Compliance, CTO)
- End-to-end encryption (CTO)
- Audit logs (7 years retention) (Compliance)

**Usability:**
- Mobile-first (CEO, PM, Trader)
- Tutorial for first-time users (Support)
- Clear error messages (Support, Trader)

**Compliance:**
- HOSE Rule 15 (Margin) compliance (Compliance)
- FIX protocol v4.2 (CTO, Compliance)
```

**4.3. Conflict Resolution**

Identify và resolve conflicts giữa stakeholders:

```markdown
### Conflicts Identified

#### Conflict 1: Timeline (CEO vs CTO)

**CEO:** Launch Q4 2026 (4 months)  
**CTO:** Realistic timeline 9-12 months (technical complexity high)

**Resolution:**
- MVP approach: Launch Phase 1 (core features only) Q4 2026
- Phase 2 (enhancement) Q1 2027
- CEO agrees sau khi thấy technical breakdown

---

#### Conflict 2: Feature Scope (PM vs CEO)

**PM:** Full feature parity với VPS (15 features)  
**CEO:** Focus MVP (5 features), launch fast to capture market share

**Resolution:**
- MoSCoW prioritization: Must (5) + Should (6) + Could (4)
- Release 1.0: Must only
- Release 1.1: Must + Should
- PM agrees với condition: Re-prioritize sau 3 months dựa trên user feedback

---

#### Conflict 3: Platform (Trader vs CTO)

**Trader:** Muốn cả mobile app + desktop app  
**CTO:** Budget chỉ đủ cho mobile app (desktop defer Phase 3)

**Resolution:**
- Mobile-first (iOS + Android) Phase 1
- Desktop app (web-based) Phase 3 (12 months sau launch)
- Trader accepts với workaround: Có thể dùng mobile web trên desktop browser
```

### Bước 5: Validate & Follow-up

**5.1. Share Back với Stakeholders**

Sau khi synthesize, share findings back:

```markdown
### Validation Session (All-hands meeting)

**Participants:** Tất cả 7 stakeholders  
**Duration:** 1 giờ  
**Agenda:**

1. **Present Consolidated Requirements (15 phút)**
   - Core: 4 features (Must-have)
   - Important: 3 features (Should-have)
   - Nice-to-have: 2 features (Could defer)

2. **Present Conflicts & Resolutions (15 phút)**
   - Timeline: MVP Q4, Full release Q1 2027
   - Scope: Phase 1 (5 features) only
   - Platform: Mobile-first

3. **Vote on Priority (15 phút)**
   - Mỗi stakeholder vote top 3 features
   - Tally results → Confirm Must-have list

4. **Sign-off (10 phút)**
   - Stakeholders agree với consolidated requirements?
   - Any last concerns?
   - Get formal approval (email confirmation)

5. **Next Steps (5 phút)**
   - BA/PO sẽ viết Business-Spec (`*-final.md`)
   - Target completion: 1 tuần
   - Review session: 2 tuần từ nay
```

**5.2. Open Questions (Need Follow-up)**

```markdown
### Open Questions (Need Follow-up)

| # | Question                               | Stakeholder   | Action                           | Deadline   |
|---|----------------------------------------|---------------|----------------------------------|------------|
| 1 | HOSE approval timeline cho mobile app? | Compliance    | Đặng Thị F escalate to HOSE      | 2026-08-20 |
| 2 | Budget final approval (~3 tỷ)?         | CFO           | Ngô Văn G present to board       | 2026-08-15 |
| 3 | FIX Gateway sandbox access?            | CTO           | Hoàng Văn E contact HNX/HSX      | 2026-08-18 |
| 4 | Trader beta testing group (100 users)? | PM            | Trần Thị B recruit from VIP list | 2026-09-01 |
```

## Đầu ra (Output)

### Format: Stakeholder Interview Report

```markdown
# Stakeholder Interview Report: [Project Name]

**Project:** {project-name}  
**Issue Key:** {issueKey}  
**Interview Period:** 2026-08-10 to 2026-08-13  
**Total Stakeholders:** 7 (3 High, 3 Medium, 1 Low)  
**Author:** BA/PO Agent  
**Status:** Completed

---

## Executive Summary

- **Stakeholders Interviewed:** 7/7 (100% completion rate)
- **Consolidated Requirements:** 9 functional + 8 non-functional
- **Conflicts Identified:** 3 (all resolved)
- **Open Questions:** 4 (escalated with deadlines)
- **Sign-off Status:** ✅ Approved by all stakeholders on 2026-08-13

**Key Insights:**
- **Consensus:** Mobile app với LO orders là Must-have (100% stakeholders agree)
- **Timeline:** MVP Q4 2026 feasible nếu scope = 5 core features only
- **Risk:** Regulatory approval có thể delay 2-3 months (mitigation: Start early)

---

## Stakeholder Matrix

[... table với Key Needs, Constraints, Priority, Concerns ...]

---

## Interview Transcripts

### Interview 1: Nguyễn Văn A (CEO)

**Date:** 2026-08-10  
**Duration:** 45 phút

#### Section 1: Context
Q: Vai trò của bạn trong tổ chức là gì?
A: CEO, responsible for company strategy và revenue growth...

[... full transcript ...]

---

### Interview 2: Trần Thị B (Product Manager)

[... full transcript ...]

[... interviews 3-7 ...]

---

## Consolidated Requirements

[... Functional + Non-Functional requirements ...]

---

## Conflicts & Resolutions

[... 3 conflicts với resolutions ...]

---

## Open Questions & Action Items

[... table với deadlines ...]

---

## Next Steps

1. **BA/PO:** Write Business-Spec (`*-final.md`) incorporating all requirements (Deadline: 2026-08-20)
2. **Compliance:** Get HOSE approval timeline (Deadline: 2026-08-20)
3. **CFO:** Final budget approval (Deadline: 2026-08-15)
4. **All:** Review Business-Spec draft (Scheduled: 2026-08-22)

---

## Appendix

### Appendix A: Interview Questions Template

[... generic + role-specific questions ...]

### Appendix B: Raw Notes

[... raw notes từ interviews, không structured ...]
```

**Lưu vào:** `docs/stakeholder-interviews/{issueKey}-stakeholder-interviews.md`

## Tương tác với các Skills khác

- **Upstream (Before):**
  - `ba-spec` → Nếu Jira issue quá mơ hồ → Chạy skill này để thu thập requirements từ stakeholders
  - `ba-refine` → Refine ý tưởng trước khi interview (để có context khi hỏi)

- **Downstream (After):**
  - `ba-spec` → Sau khi có stakeholder input → Tổng hợp thành `*-final.md`
  - `ba-user-story-writing` → Transform stakeholder needs thành User Stories
  - `ba-gap-analysis` → Identify gaps dựa trên stakeholder constraints
  - `ba-backlog-prioritization` → Prioritize dựa trên stakeholder votes

## Các Dấu hiệu Cảnh báo (Red Flags)

❌ **Chỉ interview 1-2 stakeholders:**
- Miss perspectives từ other roles → Incomplete requirements
- → Phải interview ít nhất 3-5 stakeholders (đa dạng roles)

❌ **Stakeholders không agree với consolidated requirements:**
- Sign-off meeting không đạt consensus
- → Phải re-interview hoặc facilitate conflict resolution workshop

❌ **Không document conflicts:**
- Pretend conflicts không tồn tại → Sẽ surface later (quá muộn)
- → Phải transparent về conflicts và document resolutions

❌ **Interview quá dài (> 1 giờ):**
- Stakeholders tired, answers không quality
- → Keep 45 phút, focus on top priorities

❌ **Leading questions:**
- "Bạn nghĩ feature X sẽ tốt, đúng không?" → Bias stakeholder
- → Phải open-ended: "Bạn nghĩ gì về feature X?"

## Anti-patterns (Tránh)

1. **Interview marathon:**
   - 7 stakeholders trong 1 ngày → Exhausting, không absorb information
   - → Spread over 3-5 days

2. **No follow-up:**
   - Interview xong → Không share back findings → Stakeholders không buy-in
   - → Validation session bắt buộc

3. **Ignore low-priority stakeholders:**
   - "CFO không quan trọng, skip" → Miss budget constraints
   - → Interview tất cả, có thể shorter for low-priority

4. **Take notes only, no recording:**
   - Miss chi tiết, nuance, tone
   - → Record (with consent) để review lại

## Verification Checklist

Sau khi chạy skill này:

- [ ] Đã identify tất cả stakeholders (≥ 5 stakeholders, đa dạng roles)
- [ ] Đã prepare role-specific questions cho từng stakeholder
- [ ] Đã conduct interviews (100% completion rate preferred)
- [ ] Đã synthesize findings thành Stakeholder Matrix
- [ ] Đã consolidate requirements (functional + non-functional)
- [ ] Đã identify và resolve conflicts (document resolutions)
- [ ] Đã validate với stakeholders (sign-off meeting)
- [ ] Đã escalate open questions với deadlines
- [ ] Output file đã lưu: `docs/stakeholder-interviews/{issueKey}-stakeholder-interviews.md`
- [ ] Stakeholders approve consolidated requirements (email confirmation)

## Ví dụ

Xem file `skills/ba-stakeholder-interview/examples.md` để thấy:
- Interview transcript với 7 stakeholders (CEO to Support)
- Consolidated requirements từ multi-stakeholder input
- Conflict resolution workshop (Timeline conflict: CEO vs CTO)
- Validation session agenda và outcomes
