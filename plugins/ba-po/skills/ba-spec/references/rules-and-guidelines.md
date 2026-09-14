# Quy Tắc, Hướng Dẫn & Đánh Giá (ba-spec)

## 1. Điều kiện Tiên quyết (Authentication)

Agent **BẮT BUỘC TỰ ĐỘNG** đọc file `.env` để lấy các biến môi trường mà **KHÔNG CẦN HỎI** người dùng.

**Nguồn chính:** File `.env` nằm **cố định** trong thư mục plugin `agent-skills` (`PLUGIN_DIR`). File này luôn tồn tại sẵn, không cần copy vào từng project.

**Override tùy chọn:** Nếu project hiện tại (`PROJECT_ROOT`) cũng có file `.env` → các biến trùng tên sẽ **ghi đè** giá trị từ plugin.

```bash
# Nguồn chính: .env trong plugin dir (luôn có sẵn)
PLUGIN_DIR="<đường dẫn tới thư mục plugin agent-skills>"
source "${PLUGIN_DIR}/.env"

# Override: nếu project hiện tại có .env riêng
for p in "${CLAUDE_PROJECT_DIR:-.}/.env" "${CLAUDE_PROJECT_DIR:-.}/../.env"; do
  [ -f "$p" ] && source "$p" && break
done
```

Các biến cần có:
```
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

Chỉ báo lỗi khi không tìm thấy `.env` ở cả plugin dir lẫn project root, hoặc file có nhưng thiếu biến — khi đó dừng theo **trường hợp 2** của `.claude/rules/autonomy-contract.md`. Tuyệt đối không dừng lại để xin phép truy cập file.

---

## 2. Cấu trúc Thư mục & Quy ước Tên File

Cả hai luồng (Jira và Confluence) đều sinh ra **cùng một cấu trúc** — chỉ khác khoá của đơn vị công việc: luồng Jira dùng `{issueKey}`, luồng Confluence dùng `{keyword}`.

```text
/project-root/workspace/{issueKey}/                                  # LUỒNG A — /ba-spec {issueKey}
├── source/
│   ├── {issueKey}.pdf
│   ├── metadata.json
│   └── refs/
│       ├── {tên-slug}-{pageId}.pdf                    # Confluence tham chiếu
│       ├── wireframe-v3.pdf                           # Attachment gốc
│       └── flowchart-order-flow.png                   # Ảnh đính kèm
└── spec/
    └── final.md
