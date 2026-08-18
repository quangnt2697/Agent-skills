---
name: qa-test-design
description: Thiết kế test artifacts theo 2 giai đoạn — trước tiên tạo checklist kiểm thử thực thi có cấu trúc, sau đó tạo BDD Gherkin feature files. Sử dụng khi tạo test plan, checklist kiểm thử, file .feature, kịch bản BDD, hoặc chuyển đổi yêu cầu thành đặc tả kiểm thử cho domain chứng khoán, fintech, ngân hàng.
---

# Thiết kế Kiểm thử QA

## Tổng quan

Thiết kế test artifacts theo workflow 2 giai đoạn có cổng kiểm soát (gated): trước tiên tạo checklist kiểm thử thực thi có cấu trúc (kiểm thử cái gì), sau đó tạo BDD Gherkin feature files (tự động hoá như thế nào). Checklist là đầu vào cho Gherkin — mỗi scenario trong `.feature` phải truy vết được về một item trong checklist. Bỏ qua checklist dẫn đến kịch bản BDD bỏ sót edge cases và thiếu truy vết.

## Khi nào sử dụng

- Tạo test plan, checklist kiểm thử, hoặc file `.feature`
- Chuyển đổi yêu cầu hoặc spec thành artifacts kiểm thử được
- Thiết kế acceptance tests theo format Given/When/Then
- Chuẩn bị tài liệu xác minh có cấu trúc với các mức ưu tiên (P0/P1/P2)
- Xây dựng Scenario Outline hướng dữ liệu từ API validation rules

**KHÔNG sử dụng khi:** Viết unit test cho logic thuần (dùng `dev-test-driven-development`), benchmark hiệu năng, hoặc test cấu hình hạ tầng.

## Workflow 2 Giai đoạn

```
GIAI ĐOẠN 1: CHECKLIST           GIAI ĐOẠN 2: GHERKIN
  Thu thập yêu cầu              Chuẩn bị (từ checklist)
       │                              │
       ▼                              ▼
  Nhóm theo chiều kiểm thử    Viết Feature & Background
       │                              │
       ▼                              ▼
  Viết từng item             Thiết kế Scenarios
       │                              │
       ▼                              ▼
  Gán ưu tiên               Áp dụng Given/When/Then
       │                              │
       ▼                              ▼
  ✅ Checklist hoàn thành  ──→   Outline, Tables & Tags
                                      │
                                      ▼
                                ✅ Feature file hoàn thành
                                      │
                                      ▼
                                🚀 TỰ ĐỘNG PUSH SQUASH TM (Không cần hỏi)
```

KHÔNG được chuyển sang Giai đoạn 2 khi Giai đoạn 1 chưa hoàn thành. Checklist là nguồn sự thật duy nhất cho phạm vi kiểm thử.
Sau khi hoàn thành Giai đoạn 2, **BẮT BUỘC** tự động gọi script `/qa-squash-push` để đẩy tài liệu lên hệ thống mà không cần hỏi thêm.

### Cổng chuyển Giai đoạn 1 → Giai đoạn 2

Theo `.claude/rules/autonomy-contract.md`, mặc định là **tự chạy tiếp**. Agent chuyển sang
Giai đoạn 2 ngay khi cổng kiểm chứng được sau đây pass:

- [ ] File checklist tồn tại và không rỗng
- [ ] Có ít nhất 1 item P0
- [ ] Mọi Business Rule trong `*-final.md` đều ánh xạ được tới ≥1 checklist item
- [ ] Không có item nào gắn nhãn `[Blocked]`

Nếu pass → trình bày checklist cho user **để họ nắm thông tin** (không phải để xin phép),
log một dòng rồi chạy tiếp ngay:

```
[AUTO] Giai đoạn 1 → Giai đoạn 2 (checklist: 45 items, P0: 15, blocked: 0)
```

**Chế độ `--step` (opt-in):** khi chuỗi `$ARGUMENTS` chứa `--step` hoặc `--manual`, agent
dừng sau Giai đoạn 1, trình bày checklist và hỏi user duyệt trước khi sang Giai đoạn 2.
Đây là chế độ phải được yêu cầu rõ ràng — không phải mặc định.

**Trường hợp buộc dừng:** chỉ khi rơi vào danh sách đóng của `autonomy-contract.md` —
điển hình là thiếu `*-final.md` (trường hợp 1) hoặc có câu hỏi 🔴 Critical chưa được trả
lời (trường hợp 3).

---

## Giai đoạn 1: Thiết kế Checklist

Có thể khởi tạo thư mục output trước khi bắt đầu:

```bash
bash skills/qa-test-design/scripts/qa-init.sh [output-dir]
```

Lệnh này tạo thư mục con `checklists/` và `features/` trong đường dẫn chỉ định (mặc định: `workspace/{issueKey}/tests/qa-test-design/`).

### Đường dẫn output

