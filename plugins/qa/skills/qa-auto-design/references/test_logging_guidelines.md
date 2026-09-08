# Cẩm Nang Thiết Kế Log Kiểm Thử Chuẩn Mực (Unified Test Logging Guidelines)

Tài liệu này định nghĩa **tiêu chuẩn định dạng và quy tắc vàng về logging** cho toàn bộ hệ thống Automation Test (REST API, WebSocket, Database / TimescaleDB, Web UI, Async & State Transitions) trong dự án.

---

## 1. Cấu Trúc Khung Chuẩn (Standard Unified Format)

Mọi dòng log sinh ra trong quá trình chạy test (trên Console và ghi vào file `test-output.log`) bắt buộc tuân theo cấu trúc căn chỉnh thẳng hàng tuyệt đối:

```text
[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - MESSAGE | CONTEXT
```

### Quy cách Căn Chỉnh Độ Rộng Cột (Fixed-Width Alignment)

Để phần tiền tố `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - ` luôn luôn thẳng tắp hàng với nhau trên mọi dòng log, các trường được quy định độ rộng cố định như sau:

| Trường | Định dạng | Độ rộng | Ví dụ |
|---|---|---|---|
| `[TIMESTAMP]` | `%H:%M:%S` | 8 ký tự | `15:30:00` |
| `[LEVEL]` | `%-5s` (pad space bên phải) | 5 ký tự | `INFO `, `WARN `, `ERROR`, `DEBUG` |
| `[SERVICE]` | `%-12s` (tên component/module) | 12 ký tự | `TEST_RUNNER `, `ORDER_SVC   `, `MARKET_SVC  `, `WS_CLIENT   `, `AUTH_SVC    `, `DB_OBSERVER `, `UI_RUNNER   ` |
| `[TRACE_ID]` | `%-10s` (ID theo dõi luồng) | 10 ký tự | `tr-init001`, `tr-a1b2c3d4`, `tr-ws-0001`, `NO_TRACE  ` |
| ` - ` | Dấu gạch nối phân cách | Cố định | Phân định rõ giữa tiền tố điều hướng và nội dung chính |
| `MESSAGE` | Chuỗi thông điệp cố định | Linh hoạt | Câu diễn giải hành động ngắn gọn, súc tích (Tiếng Việt hoặc Thuật ngữ chuẩn) |
| ` \| ` | Dấu gạch đứng phân cách | Cố định | Ngăn cách giữa Message cố định và Context động |
| `CONTEXT` | Dữ liệu ngữ cảnh động | Linh hoạt | Dữ liệu kỹ thuật chi tiết dạng `key="value"` hoặc JSON phẳng |

---

## 2. 4 Quy Tắc Vàng Khi Viết Log (Golden Rules)

### Quy tắc 1: Tuyệt Đối Không Log Dữ Liệu Nhạy Cảm (Data Masking)
- **Bắt buộc che (masking):** Mật khẩu, Refresh Token, Access Token, API Secret, Thẻ tín dụng, CCCD/CMND, OTP.
- **Quy chuẩn hiển thị:**
  - Token/Key: Chỉ giữ 6 ký tự đầu và 4 ký tự cuối: `token="eyJhbG...***...f9A1"`
  - Password/Secret: Thay thế hoàn toàn bằng `***`: `password="***"`, `api_secret="***"`

### Quy tắc 2: Message Phải Cố Định, Dữ Liệu Đưa Vào Context
Không ghép biến động vào trong câu `MESSAGE`. Việc giữ `MESSAGE` cố định giúp các công cụ phân tích (Grep, ELK, Datadog, CloudWatch) nhóm và thống kê lỗi chính xác:

- ❌ **Sai (Data bị trộn lẫn vào Message):**
  ```text
  15:30:01 [ERROR] [AUTH_SVC    ] [tr-a1b2c3d4] - User admin123 failed to login from IP 1.2.3.4
  ```
- ✅ **Đúng (Message cố định, Data nằm trong Context):**
  ```text
  15:30:01 [ERROR] [AUTH_SVC    ] [tr-a1b2c3d4] - User login failed | user="admin123", ip="1.2.3.4", attempt=3
  ```

### Quy tắc 3: Phân Loại Level Nghiêm Ngặt (Strict Log Levels)

