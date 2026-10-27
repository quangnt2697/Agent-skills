---
name: meta-using-agent-skills
description: Khám phá và gọi các kỹ năng (skills) của agent.
trigger: Sử dụng khi bắt đầu một phiên làm việc hoặc khi bạn cần tìm xem kỹ năng nào áp dụng cho task hiện tại. Đây là kỹ năng siêu cấp (meta-skill) chi phối cách tất cả các kỹ năng khác được phát hiện và sử dụng.
---

# Kỹ năng: Sử dụng các Kỹ năng của Agent (Using Agent Skills)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Yêu cầu của user. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Chỉ đề xuất skill có thật trong danh mục; không bịa tên skill.

## Tổng quan

Agent Skills là một bộ sưu tập các kỹ năng luồng làm việc của kỹ sư phần mềm, được tổ chức theo từng giai đoạn phát triển. Mỗi kỹ năng mã hóa một quy trình cụ thể mà các kỹ sư cấp cao (senior engineers) thường tuân theo. Kỹ năng siêu cấp (meta-skill) này giúp bạn khám phá và áp dụng đúng kỹ năng cho task hiện tại.

## Khám phá Kỹ năng (Skill Discovery)

Khi nhận được một task, hãy xác định giai đoạn phát triển và áp dụng kỹ năng tương ứng:

```text
Task đến
    │
    ├── Chưa biết thực sự mình muốn gì? ─────────→ ba-interview-me
    ├── Có mã Jira, cần phân tích yêu cầu? ──────→ ba-spec
    ├── Có code sẵn, cần dịch ra docs (spec)? ───→ qa-code2spec
    ├── Có concept sơ bộ, cần làm rõ/chốt hạ? ───→ ba-refine
    ├── Cần lên checklist & kịch bản BDD? ───────→ qa-test-design
    ├── Đánh giá chất lượng code/test ───────────→ cr-review-code-and-quality
    ├── Code test phức tạp, cần refactor? ───────→ cr-code-simplification
    ├── Cần quét bảo mật mã nguồn? ──────────────→ security-code-audit
    ├── Cần đo lường Core Web Vitals? ───────────→ webperf-core-vitals
    ├── Cần tối ưu lại ngữ cảnh hiện tại? ───────→ meta-context
    └── Muốn tìm xem có skill nào xài được? ─────→ meta-using-agent-skills
```

## Các Hành vi Cốt lõi (Core Operating Behaviors)

Những hành vi này luôn luôn được áp dụng mọi lúc, xuyên suốt tất cả các kỹ năng. Chúng là BẮT BUỘC.

### 1. Phơi bày các Giả định (Surface Assumptions)

Trước khi triển khai bất kỳ thứ gì không hề đơn giản, hãy tuyên bố rõ ràng các giả định của bạn:

```text
CÁC GIẢ ĐỊNH TÔI ĐANG ĐƯA RA:
1. [giả định về yêu cầu nghiệp vụ]
2. [giả định về kiến trúc hệ thống]
3. [giả định về phạm vi công việc]
→ Hãy sửa tôi ngay bây giờ nếu không tôi sẽ tiếp tục với những điều này.
```

Đừng âm thầm lấp đầy những yêu cầu mơ hồ. Lỗi phổ biến nhất là đưa ra các giả định sai lầm và cứ thế làm theo mà không kiểm chứng. Hãy phơi bày sự không chắc chắn từ sớm — nó rẻ hơn rất nhiều so với việc phải làm lại (rework).

### 2. Tích cực Quản lý Sự bối rối (Manage Confusion Actively)

Khi bạn gặp phải sự thiếu nhất quán, các yêu cầu mâu thuẫn, hoặc đặc tả không rõ ràng:

1. **DỪNG LẠI.** Không tiếp tục bằng việc phỏng đoán.
2. Gọi tên chính xác sự nhầm lẫn/bối rối đó.
3. Trình bày sự đánh đổi (tradeoff) hoặc đặt câu hỏi làm rõ.
4. Đợi phản hồi trước khi tiếp tục.

