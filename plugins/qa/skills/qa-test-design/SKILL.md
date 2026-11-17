---
name: qa-test-design
description: "Thiết kế bộ artifacts kiểm thử phi-mã-nguồn gồm Checklist kiểm thử thực thi (checklist.md) và kịch bản BDD Gherkin (.feature) từ đặc tả nghiệp vụ. Dùng khi cần lập test plan, phân tích ma trận 6 trục, tạo checklist hoặc viết kịch bản BDD trước khi lập trình automation."
metadata:
  version: "1.0.0"
  short-description: "Thiết kế Checklist kiểm thử và kịch bản BDD Gherkin từ spec..."
---

# Kỹ Năng Thiết Kế Kiểm Thử QA (qa-test-design)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `workspace/issues/{issueKey}/spec/final.md`; dữ liệu chứng khoán tra từ Metabase UAT/TimescaleDB (read-only). Thiếu input thì DỪNG và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** `checklist.md` và `{issueKey}.feature` tồn tại, ánh xạ 1-1 qua `@CL-xxx`, `qa-validate.js` exit 0, không bịa mã chứng khoán.

## ⚠️ RANH GIỚI NHIỆM VỤ & KHI NÀO DÙNG

| ✅ qa-test-design LÀM | ❌ qa-test-design KHÔNG LÀM |
|---|---|
| Đọc `spec/final.md`, phân tích test profile & ma trận 6 trục | Viết code Python/Pytest/Playwright (`conftest.py`, `services/`, `pages/`) |
| Tra cứu dữ liệu thật UAT (read-only) vào `data-grounding.json` | Chạy test lên server hoặc debug lỗi hệ thống backend |
| Thiết kế `checklist.md` + BDD `{issueKey}.feature` và chạy `qa-validate.js` | Tự sửa spec/assertion gốc hoặc viết báo cáo kết quả chạy test |

- **Dùng khi:** Đã có `workspace/issues/{issueKey}/spec/final.md`, cần tạo `checklist.md` + `{issueKey}.feature` trước `qa-auto-design` hoặc `qa-squash-push`. *(Với ticket ≥ 2 profile hoặc luồng khớp lệnh ORS/ký quỹ, có thể bật `/plan`.)*
- **Khi KHÔNG sử dụng:** Chưa có spec rõ ràng → Dùng `ba-spec` / `ba-interview-me`. Đã có `.feature` và cần viết code test → Dùng `qa-auto-design`.

## 1. Định tuyến 5 Test Profiles & Ma trận 6 Trục Bao phủ

Nhận diện profile từ `spec/testability-manifest.json` hoặc `spec/final.md`:

| Mã Profile | Phạm vi áp dụng | Trọng tâm Kiểm thử & Tài nguyên |
|---|---|---|
| **QA-PROFILE-API** | REST / GraphQL / OpenAPI | Schema, Auth/IDOR, Idempotency, tính toán `Decimal`, mã lỗi (`fixtures_api.py`, `api_ws_service.py`) |
| **QA-PROFILE-WS** | WebSocket / MDDS | Ngưỡng theo hạng Normal/VIP/Ultimate, reconnect, topic timeout ([05-market-data-mdds.md](../../../../references/securities/05-market-data-mdds.md)) |
| **QA-PROFILE-UI** | Web Trading & Mobile App | Hiển thị theo phiên, validation, khóa double-click, đồng bộ UI↔API (`web_ui_pom.py`, `mobile_app_pom.py`) |
| **QA-PROFILE-STATE** | Vòng đời lệnh / ORS / Margin | Pending→New→Partial→Filled/Cancelled/Rejected, giữ/giải tỏa sức mua ([03-order-lifecycle-and-ors.md](../../../../references/securities/03-order-lifecycle-and-ors.md), [06-traditional-margin.md](../../../../references/securities/06-traditional-margin.md), [07-deal-based-margin.md](../../../../references/securities/07-deal-based-margin.md)) |
| **QA-PROFILE-DATA** | TimescaleDB v3/v2 / OpenAPI DB | Parity 11 topics KRX MDDS, value drift, ưu tiên v3 fallback v2 (`recon_guide.md`, `db-timescale-reconciler`) |

Quét mỗi `[BR-xx]` và `[AC-x.y]` qua **Ma trận 6 Trục** (chi tiết tại [qa-testing-checklist.md](references/qa-testing-checklist.md)):
1. **Lớp 1 (`@happy-path`, `@persona`):** Phân khúc Normal/VIP/Ultimate, tiểu khoản 1 vs 6 ([08-persona-matrix.md](../../../../references/securities/08-persona-matrix.md)).
2. **Lớp 2 (`@boundary`, `@bva`):** Biên giá (Sàn-1, Sàn, TC, Trần, Trần+1, Tick size), biên KL (0, lẻ 1–99, chẵn 100, MAX, MAX+100), hạn mức connector/stream.
3. **Lớp 3 (`@domain-matrix`):** Sàn (HOSE/HNX/UPCoM/Phái sinh) × Phiên (ATO/Liên tục/ATC/PLO/Nghỉ) × Trạng thái mã (Normal/CR/CA/RES/SUS) qua `Scenario Outline`.
4. **Lớp 4 (`@negative`):** Thiếu/sai input, hết hạn token/IDOR, vi phạm quy tắc lệnh (MTL mã cảnh báo, sửa/hủy ATO/ATC).
5. **Lớp 5 (`@state-concurrency`):** Hủy/sửa sai trạng thái, concurrency vét sức mua, idempotency.
6. **Lớp 6 (`@resilience`):** Mất kết nối WS, reconnect tự động, Watchdog timeout, SLA.

