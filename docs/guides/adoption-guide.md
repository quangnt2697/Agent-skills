# Cẩm Nang Áp Dụng Agent Skills Trong Doanh Nghiệp (Adoption Guide)

Tài liệu này hướng dẫn cách áp dụng bộ kỹ năng **agent-skills** vào quy trình phát triển phần mềm thực tế theo mô hình Agile/Scrum, phân định rõ trách nhiệm giữa 7 vai trò (personas) và cách phối hợp liên vai trò mượt mà.

---

## 1. Bản Đồ Phối Hợp Liên Vai Trò (The End-to-End Pipeline)

Bộ kỹ năng được thiết kế theo luồng làm việc khép kín, đảm bảo tính truy vết (traceability) từ yêu cầu nghiệp vụ đến mã nguồn và kết quả kiểm thử:

```
[PO/BA]                 [QA / SDET]              [DEVELOPER]             [CODE REVIEW / AUDIT]
Jira Task                Checklist & BDD          Tech-Spec & Code        Review & Quality Gates
   │                          │                        │                          │
   ├── /ba-spec ──────────────┼───────────────────────►│                          │
   │   (final.md)             │                        │                          │
   │                          ├── /qa-test-design ────►│                          │
   │                          │   (checklist & .feature)                          │
   │                          │                        ├── /dev-tech-spec ───────►│
   │                          │                        ├── /dev-build             │
   │                          │                        ├── /dev-unit-test         │
   │                          │                        │                          ├── /cr-review
   │                          ├── /qa-auto-design ────►│                          ├── /security-audit
   │                          ├── /qa-run-test ───────►│                          └── /webperf-audit
   │                          │   (Test Report)        │
```

---

## 2. Hướng Dẫn Áp Dụng Cho Từng Vai Trò

### 2.1. Dành cho Chuyên Gia Phân Tích Nghiệp Vụ (BA / PO)
- **Kỹ năng cốt lõi:** `ba-spec`, `ba-refine`, `ba-interview-me`, `ba-design-flowchart`, `ba-process-modeling`.
- **Quy trình chuẩn:**
  1. Khi nhận Jira task mới, chạy `/ba-spec {issueKey}` để phân tích yêu cầu thô và liên kết Confluence.
  2. Nếu yêu cầu còn nhiều giả định chưa rõ, kích hoạt `ba-interview-me` để được phỏng vấn làm rõ từng điểm mù.
  3. Tạo sơ đồ quy trình trực quan bằng `/flowchart` (chuẩn engine ELK nền trắng chữ đen).
  4. Đẩy đặc tả hoàn thiện lên Jira qua `/ba-refine`.

### 2.2. Dành cho Kỹ Sư Phát Triển Phần Mềm (Software Developer - DEV)
- **Kỹ năng cốt lõi:** `dev-spec-driven-development`, `dev-planning-and-task-breakdown`, `dev-incremental-implementation`, `dev-test-driven-development`, `dev-debugging`, `dev-refactoring`.
- **Quy trình chuẩn:**
  1. Nhận `final.md` từ BA, chạy `/dev-tech-spec` để chốt API Contract, Data Model và Architecture Decisions.
  2. Chạy `/dev-plan` chia nhỏ công việc thành các task độc lập.
  3. Thực hiện code qua `/dev-build` theo từng bước tăng dần (Thin Slices), viết Unit Test trước khi code logic (`dev-test-driven-development`).
  4. Nếu gặp bug, gỡ lỗi có hệ thống với `dev-debugging`, tuyệt đối không đoán mò.

### 2.3. Dành cho Kỹ Sư Đảm Bảo Chất Lượng (QA / SDET)
- **Kỹ năng cốt lõi:** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-squash-push`, `qa-code2spec`.
- **Quy trình chuẩn:**
  1. Từ `final.md`, chạy `/qa-test-design` để tạo Checklist phân tích giá trị biên (BVA) và kịch bản BDD Gherkin (`.feature`).
  2. Dùng `/qa-auto-design` để sinh code automation (Playwright/Pytest) tương ứng cho Web, API hoặc WebSocket.
  3. Chạy regression test bằng `/qa-run-test`.
  4. Đồng bộ kết quả và test cases lên Squash TM qua `/qa-squash-push`.

### 2.4. Dành cho Scrum Master (SM)
- **Kỹ năng cốt lõi:** `sm-daily-standup`, `sm-impediment-triage`, `sm-sprint-planning`, `sm-sprint-retrospective`.
- **Quy trình chuẩn:**
  1. Hằng ngày, chạy `/sm-daily-standup` để tự động tổng hợp báo cáo tiến độ Sprint từ Jira và gửi thông báo Mattermost.
  2. Định kỳ chạy `/sm-impediment-triage` để phát hiện các ticket bị nghẽn (bottleneck) hoặc quá hạn.
  3. Điều phối kế hoạch Sprint mới với `/sm-sprint-planning`.

### 2.5. Dành cho Code Reviewer & Kiểm Toán Viên (Review & Audit)
- **Kỹ năng cốt lõi:** `cr-review-code-and-quality`, `cr-code-simplification`, `security-code-audit`, `webperf-core-vitals`.
- **Quy trình chuẩn:**
  1. Chạy `/cr-review` để đánh giá đa chiều trên 5 trục: Tính chính xác, Đọc hiểu, Kiến trúc, Bảo mật, Hiệu năng.
  2. Tích hợp đọc ngữ cảnh trực tiếp từ GitLab Merge Request (MR Title, Description, CI Pipeline, Unresolved Threads).
  3. Định kỳ quét bảo mật với `/security-audit` và kiểm tra Core Web Vitals với `/webperf-audit`.

---

## 3. Quy Ước Lưu Trữ Workspace (Canonical Layout)

Tất cả các tài liệu phát sinh trong quá trình chạy đều phải lưu trữ trong thư mục `workspace/` theo cấu trúc:
```
workspace/
├── {issueKey}/
│   ├── source/      # Tài liệu thô tải từ Jira/Confluence (PDF, metadata)
│   ├── spec/        # Business-Spec (*-final.md), sơ đồ (.mmd, .png)
│   ├── tech/        # Tech-Spec, Kế hoạch lập trình (plan.md)
│   └── test/        # Checklist, kịch bản (.feature), automation code, reports
└── sprint/
    └── trace/       # Báo cáo Daily Standup, Sprint Retrospective
```

---

## 4. Quản Lý Tri Thức & Bài Học (Continuous Learning)
- Khi hoàn thành một task khó hoặc fix được một bug phức tạp: Chạy lệnh `/learn` hoặc `/save-session` để lưu bài học thành chỉ thị vào `.agents/rules/lessons-learned.md`.
- Khi cần tạm dừng phiên làm việc: Chạy `/save-checkpoint` để nén ngữ cảnh vào `.agents/workspace_state.md`, và gọi `/load-checkpoint` khi bắt đầu phiên mới.
