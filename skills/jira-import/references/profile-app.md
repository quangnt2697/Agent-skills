# Profile APP — Bộ trích xuất cho Mobile App

## Hướng dẫn cho Agent

Khi `task_type = "APP"`, sử dụng bộ **12 chiều phân tích** dưới đây để trích xuất thông tin
từ PDF và attachments. Đối với mỗi chiều, đánh dấu trạng thái:
- ✅ Rõ ràng — đủ thông tin
- ⚠️ Mơ hồ — có nhưng chưa rõ
- ❌ Thiếu — không tìm thấy

---

## 12 Chiều phân tích

### 1. 📱 Màn hình & Navigation
**Cần trích xuất:**
- Danh sách tất cả màn hình liên quan (tên, mô tả ngắn)
- Navigation flow (màn hình nào dẫn đến màn hình nào)
- Kiểu navigation: Bottom tab / Stack / Drawer / Modal
- Deep link scheme (nếu có): format, params
- Back button behavior ở từng màn hình
- Điểm chạm (entry point): tính năng được truy cập từ đâu
- Màn hình bị ảnh hưởng bởi tính năng mới (VD: đặt lệnh, chuyển tiền, ứng tiền...)
- Redirect sau khi hoàn thành: quay về màn hình nào?

**Câu hỏi cần làm rõ nếu thiếu:**
- Từ màn hình nào user truy cập tính năng này?
- Navigation có dùng stack (push) hay replace?
- Deep link có trigger tính năng này không?
- Sau khi hoàn thành, quay lại màn hình trước đó hay về Home?
- Những màn hình nào khác bị ảnh hưởng bởi feature này?

### 2. 🎨 UI Components & Platform
**Cần trích xuất:**
- Mockup / wireframe / screenshot từ attachment
- Layout chi tiết: spacing, padding, alignment
- Font, color, icon sử dụng
- Dark mode support (có/không)
- Platform-specific: iOS vs Android khác biệt gì?
- Thông báo / toast / dialog / bottom sheet
- Trạng thái hiển thị: loading, success, error, empty state
- Landscape / portrait orientation

**Câu hỏi cần làm rõ nếu thiếu:**
- Có support dark mode không?
- iOS và Android có khác nhau về layout không?
- Dùng component library nào (native / Flutter / React Native)?
- UI khi trạng thái loading, error, empty trông như thế nào?
- Có support landscape không hay chỉ portrait?

### 3. 📝 Form & Input
**Cần trích xuất:**
- Danh sách tất cả trường input (dạng bảng: tên, kiểu, bắt buộc, validation)
- Kiểu dữ liệu & keyboard type (numeric, text, email, phone...)
- Validation rules (regex, min/max length, format, giá trị hợp lệ)
- Giá trị mặc định, placeholder text
- Auto-fill / paste behavior (VD: auto-read OTP từ SMS)
- Mask input (VD: hiện *** cho PIN)
- Error message cho từng validation rule
- Focus order (tab thứ tự giữa các field)
- Clear / reset button

**Câu hỏi cần làm rõ nếu thiếu:**
- Keyboard type cụ thể cho từng trường?
- Có cho paste không (VD: paste OTP từ SMS)?
- PIN/password có hiện/ẩn toggle không?
- Nội dung thông báo lỗi validation cụ thể là gì?
- Có auto-read SMS OTP không (SMS Autofill)?

### 4. 🔄 User Flow & Gesture
**Cần trích xuất:**
- Luồng chính (happy path) — step by step, đánh số
- Luồng ngoại lệ (error cases) — dạng bảng: trường hợp | xử lý | thông báo
- State transitions (trạng thái chuyển đổi)
- Điều kiện rẽ nhánh (if/else trong luồng)
- Gesture: swipe, pull-to-refresh, long press, biometric trigger
- Thứ tự các bước (VD: nhập PIN trước hay gửi OTP trước?)
- Confirm dialog trước hành động quan trọng
- Countdown / timer (VD: đếm ngược OTP)

**Câu hỏi cần làm rõ nếu thiếu:**
- Khi user back ở giữa luồng, state có reset không?
- Có animation/transition giữa các step không?
- Timeout giữa các step? (VD: OTP hết hạn bao lâu?)
- Có confirm dialog trước khi thực hiện hành động quan trọng?
- Thứ tự các bước nghiệp vụ chính xác là gì? (đặc biệt nếu AC và User Flow mâu thuẫn)

### 5. 🔐 Authentication & Security
**Cần trích xuất:**
- Phương thức xác thực: PIN, OTP (SMS/email), biometric (FaceID/TouchID)
- Thứ tự xác thực (VD: nhập PIN trước → gửi OTP sau)
- Session timeout & token refresh
- Device binding (thiết bị đã đăng ký)
- Số lần retry cho phép trước khi khóa
- Cơ chế khóa: tạm thời (bao lâu?) hay vĩnh viễn (cần CSKH?)
- Mã hóa / Cryptography: key pair, secret key, cách encrypt/decrypt
- Lưu trữ credentials trên device: Keychain (iOS) / Keystore (Android)
- Certificate pinning (nếu có)

**Câu hỏi cần làm rõ nếu thiếu:**
- Sai PIN/OTP bao nhiêu lần thì khóa?
- Khóa tạm bao lâu hay khóa vĩnh viễn?
- Biometric fallback khi fail là gì? (fallback sang PIN hay block?)
- Có cần generate lại key pair khi đổi/reset PIN? (đặc biệt quan trọng cho SmartOTP)
- Secret key lưu ở đâu trên device? Mã hóa bằng gì?

