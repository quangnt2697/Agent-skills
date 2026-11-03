# Cẩm Nang Áp Dụng Agent Skills Trong Doanh Nghiệp (Adoption Guide)

Tài liệu này hướng dẫn cách áp dụng bộ kỹ năng **agent-skills** (Nhánh `main`: **6 Plugins, 31 Skills, 29 Slash Commands, 6 Personas**) vào quy trình phát triển và đảm bảo chất lượng phần mềm thực tế theo mô hình Agile/Scrum trong lĩnh vực Tài chính — Chứng khoán (KRX).

---

## 1. Bản Đồ Phối Hợp Liên Vai Trò (The End-to-End Pipeline)

Bộ kỹ năng được thiết kế theo luồng bàn giao khép kín qua các file artifacts chuẩn hóa trong `workspace/issues/{issueKey}/`, đảm bảo tính truy vết (traceability) 1-1 từ yêu cầu nghiệp vụ đến kịch bản kiểm thử, mã nguồn automation và cổng kiểm duyệt chất lượng:

```text
[BA / PO]                       [QA / SDET]                      [CODE REVIEW & AUDITORS]         [SM & FINTECH DATA]
Jira / Confluence               Checklist, BDD & Auto Test       Review, Security & WebPerf       Agile & KRX Data Recon
   │                                 │                                  │                                │
   ├── /ba-spec ────────────────────►│                                  │                                ├── /sm-sprint-planning
   │   (spec/final.md)               │                                  │                                ├── /sm-daily-standup
   ├── /ba-refine ──────────────────►│                                  │                                ├── /sm-impediment-triage
   │   (refined.md + mockup          ├── /qa-test-design ──────────────►│                                ├── /sm-sprint-retrospective
   │    + testability-manifest.json) │   (checklist.md + .feature)      │                                │
   │                                 ├── /qa-squash-push                │                                └── /db-recon
   │                                 ├── /qa-auto-design ──────────────►│                                    (TimescaleDB KRX MDDS)
   │                                 ├── /qa-run-test ─────────────────►├── /cr-review (5 trục)
   │                                 │   (report.md + test-output.log)  ├── /cr-code-simplify
   │                                 └── /qa-code2spec                  ├── /security-audit (OWASP)
   │                                                                    └── /webperf-audit (CWV)
```

> 💡 **Lưu ý về Handoff với Đội Phát triển (DEV):** Các đặc tả `spec/final.md`, `spec/refined.md` và ảnh mockup Prod-Twin (`spec/diagrams/mockup-case-*.png`) của BA là đầu vào trực tiếp để đội DEV thiết kế kỹ thuật và lập trình trên các repo microservice. Khi DEV tạo Merge Request (MR), QA và Code Reviewer sử dụng `/cr-review`, `/security-audit`, `/webperf-audit` và `/qa-full-pipeline` để nghiệm thu chất lượng trước khi merge.

---

## 2. Hướng Dẫn Áp Dụng Cho Từng Nhóm Vai Trò (6 Plugins)

### 2.1. Chuyên Gia Phân Tích Nghiệp Vụ & Sản Phẩm (`plugins/ba-po` — 10 Skills)
- **Kỹ năng cốt lõi:** `ba-spec`, `ba-refine`, `ba-interview-me`, `ba-design-flowchart`, `ba-design-mockup`, `ba-gap-analysis`, `ba-user-story-writing`, `ba-backlog-prioritization`, `ba-stakeholder-interview`, `ba-process-modeling`.
- **Quy trình chuẩn:**
  1. **Khi Jira task đã có tài liệu rõ ràng:** Chạy `/ba-spec {issueKey}` để tự động tải Jira/Confluence, quét gaps theo 9 chiều phân tích và tổng hợp thành `workspace/issues/{issueKey}/spec/final.md`.
  2. **Khi Jira task mới là ý tưởng thô/mơ hồ:** Chạy `/ba-refine {issueKey}` để trích xuất từ khóa tiêu đề, tìm kiếm task liên quan (JQL/CQL), khai phóng 5 chiều nghiệp vụ và phản biện các tình huống biên.
  3. **Làm rõ điểm mù:** Tự động kích hoạt `ba-interview-me` để hỏi từng câu hỏi 🔴 Critical cho tới khi đạt độ tự tin (Confidence Level) ≥ 90%.
  4. **Trực quan hóa Sơ đồ & Mockup Giao diện:**
     - Gọi `ba-design-flowchart` (`/flowchart`) khi cần vẽ sơ đồ quy trình, kiến trúc, sequence hoặc ERD theo phong cách Editorial.
     - Gọi `ba-design-mockup` khi tính năng có thay đổi giao diện WEB/APP để bóc tách AS-IS từ codebase (`extract-asis-ui.js`), dựng Prod-Twin mockup đa trạng thái (`mockup-case-1..3.png`) và kiểm định độ trung thực `validate-mockup-fidelity.js` (Fidelity Score ≥ 90%).
  5. **Kiểm định Hard Gate & Đồng bộ Jira:** Chạy `validate-ba-refine.js` đạt 100% PASS, đẩy đặc tả 6 mục kèm ảnh inline ADF lên Jira Description và xuất `spec/testability-manifest.json` bàn giao cho QA.

