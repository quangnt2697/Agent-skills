---
name: performance-optimization
description: Tối ưu hóa hiệu năng (performance) ứng dụng bao gồm cả frontend, backend, câu lệnh truy vấn (queries), và cơ sở dữ liệu. Sử dụng khi có các yêu cầu về hiệu năng, khi nghi ngờ hiệu năng bị sụt giảm (regressions), khi các chỉ số Core Web Vitals hoặc tốc độ load cần cải thiện, khi bắt gặp lỗi N+1 queries, hoặc khi đo đạc (profiling) phát hiện ra nút thắt cổ chai (bottlenecks).
---

# Kỹ năng: Tối ưu hóa Hiệu năng (Performance Optimization)

## Tổng quan

PHẢI ĐO LƯỜNG trước khi tối ưu. Cắm đầu đi tối ưu mà đéo đo lường thì chỉ là đoán mò — và việc đoán mò sẽ dẫn tới Tối ưu hóa sớm (premature optimization), nhét thêm cả đống logic phức tạp vào code mà đéo mang lại lợi ích gì sất. Đầu tiên phải Đo (Profile), rồi xác định xem cái nút thắt cổ chai (bottleneck) THỰC SỰ nằm ở đâu, sửa nó, rồi ĐO LẠI MỘT LẦN NỮA. Chỉ tối ưu những thứ mà số liệu chứng minh là đáng để làm.

## Khi nào cần sử dụng

- Khi spec (đặc tả) có yêu cầu rõ ràng về hiệu năng (Load time budgets, SLAs về response time).
- Người dùng hoặc hệ thống monitoring gào thét báo app chạy chậm.
- Các điểm số Core Web Vitals nằm dưới mức tiêu chuẩn.
- Bạn nghi ngờ một đoạn code mới làm chậm mẹ nó hệ thống (regression).
- Xây dựng các tính năng phải xử lý lượng dữ liệu khổng lồ hoặc lượng truy cập (traffic) cực lớn.

**Khi KHÔNG NÊN xài:** Đừng có cắm đầu tối ưu nếu bạn đéo có trong tay bằng chứng chứng minh nó có vấn đề. Tối ưu sớm (Premature optimization) sẽ đẻ ra những cục code rườm rà, chi phí duy trì đắt hơn nhiều so với cái hiệu năng quèn thu lại được.

## Mục tiêu Core Web Vitals

| Chỉ số | Ngon (Good) | Cần cải thiện (Needs Improvement) | Tồi tệ (Poor) |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint - Hiện cục to nhất) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint - Tốc độ phản hồi) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift - Giật lag bố cục) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Quy trình Tối ưu hóa (The Optimization Workflow)

```text
1. ĐO LƯỜNG (MEASURE)  → Xác lập cột mốc xuất phát (baseline) bằng dữ liệu thật
2. CHỈ ĐIỂM (IDENTIFY) → Tìm chính xác cái nút thắt (bottleneck) (chứ đéo phải đoán mò)
3. FIX                 → Trị dứt điểm đúng cái nút thắt đó
4. XÁC MINH (VERIFY)   → Đo lại lần nữa; Giữ lại hoặc Rollback
5. PHÒNG VỆ (GUARD)    → Bổ sung monitoring hoặc bài test để chống bị lặp lại lỗi
```

### Bước 1: Đo lường (Measure)

Có hai phương pháp bổ trợ nhau — bắt buộc xài cả hai:

- **Đo nhân tạo Synthetic (Lighthouse, thẻ Performance trong DevTools):** Môi trường cách ly có kiểm soát, có thể chạy lặp lại y hệt (reproducible). Cực kỳ hữu dụng khi cắm vào CI để bắt lỗi tụt lùi hiệu năng (regression) và bóc tách cô lập từng vấn đề.
- **Đo thực tế RUM (web-vitals library, CrUX):** Dữ liệu trải nghiệm của người dùng Thật trong môi trường Thật. Đóng vai trò phán quyết xem cái "cục fix lỗi" kia có thực sự mang lại giá trị cho người dùng không.

