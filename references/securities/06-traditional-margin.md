# Cấp Độ 6: Sức Mua & Ký Quỹ Truyền Thống Theo Tiểu Khoản

> **Thuộc:** [Cẩm Nang Nghiệp Vụ Chứng Khoán](../securities-domain-rules.md)

## 6. CẤP ĐỘ 6 (CHUYÊN SÂU): Sức Mua & Ký Quỹ Truyền Thống Theo Tiểu Khoản (.1 và .6)

### 6.1. Mô Hình Tiểu Khoản Truyền Thống (.1 Thường & .6 Ký Quỹ)

Hầu hết các công ty chứng khoán truyền thống tại Việt Nam phân tách tài khoản của nhà đầu tư thành các tiểu khoản độc lập dưới một số tài khoản lưu ký (CustodyID / AccountNo):

* **Tiểu khoản thường (Đuôi `.1`):** 
  * Chỉ được giao dịch trong phạm vi số tiền mặt và chứng khoán thực có (Tỷ lệ ký quỹ $IMR = 100\%$).
  * Không phát sinh nghĩa vụ nợ margin, không chịu áp lực Call Margin hay giải chấp từ thị trường.
* **Tiểu khoản ký quỹ (Đuôi `.6`):**
  * Được cấp hạn mức vay ký quỹ theo danh mục cổ phiếu cho vay do CTCK và UBCKNN quy định.
  * Toàn bộ tài sản (tiền và chứng khoán) trên tiểu khoản `.6` được gộp chung thành một **danh mục tổng thể (Portfolio)** để làm tài sản bảo đảm cho tổng dư nợ vay.
* **Nhược điểm cốt lõi của mô hình truyền thống:**
  1. **Bất tiện dòng tiền:** Khách hàng phải liên tục thực hiện nghiệp vụ chuyển tiền nội bộ giữa đuôi `.1` và đuôi `.6` khi muốn thay đổi nhu cầu sử dụng đòn bẩy.
  2. **Hiệu ứng lây lan rủi ro chéo (Cross-Default / Contagion Risk):** Khi một mã cổ phiếu trong danh mục margin sụt giảm nghiêm trọng (mất thanh khoản, giảm sàn nhiều phiên liên tục), tỷ lệ an toàn chung của cả tiểu khoản sụt giảm mạnh. Hệ thống sẽ **bán giải chấp bất kỳ cổ phiếu nào có thanh khoản** trong danh mục để thu hồi nợ, làm tổn hại đến các vị thế cổ phiếu tốt của khách hàng.
  3. **Khó đo lường hiệu suất từng thương vụ:** Khách hàng không thể bóc tách chính xác lãi/lỗ, chi phí lãi vay và giá hòa vốn của riêng từng lần giải ngân cho một mã cụ thể.

### 6.2. Công Thức Tính Sức Mua Khả Dụng (Buying Power)

$$\text{Sức Mua} = \frac{\text{Tiền Mặt Khả Dụng} + \text{Tiền Bán Chờ Về} + \text{Hạn Mức Thấu Chi} - \text{Giá Trị Lệnh Mua Đang Chờ}}{\text{Tỷ Lệ Ký Quỹ Ban Đầu của Mã Chứng Khoán } (IMR)}$$

* Với tiểu khoản thường (`.1`): $IMR = 100\% \implies \text{Sức Mua} = \text{Tiền Thực Có}$.
* Với tiểu khoản ký quỹ (`.6`): $IMR$ dao động từ $50\%$ đến $70\%$ tùy theo danh mục ký quỹ được UBCKNN phê duyệt. Ví dụ cổ phiếu $VNM$ có $IMR = 50\%$, có 100 triệu tiền mặt $\implies$ Sức mua tối đa = 200 triệu.

### 6.3. Quản Trị Rủi Ro Ký Quỹ Tổng Thể ($R_{tt}$) & Force Sell Toàn Danh Mục

Tỷ lệ thực tế tài khoản ký quỹ ($R_{tt}$) xác định mức độ an toàn tài chính toàn bộ tiểu khoản `.6`:

$$R_{tt} = \frac{\text{Tổng Giá Trị Danh Mục Chứng Khoán Theo Giá Thị Trường} - \text{Tổng Dư Nợ Vay Gốc \& Lãi}}{\text{Tổng Giá Trị Danh Mục Chứng Khoán Định Giá Ký Quỹ}}$$

| Ngưỡng $R_{tt}$ | Trạng Thái Tài Khoản | Hành Động Xử Lý Bắt Buộc |
|:---:|:---|:---|
| $R_{tt} \ge 100\%$ | **An Toàn (Normal)** | Tài khoản giao dịch bình thường, được rút tiền dư hoặc mua thêm. |
| $85\% \le R_{tt} < 100\%$ | **Cảnh Báo (Warning)** | Không cho phép giải ngân mua thêm các mã rủi ro. |
| $\mathbf{80\% \le R_{tt} < 85\%}$ | **Call Margin** | Gửi thông báo Call Margin. Khách hàng có 1 đến 2 phiên để nộp thêm tiền hoặc chủ động bán bớt tài sản. |
| $\mathbf{R_{tt} < 80\%}$ | **Force Sell (Giải chấp toàn danh mục)** | **Hệ thống tự động kích hoạt bán giải chấp cổ phiếu** trong phiên khớp lệnh liên tục gần nhất để đưa $R_{tt}$ về mức an toàn. Khi bán, CTCK chọn các mã có thanh khoản cao nhất trong danh mục để ép bán. |

### 6.4. Quản Lý Room Chứng Khoán & Khối Ngoại

1. **Foreign Room (Tỷ lệ sở hữu nước ngoài):**
   * Mỗi mã chứng khoán có tỷ lệ sở hữu tối đa dành cho nhà đầu tư nước ngoài (thường là $49\%$, $100\%$ hoặc $30\%$ với ngân hàng).
   * Khi **Room nước ngoài = 0**: Lệnh MUA của tài khoản nước ngoài **BẮT BUỘC BỊ TỪ CHỐI**. Lệnh BÁN vẫn được thực hiện bình thường và sẽ làm tăng lại Room trống.
2. **Margin Room (Hạn mức cho vay của CTCK):**
   * **Room mã chứng khoán:** Giới hạn tối đa tổng khối lượng cho vay đối với 1 mã (theo quy định UBCK không vượt quá $5\%$ tổng số cổ phiếu lưu hành).
   * **Room công ty:** Giới hạn tổng dư nợ cho vay margin trên toàn hệ thống (không vượt quá 2 lần vốn chủ sở hữu CTCK).

---

