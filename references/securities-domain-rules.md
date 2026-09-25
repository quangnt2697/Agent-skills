# Cẩm Nang Nghiệp Vụ Chứng Khoán & Hệ Thống Giao Dịch (Securities Domain Knowledge Base)

Tài liệu chuẩn hóa toàn bộ tri thức nghiệp vụ chứng khoán Việt Nam (thị trường cơ sở, phái sinh, hệ thống KRX, MDDS và OpenAPI) phân cấp từ **Cơ Bản → Nâng Cao**.
Tài liệu này là **Single Source of Truth** dùng chung cho toàn bộ 7 Persona trong hệ thống: **BA, DEV, QA/SDET, Code Reviewer, Security Auditor, Web Performance Auditor, Scrum Master**.

---

## Cách Sử Dụng

> **CHỈ ĐỌC MODULE PHÙ HỢP VỚI TASK HIỆN TẠI.** Không đọc toàn bộ 8 module cùng lúc.
> Tra mục lục dưới đây → Xác định module cần thiết → Mở file tương ứng.

---

## MỤC LỤC & CÁC MODULES CHUYÊN SÂU

Tài liệu được chia thành các module độc lập trong thư mục [`references/securities/`](securities/) giúp tối ưu token và tra cứu chính xác:

1. **[01-market-structure.md](securities/01-market-structure.md)** — **CẤP ĐỘ 1 (CƠ BẢN): Khái Niệm Căn Bản & Cấu Trúc Thị Trường**
   - Sở & Thị trường (MarketID), Bảng giao dịch (BoardID), Biên độ dao động giá, Bước giá, Lô chẵn/lẻ, Chu kỳ thanh toán T+2.

2. **[02-sessions-and-orders.md](securities/02-sessions-and-orders.md)** — **CẤP ĐỘ 2 (TRUNG CẤP): Phiên Giao Dịch, Cờ Phiên & Các Loại Lệnh Đặt**
   - Khung giờ phiên, Mã cờ phiên KRX (`GT1`, `AX1`, `AD1`, `AA1`, `BB1`, `BC1`, `AD2`, `AB1`, `AB2`, v.v.), Ma trận ánh xạ EventID $\rightarrow$ TradingSessionID $\rightarrow$ Loại lệnh cho phép đa sàn/nhóm sản phẩm (STO, STX, UPX, FIO, FBX, HCX), Cấu hình Web (`krxOrderTypeMap`) & App (`_getOrderType*`), Cơ chế Fallback an toàn, Quy tắc chặn lệnh thị trường MTL theo trạng thái giám sát SI (diện `CR`/`RES`), Lệnh thỏa thuận (1F/2F), Phái sinh, Quy chuẩn Sửa/Hủy lệnh, Cơ chế Random End (RE).

3. **[03-order-lifecycle-and-ors.md](securities/03-order-lifecycle-and-ors.md)** — **CẤP ĐỘ 3 (TRUNG CẤP): Vòng Đời Lệnh, Trạng Thái & Lệnh Điều Kiện**
   - Máy trạng thái vòng đời lệnh, Bảng ánh xạ trạng thái đa tầng, Danh mục 15 mã lỗi ORS, Lệnh 24/7 fallback, Động cơ lệnh điều kiện (Stop, TCO, Trailing).

4. **[04-volatility-and-halts.md](securities/04-volatility-and-halts.md)** — **CẤP ĐỘ 4 (NÂNG CAO): Quản Lý Biến Động & Tạm Ngừng Giao Dịch Khẩn Cấp**
   - Instrument Halt (`EI8`/`EI1`/`EI9`), Market Halt (`AE8`/`AE1`/`BE9`), Circuit Breaker (CB), Volatility Interruption (VI).

5. **[05-market-data-mdds.md](securities/05-market-data-mdds.md)** — **CẤP ĐỘ 5 (NÂNG CAO): Dữ Liệu Thị Trường Real-time (MDDS / KRX Protocols)**
   - Bản tin MDDS từ Sở, Kênh WebSocket datafeed phân phối khách hàng, Tuần tự thời gian & Đo lường độ trễ (latency tracking).

6. **[06-traditional-margin.md](securities/06-traditional-margin.md)** — **CẤP ĐỘ 6 (CHUYÊN SÂU): Sức Mua & Ký Quỹ Truyền Thống Theo Tiểu Khoản**
   - Mô hình tiểu khoản .1 và .6, Công thức sức mua (Buying Power), Tỷ lệ $R_{tt}$, Call margin (<85%) & Force sell (<80%), Quản lý room ngoại & room CTCK.

7. **[07-deal-based-margin.md](securities/07-deal-based-margin.md)** — **CẤP ĐỘ 7 (ĐỘC QUYỀN): Hệ Thống Quản Trị Vị Thế Ký Quỹ Theo Deal**
   - Định danh Deal, Data model, Vòng đời Deal, Công thức toán học (Giá vốn, Giá hòa vốn, $R_{\text{deal}}$), Giá chặn Margin (Loan/Cap Price), Call margin & Smart Force Sell theo Deal, Ma trận đồng bộ Core/Flex (`txCode`).

8. **[08-persona-matrix.md](securities/08-persona-matrix.md)** — **MA TRẬN HƯỚNG DẪN THỰC THI CHO TỪNG PERSONA**
   - Checklists và hướng dẫn hành động cụ thể cho BA, DEV, QA, Code Reviewer, Security Auditor, Web Performance Auditor.

---

## Tra Cứu Nhanh Theo Task

| Task đang làm | Module cần đọc | Persona Gợi Ý |
|---------------|---------------|---------------|
| Validate giá / biên độ / bước giá | [01-market-structure](securities/01-market-structure.md) | BA, DEV, QA |
| Phiên giao dịch, loại lệnh, sửa/hủy lệnh, ma trận mapping EventID, lọc lệnh MTL theo SI | [02-sessions-and-orders](securities/02-sessions-and-orders.md) | BA, DEV, QA |
| Vòng đời lệnh, trạng thái, mã lỗi ORS, lệnh điều kiện | [03-order-lifecycle-and-ors](securities/03-order-lifecycle-and-ors.md) | BA, DEV, QA, CR |
| Halt / Circuit Breaker / Volatility | [04-volatility-and-halts](securities/04-volatility-and-halts.md) | DEV, QA |
| WebSocket datafeed, MDDS, latency | [05-market-data-mdds](securities/05-market-data-mdds.md) | DEV, Perf Auditor |
| Sức mua, ký quỹ truyền thống, tiểu khoản | [06-traditional-margin](securities/06-traditional-margin.md) | BA, DEV, QA |
| Deal-based margin, giá chặn, force sell theo Deal | [07-deal-based-margin](securities/07-deal-based-margin.md) | BA, DEV, QA, CR |
| Checklist hành động cho từng persona (BA/DEV/QA/CR/SA) | [08-persona-matrix](securities/08-persona-matrix.md) | TẤT CẢ |
