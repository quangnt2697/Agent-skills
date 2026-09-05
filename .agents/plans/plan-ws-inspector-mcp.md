# Kế hoạch Cải tiến: `ws-inspector-mcp.js`

**Trạng thái:** 📋 Chờ triển khai  
**Độ ưu tiên:** 🔴 P0  
**Effort ước tính:** ~1.5 ngày  
**Dependency:** `npm install websockets` (hoặc `ws`) trong `.agents/`

---

## 1. Vấn đề cần giải quyết

`qa-auto-design` Bước 3 (WS Recon) — tình trạng hiện tại:

```
Agent đọc spec/Jira → biết Channel names, Event schemas từ tài liệu (TRÊN GIẤY)
→ Viết Pydantic model dựa trên tài liệu (KHÔNG verify thực tế)
→ Run test → FAIL tại WS-3 (Event Payload Schema) vì thực tế khác spec:
   - Field tên khác: createdAt vs created_at vs ts
   - Field type sai: timestamp là string thay vì int
   - Field thừa hoặc thiếu so với tài liệu
→ Self-fix loop: 1-3 vòng (~15-30 phút thêm)
```

`playwright-mcp.js` hiện có chỉ xử lý HTTP/DOM — không hỗ trợ WebSocket protocol.

---

## 2. Mục tiêu

1. Agent mở WS connection thật, subscribe channel, nhận frames thực tế ngay trong conversation
2. Dùng frames thật để sinh Pydantic model chính xác 100% (không đoán)
3. Export frames thật làm pytest fixture (không hardcode trong conftest.py)
4. Verify đủ 8 WebSocket assertions ngay trong Recon trước khi viết code test

---

## 3. Tools API đề xuất

| Tool | Input | Output | Maps tới Assertion |
|---|---|---|---|
| `ws_connect` | `ws_url`, `api_key`, `timeout_sec? (default 5)` | `{session_id, status: "CONNECTED", latency_ms, server_info?}` | [WS-1] Handshake & Auth |
| `ws_subscribe` | `session_id`, `channel`, `symbol?`, `account_no?` | ACK payload raw JSON | [WS-2] Subscribe ACK |
| `ws_receive` | `session_id`, `count`, `timeout_sec? (default 10)` | Array of raw frame JSON | [WS-3] Payload Schema |
| `ws_validate_schema` | `frame_json`, `expected_fields: [{name, type}]` | `{valid: bool, missing_fields: [], type_errors: [], extra_fields: []}` | [WS-3] Schema diff |
| `ws_send` | `session_id`, `payload_json` | Raw response JSON (nếu có) | Ad-hoc |
| `ws_close` | `session_id`, `code? (default 1000)` | `{close_code, frames_received, session_duration_ms}` | [WS-8] Close Frame |

---

## 4. Cấu trúc file

```
.agents/
└── ws-inspector-mcp.js     ← [MỚI] WebSocket MCP server

npm dependency (thêm vào package.json):
  "ws": "^8.x"   hoặc  "websockets": đã có trong playwright?
```

---

## 5. Session Management

Mỗi `ws_connect` tạo 1 session. Session lưu trong memory Map:

```js
const sessions = new Map();
// sessions["abc123"] = {ws: WebSocket, frames: [], created_at: Date, ...}
```

**Session cleanup:**
- Auto-cleanup sau 10 phút không dùng (timeout)
- `ws_close` xóa session khỏi Map
- Server shutdown → đóng tất cả session còn mở

---

## 6. Luồng tích hợp vào `qa-auto-design` Bước 3

