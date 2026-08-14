---
name: ba-gap-analysis
description: Phân tích khoảng cách giữa trạng thái hiện tại (AS-IS) và trạng thái mục tiêu (TO-BE). Identify missing features, process changes, data migration needs, và dependencies. Propose action items để close gaps với priority và timeline. Sử dụng khi có Business-Spec hoặc requirements cần phân tích AS-IS vs TO-BE, khi user yêu cầu "phân tích gap", "so sánh current vs target state", hoặc khi cần roadmap chi tiết.
---

# Skill: ba-gap-analysis

## Tổng quan

Gap Analysis là kỹ thuật phân tích nghiệp vụ để xác định khoảng cách giữa:
- **AS-IS (Trạng thái hiện tại)** — Hệ thống/quy trình đang hoạt động như thế nào
- **TO-BE (Trạng thái mục tiêu)** — Hệ thống/quy trình cần phải như thế nào để đáp ứng yêu cầu

Skill này giúp BA/PO:
1. **Document AS-IS** — Hiểu rõ current state (pain points, limitations, workarounds)
2. **Define TO-BE** — Visualize target state (expected benefits, success criteria)
3. **Identify Gaps** — Phát hiện những gì thiếu (features, data, process, skills)
4. **Prioritize Actions** — Đề xuất roadmap để close gaps (phased approach)
5. **Estimate Impact** — Đánh giá effort, risk, và business value của từng gap

## Khi nào sử dụng

Kích hoạt skill này khi:

- Có Business-Spec (`*-final.md`) cần phân tích AS-IS vs TO-BE để lập roadmap
- User yêu cầu: "phân tích gap", "so sánh current vs target", "as-is to-be analysis"
- Trước khi bắt đầu project lớn (migration, system replacement, process redesign)
- Stakeholder hỏi: "Cần làm gì để đi từ A đến B?" hoặc "Tại sao không thể làm ngay được?"
- Cần justify cho leadership: effort/cost/risk của một initiative

**Khi KHÔNG nên sử dụng:**

- Requirements quá mơ hồ (chạy `ba-interview-me` trước để làm rõ TO-BE)
- Greenfield project (không có AS-IS, chỉ có TO-BE)
- Đã có roadmap chi tiết (không cần phân tích lại)
- Gap quá nhỏ, trivial (VD: thêm 1 field vào form — không cần gap analysis)

## Quy trình thực hiện

### Bước 1: Đọc Input (Business-Spec hoặc Requirements)

**Input A: File `*-final.md`**
```bash
specs/imports/jira/{issueKey}/{issueKey}-final.md
```

Trích xuất:
- Section 1: Summary → Feature name, Context
- Section 2: Current State/Background → AS-IS hints
- Section 4: Technical Context → Current tech stack
- Section 5: User Flow (TO-BE) → Target state
- Section 8: Business Rules → TO-BE behaviors

**Input B: Requirements từ user (text)**

User cung cấp mô tả AS-IS và TO-BE dạng text.

### Bước 2: Document AS-IS (Current State)

**2.1. Process/Workflow (Quy trình hiện tại)**

Mô tả chi tiết quy trình hiện tại:
- Actors (ai làm gì?)
- Steps (các bước thực hiện)
- Tools/Systems (sử dụng công cụ/hệ thống nào?)
- Data flow (dữ liệu chảy như thế nào?)
- Timing (mất bao lâu?)

**Example:**
```markdown
### AS-IS: Quy trình đặt lệnh cổ phiếu hiện tại

**Actors:**
- Khách hàng (trader)
- Nhân viên môi giới (broker)
- Hệ thống HO (back-office)

**Steps:**
1. Khách hàng gọi điện cho broker (trung bình 2 phút chờ)
2. Broker ghi nhận lệnh trên sổ tay giấy
3. Broker nhập lệnh vào hệ thống HO (5 bước, 3-5 phút)
4. HO kiểm tra margin, duyệt lệnh
5. HO gửi lệnh lên sàn (HNX/HSX)
6. Broker gọi lại khách hàng báo trạng thái (trung bình 5 phút sau)

**Total time:** 10-15 phút từ khi khách hàng quyết định đến khi lệnh lên sàn

**Tools/Systems:**
- Điện thoại (voice call)
- Sổ tay giấy (backup)
- Hệ thống HO (legacy, Java Swing desktop app)
```

