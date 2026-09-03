# Cẩm Nang Nghiệp Vụ Chứng Khoán & Hệ Thống Giao Dịch (Securities Domain Knowledge Base)

Tài liệu chuẩn hóa toàn bộ tri thức nghiệp vụ chứng khoán Việt Nam (thị trường cơ sở, phái sinh, hệ thống KRX, MDDS và OpenAPI) phân cấp từ **Cơ Bản $\rightarrow$ Nâng Cao**.
Tài liệu này là **Single Source of Truth** dùng chung cho toàn bộ 7 Persona trong hệ thống: **BA, DEV, QA/SDET, Code Reviewer, Security Auditor, Web Performance Auditor, Scrum Master**.

---

## MỤC LỤC

1. [CẤP ĐỘ 1 (CƠ BẢN): Khái Niệm Căn Bản & Cấu Trúc Thị Trường](#1-cấp-độ-1-cơ-bản-khái-niệm-căn-bản--cấu-trúc-thị-trường)
   - 1.1. Các Sở & Thị Trường (MarketID)
   - 1.2. Các Bảng Giao Dịch (BoardID)
   - 1.3. Biên Độ Dao Động Giá (Price Limits)
   - 1.4. Bảng Bước Giá (Tick Size) & Làm Tròn (Rounding)
   - 1.5. Đơn Vị Giao Dịch & Quy Tắc Lô (Lot Size)
   - 1.6. Chu Kỳ Thanh Toán & Dòng Tiền (Settlement T+2)
2. [CẤP ĐỘ 2 (TRUNG CẤP): Phiên Giao Dịch, Cờ Phiên & Lệnh Đặt](#2-cấp-độ-2-trung-cấp-phiên-giao-dịch-cờ-phiên--lệnh-đặt)
   - 2.1. Khung Thời Gian & Lịch Trình Các Phiên
   - 2.2. Bảng Mã Cờ Phiên Chuẩn KRX (BoardEventID & SessionID)
   - 2.3. Các Loại Lệnh Giao Dịch & Ma Trận Hiệu Lực Theo Phiên
   - 2.4. Quy Tắc Sửa Lệnh & Hủy Lệnh (Amend & Cancel)
3. [CẤP ĐỘ 3 (TRUNG CẤP): Vòng Đời Lệnh & Lệnh Điều Kiện](#3-cấp-độ-3-trung-cấp-vòng-đời-lệnh--lệnh-điều-kiện)
   - 3.1. Máy Trạng Thái Vòng Đời Lệnh (Order State Machine)
   - 3.2. Lệnh Điều Kiện & Quản Lý Rủi Ro (Conditional Orders)
4. [CẤP ĐỘ 4 (NÂNG CAO): Quản Lý Biến Động & Tạm Ngừng Giao Dịch Khẩn Cấp](#4-cấp-độ-4-nâng-cao-quản-lý-biến-động--tạm-ngừng-giao-dịch-khẩn-cấp)
   - 4.1. Tạm Ngừng Từng Chứng Khoán (Instrument Halt - EI8/EI1/EI9)
   - 4.2. Tạm Ngừng Toàn Thị Trường (Market Halt - AE8/AE1/BE9)
   - 4.3. Cơ Chế Ngắt Mạch Thị Trường (Circuit Breaker - CB)
   - 4.4. Ngắt Biến Động Giá (Volatility Interruption - VI) & Nới Biên Độ (PLE)
5. [CẤP ĐỘ 5 (NÂNG CAO): Dữ Liệu Thị Trường Real-time (MDDS / KRX Protocols)](#5-cấp-độ-5-nâng-cao-dữ-liệu-thị-trường-real-time-mdds--krx-protocols)
   - 5.1. Các Bản Tin MDDS Từ Sở (Message Specifications)
   - 5.2. Các Kênh WebSocket Datafeed Phân Phối Ra Khách Hàng
   - 5.3. Tiêu Chuẩn Tuần Tự Thời Gian & Đo Lường Độ Trễ (Latency Tracking)
6. [CẤP ĐỘ 6 (CHUYÊN SÂU): Sức Mua, Ký Quỹ (Margin) & Khối Ngoại](#6-cấp-độ-6-chuyên-sâu-sức-mua-ký-quỹ-margin--khối-ngoại)
   - 6.1. Công Thức Tính Sức Mua Khả Dụng (Buying Power)
   - 6.2. Quản Trị Rủi Ro Ký Quỹ & Tỷ Lệ An Toàn ($R_{tt}$)
   - 6.3. Quản Lý Room Chứng Khoán & Giao Dịch Nhà Đầu Tư Nước Ngoài
7. [MA TRẬN HƯỚNG DẪN THỰC THI CHO TỪNG PERSONA](#7-ma-trận-hướng-dẫn-thực-thi-cho-từng-persona)

---

## 1. CẤP ĐỘ 1 (CƠ BẢN): Khái Niệm Căn Bản & Cấu Trúc Thị Trường

### 1.1. Các Sở & Thị Trường (MarketID / TscProdGrpId)

Hệ thống giao dịch (chuẩn KRX/SGDCK) phân chia thị trường thành các mã định danh chuẩn:

| MarketID | TscProdGrpId | Tên Thị Trường | Sản Phẩm Giao Dịch |
|:---|:---|:---|:---|
| **STO** | **STO** (=7) | HoSE Stock | Cổ phiếu, Chứng chỉ quỹ đóng (CCQ), ETF, Chứng quyền có bảo đảm (CW) niêm yết tại HoSE |
| **STX** | **STX** (=8) | HNX Listed Stock | Cổ phiếu niêm yết tại HNX |
| **UPX** | **UPX** (=9) | HNX UpCoM | Cổ phiếu công ty đại chúng chưa niêm yết đăng ký giao dịch tại HNX |
| **DVX** | **FIO** (=4) | HNX Derivative Index | Hợp đồng tương lai chỉ số (VN30F, v.v.) |
| **DVX** | **FBX** (=3) | HNX Derivative Bond | Hợp đồng tương lai Trái phiếu Chính phủ |
| **HCX** | **HCX** (=5) | HNX Corp Bond | Trái phiếu doanh nghiệp riêng lẻ |
| **BDO** | **BDO** (=1) | HoSE Bond | Trái phiếu niêm yết tại HoSE |
| **BDX** | **BDX** (=2) | HNX Gov Bond | Trái phiếu Chính phủ tại HNX |
| **RPO** | **RPO** (=6) | HoSE Repo | Giao dịch mua bán lại HoSE |

### 1.2. Các Bảng Giao Dịch (BoardID)

Mỗi thị trường được chia thành nhiều bảng (board) xử lý các phương thức giao dịch khác nhau:

| BoardID | Mã Gốc Từ Sở | Tên Bảng & Ý Nghĩa | Quy Cách |
|:---|:---|:---|:---|
| **G1** | `G1`, `G7` (Buy-in), `G3` (Post) | **Khớp lệnh Lô chẵn (Main Board)** | Giao dịch khớp lệnh thông thường, lô từ 100 cổ phiếu |
| **G4** | `G4` | **Khớp lệnh Lô lẻ (Odd-lot Board)** | Giao dịch khớp lệnh lô lẻ từ 1 đến 99 cổ phiếu |
| **G7** | `G7` | **Buy-in Board** | Bảng mua bắt buộc xử lý thiếu hụt thanh toán chứng khoán (08:45 - 09:00) |
| **T1** | `T1`, `T2` (Pre), `T3` (Post) | **Thỏa thuận Lô chẵn (Negotiation Regular)** | Giao dịch thỏa thuận thông thường |
| **T4** | `T4`, `T6` (Post) | **Thỏa thuận Lô lẻ (Negotiation Odd-lot)** | Giao dịch thỏa thuận số lượng lẻ |

### 1.3. Biên Độ Dao Động Giá (Price Limits)

Giá của cổ phiếu chỉ được phép dao động trong phạm vi biên độ so với Giá tham chiếu (Reference Price):

$$\text{Giá Sàn (Floor)} \le \text{Giá Đặt} \le \text{Giá Trần (Ceiling)}$$

| Sàn Giao Dịch | Biên Độ Ngày Thường | Ngày Đầu Niêm Yết / Không Hưởng Quyền Cổ Tức Đặc Biệt |
|:---|:---:|:---:|
| **HoSE (STO)** | $\mathbf{\pm 7.0\%}$ | $\mathbf{\pm 20.0\%}$ |
| **HNX (STX)** | $\mathbf{\pm 10.0\%}$ | $\mathbf{\pm 30.0\%}$ |
| **UpCoM (UPX)** | $\mathbf{\pm 15.0\%}$ | $\mathbf{\pm 40.0\%}$ |

* **Quy tắc làm tròn Giá Trần/Sàn:**
  * Giá trần = Làm tròn xuống (Floor) theo bước giá hợp lệ sao cho không vượt quá biên độ $\%$.
  * Giá sàn = Làm tròn lên (Ceil) theo bước giá hợp lệ sao cho không vượt quá biên độ $\%$.
  * Lưu ý: Giá sàn luôn $> 0$. Nếu giá sàn tính ra $\le 0$, giá sàn sẽ bằng bước giá nhỏ nhất (ví dụ 10đ hoặc 100đ).

### 1.4. Bảng Bước Giá (Tick Size) & Làm Tròn (Rounding)

#### A. Quy Tắc Bước Giá Trên HoSE (Cổ phiếu, CCQ đóng, ETF)
| Dải Giá (VNĐ) | Bước Giá (Tick Size) | Ví Dụ Giá Hợp Lệ | Ví Dụ Giá Bị Từ Chối |
|:---|:---:|:---|:---|
| $\text{Giá} < 10,000$ | **10 VNĐ** | $9,810$; $9,820$; $9,830$ | $9,815$ (Lỗi: sai tick size) |
| $10,000 \le \text{Giá} \le 49,950$ | **50 VNĐ** | $25,000$; $25,050$; $25,100$ | $25,020$ (Lỗi: sai tick size) |
| $\text{Giá} \ge 50,000$ | **100 VNĐ** | $50,100$; $50,200$; $105,500$ | $50,150$ (Lỗi: sai tick size) |

* **Ngoại lệ:** Chứng quyền có bảo đảm (CW) và Chứng chỉ quỹ ETF trên HoSE áp dụng bước giá **10 VNĐ** cho mọi mức giá.

#### B. Quy Tắc Bước Giá Trên HNX & UpCoM
* Áp dụng thống nhất bước giá **100 VNĐ** cho mọi mức giá của cổ phiếu.

### 1.5. Đơn Vị Giao Dịch & Quy Tắc Lô (Lot Size)

* **Lô chẵn (Round Lot - Board G1):** Khối lượng phải là bội số của **100** ($100, 200, 1,000, \dots$). Khối lượng tối đa cho 1 lệnh đặt trên HoSE là **500,000** cổ phiếu.
* **Lô lẻ (Odd Lot - Board G4):** Khối lượng từ **1 đến 99** cổ phiếu. Lô lẻ khớp lệnh độc lập trên bảng G4, không ghép lệnh chung với lô chẵn.
* **Giao dịch Thỏa thuận (Board T1/T4):**
  * HoSE: Khối lượng tối thiểu từ **20,000** cổ phiếu trở lên. Không áp dụng bước giá (chỉ cần giá nằm trong biên độ Trần/Sàn).
  * HNX/UpCoM: Khối lượng từ **5,000** cổ phiếu trở lên.

### 1.6. Chu Kỳ Thanh Toán & Dòng Tiền (Settlement T+2)

* **Thời gian về tài khoản:** Chu kỳ thanh toán là **T+2**.
  * Cổ phiếu mua ngày $T$ sẽ về tài khoản vào **11:30 - 13:00 ngày $T+2$** (nhà đầu tư được bán ngay trong phiên chiều $T+2$).
  * Tiền bán chứng khoán ngày $T$ về tài khoản vào trưa ngày $T+2$.
* **Ứng trước tiền bán (Advance Cash):** Cho phép rút hoặc tăng sức mua ngay trong ngày $T$ và $T+1$ bằng dịch vụ ứng trước (tính lãi suất theo số ngày vay thực tế).

---

## 2. CẤP ĐỘ 2 (TRUNG CẤP): Phiên Giao Dịch, Cờ Phiên & Lệnh Đặt

### 2.1. Khung Thời Gian & Lịch Trình Các Phiên

```
  08:45     09:00       09:15              11:30    13:00              14:30       14:45     15:00
    |---------|-----------|------------------|--------|------------------|-----------|---------|
    | Buy-in  | Phiên ATO | Khớp liên tục    | Nghỉ   | Khớp liên tục    | Phiên ATC | PLO     |
    | (G7)    | (G1/G4)   | sáng (G1/G4)     | trưa   | chiều (G1/G4)    | (G1/G4)   | (HNX)   |
```

| Khung Giờ | Tên Phiên | Sàn Áp Dụng | Phương Thức Khớp | Lệnh Cho Phép |
|:---|:---|:---:|:---:|:---|
| **08:45 - 09:00** | Mua bắt buộc (Buy-in) | HoSE (Board G7) | Khớp lệnh định kỳ | LO, ATO, MP |
| **09:00 - 09:15** | Định kỳ mở cửa (**ATO**) | HoSE | Khớp lệnh định kỳ | **ATO, LO** (Cấm sửa/hủy) |
| **09:00 - 11:30** | Khớp liên tục sáng | HNX, UpCoM | Khớp lệnh liên tục | LO, MP/MTL/MOK/MAK (HNX) |
| **09:15 - 11:30** | Khớp liên tục sáng | HoSE | Khớp lệnh liên tục | **LO, MP** |
| **11:30 - 13:00** | **Nghỉ trưa** | Toàn thị trường | Tạm dừng khớp lệnh | Hệ thống nhận/chờ lệnh |
| **13:00 - 14:30** | Khớp liên tục chiều | Toàn thị trường | Khớp lệnh liên tục | LO, MP (HoSE), MTL/MOK/MAK (HNX) |
| **14:30 - 14:45** | Định kỳ đóng cửa (**ATC**) | HoSE, HNX | Khớp lệnh định kỳ | **ATC, LO** (Cấm sửa/hủy) |
| **14:45 - 15:00** | Khớp lệnh sau giờ (**PLO**) | HNX | Khớp lệnh liên tục | **PLO** (Khớp theo giá đóng cửa) |
| **09:00 - 15:00** | Giao dịch Thỏa thuận | Toàn thị trường | Thỏa thuận điện tử | Thỏa thuận (T1, T4) |

### 2.2. Bảng Mã Cờ Phiên Chuẩn KRX (BoardEventID & SessionID)

Hệ thống MDDS của KRX bắn realtime các event thay đổi trạng thái phiên qua message `35=f` (Security Status):

| BoardEventID | Tên Sự Kiện KRX | Ý Nghĩa Nghiệp Vụ | TradingSessionID |
|:---|:---|:---|:---:|
| **GT1** | `GT Order Load` | Nạp các lệnh Good-Till-Date (GTC) đầu ngày | `01` |
| **AA1** | `Opening CA Open` | Bắt đầu nhận lệnh phiên ATO (09:00) | `10` |
| **BB1** | `Cont.A Open for Non-PCA` | Bắt đầu phiên Khớp lệnh liên tục sáng (09:15) | `40` |
| **AW8** | `Lunch Break` | Bắt đầu giờ nghỉ trưa (11:30) | `40` (Treo) |
| **AW9** | `Open after Lunch Break` | Bắt đầu phiên Khớp lệnh liên tục chiều (13:00) | `40` |
| **BC1** | `Closing CA Open` | Bắt đầu nhận lệnh phiên ATC (14:30) | `30` |
| **AC2** | `Closing CA Execution` | Thực hiện khớp lệnh đóng cửa ATC (14:45) | `99` |
| **AB2** | `Board Trading Close` | Kết thúc toàn bộ giao dịch của bảng | `99` |
| **AQ3** | `Market Final Closing` | Đóng cửa toàn bộ hệ thống giao dịch | `99` |
| **CD1** | `PCA Open` | Mở phiên định kỳ nhiều đợt (cho cổ phiếu bị Hạn chế giao dịch) | `80` |
| **CD3** | `PCA Execution` | Khớp lệnh định kỳ nhiều đợt (15 phút/lần: 09:30, 09:45...) | `80` |

### 2.3. Các Loại Lệnh Giao Dịch & Ma Trận Hiệu Lực Theo Phiên

| Loại Lệnh | Định Nghĩa Nghiệp Vụ | Phiên Cho Phép | Đặc Tính Khớp & Hủy |
|:---|:---|:---|:---|
| **LO** (Limit Order) | Lệnh giới hạn: Mua với giá $\le$ giá đặt, Bán với giá $\ge$ giá đặt | ATO, Liên tục, ATC | Có hiệu lực cả ngày cho đến khi khớp hết hoặc bị hủy |
| **ATO** | Lệnh giao dịch tại giá mở cửa | Chỉ phiên ATO | Ưu tiên trước lệnh LO. Khối lượng chưa khớp tự động bị hủy sau phiên |
| **ATC** | Lệnh giao dịch tại giá đóng cửa | Chỉ phiên ATC | Ưu tiên trước lệnh LO. Khối lượng chưa khớp tự động bị hủy sau phiên |
| **MP** (Market Price) | Lệnh thị trường trên HoSE: Mua tại giá bán thấp nhất, Bán tại giá mua cao nhất | Khớp lệnh liên tục | Nếu chưa khớp hết, phần còn lại chuyển thành lệnh LO tại mức giá tiếp theo |
| **MTL** (Market to Limit) | Lệnh thị trường trên HNX | Khớp lệnh liên tục | Phần chưa khớp chuyển thành lệnh LO tại mức giá khớp cuối cùng |
| **MOK** (Match or Kill) | Lệnh khớp toàn bộ hoặc hủy trên HNX | Khớp lệnh liên tục | Nếu không khớp toàn bộ khối lượng ngay lập tức thì lệnh bị hủy ngay |
| **MAK** (Match and Kill) | Lệnh khớp và hủy phần còn lại trên HNX | Khớp lệnh liên tục | Khớp một phần, phần còn lại lập tức bị hủy bỏ |
| **PLO** (Post Limit Order) | Lệnh khớp sau giờ trên HNX | Phiên PLO (14:45-15:00) | Chỉ khớp tại mức giá đóng cửa ATC vừa xác định |

### 2.4. Quy Tắc Sửa Lệnh & Hủy Lệnh (Amend & Cancel)

1. **Quy tắc bất khả xâm phạm tại phiên ATO và ATC (HoSE):**
   * **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP SỬA HOẶC HỦY LỆNH** (kể cả lệnh LO hay lệnh ATO/ATC) trong suốt phiên định kỳ mở cửa (`09:00 - 09:15`) và đóng cửa (`14:30 - 14:45`).
2. **Quy tắc trong phiên khớp lệnh liên tục:**
   * Chỉ được sửa/hủy khối lượng **chưa khớp**.
   * **Sửa giảm khối lượng:** Giữ nguyên độ ưu tiên về thời gian.
   * **Sửa tăng khối lượng hoặc sửa giá:** Mất quyền ưu tiên thời gian cũ, lệnh được xếp lại độ ưu tiên thời gian tại thời điểm sửa.
3. **Quy tắc phiên PLO:** Không được sửa hoặc hủy lệnh PLO sau khi đã đặt.

---

## 3. CẤP ĐỘ 3 (TRUNG CẤP): Vòng Đời Lệnh & Lệnh Điều Kiện

### 3.1. Máy Trạng Thái Vòng Đời Lệnh (Order State Machine)

```
                       [Đặt lệnh từ Client]
                                 │
                                 ▼
                         ┌──────────────┐
                         │  PendingNew  │
                         └───────┬──────┘
                   Thành công    │    Lỗi Validate/Sở từ chối
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
        ┌──────────────┐                    ┌──────────────┐
        │     New      │                    │   Rejected   │
        └──────┬───────┘                    └──────────────┘
               │
    ┌──────────┴───────────────────────────┐
    │ Khớp một phần                        │ Hủy lệnh
    ▼                                      ▼
┌──────────────────┐               ┌──────────────┐
│  PartiallyFilled │               │  Cancelled   │
└────────┬─────────┘               └──────────────┘
         │ Khớp hết phần còn lại           ▲
         ▼                                 │ Hủy phần còn lại
┌──────────────────┐                       │
│      Filled      │───────────────────────┘
└──────────────────┘
```

* **Quy tắc chuyển trạng thái (State Transition Rules):**
  * Không thể chuyển từ `Filled`, `Cancelled`, `Rejected` sang bất kỳ trạng thái nào khác (Terminal States).
  * Khi sửa lệnh: Hệ thống sinh ra trạng thái trung gian `PendingReplace` trước khi xác nhận `Replaced`.
  * Hết ngày giao dịch: Lệnh ở trạng thái `New` hoặc `PartiallyFilled` tự động chuyển sang `Expired`.

### 3.2. Lệnh Điều Kiện & Quản Lý Rủi Ro (Conditional Orders)

Lệnh điều kiện được lưu giữ tại hệ thống máy chủ công ty chứng khoán (chưa đẩy vào Sở). Khi thị trường thỏa mãn điều kiện kích hoạt, hệ thống tự động sinh lệnh vào Sở.

1. **Lệnh Dừng (Stop Order):**
   * *Điều kiện kích hoạt:* $\text{Giá thị trường} \ge \text{Giá kích hoạt}$ (đối với Stop Buy) hoặc $\le \text{Giá kích hoạt}$ (đối với Stop Sell).
   * *Lệnh sinh ra:* Lệnh LO hoặc MP với giá và khối lượng cấu hình trước.
2. **Lệnh Xu Hướng (Trailing Stop):**
   * Đường kích hoạt bám sát giá đỉnh/đáy thị trường theo một khoảng trượt ($\Delta$ step).
   * Dùng để bảo toàn lợi nhuận tối đa trong một xu hướng tăng hoặc cắt lỗ tự động khi thị trường đảo chiều.
3. **Lệnh Chốt Lời / Cắt Lỗ Theo Deal (Take Profit / Stop Loss - TP/SL):**
   * Gắn trực tiếp với từng vị thế (Deal/Position) hoặc tiểu khoản.
   * Khi tỷ lệ lãi đạt ngưỡng $X\%$ $\rightarrow$ Kích hoạt lệnh Bán chốt lời.
   * Khi tỷ lệ lỗ chạm ngưỡng $-Y\%$ $\rightarrow$ Kích hoạt lệnh Bán cắt lỗ.
   * Cấu hình OCO (One-Cancels-the-Other): Khớp nhánh chốt lời thì tự động hủy nhánh cắt lỗ và ngược lại.

---

## 4. CẤP ĐỘ 4 (NÂNG CAO): Quản Lý Biến Động & Tạm Ngừng Giao Dịch Khẩn Cấp

### 4.1. Tạm Ngừng Từng Chứng Khoán (Instrument Halt)

Khi một mã chứng khoán có thông tin bất thường, SGDCK gửi tín hiệu tạm ngừng giao dịch mã đó trong phiên:

```
  [Giao dịch bình thường] ──(EI8)──> [Instrument Halt] ──(EI1)──> [15p Định kỳ sau Halt] ──(EI9)──> [Khớp liên tục]
                                                            (Riêng UPX: Không có 15p định kỳ, nhảy thẳng sang EI9)
```

* **Cờ `EI8` (Instrument Halt):** SGDCK gửi msg `35=f` có tag `20005=EI8` kèm mã `symbol`.
  * **Hành vi bắt buộc:** Hệ thống OMS/ORS và toàn bộ Client (Web/App) phải lập tức khóa giao dịch mã này (Status = `HALT`), từ chối mọi lệnh đặt mới.
* **Cờ `EI1` (Trading Halt Release by Instrument):** SGDCK gỡ bỏ tạm ngừng giao dịch.
  * *Trên HoSE (STO) & HNX (STX):* Bước vào **15 phút Khớp lệnh định kỳ sau Halt**. Trong 15 phút này: **CHỈ ĐƯỢC ĐẶT LỆNH LO, TUYỆT ĐỐI CẤM SỬA/HỦY**.
  * Nếu thời điểm gỡ Halt trùng với phiên ATC chung của Sở: Không mở 15p riêng mà gộp luôn vào phiên ATC chung (chỉ có cờ `EI1`, không trả `EI9`).
* **Cờ `EI9` (Cont.A Open after Instrument Halt):** Kết thúc 15 phút định kỳ, cổ phiếu quay trở lại phiên Khớp lệnh liên tục bình thường, cho phép sửa/hủy lệnh.
* **Riêng sàn UpCoM (UPX):** Khi gỡ ngừng giao dịch, Sở **KHÔNG** mở 15 phút định kỳ mà gửi thẳng cờ **`EI9`** để vào phiên liên tục ngay lập tức!

### 4.2. Tạm Ngừng Toàn Thị Trường (Market Halt)

Sự cố hệ thống kỹ thuật diện rộng hoặc tình huống khẩn cấp cấp quốc gia:

* **Cờ `AE8` (Market Halt):** Tag `20005=AE8` (Board = `AL`). Chặn toàn bộ giao dịch trên tất cả các mã và toàn bộ các bảng của thị trường đó.
* **Cờ `AE1` (Market Halt Release):** Gỡ tạm ngừng toàn thị trường. Bảng G1/G4 bước vào 15 phút khớp lệnh định kỳ sau Halt. Bảng thỏa thuận (T) giao dịch trở lại bình thường.
* **Cờ `BE9` (Cont.A Open after Market Halt):** Kết thúc 15 phút định kỳ sau Market Halt, toàn thị trường quay trở lại phiên khớp lệnh liên tục. (Với UpCoM gửi thẳng cờ `BE9` sau khi gỡ).

### 4.3. Cơ Chế Ngắt Mạch Thị Trường (Circuit Breaker - CB)

Áp dụng khi chỉ số thị trường (VNINDEX) giảm mạnh đột ngột qua các ngưỡng kích hoạt (ví dụ: $7\%$, $10\%$, $15\%$):
* **`AF6` (CB Notice):** Cảnh báo chuẩn bị ngắt mạch thị trường.
* **`AF8` (Suspension by CB):** Ngừng giao dịch toàn thị trường do ngắt mạch.
* **`AF1` (CA Open after CB):** Mở phiên khớp lệnh định kỳ sau khi hết thời gian ngắt mạch.
* **`BF9` (Cont.A Open after CB):** Khôi phục lại phiên liên tục.

### 4.4. Ngắt Biến Động Giá (Volatility Interruption - VI) & Nới Biên Độ (PLE)

* **VI (Msg MD / Session `50`):** Kích hoạt đối với từng mã khi giá dự khớp có sự biến động đột biến so với giá khớp tham chiếu gần nhất một khoảng định trước. Giao dịch mã đó tạm chuyển sang phiên khớp lệnh định kỳ ngắn (2-5 phút) để cân bằng cung cầu trước khi khớp tiếp.
* **PLE (Cờ `AT6`, `AT8`):** Price Limit Extension - Nới rộng biên độ giá theo cơ chế tự động khi thị trường chạm kịch trần/sàn với khối lượng dư thừa lớn.

---

## 5. CẤP ĐỘ 5 (NÂNG CAO): Dữ Liệu Thị Trường Real-time (MDDS / KRX Protocols)

### 5.1. Các Bản Tin MDDS Từ Sở (Message Specifications)

Hệ thống nhận luồng dữ liệu Market Data Dissemination System (MDDS) từ SGDCK qua giao thức FIX/FAST hoặc Binary:

| MsgType | Tên Bản Tin | Thời Điểm | Mục Đích Nghiệp Vụ |
|:---:|:---|:---:|:---|
| **`d`** | Security Definition | Đầu ngày (Batch) | Thông tin mã CK, giá tham chiếu, giá trần, giá sàn, tỷ lệ ký quỹ |
| **`f`** | Security Status | Realtime | Cập nhật cờ phiên (BoardEvent), trạng thái Halt/Unhalt từng mã hoặc toàn sàn |
| **`M7`** | Security Info Notification | Sáng (trước 09:00) | Thông báo điều chỉnh khẩn cấp giá tham chiếu/trần/sàn trước giờ mở cửa |
| **`M8`** | Symbol Closing Info | Cuối ngày (EOD) | Giá đóng cửa chính thức của từng mã CK |
| **`X`** | Market Price & Depth | Realtime | Dữ liệu khớp lệnh (Trades) và sổ lệnh độ sâu 10 mức giá (Top 10 Bids/Asks) |
| **`M1`** | Index Information | Realtime (1s) | Giá trị chỉ số, khối lượng, giá trị giao dịch của VNINDEX, VN30, HNX30 |
| **`M2`** | Foreign Trading | Realtime | Tổng khối lượng mua/bán của khối ngoại và Room ngoại còn lại |

### 5.2. Các Kênh WebSocket Datafeed Phân Phối Ra Khách Hàng

Hệ thống BE chuẩn hóa dữ liệu MDDS thành các topic WebSocket JSON/Protobuf cung cấp cho Web/App/OpenAPI:

```
  Kênh Socket                   Nội Dung Dữ Liệu
  ───────────────────────────── ─────────────────────────────────────────────────────────────
  market_data:tick              Thông tin khớp lệnh gần nhất (Price, Vol, Side: Mua/Bán chủ động, Timestamp)
  market_data:topprice          3 hoặc 10 mức giá Mua/Bán tốt nhất kèm khối lượng (Sổ lệnh độ sâu)
  market_data:board_event       Sự kiện cờ phiên realtime (ATO, Liên tục, ATC, Nghỉ trưa, Halt)
  market_data:expected_price    Giá và khối lượng dự khớp trong phiên định kỳ ATO/ATC
  market_data:ohlc_realtime     Nến kỹ thuật cập nhật realtime (1m, 5m, 1h, 1D)
  market_data:ohlc_closed       Event xác nhận ĐÓNG nến theo từng resolution (đặc biệt quan trọng cuối ngày)
  market_data:foreigner         Dữ liệu giao dịch khối ngoại: Room còn lại, KL mua/bán trong ngày
  market_data:market_index      Điểm chỉ số VNINDEX, VN30, độ rộng thị trường (Số mã Tăng/Giảm/Trần/Sàn)
```

### 5.3. Tiêu Chuẩn Tuần Tự Thời Gian & Đo Lường Độ Trễ (Latency Tracking)

1. **Quy tắc Time-series Strict Ordering:**
   * Gói tin khớp lệnh hoặc nến phát sinh sau **BẮT BUỘC** phải có timestamp Sở ($T_{\text{exchange}}$) lớn hơn hoặc bằng gói tin trước đó.
   * Client tuyệt đối không được nhận gói tin đảo lộn thời gian (tránh trường hợp nến mới bị đè bởi nến cũ).
2. **Tracking Latency Toàn Trình:**
   $$\text{Total Latency} = T_{\text{client\_receive}} - T_{\text{exchange}}$$
   Bao gồm 3 chặng đo lường:
   * Chặng 1: $T_{\text{gateway\_receive}} - T_{\text{exchange}}$ (Độ trễ từ SGDCK về hạ tầng công ty chứng khoán).
   * Chặng 2: $T_{\text{socket\_broadcast}} - T_{\text{gateway\_receive}}$ (Thời gian xử lý nội bộ BE/Matching Engine/Broker).
   * Chặng 3: $T_{\text{client\_receive}} - T_{\text{socket\_broadcast}}$ (Độ trễ đường truyền mạng internet đến Web/App).

---

## 6. CẤP ĐỘ 6 (CHUYÊN SÂU): Sức Mua, Ký Quỹ (Margin) & Khối Ngoại

### 6.1. Công Thức Tính Sức Mua Khả Dụng (Buying Power)

$$\text{Sức Mua} = \frac{\text{Tiền Mặt Khả Dụng} + \text{Tiền Bán Chờ Về} + \text{Hạn Mức Thấu Chi} - \text{Giá Trị Lệnh Mua Đang Chờ}}{\text{Tỷ Lệ Ký Quỹ Ban Đầu của Mã Chứng Khoán } (IMR)}$$

* Với tài khoản đuôi thường (Tiểu khoản 1): $IMR = 100\% \implies \text{Sức Mua} = \text{Tiền Thực Có}$.
* Với tài khoản ký quỹ Margin (Tiểu khoản 6): $IMR$ dao động từ $50\%$ đến $70\%$ tùy theo danh mục ký quỹ được UBCKNN phê duyệt. Ví dụ cổ phiếu $VNM$ có $IMR = 50\%$, có 100 triệu tiền mặt $\implies$ Sức mua tối đa = 200 triệu.

### 6.2. Quản Trị Rủi Ro Ký Quỹ & Tỷ Lệ An Toàn ($R_{tt}$)

Tỷ lệ thực tế tài khoản ký quỹ ($R_{tt}$) xác định mức độ an toàn tài chính:

$$R_{tt} = \frac{\text{Tổng Giá Trị Danh Mục Chứng Khoán Theo Giá Thị Trường} - \text{Tổng Dư Nợ Vay Gốc \& Lãi}}{\text{Tổng Giá Trị Danh Mục Chứng Khoán Định Giá Ký Quỹ}}$$

| Ngưỡng $R_{tt}$ | Trạng Thái Tài Khoản | Hành Động Xử Lý Bắt Buộc |
|:---:|:---|:---|
| $R_{tt} \ge 100\%$ | **An Toàn (Normal)** | Tài khoản giao dịch bình thường, được rút tiền dư hoặc mua thêm. |
| $85\% \le R_{tt} < 100\%$ | **Cảnh Báo (Warning)** | Không cho phép giải ngân mua thêm các mã rủi ro. |
| $\mathbf{80\% \le R_{tt} < 85\%}$ | **Call Margin** | Gửi thông báo Call Margin. Khách hàng có 1 đến 2 phiên để nộp thêm tiền hoặc chủ động bán bớt tài sản. |
| $\mathbf{R_{tt} < 80\%}$ | **Force Sell (Giải chấp)** | **Hệ thống tự động kích hoạt bán giải chấp cổ phiếu** trong phiên khớp lệnh liên tục gần nhất để đưa $R_{tt}$ về mức an toàn. |

### 6.3. Quản Lý Room Chứng Khoán & Giao Dịch Nhà Đầu Tư Nước Ngoài

1. **Foreign Room (Tỷ lệ sở hữu nước ngoài):**
   * Mỗi mã chứng khoán có tỷ lệ sở hữu tối đa dành cho nhà đầu tư nước ngoài (thường là $49\%$, $100\%$ hoặc $30\%$ với ngân hàng).
   * Khi **Room nước ngoài = 0**: Lệnh MUA của tài khoản nước ngoài **BẮT BUỘC BỊ TỪ CHỐI**. Lệnh BÁN vẫn được thực hiện bình thường và sẽ làm tăng lại Room trống.
2. **Margin Room (Hạn mức cho vay của CTCK):**
   * **Room mã chứng khoán:** Giới hạn tối đa tổng khối lượng cho vay đối với 1 mã (theo quy định UBCK không vượt quá $5\%$ tổng số cổ phiếu lưu hành).
   * **Room công ty:** Giới hạn tổng dư nợ cho vay margin trên toàn hệ thống (không vượt quá 2 lần vốn chủ sở hữu CTCK).

---

## 7. MA TRẬN HƯỚNG DẪN THỰC THI CHO TỪNG PERSONA

| Persona | Nhiệm Vụ Cốt Lõi Khi Tham Chiếu Tài Liệu Này |
|:---|:---|
| 📋 **BA / PO** | - Bắt buộc trích xuất đầy đủ các điều kiện ngầm (Biên độ giá, Tick size, Lô chẵn/lẻ, Cờ phiên) vào file đặc tả `final.md`.<br>- Thiết kế Acceptance Criteria bao phủ đủ các kịch bản: ATO/ATC cấm sửa hủy, Instrument Halt, và hết Room ngoại. |
| 💻 **DEV** | - Xây dựng Data Models (DTOs) với kiểu dữ liệu số học chính xác (`BigDecimal` hoặc string, cấm dùng `float` gây sai số tiền tệ).<br>- Triển khai đầy đủ Order State Machine và cơ chế chặn đặt lệnh khi mã bị `EI8` (Halt).<br>- Tối ưu hóa độ trễ xử lý gói tin WebSocket và đo lường Latency đúng 3 chặng. |
| 🧪 **QA / SDET** | - Áp dụng kỹ thuật **BVA 3 giá trị** cho biên trần/sàn $\{Ceil - \epsilon, Ceil, Ceil + \epsilon\}$.<br>- Viết kịch bản Gherkin kiểm thử các biên thời gian chuyển phiên (`08:59:59` vs `09:00:00`, `14:29:59` vs `14:30:00`).<br>- Kiểm thử tự động tính tuần tự Timestamp và kịch bản Offline/Reconnect của WebSocket datafeed. |
| 🔍 **Code Reviewer** | - Rà soát logic tính sức mua, lãi vay margin và làm tròn tiền tệ.<br>- Ngăn chặn tình trạng hardcode giá trần/sàn hoặc bỏ qua kiểm tra bước giá. |
| 🛡️ **Security Auditor** | - Kiểm tra lỗ hổng IDOR khi hủy/sửa lệnh giữa các tài khoản khác nhau.<br>- Quét lỗi Race Condition khi khách hàng gửi đồng thời nhiều lệnh mua vượt quá sức mua thực tế (Double Spending / Negative Balance).<br>- Kiểm toán xác thực 2FA (Smart OTP, Authenticator TOTP) cho các giao dịch nhạy cảm. |
| ⚡ **Web Performance** | - Đo lường thông lượng (Throughput) và FPS của Bảng giá khi có bão tin nhắn (Market storm / Spike traffic 10,000 msgs/s).<br>- Tối ưu DOM rendering cho sổ lệnh Top Price và biểu đồ kỹ thuật. |
| ⏱️ **Scrum Master** | - Đánh giá độ phức tạp của các User Story liên quan đến KRX/MDDS để hỗ trợ team ước lượng Story Points chính xác trong Sprint Planning. |
