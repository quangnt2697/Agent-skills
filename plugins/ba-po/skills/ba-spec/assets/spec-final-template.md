# [Mã Issue/Keyword] [Tiêu đề Task]

> **Tài liệu:** Business Specification (Single Source of Truth)  
> **Người phân tích:** Business Analyst / Product Owner  
> **Trạng thái:** Hoàn thành — Sẵn sàng bàn giao cho QA và DEV  

---

## 1. Thông Tin Chung & Metadata

| Thuộc tính | Giá trị |
|---|---|
| **Jira Issue / Confluence** | `[{issueKey}]({jiraUrl})` |
| **Loại Task** | 📱 APP / 🌐 WEB / 🔌 API |
| **Priority / Trạng thái** | High / To Do |
| **Reporter / Assignee** | [Người tạo] / [Người thực hiện] |
| **Sprint / Epic** | Sprint XX / [Tên Epic] |
| **File Nguồn Gốc** | `source/{issueKey}.pdf` |
| **References Đã Phân Tích** | [Danh sách Confluence pages và attachments đã đọc] |

---

<!-- PHÂN NHÁNH SECTION 2-7 THEO TASK TYPE (Chọn 1 trong 3 nhóm bên dưới, xóa 2 nhóm còn lại) -->

<!-- ========================================================================= -->
<!-- NHÓM A: DÀNH CHO TASK 📱 APP                                              -->
<!-- ========================================================================= -->

## 2. Màn Hình & Navigation (APP)
- **Màn hình chính:** [Tên màn hình, mục đích, vị trí trong luồng ứng dụng]
- **Luồng điều hướng (Navigation flow):** [Từ đâu đến, bấm gì để chuyển màn hình, back button về đâu]
- **Modal / Bottom Sheet / Dialog:** [Các pop-up xuất hiện theo điều kiện]

## 3. UI Components & Platform-Specific (APP)
- **Giao diện iOS vs Android:** [Điểm khác biệt nền tảng: Safe Area, Navigation Bar, Back Handler]
- **Thành phần giao diện:** [Nút bấm, thẻ danh sách, carousel, tab bar]
- **Trạng thái hiển thị:** [Default, Loading (shimmer/spinner), Empty state, Error state]

## 4. Form & Input Handling (APP)
- **Các trường nhập liệu:** [Bảng: Tên trường, Kiểu dữ liệu, Bắt buộc/Tùy chọn, Format, Placeholder]
- **Bàn phím:** [Numeric keypad cho tiền/số lượng, Text cho họ tên, Xử lý ẩn bàn phím khi tap ngoài]
- **Validation tức thời (Client-side):** [Ràng buộc min/max, ký tự đặc biệt, regex]

## 5. User Flow & Gesture (APP)
- **Luồng thao tác người dùng:** [Step-by-step từ khi mở màn hình đến khi hoàn tất]
- **Cử chỉ hỗ trợ:** [Tap, Long press, Swipe to delete, Pull to refresh]
- **User Flow Diagram:** *(Nếu có sơ đồ Mermaid)*

## 6. Authentication & Security (APP)
- **Xác thực:** [Yêu cầu đăng nhập, PIN code, Biometric (FaceID / Fingerprint), Smart OTP]
- **Timeout & Re-auth:** [Khóa màn hình sau bao lâu không tương tác]

## 7. Offline Mode & Push Notification (APP)
- **Chế độ Mất kết nối (Offline):** [Hiển thị banner cảnh báo, cache dữ liệu gần nhất, chặn thao tác giao dịch]
- **Thông báo đẩy (Push/In-app):** [Nội dung thông báo, trigger event, deep link khi chạm vào]

<!-- ========================================================================= -->
<!-- NHÓM B: DÀNH CHO TASK 🌐 WEB                                              -->
<!-- ========================================================================= -->

<!--
## 2. Cấu Trúc Trang & URL Routing (WEB)
- **URL Path:** `/path/to/feature` | Query params: `?tab=order&symbol=FPT`
- **Breadcrumb & Page Title:** [Cấu trúc điều hướng cấp bậc]
- **Layout:** [Sidebar, Header, Content Area, Footer]

## 3. UI Components & Responsive Design (WEB)
- **Breakpoints:** [Desktop >= 1200px, Tablet 768-1199px, Mobile < 768px]
- **Thành phần:** [Data table có pagination, tabs, dropdown filter]
- **Trạng thái:** [Loading, Empty, Error, Hover states]

## 4. Form, Input & Validation (WEB)
- **Form Fields:** [Bảng trường, validation client-side & server-side error display]
- **Auto-save / Draft:** [Nếu có chức năng lưu nháp]

## 5. User Flow & Redirect (WEB)
- **Luồng người dùng:** [Thao tác, chuyển trang, mở tab mới]
- **Redirect sau hành động:** [VD: Đặt lệnh xong chuyển về tab Sổ lệnh]

## 6. Authentication & Session Management (WEB)
- **Phiên đăng nhập:** [Cookie/JWT, xử lý khi token hết hạn, đa tab sync]

