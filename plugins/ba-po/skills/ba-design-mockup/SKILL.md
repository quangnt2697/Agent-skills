---
name: ba-design-mockup
description: Tự động trích xuất màn hình gốc từ master/main (React dnse-trading hoặc Flutter arrow-app) hoặc live UAT, lắp ghép giao diện chuẩn xác từng pixel theo bộ Production App Shells, chèn Delta-Only (added/modified/removed kèm ① ② ③) và render ảnh Retina 2x theo từng kịch bản nghiệp vụ.
trigger: Khi cần vẽ mockup giao diện WEB hoặc APP cho ba-refine, hoặc khi cần thiết kế giao diện chi tiết bám sát 100% codebase Production.
metadata:
  version: "1.0.0"
---

# ba-design-mockup

> 🛡️ **Grounding (grounding-contract):** Toàn bộ nhãn trường, màu sắc, vị trí nút bấm và layout BẮT BUỘC lấy từ mã nguồn thật trên nhánh `master`/`main` của dự án (`dnse-trading` hoặc `arrow-app`) hoặc Live DOM UAT. **NGHIÊM CẤM TỰ BỊA ĐẶT GIAO DIỆN / TỰ THIẾT KẾ BỪA.**

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey`, loại task (`WEB` hoặc `APP`), và tên màn hình đích (`screenKey`). Thiếu input thì dừng và hỏi lại, không tự suy diễn.
- **Bằng chứng hoàn thành:** File `spec/asis-inventory.json`, `spec/asis-inventory.md`, `spec/diagrams/mockup.html`, `validate-mockup-fidelity.js` exit code 0 với Fidelity Score ≥ 90%, và tồn tại các file ảnh `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png`.

## Overview (Tổng quan)

Kỹ năng chuyên biệt phục vụ thiết kế Mockup giao diện bám sát thực tế nhất (Prod-Twin UI) cho BA/PO trong giai đoạn Refine:
1. **AS-IS Codebase Extraction:** Tự động đọc file màn hình thật từ `origin/master` (không checkout), bóc tách 100% nhãn tiếng Việt, props, token màu vào `spec/asis-inventory.json` và `spec/asis-inventory.md`.
2. **Production App Shells:** Sử dụng bộ khung chuẩn xác từng pixel của Web Entrade X (Topbar + TwoColumn + OrderForm) và Mobile App (Khung iPhone + Symbol Bar + Sổ lệnh/Deal) thay vì dựng card HTML giả lập.
3. **Delta-Only & Case-Based:** Tái hiện 90% màn hình gốc làm nền ngữ cảnh (`opacity: 0.75`), làm nổi bật điểm thay đổi (`data-change="added|modified"`) kèm huy hiệu `①`, `②`, `③` và chuyển đổi đa trạng thái (Case 1: Chuẩn, Case 2: Cảnh báo/Vượt hạn mức, Case 3: Khóa phiên).
4. **Automated Fidelity Gate:** Chấm điểm tự động `Fidelity Score >= 90%` đối chiếu giữa code thật và `mockup.html` trước khi cho phép xuất ảnh.
5. **Retina 2x Export:** Tự động kết xuất ra bộ ảnh `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png` phục vụ dán trực tiếp vào Jira Description và bàn giao QA sinh Page Object Model (POM).

## When to Use (Khi nào sử dụng)

- Khi thiết kế giao diện màn hình cho các Jira task thuộc loại `WEB` (hệ thống web-trading) hoặc `APP` (ứng dụng mobile arrow-app).
- Khi kỹ năng `ba-refine` đến Giai đoạn 3 cần dựng Mockup trực quan để trình User phê duyệt tại Gate 2.
- Khi cần bàn giao tài liệu thay đổi giao diện kèm danh mục phần tử UI chuẩn (`testability-manifest.json`) cho QA/SDET viết Page Object Model mà không phải bắt locators thủ công.

**Khi KHÔNG sử dụng:**
- Task thuần Backend, API, Kafka, cơ sở dữ liệu TimescaleDB/PostgreSQL không có giao diện người dùng.
- Vẽ sơ đồ luồng quy trình, sequence, kiến trúc hệ thống → Dùng `ba-design-flowchart`.
- Chỉ cần User Story và Acceptance Criteria dạng text thuần mà không thay đổi UI.

## Quy Trình Thực Thi & Tài Liệu Tham Chiếu

### Bước 1: Trích xuất Giao diện Gốc AS-IS (Codebase Extraction)
Lựa chọn một trong 2 phương thức trích xuất AS-IS:

**Cách A: Trích xuất trực tiếp từ Live DOM / UAT (Ưu tiên khi có môi trường chạy thực tế):**
```bash
node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/capture-asis-dom.js \
  --url "https://dev.trading-test.dnse.com.vn/trade" \
  --output "workspace/issues/{issueKey}/spec" --login
