# Cẩm Nang Vận Hành Đối Chiếu Dữ Liệu TimescaleDB KRX MDDS

Tài liệu tham chiếu chi tiết cho skill `db-timescale-reconciler`: Bảng danh mục query, cấu trúc database, enum phiên giao dịch, bảng lỗi và mẫu báo cáo chuẩn.

---

## 1. Bảng Tên Bảng DB & Partition Key

| Layer | Bảng | Msg Sở | Partition Key | Ghi chú |
|-------|------|--------|---------------|---------|
| **RAW** | `prices` | Price (X) | `sending_time` | Thay thế bảng deprecated `ticks` |
| **RAW** | `security_definition_snapshot` | Security Definition (d) | — | Bảng snapshot |
| **V3** | `krx_mdds_v3_ticks` | Price (X) + enrich side/avgprice | `sending_time` | V3 ticks chuẩn |
| **V3** | `krx_mdds_v3_ticks_extra` | Price (X) + side computed | `sending_time` | Extra trade fields |
| **V3** | `krx_mdds_v3_top_prices` | Price (X) bid/ask | `sending_time` | Sổ lệnh 3 giá |
| **V3** | `krx_mdds_v3_market_indices` | Index (M1) | `transact_time` | Chỉ số thị trường |
| **V3** | `krx_mdds_v3_board_events` | Security Status (f) | `sending_time` | Board status đã gộp |
| **V3** | `krx_mdds_v3_symbol_board_events` | Symbol Event | `sending_time` | Trạng thái từng mã |
| **V3** | `krx_mdds_v3_trading_foreign_investors` | Trading Foreign (MT) | `sending_time` | Giao dịch khối ngoại |
| **V3** | `security_definition_v3` | Security Definition (d) | — | Danh mục mã niêm yết |
| **V3** | `expected_price_v3` | Deem Trade Price (ME) | `sending_time` | Giá dự kiến ATO/ATC |
| **V2** | `krx_mdds_v2_ticks` | Price (X) legacy | `sending_time` | Đối chiếu V3 vs V2 |
| **V2** | `krx_mdds_v2_top_prices` | Price (X) legacy | `sending_time` | Đối chiếu V3 vs V2 |
| **V2** | `krx_mdds_v2_stock_ohlc` | OHLC source | `time` | Nguồn nến |
| **Derived** | `stock_ohlc` | Aggregated từ V2 OHLC | `time` | Nến tổng hợp |

---

## 2. trading_session_id Enum Map (DB lưu INT)

| Giá trị DB (int) | Code Sở (string) | Tên phiên |
|---|---|---|
| 1 | "01" | GT Order Load |
| **2** | **"10"** | **ATO — Opening Call Auction** |
| 3 | "11" | ATO Extension |
| 4 | "20" | Call Auction after Halt |
| 5 | "21" | CA after Halt Extension |
| **6** | **"30"** | **ATC — Closing Call Auction** |
| **7** | **"40"** | **Continuous Auction (Khớp lệnh liên tục)** |
| 8 | "50" | VI Call Auction |
| 9 | "51" | VI CA Extension |
| 10 | "60" | Order Accept Only |
| 12 | "80" | PCA (Periodic Call Auction) |
| 13 | "90" | Trading Halt |
| 14 | "99" | Board Closing |

> Khi filter phiên: dùng **integer** (ví dụ: `trading_session_id IN (2, 6, 7)`), **KHÔNG** dùng string ('10', '30', '40').

---

## 3. board_id Quy Tắc Gộp (V3)

| board_id trong V3 | Gộp từ board Sở |
|---|---|
| `G1` | G1 + G7 + G3 (lô chẵn + buy-in + post-closing) |
| `T1` | T1 + T2 + T3 (thỏa thuận lô chẵn regular/pre/post) |
| `T4` | T4 + T6 (thỏa thuận lô lẻ regular/post) |
| `G4` | G4 only (lô lẻ) |

---

## 4. Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| HTTP 401/403 | Session token hết hạn | Tự động hoặc chạy `npm run metabase:login` để làm mới token |
| Query timeout | Scan dữ liệu quá lớn | Kiểm tra điều kiện `sending_time >= ...` (partition pruning), thu hẹp khoảng thời gian |
| Column not found | Sai lệch schema v2/v3 | Xác nhận tên cột qua `\d table_name`, không tự ý đổi tên cột trong SQL |
| Kết quả rỗng | Không có dữ liệu | Xác nhận ngày kiểm tra có phải ngày giao dịch (loại trừ T7, CN, ngày lễ) |
