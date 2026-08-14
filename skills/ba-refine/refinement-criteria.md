# ba-refine — Refinement Criteria

Bảng tiêu chí đánh giá (rubric) để stress-test các hướng đi trong Phase 2.

## Tiêu chí Đánh giá

### 1. User Value (Giá trị Người dùng)

**Câu hỏi:**
- Ai được lợi từ solution này?
- Lợi ích đến mức nào? (Quantify if possible)
- Painkiller (giải quyết nỗi đau thực sự) hay Vitamin (nice-to-have)?
- Có bao nhiêu users bị ảnh hưởng?

**Scoring:**
- ⭐⭐⭐⭐⭐ (5/5): Critical painkiller, nhiều users, ROI rõ ràng
- ⭐⭐⭐⭐ (4/5): Strong painkiller, targeted users, measurable impact
- ⭐⭐⭐ (3/5): Nice-to-have, some users benefit
- ⭐⭐ (2/5): Marginal benefit, very few users
- ⭐ (1/5): Unclear benefit, no clear users

**Red flags:**
- Không identify được target user cụ thể
- Benefit không đo lường được
- "Có thì tốt, không có cũng được"

---

### 2. Feasibility (Độ Khả thi)

**Câu hỏi:**
- Chi phí kỹ thuật và tài nguyên? (Time, people, money)
- Đoạn khó nhất là gì?
- Dependencies? (External APIs, third-party services)
- Technical risks?
- Có cần thay đổi infrastructure không?

**Scoring:**
- ⭐⭐⭐⭐⭐ (5/5): Low cost, 1-3 days, no dependencies
- ⭐⭐⭐⭐ (4/5): Medium cost, 1 week, minor dependencies
- ⭐⭐⭐ (3/5): Medium-high cost, 2-3 weeks, some dependencies
- ⭐⭐ (2/5): High cost, 1-2 months, major dependencies
- ⭐ (1/5): Very high cost, >2 months, blocking dependencies

**Red flags:**
- Cần major infrastructure changes
- Dependencies nằm ngoài control (third-party chưa có API)
- Technical debt quá lớn để overcome

---

### 3. Differentiation (Sự Khác biệt)

**Câu hỏi:**
- Điều gì làm cho solution này khác biệt so với competitors?
- Có đủ hấp dẫn để users chuyển từ solution hiện tại sang không?
- Unique value proposition là gì?
- Barriers to imitation? (Có dễ copy không?)

**Scoring:**
- ⭐⭐⭐⭐⭐ (5/5): Truly unique, hard to copy, strong moat
- ⭐⭐⭐⭐ (4/5): Strong differentiation, some barriers
- ⭐⭐⭐ (3/5): Moderate differentiation, table stakes
- ⭐⭐ (2/5): Weak differentiation, me-too feature
- ⭐ (1/5): No differentiation, already exists everywhere

**Red flags:**
- "Everyone has this feature"
- Không có unique angle
- Easy to copy, no defensibility

---

### 4. Risk (Financial/Security — for Fintech/Banking)

**Câu hỏi:**
- Có rủi ro mất tiền không? (Fraud, errors, double-charging)
- Có rủi ro lộ lọt dữ liệu không? (PII, financial data)
- ACID compliance? (Transaction consistency)
- Audit trail? (Compliance requirements)
- Có đủ validation và error handling không?
- Performance at scale? (Latency, throughput)

**Scoring:**
- ⭐⭐⭐⭐⭐ (5/5): Very low risk, strong safeguards, fully compliant
- ⭐⭐⭐⭐ (4/5): Low risk, good safeguards, mostly compliant
- ⭐⭐⭐ (3/5): Medium risk, acceptable safeguards, needs review
- ⭐⭐ (2/5): High risk, weak safeguards, compliance gaps
- ⭐ (1/5): Critical risk, no safeguards, non-compliant

**Red flags:**
- Không có fraud detection
- Missing audit trail
- Weak authentication/authorization
- No rate limiting hoặc abuse prevention
- Không handle race conditions
- Missing transaction rollback logic

---

## Aggregated Scoring

Tính tổng điểm để compare các hướng đi:

```
Total Score = User Value + Feasibility + Differentiation + Risk Mitigation
Max Score = 20 points (5 + 5 + 5 + 5)
```

