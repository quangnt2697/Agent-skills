# Cấp Độ 7: Hệ Thống Quản Trị Vị Thế Ký Quỹ Theo Deal (Deal-based Margin)

> **Thuộc:** [Cẩm Nang Nghiệp Vụ Chứng Khoán](../securities-domain-rules.md)

## 7. CẤP ĐỘ 7 (ĐỘC QUYỀN): Hệ Thống Quản Trị Vị Thế Ký Quỹ Theo Deal (Deal-based Margin System)

### 7.1. Khái Niệm Cốt Lõi: Deal Là Gì & So Sánh Với Mô Hình Truyền Thống

Khái niệm **DEAL** (tiên phong bởi DNSE) là giải pháp quản trị tài sản và giao dịch ký quỹ theo từng vị thế độc lập, khắc phục triệt để các nhược điểm của mô hình tiểu khoản `.1`/`.6` truyền thống:

1. **Tài khoản đơn nhất (Single Account View):** Khách hàng chỉ sở hữu **một tài khoản giao dịch duy nhất**. Không cần mở nhiều tiểu khoản, không cần chuyển tiền qua lại.
2. **Định danh Deal độc lập (Composite Key):** Mỗi Deal được định danh duy nhất trên hệ thống bởi bộ ba thông tin:
   $$\text{Deal} = (\text{accountNo}, \text{symbol}, \text{loanPackageId})$$
3. **Đa vị thế trên cùng một mã cổ phiếu:** Khách hàng có thể mở nhiều Deal khác nhau cho cùng một mã chứng khoán tùy theo chiến lược giải ngân.
   * *Ví dụ:* Trên cùng tài khoản `0001000115`, khách hàng có thể nắm giữ:
     * 01 Deal cổ phiếu `ACB` với Gói vay 0% (không vay, tỷ lệ cọc 100%).
     * 01 Deal cổ phiếu `ACB` với Gói vay 50% (vay tỷ lệ cọc 50%).
     * 01 Deal cổ phiếu `SSI` với Gói vay 70% (vay tỷ lệ cọc 30%).
4. **Cách ly rủi ro tuyệt đối (Ring-fenced Positions):** Quản trị rủi ro, theo dõi lãi lỗ, tính giá hòa vốn và xử lý giải chấp được thực hiện độc lập trên từng Deal:
   * Nếu Deal `SSI` bị lỗ và chạm ngưỡng giải chấp, hệ thống **CHỈ BÁN XỬ LÝ CỔ PHIẾU `SSI` THUỘC ĐÚNG DEAL ĐÓ**, hoàn toàn **KHÔNG ẢNH HƯỞNG HAY BÁN CHÉO SANG DEAL `ACB`**.

#### Bảng So Sánh Toàn Diện: Portfolio-based (.1/.6) vs Deal-based (DNSE)

| Tiêu Chí | Quản Lý Truyền Thống (.1 và .6) | Quản Lý Theo DEAL (Thế Hệ Mới) |
|:---|:---|:---|
| **Cấu trúc tài khoản** | Tách rời 2 tiểu khoản: `.1` (Thường) và `.6` (Margin) | **1 tài khoản duy nhất**, quản lý nhiều Deal độc lập bên trong |
| **Thao tác đặt lệnh** | Phải chọn đúng tiểu khoản trước khi đặt lệnh. Nếu thiếu tiền phải chuyển khoản giữa .1 và .6 | **Chọn gói vay ngay trong sổ đặt lệnh**, linh hoạt chọn tỷ lệ vay cho từng lệnh |
| **Đơn vị quản trị rủi ro** | **Toàn bộ tiểu khoản .6** (Gộp chung nợ và tài sản của tất cả các mã) | **Từng DEAL riêng lẻ** $(\text{accountNo}, \text{symbol}, \text{loanPackageId})$ |
| **Cơ chế Force Sell** | Bán tháo toàn danh mục, bán lây sang cổ phiếu tốt khác có thanh khoản | **Chỉ bán đúng cổ phiếu của Deal chạm ngưỡng xử lý**, bảo vệ các vị thế khác |
| **Đo lường hiệu suất** | Khó bóc tách chi phí vốn, lãi lỗ và lãi vay cho từng giao dịch | **Minh bạch 100%**: hiển thị chính xác giá vốn, lãi lỗ thực tế, lãi vay và giá hòa vốn của từng Deal |
| **Cơ chế thanh toán nợ** | Tiền bán vào tài khoản sẽ bị trừ nợ chung của toàn bộ tiểu khoản | Tiền bán của Deal nào ưu tiên trả nợ cho chính Deal đó, phần dôi ra chuyển thành sức mua khả dụng |