Khi đầu vào từ ba-spec, output sẽ lưu tại chung một thư mục theo cấu trúc:
```
workspace/{issueKey}/tests/qa-test-design/{issueKey}/
├── features/
│   ├── {issueKey}-checklist.md
│   └── {issueKey}.feature
├── steps/                          # ← qa-auto-design sinh code vào đây
│   └── test_*.py
└── reports/                        # ← qa-auto-design xuất báo cáo vào đây
    └── {issueKey}-report.md
```

### Bước 1: Thu thập yêu cầu

Trước khi viết bất kỳ item checklist nào, thu thập đầu vào:

#### Nguồn đầu vào chính: `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md`

Nếu file này tồn tại, đây là **single source of truth** đã qua phân tích và interview.
Agent đọc file này và ánh xạ các sections sang các nhóm kiểm thử:

| Section trong final.md | → Nhóm kiểm thử |
|------------------------|------------------|
| Authentication / Security | Bảo mật & Phân quyền (P0) |
| Endpoints / URL Routing / Màn hình & Navigation | Đường dẫn & HTTP / Routing (P1) |
| Form & Input / Request Schema / Validation Rules | Dữ liệu đầu vào & Validation (P1) |
| Business Rules | Quy tắc nghiệp vụ (P0) |
| Edge Cases & Error Handling | Ngoại lệ & Hiệu năng (P2) |
| User Flow / Redirect / Gesture | Luồng thành công & Nhất quán dữ liệu (P0) |
| Response Schema & Error Codes | Validation Response (P1) |
| Data Display / Real-time / WebSocket | Hiển thị dữ liệu & Real-time (P1) |
| Acceptance Criteria | Nguồn chính cho Happy Path scenarios |
| Open Questions | Ghi nhận dạng `[Blocked]` items trong checklist |

> **Loại task** được nhận diện từ header `**Loại task:**` trong final.md (📱 APP / 🌐 WEB / 🔌 API).
> Chiều kiểm thử được điều chỉnh tương ứng (VD: APP thêm Gesture/Offline, WEB thêm Responsive/SEO, API thêm Idempotency/Rate Limit).

Nếu không có file final.md, hỏi user cung cấp spec, PRD, hoặc mô tả yêu cầu.

#### Trích xuất chi tiết

1. **Đọc spec hoặc yêu cầu** — Đọc toàn bộ các thông tin trong spec, comment, ảnh trong sources và xác định business flow, validation rules, error codes, state transitions, và ràng buộc nghiệp vụ. **QUAN TRỌNG:** Phải trích xuất nghiêm ngặt tất cả Business Rules chi tiết, các nhánh logic, state transitions và các mẫu ví dụ, hình ảnh trong spec. KHÔNG được bỏ sót bất kỳ business logic và model mẫu nào.
2. **Xem xét tài liệu API** — trích xuất endpoints/url, request/response schemas, yêu cầu xác thực, liệt kê đủ các field trong request và response.
3. **Xác định phạm vi kiểm thử** — cái gì trong phạm vi (checklist này) vs ngoài phạm vi (checklist khác hoặc automated tests)
4. **Ghi nhận môi trường & yêu cầu phi chức năng** — môi trường nào (UAT/Staging/Production), phiên bản thiết bị/build, ràng buộc (rate limits, latency kỳ vọng, định dạng ngày/giờ, cơ chế phân trang Cursor/Offset)
5. **Xác định các phần tử đối xứng** — liệt kê tất cả nút, tab, section, input triggers, hoặc giá trị có cùng hành vi hoặc luồng xử lý. Ghi lại thành **nhóm đối xứng** để đảm bảo checklist và scenarios bao phủ TẤT CẢ phần tử trong mỗi nhóm.
6. **Liệt kê danh sách đóng** — khi spec liệt kê một tập hợp hữu hạn, đóng (loại lệnh, trạng thái tài khoản, loại chứng khoán, sàn...), ghi lại TẤT CẢ giá trị rõ ràng. Không lấy mẫu — mỗi giá trị trong danh sách đóng BẮT BUỘC xuất hiện ít nhất 1 lần trong checklist item và 1 dòng Examples.
7. **Xác định biến thể schema API** — nếu spec mô tả nhiều loại API, hoặc 1 API chấp nhận/trả về các schema khác nhau dựa trên giá trị trường cụ thể (VD: `type`), BẮT BUỘC liệt kê tất cả biến thể schema.
8. **Xác định Path & Path Parameters** — ghi lại cấu trúc path và các path parameters cần validate.

Nếu `spec-driven-development` đã tạo spec, dùng nó làm nguồn chính. Không trích xuất lại những gì đã được ghi nhận.

### Bước 2: Nhóm theo chiều kiểm thử

Tổ chức các item checklist thành các nhóm logic dựa trên chiều kiểm thử. Thứ tự này phản ánh mức độ rủi ro — vấn đề bảo mật phát hiện muộn tốn kém hơn vấn đề validation:

