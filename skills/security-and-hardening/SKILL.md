---
name: security-and-hardening
description: Tăng cường tính bảo mật cho code (Hardening). Sử dụng khi xử lý user input, tính năng đăng nhập (authentication), lưu trữ dữ liệu, hoặc tích hợp dịch vụ bên ngoài. Sử dụng khi xây dựng bất kỳ tính năng nào có nhận dữ liệu không đáng tin cậy, quản lý phiên người dùng (sessions), hoặc tương tác với các dịch vụ của bên thứ ba.
---

# Kỹ năng: Bảo mật và Tăng cường An toàn (Security and Hardening)

## Tổng quan

Thực hành lập trình ưu tiên bảo mật (Security-first) cho các ứng dụng web. Hãy coi mọi dữ liệu đầu vào (input) từ bên ngoài đều mang tính thù địch, coi mọi khóa bí mật (secret) là thiêng liêng, và coi mọi lần kiểm tra phân quyền (authorization check) là bắt buộc. Bảo mật không phải là một giai đoạn làm ở cuối dự án — nó là sự ràng buộc trên từng dòng code có chạm vào dữ liệu người dùng, chạm vào tính năng xác thực, hoặc chạm vào các hệ thống bên ngoài.

## Khi nào cần sử dụng

- Khi xây dựng bất cứ thứ gì có nhận dữ liệu đầu vào từ người dùng (user input).
- Khi lập trình tính năng Xác thực (Authentication) hoặc Phân quyền (Authorization).
- Khi lưu trữ hoặc truyền tải dữ liệu nhạy cảm.
- Khi tích hợp với các APIs hay dịch vụ bên ngoài (external services).
- Khi làm tính năng upload file, webhooks, hoặc callbacks.
- Khi xử lý dữ liệu thanh toán hoặc dữ liệu định danh cá nhân (PII data).

## Quy trình: Lên Mô hình Mối đe dọa Trước tiên (Threat Model First)

Cắm mấy cái chốt chặn bảo mật một cách mù quáng mà không có Mô hình Mối đe dọa (threat model) chẳng khác gì đoán mò. Trước khi bắt tay vào bảo mật, hãy bỏ ra 5 phút để suy nghĩ như một kẻ tấn công (hacker):

1. **Vạch ra các Ranh giới Tin cậy (Trust boundaries).** Chỗ nào là nơi dữ liệu không đáng tin (untrusted) xâm nhập vào hệ thống của bạn? HTTP requests, các trường nhập form, file uploads, webhooks, APIs của bên thứ ba, message queues, và **Cả đầu ra của LLM (AI)**. Mọi ranh giới đều là bề mặt tấn công (attack surface).
2. **Gọi tên các Tài sản (Assets).** Cái gì trong hệ thống này đáng để đi ăn trộm hoặc phá hoại? Thông tin đăng nhập (Credentials), dữ liệu PII, dữ liệu thẻ thanh toán, các tính năng của Admin, tính năng chuyển tiền.
3. **Quét mô hình STRIDE qua từng ranh giới** — chỉ là lướt nhanh thôi, không cần làm quá trịnh trọng:

| Mối đe dọa (Threat) | Câu hỏi | Cách phòng thủ điển hình |
|---|---|---|
| **S**poofing (Giả mạo) | Có ai đó có thể đóng giả làm một user/service khác không? | Authentication (Xác thực), xác minh chữ ký (signature) |
| **T**ampering (Xáo trộn) | Data có thể bị sửa lén trên đường truyền hay ở trong ổ cứng không? | Check Integrity (Tính toàn vẹn), Parameterized queries (tham số hóa query SQL), HTTPS |
| **R**epudiation (Chối bỏ) | Một thằng làm bậy xong có thể chối bay chối biến là nó làm không? | Lưu Audit logging (nhật ký) các sự kiện bảo mật |
| **I**nformation disclosure (Lộ lọt thông tin) | Dữ liệu có thể bị xì ra ngoài không? | Encryption (Mã hóa), Field allowlists (Chỉ cho phép vài trường nhất định), Báo lỗi chung chung thôi (Generic errors) |
| **D**enial of service (Từ chối dịch vụ) | Hệ thống có thể bị đánh sập/quá tải không? | Rate limiting (Giới hạn request), Giới hạn size của input, Cài Timeouts |
| **E**levation of privilege (Leo thang đặc quyền) | Một thằng ất ơ có thể tự chiếm được quyền mà nó đéo đáng được hưởng không? | Authorization checks (Kiểm tra phân quyền), Cấp quyền tối thiểu (Least privilege) |

