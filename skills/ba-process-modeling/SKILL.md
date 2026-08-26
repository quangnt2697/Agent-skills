---
name: ba-process-modeling
description: Kỹ năng bổ trợ (Sub-process) được gọi bởi ba-refine hoặc ba-spec. Có thể hoạt động độc lập nếu user yêu cầu. Vẽ Business Process diagram (BPMN, flowchart, swim lane) để visualize quy trình nghiệp vụ. Identify actors, activities, decision points, start/end states. Generate Mermaid diagram hoặc BPMN XML. Sử dụng khi cần visualize complex process, khi user yêu cầu "vẽ quy trình", "process diagram", hoặc khi stakeholders cần shared understanding về workflow.
---

# Skill: ba-process-modeling

## Tổng quan

Process Modeling là kỹ thuật visualize business process thành diagram để:
- **Shared Understanding** — Tất cả stakeholders nhìn thấy same picture
- **Identify Bottlenecks** — Tìm steps chậm, redundant, manual
- **Document AS-IS** — Current state trước khi redesign
- **Design TO-BE** — Target state sau khi improve
- **Communication Tool** — Dễ explain process hơn text wall

Skill này support 3 loại diagram:

### 1. Flowchart (Simple)
- Linear process với decisions (Yes/No branches)
- Dùng cho: Simple workflows, quick visualization
- Tool: Mermaid `flowchart` syntax

### 2. Swim Lane Diagram (Multi-Actor)
- Process với nhiều actors (Customer, Broker, System)
- Dùng cho: Cross-functional workflows, handoff visualization
- Tool: Mermaid `flowchart` với subgraphs

### 3. BPMN (Business Process Model and Notation)
- Standard notation với events, gateways, tasks
- Dùng cho: Formal process documentation, complex workflows
- Tool: Mermaid `flowchart` (BPMN-style) hoặc BPMN XML

## Khi nào sử dụng

Kích hoạt skill này khi:

- Process phức tạp (> 5 steps, nhiều actors, nhiều decision points)
- User yêu cầu: "vẽ quy trình", "process diagram", "flowchart", "BPMN"
- Stakeholders không hiểu rõ process (cần visual để align)
- Cần document AS-IS trước khi optimize (gap analysis input)
- Compliance audit yêu cầu process documentation

**Khi KHÔNG nên sử dụng:**

- Process quá đơn giản (2-3 steps, linear, không có decision)
- Chưa có thông tin đủ về process (chạy `ba-stakeholder-interview` trước)
- User chỉ cần text description (không cần visual)
- Process thay đổi liên tục (diagram sẽ outdated nhanh)

## Quy trình thực hiện

### Bước 1: Đọc Input (Process Description)

**Input A: Business-Spec Section 5 (User Flow)**
```bash
/project-root/workspace/{issueKey}/spec/final.md
```

Trích xuất:
- Section 5: User Flow (AS-IS hoặc TO-BE)
- Actors (ai làm gì?)
- Steps (sequence)
- Decision points (if/else)

**Input B: Gap Analysis (AS-IS process)**
```bash
/project-root/workspace/{issueKey}/spec/gap-analysis.md
```

Trích xuất:
- AS-IS process description
- Pain points (để highlight trên diagram)

**Input C: Text từ user**

User mô tả process:
```
"Khách hàng gọi điện cho broker.
Broker ghi lệnh vào sổ tay.
Broker nhập vào hệ thống HO.
HO kiểm tra margin.
Nếu đủ margin → gửi lệnh lên sàn.
Nếu không đủ → reject và gọi lại khách hàng."
```

### Bước 2: Identify Components

**2.1. Actors (WHO)**

Liệt kê tất cả actors tham gia process:

```markdown
### Actors Identified

| Actor         | Role                         | Type            |
|---------------|------------------------------|-----------------|
| Khách hàng    | End user, trigger process    | Human           |
| Broker        | Process orders, manual entry | Human           |
| Hệ thống HO   | Back-office system, validate | System          |
| Sàn (HNX/HSX) | Exchange, match orders       | External System |
```

**2.2. Activities (WHAT)**

Liệt kê tất cả activities (tasks, actions):

