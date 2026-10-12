# Mẫu Kịch Bản Gherkin Chuẩn Theo Task Type (Gherkin Patterns)

> Đây là thư viện mẫu Gherkin cho từng loại task phổ biến. Copy mẫu phù hợp, điền nội dung nghiệp vụ thực tế.
> **Tuyệt đối KHÔNG** copy tên scenario hoặc giá trị ví dụ mà phải thay thế bằng nội dung từ spec thực tế.

---

## 1. REST API — Happy Path

```gherkin
@domain-securities @api @JIRA-{issueKey}
Feature: [API] {Tên tính năng}
  As a {vai trò người dùng}
  I want to {hành động API}
  So that {giá trị nghiệp vụ mang lại}

  Background:
    Given {dữ liệu nền cần thiết cho mọi kịch bản}

  @happy-path @smoke
  Scenario: {Tên scenario mô tả luồng chính thành công}
    Given {trạng thái xác thực hợp lệ}
    When {gọi API endpoint} "{METHOD} {/path?params}"
    Then API trả về mã HTTP "{200|201}"
    And cấu trúc JSON trả về chứa trường "{field}" mang giá trị "{expected}"
```

---

## 2. REST API — Negative / Security

```gherkin
  @negative @security
  Scenario Outline: Hệ thống từ chối truy cập khi token xác thực không hợp lệ
    Given client thiết lập header "{header-name}" với giá trị "<token_value>"
    When gọi API GET "{/path}"
    Then API trả về mã HTTP "401"

    Examples:
      | token_value |
      |             |
      | invalid_xyz |

  @edge-case
  Scenario Outline: Hệ thống trả về kết quả rỗng khi không tìm thấy dữ liệu
    Given {xác thực hợp lệ}
    When gọi API GET "{/path/<param>}"
    Then API trả về mã HTTP "200"
    And cấu trúc JSON trả về chứa mảng "data" rỗng "[]"

    Examples:
      | param        |
      | not-exist-id |
      | 9999999999   |
```

---

## 3. WebSocket — Subscribe & Event Validation

```gherkin
@domain-securities @websocket @JIRA-{issueKey}
Feature: [WebSocket] {Tên kênh} — Xác minh luồng sự kiện real-time
  As a {vai trò}
  I want to nhận sự kiện từ kênh {tên kênh}
  So that {giá trị nghiệp vụ}

  Background:
    Given kết nối WebSocket đã được thiết lập thành công với tài khoản hợp lệ

  @happy-path @smoke
  Scenario: Nhận sự kiện hợp lệ sau khi đăng ký kênh thành công
    Given đã đăng ký lắng nghe kênh "{tên kênh}"
    When hệ thống phát sinh sự kiện "{loại sự kiện}"
    Then client nhận được gói tin trong vòng "{timeout}" giây
    And cấu trúc payload sự kiện khớp với schema định nghĩa
    And trường "{field}" mang giá trị "{expected_value}"

  @negative @security
  Scenario: Từ chối kết nối khi token không hợp lệ
    Given token xác thực đã hết hạn hoặc không hợp lệ
    When client thử kết nối WebSocket
    Then kết nối bị từ chối với mã lỗi "{401|403}"

  @edge-case
  Scenario: Đảm bảo tính cô lập dữ liệu giữa các tài khoản
    Given tài khoản A và tài khoản B cùng kết nối và đăng ký cùng kênh
    When có sự kiện phát sinh riêng cho tài khoản B
    Then chỉ tài khoản B nhận được sự kiện
    And tài khoản A không nhận được sự kiện của tài khoản B
```

---

## 4. Web UI — Navigation & Content

```gherkin
@web-ui @JIRA-{issueKey}
Feature: [Web] {Tên trang hoặc tính năng}
  As a {khách hàng/người dùng}
  I want to {xem/thao tác gì trên giao diện}
  So that {mục đích nghiệp vụ}

  Background:
    Given Hệ thống đang hoạt động bình thường
    And Không yêu cầu đăng nhập để truy cập trang (Public) [Hoặc: Người dùng đã đăng nhập]

  @P0 @happy-path @smoke
  Scenario: Truy cập trang qua URL hợp lệ
    When Người dùng truy cập vào đường dẫn "{/path}"
    Then Hệ thống hiển thị thành công trang {tên trang}
    And Tiêu đề chính của trang hiển thị "{nội dung tiêu đề}"

  @P1 @negative
  Scenario: Truy cập URL không tồn tại
    When Người dùng truy cập vào đường dẫn "{/path-not-exist}"
    Then Hệ thống hiển thị trang lỗi 404

  @P0 @happy-path
  Scenario: Điều hướng từ menu Sidebar
    Given Người dùng đang ở trang chủ
    When Người dùng nhấp vào mục "{Tên mục}" trong Sidebar
    Then Hệ thống điều hướng thành công tới trang {tên trang}
```

