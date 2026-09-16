## Phân loại Các Ghi chú (Categorize Findings)

Dán nhãn cho mọi comment với mức độ nghiêm trọng (severity) để tác giả biết đâu là bắt buộc vs tùy chọn:

| Tiền tố (Prefix)              | Ý nghĩa                          | Hành động của Tác giả (Author Action)              |
|-------------------------------|----------------------------------|----------------------------------------------------|
| *(Không có tiền tố)*          | Bắt buộc phải thay đổi           | Bắt buộc phải sửa trước khi merge                  |
| **Critical:**                 | Chặn không cho merge             | Lỗ hổng bảo mật, mất data, tính năng hỏng          |
| **Nit:**                      | Lặt vặt, tùy chọn                | Tác giả có thể kệ (ignore) — format, style cá nhân |
| **Optional:** / **Consider:** | Gợi ý                            | Đáng để cân nhắc nhưng không bắt buộc              |
| **FYI**                       | Chỉ mang tính cung cấp thông tin | Không cần làm gì — chỉ để tham khảo sau này        |

## Checklist cho việc Đánh giá (Review Checklist)

```markdown
## Đánh giá Chất lượng Code: [Tên PR/Thay đổi]

### Góc nhìn (Persona) áp dụng: [Dev / QA]

### Bối cảnh (Context)
- [ ] Tôi hiểu thay đổi này làm gì và tại sao cần làm

### Các vấn đề Nghiêm trọng (Critical & Required)
- [Liệt kê các vấn đề bắt buộc phải sửa - Phân loại theo Trục Đánh giá]

### Đề xuất Cải thiện (Optional & Nit)
- [Liệt kê các gợi ý]

### Những Điểm Làm Tốt (What's Done Well)
- [Lời khen ngợi cụ thể]

### Phán quyết cuối cùng (Verdict)
- [ ] **Approve** — Đã sẵn sàng để Merge
- [ ] **Yêu cầu thay đổi (Request changes)** — Bắt buộc phải giải quyết các issues
```

## Output Format

Skill này **CHỈ REPORT findings**, KHÔNG tự động apply fixes. Output format:

```markdown
## 🔍 Code Review: [File/PR Name]

**Persona:** [Dev / QA]  
**Reviewed:** [File paths or PR #]

### ❌ Critical Issues (Must Fix)
1. **[File:Line]** [Category] — [Issue description]
   - **Impact:** [Consequences]
   - **Fix:** [Suggested solution]

### ⚠️ Required Changes
2. **[File:Line]** [Category] — [Issue description]
   - **Fix:** [Suggested solution]

### 💡 Optional Improvements
3. **Nit:** [File:Line] — [Suggestion]

### ✅ What's Done Well
- [Positive feedback]

### 📊 Verdict
- [ ] **Approve** — Ready to merge
- [x] **Request Changes** — Must address 2 critical + 3 required issues

---

**Next Steps:**
Bạn có muốn tôi tự động sửa các issues này không? 
→ Dùng `/dev-audit` để tự động fix (với approval gate)
```

**QUAN TRỌNG:**
- ❌ **KHÔNG** tự động apply fixes trong skill này
- ❌ **KHÔNG** show diff/code blocks với lời "copy vào file X"
- ✅ **CHỈ** report findings với suggested solutions
- ✅ **GỢI Ý** dùng `/dev-audit` nếu user muốn auto-fix