```

### Quy ước Đặt tên File
- **Confluence pages:** `{tên-ngắn-gọn-slug}-{pageId}.pdf` (Viết thường, không dấu, cắt tối đa 50 ký tự phần tên).
- **File đính kèm:** Giữ nguyên tên gốc từ Jira/Confluence.

---

## 3. Bộ lọc Định dạng File

| Nhóm           | Định dạng                              | Hành động                                  |
|----------------|----------------------------------------|--------------------------------------------|
| 📄 Văn bản     | `.pdf, .doc, .docx, .txt, .md, .rtf`   | ✅ Tải + Đọc nội dung                      |
| 📊 Bảng tính   | `.xls, .xlsx, .csv`                    | ✅ Tải + Trích xuất data                   |
| 🖼️ Hình ảnh    | `.png, .jpg, .jpeg, .gif, .svg, .webp` | ✅ Tải (wireframe, mockup, flowchart, ERD) |
| 📐 Sơ đồ       | `.drawio, .vsdx, .figma`               | ✅ Tải (giữ nguyên format)                 |
| 💻 Code/Config | `.json, .yaml, .xml, .sql`             | ✅ Tải + Đọc nội dung                      |
| 🎬 Video       | `.mp4, .mov, .avi`                     | ❌ Bỏ qua (quá nặng)                       |
| 📦 Nén         | `.zip, .rar, .7z, .tar.gz`             | ❌ Bỏ qua (không đọc trực tiếp được)       |

---

## 4. Các Biện hộ Thường gặp (Rationalizations)

| Lý do biện hộ | Thực tế |
|---|---|
| "Jira mô tả đủ rồi, khỏi cần scan Confluence tham chiếu" | Phần lớn business rule chi tiết nằm ở trang thiết kế được link. Bỏ scan là bỏ sót nguồn chính. |
| "Ảnh wireframe/flowchart không đọc được, bỏ qua" | Wireframe và flowchart là nơi luồng được định nghĩa rõ nhất. Tải về và đọc. |
| "Có 3 chỗ mơ hồ nhưng tôi đoán được, viết luôn cho nhanh" | Đoán sai sẽ nhân lên thành test sai. Đây là lý do Phase 4 tồn tại. |
| "Confidence mới 78%, cứ ghi vào rồi chạy tiếp" | Đúng — nhưng phải ghi gap vào mục *Giả định & Rủi ro*, không tự lấp đầy chỗ trống. |
| "File `final.md` đã tồn tại, hỏi user có ghi đè không" | Tự động ghi đè theo `autonomy-contract.md`. |
| "Task này đơn giản, không cần đủ 13 section" | Phải ghi "Không áp dụng" kèm lý do, không được bỏ trống. |
| "Copy nguyên mô tả Jira vào final.md cho nhanh" | `final.md` là kết quả phân tích, không phải bản sao chép. |

---

## 5. Dấu hiệu Cảnh báo (Red Flags)

- File `final.md` không có mục Acceptance Criteria, hoặc AC viết dạng mô tả thay vì checklist rule.
- Mục Open Questions rỗng ở một task phức tạp — chưa phân tích đủ sâu.
- Business Rule viết bằng tính từ mơ hồ: "hợp lệ", "nhanh", "phù hợp".
- Không có mục *Giả định & Rủi ro* dù quá trình phân tích có chỗ phải đoán.
- Chỉ đọc file PDF của Jira, bỏ qua toàn bộ file trong `source/refs/`.
- Task liên quan đến chứng khoán/đặt lệnh/bảng giá nhưng không tham chiếu `securities-domain-rules.md`, tự bịa quy tắc phiên, thiếu điều kiện Random End, hoặc thiếu mã lỗi ORS.

---

## 6. Xác minh (Verification Checklist)

Trước khi bàn giao spec cho QA hoặc DEV:
- [ ] File tồn tại tại `/project-root/workspace/{issueKey}/spec/final.md` và không rỗng.
- [ ] Đủ 13 section — section không áp dụng phải ghi "Không áp dụng".
- [ ] Mỗi tài liệu đã tải trong `source/` và `source/refs/` được trích dẫn ít nhất một lần.
- [ ] Mỗi Acceptance Criteria là một mệnh đề Pass/Fail duy nhất.
- [ ] Câu hỏi 🔴 Critical đã được trả lời qua Phase 4, hoặc được nêu rõ là điểm dừng theo trường hợp 3 của `autonomy-contract.md`.
- [ ] Gap chưa giải quyết được ghi vào mục *Giả định & Rủi ro* kèm mức ảnh hưởng.
- [ ] **Nếu là bài toán chứng khoán:** Đã đối chiếu và tuân thủ các quy tắc trong `securities-domain-rules.md`.

---

## 7. Sau khi hoàn thành (Next Steps)

**BẮT BUỘC:** Không dừng lại hỏi user muốn tiếp tục với pipeline nào. Tự động chuyển sang kỹ năng `qa-test-design` để bắt đầu làm Checklist, và chạy tiếp xuyên suốt theo `.claude/rules/autonomy-contract.md` — bao gồm cả cổng Giai đoạn 1 → Giai đoạn 2 của `qa-test-design`.

> Chỉ dừng khi rơi vào danh sách đóng 5 trường hợp của `autonomy-contract.md`, hoặc khi user chạy với `--step`.
