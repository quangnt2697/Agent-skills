# Cẩm Nang Quy Tắc Chuyên Biệt Theo Ngôn Ngữ & Nghiệp Vụ (Language & Domain Rules)

Hệ thống quy tắc này kế thừa từ bộ quy tắc thực chiến của Alibaba Open Code Review và cẩm nang nghiệp vụ chứng khoán của workspace. Agent tự động nhận diện phần mở rộng của file đang review để áp dụng đúng quy tắc tương ứng.

---

## 1. TypeScript / JavaScript / React (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)

### Chất Lượng Code & Cú Pháp
- **Toán tử so sánh:** Tuyệt đối cấm dùng `==` và `!=`; bắt buộc dùng so sánh nghiêm ngặt `===` và `!==`.
- **Khai báo biến:** Cấm sử dụng `var`. Bắt buộc dùng `const` (mặc định) hoặc `let` khi cần gán lại giá trị.
- **Biểu thức điều kiện:** Không cho phép lồng toán tử ba ngôi (nested ternary expressions). Tách ra `if/else` hoặc hàm riêng để dễ đọc.
- **TypeScript Types:** Tránh lạm dụng kiểu `any`. Dùng `unknown`, `never`, hoặc định nghĩa interface/type cụ thể; nếu bắt buộc phải dùng `any` phải có comment giải thích lý do.
- **Null Safety:** Bắt buộc dùng optional chaining (`?.`) và nullish coalescing (`??`) khi truy cập thuộc tính sâu hoặc giá trị có thể `null`/`undefined`.

### Xử Lý Bất Đồng Bộ (Async / Concurrency)
- **Ưu tiên `async/await`:** Tránh callback hell và chaining `.then().catch()` phức tạp.
- **Bất đồng bộ trong vòng lặp:**
  - Nếu các tác vụ độc lập: Bắt buộc dùng `Promise.all()` hoặc `Promise.allSettled()` để chạy song song, không `await` tuần tự gây nghẽn I/O.
  - Nếu tác vụ sau phụ thuộc tác vụ trước: Giữ tuần tự nhưng cần xử lý try/catch cục bộ hoặc rollback khi có lỗi giữa chừng.

### React Best Practices
- **Hooks Rules:** Tuân thủ tuyệt đối quy tắc của Hooks: chỉ gọi ở cấp cao nhất (top-level), không gọi bên trong vòng lặp, câu lệnh điều kiện hay hàm lồng nhau.
- **useEffect Dependencies:** Kiểm tra mảng dependencies của `useEffect`, `useCallback`, `useMemo`. Không được cố tình bỏ sót dependency để "tránh chạy lại" dẫn đến stale closure.
- **Cleanup Functions:** Mọi `useEffect` đăng ký event listener, subscription, interval hoặc WebSocket connection **BẮT BUỘC** có hàm cleanup để tránh rò rỉ bộ nhớ (memory leaks).
- **Tránh Side Effects trong Render:** Cấm tuyệt đối việc gọi API hoặc sửa đổi DOM trực tiếp trong thân hàm component hoặc phương thức render.

### Bảo Mật Web (Web Security)
- **XSS Prevention:** Cấm sử dụng `innerHTML` hoặc `dangerouslySetInnerHTML` với dữ liệu do người dùng nhập hoặc trả về từ API bên ngoài mà chưa qua thư viện làm sạch (như `DOMPurify`).
- **Code Injection:** Cấm tuyệt đối `eval()`, `new Function()`, hoặc truyền chuỗi vào `setTimeout()` / `setInterval()`.

---

## 2. Python (`*.py`)

### Correctness & Edge Cases
- **Mutable Default Arguments:** Cấm tuyệt đối dùng đối số mặc định có thể biến đổi như `def func(items=[])` hoặc `def func(data={})`. Bắt buộc dùng `def func(items=None): if items is None: items = []`.
- **Bắt ngoại lệ an toàn:**
  - Cấm dùng bare `except:` vì sẽ nuốt cả `KeyboardInterrupt` và `SystemExit`. Tối thiểu phải là `except Exception:`.
  - Không bắt ngoại lệ rồi im lặng bỏ qua (`pass`) mà không ghi log cảnh báo hoặc re-raise.
  - Khi re-raise exception bọc mới, dùng cú pháp `raise NewException(...) from err` để giữ nguyên traceback gốc.