```markdown
### Activities Identified

| # | Activity                        | Actor       | Type      | Duration   |
|---|---------------------------------|-------------|-----------|------------|
| 1 | Gọi điện cho broker             | Khách hàng  | Manual    | 2 phút     |
| 2 | Ghi lệnh vào sổ tay             | Broker      | Manual    | 30 giây    |
| 3 | Nhập lệnh vào HO                | Broker      | Manual    | 3-5 phút   |
| 4 | Kiểm tra margin                 | Hệ thống HO | Automated | 1 giây     |
| 5 | Gửi lệnh lên sàn                | Hệ thống HO | Automated | 2 giây     |
| 6 | Gọi lại khách hàng (nếu reject) | Broker      | Manual    | 2 phút     |
```

**2.3. Decision Points (IF/ELSE)**

Identify branches trong process:

```markdown
### Decision Points

| #   | Decision       | Condition                            | True Path                  | False Path                     |
|-----|----------------|--------------------------------------|----------------------------|--------------------------------|
| D1  | Đủ margin?     | account_balance >= order_value * 1.5 | → Activity 5 (gửi lên sàn) | → Activity 6 (reject, gọi lại) |
| D2  | Thị trường mở? | time in [9:00-11:30, 13:00-14:30]    | → Continue                 | → Reject "Ngoài giờ giao dịch" |
```

**2.4. Start/End Events**

```markdown
### Start/End Events

| Type          | Event                    | Trigger                      |
|---------------|--------------------------|------------------------------|
| Start         | Khách hàng muốn đặt lệnh | Phone call to broker         |
| End (Success) | Lệnh lên sàn             | HO sends FIX message         |
| End (Failure) | Lệnh bị reject           | Margin không đủ OR Ngoài giờ |
```

### Bước 3: Choose Diagram Type

Dựa trên complexity, chọn diagram type:

**Decision Matrix:**

| Scenario                 | Actors   | Decision Points   | Recommended Type   |
|--------------------------|----------|-------------------|--------------------|
| Simple linear process    | 1-2      | 0-1               | Flowchart          |
| Multi-actor với handoffs | 3+       | Any               | Swim Lane          |
| Formal documentation     | Any      | Any               | BPMN               |

**Example:**
- Process "Đặt lệnh" có 4 actors (Khách hàng, Broker, HO, Sàn) + 2 decision points
- → **Swim Lane Diagram** (best fit)

### Bước 4: Create Diagram (Mermaid Syntax)

> **⚠️ TUÂN THỦ RULE 7 (AGENTS.md):** Tất cả sơ đồ Mermaid phải:
> - Dùng `flowchart LR` (KHÔNG dùng TD)
> - Bắt đầu bằng Bước 1 trực tiếp (KHÔNG có node "Start")
> - KHÔNG hardcode `style fill:#...` — render bằng `--bg '#ffffff' --fg '#000000'`
> - Mũi tên quay lại (`-.->`) khai báo **ở cuối file** mã nguồn

#### Option 1: Flowchart (Simple)

```mermaid
flowchart LR
    A["Bước 1: KH gọi điện cho broker"]
    B["Bước 2: Broker ghi lệnh vào sổ tay"]
    C["Bước 3: Broker nhập vào HO"]
    D{"Đủ margin?"}
    E["Bước 4: HO gửi lệnh lên sàn"]
    F["Bước 4b: Broker gọi lại KH - Reject"]

    A --> B
    B --> C
    C --> D
    D -->|Yes| E
    D -->|No| F
```

**Pros:** Đơn giản, dễ hiểu  
**Cons:** Không thấy rõ actor nào làm gì

---

#### Option 2: Swim Lane Diagram (Multi-Actor)

```mermaid
flowchart LR
    subgraph KH["🧑 Khách hàng"]
        A1["Bước 1: Gọi điện cho broker"]
        F1["Nhận reject call"]
    end
    
    subgraph Broker["👨‍💼 Broker"]
        B1["Bước 2: Nghe điện thoại"]
        B2["Bước 3: Ghi lệnh vào sổ tay"]
        B3["Bước 4: Nhập vào HO"]
        B4["Gọi lại KH - Reject"]
    end
    
    subgraph HO["🖥️ Hệ thống HO"]
        C1["Bước 5: Nhận lệnh từ broker"]
        C2{"Kiểm tra margin"}
        C3["Bước 6: Gửi FIX message lên sàn"]
        C4["Log reject reason"]
    end
    
    subgraph San["🏛️ Sàn HNX/HSX"]
        D1["Bước 7: Nhận lệnh qua FIX"]
        D2["Bước 8: Match order"]
        D3["Lệnh lên sàn"]
        D4["Lệnh reject"]
    end
    
    A1 -.->|Phone call| B1
    B1 --> B2
    B2 --> B3
    B3 -.->|Manual input| C1
    C1 --> C2
    C2 -->|Yes| C3
    C2 -->|No| C4
    C3 -.->|FIX protocol| D1
    D1 --> D2
    D2 --> D3
    C4 -.-> B4
    B4 -.->|Phone call| F1
    F1 --> D4
```

