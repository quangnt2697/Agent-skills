# Cẩm Nang Thực Thi Pytest CLI & Xử Lý Lỗi Kỹ Thuật (Test Execution Guide)

Tài liệu này cung cấp hướng dẫn kỹ thuật chi tiết về thuật toán phân giải mục tiêu chạy test, các cờ CLI tiêu chuẩn của Pytest, cơ chế ghi log qua `tee`, và quy trình Self-fix loop kỹ thuật script.

---

## 1. Thuật Toán Phân Giải Mục Tiêu Chạy (Target Resolution)

Khi nhận lệnh `/qa-run-test [TARGET]`, runner phân giải mục tiêu theo thuật toán 3 cấp độ ưu tiên:

```
[MỤC TIÊU THỰC THI]
├── Cấp 1: Tham số $ARGUMENTS được cung cấp tường minh
│   ├── Là file cụ thể (vd: workspace/SCRUM-123/test/steps/test_login.py) ➔ Chạy đúng file đó
│   └── Là thư mục cụ thể (vd: workspace/SCRUM-123/test/steps) ➔ Quét mọi test file trong thư mục
├── Cấp 2: Cung cấp {issueKey} (vd: /qa-run-test SCRUM-123)
│   └── Phân giải thành: workspace/{issueKey}/test/steps/
└── Cấp 3: Không có tham số
    └── Tự động dò tìm thư mục test gần nhất trong workspace hiện tại
```

### Quy ước đặt tên file kiểm thử:
Pytest theo mặc định chỉ tìm `test_*.py`. Tuy nhiên, trong nhiều dự án, test file có thể được đặt tên theo chuẩn `*_test.py`. Runner BẮT BUỘC thêm cấu hình:
`-o python_files="test_*.py *_test.py"`
để nhận diện 100% test files mà không bỏ sót bất kỳ test case nào.

### Các biến thể CLI thường dùng:
- **Chạy toàn bộ:** `pytest "workspace/{issueKey}/test/steps" -o python_files="test_*.py *_test.py"`
- **Chạy Smoke tests:** `pytest "workspace/{issueKey}/test/steps" -m smoke`
- **Chạy lại các test bị FAIL lượt trước:** `pytest "workspace/{issueKey}/test/steps" --lf` (last-failed)
- **Dừng ngay ở test case FAIL đầu tiên (Fail-fast):** `pytest "workspace/{issueKey}/test/steps" -x`
- **Lọc theo tên kịch bản:** `pytest "workspace/{issueKey}/test/steps" -k "order_matching"`

---

## 2. Cấu Hình Lệnh Pytest Tiêu Chuẩn

Để đảm bảo vừa quan sát được console trực tiếp, vừa thu thập đầy đủ 100% log thô phục vụ bóc tách lỗi và trích xuất báo cáo, lệnh Pytest tiêu chuẩn BẮT BUỘC sử dụng đầy đủ các cờ sau:

```bash
mkdir -p "workspace/{issueKey}/test/result"

pytest "workspace/{issueKey}/test/steps" \
  -o python_files="test_*.py *_test.py" \
  -s \
  -v \
  -rA \
  --tb=short \
  -o log_cli=true \
  -o log_cli_level=INFO \
  --junitxml="workspace/{issueKey}/test/result/junit.xml" \
  --html="workspace/{issueKey}/test/result/report.html" \
  --self-contained-html \
  2>&1 | tee "workspace/{issueKey}/test/result/test-output.log"
```

### Chi tiết ý nghĩa từng cờ:
- `-s` (`--capture=no`): **BẮT BUỘC**. Cho phép in trực tiếp mọi stdout/stderr ra màn hình mà không bị Pytest nuốt mất. Đây là điều kiện tiên quyết để ghi nhận được 4 thẻ flow text `[KỊCH BẢN]`, `[ĐẦU VÀO]`, `[HỆ THỐNG TRẢ RA]`, `[KẾT QUẢ]`.
- `-v` (`--verbose`): Hiển thị chi tiết tên file, tên hàm test và trạng thái PASSED / FAILED / SKIPPED của từng test case.
- `-rA`: Hiển thị bảng tổng hợp ngắn gọn cuối phiên cho TOÀN BỘ test case (cả Pass, Fail, Skip, XFail).
- `--tb=short`: Rút gọn stack trace vừa đủ để xác định dòng gây lỗi, tránh việc traceback dài hàng nghìn dòng làm tràn log.
- `-o log_cli=true -o log_cli_level=INFO`: Kích hoạt hiển thị log trực tiếp trong thời gian thực ở mức độ INFO trở lên.
- `--junitxml=...`: Xuất kết quả kiểm thử theo định dạng chuẩn JUnit XML để tích hợp CI/CD hoặc các công cụ phân tích tự động.
- `--html=... --self-contained-html`: Xuất báo cáo trực quan dạng HTML độc lập (CSS nhúng kèm) để xem offline.
- `2>&1 | tee ...`: Chuyển cả stderr và stdout qua lệnh `tee`, vừa hiển thị trực tiếp trên console vừa ghi nguyên vẹn 100% nội dung vào file `test-output.log`.

