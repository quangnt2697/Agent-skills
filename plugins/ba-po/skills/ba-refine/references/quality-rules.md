## Công thức Tin cậy (Confidence Formula)

```
confidence = (user_story_completeness * 0.30) + 
             (ac_testability * 0.30) + 
             (assumptions_surfaced * 0.20) + 
             (stress_test_score * 0.20)
```

**Thang đo từng thành phần (0.0 - 1.0):**

- **user_story_completeness:**
  - 1.0: Có đầy đủ Role cụ thể + Goal + Value, không chung chung
  - 0.8: Thiếu 1 trong 3 hoặc Role hơi chung chung
  - 0.5: Role quá chung chung ("người dùng") hoặc thiếu 2/3
  - 0.0: Không có User Story hoặc hoàn toàn mơ hồ

- **ac_testability:**
  - 1.0: Tất cả AC đều có dạng Given-When-Then, testable, measurable
  - 0.8: Hầu hết AC testable, vài chỗ hơi mơ hồ
  - 0.5: Một nửa AC mơ hồ hoặc không testable
  - 0.0: Không có AC hoặc hoàn toàn không testable

- **assumptions_surfaced:**
  - 1.0: Đã gọi tên rõ ≥3 giả định quan trọng + risks + out-of-scope
  - 0.8: Có 2 giả định + risks
  - 0.5: Chỉ có 1 giả định hoặc không có risks
  - 0.0: Không surface giả định nào

- **stress_test_score:**
  - 1.0: Đã stress-test với ≥3 tiêu chí (User Value, Feasibility, Differentiation, Risk)
  - 0.8: Stress-test 2 tiêu chí
  - 0.5: Stress-test 1 tiêu chí
  - 0.0: Không stress-test

**Ngưỡng Chất lượng:**
- **≥90% (0.90):** 🟢 Cao — Sẵn sàng handoff
- **80-89% (0.80-0.89):** 🟡 Trung bình — Cần cải thiện nhỏ
- **70-79% (0.70-0.79):** 🟠 Thấp — Cần làm rõ thêm
- **<70% (<0.70):** 🔴 Rất thấp — Chưa đủ để handoff

---

## Quy tắc Chất lượng

### 1. Luôn Sử dụng AskUserQuestion

**KHI NÀO:** Mỗi khi confidence < 90% về bất kỳ thành phần nào

**KHÔNG BAO GIỜ:** Guess hoặc assume thông tin quan trọng

Ví dụ sai:
```
❌ "Tôi giả sử users muốn PDF format"
❌ "Có lẽ compliance không phải vấn đề"
```

Ví dụ đúng:
```
✅ [AskUserQuestion triggered]
Q: "Export format: PDF, Excel, CSV, hay multiple formats?"
```

---

### 2. Từ chối Spec Quá Mơ hồ

Nếu sau 2-3 vòng AskUserQuestion mà vẫn < 80% confidence, NÓI THẲNG:

```
"Tôi đã hỏi nhiều câu nhưng vẫn chưa đủ thông tin để tạo spec chất lượng cao.
Các thông tin còn thiếu:
- [Gap 1]
- [Gap 2]

Bạn có thể cung cấp thêm không, hoặc tôi nên draft một spec ở mức confidence thấp hơn?"
```

**KHÔNG BAO GIỜ** im lặng chấp nhận spec yếu.

---

### 3. Grounded trong Codebase (nếu có)

Khi đang trong một codebase, **BẮT BUỘC** phải:

1. **Scan architecture trước khi suggest solution**
   ```bash
   # Tìm patterns hiện tại
   grep -r "export" --include="*.ts" --include="*.js"
   
   # Tìm API endpoints tương tự
   find . -name "*controller.ts" -o -name "*routes.ts"
   ```

2. **Cite cụ thể các file và patterns**
   ```
   ✅ "Dựa trên src/api/reports/controller.ts:45, hệ thống đã có 
   ReportExportService. Ta có thể mở rộng service này thay vì tạo mới."
   
   ❌ "Ta có thể tạo một export service"
   ```

3. **Respect existing constraints**
   ```
   ✅ "Codebase dùng Bull queue cho async jobs (xem src/queue/), 
   nên ta dùng pattern này cho large exports."
   
   ❌ "Ta có thể dùng Celery" (khi codebase không có Python)
   ```

---

### 4. Tone: Trung thực, Không Vuốt đuôi

**Khi stress-test một ý tưởng yếu:**

Ví dụ đúng:
```
✅ "Direction B có điểm User Value thấp (⭐⭐). Lý do: Không rõ ai thực sự 
cần feature này. 87 support tickets chủ yếu về compliance (Direction C), 
không phải về multi-format export. 

Nếu chọn B, rủi ro là build xong không ai dùng."
```

