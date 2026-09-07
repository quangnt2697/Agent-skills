# Từ Điển Schema TimescaleDB (Database ID: 644 — Market Info / KRX)

## 1. Tổng Quan
- **Database ID trên Metabase:** `644`
- **Hệ quản trị CSDL:** TimescaleDB (PostgreSQL Extension)
- **Hạ tầng nội bộ:** `encapital-timescaledb.market-info:5432/market`
- **Tổng số bảng trong schema public:** `114` bảng
- **Vị trí file Cache dữ liệu máy (Zero-Latency):** [`.agents/cache/schema-644.json`](../.agents/cache/schema-644.json)
- **Tài liệu tham chiếu chuẩn:** [`references/securities-domain-rules.md`](./securities-domain-rules.md)

---

## 2. Cách Tra Cứu Nhanh Bằng DB MCP Server

```bash
# Liệt kê tất cả 114 bảng (chạy từ cache trong 0.2s):
node .agents/db-mcp.js --list-tables --db timescale

# Xem chi tiết cấu trúc cột & kiểu dữ liệu của bất kỳ bảng nào:
node .agents/db-mcp.js --describe krx_mdds_v2_ticks --db timescale
node .agents/db-mcp.js --describe krx_mdds_v2_top_prices --db timescale
node .agents/db-mcp.js --describe security_definitions --db timescale

# Làm mới cache từ Metabase API khi có schema mới:
node .agents/db-mcp.js --list-tables --db timescale --refresh
```

---

## 2.1. Quy Tắc Ưu Tiên Phiên Bản Bảng (V3 > V2 Matrix)

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC:** Khi truy vấn hoặc tham chiếu dữ liệu chứng khoán trong TimescaleDB, Agent **BẮT BUỘC** ưu tiên sử dụng các bảng chuẩn **v3**. Chỉ khi nghiệp vụ không có bảng v3 tương ứng thì mới fallback sử dụng bảng **v2**.

| Dữ Liệu Nghiệp Vụ | Bảng Ưu Tiên Số 1 (V3) | Bảng Dự Phòng (V2 Fallback) | Ghi Chú Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| **Khớp lệnh Tick Realtime** | `krx_mdds_v3_ticks` | `krx_mdds_v2_ticks` | v3 có thêm cấu trúc thông điệp chuẩn KRX mới |
| **Khớp lệnh Tick Mở rộng** | `krx_mdds_v3_ticks_extra` | `ticks_statistic_daily_with_side_v2` | Phân loại lệnh mua/bán chủ động |
| **Sổ lệnh Top 3/10 Giá** | `krx_mdds_v3_top_prices` | `krx_mdds_v2_top_prices` | Sổ lệnh tốt nhất mua/bán kèm snapshot |
| **Đặc tả Mã Chứng Khoán** | `security_definition_v3` | `security_definitions` | Thông tin niêm yết, lô chẵn/lẻ, biên độ giá |
| **Sự kiện Bảng Giao Dịch** | `krx_mdds_v3_board_events` | `krx_mdds_v2_board_events` | Cờ chuyển phiên ATO, Liên tục, ATC |
| **Sự kiện Bảng Theo Từng Mã** | `krx_mdds_v3_symbol_board_events` | `krx_mdds_v2_symbol_board_events` | Cờ halt/suspend riêng từng mã |
| **Chỉ số Thị Trường** | `krx_mdds_v3_market_indices` | `krx_mdds_v2_market_indices` | VN-Index, VN30, HNX-Index... |
| **Giao Dịch Khối Ngoại** | `krx_mdds_v3_trading_foreign_investors` | `trading_result_of_foreign_investors` | Mua/bán ròng và room ngoại real-time |
| **Giá Dự Kiến ATO/ATC** | `expected_price_v3` | *(Không có)* | Giá khớp dự kiến trong phiên định kỳ |
| **Giá Trần / Sàn / Tham Chiếu** | *(Chưa có v3)* | `krx_mdds_v2_stock_infos` | **Dùng v2** để lấy `ceiling_price`, `floor_price`, `ref_price` |
| **Biểu đồ Nến (OHLC)** | *(Chưa có v3)* | `krx_mdds_v2_stock_ohlc` | **Dùng v2** cho nến cổ phiếu, index và phái sinh |
| **Phiên giao dịch theo mã** | *(Chưa có v3)* | `krx_mdds_v2_symbol_trading_sessions` | **Dùng v2** để kiểm tra session theo symbol |

