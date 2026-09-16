## Checklist Phân loại (Triage)

Thực hiện các bước này theo đúng thứ tự. Không nhảy cóc (skip) bước.

### Bước 1: Tái hiện (Reproduce)

Làm cho lỗi đó xảy ra một cách nhất quán (reliably). Nếu bạn không thể tái hiện nó, bạn không thể tự tin là đã sửa được nó.

```
Bạn có thể tái hiện được lỗi không?
├── CÓ → Chuyển sang Bước 2
└── KHÔNG
    ├── Thu thập thêm ngữ cảnh (logs, chi tiết môi trường)
    ├── Thử tái hiện trong một môi trường thu gọn (minimal environment)
    └── Nếu thực sự không thể tái hiện, hãy ghi chép lại điều kiện xảy ra và tiếp tục theo dõi
```

**Khi một con bug không thể tái hiện được:**

```
Không thể tái hiện theo yêu cầu:
├── Phụ thuộc thời gian (Timing-dependent)?
│   ├── Thêm timestamp vào log xung quanh khu vực khả nghi
│   ├── Thử đặt thời gian trễ nhân tạo (setTimeout, sleep) để nới rộng cửa sổ race condition
│   └── Chạy dưới tải nặng (load) hoặc đồng thời (concurrency) để tăng xác suất va chạm
├── Phụ thuộc môi trường (Environment-dependent)?
│   ├── So sánh các version Node/browser, OS, các biến môi trường
│   ├── Kiểm tra sự khác biệt về dữ liệu (database trống vs database đầy)
│   └── Thử tái hiện trên CI vì môi trường trên đó sạch sẽ
├── Phụ thuộc trạng thái (State-dependent)?
│   ├── Kiểm tra xem có bị leak state giữa các bài test hoặc các request không
│   ├── Tìm các global variables, singletons, hoặc shared caches
│   └── Chạy kịch bản lỗi một cách độc lập (isolation) thay vì chạy sau các thao tác khác
└── Thực sự ngẫu nhiên?
│   ├── Thêm log phòng thủ (defensive logging) tại vị trí khả nghi
│   ├── Cài đặt hệ thống cảnh báo (alert) cho dấu vết lỗi cụ thể đó
│   └── Tài liệu hóa các điều kiện đã quan sát thấy và quay lại kiểm tra khi nó tái phát
```

Đối với các bài test bị fail (ví dụ dùng npm — hãy thay thế bằng lệnh test thực tế của repository, xem mục 'Khám phá Stack trước' của skill dev-test-driven-development):
```bash
# Chạy duy nhất bài test bị fail đó
npm test -- --grep "tên bài test"

# Chạy với output chi tiết (verbose)
npm test -- --verbose

# Chạy độc lập (loại trừ khả năng bị ảnh hưởng bởi test khác)
npm test -- --testPathPattern="tên-file-cụ-thể" --runInBand
```

### Bước 2: Khoanh vùng (Localize)

Thu hẹp phạm vi xem lỗi xảy ra Ở ĐÂU:

```
Lớp (layer) nào đang bị lỗi?
├── UI/Frontend     → Kiểm tra console, DOM, thẻ network
├── API/Backend     → Kiểm tra server logs, request/response
├── Database        → Kiểm tra câu query, schema, tính toàn vẹn dữ liệu
├── Build tooling   → Kiểm tra config, dependencies, môi trường
├── External service → Kiểm tra kết nối, thay đổi API, rate limits
└── Chính bài test  → Kiểm tra xem bài test có viết đúng không (false negative)
```

**Sử dụng chia đôi (bisection) cho các lỗi hồi quy (regression bugs):**
```bash
# Tìm xem commit nào đã mang con bug này vào
git bisect start
git bisect bad                    # Commit hiện tại đang bị hỏng
git bisect good <known-good-sha> # Commit này lúc trước chạy tốt
# Git sẽ tự động checkout vào các commit ở giữa; hãy chạy test của bạn ở mỗi bước
git bisect run npm test -- --grep "failing test"  # thay bằng lệnh test trọng tâm của repo
```

### Bước 3: Thu gọn (Reduce)

Tạo ra trường hợp lỗi nhỏ nhất có thể (minimal failing case):

- Gỡ bỏ các code/config không liên quan cho tới khi chỉ còn lại đúng con bug
- Đơn giản hóa input thành ví dụ nhỏ nhất có thể kích hoạt lỗi
- Cắt tỉa bài test thành phiên bản tối giản nhất để tái hiện vấn đề

Một bản tái hiện tối giản sẽ làm lộ rõ nguyên nhân gốc rễ và tránh việc bạn chỉ đi chữa triệu chứng thay vì chữa bệnh.

### Bước 4: Sửa Nguyên nhân Gốc rễ (Fix the Root Cause)

Hãy sửa vấn đề bên dưới, đừng sửa triệu chứng:

```
Triệu chứng: "Danh sách người dùng hiển thị các dòng bị lặp (duplicate)"

Sửa triệu chứng (TỒI):
  → Deduplicate (lọc trùng) ở tầng UI component: [...new Set(users)]

Sửa nguyên nhân gốc (TỐT):
  → API endpoint có chứa lệnh JOIN sinh ra dữ liệu trùng lặp
  → Sửa câu query, thêm DISTINCT, hoặc sửa lại data model (mô hình dữ liệu)
```