## 2. Quy trình 3 Giai đoạn Thực thi Ngay

- **Giai đoạn 1 — Thiết kế `checklist.md`:**
  - Đọc `spec/final.md` (+ `testability-manifest.json` nếu có), ghi dòng đầu `<!-- TEST_PROFILE: ... -->`.
  - Gán ID `CL-001`, ưu tiên `[P0]` (Boundary/Security/Tiền/Race) · `[P1]` (Happy/Negative UX) · `[P2]` (Phụ/Resilience), gắn tag **`@AC-xx`** để truy vết đủ Happy + Negative + Boundary cho mỗi AC.
- **Giai đoạn 1.5 — Data Grounding UAT ([data-grounding.md](references/data-grounding.md)):**
  - Tra cứu dữ liệu THẬT từ Metabase/TimescaleDB UAT (mã CK, tài khoản, mã lệnh) và ghi vào `workspace/issues/{issueKey}/test/fixtures/data-grounding.json`.
  - Nếu ticket có keyword đối chiếu dữ liệu (`"chính xác"`, `"trúng khớp"`, `"consistency"`, `"so sánh"`), ghi thêm reference values (`"kind": "accuracy-reference"`) và gắn nhóm `@data-accuracy`.
- **Giai đoạn 2 — Thiết kế `{issueKey}.feature` (Ghi đè 1 file chuẩn):**
  - Map 1-1 với `checklist.md` qua `@CL-xxx`, gắn tag bắt buộc `@smoke` hoặc `@regression`, `@happy-path` / `@negative` / `@edge-case`, `@JIRA-{issueKey}`, `@domain-securities`, và `@AC-xx` (mỗi AC phủ đủ 3 loại Happy, Negative, Boundary để pass `qa-validate.js`).
  - Dùng ngôn ngữ miền nghiệp vụ và ranh giới tượng trưng (`TAI_HAN_MUC`, `VUOT_HAN_MUC`); **CẤM** biến code, XPath, SQL, `.env` keys. Tách hoặc dùng `Scenario Outline` + `Examples` khi có ≥ 2 sàn/mã CK khác phiên.
  - Với GraphQL: thiết kế đủ 4 nhóm `@graphql-full-query`, `@graphql-partial-query`, `@graphql-no-query`, `@graphql-invalid-query` ([gherkin-patterns.md](references/gherkin-patterns.md)). Mọi `Then` lấy nguyên văn AC/Jira; thiếu thì ghi `# NEEDS-SPEC` và DỪNG.
- **Giai đoạn 3 — GATE Thẩm định & Bàn giao:**
  1. Kiểm tra cú pháp & traceability (trên `checklist.md` và `{issueKey}.feature`):
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/scripts/qa/qa-validate.js --checklist workspace/issues/{issueKey}/test/checklist.md "workspace/issues/{issueKey}/test/{issueKey}.feature"
     ```
  2. Kiểm tra quy tắc chứng khoán qua n8n (nếu n8n đang chạy):
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js lintDomainGherkin --file "workspace/issues/{issueKey}/test/{issueKey}.feature"
     ```
  3. Ghi ma trận traceability ra `workspace/issues/{issueKey}/trace/matrix.md` và SHA256 vào `.pipeline-state.json`. Gọi lại skill luôn **ghi đè** `checklist.md` và `{issueKey}.feature` (không tạo file `-v2` hay `-new`). Tự sửa cú pháp `.feature` tối đa 1 vòng nếu lỗi; sau khi pass thì **DỪNG** và gợi ý `/qa-auto-design {issueKey}`.

## 3. Tài nguyên Mở rộng (Chỉ mở khi cần)

- **Script & Checklist nhanh:** [qa-init.sh](assets/qa-init.sh) · [qa-validate.sh](assets/qa-validate.sh) · [quick-start-checklist.md](references/quick-start-checklist.md)
- **Tham khảo chuyên sâu:** [data-grounding.md](references/data-grounding.md) · [workflow.md](references/workflow.md) · [qa-testing-checklist.md](references/qa-testing-checklist.md) · [gherkin-patterns.md](references/gherkin-patterns.md) · [securities-domain-rules.md](../../../../references/securities-domain-rules.md)

## 4. Ví dụ mẫu (Few-shot Example)

> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

```markdown
<!-- checklist.md (trích) -->
- [P0] CL-001 @AC-01 Xác minh hệ thống TỪ CHỐI lệnh mua khi KL = 500,001 (VUOT_HAN_MUC) trên HOSE
```

```gherkin
@regression @boundary @negative @domain-securities @JIRA-STK-101 @CL-001 @AC-01
Scenario: Từ chối đặt lệnh mua khi khối lượng vượt hạn mức sàn HOSE
  Given Nhà đầu tư đăng nhập tài khoản tiểu khoản 1 với sức mua khả dụng đủ
  When Nhà đầu tư đặt lệnh mua "VND" khối lượng "VUOT_HAN_MUC_SAN"
  Then Hệ thống từ chối và trả về lỗi "Khối lượng vượt quá 500,000 cổ phiếu"
```

## Xác minh & Phản biện Đối kháng (Verification)
- [ ] `workspace/issues/{issueKey}/test/checklist.md` và `{issueKey}.feature` tồn tại, map 1-1 qua `@CL-xxx`, `qa-validate.js` exit 0.
- [ ] Với ticket Fintech/Critical: rà lại `spec/final.md` qua `meta-cross-validation` để không sót case negative/concurrency.