**2.2. Pain Points (Điểm đau hiện tại)**

Liệt kê cụ thể những gì không tốt:

```markdown
### AS-IS: Pain Points

1. **Chậm (10-15 phút):**
   - Khách hàng bỏ lỡ giá tốt khi thị trường biến động nhanh
   - Broker phải xử lý nhiều cuộc gọi cùng lúc → overload

2. **Lỗi nhập liệu:**
   - Broker ghi sai mã CK (VD: VNM → VMN)
   - Nhập sai số lượng hoặc giá (do nghe nhầm qua điện thoại)
   - Estimated error rate: 2-3% lệnh (dựa trên số lệnh bị khách hàng complain)

3. **Không scalable:**
   - 1 broker chỉ xử lý được ~20 lệnh/giờ
   - Peak hours (9:00-9:15, 14:15-14:30) → khách hàng phải chờ lâu

4. **Thiếu transparency:**
   - Khách hàng không biết lệnh đã lên sàn chưa
   - Phải gọi lại broker để hỏi trạng thái

5. **Chi phí cao:**
   - Cần thuê nhiều broker (1 broker ~15 triệu/tháng)
   - Chi phí điện thoại (voice call) cao
```

**2.3. Limitations (Hạn chế kỹ thuật/nghiệp vụ)**

```markdown
### AS-IS: Limitations

**Kỹ thuật:**
- Hệ thống HO chỉ chạy trên Windows desktop (không có mobile/web)
- Database Oracle 10g (đã end-of-life, không còn support)
- Không có API (không thể tích hợp với app mobile)
- Không có real-time notification (phải poll database mỗi 30s)

**Nghiệp vụ:**
- Chỉ hỗ trợ lệnh LO (Limit Order), không hỗ trợ MP, ATO, ATC
- Không có tính năng lưu template lệnh (khách hàng phải nhập lại mỗi lần)
- Không có stop-loss, trailing-stop
- Không hỗ trợ lệnh điều kiện (If-Done, OCO)
```

**2.4. Current Metrics (Số liệu hiện tại)**

Quan trọng: Phải có baseline metrics để so sánh sau này:

```markdown
### AS-IS: Metrics (Baseline)

| Metric | Current Value | Source |
|--------|---------------|--------|
| Avg time to place order | 10-15 phút | Call center logs (Q1 2026) |
| Error rate | 2-3% | Complaint tickets (Jira) |
| Broker capacity | 20 orders/hour | Time-motion study |
| Customer satisfaction | 3.2/5.0 | NPS survey (Q4 2025) |
| Peak hour wait time | 5-8 phút | Call center queue data |
| Mobile usage | 0% (không có app) | N/A |
| Cost per order | ~15,000 VND (broker salary/orders) | Finance report |
```

### Bước 3: Define TO-BE (Target State)

**3.1. Target Process/Workflow**

Mô tả quy trình mục tiêu (sau khi implement feature mới):

```markdown
### TO-BE: Quy trình đặt lệnh mục tiêu

**Actors:**
- Khách hàng (self-service trên mobile app)
- Hệ thống OMS (Order Management System, cloud-based)
- HO (chỉ can thiệp khi có exception)

**Steps:**
1. Khách hàng mở app, nhập mã CK/số lượng/giá (1 màn hình)
2. App validate real-time (margin, hạn mức)
3. Khách hàng xác nhận (1 tap)
4. Lệnh gửi lên sàn tự động (qua FIX protocol)
5. App hiển thị trạng thái real-time (via WebSocket)

**Total time:** < 30 giây từ khi mở app đến khi lệnh lên sàn

**Tools/Systems:**
- Mobile app (iOS/Android, React Native)
- OMS (cloud, microservices, Kafka message queue)
- FIX Gateway (kết nối sàn HNX/HSX)
```

**3.2. Expected Benefits (Lợi ích mong đợi)**