---

### 7.2. Cấu Trúc Thực Thể Hệ Thống Deal (Entities & Data Model)

Kiến trúc hệ thống Deal bao gồm 3 services lõi tương tác qua Kafka Event Bus và cache Redis/Postgres:
* **Deal Service:** Nhận thông tin lệnh khớp từ ORS/OMS và event từ BO (Flex) để hình thành, cập nhật số dư, tính lãi/lỗ và giá hòa vốn của Deal. Publish trạng thái Deal qua Kafka và đẩy realtime tới Web/App qua MQTT.
* **Loan Service:** Quản lý vòng đời món nợ, giải ngân nợ khi mua, thu nợ khi bán hoặc trả nợ trước hạn, tính lãi vay dồn tích theo ngày.
* **Risk Service:** Giám sát tỷ lệ rủi ro realtime theo từng Deal, phát hiện chạm ngưỡng Call Margin/Liquid, tính toán giá xử lý và kích hoạt lệnh Smart Order Force Sell.

```
                  ┌──────────────────────┐
                  │ Kafka (Order, Event) │
                  └──────────┬───────────┘
                             │
                             ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Loan Service │ ◄─── │ Deal Service │ ───► │ Risk Service │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  MQTT / Socket  │ ──► [Client Web/App Realtime]
                    └─────────────────┘
```

#### 1. Rổ Vay (Margin Basket 2.0)
Rổ vay 2.0 là tập hợp các mã chứng khoán đủ tiêu chuẩn nghiệp vụ:
```json
{
  "id": 1098,
  "name": "RO_HNX30_VIP",
  "symbols": ["ACB", "BVS", "FPT", "SSI", "VHM"]
}
```
*Lưu ý:* Rổ vay 2.0 không lưu trực tiếp giá chặn và tỷ lệ cho vay (các tham số này được phân cấp xuống Gói vay - Loan Product).

#### 2. Gói Vay (Loan Package)
Định nghĩa sản phẩm tài chính phục vụ đa dạng khẩu vị rủi ro:
* `id`: Số hiệu gói vay.
* `name`: Tên gói vay (vd: "Gói Lãi Suất Ưu Đãi T0", "Margin Chuẩn 50%").
* `loanType`: Loại vay (`M`: Margin thường, `C`: Thấu chi/Cash).
* `source`: Nguồn vốn (`C`: CTCK DNSE, `B`: Ngân hàng, đối tác P2P).
* `initialRate`: Tỷ lệ ký quỹ (cọc) ban đầu của gói vay (vd: $0.5$ tương ứng tỷ lệ cho vay $50\%$).
* `initialRateForWithdraw`: Tỷ lệ ký quỹ áp dụng khi ứng/rút sức mua dôi ra từ Deal.
* `maintenanceRate`: Tỷ lệ duy trì (ngưỡng Call Margin, vd: $0.4$).
* `liquidRate`: Tỷ lệ bán xử lý giải chấp (ngưỡng Force Sell, vd: $0.3$).
* `interestRate`: Lãi suất vay trong hạn tính theo năm (vd: $0.13 = 13\%$/năm, tính trên cơ sở 365 ngày).
* `preferentialPeriod` & `preferentialInterestRate`: Số ngày được hưởng lãi suất ưu đãi và mức lãi suất ưu đãi.
* `term`: Kỳ hạn vay tính theo ngày (vd: 60, 90, 180 ngày).
* `overdueInterest`: Lãi suất quá hạn (thường bằng $150\%$ lãi trong hạn).
* `allowExtendLoanTerm` & `allowEarlyPayment`: Cờ cho phép gia hạn vay hoặc trả nợ trước hạn (boolean).
* `brokerFirmBuyingFeeRate` & `brokerFirmSellingFeeRate`: Biểu phí giao dịch mua/bán trả CTCK.
* `transferFee`: Phí chuyển khoản chứng khoán khi bán (đồng/cổ phiếu).

#### 3. Món Nợ Deal (Loan Management Model)
Mỗi lần Deal giải ngân sẽ tạo hoặc cộng dồn vào món nợ quản lý tại Loan Service:
* `disbursementDate`: Ngày giải ngân món nợ.
* `originalPrincipal`: Số tiền gốc đã giải ngân ban đầu.
* `dueDate`: Ngày đến hạn khoản vay.
* `unduePrincipal` / `undueInterest`: Nợ gốc và nợ lãi trong hạn chưa trả.
* `duePrincipal` / `dueInterest`: Nợ gốc và lãi đến hạn thanh toán trong ngày.
* `overduePrincipal` / `overdueInterest`: Nợ gốc và lãi quá hạn.
* `t0UnrealizedPrincipal`, `t1UnrealizedPrincipal`, `t2UnrealizedPrincipal`: Nợ gốc dự thu tương ứng với khối lượng chứng khoán đã khớp bán vào ngày $T_0, T_1, T_2$.
* `t0UnrealizedInterest`, `t1UnrealizedInterest`, `t2UnrealizedInterest`: Nợ lãi dự thu tương ứng tiền bán chờ về.

