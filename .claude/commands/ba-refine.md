---
name: ba-refine
description: Download Jira task có ý tưởng thô/mơ hồ, scan tài liệu liên quan, mài giũa thành spec chi tiết rõ ràng, sau đó push lại lên Jira theo cấu trúc chuẩn
---

# Command: ba-refine

Download Jira task → Scan & approve tài liệu → Refine idea (divergent → convergent → sharpen) → Push to Jira

## Usage

```bash
/ba-refine {issueKey}
```

## Arguments

- `{issueKey}` (required) — Jira issue key (VD: PROJ-123, G3PTP-456)

## Examples

```bash
/ba-refine PROJ-123
/ba-refine G3PTP-456
```

## Workflow

```
Phase 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)
    - Quét Jira/Confluence tìm tài liệu liên quan
    - Đối chiếu với file đã có trong project
    - Trình danh sách cho user duyệt
    - CHỜ user approve → Tải file thiếu
    ↓
Phase 1: Understand & Expand (Divergent)
    - Đọc TẤT CẢ tài liệu (Jira + Confluence + attachments)
    - HMW statement
    - Clarify core components (AskUserQuestion)
    - Generate 5-8 variations
    ↓
Phase 2: Evaluate & Converge
    - Cluster into 2-3 directions
    - Stress-test each direction
    - Surface hidden assumptions
    ↓
Phase 3: Sharpen & Structure
    - User chooses final direction
    - Create refined spec markdown
    ↓
Phase 4: Push to Jira
    - Update Jira description
    - Add comment + label
    - Return Jira URL
```

## Key Features

- **Scan trước, tải sau:** Quét Jira/Confluence → trình danh sách → user approve → tải
- **Multi-source reading:** Đọc Jira PDF + Confluence pages + attachments
- **Cache-aware:** Nhận diện file đã tải, tái sử dụng
- **Ideation frameworks:** 7 lăng kính (Inversion, 10x, Expert Lens, etc.)
- **Stress-test rubric:** User Value, Feasibility, Differentiation, Risk

## Output

- **Local file:** `workspace/{issueKey}/specs/refine/jira/{issueKey}/{issueKey}-refined.md`
- **Local references:** `workspace/{issueKey}/specs/refine/jira/{issueKey}/source/references/` (Confluence + attachments)
- **Jira:** Updated description (KHÔNG comment, KHÔNG label)
- **Confidence level:** ≥90% required for handoff

## Next Steps

After refinement, suggest:
- `/qa-test-design {issueKey}` — Design test cases
- `/tech-spec {issueKey}` — Write tech spec
- `/e2e-delivery {issueKey}` — Full delivery pipeline

## Related

- `/ba-spec` — Import & analyze Jira (for clear requirements)
- `/ba-interview` — Interview stakeholders
- `/ba-gap-analysis` — Find gaps in requirements

## Requirements

`.env` file với Jira credentials:
```
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```
