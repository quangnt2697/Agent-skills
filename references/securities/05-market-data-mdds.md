# Cấp Độ 5: Dữ Liệu Thị Trường Real-time (MDDS / KRX Protocols)

> **Thuộc:** [Cẩm Nang Nghiệp Vụ Chứng Khoán](../securities-domain-rules.md)

## 5. CẤP ĐỘ 5 (NÂNG CAO): Dữ Liệu Thị Trường Real-time (MDDS / KRX Protocols)

### 5.1. Các Bản Tin MDDS Từ Sở (Message Specifications)

Hệ thống nhận luồng dữ liệu Market Data Dissemination System (MDDS) từ SGDCK qua giao thức FIX/FAST hoặc Binary:

| MsgType | Tên Bản Tin | Thời Điểm | Mục Đích Nghiệp Vụ |
|:---:|:---|:---:|:---|
| **`d`** | Security Definition (`IFMDFIX0001`) | Đầu ngày (Batch) | Thông tin mã CK, giá tham chiếu, giá trần, giá sàn, tỷ lệ ký quỹ, cờ điều kiện Random End (`Tag 30614`) |
| **`f`** | Security Status (`IFMDFIX0002`) | Realtime | Cập nhật cờ phiên (BoardEvent), trạng thái Halt/Unhalt từng mã hoặc toàn sàn |
| **`MW`** | Random End (`IFMDFIX0023`) | Realtime (Cuối ATO/ATC) | Thông báo kích hoạt hoặc giải tỏa khớp lệnh ngẫu nhiên (Tags `30615` đến `30623`) |
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
  market_data:board_event       Sự kiện cờ phiên realtime cấp sàn (ATO, Liên tục, ATC, Nghỉ trưa, Halt)
  quotes:symbol-trading-session Trạng thái phiên giao dịch realtime theo từng mã (tradingSessionId, enableRE)
  market_data:expected_price    Giá và khối lượng dự khớp trong phiên định kỳ ATO/ATC (Deem_Trade_Price)
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