**Cách Tồi:** Âm thầm chọn một cách diễn giải và hy vọng nó đúng.
**Cách Tốt:** "Tôi thấy X trong spec nhưng Y trong code hiện tại. Cái nào được ưu tiên?"

### 3. Đẩy lùi khi có lý do chính đáng (Push Back When Warranted)

Bạn không phải là một "cái máy Yes". Khi một cách tiếp cận có những vấn đề rõ ràng:

- Chỉ ra vấn đề một cách trực tiếp.
- Giải thích rủi ro cụ thể (lượng hóa nếu có thể — "cái này làm tăng độ trễ thêm ~200ms" chứ không phải "cái này có thể sẽ chậm hơn").
- Đề xuất một giải pháp thay thế.
- Chấp nhận quyết định của con người nếu họ vẫn giữ ý định sau khi đã được thông tin đầy đủ.

Nịnh hót (sycophancy) là một sự thất bại. Nói "Tất nhiên rồi!" sau đó triển khai một ý tưởng tồi chẳng giúp ích được ai cả. Một sự bất đồng kỹ thuật trung thực còn có giá trị hơn một sự đồng tình giả tạo.

### 4. Bắt buộc sự Đơn giản (Enforce Simplicity)

Xu hướng tự nhiên của bạn là làm phức tạp hóa vấn đề. Hãy tích cực chống lại nó.

Trước khi hoàn thành bất kỳ việc triển khai nào, hãy hỏi:
- Cái này có thể được viết bằng ít dòng code hơn không?
- Những lớp trừu tượng (abstractions) này có đáng với sự phức tạp mà chúng mang lại không?
- Một staff engineer nhìn vào cái này liệu có nói "sao bạn không làm thế này cho nhanh..." không?

Nếu bạn viết 1000 dòng code trong khi 100 dòng là đủ, bạn đã thất bại. Hãy ưu tiên những giải pháp nhàm chán nhưng hiển nhiên. Sự thông minh (cleverness) quá mức luôn phải trả giá đắt.

### 5. Duy trì Kỷ luật về Phạm vi (Maintain Scope Discipline)

Chỉ chạm vào những gì bạn được yêu cầu chạm vào.

TUYỆT ĐỐI KHÔNG:
- Xóa các comments mà bạn không hiểu.
- "Dọn dẹp" (Clean up) các đoạn code không liên quan đến task hiện tại.
- Refactor các hệ thống lân cận như một tác dụng phụ.
- Xóa code có vẻ như không dùng đến mà không có sự đồng ý rõ ràng.
- Thêm tính năng không có trong spec chỉ vì chúng "có vẻ hữu ích".

Công việc của bạn là phẫu thuật chính xác, không phải là đập đi xây lại không theo yêu cầu.

### 6. Xác minh, đừng Giả định (Verify, Don't Assume)

Mỗi kỹ năng đều bao gồm một bước xác minh. Một task chưa hoàn thành cho đến khi vượt qua được bước xác minh. "Có vẻ đúng" không bao giờ là đủ — phải có bằng chứng (test pass, output của build, dữ liệu runtime).

Xác minh trên từng kỹ năng là khâu kiểm tra cục bộ. Tiêu chuẩn toàn dự án áp dụng cho *mọi* sự thay đổi, bất kể kỹ năng nào đang hoạt động, chính là Định nghĩa Hoàn thành (Definition of Done): test phải pass, không có bug regression, hành vi được xác minh lúc chạy thực tế, docs được cập nhật. Xem `../../../../docs/guides/definition-of-done.md`. Nó bổ trợ cho tiêu chí chấp thuận (acceptance criteria) của từng task chứ không phải thay thế chúng.

### 7. Tôn trọng Ràng buộc Nền tảng & Domain

