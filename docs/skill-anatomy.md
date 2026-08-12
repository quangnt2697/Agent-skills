# Cấu Phẫu Kỹ Năng (Skill Anatomy)

Tài liệu này mô tả cấu trúc và định dạng của các file kỹ năng (skill files) trong `agent-skills`. Hãy sử dụng tài liệu này như một bản hướng dẫn khi bạn muốn đóng góp thêm kỹ năng mới hoặc muốn hiểu các kỹ năng hiện có.

## Vị Trí Lưu Trữ File

Mỗi skill nằm trong một thư mục riêng biệt bên trong thư mục `skills/`:

```
skills/
  skill-name/
    SKILL.md           # Bắt buộc: Định nghĩa cốt lõi của skill
    scripts/           # Tùy chọn: Các script thực thi hỗ trợ cho workflow
    references/        # Tùy chọn: Các tài liệu tham khảo riêng của skill
    supporting-file.md # Tùy chọn: Tài liệu hỗ trợ được load khi cần
```

`SKILL.md` là file duy nhất bắt buộc phải có. Chỉ thêm `scripts/` hoặc `references/` khi skill thực sự cần chúng, và bỏ qua hoàn toàn đối với các skill đơn giản.

## Định Dạng Của SKILL.md

### Frontmatter (Bắt Buộc)

```yaml
---
name: skill-name-with-hyphens
description: Hướng dẫn agent cách [thực hiện task/workflow]. Sử dụng khi [điều kiện kích hoạt cụ thể].
---
```

**Quy tắc:**
- `name`: Viết thường, phân tách bằng dấu gạch ngang (hyphen-separated). Phải khớp với tên thư mục.
- `description`: Bắt đầu bằng việc mô tả skill làm gì ở ngôi thứ ba, sau đó liệt kê một hoặc nhiều điều kiện "Sử dụng khi" rõ ràng. Phải bao gồm cả *làm gì* (what) và *khi nào* (when). Độ dài tối đa 1024 ký tự.

**Tại sao điều này quan trọng:** Các agents khám phá các skills bằng cách đọc phần description. Description này được tiêm (injected) vào system prompt, vì vậy nó phải nói cho agent biết cả hai thứ: skill này cung cấp cái gì và khi nào nên kích hoạt nó. Tuyệt đối không tóm tắt workflow vào đây — nếu phần description có chứa các bước quy trình, agent có thể sẽ chỉ làm theo bản tóm tắt đó mà không thèm đọc nội dung chi tiết của skill.

### Các Phần Tiêu Chuẩn (Recommended Pattern)

Phần frontmatter ở trên là hợp đồng bắt buộc. Bố cục các phần (sections) dưới đây là mẫu khuyên dùng, không phải một template cứng nhắc: các tiêu đề tương đương đều có thể chấp nhận được miễn là chúng phục vụ cùng một mục đích một cách rõ ràng.

```markdown
# Tên Skill

## Tổng Quan (Overview)
Một đến hai câu giải thích skill này làm gì và tại sao nó quan trọng.

## Khi Nào Sử Dụng (When to Use)
- Danh sách (bullet list) các điều kiện kích hoạt (dấu hiệu nhận biết, loại task)
- Khi nào KHÔNG nên sử dụng (ngoại lệ)

## [Quy Trình Cốt Lõi / The Workflow / Steps]
Luồng công việc chính, được chia thành các bước hoặc các giai đoạn được đánh số.
Bao gồm code ví dụ ở những chỗ cần thiết.
Sử dụng lưu đồ (flowcharts bằng ASCII) ở những điểm cần đưa ra quyết định.

## [Các Kỹ Thuật Cụ Thể / Patterns]
Hướng dẫn chi tiết cho từng kịch bản cụ thể.
Code ví dụ, templates, cấu hình.

## Những Sự Ngụy Biện Phổ Biến (Common Rationalizations)
| Sự Ngụy Biện | Thực Tế |
|---|---|
| Lời bào chữa mà agent dùng để lách bước | Tại sao lời bào chữa đó là sai |

## Cờ Đỏ (Red Flags)
- Các hành vi cho thấy skill đang bị vi phạm
- Những điều cần chú ý khi review

## Xác Minh (Verification)
Sau khi hoàn thành quy trình của skill, cần xác nhận:
- [ ] Checklist các tiêu chí hoàn thành
- [ ] Các yêu cầu về bằng chứng (evidence)
```

## Mục Đích Của Các Phần

### Tổng Quan (Overview)
Lời giới thiệu ngắn gọn (elevator pitch) cho skill. Phải trả lời được câu hỏi: Skill này làm gì, và tại sao agent nên làm theo nó?

### Khi Nào Sử Dụng (When to Use)
Giúp agents và con người quyết định xem skill này có áp dụng cho task hiện tại hay không. Phải bao gồm cả các trigger tích cực ("Sử dụng khi X") và các trường hợp loại trừ tiêu cực ("KHÔNG dùng cho Y").

