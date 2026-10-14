# Cẩm Nang Phòng Ngừa Lỗ Hổng OWASP Top 10 & Code Snippets

## Các Mẫu Phòng ngừa OWASP Top 10

Đây là các pattern phòng ngừa, không phải là bảng xếp hạng. Để xem thứ tự năm 2021, hãy xem bảng tham chiếu nhanh trong `../../../code-reviewer/skills/security-code-audit/references/security-checklist.md`.

### Injection (SQL, NoSQL, Lệnh Hệ điều hành)

```typescript
// TỒI: SQL injection qua việc nối chuỗi (string concatenation)
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// TỐT: Truy vấn được tham số hóa (Parameterized query)
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// TỐT: ORM với đầu vào đã tham số hóa
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Xác thực Bị hỏng (Broken Authentication)

```typescript
// Băm mật khẩu (Password hashing)
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;
const hashedPassword = await hash(plaintext, SALT_ROUNDS);
const isValid = await compare(plaintext, hashedPassword);

// Quản lý phiên (Session management)
app.use(session({
  secret: process.env.SESSION_SECRET,  // Từ biến môi trường, không để trong code
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Không thể truy cập qua JavaScript
    secure: true,       // Chỉ dùng HTTPS
    sameSite: 'lax',    // Chống CSRF
    maxAge: 24 * 60 * 60 * 1000,  // 24 giờ
  },
}));
```

### Cross-Site Scripting (XSS)

```typescript
// TỒI: Render đầu vào của người dùng thành HTML
element.innerHTML = userInput;

// TỐT: Dùng auto-escaping của framework (React mặc định làm thế này)
return <div>{userInput}</div>;

// Nếu BẮT BUỘC phải render HTML, hãy sanitize (làm sạch) trước
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Phá vỡ Kiểm soát Truy cập (Broken Access Control)

```typescript
// Luôn kiểm tra authorization (quyền), không chỉ authentication (đăng nhập)
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);

  // Kiểm tra xem người dùng đang đăng nhập có sở hữu tài nguyên này không
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Không có quyền sửa task này' }
    });
  }

  // Tiếp tục cập nhật
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

### Cấu hình Bảo mật Sai (Security Misconfiguration)

```typescript
// Security headers (dùng helmet cho Express)
import helmet from 'helmet';
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Siết chặt hơn nếu có thể
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
}));

// CORS — giới hạn chỉ cho các domain đã biết
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

### Lộ Dữ liệu Nhạy cảm (Sensitive Data Exposure)

```typescript
// Không bao giờ trả về các trường nhạy cảm trong API responses
function sanitizeUser(user: UserRecord): PublicUser {
  const { passwordHash, resetToken, ...publicFields } = user;
  return publicFields;
}

// Dùng biến môi trường cho các secrets
const API_KEY = process.env.STRIPE_API_KEY;
if (!API_KEY) throw new Error('STRIPE_API_KEY chưa được cấu hình');
```

### Giả mạo Yêu cầu Phía Máy chủ (SSRF - Server-Side Request Forgery)

Bất cứ khi nào server tải một URL bị ảnh hưởng bởi người dùng — webhooks, "import từ URL", proxy hình ảnh, link previews — một kẻ tấn công có thể nhắm URL đó vào các dịch vụ nội bộ (metadata trên cloud, `localhost`, IPs nội bộ).

```typescript
// TỒI: fetch bất cứ thứ gì user gửi
await fetch(req.body.webhookUrl);

// TỐT: allowlist chứa scheme + host, từ chối nếu BẤT KỲ IP phân giải nào là IP nội bộ, cấm redirects
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const ALLOWED_HOSTS = new Set(['hooks.example.com']);

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Chỉ cho phép HTTPS');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('Host không nằm trong danh sách cho phép');
  // Phân giải TOÀN BỘ records; chỉ một địa chỉ private/reserved là đủ fail.
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.some((a) => ipaddr.parse(a.address).range() !== 'unicast')) {
    throw new Error('IP thuộc dải Private/Reserved');
  }
  return url;
}

await fetch(await assertSafeUrl(req.body.webhookUrl), { redirect: 'error' });
```

Kiểm tra `range() !== 'unicast'` bao gồm luôn dải loopback, link-local `169.254.169.254` (cloud metadata, mục tiêu số 1 của SSRF), private, và dải unique-local của cả IPv4 và IPv6.

**Lưu ý — Cách này vẫn còn lỗ hổng TOCTOU (Time-of-check to time-of-use).** Lệnh `fetch` sẽ tự phân giải DNS lại một lần nữa sau bước kiểm tra, nên một kẻ tấn công dùng DNS có TTL ngắn có thể rebind (đổi IP) sang IP nội bộ ngay giữa lúc validate và kết nối. Với bề mặt tấn công rủi ro cao, hãy phân giải 1 lần và kết nối bằng IP đã được ghim chặt (pinned IP), hoặc đặt một proxy kiểm duyệt ở phía trước (`request-filtering-agent` / `ssrf-req-filter`).