4. **Viết các kịch bản lạm dụng (abuse cases) ngay cạnh các kịch bản sử dụng (use cases).** Với mỗi tính năng, hãy tự hỏi "Làm sao để phá nát cái tính năng này?" — sau đó lấy luôn cái cách đó làm bài test đầu tiên.

Nếu bạn còn đéo thể kể tên được các Ranh giới Tin cậy cho tính năng của mình, thì bạn đéo đủ trình độ để bảo mật nó. Đây chính là mục **A04: Thiết kế Không an toàn (Insecure Design)** trong danh sách của OWASP — phần lớn các vụ sập hầm bắt nguồn từ lúc thiết kế, chứ đéo phải ở code.

## Hệ thống Ranh giới 3 Tầng

### Luôn Luôn Phải Làm (Không Ngoại Lệ)

- **Validate MỌI dữ liệu đầu vào** tại ranh giới của hệ thống (API routes, form handlers).
- **Tham số hóa (Parameterize) MỌI câu queries database** — TUYỆT ĐỐI KHÔNG dùng toán tử cộng chuỗi (concatenate) nhét user input vào câu lệnh SQL.
- **Mã hóa (Encode) output** để chống lỗi XSS (hãy dùng tính năng auto-escaping của framework, đừng cố tình bypass (vượt mặt) nó).
- **Dùng HTTPS** cho mọi giao tiếp ra thế giới bên ngoài.
- **Băm (Hash) mật khẩu** bằng bcrypt/scrypt/argon2 (tuyệt đối KHÔNG BAAO GIỜ lưu password ở dạng text thường - plaintext).
- **Cài đặt các header bảo mật** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- **Dùng httpOnly, secure, sameSite cookies** cho các thẻ phiên đăng nhập (sessions).
- **Chạy lệnh audit (kiểm tra an ninh) native của package manager** lên cái file lockfile TRƯỚC MỖI LẦN release (phát hành).

### Phải Xin phép (Cần sự Chấp thuận của Con người)

- Bổ sung thêm các luồng đăng nhập mới hoặc thay đổi logic auth hiện tại.
- Lưu trữ các hạng mục dữ liệu nhạy cảm mới (PII, info thanh toán).
- Bổ sung thêm các tích hợp với dịch vụ ngoài.
- Thay đổi cấu hình CORS.
- Thêm tính năng upload file.
- Chỉnh sửa giới hạn truy cập (rate limiting hoặc throttling).
- Cấp (Grant) thêm các quyền hoặc roles (vai trò) to hơn bình thường.

### Tuyệt Đối KHÔNG BAO GIỜ Làm

- **KHÔNG BAO GIỜ commit khóa bí mật (secrets)** lên Git/version control (ví dụ: API keys, passwords, tokens).
- **KHÔNG BAO GIỜ in ra log các dữ liệu nhạy cảm** (passwords, tokens, nguyên dãy số thẻ tín dụng).
- **KHÔNG BAO GIỜ coi cục validation chạy trên client (trình duyệt)** là chốt chặn bảo mật.
- **KHÔNG BAO GIỜ tắt các security headers** chỉ vì lười.
- **KHÔNG BAO GIỜ dùng `eval()` hay `innerHTML`** chứa dữ liệu do người dùng nhập vào.
- **KHÔNG BAO GIỜ lưu thông tin sessions ở chỗ mà code client đọc được** (ví dụ: cất auth tokens vào localStorage).
- **KHÔNG BAO GIỜ phơi bày đống stack traces (vết lỗi dài ngoằng)** hay chi tiết lỗi nội bộ ra ngoài cho người dùng nhìn thấy.

## 10 Pattern Chống lại OWASP Top 10

Đây là các pattern phòng thủ, không phải bảng xếp hạng. Để xem danh sách thứ hạng của năm 2021, mở bảng tra cứu ở `references/security-checklist.md`.

### Lỗi Tiêm nhiễm (Injection - SQL, NoSQL, OS Command)

```typescript
// NGU: Bị lỗi SQL injection thông qua trò nối chuỗi string
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// KHÔN: Dùng câu query tham số hóa (Parameterized)
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// KHÔN: Dùng ORM (Nó sẽ tự tham số hóa cho bạn)
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Lỗi Xác thực (Broken Authentication)

```typescript
// Băm mật khẩu (Password hashing)
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12; // Số lần băm
const hashedPassword = await hash(plaintext, SALT_ROUNDS);
const isValid = await compare(plaintext, hashedPassword);