#### 4. Thực Thể Deal (Deal Model Core Fields)
```
Trường Dữ Liệu               Ý Nghĩa Nghiệp Vụ
──────────────────────────── ─────────────────────────────────────────────────────────────
dealId                       Mã định danh duy nhất của Deal trong toàn hệ thống
accountNo                    Số tài khoản chứng khoán của khách hàng (duy nhất)
symbol                       Mã chứng khoán của Deal
loanPackageId                Mã gói vay gán cho Deal
status                       Trạng thái Deal: OPEN (đang mở), PENDING_CLOSE, CLOSED (đã đóng)
side                         Vị thế: NB (Mua/Nắm giữ dài hạn), NS (Vị thế bán)
accumulateQuantity           Tổng khối lượng chứng khoán tích lũy từ khi mở Deal
openQuantity                 Khối lượng chứng khoán hiện đang mở (chưa bán chốt)
closedQuantity               Khối lượng chứng khoán đã bán chốt
tradeQuantity                Khối lượng chứng khoán thực có, được phép đặt bán trong phiên
t0/t1/t2ReceivingQuantity     Khối lượng chứng khoán mua chờ về theo chu kỳ T+2
dividendReceivingQuantity    Khối lượng cổ phiếu cổ tức đang chờ về
costPrice                    Giá vốn hiện tại của khối lượng đang mở (openQuantity)
averageCostPrice             Giá vốn bình quân gia quyền của toàn bộ lịch sử mua của Deal
marketPrice                  Giá thị trường realtime của mã chứng khoán
secure                       Số tiền cọc ký quỹ hiện tại của Deal
unrealizedProfit             Lãi/lỗ tạm tính của Deal theo thị giá
realizedProfit               Lãi/lỗ đã thực hiện (đã chốt khi bán từng phần)
breakEvenPrice               Giá hòa vốn chính xác của Deal (đã tính đủ thuế, phí, lãi vay)
currentDebt                  Tổng nợ gốc còn lại của Deal
currentInterest              Tổng nợ lãi tích lũy chưa trả của Deal
dealRate                     Tỷ lệ an toàn thực tế của Deal (R_deal)
liquidPrice                  Mức thị giá chạm ngưỡng bán giải chấp (Force Sell)
maintenancePrice             Mức thị giá chạm ngưỡng cảnh báo Call Margin
```

---

### 7.3. Vòng Đời Deal & Các Nghiệp Vụ Giao Dịch Đặc Thù

```
  [Lệnh Mua Khớp] ──► [Deal OPEN] ──► [Mua Mở Thêm] (Cập nhật bình quân giá vốn, cọc, nợ)
                             │
                             ├───────► [Bán Một Phần] (Chốt lãi/lỗ từng phần, ưu tiên trả nợ)
                             │
                             ├───────► [Bán Hết] ──► [Deal CLOSED]
                             │
                             └───────► [Khối Lượng < Lô Chẵn HoSE] ──► [PENDING_CLOSE]
                                                                      (Thu hết nợ -> Chuyển lô lẻ)
```

#### 1. Quy Trình Khớp Lệnh Mua / Bán
* **Lệnh Mua:** Khách hàng chọn mã chứng khoán và gói vay mong muốn. 
  * Nếu chưa có Deal cùng gói vay: Khớp lệnh sẽ **sinh ra một Deal mới** ở trạng thái `OPEN`.
  * Nếu đã có Deal cùng mã và cùng gói vay: Hệ thống **tự động gộp vào Deal hiện tại**, cộng dồn khối lượng vào `openQuantity`, cập nhật giá vốn gia quyền `costPrice` và tăng tiền cọc `secure`, tăng nợ `currentDebt`.
* **Lệnh Bán:** Khách hàng chọn đúng Deal muốn bán. Sức bán tối đa hiển thị theo `tradeQuantity` của Deal đó.
  * Khi lệnh bán khớp: Tiền bán thu về được **ưu tiên giữ lại để khấu trừ nợ gốc và nợ lãi** của chính Deal đó (giảm `currentDebt` và `currentInterest`).
  * Phần tiền bán còn lại sau khi trừ nghĩa vụ nợ sẽ chuyển thành tiền có thể ứng (`t0ReceivingCash`) để tăng sức mua cho tài khoản.
  * Nếu bán hết toàn bộ khối lượng (`openQuantity == 0`): Mọi nghĩa vụ nợ, phí, thuế được quyết toán dứt điểm, Deal chuyển sang trạng thái `CLOSED`.