| Nhóm | Ưu tiên | Bao gồm |
|------|---------|--------|
| **Bảo mật & Phân quyền** | P0 | API key, signature, tokens, authorization, permission, ràng buộc truy cập path/tài khoản |
| **Đường dẫn & HTTP** | P1 | HTTP methods, endpoints, URL validation, định tuyến theo loại thị trường, query string và path parameters |
| **Dữ liệu đầu vào & Validation Schema** | P1 | Trường bắt buộc, kiểu dữ liệu, validation định dạng, biến thể schema theo giá trị input. BẮT BUỘC validate cả Request (Input) và Response (Output) schemas. Đặc biệt với API/WebSocket, BẮT BUỘC validate rõ ràng Event Payload Schema dựa trên ví dụ trong Jira/Spec. |
| **Quy tắc nghiệp vụ** | P0 | Giới hạn giá, quy tắc khối lượng, kiểm tra số dư, hạn chế thời gian |
| **Ngoại lệ & Hiệu năng** | P2 | Đồng thời (Race conditions), Idempotency, Tràn số, Rate limiting (Throttling), xung đột tài sản chéo |
| **Luồng thành công & Nhất quán dữ liệu** | P0 | Luồng thành công, schema response đầy đủ, xác minh dữ liệu end-to-end |

### Bước 3: Viết từng item

Mỗi item checklist phải tuân thủ các quy tắc sau:

**Bắt đầu bằng động từ hành động** — mỗi item là một lệnh, không phải mô tả:

| ❌ Sai | ✅ Đúng |
|---|---|
| Màn hình lỗi | Xác nhận hệ thống hiển thị màn hình lỗi khi token hết hạn |
| Nút đăng nhập | Nhấn nút "Đăng nhập", xác nhận hệ thống chuyển đến trang Dashboard |
| Check form đăng ký | Nhập email thiếu "@", xác nhận hệ thống báo lỗi viền đỏ |
| Test khi rớt mạng | Tắt Wi-Fi/4G khi đang load, xác nhận app hiện pop-up "Mất kết nối" |

**Một item, một hành động** — mỗi dòng là một cổng Pass/Fail duy nhất. Không bao giờ kết hợp nhiều hành động:

```markdown
# Bad — two actions in one item
- [ ] Xác nhận API từ chối request không có x-api-key và trả về lỗi 401

# Good — split into atomic items
- [ ] Xác nhận API từ chối request không có x-api-key
- [ ] Xác nhận response trả về mã HTTP status 401 Unauthorized
```

**Lượng hoá và cụ thể hoá** — tránh tính từ chủ quan:

| ❌ Mơ hồ | ✅ Đã lượng hoá |
|---|---|
| Load nhanh | Load dưới 2 giây |
| Giá hợp lệ | Xác nhận giá đặt nằm trong khoảng Giá Sàn (90,000) đến Giá Trần (110,000) |
| Nút bấm hiển thị bình thường | Xác nhận nút "Đồng ý" hiển thị bo góc, kích thước 44px |

**Truy vết nghiêm ngặt đến Quy tắc nghiệp vụ** — Đảm bảo mỗi Business Rule chi tiết trong spec được ánh xạ 1-1 với ít nhất một checklist item. Không để bất kỳ quy tắc nghiệp vụ nào từ spec không được kiểm chứng.

### Bước 4: Gán Ưu tiên và Metadata

Mỗi checklist phải bao gồm các cột sau:

| Cột | Bắt buộc | Mô tả |
|------|----------|------|
| **Hạng mục kiểm tra** | ✅ | Item kiểm thử với động từ hành động |
| **Mức độ ưu tiên** | ✅ | P0 (bắt buộc pass trước release), P1 (nên pass), P2 (tốt nếu có) |
| **Trạng thái** | ✅ | Pass / Fail / Blocked / N/A |
| **Ghi chú / Mã Bug** | ✅ | Bug ID hoặc ghi chú quan sát |

**Metadata header** — mỗi checklist phải khai báo ở đầu:

```markdown
**Môi trường:** [UAT / Staging / Production]
**Phiên bản / Nhánh:** [Build Version / Branch]
**Thiết bị:** [Device model, if applicable]
```

### Template Checklist