```markdown
### TO-BE: Expected Benefits

**For Customers:**
- ⏱️ Giảm thời gian: 10-15 phút → < 30 giây (giảm 95%)
- 📱 Self-service 24/7: Đặt lệnh mọi lúc, không cần chờ broker
- ✅ Giảm lỗi: 2-3% → < 0.5% (validation real-time)
- 📊 Transparency: Xem trạng thái lệnh real-time, không cần gọi hỏi

**For Business:**
- 💰 Giảm chi phí: ~15,000 VND/order → ~2,000 VND/order (giảm 87%)
- 📈 Tăng capacity: 20 orders/hour/broker → Unlimited (auto-scale cloud)
- 🎯 Tăng revenue: Khách hàng giao dịch nhiều hơn (dễ dàng hơn)
- 🏆 Competitive advantage: Bắt kịp đối thủ (VPS, SSI đã có app)
```

**3.3. Success Criteria (Tiêu chí thành công)**

Phải **measurable** và **time-bound**:

```markdown
### TO-BE: Success Criteria

| Metric | Target Value | Measurement Method | Timeline |
|--------|--------------|-------------------|----------|
| Avg time to place order | < 30 giây | App analytics (Firebase) | 3 tháng sau launch |
| Error rate | < 0.5% | Error logs + customer complaints | 6 tháng sau launch |
| Mobile adoption | ≥ 60% orders via app | App vs broker ratio | 12 tháng sau launch |
| Customer satisfaction | ≥ 4.2/5.0 | NPS survey | 6 tháng sau launch |
| Peak hour performance | < 2s response time | APM tool (Datadog) | Ngay sau launch |
| Cost per order | < 5,000 VND | Finance report | 12 tháng sau launch |
```

### Bước 4: Identify Gaps (Phát hiện khoảng cách)

Với mỗi aspect (Process, Features, Data, Infrastructure, Skills), identify gaps:

**Gap Categories:**

| Category | AS-IS | TO-BE | Gap |
|----------|-------|-------|-----|
| **Process** | 6 steps, manual | 3 steps, automated | Automation + workflow redesign |
| **Features** | LO only | LO + MP + ATO + ATC | 3 new order types |
| **Data** | No real-time | Real-time via WebSocket | WebSocket integration |
| **Infrastructure** | Desktop, Oracle 10g | Mobile app, Cloud, microservices | Full migration |
| **Skills** | Broker-centric | Self-service + DevOps | Training + hiring |

**Detailed Gap Analysis:**