### 2.2. Kỹ Sư Đảm Bảo Chất Lượng & Tự Động Hóa (`plugins/qa` — 6 Skills)
- **Kỹ năng cốt lõi:** `qa-test-design`, `qa-auto-design`, `qa-run-test`, `qa-squash-push`, `qa-code2spec`, `qa-full-pipeline`.
- **Quy trình chuẩn:**
  1. Nhận `spec/final.md` (hoặc `spec/refined.md` + `spec/testability-manifest.json`), chạy `/qa-test-design {issueKey}` để thiết kế bộ kiểm thử 2 giai đoạn: Checklist phân vùng tương đương / giá trị biên (`test/checklist.md`) và kịch bản BDD Gherkin (`test/{issueKey}.feature`) tham số hóa đa sàn KRX.
  2. Đồng bộ kịch bản BDD Gherkin lên hệ thống quản lý kiểm thử Squash TM và gán vào Campaign Test Plan qua `/qa-squash-push {issueKey}`.
  3. Chạy `/qa-auto-design {issueKey}` để sinh mã kiểm thử tự động (Playwright / Pytest) chuẩn POM, bắt buộc tra cứu và tái sử dụng các class có sẵn trong `plugins/qa/skills/qa-auto-design/references/sdk-map.json`.
  4. Thực thi kiểm thử qua `/qa-run-test {issueKey}`, ghi nhận 100% nhật ký Request/Response của cả case PASS và FAIL vào `test/result/test-output.log` và `test/result/report.md`.
  5. *(Tùy chọn 1 lệnh):* Gọi `/qa-full-pipeline {issueKey}` để điều phối tự động toàn bộ chuỗi từ đầu đến cuối, hoặc dùng `/qa-code2spec {path}` khi cần dịch ngược mã nguồn của developer thành tài liệu đặc tả để đối chiếu.

### 2.3. Kỹ Sư Review Code, Kiểm Toán Bảo Mật & Hiệu Năng (`plugins/code-reviewer` — 4 Skills)
- **Kỹ năng cốt lõi:** `cr-review-code-and-quality`, `cr-code-simplification`, `security-code-audit`, `webperf-core-vitals`.
- **Quy trình chuẩn:**
  1. Trước khi merge bất kỳ thay đổi nào, chạy `/cr-review` để đánh giá mã nguồn đa chiều trên 5 trục (Tính đúng đắn, Khả năng đọc hiểu, Kiến trúc, Bảo mật, Hiệu năng & Độ bao phủ kiểm thử QA).
  2. Khi mã nguồn hoặc test code chạy đúng nhưng phức tạp, chạy `/cr-code-simplify` để rút gọn và làm sạch code mà không thay đổi hành vi logic.
  3. Chạy `/security-audit` để quét lỗ hổng bảo mật theo chuẩn OWASP Top 10, kiểm tra phân quyền tiểu khoản (chống IDOR) và kiểm soát an ninh gói phụ thuộc.
  4. Đối với ứng dụng Web Trading, chạy `/webperf-audit` để đo lường và tối ưu các chỉ số Core Web Vitals (LCP, INP, CLS).

