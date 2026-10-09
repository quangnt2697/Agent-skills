# Workspace Paths — Quy ước đường dẫn output cho skills

## Nguyên tắc

Có **2 loại workspace** trong hệ thống:

### 1. Per-Issue Workspace (BA/QA/DEV)

**Mọi artifact sinh ra bởi skill BA/QA/DEV đều là artifact của MỘT đơn vị công việc** (một Jira issue, hoặc một module khi reverse-engineering). Tất cả BẮT BUỘC nằm dưới:

```
/project-root/workspace/{issueKey}/
```

Dùng cho: BA/PO, QA, DEV personas khi làm việc với từng issue cụ thể.

### 2. Sprint Workspace (Scrum Master)

**Artifacts quản lý Sprint và quy trình Agile** (không gắn với issue cụ thể) nằm dưới:

```
/project-root/workspace/sprint/
```

Dùng cho: Scrum Master persona khi lập kế hoạch Sprint, báo cáo Daily Standup, Retrospective.

---

## Lý do 2 loại workspace

- **Per-issue:** Pipeline BA → QA → DEV bàn giao artifact **bằng đường dẫn**. BA ghi `/project-root/workspace/{issueKey}/spec/...`, QA đọc đúng đường dẫn đó. Một skill ghi lệch gốc là handoff đứt — im lặng, không có lỗi nào được ném ra.

- **Sprint:** Scrum Master làm việc với nhiều issues trong Sprint, không gắn với một issueKey cụ thể. Sprint plan, standup report, retrospective là artifacts cấp Sprint, không phải cấp issue.

---

## Bước bắt buộc trước khi ghi bất kỳ file nào

### Per-Issue Workspace (BA/QA/DEV)

Mọi skill BA/QA/DEV, ở bước đầu tiên có tạo file, BẮT BUỘC chạy đúng 2 dòng này trước:

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p workspace/{issueKey}/<thư-mục-con-của-skill>
```

### Sprint Workspace (Scrum Master)

Mọi skill Scrum Master, ở bước đầu tiên có tạo file, BẮT BUỘC chạy:

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p workspace/sprint/<trace|tech>
```

**Vì sao phải `cd` về root repo:** cwd của agent thay đổi giữa các lần chạy và giữa các
subagent. Đường dẫn tương đối tính từ một cwd không xác định chính là nguyên nhân sinh ra
các thư mục lệch kiểu `{project_root}/{issueKey}/...`. Neo về root repo một lần, mọi đường
dẫn tương đối phía sau đều đúng.

**Vì sao `mkdir -p` trước, không dựa vào tool tự tạo:** `curl -o`, `tee`, và phần lớn CLI
runner **không** tự tạo thư mục cha — chúng fail hoặc ghi nhầm chỗ. Tạo cây thư mục trước
là cách duy nhất đảm bảo đích ghi tồn tại.

---

## Cây thư mục chuẩn

### 1. Per-Issue Workspace

Phẳng theo **persona / loại artifact**, không theo tên skill. Tối đa 3 tầng dưới
`/project-root/workspace/{issueKey}/`. `{issueKey}` đã là thư mục cha nên **không lặp lại** ở bất kỳ
thư mục con hay tên file nào — ngoại lệ duy nhất là `{issueKey}.feature` (Squash TM ghi đè
test case theo tên file).

```
/project-root/workspace/{issueKey}/
├── .pipeline-state.json
│
├── source/                     # Nguyên liệu tải về — INPUT, không phải agent sinh ra
│   ├── {issueKey}.pdf
│   ├── metadata.json
│   └── refs/                   # Confluence PDF + attachment + ảnh
│
├── spec/                       # BA/PO sở hữu
│   ├── final.md                ★ Single Source of Truth
│   ├── refined.md              # ba-refine
│   ├── gap-analysis.md
│   ├── user-stories.md
│   ├── backlog.md
│   ├── process-as-is.md
│   ├── process-to-be.md
│   ├── stakeholders.md
│   └── push-log.json
│
├── tech/                       # DEV sở hữu
│   ├── tech-spec.md
│   ├── plan.md
│   ├── todo.md
│   └── diagrams/
│
├── test/                       # QA sở hữu
│   ├── fixtures/               # data-grounding.json và các test data khác
│   ├── checklist.md
│   ├── {issueKey}.feature
│   ├── steps/                  # code automation
│   └── result/                 # kết quả chạy test
│       ├── junit.xml
│       ├── report.html
│       ├── report.md
│       ├── summary.md
│       ├── test-output.log
│       ├── coverage/
│       └── screenshots/
│
└── trace/                      # meta-cross-validation
    ├── matrix.md               # traceability matrix
    └── gaps.md                 # gap truy vết (KHÁC spec/gap-analysis.md của BA)
```

