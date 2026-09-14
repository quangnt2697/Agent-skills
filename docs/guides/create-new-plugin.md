# Hướng Dẫn Tạo Plugin Mới Theo Chuẩn Progressive Disclosure

Tài liệu này là cẩm nang chuẩn mực (Standard Operating Procedure) hướng dẫn từng bước tạo mới một **Plugin** và các **Skills** bên trong hệ thống `agent-skills`, tuân thủ nghiêm ngặt phương pháp **Progressive Disclosure (Tiết lộ tăng dần 3 tầng)** nhằm tối ưu hóa chi phí token, giảm độ trễ và triệt tiêu hallucination.

---

## I. CẤU TRÚC CHUẨN CỦA MỘT PLUGIN

Mỗi plugin đại diện cho một vai trò chuyên môn (Persona) hoặc một domain nghiệp vụ độc lập, được tổ chức theo cây thư mục sau:

```text
plugins/<plugin-name>/
├── plugin.json                          # Bắt buộc: Metadata định danh plugin
├── agents/                              # Bắt buộc: Định nghĩa Persona Subagent
│   └── <role-name>.md                   # System prompt, boundaries, composition của subagent
├── commands/                            # Tùy chọn: Slash commands (.toml) cho Gemini/Antigravity
│   └── <command-name>.toml
├── .claude/commands/                    # Tùy chọn: Slash commands (.md) cho Claude Code
│   └── <command-name>.md
└── skills/                              # Bắt buộc: Các kỹ năng nghiệp vụ theo chuẩn 3 tầng
    └── <skill-name>/                    # Tên kỹ năng dạng kebab-case
        ├── SKILL.md                     # Level 1 (Metadata) & Level 2 (Body tinh gọn + Few-shot)
        ├── assets/                      # Level 3: File mẫu, template, scripts thực thi ngay
        │   ├── template.md
        │   ├── script_helper.py
        │   └── mock_data.json
        └── references/                  # Level 3: Tài liệu logic nghiệp vụ, cẩm nang, checklist
            ├── rules_and_guidelines.md
            ├── workflow_details.md
            └── verification_checklist.md
```

---

## II. NGUYÊN LÝ THIẾT KẾ 3 TẦNG (PROGRESSIVE DISCLOSURE)

Mỗi kỹ năng (`skill`) bên trong Plugin **BẮT BUỘC** phải tuân thủ cơ chế Lazy Loading 3 tầng:

| Tầng | Tên gọi | File/Thư mục | Khi nào nạp vào Agent? | Nội dung chứa | Giới hạn dung lượng |
|:---:|:---|:---|:---|:---|:---:|
| **Level 1** | **Metadata** | Frontmatter của `SKILL.md` | Khi người dùng gửi câu hỏi bất kỳ (Router quét) | `name`, `description` (1-2 câu), `trigger` rõ ràng | < 15 dòng |
| **Level 2** | **Body** | Phần thân của `SKILL.md` | Khi Agent khớp nhu cầu với Skill này | Khi nào dùng, Quy trình tóm tắt, Links Level 3, Few-shot | 50 – 100 dòng |
| **Level 3** | **Chi tiết thực thi** | `assets/` và `references/` | Chỉ khi Agent bước vào tác vụ cụ thể cần dữ liệu | Mẫu thực thi, scripts, quy chuẩn chuyên sâu | Tùy nhu cầu |

### Quy tắc Phân biệt Rạch ròi `assets/` vs `references/`:
* **`assets/` (Công cụ dùng ngay):** Mẫu khung sườn để điền (templates), script thực thi (.py, .js, .sh), file dữ liệu mẫu (.json, .csv, .sql). Agent nạp vào để copy-paste hoặc chạy trực tiếp mà không cần phân tích tri thức.
* **`references/` (Tài liệu nghiên cứu):** Cẩm nang kỹ thuật, tài liệu nghiệp vụ, ma trận logic, checklist kiểm định (.md, .txt). Agent đọc để suy luận và áp dụng vào bối cảnh.
* **NGHIÊM CẤM:** Không tự ý đặt tên thư mục phi chuẩn như `templates/`, `scripts/`, `examples/`, `resources/` bên trong thư mục skill. Tất cả phải được quy về `assets/` hoặc `references/`.

---

## III. QUY TRÌNH 5 BƯỚC TẠO PLUGIN MỚI

### Bước 1: Khởi tạo thư mục và `plugin.json`
Tạo thư mục `plugins/<plugin-name>/` và file `plugin.json` ở gốc plugin:
```json
{
  "name": "agent-skills-<plugin-name>",
  "version": "1.0.0",
  "description": "Mô tả ngắn gọn về vai trò và nhiệm vụ của Plugin"
}
```

---

### Bước 2: Định nghĩa Persona (`agents/<role-name>.md`)
Tạo file persona đại diện cho subagent, xác định rõ ranh giới và kỹ năng sở hữu:
```markdown
---
name: <role-name>
description: Kỹ sư [Vai trò] chuyên về [Lĩnh vực]. Sử dụng khi cần [Nhiệm vụ chính].
---

# Vai trò: [Tên Persona Tiếng Việt]

## 1. Nhiệm Vụ Cốt Lõi
Mô tả 2-3 gạch đầu dòng về trách nhiệm chính của vai trò này.

## 2. Quyền Hạn & Ranh Giới (Boundaries)
- **ĐƯỢC PHÉP:** ...
- **KHÔNG ĐƯỢC PHÉP:** ...

## 3. Danh Sách Kỹ Năng Sở Hữu
- `ten-skill-1`: Mô tả nhiệm vụ.
- `ten-skill-2`: Mô tả nhiệm vụ.
```

