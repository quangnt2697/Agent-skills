---
name: db-timescale-reconciler
description: Quét, đối chiếu và phát hiện sai lệch dữ liệu thị trường KRX MDDS trên TimescaleDB Production. Bao gồm kiểm tra count parity, value drift (giá/khối lượng), NULL/invalid scan, duplicate key, late-arriving data (created_at vs sending_time), và OHLC gap detection cho 11 topic nghiệp vụ.
trigger: Kích hoạt khi người dùng gõ /db-recon, yêu cầu "đối chiếu dữ liệu", "kiểm tra lệch tick/topprice/ohlc/giá", "so sánh v3 vs v2", "scan dữ liệu prod", hoặc khi cần xác minh tính toàn vẹn dữ liệu sau deploy pipeline MDDS mới.
---

# db-timescale-reconciler

**Mục đích:** Phát hiện sai lệch dữ liệu chứng khoán KRX MDDS trên TimescaleDB Production qua Metabase API (`${METABASE_PROD_URL}`, DB ID: `${METABASE_PROD_DB_TIMESCALE_ID}`).

**Phạm vi:** 11 topic MDDS — Ticks, TopPrices, ExpectedPrice, OHLC, Indices, BoardEvents, SymbolBoardEvents, ForeignTrading, SecurityDefinition, VolatilityInterruption, TradeExtra.

---

## Quy Tắc An Toàn Bắt Buộc (Read-Only + Index Safety)

### 1. Zero-Mutation Policy
- **TUYỆT ĐỐI KHÔNG** chạy INSERT, UPDATE, DELETE, TRUNCATE, DROP.
- Mọi query phải qua `sanitizeQuery()` trước khi thực thi.

### 2. TimescaleDB Partition-First Rule
`sending_time` / `time` là **partition key** — luôn filter trước để kích hoạt chunk exclusion.
`created_at` là cột thứ cấp, **có thể chưa có index** — chỉ filter sau khi đã anchor partition key.

```sql
-- ✅ ĐÚNG
WHERE sending_time >= '{{date}}'::date
  AND sending_time <  '{{date}}'::date + INTERVAL '1 day'
  AND created_at   >  sending_time + INTERVAL '30 seconds'   -- safe: scan trong chunk nhỏ

-- ❌ SAI — full table scan, gây timeout prod
WHERE created_at >= '{{date}}'::date
```

### 3. Bắt Buộc Trước Khi Chạy Query `created_at`
| Bước | Hành động |
|---|---|
| 1 | Luôn có `WHERE sending_time >= ... AND sending_time < ...` trước |
| 2 | Chạy `EXPLAIN (ANALYZE false, COSTS true)` — xác nhận không có `Seq Scan` toàn bảng |
| 3 | Thêm `LIMIT 500` lần đầu chạy |
| 4 | `SET LOCAL statement_timeout = '30000'` trong session |

---

## Workflow Thực Thi (Agent Steps)

### Bước 1 — Xác định phạm vi
- Lấy ngày giao dịch cần kiểm tra (`{{date}}`, mặc định `CURRENT_DATE`).
- Nếu người dùng chỉ đề cập topic cụ thể → chạy query chuyên sâu của topic đó.
- Nếu không rõ → chạy `master-dashboard` trước để có bức tranh tổng quan.

### Bước 2 — Chọn query theo tình huống

