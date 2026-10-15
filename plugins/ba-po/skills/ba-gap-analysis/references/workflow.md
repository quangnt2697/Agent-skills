# Quy trình Phân tích Khoảng cách (ba-gap-analysis Workflow)

## Quy trình thực hiện

### Bước 1: Đọc Input (Business-Spec hoặc Requirements)

**Input A: File `*-final.md`**
Đọc file Business-Spec từ kỹ năng `ba-spec`: `workspace/issues/{issueKey}/spec/final.md`. Trích xuất:
- Section 1: Summary → Feature name, Context
- Section 2: Current State/Background → AS-IS hints
- Section 4: Technical Context → Current tech stack
- Section 5: User Flow (TO-BE) → Target state
- Section 8: Business Rules → TO-BE behaviors

**Input B: Requirements từ user (text)**
User cung cấp mô tả AS-IS và TO-BE dạng text.

### Bước 2: Document AS-IS (Current State)

1. **Process/Workflow:** Mô tả chi tiết quy trình hiện tại (Actors, Steps, Tools, Data flow, Timing).
2. **Pain Points:** Liệt kê cụ thể những điểm đau (Chậm, Lỗi nhập liệu, Không scalable).
3. **Limitations:** Các hạn chế kỹ thuật/nghiệp vụ.
4. **Current Metrics:** Bắt buộc phải có baseline metrics để so sánh (Avg time, Error rate, Cost).

### Bước 3: Define TO-BE (Target State)

1. **Target Process/Workflow:** Mô tả quy trình mục tiêu sau khi có feature mới.
2. **Expected Benefits:** Tiết kiệm thời gian, giảm lỗi, tăng doanh thu.
3. **Success Criteria:** Tiêu chí thành công phải **measurable** và **time-bound**.

### Bước 4: Identify Gaps (Phát hiện khoảng cách)

Với mỗi aspect (Process, Features, Data, Infrastructure, Skills), identify gaps. Mỗi gap cần có:
- Name & Description (AS-IS vs TO-BE)
- Impact (Effort, Cost, Risk)
- Dependencies
- Priority (Critical, Important, Nice-to-have)

### Bước 5: Prioritize & Roadmap

1. **Gap Prioritization Matrix:** Dùng Value vs Effort matrix.
2. **Phased Roadmap:** Lộ trình triển khai (Phase 0, Phase 1, Phase 2...).
3. **Risk Mitigation:** Xác định rủi ro và cách phòng ngừa.

## Đầu ra (Output)

### Format: Gap Analysis Document

Tạo file markdown với cấu trúc:
- Executive Summary
- 1. AS-IS (Current State)
- 2. TO-BE (Target State)
- 3. Gap Analysis
- 4. Prioritization & Roadmap
- 5. Action Items
- 6. Appendix (Assumptions, Open Questions)

**Lưu vào:** `workspace/issues/{issueKey}/spec/gap-analysis.md`

Trước khi ghi file, BẮT BUỘC neo về root repo và tạo thư mục đích:
```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p workspace/issues/{issueKey}/spec
```

## Các Dấu hiệu Cảnh báo (Red Flags)

❌ **AS-IS không có metrics:** Không thể so sánh → Phải có baseline metrics.
❌ **TO-BE không có success criteria measurable:** "Nhanh hơn" → Phải có số liệu cụ thể.
❌ **Gaps không có effort/cost estimate:** Leadership không approve budget.
❌ **Roadmap không có dependencies:** Làm App trước khi có API → Fail.
❌ **Không có risk mitigation:** "Hy vọng mọi thứ OK" → Fail.

## Anti-patterns (Tránh)
1. **Analysis paralysis:** Phân tích quá chi tiết, không bao giờ bắt đầu.
2. **Ignore AS-IS:** Nhảy thẳng vào TO-BE mà không hiểu AS-IS.
3. **Overpromise TO-BE:** "Sẽ tăng revenue 10x" không có data support.
4. **Không involve stakeholders:** BA tự phân tích mà không validate.

## Verification Checklist
- [ ] AS-IS documented với process + pain points + limitations + metrics
- [ ] TO-BE defined với target process + benefits + success criteria
- [ ] Mỗi gap có đầy đủ thông tin (Impact, Effort, Cost, Risk, Priority)
- [ ] Gaps được prioritized và roadmap có timeline rõ ràng
- [ ] Output file đã lưu đúng đường dẫn
- [ ] Stakeholders đã review

---