```
*Script sẽ tự động đăng nhập, chụp ảnh nền `asis-baseline.png` và dump DOM + inline computed styles ra `asis-snapshot.html`.*

**Cách B: Trích xuất đệ quy từ Codebase master/main (Mặc định không cần môi trường UAT):**
1. Mở `references/ui-component-map.json` tra cứu `source_files` của màn hình liên quan (`OrderForm`, `Loans`, `order_deal_book`...).
2. Chạy script bóc tách tự động:
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/extract-asis-ui.js \
     --project web-trading \
     --screen OrderForm \
     --output "workspace/issues/{issueKey}/spec"
   ```
   *Script sẽ đọc trực tiếp từ `origin/master` (hoặc `origin/main`) qua `git show` và tự động sinh ra:*
   - `workspace/issues/{issueKey}/spec/asis-inventory.json` (danh sách nhãn tiếng Việt, fields, buttons, tokens, conditional locks).
   - `workspace/issues/{issueKey}/spec/asis-inventory.md` (tài liệu bảng DOM AS-IS chuẩn).

### Bước 2: Chọn Khung Production App Shell (Bộ 6 Khung Chuẩn)
Dựa vào loại task và bối cảnh màn hình, chọn 1 trong 6 shell tương ứng trong `assets/shells/`:
- **Web Trading & OrderForm:** `assets/shells/web-trading-shell.html` (Khung TwoColumn Entrade X: Topbar, Sổ lệnh, Bảng giá KRX, Form đặt lệnh).
- **Web Quản Lý Tài Sản / Gói Vay:** `assets/shells/web-assets-dashboard-shell.html` (Khung Assets: Sidebar menu, Bảng danh sách gói vay và dư nợ Margin).
- **Web Modal Xác Nhận / Popup:** `assets/shells/web-modal-confirm-shell.html` (Hộp thoại xác nhận đặt lệnh, thông tin deal, OTP).
- **Mobile App Shell (iPhone Frame):** `assets/shells/mobile-app-shell.html` (Khung iPhone 14 Pro, Dynamic Island, Sổ lệnh & Vị thế Deal Mobile).
- **Mobile Order Bottom Sheet:** `assets/shells/mobile-order-sheet-shell.html` (Khung Bottom Sheet vuốt lên đặt lệnh nhanh kèm Stepper).
- **Mobile Smart OTP Sheet:** `assets/shells/mobile-bottom-sheet-shell.html` (Khung Bottom Sheet xác thực Smart OTP 6 số).

Copy khung shell được chọn vào `workspace/issues/{issueKey}/spec/diagrams/mockup.html`.

### Bước 3: Lắp Ghép Component Chuẩn & Chèn Lớp Delta-Only
1. Giữ nguyên 90% các trường thông tin đã trích xuất từ `asis-inventory.json` đặt trong `.as-is-context` (`data-ui="as-is"`).
2. Chèn thành phần thêm mới hoặc sửa đổi:
   - Thêm mới: `data-change="added"` kèm `<span class="delta-pin delta-badge badge-added">①</span>`
   - Sửa đổi: `data-change="modified"` kèm `<span class="delta-pin delta-badge badge-modified">②</span>`
   - Bỏ bớt: `data-change="removed"` kèm `<span class="delta-pin delta-badge badge-removed">③</span>`
