---
name: qa-test-design
description: Thiết kế bộ artifacts kiểm thử 2 giai đoạn chuẩn mực gồm Checklist kiểm thử thực thi (checklist.md) và kịch bản BDD Gherkin (.feature). Chỉ thiết kế — KHÔNG viết code test, KHÔNG thực thi test.
trigger: Khi cần thiết kế test plan, tạo checklist kiểm thử hoặc viết kịch bản BDD Gherkin từ đặc tả nghiệp vụ. Trigger bằng lệnh /qa-test-design.
---

# Kỹ Năng Thiết Kế Kiểm Thử QA (qa-test-design)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `spec/final.md`; dữ liệu chứng khoán lấy từ Metabase UAT/TimescaleDB. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** `checklist.md` và `.feature` tồn tại; `qa-validate.js` exit 0; không bịa mã chứng khoán.

## ⚠️ RANH GIỚI NHIỆM VỤ (Bắt buộc đọc trước)

| ✅ qa-test-design LÀM | ❌ qa-test-design KHÔNG LÀM |
|---|---|
| Đọc spec/final.md, phân tích yêu cầu | Viết code Python/Pytest/Playwright |
| Thiết kế `checklist.md` theo 6 chiều | Chạy test thực sự lên server |
| Tra cứu dữ liệu thật UAT (read-only) | Debug lỗi hệ thống backend |
| Viết kịch bản BDD Gherkin `.feature` | Debug lỗi hệ thống backend |
| Chạy `qa-validate.sh` (kiểm tra cú pháp Gherkin) | Tạo file conftest.py, services/, pages/ |
| Bàn giao artifacts cho `qa-auto-design` | Viết báo cáo kết quả test |

## 1. Khi nào dùng?
- Đã có tài liệu đặc tả nghiệp vụ (`workspace/issues/{issueKey}/spec/final.md`).
- Cần chuyển hóa spec thành 2 artifacts kiểm thử chuẩn mực: `checklist.md` (Kiểm thử cái gì) và `{issueKey}.feature` (Kiểm thử như thế nào).
- Chuẩn bị đầu vào cho quá trình sinh mã tự động (`qa-auto-design`) hoặc đồng bộ lên Squash TM (`qa-squash-push`).
- **Khuyến nghị Planning Mode (`/plan`):** Đối với các tính năng có từ 2 profile kiểm thử trở lên hoặc tác động trực tiếp luồng khớp lệnh ORS/ký quỹ, khuyến nghị bật `/plan` để phân tích ma trận rủi ro trước khi chốt checklist.

**Khi KHÔNG sử dụng:**
- Chưa có spec rõ ràng → Dùng `ba-spec` hoặc `ba-interview-me` trước.
- Đã có kịch bản `.feature` và cần viết code test tự động → Dùng `qa-auto-design`.

## 1.1. Phân loại 5 Test Profiles chuẩn hóa (Định tuyến tự động)

Tự động nhận diện profile từ `spec/testability-manifest.json` hoặc phân tích `spec/final.md` để nạp đúng Bộ khung kiểm thử (Test Archetype):

| Mã Profile | Loại Task áp dụng | Trọng tâm Kiểm thử Bắt buộc | Liên kết Tài nguyên trong Repo |
|---|---|---|---|
| **QA-PROFILE-API** | REST / OpenAPI (Đặt lệnh, truy vấn tài sản, sức mua, danh mục) | Schema validation, Auth/Token, Idempotency, Công thức tính toán (Decimal), Mã lỗi nghiệp vụ | `fixtures_api.py`, `api_ws_service.py`, `test_api_example.py`, `api.env.example` |
| **QA-PROFILE-WS** | WebSocket Streaming, Market Data (MDDS), Thông báo đẩy | Ngưỡng kết nối/stream theo hạng user (Normal/VIP/Ultimate), Reconnect, Watchdog/Topic Timeout, Thứ tự bản tin | `fixtures_ws.py`, `test_ws_example.py`, `ws.env.example`, `references/securities/05-market-data-mdds.md` |
| **QA-PROFILE-UI** | Web Trading Dashboard & Mobile App (Appium/Playwright) | Trạng thái hiển thị theo phiên, Form validation tức thời, Khóa nút (Double-click), Đồng bộ dữ liệu UI ↔ API | `fixtures_web_ui.py`, `fixtures_mobile.py`, `web_ui_pom.py`, `mobile_app_pom.py`, `web-ui.env.example` |
| **QA-PROFILE-STATE** | Vòng đời lệnh (Order Lifecycle), Khớp lệnh ORS, Deal Margin | Chuyển đổi trạng thái lệnh (Pending → New → Partial → Filled/Cancelled/Rejected), Giữ/Giải tỏa sức mua & ký quỹ | `fixtures_api.py`, `order_state_testing.md`, `references/securities/03-order-lifecycle-and-ors.md`, `references/securities/06-traditional-margin.md`, `references/securities/07-deal-based-margin.md` |
| **QA-PROFILE-DATA** | Đối chiếu Database (TimescaleDB v3/v2, OpenAPI DB) | Độ vẹn toàn dữ liệu giữa 11 topics KRX MDDS, kiểm tra lệch giá/khối lượng, ưu tiên bảng v3 fallback v2 | `recon_guide.md`, `timescale-schema.md`, `db-timescale-reconciler` |

