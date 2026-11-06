---
name: ba-design-mockup
description: Tự động trích xuất màn hình gốc từ link/Live DOM hoặc codebase (master/main), thiết kế giao diện đúng theo phong cách có sẵn ở độ phân giải tối thiểu Full HD (1920x1080), highlight phần thiết kế mới cho client (không chèn ghi chú QA/BA), review chống vỡ layout và render ảnh Retina 2x.
trigger: Khi cần vẽ mockup giao diện WEB hoặc APP cho ba-refine, hoặc khi cần thiết kế giao diện chi tiết bám sát 100% phong cách gốc của hệ thống.
metadata:
  version: "1.1.0"
---

# ba-design-mockup

> 🛡️ **Grounding (grounding-contract):** Toàn bộ phong cách thiết kế, nhãn trường, màu sắc, vị trí nút bấm và layout BẮT BUỘC lấy từ giao diện thật qua link được cung cấp (Live DOM Snapshot) hoặc mã nguồn thật trên nhánh `master`/`main` của dự án. **NGHIÊM CẤM TỰ SUY DIỄN PHONG CÁCH / TỰ BỊA ĐẶT GIAO DIỆN.**

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `issueKey`, loại task (`WEB` hoặc `APP`), và nguồn giao diện gốc (link URL màn hình có sẵn hoặc đường dẫn codebase / `screenKey`). Thiếu input thì dừng và hỏi lại, không tự suy diễn.
- **Bằng chứng hoàn thành:** File `spec/asis-inventory.json`, `spec/asis-inventory.md`, `spec/diagrams/mockup.html`, `validate-mockup-fidelity.js` exit code 0 với Fidelity Score ≥ 90%, tồn tại các file ảnh `mockup-case-1.png` (và `mockup-case-2.png`, `mockup-case-3.png` nếu đa trạng thái) đạt độ phân giải tối thiểu Full HD (`1920x1080`) và đã được review trực quan đảm bảo không vỡ layout.

## Overview (Tổng quan)

Kỹ năng chuyên biệt phục vụ thiết kế Mockup giao diện bám sát thực tế (Prod-Twin UI) cho BA/PO trong giai đoạn Refine với **5 nguyên tắc cốt lõi**:
1. **Bám sát 100% Phong cách có sẵn (Codebase / Link):** Trích xuất trực tiếp từ link màn hình được cung cấp (`capture-asis-dom.js`) hoặc từ codebase (`extract-asis-ui.js`). Giữ nguyên 100% Design System có sẵn của sản phẩm (Ant Design Pro, Entrade X Dark/Light, Flutter Mobile...), tuyệt đối không tự suy diễn style.
2. **Độ phân giải tối thiểu Full HD (`1920x1080`):** Mọi mockup Web/Desktop bắt buộc thiết kế ở độ phân giải tối thiểu `1920x1080` (`min-width: 1920px; min-height: 1080px`). Mobile thiết kế theo khung chuẩn `393x852`.
3. **Chỉ thiết kế theo Yêu cầu Task + Highlight phần mới cho Client (Không ghi chú QA/BA):**
   - Trong mockup chỉ thiết kế đúng các thành phần giao diện theo yêu cầu của task.
   - Highlight trực quan vào phần được thiết kế mới hoặc sửa đổi (`data-change="added|modified"` với viền/nền highlight tinh tế) để client dễ dàng nhận ra đâu là phần mới so với thiết kế cũ.
   - **TUYỆT ĐỐI KHÔNG** thiết kế các ghi chú cho QA/BA/Dev trên mockup: không gắn huy hiệu số `①`, `②`, `③` (`delta-pin`, `delta-badge`), không chèn bảng `UI Delta Mapping` (`delta-table`), không hiển thị thanh công cụ preview.
4. **Kiểm định Fidelity & Review Chống Vỡ Layout:** Chạy `validate-mockup-fidelity.js` (Fidelity Score ≥ 90%) kết hợp kiểm tra layout tự động trong `render-mockup.js` và **bắt buộc đọc lại file ảnh `.png` sau khi render** để kiểm tra không bị tràn chữ, lệch cột, hụt nền hay vỡ bố cục.
5. **Sử dụng Trực tiếp Ảnh Mockup trên `refined-draft.md`:** Sau khi có ảnh mockup, trong mục `## 🎨 UI Design / Mockup` của `refined-draft.md` chỉ nhúng ảnh mockup đó (`![...](...)`), **không mô tả design bằng text và không ghi chú gì thêm**.

## When to Use (Khi nào sử dụng)

- Khi thiết kế giao diện màn hình cho các Jira task thuộc loại `WEB` hoặc `APP`.
- Khi kỹ năng `ba-refine` đến Giai đoạn 3 cần dựng Mockup trực quan để trình User phê duyệt tại Gate 2.

