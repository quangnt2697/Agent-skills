# Autonomy Contract — Khi nào agent được tự quyết, khi nào phải dừng

## Nguyên tắc

Mặc định của hệ thống là **DỪNG SAU MỖI ARTIFACT (Single-Task Hard Stop)**. Mỗi lệnh hoặc skill độc lập chỉ thực hiện đúng phạm vi của nó, ghi artifact mục tiêu rồi **DỪNG LẠI NGAY** tại `Single Next Action`.

Chuỗi tự động chuyển tiếp (Phase Gates) **CHỈ ÁP DỤNG** khi người dùng gọi đích danh một lệnh điều phối (Orchestrator như `/qa-full-pipeline`, `/e2e-qa-delivery`) hoặc khi truyền cờ `--auto`.

Rule này là nguồn sự thật duy nhất cho việc dừng/chạy tiếp. Khi bất kỳ SKILL.md, tài liệu hay command nào mâu thuẫn với rule này, **rule này thắng**.

---

## 1. Cổng chuyển phase (Phase Gate — Chỉ trong Orchestrator)

Khi đang chạy bên trong một **Orchestrator** (hoặc lệnh có cờ `--auto`), agent tự động chuyển sang phase tiếp theo **NGAY LẬP TỨC** khi tất cả các điều kiện sau được kiểm chứng bằng lệnh thật (exit code = 0):

- [ ] File output của phase hiện tại tồn tại và không rỗng.
- [ ] Script validate của phase (nếu có) exit code = 0.
- [ ] Số lượng artifact downstream ≥ số lượng artifact upstream bắt buộc (VD: số Gherkin scenario ≥ số checklist item P0).
- [ ] Không có item nào được gắn nhãn `[Blocked]`.

Nếu tất cả đúng → chạy tiếp phase kế tiếp của pipeline, chỉ log một dòng ngắn:

```
[AUTO] Phase 2 → Phase 3 (checklist: 45 items, gherkin: 28 scenarios, validate: exit 0)
```

Nếu có điều kiện sai → xem mục 2 để biết đó có phải lý do được dừng không. Nếu không thuộc mục 2, áp dụng giới hạn ở mục 3 (Bảng Self-Fix) — vượt quá giới hạn phải **DỪNG và báo cáo sự thật**, tuyệt đối không chạy vòng lặp vô tận.

---

## 2. Danh sách đóng — 5 trường hợp DUY NHẤT được dừng hỏi user

Dù trong chế độ Orchestrator hay lệnh đơn lẻ, Agent chỉ được dừng luồng để hỏi khi rơi vào đúng một trong 5 trường hợp sau:

| # | Trường hợp | Ví dụ |
|---|---|---|
| 1 | **Thiếu file input bắt buộc** mà agent không thể tự tạo | `{issueKey}-final.md` không tồn tại → hướng dẫn chạy `/ba-spec` trước |
| 2 | **Thiếu credential / secret** không thể tự lấy | `.env` không tồn tại, hoặc thiếu `ATLASSIAN_API_TOKEN` |
| 3 | **Có ≥1 câu hỏi 🔴 Critical** trong gap analysis — câu trả lời làm thay đổi bản chất output | Spec không nói rõ lệnh LO hay MP → toàn bộ business rule khác nhau |
| 4 | **Sắp commit hoặc merge vào `main`** | Theo `git-workflow.md` — đây là cổng người duy nhất của luồng code |
| 5 | **Hành động không thể hoàn tác bằng `git revert`** | Xoá data, deploy, thanh toán, đổi quyền/auth, `git push --force`, `git reset --hard` xoá code dở dang |

> **Ghi chú (ba-spec & ba-refine):** Gate 1 ("Hiển thị bảng tài liệu chờ user duyệt") và Gate 2 ("Chờ OK trước khi sinh spec / push Jira") là các instance hợp lệ của **trường hợp #3 và #5**. Không phải ngoại lệ đặc biệt.

---

## 3. Bảng Quy Chuẩn Tự Sửa Lỗi (Single Source of Truth cho Self-Fix)

Agent chỉ được phép tự sửa lỗi trong phạm vi cực kỳ hạn chế sau đây:

| Hạng mục | Cho phép tự sửa? | Giới hạn & Điều kiện |
|---|:---:|---|
| **Lỗi cú pháp `.feature`** sau khi chạy `qa-validate.sh` | ✅ | **Tối đa 1 vòng duy nhất**; chỉ sửa định dạng Gherkin, KHÔNG được làm thay đổi ý nghĩa nghiệp vụ |
| **Lỗi cú pháp/import trong `test/steps/*.py`** do chính `qa-auto-design` vừa sinh | ✅ | **Tối đa 1 vòng duy nhất**; chỉ sửa import/syntax test code, CẤM đổi assertion hay giá trị kỳ vọng |
| **Test FAIL / Assertion Error / Timeout** | ❌ | **DỪNG NGAY**; ghi log nguyên văn vào `test-output.log`, báo cáo phân loại lỗi và đề xuất skill tiếp theo |
| **Thiếu thư viện/package (`ModuleNotFoundError`, npm...)** | ❌ | **DỪNG NGAY**; CẤM tự ý chạy `pip install`, `npm install` hoặc sửa `requirements.txt`/`package.json` |
| **Thiếu biến môi trường `.env`** | ❌ | **DỪNG NGAY**; báo rõ tên biến thiếu theo trường hợp #2 của danh sách đóng |
| **Validator báo lỗi Spec (thiếu mục, tag...)** | ❌ | **CẤM TỰ SỬA SPEC**; dừng lại báo mã lỗi cho user quyết định (hoặc dùng `--force` nếu user yêu cầu) |
| **Lỗi mã nguồn ứng dụng (`src/`, `app/`)** | ❌ | **CẤM TỰ SỬA CODE APP**; ghi nhận bug, trích dẫn cURL/log và bàn giao cho DEV |

---

## 4. Những thứ TUYỆT ĐỐI KHÔNG được coi là lý do dừng

| ❌ Lý do không hợp lệ | ✅ Việc phải làm thay thế |
|---|---|
| "Confidence chỉ 78%, có nên tiếp không?" | Chạy tiếp (trong orchestrator) hoặc dừng xuất artifact (lệnh đơn). Ghi gap vào mục *Giả định & Rủi ro* |
| "Checklist đã đầy đủ chưa? Có cần sửa gì không?" | Tự kiểm tra bằng cổng ở mục 1; nếu lệnh đơn: xuất checklist và DỪNG; nếu orchestrator: chuyển phase |
| "Bạn có muốn tôi apply fix này không?" | Trong phạm vi được cấp phép (Tier 3), apply luôn bằng tool Edit. Không bao giờ in code block bảo user tự dán |
| "File đã tồn tại, có ghi đè không?" | Ghi đè vào đúng vị trí artifact của ticket. File cũ đã nằm trong git history |
| "Có 2 cách làm, bạn chọn cách nào?" | Chọn cách đơn giản hơn, ghi lý do vào output. Chỉ hỏi nếu rơi vào mục 2.3 |

---

## 5. Cách xác định Auto Mode

Agent **chỉ** được dùng những tín hiệu đọc được bằng mắt hoặc bằng lệnh. Không dùng biến môi trường nội suy hay runtime ẩn:

```
Auto Mode = TẮT (Mặc định cho mọi lệnh độc lập như /ba-spec, /qa-test-design, /qa-auto-design, /sync...)

Auto Mode = BẬT CHỈ KHI:
  1. Người dùng gọi lệnh Orchestrator: /qa-full-pipeline, /e2e-qa-delivery
  2. HOẶC chuỗi $ARGUMENTS chứa cờ "--auto"

Chế độ cưỡng chế dừng từng bước (--step):
  - Chuỗi $ARGUMENTS chứa "--step" hoặc "--manual"
  - HOẶC workspace/issues/{issueKey}/.pipeline-state.json có "autoMode": false
  -> Dừng sau mỗi phase trong pipeline chờ user review.
```

---

## 6. Định dạng khi buộc phải dừng

Khi rơi vào mục 2, dừng đúng một lần, nêu rõ trường hợp nào và cần gì để chạy tiếp:

