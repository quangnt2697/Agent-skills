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
