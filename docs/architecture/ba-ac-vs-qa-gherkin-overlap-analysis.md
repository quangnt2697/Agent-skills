# Phân Tích Ranh Giới: BA/PO Acceptance Criteria vs QA Executable Gherkin

**Mục đích:** Làm rõ sự khác biệt bản chất và tính kế thừa giữa **Acceptance Criteria (AC) của BA/PO** và **Kịch bản BDD Gherkin thực thi (`.feature`) của QA/SDET** nhằm triệt tiêu việc lặp lại công việc hoặc chồng lấn trách nhiệm trên nhánh `main`.

---

## 🎯 Nguyên Tắc Vàng

> **BA/PO viết AC = Quy tắc & Hành vi Nghiệp vụ ở mức WHAT (*Điều gì phải đúng về mặt nghiệp vụ?*) — Thuần ngôn ngữ kinh doanh, không chứa dữ liệu test cụ thể, không chứa chi tiết kỹ thuật/automation.**
>
> **QA/SDET viết Gherkin (`.feature`) = Kịch bản Kiểm thử Thực thi ở mức HOW TO TEST (*Kiểm chứng bằng dữ liệu thực nào, trên những sàn/phiên nào?*) — Có `@tags` truy vết, `Scenario Outline` tham số hóa đa sàn KRX và dữ liệu thực từ Metabase/TimescaleDB.**

**Không trùng lặp (Zero Overlap):** BA xác lập khung hành vi nghiệp vụ chuẩn và hợp đồng giao diện (`testability-manifest.json`); QA kế thừa khung đó để nhân rộng (expand 3–5x) thành bộ kịch bản kiểm thử tự động bao phủ mọi giá trị biên và đặc thù sàn giao dịch.

---

## 📋 1. BA/PO: Acceptance Criteria Trong `ba-spec` và `ba-refine`

Trên nhánh `main`, BA/PO có 2 luồng tạo đặc tả tương ứng với 2 định dạng trình bày AC ở mức **Thuần Nghiệp Vụ (WHAT)**:

### 1.1. Trong `ba-spec` (`spec/final.md` — Mục 9)
Khi tổng hợp yêu cầu từ tài liệu có sẵn sang `spec/final.md` (13 mục), BA viết AC dưới dạng **Danh mục Điều kiện Nghiệp vụ (Business Checklist)** gắn với các mã quy tắc `[BR-xx]`:
- Tập trung vào các điều kiện nghiệm thu cốt lõi (Happy path + các quy tắc chặn chính).
- Tuyệt đối không viết test data cứng hay thao tác DOM kỹ thuật.

### 1.2. Trong `ba-refine` (`spec/refined.md` — Mục 4 `## ✅ Acceptance Criteria`)
Khi mài giũa yêu cầu và đẩy trực tiếp lên Jira Description chuẩn 6 mục, BA viết AC dưới dạng **Business Gherkin sạch (Clean Business Gherkin)** được kiểm định tự động bởi `validate-ba-refine.js`:
- ✅ Dùng cấu trúc `Feature:` và các nhóm `Scenario: Happy - ...`, `Scenario: Validation - ...`, `Scenario: Edge - ...`.
- ✅ Diễn đạt 100% bằng **Ngôn ngữ Nghiệp vụ** (Nhà đầu tư, Tiểu khoản ký quỹ, Sở Giao dịch, Sức mua...).
- ❌ **TUYỆT ĐỐI CẤM có `@tags` automation** (`@smoke`, `@P0`, `@api`, `@G3PTP-...`).
- ❌ **TUYỆT ĐỐI CẤM có tiền tố mã `[AC-x.y]`** trong dòng tiêu đề `Scenario:`.
- ❌ **TUYỆT ĐỐI CẤM hardcode dữ liệu test cụ thể** (như mã `"VNM"`, giá `79,500`, số tiểu khoản `"0001234"` hay câu lệnh SQL/HTTP status code).

### Ví dụ Chuẩn của BA/PO (Trong `ba-refine`)

> ⚠️ **LƯU Ý MINH HỌA:** Chỉ dùng để minh họa định dạng, không sao chép vào kết quả thực tế.

