# Cẩm Nang Sửa Các Anti-Patterns Hiệu Năng & Performance Budget

#### Truy vấn N+1 (N+1 Queries - Backend)

```typescript
// TỒI: N+1 — mỗi task phải gọi 1 query riêng cho owner
const tasks = await db.tasks.findMany();
for (const task of tasks) {
  task.owner = await db.users.findUnique({ where: { id: task.ownerId } });
}

// TỐT: Query duy nhất với join/include
const tasks = await db.tasks.findMany({
  include: { owner: true },
});
```

#### Tải Dữ liệu Không Giới hạn (Unbounded Data Fetching)

```typescript
// TỒI: Lấy tất cả bản ghi
const allTasks = await db.tasks.findMany();

// TỐT: Phân trang kèm theo limit
const tasks = await db.tasks.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

#### Thiếu Tối ưu hóa Hình ảnh (Missing Image Optimization - Frontend)

```html
<!-- TỒI: Không có kích thước, không tối ưu format -->
<img src="/hero.jpg" />

<!-- TỐT: Ảnh Hero / LCP — art direction + chuyển đổi độ phân giải, ưu tiên tải cao -->
<!--
  Kết hợp 2 kỹ thuật:
  - Art direction (media): crop/khung hình khác nhau cho từng kích thước màn hình
  - Resolution switching (srcset + sizes): chọn file size phù hợp với mật độ điểm ảnh
-->
<picture>
  <!-- Mobile: Cắt ngang dọc (8:10) -->
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
  <!-- Desktop: Cắt ngang (2:1) -->
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
    alt="Mô tả ảnh Hero"
  />
</picture>

<!-- TỐT: Hình ảnh khu vực dưới màn hình (below-the-fold) — lazy loaded + async decoding -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="Mô tả ảnh nội dung"
/>
```

#### Re-renders Không Cần Thiết (React)

```tsx
// TỒI: Tạo object mới mỗi lần render, khiến các component con phải re-render theo
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// TỐT: Giữ nguyên tham chiếu (Stable reference)
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// Dùng React.memo cho component tốn nhiều tài nguyên render
const TaskItem = React.memo(function TaskItem({ task }: Props) {
  return <div>{/* render cực nặng */}</div>;
});

// Dùng useMemo cho các phép tính đắt đỏ
function TaskStats({ tasks }: Props) {
  const stats = useMemo(() => calculateStats(tasks), [tasks]);
  return <div>{stats.completed} / {stats.total}</div>;
}
```

#### Kích thước Bundle Quá Lớn

```typescript
// Các bundler hiện đại (Vite, webpack 5+) sẽ tự động xử lý tree-shaking cho import có định danh (named import),
// miễn là dependency cung cấp dạng ESM và được đánh dấu `sideEffects: false` trong package.json.
// Hãy profile trước khi đổi style của import — lợi ích thực sự đến từ splitting (cắt bundle) và lazy loading.

// TỐT: Dynamic import cho tính năng nặng và ít khi dùng
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// TỐT: Code splitting cấp độ Route bọc trong Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

#### Thiếu Caching (Backend)

```typescript
// Caching những dữ liệu đọc nhiều, hiếm khi đổi
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

// Cấu hình HTTP caching headers cho các tài nguyên tĩnh (static assets)
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache 1 năm
  immutable: true,        // Không bao giờ revalidate (yêu cầu dùng content hashing ở tên file)
}));

// Cấu hình Cache-Control cho API responses
res.set('Cache-Control', 'public, max-age=300'); // 5 phút
```

### Bước 4: Xác minh (Verify - Giữ lại hoặc Hoàn tác)

Mỗi bản sửa lỗi đều chỉ là một **giả thuyết** cho đến khi bạn đo lường lại. Bước này quyết định việc nó có được sống hay không.

**Đo lường lại y hệt như cách bạn đo baseline:** dùng cùng câu lệnh, cùng điều kiện, cùng số lượng yêu cầu. Một baseline lấy được từ "cold cache" so sánh với kết quả lấy từ "warm cache" là bạn đang đo bộ cache, không phải đo kết quả của bạn.

**Thay đổi mỗi lần chỉ một thứ.** Đẩy 3 bản tối ưu hóa vào cùng lúc và ra được một con số, bạn sẽ không thể biết cái nào thực sự có tác dụng. Nếu bắt buộc phải đẩy lên cùng lúc, hãy đo riêng lẻ chúng trước.

