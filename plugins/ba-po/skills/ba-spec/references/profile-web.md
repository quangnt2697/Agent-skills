# Profile WEB — Bộ trích xuất cho Web Application

## Hướng dẫn cho Agent

Khi `task_type = "WEB"`, sử dụng bộ **12 chiều phân tích** dưới đây để trích xuất thông tin
từ PDF và attachments. Đối với mỗi chiều, đánh dấu trạng thái:
- ✅ Rõ ràng — đủ thông tin
- ⚠️ Mơ hồ — có nhưng chưa rõ
- ❌ Thiếu — không tìm thấy

---

## 12 Chiều phân tích

### 1. 🖥️ Page & Layout & URL Routing
**Cần trích xuất:**
- Danh sách tất cả trang liên quan (tên, mô tả ngắn, mục đích)
- URL pattern / routing (VD: `/orders`, `/orders/:id`, `/orders?status=pending`)
- Breadcrumb navigation
- Sidebar / Header / Footer behavior
- URL state management (query params, hash, path params)
- Điểm chạm (entry point): từ trang/menu nào truy cập tính năng
- Redirect sau khi hoàn thành action: chuyển về trang nào?
- Trang bị ảnh hưởng bởi tính năng mới (liên động)
- Protected routes: trang nào cần đăng nhập / quyền

**Câu hỏi cần làm rõ nếu thiếu:**
- URL pattern cụ thể cho từng trang?
- Back button / browser history hoạt động thế nào?
- Có bookmark URL state không (VD: filter, sort giữ khi reload)?
- Route nào cần guard (redirect về login nếu chưa auth)?
- Từ menu nào / trang nào user truy cập tính năng?

### 2. 🎨 UI Components & Responsive
**Cần trích xuất:**
- Layout grid system (12-col, flex, grid)
- Responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Component sử dụng: table, modal, drawer, toast, tooltip, popover, dropdown
- Design system / CSS framework (nếu có)
- Loading states: skeleton, spinner, progress bar
- Empty state: hiển thị gì khi không có data
- Error state: UI khi API lỗi, không kết nối
- Thông báo: toast / notification bar / alert / modal confirm
- Dark mode / theme (nếu có)
- In ấn: layout print-friendly (nếu cần in báo cáo, phiếu lệnh...)
- Keyboard shortcuts (nếu có: VD: Ctrl+S lưu, Ctrl+Enter submit)

**Câu hỏi cần làm rõ nếu thiếu:**
- Responsive breakpoints cụ thể?
- Mobile view có collapse bảng thành card không?
- Dùng component library nào (Ant Design, MUI, custom)?
- Empty state và error state UI trông như thế nào?
- Có cần hỗ trợ in ấn (print) không?
- Có keyboard shortcuts nào không?

### 3. 📝 Form & Input
**Cần trích xuất:**
- Danh sách tất cả trường input (dạng bảng: tên, kiểu, bắt buộc, validation, giá trị mặc định)
- Kiểu dữ liệu & input type (text, number, date, select, checkbox, radio, file upload...)
- Validation rules: client-side + server-side (phân biệt rõ)
- Auto-complete / suggest behavior (VD: search mã chứng khoán, tên khách hàng)
- Date picker format & locale (dd/MM/yyyy vs yyyy-MM-dd)
- Number format & locale (dấu phẩy, dấu chấm: 1.000.000 vs 1,000,000)
- Form submission: button state (disabled/loading), success/error UI
- Error message cụ thể cho từng validation rule
- Tab order giữa các field (focus sequence)
- Copy/paste behavior (VD: paste số tài khoản)
- Dependent fields (trường B thay đổi theo giá trị trường A)

**Câu hỏi cần làm rõ nếu thiếu:**
- Validation real-time (on blur/on change) hay chỉ khi submit?
- Server-side validation trả lỗi format gì?
- Có auto-save draft không?
- Nội dung error message cụ thể cho từng loại lỗi?
- Số được format theo locale nào (VN: 1.000 hay US: 1,000)?
- Có trường nào dependent (thay đổi theo giá trị trường khác)?