**Frontend:**
```bash
# Nhân tạo (Synthetic): Lighthouse ngay trong Chrome DevTools (hoặc chạy trên CI)
# Chrome DevTools → Thẻ Performance → Bấm Record
# Hoặc dùng: Chrome DevTools MCP → Tính năng Performance trace

# Thực tế (RUM): Chèn thư viện Web Vitals vào code
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

**Backend:**
```bash
# Đánh Log Response time (thời gian phản hồi)
# Cắm các hệ thống APM (Application Performance Monitoring)
# Đánh Log các câu query Database kèm theo thời gian chạy (timing)

# Cách đo time rẻ tiền mà hiệu quả
console.time('db-query');
const result = await db.query(...);
console.timeEnd('db-query');
```

### Bắt đầu Đo từ đâu (Where to Start Measuring)

Lấy cái Triệu chứng làm kim chỉ nam:

```text
Cái gì đang bị Chậm?
├── Chậm ngay từ cái Trang Load đầu tiên
│   ├── Do cục Bundle to quá? --> Đo kích thước Bundle, băm nhỏ code ra (code splitting)
│   ├── Do Server trả về chậm? --> Đo chỉ số TTFB ở thẻ Network waterfall trong DevTools
│   │   ├── Do resolve DNS quá lâu? --> Gắn dns-prefetch / preconnect cho các origin quen
│   │   ├── Bắt tay TCP/TLS quá lâu? --> Bật HTTP/2, check lại edge CDN, bật keep-alive
│   │   └── Do Server xử lý (Waiting) quá lâu? --> Đo lường Backend, soi lại Queries và cơ chế Caching
│   └── Do tài nguyên block render? --> Soi Network waterfall tìm xem có cái file CSS/JS nào đang chình ình cản đường không
├── Bấm vào lag lag đơ đơ (Sluggish interaction)
│   ├── Bấm 1 phát UI đứng cmn hình? --> Soi Profiler tìm mấy cái hàm khổng lồ khóa chặt luồng Main thread (long tasks >50ms)
│   ├── Gõ phím vào Form bị lag? --> Soi lại quá trình re-renders, kiểm tra độ ngốn (overhead) của controlled component
│   └── Animation giật cục (Jank)? --> Soi xem có bị layout thrashing hay forced reflows không
├── Chậm lúc chuyển trang (Page after navigation)
│   ├── Đợi Load Data? --> Đo API response times, soi xem có dính fetch thác nước (waterfalls) không
│   └── Đợi Client render? --> Đo thời gian component render, kiểm tra xem có dính đạn N+1 fetches không
└── Đéo phải, là do Backend / API chậm
    ├── Có đúng một cái endpoint bị chậm? --> Đè Database ra soi (profile queries), check Indexes (đánh chỉ mục)
    ├── Endpoint đéo nào cũng chậm? --> Kiểm tra xem tràn Connection pool không, RAM, CPU có đỏ lòm không
    └── Chập chờn lúc chậm lúc không? --> Kiểm tra xem có bị Lock contention (kẹt khóa db), có bị GC pause (tắt thở dọn rác), hoặc do gọi API của bên thứ 3 không
```

### Bước 2: Chỉ điểm Nút thắt (Identify the Bottleneck)

Các nút thắt kinh điển:

**Frontend:**

| Triệu chứng | Khả năng cao (Likely Cause) | Chỗ cần điểu tra |
|---------|-------------|---------------|
| Tạch LCP | Ảnh quá tạ, tài nguyên Render-blocking, Server phản hồi chậm như rùa | Xem Network waterfall, Soi dung lượng ảnh |
| Tạch CLS | Ảnh đéo khai báo kích thước (dimensions), Content load chậm chèn ép layout, Nhảy Font (font shifts) | Soi tính năng Layout shift attribution |
| Tạch INP | Luồng chính (Main thread) gánh cục JS quá nặng, Cập nhật DOM quá khủng | Tìm các "long tasks" trong Performance trace |
| Initial load rùa bò | Cục Bundle quá to, Bắn tỷ cái Network requests | Soi Bundle size, Code splitting |

**Backend:**

| Triệu chứng | Khả năng cao (Likely Cause) | Chỗ cần điểu tra |
|---------|-------------|---------------|
| API rặn mãi mới ra | Bệnh N+1 queries, Quên đánh index, Query ngu | Mở bảng Log truy vấn Database ra soi |
| Phình to Memory | Bị rò rỉ bộ nhớ (Leaked references), Cache vô tội vạ, Cục Payloads gửi qua quá to | Mở Heap snapshot ra soi |
| Cháy CPU | Chạy đồng bộ (Sync) một đống thuật toán nặng, dính lỗi Regex backtracking | Bật CPU profiling |
| Độ trễ cao (High latency) | Đéo có Caching, Tính toán lặp đi lặp lại dư thừa, Trải qua quá nhiều network hops | Dò theo dấu chân request (Trace requests) đi xuyên qua các tầng |

### Bước 3: Sửa các thói quen Tồi (Anti-Patterns)

#### Bệnh N+1 Queries (Backend)

```typescript
// NGU: Dính lỗi N+1 — lặp N lần để kéo data owner tương ứng cho từng cái task một
const tasks = await db.tasks.findMany();
for (const task of tasks) {
  task.owner = await db.users.findUnique({ where: { id: task.ownerId } });
}