| Tình huống | Query cần chạy |
|---|---|
| Báo cáo tổng quan nhanh | `master-dashboard` |
| Nghi ngờ tick/volume sai | `recon-ticks` → `recon-ticks-raw` → `audit-tick-price-drift` |
| Nghi ngờ giá sổ lệnh sai | `recon-topprice` → `audit-topprice-value-drift` |
| Kiểm tra giá NULL/invalid | `audit-null-invalid-ticks` |
| Kiểm tra mã niêm yết | `recon-missing-symbols` → `audit-null-security-def` |
| Kiểm tra nến OHLC | `recon-ohlc` → `audit-ohlc-gap` |
| Phát hiện bản ghi trùng | `audit-duplicate-ticks` / `audit-duplicate-top-prices` |
| Phát hiện ghi DB muộn | `audit-late-ticks` → `audit-late-write-after-session` |
| Phân tích tốc độ ingestion | `audit-ingestion-rate` |
| Phát hiện clock skew | `audit-clock-skew` |
| Kiểm tra ATO/ATC | `recon-expected-price` |
| Kiểm tra chỉ số thị trường | `recon-indices` |
| Kiểm tra cờ phiên giao dịch | `recon-board-events` → `recon-symbol-board-events` |
| Kiểm tra khối ngoại | `recon-foreign-trading` |
| Kiểm tra side mua/bán | `recon-ticks-extra` |

### Bước 3 — Thực thi query
Gọi tool `db_query` với:
- `database`: `"timescale"`
- `sql`: nội dung SQL từ `assets/reconciliation-queries.json` với `{{date}}` đã được thay thế.
- Ghi nhận: timestamp bắt đầu, DB ID, latency (ms).

### Bước 4 — Đánh giá kết quả

**Ngưỡng cờ đỏ:**
| Metric | Ngưỡng WARN | Ngưỡng CRITICAL |
|---|---|---|
| Count parity (ticks/top_prices) | `diff > 0` | `pct_diff > 1%` |
| Volume diff (`diff_vol`) | `!= 0` | bất kỳ |
| Price drift (`match_price` V3 vs Raw) | bất kỳ 1 bản ghi | bất kỳ |
| NULL symbol / invalid price | bất kỳ 1 bản ghi | bất kỳ |
| Duplicate key | bất kỳ 1 bản ghi | bất kỳ |
| Late write lag | `max_lag > 30s` | `max_lag > 5 phút` |
| Clock skew (`created_at < sending_time`) | bất kỳ | bất kỳ |

### Bước 5 — Xuất báo cáo

**Lưu file:**
```
{project-root}/workspace/database/db-recon-{date}.md
```
Trong đó `{date}` có định dạng `YYYYMMDD`. Ví dụ: `workspace/database/db-recon-20260917.md`.

---

**Cấu trúc báo cáo (bắt buộc đủ 5 section):**

```
# Báo Cáo Đối Chiếu Dữ Liệu MDDS — {date}

## 📋 Metadata
## 🔴 P1 — Giá & Khối Lượng
## 🟡 P2 — Dữ Liệu Tổng Hợp
## 🔵 Cross-cutting — Kỹ Thuật
## 📌 Kết Luận & Khuyến Nghị
```

---

**Mẫu báo cáo đầy đủ:**

````markdown
# Báo Cáo Đối Chiếu Dữ Liệu MDDS — 2026-09-17

## 📋 Metadata

| Trường | Giá trị |
|---|---|
| Thời gian chạy | 2026-09-17 10:05:32 +07:00 |
| DB ID (Prod) | `${METABASE_PROD_DB_TIMESCALE_ID}` |
| Ngày giao dịch | 2026-09-17 |
| Số query đã chạy | 8 |
| Tổng latency | 4,230 ms |
| Người chạy | agent / QA |

---

## 🔴 P1 — Giá & Khối Lượng

### P1.1 Count Parity — Tick Khớp Lệnh

| Topic | Bảng A (V3) | Bảng B | Count A | Count B | Diff | Diff% | Status |
|---|---|---|---|---|---|---|---|
| Ticks V3 vs V2 | `krx_mdds_v3_ticks` | `krx_mdds_v2_ticks` | 1,284,501 | 1,284,501 | 0 | 0.00% | 🟢 MATCH |
| Ticks V3 vs Raw | `krx_mdds_v3_ticks` | `ticks` | 1,284,501 | 1,281,320 | **+3,181** | **0.25%** | 🔴 DISCREPANCY |
| TopPrice V3 vs V2 | `krx_mdds_v3_top_prices` | `krx_mdds_v2_top_prices` | 3,102,844 | 3,102,844 | 0 | 0.00% | 🟢 MATCH |
| TopPrice V3 vs Raw | `krx_mdds_v3_top_prices` | `top_prices` | 3,102,844 | 3,102,844 | 0 | 0.00% | 🟢 MATCH |