---

## 3. Danh Mục Chi Tiết 114 Bảng Theo Nhóm Nghiệp Vụ

### KRX MDDS Dữ liệu Khớp Lệnh & Sổ Lệnh Realtime (35 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `bid_ask` | `78351` | 4 | bid_ask |
| 2 | `krx_mdds_v2_board_event_snapshots` | `78438` | 7 | krx_mdds_v2_board_event_snapshots |
| 3 | `krx_mdds_v2_board_events` | `83685` | 7 | krx_mdds_v2_board_events |
| 4 | `krx_mdds_v2_derivative_stock_ohlc` | `81034` | 10 | krx_mdds_v2_derivative_stock_ohlc |
| 5 | `krx_mdds_v2_index_ohlc` | `86627` | 10 | krx_mdds_v2_index_ohlc |
| 6 | `krx_mdds_v2_market_index_snapshots` | `80216` | 27 | krx_mdds_v2_market_index_snapshots |
| 7 | `krx_mdds_v2_market_indices` | `75015` | 27 | krx_mdds_v2_market_indices |
| 8 | `krx_mdds_v2_stock_info_snapshots` | `74739` | 62 | krx_mdds_v2_stock_info_snapshots |
| 9 | `krx_mdds_v2_stock_infos` | `82742` | 62 | krx_mdds_v2_stock_infos |
| 10 | `krx_mdds_v2_stock_ohlc` | `82318` | 10 | krx_mdds_v2_stock_ohlc |
| 11 | `krx_mdds_v2_symbol_board_events` | `79543` | 7 | krx_mdds_v2_symbol_board_events |
| 12 | `krx_mdds_v2_symbol_trading_session_snapshots` | `91824` | 9 | krx_mdds_v2_symbol_trading_session_snapshots |
| 13 | `krx_mdds_v2_symbol_trading_sessions` | `91823` | 9 | krx_mdds_v2_symbol_trading_sessions |
| 14 | `krx_mdds_v2_ticks` | `87224` | 13 | krx_mdds_v2_ticks |
| 15 | `krx_mdds_v2_top_price_snapshots` | `74867` | 12 | krx_mdds_v2_top_price_snapshots |
| 16 | `krx_mdds_v2_top_prices` | `81836` | 12 | krx_mdds_v2_top_prices |
| 17 | `krx_mdds_v3_board_event_snapshots` | `90996` | 7 | krx_mdds_v3_board_event_snapshots |
| 18 | `krx_mdds_v3_board_events` | `90995` | 7 | krx_mdds_v3_board_events |
| 19 | `krx_mdds_v3_market_index_snapshots` | `89299` | 27 | krx_mdds_v3_market_index_snapshots |
| 20 | `krx_mdds_v3_market_indices` | `89300` | 27 | krx_mdds_v3_market_indices |
| 21 | `krx_mdds_v3_symbol_board_events` | `90997` | 7 | krx_mdds_v3_symbol_board_events |
| 22 | `krx_mdds_v3_ticks` | `81368` | 14 | krx_mdds_v3_ticks |
| 23 | `krx_mdds_v3_ticks_extra` | `84710` | 17 | krx_mdds_v3_ticks_extra |
| 24 | `krx_mdds_v3_ticks_extra_snapshots` | `89101` | 16 | krx_mdds_v3_ticks_extra_snapshots |
| 25 | `krx_mdds_v3_top_price_snapshots` | `91276` | 10 | krx_mdds_v3_top_price_snapshots |
| 26 | `krx_mdds_v3_top_prices` | `74604` | 11 | krx_mdds_v3_top_prices |
| 27 | `krx_mdds_v3_trading_foreign_investors` | `89055` | 17 | krx_mdds_v3_trading_foreign_investors |
| 28 | `prices` | `86838` | 15 | prices |
| 29 | `stock_quote` | `76791` | 35 | stock_quote |
| 30 | `ticks` | `81791` | 8 | ticks |
| 31 | `ticks_ol` | `81534` | 4 | ticks_ol |
| 32 | `ticks_statistic_daily_with_side_v2` | `81344` | 8 | ticks_statistic_daily_with_side_v2 |
| 33 | `ticks_v2_statistic_daily` | `79865` | 5 | ticks_v2_statistic_daily |
| 34 | `top_prices` | `77650` | 8 | top_prices |
| 35 | `top_prices_ol` | `74892` | 6 | top_prices_ol |