// KHÔN: Bắn ĐÚNG 1 CÂU QUERY duy nhất xài join/include
const tasks = await db.tasks.findMany({
  include: { owner: true },
});
```

#### Fetch Dữ liệu Đéo có Giới hạn

```typescript
// NGU: Hút toàn bộ data về (địt cụ có hàng triệu bản ghi thì cháy mẹ RAM)
const allTasks = await db.tasks.findMany();

// KHÔN: Dùng phân trang (Paginated) kèm giới hạn (limits)
const tasks = await db.tasks.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

#### Đéo thèm Tối ưu Hình ảnh (Frontend)

```html
<!-- NGU: Không khai báo kích thước (dimensions), đéo thèm tối ưu định dạng (format) -->
<img src="/hero.jpg" />

<!-- KHÔN: Hình ảnh Hero / LCP — Chơi tính năng Art direction + Tráo đổi độ phân giải (resolution switching) + Gắn Cờ Ưu tiên (high priority) -->
<!--
  Kết hợp 2 tuyệt kỹ võ công:
  - Art direction (media): Tự đổi khung hình tỉ lệ (crop) cho vừa khít với màn mobile/desktop
  - Resolution switching (srcset + sizes): Ném ra bức ảnh có dung lượng vừa khít với mật độ điểm ảnh (screen density)
-->
<picture>
  <!-- Mobile: Cắt ảnh dọc (portrait crop) (tỉ lệ 8:10) -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: Cắt ảnh ngang (landscape crop) (tỉ lệ 2:1) -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Ảnh bìa vĩ đại"
  />
</picture>

<!-- KHÔN: Đối với ảnh nằm tuốt luốt ở dưới (Below-the-fold) — Kích hoạt lazy loaded + async decoding (giải mã ngầm) -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="Ảnh phụ bên dưới"
/>
```

#### Re-renders Tào lao (React)

```tsx
// NGU: Mỗi lần cha render là đẻ ra 1 cái object hoàn toàn mới (khác mẹ nó reference tĩnh), làm cho con cũng phải hì hục render theo
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// KHÔN: Chốt chết reference bằng const (Stable reference)
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// Dùng React.memo che chở cho mấy cái component nặng trịch
const TaskItem = React.memo(function TaskItem({ task }: Props) {
  return <div>{/* Bọn này render tốn sức vãi */}</div>;
});

// Dùng useMemo để né việc phải chạy lại mấy thuật toán tính toán khổng lồ
function TaskStats({ tasks }: Props) {
  const stats = useMemo(() => calculateStats(tasks), [tasks]);
  return <div>{stats.completed} / {stats.total}</div>;
}
```

#### Cục Bundle Quá Phì Nộn