---

### Bước 3: Tạo Kỹ Năng (Skills) Theo Chuẩn 3 Tầng

Tạo thư mục `plugins/<plugin-name>/skills/<skill-name>/` với 3 thành phần:

#### 3.1. Soạn thảo `SKILL.md` (Level 1 + Level 2)
```markdown
---
name: <skill-name>
description: <1-2 câu: Làm cái gì và giải quyết bài toán gì. Không viết lan man>.
trigger: <Điều kiện kích hoạt cụ thể khi user yêu cầu X, chạy lệnh /cmd, hoặc gửi file Y>.
---

# [Tên Kỹ Năng Tiếng Việt]

## 1. Khi nào dùng?
- Trường hợp áp dụng 1
- Trường hợp áp dụng 2
- **Khi KHÔNG sử dụng:** Liệt kê các trường hợp ngoại lệ (trỏ tới skill khác phù hợp hơn).

## 2. Quy trình thực hiện từng bước
Tóm tắt ngắn gọn 3 - 5 bước cốt lõi:
- **Bước 1 (Khảo sát/Đầu vào):** Tiếp nhận dữ liệu, kiểm tra điều kiện tiên quyết.
- **Bước 2 (Xử lý cốt lõi):** Các hành động chính của skill (đọc tài liệu Level 3 nếu cần).
- **Bước 3 (Định dạng & Thẩm định):** Kiểm tra đầu ra trước khi bàn giao.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mẫu thực thi (assets/):**
  - `assets/template_output.md`: Khung mẫu chuẩn để điền nội dung.
  - `assets/helper_script.py`: Script hỗ trợ tự động hóa (nếu có).
- 📖 **Tài liệu nghiên cứu & Hướng dẫn (references/):**
  - `references/detailed_workflow.md`: Hướng dẫn chi tiết từng trường hợp.
  - `references/verification_checklist.md`: Checklist nghiệm thu và cờ đỏ (Red Flags).

## 4. Ví dụ mẫu (Few-shot Example)
Bắt buộc có ít nhất 1 ví dụ định dạng mong muốn:
- **Input:** `<Mô tả yêu cầu đầu vào từ người dùng>`
- **Output:**
  ```markdown
  <Định dạng kết quả đầu ra chuẩn mực>
  ```
```

#### 3.2. Tạo tài nguyên `assets/` (Level 3 - Tools & Templates)
- Đặt các template (.md, .json, .yaml), script hỗ trợ (.py, .js, .sh) hoặc dữ liệu mock vào đây.
- Các file này có thể được copy-paste hoặc chạy trực tiếp bằng lệnh terminal.

#### 3.3. Tạo tài nguyên `references/` (Level 3 - Knowledge & Rules)
- Đặt tài liệu hướng dẫn chuyên sâu, danh mục lỗi, checklist nghiệm thu, quy tắc miền nghiệp vụ vào đây.
- **Tuyệt đối không nhồi nhét cẩm nang dài hàng trăm dòng vào `SKILL.md`**, hãy đưa vào `references/` và đặt link trỏ tới từ `SKILL.md`.

---

### Bước 4: Thiết lập Slash Commands (Lệnh tắt)

#### 4.1. Cho Claude Code (`plugins/<plugin-name>/.claude/commands/<cmd-name>.md`):
```markdown
---
description: Mô tả lệnh thực thi
---

Khi người dùng gọi lệnh này, hãy kích hoạt persona `<role-name>` và chạy tuần tự các kỹ năng:
1. `skill-1`
2. `skill-2`
```

#### 4.2. Cho Antigravity / Gemini CLI (`plugins/<plugin-name>/commands/<cmd-name>.toml`):
```toml
description = "Mô tả lệnh thực thi"
prompt = """
Kích hoạt vai trò <role-name> và thực hiện quy trình với $ARGUMENTS...
"""
```

---

### Bước 5: Đăng Ký và Kiểm Định Toàn Vẹn (Verification)

1. **Đăng ký vào Hệ Thống:**
   - Cập nhật persona và kỹ năng mới vào ma trận vai trò trong [AGENTS.md](../../AGENTS.md).
   - Cập nhật danh sách lệnh và kỹ năng vào [CLAUDE.md](../../CLAUDE.md) và [README.md](../../README.md).
2. **Kiểm Tra Tính Toàn Vẹn Của Markdown Links:**
   - Đảm bảo tất cả liên kết tương đối `[tên](đường_dẫn)` từ `SKILL.md` tới `assets/` và `references/` đều tồn tại thật.
   - Chạy script kiểm tra link:
     ```bash
     python3 -c "
     import os, re, glob
     for md in glob.glob('plugins/<plugin-name>/**/*.md', recursive=True):
         d = os.path.dirname(md)
         for text, link in re.findall(r'\[([^\]]+)\]\(([^)]+)\)', open(md).read()):
             if not link.startswith(('http', '#')):
                 target = os.path.normpath(os.path.join(d, link.split('#')[0]))
                 assert os.path.exists(target), f'Broken link in {md}: {link}'
     print('100% Links valid!')
     "
     ```
3. **Kiểm Tra Checklist Triển Khai:**
   - [ ] `plugin.json` hợp lệ.
   - [ ] `SKILL.md` có đầy đủ Level 1 frontmatter (`name`, `description`, `trigger`).
   - [ ] `SKILL.md` không vượt quá 120 dòng (giữ tinh gọn Level 2).
   - [ ] Có ít nhất 1 ví dụ mẫu Few-shot Example.
   - [ ] Phân định rõ `assets/` và `references/` (không có thư mục phi chuẩn).
