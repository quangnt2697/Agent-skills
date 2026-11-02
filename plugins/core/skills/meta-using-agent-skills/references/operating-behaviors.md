# Chi Tiết 7 Hành Vi Vận Hành Cốt Lõi & Vòng Đời SDLC

Tài liệu tham chiếu chi tiết cho kỹ năng `meta-using-agent-skills`.

## 1. Phơi bày các Giả định (Surface Assumptions)
Trước khi triển khai bất kỳ thứ gì không đơn giản, hãy tuyên bố rõ ràng các giả định:
```text
CÁC GIẢ ĐỊNH TÔI ĐANG ĐƯA RA:
1. [giả định về yêu cầu nghiệp vụ]
2. [giả định về kiến trúc hệ thống]
3. [giả định về phạm vi công việc]
→ Hãy sửa tôi ngay bây giờ nếu không tôi sẽ tiếp tục với những điều này.
```
Đừng âm thầm lấp đầy những yêu cầu mơ hồ. Phơi bày sự không chắc chắn từ sớm rẻ hơn rất nhiều so với phải làm lại (rework).

## 2. Tích cực Quản lý Sự bối rối (Manage Confusion Actively)
Khi gặp sự thiếu nhất quán, yêu cầu mâu thuẫn, hoặc đặc tả không rõ ràng:
1. **DỪNG LẠI.** Không tiếp tục bằng việc phỏng đoán.
2. Gọi tên chính xác sự nhầm lẫn đó ("Tôi thấy X trong spec nhưng Y trong code hiện tại. Cái nào được ưu tiên?").
3. Trình bày sự đánh đổi (tradeoff) hoặc đặt câu hỏi làm rõ và đợi phản hồi.

## 3. Đẩy lùi khi có lý do chính đáng (Push Back When Warranted)
Khi một cách tiếp cận có vấn đề rõ ràng:
- Chỉ ra vấn đề trực tiếp và lượng hóa rủi ro cụ thể ("tăng độ trễ thêm ~200ms").
- Đề xuất giải pháp thay thế.
- Chấp nhận quyết định của người dùng nếu họ vẫn giữ ý định sau khi đã được thông tin đầy đủ.

## 4. Bắt buộc sự Đơn giản (Enforce Simplicity)
Trước khi hoàn thành triển khai, tự kiểm tra:
- Cái này có thể viết bằng ít dòng code hơn không?
- Các lớp trừu tượng (abstractions) có đáng với sự phức tạp mang lại không?
- Ưu tiên những giải pháp hiển nhiên, dễ đọc và dễ bảo trì.

## 5. Duy trì Kỷ luật về Phạm vi (Maintain Scope Discipline)
Chỉ chạm vào những gì được yêu cầu. TUYỆT ĐỐI KHÔNG:
- Xóa các comments mà bạn không hiểu.
- Dọn dẹp hoặc refactor các đoạn code không liên quan đến task hiện tại.
- Thêm tính năng không có trong spec chỉ vì "có vẻ hữu ích".

## 6. Xác minh, đừng Giả định (Verify, Don't Assume)
Một task chưa hoàn thành cho đến khi có bằng chứng thực tế (test pass, exit code 0, dữ liệu runtime). Tuân thủ Định nghĩa Hoàn thành (Definition of Done) toàn dự án.

## 7. Tôn trọng Ràng buộc Nền tảng & Domain
- **Domain (Fintech/Chứng khoán):** Đảm bảo tuân thủ Bảo mật (Auth/Quyền), Độ chính xác tài chính (`Decimal`, không dùng float), và giao dịch ACID.
- **Nền tảng (OpenAPI):** Thiết kế API-first, thống nhất API Contract trước khi lập trình UI.

## 8. Trình tự Vòng đời Đầy đủ (Full Lifecycle Sequence)
```text
── BA/PO ──────────────────────────────────────────────────────────────
1.  ba-spec                          → Import Jira/Confluence → final.md
2.  ba-interview-me                  → Phỏng vấn gap → đạt confidence ≥90%
3.  ba-refine         (Tùy chọn)     → Brainstorm/refine ý tưởng thô
4.  ba-design-mockup  (Tùy chọn)     → Dựng Prod-Twin UI Mockup

── QA ─────────────────────────────────────────────────────────────────
5.  qa-code2spec      (Tùy chọn)     → Đọc code có sẵn → spec
6.  qa-test-design                   → Checklist + BDD Gherkin
7.  qa-squash-push    (Tùy chọn)     → Đồng bộ .feature lên Squash TM
8.  qa-auto-design                   → Sinh automation test code
9.  qa-run-test                      → Thực thi + báo cáo

── Review & Audit ─────────────────────────────────────────────────────
10. cr-code-simplification (Tùy chọn) → Làm sạch code test
11. cr-review-code-and-quality        → Code Review trước merge
12. security-code-audit               → Quét bảo mật OWASP
13. webperf-core-vitals               → Kiểm toán Core Web Vitals
14. meta-context      (Bất cứ lúc nào) → Reset/nạp lại ngữ cảnh
```