#### 2. Xử Lý Chứng Khoán Lô Lẻ (Odd-Lot) Theo Deal
* **Tại HNX và UpCoM:** Cho phép khớp lệnh lô lẻ trực tiếp trên bảng liên tục $\implies$ Cho phép gộp chung lô lẻ và lô chẵn vào cùng một Deal bình thường.
* **Tại HoSE:**
  * Khi khách hàng bán một phần Deal mà số dư còn lại `openQuantity < 100` (lô lẻ từ 1 đến 99 cổ phiếu):
    * Hệ thống lập tức chuyển Deal sang trạng thái **`PENDING_CLOSE`**.
    * **Bắt buộc thu hồi toàn bộ dư nợ margin của Deal này**, coi phần chứng khoán lô lẻ còn lại là chứng khoán không vay nợ (để tránh rủi ro treo nợ trên tài sản không thể bán khớp lệnh khớp sàn).
    * Khách hàng giao dịch xử lý phần lô lẻ này thông qua nghiệp vụ nộp/rút chứng khoán hoặc bán thỏa thuận cho CTCK.

#### 3. Xử Lý Sự Kiện Quyền (Corporate Actions) & Thứ Tự Khấu Trừ Thuế Khi Bán
* **Cổ tức bằng tiền:** Tiền cổ tức được ghi nhận vào tài khoản tiền mặt của khách hàng, không ảnh hưởng đến số lượng cổ phiếu trên Deal.
* **Cổ tức bằng cổ phiếu / Cổ phiếu thưởng:**
  * Khối lượng cổ phiếu thưởng về sẽ tăng vào trường `dividendTradeQuantity` của Deal.
  * **Quy tắc vàng khấu trừ thuế TNCN khi bán:** Theo Luật thuế Việt Nam, bán cổ phiếu nhận từ cổ tức bị đánh thuế TNCN $5\%$ trên giá trị bán (hoặc mệnh giá 10,000đ tùy giá nào nhỏ hơn). Do đó, khi khách hàng đặt lệnh bán Deal:
    $$\text{Hệ thống BẮT BUỘC ưu tiên khớp trừ vào Cổ Phiếu Cổ Tức trước, sau đó mới trừ vào Cổ Phiếu Thường!}$$
    Điều này giúp xác định chính xác khoản thuế TNCN cổ tức phải nộp ngay khi khớp lệnh.

---

### 7.4. Các Công Thức Toán Học & Tài Chính Chuẩn Xác Theo Deal

#### 1. Giá Vốn (Cost Price) & Giá Vốn Bình Quân (Average Cost Price)

Khi khớp mua thêm một khối lượng mới vào Deal đang mở:

$$\text{costPrice}_{\text{new}} = \frac{\text{costPrice}_{\text{old}} \times Q_{\text{old}} + P_{\text{match}} \times Q_{\text{match}}}{Q_{\text{old}} + Q_{\text{match}}}$$

$$\text{averageCostPrice} = \frac{\sum (Q_{\text{match}} \times P_{\text{match}})}{\sum Q_{\text{match}}}$$

#### 2. Tiền Cọc Ký Quỹ Của Deal (Secure Amount)

$$\text{secure} = openQuantity \times costPrice \times initialRate$$

#### 3. Giá Hòa Vốn Chính Xác (Break-even Price)

Giá hòa vốn là mức giá thị trường mà tại đó khách hàng bán hết Deal sẽ không bị lỗ (thu hồi đủ vốn, trả hết nợ, lãi vay và toàn bộ thuế, phí giao dịch).

Công thức phân tách làm 2 trường hợp căn cứ theo quy định tính thuế cổ tức:

* **Trường hợp 1: Khi Giá vốn cổ phiếu $costPrice > 10,000$ VNĐ:**

$$P_{\text{breakeven}} = \frac{costPrice + \frac{\text{Phí mua chưa chốt}}{openQuantity} + \text{Phí CKCK} + \frac{\text{Lãi vay chưa chốt}}{openQuantity} + \frac{\text{Thuế cổ tức tạm tính}}{openQuantity}}{1 - \text{Tỷ lệ phí bán} - \text{Tỷ lệ thuế bán}}$$

* **Trường hợp 2: Khi Giá vốn cổ phiếu $costPrice \le 10,000$ VNĐ:**

