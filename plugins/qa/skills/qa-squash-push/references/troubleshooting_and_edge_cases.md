# Cẩm Nang Chẩn Đoán & Xử Lý Sự Cố Khi Đồng Bộ Squash TM (Troubleshooting & Edge Cases)

Tài liệu này tổng hợp ma trận các lỗi phổ biến khi đồng bộ test case lên Squash TM, hướng dẫn kích hoạt chế độ debug chuyên sâu, và quy chuẩn đọc log console để phản hồi chính xác cho người dùng.

---

## 1. Ma Trận Chẩn Đoán Sự Cố Thường Gặp (Failure Matrix)

| Triệu chứng / Cảnh báo | Nhóm nguyên nhân | Hướng xử lý chi tiết |
|---|---|---|
| ❌ **Lỗi Phase A: HTTP 401/403 Unauthorized** | `SQUASH_API_TOKEN` hết hạn, bị thu hồi hoặc tài khoản không có quyền ghi trên dự án `SQUASH_PROJECT_ID`. | Vào UI Squash TM $\rightarrow$ Thông tin cá nhân $\rightarrow$ Tạo API Token mới $\rightarrow$ Cập nhật lại biến `SQUASH_API_TOKEN` trong `.env`. |
| ❌ **Lỗi Phase A: Không tìm thấy thư mục gốc G.3.1** | `SQUASH_REQ_G31_FOLDER_ID` hoặc `SQUASH_TC_G31_FOLDER_ID` bị cấu hình sai ID. | Kiểm tra URL trên trình duyệt khi mở thư mục G.3.1 để lấy đúng số ID thư mục và cập nhật vào `.env`. |
| ❌ **Lỗi Phase A: Không tìm thấy file `.feature`** | Đường dẫn file Gherkin truyền vào không tồn tại, hoặc task chưa chạy qua `qa-test-design`. | Kiểm tra sự tồn tại của file `workspace/{issueKey}/test/{issueKey}.feature`. Nếu chưa có, chạy lệnh `/qa-test-design {issueKey}` trước. |
| ⚠️ **Lỗi Phase B: Chưa cấu hình Username / Password** | Thiếu biến `SQUASH_USERNAME` hoặc `SQUASH_PASSWORD` trong `.env`. | Đây là cảnh báo bình thường khi chỉ muốn chạy Phase A. Nếu cần gán vào Campaign, bổ sung 2 biến này vào `.env`. |
| ⚠️ **Lỗi Phase B: Đăng nhập session thất bại (HTTP 401)** | Sai mật khẩu hoặc tài khoản bị khóa đăng nhập trên giao diện web. | Thử đăng nhập thủ công trên giao diện web Squash TM để xác nhận mật khẩu và mở khóa tài khoản nếu cần. |
| ⚠️ **Lỗi Phase B: Không tìm thấy node Sprint nào** | Cấu trúc cây Campaign khác thường, hoặc tài khoản không có quyền xem Campaign Workspace. | Bật `SQUASH_DEBUG=1` để soi raw response JSON của `/backend/campaign-tree`. Kiểm tra quyền của tài khoản trong Campaign Workspace. |
| ⚠️ **Lỗi Phase B: Không khớp được node Sprint** | Tên Sprint bên Campaign khác bên Requirement (ví dụ: bên Req là `Sprint 046` nhưng bên Campaign đặt là `Sprint 46`). | Kiểm tra trên UI và đồng bộ lại quy ước đặt tên Sprint giữa 2 workspace cho đồng nhất. |
| ⚠️ **Lỗi Phase B: Không tìm thấy requirement `{issueKey}`** | Requirement chưa được đưa vào Sprint bên Campaign Workspace, hoặc trường Reference trên Squash bị để trống. | Vào Campaign Workspace $\rightarrow$ Chọn Sprint $\rightarrow$ Đảm bảo Requirement đã được kéo vào Sprint và trường Reference điền đúng mã `{issueKey}`. |
| ⚠️ **Lỗi Phase B: Endpoint `/backend` trả về lỗi HTTP 4xx/5xx** | Giao diện Squash TM nâng cấp phiên bản khiến endpoint nội bộ thay đổi cấu trúc payload hoặc URL. | Bật `SQUASH_DEBUG=1`, mở Chrome DevTools (F12) trên UI Squash để bắt request khi gán test plan item thủ công, sau đó cập nhật lại script `squash-push.sh`. |