### 4. 🔄 User Flow & Redirect
**Cần trích xuất:**
- Luồng chính (happy path) — step by step, đánh số
- Luồng ngoại lệ (error cases) — dạng bảng: trường hợp | xử lý | thông báo
- Modal / popup / drawer flow (open → action → close → refresh?)
- Multi-step wizard / stepper (nếu có)
- Redirect behavior (sau submit chuyển về đâu?)
- Confirm dialog trước hành động quan trọng (xóa, hủy lệnh, chuyển tiền...)
- Countdown / timer (VD: OTP hết hạn, phiên giao dịch)
- Thứ tự các bước nghiệp vụ (nếu AC và User Flow mâu thuẫn)
- Loading overlay khi submit (block double-click)

**Câu hỏi cần làm rõ nếu thiếu:**
- Sau submit thành công → redirect về trang nào?
- Modal có block interaction với trang dưới không?
- Có confirm dialog trước khi rời trang (unsaved changes)?
- Double-click submit có được chặn không?
- Thứ tự các bước chính xác là gì (nếu tài liệu mâu thuẫn)?

### 5. 🔐 Authentication & Authorization
**Cần trích xuất:**
- Login method: form login, SSO, OAuth, 2FA, SmartOTP
- Session management: cookie, JWT, token refresh, refresh token rotation
- RBAC / permission: role nào được truy cập tính năng này
- Session timeout behavior (bao lâu? auto-logout? warning popup?)
- CSRF / XSS protection
- Xác thực giao dịch: OTP, PIN, SmartOTP (nếu có)
- Multi-session: cho phép đăng nhập nhiều tab/browser không?

**Câu hỏi cần làm rõ nếu thiếu:**
- Những role nào được truy cập tính năng này?
- Session hết hạn thì redirect về login hay hiện popup warning?
- Có phân quyền chi tiết theo action (view/edit/delete)?
- Giao dịch có cần xác thực OTP/PIN trước khi submit?
- Cho phép mở nhiều tab cùng tài khoản không?

### 6. 📊 Data Display
**Cần trích xuất:**
- Bảng dữ liệu: columns (tên, kiểu, width, align), data types
- Pagination: page size, total count, infinite scroll
- Sorting: single/multi column, default sort, sort direction
- Filtering: client-side, server-side, advanced filter, date range
- Search: global search, column search, fuzzy search
- Export: CSV, Excel, PDF format
- Row actions: view detail, edit, delete, copy, custom actions
- Row selection: single/multi select, select all, batch action
- Column customization: ẩn/hiện cột, reorder, resize
- Color coding / highlight: row highlight theo condition (VD: lệnh khớp = xanh, hủy = đỏ)
- Click row: mở detail hay expand?
- Số format: VND 1.000.000, %, số thập phân

**Câu hỏi cần làm rõ nếu thiếu:**
- Page size mặc định bao nhiêu? Cho đổi không (20/50/100)?
- Sorting server-side hay client-side?
- Export tất cả data hay chỉ trang hiện tại / data đã filter?
- Số tiền format theo locale nào? Bao nhiêu chữ số thập phân?
- Có color coding / highlight row theo condition không?
- Click row mở detail dạng modal, drawer, hay sang trang mới?

### 7. ⚡ Real-time & Live Update
**Cần trích xuất:**
- WebSocket events (subscribe/unsubscribe, topics, channels)
- Polling interval (nếu dùng polling thay WebSocket)
- Live update: dữ liệu nào cần update real-time (giá, trạng thái lệnh, số dư...)
- Notification banner / toast khi có data mới
- Connection lost behavior: hiển warning? auto-reconnect?
- Stale data indicator: dữ liệu cũ có đánh dấu không?
- Multi-tab sync: 2 tab cùng tài khoản có sync data không?

**Câu hỏi cần làm rõ nếu thiếu:**
- Dùng WebSocket hay polling? Cả hai?
- Polling interval bao nhiêu giây?
- Mất kết nối WebSocket thì hiện gì? Auto-reconnect?
- 2 tab mở cùng lúc có sync data không?
- Dữ liệu cũ (stale) có hiển thị cảnh báo không?

### 8. 💼 Business Rules
**Cần trích xuất:**
- Quy tắc nghiệp vụ rõ ràng
- Ràng buộc, điều kiện, giới hạn
- Giá trị min/max (giá, khối lượng, thời gian)
- Quy tắc hiển thị: ẩn/hiện element theo condition
- Thời gian hiệu lực, deadline

