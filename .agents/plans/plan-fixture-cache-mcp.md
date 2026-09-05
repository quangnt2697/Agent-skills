# Kế hoạch Cải tiến: `fixture-cache-mcp.js`

**Trạng thái:** 📋 Chờ triển khai  
**Độ ưu tiên:** 🟢 P2  
**Effort ước tính:** ~0.5 ngày  
**Dependency:** `test-data-mcp.js` phải hoàn thành trước

> **Lưu ý thiết kế:** Có thể triển khai theo 2 hướng:  
> **Option A (Đơn giản):** Tích hợp cache logic thẳng vào `test-data-mcp.js` — tool `td_get_*` tự check cache trước khi query DB. Không cần MCP riêng.  
> **Option B (Tách riêng):** Tạo `fixture-cache-mcp.js` độc lập để expose `fc_list`, `fc_invalidate` như tool riêng cho agent dùng chủ động.  
> → Khuyến nghị **Option A** trừ khi cần `fc_list`/`fc_invalidate` thường xuyên.

---

## 1. Vấn đề cần giải quyết

Trong 1 sprint, nhiều issueKey cùng test cùng mã chứng khoán (VNM, SSI...):

```
JIRA-100 → td_get_security_info("VNM") → query TimescaleDB (500ms)
JIRA-101 → td_get_security_info("VNM") → query TimescaleDB lại (500ms) ← lãng phí
JIRA-102 → td_get_security_info("VNM") → query TimescaleDB lại (500ms) ← lãng phí
...x10 issues/sprint = 10 x 500ms + không deterministic nếu data thay đổi giữa chừng
```

---

## 2. Mục tiêu

1. Cache kết quả `td_get_*` theo key `(symbol, data_type, date)` với TTL 1 giờ
2. Sprint 10 issues cùng VNM → chỉ query DB 1 lần, 9 lần còn lại từ cache
3. Expose `fc_list` và `fc_invalidate` để agent hoặc hook session-start có thể xóa cache chủ động

---

## 3. Tools API đề xuất (Option B — MCP riêng)

| Tool | Input | Output |
|---|---|---|
| `fc_get` | `symbol`, `data_type` (`security_info`/`tick_samples`/`price_limits`/`session_flags`), `date?` | JSON data nếu cache hit; `null` nếu miss hoặc expired |
| `fc_set` | `symbol`, `data_type`, `data`, `ttl_minutes? (default 60)` | `{ok: true, key: "...", expires_at: "ISO8601"}` |
| `fc_invalidate` | `symbol? (hoặc "*" để xóa tất cả)` | `{invalidated: N, keys: [...]}` |
| `fc_list` | — | Array `{key, symbol, data_type, created_at, expires_at, size_bytes}` |

---

## 4. Cache Storage

Dùng disk cache tại `.agents/cache/` (cùng thư mục với `schema-644.json` của db-mcp):

```
.agents/cache/
├── schema-644.json                          ← db-mcp (đã có)
├── fixture-VNM-security_info.json           ← fixture-cache-mcp (mới)
├── fixture-VNM-price_limits.json
├── fixture-VNM-tick_samples-2026-09-04.json
├── fixture-SSI-security_info.json
└── fixture-cache-index.json                 ← index để fc_list() nhanh
```

**Format cache file:**
```json
{
  "key": "VNM-security_info",
  "symbol": "VNM",
  "data_type": "security_info",
  "created_at": "2026-09-05T10:00:00+07:00",
  "expires_at": "2026-09-05T11:00:00+07:00",
  "ttl_minutes": 60,
  "data": { "ceiling_price": 102900, "floor_price": 89700, ... }
}
```

---

## 5. Luồng hoạt động

### Option A — Tích hợp thẳng vào `test-data-mcp.js`

```
td_get_security_info("VNM")
  │
  ├─ Đọc .agents/cache/fixture-VNM-security_info.json
  │     Nếu tồn tại và expires_at > now → return từ cache (0ms)
  │     Nếu không có hoặc expired → continue
  │
  ├─ metabaseFetch() → query security_definition_v3
  │     → nhận data
  │
  └─ Ghi .agents/cache/fixture-VNM-security_info.json
         → return data
```

### Option B — MCP riêng với fc_get / fc_set

```
test-data-mcp.js:
  td_get_security_info("VNM")
    → fc_get("VNM", "security_info")   ← gọi fixture-cache-mcp
          HIT  → return ngay
          MISS → metabaseFetch()
                   → fc_set("VNM", "security_info", data, 60)
                   → return data
```

---

## 6. Khi nào invalidate cache

| Trigger | Hành động |
|---|---|
| TTL hết hạn (mặc định 60 phút) | `fc_get` tự phát hiện và return null → `test-data-mcp` query lại DB |
| Có corporate action (điều chỉnh giá tham chiếu) | Agent gọi `fc_invalidate("VNM")` |
| Bắt đầu phiên giao dịch mới (9:00 sáng) | Hook `session-start.sh` gọi `fc_invalidate("*")` |
| Trước khi chạy smoke test cuối ngày | Agent gọi `fc_invalidate("*")` để đảm bảo fresh data |

---

## 7. Tích hợp hook `session-start`

```json
// .agents/hooks.json — thêm vào session-start:
{
  "session-start": {
    "PreInvocation": [
      {
        "type": "command",
        "command": "bash ./hooks/antigravity/session-start.sh",
        "timeout": 10
      },
      {
        "type": "command",
        "command": "node .agents/test-data-mcp.js --invalidate-cache",
        "timeout": 5
      }
    ]
  }
}
```

---

## 8. Cập nhật `mcp_config.json` (Option B)

```json
"fixture-cache": {
  "command": "node",
  "args": ["./.agents/fixture-cache-mcp.js"]
}
```

---

## 9. Acceptance Criteria

- [ ] Cache hit trả về đúng data trong TTL, không query DB
- [ ] Cache miss hoặc expired → tự động query và ghi lại cache
- [ ] `fc_invalidate("VNM")` xóa tất cả keys có symbol=VNM
- [ ] `fc_invalidate("*")` xóa toàn bộ fixture cache (giữ nguyên `schema-*.json` của db-mcp)
- [ ] `fc_list()` trả đúng danh sách với `expires_at` và `size_bytes`
- [ ] Cache file không chứa credentials hoặc thông tin nhạy cảm
- [ ] Nếu cache file bị corrupt → tự fallback query DB, không crash server
