---
description: "Chạy test automation hiện có bằng n8n runner. KHÔNG sửa code, KHÔNG tự chạy CLI. ĐO LƯỜNG trung thực kết quả."
---

CHỈ thực thi test scripts thông qua webhook n8n. KHÔNG tự chạy lệnh pytest bằng bash/CLI. KHÔNG sinh code automation mới. KHÔNG sửa code nếu test fail.

$ARGUMENTS có thể chứa Jira issue key (VD: G3PTP-16825) hoặc đường dẫn thư mục.

## Nguyên Tắc Cốt Lõi: ĐO LƯỜNG Trung Thực — KHÔNG Tự Sửa Lỗi

1. **Chuẩn bị & Gọi Runner (Bắt buộc):**
   - Định vị target `workspace/issues/{issueKey}/test/steps/`. Không đọc spec. Không sửa file.
   - BẮT BUỘC gọi webhook bằng lệnh:
     `node ${AGENT_SKILLS_HOME:-.}/scripts/lib/n8n-client.js triggerAsyncTest '{"issueKey":"{issueKey}","testFiles":"workspace/issues/{issueKey}/test/steps/"}'`
   - Tuyệt đối không dùng `pytest` hay `bash`. Không dùng `tee`. Mọi cấu hình cờ `--timeout`, `--junitxml` do n8n tự xử lý.

2. **Trả Kết Quả Tức Thì & Nguyên Bản:**
   - Đọc kết quả từ console output của node script hoặc từ `workspace/issues/{issueKey}/test/result/report.md` do n8n sinh.
   - Tóm tắt kết quả theo 4 Verdict: PASS (xanh), FAIL (có test trượt), ERROR (lỗi hạ tầng/kịch bản), TIMEOUT.
   - Agent **không** tự viết lại hay ghi đè `report.md`.

3. **Giao Tiếp Lỗi (Error Contract):**
   - Nếu test fail hoặc có lỗi, trình bày lỗi NGUYÊN VĂN (errorCode, dòng lỗi đầu tiên).
   - Đề xuất kỹ năng xử lý tiếp theo:
     - 🛠️ `dev-debugging`: Nếu FAIL (bug ứng dụng).
     - ⚙️ `qa-auto-design`: Nếu ERROR (lỗi script, import, no tests).
     - 🚀 User: Nếu RUNNER_UNAVAILABLE (`npm run n8n`).

## Quy Tắc Bắt Buộc

1. **CHẠY LỖI → TRẢ LỖI:** Tuyệt đối KHÔNG sửa assertion/logic để ép FAIL→PASS. KHÔNG tự sửa file conftest, cài thư viện bằng pip. Test FAIL hay ERROR là dữ liệu cần báo cáo.
2. **KHÔNG điều tra backend:** CẤM dùng `grep_search`, `view_file` lục lọi source code. CẤM gọi cURL.
3. **ĐỘC BẢN OUTPUT:** Các file trong `test/result/` do n8n tự tạo, cấm sửa bằng file edit tool.

## 🔒 Scope Boundaries & Immutable Hard Stops (Bắt buộc tuân thủ 100%)

1. **CHỈ LÀM (TIER 3 - TEST RUNNER):** Lệnh này CHỈ làm nhiệm vụ kích hoạt runner đo lường kết quả kiểm thử và báo cáo trung thực.
2. **TUYỆT ĐỐI CẤM (STRICT FORBIDDEN):** TUYỆT ĐỐI CẤM sửa đổi mã nguồn ứng dụng hoặc sửa test assertions khi test fail. CẤM tự ý cài đặt package hoặc lục lọi backend code.
3. **ĐIỀU KIỆN DỪNG (HARD STOP):** Báo cáo kết quả kiểm thử xong là DỪNG LẠI NGAY và đề xuất duy nhất 1 bước tiếp theo cho người dùng.
