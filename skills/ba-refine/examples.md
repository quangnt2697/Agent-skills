# ba-refine — Example Sessions

Ví dụ về một phiên refine ý tưởng chất lượng cao.

---

## Example 1: Export Feature Refinement

### Original Jira Task

**Issue Key:** PROJ-456  
**Summary:** "Add export button to reports"  
**Description:** "Users want to export their trading reports"

---

### Phase 0: Download & Understand

```
Agent: Downloading PROJ-456...

✅ Task downloaded successfully

**Metadata:**
- Type: Story
- Reporter: john@company.com
- Assignee: None
- Priority: Medium
- Labels: [feature-request, reports]

**Original Description:**
"Users want to export their trading reports"

📊 Initial Assessment: This is quite vague. We need to clarify:
- Which users? (Retail traders, institutional, admins?)
- Which reports? (Daily P&L, transaction history, all?)
- Export to what format? (PDF, Excel, CSV?)
- Export for what purpose? (Audit, analysis, sharing?)

Moving to Phase 1...
```

---

### Phase 1: Understand & Expand (Divergent)

#### HMW Statement

```
Agent: Let me reframe this problem:

**How Might We** help traders preserve and utilize their trading data 
outside the platform in a way that serves their specific workflows?

This shifts focus from "add a button" to "solve the underlying need".
```

#### Core Components Clarification

```
Agent: Before generating variations, I need to clarify core components.

Let me ask you a few questions:
```

**[AskUserQuestion triggered]**

```
Question 1: Who exactly needs this export feature?
Options:
- Retail day traders (active trading, need daily summaries)
- Long-term investors (quarterly portfolio review)
- Professional traders (compliance/audit requirements)
- Account managers (client reporting)

User Answer: "Retail day traders and professional traders"
```

```
Question 2: What's the business context? Why now?
Options:
- Competitor launched similar feature (parity)
- Compliance requirement (regulatory)
- Top user request (demand-driven)
- Strategic initiative (product vision)

User Answer: "Top user request - 87 support tickets in Q3"
```

```
Question 3: What's the primary use case for exported data?
Options:
- Tax preparation (end of year)
- Personal record keeping (backup)
- Share with financial advisor (collaboration)
- Offline analysis in Excel/Python (power users)

User Answer: "Mix of tax prep and offline analysis"
```

```
Question 4: Any technical constraints?
User Answer: "Reports can be large (10K+ transactions), need to handle performance"
```

#### Confidence Check

```
Agent: Based on your answers:

✅ User Story: Clear (retail + pro traders, tax prep + analysis)
✅ Business Context: Clear (high demand, 87 tickets)
✅ Use Cases: Clear (tax + analysis)
⚠️  Acceptance Criteria: Need to define
⚠️  Success Metrics: Need to define

Confidence: 75% - Let me clarify a bit more...
```

**[More questions via AskUserQuestion]**

```
Agent: Two more quick questions:

Q5: How do we measure success?
User: "Reduction in support tickets + adoption rate"

Q6: Any compliance/security requirements?
User: "Yes, need audit trail of who exported what"

✅ Confidence now: 92% - Ready to generate variations!
```

#### Generated Variations (5-8)

