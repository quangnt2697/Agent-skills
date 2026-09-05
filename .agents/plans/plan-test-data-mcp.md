# Kế hoạch Cải tiến: `test-data-mcp.js`

**Trạng thái:** 📋 Chờ triển khai  
**Độ ưu tiên:** 🔴 P0  
**Effort ước tính:** ~1 ngày  
**Dependency:** Refactor `db-client.js` (xem phần 6)

---

## 1. Vấn đề cần giải quyết

Hiện tại, khi `qa-test-design` và `qa-auto-design` cần dữ liệu chứng khoán thật từ TimescaleDB:

- Agent gọi `db_query(SQL)` → nhận JSON raw trong conversation
- Tự format thủ công → viết vào checklist / Gherkin / conftest
- **Không deterministic**: lần sau query lại có thể khác kết quả
- **Không traceable**: không biết data lấy từ bảng nào, ngày nào, version nào
- **Không có file fixture**: conftest.py phải hardcode dict → stale khi giá thay đổi

---

## 2. Mục tiêu

1. Cung cấp tool chuyên dụng thay thế `db_query` ad-hoc cho QA fixtures
2. Tool `td_get_market_snapshot` tổng hợp đủ thông tin phiên + mã + board trong 1 lần gọi
3. Tuân thủ rule V3 > V2 (không để agent tự quyết chọn bảng)
4. Thiết kế **config-driven** — thêm/bớt field chỉ sửa `SNAPSHOT_CONFIG`, không đụng logic
5. Tái sử dụng Metabase connection từ `db-mcp.js` (không viết lại)

---

## 3. Danh sách Tools API

| Tool | Mô tả | Skill dùng |
|---|---|---|
| `td_get_market_snapshot` | Tổng hợp: phiên hiện tại + N mã mỗi board mỗi sàn | `qa-test-design`, `qa-auto-design` |
| `td_get_security_info` | Chi tiết 1 mã chứng khoán cụ thể | `qa-test-design` |
| `td_get_tick_samples` | Lấy mẫu tick khớp lệnh theo symbol+date | `qa-auto-design` |
| `td_get_price_limits` | Giá trần/sàn/tham chiếu/bước giá | `qa-test-design` |
| `td_get_session_flags` | Danh sách cờ phiên hiện tại | `qa-test-design` |
| `td_export_fixture` | Ghi fixture ra workspace/{issueKey}/test/fixtures/ | `qa-auto-design` |

---

## 4. Thiết kế chi tiết `td_get_market_snapshot` (Tool chính)

### 4.1. Thông tin cần tổng hợp

**Nhóm A — Phiên hiện tại** (query `krx_mdds_v3_board_events`):

| Thông tin | Nguồn | Cột | Ghi chú |
|---|---|---|---|
| Mã cờ phiên hiện tại | `krx_mdds_v3_board_events` | `trading_session_id` | AA1, BB1, BC1, AW8... |
| Tên phiên dễ đọc | Mapping nội bộ | — | ATO / Liên tục / ATC / PLO |
| Thời gian bắt đầu phiên | `krx_mdds_v3_board_events` | `sending_time` | Timestamp phiên mới nhất |
| Board / Sàn đang trong phiên | `krx_mdds_v3_board_events` | `board_id`, `market_id` | HOSE/HNX/UPCOM × G1/G4... |

**Nhóm B — Thông tin mỗi mã theo board** (2 mã/board):

| Thông tin | Bảng nguồn (ưu tiên) | Cột | Ghi chú |
|---|---|---|---|
| Mã chứng khoán | `security_definition_v3` | `symbol` | Ưu tiên v3 |
| Tên công ty | `security_definition_v3` | `symbol_name` | |
| Sàn niêm yết | `security_definition_v3` | `security_exchange` | HOSE / HNX / UPCOM |
| Board / Bảng giao dịch | `security_definition_v3` | `board_id` | G1, G4, ... |
| Giá tham chiếu | `krx_mdds_v2_stock_infos` | `reference_price` | Dùng v2 (không có v3) |
| Giá trần (ceiling) | `krx_mdds_v2_stock_infos` | `high_limit_price` | |
| Giá sàn (floor) | `krx_mdds_v2_stock_infos` | `low_limit_price` | |
| Bước giá | `krx_mdds_v2_stock_infos` | `price_step` (nếu có) | |
| Tổng KL đã khớp hôm nay | `krx_mdds_v3_ticks` | `total_volume_traded` (latest row) | Cột tích lũy — lấy giá trị row mới nhất |
| Tổng GT đã khớp hôm nay | `krx_mdds_v3_ticks` | `gross_trade_amount` (latest row) | Cột tích lũy — lấy giá trị row mới nhất |
| Giá khớp gần nhất | `krx_mdds_v3_ticks` | `match_price` (latest row) | Cùng query với 2 dòng trên |
| KL khớp lệnh gần nhất | `krx_mdds_v3_ticks` | `match_qtty` (latest row) | Cùng query với 2 dòng trên |