---

## 3. Pre-flight Check & Chuẩn Bị Môi Trường

Trước khi gõ lệnh chạy kiểm thử, Agent cần thực hiện 3 bước kiểm tra tiền khả thi nhanh:

1. **Kiểm tra công cụ runner:**
   ```bash
   pytest --version
   ```
   Nếu chưa có Pytest hoặc plugin `pytest-html`:
   ```bash
   pip install pytest pytest-html
   ```

2. **Kiểm tra cấu hình môi trường `.env`:**
   Đảm bảo file `workspace/{issueKey}/test/.env` hoặc `.env` tại root đã có đủ các biến kết nối cần thiết (`BASE_URL`, `WS_URL`, credentials).

3. **Dọn dẹp thư mục kết quả trước khi chạy:**
   ```bash
   rm -rf "workspace/{issueKey}/test/result/*"
   mkdir -p "workspace/{issueKey}/test/result"
   ```
   Việc dọn dẹp giúp ngăn ngừa việc lẫn lộn log của các lần chạy trước, đảm bảo tính độc bản của báo cáo.

---

## 4. Cơ Chế Self-Fix Loop Kỹ Thuật Script (Tối Đa 3 Vòng)

Khi có test case bị FAILED, Agent **KHÔNG vội kết luận ngay là bug sản phẩm** mà cần kiểm tra xem có phải do lỗi kỹ thuật của kịch bản kiểm thử (Script Issue) hay không.

### 4.1. Danh mục lỗi kỹ thuật script ĐƯỢC PHÉP tự sửa:
1. **Lỗi cú pháp hoặc Import:** Thiếu import thư viện, sai đường dẫn module, sai tên class DTO/PageObject.
2. **Lỗi cấu hình Fixture:** Fixture chưa khai báo trong `conftest.py`, sai scope, thiếu tham số truyền vào hàm test.
3. **Lỗi định dạng dữ liệu trong script:** Script parse nhầm chuỗi JSON, so sánh kiểu dữ liệu không tương thích (string `"100"` vs integer `100`), sai tên field của DTO.
4. **Lỗi Timeout mạng UAT:** Mạng UAT có độ trễ cao đột biến làm timeout mặc định 5s bị quá hạn $\rightarrow$ Điều chỉnh timeout lên mức hợp lý (10s - 15s) kèm cơ chế polling `asyncio.wait_for` hoặc `page.wait_for_selector`.

### 4.2. Quy trình lặp Self-fix Loop:
```
Chạy Pytest ➔ Phát hiện FAIL
 ├── Phân tích lỗi ➔ Xác định là Script Issue?
 │    ├── ĐÚNG:
 │    │    ├── Vòng 1: Sửa trực tiếp code test/fixture ➔ Chạy lại (--lf)
 │    │    ├── Vòng 2: Nếu vẫn lỗi script ➔ Tinh chỉnh lại ➔ Chạy lại (--lf)
 │    │    └── Vòng 3: Nỗ lực sửa cuối cùng ➔ Chạy lại toàn bộ suite
 │    └── SAI (Application Bug / Env Bug): Dừng ngay vòng lặp, chuyển sang phân tích lỗi nghiệp vụ!
 └── Kết thúc sau tối đa 3 vòng lặp.
```

### 4.3. Quy Tắc Chống Gian Lận (Anti-Cheating Rules):
TUYỆT ĐỐI KHÔNG sử dụng các hành vi sau để làm test pass:
- ❌ **CẤM sửa câu lệnh assert:** Ví dụ hệ thống trả về HTTP 400 (bị lỗi nghiệp vụ), cấm sửa script thành `assert response.status_code == 400` để biến FAIL thành PASS.
- ❌ **CẤM gắn cờ bỏ qua:** Cấm thêm `@pytest.mark.skip` hoặc comment bỏ dòng test bị fail.
- ❌ **CẤM nới lỏng điều kiện kiểm tra:** Cấm xóa bỏ các trường bắt buộc trong assertion hoặc xóa kiểm tra schema Pydantic.
