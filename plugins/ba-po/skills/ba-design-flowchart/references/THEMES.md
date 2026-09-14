# Bộ Sưu Tập Theme Cho Engine Beautiful-Mermaid

Engine `beautiful` hỗ trợ 15 bộ theme màu sắc hiện đại cho sơ đồ Mermaid kết xuất ra SVG/PNG và terminal ASCII art:

| STT | Tên Theme | Phong cách | Phù hợp cho |
|:---:|---|---|---|
| 1 | `zinc-light` | Trắng xám tối giản | Tài liệu kỹ thuật nền sáng |
| 2 | `zinc-dark` | Xám đen hiện đại | Terminal / Dark mode |
| 3 | `tokyo-night` | Xanh tím neon Tokyo | Dark mode IDE |
| 4 | `tokyo-night-storm` | Xanh thẫm bão đêm | Dark mode phong cách Cyberpunk |
| 5 | `tokyo-night-light` | Nền sáng Tokyo | Báo cáo, thuyết trình |
| 6 | `catppuccin-mocha` | Tông màu Mocha dịu mắt | Dark mode phổ biến |
| 7 | `catppuccin-latte` | Tông màu Latte thanh lịch | Tài liệu Spec sáng màu |
| 8 | `nord` | Băng tuyết Bắc Âu | Dark mode lạnh |
| 9 | `nord-light` | Băng tuyết Bắc Âu sáng | Bản in, PDF |
| 10 | `dracula` | Tím - Hồng kinh điển | Dark mode coder |
| 11 | `github-light` | Trắng - Xám GitHub | README GitHub chế độ sáng |
| 12 | `github-dark` | Đen - Xanh GitHub | README GitHub chế độ tối |
| 13 | `solarized-light` | Vàng nhạt Solarized | Đọc lâu không mỏi mắt |
| 14 | `solarized-dark` | Xanh rêu đậm Solarized | Terminal Unix |
| 15 | `one-dark` | Atom / VS Code kinh điển | Mã nguồn và tài liệu lập trình |

## Cách Sử Dụng

```bash
node plugins/ba-po/skills/ba-design-flowchart/scripts/render.mjs \
  --input diagram.mmd \
  --theme <tên-theme> \
  --output output.svg
```