Ví dụ sai:
```
❌ "Direction B cũng OK, có thể serve power users."
```

**Chỉ ra over-engineering:**

```
✅ "Direction E (Report Library) là platform play lớn, nhưng scope quá rộng 
(2 tháng). Với 87 tickets cần giải quyết ngay, Quick Win (Direction A) hoặc 
Compliance-First (Direction C) sẽ deliver value nhanh hơn."
```

---

### 5. Fintech & Securities Domain Specific Checks

Với mọi feature liên quan tiền, tài khoản hoặc giao dịch chứng khoán, **BẮT BUỘC** đối chiếu [securities-domain-rules.md](../../../../references/securities-domain-rules.md) và kiểm tra:

#### Checklist Fintech Chung:
- [ ] Có rủi ro mất tiền không? (Fraud, double-charging, errors)
- [ ] Có rủi ro lộ lọt dữ liệu không? (PII, financial data)
- [ ] ACID compliance? (Transaction consistency)
- [ ] Audit trail? (Compliance requirements)
- [ ] Performance at scale? (Latency, throughput)

#### Checklist Nghiệp vụ Chứng khoán (Bắt buộc nếu đụng tới Lệnh / Giá / Margin):
- [ ] **Mô hình Quản trị Tài khoản:** Phân định rõ Deal-based `(accountNo, symbol, loanPackageId)` vs Portfolio-based (1 tài khoản đơn nhất, không dùng tiểu khoản .1/.6).
- [ ] **Phân loại Lệnh & Hiệu lực:** Khai báo chính xác `orderCategory` (`NORMAL`, `STOP`, `TRAILING_STOP`, `TRADING_EVENT`, `OCO`) và `Time-In-Force` (`DAY`, `GTD`, `GTC`).
- [ ] **Quy chuẩn Sửa/Hủy Lệnh:** Chỉ cho phép sửa lệnh LO trong phiên liên tục với điều kiện $newQuantity > filledQuantity$. Cấm sửa/hủy trong ATO/ATC và thời gian Random End.
- [ ] **Quy chuẩn Random End (RE):** Điều kiện nhận diện mã RE (`expected_price != 0` ATO; `expected_price != 0 & expected_quantity != 0` ATC), thời gian trễ tối đa 2 phút sau 09:15 / 14:45, chặn lệnh MTL/MP, hiển thị icon RE + tooltip theo thứ tự ưu tiên (`Warning > RE > Event > Tag > Bóng đèn`).
- [ ] **Mã lỗi ORS & Fallback 24/7:** Bao phủ 15 mã lỗi ORS chuẩn, quy định rõ cơ chế tự động Fallback sang Lệnh 24/7 khi ngoài phiên/mã Halt (`EI8`), và tự động hủy lệnh điều kiện khi có sự kiện chia cổ tức (`CANCELLED_BY_RIGHTS_EVENT`).

Nếu user không mention, **PHẢI HỎI RÕ:**

```
[AskUserQuestion triggered]
Q: "Feature này có chạm vào dữ liệu giao dịch hoặc tài chính chứng khoán không?"
Options:
- Có, liên quan đến đặt/sửa/hủy lệnh hoặc bảng giá/chuyển phiên
- Có, liên quan đến quản lý Deal/Margin hoặc sao kê số dư
- Không, chỉ là giao diện hoặc báo cáo tĩnh
```

---

## Ví dụ Output Chất lượng Cao

Xem `plugins/ba-po/skills/ba-refine/examples.md` để có ví dụ đầy đủ về một phiên refine tốt.

**Đặc điểm của session tốt:**
- Không vội vàng (dành thời gian làm rõ)
- Đa dạng variations (không phải 20 ý tưởng nông cạn)
- Đánh giá trung thực (chỉ ra điểm yếu trong Direction 2)
- Có căn cứ (reference support ticket data, competitor analysis)
- Khả thi (các bước tiếp theo rõ ràng)

---

## Checklist Trước khi Push to Jira

Trước khi gọi `jira-push-spec.sh`, verify:

- [ ] **User Story:** Có đầy đủ Role + Goal + Value, KHÔNG chung chung
- [ ] **Acceptance Criteria:** ≥2 scenarios, dạng Given-When-Then, testable (bao gồm Happy Case, Edge Case, Validation Case)
- [ ] **Success Metrics:** Có baseline + target + measurement method
- [ ] **Assumptions:** Đã surface ≥3 giả định + risks
- [ ] **Confidence:** ≥90%
- [ ] **Tone:** Đã review, không có weasel words ("có lẽ", "có thể", "chắc")
- [ ] **Sạch template:** 2 lệnh `grep` ở Giai đoạn 4 Bước 1 không in ra gì
- [ ] **Bảng đúng cú pháp:** `DRY_RUN=1` báo đúng số bảng mong đợi
- [ ] **Domain Chứng khoán:** Nếu là bài toán chứng khoán, đã đối chiếu và tuân thủ [securities-domain-rules.md](../../../../references/securities-domain-rules.md) (Deal-based, loại lệnh, quy chuẩn sửa/hủy, Random End, mã lỗi ORS)

