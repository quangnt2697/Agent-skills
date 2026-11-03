---
name: ba-interview-me
description: Phỏng vấn tương tác từng-câu-hỏi-một để khai thác nhu cầu thực sự của người dùng, giải tỏa giả định ngầm và đạt độ tự tin cao trước khi lập kế hoạch.
trigger: Khi yêu cầu bị thiếu thông tin cốt lõi, người dùng gọi lệnh ("interview me", "hỏi tôi đi"), hoặc phát hiện Spec có lỗ hổng logic cần chất vấn.
---

# Kỹ Năng Phỏng Vấn Làm Rõ Yêu Cầu (ba-interview-me)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 2 (ARTIFACT-ONLY) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Chủ đề/yêu cầu ban đầu từ user. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** Câu trả lời thật của user được ghi lại; agent không tự trả lời thay user.

## 1. Khi nào dùng?
- Yêu cầu ban đầu mơ hồ (ví dụ: "làm cho tôi tính năng X" nhưng không rõ "cho ai", "để giải quyết vấn đề gì").
- Phát hiện các giả định ngầm (Assumptions) hoặc lỗ hổng logic trong tài liệu đặc tả cần chất vấn người dùng.
- Người dùng chủ động kích hoạt lệnh `/interview-me` hoặc yêu cầu "stress-test" ý tưởng.

**Khi KHÔNG sử dụng:**
- Yêu cầu đã có đầy đủ Acceptance Criteria và Business Rules rõ ràng.
- Trong các luồng thực thi tự động không có người ngồi trực (CI/CD pipelines).

## 2. Quy trình Phỏng vấn 5 Bước Cốt lõi
- **Bước 1 (Đưa ra Giả thuyết & Điểm tự tin):** Xác định độ tự tin hiện tại về bài toán (< 70%).
- **Bước 2 (Hỏi từng-câu-hỏi-một kèm phỏng đoán):** Đặt duy nhất 1 câu hỏi quan trọng nhất tại một thời điểm, luôn kèm theo gợi ý hoặc phỏng đoán tốt nhất để người dùng dễ phản hồi.
- **Bước 3 (Phân biệt Cần thiết vs Mong muốn):** Lắng nghe phản hồi để phân biệt đâu là Must-have cốt lõi, đâu là Nice-to-have.
- **Bước 4 (Định hình Biên phạm vi - Scope Boundaries):** Xác định rõ cả những gì NẰM NGOÀI phạm vi (Out of Scope).
- **Bước 5 (Xác nhận Đồng thuận):** Tóm tắt lại bằng ngôn từ của người dùng và nhận xác nhận dứt khoát trước khi chuyển tiếp.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 📖 **Tài liệu phương pháp & Tình huống (references/):**
  - [workflow-and-examples.md](references/workflow-and-examples.md): Mẫu đối thoại thực tế, kỹ thuật phỏng vấn đào sâu nguyên nhân gốc rễ.
  - [rules-and-guidelines.md](references/rules-and-guidelines.md): Checklist Red Flags và các cấm kỵ (như hỏi chùm 5 câu cùng lúc).

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** User yêu cầu: "Tôi muốn thêm tính năng xuất báo cáo giao dịch ra file".
- **Hành động của Agent:**
  ```markdown
  Tôi hiểu bạn cần tính năng xuất báo cáo lịch sử giao dịch. Để thiết kế chính xác nhất:
  
  **Câu hỏi:** Báo cáo này chủ yếu phục vụ Nhà đầu tư cá nhân tự đối soát trên ứng dụng di động (cần file PDF đẹp mắt) hay phục vụ Kế toán/Tổ chức cần phân tích dữ liệu chuyên sâu (cần file CSV/Excel raw data)?
  
  *Gợi ý của tôi:* Nếu là phiên bản đầu tiên trên Mobile App, ta nên ưu tiên xuất file PDF theo mẫu sao kê chuẩn. Bạn thấy phương án này có phù hợp không?
  ```

## 5. Jev Confidence Gate — Đánh Giá Độ Đầy Đủ Thông Tin (Optional)

Sau mỗi vòng phỏng vấn, agent tự kiểm tra bằng các câu hỏi TypeSafe Jev (**chỉ khi `TYPESAFE_API_KEY` có trong env**). Nếu không có API key, áp dụng fallback thủ công bên dưới.

### Khi có TYPESAFE_API_KEY:
```python
# Gửi state = toàn bộ nội dung hội thoại tới giờ
questions = [
    noul("Câu trả lời vừa rồi đã giải quyết được câu hỏi hiện tại?"),
    score("Mức độ đầy đủ thông tin để viết spec (0=trống, 5=đủ, 10=đầy đủ tuyệt đối)?",
          legend={0: "không có gì", 5: "đủ viết spec cơ bản", 10: "đầy đủ mọi edge case"}),
    choice("Bước tiếp theo tối ưu là gì?",
           options=["đặt-câu-hỏi-tiếp", "tổng-hợp-spec", "yêu-cầu-clarify-thêm"])
]
# Confidence-gated routing:
# - score >= 7 AND noul >= 0.8 → tổng hợp spec
# - score < 7 OR noul < 0.5   → đặt thêm câu hỏi
# - choice == "yêu-cầu-clarify-thêm" → hỏi user làm rõ điểm cụ thể
```

### Fallback thủ công (không có API key):
Trước khi tổng hợp spec, agent tự kiểm tra checklist:
- [ ] Đã biết **Who** (actor chính)?
- [ ] Đã biết **What** (hành vi kỳ vọng)?
- [ ] Đã biết **Why** (giá trị nghiệp vụ)?
- [ ] Đã xác định **Out of Scope** rõ ràng?
- [ ] Đã cover ít nhất 1 **edge case** hoặc **negative scenario**?

Nếu ≥ 4/5 → chuyển sang tổng hợp spec. Nếu < 4/5 → đặt thêm câu hỏi.

---