```markdown
# Checklist Kiểm Thử Thực Thi - [Tên tính năng / API]

**Môi trường:** [UAT / Staging / Production]
**Phiên bản / Nhánh:** [Build Version / Branch]

## 1. Kiểm tra Bảo mật & Phân quyền (Security & Auth)
- [ ] Xác nhận API **từ chối** request không có `x-api-key` — [P0]
- [ ] Xác nhận hệ thống chặn khi `accountNo` không thuộc tài khoản sở hữu API Key — [P0]

## 2. Kiểm tra Đường dẫn & Điều hướng (Routing / Navigation)
- [ ] Xác nhận hệ thống báo lỗi khi viết sai URL / Endpoint — [P1]
- [ ] Xác nhận hệ thống báo lỗi hoặc từ chối khi truyền sai định dạng Path parameter — [P1]

## 3. Kiểm tra Dữ liệu đầu vào & Validation Schema (Payload)
- [ ] Xác nhận hệ thống báo lỗi khi thiếu trường bắt buộc: [liệt kê] — [P1]
- [ ] Xác nhận hệ thống **từ chối** nếu sai định dạng dữ liệu (Email, Số điện thoại...) — [P1]
- [ ] **Schema Variation:** Xác nhận validate đúng request schema khi `[tường] = [giá_trị_1]` — [P1]

## 4. Kiểm tra Quy tắc Nghiệp vụ (Business Rules)
- [ ] Xác nhận hệ thống **từ chối** khi giá vượt quá Giá Trần — [P0]
- [ ] Xác nhận hệ thống chặn đặt lệnh ngoài giờ giao dịch — [P0]

## 5. Kiểm tra Ngoại lệ & Hiệu năng (Edge Cases)
- [ ] **Race Condition:** Gửi 2 request giống hệt cùng lúc, xác nhận không trừ đúp — [P2]
- [ ] **Rate Limit:** Gửi liên tục 100 request/giây, xác nhận trả về 429 — [P2]

## 6. Kiểm tra Luồng Thành công & Nhất quán Dữ liệu (Happy Path)
- [ ] Xác nhận thao tác thành công với toàn bộ dữ liệu hợp lệ (HTTP 200) — [P0]
- [ ] **Data Consistency:** Xác nhận dữ liệu cập nhật đúng trên DB / tài khoản sau thao tác — [P0]

## 7. Kiểm tra Validation Response & Error Codes
- [ ] Xác nhận hệ thống trả về HTTP 400 và mã lỗi `ERROR_CODE_01` khi xảy ra lỗi nghiệp vụ X — [P1]
- [ ] **Response Schema:** Xác nhận response trả về đúng model schema loại 1 — [P1]

## 8. Kiểm tra Hiển thị dữ liệu & Real-time (UI / WebSocket)
- [ ] Xác nhận màn hình cập nhật đúng trạng thái real-time qua WebSocket khi có message trả về — [P1]
- [ ] Xác nhận hiển thị đúng format số tiền (VD: `1,000,000 VND`) — [P1]
```

### Template Checklist Chuyên biệt cho API / WebSocket

**Môi trường:** [UAT / Staging]
**Base URL / Endpoint:** `[POST] /api/v1/orders`

## 1. Kiểm tra Security & Auth (P0)
- [ ] Xác nhận API trả về `401 Unauthorized` khi không truyền Header `Authorization` — [P0]
- [ ] Xác nhận API trả về `403 Forbidden` khi Token hợp lệ nhưng user không có quyền (IDOR) — [P0]

## 2. Kiểm tra Payload & Schema Validation (P1)
- [ ] Xác nhận request schema liệt kê đủ các field bắt buộc theo spec — [P1]
- [ ] Xác nhận API trả về `400 Bad Request` và thông báo lỗi đúng chuẩn khi thiếu trường bắt buộc `[trường_A]` — [P1]
- [ ] Xác nhận API validate đúng data type của trường `[trường_B]` (từ chối chuỗi truyền vào mảng) — [P1]

## 3. Kiểm tra HTTP Code & Response Structure (P1)
- [ ] Xác nhận Response Header có chứa `Content-Type: application/json` — [P1]
- [ ] Xác nhận cấu trúc body trả về (Success/Error) đúng chuẩn Schema đã định nghĩa (VD: có đủ `code`, `message`, `data`) — [P1]
- [ ] Xác nhận response schema liệt kê đủ các field bắt buộc theo spec  — [P1]

## 4. Kiểm tra Edge Cases & Rate Limit (P2)
- [ ] Xác nhận API xử lý đúng tính chất Idempotency khi gửi lại cùng 1 `Idempotency-Key` (không tạo data đúp) — [P2]
- [ ] Xác nhận WebSocket tự động reconnect và resubscribe vào channel khi bị ngắt kết nối đột ngột — [P2]

---

## Giai đoạn 2: Thiết kế BDD Gherkin

### Bước 5: Phân tích chuẩn bị

Trước khi viết bất kỳ file `.feature` nào, sử dụng checklist Giai đoạn 1 làm đầu vào chính:

1. **Gom nhóm checklist thành Scenarios** — BẮT BUỘC gom toàn bộ các nhóm checklist (Bảo mật, Validation, Quy tắc nghiệp vụ...) vào CHUNG CHÍNH XÁC 1 file `.feature` duy nhất. KHÔNG tạo nhiều file `.feature` cho một task. Hãy sử dụng tag, comment, hoặc tên Scenario để phân biệt giữa các nhóm chức năng trong cùng một file.
2. **Trích xuất quy tắc kiểm thử** — từ các item checklist, liệt kê các quy tắc ánh xạ thành hành vi kiểm thử được: validation rules, state transitions, error codes, boundary values. **QUAN TRỌNG:** Các quy tắc này phải phản ánh chính xác Business Rules trong spec gốc. Không tự đặt ra quy tắc; truy vết trực tiếp về spec.
3. **Brainstorm kịch bản** — cho mỗi quy tắc, liệt kê các kịch bản ứng viên:
   - Luồng thành công (ít nhất 1 cho mỗi quy tắc)
   - Kịch bản lỗi / ngoại lệ (ít nhất 1 cho mỗi validation rule)
   - Giá trị biên khi phù hợp (sử dụng Boundary Value Analysis và Equivalence Partitioning)