---

## 5. Securities Domain — Giới Hạn & Biên Giá/Khối Lượng

```gherkin
@domain-securities @boundary @JIRA-{issueKey}
Feature: [Chứng khoán] Kiểm soát giới hạn {giá/khối lượng/tiền} lệnh chứng khoán
  As a Nhà đầu tư
  I want to đặt lệnh trong giới hạn cho phép của Sở giao dịch
  So that Hệ thống xử lý đúng theo quy định thị trường

  Background:
    Given Nhà đầu tư đã đăng nhập vào tài khoản giao dịch hợp lệ
    And Phiên giao dịch đang trong trạng thái "{ATO|Continuous|ATC}"

  @P0 @happy-path
  Scenario: Chấp nhận lệnh khi {giá/khối lượng} đúng bằng giới hạn cho phép (TAI_HAN_MUC)
    Given Số dư khả dụng đủ giá trị lệnh
    When Nhà đầu tư đặt lệnh {Mua/Bán} mã "{SYMBOL}" với {tham số} "TAI_HAN_MUC"
    Then Hệ thống chấp nhận lệnh và trả về trạng thái "{RECEIVE|New}"

  @P0 @negative @boundary
  Scenario: Từ chối lệnh khi {giá/khối lượng} vượt quá giới hạn (VUOT_HAN_MUC)
    Given Số dư khả dụng đủ giá trị lệnh
    When Nhà đầu tư đặt lệnh {Mua/Bán} mã "{SYMBOL}" với {tham số} "VUOT_HAN_MUC"
    Then Hệ thống từ chối lệnh và trả về thông báo lỗi "{nội dung lỗi theo spec}"

  @P1 @happy-path @boundary
  Scenario: Chấp nhận lệnh khi {giá/khối lượng} thấp hơn giới hạn trên (DUOI_HAN_MUC)
    Given Số dư khả dụng đủ giá trị lệnh
    When Nhà đầu tư đặt lệnh {Mua/Bán} mã "{SYMBOL}" với {tham số} "DUOI_HAN_MUC"
    Then Hệ thống chấp nhận lệnh và trả về trạng thái "{RECEIVE|New}"
```

---

## 6. Tag Reference — Bảng Tags Bắt Buộc

| Tag | Ý nghĩa | Bắt buộc? |
|---|---|:---:|
| `@JIRA-{issueKey}` | Truy vết về Jira task | ✅ |
| `@domain-securities` | Task thuộc domain chứng khoán | Nếu fintech |
| `@api` / `@websocket` / `@web-ui` | Phân loại kỹ thuật | ✅ |
| `@smoke` | Kiểm thử khói — chạy đầu tiên | P0 bắt buộc |
| `@regression` | Test hồi quy đầy đủ | Mặc định |
| `@happy-path` | Luồng thành công chính | ✅ |
| `@negative` | Kiểm thử lỗi và từ chối | ✅ |
| `@boundary` | Kiểm thử biên BVA | Nếu có giá trị số |
| `@security` | Kiểm thử bảo mật / xác thực | Cho auth flows |
| `@edge-case` | Kịch bản ngoại lệ | Khi phát hiện |
| `@P0` / `@P1` / `@P2` | Mức ưu tiên (Web UI tasks) | Cho Web UI |

---

## 7. Anti-patterns — Cấm Kỵ Khi Viết Gherkin

```gherkin
# ❌ SAI — lộ biến kỹ thuật
When gọi API với header "x-api-key" lấy từ os.getenv("API_KEY")

# ❌ SAI — hardcode số thay vì ranh giới tượng trưng
When đặt lệnh với khối lượng "500001"

# ❌ SAI — selector UI lọt vào Gherkin
When click vào button "#btn-submit-order"

# ❌ SAI — SQL trong Gherkin
Then SELECT status FROM orders WHERE id = "123" trả về "FILLED"

# ✅ ĐÚNG — ngôn ngữ nghiệp vụ thuần túy + ranh giới tượng trưng
When Nhà đầu tư đặt lệnh mua mã "VNM" với khối lượng "VUOT_HAN_MUC_SAN"
Then Hệ thống từ chối và trả về thông báo lỗi "Khối lượng vượt quá giới hạn sàn HOSE"
```