---

### Định Nghĩa Chứng Khoán & Mã Niêm Yết (14 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `delisted_instruments` | `87319` | 12 | delisted_instruments |
| 2 | `elw_underlying_assets` | `80723` | 10 | elw_underlying_assets |
| 3 | `imported_symbol` | `74952` | 1 | imported_symbol |
| 4 | `instrument_derivatives` | `75972` | 48 | instrument_derivatives |
| 5 | `instrument_sbrs` | `78323` | 82 | instrument_sbrs |
| 6 | `security_definition_internal` | `86075` | 48 | security_definition_internal |
| 7 | `security_definition_snapshot` | `78277` | 48 | security_definition_snapshot |
| 8 | `security_definition_snapshot_v3` | `89302` | 18 | security_definition_snapshot_v3 |
| 9 | `security_definition_v3` | `77534` | 18 | security_definition_v3 |
| 10 | `security_definitions` | `82602` | 48 | security_definitions |
| 11 | `security_information_notifications` | `82627` | 12 | security_information_notifications |
| 12 | `security_statuses` | `78896` | 10 | security_statuses |
| 13 | `sessions` | `80445` | 3 | sessions |
| 14 | `symbols` | `81065` | 6 | symbols |

---

### Biểu Đồ Nến & Xu Hướng (OHLC & Trendlines) (16 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `deem_trade_prices` | `75368` | 7 | deem_trade_prices |
| 2 | `expected_price_v3` | `82165` | 10 | expected_price_v3 |
| 3 | `expected_price_v3_snapshots` | `89366` | 9 | expected_price_v3_snapshots |
| 4 | `global_index_ohlc` | `76153` | 10 | global_index_ohlc |
| 5 | `index_ohlc` | `74734` | 10 | index_ohlc |
| 6 | `krx_mdds_v2_derivative_stock_ohlc` | `81034` | 10 | krx_mdds_v2_derivative_stock_ohlc |
| 7 | `krx_mdds_v2_index_ohlc` | `86627` | 10 | krx_mdds_v2_index_ohlc |
| 8 | `krx_mdds_v2_stock_ohlc` | `82318` | 10 | krx_mdds_v2_stock_ohlc |
| 9 | `ohlc` | `78557` | 10 | ohlc |
| 10 | `ohlc_normalization_details` | `75299` | 16 | ohlc_normalization_details |
| 11 | `stock_ohlc` | `85775` | 10 | stock_ohlc |
| 12 | `stock_ohlc_days` | `87510` | 10 | stock_ohlc_days |
| 13 | `stock_ohlc_min1_view` | `84473` | 10 | stock_ohlc_min1_view |
| 14 | `symbol_closing_informations` | `78419` | 7 | symbol_closing_informations |
| 15 | `trend_line_5m` | `83155` | 4 | trend_line_5m |
| 16 | `trend_line_5m_krx` | `76397` | 4 | trend_line_5m_krx |