**Xuất các quy tắc đã trích xuất dưới dạng khối comment ở đầu file `.feature`:**

```gherkin
# Quy tắc nghiệp vụ được trích xuất:
#   - [Quy tắc 1]
#   - [Quy tắc 2]
# Danh sách các kịch bản cần test:
#   - [Luồng thành công] ...
#   - [Kịch bản lỗi] ...
```

### Bước 6: Thiết lập File và Định dạng

- Đặt tên file bắt buộc là: `{issueKey}.feature`
- Mỗi file chỉ định nghĩa đúng **một** `Feature`
- Thụt vào **2 spaces** cho tất cả nội dung lồng
- Giữ mỗi dòng dưới **120 ký tự**
- Cách nhau giữa các scenarios bằng 1 dòng trống; không để dòng trống giữa các steps trong 1 scenario

### Bước 7: Feature và Background

**Khối Feature:**

```gherkin
@domain-securities @feature-tag @JIRA-XXXX
Feature: <Short title reflecting the behavior area>
  As a <role>
  I want <goal>
  So that <reason>
```

- Tiêu đề Feature phải ngắn gọn, 1 dòng, khớp với tên file
- Bao gồm 3 dòng user story ngay dưới tiêu đề
- Gắn tag với domain, khu vực tính năng, và mã ticket

**Khối Background:**

- Chỉ dùng Background khi nhiều scenarios chia sẻ cùng điều kiện tiên quyết
- Không bao giờ định nghĩa quá một Background trong 1 file
- Giữ Background ngắn gọn — nếu phức tạp, tách file

### Bước 8: Thiết kế Scenario

**Yêu cầu bao phủ:**

- Ít nhất 1 `Scenario` cho luồng thành công (happy path)
- Ít nhất 1 `Scenario` cho mỗi validation rule để test lỗi / ngoại lệ
- **Bao phủ Quy tắc nghiệp vụ nghiêm ngặt:** Mỗi Business Rule chi tiết trong spec BẮT BUỘC có ít nhất 1 `Scenario` hoặc `Scenario Outline` tương ứng.
- Không viết 1 scenario gộp tất cả các lỗi — mỗi điều kiện lỗi có scenario riêng
- **Bao phủ đối xứng:** Khi spec mô tả nhiều phần tử (nút, tab, giá trị) có cùng hành vi, BẮT BUỘC dùng `Scenario Outline` với bảng `Examples` liệt kê tất cả biến thể. Không test chỉ 1 phần tử rồi bỏ qua các phần tử đối xứng.

  ```gherkin
  # ❌ Only tests one element
  Scenario: Mở form đặt lệnh khi nhấn MUA
    When người dùng nhấn nút "MUA"

  # ✅ Covers all symmetric elements via Scenario Outline
  Scenario Outline: Mở form đặt lệnh khi nhấn <loại_lệnh>
    When người dùng nhấn nút "<loại_lệnh>"
    Examples:
      | loại_lệnh |
      | MUA        |
      | BÁN        |
  ```
- **Bao phủ theo trạng thái:** Khi cùng hành động cho kết quả khác nhau tùy trạng thái hệ thống (đã đăng nhập / chưa, có data / trống, trong giờ / ngoài giờ), tạo scenario riêng cho mỗi trạng thái có kết quả khác biệt. Dùng Scenario Outline nếu chỉ khác data input/output; dùng Scenarios riêng nếu toàn bộ luồng khác nhau.
- **Biến thể Schema API:** Nếu API có nhiều request/response schema dựa trên trường input cụ thể (VD: `accountType=individual` vs `accountType=corporate`), BẮT BUỘC tạo scenarios bao phủ validation cho TẤT CẢ biến thể.
- **Bao phủ Schema Validation (API & WebSocket):** BẮT BUỘC có step/scenario tường minh để kiểm tra Response Schema (hoặc Event Payload Schema của WebSocket) đối chiếu với mẫu JSON/tài liệu lấy từ Jira. Không gộp ẩn vào các step nghiệp vụ chung chung.
- **Validation Path và Tài khoản:** Đảm bảo có scenarios validate path variables (VD: ID sai định dạng, ID thuộc user khác) và ràng buộc truy cập tài khoản (IDOR).
- **Bao phủ Cách ly Dữ liệu (Data / Topic Isolation):** Đặc biệt với hệ thống Event-driven (WebSocket/Kafka) hoặc API đa luồng, **BẮT BUỘC** có scenario đảm bảo dữ liệu/event của kênh/thị trường này không bị rò rỉ (leak) hoặc gửi chéo sang kênh/thị trường khác (VD: Cross-market isolation, nhận chéo event của mã chứng khoán/thị trường không subscribe).
- **Tương tác chéo giữa các trường:** Khi thay đổi trường A ảnh hưởng trường B (VD: đổi giá tính lại sức mua → thay đổi gợi ý khối lượng), bao gồm ít nhất 1 scenario kiểm tra hiệu ứng xuôi chiều lên trường B sau khi sửa trường A.