### 4.2. Input / Output

```js
// Input
{
  symbols_per_board: 2,          // Số mã lấy mỗi board (default: 2)
  markets: ["HOSE", "HNX", "UPCOM"],  // Sàn cần lấy (default: tất cả 3)
  boards: null,                  // null = tất cả board; hoặc ["G1", "G4"]
  date: null,                    // null = hôm nay (DATE(NOW()))
  include_groups: ["session", "security_info", "price_limits", "trade_stats"]
                                 // Nhóm thông tin cần lấy — BỎ nhóm nào thì query đó bị skip
}

// Output
{
  snapshot_time: "2026-09-05T10:30:00+07:00",
  date: "2026-09-05",

  // Nhóm A: Phiên hiện tại
  current_sessions: [
    {
      market: "HOSE",
      board_id: "G1",
      session_flag: "BB1",
      session_name: "Liên tục",
      started_at: "2026-09-05T09:15:00+07:00"
    },
    ...
  ],

  // Nhóm B: Thông tin mỗi mã theo board
  securities: [
    {
      // Nhận dạng
      symbol: "VNM",
      symbol_name: "CÔNG TY CỔ PHẦN SỮA VIỆT NAM",
      market: "HOSE",
      board_id: "G1",

      // Giá (từ krx_mdds_v2_stock_infos)
      reference_price: 96300,
      ceiling_price: 102900,
      floor_price: 89700,

      // Thống kê & khớp gần nhất (từ krx_mdds_v3_ticks — 1 query DISTINCT ON mỗi symbol)
      // total_volume_traded & gross_trade_amount là cột tích lũy → lấy row mới nhất
      total_matched_volume: 1250000,       // total_volume_traded (latest row)
      total_matched_value: 120375000000,   // gross_trade_amount  (latest row)
      last_match_price: 96400,             // match_price         (latest row)
      last_match_qtty: 200,               // match_qtty          (latest row)
      last_match_time: "2026-09-05T10:29:58+07:00"  // sending_time (latest row)
    },
    ...
  ],

  // Meta
  _meta: {
    source_tables: ["krx_mdds_v3_board_events", "security_definition_v3",
                    "krx_mdds_v2_stock_infos", "krx_mdds_v3_ticks"],
    // NOTE: krx_mdds_v2_ticks KHÔNG CÒN dùng — đã chuyển toàn bộ sang v3_ticks
    query_duration_ms: 340,
    total_symbols: 12,
    symbols_per_board: 2
  }
}
```

### 4.3. Thiết kế Config-driven — Dễ mở rộng sau này

Toàn bộ mapping field được khai báo trong `SNAPSHOT_CONFIG` ở đầu file. Khi cần thêm/bớt/sửa field: **chỉ sửa config, không sửa logic query**.

