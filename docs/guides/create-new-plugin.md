# Hướng Dẫn Tạo Plugin & Kỹ Năng Mới Theo Chuẩn Progressive Disclosure

Tài liệu này là quy trình chuẩn (Standard Operating Procedure) hướng dẫn từng bước tạo mới một **Plugin** và các **Skills** bên trong hệ thống `agent-skills`, tuân thủ nghiêm ngặt kiến trúc **Progressive Disclosure (Lazy Loading 3 tầng)** và **9 cổng kiểm định tự động (`npm test`)** nhằm tối ưu hóa chi phí token, giảm độ trễ và triệt tiêu ảo giác (Anti-Hallucination).

---

## I. CẤU TRÚC CHUẨN CỦA MỘT PLUGIN

Mỗi plugin đại diện cho một vai trò chuyên môn (Persona) hoặc một miền nghiệp vụ độc lập, được tổ chức theo cây thư mục sau:

```text
plugins/<plugin-name>/
├── plugin.json                          # Bắt buộc: Metadata định danh plugin (version đồng bộ toàn repo)
├── agents/                              # Bắt buộc: Định nghĩa Persona Subagent
│   └── <role-name>.md                   # System prompt, boundaries, danh sách kỹ năng và composition
├── commands/                            # Tùy chọn: Nguồn sự thật duy nhất (SSoT) cho Slash commands (.toml)
│   └── <command-name>.toml
├── .claude/commands/                    # Tự động sinh ra qua lệnh `npm run build` (KHÔNG sửa tay)
│   └── <command-name>.md
└── skills/                              # Bắt buộc: Các kỹ năng nghiệp vụ theo chuẩn 3 tầng
    └── <skill-name>/                    # Tên kỹ năng dạng kebab-case
        ├── SKILL.md                     # Level 1 (Metadata) & Level 2 (Body tinh gọn + Grounding + Few-shot)
        ├── assets/                      # Level 3: File mẫu, templates, scripts thực thi (.js, .py, .sh), HTML shells
        │   ├── template.md
        │   └── helper-script.js
        └── references/                  # Level 3: Tài liệu quy tắc nghiệp vụ, cẩm nang, checklists, từ điển JSON
            ├── rules-and-guidelines.md
            └── verification-checklist.md
```

---

## II. NGUYÊN LÝ THIẾT KẾ 3 TẦNG (PROGRESSIVE DISCLOSURE)

Mỗi kỹ năng (`skill`) bên trong Plugin **BẮT BUỘC** phải tuân thủ cơ chế Lazy Loading 3 tầng:

| Tầng | Tên gọi | File/Thư mục | Khi nào nạp vào Agent? | Nội dung chứa | Giới hạn dung lượng |
|:---:|:---|:---|:---|:---|:---:|
| **Level 1** | **Metadata** | Frontmatter của `SKILL.md` | Luôn nạp trong bộ định tuyến (Router) | `name`, `description` (1–2 câu ngôi thứ ba), `trigger` rõ ràng | < 15 dòng |
| **Level 2** | **Body** | Phần thân của `SKILL.md` | Khi Agent khớp nhu cầu với Skill này | Khối `Grounding`, `Input Bắt Buộc`, Quy trình tóm tắt, Links Level 3, Few-shot | 50 – 120 dòng |
| **Level 3** | **Chi tiết thực thi** | `assets/` và `references/` | Chỉ mở khi Agent chạy tới bước cần dùng | Mẫu thực thi, scripts CLI, quy chuẩn chuyên sâu | Tùy nhu cầu |

### Quy tắc Phân biệt Rạch ròi `assets/` vs `references/`:
- **`assets/` (Công cụ & Mẫu dùng ngay):** Mẫu khung sườn để điền (templates), script thực thi (`.js`, `.py`, `.sh`), HTML harnesses/shells, dữ liệu mẫu. Agent gọi chạy hoặc sao chép khung sườn trực tiếp.
- **`references/` (Tài liệu nghiên cứu & Từ điển):** Cẩm nang nghiệp vụ, ma trận logic, checklist kiểm định (`.md`, `.json`). Agent đọc để tra cứu quy tắc.
- **⛔ NGHIÊM CẤM:** Không tự ý đặt tên thư mục phi chuẩn như `templates/`, `scripts/`, `examples/`, `resources/` bên trong thư mục skill. Tất cả phải quy về `assets/` hoặc `references/`.