---

### Thông Tin Mã & Trạng Thái Cổ Phiếu (4 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `stock_info_price_temporary` | `77386` | 9 | stock_info_price_temporary |
| 2 | `stock_infos` | `78064` | 39 | stock_infos |
| 3 | `stock_infos_history` | `88135` | 38 | stock_infos_history |
| 4 | `stock_infos_ol` | `82487` | 32 | stock_infos_ol |

---

### Thị Trường Phái Sinh (Derivatives) (9 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `change_of_contracts` | `87554` | 19 | change_of_contracts |
| 2 | `derivative_price` | `79717` | 24 | derivative_price |
| 3 | `derivative_stock_info_hist` | `78376` | 34 | derivative_stock_info_hist |
| 4 | `derivative_stock_infos` | `87092` | 33 | derivative_stock_infos |
| 5 | `difference_derivative_and_index` | `79354` | 7 | difference_derivative_and_index |
| 6 | `drv_product_events` | `78227` | 6 | drv_product_events |
| 7 | `instrument_derivatives` | `75972` | 48 | instrument_derivatives |
| 8 | `krx_mdds_v2_derivative_stock_ohlc` | `81034` | 10 | krx_mdds_v2_derivative_stock_ohlc |
| 9 | `open_interests` | `81594` | 6 | open_interests |

---

### Quản Trị Rủi Ro Biến Động (Circuit Breaker / VI) (5 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `price_limit_expansions` | `82623` | 9 | price_limit_expansions |
| 2 | `price_recoveries` | `77909` | 20 | price_recoveries |
| 3 | `random_ends` | `78421` | 14 | random_ends |
| 4 | `sector_volatility` | `81625` | 6 | sector_volatility |
| 5 | `volatility_interruptions` | `77808` | 11 | volatility_interruptions |

---

### Giao Dịch Khối Ngoại & Cơ Cấu Nhà Đầu Tư (9 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `foreigner_order_limit_snapshot` | `76337` | 5 | foreigner_order_limit_snapshot |
| 2 | `foreigner_order_limits` | `85510` | 5 | foreigner_order_limits |
| 3 | `investor_per_industries` | `80804` | 13 | investor_per_industries |
| 4 | `investor_per_symbols` | `86388` | 8 | investor_per_symbols |
| 5 | `krx_mdds_v3_trading_foreign_investors` | `89055` | 17 | krx_mdds_v3_trading_foreign_investors |
| 6 | `market_maker_informations` | `76822` | 4 | market_maker_informations |
| 7 | `member_traders` | `87844` | 6 | member_traders |
| 8 | `trading_result_of_foreign_investor_snapshot` | `84398` | 15 | trading_result_of_foreign_investor_snapshot |
| 9 | `trading_result_of_foreign_investors` | `79558` | 15 | trading_result_of_foreign_investors |

---

### Chỉ Số Thị Trường & Quỹ ETF (17 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `difference_derivative_and_index` | `79354` | 7 | difference_derivative_and_index |
| 2 | `et_fi_indices` | `84728` | 5 | et_fi_indices |
| 3 | `et_fi_navs` | `79434` | 5 | et_fi_navs |
| 4 | `etf_index_compositions` | `75029` | 13 | etf_index_compositions |
| 5 | `etf_tracking_errors` | `82728` | 6 | etf_tracking_errors |
| 6 | `exchange_rate_snapshot` | `91056` | 6 | exchange_rate_snapshot |
| 7 | `global_index_ohlc` | `76153` | 10 | global_index_ohlc |
| 8 | `index_constituents_informations` | `80271` | 10 | index_constituents_informations |
| 9 | `index_ohlc` | `74734` | 10 | index_ohlc |
| 10 | `indices` | `81499` | 22 | indices |
| 11 | `krx_mdds_v2_index_ohlc` | `86627` | 10 | krx_mdds_v2_index_ohlc |
| 12 | `krx_mdds_v2_market_index_snapshots` | `80216` | 27 | krx_mdds_v2_market_index_snapshots |
| 13 | `krx_mdds_v2_market_indices` | `75015` | 27 | krx_mdds_v2_market_indices |
| 14 | `krx_mdds_v3_market_index_snapshots` | `89299` | 27 | krx_mdds_v3_market_index_snapshots |
| 15 | `krx_mdds_v3_market_indices` | `89300` | 27 | krx_mdds_v3_market_indices |
| 16 | `market_breadth` | `78261` | 8 | market_breadth |
| 17 | `view_market_index_krx_eod` | `87712` | 4 | view_market_index_krx_eod |