- **So sánh số thực:** Cấm so sánh bằng tuyệt đối giữa 2 số thực (`float1 == float2`). Bắt buộc dùng `math.isclose()` với ngưỡng sai số (tolerance).
- **So sánh đồng nhất:** Dùng `is` / `is not` cho singletons (`None`, `True`, `False`). Dùng `==` / `!=` cho so sánh giá trị chuỗi, số, mảng.

### Quản Lý Tài Nguyên (Resource Management)
- **Context Managers (`with` statement):** Mọi thao tác mở file, socket, database connection, hay acquire lock **BẮT BUỘC** nằm trong khối `with` để đảm bảo tài nguyên được giải phóng ngay cả khi có ngoại lệ xảy ra.

---

## 3. Go (`*.go`)

### Goroutine & Concurrency Safety
- **Goroutine Leak:** Mỗi goroutine được sinh ra (`go func()`) phải có cơ chế thoát rõ ràng (qua `context.Context.Done()`, channel đóng, hoặc `sync.WaitGroup`).
- **Data Race & Mutex:** Đảm bảo truy cập tài nguyên chia sẻ được bảo vệ bởi `sync.Mutex` hoặc `sync.RWMutex`. Ưu tiên gọi `defer mu.Unlock()` ngay sau khi `mu.Lock()`.
- **Channel Operations:** Không gửi dữ liệu vào channel đã đóng (`panic`) hoặc đọc từ channel không bao giờ đóng trên vòng lặp `for range`.

### Error Handling
- **Xử lý lỗi 100%:** Tuyệt đối không bỏ qua lỗi bằng `_`. Mọi hàm trả về `(..., error)` phải được kiểm tra `if err != nil`.
- **Error Wrapping:** Dùng `fmt.Errorf("doing X: %w", err)` để giữ lại chuỗi lỗi cho `errors.Is` hoặc `errors.As`.

---

## 4. Nghiệp Vụ Chứng Khoán & Fintech (Securities Domain Rules)

Khi review mã nguồn liên quan đến giao dịch, đặt lệnh, tính lãi, khớp lệnh hoặc tài khoản, **BẮT BUỘC** đối soát các quy tắc sau (kế thừa từ `references/securities-domain-rules.md`):

### A. Tiền Tệ & Làm Tròn (Monetary & Math Precision)
- **Cấm số thực trong tài chính:** Nghiêm cấm dùng kiểu số thực (`float`, `number`, `double`) để cộng/trừ/nhân/chia số dư tài khoản, phí giao dịch, thuế, hoa hồng hoặc giá trị ký quỹ. Bắt buộc dùng thư viện số chính xác cao (`Decimal`, `BigNumber`, `BigDecimal`) hoặc lưu trữ theo đơn vị nguyên nhỏ nhất (`int64` cent/đồng).
- **Quy tắc làm tròn:** Phí và thuế phải làm tròn theo chuẩn kế toán (thường là Half-Up hoặc RoundingMode của hệ thống Core, không tự ý dùng `Math.floor` hay `Math.round` ngẫu nhiên).

### B. Bước Giá & Biên Độ Thị Trường Việt Nam (KRX Tick Sizes)
- **Sàn HOSE (Cổ phiếu & Chứng chỉ quỹ đóng):**
  - Giá < 10,000 VND: Bước giá **10 VND** (Giá hợp lệ: 9,810, 9,820...).
  - 10,000 VND ≤ Giá < 50,000 VND: Bước giá **50 VND** (Giá hợp lệ: 24,050, 24,100...).
  - Giá ≥ 50,000 VND: Bước giá **100 VND** (Giá hợp lệ: 68,100, 68,200...).
- **Sàn HNX & UPCOM:** Bước giá cố định **100 VND** cho mọi mức giá.
- **Biên độ dao động:** HOSE (±7%), HNX (±10%), UPCOM (±15%). Code đặt lệnh phải chặn trước khi giá vượt trần/sàn.

### C. Tranh Chấp Sức Mua (Purchasing Power Race Conditions)
- Kiểm tra tính nguyên tử (atomic) khi trừ sức mua (purchasing power / balance):
  - Cấm mô hình `check then act` rời rạc không khóa: `if (balance >= amount) { await deduct(amount); }` vì 2 lệnh bắn song song sẽ gây âm tài khoản.
  - Bắt buộc dùng Database Transaction với `SELECT ... FOR UPDATE`, Optimistic Locking với version, hoặc Atomic Decrement (`UPDATE account SET balance = balance - :amount WHERE id = :id AND balance >= :amount`).
