---
name: ba-design-flowchart
description: |
  Tạo và render sơ đồ Mermaid cho tài liệu kiến trúc, README, PR,
  terminal, chat, và CI dưới dạng SVG, PNG, hoặc ASCII/Unicode art theo theme. Kích hoạt skill này khi
  người dùng cung cấp mã Mermaid hoặc file .mmd; yêu cầu vẽ flowchart,
  sequence, state, class, ERD, XY chart, hoặc hình ảnh hóa kiến trúc/quy trình/mô hình dữ liệu;
  hoặc muốn làm đẹp, gắn theme, render hàng loạt, hoặc tạo sơ đồ thân thiện với terminal. 
  Chạy cục bộ không cần trình duyệt, với 15 theme tích hợp và hỗ trợ màu tùy chỉnh.
---

# ba-design-flowchart

Tạo hoặc render sơ đồ Mermaid bằng Node.js CLI đi kèm. Sử dụng SVG cho tài liệu có thể mở rộng, PNG để chia sẻ hoặc trên các công cụ chỉ hỗ trợ ảnh raster, và ASCII hoặc Unicode cho terminal và văn bản thuần túy.

## Thư mục làm việc

Coi thư mục chứa file này là `<skill-root>`. Chạy các script đi kèm từ thư mục đó, hoặc gọi chúng với đường dẫn tuyệt đối. Lưu mã nguồn và kết quả render ở vị trí người dùng yêu cầu; không copy công cụ render vào project của người dùng.

## Quy trình làm việc (Workflow)

1. Xác định xem người dùng đã cung cấp mã Mermaid hay cần tạo sơ đồ từ văn bản mô tả.
2. Chọn loại sơ đồ và định dạng đầu ra từ các bảng bên dưới.
3. Chỉ đọc file tài liệu tham khảo khi cần chi tiết về cú pháp, theme, hoặc API.
4. Lưu mã nguồn mới thành file `.mmd`, giữ nguyên các thuật ngữ và mối quan hệ của người dùng.
5. Render với một theme có sẵn hoặc màu sắc chỉ định.
6. Kiểm tra kết quả. Sửa các lỗi cú pháp, bị cắt xén, bố cục chật chội, hoặc nhãn không rõ ràng và render lại.
7. Trả về đường dẫn file mã nguồn và file đầu ra, cùng định dạng và theme đã chọn.

Không ghi đè file mã nguồn hoặc file đầu ra hiện có trừ khi người dùng yêu cầu.

## Chọn loại sơ đồ

| Nhu cầu                               | Loại sơ đồ   | Bắt đầu với       |
|---------------------------------------|--------------|-------------------|
| Quy trình, cây quyết định, kiến trúc  | Flowchart    | `flowchart LR`    |
| Gọi API, tin nhắn, tương tác          | Sequence     | `sequenceDiagram` |
| Vòng đời hoặc máy trạng thái hữu hạn  | State        | `stateDiagram-v2` |
| Class, module, quan hệ                | Class        | `classDiagram`    |
| Thực thể CSDL và bản số               | ER           | `erDiagram`       |
| Biểu đồ cột, đường, xu hướng, so sánh | XY chart     | `xychart-beta`    |

Đọc `references/DIAGRAM_TYPES.md` khi viết mã Mermaid phức tạp.

## Chọn định dạng đầu ra

| Định dạng         | Phù hợp nhất cho                             | Ghi chú                                                        |
|-------------------|----------------------------------------------|----------------------------------------------------------------|
| SVG               | README, docs, slide, website                 | Có thể mở rộng (vector), có theme, hỗ trợ nền trong suốt       |
| PNG               | Chat, preview, công cụ chỉ hỗ trợ ảnh raster | Dùng cờ `--format png`; không cần công cụ chuyển đổi bên ngoài |
| Unicode           | Terminal hiện đại và text preview dễ đọc     | Là đầu ra mặc định của ASCII renderer                          |
| Plain ASCII       | Log và terminal hạn chế                      | Thêm cờ `--use-ascii`                                          |
| ANSI-colored text | Terminal tương tác                           | Dùng cờ `--color-mode`                                         |

## Các lệnh cốt lõi (Core commands)

Chạy các lệnh này từ thư mục `<skill-root>`.

### Xem danh sách theme

```bash
node scripts/themes.mjs
```

### Render SVG

```bash
node scripts/render.mjs \
  --input diagram.mmd \
  --output diagram.svg \
  --theme tokyo-night
```

### Render terminal text

```bash
node scripts/render.mjs \
  --input diagram.mmd \
  --output diagram.txt \
  --format ascii \
  --color-mode none
```

Thêm `--use-ascii` khi các ký tự vẽ hộp Unicode không được hỗ trợ.

### Render PNG

```bash
node scripts/render.mjs \
  --input diagram.mmd \
  --output diagram.png \
  --format png \
  --width 1200 \
  --theme tokyo-night
```

### Render hàng loạt (Batch render)

```bash
node scripts/batch.mjs \
  --input-dir ./diagrams \
  --output-dir ./rendered \
  --format svg \
  --theme github-dark \
  --workers 4
```

Sử dụng batch render cho 3 sơ đồ trở lên hoặc khi cần áp dụng tùy chọn nhất quán cho cả thư mục.

## Lựa chọn Theme

- Tài liệu tối (General dark): `tokyo-night`
- GitHub dark hoặc light: `github-dark`, `github-light`
- In ấn và thuyết trình: `zinc-light`
- Màu tương phản cao: `dracula`
- Tông màu lạnh: `nord`, `nord-light`

