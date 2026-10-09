# Quick-Start Checklist — qa-test-design

> **Mục đích:** Tờ nhắc cực ngắn. Đọc trước khi bắt đầu thiết kế test.
> Xem chi tiết kỹ thuật tại `references/workflow.md` và `references/qa-testing-checklist.md` khi cần.

---

## ⚠️ RANH GIỚI NHIỆM VỤ — Chỉ thiết kế artifacts, KHÔNG viết code test

| ✅ LÀM | ❌ KHÔNG LÀM |
|---|---|
| Thiết kế checklist.md + .feature | Viết conftest.py, test_*.py, services/ |
| Chạy qa-validate.sh (cú pháp Gherkin) | Chạy test thực sự hoặc debug hệ thống |
| Bàn giao cho qa-auto-design | Tự động push Squash TM (→ dùng qa-squash-push) |

---

## BƯỚC 0 — Kiểm Tra Đầu Vào (30 giây)

```bash
# Kiểm tra spec đã tồn tại chưa
ls workspace/{issueKey}/spec/final.md
```

Nếu chưa có spec → Dừng, yêu cầu dùng `ba-spec` hoặc `ba-interview-me` trước.

---

## BƯỚC 1 — Khởi Tạo Thư Mục (tự động)

```bash
bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-test-design/assets/qa-init.sh {issueKey}
```

Tạo sẵn: `workspace/{issueKey}/test/steps/` và `workspace/{issueKey}/test/result/`

---

## BƯỚC 2 — Đọc Spec & Nhận Diện Domain

- Đọc `workspace/{issueKey}/spec/final.md`
- Nếu domain **chứng khoán/fintech** → đọc thêm `references/securities-domain-rules.md`
- Xác định loại task:

| Spec mô tả gì? | Kỹ thuật áp dụng |
|---|---|
| Giới hạn số, khối lượng, giá | BVA 3 giá trị (dưới/tại/trên biên) |
| Phân loại đầu vào (loại tài khoản, loại lệnh) | Equivalence Partitioning (EP) |
| Luồng nghiệp vụ nhiều bước | State Transition Testing |
| Quy tắc kết hợp (VD: tier × quota) | Decision Table |

---

## BƯỚC 3 — Thiết Kế `checklist.md`

Phân bổ vào **6 chiều** (mỗi item: động từ hành động + lượng hóa + nhãn P0/P1/P2):

```markdown
## Bảo mật [P0]
- [P0] Xác minh hệ thống từ chối khi thiếu header xác thực

## Quy tắc nghiệp vụ [P0]
- [P0] Xác minh <rule cụ thể từ spec>

## Toàn vẹn dữ liệu [P1]
- [P1] Xác minh response schema đúng cấu trúc JSON định nghĩa

## Đường dẫn chuẩn (Happy Path) [P0]
- [P0] Xác minh <luồng chính thành công>

## Ngoại lệ & Lỗi [P1]
- [P1] Xác minh <xử lý lỗi cụ thể>

## Ranh giới BVA [P0/P1]
- [P0] Xác minh tại biên trên (TAI_HAN_MUC): <giá trị>
- [P0] Xác minh vượt biên trên (VUOT_HAN_MUC): <giá trị>
- [P1] Xác minh dưới biên trên (DUOI_HAN_MUC): <giá trị>
```

---

## BƯỚC 3.5 — Data Grounding

- Xác định các loại **(a) Dữ liệu định danh/precondition** cần thiết (account, symbol, orderId...).
- Truy vấn lấy giá trị thật từ UAT theo chuỗi ưu tiên (n8n `getSecuritiesFixture`, Metabase SQL `metabaseRunSql`, API GET).
- Zero-mutation: TUYỆT ĐỐI không gọi các lệnh thay đổi dữ liệu (POST, UPDATE, DELETE).
- Lưu kết quả vào `workspace/{issueKey}/test/fixtures/data-grounding.json`.
- Ghi chú: Nếu timeout/lỗi, chuyển sang fallback và nhớ gắn nhãn `[DATA-ASSUMED]` khi viết Gherkin ở Bước 4.

---

## BƯỚC 4 — Viết `{issueKey}.feature`

**Quy tắc cứng khi viết Gherkin:**

- [ ] Đúng 1 khối `Feature:` duy nhất per file
- [ ] Feature có 3 dòng User Story (`As a / I want / So that`)
- [ ] Mỗi Scenario có tags trước dòng `Scenario:`
- [ ] Tags bắt buộc: `@JIRA-{issueKey}` + 1 trong `@smoke/@regression` + 1 trong `@happy-path/@negative/@edge-case`
- [ ] Không có từ kỹ thuật: `xpath`, `css`, `SQL`, `url`, `.env`, `os.getenv`
- [ ] Dùng ranh giới tượng trưng: `"VUOT_HAN_MUC"` không phải `"500001"`
- [ ] Không quá 10 steps / Scenario
- [ ] Không lặp chu kỳ Given → When → Then → **Given** (vi phạm GWT order)

Tham khảo mẫu theo task type: [gherkin-patterns.md](gherkin-patterns.md)

---

## BƯỚC 5 — Xác Minh Cú Pháp & Bàn Giao

```bash
bash ${AGENT_SKILLS_HOME:-.}/plugins/qa/skills/qa-test-design/assets/qa-validate.sh \
  "workspace/{issueKey}/test/{issueKey}.feature"
```

✅ **`"status": "pass"`** → Gợi ý chạy `/qa-auto-design {issueKey}`
❌ **`"status": "fail"`** → Đọc `failures[]`, tự sửa, chạy lại (tối đa 3 vòng)