## 7. Data Display & Real-time Updates (WEB)
- **Dữ liệu thời gian thực:** [WebSocket cập nhật giá/sổ lệnh, polling fallback]
- **Phân trang & Sắp xếp:** [Pagination server-side, sorting cột]
-->

<!-- ========================================================================= -->
<!-- NHÓM C: DÀNH CHO TASK 🔌 API                                              -->
<!-- ========================================================================= -->

<!--
## 2. Endpoints Overview (API)
| Method | Path | Mục đích | Auth Required | Idempotent |
|---|---|---|:---:|:---:|
| `POST` | `/api/v2/orders` | Đặt lệnh giao dịch | Có (Bearer) | Có (X-Request-Id) |

## 3. Request Schema & Parameters (API)
- **Headers:** `Authorization`, `Content-Type: application/json`, `X-Request-Id`
- **Path / Query Parameters:** [Chi tiết]
- **Request Body:**
```json
{
  "symbol": "SSI",
  "side": "BUY",
  "orderType": "LO",
  "price": 32500,
  "quantity": 100
}
```
- **Ràng buộc trường:** [Bảng: Trường, Kiểu, Bắt buộc, Constraints, Mô tả]

## 4. Response Schema & Error Codes (API)
- **Success (200/201):** [JSON mẫu và giải thích]
- **Lỗi nghiệp vụ (400/422):** [Danh sách mã lỗi, message tiếng Việt/Anh]
- **Lỗi hệ thống (401/403/404/429/500):** [Mã lỗi và hướng xử lý]

## 5. Security & Authentication (API)
- **Cơ chế xác thực:** [Bearer Token, HMAC signature, API Key]
- **Phân quyền (RBAC):** [Role/Scope được phép gọi]

## 6. Validation Rules & Business Logic (API)
- **Kiểm tra đầu vào:** [Trường bắt buộc, format, dải giá trị]
- **Logic xử lý cốt lõi:** [Quy tắc tính toán, kiểm tra số dư, kiểm tra trạng thái]

## 7. Dependencies & Data Flow (API)
- **Hệ thống liên quan:** [Microservices gọi đến: Core Trading, Payment, Notification]
- **Sơ đồ luồng dữ liệu:** [Luồng request qua các service]
-->

<!-- ========================================================================= -->
<!-- CÁC SECTION CHUNG CHO TẤT CẢ CÁC TASK (8 - 13)                            -->
<!-- ========================================================================= -->

---

## 8. Business Rules & Edge Cases

### 8.1. Quy Tắc Nghiệp Vụ Cốt Lõi (Business Rules)
1. **[BR-01] Quy tắc tính toán / Điều kiện tiên quyết:** [Mô tả chi tiết, không mơ hồ]
2. **[BR-02] Tính đối xứng (Symmetry Coverage):** [Mô tả đầy đủ tất cả các nhánh hành vi tương đương: Mua và Bán, Thêm và Xóa, Bật và Tắt — không dùng cụm "và tương tự"]
3. **[BR-03] Quy tắc Domain (nếu là Chứng khoán/Fintech):** [Quy tắc phiên ATO/LO/ATC, biên độ giá trần/sàn theo sàn HOSE/HNX/UPCOM, kiểm tra sức mua/ký quỹ]

### 8.2. Trường Hợp Ngoại Lệ & Biên (Edge Cases)
| Mã | Kịch bản biên / Ngoại lệ | Hành vi mong đợi của hệ thống |
|---|---|---|
| `EC-01` | Mất kết nối mạng giữa chừng khi submit | Không trừ tiền 2 lần; hiển thị thông báo kiểm tra lại lịch sử |
| `EC-02` | Giá trị biên (0, max int, số âm, ký tự đặc biệt) | Báo lỗi validation tương ứng tại trường nhập liệu |
| `EC-03` | Thao tác đồng thời (Double tap, duplicate submit) | Debounce button; backend kiểm tra Idempotency Key |

---

## 9. Acceptance Criteria (Reframed — Rule-based)

> ⚠️ **LƯU Ý:** BA viết AC dạng **Checklist Tiêu Chí (WHAT must be true)** với mệnh đề Pass/Fail rõ ràng. Không viết Gherkin scenarios (Given-When-Then) — QA sẽ phụ trách chuyển đổi thành Gherkin.
> **Quy ước mã định danh:** Bắt buộc gắn mã dạng `[AC-x.y]` (x là nhóm chức năng/user flow, y là điều kiện con cụ thể) để phục vụ truy vết tự động 1-1 sang Checklist `[CHK-xx]` và Feature Tag `@AC-x.y`.

### Nhóm 1: Luồng Nghiệp Vụ Chính (Main Flow)
- [ ] **[AC-1.1] Happy Path Chính:** Hệ thống cho phép người dùng [hành động] thành công khi [điều kiện hợp lệ], kết quả [kết quả trả về rõ ràng].
- [ ] **[AC-1.2] Tính Nhất Quán Dữ Liệu:** Sau khi thực hiện thành công, dữ liệu tại [Màn hình / Endpoint liên quan] được cập nhật đồng bộ ngay lập tức.

