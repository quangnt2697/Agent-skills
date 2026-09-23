# CONTEXT — Agent Skills Workspace

Đây là **domain glossary** chuẩn hóa thuật ngữ cho workspace `agent-skills`.
Agent đọc file này một lần mỗi session để giảm token giải thích lại các khái niệm.

---

## Thuật ngữ Cốt lõi (Core Glossary)

### Persona & Vai trò

| Thuật ngữ | Định nghĩa | Tránh nhầm với |
|---|---|---|
| **BA / PO** | Business Analyst / Product Owner — phân tích nghiệp vụ, viết spec | DEV (không viết code) |
| **DEV** | Software Developer — viết app code, tech-spec, unit test | QA (không viết automation test e2e) |
| **QA / SDET** | QA Engineer / Software Dev in Test — thiết kế test, viết automation | DEV (không viết app code) |
| **CR** | Code Reviewer — review code đa chiều trước khi merge | QA (CR không viết test) |
| **SM** | Scrum Master — điều phối Sprint, standup, retrospective | BA/PO (SM không viết spec) |

### Artifacts & File Chuẩn

| Thuật ngữ | Định nghĩa | Vị trí |
|---|---|---|
| **final.md** (`*-final.md`) | Business Spec — output duy nhất của BA, input của DEV & QA | `workspace/{issueKey}/spec/` |
| **tech-spec** | Technical Specification — output của DEV, dựa trên final.md | `workspace/{issueKey}/tech/` |
| **checklist.md** | Checklist kiểm thử thực thi — output Giai đoạn 1 của qa-test-design | `workspace/{issueKey}/test/` |
| **{issueKey}.feature** | Kịch bản BDD Gherkin — output Giai đoạn 2 của qa-test-design | `workspace/{issueKey}/test/` |
| **test-output.log** | Full log của Pytest — KHÔNG hiển thị trong chat, user tự mở xem | `workspace/{issueKey}/test/result/` |
| **report.md** | Báo cáo tổng hợp Passed/Failed — output của qa-run-test | `workspace/{issueKey}/test/result/` |
| **Checkpoint** | Snapshot context phiên làm việc — output của meta-session-checkpoint | `.checkpoints/` |

### Workflow Terminology

| Thuật ngữ | Định nghĩa |
|---|---|
| **issueKey** | Mã Jira ticket (VD: `STK-101`, `CORE-42`) — định danh duy nhất cho mọi artifact |
| **Pipeline** | Chuỗi skill thực thi tuần tự: BA → DEV → QA hoặc BA → QA |
| **Always-on** | Rule tự động áp dụng 100% mà không cần lệnh kích hoạt (xem AGENTS.md §4.1, §4.2) |
| **Skill** | File `SKILL.md` trong thư mục `plugins/*/skills/*/` — hướng dẫn thực thi một tác vụ cụ thể |
| **Plugin** | Bundle `skills/ + agents/ + commands/` theo nhóm chức năng (ba-po, qa, dev, code-reviewer...) |
| **Subagent** | Agent chuyên biệt được spawn để thực thi một persona cụ thể |
| **Confidence Level** | Điểm tự tin 0-100% của agent về output: `confidence = (completeness*0.6) + (certainty*0.4)` |
| **Self-fix Loop** | Vòng tự sửa lỗi tối đa 3 lần khi test fail hoặc build fail trước khi báo user |

### Domain Chứng khoán & Fintech (KRX)

| Thuật ngữ | Định nghĩa |
|---|---|
| **HOSE / HNX / UPCoM** | 3 sàn chứng khoán Việt Nam — mỗi sàn có biên độ giá khác nhau |
| **issueKey chứng khoán** ≠ **Jira issueKey** | `STK-101` là Jira key; `VND`, `VIC` là mã chứng khoán — KHÔNG nhầm |
| **Tick size** | Bước giá tối thiểu theo sàn và khoảng giá — BẮT BUỘC dùng Decimal, cấm float |
| **Sức mua khả dụng** | Giá trị mua được tại thời điểm kiểm tra — race condition nếu dùng check-then-act |
| **v3 / v2** | Phiên bản bảng TimescaleDB — ưu tiên v3, fallback v2 khi query dữ liệu test |
| **MDDS** | Market Data Distribution System — pipeline phân phối dữ liệu thị trường KRX |

### Tích hợp & Hạ tầng

| Thuật ngữ | Định nghĩa |
|---|---|
| **MCP** | Model Context Protocol — giao thức kết nối agent với công cụ ngoài (Jira, GitLab, DB...) |
| **n8n** | Workflow automation engine chạy local — fast-path thay thế MCP cho một số tác vụ |
| **Squash TM** | Test Management tool — đồng bộ `.feature` files qua `qa-squash-push` |
| **Metabase UAT** | Nguồn dữ liệu kiểm thử chứng khoán chuẩn — BẮT BUỘC dùng, cấm hardcode giá |
| **n8n Fast-Path** | Ưu tiên 1: n8n → Ưu tiên 2: MCP Tool → Ưu tiên 3: curl/shell fallback |

### Quy ước Comment Code

| Convention | Ngữ cảnh | Ý nghĩa |
|---|---|---|
| `# ponytail: <lý do>` | App code (Python/Go/TS) | Đơn giản hóa có chủ đích — đủ dùng, không over-engineer |
| `# test-intent: <mục tiêu>` | Test code (Pytest/Playwright) | Ghi rõ mục tiêu kiểm thử — thay cho comment "# test case X" |
| `# simplify: <lý do>` | Test code | Gộp/rút gọn test có chủ đích, ghi rõ tradeoff |
| `# boundary: <giá trị>` | Test data | Đánh dấu giá trị biên BVA — phân biệt TRONG/TAI/VUOT hạn mức |
| `<!-- TODO: {vấn đề} -->` | Mọi file | Ghi chú vấn đề phụ phát sinh — không dừng xử lý (Focus Protocol) |

---

## Quan hệ Giữa Các Thành phần

```
Jira Issue (issueKey)
  └─► BA: ba-spec / ba-refine → final.md
         ├─► DEV: dev-spec-driven-development → tech-spec → app code
         └─► QA: qa-test-design → checklist.md + .feature
                    └─► qa-auto-design → test code (Pytest/Playwright)
                              └─► qa-run-test → test-output.log + report.md
                                        └─► (optional) qa-squash-push → Squash TM
```

---

## ADR (Architecture Decision Records)

Các quyết định kiến trúc quan trọng được lưu tại `docs/architecture/`:
- [n8n-integration-strategy.md](docs/architecture/n8n-integration-strategy.md) — 3-Tier fallback strategy
- [mcp-overview.md](docs/architecture/mcp-overview.md) — MCP server mapping
- [gitlab-mcp-strategy.md](docs/architecture/gitlab-mcp-strategy.md) — GitLab boundary rules