**Khi KHÔNG sử dụng:**
- Task thuần Backend, API, Kafka, cơ sở dữ liệu TimescaleDB/PostgreSQL không có giao diện người dùng.
- Vẽ sơ đồ luồng quy trình, sequence, kiến trúc hệ thống → Dùng `ba-design-flowchart`.

## Quy Trình Thực Thi & Tài Liệu Tham Chiếu

### Bước 1: Trích xuất Giao diện & Phong cách Gốc AS-IS (Từ Link hoặc Codebase)
Lựa chọn phương thức trích xuất tương ứng với nguồn được cung cấp (không tự suy diễn):

**Cách A: Trích xuất trực tiếp từ Link / Live DOM được cung cấp (Ưu tiên khi có link hoặc môi trường chạy thực tế):**
```bash
node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/capture-asis-dom.js \
  --url "<URL_MÀN_HÌNH_ĐƯỢC_CUNG_CẤP>" \
  --output "workspace/issues/{issueKey}/spec" --login
```
*Script sẽ mở trình duyệt ở độ phân giải Full HD (`1920x1080`), chụp ảnh nền `asis-baseline.png` và dump toàn bộ DOM + inline computed CSS styles ra `asis-snapshot.html` để giữ nguyên 100% phong cách gốc.*

**Cách B: Trích xuất từ Codebase được cung cấp (`origin/master` hoặc `origin/main`):**
1. Tra cứu `references/ui-component-map.json` hoặc cây thư mục của repo được cung cấp.
2. Chạy script bóc tách tự động:
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/extract-asis-ui.js \
     --project web-trading \
     --screen OrderForm \
     --output "workspace/issues/{issueKey}/spec"
   ```
   *Sinh ra `workspace/issues/{issueKey}/spec/asis-inventory.json` và `workspace/issues/{issueKey}/spec/asis-inventory.md`.*

### Bước 2: Khởi tạo Khung Giao diện Chuẩn Độ Phân Giải (Min Full HD `1920x1080` cho Web)
- **Nếu có `asis-snapshot.html` từ Link/Live DOM:** Sử dụng trực tiếp `asis-snapshot.html` làm khung gốc cho `workspace/issues/{issueKey}/spec/diagrams/mockup.html` và đảm bảo container gốc đạt chuẩn Full HD (`min-width: 1920px; min-height: 1080px`).
- **Nếu dựng từ Codebase Entrade X / Arrow App:** Chọn shell tương ứng trong `assets/shells/` (đã chuẩn hóa Full HD `1920x1080` cho Web và `393x852` cho Mobile):
  - `assets/shells/web-trading-shell.html`
  - `assets/shells/web-assets-dashboard-shell.html`
  - `assets/shells/web-modal-confirm-shell.html`
  - `assets/shells/mobile-app-shell.html`
  - `assets/shells/mobile-order-sheet-shell.html`
  - `assets/shells/mobile-bottom-sheet-shell.html`

### Bước 3: Thiết kế Giao diện Theo Yêu Cầu Task & Highlight Phần Mới (Không Ghi Chú QA/BA)
1. Giữ nguyên phong cách thiết kế, màu sắc, typography, spacing và các thành phần có sẵn của màn hình gốc.
2. Chỉ thiết kế các thành phần giao diện theo đúng yêu cầu của task.
3. **Highlight phần được thiết kế mới/sửa đổi** để client dễ nhận ra sự khác biệt so với thiết kế cũ:
   - Phần thêm mới: gắn `data-change="added"` (hiển thị viền/hiệu ứng highlight xanh nổi bật).
   - Phần sửa đổi: gắn `data-change="modified"` (hiển thị viền/hiệu ứng highlight cam nổi bật).
4. **TUYỆT ĐỐI KHÔNG chèn các ghi chú cho QA/BA/Dev vào trong mockup:**
   - ❌ Không gắn huy hiệu đánh số `①`, `②`, `③` (`delta-pin`, `delta-badge`).
   - ❌ Không chèn bảng `Bảng Chú thích Thay đổi Giao diện (UI Delta Mapping)` (`delta-table`).
   - ❌ Không chèn note giải thích, mã `[BR-*]`, `[AC-*]` hay thanh công cụ điều khiển lên màn hình.
5. Cài đặt hàm JavaScript `switchState(state)` hỗ trợ các trạng thái nghiệp vụ (`default`, `error`, `locked`).

### Bước 4: Kiểm Định Fidelity, Render Ảnh Retina 2x & Review Chống Vỡ Layout
1. **Chạy Hard Gate kiểm định:**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/asis-inventory.json"
   ```
   *Bắt buộc PASS (Fidelity Score >= 90%, có highlight `data-change`, không chứa huy hiệu `① ② ③` hay bảng `delta-table`, đạt chuẩn Full HD).*