$$P_{\text{breakeven}} = \frac{costPrice + \frac{\text{Phí mua chưa chốt}}{openQuantity} + \text{Phí CKCK} + \frac{\text{Lãi vay chưa chốt}}{openQuantity}}{1 - \text{Tỷ lệ phí bán} - \text{Tỷ lệ thuế bán} - \frac{\text{Thuế cổ tức tạm tính}}{openQuantity}}$$

*Trong đó:*
* $\text{Thuế cổ tức tạm tính} = \text{Khối lượng cổ tức} \times 5\% \times \min(10,000, P_{\text{market}})$.
* $\text{Phí mua chưa chốt} = \text{Phí mua đã thu} - \text{Phí mua của khối lượng đã đóng}$.
* $\text{Lãi vay chưa chốt} = \text{Lãi vay đã trả chưa phân bổ} + \text{Lãi vay tích lũy chưa trả}$.
* $\text{Phí CKCK}$: Mức phí chuyển khoản chứng khoán trả VSD khi bán (thường là 0.3đ - 0.5đ/cổ phiếu).

#### 4. Tỷ Lệ Thực Tế Của Deal ($R_{\text{deal}}$ hay Deal Rate)

Tỷ lệ an toàn của Deal được tính bằng tỷ số giữa **Tài sản thực có của Deal** và **Tổng giá trị thị trường của Deal**:

$$\text{Deal Rate} (R_{\text{deal}}) = \frac{\text{Tài Sản Thực Có Của Deal}}{\text{Tổng Giá Trị Tài Sản Deal}} = \frac{openQuantity \times P_{\text{market}} - \text{Debt} - \text{Interest} - \text{Fees}_{\text{open}} - \text{Fees}_{\text{remain}}}{openQuantity \times P_{\text{market}}}$$

*Trong đó:*
* $\text{Debt} = currentDebt$: Tổng dư nợ gốc còn lại của Deal.
* $\text{Interest} = currentInterest$: Nợ lãi tích lũy tính đến ngày hiện tại.
* $\text{Fees}_{\text{open}} = unrealizedOpenTaxAndFee$: Phí mua và các khoản thuế phí chưa kết chuyển của khối lượng đang mở.
* $\text{Fees}_{\text{remain}} = estimateRemainTaxAndFee$: Phí bán và thuế bán dự tính theo giá thị trường:
  $$\text{Fees}_{\text{remain}} = openQuantity \times P_{\text{market}} \times (\text{sellFeeRate} + \text{sellingTaxRate}) + openQuantity \times \text{transferFee}$$

#### 5. Sức Mua Dôi Ra Từ Deal (PP0 DEAL / Mana Init)

Khi cổ phiếu trong Deal có lãi và chưa chạm giá chặn, giá trị thặng dư tạo ra sức mua dôi ra để mở thêm các vị thế mới:

$$PP0_{\text{DEAL}} = \min(P_{\text{market}}, P_{\text{loan}}) \times (openQuantity - Q_{\text{right}} - Q_{\text{div}}) \times (1 - \text{initialRateForWithdraw}) - currentDebt - currentInterest - \text{Fees}$$

---

### 7.5. Cơ Chế Giá Chặn Margin DEAL (Loan Price / Cap Price)

#### 1. Mục Đích Nghiệp Vụ Của Giá Chặn
Khi một mã cổ phiếu tăng trưởng quá nóng trong thời gian ngắn (tăng $100\% - 200\%$), việc tiếp tục giải ngân cho vay theo thị giá sẽ tiềm ẩn rủi ro nợ xấu khổng lồ cho CTCK nếu cổ phiếu đảo chiều rơi tự do. 
Do đó, hệ thống cấu hình **Giá Chặn (Loan Price)** cho từng Loan Product:

$$\text{Mức Giá Tính Giải Ngân \& TSĐB} = \min(\text{Giá Thị Trường}, \text{Giá Chặn})$$

* Nếu $\text{Thị Giá} \le \text{Giá Chặn} \implies$ Giải ngân và tính TSĐB theo **Thị giá**.
* Nếu $\text{Thị Giá} > \text{Giá Chặn} \implies$ Giá trị giải ngân và TSĐB bị **Cap trần tại Giá chặn**.

#### 2. Giá Trị Giải Ngân Khi Mua Mã Có Giá Chặn

$$\text{Giá Trị Giải Ngân} = \min(P_{\text{match}}, P_{\text{loan}}) \times Q_{\text{match}} \times (1 - \text{initialRate})$$