## Các Mẫu Validate Đầu vào (Input Validation)

### Schema Validation tại Ranh giới

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

// Validate ngay tại route handler
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input không hợp lệ',
        details: result.error.flatten(),
      },
    });
  }
  // result.data lúc này đã được xác thực (validated) và có type rõ ràng
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

### An toàn Upload File

```typescript
// Hạn chế loại file và dung lượng
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError('Loại file không được phép');
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('File quá lớn (tối đa 5MB)');
  }
  // Đừng tin tưởng vào đuôi file (extension) — hãy kiểm tra magic bytes nếu nó là quan trọng
}
```

## Phân loại Kết quả Dependency Audit

Công cụ audit của package-manager sẽ báo cáo các tư vấn bảo mật (advisories) đã biết; chúng KHÔNG CHỨNG MINH rằng một package là đáng tin cậy hay đoạn mã chứa lỗ hổng thực sự chạy được. Hãy dùng cây quyết định sau:

```
Công cụ audit native báo cáo có một lỗ hổng
├── Mức độ: Critical (Nghiêm trọng) hoặc High (Cao)
│   ├── Đoạn code bị lỗi đó có được gọi tới khi chạy (runtime), build, test, hay khi deploy không?
│   │   ├── CÓ --> Sửa ngay lập tức (update, patch, hoặc thay thế dependency đó)
│   │   └── KHÔNG (xác nhận là không hề được dùng ở đâu) --> Sửa sớm, nhưng không phải chặn khẩn cấp
│   └── Có sẵn bản vá chưa?
│       ├── CÓ --> Update lên phiên bản đã được vá (patched version)
│       └── KHÔNG --> Tìm workaround, cân nhắc đổi dependency khác, hoặc thêm vào allowlist và hẹn ngày review lại
├── Mức độ: Moderate (Vừa phải)
│   ├── Có chạy trên production không? --> Sửa ở chu kỳ release kế tiếp
│   └── Chỉ ở môi trường Dev? --> Sửa lúc nào tiện, theo dõi ở trong backlog
└── Mức độ: Low (Thấp)
    └── Theo dõi và sửa chung trong những đợt update dependency định kỳ
```

**Các câu hỏi quan trọng:**
- Hàm bị hở lỗ hổng có TỰ SỰ BỊ GỌI trong đường dẫn code của bạn không?
- Dependency đó có chạy trên môi trường thực tế (runtime) hay chỉ chạy ở môi trường Dev?
- Lỗ hổng đó có khả năng bị khai thác trong ngữ cảnh triển khai của bạn không (VD: Một lỗ hổng phía server nhưng lại nằm trong app chỉ chạy trên client)?

Khi bạn trì hoãn một bản sửa lỗi, hãy tài liệu hóa lý do và đặt ngày hẹn review lại.

### Vệ sinh Chuỗi cung ứng (Supply-Chain Hygiene)

Đừng mặc định nghĩ là đang dùng `npm` hoặc lấy file manifest gần nhất làm gốc cài đặt. Hãy áp dụng thứ tự này:

1. **Tìm ranh giới cài đặt và trình quản lý.** Dùng gốc workspace chứa file lockfile, hoặc dự án con độc lập chỉ khi nó nằm ngoài workspace đó. Ở đó, đối chiếu `packageManager` (nếu có), file lockfile, và CI; dừng lại nếu có sự mâu thuẫn hoặc có nhiều lockfile cạnh tranh. Ghim cứng (Pin) phiên bản của package manager và sử dụng bảng ma trận trong `../../../code-reviewer/skills/security-code-audit/references/security-checklist.md`.
2. **Chặn (Block) dependency scripts trước lần chạy đầu tiên.** Chạy cài đặt ban đầu (Bootstrap) với các scripts bị vô hiệu hóa hoặc theo chính sách "fail-closed" (đóng nếu có lỗi) đã được ghi lại, xem xét mã nguồn của script đang chờ duyệt, CHỈ CHO PHÉP những package tối thiểu được duyệt, lưu chính sách lại, sau đó xác minh bằng việc chạy cài đặt sạch (clean frozen/immutable install). Tuyệt đối không bao giờ cho phép chạy vô tội vạ toàn bộ script (blanket-approve scripts).

Audit chỉ tìm ra các cảnh báo đã được biết đến; chúng không bắt được các package vừa trở nên độc hại hoặc bị lập tên na ná để đánh lừa (typosquatted). Do đó:

- **Không bao giờ áp dụng tự động các đề xuất sửa lỗi audit (audit remediation)** (kiểu `npm audit fix --force` hay tương tự). Hãy xem trước cách sửa, đọc changelogs, và test từng bản nâng cấp; việc ép sửa (forced fixes) có thể nhảy vượt qua phiên bản dải dependency khai báo ban đầu.
- **Xác minh chữ ký trên registry và nguồn gốc (provenance) nếu có hỗ trợ** (`npm audit signatures`, `pnpm audit signatures`) và coi việc thiếu chúng là tín hiệu để điều tra thêm, không phải là bằng chứng chắc chắn là có rủi ro.
- **Review các dependency mới, sự thay đổi (diff) trong lockfile, và sự thay đổi trong script-policy cùng một lúc** — xem quyền sở hữu, tình trạng bảo trì, thời gian release, provenance, chuỗi phụ thuộc (transitive graph), và các trường hợp cài tên tương tự như `cross-env` so với `crossenv` (OWASP **A06**, **LLM03**).

## Giới hạn Tỷ lệ (Rate Limiting)

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit chung cho API
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,                   // 100 requests mỗi window
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limit khắt khe hơn cho các endpoint Auth
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Tối đa 10 lần thử mỗi 15 phút
}));
```

## Quản lý Bí mật (Secrets Management)

```
File .env:
  ├── .env.example  → Được commit (template chỉ chứa các placeholder)
  ├── .env          → KHÔNG commit (chứa secret thật)
  └── .env.local    → KHÔNG commit (ghi đè tùy biến môi trường local)

.gitignore bắt buộc phải bao gồm:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**Luôn kiểm tra trước khi commit:**
```bash
# Kiểm tra xem có lỡ add secret vào không
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

**Nếu một secret lỡ bị commit, hãy xoay vòng (rotate) nó ngay.** Chỉ xóa cái dòng đó đi hoặc sửa lại lịch sử git là chưa đủ — hãy coi như nó đã bị lộ ngay khoảnh khắc nó chạm tới remote server. Hãy thu hồi (revoke) và tạo lại key mới trước tiên, sau đó mới dọn dẹp nó khỏi git history.

## Bảo mật tính năng AI / LLM

Nếu app của bạn có gọi LLM — chatbots, tóm tắt, agents, RAG — nó sẽ nhận thêm một bề mặt tấn công hoàn toàn mới. Hãy map nó với [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/):

- **Coi mọi output của model như là untrusted input (Đầu vào không đáng tin - LLM05: Improper Output Handling).** Đừng bao giờ truyền output của LLM thẳng vào `eval`, SQL, terminal (shell), `innerHTML`, hoặc truyền làm đường dẫn file. Hãy validate và encode nó y hệt như với input trực tiếp của user.
- **Giả định prompts (câu lệnh) có thể bị thao túng (LLM01: Prompt Injection).** Những đoạn chữ untrusted nằm trong ngữ cảnh (context window) — từ tin nhắn user, nội dung fetch từ web, cho tới PDF — đều có khả năng mang theo chỉ thị lệnh. System prompt không phải là ranh giới bảo mật; hãy thực thi quyền bằng code, đừng dùng prompt để cấm đoán.
- **Không để secrets và dữ liệu của user khác dính vào prompts (LLM02 / LLM07).** Bất cứ cái gì ở trong context cũng có thể bị đọc ra lại. Đừng quăng API keys, dữ liệu nhạy cảm xuyên suốt các user (cross-tenant data), hoặc quăng nguyên cái system prompt vào nơi mà con model có thể tuồn ra lại (repeat it).
- **Ràng buộc các tool và đặc quyền của agent (LLM06: Excessive Agency).** Hãy giữ phạm vi hoạt động của tool ở mức tối thiểu, yêu cầu người dùng xác nhận cho các hành động phá hoại hoặc không thể đảo ngược, và validate mọi argument truyền cho tool.
- **Giới hạn mức tiêu thụ (LLM10: Unbounded Consumption).** Hãy áp trần cho số token, giới hạn tần suất request, và độ sâu của vòng lặp/đệ quy, để một input cố tình thiết kế sẽ không thể đốt tiền bạn hay treo hệ thống.
- **Cô lập dữ liệu tìm kiếm (LLM08: Vector and Embedding Weaknesses).** Trong hệ thống RAG, hãy coi CSDL Vector (vector store) là một ranh giới bảo mật: hãy phân vùng các embedding riêng lẻ cho từng người dùng/tenant để user này không tìm thấy data của user khác, và phải validate documents trước khi index để phòng trường hợp nội dung bị đánh độc (poisoned content) lái câu trả lời đi sai hướng.

```typescript
// TỒI: tin tưởng output của model như một câu lệnh hoặc HTML markup
const sql = await llm.generate(`Viết câu SQL cho: ${userQuestion}`);
await db.query(sql);                                   // Lệnh thực thi tuỳ ý nguy hiểm
container.innerHTML = await llm.reply(userMessage);   // Bị XSS (stored XSS), qua trung gian là model

// TỐT: output của model cũng chỉ là data — parse thật phòng thủ, validate nó, sau đó encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError('Output của model sai định dạng'); // Lỗi JSON.parse hoặc sai Schema
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```