---

## 8. Grounding Dữ Liệu Thật — Before/After

Dữ liệu định danh thực tế (account, symbol, ID) BẮT BUỘC phải lấy từ UAT, không tự bịa (Trừ negative testing).

```gherkin
# ❌ SAI — Tự bịa ID không có thật cho luồng Happy Path
Given tài khoản có mã "ACC_001" và orderId "ORD_12345"

# ✅ ĐÚNG — Dữ liệu đã lấy từ Metabase UAT (Grounding)
Given tiểu khoản "0001170086" có lệnh mua đang chờ khớp với orderId "8820300"

# ✅ ĐÚNG (Có Fallback) — Metabase không lấy được, tự bịa nhưng PHẢI có comment [DATA-ASSUMED]
# [DATA-ASSUMED] accountNo=1234567890 chưa verify trong UAT
Given tiểu khoản "1234567890" có lệnh mua đang chờ khớp với orderId "ORD_999"

# ✅ ĐÚNG (Negative Dummy) — Không tồn tại thật để test case lỗi (Không cần grounding/comment)
Given tiểu khoản không tồn tại "9999999999" thực hiện đặt lệnh
```

---

## 9. GraphQL API — Tham số Query (Full / Partial / Empty / Invalid)

> ⚠️ **QUY TẮC BẮT BUỘC cho GraphQL:**
> - BẮT BUỘC thiết kế đủ 4 nhóm kịch bản tham số query theo mô tả Jira (xem bảng dưới).
> - **NGHIÊM CẤM** bỏ qua kịch bản `empty query` hoặc `missing required args`.
> - Kết quả mong đợi (`Then`) phải lấy **nguyên văn** từ mô tả Jira task — **KHÔNG được tự suy diễn**.

### Bảng 4 nhóm tham số GraphQL bắt buộc kiểm thử

| Nhóm | Mô tả | Tag bắt buộc |
|---|---|:---:|
| **Full Query** | Gửi query với đầy đủ tất cả fields / arguments theo spec | `@graphql-full-query` |
| **Partial Query** | Gửi query chỉ với một số fields (bỏ optional fields) | `@graphql-partial-query` |
| **Empty / No Query** | Gửi body rỗng, query `""`, hoặc thiếu trường `query` hoàn toàn | `@graphql-no-query` |
| **Invalid Query** | Gửi query sai syntax, sai tên field, sai kiểu dữ liệu argument | `@graphql-invalid-query` |

### Mẫu Gherkin GraphQL Happy Path (Full Query)

```gherkin
@domain-securities @graphql @JIRA-{issueKey} @graphql-full-query
Feature: [GraphQL] {Tên query/mutation}
  As a {vai trò}
  I want to gọi GraphQL {query|mutation} "{tên operation}"
  So that {giá trị nghiệp vụ}

  Background:
    Given client đã xác thực với token hợp lệ

  @happy-path @smoke
  Scenario: Truy vấn thành công với đầy đủ tham số (full query)
    Given operation GraphQL là "{tên query/mutation}"
    And body request chứa đầy đủ arguments: {liệt kê từng argument theo spec Jira}
    And body request chứa đầy đủ selection set fields: {liệt kê từng field theo spec Jira}
    When client gửi GraphQL request
    Then API trả về mã HTTP "200"
    And trường "errors" trong response KHÔNG tồn tại hoặc rỗng
    And response chứa trường "data.{tên operation}" với cấu trúc khớp schema định nghĩa
    And {trường kết quả cụ thể} mang giá trị {expected value — lấy nguyên văn từ Jira}
```

### Mẫu Gherkin GraphQL Partial Query

```gherkin
  @happy-path @graphql-partial-query
  Scenario Outline: Truy vấn thành công với tập fields tối giản (partial query)
    Given operation GraphQL là "{tên query/mutation}"
    And body request chứa chỉ <selected_fields> (bỏ qua các optional fields)
    And các required arguments được cung cấp đầy đủ
    When client gửi GraphQL request
    Then API trả về mã HTTP "200"
    And response chứa chính xác <selected_fields> theo yêu cầu
    And các field không yêu cầu KHÔNG xuất hiện trong response hoặc được trả về null

    Examples:
      | selected_fields                        |
      | id, name                               |
      | id, status, createdAt                  |
```

