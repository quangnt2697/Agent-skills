# Confidence Level System

## Tổng quan

Mỗi skill output có **Confidence Level** (mức độ tin cậy) để agent/user đánh giá chất lượng output.

> **KHÔNG dùng Confidence Level làm cổng chặn luồng.** Việc dừng hay chạy tiếp do
> `.claude/rules/autonomy-contract.md` quyết định.

Confidence Level chỉ có **2 tác dụng**:
1. **Báo cáo chất lượng** — trong section `## 📊 Confidence Assessment` cuối mỗi artifact
2. **Ghi nhận rủi ro** — confidence thấp thì liệt kê gap vào mục *Giả định & Rủi ro*, rồi chạy tiếp

## Level Definitions

| Level | Range | Ý nghĩa | Hành động |
|-------|-------|---------|-----------|
| 🟢 **High** | 90-100% | Output hoàn chỉnh, đã verify đầy đủ | Chạy tiếp |
| 🟡 **Medium** | 70-89% | Output đầy đủ nhưng có gaps nhỏ | Chạy tiếp — ghi gap vào *Giả định & Rủi ro* |
| 🔴 **Low** | <70% | Output thiếu sót hoặc uncertain | Chạy tiếp — ghi cảnh báo rõ ở đầu output, đề xuất user review |

> Không mức nào tự nó chặn pipeline. Chỉ 5 trường hợp trong `autonomy-contract.md` mới được dừng luồng.

## Confidence Score Calculation

```python
confidence = (completeness * 0.6) + (certainty * 0.4)

# completeness: Đã làm xong bao nhiêu % công việc?
# certainty:    Agent chắc chắn bao nhiêu % output đúng?
```

## Output Format Standard

Tất cả skills **BẮT BUỘC** xuất confidence level ở cuối output:

```markdown
---

## 📊 Confidence Assessment

**Confidence Level:** 🟢 High (95%)

**Factors:**
- ✅ Factor 1: Mô tả (weight: 40%)
- ✅ Factor 2: Mô tả (weight: 30%)
- ⚠️ Factor 3: Mô tả (weight: 20%) — Minor gap
- ✅ Factor 4: Mô tả (weight: 10%)

**Blockers:** Không có
```

Chi tiết cách tính confidence cho từng skill nằm trong SKILL.md tương ứng (section *Verification*).