Đọc `references/THEMES.md` khi việc lựa chọn giao diện trực quan quan trọng. Một theme có sẵn có thể được tùy chỉnh thêm bằng các cờ màu cụ thể.

## Các tùy chọn hữu ích (Useful options)

### Shared styling

| Tùy chọn                        | Mục đích                                 |
|---------------------------------|------------------------------------------|
| `--theme <name>`                | Áp dụng 1 trong 15 theme có sẵn          |
| `--bg`, `--fg`                  | Chỉnh màu nền và màu chữ chính           |
| `--line`, `--accent`, `--muted` | Chỉnh màu đường nối, màu nhấn và màu phụ |
| `--surface`, `--border`         | Chỉnh màu nền và viền của box            |
| `--font <name>`                 | Chỉnh font chữ SVG                       |

### SVG

| Tùy chọn                  | Mục đích                              |
|---------------------------|---------------------------------------|
| `--transparent`           | Xóa hình nền SVG                      |
| `--padding <n>`           | Đặt lề canvas                         |
| `--node-spacing <n>`      | Đặt khoảng cách ngang giữa các node   |
| `--layer-spacing <n>`     | Đặt khoảng cách dọc giữa các lớp      |
| `--component-spacing <n>` | Tách biệt các component không kết nối |
| `--interactive`           | Bật tooltip khi hover cho XY chart    |

### PNG

| Tùy chọn        | Mục đích                                                |
|-----------------|---------------------------------------------------------|
| `--width <n>`   | Đặt chiều rộng từ 100 đến 10000 pixel, giữ nguyên tỷ lệ |
| `--transparent` | Giữ nền trong suốt                                      |

### Đầu ra Terminal

| Tùy chọn                     | Mục đích                                                      |
|------------------------------|---------------------------------------------------------------|
| `--use-ascii`                | Thay thế ký tự Unicode bằng mã ASCII thuần                    |
| `--padding-x`, `--padding-y` | Chỉnh khoảng cách sơ đồ                                       |
| `--box-border-padding`       | Chỉnh padding bên trong node box                              |
| `--color-mode <mode>`        | `none`, `auto`, `ansi16`, `ansi256`, `truecolor`, hoặc `html` |

Chạy `node scripts/render.mjs --help` hoặc `node scripts/batch.mjs --help` để xem danh sách tùy chọn CLI đầy đủ nhất.

## Hướng dẫn viết mã (Authoring guidance)

- Ưu tiên nhãn (label) ngắn gọn, cụ thể; giữ nguyên các thuật ngữ chuyên ngành từ người dùng.
- Sử dụng nhãn cho các đường nối (edge) khi nhánh (branch) hoặc thông điệp không rõ ràng.
- Giữ cho các sơ đồ lớn dễ đọc bằng cách chia nhỏ các phần không liên quan thay vì thu nhỏ chữ.
- Sử dụng `LR` cho các luồng rộng và `TB` cho tài liệu hẹp.
- Tránh việc chỉ dùng màu sắc để truyền đạt ý nghĩa.
- Dùng theme sáng cho in ấn và kiểm tra độ tương phản với nền.
- Nếu gặp cú pháp lạ, hãy bắt đầu từ `assets/example_diagrams/` và tham khảo tài liệu sơ đồ.

## Kiểm chứng (Validation)

Sau khi render:

1. Đảm bảo lệnh chạy thành công và file đầu ra không rỗng.
2. Đảm bảo file SVG bắt đầu bằng `<svg`; file PNG mở được bình thường; đầu ra text chứa nội dung sơ đồ nhìn thấy được.
3. Kiểm tra trực quan khi bố cục quan trọng, đặc biệt là với nhãn dài, văn bản CJK, component không kết nối, và XY chart.
4. Xác nhận các mũi tên, bản số (cardinality), trạng thái, và nhãn khớp với yêu cầu nguồn.
5. Báo cáo bất kỳ giới hạn nào của công cụ render thay vì âm thầm bỏ qua cú pháp không hỗ trợ.

## Xử lý sự cố (Troubleshooting)

- Thiếu thư viện (Missing dependency): chạy `npm install` trong `<skill-root>`.
- Theme không xác định (Unknown theme): chạy `node scripts/themes.mjs` và sử dụng chính xác tên trong danh sách.
- Lỗi cú pháp (Parse error): xem `references/DIAGRAM_TYPES.md`, tối giản đoạn mã bị lỗi, sau đó khôi phục dần dần.
- SVG quá chật chội (Crowded): tăng `--node-spacing`, `--layer-spacing`, hoặc `--component-spacing`.
- Lỗi màu PNG: dùng mã hex cụ thể; biến CSS chưa giải quyết (unresolved variables) không thể chuyển thành raster.
- Lỗi mã màu escape trên Terminal: dùng `--color-mode none`.

## Hướng dẫn đọc tài liệu tham khảo (Reference routing)

| Tài nguyên                    | Đọc hoặc dùng khi                                                  |
|-------------------------------|--------------------------------------------------------------------|
| `references/DIAGRAM_TYPES.md` | Viết hoặc debug mã Mermaid                                         |
| `references/THEMES.md`        | Chọn theme trực quan, so sánh themes hoặc định nghĩa màu tùy chỉnh |
| `references/api_reference.md` | Mở rộng scripts hoặc gọi API `beautiful-mermaid`                   |
