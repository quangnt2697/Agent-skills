---
name: db-timescale-reconciler
description: Quét, đối chiếu và phát hiện sai lệch dữ liệu thị trường KRX MDDS trên TimescaleDB Production. Bao gồm kiểm tra count parity, value drift (giá/khối lượng), NULL/invalid scan, duplicate key, late-arriving data (created_at vs sending_time), và OHLC gap detection cho 11 topic nghiệp vụ.
trigger: Kích hoạt khi người dùng gõ /db-recon, yêu cầu "đối chiếu dữ liệu", "kiểm tra lệch tick/topprice/ohlc/giá", "so sánh v3 vs v2", "scan dữ liệu prod", hoặc khi cần xác minh tính toàn vẹn dữ liệu sau deploy pipeline MDDS mới.
disable-auto-invoke: true
---

# db-timescale-reconciler

## Overview (Tổng quan)

Phát hiện sai lệch dữ liệu chứng khoán KRX MDDS trên TimescaleDB Production qua Metabase API (`${METABASE_PROD_URL}`, DB ID: `${METABASE_PROD_DB_TIMESCALE_ID}`). Bao gồm 11 topic MDDS: Ticks, TopPrices, ExpectedPrice, OHLC, Indices, BoardEvents, SymbolBoardEvents, ForeignTrading, SecurityDefinition, VolatilityInterruption, TradeExtra.

## When to Use (Khi nào sử dụng)

- Kích hoạt khi cần đối chiếu dữ liệu thị trường KRX MDDS Ticks v3 hôm nay hoặc trong quá khứ.
- Kích hoạt khi nghi ngờ có value drift (lệch giá, lệch khối lượng) giữa bảng raw (`prices`) và bảng transformed (`krx_mdds_v3_*`).
- Kích hoạt khi cần rà soát nến OHLC bị thiếu (gap) hoặc bản ghi ghi muộn sau phiên.
- Sau khi deploy phiên bản pipeline dữ liệu MDDS mới lên môi trường Production.

## Quy Tắc An Toàn & Thực Thi (Execution Rules)

1. **Zero-Mutation Policy:** Tuyệt đối READ-ONLY. Mọi query phải qua `sanitizeQuery()` trước khi chạy. Nghiêm cấm INSERT, UPDATE, DELETE, TRUNCATE, DROP.
2. **TimescaleDB Partition-First Rule:** Luôn có điều kiện `WHERE sending_time >= '{{date}}'::date AND sending_time < '{{date}}'::date + INTERVAL '1 day'` để kích hoạt chunk exclusion. Tuyệt đối không filter đơn độc trên `created_at` gây full table scan.
3. **Thực thi qua CLI/Engine:**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/scripts/db/db-recon.js --env=prod --suite=full    # Toàn bộ query
   node ${AGENT_SKILLS_HOME:-.}/scripts/db/db-recon.js --env=prod --suite=core    # 4 bài trọng tâm
   node ${AGENT_SKILLS_HOME:-.}/scripts/db/db-recon.js --env=prod recon-ticks     # Đối chiếu ticks
   ```
4. **Tham chiếu chi tiết:**
   - Tra cứu schema bảng, enum phiên và mã lỗi: [references/recon-operational-guide.md](references/recon-operational-guide.md).
   - Danh mục 26 câu SQL chuẩn hóa: [assets/reconciliation-queries.json](assets/reconciliation-queries.json).

## Verification (Xác minh)

- [ ] 100% câu query tuân thủ Read-Only và Partition-First (`sending_time`).
- [ ] Báo cáo ghi nhận đủ số bản ghi, độ trễ latency và tỷ lệ khớp giữa các bảng.
- [ ] Bất kỳ điểm sai lệch (drift) nào vượt ngưỡng đều có symbol, timestamp cụ thể để bàn giao xử lý.

## Red Flags (Cờ đỏ)

- Chạy query không có mệnh đề `WHERE sending_time >= ...` trên bảng TimescaleDB.
- Xuất hiện câu lệnh thay đổi dữ liệu trong catalog query.
- Bỏ qua EXPLAIN check trước khi chạy các query quét sâu vào `created_at`.
- Quên đặt giới hạn LIMIT cho các câu query audit lỗi.

## Common Rationalizations (Những lời Biện minh Thường gặp)

- *"Dữ liệu hôm nay nhìn bình thường trên bảng giá, khỏi cần recon"* → Bảng giá frontend chỉ hiển thị tick mới nhất, không phản ánh mất tick ở giữa phiên.
- *"Query thẳng vào cột created_at cho nhanh"* → TimescaleDB partition theo `sending_time`. Quên partition key sẽ gây Seq Scan làm sập database Prod.
- *"Chạy UPDATE tạm để sửa giá sai trên Prod"* → Vi phạm nghiêm trọng Zero-Mutation Policy. Mọi sửa đổi phải xử lý từ pipeline gốc.

---
