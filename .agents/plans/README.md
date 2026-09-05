# Kế hoạch Cải tiến MCP

Thư mục này chứa các kế hoạch cải tiến MCP infrastructure chưa được triển khai.

## Danh sách kế hoạch

| File | MCP | Ưu tiên | Effort | Dependency |
|---|---|---|---|---|
| [`plan-test-data-mcp.md`](plan-test-data-mcp.md) | `test-data-mcp.js` | 🔴 P0 | ~1 ngày | Refactor `db-client.js` |
| [`plan-ws-inspector-mcp.md`](plan-ws-inspector-mcp.md) | `ws-inspector-mcp.js` | 🔴 P0 | ~1.5 ngày | `npm install ws` |
| [`plan-fixture-cache-mcp.md`](plan-fixture-cache-mcp.md) | `fixture-cache-mcp.js` | 🟢 P2 | ~0.5 ngày | `test-data-mcp.js` hoàn thành |

## Thứ tự triển khai khuyến nghị

```
1. Refactor db-client.js          ← prerequisite cho test-data-mcp
2. test-data-mcp.js               ← P0, giải quyết fixture generation
3. ws-inspector-mcp.js            ← P0, giải quyết WS recon
4. fixture-cache-mcp.js           ← P2, tối ưu hiệu năng (có thể tích hợp vào test-data-mcp)
```

## Quy tắc bất biến

> ❌ **NGHIÊM CẤM** tất cả MCP mới push/write dữ liệu lên Jira, Confluence, GitLab.  
> Quyền write Jira chỉ thuộc về **`ba-refine` skill** (sau khi user approve).  
> Tất cả MCP chỉ được: **READ từ DB** và **WRITE ra local workspace**.
