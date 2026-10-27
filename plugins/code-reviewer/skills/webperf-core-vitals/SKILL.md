---
name: webperf-core-vitals
description: Đo lường và phân tích Core Web Vitals (LCP, FID, CLS) cùng các metrics hiệu năng khác.
trigger: Sử dụng khi cần đánh giá performance của web app trước khi deploy hoặc sau khi có thay đổi lớn về UI/UX.
---

# Kỹ năng: Web Performance - Core Web Vitals

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** URL hoặc ứng dụng web chạy được. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Số đo LCP/CLS/FID là output thật của công cụ đo (Lighthouse...); không đo được thì không đưa số.

## Tổng quan

Đo lường, phân tích và tối ưu hóa hiệu năng web dựa trên Core Web Vitals và các metrics quan trọng khác. Skill này sử dụng Lighthouse, WebPageTest, và các công cụ khác để đánh giá performance từ góc nhìn user experience.

## Khi nào sử dụng

- Trước khi deploy lên production
- Sau khi thêm tính năng mới (đặc biệt là UI-heavy features)
- Khi nhận được complaint từ users về trang web chậm
- Định kỳ hàng tuần để monitor performance trends
- Sau khi upgrade dependencies (React, Vue, Angular, v.v.)

**Khi KHÔNG sử dụng:**
- Đánh giá hiệu năng backend API, database query, hoặc latency microservices → Dùng công cụ profiling backend chuyên dụng.
- Phân tích đối chiếu tính đúng đắn dữ liệu tài chính/chứng khoán → Dùng `db-timescale-reconciler`.
- Kiểm tra bảo mật hoặc rà soát lỗ hổng tĩnh → Dùng `security-code-audit`.

## Core Web Vitals

### 1. Largest Contentful Paint (LCP)
**Mục tiêu:** < 2.5s

**Đo lường:** Thời gian từ khi user bắt đầu load trang đến khi content lớn nhất được render.

**Nguyên nhân chậm:**
- Large images không được optimize
- Render-blocking resources (CSS, JS)
- Slow server response time
- Client-side rendering chậm

**Cách fix:**
- Optimize images (WebP, lazy loading, responsive images)
- Preload critical resources (`<link rel="preload">`)
- Use CDN
- Implement server-side rendering (SSR) hoặc static site generation (SSG)
- Remove unused CSS/JS

### 2. First Input Delay (FID)
**Mục tiêu:** < 100ms

**Đo lường:** Thời gian từ khi user tương tác lần đầu (click, tap) đến khi browser có thể respond.

**Nguyên nhân chậm:**
- Long tasks blocking main thread
- Heavy JavaScript execution
- Third-party scripts

**Cách fix:**
- Code splitting (lazy load components)
- Use web workers cho heavy computations
- Defer non-critical JavaScript
- Optimize third-party scripts

### 3. Cumulative Layout Shift (CLS)
**Mục tiêu:** < 0.1

**Đo lường:** Tổng các unexpected layout shifts trong quá trình page load.

**Nguyên nhân:**
- Images không có width/height attributes
- Ads, embeds, iframes chèn vào mà không reserve space
- Web fonts gây FOIT/FOUT (Flash of Invisible/Unstyled Text)
- Dynamic content injection

**Cách fix:**
- Set explicit dimensions cho images và videos
- Reserve space cho dynamic content
- Use `font-display: swap` với web fonts
- Avoid inserting content above existing content

## Các Metrics Khác

### First Contentful Paint (FCP)
**Mục tiêu:** < 1.8s
- Thời gian đến khi content đầu tiên được render

### Time to Interactive (TTI)
**Mục tiêu:** < 3.8s
- Thời gian đến khi page fully interactive

### Total Blocking Time (TBT)
**Mục tiêu:** < 200ms
- Tổng thời gian main thread bị blocked

### Speed Index
**Mục tiêu:** < 3.4s
- Tốc độ content được hiển thị trong quá trình page load

## Quy trình

### 1. Measurement
```bash
# Run Lighthouse
npx lighthouse https://example.com --output=html --output-path=./report.html

# Hoặc dùng Chrome DevTools
# F12 → Lighthouse tab → Analyze page load
```

### 2. Analysis
Phân tích từng category:
- **Performance** (Core Web Vitals + other metrics)
- **Accessibility** (WCAG compliance)
- **Best Practices** (HTTPS, console errors, v.v.)
- **SEO** (meta tags, structured data)