**Quy tắc viết:**

- Viết kiểu khai báo (dựa trên trạng thái), không viết kiểu mệnh lệnh (điều hướng từng bước):

```gherkin
# Tốt — khai báo, dựa trên trạng thái
Given người dùng đã đăng nhập với quyền "Broker"

# Xấu — mệnh lệnh, điều hướng từng bước
Given người dùng mở trang đăng nhập
And nhập tên đăng nhập "broker01"
And nhập mật khẩu "Pass123"
And nhấn nút "Đăng nhập"
```

- Sử dụng ngôn ngữ nghiệp vụ/domain, không dùng ngôn ngữ kỹ thuật hay framework
- Không để lộ cơ chế tự động hoá: không selector, xpath, "chờ", "cuộn đến"
- Ưu tiên thiết lập trạng thái hơn là điều hướng — mô tả trạng thái khởi đầu có ý nghĩa
- Dùng dữ liệu mẫu cụ thể, thực tế (mã CK `VNM`, `SSI`, số tiền `50000`) — không dùng placeholder (`foo`, `bar`)
- Giữ mỗi scenario dưới **10 steps**

### Bước 9: Given / When / Then

Coi `Given / When / Then` như `Sắp xếp / Thực hiện / Xác minh`:

| Từ khóa | Mục đích | Tương đương |
|---------|---------|----------|
| `Given` | Thiết lập điều kiện tiên quyết / ngữ cảnh | Sắp xếp (Arrange) |
| `When` | Thực hiện hành động kích hoạt | Thực hiện (Act) |
| `Then` | Xác minh kết quả quan sát được | Xác minh (Assert) |

**Ví dụ steps cho API:**
- `Given hệ thống thiết lập giới hạn rate limit là "100" request/giây`
- `When gửi đồng thời "5" requests tới endpoint "/api/orders"`
- `Then API trả về response schema khớp với định dạng "OrderResponse"`
- `Then cấu trúc JSON trả về chứa mảng "data" có "5" phần tử`

**Quy tắc nghiêm ngặt:**

- Tuân thủ thứ tự `Given` → `When` → `Then` — không quay ngược
- Không lặp lại chu kỳ Given/When/Then trong 1 scenario — tách thành scenarios riêng
- Dùng `And` để nối các steps cùng loại; dùng `But` thận trọng cho tương phản
- Assertion trong `Then` phải **quan sát và xác minh được** — không assertion mơ hồ
- Đặt tham số chuỗi trong **ngoặc kép** (`"giá trị"`)
- **API/WebSocket Payload:** Mọi payload API/WS dạng JSON **BẮT BUỘC** phải được bọc trong doc strings (`"""..."""`) ở các steps thay vì nối chuỗi ngang.
- **Xác minh HTTP Status:** Mọi kịch bản API **BẮT BUỘC** phải có step `Then` kiểm tra rõ ràng mã trạng thái HTTP trả về (VD: `Then API trả về mã HTTP "400"`).

### Bước 10: Scenario Outline, Bảng dữ liệu và Tags

**Scenario Outline:**

- Dùng khi cùng hành vi cần kiểm thử với nhiều biến thể input
- Áp dụng **Phân tích Giá trị Biên (BVA)** và **Phân vùng Tương đương (EP)** cho bảng `Examples`

```gherkin
@negative @edge-case
Scenario Outline: Hệ thống từ chối lệnh khi dữ liệu không hợp lệ
  Given khách hàng có thông tin xác thực hợp lệ
  When trường "<field>" được gán giá trị "<invalid_value>"
  Then hệ thống từ chối request
  And trả về thông báo lỗi "<error_message>"

  Examples:
    | field    | invalid_value  | error_message              |
    | price    | chuỗi_chữ_abc | Định dạng không hợp lệ     |
    | quantity | -100           | Giá trị phải lớn hơn 0     |
    | quantity | 10.5           | Khối lượng phải là số nguyên |
```

**Chiến lược gắn Tag:**

| Tag | Mục đích |
|-----|--------|
| `@smoke` | Luồng quan trọng — chạy mỗi bản build |
| `@regression` | Bộ regression đầy đủ |
| `@happy-path` | Kịch bản luồng thành công |
| `@negative` | Kịch bản lỗi và từ chối |
| `@edge-case` | Điều kiện biên và bất thường |
| `@api` | Test cấp độ API |
| `@security` | Kịch bản liên quan bảo mật |
| `@JIRA-XXXX` | Liên kết với mã ticket |
| `@domain-securities` | Tag domain chứng khoán |