```js
// .agents/test-data-mcp.js — SNAPSHOT_CONFIG

const SNAPSHOT_CONFIG = {

  // === NHÓM A: PHIÊN HIỆN TẠI ===
  session: {
    table: 'krx_mdds_v3_board_events',     // Đổi sang v3 khi có
    fallback_table: 'krx_mdds_v2_board_events',
    fields: [
      { col: 'market_id',         alias: 'market',       type: 'string' },
      { col: 'board_id',          alias: 'board_id',     type: 'string' },
      { col: 'trading_session_id',alias: 'session_flag', type: 'string' },
      { col: 'sending_time',      alias: 'started_at',   type: 'timestamp' },
    ],
    // Mapping cờ phiên → tên dễ đọc (thêm vào đây khi có cờ mới)
    session_name_map: {
      'AA1': 'ATO',
      'BB1': 'Liên tục',
      'BC1': 'ATC',
      'AW8': 'PLO',
      'AW9': 'PLO Kết thúc',
      'AC2': 'Nghỉ trưa',
      'EI8': 'Halt',
      'EI9': 'Mở lại Liên tục',
    }
  },

  // === NHÓM B1: THÔNG TIN MÃ CHỨNG KHOÁN ===
  security_info: {
    table: 'security_definition_v3',       // V3 ưu tiên
    fallback_table: 'security_definitions',
    symbols_per_board: 2,                  // Số mã lấy mỗi board
    fields: [
      { col: 'symbol',            alias: 'symbol',       type: 'string' },
      { col: 'symbol_name',       alias: 'symbol_name',  type: 'string' },
      { col: 'security_exchange', alias: 'market',       type: 'string' },
      { col: 'board_id',          alias: 'board_id',     type: 'string' },
      // Thêm field mới ở đây: { col: 'listed_shares', alias: 'listed_shares', type: 'integer' }
    ]
  },

  // === NHÓM B2: GIÁ TRẦN/SÀN/THAM CHIẾU ===
  price_limits: {
    table: 'krx_mdds_v2_stock_infos',     // Không có v3 — dùng v2 bắt buộc
    fallback_table: null,
    fields: [
      { col: 'reference_price',   alias: 'reference_price',  type: 'float' },
      { col: 'high_limit_price',  alias: 'ceiling_price',    type: 'float' },
      { col: 'low_limit_price',   alias: 'floor_price',      type: 'float' },
      // Thêm field mới: { col: 'prev_close_px', alias: 'prev_close_price', type: 'float' }
    ]
  },

  // === NHÓM B3+B4: THỐNG KÊ + KHỚP GẦN NHẤT (gộp chung — cùng bảng krx_mdds_v3_ticks) ===
  // total_volume_traded & gross_trade_amount là cột tích lũy (cumulative running total).
  // Không SUM — lấy DISTINCT ON (symbol) ORDER BY sending_time DESC để lấy row mới nhất.
  tick_snapshot: {
    table: 'krx_mdds_v3_ticks',           // V3 — có đủ cả 4 fields cần thiết
    fallback_table: 'krx_mdds_v2_ticks',  // Fallback nếu v3 không có data
    strategy: 'DISTINCT ON latest',       // Không aggregate, lấy row mới nhất mỗi symbol
    fields: [
      { col: 'total_volume_traded', alias: 'total_matched_volume', type: 'integer' },  // cumulative
      { col: 'gross_trade_amount',  alias: 'total_matched_value',  type: 'float' },    // cumulative
      { col: 'match_price',         alias: 'last_match_price',     type: 'float' },
      { col: 'match_qtty',          alias: 'last_match_qtty',      type: 'integer' },
      { col: 'sending_time',        alias: 'last_match_time',      type: 'timestamp' },
      // Thêm field mới: { col: 'side', alias: 'last_side', type: 'integer' }
      // Thêm field mới: { col: 'trading_session_id', alias: 'session_id', type: 'integer' }
    ]
  }
};
```

**Khi cần thêm/sửa field:**
```
Thêm giá VWAP        → thêm 1 dòng vào price_limits.fields
Thêm số lệnh khớp   → thêm 1 expr vào trade_stats.fields
Thêm sàn mới         → thêm market_id mapping (nếu cần)
Thêm cờ phiên mới    → thêm 1 dòng vào session_name_map
Đổi sang bảng v3     → đổi 1 dòng `table:` trong config block
```

---

## 5. Queries thực tế

### Query 1 — Phiên hiện tại (mỗi board)

```sql
-- Lấy cờ phiên mới nhất của mỗi board trong ngày hôm nay
SELECT DISTINCT ON (market_id, board_id)
    market_id,
    board_id,
    trading_session_id  AS session_flag,
    sending_time        AS started_at
FROM krx_mdds_v3_board_events
WHERE DATE(sending_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
ORDER BY market_id, board_id, sending_time DESC
LIMIT 50;
```