---

### Lịch Giao Dịch & Sự Kiện Quyền (15 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `coupon_payment_dates` | `87188` | 11 | coupon_payment_dates |
| 2 | `disclosures` | `80121` | 15 | disclosures |
| 3 | `drv_product_events` | `78227` | 6 | drv_product_events |
| 4 | `events` | `81644` | 18 | events |
| 5 | `events_view` | `75198` | 39 | events_view |
| 6 | `holidays` | `78934` | 7 | holidays |
| 7 | `krx_mdds_v2_board_event_snapshots` | `78438` | 7 | krx_mdds_v2_board_event_snapshots |
| 8 | `krx_mdds_v2_board_events` | `83685` | 7 | krx_mdds_v2_board_events |
| 9 | `krx_mdds_v2_symbol_board_events` | `79543` | 7 | krx_mdds_v2_symbol_board_events |
| 10 | `krx_mdds_v3_board_event_snapshots` | `90996` | 7 | krx_mdds_v3_board_event_snapshots |
| 11 | `krx_mdds_v3_board_events` | `90995` | 7 | krx_mdds_v3_board_events |
| 12 | `krx_mdds_v3_symbol_board_events` | `90997` | 7 | krx_mdds_v3_symbol_board_events |
| 13 | `search_events` | `87730` | 3 | search_events |
| 14 | `symbol_events` | `74833` | 7 | symbol_events |
| 15 | `trading_schedules` | `76986` | 8 | trading_schedules |

---

### Hệ Thống & Thống Kê Giám Sát (6 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `pg_stat_kcache` | `77911` | 29 | pg_stat_kcache |
| 2 | `pg_stat_kcache_detail` | `79742` | 32 | pg_stat_kcache_detail |
| 3 | `pg_stat_statements` | `79287` | 33 | pg_stat_statements |
| 4 | `pg_stat_statements_info` | `84592` | 2 | pg_stat_statements_info |
| 5 | `search_events` | `87730` | 3 | search_events |
| 6 | `timestamps` | `85817` | 2 | timestamps |

---

### Bảng Nghiệp Vụ Khác (6 bảng)

| STT | Tên Bảng | ID Metabase | Số Cột | Tên Hiển Thị |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `market_making_contracts` | `78961` | 9 | market_making_contracts |
| 2 | `top_n_members_per_symbols` | `83003` | 12 | top_n_members_per_symbols |
| 3 | `top_n_symbols_with_current_prices` | `83350` | 6 | top_n_symbols_with_current_prices |
| 4 | `top_n_symbols_with_high_ratio_of_prices` | `74497` | 6 | top_n_symbols_with_high_ratio_of_prices |
| 5 | `top_n_symbols_with_low_ratio_of_prices` | `87270` | 6 | top_n_symbols_with_low_ratio_of_prices |
| 6 | `top_n_symbols_with_trading_quantities` | `87415` | 6 | top_n_symbols_with_trading_quantities |

---

## 4. Chi Tiết Cấu Trúc Các Bảng Cốt Lõi (Core Tables)

### Cấu trúc bảng: `krx_mdds_v2_ticks` (ID: 87224)