// Quản lý Phiên đăng nhập (Session management)
app.use(session({
  secret: process.env.SESSION_SECRET,  // Phải móc từ biến môi trường (env), ĐÉO ghi cứng vào code
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Code JavaScript (XSS) đéo đọc được cái này
    secure: true,       // Bắt buộc chạy trên mạng HTTPS
    sameSite: 'lax',    // Chống lỗi CSRF
    maxAge: 24 * 60 * 60 * 1000,  // Hết hạn sau 24 giờ
  },
}));
```

### Lỗi Cross-Site Scripting (XSS)

```typescript
// NGU: Nhét thẳng user input vào HTML mà chưa xử lý
element.innerHTML = userInput;

// KHÔN: Tận dụng trò auto-escaping của Framework (React mặc định đã làm sẵn cái này)
return <div>{userInput}</div>;

// NẾU NHƯ BẮT BUỘC PHẢI RENDER THẺ HTML, Hãy làm sạch (sanitize) nó trước
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Hổng Phân quyền (Broken Access Control)

```typescript
// LÚC ĐÉO NÀO CŨNG PHẢI CHECK QUYỀN (authorization), chứ không chỉ check đăng nhập (authentication)
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);

  // Check xem thằng user đang đăng nhập có đúng là Chủ của cái tài nguyên (resource) này không
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Mày đéo có quyền sửa task của người khác' }
    });
  }

  // Tới đây mới được cho qua
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

### Cấu hình Bảo mật Hớ hênh (Security Misconfiguration)

```typescript
// Gắn các Security headers (Nếu dùng Express thì xài thư viện 'helmet')
import helmet from 'helmet';
app.use(helmet());

// Chính sách Content Security Policy (CSP)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Nếu siết chặt được nữa thì siết
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
}));

// Cấu hình CORS — Chỉ cho phép các domain quen biết
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

### Lộ lọt Dữ liệu Nhạy cảm (Sensitive Data Exposure)

```typescript
// TUYỆT ĐỐI KHÔNG trả về các trường nhạy cảm trong API responses
function sanitizeUser(user: UserRecord): PublicUser {
  // Lọc bỏ passwordHash và resetToken ra khỏi object
  const { passwordHash, resetToken, ...publicFields } = user;
  return publicFields;
}

// Dùng Biến Môi trường (Env vars) cho các Khóa Bí mật
const API_KEY = process.env.STRIPE_API_KEY;
if (!API_KEY) throw new Error('Cấu hình thiếu STRIPE_API_KEY rồi');
```

### Lỗi Giả mạo Request từ Server (Server-Side Request Forgery - SSRF)

Bất kỳ khi nào Server nhận một URL bị ảnh hưởng bởi user — như webhooks, tính năng "import từ URL", proxy ảnh, link previews — một kẻ tấn công có thể thao túng nó để bắn request vào các dịch vụ NỘI BỘ (như hệ thống cloud metadata, `localhost`, các dải mạng private IPs).

```typescript
// NGU: get (fetch) bừa bãi bất cứ cái URL đéo nào user gửi lên
await fetch(req.body.webhookUrl);

// KHÔN: Dùng danh sách trắng (allowlist) check protocol + host, từ chối (reject) nếu BẤT KỲ IP giải mã nào là IP nội bộ (private), cấm tự động chuyển hướng (redirects)
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const ALLOWED_HOSTS = new Set(['hooks.example.com']);

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Chỉ chơi với https');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('Host này chưa được cho phép');
  
  // Resolve TOÀN BỘ các bản ghi; chỉ cần 1 cái IP private/reserved lọt vào là cho cút ngay.
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.some((a) => ipaddr.parse(a.address).range() !== 'unicast')) {
    throw new Error('Mày định hack vào IP private hả con');
  }
  return url;
}

await fetch(await assertSafeUrl(req.body.webhookUrl), { redirect: 'error' });
```

Cái chốt chặn `range() !== 'unicast'` kia đã bao kê mọi dải mạng nội bộ gồm loopback, link-local `169.254.169.254` (cloud metadata, mục tiêu số #1 của trò SSRF), mạng private, và unique-local áp dụng cho cả IPv4 lẫn IPv6.

**Lưu ý (Caveat) — cách này vẫn có 1 lỗ hổng mang tên TOCTOU (Time-of-check to time-of-use).** Lệnh `fetch` sẽ tự đi resolve DNS lại một lần nữa, nên một hacker nếu dùng bản ghi có vòng đời cực ngắn (short-TTL) hoàn toàn có thể tráo đổi cái IP thành IP nội bộ nằm ngay khoảng trống giữa lúc bạn "kiểm tra an toàn" xong và lúc bạn "chạy lệnh fetch". Đối với các tính năng có mức độ rủi ro cực cao, hãy resolve nó một lần thôi rồi kết nối thẳng vào cái IP đã chốt cứng (pinned IP), hoặc nhét luôn một cái Agent chuyên lọc phía trước (như thư viện `request-filtering-agent` / `ssrf-req-filter`).

## Các Pattern Validate Đầu Vào (Input Validation Patterns)

### Validate Schema tại Cổng Ranh giới (Boundary)

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

// Chặn cổng Validate ngay tại tầng Route handler
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input vớ vẩn',
        details: result.error.flatten(),
      },
    });
  }
  // Giờ thì biến result.data đã trở nên trong sạch và có Type đầy đủ
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

