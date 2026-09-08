# Cấp Độ 4: Quản Lý Biến Động & Tạm Ngừng Giao Dịch Khẩn Cấp

> **Thuộc:** [Cẩm Nang Nghiệp Vụ Chứng Khoán](../securities-domain-rules.md)

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