```markdown
⛔ **DỪNG** — Trường hợp 2 (thiếu credential)

**Thiếu:** biến `ATLASSIAN_API_TOKEN` trong `.env`
**Cần bạn làm:** thêm biến này vào `.env`
**Sau khi xong:** chạy lại lệnh ban đầu để tiếp tục
```

---

## 7. Ranh giới Quyền hạn Thực thi (Scope Containment & Permission Tiers)

Mỗi lệnh và skill trong hệ thống được phân định rõ ràng theo 4 Cấp Quyền Hạn (Permission Tiers). Agent TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP vượt cấp quyền này khi thực thi:

1. **Cấp 1: READ-ONLY (Chỉ đọc & Lập báo cáo):**
   - Áp dụng cho: `cr-review`, `security-audit`, `webperf-audit`, `db-recon`, `ba-gap-analysis`.
   - **Luật Thép:** Agent CHỈ ĐƯỢC PHÉP đọc mã nguồn, đọc diff, chạy query đọc dữ liệu (SELECT only). TUYỆT ĐỐI CẤM gọi tool sửa đổi file mã nguồn dự án (`src/`, `app/`, `tests/`) hoặc chạy DML/DDL. Mọi báo cáo bắt buộc ghi vào `workspace/.../trace/`.

2. **Cấp 2: ARTIFACT-ONLY (Chỉ tạo/sửa Artifact trong Workspace Ticket):**
   - Áp dụng cho: `ba-spec`, `ba-refine`, `ba-interview`, `ba-user-stories`, `ba-prioritize`, `ba-process`, `flowchart`, `qa-test-design`, `qa-code2spec`, `sm-*`, `meta-*`.
   - **Luật Thép:** Agent CHỈ ĐƯỢC PHÉP tạo hoặc chỉnh sửa các file đặc tả, checklist, kịch bản test nằm trong `workspace/issues/{issueKey}/` (hoặc `workspace/adhoc/`, `workspace/sprints/`). CẤM can thiệp vào mã nguồn ứng dụng hay tự ý thay đổi dữ liệu bên ngoài.

3. **Cấp 2b: EXTERNAL-WRITE (Đồng bộ ra ngoài có kiểm soát):**
   - Áp dụng cho: `sync` (`repo-group-sync`), `ba-push-jira`, `qa-squash-push`.
   - **Luật Thép:** Chỉ thực hiện thao tác đồng bộ khi người dùng chỉ định rõ. Mặc định an toàn: không ghi đè mất uncommitted changes. Các hành vi xoá/reset không thể hoàn tác (`--force` reset trong repo-sync, xoá test case cũ trên Squash) BẮT BUỘC phải có cờ chỉ định rõ từ người dùng hoặc hỏi xác nhận trước.

4. **Cấp 3: MUTATION & PIPELINE (Được sửa mã nguồn theo phạm vi hẹp):**
   - Áp dụng cho: `qa-auto-design` (chỉ trong `test/`), `cr-code-simplify` (chỉ refactor vùng code được chỉ định, cấm làm drift logic), `qa-full-pipeline`, `e2e-qa-delivery`.
   - **Luật Thép:** Mọi hành vi sửa code phải có bằng chứng kiểm thử xác minh (test pass) trước khi bàn giao.

5. **Khóa Đơn Nhiệm & Điểm Dừng Bắt Buộc (Single-Task Lock & Hard Stop):**
   - Khi một lệnh độc lập hoàn thành sinh artifact mục tiêu (ví dụ: `qa-test-design` sinh xong `checklist.md` và `.feature`), Agent **BẮT BUỘC DỪNG LẠI** tại `Single Next Action`.
   - **CẤM TUYỆT ĐỐI** tự ý kích hoạt lệnh downstream tiếp theo (ví dụ: cấm tự chạy tiếp sang `qa-auto-design`). Mọi gợi ý bước tiếp theo chỉ được viết dưới dạng văn bản tư vấn cho người dùng.

---

## Xem thêm

- `.agents/rules/git-workflow.md` — cổng commit/merge
- `.agents/rules/confidence-level.md` — cách tính confidence để báo cáo
