# Quick-Start Checklist — qa-test-design

> **Mục đích:** Tờ nhắc cực ngắn. Đọc trước khi bắt đầu thiết kế test.
> Xem chi tiết kỹ thuật tại `references/workflow.md` và `references/qa-testing-checklist.md` khi cần.

---

## ⚠️ RANH GIỚI NHIỆM VỤ — Chỉ thiết kế artifacts, KHÔNG viết code test

| ✅ LÀM | ❌ KHÔNG LÀM |
|---|---|
| Thiết kế checklist.md + .feature | Viết conftest.py, test_*.py, services/ |
| Chạy qa-validate.sh (cú pháp Gherkin) | Chạy test thực sự hoặc debug hệ thống |
| Bàn giao cho qa-auto-design | Tự động push Squash TM (→ dùng qa-squash-push) |

---

## BƯỚC 0 — Kiểm Tra Đầu Vào (30 giây)

```bash
# Kiểm tra spec đã tồn tại chưa
ls workspace/issues/{issueKey}/spec/final.md
```

Nếu chưa có spec → Dừng, yêu cầu dùng `ba-spec` hoặc `ba-interview-me` trước.

---

## BƯỚC 1 — Khởi Tạo Thư Mục (tự động)

```bash
bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-test-design/assets/qa-init.sh {issueKey} --type=api,ws
```

Tạo sẵn: `test/conftest.py`, `test/fixtures/` (nạp fixtures lắp ghép theo type), `test/steps/` và `test/result/`

---

## BƯỚC 2 — Đọc Spec & Nhận Diện Domain

- Đọc `workspace/issues/{issueKey}/spec/final.md`
- Nếu domain **chứng khoán/fintech** → đọc thêm `references/securities-domain-rules.md`
- Xác định loại task:

| Spec mô tả gì? | Kỹ thuật áp dụng |
|---|---|
| Giới hạn số, khối lượng, giá | BVA 3 giá trị (dưới/tại/trên biên) |
| Phân loại đầu vào (loại tài khoản, loại lệnh) | Equivalence Partitioning (EP) |
| Luồng nghiệp vụ nhiều bước | State Transition Testing |
| Quy tắc kết hợp (VD: tier × quota) | Decision Table |

### ⚠️ Nhận Diện Loại API (BẮT BUỘC trước khi viết checklist)

Xác định rõ loại API từ spec Jira theo bảng dưới. Sai loại → checklist thiếu nhóm test.

| Dấu hiệu nhận diện trong Jira/Spec | Loại API | Tag Gherkin bắt buộc | Nhóm kịch bản bắt buộc |
|---|:---:|---|---|
| Mô tả `GET/POST/PUT/DELETE`, `endpoint`, `HTTP status`, `Request Body`, `Response JSON`, `curl` | **REST API** | `@api @rest` | Happy path, Negative (4xx/5xx), Security (auth), BVA (input params) |
| Mô tả `query { }`, `mutation { }`, `GraphQL`, `operation`, `selection set`, `__schema`, `variables` | **GraphQL** | `@api @graphql` | Full query, Partial query, Empty/No query, Invalid query (4 nhóm bắt buộc) |
| Mô tả `WebSocket`, `subscribe`, `event`, `stream`, `channel`, `msgpack` | **WebSocket** | `@websocket` | Connect/Auth, Event payload, Disconnect, Data isolation |
| Mô tả cả REST lấn GraphQL trong cùng task | **Mixed** | `@api @rest @graphql` | Bắt buộc cover đủ nhóm kịch bản của cả 2 loại |

**Cách nhận diện nhanh — scan keyword trong Jira description:**
```
REST  : "endpoint", "status code", "curl", "Request Body", "HTTP"
GraphQL: "query {", "mutation {", "graphql", "operation name", "variables", "__typename"
WS    : "subscribe", "event", "channel", "stream", "disconnect"
```

> ℹ️ **Nếu không xác định được loại:** Hỏi user trước khi tiếp tục. Đây là Critical Input — sai loại sẽ dẫn đến thiết kế test sai toàn bộ.

---

## BƯỚC 3 — Thiết Kế `checklist.md`

Phân bổ vào **6 chiều** (mỗi item: động từ hành động + lượng hóa + nhãn P0/P1/P2):