* *Ví dụ:* Mã `GEE` có giá chặn $100,000$đ, gói vay giải ngân $50\%$ (initialRate = $0.5$). Khách hàng mua $10,000$ CP tại giá thị trường $120,000$đ:
  * Theo thị giá: Giá trị vay $= 120,000 \times 10,000 \times 50\% = 600,000,000$đ.
  * Theo giá chặn: Giá trị vay $= \min(120,000, 100,000) \times 10,000 \times 50\% = 500,000,000$đ.
  * Khách hàng phải bỏ thêm $100,000,000$đ vốn tự có vào tiền cọc ban đầu. Khi đó, $R_{\text{deal}}$ ban đầu hiển thị sẽ đạt mức xấp xỉ $58.3\%$, cao hơn mức ban đầu $50\%$.

#### 3. Tính Sức Mua Tối Đa (PPSE) & Khối Lượng Tối Đa ($Q_{\max}$) Khi Mua Mã Có Giá Chặn

Khi dùng sức mua sẵn có ($PP0$) để đặt lệnh mua một mã có giá chặn:

$$PPSE = \frac{PP0 \times P_{\text{market}}}{P_{\text{market}} - (1 - \text{initialRate}) \times \min(P_{\text{market}}, P_{\text{loan}})}$$

$$Q_{\max} = \text{ROUNDDOWN}\left(\frac{PP0}{P_{\text{market}} - (1 - \text{initialRate}) \times \min(P_{\text{market}}, P_{\text{loan}})}, 100\right)$$

*Lưu ý:* Việc làm tròn xuống (`ROUNDDOWN`) theo lô 100 của sàn giúp loại bỏ phần thập phân và đảm bảo hệ thống không bao giờ bị vượt quá sức mua thực tế (tránh lỗi Negative Buying Power).

#### 4. Khối Lượng Cổ Phiếu Được Phép Rút Khỏi Deal

Khách hàng muốn rút một phần cổ phiếu ra khỏi Deal (để chuyển lưu ký hoặc đưa về dạng không vay) nhưng vẫn phải đảm bảo Deal Rate sau khi rút không rơi xuống dưới tỷ lệ an toàn:

$$Q_{\text{withdraw}} = openQuantity - \frac{currentDebt + currentInterest + \text{Phí Thuế}}{\min(P_{\text{market}}, P_{\text{loan}}) \times (1 - \text{initialRate})}$$

#### 5. Tác Động Đến Hạn Mức Vốn (Pool) & Room Chứng Khoán

* **Pool Debit (Nguồn vốn CTCK):**
  * Khi khách hàng đặt lệnh mua: Hệ thống tạm tính $\text{Pool Debit} = \text{Pool Debit Hiện Tại} + \text{Giá Trị Giải Ngân Dự Tính}$ (tính theo công thức Giá chặn).
  * Khi khách hàng hủy lệnh mua chưa khớp: Hệ thống giải tỏa trả lại đúng phần Pool Debit tạm tính tương ứng.
* **Room Used (Số lượng cổ phiếu cho vay):**
  $$\text{Room Used} = \text{ROUNDUP}\left(Q_{\text{match}} \times \frac{\text{Giá Trị Giải Ngân Thực Tế}}{\text{Tổng Giá Trị Khớp Của Lệnh}}\right)$$
* **Quy tắc điều chỉnh Giá chặn từ Quản Trị Rủi Ro:**
  * Hiệu lực cấu hình là **Realtime**. Tuy nhiên, khuyến nghị **KHÔNG thay đổi Giá chặn trước 16:20 hàng ngày** để tránh làm biến động đột ngột chỉ số Mana và Deal Rate của khách hàng trong phiên giao dịch.
  * Khi hạ Giá chặn xuống mức thấp hơn, Risk Service phải tính toán lại Deal Rate và chủ động **cấp hoãn xử lý (Grace Period)** cho tài khoản nếu việc hạ giá chặn đẩy Deal vào ngưỡng Call/FS một cách cơ học.

---

### 7.6. Quản Trị Rủi Ro & Xử Lý Vi Phạm Theo Deal (Risk Management per Deal)

Hệ thống giám sát Deal Rate ($R_{\text{deal}}$) liên tục theo thời gian thực (realtime) với 3 ngưỡng ranh giới:

```
  Deal Rate:   100% ──────────── InitialRate ──────────── MaintenanceRate ──────────── LiquidRate ──────────── 0%
  Trạng Thái:      [Rất An Toàn]          [Bình Thường]         [Call Margin]           [Force Sell]
```

