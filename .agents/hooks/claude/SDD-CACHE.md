# Hook Bộ Nhớ Đệm Trích Dẫn (`sdd-cache`)

Bộ nhớ đệm (cache) lưu trữ trích dẫn tài liệu xuyên suốt các phiên làm việc dành cho kỹ năng phát triển dựa trên nguồn chính thống (`dev-source-driven-development`). Giúp bỏ qua các lệnh gọi `WebFetch` trùng lặp mà không làm suy yếu cam kết *"luôn đối chiếu với tài liệu mới nhất"* của kỹ năng.

## Tại Sao Cần Hook Này?

Quy trình phát triển dựa trên tài liệu nguồn yêu cầu truy xuất tài liệu chính thức (official docs) cho mỗi quyết định phụ thuộc vào framework/thư viện. Khi làm việc trên cùng một dự án qua nhiều phiên, agent sẽ phải tải đi tải lại cùng một trang tài liệu. Tuy nhiên, nếu chỉ lưu nội dung vào bộ nhớ cục bộ vô thời hạn thì sẽ vi phạm nguyên tắc cốt lõi — vì tài liệu có thể đã cập nhật mà bản cache cũ không hề hay biết.

Hook này lưu nội dung đã tải xuống ổ đĩa, nhưng **luôn xác thực lại (revalidate) với máy chủ gốc trong mỗi lần tái sử dụng** thông qua tiêu đề HTTP `If-None-Match` / `If-Modified-Since`. Nội dung chỉ được lấy từ bộ nhớ đệm khi máy chủ gốc phản hồi mã `304 Not Modified` — tức là một bước xác minh độ tươi mới thực sự chứ không phải đọc mù từ bộ nhớ cũ.

## Cài Đặt (Setup)

1. Thêm cấu hình hooks vào `.claude/settings.json` (hoặc `.claude/settings.local.json` cho cấu hình cá nhân):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/hooks/claude/sdd-cache-pre.sh\"",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/hooks/claude/sdd-cache-post.sh\"",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

   Biến `${CLAUDE_PROJECT_DIR}` trỏ tới thư mục gốc nơi bạn khởi chạy Claude Code. Đoạn cấu hình trên hoạt động ngay khi các script hook nằm trong cùng dự án. Nếu bạn cài đặt `agent-skills` ở một thư mục dùng chung khác, hãy thay thế đường dẫn bằng đường dẫn tuyệt đối tới từng script.

2. Đảm bảo thư mục `.claude/sdd-cache/` đã được khai báo trong `.gitignore` (đã có sẵn trong kho lưu trữ này).

3. Sử dụng kỹ năng phát triển dựa trên tài liệu nguồn như bình thường. Không cần thay đổi quy trình làm việc của agent — cơ chế cache hoạt động hoàn toàn tự động và trong suốt ở tầng dưới.

## Mô Hình Hoạt Động (Mental Model)

Đây là bộ nhớ đệm tài nguyên HTTP được đánh khóa theo URL (`sha256(url)`). Việc kiểm tra độ tươi mới được ủy quyền cho máy chủ gốc thông qua `ETag` / `Last-Modified`; không dùng thời gian sống cố định (TTL) và không trộn prompt vào khóa cache.

Nội dung được lưu không phải là mã HTML thô — vì công cụ `WebFetch` đã hậu xử lý trang web qua một mô hình ngôn ngữ theo câu lệnh `prompt` của người gọi, nên thứ được lưu lại là kết quả trích xuất của lần đọc đầu tiên trên trang đó. Khóa cache chỉ giữ nguyên theo URL để các phiên làm việc sau có thể tái sử dụng; còn câu `prompt` gốc được lưu kèm dưới dạng siêu dữ liệu (metadata) và hiển thị lại khi trúng cache (cache hit) để agent hiện tại tự đánh giá xem bản tóm tắt trước đó có đủ thông tin mình cần hay không.

## Cơ Chế Xử Lý Chi Tiết

