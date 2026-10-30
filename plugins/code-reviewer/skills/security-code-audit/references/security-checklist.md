# Danh Mục Kiểm Toán Bảo Mật (Security Checklist)

Tài liệu tham chiếu nhanh về bảo mật ứng dụng web và API. Sử dụng kết hợp với kỹ năng `security-code-audit`.

## Mục Lục

- [Mô Hình Hóa Mối Đe Dọa (Bắt Đầu Tại Đây)](#mô-hình-hóa-mối-đe-dọa-bắt-đầu-tại-đây)
- [Kiểm Tra Trước Khi Commit (Pre-Commit Checks)](#kiểm-tra-trước-khi-commit-pre-commit-checks)
- [Xác Thực (Authentication)](#xác-thực-authentication)
- [Phân Quyền (Authorization)](#phân-quyền-authorization)
- [Kiểm Định Đầu Vào (Input Validation)](#kiểm-định-đầu-vào-input-validation)
- [Tiêu Đề Bảo Mật (Security Headers)](#tiêu-đề-bảo-mật-security-headers)
- [Cấu Hình CORS](#cấu-hình-cors)
- [Bảo Vệ Dữ Liệu (Data Protection)](#bảo-vệ-dữ-liệu-data-protection)
- [An Ninh Phụ Thuộc (Dependency Security)](#an-ninh-phụ-thuộc-dependency-security)
- [Bảo Mật AI / LLM](#bảo-mật-ai--llm)
- [Xử Lý Lỗi (Error Handling)](#xử-lý-lỗi-error-handling)
- [Tham Chiếu Nhanh OWASP Top 10](#tham-chiếu-nhanh-owasp-top-10)
- [Tham Chiếu Nhanh OWASP Top 10 Cho LLM](#tham-chiếu-nhanh-owasp-top-10-cho-llm)

## Mô Hình Hóa Mối Đe Dọa (Bắt Đầu Tại Đây)

Trước khi đi vào các biện pháp kiểm soát cụ thể, hãy dành 5 phút suy nghĩ dưới góc nhìn của kẻ tấn công:

- [ ] Đã lập bản đồ các ranh giới tin cậy — trust boundaries (HTTP requests, file uploads, webhooks, API bên thứ ba, đầu ra từ LLM)
- [ ] Đã định danh các tài sản trọng yếu (thông tin xác thực, dữ liệu cá nhân PII, dữ liệu thanh toán/giao dịch chứng khoán, quyền quản trị, luồng chuyển tiền/đặt lệnh)
- [ ] Đã rà soát theo mô hình STRIDE tại từng ranh giới (Spoofing - Giả mạo, Tampering - Can thiệp dữ liệu, Repudiation - Chối bỏ hành vi, Information Disclosure - Lộ lọt thông tin, DoS - Từ chối dịch vụ, Elevation of Privilege - Leo thang đặc quyền)
- [ ] Đã viết các kịch bản lạm dụng (Abuse cases) song song với Use cases (*"nếu là kẻ tấn công, tôi sẽ trục lợi luồng này như thế nào?"*)

## Kiểm Tra Trước Khi Commit (Pre-Commit Checks)

- [ ] Không để lộ thông tin bí mật (secrets) trong mã nguồn (`git diff --cached | grep -i "password\|secret\|api_key\|token"`)
- [ ] `.gitignore` đã bao phủ đầy đủ: `.env`, `.env.local`, `*.pem`, `*.key`
- [ ] File `.env.example` chỉ sử dụng các giá trị giữ chỗ minh họa (không chứa secret thật)

## Xác Thực (Authentication)

- [ ] Mật khẩu được băm (hash) bằng thuật toán mạnh: `bcrypt` (≥ 12 rounds), `scrypt`, hoặc `argon2`
- [ ] Cookie phiên làm việc (Session cookies) bật đầy đủ cờ: `httpOnly`, `secure`, `sameSite: 'lax'` (hoặc `'strict'`)
- [ ] Cấu hình thời gian hết hạn phiên (session expiration / `max-age`) hợp lý
- [ ] Giới hạn tần suất gọi (Rate limiting) trên endpoint đăng nhập (ví dụ: ≤ 10 lần thử trong 15 phút)
- [ ] Token đặt lại mật khẩu: giới hạn thời gian sống ngắn (≤ 1 giờ) và chỉ dùng một lần duy nhất (single-use)
- [ ] Khóa tài khoản tạm thời sau nhiều lần đăng nhập sai liên tiếp (kèm gửi thông báo cảnh báo cho chủ tài khoản)
- [ ] Hỗ trợ xác thực đa yếu tố (MFA / Smart OTP) đối với các giao dịch nhạy cảm (đặt lệnh, rút/ứng tiền, đổi thông tin tài khoản)

## Phân Quyền (Authorization)

- [ ] Mọi endpoint bảo vệ đều kiểm tra trạng thái xác thực (authentication) trước khi xử lý
- [ ] Mọi truy cập tài nguyên đều kiểm tra quyền sở hữu / tiểu khoản hợp lệ (chống lỗ hổng IDOR / BOLA)
- [ ] Các endpoint quản trị (Admin) bắt buộc xác minh vai trò quản trị viên ở tầng máy chủ
- [ ] API keys được giới hạn phạm vi quyền tối thiểu cần thiết (Least Privilege)
- [ ] JWT tokens được xác thực đầy đủ: chữ ký số (signature), thời hạn (`exp`), và nguồn phát hành (`iss`)

## Kiểm Định Đầu Vào (Input Validation)

- [ ] Mọi đầu vào từ người dùng đều được xác thực tại ranh giới hệ thống (API routes, form handlers, WebSocket messages)
- [ ] Ưu tiên xác thực theo danh sách cho phép (allowlist) thay vì danh sách cấm (denylist)
- [ ] Giới hạn độ dài chuỗi (min/max length)
- [ ] Kiểm tra miền giá trị số học (numeric ranges, không âm, bước giá tick size hợp lệ)
- [ ] Định dạng Email, URL và ngày tháng được kiểm tra bằng thư viện chuẩn
- [ ] Tải file lên (File uploads): giới hạn định dạng MIME/extension, giới hạn dung lượng tối đa, xác minh nội dung thực tế của file
- [ ] Truy vấn cơ sở dữ liệu (SQL) bắt buộc tham số hóa (parameterized queries / prepared statements), tuyệt đối không nối chuỗi trực tiếp
- [ ] Đầu ra HTML được mã hóa an toàn (sử dụng cơ chế auto-escaping của framework để chống XSS)
- [ ] Kiểm tra tính hợp lệ của URL đích trước khi chuyển hướng (chống Open Redirect)
- [ ] Các lệnh gọi URL từ phía server (Server-side fetch) phải qua allowlist và chặn toàn bộ dải IP nội bộ / loopback (chống SSRF)

## Tiêu Đề Bảo Mật (Security Headers)

```http
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (vô hiệu hóa bộ lọc cũ, dựa vào CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Cấu Hình CORS

```typescript
// Cấu hình chặt chẽ theo danh sách tên miền cho phép (Khuyến nghị)
cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// TUYỆT ĐỐI KHÔNG dùng trên môi trường Production:
cors({ origin: '*' })  // Cho phép mọi nguồn (origin) bất kỳ
```

## Bảo Vệ Dữ Liệu (Data Protection)

- [ ] Loại bỏ các trường nhạy cảm khỏi phản hồi API (`passwordHash`, `resetToken`, `secretKey`, v.v.)
- [ ] Không ghi log các dữ liệu nhạy cảm (mật khẩu, JWT/OTP token, số thẻ/tài khoản đầy đủ)
- [ ] Mã hóa dữ liệu định danh cá nhân (PII) khi lưu trữ (encryption at rest) theo quy định bảo mật
- [ ] Bắt buộc sử dụng HTTPS/TLS cho toàn bộ giao tiếp bên ngoài
- [ ] Các bản sao lưu cơ sở dữ liệu (database backups) được mã hóa an toàn

## An Ninh Phụ Thuộc (Dependency Security)

Trước tiên, hãy xác định **ranh giới cài đặt (installation boundary)**. Nếu gói thư viện thuộc một khai báo `workspaces` cấp cha, hãy dùng thư mục gốc của workspace đó; ngược lại, dùng thư mục gốc gần nhất sở hữu cả file manifest (`package.json`) và đồ thị phụ thuộc. Tại ranh giới đó, hãy đối chiếu trường `packageManager` (nếu có), file khóa (lockfile) và lệnh cài đặt trong CI. Dừng lại ngay nếu chúng mâu thuẫn nhau hoặc tồn tại nhiều lockfile của các trình quản lý gói khác nhau cùng lúc.

| Trình quản lý gói / Tín hiệu nhận diện | Lệnh cài đặt bất biến trong CI | Lệnh kiểm toán lỗ hổng đã biết |
|---|---|---|
| npm (`package-lock.json` hoặc `npm-shrinkwrap.json`) | `npm ci` | `npm audit` |
| pnpm (`pnpm-lock.yaml`) | `pnpm install --frozen-lockfile` | `pnpm audit` |
| Yarn 2+ (`yarn.lock` + `.yarnrc.yml`) | `yarn install --immutable` | `yarn npm audit -A -R` |
| Yarn 1 (`yarn.lock`) | `yarn install --frozen-lockfile` | `yarn audit` |

Đối với trình quản lý gói hoặc phiên bản khác, hãy tra cứu tài liệu chính thức của công cụ đó; không tự ý lấy lệnh của trình quản lý gói này áp sang trình quản lý gói khác.

### Cổng Kiểm Soát Install-Script (Install-Script Gate)

Tuyệt đối không rà soát các lifecycle scripts (`preinstall`, `postinstall`) của gói phụ thuộc bằng cách chạy lệnh cài đặt thông thường trên máy khi chưa khóa cơ chế thực thi script.

1. Khởi tạo với chế độ vô hiệu hóa dependency scripts (`--ignore-scripts`) hoặc chính sách từ chối mặc định (default-deny).
2. Kiểm tra trực tiếp mã nguồn script và phiên bản cụ thể của gói trước khi phê duyệt.
3. Ghi nhận chính sách cho phép/từ chối hẹp nhất vào cấu hình tại ranh giới cài đặt và commit vào repo.
4. Chạy lại lệnh cài đặt bất biến (frozen/immutable install) kèm chính sách đó và xác minh dự án vẫn build thành công.

| Phiên bản trình quản lý gói | Chính sách bảo vệ gốc (Native policy) |
|---|---|
| npm chưa cấu hình phê duyệt chi tiết | Khởi tạo bằng `npm ci --ignore-scripts`, hoặc cấu hình `ignore-scripts=true` trong `.npmrc` khi muốn chặn toàn dự án. |
| npm 11.18.x | Bật `strict-allow-scripts=true` trước khi cài đặt, sau đó dùng `npm install-scripts ls` tại ranh giới cài đặt; ghim chặt phiên bản cho các gói được phép chạy script. |
| npm 12.x | Các dependency scripts chưa duyệt bị bỏ qua mặc định; bật `strict-allow-scripts=true` để chặn ngay quá trình cài đặt nếu phát hiện script lạ chưa duyệt. |
| pnpm 11+ | Dùng `pnpm approve-builds` và commit cấu hình `allowBuilds`; `strictDepBuilds` mặc định là `true` nên các bản build chưa duyệt sẽ bị chặn. |
| pnpm 10.26–10.x | Cấu hình `allowBuilds` tường minh và đặt `strictDepBuilds: true` (vì mặc định ở v10 là `false`). |
| pnpm 10.1–10.25 | Dùng `pnpm approve-builds` và bật `strictDepBuilds` (hỗ trợ từ 10.3+). |
| pnpm cũ hơn | Khởi tạo bằng `pnpm install --frozen-lockfile --ignore-scripts`. Giữ nguyên trạng thái tắt script. |
| Yarn 4.14+ | Các script `postinstall` của gói phụ thuộc bị tắt mặc định. Chỉ cấp quyền ngoại lệ tối thiểu qua `dependenciesMeta.<package>.built: true`. |
| Yarn 2–4.13 | Đặt `enableScripts: false` trong `.yarnrc.yml`, sau đó chỉ cấp ngoại lệ cần thiết qua `dependenciesMeta.<package>.built: true`. |
| Yarn 1 | Khởi tạo bằng `yarn install --ignore-scripts` và giữ nguyên trạng thái tắt script. |

**Vệ sinh chuỗi cung ứng phần mềm (Supply-chain hygiene):**
- [ ] Mỗi project/workspace root chỉ commit duy nhất 1 file lockfile chính thức và CI không bao giờ tự ghi đè file này
- [ ] Các lỗ hổng mức Critical/High phải được phân loại khả năng khai thác thực tế (reachability); nếu tạm hoãn phải ghi rõ lý do và ngày rà soát lại
- [ ] Không bao giờ chạy tự động lệnh ép nâng cấp phá vỡ tương thích (`npm audit fix --force`); mọi bản vá phải được review diff và changelog
- [ ] Xác minh chữ ký số và nguồn gốc gói (provenance) khi trình quản lý gói hỗ trợ
- [ ] Chặn các lifecycle scripts của gói phụ thuộc trước lần chạy đầu tiên và chỉ phê duyệt qua chính sách gốc của trình quản lý gói
- [ ] Rà soát kỹ các thư viện mới trước khi thêm vào dự án: chủ sở hữu, tần suất bảo trì, tuổi đời bản phát hành, cây phụ thuộc bắc cầu và nguy cơ giả mạo tên gói (typosquatting)

## Bảo Mật AI / LLM

Đối với mọi tính năng có gọi mô hình ngôn ngữ lớn (chatbots, bộ tóm tắt, AI agents, RAG):

- [ ] Đầu ra của mô hình (Model output) luôn được coi là dữ liệu không tin cậy — tuyệt đối không truyền thẳng vào `eval`, câu lệnh SQL, lệnh shell, `innerHTML` hoặc đường dẫn file hệ thống
- [ ] Luôn giả định nguy cơ Prompt Injection; mọi kiểm soát phân quyền phải được thực thi cứng trong code backend, không dựa vào lời dặn trong system prompt
- [ ] Không đưa thông tin bí mật (secrets), dữ liệu chéo giữa các khách hàng (cross-tenant data) vào cửa sổ ngữ cảnh (context window)
- [ ] Giới hạn chặt phạm vi công cụ (tool permissions) của agent; các hành động xóa/sửa không thể hoàn tác bắt buộc phải có bước xác nhận từ người dùng
- [ ] Thiết lập giới hạn cứng về số lượng token, tần suất gọi (rate limit) và độ sâu vòng lặp đệ quy (chống cạn kiệt tài nguyên)

## Xử Lý Lỗi (Error Handling)

```typescript
// Trên môi trường Production: trả về thông báo lỗi chuẩn hóa, ẩn chi tiết nội bộ
res.status(500).json({
  error: { code: 'INTERNAL_ERROR', message: 'Hệ thống đang bận, vui lòng thử lại sau' }
});

// TUYỆT ĐỐI KHÔNG dùng trên Production:
res.status(500).json({
  error: err.message,
  stack: err.stack,         // Làm lộ cấu trúc code nội bộ
  query: err.sql,           // Làm lộ cấu trúc bảng và câu lệnh DB
});
```

## Tham Chiếu Nhanh OWASP Top 10

| # | Lỗ hổng (Vulnerability) | Biện pháp phòng ngừa cốt lõi |
|---|---|---|
| **A01** | **Broken Access Control** (Kiểm soát truy cập hỏng) | Kiểm tra xác thực trên mọi endpoint, xác minh quyền sở hữu tài nguyên/tiểu khoản (chống IDOR) |
| **A02** | **Cryptographic Failures** (Lỗi mật mã học) | Bắt buộc HTTPS/TLS, dùng thuật toán băm mạnh, không lưu secrets trong code |
| **A03** | **Injection** (Tiêm mã độc SQL/NoSQL/OS) | Truy vấn tham số hóa (Parameterized queries), kiểm định đầu vào theo allowlist |
| **A04** | **Insecure Design** (Thiết kế thiếu an toàn) | Lập mô hình mối đe dọa (Threat modeling), phát triển bám sát đặc tả và ranh giới nghiệp vụ |
| **A05** | **Security Misconfiguration** (Cấu hình sai bảo mật) | Thiết lập đầy đủ Security Headers, phân quyền tối thiểu, tắt debug trên production |
| **A06** | **Vulnerable and Outdated Components** (Thành phần có lỗ hổng) | Chạy kiểm toán phụ thuộc định kỳ (`npm audit`, `pip-audit`), giữ thư viện tối giản và cập nhật |
| **A07** | **Identification and Authentication Failures** (Lỗi xác thực) | Mật khẩu mạnh, rate limiting, quản lý phiên an toàn, hỗ trợ MFA/OTP |
| **A08** | **Software and Data Integrity Failures** (Lỗi toàn vẹn dữ liệu) | Kiểm soát chặt install-scripts, xác minh chữ ký và tính toàn vẹn của gói phụ thuộc / bản cập nhật |
| **A09** | **Security Logging and Monitoring Failures** (Thiếu ghi vết an ninh) | Ghi log đầy đủ các sự kiện bảo mật/đăng nhập/giao dịch, nhưng tuyệt đối không ghi log secrets/PII |
| **A10** | **Server-Side Request Forgery (SSRF)** | Kiểm tra URL theo allowlist, chặn kết nối từ server ra các dải IP nội bộ / metadata cloud |

## Tham Chiếu Nhanh OWASP Top 10 Cho LLM

Dành cho các ứng dụng tích hợp LLM / AI Agent. Tham khảo [OWASP GenAI Security Project](https://genai.owasp.org/llm-top-10/).

| Mã | Rủi ro (Risk) | Biện pháp phòng ngừa cốt lõi |
|---|---|---|
| **LLM01** | **Prompt Injection** (Tiêm lệnh điều khiển) | Không coi system prompt là rào chắn bảo mật; kiểm tra phân quyền trong code thực thi |
| **LLM02** | **Sensitive Information Disclosure** (Lộ thông tin nhạy cảm) | Loại bỏ secrets và dữ liệu PII khỏi prompt; lọc dữ liệu nhạy cảm ở đầu ra |
| **LLM03** | **Supply Chain** (Rủi ro chuỗi cung ứng AI) | Thẩm định kỹ mô hình, bộ dữ liệu huấn luyện và các plugin/MCP server như các gói phụ thuộc code |
| **LLM04** | **Data and Model Poisoning** (Đầu độc dữ liệu & mô hình) | Chỉ dùng nguồn mô hình tin cậy, kiểm tra tính toàn vẹn của dữ liệu fine-tuning và kho tài liệu RAG |
| **LLM05** | **Improper Output Handling** (Xử lý đầu ra không an toàn) | Coi mọi phản hồi từ LLM là dữ liệu không tin cậy; luôn xác thực, tham số hóa và mã hóa (encode) |
| **LLM06** | **Excessive Agency** (Trao quyền quá mức cho Agent) | Giới hạn hẹp quyền gọi tool của agent; bắt buộc người dùng phê duyệt trước các thao tác nhạy cảm |
| **LLM07** | **System Prompt Leakage** (Lộ System Prompt) | Luôn giả định system prompt có thể bị lộ; tuyệt đối không nhúng khóa bí mật hoặc logic phân quyền vào đó |
| **LLM08** | **Vector and Embedding Weaknesses** (Điểm yếu Vector/RAG) | Phân tách không gian vector/embedding theo từng khách hàng (tenant); kiểm duyệt tài liệu trước khi đánh chỉ mục |
| **LLM09** | **Misinformation / Hallucination** (Thông tin sai lệch / Ảo giác) | Bắt rễ dữ liệu thực tế kèm trích dẫn nguồn (Grounding); xác thực chéo các tuyên bố quan trọng |
| **LLM10** | **Unbounded Consumption** (Tiêu thụ tài nguyên không giới hạn) | Áp trần số lượng token, tần suất request và số vòng lặp tối đa của agent |
