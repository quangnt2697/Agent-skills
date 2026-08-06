---
name: meta-using-agent-skills
description: Khám phá và gọi các kỹ năng (skills) của agent. Sử dụng khi bắt đầu một phiên làm việc hoặc khi bạn cần tìm xem kỹ năng nào áp dụng cho task hiện tại. Đây là kỹ năng siêu cấp (meta-skill) chi phối cách tất cả các kỹ năng khác được phát hiện và sử dụng.
---

# Kỹ năng: Sử dụng các Kỹ năng của Agent (Using Agent Skills)

## Tổng quan

Agent Skills là một bộ sưu tập các kỹ năng luồng làm việc của kỹ sư phần mềm, được tổ chức theo từng giai đoạn phát triển. Mỗi kỹ năng mã hóa một quy trình cụ thể mà các kỹ sư cấp cao (senior engineers) thường tuân theo. Kỹ năng siêu cấp (meta-skill) này giúp bạn khám phá và áp dụng đúng kỹ năng cho task hiện tại.

## Khám phá Kỹ năng (Skill Discovery)

Khi nhận được một task, hãy xác định giai đoạn phát triển và áp dụng kỹ năng tương ứng:

```text
Task đến
    │
    ├── Chưa biết thực sự mình muốn gì? ──────→ interview-me
    ├── Có concept sơ bộ, cần thêm biến thể? → idea-refine
    ├── Dự án/tính năng/thay đổi mới? ──→ tech-spec (spec-driven-development)
    ├── Đã có spec, cần chia task? ──────→ planning-and-task-breakdown
    ├── Cần thiết kế test cases/checklist? ────→ qa-test-design
    ├── Đang bắt đầu viết code? ────────────→ incremental-implementation
    │   ├── Làm về UI? ─────────────────→ frontend-ui-engineering
    │   ├── Làm về API? ────────────────→ api-and-interface-design
    │   ├── Cần ngữ cảnh tốt hơn? ─────→ context-engineering
    │   ├── Cần code chuẩn theo docs? ───→ source-driven-development
    │   └── Rủi ro cao / code lạ? ──→ doubt-driven-development
    ├── Đang viết/chạy tests? ────────→ test-driven-development
    │   └── Test trên trình duyệt? ───────────→ browser-testing-with-devtools
    ├── Có thứ gì đó bị lỗi? ──────────────→ debugging-and-error-recovery
    ├── Đang review code? ───────────────→ code-review-and-quality
    │   ├── Code quá phức tạp? ─────────────→ code-simplification
    │   ├── Lo ngại về bảo mật? ───────→ security-and-hardening
    │   └── Lo ngại về hiệu năng? ────→ performance-optimization
    ├── Commit/chia nhánh (branching)? ─────────→ git-workflow-and-versioning
    ├── Làm về CI/CD pipeline? ──────────→ ci-cd-and-automation
    ├── Khai tử code cũ/migrate? ────────→ deprecation-and-migration
    ├── Viết docs/quyết định kiến trúc? ───────────→ documentation-and-adrs
    ├── Thêm logs/metrics/alerts? ───→ observability-and-instrumentation
    └── Deploy/launch sản phẩm? ─────────→ shipping-and-launch
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

Nếu bạn viết 1000 dòng code trong khi 100 dòng là đủ, bạn đã thất bại. Hãy ưu tiên các giải pháp nhàm chán, hiển nhiên. Sự xảo diệu (cleverness) có giá rất đắt.

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

Xác minh trên từng kỹ năng là khâu kiểm tra cục bộ. Tiêu chuẩn toàn dự án áp dụng cho *mọi* sự thay đổi, bất kể kỹ năng nào đang hoạt động, chính là Định nghĩa Hoàn thành (Definition of Done): test phải pass, không có bug regression, hành vi được xác minh lúc chạy thực tế, docs được cập nhật. Xem `references/definition-of-done.md`. Nó bổ trợ cho tiêu chí chấp thuận (acceptance criteria) của từng task chứ không phải thay thế chúng.

### 7. Tôn trọng Ràng buộc Nền tảng & Domain

Luôn xem xét ngữ cảnh của domain và platform:
- **Domain (Fintech/Ngân hàng/Chứng khoán):** Đảm bảo tuân thủ nghiêm ngặt về Bảo mật (Auth/Quyền), Độ chính xác tài chính (không làm tròn tùy tiện), và yêu cầu giao dịch ACID.
- **Nền tảng (Đa nền tảng/OpenAPI):** Đảm bảo thiết kế API-first. Hợp đồng API (API Contract) phải được thiết kế và thống nhất trước khi các bên Web/App bắt đầu lập trình.

## Những Lỗi Thất bại cần Tránh

Đây là những lỗi tinh vi có vẻ như mang lại năng suất nhưng thực chất lại tạo ra vấn đề:

1. Đưa ra giả định sai mà không kiểm chứng.
2. Không quản lý sự bối rối của bản thân — cứ thế đâm đầu làm khi đang bị lạc hướng.
3. Không phơi bày những sự không nhất quán mà bạn nhận ra.
4. Không trình bày các sự đánh đổi (tradeoffs) đối với những quyết định không mấy hiển nhiên.
5. Quá "nịnh nọt" ("Tất nhiên rồi!") trước những cách tiếp cận có vấn đề rõ ràng.
6. Làm phức tạp hóa code và APIs.
7. Sửa đổi code hoặc comments không liên quan đến task.
8. Xóa những thứ mà bạn không hiểu rõ.
9. Xây dựng không cần spec vì "nó quá hiển nhiên".
10. Bỏ qua khâu xác minh vì "trông có vẻ đúng".

## Quy tắc Kỹ năng

1. **Kiểm tra xem có kỹ năng nào áp dụng được không trước khi bắt đầu làm việc.** Các kỹ năng mã hóa quy trình giúp ngăn ngừa các lỗi phổ biến.

2. **Kỹ năng là các luồng quy trình, không phải là lời khuyên.** Hãy tuân theo các bước theo thứ tự. Đừng bỏ qua các bước xác minh.

3. **Nhiều kỹ năng có thể được áp dụng cùng lúc.** Một lần triển khai tính năng có thể liên quan đến chuỗi: `idea-refine` → `tech-spec` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `code-simplification` → `shipping-and-launch`.

4. **Khi băn khoăn, hãy bắt đầu với một spec.** Nếu task không hề đơn giản và chưa có spec, hãy bắt đầu với `tech-spec`.

## Trình tự Vòng đời (Lifecycle Sequence)

Đối với một tính năng hoàn chỉnh, trình tự kỹ năng điển hình là:

```text
1.  interview-me                → Rút ra những gì người dùng thực sự muốn
2.  idea-refine                 → Tinh chỉnh những ý tưởng mơ hồ
3.  tech-spec (spec-driven)     → Định nghĩa cái chúng ta sẽ xây dựng
4.  planning-and-task-breakdown → Chia nhỏ thành các task có thể kiểm chứng
5.  qa-test-design              → Thiết kế checklist test và kịch bản BDD
6.  context-engineering         → Tải đúng ngữ cảnh cần thiết
7.  source-driven-development   → Xác minh với tài liệu gốc chính thức
8.  incremental-implementation  → Xây dựng từng lát cắt dọc
9.  observability-and-instrumentation → Gắn log/metric trong lúc build (chạy song song với 8-10, không phải sau đó)
10. doubt-driven-development    → Kiểm tra chéo (đóng vai ác) mọi quyết định quan trọng ngay lúc làm
11. test-driven-development     → Chứng minh mỗi lát cắt hoạt động đúng
12. code-review-and-quality     → Review trước khi merge
13. code-simplification         → Giảm độ phức tạp không cần thiết trong khi vẫn giữ nguyên hành vi
14. git-workflow-and-versioning → Lịch sử commit sạch sẽ
15. documentation-and-adrs      → Ghi chép (Document) các quyết định
16. deprecation-and-migration   → Khai tử hệ thống cũ và chuyển người dùng an toàn khi cần
17. shipping-and-launch         → Deploy an toàn
```

Không phải task nào cũng cần mọi kỹ năng. Một task fix bug có thể chỉ cần: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

## Bảng Tra cứu Nhanh (Quick Reference)

| Giai đoạn | Kỹ năng | Tóm tắt |
|-------|-------|-----------------|
| Xác định (Define) | interview-me | Phơi bày những gì người dùng thực sự muốn trước khi có spec hay code |
| Xác định | idea-refine | Tinh chỉnh ý tưởng thông qua tư duy phân kỳ và hội tụ có cấu trúc |
| Xác định | tech-spec | Yêu cầu và tiêu chí chấp thuận phải có trước khi viết code |
| Kế hoạch (Plan) | planning-and-task-breakdown | Phân rã thành các task nhỏ, có thể xác minh được |
| Kế hoạch | qa-test-design | Thiết kế test 2 giai đoạn: checklists thực thi sau đó là BDD scenarios |
| Xây dựng (Build) | incremental-implementation | Cắt các lát cắt dọc mỏng, test từng lát cắt trước khi mở rộng |
| Xây dựng | source-driven-development | Xác minh lại với tài liệu chính thức trước khi triển khai |
| Xây dựng | doubt-driven-development | Review chéo (adversarial review) với tư duy mới cho mọi quyết định khó |
| Xây dựng | context-engineering | Đúng ngữ cảnh vào đúng thời điểm |
| Xây dựng | frontend-ui-engineering | UI chuẩn production đảm bảo tính tiếp cận (accessibility) |
| Xây dựng | api-and-interface-design | Giao diện ổn định với hợp đồng (contracts) rõ ràng |
| Xác minh (Verify) | test-driven-development | Viết test bị fail trước, rồi làm cho nó pass |
| Xác minh | browser-testing-with-devtools | Dùng Chrome DevTools MCP để xác minh lúc chạy (runtime) |
| Xác minh | debugging-and-error-recovery | Tái hiện → cô lập → sửa → rào chắn bảo vệ |
| Đánh giá (Review) | code-review-and-quality | Review 5-trục với các cổng chất lượng (quality gates) |
| Đánh giá | code-simplification | Giữ nguyên hành vi đồng thời giảm độ phức tạp không cần thiết |
| Đánh giá | security-and-hardening | Phòng chống OWASP, validate đầu vào, đặc quyền tối thiểu |
| Đánh giá | performance-optimization | Đo lường trước, chỉ tối ưu những gì quan trọng |
| Bàn giao (Ship) | git-workflow-and-versioning | Các commit nguyên tử (atomic), lịch sử sạch |
| Bàn giao | ci-cd-and-automation | Các cổng chất lượng tự động trên mỗi thay đổi |
| Bàn giao | deprecation-and-migration | Gỡ hệ thống cũ và migrate người dùng an toàn |
| Bàn giao | documentation-and-adrs | Document vì sao làm, chứ không chỉ document làm cái gì |
| Bàn giao | observability-and-instrumentation | Logs cấu trúc, RED metrics, traces, cảnh báo dựa trên triệu chứng |
| Bàn giao | shipping-and-launch | Checklist trước ra mắt, giám sát (monitoring), kế hoạch rollback |
