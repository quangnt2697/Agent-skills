# Đánh Giá Kỹ Năng (Skill Evals)

Cách kho lưu trữ này đo lường xem các kỹ năng (skills) có thực sự hoạt động hiệu quả hay không: chúng **kích hoạt đúng lúc** khi cần, **tách biệt rõ ràng** với nhau, và **định hình hành vi của agent** đúng như mỗi kỹ năng cam kết.

## Tiền Lệ & Phương Pháp Áp Dụng

Hiện chưa có một tiêu chuẩn cộng đồng duy nhất nào cho việc đánh giá các kỹ năng `SKILL.md`, nhưng có hai hướng tiếp cận dẫn đầu:

- **skill-creator v2 của Anthropic** định nghĩa một file `evals.json` cho từng kỹ năng (`prompt` + `expectations[]`, được chấm điểm từ lịch sử hội thoại transcript) kết hợp kiểm thử độ chính xác kích hoạt (trigger-accuracy) của phần mô tả (`description`) trước các câu lệnh mẫu. Chúng ta áp dụng [schema `evals.json`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) cho tầng đánh giá hành vi (behavioral tier) và bổ sung thêm trường tùy chọn `kind` để phân loại sản phẩm đầu ra cần chấm điểm.
- **Superpowers** (obra) kiểm thử kỹ năng bằng bash + `claude -p` + bộ dữ liệu mẫu (prompt fixtures) và các script chấm điểm. Bộ chạy kiểm thử hành vi của chúng ta tuân theo cùng mô hình `claude` headless, với tiêu chí chấm điểm lấy từ `expectations[]`.

Điểm mà cả hai công cụ trên chưa cung cấp là một phép kiểm tra **tất định (deterministic), an toàn cho CI** đối với một *danh mục gồm nhiều kỹ năng* — liệu phần mô tả (`description`) của mỗi kỹ năng có chứa đúng từ vựng mà người dùng thực tế hay gõ không, và liệu mô tả của hai kỹ năng có bị trùng lặp/va chạm nhau không? Đó chính là **Tầng 2 (Tier 2)** bên dưới — phần đóng góp bổ sung của kho lưu trữ này.

## Ba Tầng Đánh Giá (The Three Tiers)

| Tầng | Nội dung kiểm tra | Thời điểm chạy | Chi phí |
|---|---|---|---|
| **1. Cấu trúc (Structural)** | YAML Frontmatter, cách đặt tên, các mục bắt buộc, tính đồng bộ command | Tự động trong CI (`validate-skills.js`, `validate-commands.js`) | Miễn phí |
| **2. Kích hoạt & Định tuyến (Trigger & Routing)** | Prompt tích cực (`positive`) xếp kỹ năng vào top-k; prompt tiêu cực (`negative`) không xếp hạng nhất; không có hai mô tả nào quá giống nhau | Tự động trong CI (`run-evals.js`) | Miễn phí |
| **3. Hành vi (Behavioral)** | Agent thực thi theo kỹ năng và thỏa mãn toàn bộ các tiêu chí `expectations[]` | Chạy theo yêu cầu (`run-evals.js --behavioral`) | Tốn token LLM |

Tầng 2 là một **phép xấp xỉ từ vựng** cho bộ định tuyến (sử dụng thuật toán TF-IDF có rút gọn từ gốc trên các `description`). Nó không đánh giá ngữ nghĩa sâu — đó là nhiệm vụ của Tầng 3 — nhưng bắt cực kỳ hiệu quả hai lỗi phổ biến nhất trong thực tế: mô tả kỹ năng thiếu từ khóa người dùng hay gọi (âm tính giả — false negative), và mô tả quá chung chung lấn át kỹ năng đúng (dương tính giả — false positive). Khi Tầng 2 báo lỗi, thông thường hướng xử lý đúng là *cải thiện `description` trong `SKILL.md`*, chứ không phải sửa bài test eval.

## Cách Chạy Kiểm Thử

```bash
# Tầng 2 — tất định, chạy tự động trong CI và npm test
node scripts/evals/run-evals.js
node scripts/evals/run-evals.js --min-rank1 90  # kiểm tra ngưỡng tỷ lệ xếp hạng 1 tối thiểu

# Tầng 3 — kiểm thử hành vi qua claude headless và chấm điểm tự động
node scripts/evals/run-evals.js --behavioral qa-test-design            # có tiêu tốn token
node scripts/evals/run-evals.js --behavioral qa-test-design --dry-run  # chỉ in kế hoạch thực thi
```

Tầng 3 hỗ trợ hai loại sản phẩm hành vi (`kind`):
- `execution` (mặc định): Mỗi bài eval chạy trong một kho git tạm thời (throwaway git repo), dữ liệu đầu vào thực tế từ `files[]` được sao chép từ `evals/fixtures/` và commit làm mốc nền (baseline), sau đó bộ chấm điểm (grader) đánh giá toàn bộ nhật ký thực thi `--output-format stream-json --verbose`, bao gồm cả các lệnh gọi công cụ (tool calls).
- `dialogue`: Dành riêng cho các kỹ năng mà sản phẩm bàn giao chính là cuộc hội thoại tương tác (ví dụ phỏng vấn `ba-interview-me`); không yêu cầu fixture, và bộ chấm điểm đánh giá trực tiếp các lượt phản hồi của agent mà không bắt buộc phải sửa file hay chạy lệnh hệ thống. Việc khai báo `dialogue` phải đúng bản chất kỹ năng, không được lạm dụng để né kiểm tra thực thi.