### 2.4. Scrum Master — Quản Trị Quy Trình Agile (`plugins/scrum-master` — 4 Skills)
- **Kỹ năng cốt lõi:** `sm-sprint-planning`, `sm-daily-standup`, `sm-impediment-triage`, `sm-sprint-retrospective`.
- **Quy trình chuẩn:**
  1. Đầu chu kỳ Sprint, chạy `/sm-sprint-planning` để tính toán năng lực đội ngũ (Velocity) và lập kế hoạch Sprint (`workspace/sprints/{sprintId}/tech/sprint-plan.md`).
  2. Hằng ngày, chạy `/sm-daily-standup` để tự động thống kê tiến độ từ Jira, phân tích cân bằng tải và lưu báo cáo vào `workspace/sprints/{sprintId}/trace/`.
  3. Định kỳ chạy `/sm-impediment-triage` để phát hiện sớm các ticket bị treo lâu ngày (bottlenecks/blockers) và đề xuất phương án gỡ rối.
  4. Cuối Sprint, chạy `/sm-sprint-retrospective` để tổng kết chỉ số hoàn thành và đúc kết bài học cải tiến.

### 2.5. Đối Chiếu Dữ Liệu Thị Trường KRX & Điều Phối Hệ Thống (`plugins/fintech-data` & `plugins/core` — 7 Skills)
- **Kỹ năng cốt lõi:** `db-timescale-reconciler`, `repo-group-sync`, `meta-cross-validation`, `meta-context`, `meta-session-checkpoint`, `meta-continuous-learning`, `meta-using-agent-skills`.
- **Quy trình chuẩn:**
  1. Trước khi phân tích spec, bóc tách UI hoặc viết test, chạy `/sync` (`npm run sync`) để cập nhật mã nguồn mới nhất của toàn bộ các repo microservices trong nhóm.
  2. Khi cần kiểm tra chất lượng dữ liệu thị trường KRX MDDS trên TimescaleDB Production/UAT, chạy `/db-recon` để quét sai lệch số lượng bản ghi (count parity), trôi giá/khối lượng (value drift), dữ liệu trễ và khoảng trống nến OHLC trên 11 topics nghiệp vụ.
  3. Sử dụng `meta-cross-validation` (`node scripts/validators/trace-check.js {issueKey}`) để thẩm định ma trận truy vết giữa `spec/final.md` và `test/` (xuất `trace/matrix.md` và `trace/gaps.md`).

---

## 3. Quy Ước Lưu Trữ Workspace (Canonical Layout)

Toàn bộ sản phẩm đầu ra phát sinh trong quá trình thực thi bắt buộc lưu trữ trong thư mục `workspace/` theo đúng cấu trúc chuẩn (được kiểm tra tự động bởi Gate 6 `npm run validate:paths`):

```text
workspace/
├── issues/
│   └── {issueKey}/
│       ├── source/      # Nguyên liệu thô tải về từ Jira/Confluence (PDF, metadata.json, refs/)
│       ├── spec/        # BA/PO sở hữu: final.md, refined.md, asis-inventory.*, testability-manifest.json, diagrams/
│       ├── tech/        # Tài liệu kỹ thuật & kế hoạch: tech-spec.md, plan.md, diagrams/
│       ├── test/        # QA sở hữu: fixtures/, checklist.md, {issueKey}.feature, steps/, result/
│       └── trace/       # Truy vết chéo: matrix.md, gaps.md
├── sprints/
│   └── {sprintId}/      # Scrum Master sở hữu: tech/sprint-plan.md, trace/daily-standup-report.md...
└── adhoc/
    └── {slug}/          # Báo cáo đối chiếu DB (database/), đánh giá nội bộ không gắn ticket lẻ
```

---

## 4. Quản Lý Tri Thức & Điểm Dừng Phiên Làm Việc (Checkpoints & Learning)

- **Đúc kết bài học liên tục:** Sau khi giải quyết xong một bài toán nghiệp vụ phức tạp hoặc khắc phục một lỗi khó, chạy lệnh `/learn` (kỹ năng `meta-continuous-learning`) để tự động đúc kết thành quy tắc phòng ngừa lưu vào `.agents/rules/`.
- **Lưu & Khôi phục trạng thái phiên:** Khi cần tạm dừng phiên làm việc dài, chạy `/save-checkpoint` để nén toàn bộ ngữ cảnh hiện tại, và chạy `/load-checkpoint` khi bắt đầu phiên làm việc tiếp theo để tiếp tục ngay mà không mất dấu tiến độ.