### Nhóm 2: Ràng Buộc Dữ Liệu & Thẩm Quyền (Validation & Auth)
- [ ] **[AC-2.1] Ràng Buộc Dữ Liệu Đầu Vào:** Hệ thống từ chối và hiển thị thông báo lỗi "[Nội dung lỗi]" khi người dùng [nhập sai/thiếu trường X].
- [ ] **[AC-2.2] Kiểm Tra Số Dư / Quyền Hạn:** Khi [tài khoản không đủ điều kiện/hết hạn], hệ thống chặn thao tác và hiển thị cảnh báo phù hợp.

### Nhóm 3: Xử Lý Ngoại Lệ & Hạ Tầng (Exceptions & Infra)
- [ ] **[AC-3.1] Xử Lý Ngoại Lệ Mạng / Timeout:** Khi backend trả về mã lỗi 5xx hoặc timeout quá 10 giây, hiển thị popup hướng dẫn thử lại.

---

### 9.1. Testability Manifest (`spec/testability-manifest.json`)
> Cuối bước `/ba-spec` (hoặc `/ba-refine`), agent tự động trích xuất file gọn nhẹ `workspace/issues/{issueKey}/spec/testability-manifest.json` gồm danh sách ID (`BR-*`, `AC-*`, `EC-*`), danh sách sàn liên quan (`HOSE`, `HNX`, `UPCOM`, `DERIVATIVES`) và Profile kỹ thuật (`API`, `WS`, `WEB`, `APP`) làm đầu vào cho QA thiết kế test.

---

## 10. Giả Định & Quyết Định Nghiệp Vụ (Assumptions & Decisions)

| STT | Giả định / Quyết định | Lý do đưa ra | Mức độ rủi ro |
|---|---|---|:---:|
| 1 | [Giả định về hành vi người dùng hoặc luồng hệ thống] | [Căn cứ từ tài liệu hoặc phỏng vấn] | Thấp / Trung bình / Cao |
| 2 | [Quyết định chọn giải pháp A thay vì B] | [Thống nhất qua Phase 4 Interview] | Thấp |

---

## 11. Các Câu Hỏi Còn Mở (Open Questions)

> 📌 **Lưu ý:** Các câu hỏi chưa thể chốt trong Phase 4 (do phụ thuộc bên thứ 3 hoặc cần họp hội đồng) được ghi tại đây. **Mục này KHÔNG BLOCK bàn giao** sang QA/DEV; các bên sẽ triển khai phần đã rõ và đánh dấu phần này là "Pending" hoặc "Out of scope sprint này".

| ID | Câu hỏi | Đối tượng phụ trách | Trạng thái |
|---|---|---|:---:|
| `OQ-01` | [Câu hỏi cần làm rõ thêm] | [Stakeholder / Core Team] | Đang chờ phản hồi |

---

## 12. Danh Mục Tài Liệu Tham Chiếu (References)

Tất cả các tài liệu đã được tải về và phân tích trong quá trình tạo spec:

| STT | Tên tài liệu | Đường dẫn lưu trữ cục bộ | Loại tài liệu |
|---|---|---|---|
| 1 | Jira Issue PDF | `source/{issueKey}.pdf` | Yêu cầu gốc |
| 2 | Metadata trích xuất | `source/metadata.json` | API metadata |
| 3 | [Tên Confluence Page] | `source/refs/{slug}-{pageId}.pdf` | Thiết kế chi tiết |
| 4 | [Tên Attachment / Wireframe] | `source/refs/{tên-file}` | Mockup / Sơ đồ |

---

## 13. Ma Trận Truy Vết Nghiệp Vụ (Traceability Matrix)

| Mục Spec (Section / Rule) | Yêu cầu gốc từ Jira / Confluence | Nguồn tài liệu & Trang | Đã xác minh qua Interview |
|---|---|---|:---:|
| `Section 2` (Giao diện) | Wireframe đính kèm | `mockup-v2.png` | ✅ Đã chốt |
| `BR-01` (Quy tắc tính toán) | Mục 3 trong Confluence spec | `source/refs/spec-12345.pdf` (Trang 3) | ✅ Đã chốt |
| `AC-02` (Validation) | Acceptance Criteria gốc trên Jira | `source/{issueKey}.pdf` | ✅ Đã làm rõ |

---

## 📊 Confidence Assessment

- **Completeness:** [XX]% (Mức độ đầy đủ của 13 sections và các luồng)
- **Certainty:** [XX]% (Mức độ chắc chắn của các business rules sau phỏng vấn)
- **Overall Confidence:** **[XX]%** *(Công thức: Completeness * 0.6 + Certainty * 0.4 — Đạt chuẩn ≥90%)*
- **Blockers / Rủi ro còn lại:** [Không có / Nêu các Open Questions nếu có]