Mỗi URL tương ứng với một bản ghi JSON lưu tại `.claude/sdd-cache/<sha>.json`:

| Sự kiện (Event) | Hành động thực thi |
|---|---|
| `PreToolUse WebFetch` | Nếu đã có bản ghi cache của URL này, gửi một truy vấn `HEAD` kèm header `If-None-Match` / `If-Modified-Since`. Nếu máy chủ trả về `304`, chặn lệnh tải mới và trả nội dung trong cache về cho agent qua luồng `stderr` kèm theo `prompt` gốc. Ngược lại, cho phép `WebFetch` chạy bình thường. |
| `PostToolUse WebFetch` | Thu nhận kết quả trả về, gửi một truy vấn `HEAD` để lấy giá trị `ETag` / `Last-Modified` hiện hành, và lưu cấu trúc `{url, prompt, etag, last_modified, content, fetched_at}` xuống file JSON. |

**Quy tắc đảm bảo độ mới (Freshness rules):**

- Bản ghi chỉ được phục vụ từ cache khi máy chủ gốc xác nhận `304 Not Modified`.
- Các trang web không trả về header `ETag` hoặc `Last-Modified` sẽ **không bao giờ được lưu cache** — vì thiếu bộ kiểm chứng (validator), hook không thể xác minh trang đã thay đổi hay chưa ở các lần gọi sau.
- Khóa cache là `sha256(url)`. Cùng một URL được hỏi với một prompt khác vẫn sẽ chạm vào cùng bản ghi đó; nội dung trả về sẽ hiển thị rõ câu prompt của lần tải đầu tiên để agent quyết định dùng luôn hay chủ động tải lại.

**Những gì Agent nhìn thấy:**

- **Khi trúng cache (Cache hit):** Lệnh `WebFetch` bị chặn thông qua mã thoát `exit code 2`. Claude Code chuyển tiếp luồng `stderr` của hook về cho agent dưới dạng thông báo công cụ — đây là tín hiệu chủ đích báo hiệu đã có dữ liệu trong cache chứ không phải lỗi hệ thống. Dữ liệu trả về bắt đầu bằng dòng `[sdd-cache] Cache hit for <url>` và bọc nội dung trong cặp thẻ `----- BEGIN CACHED CONTENT -----` / `----- END CACHED CONTENT -----` để agent sử dụng ngay lập tức.
- **Khi trượt cache hoặc tài liệu đã đổi (Cache miss / stale):** `WebFetch` tải trang mới như bình thường và cập nhật lại bản ghi cho lần sau.

## Kiểm Thử Cục Bộ (Local Testing)

### 1. Chạy thử trực tiếp các script (Smoke test)

```bash
# Giả lập sự kiện PostToolUse: lưu một trang tài liệu vào cache
echo '{
  "tool_input": {
    "url": "https://react.dev/reference/react/useActionState",
    "prompt": "extract the signature"
  },
  "tool_response": "useActionState(action, initialState) returns [state, formAction, isPending]"
}' | bash .agents/hooks/claude/sdd-cache-post.sh

# Kiểm tra bản ghi đã lưu
ls .claude/sdd-cache/
cat .claude/sdd-cache/*.json | jq .

# Giả lập sự kiện PreToolUse kế tiếp trên cùng URL đó
echo '{
  "tool_input": {
    "url": "https://react.dev/reference/react/useActionState",
    "prompt": "extract the signature"
  }
}' | bash .agents/hooks/claude/sdd-cache-pre.sh
echo "exit=$?"
```

Kết quả kỳ vọng:
- Lệnh đầu tiên tạo ra một file JSON trong `.claude/sdd-cache/` (nếu máy chủ đích có trả về `ETag` hoặc `Last-Modified`).
- Lệnh thứ hai thoát với mã `exit=2` và in nội dung cache ra `stderr` khi máy chủ gốc phản hồi `304`, hoặc thoát với mã `exit=0` nếu nội dung đã thay đổi.