### Upload File An Toàn

```typescript
// Siết loại file (mimetypes) và dung lượng tối đa
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError('Đéo cho upload loại file này');
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('File nặng quá (max 5MB)');
  }
  // Đừng có dại mà tin vào cái đuôi mở rộng của file (file extension) — phải check sâu vào byte lõi (magic bytes) nếu tính năng đó mang rủi ro cao.
}
```

## Phân loại Kết quả Kiểm định (Audit) của Dependencies

Lệnh audit (kiểm định) của các trình quản lý thư viện (package-manager) chỉ đi moi ra các cảnh báo ĐÃ ĐƯỢC PHÁT HIỆN; chúng không chứng minh là cái thư viện đó trong sạch, cũng đéo chứng minh là cái đoạn code bị lỗi thực sự chạy tới được hệ thống của bạn. Dùng cây quyết định (decision tree) sau đây:

```text
Trình package-manager thông báo có lỗ hổng (vulnerability)
├── Mức độ: Nghiêm trọng (critical) hoặc Cao (high)
│   ├── Cái đoạn code bị lỗi đó có bị chạm tới (reachable) trên môi trường lúc chạy (runtime), lúc build, lúc test, hay deploy không?
│   │   ├── CÓ --> Sửa ngay lập tức (update, vá (patch), hoặc vứt mẹ cái dependency đó đi)
│   │   └── KHÔNG (xác nhận 100% đéo dùng qua các bước trên) --> Sửa sớm, nhưng không phải là yếu tố gây block
│   └── Đã có bản vá (fix) chưa?
│       ├── CÓ --> Cập nhật lên bản đã vá
│       └── KHÔNG --> Tìm đường lách (workarounds), cân nhắc thay thế thư viện, hoặc nhét nó vào danh sách trắng (allowlist) kèm theo một deadline ngày review lại
├── Mức độ: Vừa phải (moderate)
│   ├── Có dính dáng (Reachable) tới Production không? --> Sửa ở kỳ phát hành (release cycle) tiếp theo
│   └── Chỉ dính dáng ở lúc code (Dev-only)? --> Sửa lúc nào cũng được, ném nó vào backlog
└── Mức độ: Thấp (low)
    └── Cho vào sổ thù vặt và tự động xử nó khi nào có đợt update dependency định kỳ
```

**Các câu hỏi Mấu chốt:**
- Cái hàm (function) bị lỗi đó CÓ THỰC SỰ ĐƯỢC GỌI TỚI trong luồng chạy code của nhà bạn không?
- Cái dependency đó là thư viện chạy chính (runtime) hay chỉ để phụ trợ lúc code (dev-only)?
- Cái lỗ hổng đó có khai thác được trong môi trường triển khai của bạn không? (ví dụ: báo lỗi bảo mật server-side nhưng app của bạn chỉ chạy 100% client-side)?

Khi bạn quyết định dời việc fix lỗi lại, HÃY GHI LẠI LÝ DO (document) và hẹn một ngày đẹp trời để xem xét lại.

### Vệ sinh Chuỗi Cung ứng (Supply-Chain Hygiene)

Đừng mặc định nghĩ rằng người ta xài npm hoặc tiện tay vơ luôn cái file manifest gần nhất làm mốc cài đặt. Hãy tuân thủ trình tự sau:

