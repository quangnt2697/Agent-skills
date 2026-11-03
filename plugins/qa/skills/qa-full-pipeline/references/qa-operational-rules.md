# Quy tắc Vận hành Bắt buộc cho QA (QA Operational Rules)

Tài liệu này chứa các quy tắc sống còn mà QA Agent **bắt buộc** phải tuân thủ trong suốt toàn bộ pipeline kiểm thử (Design, Auto, Run Test).

## 1. Môi trường và Dữ liệu
- **Metabase UAT Strict Policy:** QA pipeline CHỈ scan/query trên Metabase UAT (`${METABASE_UAT_URL}`, DB Timescale: `${METABASE_UAT_DB_TIMESCALE_ID}`). NGHIÊM CẤM chạy automation test trên Metabase Production (`${METABASE_PROD_URL}`). Code phải có Security Gate: raise `ValueError` nếu phát hiện môi trường là `prod` hoặc trỏ tới `METABASE_PROD_URL`.
- **Zero-Mutation Policy:** Mọi truy vấn Metabase là Read-Only (chỉ `SELECT`). Tuyệt đối cấm các lệnh DDL/DML.
- **Real Base URLs Only:** Bắt buộc kết nối `BASE_URL` và `WS_URL` cấu hình trong `.env`. NGHIÊM CẤM mock server.
- **TimescaleDB:** Ưu tiên bảng v3, fallback v2. Chi tiết bảng xem `references/timescale-schema.md`. Mọi câu truy vấn bắt buộc dùng Tên Bảng (Table Name), không dùng Metabase Table ID.

## 2. Kế thừa và Cấu hình (Recon Gate)
- **Pre-generation Code Recon Gate:** Trước khi viết code, BẮT BUỘC quét codebase để tái sử dụng module Auth, Token, HMAC, WebSocket Client có sẵn. Khi gặp task liên quan đến API/WS, BẮT BUỘC quét thêm folder `openapi-tyk/sdk/python/` (qua `projects.json`, biến `OPENAPI_TYK_PATH`, hoặc đường dẫn tương đối) để kế thừa codebase SDK Python (`DNSEClient`, `trading-api`, `marketdata-api`, `websocket-trading`, `websocket-marketdata`, `examples`).
- **Zero-Hardcode & .env Mandatory Rule:** Toàn bộ biến kiểm thử, endpoints, credentials, tài khoản test, mã chứng khoán, mức giá, khối lượng, tham số biên và timeouts BẮT BUỘC tạo và lưu giữ trong file `.env`. Trong toàn bộ test script, CHỈ ĐƯỢC PHÉP gọi/đọc giá trị từ `.env` (qua `os.getenv()`, `EnvConfig`, fixtures), TUYỆT ĐỐI KHÔNG hardcode bất kỳ giá trị nào.

## 3. Theo dõi và Báo cáo (Tracing & Logging)
- **Log chuẩn:** Tuân thủ [test_logging_guidelines.md](../../qa-auto-design/references/test_logging_guidelines.md) — format `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - MESSAGE | CONTEXT`, 4 quy tắc vàng, 4 thẻ tiếng Việt.
- **Order State Transitions:** Chi tiết trong [order_state_testing.md](../../qa-auto-design/references/order_state_testing.md).

## 4. Thiết Kế Kịch Bản BDD Gherkin
- **Quy tắc Tham số hóa Đa sàn / Đa mã (Multi-Symbol Parameterization):** Khi kiểm thử tính năng liên quan đến từ 2 sàn hoặc 2 mã chứng khoán có đặc thù phiên/khung giờ/topic khác nhau, **BẮT BUỘC** phải tách riêng Scenario độc lập hoặc sử dụng `Scenario Outline` kèm bảng `Examples` tham số hóa chi tiết. **CẤM TUYỆT ĐỐI** viết scenario gộp chung làm mờ ranh giới thời gian và kênh dữ liệu.

## 5. Cơ Chế Phân Loại Lỗi Thông Minh (Smart Failure Triage & Self-Fix Gate)
Khi thực thi test (`qa-run-test` trong `qa-full-pipeline`), nếu test fail, Agent BẮT BUỘC phân loại lỗi theo 3 nhóm trước khi quyết định hành động:

- **[Loại 1: Test Script / Harness Error]**
  - Dấu hiệu: `SyntaxError`, `ModuleNotFoundError`, `ImportError`, `AttributeError`, sai tên hàm SDK so với `sdk-map.json`, thiếu fixture cấu hình hoặc sai selector Web UI.
  - Hành động: **ĐƯỢC PHÉP tự động sửa cú pháp/import mã test vừa sinh (Self-Fix tối đa 1 vòng duy nhất)** qua `qa-auto-design` và chạy lại. CẤM tự ý cài package mới qua pip/npm hoặc sửa assertion. Nếu vẫn lỗi: DỪNG và báo cáo.
- **[Loại 2: Stale Test Data / Env Timeout]**
  - Dấu hiệu: Lệnh bị từ chối do giá vượt biên độ trần/sàn khi test chạy khác ngày giao dịch, hoặc gặp 502/504 gateway timeout tạm thời.
  - Hành động: **ĐƯỢC PHÉP tự động refresh `data-grounding.json` từ Metabase UAT (`$METABASE_UAT_DB_TIMESCALE_ID`) và retry 1 lần duy nhất.**
- **[Loại 3: Real Application Bug (Lỗi Nghiệp vụ Ứng dụng Thật)]**
  - Dấu hiệu: Request đã gửi thành công tới server UAT đúng thông số theo `spec/final.md` và `.feature`, nhưng server trả HTTP status code khác kỳ vọng (vd: mong đợi 200 nhưng server trả 400/500), sai error code nghiệp vụ, hoặc dữ liệu DB/WS không khớp logic đặc tả.
  - Hành động: **CẤM TUYỆT ĐỐI SỬA TEST ASSERTION ĐỂ ÉP PASS!** Giữ nguyên trạng thái **FAILED**, ghi nhận đầy đủ request/response vào `test-output.log`, trích xuất cURL/WS frame vào `report.md`, gắn nhãn **`[APP_BUG]`** trong `report.md` và bàn giao sang DEV.

## 6. Quy Tắc Dữ Liệu Động JIT (Just-In-Time Data Grounding & price_type)
- **Kịch bản Gherkin (.feature):** Bảng `Examples` khi có giá chứng khoán BẮT BUỘC có thêm cột `price_type` (`AT_REF`, `AT_CEILING`, `AT_FLOOR`, `OVER_CEILING_1_TICK`, `UNDER_FLOOR_1_TICK`) bên cạnh mức giá mẫu.
- **Test Fixture (conftest):** Kiểm tra `trading_date` trong `data-grounding.json`. Nếu khác ngày hiện tại, fixture tự động cập nhật lại mức giá thực tế tương ứng với `price_type` từ Metabase UAT, chống fail giả do biên độ giá thay đổi qua ngày.