```markdown
## 📜 Business Rules
- [BR-01] Lệnh giới hạn (LO) mua chỉ được phép gửi lên Sở khi giá đặt nằm trong biên độ trần/sàn của phiên hiện tại và tiểu khoản có đủ sức mua khả dụng.
- [BR-02] Khi giá đặt hoặc khối lượng vi phạm quy định lô giao dịch của sàn, hệ thống phải chặn ngay và hiển thị thông báo lý do cụ thể cho nhà đầu tư.

## ✅ Acceptance Criteria
```gherkin
Feature: Đặt lệnh giới hạn (LO) trên tiểu khoản giao dịch

  Scenario: Happy - Đặt lệnh mua LO hợp lệ thành công trong phiên liên tục
    Given Tiểu khoản của nhà đầu tư đang hoạt động bình thường và có đủ sức mua khả dụng
    When Nhà đầu tư gửi yêu cầu đặt lệnh mua LO với mức giá nằm trong biên độ trần sàn và khối lượng tròn lô
    Then Hệ thống ghi nhận lệnh vào sổ lệnh ở trạng thái chờ gửi lên Sở và tạm khóa sức mua tương ứng

  Scenario: Validation - Từ chối đặt lệnh khi khối lượng vượt quá sức mua khả dụng
    Given Tiểu khoản của nhà đầu tư có sức mua khả dụng thấp hơn giá trị lệnh dự kiến
    When Nhà đầu tư gửi yêu cầu đặt lệnh mua LO vượt quá sức mua hiện có
    Then Hệ thống từ chối nhận lệnh và hiển thị thông báo không đủ sức mua

  Scenario: Edge - Đặt lệnh mua tại đúng mức giá trần của phiên giao dịch
    Given Mã chứng khoán đang giao dịch trong phiên liên tục và chưa bị khóa trần
    When Nhà đầu tư gửi yêu cầu đặt lệnh mua LO tại mức giá bằng đúng giá trần hiện hành
    Then Hệ thống vẫn chấp nhận lệnh hợp lệ và tính toán tỷ lệ ký quỹ theo đúng mức giá trần đó
```
```

---

## 🧪 2. QA/SDET: Executable BDD Gherkin Trong `qa-test-design` (`test/{issueKey}.feature`)

Khi nhận bàn giao `spec/final.md` hoặc `spec/refined.md` từ BA, kỹ năng `qa-test-design` thực hiện 2 giai đoạn:
1. Thiết kế `test/checklist.md` để phân tích toàn bộ phân vùng tương đương (EP), giá trị biên (BVA: `min-1`, `min`, `max`, `max+1`) và ma trận 4 sàn chứng khoán.
2. Chuyển hóa thành file `test/{issueKey}.feature` (**Executable BDD Gherkin**) sẵn sàng để đẩy lên **Squash TM** (`/qa-squash-push`) và sinh code Automation (`/qa-auto-design`).

### Đặc điểm của QA Executable Gherkin
- ✅ Có đầy đủ **`@tags` phân loại và truy vết** (`@G3PTP-xxx`, `@BR-01`, `@P0`, `@HOSE`, `@HNX`, `@UPCOM`, `@DERIVATIVES`).
- ✅ Áp dụng **Quy tắc Tham số hóa Đa sàn / Đa mã (Multi-Symbol Parameterization)**: Bắt buộc dùng `Scenario Outline` kèm bảng `Examples` chi tiết cho từng sàn (HOSE ±7%, HNX ±10%, UPCoM ±15%, Phái sinh) với khung giờ, bước giá (tick size) và lô giao dịch riêng biệt.
- ✅ Sử dụng **100% dữ liệu kiểm thử thực tế** truy vấn từ Metabase UAT / TimescaleDB (`security_definition_v3` hoặc qua n8n `/webhook/securities-fixture` & `/webhook/securities-rule-matrix`).
- ✅ Được kiểm định tự động qua linter nghiệp vụ (`qa-validate.sh` và `/webhook/qa-domain-lint`).

### Ví dụ Chuẩn của QA/SDET (Chuyển hóa & Mở rộng từ AC của BA)

> ⚠️ **LƯU Ý MINH HỌA:** Chỉ dùng để minh họa định dạng, không sao chép số liệu vào kết quả thực tế.