### 6. 📡 Offline & Network
**Cần trích xuất:**
- Behavior khi mất mạng (giữa chừng luồng)
- Cache: dữ liệu nào được cache?
- Retry logic khi network fail
- Sync behavior khi có mạng lại
- Loading state / skeleton screen

**Câu hỏi cần làm rõ nếu thiếu:**
- Mất mạng giữa chừng thì hiện gì?
- Có auto-retry không hay user phải retry thủ công?
- Data có cần sync offline → online không?

### 7. 🔔 Push Notification
**Cần trích xuất:**
- Notification triggers (sự kiện nào gửi notification)
- Notification content (title, body, data payload)
- Deep link từ notification
- Badge count behavior
- Notification permission denied scenario

**Câu hỏi cần làm rõ nếu thiếu:**
- Có push notification liên quan đến tính năng này không?
- Nhấn notification mở thẳng vào màn hình nào?
- Nếu user tắt notification thì flow có thay đổi?

### 8. 💼 Business Rules
**Cần trích xuất:**
- Quy tắc nghiệp vụ rõ ràng
- Ràng buộc, điều kiện, giới hạn
- Giá trị min/max (giá, khối lượng, thời gian)
- Thời gian hiệu lực (VD: OTP hết hạn sau X giây)
- Quy tắc format (VD: PIN phải 4 số)

**Câu hỏi cần làm rõ nếu thiếu:**
- Giới hạn cụ thể cho từng quy tắc?
- Có quy tắc nào phụ thuộc vào loại tài khoản không?
- Quy tắc có khác nhau giữa giờ giao dịch và ngoài giờ?

### 9. ⚠️ Edge Cases & Error Handling
**Cần trích xuất:**
- App background/foreground behavior (giữa chừng luồng)
- Kill app giữa chừng → mở lại: resume hay restart?
- Đồng thời trên 2 thiết bị cùng tài khoản
- OS permission denied (camera, location, notification, biometric...)
- Hết bộ nhớ / storage đầy
- App version cũ không hỗ trợ tính năng mới
- Jailbreak / root device
- Thay đổi thời gian hệ thống (liên quan OTP)
- Screenshot / screen recording restriction (bảo mật)

**Câu hỏi cần làm rõ nếu thiếu:**
- Kill app giữa chừng thì quay lại bắt đầu từ đâu?
- 2 thiết bị cùng tài khoản — conflict xử lý thế nào?
- App version cũ có block tính năng mới không?
- Có chặn screenshot/screen recording ở màn hình nhập PIN không?
- Thiết bị jailbreak/root có được sử dụng tính năng không?

### 10. 🔌 API & Backend Integration
**Cần trích xuất:**
- Danh sách API endpoints app cần gọi
- Request / response schema cho mỗi API
- Error response format & error codes
- Backend services liên quan (VD: user-service, otp-api-v2)
- Timeout setting cho mỗi API call
- Retry policy khi API fail

**Câu hỏi cần làm rõ nếu thiếu:**
- API endpoint cụ thể cho từng bước trong luồng?
- Error codes mapping: mỗi code hiện thông báo gì cho user?
- Timeout bao nhiêu giây cho mỗi API call?
- Có cần gọi API nào mới (chưa có) không?

### 11. 🌍 Đa ngôn ngữ & Accessibility
**Cần trích xuất:**
- Hỗ trợ ngôn ngữ: Tiếng Việt, English, khác?
- Nội dung text hiển thị: label, button text, thông báo lỗi, thông báo thành công
- Accessibility: VoiceOver (iOS) / TalkBack (Android)
- Font size dynamic (hỗ trợ cỡ chữ lớn)
- Color contrast cho người khiếm thị

**Câu hỏi cần làm rõ nếu thiếu:**
- Hỗ trợ những ngôn ngữ nào?
- Nội dung thông báo (lỗi, thành công) chính xác bằng tiếng Việt là gì?
- Có yêu cầu accessibility (WCAG) không?

### 12. 📊 Analytics & Logging
**Cần trích xuất:**
- Events tracking: những sự kiện nào cần log (screen view, button tap, success, fail)
- Analytics tool: Firebase Analytics, Amplitude, Mixpanel...
- Error logging: crash report, API error log
- Metrics đo lường thành công (conversion rate, drop-off rate)

**Câu hỏi cần làm rõ nếu thiếu:**
- Có cần track analytics events cho tính năng này không?
- Events nào cần log? Format event name?
- Có dashboard monitoring riêng không?

---

## Template Final.md cho APP

Sử dụng structure sau cho file `{issueKey}-final.md`:

```
## 1. Tổng quan
## 2. Màn hình & Navigation
## 3. UI Components & Platform
## 4. Form & Input
## 5. User Flow & Gesture
## 6. Authentication & Security
## 7. Offline & Push Notification
## 8. Business Rules
## 9. Edge Cases & Error Handling
## 10. API & Backend Integration
## 11. Đa ngôn ngữ & Accessibility
## 12. Analytics & Logging
## 13. Acceptance Criteria
## 14. Assumptions & Decisions
## 15. Open Questions
## 16. Tham khảo
```