```
Agent: Based on what I learned, here are 6 variations from different angles:

---

**A. Quick Win: Simple PDF Export**

*Lens: Extreme Simplification*

One-click button → Download current view as PDF

**Pros:**
- Fastest to ship (2-3 days)
- Low risk
- Solves immediate pain

**Cons:**
- Not great for large datasets
- Limited customization
- Everyone has this (no differentiation)

**Assumptions:**
- Users want PDF specifically
- Current view has all needed data

---

**B. Power User: Multi-Format Export**

*Lens: Audience Shift (to power users)*

Export wizard with format options (PDF, Excel, CSV, JSON) + date range + columns selection

**Pros:**
- Serves both casual and power users
- Strong differentiation (most competitors only do PDF)
- Enables advanced analysis workflows

**Cons:**
- Higher development cost (1-2 weeks)
- More UI complexity

**Assumptions:**
- Users know what format they need
- Extra options = better (might be wrong!)

---

**C. Compliance First: Audit Trail Export**

*Lens: Expert (Compliance) + Security-First*

Export with:
- Tamper-proof audit trail (who, when, what)
- PDF/A format (archival standard)
- Digital signature + watermark
- Encrypted download link

**Pros:**
- Solves compliance pain (huge for pro traders)
- Strong moat (hard to copy well)
- Actually reduces legal risk

**Cons:**
- Higher cost (2 weeks)
- Needs infrastructure (audit DB, signing service)

**Assumptions:**
- Compliance is a big enough pain
- We can implement PDF signing properly

---

**D. Inversion: No Export, Live Sharing**

*Lens: Inversion + First Principles*

Instead of export → Generate shareable encrypted link with:
- Live auto-refresh
- Expiration (24h, 7d, 30d)
- Read-only access

**Pros:**
- Truly differentiated (nobody does this)
- Always up-to-date (no stale exports)
- Easier for collaboration

**Cons:**
- Doesn't solve "offline analysis" use case
- Requires internet access

**Assumptions:**
- Users have reliable internet
- "Export" isn't strictly required

---

**E. Platform Play: Report Library**

*Lens: Combination (Export + Storage + Sharing)*

Not just export, but:
- Automated daily/weekly snapshots
- Personal report library (history)
- Share with advisor/accountant
- Collaborative annotations

**Pros:**
- Strategic (builds platform stickiness)
- Network effects (advisors join platform)
- Upsell opportunity (pro tier)

**Cons:**
- Large scope (1-2 months)
- Needs storage infrastructure
- Out of scope for quick win

**Assumptions:**
- Users want report history
- Advisors would use our platform

---

**F. 10x Scale: Async Export Queue**

*Lens: 10x Scale + Performance-First*

For large exports:
- Background job queue
- Email notification when ready
- Pre-generated snapshots (cached)
- Streaming for huge datasets

**Pros:**
- Handles 10K+ transactions smoothly
- Better UX (no browser timeout)
- Scalable architecture

**Cons:**
- Complex implementation (2-3 weeks)
- Needs queue infrastructure (Redis/Celery)

**Assumptions:**
- Large exports are common enough
- Users OK with async (not instant)

---

**Summary Table:**

| Variation | Time | User Value | Differentiation | Risk | Total |
|-----------|------|------------|-----------------|------|-------|
| A. Simple PDF | 3d | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 12/20 |
| B. Multi-Format | 1w | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 14/20 |
| C. Compliance | 2w | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 18/20 |
| D. Live Sharing | 1.5w | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 14/20 |
| E. Library | 2mo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 16/20 |
| F. Async Queue | 2w | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 15/20 |

Which directions sound interesting to you? Or do you see angles I missed?
```

---

### Phase 2: Evaluate & Converge

```
User: "C and B sound good. C seems strategic but is B overkill?"

Agent: Good question. Let me cluster and stress-test:

**Direction Group 1: Compliance-First (C)**
**Direction Group 2: Feature-Rich (B + F combined)**

Let me stress-test both...

---

## Direction 1: Compliance-First Export

### Stress Test

**User Value: ⭐⭐⭐⭐ (4/5)**
- Pro traders NEED audit trails (painkiller)
- Retail traders benefit (peace of mind)
- Quantified: Solves 60% of support tickets (compliance-related)

**Feasibility: ⭐⭐⭐ (3/5)**
- Medium cost: 2 weeks
- Hard part: PDF signing service integration
- Dependencies: Need audit DB schema

**Differentiation: ⭐⭐⭐⭐⭐ (5/5)**
- Competitors don't have this
- Hard to copy well (deep compliance knowledge)
- Strong moat

**Risk: ⭐⭐⭐⭐⭐ (5/5)**
- Actually REDUCES risk
- Audit trail = transparency
- Legal loves this

**Total: 17/20 (Strong)**

### Hidden Assumptions

**Betting on (unverified):**
- Compliance is pain enough to justify 2 weeks
- We can implement PDF signing correctly
- Audit storage won't balloon costs

**Could kill this:**
- Legal/compliance team doesn't approve approach
- PDF signing service is too expensive
- Performance impact of audit logging

**Explicitly ignoring:**
- Advanced features (scheduled exports, templates)
- Reason: Focus on compliance value first, iterate later

---

## Direction 2: Feature-Rich (Multi-Format + Async)

### Stress Test

**User Value: ⭐⭐⭐⭐ (4/5)**
- Serves power users well
- Handles large datasets
- But not "must-have" for most

**Feasibility: ⭐⭐⭐ (3/5)**
- Combined cost: 2-3 weeks
- Two sub-systems (format conversion + queue)
- More complexity = more bugs

**Differentiation: ⭐⭐⭐⭐ (4/5)**
- Better than competitors
- But not unique angle

**Risk: ⭐⭐⭐ (3/5)**
- Medium risk (complexity)
- Queue could fail silently
- More surface area for bugs

**Total: 14/20 (Moderate)**

### Hidden Assumptions

**Betting on (unverified):**
- Users need multiple formats (maybe just PDF is fine?)
- Large exports are common (need data to confirm)
- Async UX is acceptable (instant might be better)

**Could kill this:**
- Users confused by too many options
- Queue infrastructure becomes operational burden
- Most exports are small anyway (overkill)

---

## Recommendation

Go with **Direction 1: Compliance-First** for v1.

**Why:**
- Higher total score (17 vs 14)
- Clear differentiation (strategic moat)
- Solves specific pain (compliance)
- Reduces risk (legal loves it)

**Then iterate:**
- Phase 2: Add multi-format if data shows demand
- Phase 3: Add async queue if performance becomes issue

**Don't over-engineer v1.** Start with strong core value (compliance), 
expand based on real usage data.

Sound good, or do you see it differently?
```