Nếu thiếu bất kỳ điều nào, QUAY LẠI Giai đoạn 1-3 để fix.

---

## Integration với Skills Khác

### Sau ba-refine, User có thể:

1. **Thiết kế tests:**
   ```
   /qa-test-design {issueKey}
   ```
   → Generate checklist + Gherkin từ refined AC

2. **Viết tech spec:**
   ```
   /tech-spec {issueKey}
   ```
   → Transform thành API contract + data model

3. **Full pipeline:**
   ```
   /e2e-delivery {issueKey}
   ```
   → Chạy toàn bộ BA → DEV → QA workflow

---

## Xem thêm

- [Cẩm nang Nghiệp vụ Chứng khoán & Fintech (Domain Knowledge Base)](../../../../references/securities-domain-rules.md)
- [Quy trình Quản lý Tài liệu Atlassian](../../../../../docs/architecture/atlassian-mcp-strategy.md)
- [Ví dụ Refine Chất lượng Cao](../examples.md)
- [Jira Description Template](../templates/jira-description-template.md)

---

## Anti-Patterns (Tránh xa)

❌ **Over-generation:** Đẻ ra 20 variations nông cạn
✅ Thay vào: 5-8 variations sâu, mỗi cái có rationale rõ ràng

❌ **Yes-machine:** Chấp nhận mọi ý tưởng của user
✅ Thay vào: Challenge khi thấy vấn đề, suggest alternatives

❌ **Pure blue-sky:** Ignore mọi constraints kỹ thuật
✅ Thay vào: Grounded trong codebase, cite prior art

❌ **Guess thông tin:** Assume khi không chắc
✅ Thay vào: AskUserQuestion cho tới khi ≥90% confidence

❌ **Weasel words:** "Có lẽ", "Có thể", "Chắc là"
✅ Thay vào: Nói thẳng không biết, hoặc state assumptions rõ ràng

---

## Xử lý Edge Cases

### Case 1: User không trả lời đủ questions

Sau 3 vòng AskUserQuestion mà vẫn < 80% confidence:

```
"Tôi cần thêm thông tin để tạo spec chất lượng cao. Hiện tại confidence chỉ [X%].

Các câu hỏi chưa trả lời:
- [Question 1]
- [Question 2]

Bạn có thể:
1. Cung cấp thêm thông tin → Tôi tiếp tục refine
2. Chấp nhận spec ở confidence thấp hơn → Tôi draft với disclaimer
3. Hoãn lại → Tôi lưu progress, bạn quay lại sau

Bạn muốn làm gì?"
```

### Case 2: Jira task quá lớn (Epic scope)

```
"Task này có vẻ là Epic scope (vd: 'Xây dựng hệ thống báo cáo hoàn chỉnh').

ba-refine works best với single feature (Story-level).

Bạn có thể:
1. Break thành sub-tasks nhỏ hơn → Tôi refine từng cái
2. Tiếp tục với Epic scope → Tôi sẽ focus vào MVP slice

Bạn muốn làm gì?"
```

### Case 3: Codebase constraints conflict với idea

```
"Direction B (Multi-format export) đẹp trên lý thuyết, nhưng conflict với 
codebase hiện tại:

- Codebase dùng wkhtmltopdf (chỉ support PDF)
- Thêm Excel export cần library mới (exceljs) + significant refactor
- Estimated: 2-3 weeks thay vì 1 week

Alternatives:
- Direction A: PDF-only, ship nhanh (3 days)
- Direction C: PDF với compliance features, differentiated (2 weeks)

Recommend: C over B (tính chiến lược cao hơn, cost tương đương)

Bạn nghĩ sao?"
```

---

## Success Metrics cho Skill này

Đo lường chất lượng của ba-refine:

| Metric             | Target   | Cách đo                                 |
|--------------------|----------|-----------------------------------------|
| Average Confidence | ≥90%     | Từ confidence assessment trong specs    |
| Jira Bounce Rate   | <10%     | % specs bị reject và phải refine lại    |
| Downstream Rework  | <20%     | % specs cần sửa đổi lớn trong dev phase |
| Time to Refine     | <2 hours | Từ invoke skill đến push to Jira        |


---
