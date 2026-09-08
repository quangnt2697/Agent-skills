# Cấp Độ 1: Khái Niệm Căn Bản & Cấu Trúc Thị Trường

> **Thuộc:** [Cẩm Nang Nghiệp Vụ Chứng Khoán](../securities-domain-rules.md)

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

