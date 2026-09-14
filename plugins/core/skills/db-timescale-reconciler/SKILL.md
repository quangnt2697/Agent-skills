---
name: db-timescale-reconciler
description: Sử dụng khi cần quét, đối chiếu hoặc kiểm tra độ lệch dữ liệu TimescaleDB Production giữa các bảng V3 so với V2 hoặc giữa bảng raw của Sở (MDDS feeds) với bảng đã xử lý cho 11 topic thị trường KRX. Kích hoạt khi chạy lệnh /db-recon hoặc nhận yêu cầu đối chiếu dữ liệu thị trường.
---

# db-timescale-reconciler: Đối Chiếu & Kiểm Tra Độ Lệch Dữ Liệu TimescaleDB Production

## Tổng quan (Overview)

Kỹ năng `db-timescale-reconciler` chuyên trách quét, đối chiếu và kiểm tra tính nhất quán (Data Parity & Reconciliation) của dữ liệu thị trường chứng khoán KRX MDDS trên **TimescaleDB Production (DB ID: `${METABASE_PROD_DB_TIMESCALE_ID}`)** thông qua Metabase API (`${METABASE_PROD_URL}`).

Hệ thống dựa trên tài liệu đặc tả kiến trúc **[KRX] Xử lý dữ liệu thị trường MDDS**, đối chiếu hai chiều:
1. **Pipeline v3 so với v2:** Kiểm tra sự chuyển đổi từ mô hình cũ (gộp topic Stock Info) sang mô hình mới (phân tách thành các stream chuyên biệt v3).
2. **Stream Raw của Sở so với Bảng Đã Xử Lý:** Đối chiếu các message thô từ Sở HOSE/HNX (`ticks`, `top_prices`, `security_definitions`, `indices`...) với bảng chuẩn hóa để phát hiện rớt bản ghi (dropped packets), trễ nến (OHLC lag), hoặc lệch khối lượng.

Tất cả các truy vấn đều tuân thủ nghiêm ngặt **nguyên tắc 4 lớp bảo vệ 100% Read-Only** (Zero-Mutation Policy).

---

## Khi nào cần sử dụng (When to Use)

Sử dụng kỹ năng này trong các tình huống sau:
- **Kiểm toán dữ liệu định kỳ:** Hằng ngày sau phiên giao dịch hoặc đầu ngày để kiểm tra tính toàn vẹn của dữ liệu thị trường.
- **Xác minh lỗi dữ liệu (Data Bug Triage):** Khi người dùng báo cáo bảng giá bị lag, lệch giá khớp, nhảy sai bước giá, hoặc biểu đồ thiếu nến so với sàn.
- **Kiểm thử nghiệm thu (QA Verification):** Sau khi deploy phiên bản mới của pipeline MDDS, dùng để kiểm tra xem số lượng bản ghi V3 có khớp 100% với V2 và Sở raw hay không.
- **Hỗ trợ BA & DEV:** Khi cần khảo sát mẫu dữ liệu thực tế và đối chiếu sự khác biệt giữa hai mô hình bảng.
- **Kích hoạt qua lệnh:** Người dùng gõ `/db-recon` hoặc yêu cầu "đối chiếu dữ liệu", "kiểm tra lệch tick/topprice/ohlc", "so sánh v3 với v2".

---

## Danh Mục 11 Topic Nghiệp Vụ MDDS

Kỹ năng quản lý thư viện câu query mẫu tại `resources/reconciliation-queries.json` bao phủ 11 topic:

1. **Trade / Khớp lệnh Ticks (Msg `Price - X`):** `krx_mdds_v3_ticks` vs `krx_mdds_v2_ticks` vs `ticks` (raw).
2. **Trade Extra (BE tính toán `side`, `avgprice`):** `krx_mdds_v3_ticks_extra` vs `krx_mdds_v3_ticks`.
3. **Quote / Sổ lệnh TopPrice (Msg `Price - X`):** `krx_mdds_v3_top_prices` vs `krx_mdds_v2_top_prices` vs `top_prices` (raw).
4. **Expected Price ATO/ATC (Msg `ME` + `M8`):** `expected_price_v3` vs `expected_price_v3_snapshots` vs `deem_trade_prices`.
5. **OHLC Nến kỹ thuật (Tổng hợp từ Tick):** `krx_mdds_v2_stock_ohlc` vs `stock_ohlc` vs `ohlc`.
6. **Market Index (Msg `Index - M1`):** `krx_mdds_v3_market_indices` vs `krx_mdds_v2_market_indices` vs `indices`.
7. **Board Session Events (Msg `Security Status - f`):** `krx_mdds_v3_board_events` vs `krx_mdds_v2_board_events` vs `sessions`.
8. **Symbol Board Events (Msg `Security Status - f`):** `krx_mdds_v3_symbol_board_events` vs `krx_mdds_v2_symbol_board_events`.
9. **Foreign Investor (Msg `MT` + `MF`):** `krx_mdds_v3_trading_foreign_investors` vs `trading_result_of_foreign_investors` vs `foreigner_order_limits`.
10. **Security Definition (Msg `d` + `M7`):** `security_definition_v3` vs `security_definitions` (phát hiện mã niêm yết bị mất).
11. **Volatility Interruption / Random End (Msg `MD` + `MW`):** `volatility_interruptions` vs `price_limit_expansions` vs `random_ends`.

