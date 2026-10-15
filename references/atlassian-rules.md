# Quy Tắc Tích Hợp Jira & Confluence Dùng Chung (Atlassian Rules)

Tài liệu chuẩn hóa điều kiện truy cập, cấu trúc lưu trữ và bộ lọc định dạng file cho các kỹ năng làm việc với Atlassian (BA, QA, DEV).

---

## 1. Điều kiện Tiên quyết (Authentication)

Agent **BẮT BUỘC TỰ ĐỘNG** đọc file `.env` để lấy các biến môi trường mà **KHÔNG CẦN HỎI** người dùng.

**Nguồn chính:** File `.env` nằm **cố định** trong thư mục plugin `agent-skills` (`PLUGIN_DIR`). File này luôn tồn tại sẵn, không cần copy vào từng project.

**Override tùy chọn:** Nếu project hiện tại (`PROJECT_ROOT`) cũng có file `.env` → các biến trùng tên sẽ **ghi đè** giá trị từ plugin.

```bash
# Nguồn chính: .env trong plugin dir (luôn có sẵn)
PLUGIN_DIR="${AGENT_SKILLS_HOME:-.}"
[ -f "${PLUGIN_DIR}/.env" ] && source "${PLUGIN_DIR}/.env"

# Override: nếu project hiện tại có .env riêng
for p in "${CLAUDE_PROJECT_DIR:-.}/.env" "${CLAUDE_PROJECT_DIR:-.}/../.env"; do
  [ -f "$p" ] && source "$p" && break
done
```

Các biến bắt buộc:
```bash
ATLASSIAN_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

Chỉ báo lỗi khi không tìm thấy `.env` ở cả plugin dir lẫn project root, hoặc file có nhưng thiếu biến — khi đó dừng theo **trường hợp 2** của `autonomy-contract.md`. Tuyệt đối không dừng lại để xin phép truy cập file.

---

## 2. Cấu trúc Thư mục & Quy ước Tên File

Mọi artifact thu thập từ Atlassian được phân tầng theo cấu trúc:

```text
workspace/issues/{issueKey}/
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

| Nhóm | Định dạng | Hành động |
|---|---|---|
| 📄 Văn bản | `.pdf, .doc, .docx, .txt, .md, .rtf` | ✅ Tải + Đọc nội dung |
| 📊 Bảng tính | `.xlsx, .xls, .csv` | ✅ Tải + Đọc nội dung |
| 🖼️ Hình ảnh | `.png, .jpg, .jpeg, .gif, .svg, .webp` | ✅ Tải (wireframe, mockup, flowchart, ERD) |
| 📐 Sơ đồ | `.drawio, .vsdx, .figma` | ✅ Tải (giữ nguyên format) |
| 💻 Code/Config | `.json, .yaml, .xml, .sql` | ✅ Tải + Đọc nội dung |
| 🎬 Video | `.mp4, .mov, .avi` | ❌ Bỏ qua (quá nặng) |
| 📦 Nén | `.zip, .rar, .7z, .tar.gz` | ❌ Bỏ qua (không đọc trực tiếp được) |