### 3. Prioritization
Ưu tiên fixes theo impact:
1. 🔴 Critical: Core Web Vitals failing (red zone)
2. 🟠 High: Performance score < 50
3. 🟡 Medium: Performance score 50-89
4. 🟢 Low: Performance score 90-100 (minor optimizations)

### 4. Report & Recommendations

## Output Format

> 📌 **Output duy nhất:** Ghi báo cáo vào `workspace/issues/{issueKey}/trace/webperf-report.md` (nếu có `{issueKey}`), hoặc `workspace/adhoc/webperf/trace/webperf-report.md` (nếu kiểm toàn project). Gọi lại skill → **ghi đè** file cũ, không tạo file mới.
> ⚠️ **TUYỆT ĐỐI CẤM tạo thư mục `reports/` tại gốc dự án.**

## ⚡ Quy Tắc Output File (Output File Rules)

| Trường hợp | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Audit theo issueKey | `workspace/issues/{issueKey}/trace/webperf-report.md` | **Ghi đè** hoàn toàn |
| Audit toàn project | `workspace/adhoc/webperf/trace/webperf-report.md` | **Ghi đè** hoàn toàn |

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
- Convert sang WebP (giảm 70% kích thước)
- Add `loading="lazy"` nếu below-the-fold
- Use responsive images với `srcset`
\`\`\`html
<picture>
  <source srcset="hero-800.webp" media="(max-width: 800px)">
  <source srcset="hero-1200.webp" media="(max-width: 1200px)">
  <img src="hero-1600.webp" alt="Hero" width="1600" height="900">
</picture>
\`\`\`

### 2. High CLS (0.25)
**Cause:** Images không có dimensions, ads shift content
**Impact:** Users click nhầm vì layout bị shift
**Fix:**
- Add width/height cho tất cả images
- Reserve space cho ads
\`\`\`html
<img src="product.jpg" width="400" height="300" alt="Product">
<div class="ad-placeholder" style="min-height: 250px;"><!-- Ad loads here --></div>
\`\`\`

---

## 🟠 High Priority

### 3. Render-blocking Resources
**Files:** 
- `main.css` (450KB)
- `bundle.js` (1.2MB)

**Impact:** Block rendering for 1.8s
**Fix:**
- Inline critical CSS
- Defer non-critical CSS
- Code split JavaScript

---

## 🎯 Performance Budget

| Resource   | Current   | Budget   | Status        |
|------------|-----------|----------|---------------|
| JavaScript | 1.5MB     | 500KB    | 🔴 Over       |
| CSS        | 600KB     | 150KB    | 🔴 Over       |
| Images     | 3.2MB     | 1MB      | 🔴 Over       |
| Fonts      | 200KB     | 100KB    | 🟠 Near limit |

---

## ✅ What's Done Well

- Fast server response time (180ms)
- No console errors
- HTTPS enabled
- Proper cache headers

---

## 📋 Action Items

- [ ] Optimize hero image (convert to WebP, resize)
- [ ] Add dimensions to all images
- [ ] Implement code splitting
- [ ] Inline critical CSS
- [ ] Remove unused JavaScript (estimated 400KB)
- [ ] Add resource hints (`preload`, `prefetch`)
- [ ] Set up performance monitoring (RUM)

**Estimated improvement:** Performance score 62 → 85+
```

## Các biện hộ thường gặp

> "Performance tốt trên máy dev"

**Phản bác:** Dev machines thường có CPU mạnh và internet nhanh. Real users có devices yếu hơn và network chậm hơn nhiều. Test trên throttled conditions.

> "Users không complain"

**Phản bác:** Users không complain không có nghĩa là không có vấn đề. 53% users abandon sites loading > 3s (Google research). Slow sites = lost revenue.

> "SEO không quan trọng với internal tools"

**Phản bác:** Core Web Vitals ảnh hưởng đến user experience, không chỉ SEO. Employees cũng deserve fast, responsive tools.

## Dấu hiệu cảnh báo

- Images > 500KB
- JavaScript bundles > 1MB
- No lazy loading cho below-the-fold content
- Synchronous third-party scripts
- Images không có dimensions
- FOUT/FOIT với web fonts

## Xác minh

Sau khi apply fixes:
- [ ] Re-run Lighthouse audit
- [ ] Test trên slow 3G network
- [ ] Test trên low-end mobile device
- [ ] Verify Core Web Vitals đã improved
- [ ] Check performance budget compliance

---