*(Một ticket phức tạp có thể kết hợp nhiều profile, ví dụ: QA-PROFILE-API + QA-PROFILE-STATE)*

## 1.2. Công thức Ma trận 6 Trục Bao phủ (6-Axis Coverage Matrix) chống sót Case

Mọi Yêu cầu Nghiệp vụ (`[BR-xx]`) và Tiêu chí Nghiệm thu (`[AC-x.y]`) bắt buộc quét qua 6 trục sau (chi tiết tại [qa-testing-checklist.md](references/qa-testing-checklist.md)):

1. **Lớp 1 (`@happy-path`, `@persona`):** Luồng chuẩn theo phân khúc (Normal/VIP/Ultimate, tiểu khoản 1 vs 6 theo `references/securities/08-persona-matrix.md`).
2. **Lớp 2 (`@boundary`, `@bva`):** Phân tích 4 điểm biên: Biên giá (Sàn - 1, Sàn, TC, Trần, Trần + 1, Tick size); Biên KL (0, lẻ 1-99, chẵn 100, sai bước, MAX, MAX + 100); Hạn mức kết nối (`MAX_CONNECTOR`, `MAX_STREAM`, +1).
3. **Lớp 3 (`@domain-matrix`):** Tổ hợp: Sàn (HOSE/HNX/UPCoM/Phái sinh) × Phiên (ATO/Liên tục/ATC/PLO/Nghỉ) × Trạng thái mã (Normal/CR/CA/RES/SUS). Tham số hóa qua `Scenario Outline` + `Examples`.
4. **Lớp 4 (`@negative`):** Thiếu/sai dữ liệu (null, chuỗi rỗng, số âm); Vi phạm quyền (hết hạn token, IDOR chéo user); Vi phạm nghiệp vụ (lệnh MTL cho mã cảnh báo, sửa/hủy trong ATO/ATC).
5. **Lớp 5 (`@state-concurrency`):** Chuyển đổi trạng thái sai (hủy lệnh Filled, sửa lệnh Cancelled); Concurrency (2 lệnh mua cùng vét sức mua); Idempotency trùng lặp.
6. **Lớp 6 (`@resilience`):** Mất kết nối WS đột ngột, reconnect tự động, Watchdog topic timeout, SLA vượt ngưỡng.

## 2. Quy trình 3 Giai đoạn Thiết kế

> 📖 **ĐỌC NGAY TRƯỚC KHI BẮT ĐẦU:** [quick-start-checklist.md](references/quick-start-checklist.md) — Tờ nhắc ≤ 40 dòng cho toàn bộ quy trình.

- **Giai đoạn 1 (Phân tích Spec theo Profile & Thiết kế Checklist `checklist.md`):**
  - Đọc `workspace/issues/{issueKey}/spec/final.md` và `spec/testability-manifest.json` để xác định **Test Profile** (API, WS, UI, STATE, DATA).
  - Quét từng `[BR-xx]` và `[AC-x.y]` qua **Ma trận 6 Trục Bao phủ** để không bỏ sót kịch bản.
  - Ghi nhận Test Profile đã chọn vào dòng đầu của `checklist.md`:
    ```markdown
    <!-- TEST_PROFILE: QA-PROFILE-API | QA-PROFILE-WS | QA-PROFILE-UI | QA-PROFILE-STATE | QA-PROFILE-DATA -->
    ```
  - Gán nhãn ưu tiên `[P0]`, `[P1]`, `[P2]` và **gán ID ổn định** (VD: `CL-001`). Mỗi item bắt đầu bằng **động từ hành động**, lượng hóa rõ ràng.
  - *Quy tắc ưu tiên:*
    - `[P0]`: Boundary BVA + Security + giao dịch tiền/cổ phiếu + Race Condition
    - `[P1]`: Happy path chính + Negative scenario ảnh hưởng UX
    - `[P2]`: Nice-to-have, tính năng phụ, resilience không critical