2. **Render ảnh Retina 2x (kèm kiểm tra Layout tự động):**
   ```bash
   node ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-refine/assets/render-mockup.js \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.html" \
     "workspace/issues/{issueKey}/spec/diagrams/mockup.png" fit 2 all
   ```
   *Kiểm tra kết quả `layout_check` trong JSON trả về (`layoutValid: true`, không bị tràn chiều ngang, khung Web rộng đủ `1920px`).*
3. **BẮT BUỘC Review Trực Quan Ảnh Mockup (`read_file` trên file `.png`):**
   - Mở trực tiếp các file ảnh vừa xuất (`mockup-case-1.png`...) bằng công cụ `read_file` để kiểm tra bằng mắt:
     - Layout có bị vỡ, lệch hàng, đè chữ hoặc tràn bảng ra ngoài khung nền không?
     - Độ phân giải đã chuẩn Full HD (`1920x1080` trở lên với Web) và màu nền đã phủ kín 100% chưa?
     - Đã đúng 100% phong cách gốc của web/mobile được cung cấp và có highlight rõ phần thiết kế mới chưa?
     - Đảm bảo hoàn toàn sạch bóng ghi chú QA/BA trên ảnh.
   - Nếu phát hiện bất kỳ lỗi vỡ layout nào → sửa ngay trong `mockup.html` và render lại cho đến khi hoàn hảo.
4. **Nhúng vào `refined-draft.md`:** Trong mục `## 🎨 UI Design / Mockup` của `refined-draft.md`, **chỉ nhúng duy nhất ảnh mockup** (`![...](workspace/issues/{issueKey}/spec/diagrams/...)`), tuyệt đối không mô tả design bằng text và không ghi chú gì thêm.
5. **Vòng đời & Quản lý File (Zero Repo Pollution):**
   - Trong quá trình thiết kế, nếu cần viết script dựng DOM hoặc render tùy biến, **BẮT BUỘC** đặt tại `workspace/issues/{issueKey}/spec/diagrams/` (hoặc `.scratch/`), **CẤM TUYỆT ĐỐI** tạo file scratch/mockup runner vào thư mục `scripts/` gốc.
   - Sau khi chốt `refined.md` và push Jira thành công, cơ chế Post-Push Cleanup sẽ tự động dọn sạch các file nháp, chỉ giữ lại đúng bộ thành quả cuối cùng: `mockup.html`, script render và các file ảnh mockup được nhúng trong spec.

## Verification (Xác minh)

- [ ] Giao diện gốc được trích xuất từ link được cung cấp hoặc từ codebase (`spec/asis-inventory.json` & `spec/asis-inventory.md`), đúng 100% phong cách có sẵn (không tự suy diễn).
- [ ] Độ phân giải Web/Desktop đạt tối thiểu Full HD (`1920x1080`).
- [ ] Chỉ thiết kế theo đúng yêu cầu của task và có highlight (`data-change="added|modified"`) vào phần được thiết kế mới để client dễ nhận biết.
- [ ] Hoàn toàn KHÔNG có ghi chú cho QA/BA (`① ② ③`, `delta-pin`, `delta-table`, `UI Delta Mapping`) bên trong mockup.
- [ ] Script `validate-mockup-fidelity.js` chạy exit code 0 với Fidelity Score ≥ 90%.
- [ ] Đã kiểm tra `layout_check.layoutValid === true` và đọc trực tiếp ảnh `.png` xác nhận không bị vỡ layout.
- [ ] Trên file `refined-draft.md`, phần `## 🎨 UI Design / Mockup` chỉ nhúng ảnh mockup, không mô tả design bằng text và không ghi chú gì thêm.

## Red Flags (Cờ đỏ)

- Tự suy diễn màu sắc, bố cục hoặc ép dùng Dark Mode Shell của Entrade X cho một hệ thống dùng phong cách khác (như Dadmin Ant Design Light Theme).
- Thiết kế Web ở độ phân giải hẹp (`1440px`, `1180px`) làm bảng nhiều cột bị bó hẹp, xuống dòng hoặc vỡ khung.
- Không mở file ảnh `.png` để review sau khi render dẫn đến bàn giao ảnh bị vỡ layout cho user.
- Đưa các ký hiệu `①`, `②`, `③`, bảng `UI Delta Mapping` hoặc ghi chú QA/BA vào trong bức ảnh mockup.
- Viết thêm đoạn văn mô tả design, gạch đầu dòng giải thích thao tác hoặc bảng chú thích vào mục `## 🎨 UI Design / Mockup` trong `refined-draft.md`.