```gherkin
@G3PTP-17396 @order_placement
Feature: Kiểm thử đặt lệnh giới hạn (LO) đa sàn theo quy định KRX

  @BR-01 @P0 @happy_path @multi_market
  Scenario Outline: Đặt lệnh mua LO thành công tại mức giá hợp lệ trong biên độ trên sàn <san>
    Given nhà đầu tư đã đăng nhập hợp lệ với tiểu khoản "<tieu_khoan>" có sức mua khả dụng lớn hơn 100,000,000 VNĐ
    And mã chứng khoán "<ma_ck>" trên sàn "<san>" (bảng "<board_id>") đang ở phiên giao dịch liên tục với giá tham chiếu <gia_tc>, giá trần <gia_tran>, giá sàn <gia_san>
    When nhà đầu tư gửi yêu cầu đặt lệnh mua LO cho mã "<ma_ck>" với giá đặt <gia_dat> và khối lượng <khoi_luong>
    Then hệ thống phản hồi trạng thái chấp nhận lệnh (HTTP 200/201) và trả về mã hiệu lệnh hợp lệ
    And trạng thái lệnh trong sổ lệnh chuyển thành "<trang_thai_ky_vong>"
    And sức mua khả dụng của tiểu khoản "<tieu_khoan>" giảm tương ứng với giá trị tạm khóa của lệnh

    Examples: Dữ liệu thực tế trích xuất từ security_definition_v3 theo từng sàn
      | san   | board_id | ma_ck | tieu_khoan | gia_tc | gia_tran | gia_san | gia_dat | khoi_luong | trang_thai_ky_vong |
      | HOSE  | G1       | SHB   | 000101     | 11000  | 11750    | 10250   | 11100   | 100        | NEW                |
      | HNX   | G1       | SHS   | 000101     | 15000  | 16500    | 13500   | 15200   | 100        | NEW                |
      | UPCOM | G1       | OIL   | 000101     | 10500  | 12000    | 9000    | 10600   | 100        | NEW                |

  @BR-02 @P1 @boundary_validation
  Scenario Outline: Từ chối lệnh mua LO khi giá đặt vi phạm biên độ trần/sàn (<loai_bien>) trên sàn <san>
    Given mã chứng khoán "<ma_ck>" trên sàn "<san>" đang trong phiên liên tục với giá trần <gia_tran> và giá sàn <gia_san>
    When nhà đầu tư đặt lệnh mua LO mã "<ma_ck>" với giá <gia_vi_pham> và khối lượng 100
    Then hệ thống từ chối lệnh với mã lỗi nghiệp vụ "<ma_loi>" và thông báo "<thong_bao_loi>"

    Examples: Kiểm thử giá trị biên trần + 1 tick và sàn - 1 tick
      | san  | ma_ck | gia_tran | gia_san | loai_bien      | gia_vi_pham | ma_loi       | thong_bao_loi                    |
      | HOSE | SHB   | 11750    | 10250   | Vượt giá trần  | 11800       | ERR_PRICE_CE | Giá đặt vượt quá giá trần        |
      | HOSE | SHB   | 11750    | 10250   | Thấp hơn sàn   | 10200       | ERR_PRICE_FL | Giá đặt thấp hơn giá sàn         |
      | HNX  | SHS   | 16500    | 13500   | Sai bước giá   | 15250       | ERR_TICK     | Giá đặt không đúng bước giá 100đ |
```

---

## 📊 3. Bảng So Sánh Đối Chiếu Trực Tiếp