---

## III. QUY TRÌNH 5 BƯỚC TẠO PLUGIN / SKILL MỚI

### Bước 1: Khởi tạo nhánh, thư mục và `plugin.json`
1. Kích hoạt Git hooks và tạo nhánh tính năng mới (tuyệt đối không làm việc trực tiếp trên `main`):
   ```bash
   npm run setup:hooks
   git checkout -b feature/<ten-skill-hoac-plugin>
   ```
2. Nếu tạo plugin mới, tạo thư mục `plugins/<plugin-name>/` và file `plugin.json` (version phải khớp với `package.json` gốc để vượt qua Gate 3 `validate:versions`):
   ```json
   {
     "name": "agent-skills-<plugin-name>",
     "version": "1.0.0",
     "description": "Mô tả ngắn gọn về vai trò và nhiệm vụ của Plugin"
   }
   ```

---

### Bước 2: Định nghĩa Persona (`agents/<role-name>.md`)
Tạo hoặc cập nhật file persona đại diện cho subagent, xác định rõ ranh giới và kỹ năng sở hữu:
```markdown
---
name: <role-name>
description: Kỹ sư [Vai trò] chuyên trách [Lĩnh vực]. Sử dụng khi cần [Nhiệm vụ chính].
---

# Vai trò: [Tên Persona Tiếng Việt]

## 1. Nhiệm Vụ Cốt Lõi
Mô tả 2-3 gạch đầu dòng về trách nhiệm chính của vai trò này.

## 2. Quyền Hạn & Ranh Giới (Boundaries)
- **ĐƯỢC PHÉP:** ...
- **KHÔNG ĐƯỢC PHÉP:** ...

## 3. Danh Sách Kỹ Năng Sở Hữu
- `ten-skill-1`: Mô tả nhiệm vụ.

## 4. Composition (Phối hợp Liên Vai Trò)
Nêu rõ đầu vào nhận từ đâu và đầu ra bàn giao cho vai trò nào trong `workspace/issues/{issueKey}/`.
```

---

### Bước 3: Tạo Kỹ Năng (Skills) Chuẩn Gate 1 (`skills/<skill-name>/`)

#### 3.1. Soạn thảo `SKILL.md` (Level 1 + Level 2)
Mọi file `SKILL.md` mới **BẮT BUỘC** có khối `Grounding`, mục `## Input Bắt Buộc & Bằng Chứng Hoàn Thành`, ranh giới `Khi KHÔNG sử dụng`, và cảnh báo *Few-Shot Quarantine* ở mục Ví dụ mẫu:

```markdown
---
name: <skill-name>
description: <1-2 câu ngôi thứ ba: Làm cái gì và giải quyết bài toán gì. Không dùng cho trường hợp ngoại lệ nào>.
trigger: <Điều kiện kích hoạt cụ thể khi user yêu cầu X, chạy lệnh /cmd, hoặc cung cấp file Y>.
---

# [Tên Kỹ Năng Tiếng Việt] (`<skill-name>`)

> 🛡️ **Grounding (grounding-contract):** Mọi thông tin, assertion, endpoint, mã lỗi phải lấy từ nguồn thực tế (Jira/Spec/DB/Code); thiếu thì gắn `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG tự suy diễn. Chỉ công bố hoàn thành khi có bằng chứng thực (file tồn tại, lệnh exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `<Liệt kê tham số hoặc file đầu vào trong workspace/issues/{issueKey}/>`. Nếu thiếu thì dừng và báo rõ.
- **Bằng chứng hoàn thành:** File `<workspace/issues/{issueKey}/...>` tồn tại trên đĩa và script kiểm định trả về exit code 0.

## 1. Khi nào dùng?
- Trường hợp áp dụng 1.
- Trường hợp áp dụng 2.
- **Khi KHÔNG sử dụng:** Liệt kê rõ các trường hợp ngoại lệ (trỏ sang skill khác phù hợp hơn).

## 2. Quy trình thực hiện từng bước
- **Giai đoạn 1 (Khảo sát & Đầu vào):** Kiểm tra điều kiện tiên quyết.
- **Giai đoạn 2 (Xử lý cốt lõi):** Các hành động chính (trỏ sang tài liệu Level 3 khi cần).
- **Giai đoạn 3 (Kiểm định & Bàn giao):** Chạy validator kiểm tra đầu ra và lưu vào đúng 1 trong 5 thư mục chuẩn `workspace/issues/{issueKey}/{source,spec,tech,test,trace}/`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mẫu thực thi (assets/):**
  - [template-output.md](assets/template-output.md): Khung mẫu chuẩn.
- 📖 **Tài liệu nghiên cứu & Hướng dẫn (references/):**
  - [detailed-workflow.md](references/detailed-workflow.md): Hướng dẫn chi tiết.

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây chỉ là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** `<Mô tả yêu cầu đầu vào mẫu>`
- **Output:** `<Định dạng kết quả đầu ra mẫu>`
```

> 📌 **Lưu ý về `disable-auto-invoke: true`:** Nếu skill có tác dụng phụ ghi lên hệ thống bên ngoài (push Jira, push Squash TM, pull/sync Git, gửi Mattermost), bắt buộc thêm dòng `disable-auto-invoke: true` vào YAML frontmatter.

---

### Bước 4: Thiết lập Slash Command (`.toml`) & Biên dịch Tự động

**Nguyên tắc Single Source of Truth:** Bạn **CHỈ** tạo hoặc sửa file `.toml` tại `plugins/<plugin-name>/commands/<cmd-name>.toml`:

```toml
description = "Mô tả ngắn gọn chức năng của lệnh tắt"

prompt = """
# Command: <cmd-name>

Kích hoạt vai trò `<role-name>` và thực hiện kỹ năng `<skill-name>` với tham số $ARGUMENTS...
"""
```

Sau đó chạy lệnh build để hệ thống **tự động sinh ra** file `.claude/commands/<cmd-name>.md` tương ứng (đảm bảo vượt qua Gate 2 `validate:commands`):
```bash
npm run build
```

---

### Bước 5: Tạo Eval Cases, Cập nhật Danh mục & Chạy Kiểm định (`npm test`)

1. **Tạo file đánh giá kỹ năng (`evals/cases/<skill-name>.json`):**
   Mọi skill mới bắt buộc có tối thiểu **3 positive triggers**, **2 negative triggers** (kèm `owner`) và **1 behavioral eval**:
   ```json
   {
     "skill_name": "<skill-name>",
     "trigger": {
       "positive": [
         { "prompt": "Câu yêu cầu thực tế số 1", "top_k": 1 },
         { "prompt": "Câu yêu cầu thực tế số 2", "top_k": 3 },
         { "prompt": "Câu yêu cầu thực tế số 3", "top_k": 3 }
       ],
       "negative": [
         { "prompt": "Câu yêu cầu thuộc về skill khác 1", "owner": "<other-skill-1>" },
         { "prompt": "Câu yêu cầu thuộc về skill khác 2", "owner": "<other-skill-2>" }
       ]
     },
     "evals": [
       {
         "id": 1,
         "kind": "dialogue",
         "prompt": "Kịch bản kiểm thử hành vi của skill",
         "expected_output": "Mô tả kết quả kỳ vọng",
         "expectations": [
           "Tiêu chí kiểm chứng 1",
           "Tiêu chí kiểm chứng 2"
         ]
       }
     ]
   }
   ```
2. **Cập nhật các tài liệu chỉ mục của dự án:**
   - Cập nhật danh sách và số lượng skills trong [CATALOG.md](../../CATALOG.md), [AGENTS.md](../../AGENTS.md), [README.md](../../README.md) và [CLAUDE.md](../../CLAUDE.md).
3. **Chạy toàn bộ 9 cổng kiểm định tự động + Unit Tests + Evals:**
   ```bash
   npm test
   ```
   Tất cả 9 cổng validators (`skills`, `commands`, `versions`, `links`, `refs`, `paths`, `icons`, `nodes`, `tokens`), bộ unit tests và ngưỡng `trigger rank-1 rate ≥ 90%` đều phải báo **PASSED** trước khi commit và merge.