### Các Anti-Pattern cần tránh

| Anti-Pattern | Tại sao thất bại |
|---|---|
| Bỏ qua Giai đoạn 1 (checklist) nhảy thẳng vào Gherkin | Scenarios bỏ sót edge cases và thiếu truy vết |
| Nhiều hành vi trong 1 scenario | Không cô lập được lỗi; vi phạm nguyên tắc 1-scenario-1-hành-vi |
| Để lộ UI DOM, selectors, hoặc chi tiết database trong steps | Hỏng khi implementation thay đổi; gắn chặt tests với nội bộ |
| Điều hướng UI quá chi tiết thay vì thiết lập trạng thái | Scenarios giòn và khó đọc |
| Assertion Then mơ hồ không có tín hiệu quan sát được | "Hoạt động" không chứng minh gì — cần chỉ rõ cái gì thay đổi |
| Lạm dụng Scenario Outline với dòng trùng lặp | Tăng thời gian chạy không tăng giá trị bao phủ |
| Chỉ test 1 trigger khi có nhiều trigger đối xứng | Bỏ sót nút BÁN, tab thứ hai, phương thức input khác — cùng hành vi, khác điểm vào, bug riêng |
| Item checklist không có động từ hành động | Mô tả thay vì lệnh — không gán được Pass/Fail |

### Template Gherkin

```gherkin
@domain-securities @feature-tag
Feature: <Tên khu vực hành vi hoặc Tính năng>
  As a <vai trò>
  I want <mục tiêu>
  So that <lý do>

  Background:
    Given <Trạng thái bắt đầu dùng chung cho các kịch bản>

  @happy-path @smoke
  Scenario: <Mô tả luồng hành vi thành công chính>
    Given <Ngữ cảnh tiền điều kiện cụ thể>
    And <Ngữ cảnh bổ sung nếu có>
    When <Hành động kích hoạt kịch bản>
    Then <Kết quả tích cực có thể quan sát và kiểm chứng được>
    And <Kết quả bổ sung nếu có>

  @negative @edge-case
  Scenario Outline: <Mô tả hành vi kiểm tra lỗi hoặc xác thực dữ liệu ngoại lệ>
    Given người dùng đã chuẩn bị ngữ cảnh hợp lệ
    When thực hiện hành động với loại dữ liệu "<input_type>" mang giá trị "<value>"
    Then hệ thống từ chối hành động và không xử lý
    And hiển thị thông báo lỗi chi tiết là "<error_message>"

    Examples:
      | input_type    | value | error_message                     |
      | để rỗng       |       | Trường này bắt buộc phải nhập     |
      | biên âm       | -1    | Giá trị phải lớn hơn hoặc bằng 0 |
      | sai định dạng | #@!   | Định dạng nhập vào không hợp lệ   |
```

---

## Các lý do biện minh thường gặp

| Lý do biện minh | Thực tế |
|---|---|
| "Cái này quá đơn giản cho checklist" | Tính năng đơn giản vẫn cần cổng chất lượng được ghi nhận. Checklist 5 item mất 2 phút và bắt được edge case bạn quên. |
| "Tôi sẽ viết scenarios trước không cần checklist" | Gherkin không có checklist sẽ bỏ sót edge cases. Checklist là artifact brainstorming — Gherkin là artifact tự động hoá. |
| "Gherkin làm chậm chúng tôi" | Phiên checklist + thiết kế scenario 15 phút ngăn chặn hàng giờ làm lại vì hiểu sai yêu cầu. |
| "Developer đã viết unit tests rồi" | Unit tests xác minh implementation. Checklists và BDD xác minh hành vi từ góc nhìn người dùng. Khác mức, khác mối quan tâm. |
| "Tôi có thể mô tả mọi thứ trong 1 scenario" | Scenario nhiều hành vi không test được, không bảo trì được, không merge được. 1 scenario, 1 hành vi. |
| "Spreadsheet là đủ cho checklist" | Spreadsheet thiếu nhóm chuẩn hoá, mức ưu tiên, và template tái sử dụng. Checklist có cấu trúc đảm bảo nhất quán toàn team. |

## Cờ đỏ cảnh báo

- Nhảy thẳng vào Giai đoạn 2 (Gherkin) không hoàn thành Giai đoạn 1 (checklist)
- File feature không có tag — không lọc được cho CI/CD
- Không có kịch bản lỗi / ngoại lệ — chỉ test luồng thành công
- Item checklist không có động từ hành động — mô tả thay vì lệnh
- Nhiều hành động gộp trong 1 item checklist — không gán được Pass/Fail
- Assertion mơ hồ, chủ quan — "trông đẹp", "hoạt động tốt", "load nhanh"
- Scenarios có quá 10 steps — quá phức tạp, cần tách
- Steps chứa CSS selectors, xpaths, hoặc SQL queries
- Chu kỳ Given/When/Then lặp lại trong 1 scenario
- Thiếu gán ưu tiên cho các item checklist
- File feature viết bằng tiếng Anh khi quy ước dự án yêu cầu tiếng Việt

