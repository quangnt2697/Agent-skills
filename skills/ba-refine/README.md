# ba-refine

Mài giũa Jira task có ý tưởng thô/mơ hồ thành spec chi tiết rõ ràng, sau đó push lại lên Jira.

## Khi nào dùng

- Jira task có summary/description quá mơ hồ ("Add export button")
- Requirements chưa rõ, cần brainstorm nhiều hướng đi
- Cần làm sáng tỏ giả định và rủi ro trước khi dev
- Muốn áp dụng creative frameworks (Inversion, 10x scale, etc.)

## Khi nào KHÔNG dùng

- Jira task đã có requirements đầy đủ → Dùng `/ba-spec` thay thế
- Chỉ cần phân tích gaps → Dùng `/ba-gap-analysis`
- Chỉ cần viết User Stories → Dùng `/ba-user-stories`

## Workflow

```
Giai đoạn 0: Scan & Tổng hợp Danh sách (APPROVAL GATE)
    - Quét Jira/Confluence tìm tài liệu liên quan
    - Đối chiếu với file đã có trong project
    - Trình danh sách cho user duyệt
    - CHỜ user approve trước khi tải
    ↓
Giai đoạn 1: Thấu hiểu & Mở rộng (Phân kỳ)
    - Đọc TẤT CẢ file đã tải (Jira PDF + Confluence + attachments)
    - Tái trình bày dưới dạng "Làm sao để..."
    - Làm rõ qua AskUserQuestion (≥90% confidence)
    - Tạo 5-8 biến thể dùng frameworks
    ↓
Giai đoạn 2: Đánh giá & Hội tụ
    - Gom nhóm thành 2-3 hướng đi
    - Thử lửa từng hướng
    - Vạch trần giả định ẩn
    ↓
Giai đoạn 3: Mài sắc & Cấu trúc
    - User chọn hướng
    - Tạo spec có cấu trúc
    - Tính confidence
    ↓
Giai đoạn 4: Đẩy lên Jira
    - Cập nhật description
    - Thêm comment + label
    - Ghi log push history
```

## Usage

```bash
/ba-refine PROJ-123
```

Hoặc:

```
Refine jira task PROJ-456
```

## Output

**Local:**
- `workspace/{issueKey}/spec/refined.md` - Spec đã refine
- `workspace/{issueKey}/source/` - Jira task gốc (PDF + metadata)
- `workspace/{issueKey}/source/refs/` - Confluence pages + attachments
- `workspace/{issueKey}/spec/push-log.json` - Lịch sử push

**Jira:**
- Description updated với structured spec
- Comment ghi nhận refinement
- Label `refined-by-agent` được thêm

## Example

Xem `examples.md` để có ví dụ đầy đủ về một phiên refine chất lượng cao.

## Quality Criteria

- **Confidence ≥90%** trước khi push
- **User Story:** Role cụ thể + Goal + Value
- **Acceptance Criteria:** ≥2 scenarios, Given-When-Then
- **Assumptions:** ≥3 giả định được surface rõ ràng
- **Stress-test:** Đánh giá User Value, Feasibility, Differentiation, Risk

## Integration

Sau khi refine, có thể tiếp tục với:

```bash
/qa-test-design PROJ-123    # Generate tests từ AC
/tech-spec PROJ-123          # Transform thành tech spec
/e2e-delivery PROJ-123       # Full BA → DEV → QA pipeline
```

## Scripts

- `scripts/jira-push-refined-spec.py` - Push refined spec lên Jira

## Reference Files

- `frameworks.md` - Ideation frameworks (Inversion, SCAMPER, etc.)
- `refinement-criteria.md` - Stress-test rubric
- `examples.md` - Example session với high-quality output

## Configuration

Cần `.env` file với:

```bash
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```
