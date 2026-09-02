---
name: webperf-audit
description: Audit hiệu năng web, đánh giá Core Web Vitals và đề xuất tối ưu hóa
---

# Web Performance Audit

Sử dụng persona Web Performance Auditor để đánh giá hiệu năng web, Core Web Vitals (LCP, FID, CLS), và đề xuất các cải tiến về performance.

## Cách sử dụng

```bash
/webperf-audit [url]
```

**Tham số:**
- `url` (optional): URL của trang web cần audit. Mặc định là localhost:3000 hoặc dev server đang chạy.

## Skills được sử dụng

- `webperf-core-vitals` — Đo lường Core Web Vitals
- `webperf-optimization` — Phân tích và đề xuất tối ưu hóa

## Output

Báo cáo hiệu năng chi tiết với:
- Core Web Vitals scores (LCP, FID, CLS)
- Performance metrics (FCP, TTI, TBT, Speed Index)
- Phân tích từng category (Performance, Accessibility, Best Practices, SEO)
- Danh sách vấn đề cần fix (theo mức độ ưu tiên)
- Khuyến nghị cụ thể để cải thiện

## Ví dụ

```bash
# Audit localhost
/webperf-audit

# Audit production site
/webperf-audit https://example.com

# Audit staging
/webperf-audit https://staging.example.com
```