## Xác minh

Sau khi hoàn thành cả hai giai đoạn:

### Giai đoạn 1 — Checklist
- [ ] Mỗi item bắt đầu bằng động từ hành động ("Xác nhận...", "Kiểm tra...", "Nhập...")
- [ ] Mỗi item là một cổng Pass/Fail duy nhất — không gộp hành động
- [ ] Tất cả assertion được lượng hoá và rõ ràng
- [ ] Các items được nhóm theo chiều kiểm thử theo thứ tự ưu tiên
- [ ] Có đủ cột Ưu tiên (P0/P1/P2), Trạng thái, và Mã Bug
- [ ] Môi trường và phiên bản build được khai báo ở đầu

### Giai đoạn 2 — Gherkin
- [ ] Phân tích chuẩn bị được ghi nhận — quy tắc nghiệp vụ trích xuất từ checklist
- [ ] Mỗi file `.feature` có đúng 1 khối `Feature` với user story
- [ ] Ít nhất 1 kịch bản luồng thành công cho mỗi feature
- [ ] Kịch bản lỗi và ngoại lệ bao phủ mỗi validation rule
- [ ] Tất cả scenarios được gắn tag (`@smoke`, `@negative`, `@happy-path`, `@JIRA-XXXX`)
- [ ] Steps tuân thủ thứ tự Given → When → Then không lặp vòng
- [ ] Mỗi scenario dưới 10 steps
- [ ] Các phần tử đối xứng (được bao phủ bằng `Scenario Outline` với đầy đủ biến thể trong `Examples`)

### Cả hai Giai đoạn
- [ ] Tất cả nội dung output viết bằng tiếng Việt với thuật ngữ domain
- [ ] Mỗi scenario `.feature` truy vết được về 1 item checklist
- [ ] Không có cơ chế tự động hoá (selectors, xpaths, SQL) trong text step
- [ ] Chạy `bash skills/qa-test-design/scripts/qa-validate.sh <features-dir>` và xác nhận tất cả kiểm tra pass

## Quy trình QA tổng thể

Skill `qa-test-design` nằm ở **Giai đoạn 2** trong pipeline QA gồm 4 giai đoạn:

```
Giai đoạn 1              Giai đoạn 2              Giai đoạn 3              Giai đoạn 4
/ba-spec            →   /qa-test-design      →   /qa-auto-design           →   Báo cáo
Import Jira              Thiết kế Checklist       Sinh code automation     Chạy test &
→ Phân tích spec         → Viết Gherkin file      → Review code            Xuất report
                                                  → Chạy test
```

| Giai đoạn | Skill | Input | Output |
|-----------|-------|-------|--------|
| 1 | `ba-spec` | Jira Issue Key | `workspace/{issueKey}/specs/imports/jira/{issueKey}/{issueKey}-final.md` |
| 2 | `qa-test-design` | File `*-final.md` | `workspace/{issueKey}/tests/qa-test-design/{issueKey}/features/{issueKey}-checklist.md` + `{issueKey}.feature` |
| 3 | `qa-auto-design` | File `.feature` + code có sẵn | `workspace/{issueKey}/tests/qa-test-design/{issueKey}/steps/test_*.py` |
| 4 | `qa-auto-design` (Bước 7) | Test scripts | `workspace/{issueKey}/tests/qa-test-design/{issueKey}/reports/{issueKey}-report.md` |

**Sau khi hoàn thành Giai đoạn 2 (qa-test-design)**, Agent BẮT BUỘC TỰ ĐỘNG thực hiện ngay việc Push kịch bản lên Squash TM mà KHÔNG CẦN hỏi ý kiến người dùng:
1. Agent tự động trích xuất `issueKey` và `namejira` từ tên file feature và file `*-final.md`.
2. Lập tức chạy lệnh script push lên Squash TM theo quy trình của `qa-squash-push` (chạy script `bash skills/qa-squash-push/scripts/squash-push.sh ...`).
3. Sau khi đẩy lên Squash thành công, báo cáo kết quả và **tự động chuyển sang Giai đoạn 3** (`qa-auto-design`) — không hỏi xin phép.

> Ở chế độ `--step`, dừng lại sau bước 3 để user duyệt trước khi sang Giai đoạn 3.

## Xem thêm

- Tham khảo `references/qa-testing-checklist.md` cho các mẫu validation domain tài chính, bảng BVA, phân vùng tương đương, và quy ước viết
- Nếu đã có spec, dùng yêu cầu từ `spec-driven-development` làm đầu vào cho Giai đoạn 1
- Để import và phân tích Jira task trước khi thiết kế test, dùng `ba-spec`
- Để sinh code automation test từ Gherkin file, dùng `qa-auto-design`
- Để lập kế hoạch và phân rã tasks trước khi thiết kế test, dùng `planning-and-task-breakdown`