### Quy Trình Cốt Lõi (Core Process)
Trái tim của skill. Đây là luồng công việc từng bước một (step-by-step) mà agent phải tuân theo. Phải cụ thể và có thể hành động được (actionable) — không đưa ra lời khuyên chung chung.

**Tốt:** "Chạy `npm test` và xác minh rằng tất cả các tests đều pass"
**Kém:** "Đảm bảo rằng các tests hoạt động tốt"

### Những Sự Ngụy Biện Phổ Biến (Common Rationalizations)
Đặc điểm khác biệt nhất của một skill được thiết kế tốt. Đây là những lời bào chữa mà agents thường dùng để bỏ qua các bước quan trọng, đi kèm với các phản bác. Chúng ngăn chặn việc agent tự viện cớ (rationalize) để trốn tránh việc tuân thủ quy trình.

Hãy nghĩ về tất cả những lần agent từng nói "Tôi sẽ thêm tests sau" hoặc "Cái này đơn giản quá không cần viết spec" — hãy đưa chúng vào đây kèm theo một lập luận phản bác thực tế.

### Cờ Đỏ (Red Flags)
Các dấu hiệu có thể quan sát được cho thấy skill đang bị vi phạm. Hữu ích trong quá trình code review và tự giám sát (self-monitoring).

### Xác Minh (Verification)
Các tiêu chí hoàn thành (exit criteria). Một checklist mà agent sử dụng để xác nhận rằng quy trình của skill đã hoàn tất. Mỗi hộp kiểm (checkbox) đều phải có thể xác minh được bằng bằng chứng (test output, build result, screenshot, v.v.).

## Các File Hỗ Trợ (Supporting Files)

Chỉ tạo các file hỗ trợ khi:
- Tài liệu tham khảo vượt quá 100 dòng (hãy giữ cho file SKILL.md chính tập trung)
- Cần các công cụ code hoặc scripts
- Checklists đủ dài để biện minh cho việc tách ra file riêng

Nên giữ các patterns và nguyên tắc ngay bên trong (inline) nếu chúng dưới 50 dòng.

Nếu một skill không cần các helpers dạng thực thi được (runnable helpers), đừng tạo một thư mục `scripts/` trống trơn chỉ để làm cho giống các skills khác. Các thư mục trống tạo ra sự nhiễu loạn mà không thay đổi cách skill hoạt động.

## Tài Liệu Tham Khảo Dùng Chung (Shared References)

Các checklists được sử dụng bởi nhiều hơn một skill — như testing, security, performance, accessibility, definition-of-done — sẽ được lưu ở thư mục `references/` ở gốc kho lưu trữ, cố ý *không* nằm trong bất kỳ thư mục skill nào.

Đây là một sự lựa chọn thiết kế ở cấp độ gói (pack-level). Mặc dù chuẩn Agent Skills mô tả mỗi skill như một thư mục tự chứa độc lập (self-contained), nhưng có nhiều skills ở đây cùng trỏ đến chung một checklists. Nếu để chung vào một thư mục, chúng ta sẽ phải đối mặt với một trong hai lựa chọn: sao chép (copy) checklist đó vào mọi skill sử dụng nó, hoặc chọn một skill để "sở hữu" nó và bắt các skills khác chọc ngang sang thư mục đó. Cả hai cách này đều sẽ bị sai lệch (drift) theo thời gian. Một bản copy duy nhất ở thư mục gốc (repo-root) sẽ luôn giữ được vai trò là nguồn sự thật duy nhất (source of truth).