```typescript
// Các bundlers xịn bây giờ (như Vite, webpack 5+) đều tự biết lọc bỏ code thừa (tree-shaking) khi xài Named Imports,
// với điều kiện là cái thư viện phụ thuộc kia hỗ trợ ESM và có đóng mác `sideEffects: false` trong package.json.
// Nhớ Profile (Đo đạc) trước khi định hì hục đi sửa lại cú pháp imports — cái giúp bạn tăng tốc độ thật sự là splitting (cắt băm code) và lazy loading (cần mới gọi).

// KHÔN: Xài Dynamic import cho mấy cái thư viện vĩ đại nhưng hiếm khi dùng tới
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// KHÔN: Băm component theo từng Route (Route-level code splitting) bọc bởi Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

#### Bỏ quên Caching (Backend)

```typescript
// Phải Cache (Lưu tạm) lại mấy cái dữ liệu bị kéo thường xuyên (frequently-read) nhưng ít bị thay đổi
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// Bơm HTTP caching headers cho mớ tài nguyên cứng (static assets)
app.use('/static', express.static('public', {
  maxAge: '1y',           // Đóng băng bộ nhớ cache trong 1 năm luôn
  immutable: true,        // Khẳng định đéo bao giờ hết hạn (Nên xài trò băm nội dung thành tên file - content hashing)
}));

// Nhét Cache-Control thẳng vào API responses
res.set('Cache-Control', 'public, max-age=300'); // 5 phút thôi
```

### Bước 4: Xác minh Verify (Giữ Lại hoặc Hoàn Tác/Revert)

Một cục "Fix lỗi hiệu năng" mãi mãi chỉ là Cục Cứt cho đến khi bạn Đo Lại (re-measure). Bước này đưa ra phán quyết Sinh Tử cho cục code đó.

**Đo y hệt cái cách bạn đo lúc đầu (baseline):** Cùng 1 câu lệnh, cùng 1 môi trường, cùng 1 định mức giới hạn (thời gian chạy wall-clock, số lượng lấy mẫu, hoặc số requests). Nếu lấy số Baseline lúc cache đang Lạnh (cold) mang đi so sánh với lúc cache đang Nóng (warm) thì cái bạn đo được mẹ nó là sức mạnh của Cache, chứ đéo phải là thành tựu sửa code của bạn.

**Mỗi lần chỉ thay đổi ĐÚNG 1 THỨ.** Gộp 3 quả "tối ưu" vĩ đại vào làm 1 lần đẻ ra một cái con số ảo ma mà bạn đéo thể biết được công lao thực sự thuộc về cục nào. Nếu bắt buộc phải phát hành chung, hãy tách chúng ra đo độc lập trước đã.

**Chiến thắng sai số, chứ không phải chỉ là lấy trung bình.** Cứ đo đi đo lại rồi so sánh mức độ lệch (delta) so với Sai số giữa mỗi lần đo (variance). Tăng tốc được 3% mà cái dao động sai số (variance) lên tới ±5% thì đấy đéo phải là tối ưu; đấy là Mẫu Lấy Bị Lệch.

Sau đó, hạ bút quyết định Thật Nghiêm Khắc:

| Kết quả vs. baseline | Hành động |
|---|---|
| Chênh lệch tốt (Pass threshold), test pass xanh | **GIỮ LẠI (Keep).** Commit cùng với thông số Trước/Sau vào trong nội dung message. |
| Kết quả nằm gọn trong vùng Sai số (đéo khác bọt mấy) | **XÓA MẸ ĐI (Revert).** |
| Hiệu năng Tụt mẹ xuống | **XÓA MẸ ĐI (Revert).** |
| Chạy vù vù, NHƯNG chết cụ nó mất 1 bài test | **XÓA MẸ ĐI (Revert).** Đây là 1 cục Regression (sụt lùi) đội lốt win. |

**"Không đổi" (Neutral) nghĩa là XÓA, chứ đéo phải giữ.** Đây là cái bước mà các team chuyên môn skip (bỏ qua): Đoạn code nhọc nhằn lỡ viết ra rồi, xóa đi thì tiếc của giời, thế là kệ mẹ cứ đẩy lên dù chả thấy hiệu năng tăng tí nào, kết quả là rác rưởi (complexity) phình to ra mà đéo được lợi lộc gì. Code ném lên là bạn phải gánh nó cả đời. Hãy bắt nó chứng minh giá trị của mình.

**Tính đúng đắn (Correctness) là cánh cổng khóa chặt mọi cái metric kia.** Toàn bộ Test suite PHẢI xanh *và* con số kia phải tăng. Một trò lươn lẹo "tối ưu" kiểu rút gọn bớt một bước tính toán quan trọng (bỏ đi 1 cái validation, lén nhét cache vào chỗ cần dữ liệu tươi ngon (fresh), bẻ gãy 1 chữ `await` sống còn) thì đó là NGANG NHIÊN PHÁ HOẠI (regression), đéo phải là Tối ưu (Win).

#### Phải Ghi Lại Mọi Nỗ Lực (Nhất là những cái Vừa Bị Xóa)

Code bị xóa thì Git history cũng đéo lưu lại gì, và đó là lý do vì sao quý sau lại có 1 thằng ngu đi lặp lại Y XÌ PHÓC cái trò tối ưu dở hơi đấy. Lập một cái sổ Nam Tào (ledger) nhỏ nhỏ để ghi chú mấy cái ý tưởng Rác này lại:

| Ý tưởng | Baseline → Kết quả | Phán quyết | Lý do |
|---|---|---|---|
| Memoize cái row component đi | INP 240ms → 235ms | BỊ XÓA | Dao động chỉ nhích có ±15ms (trong ngưỡng sai số tiếng ồn/noise). Đéo phải do mớ Rows làm chậm. |
| Ảo hóa (Virtualize) cái list này xem | INP 240ms → 90ms | GIỮ LẠI | Mấy cục Long tasks biến mẹ mất khỏi the trace rồi. |
| Preconnect vào nguồn API gốc | LCP 2.8s → 2.8s | BỊ XÓA | Cùng 1 cái Domain (same-origin) mẹ rồi, đéo cần. |

Nhét nó vào cái phần mô tả của PR hoặc vứt nó vào file `PERF.md` trong repo. Mục đích là để cái thằng khứa kế tiếp (hoặc ông Agent kế tiếp) đọc được nó trước khi định cắm đầu làm lại 1 cái thí nghiệm vừa mới vứt sọt rác hôm qua.

## Ngân sách Hiệu năng (Performance Budget)

Đóng khung cái ngân sách lại và thi hành lệnh Thiết Quân Luật:

```text
Cục JavaScript bundle: < 200KB gzipped (nhát load đầu tiên)
CSS: < 50KB gzipped
Ảnh ọt: < 200KB trên 1 ảnh (đối với phần cuộn màn hình ở trên cùng)
Fonts: < 100KB tổng cộng
API response time: < 200ms (p95)
Tốc độ phản hồi (Time to Interactive): < 3.5s trên mạng 4G
Lighthouse Performance score: ≥ 90
```

**Ban lệnh thiết quân luật trong CI:**
```bash
# Trảm ngay nếu Bundle vượt ngưỡng
npx bundlesize --config bundlesize.config.json