3. Cài đặt hàm JavaScript chuyển trạng thái đa Case trong `mockup.html`:
   - `switchState('default')`: Hiển thị Case 1 (Luồng chuẩn).
   - `switchState('error')`: Hiển thị Case 2 (Lỗi / Cảnh báo / Vượt hạn mức).
   - `switchState('locked')`: Hiển thị Case 3 (Khóa phiên ATO/ATC hoặc điều kiện biên).
4. Điền **Bảng Chú thích Thay đổi Giao diện (UI Delta Mapping)** ở cuối `mockup.html`.

### Bước 4: Kiểm Định Fidelity & Render Ảnh Retina 2x
1. **Chạy Hard Gate kiểm định độ giống Prod:**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/asis-inventory.json"
   ```
   *Bắt buộc PASS (Fidelity Score >= 90%, không dùng nhãn tự bịa, đủ 3 Case).*
2. **Render ảnh Retina 2x:**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/render-mockup.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.png" fit 2 all
   ```
   *Kết quả sinh đủ: `mockup.png`, `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png`.*
3. Điền Fidelity Score và link ảnh vào Mục `## 🎨 UI Design / Mockup` của `refined-draft.md`.

## Verification (Xác minh)

- [ ] File `spec/asis-inventory.json` và `spec/asis-inventory.md` đã được tạo từ nhánh `origin/master` hoặc Live DOM.
- [ ] Mockup sử dụng đúng Production App Shell (chọn 1 trong 6 shell chuẩn trong `assets/shells/`).
- [ ] Màn hình gốc được giữ nguyên làm nền ngữ cảnh (`class="as-is-context"` hoặc `data-ui="as-is"`).
- [ ] Toàn bộ phần tử thay đổi được gắn viền nhấn `data-change="added|modified"` và huy hiệu `①`, `②`, `③`.
- [ ] File `mockup.html` có Bảng Chú Thích Thay Đổi Giao Diện (UI Delta Mapping) khớp 1-1 các huy hiệu trên giao diện.
- [ ] File `mockup.html` có hàm `switchState()` hỗ trợ đủ các trạng thái nghiệp vụ (default, error, locked).
- [ ] Script `validate-mockup-fidelity.js` chạy exit code 0 với Fidelity Score ≥ 90%.
- [ ] Bộ 3 ảnh `mockup-case-1.png`, `mockup-case-2.png`, `mockup-case-3.png` đã được render thành công ở độ phân giải Retina 2x.

## Red Flags (Cờ đỏ)

- Tự code HTML layout từ đầu mà không dùng Production App Shell dẫn đến lệch hoàn toàn giao diện thật.
- Bịa đặt nhãn tiếng Việt hoặc cấu trúc trường không có trong `asis-inventory.json`.
- Vẽ mockup 1 trạng thái tĩnh duy nhất, không có hàm `switchState()` để kiểm thử lỗi và ngoại lệ.
- Bỏ qua huy hiệu `①`, `②`, `③` làm người đọc không biết đâu là màn hình cũ, đâu là tính năng mới.
- Tự gõ Fidelity Score trong spec mà không chạy script kiểm định `validate-mockup-fidelity.js`.

## Common Rationalizations (Những lời Biện minh Thường gặp)

- *"Dựng khung card HTML đơn giản cho nhanh, vẽ full Shell làm gì"* → Khung card thô làm BA/PO và Dev hiểu sai ngữ cảnh màn hình, không hình dung được vị trí thật trên Entrade X.
- *"Chỉ cần 1 ảnh mockup là đủ diễn đạt"* → Thiếu ảnh trạng thái cảnh báo lỗi và khóa phiên khiến Dev và QA bỏ sót edge cases trong lúc triển khai.
- *"Giao diện mới hoàn toàn nên không cần trích xuất AS-IS"* → Mọi tính năng mới đều phải đặt trong một màn hình hoặc layout hiện có của Entrade X / Arrow App.
