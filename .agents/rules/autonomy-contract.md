# Autonomy Contract — Khi nào agent được tự quyết, khi nào phải hỏi

## Nguyên tắc

Mặc định của hệ thống là **TỰ CHẠY**. Agent chỉ dừng lại hỏi user khi rơi vào **danh sách đóng** ở mục 2 — không có ngoại lệ nào khác, không có "để cho chắc".

Rule này là nguồn sự thật duy nhất cho việc dừng/chạy tiếp. Khi bất kỳ SKILL.md hay command nào mâu thuẫn với rule này, **rule này thắng**.

---

## 1. Cổng chuyển phase (Phase Gate)

Chuyển sang phase tiếp theo **NGAY LẬP TỨC** khi tất cả các điều kiện sau đúng. Mọi điều kiện đều phải kiểm chứng được bằng lệnh — không dùng cảm tính:

- [ ] File output của phase hiện tại tồn tại và không rỗng
- [ ] Script validate của phase (nếu có) exit code = 0
- [ ] Số lượng artifact downstream ≥ số lượng artifact upstream bắt buộc
      (VD: số Gherkin scenario ≥ số checklist item P0)
- [ ] Không có item nào được gắn nhãn `[Blocked]`

Nếu tất cả đúng → chạy tiếp, **không thông báo xin phép**, chỉ log một dòng:

```
[AUTO] Phase 2 → Phase 3 (checklist: 45 items, gherkin: 28 scenarios, validate: exit 0)
```

Nếu có điều kiện sai → xem mục 2 để biết đó có phải lý do được dừng không. Nếu không phải, **tự sửa rồi chạy tiếp**.

---

## 2. Danh sách đóng — 5 trường hợp DUY NHẤT được dừng hỏi user

Agent chỉ được dừng luồng để hỏi khi rơi vào đúng một trong 5 trường hợp sau:

| # | Trường hợp                                                                                  | Ví dụ                                                                             |
|---|---------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| 1 | **Thiếu file input bắt buộc** mà agent không thể tự tạo                                     | `{issueKey}-final.md` không tồn tại → hướng dẫn chạy `/ba-spec` trước             |
| 2 | **Thiếu credential / secret** không thể tự lấy                                              | `.env` không tồn tại, hoặc thiếu `ATLASSIAN_API_TOKEN`                            |
| 3 | **Có ≥1 câu hỏi 🔴 Critical** trong gap analysis — câu trả lời làm thay đổi bản chất output | Spec không nói rõ lệnh LO hay MP → toàn bộ business rule khác nhau                |
| 4 | **Sắp commit hoặc merge vào `main`**                                                        | Theo `git-workflow.md` — đây là cổng người duy nhất của luồng code                |
| 5 | **Hành động không thể hoàn tác bằng `git revert`**                                          | Xoá data, deploy, thanh toán, đổi quyền/auth, `git push --force`, xoá file source |

**Mọi trường hợp khác: TỰ QUYẾT.** Ghi giả định vào output rồi chạy tiếp.

> **Ghi chú (ba-spec):** Gate 1 ("Hiển thị bảng tài liệu chờ user duyệt") và Gate 2 ("Chờ OK trước khi sinh spec") trong `ba-spec` là các instance hợp lệ của **trường hợp #3** (câu hỏi 🔴 Critical, câu trả lời thay đổi bản chất output). Không phải ngoại lệ đặc biệt — chúng thuộc danh sách đóng sẵn có.


---

## 3. Những thứ TUYỆT ĐỐI KHÔNG được coi là lý do dừng

Đây là các lý do agent hay tự bịa ra để hỏi. Tất cả đều **không hợp lệ**:

| ❌ Lý do không hợp lệ                            | ✅ Việc phải làm thay thế                                                 |
|--------------------------------------------------|---------------------------------------------------------------------------|
| "Confidence chỉ 78%, có nên tiếp không?"         | Chạy tiếp. Ghi gap vào mục *Giả định & Rủi ro* của output                 |
| "Checklist đã đầy đủ chưa? Có cần sửa gì không?" | Tự kiểm tra bằng cổng ở mục 1, rồi chạy tiếp                              |
| "Bạn có muốn tôi sinh code automation không?"    | Có. Đó là phase tiếp theo trong pipeline — cứ chạy                        |
| "Bạn có muốn tôi apply fix này không?"           | Apply luôn bằng Edit tool. Không bao giờ in code block bảo user tự dán    |
| "File đã tồn tại, có ghi đè không?"              | Ghi đè. File cũ đã nằm trong git history                                  |
| "Có 2 cách làm, bạn chọn cách nào?"              | Chọn cách đơn giản hơn, ghi lý do vào output. Chỉ hỏi nếu rơi vào mục 2.3 |
| "Tôi đã xong phase 2, có tiếp phase 3 không?"    | Tiếp. Pipeline nghĩa là chạy hết                                          |
| "Test fail 3/28, có tiếp không?"                 | Tự debug và sửa test. Chỉ báo cáo khi đã hết cách                         |

---

## 4. Cách xác định Auto Mode

Agent **chỉ** được dùng những tín hiệu đọc được bằng mắt hoặc bằng lệnh. Không dùng biến môi trường, không dùng `skill_params`, không dùng `context.get()` — không có runtime nào set những thứ đó.

```
Auto mode = BẬT (mặc định), trừ khi:
  - Chuỗi $ARGUMENTS chứa "--step" hoặc "--manual"

Kiểm tra bổ sung (nếu file tồn tại):
  - /project-root/workspace/{issueKey}/.pipeline-state.json có "autoMode": false → tắt auto
```

Ở chế độ `--step`, agent dừng sau **mỗi phase** để user review — đây là chế độ opt-in, không phải mặc định.

---

## 5. Định dạng khi buộc phải dừng

Khi rơi vào mục 2, dừng đúng một lần, nêu rõ trường hợp nào và cần gì để chạy tiếp:

```markdown
⛔ **DỪNG** — Trường hợp 2 (thiếu credential)

**Thiếu:** biến `ATLASSIAN_API_TOKEN` trong `/path/to/.env`
**Cần bạn làm:** thêm biến này vào `.env`
**Sau khi xong:** chạy lại `/ba-spec JIRA-123` — pipeline sẽ tiếp tục từ Phase 0
```

Không dùng token đánh dấu đặc biệt (`[STOP_AND_WAIT]` hay tương tự) — kết thúc lượt trả lời chính là tín hiệu dừng.

---

## 6. Quan hệ với các rule khác

- `git-workflow.md` — trường hợp 4 của danh sách đóng. Rule đó vẫn giữ nguyên hiệu lực đầy đủ.
- `confidence-level.md` — Confidence Level từ nay **chỉ dùng để báo cáo chất lượng** trong output, **KHÔNG dùng làm cổng chặn luồng**. Cổng chặn luồng duy nhất là mục 1 và mục 2 của file này.

## Xem thêm

- `.claude/rules/git-workflow.md` — cổng commit/merge
- `.claude/rules/confidence-level.md` — cách tính confidence để báo cáo