**Interpretation:**
- **18-20 points:** Excellent — Pursue immediately
- **15-17 points:** Strong — Good candidate, minor improvements needed
- **12-14 points:** Moderate — Needs significant improvements
- **9-11 points:** Weak — Reconsider approach
- **< 9 points:** Poor — Pivot or drop

---

## Example Scoring

### Direction A: Simple PDF Export Button

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| User Value | ⭐⭐⭐ (3/5) | Nice-to-have, many users but not critical |
| Feasibility | ⭐⭐⭐⭐⭐ (5/5) | Very low cost, 2-3 days, no dependencies |
| Differentiation | ⭐⭐ (2/5) | Table stakes, everyone has it |
| Risk | ⭐⭐⭐⭐ (4/5) | Low risk, just rendering existing data |
| **Total** | **14/20** | **Moderate** — Good quick win but not strategic |

### Direction C: Compliance-First Export with Audit Trail

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| User Value | ⭐⭐⭐⭐ (4/5) | Strong for regulated customers, measurable compliance benefit |
| Feasibility | ⭐⭐⭐ (3/5) | Medium cost, 1-2 weeks, need audit storage |
| Differentiation | ⭐⭐⭐⭐⭐ (5/5) | Unique angle, hard to copy well, strong moat |
| Risk | ⭐⭐⭐⭐⭐ (5/5) | Actually reduces risk, enhances compliance |
| **Total** | **17/20** | **Strong** — Strategic play, worth the investment |

---

## Fintech-Specific Considerations

### Transaction Integrity
- [ ] ACID properties maintained?
- [ ] Idempotency key for duplicate prevention?
- [ ] Transaction timeout and rollback logic?
- [ ] Optimistic locking for concurrent updates?

### Security
- [ ] Authentication required?
- [ ] Authorization checks (row-level security)?
- [ ] Sensitive data encrypted at rest and in transit?
- [ ] PII masking in logs?
- [ ] Rate limiting to prevent abuse?

### Compliance
- [ ] Audit trail for all actions?
- [ ] Data retention policy compliant?
- [ ] Right to deletion (GDPR)?
- [ ] Financial reporting requirements met?
- [ ] Regulatory approval needed?

### Performance
- [ ] Latency < 200ms for critical path?
- [ ] Throughput handles peak load (e.g., 10K TPS)?
- [ ] Database query optimization?
- [ ] Caching strategy?
- [ ] Monitoring and alerting?

---

## Questions to Surface Hidden Assumptions

Use these questions in Phase 2 to uncover what you're betting is true but haven't verified:

**User Assumptions:**
- "We assume users want [X]" — Have we validated this?
- "We assume users will find this via [Y]" — How do we know?
- "We assume users will adopt this quickly" — Based on what evidence?

**Technical Assumptions:**
- "We assume the API will handle this" — Have we tested?
- "We assume performance will be acceptable" — At what scale?
- "We assume no breaking changes needed" — Have we audited dependencies?

**Business Assumptions:**
- "We assume this will drive [metric]" — What's the baseline?
- "We assume competitors don't have this" — Have we checked recently?
- "We assume legal/compliance will approve" — Have we asked?

**Resource Assumptions:**
- "We assume this takes 2 weeks" — Based on what estimate?
- "We assume team has capacity" — Have we checked roadmap?
- "We assume no external dependencies" — Have we mapped the full flow?

---

## Output Format (for Phase 2)

```markdown
## Direction A: [Name]

### Scores
| Criterion | Score | Rationale |
|-----------|-------|-----------|
| User Value | ⭐⭐⭐ | [Brief explanation] |
| Feasibility | ⭐⭐⭐⭐⭐ | [Brief explanation] |
| Differentiation | ⭐⭐ | [Brief explanation] |
| Risk | ⭐⭐⭐⭐ | [Brief explanation] |
| **Total** | **14/20** | **Moderate** |

### Assumptions
**Betting on (unverified):**
- Users want PDF specifically (not Excel/CSV)
- Current report data is complete

**Could kill this:**
- Performance issues with large reports
- Legal requires audit trail (we don't have)

**Explicitly ignoring:**
- Advanced features (filters, custom templates)
- Reason: Keep it simple for v1, iterate later
```