```
User: "Makes sense. Let's go with C."

Agent: Perfect. Moving to Phase 3 to sharpen the spec...
```

---

### Phase 3: Sharpen & Structure

```
Agent: Creating refined spec...

📁 File: specs/refine/jira/PROJ-456/PROJ-456-refined.md
```

**[File content generated with full structure from SKILL.md template]**

```markdown
# [PROJ-456] Compliance-First Report Export

## 🧩 User Story

As a **professional trader subject to regulatory audit requirements**
I want to export my trading reports with tamper-proof audit trail
So that I can provide compliant documentation to auditors and reduce legal risk

## 💼 Business Context

87 support tickets in Q3 requesting export feature. 60% are compliance-related 
(need to prove trading history to auditors, tax authorities).

Current workaround: Manual screenshots (error-prone, not auditable).

**Why Now:** 
- Q4 tax season approaching (high demand)
- Competitive parity (3 major competitors launched export)
- Risk mitigation (legal team flagged lack of audit trail)

## ✅ Acceptance Criteria

**Feature:** Compliance-First Report Export

**Scenario 1: Successful export with audit trail**
- **Given** I am a logged-in user on the Reports page
- **When** I click "Export Report" button
- **Then** System generates PDF/A format report
- **And** System logs audit entry (user_id, timestamp, report_type, transaction_count)
- **And** PDF includes digital signature + watermark with user_id
- **And** Download link is encrypted and expires in 24 hours

**Scenario 2: Large report handling**
- **Given** Report has >10,000 transactions
- **When** I request export
- **Then** System queues export as background job
- **And** System sends email notification when ready
- **And** Export completes within 5 minutes

**Scenario 3: Audit trail query**
- **Given** I am an admin user
- **When** I access Audit Log dashboard
- **Then** I can see all export events (who, when, what)
- **And** I can filter by user, date range, report type

## 🎨 User Flow / Design

### User Flow

1. User navigates to Reports page
2. Selects report type (Daily P&L, Transaction History, Portfolio Summary)
3. Clicks "Export Report" button
4. System shows progress indicator
5. If small report (<1000 rows): Instant download
6. If large report (>1000 rows): "We'll email you when ready" message
7. User receives encrypted download link
8. User clicks link → PDF downloads
9. PDF includes:
   - Report data
   - Watermark: "Exported by {user_name} on {timestamp}"
   - Digital signature footer

### Design Notes

- Export button: Secondary action (not primary CTA)
- Progress indicator: Indeterminate spinner for <5s, determinate for longer
- Email template: Professional, includes expiration notice

## ☀️ Success Criteria & Tracking

### Success Metrics
| Metric | Current | Target | Measurement Method |
|--------|---------|--------|--------------------|
| Support tickets (export-related) | 87/quarter | <30/quarter | Zendesk tag analysis |
| Export adoption rate | 0% | >40% active users | Analytics dashboard |
| Audit compliance queries | Manual (slow) | <1 hour response | Audit log query time |

### Event Tracking
| Event Name | Trigger | Dashboard |
|------------|---------|-----------|
| `export_report_initiated` | User clicks Export button | Growth dashboard |
| `export_report_completed` | PDF generated successfully | Growth dashboard |
| `export_report_downloaded` | User downloads PDF | Growth dashboard |
| `export_report_failed` | Export job fails | Ops alert (PagerDuty) |

## 🧱 Technical Notes

**API / Service:**
- `POST /api/v1/reports/{report_id}/export` - Queue export job
- `GET /api/v1/exports/{export_id}` - Check status
- `GET /api/v1/exports/{export_id}/download` - Get encrypted link
- Authentication: JWT token required
- Rate limit: 10 exports/hour per user

**Database:**
- New table: `export_audit_log` (user_id, report_id, timestamp, status)
- Index on (user_id, timestamp) for audit queries
- Retention: 7 years (compliance requirement)

**Dependencies:**
- PDF signing service: DocuSign or Adobe Sign API
- Storage: S3 bucket for temporary PDFs (24h TTL)
- Queue: Celery + Redis (reuse existing infrastructure)
- Email: SendGrid (reuse existing)

**Security & Compliance:**
- PDF/A-3 format (archival standard)
- SHA-256 digital signature
- Watermark with user_id + timestamp (forensic)
- Encrypted download links (AES-256)
- Audit log immutable (append-only)
- GDPR: Export data includes user's own data only

**Performance:**
- Target: <3s for small reports (<1000 rows)
- Target: <5min for large reports (>10K rows)
- Queue priority: Pro users > Free users
- Caching: Pre-generate daily snapshots at 2am

## 🎯 Assumptions & Risks

### Assumptions
- Users want PDF specifically (not Excel/CSV) → Verify in beta
- PDF signing service costs <$0.10/export → Check pricing
- 40% adoption rate is realistic → Based on competitor data

### Risks
- PDF signing service downtime → Mitigation: Graceful fallback (unsigned PDF + warning)
- Audit log storage costs → Mitigation: Archive to cold storage after 1 year
- Users confused by async UX → Mitigation: Clear messaging + progress updates

### Out of Scope (for v1)
- Scheduled/recurring exports (Phase 2)
- Custom PDF templates (Phase 2)
- Export to Excel/CSV (Phase 2 if demand)
- Bulk export API (Phase 3 for institutional clients)

## 📊 Confidence Assessment

**Confidence Level:** 🟢 High (94%)

**Calculation Breakdown:**
- User Story completeness: 95% (clear role, goal, value)
- Acceptance Criteria testability: 95% (Given-When-Then, measurable)
- Assumptions surfaced: 90% (3 key assumptions documented)
- Stress-test passed: 95% (17/20 score, clear rationale)

**Formula:**
```
confidence = (0.95 * 0.30) + (0.95 * 0.30) + (0.90 * 0.20) + (0.95 * 0.20)
           = 0.285 + 0.285 + 0.18 + 0.19 = 0.94
