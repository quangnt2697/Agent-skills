---
name: cr-review-code-and-quality
description: 'Đánh giá code đa chiều (multi-axis code review) kết hợp kiểm soát chất lượng theo triết lý Hybrid của Alibaba Open Code Review: lọc file tất định, ruleset theo ngôn ngữ/domain, và phản tư chống ảo giác. Phân chia rõ ràng: Dev (kiến trúc, logic, hiệu năng, clean code) và QA (độ bao phủ kịch bản kiểm thử, edge cases, automation). Sử dụng trước khi merge bất kỳ thay đổi nào vào nhánh chính.'
trigger: "Sử dụng khi: (1) chuẩn bị merge/push code vào nhánh chính, (2) nhận yêu cầu '/cr-review', 'review code', 'kiểm tra code', 'đánh giá PR', (3) sau khi DEV hoàn thành implementation cần review trước bàn giao QA, (4) phát hiện code smell, bug tiềm ẩn, hoặc vi phạm security trong codebase hiện tại."
---

# Kỹ năng: Đánh giá Code và Chất lượng (Review Code and Quality)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Diff/MR hoặc đường dẫn file cụ thể. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Mỗi phát hiện trích `file:dòng` có thật trong diff; phát hiện không kiểm chứng được bị loại.

## Tổng quan

Đánh giá code đa chiều thông qua các cổng kiểm soát chất lượng (quality gates) áp dụng triết lý kiến trúc **Deterministic Engineering × Agent Hybrid** (kế thừa từ thực chiến của Alibaba Open Code Review). Mọi thay đổi đều phải được review trước khi merge — không có ngoại lệ.

Quá trình review kết hợp hài hòa giữa **kỹ thuật tất định** (lọc file rác, chia cụm ngữ nghĩa, gán ruleset chuyên biệt, kiểm chứng chống ảo giác) và **năng lực suy luận động của Agent** (phân tích logic, truy vết rủi ro, đánh giá chéo theo Persona).

**Tiêu chuẩn phê duyệt (Approval standard):** Hãy phê duyệt một thay đổi khi nó chắc chắn cải thiện được sức khỏe tổng thể của codebase, ngay cả khi nó không hoàn hảo. Mục tiêu là sự cải tiến liên tục và độ tin cậy thực tế, không chặn merge vì sở thích cá nhân.

---

## Khi nào sử dụng

- Trước khi merge bất kỳ thay đổi nào vào nhánh chính — không có ngoại lệ.
- Review round 1: DEV tự review code mình vừa viết trước khi trình bày kết quả cho user.
- Review round 2: QA review từ góc độ testability cho các thay đổi critical (thanh toán, auth, giao dịch chứng khoán), thay đổi phức tạp nhiều edge cases, hoặc bug fix cần xác nhận đúng root cause.
- Sau khi `qa-auto-design` sinh code automation — review chất lượng test code trước khi chạy.

**KHÔNG sử dụng khi:**
- Chỉ cần dọn dẹp code đã chạy đúng mà không tìm lỗi → dùng `cr-code-simplification`
- Cần audit toàn diện kèm tự động sửa từ đầu đến cuối → dùng `dev-audit-and-fix`
- Chỉ cần chạy lại test đã có → dùng `qa-run-test`

---

## Quy Trình Đánh Giá 3 Pha Chuẩn Mực (The 3-Phase Review Pipeline)

### Pha 1: Chuẩn Bị Tất Định & Chia Cụm (Deterministic Pre-filtering & Bundling)

1. **Lọc file rác (Pre-filtering):** Tự động loại trừ lockfiles (`package-lock.json`, `go.sum`...), binary, generated code (`*.min.js`, `*.pb.go`...). Không nạp các file này vào prompt để tiết kiệm token và tránh làm loãng ngữ cảnh. Ưu tiên sử dụng n8n Fast-Path qua `cleanDiffForReview(rawDiffText)` (`node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js cleanDiffForReview`) để tự động lọc rác và phân loại 5 tầng kiến trúc trong 0.2s. Chi tiết xem tại: **[file-bundling-and-filtering.md](references/file-bundling-and-filtering.md)**.
2. **Chia cụm ngữ nghĩa (Smart File Bundling):** Nếu PR có từ 6 files trở lên, phân chia thành các nhóm tối đa 5–8 files liên quan trực tiếp (Data/Schema, Logic/Test, API/Route, Config/i18n) để review theo phương thức chia để trị (divide-and-conquer).
3. **Phân tích Rủi ro & Lập Kế hoạch (Plan Mode):** Khi thay đổi vượt ngưỡng (>50 dòng/file hoặc >100 dòng/cụm), chạy pha đánh giá rủi ro sơ bộ: xác định các điểm nguy hiểm tiềm ẩn (breaking changes, race condition, data migration) và lập danh sách context tools (`file_read`, `grep_search`) cần tra cứu trước khi kết luận.
4. **Nạp Ngữ Cảnh MR từ GitLab (Nếu review từ xa):** Áp dụng nguyên tắc Remote-First (Read-only qua REST API / Git CLI) để lấy diff mới nhất, pipeline CI và notes thảo luận chưa giải quyết. Chi tiết tại: **[gitlab-integration.md](references/gitlab-integration.md)**.
5. **(Tùy chọn) Fast-Path với CLI `ocr`:** Nếu máy trạm đã cài đặt `@alibaba-group/open-code-review`, Agent có thể gọi `ocr delegate preview --format json` và `ocr delegate rule <files...>` để lấy danh sách file và phân nhóm tự động.

