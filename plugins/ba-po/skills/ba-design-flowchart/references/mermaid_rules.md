# Quy Tắc Thiết Kế Sơ Đồ (Mermaid Rules)

Tài liệu này định nghĩa chuẩn mực thiết kế và render sơ đồ Mermaid cho toàn bộ dự án, tối ưu hóa hiển thị và chuẩn trực quan cho kiến trúc, quy trình nghiệp vụ và kỹ thuật.

## 1. Các Nguyên Tắc Thiết Kế Bắt Buộc

1. **Engine ELK (Bắt buộc):** Luôn khai báo `%%{init: {"flowchart": {"defaultRenderer": "elk"}, "elk": {"edgeRouting": "ORTHOGONAL", "mergeEdges": false, "nodePlacementStrategy": "BRANDES_KOEPF"}}}%%` ở dòng đầu tiên của file để ép các đường nối vuông góc 90 độ, các node xếp thẳng hàng ngang cùng trục Y (tránh lệch trục gây bẻ cong mũi tên) và mũi tên chĩa đúng vào tâm hộp.
2. **Hướng luồng ngang (Horizontal Flow):** Bắt buộc sử dụng hướng đi từ trái sang phải (`flowchart LR` thay vì `TD`) để tiết kiệm không gian dọc. **Hạn chế tối đa dùng `subgraph`** vì ELK có xu hướng tách subgraph xuống dòng làm mất cấu trúc thẳng hàng ngang.
3. **Chuẩn hóa hình dạng Node (Node Shape Taxonomy):** Bắt buộc dùng đúng ký hiệu:
   - **Start / End:** `([Stadium])` — ví dụ: `START(["🟢 Nhận lệnh"])`, `END(["🔴 Hoàn tất"])`. Node bắt đầu luôn nằm ở góc ngoài cùng bên trái.
   - **Task / Xử lý:** `[Rectangle]` — ví dụ: `VALIDATE["Kiểm tra lệnh"]`.
   - **Quyết định:** `{Diamond}` — ví dụ: `CHECK{"Lệnh hợp lệ?"}`.
   - **Sub-process:** `[[Double Border]]` — ví dụ: `[[Kiểm tra ký quỹ]]`.
   - **Database / Cache:** `[(Cylinder)]` — ví dụ: `[(TimescaleDB)]`.
   - **External System:** `>Asymmetric]` — ví dụ: `>OpenAPI Gateway]`.
4. **2 Mẫu Bố Cục Chuẩn (Standard Layout Patterns):**
   - **Mẫu 1: Straight Spine (Chuẩn BPMN / Sơ đồ có rẽ nhánh):** Trục xương sống chính (`Start ➔ Task ➔ Decision ➔ Success ➔ End`) đi thẳng tắp trên một hàng ngang. Nhánh ngoại lệ/Lỗi rẽ xuống tầng dưới, và vòng lặp thử lại nét đứt chạy vòng đáy hình chữ U vuông góc 90° thoáng mắt.
   - **Mẫu 2: Sequential Pipeline (Chuẩn chuỗi tuần tự):** Dành cho chuỗi xử lý liên hoàn / microservices không rẽ nhánh. 100% mũi tên đi thẳng tuyệt đối từ tâm node này sang tâm node tiếp theo.
5. **Màu sắc cơ bản:** Nền trắng, chữ đen khi render (`--bg '#ffffff' --fg '#000000'`). Chỉ dùng semantic classes nếu cần thiết (`ok`: xanh lá, `err`: đỏ, `sys`: xanh dương). Tuyệt đối không hardcode `style fill:#...`.
6. **Quy tắc mũi tên & Luồng quay lại:**
   - Mọi nhánh ra từ `{Decision}` **bắt buộc** có label (tối đa 20 ký tự, cặp đối lập rõ ràng: `Hợp lệ / Lỗi`, `Pass / Fail`).
   - Khi có quy trình lặp lại/thử lại ở node trước, bắt buộc tạo đường mũi tên nét đứt (`.->`) quay lại node đó (không dùng `<-.-`). Khai báo tất cả mũi tên quay lại này **ở dưới cùng của file** mã nguồn.
7. **Neo vị trí bằng liên kết vô hình (Anchor):** Nếu cần cố định vị trí node bắt đầu hoặc ngăn ELK xáo trộn thứ tự cột khi có backward edge, dùng liên kết vô hình `~~~`. Khai báo ngay dưới thẻ `flowchart LR`.
8. **Sử dụng công cụ hiện đại:** Mặc định, dùng skill `ba-design-flowchart` với engine **`mmdc` (Mermaid chuẩn)** — đây là engine mặc định của skill:
    ```bash
    node plugins/ba-po/skills/ba-design-flowchart/scripts/render.mjs \
      --input flow.mmd --output flow.png --format png \
      --bg '#ffffff' --fg '#000000'
    ```
    - Chạy `npm run doctor` trong `plugins/ba-po/skills/ba-design-flowchart` nếu render bị lùi về engine dự phòng.
    - Khối `mermaid-viz` là quy ước riêng của engine `beautiful` — chỉ dùng khi render bằng engine đó.

---

## 2. Giới Hạn Của Engine Dự Phòng `beautiful`

Engine `beautiful` (`beautiful-mermaid`) chỉ dùng khi cần `--format ascii`, cần đúng một trong 15 theme trang trí, hoặc máy không có Chrome. Nó **không** render đúng flowchart LR có cạnh quay lại. Nếu buộc phải dùng:

- Cạnh quay lại phải viết **đảo chiều khai báo** (`A <-.-|"Thử lại"| E` thay vì `E -.-> A`) — chỉ để cuối file là không đủ, thuật toán phá vòng lặp vẫn đảo nhầm cạnh chính và đẩy node đầu tiên sang phải.
- **Không dùng `subgraph`** — cluster đẩy node ngoài nhóm ra tận mép phải.
- **Không dùng `~~~`** — engine này không hỗ trợ, dòng bị bỏ qua im lặng, không báo lỗi.