### P1.2 Volume Parity — Tổng Khối Lượng Khớp (Lệch)

> ⚠️ 3 mã phát hiện lệch volume giữa V3 và Raw:

| Symbol | Vol V3 | Vol Raw | Diff Vol | Diff Tick |
|---|---|---|---|---|
| FPT | 12,450,000 | 12,348,100 | **+101,900** | +18 |
| VNM | 8,320,000 | 8,320,000 | 0 | **+2** |
| HPG | 5,100,200 | 5,098,600 | **+1,600** | +1 |

### P1.3 Value Drift — Giá Khớp (match_price V3 vs Raw)

| Symbol | drift_count | min_price_diff | max_price_diff | avg_abs_diff |
|---|---|---|---|---|
| FPT | **18** | -100 | +100 | 72.5 |
| HPG | **1** | -50 | -50 | 50.0 |

> 🔴 **CRITICAL:** FPT có 18 tick cùng `(symbol, sending_time)` nhưng `match_price` khác nhau giữa V3 và Raw — nghi ngờ lỗi parse giá trong pipeline v3.

### P1.4 NULL / Invalid Scan — Ticks

| Metric | Count | Tỷ lệ | Status |
|---|---|---|---|
| Total scanned | 1,284,501 | — | — |
| null_symbol | 0 | 0.0000% | 🟢 OK |
| invalid_price (≤0 or NULL) | **3** | 0.0002% | 🟡 WARN |
| invalid_qtty (≤0 or NULL) | 0 | 0.0000% | 🟢 OK |
| null_time | 0 | 0.0000% | 🟢 OK |

---

## 🟡 P2 — Dữ Liệu Tổng Hợp

### P2.1 OHLC Nến — Count Parity

| Symbol | OHLC V2 | OHLC Aggregated | Diff | Status |
|---|---|---|---|---|
| (all) | 28,440 | 28,440 | 0 | 🟢 MATCH |

### P2.2 Market Index — Cập nhật Chỉ Số

| Index | Count V3 | Count V2 | Diff | Last V3 | Last V2 | Status |
|---|---|---|---|---|---|---|
| VNINDEX | 4,812 | 4,812 | 0 | 1,287.45 | 1,287.45 | 🟢 MATCH |
| VN30 | 4,810 | 4,810 | 0 | 1,342.10 | 1,342.10 | 🟢 MATCH |
| HNX | 3,204 | 3,204 | 0 | 221.38 | 221.38 | 🟢 MATCH |

---

## 🔵 Cross-cutting — Kỹ Thuật

### C1 Duplicate Key

| Bảng | Key trùng | Số symbol bị dup | Status |
|---|---|---|---|
| `krx_mdds_v3_ticks` | (symbol, sending_time) | 0 | 🟢 OK |
| `krx_mdds_v3_top_prices` | (symbol, sending_time) | 0 | 🟢 OK |

### C2 Late-Arriving (created_at vs sending_time > 30s)

| Symbol | late_count | max_lag_seconds | avg_lag_seconds |
|---|---|---|---|
| TCB | **142** | **187.4** | 45.2 |
| SSI | **38** | 62.1 | 34.8 |

> 🟡 **WARN:** TCB có max lag 187s — kiểm tra Kafka consumer partition của TCB.

### C4 Ingestion Rate theo Giờ

