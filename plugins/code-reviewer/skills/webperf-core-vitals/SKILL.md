---
name: webperf-core-vitals
description: Đo lường và phân tích Core Web Vitals (LCP, FID, CLS) cùng các metrics hiệu năng khác.
trigger: Sử dụng khi cần đánh giá performance của web app trước khi deploy hoặc sau khi có thay đổi lớn về UI/UX.
---

# Kỹ năng: Web Performance - Core Web Vitals

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 1 (READ-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** URL hoặc ứng dụng web chạy được. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Số đo LCP/CLS/FID là output thật của công cụ đo (Lighthouse...); không đo được thì không đưa số.

## ⚠️ RANH GIỚI NHIỆM VỤ (Strict Boundary - Tier 1 Read-Only)

| ✅ webperf-core-vitals LÀM | ❌ webperf-core-vitals KHÔNG LÀM |
|---|---|
| Đo lường LCP, FID/INP, CLS qua Lighthouse/DevTools | Tự ý sửa đổi mã nguồn frontend hay HTML/CSS |
| Phân tích bottleneck mạng, bundle size, render-blocking | Cài đặt thêm npm package hay đổi cấu hình build |
| Đề xuất giải pháp và lập ngân sách hiệu năng (Budget) | Tự ý nén ảnh hay can thiệp static assets |
| Xuất báo cáo tại `workspace/.../trace/webperf-report.md` | Gọi tool write/edit ngoài thư mục workspace |

## 1. Tổng quan & Khi nào sử dụng

Đo lường, phân tích và tối ưu hóa hiệu năng web dựa trên Core Web Vitals và các metrics quan trọng khác từ góc nhìn trải nghiệm người dùng thực tế.

- **Khi sử dụng:** Trước khi deploy lên production; sau khi thêm tính năng UI-heavy; khi có phản ánh trang chậm; audit định kỳ.
- **Khi KHÔNG sử dụng:**
  - Đánh giá hiệu năng backend API, DB query, latency microservices → Dùng backend profiling.
  - Phân tích đối chiếu dữ liệu tài chính/chứng khoán → Dùng `db-timescale-reconciler`.
  - Quét bảo mật mã nguồn → Dùng `security-code-audit`.

## 2. Quy Trình Thực Hiện & Chỉ Số Trọng Tâm

### Các Chỉ Số Core Web Vitals Cốt Lõi
1. **LCP (Largest Contentful Paint) < 2.5s:** Thời gian render nội dung chính lớn nhất (Hero image, heading lớn). Tối ưu: nén WebP/AVIF, CDN, preload critical CSS/JS, bỏ render-blocking.
2. **FID/INP (Interaction to Next Paint) < 100ms:** Độ trễ phản hồi tương tác đầu tiên. Tối ưu: code splitting, web workers, defer non-critical JS.
3. **CLS (Cumulative Layout Shift) < 0.1:** Điểm giật layout bất ngờ. Tối ưu: khai báo width/height rõ ràng trên ảnh, giữ chỗ placeholder cho dynamic ads/embeds.
4. **Metrics bổ trợ:** FCP < 1.8s, TTI < 3.8s, TBT < 200ms.

### 4 Bước Thực Thi
1. **Measurement:** Chạy Lighthouse CLI (`npx lighthouse <URL> --output=json`) hoặc DevTools audit dưới điều kiện mạng giả lập (Throttling).
2. **Analysis:** Phân tích 4 trục: Performance, Accessibility, Best Practices, SEO.
3. **Prioritization:** Phân cấp ưu tiên: 🔴 Critical (Fail CWV) → 🟠 High (<50) → 🟡 Medium (50-89) → 🟢 Low (90-100).
4. **Report & Action Items:** Lập báo cáo kèm Performance Budget.

## 3. Tài Nguyên Mở Rộng (Level 3 - Progressive Disclosure)
- 📖 [webperf-report-template.md](references/webperf-report-template.md): Mẫu báo cáo hoàn chỉnh chuẩn Markdown và các luận điểm phản bác ngụy biện hiệu năng.

## 4. Quy Tắc Output File (Output File Rules)

> 📌 **Output duy nhất:** Ghi báo cáo vào `workspace/issues/{issueKey}/trace/webperf-report.md` (nếu có `{issueKey}`), hoặc `workspace/adhoc/webperf/trace/webperf-report.md` (nếu kiểm toàn project). Gọi lại skill → **ghi đè** file cũ, không tạo file mới.
> ⚠️ **TUYỆT ĐỐI CẤM tạo thư mục `reports/` tại gốc dự án.**

| Trường hợp | Đường dẫn chuẩn | Hành vi khi gọi lại |
|---|---|---|
| Audit theo issueKey | `workspace/issues/{issueKey}/trace/webperf-report.md` | **Ghi đè** hoàn toàn |
| Audit toàn project | `workspace/adhoc/webperf/trace/webperf-report.md` | **Ghi đè** hoàn toàn |

## 5. Dấu Hiệu Cảnh Báo & Xác Minh (Verification)

**Cờ đỏ cần chặn:** Images > 500KB; JS bundle > 1MB; thiếu lazy loading; sync third-party scripts; ảnh thiếu explicit width/height.

### Checklist Xác Nhận
- [ ] Chạy lại Lighthouse audit trên throttled network (Fast 3G/4G)
- [ ] Kiểm tra Core Web Vitals đạt ngưỡng chuẩn (LCP < 2.5s, CLS < 0.1, FID < 100ms)
- [ ] Báo cáo ghi đúng đường dẫn quy chuẩn `workspace/...`