---

## Hướng dẫn thực thi

### Cách 1: Chạy tự động qua CLI Runner

```bash
# Chạy Master Dashboard quét đồng loạt 11 topic trong ngày hôm nay:
node scripts/db-recon.js

# Chạy đối chiếu chuyên sâu Ticks của ngày cụ thể:
node scripts/db-recon.js recon-ticks --date 2026-09-08

# Lọc theo mã cổ phiếu cụ thể (ví dụ: FPT):
node scripts/db-recon.js recon-ticks --symbol FPT

# Xem danh sách tất cả các câu query có sẵn:
node scripts/db-recon.js --list
```

### Cách 2: Gọi qua DB MCP Tool trong chat
Agent có thể gọi tool `db_query` trên TimescaleDB (`database: "timescale"`) với template SQL tương ứng trong `resources/reconciliation-queries.json`.

---

## Những lời biện minh thường gặp (Common Rationalizations)

- *"Dữ liệu lệch vài tick là bình thường do mạng trễ, không cần so sánh."*
  $\rightarrow$ **Sai lầm:** Trong giao dịch chứng khoán, lệch 1 tick có thể dẫn tới tính sai giá cao/thấp nhất ngày, sai nến OHLC, hoặc sai giá trị khớp lệnh tổng. Cần đối chiếu chính xác để khoanh vùng sự cố mạng hay lỗi xử lý của pipeline.
- *"Chỉ cần kiểm tra bảng v3 là đủ, không cần đối chiếu với v2 hay bảng raw của Sở."*
  $\rightarrow$ **Sai lầm:** Bảng raw của Sở là chân lý (Ground Truth). Nếu không so sánh v3 với raw, ta không thể biết pipeline mới có làm rơi rụng thông điệp hay không.
- *"Viết query ad-hoc tự nghĩ ra để chạy cho nhanh."*
  $\rightarrow$ **Sai lầm:** Query tự nghĩ dễ gây khóa bảng hoặc quét toàn bộ partition lớn trên Production. Luôn sử dụng query catalog đã được tối ưu hóa và kiểm duyệt Read-Only trong `reconciliation-queries.json`.

---

## Cờ đỏ (Red Flags)

- 🚩 **Độ lệch vượt quá 1%:** Số lượng tick hoặc top price giữa v3 và v2/raw lệch trên 1% $\implies$ Cảnh báo nguy cơ nghẽn hàng đợi Kafka hoặc rớt packet mạng.
- 🚩 **Mã bị thiếu trong Security Definition (`status != 'MATCH'`):** Mã cổ phiếu có giao dịch trên Sở nhưng không xuất hiện trong `security_definition_v3` $\implies$ Khách hàng không thể đặt lệnh hoặc nhìn thấy bảng giá của mã đó.
- 🚩 **Lệch tổng khối lượng khớp (`diff_vol != 0`):** Tổng khối lượng khớp tích lũy giữa hai bảng bị chênh lệch $\implies$ Sai lệch số liệu thanh khoản thị trường.
- 🚩 **Hết hạn Session Token (401/403):** Nếu gặp lỗi xác thực Metabase, bắt buộc chạy `npm run metabase:login` để làm mới token qua browser SSO trước khi tiếp tục.

---

## Xác minh (Verification)

Sau khi chạy đối chiếu, Agent cần xác minh:
1. **Kiểm tra trạng thái đối chiếu:** Toàn bộ các topic chính phải hiển thị `🟢 MATCH`. Nếu có `🔴 DISCREPANCY`, phải xuất bảng chi tiết danh sách mã bị lệch và số lượng cụ thể.
2. **Kiểm tra tính an toàn Read-Only:** Câu query phải được thực thi qua `sanitizeQuery` và giới hạn tối đa 200 dòng (`applyLimit`).
3. **Traceability:** Báo cáo kết quả phải ghi rõ: Thời gian truy vấn, database ID (từ `.env`), ngày giao dịch đối chiếu, và độ trễ phản hồi (latency tính bằng ms).