### Mẫu Gherkin GraphQL Empty / No Query

```gherkin
  @negative @graphql-no-query
  Scenario Outline: Hệ thống từ chối khi body request thiếu hoặc rỗng
    Given client gửi request với body <body_variant>
    When client gửi GraphQL request đến endpoint "{/graphql}"
    Then API trả về mã HTTP "<expected_status>"
    And response chứa trường "errors" với message "{thông báo lỗi — lấy nguyên văn từ Jira}"

    Examples:
      | body_variant                        | expected_status |
      | body hoàn toàn rỗng "{}"           | 400             |
      | trường query = chuỗi rỗng \"\"      | 400             |
      | thiếu trường query trong body       | 400             |
      | content-type không phải JSON        | 415             |
```

### Mẫu Gherkin GraphQL Invalid Query

```gherkin
  @negative @edge-case @graphql-invalid-query
  Scenario Outline: Hệ thống trả về lỗi khi query không hợp lệ
    Given operation GraphQL có lỗi <invalid_type>
    When client gửi GraphQL request
    Then API trả về mã HTTP "200" (GraphQL convention) hoặc "<expected_status>"
    And response chứa trường "errors" không rỗng
    And errors[0].message phù hợp với "{pattern lỗi — lấy nguyên văn từ Jira}"

    Examples:
      | invalid_type                                   | expected_status |
      | syntax error (thiếu dấu ngoặc đóng)           | 400             |
      | field không tồn tại trong schema               | 200             |
      | argument sai kiểu dữ liệu (String thay Int)    | 200             |
      | thiếu required argument bắt buộc               | 200             |
      | giá trị argument vượt giới hạn cho phép        | 200             |
```

### ⚠️ Anti-patterns GraphQL — Cấm Kỵ

```gherkin
# ❌ SAI — Tự suy diễn kết quả không có trong Jira
Then hệ thống trả về danh sách lệnh (tự đoán response structure)

# ❌ SAI — Gộp chung full query và partial query vào 1 scenario
When gửi query với fields tùy ý
Then response có dữ liệu

# ❌ SAI — Bỏ qua kịch bản empty/no query
# (không thiết kế Scenario cho body rỗng hoặc query="")

# ✅ ĐÚNG — Kết quả mong đợi lấy nguyên văn từ mô tả Jira task
Then response chứa trường "errors[0].message" với giá trị "Field 'xxx' doesn't exist on type 'Query'"

# ✅ ĐÚNG — Tách biệt 4 nhóm kịch bản query rõ ràng
# (4 scenario riêng: full, partial, empty, invalid)
```

---

## 10. Verify Data Accuracy — So sánh Response API với Metabase UAT

> ⚠️ **KÍCH HOẠT khi Jira có keyword:** `"chính xác"`, `"trúng khớp"`, `"match"`, `"consistency"`, `"so sánh"`, `"verify data"`
>
> **QUY TẮC BẮT BUỘC:**
> - Giá trị reference trong `Then` PHẢI lấy từ Metabase UAT (đã grounding vào `data-grounding.json`), KHÔNG hardcode.
> - Dùng ranh giới tượng trưng `REF_VALUE_{FIELD}` thay vì số cụ thể trong Gherkin.
> - Phủ đủ 4 kịch bản: (a) Khớp đầy đủ, (b) Field mismatch, (c) Field null/missing, (d) Freshness.

### Bảng kịch bản Data Accuracy bắt buộc

| Kịch bản | Tag | Mô tả |
|---|:---:|---|
| **Data Match (Full)** | `@data-accuracy @happy-path` | Tất cả fields trong response khớp với Metabase UAT |
| **Field Mismatch** | `@data-accuracy @negative` | Ít nhất 1 field response sai so với Metabase UAT |
| **Null / Missing Field** | `@data-accuracy @edge-case` | Field trong response null/thiếu khi Metabase có giá trị |
| **Data Freshness** | `@data-accuracy @edge-case` | Response trả về record mới nhất, không phải cũ |

### Mẫu Gherkin Data Accuracy