- **Giai đoạn 1.5 (Data Grounding):**
  - Đọc file [data-grounding.md](references/data-grounding.md) để hiểu quy trình.
  - Liệt kê các dữ liệu định danh cần cho test (VD: số tài khoản, mã CK, mã order).
  - Sử dụng các Tool Call để lấy dữ liệu có THẬT từ UAT (qua DB/Metabase hoặc API).
  - Ghi thông tin dữ liệu đã verify vào `workspace/issues/{issueKey}/test/fixtures/data-grounding.json`.
  - **Nhận diện & chuẩn bị cho Data Accuracy Verification (nếu task yêu cầu):**
    - Trigger khi Jira có keyword: `"chính xác"`, `"trúng khớp"`, `"match"`, `"consistency"`, `"so sánh"`, `"verify data"`.
    - BẮT BUỘC tra cứu sẵn **giá trị reference** từ Metabase UAT cho từng field cần verify.
    - Ghi reference value vào `data-grounding.json` với `"kind": "accuracy-reference"`.
    - Thiết kế nhóm kịch bản `@data-accuracy` trong checklist và feature (mẫu tại [quick-start-checklist.md Bước 3.5](references/quick-start-checklist.md)).

- **Giai đoạn 2 (Thiết kế Kịch bản BDD Gherkin `{issueKey}.feature`):**
  - Viết duy nhất 1 file `.feature` ánh xạ 1-1 từ checklist.
  - Gắn tag **`@CL-xxx`** tương ứng với ID checklist.
  - Ngôn ngữ miền nghiệp vụ thuần túy — **cấm tuyệt đối** biến code, XPath, SQL, `.env` keys.
  - Dùng ranh giới tượng trưng: `TAI_HAN_MUC`, `VUOT_HAN_MUC`, `TRONG_NGUONG`.
  - **Tham số hóa Đa sàn / Đa mã:** Khi kiểm thử tính năng liên quan đến từ 2 sàn hoặc 2 mã chứng khoán có đặc thù phiên/khung giờ/topic khác nhau, **BẮT BUỘC** sử dụng `Scenario Outline` kèm bảng `Examples` tham số hóa. **CẤM TUYỆT ĐỐI** gộp chung.
  - **GraphQL Task — BẮT BUỘC thiết kế đủ 4 nhóm kịch bản tham số query:**
    1. `@graphql-full-query` — Gửi query với đầy đủ tất cả fields/arguments theo spec Jira.
    2. `@graphql-partial-query` — Gửi query với tập field tối giản (bỏ optional fields).
    3. `@graphql-no-query` — Gửi body rỗng, `query=""`, hoặc thiếu trường `query` hoàn toàn.
    4. `@graphql-invalid-query` — Gửi query sai syntax, sai tên field, sai kiểu dữ liệu argument.
    - **Tham khảo mẫu:** [gherkin-patterns.md Section 9](references/gherkin-patterns.md#9-graphql-api--tham-s%E1%BB%91-query-full--partial--empty--invalid).
    - **QUY TẮC `Then` — Tuyệt đối không được tự suy diễn kết quả:** Nội dung `Then` phải lấy **nguyên văn** từ Acceptance Criteria hoặc mô tả task Jira. Nếu Jira không mô tả rõ expected value → đánh dấu `# NEEDS-SPEC` và dừng, không tự đưa ra giá trị mặc định.
  - Gắn thẻ bắt buộc: `@smoke` hoặc `@regression`, `@happy-path` hoặc `@negative` hoặc `@edge-case`, `@JIRA-{issueKey}`, `@domain-securities`.

- **Giai đoạn 3 (GATE: Xác minh, Linter & Bàn giao):**
  1. *Kiểm tra Cú pháp & Traceability:*
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/scripts/qa/qa-validate.js --checklist workspace/issues/{issueKey}/test/checklist.md "workspace/issues/{issueKey}/test/{issueKey}.feature"
     ```
  2. *Kiểm tra Quy tắc Nghiệp vụ Chứng khoán (Domain Linter):*
     ```bash
     node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js lintDomainGherkin "{\"issueKey\":\"{issueKey}\",\"gherkinContent\":$(node -e 'console.log(JSON.stringify(require(\"fs\").readFileSync(\"workspace/issues/{issueKey}/test/{issueKey}.feature\", \"utf8\"))')}"
     ```
  3. Ghi kết quả ma trận traceability ra `workspace/issues/{issueKey}/trace/matrix.md`.
  4. Ghi trạng thái và SHA256 của feature file vào `workspace/issues/{issueKey}/.pipeline-state.json`.
  5. Tự sửa lỗi (≤ 3 vòng) nếu không qua linter. Sau khi pass, bàn giao cho `qa-auto-design`.

## ⚡ Quy Tắc Output File (Output File Rules — Bắt buộc tuân thủ)

> 📌 **1 skill call = 1 lần ghi file. Gọi lại skill → ghi đè hoàn toàn file cũ.**

| File Output | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Checklist kiểm thử | `workspace/issues/{issueKey}/test/checklist.md` | **Ghi đè** toàn bộ nội dung cũ |
| Kịch bản BDD Gherkin | `workspace/issues/{issueKey}/test/{issueKey}.feature` | **Ghi đè** toàn bộ nội dung cũ |

**Quy tắc:**
- **KHÔNG** tạo file mới với suffix (checklist-v2.md, STK-101-new.feature, ...).
- **KHÔNG** append vào file cũ — luôn overwrite hoàn toàn.
- Nếu file chưa tồn tại → tạo mới tại đúng đường dẫn trên.
- Nếu file đã tồn tại → ghi đè không cần xác nhận.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)

- 🚀 **BẮT BUỘC ĐỌC TRƯỚC:**
  - [quick-start-checklist.md](references/quick-start-checklist.md): Tờ nhắc quy trình ≤ 40 dòng.

- 🛠️ **Công cụ & Script (assets/):**
  - [qa-init.sh](assets/qa-init.sh): Khởi tạo thư mục và triển khai fixtures lắp ghép theo loại task (`--type=api,ws,web_ui,mobile`).
  - [qa-validate.sh](assets/qa-validate.sh): Script thẩm định cú pháp file Gherkin (6 quy tắc cứng).

- 📖 **Tài liệu quy trình & Kỹ thuật (references/):**
  - [data-grounding.md](references/data-grounding.md): Quy trình Grounding dữ liệu thật UAT.
  - [workflow.md](references/workflow.md): 7 Nguyên Tắc Vàng, Anti-patterns, Verification checklist.
  - [qa-testing-checklist.md](references/qa-testing-checklist.md): Kỹ thuật BVA, EP, mẫu kịch bản theo domain.
  - [gherkin-patterns.md](references/gherkin-patterns.md): Mẫu Gherkin chuẩn cho từng loại task (API, WS, Web UI, Securities).
  - [securities-domain-rules.md](../../../../references/securities-domain-rules.md): Cẩm nang nghiệp vụ chứng khoán.

## 4. Ví dụ mẫu (Few-shot Example)

> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

**Input:** Yêu cầu: "Kiểm tra giới hạn đặt lệnh tối đa 500,000 cổ phiếu/lệnh trên sàn HOSE"

**Output Giai đoạn 1 — checklist.md (trích):**
```markdown
## Ranh giới [P0]
- [P0] CL-001 Xác minh hệ thống TỪ CHỐI lệnh mua khi khối lượng = 500,001 cổ phiếu (VUOT_HAN_MUC) trên sàn HOSE
- [P0] CL-002 Xác minh hệ thống CHẤP NHẬN lệnh mua khi khối lượng = 500,000 cổ phiếu (TAI_HAN_MUC) trên sàn HOSE
- [P1] CL-003 Xác minh hệ thống CHẤP NHẬN lệnh mua khi khối lượng = 499,900 cổ phiếu (DUOI_HAN_MUC) trên sàn HOSE
```

**Output Giai đoạn 2 — STK-101.feature (trích):**
```gherkin
@regression @boundary @domain-securities @JIRA-STK-101 @CL-001
Scenario: Từ chối đặt lệnh mua khi khối lượng vượt hạn mức sàn HOSE
  Given Nhà đầu tư đã đăng nhập vào tài khoản giao dịch tiểu khoản đuôi 1
  And Số dư tiền mặt khả dụng đáp ứng đủ giá trị lệnh
  When Nhà đầu tư gửi lệnh mua cổ phiếu "VND" với khối lượng "VUOT_HAN_MUC_SAN"
  Then Hệ thống từ chối nhận lệnh và trả về thông báo lỗi "Khối lượng vượt quá 500,000 cổ phiếu"
```

---
