# Mẫu Báo Cáo Web Performance & Hướng Dẫn Tối Ưu Chi Tiết

Tài liệu tham chiếu chi tiết cho kỹ năng `webperf-core-vitals`.

## 1. Mẫu Báo Cáo Chuẩn (Markdown Report Template)

```markdown
# Web Performance Audit Report

**URL:** https://example.com
**Date:** YYYY-MM-DD
**Device:** Desktop / Mobile
**Network:** 4G / Fast 3G / Slow 3G

---

## 📊 Core Web Vitals

| Metric   | Value  | Status   | Target   |
|----------|--------|----------|----------|
| LCP      | 3.2s   | 🔴 Poor  | < 2.5s   |
| FID      | 85ms   | 🟢 Good  | < 100ms  |
| CLS      | 0.25   | 🔴 Poor  | < 0.1    |

## 📈 Performance Metrics

| Metric      | Value   | Status               |
|-------------|---------|----------------------|
| FCP         | 1.5s    | 🟢 Good              |
| TTI         | 4.2s    | 🟠 Needs Improvement |
| TBT         | 350ms   | 🔴 Poor              |
| Speed Index | 2.8s    | 🟢 Good              |

**Overall Performance Score:** 62/100 (🟠 Needs Improvement)

---

## 🔴 Critical Issues

### 1. Large LCP Element (3.2s)
**Element:** Hero image (`<img class="hero">`)
**Issue:** 2.5MB JPEG image không được optimize
**Impact:** Users phải đợi 3.2s mới thấy content chính
**Fix:**
- Convert sang WebP/AVIF (giảm 70% kích thước)
- Add `loading="lazy"` nếu below-the-fold
- Use responsive images với `srcset`

### 2. High CLS (0.25)
**Cause:** Images không có dimensions, ads shift content
**Impact:** Users click nhầm vì layout bị shift
**Fix:**
- Add width/height cho tất cả images
- Reserve space cho dynamic content/ads

---

## 🎯 Performance Budget

| Resource   | Current   | Budget   | Status        |
|------------|-----------|----------|---------------|
| JavaScript | 1.5MB     | 500KB    | 🔴 Over       |
| CSS        | 600KB     | 150KB    | 🔴 Over       |
| Images     | 3.2MB     | 1MB      | 🔴 Over       |
| Fonts      | 200KB     | 100KB    | 🟠 Near limit |
```

---

## 2. Danh Mục Các Biện Hộ Phổ Biến (Rationalizations) & Phản Biện

| Ngụy biện | Phản biện kỹ thuật |
|---|---|
| "Performance tốt trên máy dev" | Dev machine dùng CPU mạnh & mạng Gigabit. Real users dùng thiết bị tầm trung & mạng di động 4G/3G chập chờn. Bắt buộc test với Network & CPU throttling. |
| "Users không phàn nàn" | Người dùng thường rời bỏ trang thay vì báo lỗi. 53% người dùng bỏ trang nếu tải > 3s. |
| "SEO không quan trọng với internal web" | Core Web Vitals đo lường trải nghiệm thực tế (độ mượt, tốc độ phản hồi) chứ không chỉ phục vụ thuật toán SEO Google. |