```gherkin
@domain-securities @api @JIRA-{issueKey} @data-accuracy
Feature: [Data Accuracy] {Tên API} — Xác minh tính chính xác dữ liệu response

  Background:
    Given client đã xác thực với token hợp lệ
    And dữ liệu reference cho {tên entity} đã được tra cứu từ Metabase UAT

  @data-accuracy @happy-path @smoke
  Scenario: Tất cả fields trong response khớp với giá trị trong Metabase UAT
    Given tồn tại {entity} với {id/điều kiện} trong Metabase UAT
    When client gọi API {METHOD} "{/endpoint}" với {tham số}
    Then API trả về mã HTTP "200"
    And trường "{field_1}" trong response khớp với giá trị "REF_{FIELD_1}" từ Metabase UAT
    And trường "{field_2}" trong response khớp với giá trị "REF_{FIELD_2}" từ Metabase UAT
    And trường "{field_3}" trong response khớp với giá trị "REF_{FIELD_3}" từ Metabase UAT
    And không có trường nào bị null khi Metabase UAT có giá trị

  @data-accuracy @negative
  Scenario: Phát hiện mismatch khi dữ liệu nguồn thay đổi
    Given {entity} với {id} có trường "{field}" mang giá trị "REF_{FIELD}_OLD" trong Metabase UAT
    And dữ liệu đã được cập nhật thành giá trị "REF_{FIELD}_NEW"
    When client gọi API {METHOD} "{/endpoint}"
    Then API trả về mã HTTP "200"
    And trường "{field}" trong response phản ánh giá trị mới "REF_{FIELD}_NEW"
    And trường "{field}" KHÔNG còn mang giá trị cũ "REF_{FIELD}_OLD"

  @data-accuracy @edge-case
  Scenario Outline: Phát hiện field null/thiếu trong response khi Metabase có giá trị
    Given trường "<field_name>" của {entity} có giá trị hợp lệ trong Metabase UAT
    When client gọi API {METHOD} "{/endpoint}"
    Then API trả về mã HTTP "200"
    And trường "<field_name>" trong response KHÔNG được null hoặc thiếu

    Examples:
      | field_name   |
      | {field_1}    |
      | {field_2}    |
      | {field_3}    |

  @data-accuracy @edge-case
  Scenario: Response trả về record mới nhất (Data Freshness)
    Given {entity} có 2 records: record cũ (created_at T-1) và record mới (created_at T)
    When client gọi API {METHOD} "{/endpoint}"
    Then API trả về mã HTTP "200"
    And trường "{timestamp_field}" trong response khớp với thời điểm của record mới nhất
    And dữ liệu response không phải từ cache cũ hơn "{freshness_threshold}"
```

### Mẫu Data Grounding cho Data Accuracy

Ghi vào `data-grounding.json` trước khi viết Gherkin:

```json
{
  "items": [
    {
      "field": "accountBalance",
      "value": "5000000",
      "kind": "accuracy-reference",
      "source": "metabase-uat",
      "query": "SELECT balance FROM accounts WHERE account_no = '0001170086'",
      "verified": true,
      "usedIn": ["@data-accuracy @happy-path"],
      "symbolicName": "REF_ACCOUNT_BALANCE"
    },
    {
      "field": "lastUpdatedAt",
      "value": "2026-10-10T08:30:00+07:00",
      "kind": "accuracy-reference",
      "source": "metabase-uat",
      "query": "SELECT updated_at FROM accounts WHERE account_no = '0001170086'",
      "verified": true,
      "usedIn": ["@data-accuracy @freshness"],
      "symbolicName": "REF_LAST_UPDATED"
    }
  ]
}
```

### ⚠️ Anti-patterns Data Accuracy — Cấm Kỵ

```gherkin
# ❌ SAI — Hardcode giá trị so sánh mà không grounding từ Metabase
Then trường "balance" trong response bằng "5000000"

# ❌ SAI — Chỉ check HTTP 200, không verify field value
Then API trả về mã HTTP "200"
# (bỏ qua kiểm tra field-level accuracy)

# ❌ SAI — Dùng giá trị tự đoán không có trong data-grounding.json
And trường "status" khớp với "ACTIVE"  # tự đoán

# ✅ ĐÚNG — Dùng tên symbolic, giá trị thật từ data-grounding.json
And trường "balance" trong response khớp với giá trị "REF_ACCOUNT_BALANCE" từ Metabase UAT
# REF_ACCOUNT_BALANCE = 5000000 (đã verify tại data-grounding.json)

# ✅ ĐÚNG — Cover cả null/missing field
And không có trường nào bị null khi Metabase UAT có giá trị
```