1. **Tìm ra chính xác ranh giới cài đặt (installation boundary) và trình quản lý (manager) của dự án.** Dùng thư mục gốc workspace đang ôm lấy cái lockfile, hoặc một thư mục độc lập CẤP CON (nested project) chỉ khi nào nó nằm ngoài cái workspace. Ở đó, đối chiếu cẩn thận `packageManager` (nếu có ghi trong file), cái file lockfile, và hệ thống CI; Hãy DỪNG LẠI NGAY nếu thấy chúng nó đá nhau chan chát hoặc có 2 cái lockfile của 2 thằng manager phang nhau. Chốt chặt (Pin) cái version của package manager lại và xài cái bảng (matrix) tham chiếu trong `references/security-checklist.md`.
2. **Chặn (Block) mõm tất cả các dependency scripts trước khi chạy lần đầu.** Lúc tải đống thư viện (Bootstrap), phải khóa mõm cái script lại (scripts disabled) hoặc có chính sách báo fail-closed (thất bại là chặn đéo cho chạy). Cầm đèn rọi (inspect) vào mấy cái script đang chực chờ chạy, chỉ gật đầu (approve) cho những cái tối thiểu BẮT BUỘC, lưu (commit) cái lệnh cấm đấy lại, rồi verify lại bằng một cú cài đặt sạch sẽ không thay đổi rác (frozen/immutable install). TUYỆT ĐỐI KHÔNG BAO GIỜ bừa bãi gật đầu (blanket-approve) cho toàn bộ script chạy.

Lệnh Audit (kiểm định) chỉ mò ra các lỗ hổng đã lên báo; chúng đéo thể bắt được một cái package lừa đảo mới toanh hoặc lũ ký sinh trùng giả mạo tên (typosquatted package). Do vậy:

- **Tuyệt đối ĐÉO BAO GIỜ để máy tự động chữa (remediation) bừa bãi** (`npm audit fix --force` hoặc những câu lệnh ngu ngốc tương tự). Phải xem trước (preview) những gì nó định fix, đọc cho kỹ changelogs (lịch sử đổi code), và tự tay test lại sau MỖI LẦN upgrade; việc chày cối ép máy tự fix (forced fixes) có nguy cơ đá bay mẹ nó luôn mấy cái dependency ranges vốn có.
- **Xác minh các chữ ký (signatures) trên registry và nguồn gốc (provenance) nếu có hỗ trợ** (`npm audit signatures`, `pnpm audit signatures`) và coi sự vắng bóng của chữ ký như một tín hiệu để bạn phải điều tra, chứ đéo phải là bằng chứng 100% chứng minh dự án bị hack.
- **Review cẩn thận các library mới, các bản diff của lockfile, và mọi thay đổi về chính sách (policy) của đống script cùng một lúc** — soi cho ra chủ sở hữu (ownership), đội ngũ bảo trì (maintenance), tuổi thọ của lần release, nguồn gốc (provenance), cái cây phụ thuộc chằng chịt (transitive graph), và soi lòi con mắt mấy lũ mạo danh bẩn thỉu (typosquats) như `cross-env` vs `crossenv` (OWASP **A06**, **LLM03**).

## Giới hạn Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Gắn cái Rate limit chung chung cho API
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,                   // Cho phép tối đa 100 requests mỗi 15 phút
  standardHeaders: true,
  legacyHeaders: false,
}));

// Siết chặt bóp cổ đối với các endpoint Đăng nhập (auth)
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Chỉ cho thử tối đa 10 lần mỗi 15 phút
}));
```

## Quản lý Secret (Khóa Bí mật)

```text
Cấu trúc file .env:
  ├── .env.example  → Phải Commit (file mẫu/template chứa giá trị giả/placeholder)
  ├── .env          → KHÔNG ĐƯỢC COMMIT (chứa khóa bí mật thật sự của production)
  └── .env.local    → KHÔNG ĐƯỢC COMMIT (để dev tự config ghi đè dưới local)