```markdown
### Gap Analysis: Detailed

#### Gap 1: Mobile App (KHÔNG CÓ → CẦN CÓ)

**AS-IS:** Không có mobile app, khách hàng phải gọi điện  
**TO-BE:** Mobile app (iOS + Android) với đầy đủ tính năng  
**Gap:** Toàn bộ mobile app cần build from scratch

**Impact:**
- **Effort:** 6-9 tháng (2 mobile devs + 1 backend dev + 1 QA)
- **Cost:** ~500 triệu VND (nhân sự + infrastructure)
- **Risk:** High (chưa có team mobile, cần hire hoặc outsource)

**Dependencies:**
- Cần OMS API (Gap 3) hoàn thành trước
- Cần FIX Gateway (Gap 4) để gửi lệnh lên sàn

**Priority:** 🔴 Critical (core feature, không có app → không có self-service)

---

#### Gap 2: Real-time Notification (Polling → WebSocket)

**AS-IS:** Broker gọi điện báo trạng thái (5-10 phút delay)  
**TO-BE:** App push notification real-time (< 1s delay)  
**Gap:** WebSocket server + mobile push notification infrastructure

**Impact:**
- **Effort:** 1-2 tháng (1 backend dev + 1 mobile dev)
- **Cost:** ~50 triệu VND (nhân sự) + ~5 triệu/tháng (Firebase, AWS)
- **Risk:** Medium (WebSocket scale với 10,000+ concurrent users)

**Dependencies:**
- Cần OMS publish events (Gap 3)
- Cần mobile app (Gap 1) để nhận notification

**Priority:** 🟡 Important (user experience tốt hơn, nhưng có thể delay)

---

#### Gap 3: OMS (Order Management System) API

**AS-IS:** Hệ thống HO desktop (legacy, không có API)  
**TO-BE:** OMS microservices với REST API + event streaming  
**Gap:** Build new OMS from scratch hoặc buy commercial OMS

**Impact:**
- **Option A: Build** — 12-18 tháng, ~2 tỷ VND, High risk
- **Option B: Buy** — 3-6 tháng, ~500 triệu/năm license, Medium risk

**Dependencies:**
- Cần Database migration (Gap 5) trước khi switch
- Cần FIX Gateway (Gap 4) để kết nối sàn

**Priority:** 🔴 Critical (core backend, block mọi features khác)

---

#### Gap 4: FIX Protocol Integration

**AS-IS:** HO gửi lệnh lên sàn qua FIX 4.2 (existing)  
**TO-BE:** Tương tự, nhưng từ OMS (thay vì HO)  
**Gap:** Re-implement FIX client trong OMS

**Impact:**
- **Effort:** 2-3 tháng (1 senior dev có kinh nghiệm FIX)
- **Cost:** ~80 triệu VND
- **Risk:** Medium (FIX protocol phức tạp, cần test kỹ với sàn)

**Dependencies:**
- Cần OMS (Gap 3) hoàn thành trước
- Cần test environment từ HNX/HSX (sàn sandbox)

**Priority:** 🔴 Critical (không có FIX → lệnh không lên sàn)

---

#### Gap 5: Database Migration (Oracle 10g → PostgreSQL)

**AS-IS:** Oracle 10g (EOL, expensive license)  
**TO-BE:** PostgreSQL 15 (cloud-managed, RDS)  
**Gap:** Migrate schema + data + queries

**Impact:**
- **Effort:** 3-4 tháng (1 DBA + 2 backend devs)
- **Cost:** ~150 triệu VND (nhân sự) + ~20 triệu/tháng (RDS)
- **Risk:** High (data integrity, zero-downtime migration)

**Dependencies:**
- Phải hoàn thành trước khi switch sang OMS (Gap 3)

**Priority:** 🔴 Critical (blocker cho OMS)

---

#### Gap 6: Order Types (LO only → LO + MP + ATO + ATC)

**AS-IS:** Chỉ support LO (Limit Order)  
**TO-BE:** Support 4 loại lệnh (LO, MP, ATO, ATC)  
**Gap:** Implement 3 order types mới

**Impact:**
- **Effort:** 1-2 tháng (1 backend dev + 1 mobile dev + 1 QA)
- **Cost:** ~50 triệu VND
- **Risk:** Low (business logic đơn giản, đã có reference từ đối thủ)

**Dependencies:**
- Cần OMS (Gap 3) và mobile app (Gap 1) hoàn thành trước

**Priority:** 🟢 Nice-to-have (can defer to Phase 2)

---

#### Gap 7: Skills & Team

**AS-IS:** Team chủ yếu là Java desktop dev + broker operations  
**TO-BE:** Cần mobile devs, cloud devs, DevOps, SRE  
**Gap:** Hire hoặc train 5-7 engineers mới

**Impact:**
- **Effort:** 3-6 tháng (recruitment + onboarding)
- **Cost:** ~300 triệu VND (sign-on bonus + training)
- **Risk:** High (talent war, khó hire mobile devs giỏi)

**Dependencies:** None (có thể bắt đầu ngay)

**Priority:** 🔴 Critical (không có team → không build được gì)
```

### Bước 5: Prioritize & Roadmap

**5.1. Gap Prioritization Matrix**

Dùng **Value vs Effort** matrix:

```markdown
### Gap Prioritization

| Gap # | Gap Name | Business Value | Effort | Risk | Priority | Phase |
|-------|----------|---------------|--------|------|----------|-------|
| 7 | Skills & Team | High | Medium | High | 🔴 Critical | 0 (Pre-work) |
| 5 | DB Migration | High | High | High | 🔴 Critical | 1 |
| 3 | OMS API | High | High | High | 🔴 Critical | 1 |
| 4 | FIX Integration | High | Medium | Medium | 🔴 Critical | 1 |
| 1 | Mobile App | High | High | Medium | 🔴 Critical | 2 |
| 2 | Real-time Notification | Medium | Low | Medium | 🟡 Important | 2 |
| 6 | New Order Types | Low | Low | Low | 🟢 Nice-to-have | 3 |
```