Trình thực thi (executor) chạy với chế độ cấp quyền tường minh (`--permission-mode acceptEdits` kèm danh sách công cụ được phê duyệt trước) để các bài eval dạng `execution` có thể thực sự chỉnh sửa file, chạy lệnh, kiểm tra diff và tạo commit. Nhật ký thực thi (traces) được đóng khung như dữ liệu cần thẩm định trong prompt chấm điểm và truyền qua `stdin` (vì trace có thể nặng hàng megabyte, truyền qua tham số dòng lệnh `argv` sẽ vượt giới hạn của hệ điều hành). Các lời gọi executor và grader đều có giới hạn thời gian (timeout), và kết quả chấm điểm được xác thực định dạng JSON trước khi ghi vào `evals/results/` (đã được gitignore).

## Định Dạng File Eval Case

Mỗi kỹ năng có một file định nghĩa riêng tại: `evals/cases/<skill-name>.json`.

```json
{
  "skill_name": "qa-test-design",
  "trigger": {
    "positive": [
      { "prompt": "Thiết kế checklist kiểm thử và kịch bản Gherkin cho ticket G3PTP-123", "top_k": 3 }
    ],
    "negative": [
      { "prompt": "Viết code automation Playwright từ file feature đã có", "owner": "qa-auto-design" }
    ]
  },
  "evals": [
    {
      "id": 1,
      "kind": "execution",
      "prompt": "Thiết kế bộ test case đầy đủ từ file đặc tả final.md.",
      "expected_output": "File checklist.md và {issueKey}.feature ánh xạ đầy đủ các mã BR/AC",
      "files": [
        "qa-test-design"
      ],
      "expectations": [
        "Tạo file checklist.md bao phủ các phân vùng tương đương và giá trị biên",
        "Tạo file .feature đúng cú pháp Gherkin và gắn tag truy vết",
        "Không tự bịa đặt giá trị chứng khoán nằm ngoài biên độ trần/sàn"
      ]
    }
  ]
}
```

- `evals[]` sử dụng schema cốt lõi (`id`, `prompt`, `expected_output`, `files[]` tùy chọn, `expectations[]`) cộng với trường `kind` (`execution` hoặc `dialogue`, mặc định là `execution`). Các bài eval dạng `execution` bắt buộc phải khai báo `files[]` không rỗng (đường dẫn tương đối tính từ `evals/fixtures/`). `expectations` là các mệnh đề có thể kiểm chứng được mà bộ chấm điểm dùng để đối chiếu với kết quả thực thi.
- `trigger` là phần kiểm tra định tuyến của kho lưu trữ này:
  - `positive`: Các câu yêu cầu thực tế của người dùng cần được định tuyến về đúng kỹ năng này (`top_k` mặc định là 3; có thể siết chặt thành 1 đối với câu lệnh đặc trưng nhất của kỹ năng).
  - `negative`: Các câu yêu cầu thuộc về một kỹ năng *khác*; kỹ năng hiện tại không được phép xếp hạng nhất cho các câu này. Hãy khai báo tên kỹ năng sở hữu thực sự vào trường `owner`: bộ chạy kiểm thử sẽ xác minh rằng `owner` **xếp hạng cao hơn** kỹ năng hiện tại, biến bài kiểm tra phủ định thành phép đối chiếu định tuyến theo cặp thực chất.

**Mẹo viết prompt kích hoạt tốt:** Hãy diễn đạt tự nhiên theo đúng cách người dùng thực tế hay gõ lệnh; tuyệt đối không copy-paste nguyên văn câu `description` trong `SKILL.md` vào bài test (làm vậy là tự đánh lừa bộ đo lường). Nếu một câu yêu cầu thực tế không thể lọt vào top đầu vì `description` thiếu từ khóa tương ứng, đó là phát hiện có giá trị — hãy bổ sung từ khóa đó vào `description` và `trigger` của kỹ năng.

## Quy Tắc Khi Thêm Kỹ Năng Mới

Mọi kỹ năng trong hệ thống đều bắt buộc phải có file eval đi kèm. Khi bạn thêm `plugins/<plugin>/skills/<name>/`, hãy tạo `evals/cases/<name>.json` với tối thiểu:
- **3 positive triggers** (câu lệnh kích hoạt đúng)
- **2 negative triggers** (câu lệnh phân biệt với kỹ năng lân cận)
- **1 behavioral eval** (kịch bản đánh giá hành vi)

Việc thiếu file case, thiếu số lượng trigger tối thiểu, khai báo sai `kind`, hoặc đường dẫn fixture không tồn tại đều sẽ bị chặn tự động bởi cổng kiểm định CI (`npm test`).

## Các Chỉ Số Cần Theo Dõi

Khi chạy Tầng 2 (`npm run evals`), hệ thống sẽ in ra chỉ số **trigger rank-1 rate** (tỷ lệ phần trăm các câu prompt `positive` xếp kỹ năng đích ở vị trí số 1 tuyệt đối). Hệ thống hiện áp dụng ngưỡng sàn cứng `--min-rank1 90` (tối thiểu 90%). Hãy nâng ngưỡng này lên khi chất lượng mô tả kỹ năng ngày càng tốt hơn; tuyệt đối không hạ ngưỡng xuống chỉ để vượt qua bài test. Ngoài ra, bộ kiểm tra va chạm từ vựng sẽ báo lỗi đỏ nếu có hai kỹ năng bất kỳ trùng lặp mô tả từ **≥ 75%** trở lên và cảnh báo vàng ở mức **≥ 50%**.