| Tiêu chí | BA/PO Acceptance Criteria (`ba-spec` / `ba-refine`) | QA/SDET Executable Gherkin (`qa-test-design`) |
|---|---|---|
| **Mục tiêu cốt lõi** | Xác định **WHAT** (Quy tắc & hành vi nghiệp vụ cần đạt) | Xác định **HOW TO TEST** (Cách kiểm chứng tự động & toàn diện) |
| **Định dạng** | Checklist nghiệp vụ (`final.md`) hoặc **Business Gherkin sạch** (`refined.md`) | **Executable BDD Gherkin** (`Scenario` / `Scenario Outline` + `Examples`) |
| **Thẻ `@tags` & `[AC-x.y]`** | ❌ **Cấm tuyệt đối** (được chặn bởi `validate-ba-refine.js`) | ✅ **Bắt buộc có** (`@issueKey`, `@BR-xx`, `@P0/P1`, `@market`) |
| **Dữ liệu kiểm thử (Test Data)** | ❌ **Trừu tượng hóa** (không điền mã CK, giá hay số TK cụ thể) | ✅ **Cụ thể 100%** (lấy từ TimescaleDB UAT `security_definition_v3`) |
| **Phạm vi bao phủ** | 3 nhóm đại diện: `Happy`, `Validation`, `Edge` (3–6 scenarios) | Mở rộng gấp 3–5x: bao phủ đủ 4 sàn, các phiên, BVA (`min-1`, `max+1`), lỗi ORS (15–30 test cases) |
| **Ngôn ngữ** | 100% Ngôn ngữ Nghiệp vụ (Zero Technical Noise) | Ngôn ngữ Nghiệp vụ + Thông số Kiểm thử khả thi (Status, Mã lỗi, Giá trị biên) |
| **Đối tượng sử dụng** | PO, Stakeholders, DEV, QA (đồng thuận yêu cầu trên Jira) | QA, Automation Framework (Playwright/Pytest) & Squash TM |

---

## 🔄 4. Luồng Chuyển Hóa & Bàn Giao Giữa BA và QA

```text
[BA/PO: /ba-refine hoặc /ba-spec]
   ├── Xuất spec/refined.md (hoặc spec/final.md):
   │     • Business Rules: [BR-01], [BR-02]...
   │     • Clean Business Gherkin: Happy / Validation / Edge (không @tags, không data cứng)
   └── Xuất spec/testability-manifest.json (danh sách phần tử UI Delta ① ② ③ + selector gợi ý)
                     │
                     ▼ (Handoff qua workspace/issues/{issueKey}/spec/)
[QA/SDET: /qa-test-design]
   ├── Bước 1: Tạo test/checklist.md (phân rã EP, BVA, ma trận đa sàn từ [BR-*] và AC)
   ├── Bước 2: Truy vấn dữ liệu thật từ Metabase/TimescaleDB & /webhook/securities-rule-matrix
   └── Bước 3: Sinh test/{issueKey}.feature (Executable Gherkin có @tags + Scenario Outline + Examples)
                     │
                     ▼
[QA/SDET: /qa-squash-push & /qa-auto-design]
   ├── Đồng bộ lên Squash TM Campaign
   └── Kết hợp test/{issueKey}.feature + spec/testability-manifest.json + sdk-map.json ➔ Sinh code test POM
```

---

## 🚫 5. Các Phản Mẫu Cần Tránh (Anti-Patterns)

1. **❌ BA nhồi nhét `@tags`, `[AC-1.1]`, mã lỗi kỹ thuật hoặc dữ liệu cứng vào `refined.md`:**
   - *Hậu quả:* Làm bẩn mô tả nghiệp vụ trên Jira và bị chặn ngay bởi cổng kiểm định `validate-ba-refine.js`.
   - *Cách làm đúng:* BA giữ Gherkin ở mức hành vi nghiệp vụ trong sáng; phần `@tags` và bảng `Examples` đa sàn thuộc về file `.feature` của QA.
2. **❌ QA chỉ copy-paste nguyên xi 3 Scenario của BA sang file `{issueKey}.feature`:**
   - *Hậu quả:* Thiếu dữ liệu kiểm thử thực tế, thiếu kiểm thử biên (`min-1`, `max+1`) và vi phạm quy tắc Tham số hóa Đa sàn.
   - *Cách làm đúng:* QA phải mở rộng mỗi quy tắc/AC của BA thành các `Scenario Outline` bao phủ đầy đủ các sàn và giá trị biên.
3. **❌ QA tự ý suy diễn hoặc sửa đổi quy tắc nghiệp vụ khi thấy AC mơ hồ:**
   - *Hậu quả:* Viết test sai lệch so với yêu cầu thực tế (vi phạm `grounding-contract.md`).
   - *Cách làm đúng:* Khi phát hiện điểm mù trong đặc tả, gắn cờ `# NEEDS-SPEC` và kích hoạt `ba-interview-me` / phản hồi lại bước BA để cập nhật `spec/` trước.