| Giờ | Tick Count | Active Symbols | Ghi chú |
|---|---|---|---|
| 09:00 | 12,401 | 412 | — |
| 10:00 | 284,102 | 697 | — |
| 11:00 | **1,204** | **89** | 🔴 BẤT THƯỜNG — drop đột ngột |
| 12:00 | 0 | 0 | Nghỉ trưa bình thường |
| 13:00 | 318,920 | 712 | — |
| 14:00 | 290,451 | 703 | — |
| 15:00 | 377,423 | 698 | — |

> 🔴 **CRITICAL:** Bucket 11:00 chỉ có 1,204 tick — drop 99.6% so với bình thường. Kiểm tra Kafka lag và pipeline log lúc 11:xx.

---

## 📌 Kết Luận & Khuyến Nghị

### Tổng Hợp Trạng Thái

| Priority | Số check | 🟢 PASS | 🟡 WARN | 🔴 FAIL |
|---|---|---|---|---|
| P1 Giá & Khối lượng | 6 | 3 | 1 | **2** |
| P2 Tổng hợp | 3 | 3 | 0 | 0 |
| Cross-cutting | 4 | 2 | 1 | **1** |

### Hành Động Cần Thực Hiện (theo thứ tự ưu tiên)

| # | Mức | Vấn đề | Hành động | Assignee |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | FPT: 18 tick giá khác V3 vs Raw | Kiểm tra parser giá pipeline v3, so sánh log Kafka offset FPT bucket 09-15h | DEV |
| 2 | 🔴 CRITICAL | Ingestion drop 99.6% lúc 11:00-11:59 | Kiểm tra Kafka consumer lag, pipeline restart log | DEV/OPS |
| 3 | 🟡 WARN | TCB late tick max 187s | Kiểm tra Kafka partition assignment TCB, consumer throughput | DEV |
| 4 | 🟡 WARN | 3 tick có invalid_price | Truy vấn chi tiết 3 tick đó để xác định symbol, gửi bug report | QA |

### Kết Luận

> Ngày 2026-09-17: **KHÔNG ĐẠT** — Phát hiện 2 vấn đề Critical cần xử lý trước EOD.
````

---

**Quy tắc icon:**
| Icon | Nghĩa |
|---|---|
| 🟢 MATCH / OK | Không phát hiện sai lệch |
| 🟡 WARN | Sai lệch nhỏ, cần theo dõi |
| 🔴 DISCREPANCY / CRITICAL | Sai lệch nghiêm trọng, phải xử lý ngay |
| — | Không áp dụng |



---

## Xử Lý Lỗi

| Lỗi | Hành động |
|---|---|
| HTTP 401/403 | Chạy `npm run metabase:login` để làm mới token SSO, sau đó thử lại |
| Query timeout | Thêm filter hẹp hơn (symbol cụ thể, time range ngắn hơn) |
| `Seq Scan` trên bảng lớn | Kiểm tra lại thứ tự WHERE clause — đảm bảo partition key đứng trước |
| Kết quả rỗng | Xác nhận ngày có phiên giao dịch (không phải cuối tuần/lễ) |

---

## Tham Chiếu Query Catalog

File: `assets/reconciliation-queries.json`

**Nhóm Count Parity (đối chiếu số lượng):**
`master-dashboard` | `recon-ticks` | `recon-ticks-raw` | `recon-topprice` | `recon-expected-price` | `recon-ohlc` | `recon-indices` | `recon-board-events` | `recon-symbol-board-events` | `recon-foreign-trading` | `recon-missing-symbols` | `recon-ticks-extra`

**Nhóm Value Drift (sai lệch giá trị thực):**
`audit-tick-price-drift` | `audit-topprice-value-drift`

**Nhóm NULL / Invalid Scan:**
`audit-null-invalid-ticks` | `audit-null-security-def`

**Nhóm Duplicate Key:**
`audit-duplicate-ticks` | `audit-duplicate-top-prices`

**Nhóm created_at Dimension (ghi DB muộn):**
`audit-late-ticks` | `audit-late-write-after-session` | `audit-ingestion-rate` | `audit-clock-skew`

**Nhóm Gap Detection:**
`audit-ohlc-gap`
