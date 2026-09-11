---
description: "Đẩy test case Gherkin (.feature) lên Squash TM, rồi gán test case vào requirement tương ứng bên Campaign Workspace"
---

Invoke the qa-squash-push skill. Đọc file `plugins/qa/skills/qa-squash-push/SKILL.md` để thực hiện đúng workflow.

$ARGUMENTS chứa Issue Key (VD: PROJ-123).

1. Đọc file spec `/project-root/workspace/{issueKey}/spec/final.md` để lấy tiêu đề Jira task (tìm `namejira` hoặc `Summary`).
   - Nếu tiêu đề dài hoặc chứa khoảng trắng, hãy slug hóa nó thành `namejira` (ví dụ: `Thiet-ke-luong-thanh-toan`).
2. Xác nhận file `.feature` có tồn tại ở `/project-root/workspace/{issueKey}/test/{issueKey}.feature` hay không.
3. Chạy script bash:
   ```bash
   bash plugins/qa/skills/qa-squash-push/scripts/squash-push.sh {issueKey} {namejira} /project-root/workspace/{issueKey}/test/{issueKey}.feature
   ```

4. Phân tích output từ bash script và thông báo cho người dùng.
   - Script gồm 2 phase: Phase A đẩy Gherkin lên Test Case Workspace, Phase B gán test case
     vào test plan của requirement bên Campaign Workspace.
   - Phase B là best-effort: thất bại chỉ in cảnh báo, exit code vẫn là 0.
   - Vì vậy KHÔNG được suy ra "mọi thứ thành công" chỉ từ exit code 0. Bắt buộc đọc dòng
     `- Campaign Workspace:` trong output cuối để biết bước gán có chạy được không, và báo lại
     lý do bỏ qua (nếu có) cho người dùng.
   - Nếu Phase B bị bỏ qua, tra bảng chẩn đoán sự cố trong `references/troubleshooting_and_edge_cases.md` để gợi ý cách khắc phục.

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