**Pros:** Thấy rõ actor nào làm gì, handoffs giữa actors  
**Cons:** Phức tạp hơn flowchart

**Legend:**
- `-->` Solid arrow: Luồng tuần tự (cùng actor)
- `-.->` Dotted arrow: Handoff sang actor khác (giao tiếp)
- `{}` Diamond: Điểm quyết định
- `[]` Rectangle: Task/Activity
- `subgraph` Box: Swim lane (actor/role)

---

#### Option 3: BPMN-style (Formal)

```mermaid
flowchart LR
    T1["Bước 1: Gọi broker"]
    T2["Bước 2: Ghi sổ tay"]
    T3["Bước 3: Nhập HO"]
    G1{"Gateway: Đủ margin?"}
    T4["Bước 4a: Gửi FIX"]
    T5["Bước 5: Match order"]
    T6["Bước 4b: Reject + Call"]

    T1 --> T2
    T2 --> T3
    T3 --> G1
    G1 -->|Yes| T4
    T4 --> T5
    G1 -->|No| T6
```

**BPMN Elements:**
- **Task** (rectangle): Activity (manual hoặc automated)
- **Gateway** (diamond): Điểm quyết định (XOR, AND, OR)
- **Sequence Flow** (arrow): Thứ tự thực hiện

**Pros:** Ký hiệu chuẩn, chính thức, phù hợp compliance  
**Cons:** Learning curve cao hơn

### Bước 5: Annotate Pain Points (Optional)

Nếu đây là AS-IS diagram, dùng emoji/text để ghi chú pain points trực tiếp trong nhãn node:

```mermaid
flowchart LR
    subgraph KH["🧑 Khách hàng"]
        A1["Bước 1: Gọi điện — ⏱️ Chờ 2 phút"]
    end

    subgraph Broker["👨‍💼 Broker"]
        B1["Bước 2: Nghe điện thoại"]
        B2["Bước 3: Ghi sổ tay — ⚠️ Lỗi 2-3%"]
        B3["Bước 4: Nhập HO — 🐢 3-5 phút — ⚠️ Bottleneck"]
    end

    subgraph HO["🖥️ Hệ thống HO"]
        C1["Bước 5: Nhận lệnh"]
        C2{"Kiểm tra margin"}
        C3["Bước 6: Gửi FIX — ⏱️ Total: 10-15 phút"]
    end

    A1 -.-> B1
    B1 --> B2
    B2 --> B3
    B3 -.-> C1
    C1 --> C2
    C2 -->|Yes| C3
```

**Pain Point Legend:**
- 🐢 = Slow (bottleneck)
- ⚠️ = High error rate
- ⏱️ = Time metric

### Bước 6: Create TO-BE Diagram (Improved)

Vẽ TO-BE diagram với improvements (dùng emoji trong nhãn để highlight):

```mermaid
flowchart LR
    subgraph KH["📱 Khách hàng (Mobile App)"]
        A1["Bước 1: Nhập mã CK + SL + Giá — ✅ 1 màn hình — ⏱️ 10 giây"]
        A2["Bước 2: Xác nhận — ⏱️ 5 giây"]
        A3["Nhận notification real-time"]
    end

    subgraph OMS["☁️ OMS (Cloud)"]
        C1["Bước 3: Validate real-time — ✅ < 1 giây"]
        C2{"Kiểm tra margin"}
        C3["Bước 4: Gửi FIX — ✅ Automated"]
    end

    subgraph San["🏛️ Sàn HNX/HSX"]
        D1["Bước 5: Match order — ⏱️ Total < 30 giây — 🎯 Giảm 95%"]
    end

    A1 --> A2
    A2 -.->|HTTPS API| C1
    C1 --> C2
    C2 -->|Yes| C3
    C2 -.->|No| A3
    C3 -.->|FIX| D1
    D1 -.->|WebSocket| A3
```

**Improvements Highlighted:**
- ✅ = Improvement (ghi trực tiếp trong nhãn node)
- ☁️ Cloud = New technology
- 📱 Mobile = New channel
- ⏱️ Time savings = KPI achieved

### Bước 7: Compare AS-IS vs TO-BE (Side-by-side)

