## Template Tech-Spec

```markdown
# Tech-Spec: [{issueKey}] {Feature Name}

**Author:** {Developer Name}
**Created:** {Date}
**Status:** Draft / In Review / Approved
**Related Business-Spec:** [Link to *-final.md]

---

## 1. Overview

{1-2 đoạn mô tả tính năng từ góc nhìn kỹ thuật}

---

## 2. Architecture Decision

### 2.1. Technology Stack
{Liệt kê tech stack}

### 2.2. System Architecture
{High-level diagram}

### 2.3. Design Patterns
{Patterns sử dụng}

---

## 3. API Contract

### 3.1. Endpoints
{Chi tiết từng endpoint}

### 3.2. Error Codes
{Dictionary error codes}

---

## 4. Data Model

### 4.1. Database Schema
{SQL DDL}

### 4.2. Entity Relationships
{ERD}

### 4.3. State Machine
{Diagram + transitions}

---

## 5. Business Logic

### 5.1. Main Flow
{Flowchart + pseudo code}

### 5.2. Validation Rules
{Chi tiết từng rule}

---

## 6. Error Handling & Edge Cases

### 6.1. Retry Logic
{Strategy}

### 6.2. Circuit Breaker
{Configuration}

### 6.3. Idempotency
{Implementation}

### 6.4. Edge Cases
{Liệt kê + solution}

---

## 7. Testing Strategy

### 7.1. Unit Tests
{Coverage target, priority areas}

### 7.2. Integration Tests
{Test scenarios}

### 7.3. Load Tests
{Performance targets}

---

## 8. Non-Functional Requirements

### 8.1. Performance
- Response time: <200ms (p95)
- Throughput: 1000 req/s

### 8.2. Security
- Authentication: JWT
- Authorization: Role-based
- Encryption: TLS 1.3

### 8.3. Availability
- Uptime: 99.9%
- RTO: 4 hours
- RPO: 1 hour

### 8.4. Scalability
- Horizontal scaling: Auto-scale 2-10 pods
- Database: Read replicas

---

## 9. Dependencies

### 9.1. External Services
- Exchange API
- Payment Gateway
- Notification Service

### 9.2. Internal Services
- Auth Service
- Account Service

---

## 10. Deployment Plan

### 10.1. Database Migration
{SQL migration scripts}

### 10.2. Feature Flags
{Rollout strategy}

### 10.3. Rollback Plan
{Steps to rollback}

---

## 11. Monitoring & Logging

### 11.1. Metrics
- Order creation rate
- Order success/failure rate
- API latency

### 11.2. Logs
- Request/Response logs
- Error logs with stack trace

### 11.3. Alerts
- Error rate > 5%
- Latency p99 > 1s
- Service down

---

## 12. Open Questions

- [ ] {Question 1}
- [ ] {Question 2}

---

## 13. Approval

- [ ] Reviewed by Tech Lead
- [ ] Reviewed by Architect
- [ ] Approved by Engineering Manager
```

