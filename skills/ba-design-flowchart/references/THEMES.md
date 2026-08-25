# Tài liệu tham khảo Theme & Bộ sưu tập Theme

Skill `ba-design-flowchart` cung cấp 15 theme được thiết kế tỉ mỉ, bao gồm cả giao diện sáng và tối. Mỗi theme được xây dựng dựa trên hai màu cốt lõi (màu nền `bg` và màu chữ `fg`), và có thể được tùy chỉnh thêm bằng các màu nhấn.

## 1. Bộ sưu tập Theme Trực quan (Theme Gallery)

Sử dụng bộ sưu tập này để so sánh các theme trên cùng một sơ đồ. Sơ đồ gốc nằm tại `assets/theme_gallery/source.mmd`.

### Theme Sáng (Light themes)

| `zinc-light`                                                | `tokyo-night-light`                                                       |
|-------------------------------------------------------------|---------------------------------------------------------------------------|
| ![zinc-light theme](../assets/theme_gallery/zinc-light.svg) | ![tokyo-night-light theme](../assets/theme_gallery/tokyo-night-light.svg) |

| `catppuccin-latte`                                                      | `nord-light`                                                |
|-------------------------------------------------------------------------|-------------------------------------------------------------|
| ![catppuccin-latte theme](../assets/theme_gallery/catppuccin-latte.svg) | ![nord-light theme](../assets/theme_gallery/nord-light.svg) |

| `github-light`                                                  | `solarized-light`                                                     |
|-----------------------------------------------------------------|-----------------------------------------------------------------------|
| ![github-light theme](../assets/theme_gallery/github-light.svg) | ![solarized-light theme](../assets/theme_gallery/solarized-light.svg) |

### Theme Tối (Dark themes)

| `zinc-dark`                                               | `tokyo-night`                                                 |
|-----------------------------------------------------------|---------------------------------------------------------------|
| ![zinc-dark theme](../assets/theme_gallery/zinc-dark.svg) | ![tokyo-night theme](../assets/theme_gallery/tokyo-night.svg) |

| `tokyo-night-storm`                                                       | `catppuccin-mocha`                                                      |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------|
| ![tokyo-night-storm theme](../assets/theme_gallery/tokyo-night-storm.svg) | ![catppuccin-mocha theme](../assets/theme_gallery/catppuccin-mocha.svg) |

| `nord`                                          | `dracula`                                             |
|-------------------------------------------------|-------------------------------------------------------|
| ![nord theme](../assets/theme_gallery/nord.svg) | ![dracula theme](../assets/theme_gallery/dracula.svg) |

| `github-dark`                                                 | `solarized-dark`                                                    |
|---------------------------------------------------------------|---------------------------------------------------------------------|
| ![github-dark theme](../assets/theme_gallery/github-dark.svg) | ![solarized-dark theme](../assets/theme_gallery/solarized-dark.svg) |

| `one-dark`                                              |  |
|---------------------------------------------------------|--|
| ![one-dark theme](../assets/theme_gallery/one-dark.svg) |  |

---

## 2. Hướng dẫn chọn Theme nhanh

### Theme Sáng
| Theme               | Nền     | Chữ     | Phù hợp cho            |
|---------------------|---------|---------|------------------------|
| `zinc-light`        | #FFFFFF | Tự động | Theme sáng đa dụng     |
| `tokyo-night-light` | #d5d6db | #34548a | Theme sáng dịu mắt     |
| `catppuccin-latte`  | #eff1f5 | #8839ef | Theme sáng tươi mát    |
| `nord-light`        | #eceff4 | #5e81ac | Phong cách Bắc Âu sáng |
| `github-light`      | #ffffff | #0969da | GitHub sáng            |
| `solarized-light`   | #fdf6e3 | #268bd2 | Solarized sáng         |

### Theme Tối
| Theme               | Nền     | Chữ     | Phù hợp cho                       |
|---------------------|---------|---------|-----------------------------------|
| `zinc-dark`         | #18181B | Tự động | Theme tối đa dụng                 |
| `tokyo-night`       | #1a1b26 | #a9b1d6 | Phong cách hiện đại (Khuyên dùng) |
| `tokyo-night-storm` | #24283b | #a9b1d6 | Biến thể sâu hơn của Tokyo Night  |
| `catppuccin-mocha`  | #1e1e2e | #cba6f7 | Theme tối ấm áp                   |
| `nord`              | #2e3440 | Tự động | Phong cách Bắc Âu tối             |
| `dracula`           | #282a36 | #f8f8f2 | Theme tối cổ điển (Khuyên dùng)   |
| `github-dark`       | #0d1117 | #4493f8 | GitHub tối                        |
| `solarized-dark`    | #002b36 | #268bd2 | Solarized tối                     |
| `one-dark`          | #282c34 | Tự động | Atom One Dark                     |

---

## 3. Tùy chỉnh màu sắc (Custom Colors)

Bạn có thể sử dụng một theme tích hợp làm điểm khởi đầu hoặc cung cấp mã màu tùy chỉnh hoàn toàn:

### Chế độ cơ bản (Mono Mode)
Chỉ cần 2 màu cốt lõi:
```bash
node scripts/render.mjs \
  --input diagram.mmd \
  --output output.svg \
  --bg '#0f0f0f' \
  --fg '#e0e0e0'
```
Hệ thống sẽ tự động tính toán các màu còn lại.

### Chế độ nâng cao (Enriched Mode)
Cung cấp các màu nhấn chi tiết hơn:
```bash
node scripts/render.mjs \
  --input diagram.mmd \
  --output output.svg \
  --bg '#0f0f0f' \
  --fg '#e0e0e0' \
  --accent '#ff6b6b' \
  --muted '#666666' \
  --line '#4a90e2' \
  --surface '#1a1a1a' \
  --border '#2a2a2a'
```

### Ý nghĩa các thông số màu:
| Tham số     | Ý nghĩa                  | Ví dụ     |
|-------------|--------------------------|-----------|
| `--bg`      | Màu nền (Bắt buộc)       | `#1a1a1a` |
| `--fg`      | Màu chữ chính (Bắt buộc) | `#e0e0e0` |
| `--accent`  | Đầu mũi tên và màu nhấn  | `#7aa2f7` |
| `--muted`   | Chữ phụ và nhãn          | `#666666` |
| `--line`    | Đường nối / Viền mũi tên | `#3d59a1` |
| `--surface` | Nền của các node/box     | `#292e42` |
| `--border`  | Viền của các node/box    | `#3d59a1` |