```markdown
## AS-IS vs TO-BE Comparison

| Aspect              | AS-IS                   | TO-BE                         | Improvement               |
|---------------------|-------------------------|-------------------------------|---------------------------|
| **Total Time**      | 10-15 phút              | < 30 giây                     | 🎯 Giảm 95%               |
| **Manual Steps**    | 6 steps (Broker manual) | 0 steps (Automated)           | ✅ Full automation        |
| **Error Rate**      | 2-3% (nhập sai)         | < 0.5% (validation real-time) | 🎯 Giảm 80% lỗi           |
| **Actors Involved** | 3 (KH, Broker, HO)      | 2 (KH, OMS)                   | Loại bỏ Broker bottleneck |
| **Technology**      | Phone + Desktop         | Mobile App + Cloud            | ✅ Modern stack           |
| **Transparency**    | Không (phải gọi hỏi)    | Real-time notification        | ✅ User visibility        |

### Diagram Links

- [AS-IS Process](./as-is-process.md) — Current state với pain points
- [TO-BE Process](./to-be-process.md) — Target state với improvements
```

## Đầu ra (Output)

### Format: Process Modeling Document

```markdown
# Process Model: [Process Name]

**Project:** {project-name}  
**Issue Key:** {issueKey}  
**Process:** {process-name} (VD: Đặt lệnh cổ phiếu)  
**Version:** AS-IS (Current) hoặc TO-BE (Target)  
**Author:** BA/PO Agent  
**Date:** 2026-08-13

---

## Executive Summary

**Process Overview:**
- **Trigger:** Khách hàng muốn đặt lệnh mua/bán cổ phiếu
- **Actors:** 4 (Khách hàng, Broker, Hệ thống HO, Sàn)
- **Total Steps:** 8 activities + 2 decision points
- **Total Time:** 10-15 phút (AS-IS) → < 30 giây (TO-BE)
- **Pain Points:** 3 (Chờ lâu, Lỗi nhập liệu, Không transparent)

---

## Actors

[... table với 4 actors ...]

---

## Activities

[... table với 8 activities, duration, type ...]

---

## Decision Points

[... table với 2 decision points, conditions, branches ...]

---

## Process Diagram

### AS-IS (Current State)

```mermaid
[... Swim Lane diagram với pain points highlighted ...]
```

**Pain Points Identified:**
1. **Bottleneck:** Broker nhập HO (5 steps, 3-5 phút) — Chậm, manual
2. **Error-prone:** Ghi sổ tay (2-3% lỗi) — Nghe nhầm qua điện thoại
3. **No visibility:** Khách hàng không biết trạng thái — Phải gọi hỏi

**Metrics:**
- Total time: 10-15 phút
- Error rate: 2-3%
- Customer satisfaction: 3.2/5.0

---

### TO-BE (Target State)

```mermaid
[... Swim Lane diagram với improvements highlighted ...]
```

**Improvements:**
1. ✅ **Self-service:** Khách hàng tự đặt qua app — Loại bỏ Broker bottleneck
2. ✅ **Real-time validation:** OMS validate < 1 giây — Giảm lỗi xuống < 0.5%
3. ✅ **Transparency:** WebSocket notification — Khách hàng thấy trạng thái real-time

**Target Metrics:**
- Total time: < 30 giây (giảm 95%)
- Error rate: < 0.5% (giảm 80%)
- Customer satisfaction: ≥ 4.2/5.0

---

## AS-IS vs TO-BE Comparison

[... comparison table ...]

---

## Next Steps

1. **Gap Analysis:** Identify gaps để đi từ AS-IS → TO-BE (xem `/project-root/workspace/{issueKey}/spec/`)
2. **Prioritization:** Ưu tiên gaps theo business value (xem `/project-root/workspace/{issueKey}/spec/`)
3. **Implementation:** Breakdown TO-BE process thành User Stories (xem `/project-root/workspace/{issueKey}/spec/`)

---

## Appendix

### Appendix A: Mermaid Source Code

```mermaid
[... full source code để edit/regenerate ...]
```

### Appendix B: BPMN XML (if applicable)

```xml
[... BPMN 2.0 XML export ...]
```

### Appendix C: Process Metadata

| Metadata     | Value                              |
|--------------|------------------------------------|
| Process Type | Order-to-Cash                      |
| Domain       | Securities Trading                 |
| Frequency    | ~1,000 orders/day                  |
| Compliance   | HOSE Rule 15, SBV Circular 01/2021 |
| Last Updated | 2026-08-13                         |
```

**Lưu vào:**
- AS-IS: `/project-root/workspace/{issueKey}/spec/process-as-is.md`
- TO-BE: `/project-root/workspace/{issueKey}/spec/process-to-be.md`

