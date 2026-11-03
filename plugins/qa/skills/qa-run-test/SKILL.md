---
name: qa-run-test
description: 'Chạy test automation hiện có (Pytest), regression test, chạy lại test sau khi fix bug. ĐO LƯỜNG trung thực, KHÔNG sửa lỗi. Báo cáo kết quả nguyên văn (Pass/Fail/Error/Timeout) và đề xuất skill xử lý nếu có lỗi.'
trigger: Khi cần chạy test automation, regression test, hoặc thẩm định kết quả sau fix bug. Trigger bằng /qa-run-test.
disable-auto-invoke: true
---

# Kỹ Năng Thực Thi Kiểm Thử Tự Động (qa-run-test)

> 🛡️ **Grounding (grounding-contract):** Mọi số liệu, assertion, endpoint, mã lỗi phải lấy từ nguồn thật (Jira/Spec/DB/Code); thiếu thì ghi `NEEDS-INPUT`/`NEEDS-SPEC` và hỏi lại, KHÔNG suy diễn. Chỉ báo "đã xong" khi có bằng chứng thực (file tồn tại, exit code 0); công cụ/n8n lỗi thì báo nguyên văn và DỪNG, KHÔNG giả lập kết quả. Cấm sao chép số liệu từ ví dụ mẫu.

> 🔒 **Scope & Permission:** Tier 3 (EXECUTION MEASURE) · Single-Task Hard Stop sau artifact · Tuân thủ tuyệt đối [autonomy-contract.md](../../../../.agents/rules/autonomy-contract.md).

## Input Bắt Buộc & Bằng Chứng Hoàn Thành
- **Input bắt buộc:** Mã test đã tồn tại và n8n runner online. Thiếu input thì dừng và hỏi lại, không tự điền.
- **Bằng chứng hoàn thành:** `run-status.json`, `junit.xml`, `test-output.log`, `report.md` do runner ghi; agent không tự tạo hay sửa.

## 1. Mục đích: ĐO LƯỜNG, Không Sửa
- Chỉ dùng khi đã có sẵn mã kiểm thử. Mục tiêu là thu thập kết quả trung thực nhất.
- Lỗi (test fail, hạ tầng, script sai) là **dữ liệu**, agent tuyệt đối không được tự ý sửa để "làm xanh" báo cáo.

**Khi KHÔNG sử dụng:**
- Chưa có mã kiểm thử hoặc cần sinh mới mã test từ file Gherkin → Dùng `qa-auto-design`.
- Cần chạy toàn bộ luồng E2E từ spec đến report trong 1 lệnh duy nhất → Dùng `qa-full-pipeline`.
- Cần điều tra sửa lỗi hệ thống (root cause fix) → Bàn giao cho Developer xử lý.

## 2. Bảng Vi Phạm (Agent CẦN LÀM / KHÔNG LÀM)

| Khi gặp… | Agent **LÀM** | Agent **KHÔNG LÀM** |
|---|---|---|
| Test fail / timeout | In `verdict`, tên test, lỗi nguyên văn; đề xuất skill xử lý | Sửa assertion, tăng `--timeout`, bỏ test, thêm `skip`/`xfail` |
| Lỗi import/syntax | Trả `errorCode` + dòng lỗi đầu tiên + file:dòng | Sửa `conftest.py`, `services/`, `pytest.ini`; tạo file thiếu |
| Thiếu package/plugin | Trả `PLUGIN_MISSING` + tên package | `pip install`, thay đổi `requirements.txt` |
| Thiếu `.env`/biến | Trả `ENV_MISSING` + tên biến | Tự tạo `.env`, tự điền giá trị, copy template |
| n8n không chạy | Trả `RUNNER_UNAVAILABLE` | Chạy pytest trực tiếp bằng Bash để vượt rào |
| Không có test | Trả `NO_TESTS_COLLECTED` | Gọi `qa-auto-design` tự động; tự viết test |
| Kết quả bất thường | Trả `REPORT_INCONSISTENT` hoặc `ALL_SKIPPED` | Chạy lại nhiều lần để chọn lần kết quả "đẹp" |
| Bất kỳ lỗi nào | **Dừng**, kết thúc lượt bằng đúng 1 đề xuất skill tiếp theo | Tự chạy lại, tự sửa code, tự điều tra backend |

## 3. Quy Trình Thực Thi 4 Bước

- **Bước 1: Preflight**
  - Xác định mục tiêu từ tham số (hoặc mặc định `workspace/issues/{issueKey}/test/steps/`).
  - Ghi đè file nếu đã tồn tại ở `result/`. Cấm ghi file ra ngoài `result/`.
- **Bước 2: Run (Chạy n8n Runner & Background Execution)**
  - Gọi webhook n8n chuẩn (không dùng shell bash):
    ```bash
    node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js triggerAsyncTest '{"issueKey":"{issueKey}","testFiles":"workspace/issues/{issueKey}/test/steps/"}'
    ```
  - Runner sẽ tự áp dụng cờ `--timeout`, `--junitxml` và timeout toàn suite (600s).
  - ⚡ **Chế độ Chạy Nền Bất Đồng Bộ (Background Async Mode):** Đối với các suite kiểm thử E2E Playwright hoặc regression kéo dài (>3 phút), agent kích hoạt webhook n8n ở chế độ nền (không chờ đồng bộ trong chat). Kết quả được ghi vào `test/result/` (report.md, test-output.log) khi hoàn tất; agent đọc lại các file này để báo cáo.
- **Bước 3: Verify (Xác minh kết quả)**
  - Kết quả trả về gồm `verdict` và `errorCode` theo Error Contract.
  - Phân loại 4 trạng thái: `PASS` (xanh), `FAIL` (có test trượt), `ERROR` (hỏng script/hạ tầng), `TIMEOUT`.
- **Bước 4: Report (Báo cáo)**
  - Node `qa-format-result` đã tự sinh `report.md` và `run-status.json`.
  - **Agent KHÔNG tự viết/sửa lại `report.md`**. Chỉ việc đọc `report.md` và tóm tắt ngắn gọn 1-2 câu ra màn hình chat.
  - Đề xuất: `FAIL` → Bàn giao cho Developer phụ trách service / `cr-review-code-and-quality`, `ERROR/TIMEOUT` → `qa-auto-design` / User, `RUNNER_UNAVAILABLE` → User (`npm run n8n`).

## 4. Verdict & Error Contract
Runner sẽ trả kết quả JSON với các mã lỗi như `COLLECT_IMPORT_ERROR`, `NO_TESTS_COLLECTED`, `TEST_FAILED`. 
Giao tiếp lỗi theo chuẩn Action-First:
```text
⛔ ERROR — COLLECT_IMPORT_ERROR
Dòng lỗi: ModuleNotFoundError: No module named 'dnse' (steps/conftest.py:4)
Người nhận: qa-auto-design
Bước tiếp theo: Chạy `/qa-auto-design {issueKey}` để sửa script.
```

## 5. Quy Tắc Output File & Xác Minh (Verification)
> 📌 Do n8n runner tự ghi, agent không dùng file edit tool để sửa.
- `workspace/issues/{issueKey}/test/result/test-output.log` (Nguyên văn)
- `workspace/issues/{issueKey}/test/result/report.md` (Báo cáo tổng hợp)
- `workspace/issues/{issueKey}/test/result/junit.xml` (Số liệu cấu trúc)
- `workspace/issues/{issueKey}/test/result/run-status.json` (Error Contract)

---
