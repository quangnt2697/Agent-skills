# Cấu Phẫu Kỹ Năng (Skill Anatomy)

Tài liệu này mô tả cấu trúc và định dạng chuẩn mực của các file kỹ năng (`SKILL.md`) trong `agent-skills` theo nguyên lý **Progressive Disclosure (Lazy Loading 3 tầng)** và các quy tắc kiểm định của Gate 1 (`npm run validate:skills`).

## Vị Trí Lưu Trữ & Cấu Trúc Thư Mục

Mỗi skill nằm trong một thư mục riêng biệt bên trong `plugins/<plugin-name>/skills/<skill-name>/`:

```text
plugins/<plugin-name>/skills/<skill-name>/
  ├── SKILL.md       # Bắt buộc: Level 1 (Metadata) & Level 2 (Body tinh gọn 50–120 dòng)
  ├── assets/        # Tùy chọn: Level 3 (Templates khung sườn, scripts thực thi .js/.py/.sh, HTML shells, dữ liệu mẫu)
  └── references/    # Tùy chọn: Level 3 (Tài liệu logic, cẩm nang nghiệp vụ, checklists kiểm định, từ điển JSON)
```

- **`assets/` (Công cụ & Mẫu thực thi dùng ngay):** Chứa file mẫu (`.md`, `.json`, `.html`), script tự động (`.js`, `.py`, `.sh`), dữ liệu mock. Agent nạp vào để copy-paste hoặc chạy lệnh trực tiếp.
- **`references/` (Tài liệu nghiên cứu & Quy chuẩn):** Chứa kiến thức nền tảng, cẩm nang chi tiết, checklist kiểm định, từ điển linh kiện hoặc quy chuẩn nghiệp vụ (`.md`, `.json`). Agent đọc để suy luận logic khi cần.
- **Quy tắc vàng:** Tuyệt đối không để tài liệu tham chiếu dài hàng trăm dòng trong `SKILL.md`. Luôn tách sang `references/` để giữ `SKILL.md` tinh gọn (dưới 120 dòng). Không tạo các thư mục phi chuẩn như `templates/`, `scripts/`, `examples/`, `resources/` bên trong thư mục skill.

---

## Định Dạng Của `SKILL.md`

### Level 1: YAML Frontmatter (Bắt Buộc)

```yaml
---
name: skill-name-with-hyphens
description: 1-2 câu ngắn gọn mô tả skill làm gì ở ngôi thứ ba và khi nào KHÔNG dùng.
trigger: Điều kiện kích hoạt cụ thể (khi user yêu cầu X, chạy lệnh /cmd, hoặc cung cấp tệp Y).
disable-auto-invoke: true # Chỉ bật khi skill có tác dụng phụ ghi ra hệ thống ngoài (Jira, Squash, Git, Mattermost)
---
```

**Quy tắc:**
- `name`: Kebab-case tiếng Anh viết thường, trùng khớp 100% với tên thư mục chứa skill.
- `description`: Ngắn gọn 1–2 câu ở ngôi thứ ba, nêu rõ *Làm cái gì*, *Giải quyết bài toán gì* và *Phân biệt với skill lân cận*. Chứa các từ khóa thực tế người dùng hay gõ để bộ định tuyến (`npm run evals`) đạt tỷ lệ xếp hạng 1 ≥ 90%.
- `trigger`: Khai báo tách biệt điều kiện kích hoạt cụ thể để Router nhận diện nhanh và chuẩn xác.

### Level 2: Body Tinh Gọn (Recommended Pattern)

Phần thân của `SKILL.md` chỉ được nạp vào ngữ cảnh khi Agent đã khớp nhu cầu với Skill đó. Độ dài lý tưởng từ **50 đến 120 dòng**:

```markdown
# [Tên Kỹ Năng Tiếng Việt] (`<skill-name>`)

> 🛡️ **Grounding (grounding-contract):** Mọi thông tin, assertion, endpoint, mã lỗi phải lấy từ nguồn thực tế (Jira/Spec/DB/Code); thiếu thì gắn `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG tự suy diễn. Chỉ công bố hoàn thành khi có bằng chứng thực (file tồn tại, lệnh exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG. Cấm sao chép số liệu từ ví dụ mẫu.

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** `<Tham số hoặc đường dẫn file đầu vào trong workspace/issues/{issueKey}/>`.
- **Bằng chứng hoàn thành:** `<File đầu ra tồn tại thực tế trên đĩa và script validator trả về exit code 0>`.

## 1. Khi nào dùng?
- Danh sách các trường hợp áp dụng cụ thể.
- **Khi KHÔNG sử dụng:** Các ngoại lệ và chỉ dẫn trỏ sang skill khác phù hợp hơn.

## 2. Quy trình thực hiện từng bước
Tóm tắt ngắn gọn 3 - 5 bước hành động chính:
- **Giai đoạn 1 (Khảo sát & Đầu vào):** Tiếp nhận dữ liệu, kiểm tra điều kiện tiên quyết.
- **Giai đoạn 2 (Xử lý cốt lõi):** Các bước xử lý chính (trỏ sang tài liệu Level 3 khi cần).
- **Giai đoạn 3 (Kiểm định & Bàn giao):** Chạy validator và ghi kết quả vào đúng 1 trong 5 thư mục chuẩn `workspace/issues/{issueKey}/{source,spec,tech,test,trace}/`.

## 3. Tài nguyên mở rộng (Level 3 - Chỉ mở khi cần)
- 🛠️ **Công cụ & Mẫu thực thi (assets/):**
  - [template-output.md](assets/template-output.md): Khung mẫu chuẩn.
  - [helper-script.js](assets/helper-script.js): Script hỗ trợ tự động hóa.
- 📖 **Tài liệu nghiên cứu & Hướng dẫn (references/):**
  - [detailed-guide.md](references/detailed-guide.md): Cẩm nang hướng dẫn chuyên sâu.
  - [verification-checklist.md](references/verification-checklist.md): Checklist xác minh.

## 4. Ví dụ mẫu (Few-shot Example)
> ⚠️ **LƯU Ý MINH HỌA:** Dữ liệu dưới đây là ví dụ định dạng (formatting template). TUYỆT ĐỐI KHÔNG sao chép số liệu mẫu vào kết quả thực tế.

- **Input:** `<Yêu cầu mẫu>`
- **Output:**
  ```markdown
  <Kết quả chuẩn mực mong đợi>
  ```
```

---

## Mục Đích Của Các Phần Trọng Tâm

### Khối Grounding & Input Bắt Buộc / Bằng Chứng Hoàn Thành
Chốt chặn chống ảo giác (Anti-Hallucination) bắt buộc trên toàn bộ các skills thực thi. Giúp agent biết rõ: nếu thiếu đầu vào thì phải dừng và hỏi, không được tự bịa dữ liệu; chỉ được báo cáo hoàn thành khi file đầu ra thực sự tồn tại trên đĩa và vượt qua script kiểm định.

### Khi Nào Sử Dụng & Khi KHÔNG Sử Dụng (Scope & Negative Scope)
Giúp cả agent và người dùng phân định ranh giới rạch ròi giữa các skills gần nhau (ví dụ: khi nào dùng `ba-spec` vs khi nào dùng `ba-refine`; khi nào dùng `qa-test-design` vs `qa-auto-design`).

### Quy Trình Cốt Lõi (Core Process)
Trái tim của skill — luồng công việc từng bước cụ thể và có thể hành động ngay (actionable):
- **Tốt:** *"Chạy `node scripts/validators/validate-ba-refine.js workspace/issues/{issueKey}/spec/refined.md` và đảm bảo exit code = 0"*
- **Kém:** *"Đảm bảo rằng tài liệu đặc tả có chất lượng tốt"*

### Chống Ngụy Biện (Anti-Rationalization) & Cờ Đỏ (Red Flags)
Ngăn chặn việc agent tự viện cớ để bỏ qua các bước bắt buộc (như tự ý dựng mockup khi chưa chạy `extract-asis-ui.js`, hoặc tự bịa giá chứng khoán khi chưa truy vấn TimescaleDB).

---

## Tài Liệu Tham Khảo Dùng Chung (`references/` Gốc) & Đóng Gói Plugin Độc Lập

Các tài liệu tri thức dùng chung cho nhiều plugins — chẳng hạn như cẩm nang nghiệp vụ chứng khoán KRX [`references/securities-domain-rules.md`](../../references/securities-domain-rules.md) và từ điển schema [`references/timescale-schema.md`](../../references/timescale-schema.md) — được lưu tại thư mục `references/` ở gốc kho lưu trữ để đảm bảo **Single Source of Truth** (không bị trùng lặp hay lệch phiên bản giữa `ba-po`, `qa` và `fintech-data`).

Khi bạn cần xuất một plugin độc lập để mang sang cài đặt cho một repo microservice khác, hãy chạy công cụ đóng gói tự động:
```bash
npm run plugin:export -- -p qa --tar
```
Script `scripts/release/export-plugin.js` sẽ tự động đóng gói kèm các tài liệu dùng chung trong `references/` và viết lại các đường dẫn tương đối để plugin xuất ra hoạt động độc lập 100% mà không có bất kỳ liên kết gãy nào.

---

## Hiệu Suất Ngữ Cảnh (Context Efficiency) & Quy Ước Script

1. **Giữ `SKILL.md` tinh gọn (50–120 dòng):** Được kiểm soát ngân sách tự động qua Gate 9 (`npm run validate:tokens`).
2. **Ưu tiên gọi CLI Script trong `assets/` hoặc `scripts/` hơn là nhúng code dài trong Markdown:** Việc chạy một script Node.js/Bash chỉ tiêu tốn token ở phần kết quả in ra (`stdout`), trong khi nhúng hàng trăm dòng code vào `SKILL.md` sẽ làm tốn token ở mọi lần nạp skill.
3. **Quy ước viết Script thực thi (`assets/*.sh`, `assets/*.js`):**
   - Với Bash script: dùng `#!/usr/bin/env bash` và `set -euo pipefail` để dừng ngay khi gặp lỗi (fail-fast).
   - Luôn kiểm tra tham số đầu vào và trả về mã thoát (`exit code`) khác 0 khi thất bại để Agent nhận diện chính xác theo nguyên tắc *Evidence-or-Stop*.
   - Mọi đường dẫn tới script trong `SKILL.md` đều được kiểm tra sự tồn tại tự động bởi Gate 5 (`npm run validate:refs`).

---

## Tham Chiếu Chéo Giữa Các Kỹ Năng (Cross-Skill References)

Khi một kỹ năng cần phối hợp với kỹ năng khác trong hệ sinh thái, hãy gọi đúng tên kỹ năng đó thay vì sao chép lại hướng dẫn:

```markdown
- Nếu phát hiện yêu cầu còn điểm mù 🔴 Critical, hãy kích hoạt skill `ba-interview-me`.
- Nếu tính năng có thay đổi màn hình giao diện (WEB/APP), hãy ủy quyền cho skill `ba-design-mockup`.
- Sau khi hoàn tất `spec/final.md`, bàn giao sang skill `qa-test-design` để thiết kế Checklist và BDD Gherkin.
```

---

## Checklist Kiểm Định Bắt Buộc Cho Mọi `SKILL.md`

- [ ] File nằm tại `plugins/<plugin-name>/skills/<skill-name>/SKILL.md`
- [ ] YAML frontmatter hợp lệ gồm `name`, `description`, `trigger` (và `disable-auto-invoke: true` nếu có tác dụng phụ bên ngoài)
- [ ] Có khối trích dẫn `Grounding (grounding-contract)`
- [ ] Có mục `## Input Bắt Buộc & Bằng Chứng Hoàn Thành`
- [ ] Có mục phân định rõ `Khi KHÔNG sử dụng`
- [ ] Mọi đường dẫn output tuân thủ đúng 5 thư mục chuẩn `workspace/issues/{issueKey}/{source,spec,tech,test,trace}/`
- [ ] Mục Ví dụ mẫu (Few-shot) có dòng cảnh báo chống sao chép số liệu giả (*Few-Shot Quarantine*)
- [ ] Có file đánh giá tương ứng tại `evals/cases/<skill-name>.json` và pass 100% khi chạy `npm test`