| Log Level | Ý nghĩa nghiệp vụ | Khi nào sử dụng trong Automation Test? |
|---|---|---|
| **`ERROR`** | Lỗi nghiêm trọng, luồng bị gãy, cần xử lý ngay | Assertion kiểm thử thất bại (Test Fail), API trả mã 5xx/4xx không mong đợi, mất kết nối DB/WebSocket đột ngột, exception hệ thống. |
| **`WARN`** | Bất thường nhưng hệ thống vẫn tiếp tục được | API phản hồi chậm bất thường (latency > 1500ms), phải retry request lần 2, dữ liệu cache cũ fallback, cảnh báo deprecation. |
| **`INFO`** | Luồng hoạt động bình thường, các cột mốc quan trọng | Khởi động Session test, bắt đầu scenario, hoàn thành step kiểm thử, nhận event hợp lệ, đặt lệnh thành công, assertion PASSED. |
| **`DEBUG`** | Thông tin chi tiết nội bộ, chỉ bật khi điều tra sâu | In toàn bộ câu truy vấn SQL raw, trích xuất raw payload body, dump headers kỹ thuật, chi tiết SSL/socket ping-pong. |

### Quy tắc 4: Chống Trùng Lặp Handler & Khởi Tạo Môi Trường 1 Dòng
- **Anti-Duplicate:** Tuyệt đối **KHÔNG gọi `logging.basicConfig(...)`** trong test code hay `conftest.py` vì Pytest đã có plugin `log_cli` quản lý. Gọi thêm sẽ tạo thêm StreamHandler thứ hai khiến mỗi dòng log bị nhân đôi.
- **Single-Line Setup:** Khởi tạo môi trường (Session Scope) chỉ in đúng **1 dòng tóm tắt duy nhất**, không log lê thê từng mã đăng ký:
  ```text
  15:30:00 [INFO ] [TEST_RUNNER ] [tr-setup001] - Khởi tạo môi trường test thành công | env="Metabase UAT", db_id=644, tracked_symbols=["VNM", "SSI", "VIC"]
  ```

---

## 3. Khung Diễn Giải Tiếng Việt Vừa Đủ Cho Mọi Kịch Bản Test

Để bảo đảm tính rõ ràng và người mới đọc (kể cả BA, PM, Developer mới) hiểu ngay bài test đang xác minh điều gì, mỗi kịch bản test sử dụng 4 thẻ diễn giải tuần tự trong trường `MESSAGE`:

1. `[KỊCH BẢN]`: Mục tiêu bài test và giả định kiểm thử.
2. `[ĐẦU VÀO]`: Thông số kích hoạt kỹ thuật cụ thể (Endpoint, Method, Parameters, Event).
3. `[HỆ THỐNG TRẢ RA]`: **Giữ nguyên toàn bộ dữ liệu thực tế** do hệ thống/API/Sàn trả về.
4. `[KẾT QUẢ]`: So sánh giữa Thực tế vs Kỳ vọng và đưa ra kết luận (THÀNH CÔNG / THẤT BẠI).

---

## 4. Các Mẫu Log Điển Hình Cho Từng Loại Test/Task

### 4.1. REST API / OpenAPI Testing (Đặt lệnh, Quản lý tài khoản)
```text
15:30:01 [INFO ] [ORDER_SVC   ] [tr-ord00101] - [KỊCH BẢN] Đặt lệnh Mua thường (LO) cho mã VNM trên sàn HOSE | task="G3PTP-17093", order_type="LO"
15:30:01 [INFO ] [ORDER_SVC   ] [tr-ord00101] - [ĐẦU VÀO] Gửi yêu cầu đặt lệnh Mua | method="POST", endpoint="/orders", symbol="VNM", side="BUY", price=75000, qty=100
15:30:01 [INFO ] [ORDER_SVC   ] [tr-ord00101] - [HỆ THỐNG TRẢ RA] Phản hồi từ ORS Gateway | status=200, order_id="ORD-20260908-001", state="New", latency="38ms"
15:30:01 [INFO ] [ORDER_SVC   ] [tr-ord00101] - [KẾT QUẢ] Đặt lệnh thành công đúng mã và trạng thái | expected_state="New", actual_state="New", verdict="PASSED"
```

