# Tài liệu tham khảo API beautiful-mermaid 1.1

Sử dụng tài liệu tham khảo này khi cần mở rộng các script CLI tích hợp hoặc gọi trực tiếp API `beautiful-mermaid`. Skill này hiện tại đang sử dụng phiên bản `beautiful-mermaid@^1.1.3`.

## Rendering API

```js
import {
  renderMermaidSVG,
  renderMermaidSVGAsync,
  renderMermaidASCII,
  THEMES,
} from 'beautiful-mermaid';
```

- `renderMermaidSVG(text, options?)` trả về chuỗi SVG một cách đồng bộ (synchronous).
- `renderMermaidSVGAsync(text, options?)` trả về SVG dưới dạng promise.
- `renderMermaidASCII(text, options?)` trả về Unicode hoặc ASCII thuần cho terminal.
- `THEMES` chứa 15 theme màu tích hợp sẵn.
- `parseMermaid(text)` phân tích mã nguồn thành một đồ thị để tự xử lý.
- `fromShikiTheme(theme)` chuyển đổi một theme Shiki thành các màu cho sơ đồ.

Các alias cũ như `renderMermaid` và `renderMermaidAscii` vẫn tồn tại trong bản 1.1.3, nhưng code mới nên sử dụng các tên chuẩn hóa ở trên.

## Các tùy chọn SVG (SVG Options)

| Tùy chọn                                       | Mặc định       | Mục đích                                      |
|------------------------------------------------|----------------|-----------------------------------------------|
| `bg`, `fg`                                     | màu zinc light | Màu nền và màu chữ cơ bản                     |
| `line`, `accent`, `muted`, `surface`, `border` | tự động tính   | Các màu mở rộng tùy chọn cho theme            |
| `font`                                         | `Inter`        | Font chữ                                      |
| `transparent`                                  | `false`        | Làm trong suốt nền SVG                        |
| `padding`                                      | `40`           | Padding của canvas (pixel)                    |
| `nodeSpacing`                                  | `24`           | Khoảng cách ngang giữa các node ngang hàng    |
| `layerSpacing`                                 | `40`           | Khoảng cách dọc giữa các lớp (layer)          |
| `componentSpacing`                             | `24`           | Khoảng cách giữa các component không kết nối  |
| `interactive`                                  | `false`        | Bật tooltip hover cho cột/điểm trong XY chart |

## Các tùy chọn ASCII (ASCII Options)

| Tùy chọn           | Mặc định   | Mục đích                                                      |
|--------------------|------------|---------------------------------------------------------------|
| `useAscii`         | `false`    | Dùng ASCII thuần thay vì ký tự vẽ hộp Unicode                 |
| `paddingX`         | `5`        | Khoảng cách ngang của node                                    |
| `paddingY`         | `5`        | Khoảng cách dọc của node                                      |
| `boxBorderPadding` | `1`        | Padding bên trong hộp                                         |
| `colorMode`        | `auto`     | `none`, `auto`, `ansi16`, `ansi256`, `truecolor`, hoặc `html` |
| `theme`            | none       | Ghi đè một phần màu ASCII                                     |

## Các loại đầu vào hỗ trợ (Supported Inputs)

Công cụ render tự động nhận diện flowcharts (sơ đồ quy trình), sequence diagrams (sơ đồ tuần tự), state diagrams (sơ đồ trạng thái), class diagrams (sơ đồ lớp), ER diagrams (sơ đồ thực thể kết hợp), và `xychart-beta`. Phiên bản 1.1 cũng hỗ trợ `linkStyle`, tên trạng thái CJK (tiếng Trung/Nhật/Hàn), nhãn nhiều dòng, component không kết nối, và ghi đè hướng cho từng subgraph riêng biệt.

Để biết chính xác hành vi gốc, hãy tham khảo [README của beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid#readme) và [các bản phát hành v1.x](https://github.com/lukilabs/beautiful-mermaid/releases).

## API của `scripts/mmdc-engine.mjs` (engine mmdc)

Module này bọc `@mermaid-js/mermaid-cli`. Dùng khi mở rộng script CLI để hỗ trợ engine Mermaid chuẩn.

```js
import {
  resolveChrome,
  selectEngine,
  renderWithMmdc,
  resolveMermaidTheme,
  warnIgnoredFlags,
  mmdcBinary,
  CHROME_HELP,
  skillRoot,
} from './mmdc-engine.mjs';
```

- `resolveChrome()` — trả về `{path, source}` của Chrome đầu tiên tìm thấy, hoặc `null`.
  Thứ tự dò: `PUPPETEER_EXECUTABLE_PATH` → cache puppeteer → Chrome hệ thống → cache Playwright.
- `selectEngine({requested, format, explicit})` — trả về `{engine, chrome}`. Không bao giờ ném lỗi:
  thiếu Chrome hoặc thiếu `mmdc` thì trả về `{engine: 'beautiful', chrome: null}` kèm cảnh báo ra
  stderr. Định dạng `ascii` luôn trả về engine `beautiful`.
- `renderWithMmdc({input, output, format, width, bg, fg, transparent, theme, font, chrome})` —
  spawn `mmdc` với file config tạm (nền trắng chữ đen theo Rule 7). Ném `Error` nếu `mmdc` thất bại.
- `resolveMermaidTheme(name)` — ánh xạ tên theme của `beautiful` sang theme Mermaid, trả về
  `{theme, dark}`. Tên không hợp lệ (kể cả `__proto__`, `constructor`) trả về `base` kèm cảnh báo.
- `warnIgnoredFlags(opts, defaults)` — cảnh báo các cờ chỉ engine `beautiful` mới hiểu.
- `mmdcBinary()` — đường dẫn tới binary `mmdc` cục bộ, hoặc `null` nếu chưa cài.
- `CHROME_HELP` — chuỗi hướng dẫn khắc phục khi thiếu Chrome.
