---
name: dev-performance
description: Tối ưu hóa hiệu năng ứng dụng toàn diện (Frontend, Backend, Database Queries), chuẩn hóa Core Web Vitals và triệt tiêu N+1 queries.
trigger: Khi có yêu cầu tối ưu tốc độ tải trang, cải thiện Core Web Vitals (LCP, INP, CLS), phát hiện N+1 queries hoặc API bị nghẽn (bottleneck).
---

# Tối Ưu Hóa Hiệu Năng (Performance Optimization)

## 1. Khi nào dùng?
- Trang web hoặc API phản hồi chậm, vi phạm ngưỡng thời gian phản hồi (Latency SLA).
- Điểm Core Web Vitals (LCP, INP, CLS) không đạt yêu cầu Google.
- Cơ sở dữ liệu bị quá tải do query N+1, thiếu index hoặc quét toàn bộ bảng (Full table scan).
- Kích thước Bundle Frontend quá lớn làm tăng thời gian tải ban đầu.

## 2. Quy trình Tối ưu hóa 4 Bước
- **Bước 1 (Đo lường trước - Baseline Measurement):** Thu thập số liệu thực tế trước khi sửa. Dùng Chrome DevTools MCP (Performance trace), Lighthouse CI hoặc APM timings. Tuyệt đối không tối ưu mù quáng dựa trên phỏng đoán.
- **Bước 2 (Xác định Điểm nghẽn - Profile Bottleneck):** Phân tích xem điểm nghẽn nằm ở Frontend (render, re-render, asset nặng), Mạng (waterfall, TTFB chậm) hay Backend (database query, CPU bound, memory leak).
- **Bước 3 (Khắc phục theo Anti-Patterns chuẩn):** Áp dụng giải pháp chuyên biệt: gom query (Batching/Eager loading chống N+1), đánh index, phân trang (Pagination), cache Redis, memoize React components hoặc nén hình ảnh (WebP/AVIF).
- **Bước 4 (Xác minh & Đánh giá lại - Verify & Compare):** Đo lường lại sau khi sửa. Nếu hiệu năng không cải thiện rõ rệt hoặc làm tăng độ phức tạp mã nguồn không đáng kể ➔ Hoàn tác (Revert).

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu kỹ thuật & Checklist (references/):**
  - [anti_patterns_and_optimizations.md](references/anti_patterns_and_optimizations.md): Hướng dẫn chi tiết cách sửa N+1 queries, phân trang dữ liệu lớn, tối ưu hóa ảnh, re-renders trong React, và thiết lập Performance Budget.
  - [performance-checklist.md](references/performance-checklist.md): Bảng kiểm tra toàn diện cho Frontend (CWV), Backend, Database và Network.

## 4. Ví dụ mẫu (Few-shot Example)
- **Vấn đề:** API lấy danh sách lệnh kèm thông tin tài khoản bị N+1 query: `1 query orders + 100 queries accounts`.
- **Giải pháp:**
  ```python
  # Trước: N+1 queries
  orders = db.query(Order).limit(100).all()
  for o in orders:
      account = db.query(Account).filter_by(id=o.account_id).first()

  # Sau: Eager loading / Join chỉ với 1 query duy nhất
  orders = db.query(Order).options(joinedload(Order.account)).limit(100).all()
  ```
