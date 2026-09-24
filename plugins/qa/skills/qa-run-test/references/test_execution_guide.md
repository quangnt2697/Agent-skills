# Cẩm Nang Thực Thi Pytest CLI & Xử Lý Kết Quả (Test Execution Guide)

Tài liệu này cung cấp hướng dẫn kỹ thuật chi tiết về cách phân giải mục tiêu chạy test, các cờ CLI tiêu chuẩn của Pytest, cơ chế ghi log qua `tee`, và quy định xử lý kết quả kiểm thử.

---

## 1. Thuật Toán Phân Giải Mục Tiêu Chạy (Target Resolution)

Khi nhận lệnh `/qa-run-test [TARGET]`, runner phân giải mục tiêu nhanh chóng theo 3 cấp độ:

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

---

## 2. Cấu Hình Lệnh Pytest Tiêu Chuẩn

Để đảm bảo vừa quan sát được console trực tiếp, vừa thu thập đầy đủ 100% log thô phục vụ báo cáo, lệnh Pytest tiêu chuẩn BẮT BUỘC sử dụng đầy đủ các cờ sau:

```bash
mkdir -p "workspace/{issueKey}/test/result"

HTML_FLAG=""
python3 -c "import pytest_html" 2>/dev/null && HTML_FLAG="--html=workspace/{issueKey}/test/result/report.html --self-contained-html"

pytest "$TEST_TARGET" \
  -o python_files="test_*.py *_test.py" \
  -s \
  -v \
  -rA \
  --tb=short \
  --timeout=60 \
  -o log_cli=true \
  -o log_cli_level=INFO \
  --junitxml="workspace/{issueKey}/test/result/junit.xml" \
  $HTML_FLAG \
  2>&1 | tee "workspace/{issueKey}/test/result/test-output.log"
```

### Chi tiết ý nghĩa từng cờ:
- `-s` (`--capture=no`): **BẮT BUỘC**. Cho phép in trực tiếp mọi stdout/stderr ra màn hình mà không bị Pytest nuốt mất. Đây là điều kiện tiên quyết để ghi nhận được đầy đủ log và dữ liệu Request/Response của test script.
- `-v` (`--verbose`): Hiển thị chi tiết tên file, tên hàm test và trạng thái PASSED / FAILED / SKIPPED của từng test case.
- `-rA`: Hiển thị bảng tổng hợp ngắn gọn cuối phiên cho TOÀN BỘ test case (cả Pass, Fail, Skip, XFail).
- `--tb=short`: Rút gọn stack trace vừa đủ để xác định dòng gây lỗi, tránh traceback quá dài làm tràn log.
- `--timeout=60`: **BẮT BUỘC** (yêu cầu gói `pytest-timeout`). Kill tự động bất kỳ test case nào chạy quá 60 giây. Kết quả là `FAILED (timeout)` — **KHÔNG chờ thêm, KHÔNG tự sửa test script**.
- `-o log_cli=true -o log_cli_level=INFO`: Kích hoạt hiển thị log trực tiếp trong thời gian thực ở mức độ INFO trở lên.
- `--junitxml=...`: Xuất kết quả kiểm thử theo định dạng chuẩn JUnit XML cho CI/CD.
- `--html=... --self-contained-html`: Xuất báo cáo HTML độc lập nếu môi trường có `pytest-html`.
- `2>&1 | tee ...`: Chuyển cả stderr và stdout qua lệnh `tee`, vừa hiển thị trực tiếp vừa ghi nguyên vẹn 100% nội dung vào file `test-output.log`.

---

## 3. Chuẩn Bị Trước Khi Chạy (Pre-flight Tinh Gọn)

Thực hiện siêu tốc, không kiểm tra lan man:
1. Đảm bảo thư mục kết quả sạch sẽ:
   ```bash
   mkdir -p "workspace/{issueKey}/test/result"
   ```
2. Chạy ngay lệnh Pytest ở Mục 2. Tuyệt đối KHÔNG đọc spec, không đọc checklist, không review code trước khi chạy.

---

## 4. Xử Lý Khi Có Lỗi (Failure Handling & Handoff)

Khi test suite có kết quả FAILED:

1. **Ghi nhận khách quan:**
   - Trích xuất thông tin lỗi trực tiếp từ Pytest output: tên test case, file/dòng gây lỗi, assertion error / exception.
   - Ghi vào báo cáo `workspace/{issueKey}/test/result/report.md`.

2. **Quy tắc Nghiêm cấm (Strict Guardrails):**
   - ❌ **CẤM mở mã nguồn backend:** Không `view_file` hay `grep_search` các file logic nghiệp vụ backend (`.go`, `.py`, `.java` của service).
   - ❌ **CẤM gửi request cURL / Python ngoài luồng:** Không tự chế các lệnh gọi API để kiểm tra endpoint.
   - ❌ **CẤM sửa assertion gian lận:** Tuyệt đối không nới lỏng assertion để ép test pass.

3. **Đề xuất kỹ năng xử lý (Skill Handoff):**
   - Đề xuất user lựa chọn kỹ năng chuyên trách:
     - 🛠️ `dev-debugging`: Giao cho Developer điều tra mã nguồn backend và fix bug logic.
     - 🔍 `cr-review-code-and-quality`: Giao cho Code Reviewer review mã nguồn và kiến trúc.
     - ⚙️ `qa-auto-design`: Giao cho QA cập nhật lại test script nếu spec có sự thay đổi **hoặc khi timeout xảy ra do logic test sai / threshold quá thấp**.

---

## 5. Quy Tắc Timeout (Timeout Policy — Bắt buộc)

| Tình huống | Hành động bắt buộc |
|---|---|
| 1 test case chạy > 60s | pytest-timeout kill tự động → kết quả `FAILED (timeout)` |
| Toàn suite chạy > 10 phút | Agent DỪNG NGAY → xuất báo cáo kết quả hiện tại với ghi chú `Suite Timeout` |
| Test bị timeout | **KHÔNG tự sửa test script** → Đề xuất `qa-auto-design` hoặc `dev-debugging` |
| pytest-timeout chưa cài | Chạy `pip install pytest-timeout` trước rồi chạy lại |

> ❌ **CẤM:** Khi test timeout, tự sửa test script để tăng giá trị timeout hoặc loại bỏ assertion — đây là vi phạm nghiêm trọng nhất của skill `qa-run-test`.