#### 1. Cảnh Báo & Call Margin Theo Deal
* **Điều kiện kích hoạt:** $\text{LiquidRate} < R_{\text{deal}} \le \text{MaintenanceRate}$.
* **Giá kích hoạt Call Margin ($P_{\text{maintenance}}$):** Là mức thị giá của cổ phiếu làm cho $R_{\text{deal}} = \text{MaintenanceRate}$.
  * Nếu $P_{\text{maintenance}} \ge 10,000$ VNĐ:
    $$P_{\text{maintenance}} = \frac{currentDebt + currentInterest + unrealizedOpenTaxAndFee + \text{transferFee} \times openQuantity + \text{dividendQuantity} \times 5\% \times 10,000}{openQuantity \times (1 - \text{maintenanceRate} - \text{sellingFeeRate} - \text{sellingTaxRate})}$$
  * Nếu $P_{\text{maintenance}} < 10,000$ VNĐ:
    $$P_{\text{maintenance}} = \frac{currentDebt + currentInterest + unrealizedOpenTaxAndFee + \text{transferFee} \times openQuantity}{openQuantity \times (1 - \text{maintenanceRate} - \text{sellingFeeRate} - \text{sellingTaxRate} - \text{dividendTaxRate})}$$
* **Số tiền khách hàng cần nộp bổ sung ($X$) để đưa Deal về tỷ lệ duy trì:**
  $$X = openQuantity \times P_{\text{market}} \times (\text{maintenanceRate} - 1) + currentDebt + currentInterest + estimateRemainTaxAndFee + unrealizedOpenTaxAndFee$$
* **Lịch trình thông báo Call Margin:**
  * Bắn thông báo tự động qua App Noti (DNoti) / Email / SMS tới khách hàng và Broker.
  * Bắn cảnh báo qua Mattermost cho nội bộ Risk: Vào đầu các mốc thời gian `09:00`, `11:30`, `15:00` và định kỳ lặp lại mỗi 1 tiếng trong phiên.

#### 2. Bán Xử Lý Giải Chấp (Force Sell) Theo Deal
* **Điều kiện kích hoạt:** $R_{\text{deal}} \le \text{LiquidRate}$.
* **Giá kích hoạt Bán xử lý ($P_{\text{liquid}}$):** Thay `maintenanceRate` bằng `liquidRate` vào công thức xác định giá phía trên.
* **Cơ chế Bán xử lý thông minh (Khác biệt hoàn toàn so với thị trường):**
  * Hệ thống **KHÔNG BÁN HẾT CỔ PHIẾU**, mà **CHỈ BÁN MỘT PHẦN VỪA ĐỦ** để nâng $R_{\text{deal}}$ từ ngưỡng nguy hiểm quay trở lại ngưỡng An toàn Duy trì (`maintenanceRate`).
  * Khối lượng cổ phiếu cần bán xử lý ($Q_{\text{liquid}}$) với giả định bán tại Giá Sàn (`FloorPrice`) hoặc Thị giá:

$$Q_{\text{liquid}} = \frac{openQuantity \times P_{\text{liquid}} \times (1 - \text{maintenanceRate}) - currentDebt - currentInterest - unrealizedOpenTaxAndFee - estimateRemainTaxAndFee}{P_{\text{liquid}} \times (1 - \text{maintenanceRate}) - \frac{unrealizedOpenTaxAndFee + estimateRemainTaxAndFee}{openQuantity} - \frac{FloorPrice \times (1 - \text{sellingFee} - \text{sellingTax}) - 0.3}{1 + \frac{\text{phí UTTB}}{365} \times \text{ngày}}}$$

  * **Quy tắc làm tròn:** $Q_{\text{liquid}}$ bắt buộc phải được **làm tròn lên (ROUNDUP)** theo lô quy định của sàn (bội số 100).
* **Cơ Chế Hoãn Bán Xử Lý (Grace Period):**
  * Cho phép Admin Quản Trị Rủi Ro thao tác trên Dashboard để cấu hình hoãn Force Sell tự động cho một tài khoản cụ thể đến một mốc ngày/giờ nhất định (ví dụ: khách hàng cam kết nộp tiền vào 10:30).
  * Trong thời gian hoãn, hệ thống bỏ qua việc đẩy lệnh Force Sell tự động. Nếu hết thời gian mà $R_{\text{deal}}$ vẫn vi phạm, hệ thống mới tự động kích hoạt xử lý.
* **Quy Chuẩn Lệnh Bán Xử Lý Thông Minh (Smart Order):**
  * Khối lượng đặt tối đa cho 1 lệnh cắt: Mặc định $10,000$ CP/lệnh (có thể config).
  * Nếu `tradeQuantity` hiện có nhỏ hơn $Q_{\text{liquid}}$ (do vướng lệnh bán đang chờ khớp): Hệ thống tự động **HỦY TẤT CẢ CÁC LỆNH ĐẶT CÙNG CHIỀU CỦA DEAL ĐÓ** để giải phóng sức bán trước khi đẩy lệnh Force Sell.
  * Cấu hình thời gian chờ khớp (Timeout). Nếu quá thời gian chưa khớp, hệ thống hủy lệnh cũ, điều chỉnh giá và bắn cảnh báo Mattermost thông báo tình trạng thanh khoản yếu.