### 2. Sprint Workspace

Cấu trúc cho Scrum Master persona:

```
/project-root/workspace/sprint/
├── tech/                       # Kế hoạch kỹ thuật
│   └── sprint-plan.md          # Sprint planning output
│
└── trace/                      # Báo cáo & truy vết
    ├── daily-standup-report.md
    ├── blockers-triage.md
    └── sprint-retrospective-report.md
```

### Vì sao phẳng

| Nguyên tắc                                     | Hệ quả                                                                                             |
|------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `{issueKey}` chỉ xuất hiện 1 lần               | Không còn `.../qa-test-design/{issueKey}/features/{issueKey}-checklist.md`                         |
| Tên file không lặp tên thư mục cha             | `spec/user-stories.md`, không phải `docs/user-stories/{issueKey}-user-stories.md`                  |
| Không thư mục nào trùng tên ở 2 nhánh          | `test/result/` (kết quả test) vs `trace/` (báo cáo truy vết) — trước đây cả hai đều tên `reports/` |
| Thư mục đặt theo persona, không theo tên skill | Đổi tên skill `qa-test-design` không làm chết đường dẫn                                            |

## Đơn vị công việc không có issueKey

Một số skill chạy được mà không có Jira issue. Khi đó **định danh của đơn vị công việc đóng
vai trò issueKey** — không bao giờ được rơi về gốc repo:

| Skill                      | Đơn vị công việc              | Đường dẫn                                                     |
|----------------------------|-------------------------------|---------------------------------------------------------------|
| `qa-code2spec`             | Tên file/module               | `/project-root/workspace/{tên_file}/spec/final.md`            |
| `ba-stakeholder-interview` | Tên project/feature dạng slug | `/project-root/workspace/{project-slug}/spec/stakeholders.md` |
| `cr-review-code-and-quality`| Tên branch/module hoặc `code-review` | `/project-root/workspace/{slug}/trace/code-review-report.md` |
| `webperf-core-vitals`      | Tên page slug hoặc `webperf`  | `/project-root/workspace/{slug}/trace/webperf-report.md`      |
| `security-code-audit`      | Tên project slug hoặc `security` | `/project-root/workspace/{slug}/trace/security-audit-report.md` |

**Slug hoá:** viết thường, bỏ dấu tiếng Việt, thay khoảng trắng bằng `-`
(VD: `"Mobile Trading App"` → `mobile-trading-app`).

> ⚠️ **CẤM TUYỆT ĐỐI:** Không bao giờ tạo thư mục `reports/`, `docs/`, `output/` ở gốc repo của bất kỳ dự án nào. Mọi báo cáo trace/audit/review đều BẮT BUỘC nằm trong thư mục `workspace/` theo cấu trúc trên.

---

## Kiểm chứng

`npm run validate:paths` quét mọi SKILL.md, command, và agent file: bất kỳ nhắc đến một
artifact root per-issue nào (`source/`, `spec/`, `tech/`, `test/`, `trace/`) mà thiếu tiền
tố `/project-root/workspace/{issueKey}/` đều bị phát hiện. Validator cũng chặn mọi tên thư mục
của layout cũ (`specs/imports`, `specs/refine`, `tests/qa-test-design`, `docs/user-stories`…).

Đổi quy ước = sửa `scripts/validate-artifact-paths.js` **và** mọi file bị chặn trong cùng một commit.

## Xem thêm

- `.claude/rules/autonomy-contract.md` — cổng dừng/chạy tiếp
- `.claude/rules/git-workflow.md` — cổng commit/merge