### 2. Kiểm thử End-to-End trong phiên làm việc thực tế

1. Đăng ký cấu hình hooks vào `.claude/settings.local.json` như hướng dẫn ở mục Cài đặt.
2. Khởi động một phiên Claude Code trong kho lưu trữ này.
3. Yêu cầu agent tải một trang tài liệu (ví dụ: *"tải trang `https://react.dev/reference/react/useActionState` và tóm tắt chữ ký hàm"*).
4. Xác nhận file JSON xuất hiện trong `.claude/sdd-cache/`.
5. Yêu cầu agent tải lại đúng trang đó một lần nữa.
6. Xác nhận lệnh `WebFetch` thứ hai được phục vụ ngay từ cache (hiển thị tiền tố `[sdd-cache]` trong nhật ký phiên).

### 3. Kiểm tra cơ chế tự hủy cache khi tài liệu thay đổi

Để xác nhận cache tự động vô hiệu hóa khi tài liệu trên server thay đổi, hãy thử sửa giá trị `ETag` trong một file cache cụ thể:

```bash
# Chọn một bản ghi cụ thể trong thư mục cache
ENTRY=.claude/sdd-cache/e49c9f378670cfbb1d7d871b6dee16d9.json

# Sửa ETag thành một giá trị giả để server không khớp
jq '.etag = "W/\"stale-etag-forced\""' "$ENTRY" > "$ENTRY.tmp" && mv "$ENTRY.tmp" "$ENTRY"

# Lần gọi PreToolUse tiếp theo sẽ trượt cache (vì server trả về 200 thay vì 304)
echo '{"tool_input":{"url":"...", "prompt":"..."}}' | bash .agents/hooks/claude/sdd-cache-pre.sh
echo "exit=$?"   # kỳ vọng exit=0 (cho phép tải mới)
```

### 4. Gỡ lỗi (Debugging)

Cả hai hook đều ghi nhật ký sự kiện kèm dấu thời gian vào `.claude/sdd-cache/.debug.log` khi bật chế độ debug bằng một trong hai cách:

```bash
# Cách A: Biến môi trường (áp dụng cho phiên hiện tại)
SDD_CACHE_DEBUG=1 claude

# Cách B: Tạo file cờ (duy trì qua nhiều phiên)
mkdir -p .claude/sdd-cache && touch .claude/sdd-cache/.debug
# Tắt debug bằng lệnh: rm .claude/sdd-cache/.debug
```

File log ghi lại URL, cấu trúc `tool_response`, mã trạng thái `HEAD`, và lý do vì sao mỗi lần gọi trúng hoặc trượt cache.

## Các Giới Hạn Đã Biết

- **Nội dung phụ thuộc vào prompt lần đầu:** Khi trúng cache, hook trả về bản đọc của agent trước đó kèm câu prompt gốc. Nếu tác vụ mới cần khai thác một khía cạnh hoàn toàn khác trên cùng trang đó, hãy xóa file tương ứng trong `.claude/sdd-cache/` để tải lại.
- **Mỗi lần ghi cache mới tốn thêm một truy vấn `HEAD`:** Do Claude Code không truyền các HTTP response headers của `WebFetch` xuống cho hook, nên script `post` phải gửi thêm một lệnh `HEAD` tới máy chủ gốc để lấy `ETag` / `Last-Modified`.
- **Các máy chủ không hỗ trợ `ETag` hoặc `Last-Modified` sẽ không được lưu cache:** Hầu hết các trang tài liệu chính thức (react.dev, developer.mozilla.org, docs.djangoproject.com...) đều hỗ trợ đầy đủ. Những trang không hỗ trợ sẽ luôn được tải trực tiếp.
- **Phạm vi cache là cục bộ theo từng dự án:** Không chia sẻ chung giữa nhiều máy khác nhau.

## Yêu Cầu Hệ Thống

- `jq`
- `curl`
- `shasum` hoặc `sha256sum` (tự động nhận diện)
- Bash 3.2+
