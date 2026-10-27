---
description: Ràng buộc Bắt rễ Dữ liệu, Chống Tự suy diễn và Chống Báo cáo Kết quả Giả cho toàn bộ Agent và Skills
paths:
  - "**"
---

# Hợp Đồng Bắt Rễ Dữ Liệu & Chống Kết Quả Giả (Grounding & Anti-Hallucination Contract)

> **TRẠNG THÁI: BẮT BUỘC ÁP DỤNG 100% (ALWAYS-ON) CHO MỌI SKILL VÀ MỌI TÁC VỤ.**
> Vi phạm bất kỳ điều khoản nào dưới đây được coi là lỗi nghiêm trọng nhất (Fatal Defect) của Agent.

---

## 1. Nguyên Tắc Bắt Rễ Dữ Liệu (Grounding-First)

1. **Nguồn sự thật duy nhất (Single Source of Truth):**
   - Mọi giá trị kiểm thử (`expected value` trong assertions), tên API endpoint, schema database, mã lỗi, biên độ giá, logic khớp lệnh BẮT BUỘC phải trích xuất nguyên văn từ:
     - Jira Acceptance Criteria / Issue Description thật.
     - File đặc tả nghiệp vụ `workspace/issues/{issueKey}/spec/final.md`.
     - Codebase hiện hữu của dự án (truy vết qua SDK map hoặc class/method thực tế).
     - Database UAT / TimescaleDB qua query Metabase hoặc script recon thực tế.
2. **Cấm tự suy diễn (No-Inference Rule):**
   - **TUYỆT ĐỐI NGHIÊM CẤM** tự đoán mò (guess), tự suy diễn (assume), hoặc tự bịa ra logic/con số/payload/mã cổ phiếu khi tài liệu không mô tả.
   - Nếu tài liệu hoặc yêu cầu bị thiếu / mập mờ:
     - Ghi nhận rõ nhãn `<!-- NEEDS-SPEC -->` hoặc `<!-- NEEDS-INPUT -->`.
     - Kích hoạt kỹ năng `ba-interview-me` để chất vấn làm rõ với người dùng, hoặc dừng lại yêu cầu bổ sung thông tin.
     - **CẤM** sửa expected value hoặc logic test để ép từ FAIL thành PASS (green-washing).

---

## 2. Quy Tắc Bằng Chứng Hoàn Thành (Evidence-or-Stop Contract)

1. **Chỉ công bố hoàn thành khi có Bằng Chứng Thực Tế (Real Proof):**
   - **Tạo/Sửa file:** BẮT BUỘC kiểm tra file tồn tại trên đĩa qua tool call (`view_file` hoặc tool tương đương) trước khi báo cho người dùng.
   - **Chạy lệnh/Test/Script:** BẮT BUỘC phải có Output thật và Exit Code thực tế từ hệ thống.
   - **Đồng bộ n8n/Jira/Squash:** BẮT BUỘC phải nhận phản hồi HTTP thật từ API/Webhook.
2. **Xử lý khi công cụ / script gặp sự cố:**
   - Nếu script không tồn tại, thiếu dependency, n8n offline, hoặc lệnh trả về Exit Code khác 0:
     - **NGHIÊM CẤM TỰ GIẢ LẬP KẾT QUẢ.** Tuyệt đối không tự viết báo cáo tổng kết, không tự sinh log giả để đóng vai "đã chạy xong".
     - Báo cáo lỗi nguyên văn theo chuẩn Action-First:
       ```text
       ⛔ SỰ CỐ: [Tên lệnh/công cụ bị lỗi]
       Dòng lỗi: [Trích dẫn nguyên văn lỗi từ console/stderr]
       Nguyên nhân: [Mô tả ngắn gọn, trung thực]
       Cách khắc phục: [Lệnh hoặc thao tác cụ thể < 2 phút để user xử lý]
       ```
     - DỪNG quy trình ngay lập tức để khắc phục, không tự động đi tiếp bước sau bằng dữ liệu ảo.

---

## 3. Cách Ly Ví Dụ Minh Họa (Few-Shot Quarantine)

1. **Mục đích duy nhất của Few-Shot:**
   - Các mục `Ví dụ mẫu (Few-shot Example)` trong các file `SKILL.md` CHỈ dùng để định hình cấu trúc ngữ pháp (formatting template) cho đầu ra.
2. **Cấm sao chép dữ liệu mẫu:**
   - **TUYỆT ĐỐI CẤM** sao chép các con số, tên mã, tên người, commit hash, story point từ ví dụ mẫu vào kết quả thực tế (ví dụ: `Sprint 34`, `STK-101`, `DEV 2: 16 SP`, Commit `a8f31b2`, Confidence `95%`).
   - Mọi số liệu trong báo cáo gửi người dùng BẮT BUỘC phải là số liệu đo lường hoặc trích xuất từ task hiện tại.

---

## 4. Đánh Giá Độ Tin Cậy Tất Định (Deterministic Confidence)

1. Mọi artifact báo cáo có section `## 📊 Confidence Assessment` BẮT BUỘC tính toán theo tiêu chuẩn thực tế:
   - **High (90-100%):** 100% yêu cầu có bằng chứng xác thực trực tiếp từ code/DB/Jira; 0 giả định ngầm.
   - **Medium (70-89%):** Còn 1-2 điểm phụ thuộc vào cấu hình môi trường hoặc dữ liệu dynamic chưa verify đầy đủ.
   - **Low (<70%):** Có câu hỏi nghiệp vụ cốt lõi chưa được xác nhận, hoặc chưa chạy được kiểm thử thực tế.
2. BẮT BUỘC liệt kê danh sách `Blockers / Unknowns` nếu Confidence < 90%. CẤM tự chấm 95-100% khi chưa có bằng chứng thực thi.