| STT | Tên Cột (Column) | Kiểu Dữ Liệu | Base Type | Khóa (PK/FK) |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `market_id` | `int4` | `type/Integer` | - |
| 2 | `board_id` | `int4` | `type/Integer` | - |
| 3 | `isin` | `text` | `type/Text` | - |
| 4 | `symbol` | `text` | `type/Text` | - |
| 5 | `match_price` | `float8` | `type/Float` | - |
| 6 | `match_qtty` | `float8` | `type/Float` | - |
| 7 | `sending_time` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |
| 8 | `board_id_original` | `int4` | `type/Integer` | - |
| 9 | `trading_session_id` | `int4` | `type/Integer` | - |
| 10 | `total_volume_traded` | `int8` | `type/BigInteger` | - |
| 11 | `gross_trade_amount` | `float8` | `type/Float` | - |
| 12 | `side` | `int4` | `type/Integer` | - |
| 13 | `created_date` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |

### Cấu trúc bảng: `krx_mdds_v2_top_prices` (ID: 81836)

| STT | Tên Cột (Column) | Kiểu Dữ Liệu | Base Type | Khóa (PK/FK) |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `market_id` | `int4` | `type/Integer` | - |
| 2 | `board_id` | `int4` | `type/Integer` | - |
| 3 | `isin` | `text` | `type/Text` | - |
| 4 | `symbol` | `text` | `type/Text` | - |
| 5 | `sending_time` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |
| 6 | `bid` | `jsonb` | `type/JSON` | - |
| 7 | `offer` | `jsonb` | `type/JSON` | - |
| 8 | `total_offer_qtty` | `float8` | `type/Float` | - |
| 9 | `total_bid_qtty` | `float8` | `type/Float` | - |
| 10 | `board_id_original` | `int4` | `type/Integer` | - |
| 11 | `symbol_type` | `text` | `type/Text` | - |
| 12 | `created_date` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |

### Cấu trúc bảng: `security_definitions` (ID: 82602)

| STT | Tên Cột (Column) | Kiểu Dữ Liệu | Base Type | Khóa (PK/FK) |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `sending_time` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |
| 2 | `market_id` | `text` | `type/Text` | - |
| 3 | `board_id` | `text` | `type/Text` | - |
| 4 | `tot_num_reports` | `int8` | `type/BigInteger` | - |
| 5 | `security_exchange` | `text` | `type/Text` | - |
| 6 | `symbol` | `text` | `type/Text` | - |
| 7 | `ticker_code` | `text` | `type/Text` | - |
| 8 | `symbol_short_code` | `text` | `type/Text` | - |
| 9 | `symbol_name` | `text` | `type/Text` | - |
| 10 | `symbol_english_name` | `text` | `type/Text` | - |
| 11 | `product_id` | `text` | `type/Text` | - |
| 12 | `product_grp_id` | `text` | `type/Text` | - |
| 13 | `security_group_id` | `text` | `type/Text` | - |
| 14 | `put_or_call` | `text` | `type/Text` | - |
| 15 | `exercise_style` | `text` | `type/Text` | - |
| 16 | `maturity_month_year` | `text` | `type/Text` | - |
| 17 | `maturity_date` | `text` | `type/Text` | - |
| 18 | `issuer_id` | `text` | `type/Text` | - |
| 19 | `issue_date` | `text` | `type/Text` | - |
| 20 | `contract_multiplier` | `float8` | `type/Float` | - |
| 21 | `coupon_rate` | `float8` | `type/Float` | - |
| 22 | `currency` | `text` | `type/Text` | - |
| 23 | `listed_shares` | `int8` | `type/BigInteger` | - |
| 24 | `high_limit_price` | `float8` | `type/Float` | - |
| 25 | `low_limit_price` | `float8` | `type/Float` | - |
| 26 | `strike_price` | `float8` | `type/Float` | - |
| 27 | `security_status` | `text` | `type/Text` | - |
| 28 | `contract_size` | `float8` | `type/Float` | - |
| 29 | `settle_method` | `text` | `type/Text` | - |
| 30 | `yield` | `float8` | `type/Float` | - |
| 31 | `reference_price` | `float8` | `type/Float` | - |
| 32 | `evaluation_price` | `float8` | `type/Float` | - |
| 33 | `highest_order_price` | `float8` | `type/Float` | - |
| 34 | `lowest_order_price` | `float8` | `type/Float` | - |
| 35 | `prev_close_px` | `float8` | `type/Float` | - |
| 36 | `symbol_close_info_px_type` | `text` | `type/Text` | - |
| 37 | `first_trading_date` | `text` | `type/Text` | - |
| 38 | `final_trade_date` | `text` | `type/Text` | - |
| 39 | `final_settle_date` | `text` | `type/Text` | - |
| 40 | `listing_date` | `text` | `type/Text` | - |
| 41 | `random_end_triggering_condition_code` | `text` | `type/Text` | - |
| 42 | `ex_class_type` | `text` | `type/Text` | - |
| 43 | `vwap` | `float8` | `type/Float` | - |
| 44 | `symbol_admin_status_code` | `text` | `type/Text` | - |
| 45 | `symbol_trading_method_status_code` | `text` | `type/Text` | - |
| 46 | `symbol_trading_santion_status_code` | `text` | `type/Text` | - |
| 47 | `sector_type_code` | `text` | `type/Text` | - |
| 48 | `redumption_date` | `text` | `type/Text` | - |