Hãy liên tục hỏi: "Tại sao điều này xảy ra?" cho tới khi bạn chạm tới nguyên nhân thực sự, chứ không phải nơi nó biểu hiện ra.

### Bước 5: Bảo vệ chống Tái phát (Guard Against Recurrence)

Viết một bài test để bắt chính xác lỗi này:

```typescript
// Con bug: tiêu đề task chứa ký tự đặc biệt làm hỏng chức năng tìm kiếm
it('finds tasks with special characters in title', async () => {
  await createTask({ title: 'Fix "quotes" & <brackets>' });
  const results = await searchTasks('quotes');
  expect(results).toHaveLength(1);
  expect(results[0].title).toBe('Fix "quotes" & <brackets>');
});
```

Bài test này sẽ ngăn chặn con bug tương tự xuất hiện trở lại. Nó phải FAIL khi chưa có bản sửa lỗi và PASS khi đã có bản sửa lỗi.

### Bước 6: Xác minh Toàn trình (Verify End-to-End)

Sau khi sửa xong, hãy xác minh toàn bộ kịch bản bằng các lệnh của repository (ví dụ dùng npm):

```bash
# Chạy bài test cụ thể đó
npm test -- --grep "specific test"

# Chạy toàn bộ test suite (kiểm tra xem có làm hỏng chỗ khác không)
npm test

# Build dự án (kiểm tra lỗi type/compilation)
npm run build

# Tự tay kiểm tra thủ công nếu được
npm run dev  # Xác minh trên trình duyệt
```

## Các Mẫu phân loại Lỗi cụ thể

### Triage Lỗi Test

```
Test fail sau khi thay đổi code:
├── Bạn có sửa phần code mà bài test đó bao phủ không?
│   └── CÓ → Kiểm tra xem test sai hay code sai
│       ├── Test bị out-date (lỗi thời) → Cập nhật test
│       └── Code có bug → Sửa code
├── Bạn có sửa phần code KHÔNG liên quan không?
│   └── CÓ → Khả năng cao là side effect → Kiểm tra shared state, imports, globals
└── Bài test đó vốn dĩ đã thiếu ổn định (flaky) rồi?
    └── Kiểm tra các vấn đề về timing, sự phụ thuộc thứ tự, các external dependencies
```

### Triage Lỗi Build

```
Build fail:
├── Lỗi Type (Type error) → Đọc kỹ lỗi, kiểm tra type tại vị trí được chỉ ra
├── Lỗi Import → Kiểm tra xem module có tồn tại không, export có khớp không, đường dẫn đúng không
├── Lỗi Config → Kiểm tra các file build config xem có lỗi cú pháp/schema không
├── Lỗi Dependency → Kiểm tra package.json, chạy lại npm install
└── Lỗi Môi trường (Environment) → Kiểm tra Node version, sự tương thích của OS
```

### Triage Lỗi Runtime

```
Lỗi Runtime:
├── TypeError: Cannot read property 'x' of undefined
│   └── Có thứ gì đó bị null/undefined mà đáng lẽ ra không được phép
│       → Kiểm tra luồng dữ liệu (data flow): giá trị này đến từ đâu?
├── Network error / CORS
│   └── Kiểm tra URLs, headers, cấu hình server CORS
├── Render error / Màn hình trắng
│   └── Kiểm tra error boundary, console, component tree
└── Hành vi không mong đợi (không báo lỗi)
    └── Thêm log tại các điểm trọng yếu, xác minh dữ liệu ở từng bước
```

## Các Mẫu Dự phòng An toàn (Safe Fallback Patterns)

Khi bị áp lực thời gian, hãy sử dụng các biện pháp dự phòng an toàn (safe fallbacks):

```typescript
// Giá trị mặc định an toàn + warning (thay vì crash app)
function getConfig(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.warn(`Thiếu config: ${key}, sử dụng giá trị mặc định`);
    return DEFAULTS[key] ?? '';
  }
  return value;
}

// Giảm cấp duyên dáng (Graceful degradation) (thay vì làm hỏng toàn bộ tính năng)
function renderChart(data: ChartData[]) {
  if (data.length === 0) {
    return <EmptyState message="Không có dữ liệu cho khoảng thời gian này" />;
  }
  try {
    return <Chart data={data} />;
  } catch (error) {
    console.error('Render Chart bị lỗi:', error);
    return <ErrorState message="Không thể hiển thị biểu đồ" />;
  }
}
```

## Hướng dẫn gắn Instrumentation (Log/Đo lường)

Chỉ thêm log khi nó thực sự giúp ích. Xóa nó đi khi đã làm xong.

**Khi nào cần thêm instrumentation:**
- Bạn không thể khoanh vùng vị trí lỗi ở một dòng cụ thể
- Sự cố xảy ra chập chờn và cần được theo dõi thêm
- Việc sửa lỗi liên quan tới nhiều component tương tác với nhau

**Khi nào cần xóa nó:**
- Bug đã được sửa xong và đã có bài test bảo vệ
- Câu log đó chỉ có tác dụng trong lúc dev (không dùng trên production)
- Nó chứa dữ liệu nhạy cảm (LUÔN LUÔN phải xóa)

**Những instrumentation cố định (giữ lại):**
- Error boundaries đi kèm công cụ report lỗi
- Log lỗi API đi kèm với context của request
- Các chỉ số hiệu năng (Performance metrics) tại những user flows quan trọng

## Các Biện hộ Thường gặp