Sự đánh đổi ở đây là tính di động (portability): việc cài đặt toàn bộ repo (như đối với Claude Code marketplace plugin) sẽ mang theo cả thư mục `references/`, nhưng nếu cài đặt trên từng skill bằng cách chỉ copy thư mục `skills/<name>/`, bản sao ở thư mục gốc sẽ bị bỏ lại, và các links tham chiếu sẽ bị gãy. Lỗ hổng này đang được theo dõi ở [#361](https://github.com/addyosmani/agent-skills/issues/361).

Quy ước hiện tại: các tài liệu chỉ dùng cho đúng một skill thì để dưới dạng file hỗ trợ (supporting file) bên trong thư mục của skill đó; các tài liệu dùng chung cho nhiều skills thì để ở `references/`.

## Hiệu Suất Ngữ Cảnh (Context Efficiency)

Các skills chỉ được load khi cần (load on demand): chỉ có tên và description của skill nằm trong ngữ cảnh lúc khởi động. Toàn bộ `SKILL.md` chỉ được load khi một agent quyết định rằng skill đó liên quan. Để giữ cho việc tải này tiết kiệm chi phí:

- **Giữ `SKILL.md` dưới 500 dòng.** Chuyển các tài liệu tham khảo chi tiết vào các file hỗ trợ.
- **Viết descriptions thật cụ thể.** Một description chính xác giúp agent kích hoạt skill đúng lúc và bỏ qua nó khi không cần thiết.
- **Sử dụng tiết lộ lũy tiến (progressive disclosure).** Trỏ tham chiếu tới các file hỗ trợ, và chúng chỉ được đọc khi workflow chạy đến bước cần thiết.
- **Ưu tiên scripts hơn là inline code.** Việc thực thi một script không tốn tài nguyên context; chỉ có đầu ra (output) của nó mới tốn. Các block code inline (inline code blocks) sẽ bị tính phí token mỗi khi được load.
- **Giữ các file references ở độ sâu 1 tầng.** Dẫn link trực tiếp từ `SKILL.md` tới các file hỗ trợ thay vì đi qua (chaining) các tài liệu trung gian.

## Yêu Cầu Về Script

Khi một skill cung cấp các helpers dạng thực thi được dưới thư mục `scripts/`, mỗi script phải tuân theo các quy ước sau:

- Dùng `#!/bin/bash` shebang.
- Dùng `set -e` để có hành vi fail-fast (lỗi là dừng).
- Ghi các messages trạng thái vào stderr: `echo "Message" >&2`.
- Ghi output để máy đọc được (JSON) vào stdout.
- Bao gồm một cleanup trap (bẫy dọn dẹp) cho các file tạm.
- Tham chiếu đường dẫn script theo dạng `skills/<skill-name>/scripts/<script>.sh` (tương đối so với repo).

## Nguyên Tắc Viết (Writing Principles)

1. **Quy trình quan trọng hơn kiến thức (Process over knowledge).** Skills là các workflows, không phải tài liệu tham khảo. Cần các bước, không phải các sự thật.
2. **Cụ thể thay vì chung chung.** "Chạy `npm test`" ăn đứt "hãy xác minh xem các tests có hoạt động không".
3. **Bằng chứng quan trọng hơn sự giả định.** Mọi hộp kiểm xác minh (verification checkbox) đều cần có bằng chứng.
4. **Chống ngụy biện (Anti-rationalization).** Bất kỳ bước nào mà agent có xu hướng muốn bỏ qua đều cần phải có một lập luận phản bác trong bảng rationalizations.
5. **Tiết lộ lũy tiến (Progressive disclosure).** SKILL.md chính là điểm nhập (entry point). Các file hỗ trợ chỉ được load khi cần.
6. **Ý thức về Token (Token-conscious).** Mọi section đều phải biện minh được sự có mặt của nó. Nếu xóa nó đi mà không làm thay đổi hành vi của agent, hãy xóa nó.

## Quy Ước Đặt Tên (Naming Conventions)

- Thư mục skill: `viet-thuong-va-gach-ngang` (lowercase-hyphen-separated)
- File skill: `SKILL.md` (luôn luôn viết hoa toàn bộ)
- Các file hỗ trợ: `viet-thuong-va-gach-ngang.md`
- Các tài liệu dùng chung: lưu trữ ở thư mục `references/` ở gốc repo, không nằm trong các thư mục skill (xem [Tài Liệu Tham Khảo Dùng Chung](#shared-references) để hiểu tại sao).
- Các tài liệu dùng riêng cho skill: một tài liệu hỗ trợ duy nhất có thể được thả lỏng dưới dạng file nằm trực tiếp trong thư mục skill (mục `Các file hỗ trợ` ở bên trên); khi có nhiều docs liên quan cùng đi liền với skill, quy ước đang thành hình cho các skill tự chứa (self-contained) và có thể phân phối được là nhóm chúng lại trong một thư mục `references/` nằm bên trong thư mục skill đó, để bản thân skill tự mang theo các tài liệu hỗ trợ của chính nó.

## Tham Chiếu Chéo Giữa Các Skill (Cross-Skill References)

Tham chiếu các skills khác bằng tên:

```markdown
Hãy làm theo skill `dev-test-driven-development` để viết tests.
Nếu build bị vỡ, hãy dùng skill `dev-debugging`.
```

Đừng sao chép lặp lại (duplicate) nội dung giữa các skills — hãy tham chiếu và liên kết (link) tới chúng.

## Bắt Buộc vs. Khuyên Dùng (Required vs Recommended)

Bắt buộc:

- Phải có file `skills/<skill-name>/SKILL.md`
- Phải có frontmatter YAML hợp lệ với trường `name` và `description`
- Phải có một description mô tả được cả hai ý: skill này làm gì và khi nào nên dùng nó

Khuyên dùng:

- Luồng các sections tiêu chuẩn như đã minh họa ở trên
- Các tiêu đề (headings) tương đương như `Cách Nó Hoạt Động (How It Works)`, `Quy Trình Cốt Lõi (Core Process)`, hay `Quy Trình (Workflow)` khi chúng có cảm giác tự nhiên hơn cho skill đó
- Chỉ dùng các file hỗ trợ (Supporting files) khi chúng thực sự giúp giữ cho `SKILL.md` chính được tập trung