**Câu hỏi cần làm rõ nếu thiếu:**
- Giới hạn cụ thể cho từng quy tắc?
- Element nào ẩn/hiện theo role?
- Quy tắc có khác nhau giữa giờ giao dịch và ngoài giờ?

### 9. ⚠️ Edge Cases & Error Handling
**Cần trích xuất:**
- Browser compatibility (Chrome, Firefox, Safari, Edge) + version tối thiểu
- Tab duplicate (2 tab cùng trang cùng user)
- Back button / refresh (F5) behavior: giữ state hay reset?
- Bookmark URL state (filter, sort, page)
- Concurrent editing (2 user sửa cùng record)
- Network error / timeout / server 500
- Đa màn hình / multi-monitor layout
- Zoom browser (125%, 150%) → layout có vỡ không?
- Session hết hạn giữa chừng thao tác
- Rate limit / too many requests
- Large data set (10K+ rows): performance?

**Câu hỏi cần làm rõ nếu thiếu:**
- Support browser nào? Version tối thiểu?
- 2 user sửa cùng lúc → conflict resolution (optimistic lock, last-write-wins)?
- F5 refresh giữa chừng form → giữ data hay mất?
- Zoom 150% có gây vỡ layout không?
- Bảng có 10K+ dòng thì có virtual scroll không?

### 10. 🔌 API & Backend Integration
**Cần trích xuất:**
- Danh sách API endpoints từng trang gọi
- Request / response schema cho mỗi API
- Error response format & error codes
- Backend services liên quan
- Timeout setting cho mỗi API call
- Retry policy khi API fail
- Debounce / throttle cho search / filter API

**Câu hỏi cần làm rõ nếu thiếu:**
- API endpoint cụ thể cho từng action?
- Error codes mapping: mỗi code hiện thông báo gì cho user?
- Timeout bao nhiêu giây cho mỗi API call?
- Search / filter có debounce bao nhiêu ms?

### 11. 🌍 Đa ngôn ngữ & Accessibility
**Cần trích xuất:**
- Hỗ trợ ngôn ngữ: Tiếng Việt, English, khác?
- Nội dung text hiển thị: label, button text, thông báo lỗi, thông báo thành công
- ARIA labels cho screen reader
- Tab navigation (keyboard-only user)
- Color contrast (WCAG AA/AAA)
- Focus indicator rõ ràng

**Câu hỏi cần làm rõ nếu thiếu:**
- Hỗ trợ những ngôn ngữ nào?
- Nội dung thông báo (lỗi, thành công) chính xác bằng tiếng Việt?
- Có yêu cầu accessibility (WCAG) không?
- Điều hướng hoàn toàn bằng keyboard được không?

### 12. 🚀 Performance & SEO
**Cần trích xuất:**
- Target load time (First Contentful Paint, Largest Contentful Paint)
- Lazy loading: images, components, routes
- Virtualized list / table (cho data lớn)
- Code splitting / dynamic import
- SEO: title, meta description, OG tags (nếu trang public)
- Caching strategy: browser cache, API cache

**Câu hỏi cần làm rõ nếu thiếu:**
- Có yêu cầu về performance (load time < X giây)?
- Bảng lớn có cần virtual scroll không?
- Trang có cần SEO không (public-facing)?
- Caching strategy cho data thường xuyên thay đổi?

---

## Template Final.md cho WEB

Lưu file output tại `workspace/{issueKey}/spec/final.md`. Gọi lại skill → ghi đè hoàn toàn file cũ, không tạo file mới với suffix. Sử dụng structure sau:

```
## 1. Tổng quan
## 2. Page & Layout & URL Routing
## 3. UI Components & Responsive
## 4. Form & Input
## 5. User Flow & Redirect
## 6. Authentication & Authorization
## 7. Data Display
## 8. Real-time & Live Update
## 9. Business Rules
## 10. Edge Cases & Error Handling
## 11. API & Backend Integration
## 12. Đa ngôn ngữ & Accessibility
## 13. Performance & SEO
## 14. Acceptance Criteria
## 15. Assumptions & Decisions
## 16. Open Questions
## 17. Tham khảo
```
