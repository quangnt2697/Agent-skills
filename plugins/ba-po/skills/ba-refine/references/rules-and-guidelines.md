# Quy tắc và Hướng dẫn (ba-refine)

Tài liệu này chứa các quy tắc, cấu hình và danh sách kiểm tra (checklist) phục vụ cho kỹ năng `ba-refine`. Bắt buộc tham chiếu khi thực thi phân tích.

> 📖 **Quy tắc Chung về Xác thực, Cấu trúc Thư mục & Bộ lọc File:**
> Xem chi tiết tại [../../../../references/atlassian-rules.md](../../../../references/atlassian-rules.md) về cấu hình `.env`, biến `ATLASSIAN_*`, cấu trúc thư mục `workspace/issues/{issueKey}/` và bộ lọc định dạng file.

---

## 4. Chiến lược Truy cập Jira/Confluence

> **Tham chiếu đầy đủ:** `../../../../../docs/architecture/n8n-integration-strategy.md`

Skill này tương tác với Jira/Confluence qua **n8n Fast-Path**:

- **n8n Fast-Path Webhook:** Sử dụng `scripts/lib/n8n-client.js` để đẩy spec (`pushSpecToJira`) hoặc lấy context (`prepJiraContext`).
- **Nếu n8n offline:** Báo người dùng khởi động n8n bằng `npm run n8n` và **DỪNG** (không fallback).


## 5. Triết lý (Philosophy)

- **Simplicity wins:** Đơn giản là đỉnh cao của tinh tế. Đẩy về phiên bản đơn giản nhất có thể mà vẫn giải quyết được vấn đề cốt lõi.
- **User-first, tech-second:** Bắt đầu từ trải nghiệm người dùng, sau đó mới suy ngược về công nghệ.
- **Focus beats breadth:** Dám nói KHÔNG với 1,000 thứ khác. Tập trung luôn chiến thắng dàn trải.
- **Challenge everything:** Thách thức MỌI giả định. "Xưa nay vẫn làm thế" KHÔNG phải lý do hợp lệ.
- **Show the future:** Cho người ta thấy tương lai, không chỉ cải tiến nhỏ.

## 6. Anti-patterns (Tránh)

- ❌ **Đẻ 20+ variations hời hợt** — 5-8 variations có chiều sâu >> 20 bullet points
- ❌ **Yes-machine** — Phản bác ý tưởng yếu bằng lý lẽ cụ thể và tử tế
- ❌ **Skip "Dành cho Ai"** — Mọi ý tưởng vĩ đại bắt đầu từ User thật và Nỗi đau thật
- ❌ **Không vạch trần Assumptions** — Untested assumptions giết chết ý tưởng
- ❌ **Over-engineer** — 4 phase, mỗi phase làm TỐT 1 VIỆC
- ❌ **Chỉ liệt kê, không kể chuyện** — Mỗi variation phải có rationale
- ❌ **Bỏ qua codebase** — Existing architecture vừa là constraint, vừa là launchpad

## 7. Red Flags

- Download Jira thất bại hoặc credentials sai
- Không làm rõ được core components (≥90% confidence)
- Không đẻ ra được 5-8 variations khác biệt
- Không stress-test các hướng đi
- Không surface hidden assumptions
- Push lên Jira mà chưa có user approval
- Spec thiếu UI Design/Mockup (đối với task liên quan giao diện), Success Metrics, hoặc Acceptance Criteria
- Ignore constraints của codebase hiện tại
- Nhảy cóc sang Phase 4 mà không chạy Phase 1-3
- **Không show nội dung draft cho user trước khi chốt (Bước 3.2 bị bỏ qua)**
- **Chuyển sang Phase 4 khi user chưa nói "OK/Đồng ý" ở Bước 3.2**
- **Lưu refined.md mà không qua vòng review draft với user**

## 8. Verification Checklist

Sau khi chạy xong ba-refine session:

- [ ] **Phase 0:** Jira task downloaded, metadata parsed
- [ ] **Phase 1:** HMW statement rõ ràng, core components clarified (≥90%), 5-8 variations có rationale
- [ ] **Phase 2:** 2-3 hướng đi khác biệt, stress-test đầy đủ, assumptions documented
- [ ] **Phase 3 — Bước 3.1:** Draft file (`refined-draft.md`) created với đủ sections
- [ ] **Phase 3 — Bước 3.2:** Toàn bộ nội dung draft đã show cho user, user đã review và nói "OK/Đồng ý"
- [ ] **Phase 3 — Bước 3.3:** Draft đã chốt thành `refined.md`, user đã đồng ý push Jira
- [ ] **Phase 4:** Jira description updated (KHÔNG comment, KHÔNG label), push log created
- [ ] **Confidence:** ≥90% để đủ điều kiện handoff to QA/DEV
- [ ] **User approval:** User đã duyệt nội dung spec (Phase 3) VÀ approve push to Jira (trước Phase 4)

---