File .gitignore BẮT BUỘC phải cấm cửa:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**Luôn luôn check trước khi gõ lệnh commit:**
```bash
# Rà soát xem có lỡ tay add dính cái bí mật nào không
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

**Nếu trót lỡ tay commit một cái secret lên Git, PHẢI THAY MỚI NÓ (rotate it).** Xóa đi cái dòng đó hay hì hục sửa lại Lịch sử Git (rewriting history) LÀ CHƯA ĐỦ — Một khi nó đã trôi lên remote, hãy coi như nó đã bị bọn hacker luộc cmnr. Hãy Hủy Bỏ (Revoke) và phát hành lại (reissue) một key mới đầu tiên, xong xuôi đâu đấy rồi hẵng dọn dẹp xóa xổ nó khỏi History.

## Bảo mật các Tính năng AI / LLM (Mô hình Ngôn ngữ Lớn)

Nếu ứng dụng của bạn có xài đến LLM (ví dụ chatbot, ứng dụng tóm tắt, agents, hệ thống RAG) — nó sẽ tự dưng được khuyến mãi thêm một mớ bề mặt tấn công (attack surface) mới toanh. Hãy soi chiếu nó vào bảng [Top 10 Lỗ hổng cho Ứng dụng LLM của OWASP (2025)](https://genai.owasp.org/llm-top-10/):

- **Hãy coi TOÀN BỘ output nhè ra từ con Model là đầu vào nguy hiểm (LLM05: Xử lý Output tồi).** Tuyệt đối KHÔNG BAO GIỜ nhét thẳng kết quả LLM vào lệnh `eval`, vào câu truy vấn SQL, chạy shell, đắp vô `innerHTML`, hay làm đường dẫn cho file path. Phải Kiểm định (Validate) và Mã hóa (Encode) nó cẩn thận y hệt như cái cách bạn đối xử với mớ user input nhơ nhớp ngoài kia.
- **Hãy giả định là cái Prompt của bạn ĐÃ BỊ HACK (LLM01: Tiêm nhiễm Prompt - Prompt Injection).** Những câu text không đáng tin bay vè vè trong cửa sổ context — như là tin nhắn chat của user, một trang web vừa cào về, hay một file PDF — hoàn toàn có thể là những câu Lệnh Ám Sát (instructions). Cái System prompt (Mệnh lệnh hệ thống) ĐÉO PHẢI là một chốt chặn bảo mật; muốn cấm cái gì, HÃY CẤM BẰNG CODE (permissions in code), ĐỪNG CÓ CẤM BẰNG MỘT CÂU VĂN TRONG PROMPT.
- **Dọn sạch Secrets và Data nhạy cảm của User khác ra khỏi cái Prompt (LLM02 / LLM07).** Thứ gì chui vào Context là thứ đó có nguy cơ bị con Model lải nhải đọc to lên (echoed back). Tuyệt đối Đừng có quăng API keys, data của tenant khác, hay nguyên cái System prompt mật truyền vào một chỗ hớ hênh để con Model nó phô ra cho thiên hạ ngắm.
- **Siết mồm siết cổ quyền của bọn Tool và Agent (LLM06: Cấp Quyền Láo - Excessive Agency).** Bóp chặt cái mỏ (scope tools) ở mức bé nhất có thể, Bắt buộc phải có Con người Bấm nút OK (require confirmation) trước khi thực thi mấy trò phá hoại (destructive) hay không thể rút lại (irreversible), và phải Khám Xét (validate) từng dấu phẩy (argument) ném vào tool.
- **Giới hạn Lòng tham (LLM10: Tiêu thụ Vô độ - Unbounded Consumption).** Hãy đóng trần (Cap) số lượng tokens, tốc độ request, và số vòng lặp (loop/recursion depth) để mấy thằng láu cá không thể lấy cái input rác rưởi ra để làm cháy túi tiền mây (cloud) của bạn hay treo cứng hệ thống.
- **Cách ly Kho Chứa Đồ của Retrieval (LLM08: Điểm yếu của Vector và Embedding).** Ở trong hệ thống RAG (Truy xuất - Tạo văn bản), hãy coi cái vector store (kho vector) là Ranh giới An ninh (trust boundary): Phải chia năm xẻ bảy mớ embeddings (tách riêng cho từng tenant) để thằng khách A đéo móc được tài liệu mật của thằng khách B, và phải gác cổng khám xét (validate documents) trước khi nhét mẹ cái nội dung độc hại (poisoned content) vào index để thao túng câu trả lời (steer answers).

```typescript
// NGU: ngoan ngoãn coi đống cứt con model ỉa ra (output) là một câu lệnh (command) hoặc 1 đoạn giao diện HTML
const sql = await llm.generate(`Viết câu SQL cho chức năng sau: ${userQuestion}`);
await db.query(sql);                                   // Hack full mẹ cái database luôn (arbitrary query execution)
container.innerHTML = await llm.reply(userMessage);   // Dính cmn quả XSS (stored XSS) qua con đường Model

// KHÔN: Coi Output của model cũng chỉ là rác rưởi (data) — phải bóc tách phòng ngự kỹ lưỡng, đi validate, rồi hẵng Encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError('Output của model nhảm nhí'); // Chết cmn từ lúc JSON.parse hoặc tạch màng lọc schema
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```

## Checklist Review Bảo mật (Security Review Checklist)

```markdown
### Xác thực (Authentication)
- [ ] Passwords đã được băm (hash) qua ngải cứu bcrypt/scrypt/argon2 (số lần băm - salt rounds ≥ 12)
- [ ] Session tokens đã chốt 3 cái khóa: httpOnly, secure, sameSite
- [ ] Login đã có giới hạn số lần gõ (rate limiting)
- [ ] Token quên mật khẩu (Password reset tokens) phải có hạn sử dụng (expire)