---

### Pha 2: Đánh Giá Đa Chiều Theo Persona & Ngôn Ngữ (Deep Review)

Áp dụng quy tắc chuyên sâu tương ứng với từng ngôn ngữ và nghiệp vụ tại: **[language-and-domain-rules.md](references/language-and-domain-rules.md)** (TypeScript/React, Python, Go, Chứng khoán KRX...).

#### 1. Góc nhìn của DEV (Software Developer)
Trọng tâm: **Chất lượng mã nguồn, Kiến trúc, và Hiệu năng.**
- **Kiến trúc & Clean Code:** Tuân thủ SOLID, DRY, không phá vỡ module boundary, không over-engineering.
- **Hiệu năng & Tối ưu:** Triệt tiêu N+1 query, tối ưu luồng dữ liệu async, tránh re-render và memory leak trong closure/listeners.
- **Bảo mật:** Sanitize input tại ranh giới tin cậy, ngăn ngừa XSS/SQL Injection, bảo vệ secrets.

#### 2. Góc nhìn của QA / SDET
Trọng tâm: **Tính chính xác, Độ bao phủ kiểm thử, và Automation.**
- **Tính chính xác (Correctness):** Bám sát Acceptance Criteria trong `*-final.md`, kiểm tra đầy đủ boundary và negative edge cases.
- **Độ bao phủ Test (Coverage):** Có unit test cho logic mới chưa? Test có assertion thực chất hay chỉ lấy số liệu coverage? Có test regression cho bug fix không?
- **Chất lượng Test Code:** Kiểm tra tính độc lập của test, teardown dữ liệu sạch sẽ, mock data thực tế.

#### 5 Trục Đánh Giá Cốt Lõi:
1. **Tính Chính xác (Correctness):** Logic đúng spec, xử lý đủ null/undefined/edge cases, không race condition.
2. **Khả năng Đọc hiểu (Readability):** Tên biến rõ ràng, luồng điều khiển phẳng (tránh nested if/else/ternary), không dead code.
3. **Kiến trúc (Architecture):** Tôn trọng patterns hiện có, không rò rỉ abstraction, type boundaries chặt chẽ.
4. **Bảo mật (Security):** Validate & sanitize user input, tham số hóa SQL, ẩn secrets, phân quyền chặt chẽ.
5. **Hiệu năng (Performance):** Không N+1 query, không vòng lặp vô tận, endpoint danh sách có phân trang.

---

### Pha 3: Cổng Phản Tư & Kiểm Chứng Sự Thật (Fact-Checking Filter)

Trước khi in ra kết quả cho người dùng, Agent **BẮT BUỘC** chạy toàn bộ findings qua bộ lọc phản tư tại: **[fact-checking-filter.md](references/fact-checking-filter.md)**:

1. **Áp dụng Protected Subjects Veto:** Giữ lại 100% findings về: *An toàn bộ nhớ (null dereference, memory leak), Concurrency & Race condition, Nghiệp vụ Tiền tệ / Làm tròn chứng khoán, Lỗ hổng bảo mật / Auth, và Breaking API changes*.
2. **Loại bỏ theo Căn cứ A (Ground A):** Hủy bỏ ngay nhận xét nếu đoạn mã bị chê không hề xuất hiện trong diff của subject file.
3. **Loại bỏ theo Căn cứ B (Ground B):** Hủy bỏ ngay nhận xét nếu một dòng trong diff mâu thuẫn trực tiếp với nhận xét (ví dụ diff cho thấy đã validate, đã import).
4. **Chống Lệch Dòng (Pin-point Positioning):** Trích xuất `Existing Code Snippet` nguyên văn từ diff và `Suggested Code Snippet` cụ thể để lập trình viên định vị chính xác vị trí lỗi.

> 📖 **MẪU BÁO CÁO:** Xem định dạng báo cáo chuẩn, phân loại severity và quy tắc trình bày tại: **[review-templates.md](references/review-templates.md)**

---

## Các Biện hộ Thường gặp