### Query 2 — Lấy 2 mã đại diện mỗi board/sàn

```sql
-- Lấy 2 mã đầu mỗi (security_exchange, board_id) — có thể ORDER BY volume để lấy mã lớn
SELECT DISTINCT ON (security_exchange, board_id)
    symbol,
    symbol_name,
    security_exchange   AS market,
    board_id
FROM security_definition_v3
WHERE security_exchange IN ('HOSE', 'HNX', 'UPCOM')
ORDER BY security_exchange, board_id, sending_time DESC
LIMIT 50;
-- NOTE: Chạy với ROW_NUMBER() OVER(PARTITION BY security_exchange, board_id ORDER BY ...) = 1
-- để lấy đúng 2 mã/nhóm nếu cần chính xác
```

### Query 3 — Giá trần/sàn/tham chiếu (batch theo symbols)

```sql
-- Lấy latest stock_infos cho list symbols
SELECT DISTINCT ON (symbol)
    symbol,
    reference_price,
    high_limit_price    AS ceiling_price,
    low_limit_price     AS floor_price
FROM krx_mdds_v2_stock_infos
WHERE symbol = ANY(ARRAY['VNM', 'SSI', 'VIC', ...])
  AND DATE(sending_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
ORDER BY symbol, sending_time DESC
LIMIT 50;
```

### Query 4+5 (Hợp nhất) — Tổng KL/GT + Khớp gần nhất từ `krx_mdds_v3_ticks`

> **Lý do hợp nhất:** `total_volume_traded` và `gross_trade_amount` là cột **tích lũy (cumulative)**
> được KRX cập nhật dần theo từng lệnh khớp. Row mới nhất đã chứa tổng cộng dồn cả phiên.
> Vì vậy chỉ cần `DISTINCT ON (symbol) ORDER BY sending_time DESC` — **không SUM**, không cần v2_ticks.

```sql
-- 1 query duy nhất: lấy row mới nhất mỗi symbol từ krx_mdds_v3_ticks
-- total_volume_traded & gross_trade_amount = tổng tích lũy cả phiên (lấy row latest là đủ)
SELECT DISTINCT ON (symbol)
    symbol,
    total_volume_traded AS total_matched_volume,   -- cumulative: tổng KL đã khớp
    gross_trade_amount  AS total_matched_value,    -- cumulative: tổng GT đã khớp
    match_price         AS last_match_price,        -- giá khớp mới nhất
    match_qtty          AS last_match_qtty,         -- KL khớp mới nhất
    sending_time        AS last_match_time
FROM krx_mdds_v3_ticks
WHERE symbol = ANY(ARRAY['VNM', 'SSI', 'VIC', ...])
  AND DATE(sending_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
ORDER BY symbol, sending_time DESC
LIMIT 50;
```

---

## 6. Cấu trúc file

```
.agents/
├── db-client.js          ← [REFACTOR TRƯỚC] Shared Metabase client
├── db-mcp.js             ← Import db-client (API không đổi)
└── test-data-mcp.js      ← [MỚI] Import db-client
    ├── SNAPSHOT_CONFIG   ← config tất cả groups/fields (dễ mở rộng)
    ├── Tool: td_get_market_snapshot
    ├── Tool: td_get_security_info
    ├── Tool: td_get_tick_samples
    ├── Tool: td_get_price_limits
    ├── Tool: td_get_session_flags
    └── Tool: td_export_fixture

Output fixture path:
workspace/{issueKey}/test/fixtures/
├── market_snapshot.json      ← td_get_market_snapshot → td_export_fixture
├── price_limits.json
└── tick_samples.json
```

---

## 7. Refactor `db-client.js` — Điều kiện tiên quyết

```js
// .agents/db-client.js — export:
module.exports = {
    loadEnv,
    metabaseFetch,
    resolveDatabaseId,
    getDatabaseName,
    METABASE_DB_MAP,
    DEFAULT_STATEMENT_TIMEOUT_MS,
};

// .agents/db-mcp.js — thêm import:
const dbClient = require('./db-client');

// .agents/test-data-mcp.js — import tương tự:
const { loadEnv, metabaseFetch } = require('./db-client');
```

---

## 8. Luồng tích hợp vào Skills

