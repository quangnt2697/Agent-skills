---
description: "Đẩy test case Gherkin (.feature) lên Squash TM, rồi gán test case vào requirement tương ứng bên Campaign Workspace"
---

Invoke the qa-squash-push skill. Đọc file `plugins/qa/skills/qa-squash-push/SKILL.md` để thực hiện đúng workflow.

$ARGUMENTS chứa Issue Key (VD: PROJ-123).

1. Đọc file spec `workspace/issues/{issueKey}/spec/final.md` để lấy tiêu đề Jira task (tìm `namejira` hoặc `Summary`).
   - Nếu tiêu đề dài hoặc chứa khoảng trắng, hãy slug hóa nó thành `namejira` (ví dụ: `Thiet-ke-luong-thanh-toan`).
2. Xác nhận file `.feature` có tồn tại ở `workspace/issues/{issueKey}/test/{issueKey}.feature` hay không.
3. Chạy script bash:
   ```bash
   bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-squash-push/assets/squash-push.sh {issueKey} {namejira} workspace/issues/{issueKey}/test/{issueKey}.feature
   ```

4. Phân tích output từ bash script và thông báo cho người dùng.
   - Script gồm 2 phase: Phase A đẩy Gherkin lên Test Case Workspace, Phase B gán test case
     vào test plan của requirement bên Campaign Workspace.
   - Phase B là best-effort: thất bại chỉ in cảnh báo, exit code vẫn là 0.
   - Vì vậy KHÔNG được suy ra "mọi thứ thành công" chỉ từ exit code 0. Bắt buộc đọc dòng
     `- Campaign Workspace:` trong output cuối để biết bước gán có chạy được không, và báo lại
     lý do bỏ qua (nếu có) cho người dùng.
   - Nếu Phase B bị bỏ qua, tra bảng chẩn đoán sự cố trong `references/troubleshooting_and_edge_cases.md` để gợi ý cách khắc phục.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 2 - ARTIFACT-ONLY):** Lệnh này CHỈ làm nhiệm vụ đọc file `.feature` có sẵn và gọi API đồng bộ lên Squash TM.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** 
   - TUYỆT ĐỐI CẤM tự ý sửa đổi nội dung file `.feature` hoặc `final.md`.
   - CẤM can thiệp vào bất kỳ file mã nguồn nào của dự án.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Sau khi script push xong (in rõ trạng thái Phase A và Phase B), DỪNG LẠI NGAY và báo cáo cho người dùng. CẤM tự động chạy tiếp test.