### 4.2. WebSocket Streaming Testing (Kênh Lệnh, Bảng giá, Tick Feed)
```text
15:30:02 [INFO ] [WS_CLIENT   ] [tr-ws000102] - [KỊCH BẢN] Lắng nghe sự kiện xác nhận lệnh trên kênh order_events | channel="order_events", acc="000111222"
15:30:02 [INFO ] [WS_CLIENT   ] [tr-ws000102] - [ĐẦU VÀO] Đăng ký lắng nghe sự kiện qua WebSocket | event="SUBSCRIBE", channel="order_events", timeout=5.0
15:30:02 [INFO ] [WS_CLIENT   ] [tr-ws000102] - [HỆ THỐNG TRẢ RA] Nhận gói tin push từ WebSocket Server | topic="order_events", order_id="ORD-20260908-001", status="New", ts=1757319754
15:30:02 [INFO ] [WS_CLIENT   ] [tr-ws000102] - [KẾT QUẢ] Dữ liệu WebSocket khớp 100% schema Pydantic v2 | matched_fields=["order_id", "status", "symbol"], verdict="PASSED"
```

### 4.3. Database & Dữ Liệu Thị Trường (TimescaleDB / Metabase UAT)
```text
15:30:03 [INFO ] [DB_OBSERVER ] [tr-db000201] - [KỊCH BẢN] Truy vấn đối chiếu snapshot phiên giao dịch sàn thật | table="krx_mdds_v2_symbol_trading_sessions", db=644
15:30:03 [INFO ] [DB_OBSERVER ] [tr-db000201] - [ĐẦU VÀO] Thực thi Native SQL Select Read-Only | query="SELECT symbol, board_id, trading_session_id, enable_re FROM ... WHERE symbol='VNM'", env="UAT"
15:30:04 [INFO ] [DB_OBSERVER ] [tr-db000201] - [HỆ THỐNG TRẢ RA] Bản ghi snapshot thực tế từ DB | symbol="VNM", board_id=12, session_id=14, enable_re=False, latency="82ms"
15:30:04 [INFO ] [DB_OBSERVER ] [tr-db000201] - [KẾT QUẢ] Dữ liệu snapshot khớp quy tắc cờ phiên sàn HOSE | expected_session=14, actual_session=14, verdict="PASSED"
```

### 4.4. Web UI Testing (Playwright / Browser DOM)
```text
15:30:05 [INFO ] [UI_RUNNER   ] [tr-ui000301] - [KỊCH BẢN] Mở sổ lệnh và thao tác hủy lệnh chờ khớp | page="OrderBookPage", user="trader_uat"
15:30:05 [INFO ] [UI_RUNNER   ] [tr-ui000301] - [ĐẦU VÀO] Click nút Hủy lệnh tại hàng đầu tiên | selector="#btn-cancel-order-0", wait_timeout="3000ms"
15:30:06 [INFO ] [UI_RUNNER   ] [tr-ui000301] - [HỆ THỐNG TRẢ RA] Modal xác nhận và toast thông báo xuất hiện | toast_message="Hủy lệnh thành công", dom_state="hidden"
15:30:06 [INFO ] [UI_RUNNER   ] [tr-ui000301] - [KẾT QUẢ] Lệnh được cập nhật biến mất khỏi tab Chờ khớp | visible=False, verdict="PASSED"
```

### 4.5. Async Workflow & Quản Lý Trạng Thái (Order States / Random End)
```text
15:30:07 [INFO ] [STATE_EVAL  ] [tr-st000401] - [KỊCH BẢN] Đánh giá điều kiện kích hoạt cờ Random End phiên ATO | symbol="VNM", board="HOSE"
15:30:07 [INFO ] [STATE_EVAL  ] [tr-st000401] - [ĐẦU VÀO] Đưa dữ liệu tick và giá dự kiến vào bộ đánh giá | expected_price=100.0, expected_qty=10, session="ATO"
15:30:07 [INFO ] [STATE_EVAL  ] [tr-st000401] - [HỆ THỐNG TRẢ RA] Trạng thái nội bộ của Evaluator | enable_re=True, trigger_time="09:14:45", board_status="IN_RANDOM_END"
15:30:07 [INFO ] [STATE_EVAL  ] [tr-st000401] - [KẾT QUẢ] Cờ enable_re bật đúng điều kiện biên độ ATO | expected_flag=True, actual_flag=True, verdict="PASSED"
```