### `qa-test-design` Bước 1.9

```
Phát hiện task liên quan đến chứng khoán
→ td_get_market_snapshot({ symbols_per_board: 2, include_groups: ["session", "security_info", "price_limits"] })
→ Nhận được:
   - Phiên hiện tại: BB1 (Liên tục), HOSE G1
   - VNM: ceiling=102900, floor=89700, ref=96300
   - SSI: ceiling=28600, floor=24600, ref=26600
→ Viết checklist BVA đúng giá thật:
   "Đặt lệnh VNM tại giá trần 102900 → từ chối"
   "Đặt lệnh VNM tại 102800 (trần - 100) → chấp nhận"
```

### `qa-auto-design` Bước 5.9

```
td_get_market_snapshot({ include_groups: ["security_info", "price_limits", "trade_stats"] })
→ td_export_fixture("JIRA-123", snapshot_data, "market_snapshot")
→ Ghi workspace/JIRA-123/test/fixtures/market_snapshot.json

conftest.py:
  @pytest.fixture(scope="session")
  def market_snapshot():
      with open("fixtures/market_snapshot.json") as f:
          return json.load(f)
  # Luôn fresh từ DB, không hardcode
```

---

## 9. Cập nhật `mcp_config.json`

```json
"test-data": {
  "command": "node",
  "args": ["./.agents/test-data-mcp.js"]
}
```

---

## 10. Hướng dẫn mở rộng trong tương lai

### Thêm field mới vào snapshot:

```js
// Thêm "Giá VWAP" vào nhóm price_limits:
price_limits: {
  fields: [
    { col: 'reference_price',  alias: 'reference_price',  type: 'float' },
    { col: 'high_limit_price', alias: 'ceiling_price',    type: 'float' },
    { col: 'low_limit_price',  alias: 'floor_price',      type: 'float' },
    { col: 'vwap',             alias: 'vwap',             type: 'float' },  // ← THÊM ĐÂY
  ]
}
```

### Thêm nhóm thông tin hoàn toàn mới:

```js
// Thêm nhóm "foreign_trading" — giao dịch ngoại:
SNAPSHOT_CONFIG.foreign_trading = {
  table: 'krx_mdds_v3_trading_foreign_investors',
  fallback_table: 'trading_result_of_foreign_investors',
  fields: [
    { col: 'buy_volume',          alias: 'foreign_buy_volume',   type: 'integer' },
    { col: 'sell_volume',         alias: 'foreign_sell_volume',  type: 'integer' },
    { col: 'buy_traded_amount',   alias: 'foreign_buy_value',    type: 'float' },
    { col: 'sell_traded_amount',  alias: 'foreign_sell_value',   type: 'float' },
  ]
};

// Tool input: include_groups: ["session", "security_info", "price_limits", "foreign_trading"]
```

### Đổi sang bảng v3 khi có:

```js
// Khi krx_mdds_v3_stock_infos được tạo (giả sử):
price_limits: {
  table: 'krx_mdds_v3_stock_infos',     // ← chỉ đổi 1 dòng này
  fallback_table: 'krx_mdds_v2_stock_infos',
  fields: [ ... ]                        // giữ nguyên fields
}
```

---

## 11. Acceptance Criteria

- [ ] `td_get_market_snapshot()` trả đủ phiên hiện tại + 2 mã/board tất cả sàn
- [ ] `include_groups` hoạt động: bỏ "trade_stats" → không query krx_mdds_v2_ticks
- [ ] Session flag được map sang tên dễ đọc (BB1 → "Liên tục")
- [ ] Thêm field vào `SNAPSHOT_CONFIG.price_limits.fields` → output có field đó ngay
- [ ] `td_export_fixture()` tạo thư mục `fixtures/` nếu chưa tồn tại
- [ ] Không push bất kỳ dữ liệu nào lên Jira, Confluence, GitLab
- [ ] `db-mcp.js` không bị breaking change sau khi refactor `db-client.js`
- [ ] Kế thừa bảo mật của `db-mcp.js`: read-only, timeout 5000ms, LIMIT 50
- [ ] `--test` flag: chạy snapshot mặc định và in kết quả từ terminal
- [ ] `_meta.source_tables` liệt kê đúng tất cả bảng đã query