```
qa-auto-design Bước 3 — WebSocket Task Type
  │
  ├─ 1. ws_connect(ws_url=env.WS_URL, api_key=env.API_KEY)
  │        → {session_id: "abc123", status: "CONNECTED", latency_ms: 45}
  │        → Verify [WS-1]: kết nối thật thành công
  │
  ├─ 2. ws_subscribe(session_id="abc123", channel="tick", symbol="VNM")
  │        → {"type": "SUBSCRIBED", "channel": "tick", "symbol": "VNM", "status": "OK"}
  │        → Verify [WS-2]: ACK schema THẬT — field tên thật là "type", không phải "action"
  │
  ├─ 3. ws_receive(session_id="abc123", count=3, timeout_sec=10)
  │        → [
  │             {"type":"TICK","symbol":"VNM","price":96400,"qty":200,"side":"BUY","timestamp":1725421283000},
  │             {"type":"TICK","symbol":"VNM","price":96300,"qty":100,"side":"SELL","timestamp":1725421284000},
  │             {"type":"TICK","symbol":"VNM","price":96500,"qty":500,"side":"BUY","timestamp":1725421285000}
  │           ]
  │        → Verify [WS-3]: schema THẬT — timestamp là int ms, field là "qty" không phải "quantity"
  │        → Verify [WS-4]: price nằm trong [89700, 102900] ✓
  │        → Verify [WS-5]: timestamp[1]=1725421284000 >= timestamp[0]=1725421283000 ✓
  │
  ├─ 4. ws_validate_schema(frame=frames[0], expected_fields=[
  │           {name: "type", type: "string"},
  │           {name: "price", type: "number"},
  │           {name: "timestamp", type: "integer"}
  │        ])
  │        → {valid: true, missing_fields: [], type_errors: [], extra_fields: []}
  │
  ├─ 5. ws_close(session_id="abc123", code=1000)
  │        → {close_code: 1000, frames_received: 3, session_duration_ms: 2341}
  │        → Verify [WS-8]: close sạch với code 1000
  │
  └─ 6. Agent tổng hợp kết quả Recon:
          → Sinh TickEvent(BaseModel) CHÍNH XÁC từ frames thật
          → Export frames làm fixture: td_export_fixture("JIRA-123", frames, "ws_tick_samples")
          → [WS-3] sẽ PASS ngay lần chạy test đầu tiên
```

### Negative Recon — Test auth failure

```
ws_connect(ws_url=env.WS_URL, api_key="INVALID_KEY")
  → {status: "FAILED", error: "InvalidStatusCode 401", close_code: 1008}
  → Agent biết: server trả 401 với close code 1008 khi sai key
  → Sinh test case: pytest.raises(websockets.exceptions.InvalidStatusCode)
```

---

## 7. So sánh Before / After

| Tiêu chí | Không có MCP | Có `ws-inspector-mcp` |
|---|---|---|
| Pydantic model nguồn | Từ spec (tài liệu) | Từ frames THẬT |
| Field name accuracy | ~70% (thường sai case) | 100% |
| Self-fix loop | 1–3 vòng (15–30 phút) | 0 vòng |
| WS-3 fail lần 1 | Thường xuyên | Không |
| Fixture data | Hardcode trong conftest | File JSON thực tế |

---

## 8. Quan hệ với `playwright-mcp.js`

```
playwright-mcp.js (hiện có)          ws-inspector-mcp.js (mới)
─────────────────────────────        ─────────────────────────────
Protocol: HTTP + DOM                 Protocol: WebSocket (RFC 6455)
Engine: Chromium (headless)          Engine: ws npm package
Task type: WEB / APP                 Task type: WebSocket
Tools: navigate, click, fill         Tools: connect, subscribe, receive
Dùng cho Recon: DOM thật             Dùng cho Recon: WS frames thật

KHÔNG thay thế nhau — bổ sung nhau:
Trang có bảng giá realtime → playwright (DOM) + ws-inspector (WS feed)
```

---

## 9. Cập nhật `mcp_config.json`

```json
"ws-inspector": {
  "command": "node",
  "args": ["./.agents/ws-inspector-mcp.js"]
}
```

---

## 10. npm package cần thêm

```json
// package.json — thêm dependency:
{
  "dependencies": {
    "ws": "^8.17.0"
  }
}
```

Chạy: `npm install ws` trong thư mục `.agents/` hoặc project root.

---

## 11. Acceptance Criteria

- [ ] `ws_connect()` thành công với WS_URL và API_KEY từ `.env` thật
- [ ] `ws_connect()` với key sai → trả `{status: "FAILED", error: "...", close_code: 1008}`
- [ ] `ws_subscribe()` trả đúng ACK payload JSON thực tế từ server
- [ ] `ws_receive(count=3)` trả đúng 3 frames trong 10 giây; timeout → error rõ ràng
- [ ] `ws_validate_schema()` phát hiện đúng field type mismatch (string vs int)
- [ ] `ws_close(1000)` đóng socket với close code 1000; không crash nếu đã đóng
- [ ] Session tự cleanup sau 10 phút không hoạt động
- [ ] Không push bất kỳ dữ liệu nào lên Jira, Confluence, GitLab
- [ ] `--test` flag: kết nối WS_URL từ .env và nhận 1 frame, in ra rồi thoát