### Phân quyền (Authorization)
- [ ] Mọi endpoint đều phải gọi cửa tra quyền (user permissions)
- [ ] Ai có đồ người đấy xài (Users can only access their own resources)
- [ ] Các tính năng dành cho Admin phải tra đủ thẻ Admin

### Đầu vào (Input)
- [ ] MỌI mớ bòng bong do user nhập (user input) đều bị tóm cổ ở ngay vòng kiểm duyệt tại cửa khẩu (boundary)
- [ ] Câu query SQL đã bị xỏ gông (parameterized)
- [ ] Code HTML nôn ra đã được bọc khóa (encoded/escaped)
- [ ] Link URL do thằng server gọi lấy về (Server-side URL fetches) đã bị soi danh sách trắng (allowlisted) (không có cửa SSRF chọc ngoáy vào mạng nội bộ)

### Dữ liệu (Data)
- [ ] Không có cái khóa bí mật (secrets) nào lòi tòi phòi ra ở trong code hoặc trong hệ thống quản lý git (version control)
- [ ] Các thông tin nhạy cảm đã bị che kín bưng, đéo văng vào mặt API responses
- [ ] Data kiểu định danh PII (nếu có) phải bị bọc trong kén mã hóa (encrypted at rest)

### Hạ tầng (Infrastructure)
- [ ] Đã mặc áo giáp Security headers (CSP, HSTS, etc.)
- [ ] CORS đã khóa đít chỉ cho người quen (known origins) truy cập
- [ ] Đã khám sức khỏe mấy cái thư viện mượn (Dependencies audited for vulnerabilities)
- [ ] Thông báo lỗi (Error messages) đéo hớ hênh lòi chi tiết đồ lót (internals) của hệ thống ra ngoài

### Chuỗi cung ứng (Supply Chain)
- [ ] Có đúng 1 ông quan tòa Lockfile (authoritative lockfile) chốt sổ git; CI tuân thủ nghiêm ngặt bằng cú frozen/immutable install của chính thằng package manager đó
- [ ] Tool Audit có sẵn của manager đã phân loại 3 màu mổ xẻ dựa trên độ phủ (reachability) và mức độ rủi ro (fix risk); Các Script nhảm nhí lúc cài thư viện đã bị CẤM MÕM trừ phi có giấy thông hành (explicitly approved)
- [ ] Library mới nhập cảnh phải được tra hỏi gia phả (chủ, nguồn gốc, sinh nhật bản update (release age), gia phả lây lan (transitive graph))

