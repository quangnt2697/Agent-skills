# Quy trình Thực thi (qa-squash-push)

## 1. Quy trình Thực hiện Tinh gọn (Execution Protocol)

### Bước 1: Thu thập Tham số & Kiểm tra Đầu vào
- Xác định `issueKey`.
- Lấy `namejira` (tiêu đề task slug hóa) từ `workspace/issues/{issueKey}/spec/final.md`.
- Kiểm tra file kịch bản `workspace/issues/{issueKey}/test/{issueKey}.feature` có tồn tại.

### Bước 2: Thực thi Script Đồng bộ (squash-push.sh)
- Chạy 1 lệnh bash duy nhất để thực hiện Phase A (REST API) và Phase B (Campaign Workspace):
  ```bash
  bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-squash-push/assets/squash-push.sh "{issueKey}" "{namejira}" "workspace/issues/{issueKey}/test/{issueKey}.feature"
  ```
- Script tự động nạp `.env`, dò Sprint mới nhất trên đa workspace (Test Case, Requirement, Campaign), quét và xoá test case/execution cũ (chỉ test case tên `{issueKey}` hoặc `{issueKey}-…`) của `{issueKey}` ở bất kỳ thư mục nào trên toàn dự án, rồi tạo mới sạch sẽ tại Sprint mới nhất và đồng bộ vào Campaign.

### Bước 3: Phân tích Output & Báo cáo
- Đọc kỹ kết quả Phase B trong output: `- Campaign Workspace:`.
- Báo cáo rõ: gán thành công hay bị bỏ qua kèm lý do.
- Lưu metadata vào `workspace/issues/{issueKey}/test/squash_sync.json`.

## 2. Anti-patterns (Cấm kỵ)
❌ **Exit code 0 là xong:** Phase B là best-effort, phải đọc log console để biết thực sự gán test case thành công chưa.
❌ **Sửa kịch bản sau khi đẩy:** Ghi đè kịch bản lỗi lên UI sẽ làm tốn công QA thủ công dọn dẹp. Phải validate trước khi đẩy.
❌ **Chạy lệnh curl rời rạc:** Dễ thất thoát session. Bắt buộc dùng `squash-push.sh`.
❌ **Lộ thông tin nhạy cảm:** Hardcode token/cookie vào console/chat.
❌ **Để sót test case cũ ở Sprint khác:** Khi đẩy mới, bắt buộc phải quét xóa bản cũ trên toàn dự án để tránh trùng lặp dữ liệu.
❌ **Xoá nhầm test case của task khác:** Chỉ xoá theo tên đúng mẫu `{issueKey}` / `{issueKey}-…`. Không đổi bộ lọc sang "tên có chứa issueKey" — sẽ xoá cả regression suite và task có số bắt đầu giống.

## 3. Cờ Đỏ Cảnh Báo (Red Flags)
- Đẩy file `.feature` rỗng hoặc chưa validate.
- Bỏ qua dòng `- Campaign Workspace:` trong output nhưng vẫn báo thành công.
- Lộ `SQUASH_API_TOKEN`, `JSESSIONID` ra chat.
- `.env` chưa bị `.gitignore`.
- Test case cũ ở Sprint cũ chưa được xóa bỏ trước khi đẩy mới.

## 4. Verification Checklist (Xác minh kết thúc)
- [ ] File kịch bản `*.feature` hợp lệ trước khi đẩy.
- [ ] Đã quét và đối chiếu Sprint mới nhất trên cả 3 workspace (Test Case, Requirement, Campaign).
- [ ] Đã quét toàn bộ dự án và dọn sạch test case/execution cũ của `{issueKey}` trước khi tạo mới.
- [ ] Log không có dòng "Đã xóa hoàn toàn Test Case cũ" nào cho test case của task khác.
- [ ] Test Case mới đã được tạo và nạp kịch bản tại đúng thư mục Sprint mới nhất.
- [ ] Script kết thúc với exit code 0.
- [ ] `- Test Case Workspace:` xác nhận tạo mới và nạp script thành công.
- [ ] `- Campaign Workspace:` xác nhận trạng thái gán thành công hoặc có lý do.
- [ ] File metadata `squash_sync.json` đã được tạo.
- [ ] Tuyệt đối KHÔNG lộ token/cookie.

---