---

### 7.7. Quy Tắc Đồng Bộ Sự Kiện Core/Flex Vào Deal (BO Event Sync Matrix)

Tất cả các giao dịch nghiệp vụ phát sinh từ hệ thống Core/Back-office (Flex) đều gửi sự kiện qua Kafka topic `IntraDayBoEvent`. Deal Service phải lắng nghe và cập nhật trạng thái Deal theo ma trận quy tắc chuẩn sau:

| Mã GD (txCode) | Tên Giao Dịch Nghiệp Vụ | Tác Động Đến Số Dư Deal | Quy Tắc Xử Lý Bắt Buộc Của Deal Service |
|:---:|:---|:---|:---|
| **`2202`** | Phong tỏa chứng khoán | `tradeQuantity` $\downarrow$, `blockedQuantity` $\uparrow$ | **Chỉ cho phép phong tỏa trên Deal không nợ** (gói vay Type `N` hoặc 0%). Nếu Deal có nợ $\implies$ Chặn lại, bắn lỗi Mattermost yêu cầu xử lý manual. |
| **`2203`** | Giải tỏa chứng khoán | `tradeQuantity` $\uparrow$, `blockedQuantity` $\downarrow$ | Tìm đúng Deal đã bị phong tỏa trước đó để giải tỏa về khối lượng giao dịch. |
| **`2204`** | Cắt giảm chứng khoán | `tradeQuantity` $\downarrow$, `openQuantity` $\downarrow$ | **Chỉ được phép giảm trên Deal không có nợ**. Deal có nợ cấm cắt giảm tự động. |
| **`2205`** | Nhận chứng khoán mua | `tradeQuantity` $\uparrow$, `openQuantity` $\uparrow$ | Tăng khối lượng cổ phiếu giao dịch và tính toán lại `costPrice` cho Deal. |
| **`2245`** | Nhận chuyển khoản lưu ký từ nơi khác | `tradeQuantity` $\uparrow$, `costPrice` cập nhật | Tăng số dư cổ phiếu giao dịch, cập nhật giá vốn theo giá chuyển khoản. Nếu là nhận cổ tức thì tăng `dividendQuantity`. |
| **`2244`** | Chuyển khoản lưu ký đi nơi khác | `tradeQuantity` $\downarrow$, `openQuantity` $\downarrow$ | **Chỉ được phép chuyển từ Deal hoàn toàn không còn dư nợ**. |
| **`2242`** | Chuyển chứng khoán giữa các tiểu khoản | Giảm ở tiểu khoản chuyển, tăng ở tiểu khoản nhận | Áp dụng khi khách hàng chuyển cổ phiếu giữa các tài khoản nội bộ. |
| **`3341` / `3351`** | Quyền cổ tức/cổ phiếu thưởng về TK giao dịch | `tradeQuantity` $\uparrow$, `dividendTradeQuantity` $\uparrow$, `dividendReceivingQuantity` $\downarrow$ | Chuyển trạng thái từ cổ phiếu chờ về sang cổ phiếu được phép giao dịch. Đánh dấu cờ cổ phiếu cổ tức để tính thuế TNCN $5\%$ khi bán. |
| **`3350` / `3354`** | Phân bổ tiền cổ tức | `availableCash` $\uparrow$ | Tăng tiền mặt khả dụng trên tài khoản của khách hàng sau khi đã khấu trừ thuế TNCN. |
| **`3380` / `3384`** | Thực hiện đăng ký mua quyền phát hành thêm | `availableCash` $\downarrow$, `receivingRightQuantity` $\uparrow$ | Trừ tiền nộp quyền mua, ghi nhận khối lượng quyền mua chờ về gắn vào Deal. |
| **`3386`** | Hủy thực hiện quyền mua | `availableCash` $\uparrow$, `receivingRightQuantity` $\downarrow$ | Hoàn trả tiền vào tài khoản, giảm khối lượng quyền mua đang theo dõi. |
| **`2200`** | Rút lưu ký chứng khoán (khỏi VSD) | `tradeQuantity` $\downarrow$, `openQuantity` $\downarrow$ | Tương tự mã `2204`, chỉ áp dụng cho Deal không có nợ. |
| **`2287`** | Điều chỉnh số dư chứng khoán | `tradeQuantity` $\uparrow$ hoặc $\downarrow$ | Cập nhật số dư Deal theo quyết định điều chỉnh của phòng Nghiệp vụ/VSD. |

---

