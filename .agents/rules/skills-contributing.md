---
description: Hàng rào bảo vệ chống trùng lặp khi thêm mới hoặc thay đổi kỹ năng
paths:
  - "plugins/*/skills/**"
---

# Thêm mới hoặc thay đổi một kỹ năng (skill)

Repository này đã bao phủ hầu hết vòng đời phát triển phần mềm, do đó hầu hết các ý tưởng tạo skill mới đều sẽ bị trùng lặp (overlap) với một skill đã có sẵn hoặc một PR đang mở. Trước khi tạo mới một thư mục `skills/<tên_kỹ_năng>/` hoặc làm lại (rework) một skill hiện có một cách đáng kể:

- Hãy chạy các bước kiểm tra sơ bộ (pre-flight checks) trong [CONTRIBUTING.md](../../CONTRIBUTING.md#before-proposing-a-new-skill): tìm kiếm trong danh mục, kiểm tra các PR đang mở (`gh pr list --state open`), và đưa ra lý do chính đáng cho lỗ hổng tính năng đó.
- Ưu tiên mở rộng một skill hiện có hơn là đẻ thêm một skill gần như trùng lặp. Nếu ý tưởng của bạn có phần giao thoa với một skill đã có, hãy chỉnh sửa skill đó thay vì tạo một thư mục mới.
- Giữ cho file `SKILL.md` tuân thủ theo cấu trúc tại [docs/guides/skill-anatomy.md](../../docs/guides/skill-anatomy.md), và tuyệt đối không sao chép lại (duplicate) nội dung giữa các skills với nhau, thay vào đó hãy sử dụng reference để trỏ tới skill kia.

CONTRIBUTING.md là nguồn sự thật duy nhất (single source of truth) cho toàn bộ quy trình; rule này chỉ trỏ tới nó thay vì phải viết lại cả một cái checklist.