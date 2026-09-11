---
description: "Sinh mã automation test từ Gherkin file và checklist, xác minh cú pháp và cấu trúc."
---

Kích hoạt skill qa-auto-design. Đọc file SKILL.md của skill qa-auto-design để thực hiện đúng workflow 4 giai đoạn tinh gọn.

$ARGUMENTS chứa Jira issue key (VD: G3PTP-16825).

## Nguồn đầu vào

1. **File .feature:** `/project-root/workspace/{issueKey}/test/{issueKey}.feature`
2. **File checklist:** `/project-root/workspace/{issueKey}/test/checklist.md`
3. **Mã nguồn hệ thống:** Quét codebase để tìm và tái sử dụng code của developer (module auth, signature, token, websocket client)

## Quy trình 4 Giai Đoạn

1. **Giai đoạn 1: Khảo sát & Kế thừa (Recon & Context Setup):**
   - Áp dụng Blueprint thư mục chuẩn tại `/project-root/workspace/{issueKey}/test/`.
   - Nhận diện Task Type (`🌐 WEB`, `🔌 API`, `⚡ WebSocket`, `📱 Mobile`).
   - Kế thừa cấu hình `.env` 3 tầng (Root → Sibling → Local).
   - Code Recon Gate: Quét và tái sử dụng trực tiếp code dev có sẵn. Soi DOM thật nếu là Web UI. Với chứng khoán: chỉ dùng Metabase UAT (DB 644, V3 > V2).

2. **Giai đoạn 2: Thiết kế Kiến trúc & Tầng Đối tượng (POM / Service Design):**
   - Tách biệt nghiêm ngặt: Assertions CHỈ nằm ở tầng Test, KHÔNG ở Page/Service.
   - Thiết kế Page Object (Web UI) hoặc Service Client / Pydantic DTOs (API/WS).
   - Cấu hình `conftest.py` với logging chuẩn 4 thẻ tiếng Việt và teardown an toàn.

3. **Giai đoạn 3: Sinh Mã Kiểm thử (Test Script Generation):**
   - Sinh code test trong `/project-root/workspace/{issueKey}/test/steps/test_*.py` bao phủ 100% scenario trong file `.feature`.
   - Gắn decorators truy vết `@pytest.mark.scenario`, `@pytest.mark.jira`.
   - No-mock policy trên UAT: gọi Real Base URLs (`openapi-uat`, `ws-openapi-uat`).
   - Áp dụng các testing patterns: Smart waits, Trigger-Listen-Verify (Order States).

4. **Giai đoạn 4: Thẩm định Cú pháp & Bàn giao (Validation & Handoff):**
   - Rà soát code sạch (không `print()`, không comment rác, assertions đúng tầng).
   - Chạy `pytest "workspace/{issueKey}/test/steps" -o python_files="test_*.py *_test.py" --collect-only` để đảm bảo 100% test cases hợp lệ về cú pháp.
   - Bàn giao mã test và hướng dẫn chạy `/qa-run-test {issueKey}` để thực thi toàn trình và xuất báo cáo.

## Output

- Test scripts & Fixtures: `/project-root/workspace/{issueKey}/test/steps/test_*.py` và `conftest.py`
- Cấu hình runner: `/project-root/workspace/{issueKey}/test/pytest.ini`

## Quy tắc Bắt buộc

1. BẮT BUỘC tuân thủ Blueprint cấu trúc thư mục chuẩn tại `workspace/{issueKey}/test/`, TUYỆT ĐỐI KHÔNG tự nghĩ ra file/thư mục lạ ngoài blueprint.
2. BẮT BUỘC áp dụng cơ chế kế thừa env 3 tầng, tái sử dụng credentials (`api-key`, `api-secret`, `token`, URLs) mà không bắt user nhập lại.
3. BẮT BUỘC tìm và tái sử dụng code API/WebSocket có sẵn của dev (Code Recon Gate). KHÔNG viết lại từ đầu.
4. Nếu file `.feature` chưa tồn tại, yêu cầu user chạy `/qa-test-design` trước.
5. Không ôm đồm chạy full suite test hay xuất file `report.md` — việc đó thuộc về `/qa-run-test`.
6. Tất cả output viết bằng TIẾNG VIỆT (trừ code và tags).

<critical_instruction>
HÀNH ĐỘNG THAY VÌ CHAT: Bạn có TOÀN QUYỀN sử dụng các công cụ hệ thống (tool call) để trực tiếp Thêm, Sửa, Xóa file. NGHIÊM CẤM COPY-PASTE MANUAL: Tuyệt đối không in ra các khối code (Markdown diff/code blocks) rồi bảo người dùng tự copy/paste. Bắt buộc phải sử dụng Tool Call để trực tiếp áp dụng thay đổi vào mã nguồn.
</critical_instruction>
