## Bước 0 (Tuỳ chọn): Nạp Ngữ Cảnh MR từ GitLab qua GitLab MCP (Remote-First)

Khi review một Merge Request trên GitLab, Code Reviewer áp dụng nguyên tắc **Remote-First** (luôn đọc code mới nhất trên server GitLab, không phụ thuộc vào việc máy local đã pull commit mới hay chưa) và tự động nhận diện Project trong môi trường đa Group / đa Project.

### 1. Cơ Chế Nhận Diện Group & Project (Multi-Group / Multi-Project Resolution)
Agent xác định `project_id` theo 3 tầng ưu tiên tự động:
1. **Tự động từ Git Remote (Zero-Config — Khuyến nghị):** Agent chạy `git config --get remote.origin.url`. Phân tích URL remote (ví dụ: `git@gitlab.example.com:core-team/core-service.git` hoặc `https://gitlab.example.com/backend/order-service.git`) để tự động trích xuất `project_id = "core-team/core-service"` hoặc `"backend/order-service"`.
2. **Nhận diện từ URL hoặc Cú pháp ngắn của User:** Nếu user cung cấp trực tiếp URL (`https://gitlab.../group/project/-/merge_requests/145`) hoặc cú pháp `group/project!145`, Agent bóc tách chính xác `project_id` và `merge_request_iid`.
3. **Cấu hình Mặc định (Fallback):** Đọc `GITLAB_DEFAULT_PROJECT` từ file `.env` nếu không phát hiện được qua 2 cách trên.

### 2. Luôn Đọc Code MỚI NHẤT & Quản Lý Context Các Lần Push
- **Kiểm tra lịch sử Version của MR:** Gọi `list_merge_request_versions(project_id, merge_request_iid)` để xem toàn bộ timeline các lần push code của lập trình viên (Version 1 -> Version 2 -> Version N mới nhất).
- **Lấy Diff Mới Nhất:** Gọi `get_merge_request_version(project_id, merge_request_iid, version_id: latest_id, unidiff: true)` hoặc `list_merge_request_changed_files` + `get_merge_request_file_diff`. Dữ liệu trả về là diff mới nhất trên server GitLab.
- **Xem toàn bộ nội dung file mới nhất khi cần:** Gọi `get_file_contents(project_id, file_path, ref: mr.source_branch)` để đọc code đầy đủ trực tiếp từ remote branch.
- **So sánh giữa các lần push (Incremental Review):** Khi tác giả vừa push commit sửa lỗi, so sánh Version mới nhất với Version liền trước để kiểm tra chính xác những gì đã sửa, không cần đọc lại toàn bộ code không liên quan.
- **Kiểm tra CI Pipeline:** Gọi `list_merge_request_pipelines` để xác nhận commit mới nhất có PASS CI (lint/build/test) trên GitLab hay chưa.
- **Kiểm tra Threads Thảo luận:** Gọi `get_merge_request_notes` để rà soát các thread chưa giải quyết (Unresolved discussions), đối soát xem code mới đã giải quyết hết các băn khoăn của reviewers trước đó chưa.

> **Lưu ý Fallback:** Nếu không có kết nối GitLab hoặc review một branch local chưa mở MR, Agent tự động bỏ qua Bước 0 và fallback về `git diff` cục bộ như bình thường.