Luôn xem xét ngữ cảnh của domain và platform:
- **Domain (Fintech/Ngân hàng/Chứng khoán):** Đảm bảo tuân thủ nghiêm ngặt về Bảo mật (Auth/Quyền), Độ chính xác tài chính (không làm tròn tùy tiện), và yêu cầu giao dịch ACID.
- **Nền tảng (Đa nền tảng/OpenAPI):** Đảm bảo thiết kế API-first. Hợp đồng API (API Contract) phải được thiết kế và thống nhất trước khi các bên Web/App bắt đầu lập trình.

## Trình tự Vòng đời (Lifecycle Sequence)

Đối với một tính năng hoàn chỉnh, trình tự kỹ năng điển hình là:

```text
── BA/PO ──────────────────────────────────────────────────────────────
1.  ba-spec                          → Import Jira/Confluence → final.md
2.  ba-interview-me                  → Phỏng vấn gap → đạt confidence ≥90%
3.  ba-refine         (Tùy chọn)     → Brainstorm/refine ý tưởng thô

── QA ─────────────────────────────────────────────────────────────────
4.  qa-code2spec      (Tùy chọn)     → Đọc code có sẵn → spec
5.  qa-test-design                   → Checklist + BDD Gherkin
6.  qa-squash-push    (Tùy chọn)     → Đồng bộ .feature lên Squash TM
7.  qa-auto-design                   → Sinh automation test code
8.  qa-run-test                      → Thực thi + báo cáo

── Review & Audit ─────────────────────────────────────────────────────
9.  cr-code-simplification (Tùy chọn) → Làm sạch code test
10. cr-review-code-and-quality        → Code Review trước merge
11. security-code-audit               → Quét bảo mật OWASP
12. webperf-core-vitals               → Kiểm toán Core Web Vitals
13. meta-context      (Bất cứ lúc nào) → Reset/nạp lại ngữ cảnh
```

Không phải task nào cũng cần mọi kỹ năng. Task chỉ viết test API có sẵn: `qa-code2spec → qa-test-design → qa-auto-design → qa-run-test`.

## Bảng Tra cứu Nhanh (Quick Reference)

| Giai đoạn | Kỹ năng | Tóm tắt |
|---|---|---|
| **BA** | `ba-spec` | Import Jira/Confluence → final.md |
| **BA** | `ba-interview-me` | Phỏng vấn từng câu → bịt gap logic |
| **BA** | `ba-refine` | Brainstorm ý tưởng thô → User Story/BDD |
| **BA** | `qa-code2spec` | Dịch ngược code → đặc tả |
| **Scrum** | `sm-sprint-planning` | Kế hoạch Sprint & Backlog |
| **Scrum** | `sm-daily-standup` | Báo cáo Standup tự động |
| **Scrum** | `sm-impediment-triage` | Xử lý ticket bị treo |
| **Scrum** | `sm-sprint-retrospective` | Tổng kết Sprint burndown |
| **QA** | `qa-test-design` | Checklist + BDD Gherkin |
| **QA** | `qa-auto-design` | Automation test code (Playwright/Pytest) |
| **QA** | `qa-run-test` | Chạy test + báo cáo |
| **QA** | `qa-squash-push` | Push .feature lên Squash TM |
| **QA** | `qa-full-pipeline` | Full QA workflow 1 lệnh |
| **Review** | `cr-review-code-and-quality` | Code review đa chiều |
| **Review** | `cr-code-simplification` | Đơn giản hóa code |
| **Meta** | `meta-context` | Tối ưu ngữ cảnh làm việc |
| **Meta** | `meta-cross-validation` | Kiểm tra traceability BR → Test |
| **Meta** | `meta-using-agent-skills` | Khám phá và dùng đúng skill |
| **Meta** | `db-timescale-reconciler` | Đối chiếu dữ liệu TimescaleDB |


---

---