```markdown
## Bảo mật [P0]
- [P0] Xác minh hệ thống từ chối khi thiếu header xác thực

## Quy tắc nghiệp vụ [P0]
- [P0] Xác minh <rule cụ thể từ spec>

## Toàn vẹn dữ liệu [P1]
- [P1] Xác minh response schema đúng cấu trúc JSON định nghĩa

## Đường dẫn chuẩn (Happy Path) [P0]
- [P0] Xác minh <luồng chính thành công>

## Ngoại lệ & Lỗi [P1]
- [P1] Xác minh <xử lý lỗi cụ thể>

## Ranh giới BVA [P0/P1]
- [P0] Xác minh tại biên trên (TAI_HAN_MUC): <giá trị>
- [P0] Xác minh vượt biên trên (VUOT_HAN_MUC): <giá trị>
- [P1] Xác minh dưới biên trên (DUOI_HAN_MUC): <giá trị>
```

---

## BƯỚC 3.5 — Data Grounding

- Xác định các loại **(a) Dữ liệu định danh/precondition** cần thiết (account, symbol, orderId...).
- Truy vấn lấy giá trị thật từ UAT theo chuỗi ưu tiên (n8n `getSecuritiesFixture`, Metabase SQL `metabaseRunSql`, API GET).
- Zero-mutation: TUYỆT ĐỐI không gọi các lệnh thay đổi dữ liệu (POST, UPDATE, DELETE).
- Lưu kết quả vào `workspace/issues/{issueKey}/test/fixtures/data-grounding.json`.
- Ghi chú: Nếu timeout/lỗi, chuyển sang fallback và nhớ gắn nhãn `[DATA-ASSUMED]` khi viết Gherkin ở Bước 4.

### ⚠️ Verify Tính Chính Xác Dữ Liệu Response (Response Data Accuracy — BẮT BUỘC khi Jira yêu cầu)

Nhận diện task cần verify data accuracy khi Jira có bất kỳ từ khóa nào:
`"chính xác"`, `"trúng khớp"`, `"consistency"`, `"so sánh"`, `"match"`, `"dữ liệu đúng"`, `"verify data"`

Khi nhận diện → BẮT BUỘC thiết kế thêm nhóm kịch bản `@data-accuracy` trong checklist và feature:

```markdown
## Toàn vẹn dữ liệu [P0] — Data Accuracy
- [P0] Xác minh từng trường dữ liệu trong response API khớp với giá trị tương ứng trong Metabase UAT
- [P0] Xác minh không có trường nào trong response bị null/thiếu khi Metabase UAT có giá trị
- [P1] Xác minh dữ liệu mới nhất (freshness) — response khớp record mới nhất từ Metabase
```

Muốn Gherkin mẫu → xem [gherkin-patterns.md Section 10](gherkin-patterns.md#10-verify-data-accuracy-so-s%C3%A1nh-response-api-v%E1%BB%9Bi-metabase-uat).

---

## BƯỚC 4 — Viết `{issueKey}.feature`

**Quy tắc cứng khi viết Gherkin:**

- [ ] Đúng 1 khối `Feature:` duy nhất per file
- [ ] Feature có 3 dòng User Story (`As a / I want / So that`)
- [ ] Mỗi Scenario có tags trước dòng `Scenario:`
- [ ] Tags bắt buộc: `@JIRA-{issueKey}` + 1 trong `@smoke/@regression` + 1 trong `@happy-path/@negative/@edge-case`
- [ ] Không có từ kỹ thuật: `xpath`, `css`, `SQL`, `url`, `.env`, `os.getenv`
- [ ] Dùng ranh giới tượng trưng: `"VUOT_HAN_MUC"` không phải `"500001"`
- [ ] Không quá 10 steps / Scenario
- [ ] Không lặp chu kỳ Given → When → Then → **Given** (vi phạm GWT order)

Tham khảo mẫu theo task type: [gherkin-patterns.md](gherkin-patterns.md)

---

## BƯỚC 5 — Xác Minh Cú Pháp & Bàn Giao

```bash
bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-test-design/assets/qa-validate.sh \
  "workspace/issues/{issueKey}/test/{issueKey}.feature"
```

✅ **`"status": "pass"`** → Gợi ý chạy `/qa-auto-design {issueKey}`
❌ **`"status": "fail"`** → Đọc `failures[]`, tự sửa, chạy lại (tối đa 3 vòng)