# Cắm Lighthouse vào CI
npx lhci autorun
```

## Xem Thêm

Để nắm rõ bản checklist siêu chi tiết về đo đạc hiệu năng, các câu lệnh trảm, và danh sách các anti-pattern, mời đọc `references/performance-checklist.md`.

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Thôi từ từ tối ưu sau" | Món nợ hiệu năng (Performance debt) nó lãi mẹ đẻ lãi con đấy. Trị dứt điểm mấy cái anti-patterns rõ rành rành kia NGAY BÂY GIỜ ĐI, mấy cái tối ưu li ti (micro-optimizations) thì để sau cũng được. |
| "Ơ tao chạy ở máy tao mượt vãi lồn mà" | Máy của mày có phải là cái điện thoại cùi bắp của khách hàng đéo đâu. Đo đạc (Profile) ở trên những con máy và cái mạng chuẩn chỉ kia kìa. |
| "Cái trò tối ưu này rõ rành rành vãi nồi" | Rõ rành rành nhưng đéo chịu đo thì tao cũng đéo tin. Profile trước đã. |
| "Chênh nhau có 100ms thằng nào mà nhận ra" | Khoa học đã chứng minh độ trễ 100ms thừa sức đấm tung mồm cái tỷ lệ chuyển đổi (conversion rates) của mày rồi. Khách hàng nhạy cảm hơn mày nghĩ đấy. |
| "Yên tâm Framework nó lo hết rồi" | Framework chống được mớ giời ơi đất hỡi, nhưng đéo chống được cái trò gọi N+1 queries hay là cái cục bundlesize phì nộn của mày đâu. |
| "Mặc dù đéo hiệu quả lắm nhưng thôi cứ để đó đéo hại ai" | KHÔNG HIỆU QUẢ LÀ PHẢI XÓA (Revert). Cứ giữ lại rồi mút mùa gánh phí bảo trì hộc cứt trong khi đéo được lợi mẹ gì. |
| "Công sức code mất bao lâu, thôi cứ giữ đi" | Mù quáng (Sunk cost). Máy đo (measurement) đéo thèm quan tâm mày mất bao nhiêu đêm ròng rã để code cái đấy đâu. |
| "Thôi tối ưu rành rành ra đấy rồi, đo làm đéo gì nữa cho mệt" | Đã rành rành thế thì lấy máy đo lướt qua cái là xong. Cứ nhắm mắt nhắm mũi mà "tưởng là tối ưu" chính là cách tạo ra một đống rác rưởi (neutral complexity) trong code đấy. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Cắm đầu tối ưu mù quáng mà ĐÉO CÓ TRONG TAY DỮ LIỆU ĐO ĐẠC (profiling data).
- Bệnh N+1 queries la liệt ở khắp mọi nơi.
- Trả list (danh sách) mà đéo có Phân trang (pagination).
- Ảnh vứt bừa bãi đéo thèm ghi kích thước (dimensions), đéo thèm cắm lazy loading, hay chả có các size nhún nhảy theo màn hình (responsive sizes).
- Cục Bundle cứ thế phình to ra như lợn mà đéo có con bot nào nhảy vào review.
- Đéo thèm rình mò (performance monitoring) đo hiệu năng lúc lên Production.
- Đi đéo đâu cũng vấp phải `React.memo` với chả `useMemo` (lạm dụng nó thì cũng phế đéo kém gì không dùng).
- Khư khư giữ lấy cục tối ưu rác rưởi mà ĐÉO CHỊU đo đạc lại (re-measurement) để chứng minh.
- Gom 1 lố tối ưu thập cẩm vào xong tự sướng bằng 1 con số đo duy nhất, đéo biết cái nào mới là thằng gánh team thực sự.
- Tưởng là "Win" (tối ưu thành công) nhưng thực ra là chơi điếm, lén sửa cmn bài test, hoặc bỏ qua/xóa luôn cái test đó.
- Nhai lại cục cứt "Tối ưu hụt" của ngày xưa chỉ vì năm đó đéo có bố nào chịu ghi chép lại kết quả thất bại.

## Xác minh (Verification)

Sau mỗi lần táy máy sửa gì đó liên quan đến Hiệu năng:

- [ ] Phải có trên tay Đầy Đủ Bằng Chứng (những con số cụ thể) so sánh Trước/Sau.
- [ ] Con số "Sau" PHẢI được đo bằng đúng cái thước, đúng cách thức, đúng điều kiện y như con số "Trước" (cùng lệnh, cùng môi trường).
- [ ] Độ cải thiện PHẢI vượt xa ra khỏi cái biên độ Sai số ngẫu nhiên (run-to-run variance).
- [ ] Lệnh đéo chạy nhanh hơn Baseline là phải VỨT XỌT RÁC (reverted), tuyệt đối đéo được bao che giữ lại.
- [ ] Sổ Nam Tào đã chép phạt đầy đủ, từ đứa được giữ (kept) tới đứa bị đá (reverted), để sau này đéo có thằng lồn nào ngu dại nhảy vào bãi mìn đó nữa.
- [ ] Cái nút thắt (bottleneck) khốn nạn đó đã bị tóm cổ và bị chém đứt đầu.
- [ ] Các chỉ số Core Web Vitals đã vươn mình lên mức Ngon Nghẻ ("Good").
- [ ] Cục Bundle đéo bị phù nề thêm (hasn't increased significantly).
- [ ] Hết sạch mầm mống N+1 queries dơ bẩn trong đám code fetch data mới.
- [ ] Cửa ải Performance budget trên con CI đã được thông xe xanh rờn.
- [ ] Toàn bộ Test Suite trên dưới 1 lòng vẫn Pass cái vèo (Việc tối ưu KHÔNG HỀ cắn nát chức năng nào).
