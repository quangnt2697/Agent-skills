## Phân loại Các Ghi chú (Categorize Findings)

Dán nhãn cho mọi comment với mức độ nghiêm trọng (severity) theo chuẩn Alibaba OCR:

| Tiền tố (Prefix)              | Mức độ                            | Hành động của Tác giả (Author Action)              |
|-------------------------------|-----------------------------------|----------------------------------------------------|
| **Critical:**                 | Khẩn cấp (Chặn merge tuyệt đối)  | Lỗ hổng bảo mật, mất data, crash, sai lệch tiền tệ |
| **High / Required:**          | Bắt buộc thay đổi                | Lỗi logic, thiếu xử lý lỗi, sai contract, N+1 query|
| **Medium / Consider:**        | Nên cân nhắc                     | Điểm nghẽn hiệu năng phụ, code chưa tối ưu         |
| **Low / Nit:**                | Lặt vặt, tùy chọn                | Tác giả có thể kệ (ignore) — format, style cá nhân |
| **FYI:**                      | Cung cấp thông tin               | Không cần làm gì — chỉ để tham khảo sau này        |

---

## Chuẩn Đoán Vị Trí & Chống Lệch Dòng (Pin-Point Line Positioning)

Để triệt tiêu hiện tượng **Position Drift** (lệch dòng giữa diff và file mới):
- Mỗi issue bắt buộc phải trích xuất đoạn mã nguyên văn (**Existing Code Snippet**) trực tiếp từ diff (đã bỏ dấu `+` / `-`).
- Kèm theo đoạn mã đề xuất thay thế (**Suggested Code Snippet**).
- Ghi nhận `start_line` - `end_line` tương ứng với dòng của file mới (New File Line). Nếu không xác định được chính xác dòng, đặt `start_line: 0` và dựa vào Verbatim Snippet để người đọc định vị.

---

## Output Format Chuẩn Mực

Skill này **CHỈ REPORT findings**, KHÔNG tự ý sửa mã nguồn. Báo cáo đánh giá xuất theo định dạng chuẩn:

```markdown
## 🔍 Code Review: [File / PR Name]

**Persona:** [Dev / QA]  
**Độ bao phủ:** Reviewed N/M files (Bỏ qua: K files [Lý do: lockfile/binary]) | Coverage: 100%  
**Trạng thái Kiểm chứng (Fact-Check):** ✅ Đã qua lọc phản tư chống ảo giác (0 false alarms)

---

### ❌ Critical Issues (Chặn Merge)
1. **`src/services/order.service.ts:142`** [security / correctness] — Sai số dấu phẩy động khi tính tổng tiền lệnh
   - **Tác động:** Sai lệch số dư tài khoản người dùng và tiền ký quỹ trong Core Trading.
   - **Mã hiện tại (Trích từ diff):**
     ```typescript
     const totalAmount = price * quantity;
     ```
   - **Đề xuất sửa đổi:**
     ```typescript
     const totalAmount = new Decimal(price).mul(quantity).toNumber();
     ```

### ⚠️ Required Changes (Bắt buộc sửa)
2. **`src/controllers/order.controller.ts:45`** [correctness] — Thiếu kiểm tra bước giá (Tick Size) theo quy định HOSE
   - **Tác động:** Lệnh gửi sang KRX Gateway sẽ bị sàn từ chối (Reject code 104).
   - **Đề xuất sửa đổi:**
     ```typescript
     validateKRXTickSize(orderDto.symbol, orderDto.price);
     ```

### 💡 Optional Improvements (Góp ý nhỏ)
3. **Nit:** `src/utils/math.ts:88` — Có thể thay thế vòng lặp tuần tự bằng `Promise.all` để tăng tốc độ xử lý I/O.

---

### ✅ What's Done Well (Những điểm làm tốt)
- [Lời khen ngợi cụ thể về clean code, xử lý edge case hoặc độ bao phủ test tốt]

### 📊 Phán quyết Cuối cùng (Verdict)
- [ ] **APPROVE** — Sẵn sàng để merge
- [x] **REQUEST CHANGES** — Bắt buộc phải giải quyết 1 critical issue và 1 required change trước khi merge

---

**Next Steps:**
- Tác giả sửa code theo đề xuất và đẩy commit mới.
- Nếu muốn Agent tự động áp dụng các sửa chữa đã đề xuất: Dùng lệnh `/dev-audit` (kèm xác nhận approval gate).
```

**QUAN TRỌNG:**
- ❌ **KHÔNG** tự động apply fixes trong skill này
- ❌ **KHÔNG** show diff/code blocks rời rạc với lời "copy vào file X"
- ✅ **BẮT BUỘC** trích dẫn đoạn code thực tế từ diff (`Existing Code`) để dev biết chính xác vị trí
- ✅ **GỢI Ý** dùng `/dev-audit` nếu user muốn auto-fix