### Trí khôn nhân tạo (AI / LLM) (nếu dùng)
- [ ] Output của Model bị đối xử như chó (untrusted - không eval/SQL/innerHTML/shell)
- [ ] Secrets và Đồ lót (Data) của thiên hạ không bị văng vãi phơi ở trong cái Prompts
- [ ] Kềm chặt xích cổ bọn Tool/agent; Đụng vào việc phá hoại (destructive actions) phải gọi Cấp Trên Bấm Nút OK (require confirmation)
```

## Xem thêm

Để xem bảng checklist bảo mật soi từng lỗ chân lông và các bước verification trước lúc commit (pre-commit), xem file `references/security-checklist.md`.

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Tool nội bộ ấy mà, dăm ba cái bảo mật quan tâm đéo gì" | Tool nội bộ cũng tạch như thường. Bọn hacker toàn tìm cái chuồng lợn yếu nhất để chui vào đấy. |
| "Thôi cứ code cho xong đi, bảo mật đắp sau" | Đắp vá (Retrofitting) bảo mật nhục gấp 10 lần so với việc xây mẹ nó ngay từ cái móng. Đắp ngay bây giờ đi. |
| "Ai rảnh đéo đâu mà hack mấy cái vớ vẩn này" | Mấy con bot quét dạo tự động (Automated scanners) đéo cần rảnh cũng thừa sức quét ra. Đem giấu đồ hớ hênh đi không gọi là bảo mật (Security by obscurity). |
| "Framework nó cân hết đống bảo mật này rồi" | Framework đưa mày con dao (tools), chứ đéo viết Giấy bảo hành sinh mạng (guarantees) cho mày. Mày vẫn phải học cách xài con dao đấy cho chuẩn. |
| "Bản Prototype (chạy nháp) thôi mà" | Mấy cái Prototype đẻ ra xong toàn bị đem nhét thẳng lên Production. Kỷ luật thép (Security habits) ngay từ ngày sơ sinh đi. |
| "Lên cái sơ đồ Mối Đe Dọa (Threat modeling) ở chỗ này là bé xé ra to rồi (overkill)" | 5 phút lẩm nhẩm "Nếu là tao thì tao sẽ phá cái này thế đéo nào?" sẽ cứu vãn được hàng tấn lỗi thiết kế rác rưởi (design flaws) mà đéo có chốt chặn nào (control) có thể bịt lại nổi sau này. |
| "Có mỗi mấy câu chữ text của con LLM nhè ra thôi mà" | Cái dòng "text" đó hoàn toàn có thể là một câu lệnh SQL, thẻ `<script>`, hay một câu lịnh xóa mẹ ổ đĩa (shell). Coi nó rác rưởi y hệt đống untrusted input ngoài kia đi. |
| "Chạy lệnh Audit pass xanh lè rồi, thư viện bao ngon" | Audit chỉ tra danh bạ xem có trùng mặt với bọn tội phạm lén lút (advisories) bị lộ mặt đợt trước không thôi. Chứ đéo tài nào mò ra được thằng trộm cắp mới nổi (malicious) hay thanh lọc hết mấy cái ổ vi khuẩn lây bệnh tự nổ (install scripts). |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Input của user đi thẳng một lèo vào lệnh tìm dữ liệu (queries), lệnh shell tàn phá (commands), hay nhét mẹ vào cục HTML để hiển thị (rendering).
- Rơi rớt Secrets (Khóa bí mật) trong code thô (source code) hay nằm la liệt trên vỉa hè lịch sử Git (commit history).
- Đẻ ra API endpoints lồng lộn chạy nhông nhông mà đéo thèm check thẻ ra vào (authentication) hay quyền sở hữu (authorization).
- Vô tâm ỉa ra lỗ hổng bẩn thỉu mang tên cấu hình CORS với dấu hoa thị (`*`) cho toàn thế giới truy cập.
- Đéo thèm gắn rào chắn (rate limiting) cho cái trạm biến áp sạc điện nguy hiểm nhất: API Đăng nhập.
- Ói mẹ nó mấy dòng mã gỡ rối (Stack traces) chằng chịt rách nát của máy chủ (internal errors) thẳng vào mồm thằng User lúc web sập.
- Thư viện mượn đính nguyên cục u nhọt bảo mật chết người (critical vulnerabilities), Hai cái Lockfile múa lửa phang nhau loạn xị ngậu giành chỗ cài đặt, Việc cài đặt không có tính lặp lại (non-reproducible installs), hoặc thả chó chạy rông (blanket-approved scripts).
- Server ngu học đi fetch bừa bãi đống URL của User ném cho mà đéo có danh sách trắng Allowlist bảo kê (dính SSRF).
- Cứt của con LLM/model (Output) nhét thẳng vào Query, DOM, Shell, hay `eval`.
- Secrets, PII, hay bê nguyên cái System prompt thần thánh quẳng vào trong chuồng bò Context window của LLM.

## Xác minh (Verification)

Sau khi implement đống code có liên quan đến bảo mật an ninh quốc gia:

- [ ] Lệnh Audit native đéo hề gào thét báo cáo về lỗi nguy hiểm (critical/high) nào có khả năng chạy vào luồng sinh thái; Dây chuyền CI trung thành với một cái lockfile duy nhất và khóa mõm thành công đống rác rưởi dependency scripts chưa có giấy thông hành.
- [ ] Source code và lịch sử Git (git history) trắng như ngọc trinh đéo dính tí Secrets nào.
- [ ] Toàn bộ rác thải của user (input) đều đã bị khám xét nội tạng tại trạm gác biên phòng (system boundaries).
- [ ] Trạm kiểm soát Đăng nhập (Authentication) và Phân quyền (authorization) lừng lững trước mọi Endpoint nằm trong vùng cấm (protected endpoint).
- [ ] Trạm gác (Security headers) chễm chệ vung vũ khí trong cục Response (mở DevTools trình duyệt lên mà soi).
- [ ] Lỗi văng ra không để lộ tí sịp lọt khe (internal details) nào.
- [ ] Rào chắn quá tải (Rate limiting) đang chặn cổng ở các API auth.
- [ ] Tụi URLs lạ hoắc (do Server cắn từ Client) bị hất cẳng không có trong thẻ Allowlist (không dính nhọt SSRF).
- [ ] Cứt của tụi AI (LLM/model output) đã được kiểm dịch cẩn thận (validated) và mã hóa (encoded) trước khi thả ra (nếu có xài chức năng AI).