**5.2. Phased Roadmap**

```markdown
### Roadmap: AS-IS → TO-BE (18 months)

**Phase 0: Team Building (Month 1-3)**
- Hire 2 mobile devs (iOS + Android)
- Hire 2 backend devs (microservices + cloud)
- Hire 1 DevOps engineer
- Hire 1 DBA (PostgreSQL)
- Train existing team on new stack

**Phase 1: Backend Foundation (Month 4-9)**
- Gap 5: Migrate Oracle → PostgreSQL (Month 4-7)
- Gap 3: Build OMS microservices (Month 6-9)
  - Core API: Create order, Get order status
  - Admin API: Manage customers, margin
- Gap 4: FIX Gateway integration (Month 7-9)
- UAT with internal brokers (Month 9)

**Phase 2: Mobile App MVP (Month 10-15)**
- Gap 1: Mobile app development (Month 10-15)
  - iOS + Android (React Native)
  - Feature: Place LO order only (MVP)
  - Feature: View order status (list view)
- Gap 2: Real-time notification (Month 13-15)
  - WebSocket server
  - Firebase push notification
- Beta launch với 100 pilot customers (Month 15)

**Phase 3: Enhancement (Month 16-18)**
- Gap 6: New order types (MP, ATO, ATC) (Month 16-17)
- Polish UI/UX based on beta feedback
- Performance optimization (< 2s response time)
- Full launch to all customers (Month 18)

**Post-launch (Month 19+)**
- Monitor metrics vs success criteria
- Iterate based on feedback
- Advanced features: Stop-loss, Trailing-stop, Conditional orders
```

**5.3. Risk Mitigation**

```markdown
### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Fail to hire mobile devs | High | High | Outsource to agency (backup plan) |
| DB migration data loss | Medium | Critical | Full backup + pilot migration + rollback plan |
| OMS performance issues | Medium | High | Load testing in staging (10,000 TPS) |
| FIX integration bugs | Medium | High | 3-month UAT with sàn sandbox |
| Users don't adopt app | Medium | High | Incentive program (fee discount for app users) |
| Tight timeline (18 months) | High | High | MVP-first approach, defer Phase 3 if needed |
```

## Đầu ra (Output)

### Format: Gap Analysis Document

```markdown
# Gap Analysis: [Feature Name]

**Project:** {project-name}  
**Issue Key:** {issueKey}  
**Author:** BA/PO Agent  
**Date:** 2026-08-13  
**Version:** 1.0

---

## Executive Summary

- **Current State:** 6-step manual process, 10-15 phút/order, 2-3% error rate
- **Target State:** 3-step self-service app, < 30 giây/order, < 0.5% error rate
- **Total Gaps:** 7 gaps identified (4 Critical, 1 Important, 2 Nice-to-have)
- **Total Effort:** 18 months, ~3 tỷ VND
- **Total Risk:** High (team, DB migration, timeline)
- **Recommendation:** Proceed với phased approach (MVP-first)

---

## 1. AS-IS (Current State)

### 1.1. Process
[... chi tiết quy trình hiện tại ...]

### 1.2. Pain Points
[... pain points ...]

### 1.3. Limitations
[... limitations ...]

### 1.4. Current Metrics (Baseline)
[... metrics table ...]

---

## 2. TO-BE (Target State)

### 2.1. Target Process
[... target workflow ...]

### 2.2. Expected Benefits
[... benefits ...]

### 2.3. Success Criteria
[... measurable targets ...]

---

## 3. Gap Analysis

[... 7 gaps với chi tiết Impact/Effort/Risk/Dependencies/Priority ...]

---

## 4. Prioritization & Roadmap

### 4.1. Gap Priority Matrix
[... table ...]

### 4.2. Phased Roadmap (18 months)
[... Phase 0/1/2/3 ...]

### 4.3. Risk Mitigation
[... risks & mitigations ...]

---

## 5. Action Items

| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| Approve budget (~3 tỷ VND) | CFO | 2026-09-01 | Pending |
| Hire 2 mobile devs | HR | 2026-10-01 | Pending |
| Kickoff DB migration | DBA | 2026-11-01 | Pending |
| Sign OMS vendor contract | CTO | 2026-10-15 | Pending |

---

## 6. Appendix

### 6.1. Assumptions
- Giả định có budget đủ (~3 tỷ VND)
- Giả định hire được đủ talent (6 months recruitment)
- Giả định không có regulatory changes (HOSE/HNX rules stable)

### 6.2. Open Questions
- Có nên buy OMS thay vì build? (cost-benefit analysis cần thêm)
- Có nên outsource mobile app? (vs in-house)

### 6.3. References
- [HNX FIX Specification v4.2](...)
- [Competitor Analysis: VPS SmartOne](...)
- [Market Research: Mobile Trading Trends](...)
```