---

## 2. Hướng Dẫn Kích Hoạt Debug Nâng Cao (SQUASH_DEBUG=1)

Khi gặp các sự cố phức tạp liên quan đến cây thư mục hoặc API nội bộ Phase B, Agent có thể chạy script với cờ debug để in ra toàn bộ payload HTTP request và raw response JSON:

```bash
SQUASH_DEBUG=1 bash plugins/qa/skills/qa-squash-push/assets/squash-push.sh "{issueKey}" "{namejira}" "workspace/{issueKey}/test/{issueKey}.feature"
```

### Các thông tin hữu ích khi soi debug:
1. **Raw JSON của `/backend/campaign-tree`:** Giúp xác định ID và tên các node nhóm (`CampaignLibrary-*`, `SprintGroup-*`, `Sprint-*`).
2. **Raw JSON của `/backend/sprint-view/{sprintId}`:** Giúp xác định các requirement version bindings (`sprintReqVersionId`) đang liên kết trong Sprint.
3. **Response của `/test-plan-items`:** Giúp xác định danh sách các test case IDs và execution IDs đã từng được gắn trước đó.

---

## 3. Tiêu Chuẩn Đọc Output Console & Báo Cáo Người Dùng

### Quy tắc Vàng: Exit Code 0 Không Đồng Nghĩa Với 100% Hoàn Thành!
Script được thiết kế theo nguyên tắc: **Phase A bắt buộc thành công (nếu lỗi sẽ exit $\ne$ 0), còn Phase B là Best-effort (nếu lỗi sẽ in cảnh báo và exit 0).**

Do đó, Agent **TUYỆT ĐỐI KHÔNG** chỉ dựa vào exit code 0 để kết luận rằng test case đã được gán vào Campaign Workspace. Agent BẮT BUỘC phải đọc nội dung log ở cuối console:

```
[MẪU LOG ĐẦU RA CỦA SCRIPT]
- Sprint Target: Sprint 046
- Test Case Workspace: Đã tạo mới (hoặc Ghi đè) Test Case 'G3PTP-17145-Thiet-ke-luong-thanh-toan' (ID: 12540)
- Campaign Workspace: Đã gán vào requirement 'G3PTP-17145' (sprintReqVersionId: 4321)
```

### Mẫu Báo Cáo Phản Hồi Cho Người Dùng:

#### Trường hợp 1: Cả Phase A và Phase B đều thành công
```markdown
✅ **Đã push thành công lên Squash TM:**
- **Sprint:** Sprint 046 (Đồng bộ từ Requirement Workspace)
- **Test Case:** `G3PTP-17145-Thiet-ke-luong-thanh-toan` (ID: 12540)
- **Hành động:** Đã đồng bộ thư mục và ghi đè nội dung kịch bản Gherkin mới
- **Campaign Workspace:** Đã gán thành công vào requirement `G3PTP-17145` (sẵn sàng thực thi kiểm thử)
```

#### Trường hợp 2: Phase A thành công, Phase B bị bỏ qua
```markdown
✅ **Đã push Test Case lên Squash TM (Phase A thành công):**
- **Sprint:** Sprint 046
- **Test Case:** `G3PTP-17145-Thiet-ke-luong-thanh-toan` (ID: 12540)
- **Hành động:** Đã ghi đè kịch bản Gherkin thành công trên Test Case Workspace

⚠️ **Bước gán vào Campaign Workspace (Phase B) bị bỏ qua:**
- **Lý do:** [Trích xuất lý do từ log, ví dụ: Không tìm thấy requirement nào có reference 'G3PTP-17145' trong Sprint 046]
- **Khắc phục:** Vui lòng vào Campaign Workspace trên Squash TM kéo requirement vào Sprint hoặc điền trường Reference = `G3PTP-17145`.
```