### 4.6. Trường Hợp Ngoại Lệ & Bắt Lỗi (Error / Failure Case)
```text
15:30:08 [WARN ] [ORDER_SVC   ] [tr-err00501] - Phát hiện API phản hồi chậm vượt ngưỡng cảnh báo | endpoint="/orders", latency="1650ms", threshold="1500ms"
15:30:08 [ERROR] [ORDER_SVC   ] [tr-err00501] - [KỊCH BẢN] Kiểm tra từ chối lệnh khi tài khoản không đủ sức mua | task="G3PTP-17093", side="BUY"
15:30:08 [INFO ] [ORDER_SVC   ] [tr-err00501] - [ĐẦU VÀO] Gửi lệnh với khối lượng vượt sức mua khả dụng | symbol="SSI", qty=1000000, pp0=500000
15:30:08 [ERROR] [ORDER_SVC   ] [tr-err00501] - [HỆ THỐNG TRẢ RA] ORS từ chối khớp lệnh | status=400, err_code=102, err_msg="Tài khoản không đủ sức mua"
15:30:08 [INFO ] [ORDER_SVC   ] [tr-err00501] - [KẾT QUẢ] Bắt chính xác mã lỗi ORS 102 theo đặc tả | expected_code=102, actual_code=102, verdict="PASSED"
```

---

## 5. Hướng Dẫn Tích Hợp Python Logging & `pytest.ini`

### Cấu hình `pytest.ini` Chuẩn
Bắt buộc thiết lập trong `pytest.ini` của từng thư mục test:

```ini
[pytest]
testpaths = steps
python_files = test_*.py
python_classes = Test*
python_functions = test_*
pythonpath = . steps ../../.. ../../../shared
log_cli = true
log_cli_level = INFO
log_cli_format = %(asctime)s [%(levelname)-5s] %(message)s
log_cli_date_format = %H:%M:%S
```

### Tiện ích Log Chuẩn Căn Chỉnh Cột (`StructuredLogger`)

```python
import logging

class StructuredTestLogger:
    """Helper logger đảm bảo căn chỉnh độ rộng cột thẳng hàng tuyệt đối."""
    def __init__(self, service_name: str = "TEST_RUNNER"):
        self.service = f"{service_name:<12}"[:12]
        self.logger = logging.getLogger("test_suite")

    def _format(self, trace_id: str, message: str, context: str = "") -> str:
        tid = f"{trace_id:<10}"[:10]
        if context:
            return f"[{self.service}] [{tid}] - {message} | {context}"
        return f"[{self.service}] [{tid}] - {message}"

    def info(self, message: str, trace_id: str = "NO_TRACE", context: str = ""):
        self.logger.info(self._format(trace_id, message, context))

    def warn(self, message: str, trace_id: str = "NO_TRACE", context: str = ""):
        self.logger.warning(self._format(trace_id, message, context))

    def error(self, message: str, trace_id: str = "NO_TRACE", context: str = ""):
        self.logger.error(self._format(trace_id, message, context))

    def debug(self, message: str, trace_id: str = "NO_TRACE", context: str = ""):
        self.logger.debug(self._format(trace_id, message, context))
```

---

## 6. Checklist Kiểm Tra Tuân Thủ Logging (Quality Gate)

Trước khi nghiệm thu bất kỳ test suite nào, Agent tự đối soát checklist:

- [ ] Cấu trúc log hiển thị chính xác theo mẫu: `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - MESSAGE | CONTEXT`
- [ ] Phần `[TIMESTAMP] [LEVEL] [SERVICE] [TRACE_ID] - ` được căn chỉnh độ rộng cố định, luôn thẳng hàng nhau.
- [ ] Hoàn toàn không có ký tự vẽ cây (`▶`, `├─`, `└─`).
- [ ] Không có lệnh `logging.basicConfig(...)` trong `conftest.py` hay test script (không nhân đôi log).
- [ ] Đã che (mask) 100% dữ liệu nhạy cảm (`token`, `password`, `secret`, `cccd`).
- [ ] Thông điệp `MESSAGE` cố định; dữ liệu động được truyền trong `CONTEXT`.
- [ ] Phân loại chính xác log level: `ERROR`, `WARN`, `INFO`, `DEBUG`.
- [ ] Khởi tạo môi trường chỉ in đúng **1 dòng tóm tắt duy nhất** ở Session Scope.
- [ ] File `test-output.log` lưu trữ toàn bộ Request/Response của 100% test case để phục vụ đối soát.
