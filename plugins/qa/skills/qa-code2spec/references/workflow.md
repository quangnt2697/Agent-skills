# Quy trình Dịch ngược Code sang Spec (qa-code2spec)

## 1. Workflow 5 Bước (Đa ngôn ngữ)

### Bước 0: Pre-flight GitLab Check (BẮT BUỘC)
- Kiểm tra `git status` xem có uncommitted changes không (báo user nếu có).
- Chạy `git fetch origin` và so sánh local branch với remote tracking branch.
- Nếu input là MR/Branch xa: Dùng git CLI (`git fetch`/`checkout` hoặc `repo-group-sync`) để đọc nội dung code.
- Ghi nhận Metadata nguồn (Repo, Branch, Commit SHA).

### Bước 1: Deep Trace (Phân tích cấu trúc & 5 Yếu tố Backend)
- Dùng `view_file` đọc file. Lần vết đệ quy $\le$ 3 tầng (bỏ qua thư viện ngoài).
- Trích xuất: Endpoints, Schema (Pydantic/Zod), Validation Rules, Logic rẽ nhánh, Error Codes/Messages.
- **🔥 Bắt buộc truy vết 5 yếu tố:**
  1. Database Schema & ORM (`unique`, `nullable`).
  2. Transaction Scope (`db.commit()`).
  3. Message Queue / Async Events (Topic/Payload).
  4. Security & Middleware (JWT/RBAC).
  5. WebSocket (Gói tin, Reconnect).

### Bước 2: Gap Analysis (Đối chiếu Domain)
- Đối chiếu với [Cẩm nang chứng khoán](../../../../../references/securities-domain-rules.md) (Biên độ giá, Cờ phiên, Lô chẵn lẻ).
- Tìm các Điểm mù (Gaps), logic rẽ nhánh khó hiểu, hoặc magic numbers.

### Bước 3: Interview (Phỏng vấn User)
- Kích hoạt `ba-interview-me` (Hỏi 1 lượt dạng bảng phân loại).
- Chỉ hỏi các câu **🔴 Critical** (ảnh hưởng luồng tiền, quy tắc, toàn vẹn dữ liệu). Những điểm thứ yếu tự đưa ra giả định.

### Bước 4: Chốt hạ Đặc tả (`final.md`)
- Tổng hợp thành file `final.md` tại `/project-root/workspace/issues/{tên_file}/spec/final.md`.
- File phải có Header Metadata bắt buộc (Chứa Identifier, Commit SHA, Confidence Level).

## 2. Các Biện hộ Thường gặp (Anti-patterns)
❌ **Không check GitLab:** Đọc trên code local cũ sẽ làm sai lệch toàn bộ test.
❌ **Pull đè (git pull):** Gây mất code local hoặc conflict, phải cẩn trọng.
❌ **Không phỏng vấn User:** Code có bug $\rightarrow$ Dựng Spec có bug $\rightarrow$ Khoá cứng bug đó lại.
❌ **Dừng ở Controller:** Không đọc Service, Model, Schema sẽ mất phần lớn test cases.

## 3. Cờ Đỏ Cảnh Báo (Red Flags)
- Dựng spec trên nhánh local đang bị out-of-sync mà không thông báo.
- File `final.md` thiếu metadata nguồn (Commit SHA, Branch).
- Thiếu mục Edge Cases hoặc mục Edge Cases chỉ liệt kê `raise Exception`.
- Không truy vết đến Message Queue hoặc DB Transaction khi API có xử lý phức tạp.
- Ghi các giá trị hardcode vào spec mà không phỏng vấn xác nhận.

## 4. Verification Checklist (Xác minh)
- [ ] Đã xác thực trạng thái với GitLab (Có Commit SHA).
- [ ] File `final.md` tồn tại, có đủ Header và Metadata.
- [ ] Đủ các thành phần: Endpoint, Request/Response schema, Error Codes.
- [ ] Mỗi rẽ nhánh nghiệp vụ trong code ánh xạ được tới Business Rule.
- [ ] 5 yếu tố backend cốt lõi đã được truy vết (DB, Transaction, Queue, Security, WS).
- [ ] Danh sách Gaps đã được hỏi user hoặc ghi vào phần Giả định.

---