**Lưu vào:** `docs/gap-analysis/{issueKey}-gap-analysis.md`

## Tương tác với các Skills khác

- **Upstream (Before):**
  - `ba-spec` → Tạo `*-final.md` → Input cho skill này
  - `ba-interview-me` → Làm rõ AS-IS và TO-BE trước khi phân tích gaps
  - `ba-refine` → Refine TO-BE vision trước khi gap analysis

- **Downstream (After):**
  - `ba-backlog-prioritization` → Prioritize backlog dựa trên gaps identified
  - `planning-and-task-breakdown` → Breakdown roadmap thành tasks
  - `dev-spec-driven-development` → Transform gaps thành Tech-Spec

## Các Dấu hiệu Cảnh báo (Red Flags)

❌ **AS-IS không có metrics:**
- Không thể so sánh → Không biết cải thiện được bao nhiêu
- → Phải có baseline metrics (thời gian, lỗi, chi phí, satisfaction)

❌ **TO-BE không có success criteria measurable:**
- "Hệ thống tốt hơn", "Nhanh hơn" → Không đo được
- → Phải có số liệu cụ thể: "< 30 giây", "< 0.5% error", "≥ 4.2/5.0 NPS"

❌ **Gaps không có effort/cost estimate:**
- Leadership không approve budget → Project dừng
- → Mỗi gap phải có ước lượng thời gian + chi phí + risk

❌ **Roadmap không có dependencies:**
- Làm App trước khi có API → Chắc chắn fail
- → Phải map dependencies rõ ràng

❌ **Không có risk mitigation:**
- "Hy vọng mọi thứ OK" → Project 90% fail
- → Mỗi risk phải có mitigation plan

## Anti-patterns (Tránh)

1. **Analysis paralysis:**
   - Phân tích quá chi tiết, không bao giờ bắt đầu implement
   - → Gap analysis chỉ cần đủ để decision-making, không cần perfect

2. **Ignore AS-IS:**
   - Nhảy thẳng vào TO-BE mà không hiểu AS-IS
   - → Sẽ miss dependencies, underestimate effort

3. **Overpromise TO-BE:**
   - "Sẽ tăng revenue 10x" (không có data support)
   - → Phải realistic, data-driven

4. **Không involve stakeholders:**
   - BA tự phân tích → stakeholders không buy-in
   - → Phải interview stakeholders để validate AS-IS và TO-BE

## Verification Checklist

Sau khi chạy skill này:

- [ ] AS-IS documented với process + pain points + limitations + metrics
- [ ] TO-BE defined với target process + benefits + success criteria
- [ ] Mỗi gap có: Name, Impact, Effort, Cost, Risk, Dependencies, Priority
- [ ] Gaps đã được prioritized theo Value vs Effort matrix
- [ ] Roadmap có phased approach với timeline rõ ràng
- [ ] Risks identified với mitigation plans
- [ ] Action items assigned với owner + deadline
- [ ] Output file đã lưu: `docs/gap-analysis/{issueKey}-gap-analysis.md`
- [ ] Stakeholders đã review và approve budget + timeline

## Ví dụ

Xem file `skills/ba-gap-analysis/examples.md` để thấy:
- Gap analysis cho migration project (Oracle → Cloud)
- Gap analysis cho greenfield mobile app
- Gap analysis cho process redesign (manual → automated)