| Lý do biện hộ | Thực tế |
|---|---|
| "Code chạy được rồi, review làm gì cho mất thời gian" | Review bắt lỗi mà test không bắt được: ranh giới module bị phá, race condition, lỗ hổng auth. Test chỉ kiểm những gì đã nghĩ ra để kiểm. |
| "PR to quá, review lướt cho nhanh" | PR càng to thì nguy cơ lọt bug càng cao. Áp dụng Smart Bundling (chia cụm 5-8 files) để review triệt để từng cụm, không được lướt. |
| "Tôi tin dev này, code chắc ổn" | Review là về code, không phải về người. Người giỏi nhất vẫn tạo ra bug khi mệt hoặc thiếu ngữ cảnh. |
| "Chỗ này chưa hoàn hảo nhưng thôi, sửa sau" | "Sửa sau" hiếm khi xảy ra. Hoặc yêu cầu sửa trước khi merge, hoặc tạo ticket cụ thể có người nhận. |
| "Không đúng cách tôi hay viết nên tôi request changes" | Tiêu chuẩn là *code có làm codebase tốt lên và tuân thủ quy ước dự án không*, không phải *có giống gu cá nhân của tôi không*. Sở thích cá nhân thì ghi `Nit:`, đừng chặn merge. |
| "Bug fix nhỏ xíu, khỏi cần test regression" | Không có test regression thì đúng bug đó sẽ quay lại. Bug fix không kèm test là fix chưa xong. |
| "QA sẽ bắt được lỗi này lúc test" | Bắt lỗi ở review rẻ hơn nhiều so với bắt ở khâu test, và rẻ hơn gấp hàng chục lần so với bắt ở production. |

---

## Các Dấu hiệu Cảnh báo (Red Flags)

- Gõ "LGTM" mà không có bằng chứng nào cho thấy đã đọc và đối chiếu diff.
- Chấp nhận lời hứa "để tôi sửa sau" mà không có cam kết hoặc issue theo dõi.
- Review chỉ đọc diff mà không mở file gốc để hiểu ngữ cảnh xung quanh.
- Báo lỗi ảo giác (hallucination) về những đoạn code không hề có trong diff hoặc code đã được xử lý ở dòng trên.
- Toàn bộ nhận xét đều là `Nit:` — dấu hiệu chưa rà soát trục Tính chính xác, Bảo mật, hoặc Kiến trúc.
- Approve một PR đụng tới auth, tiền bạc, số dư tài khoản mà không kiểm tra race condition hay sai số làm tròn dấu phẩy động.

---

## Xác minh

Một lượt review chỉ coi là hoàn tất khi:

- [ ] Đã lọc bỏ các file rác (lockfiles, generated code) và thống kê rõ độ bao phủ (`Reviewed: X/Y files`).
- [ ] Nếu PR lớn (>6 files), đã chia cụm ngữ nghĩa (Smart Bundling) và duyệt đủ 100% các cụm.
- [ ] Đã quét đủ 5 trục (chính xác, dễ đọc, kiến trúc, bảo mật, hiệu năng).
- [ ] Đã qua cổng Fact-Checking Filter: loại bỏ triệt để các nhận xét sai diff (Ground A & Ground B).
- [ ] Mỗi nhận xét đều trích xuất đoạn code nguyên văn (`Existing Code`) và đề xuất sửa đổi cụ thể (`Suggested Fix`).
- [ ] Mỗi nhận xét đều được dán nhãn mức độ rõ ràng: `Critical`, `Required`, `Nit`, hoặc `FYI`.
- [ ] Kết luận cuối cùng là một trong ba trạng thái rõ ràng: **Approve**, **Approve kèm Nit**, hoặc **Request Changes**.

---

## ⚡ Quy Tắc Output File (Output File Rules — Bắt buộc tuân thủ)

> 📌 **1 skill call = 1 lần ghi. Gọi lại skill → ghi đè hoàn toàn file cũ.**

| Trường hợp | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Review theo issueKey | `workspace/issues/{issueKey}/trace/code-review-report.md` | **Ghi đè** hoàn toàn |
| Review không có issueKey | `workspace/adhoc/code-review/trace/code-review-report.md` | **Ghi đè** hoàn toàn |

> ⚠️ **TUYỆT ĐỐI CẤM tạo thư mục `reports/` tại gốc dự án.** Mọi báo cáo review đều BẮT BUỘC nằm dưới `workspace/` (theo `.agents/rules/workspace-paths.md`). Nếu có định danh branch hoặc module (ví dụ `feature-order`), có thể dùng `workspace/adhoc/{slug}/trace/code-review-report.md`. Mặc định khi review tự do là `workspace/adhoc/code-review/trace/code-review-report.md`.
> **Quy tắc:** KHÔNG tạo file mới với suffix (-v2.md, -round2.md...). KHÔNG append vào file cũ. Luôn overwrite.

---

## Kết hợp

- **Kích hoạt trực tiếp khi:** User yêu cầu đánh giá chất lượng (review code) của một đoạn mã, file, hoặc một Pull / Merge Request cụ thể.
- **Lệnh tương tác:** Gọi thông qua lệnh `/cr-review`. Lệnh này định tuyến prompt dựa trên persona hiện tại (Dev hoặc QA) để đưa ra lăng kính đánh giá phù hợp nhất.

---
