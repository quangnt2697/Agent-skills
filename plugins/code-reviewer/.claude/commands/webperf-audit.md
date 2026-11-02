---
description: "Audit hiệu năng web, đánh giá Core Web Vitals và đề xuất tối ưu hóa"
---

Kích hoạt kỹ năng webperf-core-vitals.

Sử dụng persona Web Performance Auditor để đánh giá hiệu năng web, Core Web Vitals (LCP, FID, CLS), và đề xuất các cải tiến về performance.

Cách sử dụng:
/webperf-audit [url]

Tham số:
- url (optional): URL của trang web cần audit. Mặc định là localhost:3000 hoặc dev server đang chạy.

Quy trình thực hiện:
1. Đo lường các chỉ số Core Web Vitals (LCP, FID, CLS, FCP, TBT).
2. Phân tích điểm số và phát hiện các bottleneck gây suy giảm hiệu năng.
3. Xuất báo cáo hiệu năng chi tiết kèm khuyến nghị tối ưu hóa cụ thể vào `workspace/issues/{issueKey}/trace/webperf-report.md` (hoặc `workspace/adhoc/webperf/trace/webperf-report.md`).

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 1 - READ-ONLY):** Lệnh này CHỈ làm nhiệm vụ đo lường, phân tích hiệu năng và lập báo cáo Web Performance.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM tự ý cài đặt thêm npm packages, sửa build config (Vite/Webpack) hoặc sửa đổi mã nguồn frontend.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi ghi báo cáo hoàn tất, DỪNG LẠI NGAY và bàn giao cho người dùng. CẤM tự ý refactor code.