### Cấu trúc bảng: `volatility_interruptions` (ID: 77808)

| STT | Tên Cột (Column) | Kiểu Dữ Liệu | Base Type | Khóa (PK/FK) |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `sending_time` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |
| 2 | `market_id` | `text` | `type/Text` | - |
| 3 | `board_id` | `text` | `type/Text` | - |
| 4 | `symbol` | `text` | `type/Text` | - |
| 5 | `vi_type_code` | `text` | `type/Text` | - |
| 6 | `vi_kind_code` | `text` | `type/Text` | - |
| 7 | `static_vi_base_price` | `float8` | `type/Float` | - |
| 8 | `dynamic_vi_base_price` | `float8` | `type/Float` | - |
| 9 | `vi_price` | `float8` | `type/Float` | - |
| 10 | `static_vi_disparity_ratio` | `float8` | `type/Float` | - |
| 11 | `dynamic_vi_disparity_ratio` | `float8` | `type/Float` | - |

### Cấu trúc bảng: `trading_result_of_foreign_investors` (ID: 79558)

| STT | Tên Cột (Column) | Kiểu Dữ Liệu | Base Type | Khóa (PK/FK) |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `sending_time` | `timestamptz` | `type/DateTimeWithLocalTZ` | - |
| 2 | `market_id` | `text` | `type/Text` | - |
| 3 | `board_id` | `text` | `type/Text` | - |
| 4 | `trading_session_id` | `text` | `type/Text` | - |
| 5 | `symbol` | `text` | `type/Text` | - |
| 6 | `transact_time` | `text` | `type/Text` | - |
| 7 | `foreign_investor_type_code` | `text` | `type/Text` | - |
| 8 | `sell_volume` | `int8` | `type/BigInteger` | - |
| 9 | `sell_traded_amount` | `float8` | `type/Float` | - |
| 10 | `buy_volume` | `int8` | `type/BigInteger` | - |
| 11 | `buy_traded_amount` | `float8` | `type/Float` | - |
| 12 | `total_sell_volume` | `int8` | `type/BigInteger` | - |
| 13 | `total_sell_traded_amount` | `float8` | `type/Float` | - |
| 14 | `total_buy_volume` | `int8` | `type/BigInteger` | - |
| 15 | `total_buy_traded_amount` | `float8` | `type/Float` | - |