**Đánh bại "Nhiễu" (Noise), không chỉ cải thiện mức trung bình.** Lặp lại phép đo và so sánh kết quả delta với sự chênh lệch thông thường giữa các lần chạy (run-to-run variance). Tăng được 3% trong khi khoảng chênh lệch bình thường đã là ±5% thì đó không phải là tăng; đó chỉ là lấy nhầm mẫu khác thôi.

Sau đó hãy quyết định, một cách thật khắt khe:

| Kết quả vs. baseline                                  | Hành động                                                                                   |
|-------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Vượt qua ngưỡng, các test đều xanh (green)            | **Giữ lại (Keep).** Commit cùng với các thông số trước/sau trong commit message.            |
| Nằm trong khoảng nhiễu (không có sự thay đổi đo được) | **Hoàn tác (Revert).**                                                                      |
| Tệ hơn                                                | **Hoàn tác (Revert).**                                                                      |
| Đã cải thiện, nhưng có bài test đỏ (red)              | **Hoàn tác (Revert).** Đây là một sự thụt lùi (regression) nhưng lại đội lốt "chiến thắng". |

**"Không đổi" (Neutral) nghĩa là revert, không phải là giữ lại.** Đây là bước mà nhiều team bỏ qua: code đã viết xong, vứt đi thì thấy tiếc, nên cứ đẩy vào mà chả thèm đo, và rồi codebase cứ dần tích tụ những mớ hỗn độn chả mang lại lợi ích gì. Code bạn giữ lại, bạn sẽ phải bảo trì nó vĩnh viễn. Đừng giữ những thứ không mang lại giá trị thực tế.

**Sự chính xác là điều kiện tiên quyết (Correctness gates the metric).** Suite kiểm thử phải "xanh" *và* con số đo lường phải xê dịch. Một bản "tối ưu hóa" giành chiến thắng bằng cách bỏ bớt đi công đoạn cần thiết của sản phẩm (bỏ validation, cache luôn cả thứ bắt buộc phải lấy đồ mới, bỏ luôn một câu `await` cốt lõi) đó là một sự phá hoại (regression), không phải là tối ưu.

#### Ghi chép lại mọi lần thử, kể cả những lần bị hoàn tác (reverted)

Các công việc bị revert sẽ chẳng để lại dấu vết gì trên git history, đó chính là lý do vì sao một ý tưởng chết yểu lại hay bị lôi ra thử lại vào quý sau. Hãy giữ một sổ tay nhỏ để ý tưởng nào vứt đi thì hãy cho nó yên nghỉ:

| Ý tưởng                       | Baseline → Kết quả  | Phán quyết   | Tại sao                                                              |
|-------------------------------|---------------------|--------------|----------------------------------------------------------------------|
| Memoize component hàng (row)  | INP 240ms → 235ms   | reverted     | Nằm trong khoảng nhiễu (±15ms). Component này không phải điểm nghẽn. |
| Virtualize (ảo hóa) danh sách | INP 240ms → 90ms    | kept         | Hết long tasks trong trace.                                          |
| Preconnect tới API origin     | LCP 2.8s → 2.8s     | reverted     | Do đã là same-origin rồi.                                            |

Viết 1 mục trong phần mô tả của PR hoặc tạo 1 file `PERF.md` ở trong repo đều được. Điều quan trọng là để người tiếp theo (hoặc agent tiếp theo) đọc nó trước khi đề xuất làm lại thí nghiệm, và không phải cắm đầu làm lại cái đã thất bại.

## Ngân sách Hiệu năng (Performance Budget)

Thiết lập ngân sách và thực thi chúng:

```
JavaScript bundle: < 200KB gzipped (lúc initial load)
CSS: < 50KB gzipped
Images: < 200KB mỗi ảnh (above the fold - trên màn hình chính)
Fonts: < 100KB tổng cộng
API response time: < 200ms (p95)
Time to Interactive: < 3.5s với mạng 4G
Lighthouse Performance score: ≥ 90
```

**Thực thi trong CI:**
```bash
# Check Bundle size
npx bundlesize --config bundlesize.config.json

# Lighthouse CI
npx lhci autorun
```