Trước khi ghi file, BẮT BUỘC neo về root repo và tạo thư mục đích — `Write` không tự tạo
thư mục cha, và cwd của agent có thể đang lệch (xem `.claude/rules/workspace-paths.md`):

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p /project-root/workspace/{issueKey}/spec
```

**Quan trọng**: Sau khi sinh ra code Mermaid, BẮT BUỘC gọi lệnh `/flowchart` (đối với Claude) hoặc chạy trực tiếp script:
```bash
node skills/ba-design-flowchart/scripts/render.mjs --input <file_mmd_tạm> --output <file_png_kết_quả> --format png --bg '#ffffff' --fg '#000000'
```
Nếu script báo lỗi cú pháp, tự động đọc lỗi và sửa lại mã Mermaid cho đến khi thành công.

> **⚠️ LƯU Ý:** Luôn render bằng `--bg '#ffffff' --fg '#000000'` (nền trắng, chữ đen) theo Rule 7 trong `AGENTS.md`. KHÔNG dùng theme có màu phức tạp cho sơ đồ nghiệp vụ.

## Tương tác với các Skills khác

- **Upstream (Before):**
  - `ba-stakeholder-interview` → Collect process details từ stakeholders
  - `ba-spec` → Đọc Section 5 (User Flow) → Input cho skill này
  - `ba-gap-analysis` → Đọc AS-IS process → Visualize bằng skill này

- **Downstream (After):**
  - `ba-gap-analysis` → Dùng AS-IS diagram để identify bottlenecks
  - `ba-user-story-writing` → Transform TO-BE process thành User Stories
  - `dev-spec-driven-development` → DEV đọc TO-BE diagram để hiểu target architecture

## Các Dấu hiệu Cảnh báo (Red Flags)

❌ **Diagram quá phức tạp (> 20 nodes):**
- Không ai đọc được → Mất mục đích communicate
- → Chia nhỏ thành sub-processes

❌ **Không có actors rõ ràng (swim lanes):**
- Không biết ai làm gì → Confusing
- → Dùng Swim Lane thay vì Flowchart đơn giản

❌ **Pain points không highlighted trên AS-IS:**
- Không thấy được improvements trong TO-BE
- → Annotate pain points với colors/icons

❌ **TO-BE không có metrics:**
- "Nhanh hơn", "Tốt hơn" → Không measurable
- → Phải có số liệu: "< 30 giây", "< 0.5% error"

❌ **Diagram không match với text description:**
- Diagram nói 5 steps, text nói 8 steps → Inconsistent
- → Sync diagram và text

## Anti-patterns (Tránh)

1. **Vẽ diagram không có context:**
   - Chỉ có diagram, không có text explanation → Không hiểu purpose
   - → Phải có Executive Summary, Pain Points, Metrics

2. **Copy diagram từ template mà không customize:**
   - Generic BPMN template → Không reflect real process
   - → Phải interview stakeholders để lấy actual process

3. **Ignore decision points:**
   - Linear flow mà thực tế có branches → Incomplete
   - → Phải identify tất cả IF/ELSE logic

4. **Không validate với stakeholders:**
   - Vẽ xong → Không review → Diagram sai
   - → Validation session với stakeholders

## Verification Checklist

Sau khi chạy skill này:

- [ ] Đã identify tất cả actors (≥ 2 actors cho multi-actor process)
- [ ] Đã identify tất cả activities (tasks) với duration estimates
- [ ] Đã identify tất cả decision points (branches)
- [ ] Diagram type phù hợp (Flowchart/Swim Lane/BPMN)
- [ ] AS-IS diagram có pain points highlighted
- [ ] Actors được list rõ ràng
- [ ] Activities có duration/owner
- [ ] Diagram không quá 20 nodes (nếu > 20 → chia nhỏ)
- [ ] Mermaid syntax valid (đã chạy qua lệnh `/flowchart` hoặc script render mà không có lỗi)
- [ ] Đã lưu file thành công: `/project-root/workspace/{issueKey}/spec/process-{as-is|to-be}.md`
- [ ] Stakeholders đã review và approve diagrams

## Ví dụ

Xem file `skills/ba-process-modeling/examples.md` để thấy:
- Swim Lane diagram với 4 actors (Customer, Broker, System, Exchange)
- BPMN diagram với gateways (XOR, AND)
- AS-IS vs TO-BE side-by-side comparison
- Pain point annotation techniques (colors, icons, metrics)