```

**Blockers:** None
```

```
Agent: Spec ready! 

✅ User Story: Clear (pro traders, compliance value)
✅ Acceptance Criteria: 3 testable scenarios
✅ Success Metrics: Quantified targets
✅ Technical Notes: Complete (API, DB, dependencies)
✅ Confidence: 94% (High)

Ready to push to Jira? (Yes/No)
```

---

### Phase 4: Push to Jira

```
User: "Yes"

Agent: Pushing to Jira...

📝 Converting markdown to Jira Wiki Markup...
🔄 Updating PROJ-456 description...
✅ Description updated

💬 Adding comment...
✅ Comment added: "Spec refined by ba-refine skill on 2026-08-14"

🏷️  Adding label...
✅ Label added: "refined-by-agent"

📋 Creating push log...
✅ Push log: specs/refine/jira/PROJ-456/push-log.json

🔗 View updated task: https://your-domain.atlassian.net/browse/PROJ-456

---

## Next Steps

Your refined spec is now in Jira. Suggested next actions:

1. **Design tests:** `/qa-test-design PROJ-456`
   - Generate checklist + Gherkin scenarios from AC

2. **Write tech spec:** `/tech-spec PROJ-456`
   - Transform into API contract + data model

3. **Full pipeline:** `/e2e-delivery PROJ-456`
   - Run complete BA → DEV → QA workflow

Which would you like to do next?
```

---

## Key Takeaways from This Example

✅ **Phase 0:** Quick download, immediate assessment of clarity
✅ **Phase 1:** Interactive clarification via AskUserQuestion, 6 diverse variations with rationale
✅ **Phase 2:** Honest stress-test, surfaced hidden assumptions, clear recommendation
✅ **Phase 3:** Structured spec with all required sections, 94% confidence
✅ **Phase 4:** Clean push to Jira with audit trail

**What made this session good:**
- Not rushed (took time to clarify)
- Diverse variations (not 20 shallow ideas)
- Honest evaluation (pointed out flaws in Direction 2)
- Grounded (referenced support ticket data, competitor analysis)
- Actionable (clear next steps)

**Tone:**
- Direct, thoughtful
- Pushed user to think deeper ("is B overkill?")
- Not a yes-machine (called out over-engineering)
