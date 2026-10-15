# Các Framework Ưu Tiên (ba-backlog-prioritization)

## 1. MoSCoW Framework (Qualitative)

Sử dụng khi cần consensus nhanh với stakeholders, không cần đo lường chính xác bằng số.

- **M (Must have) — Bắt buộc phải có:**
  - Blockers: Không có item này → toàn bộ feature không hoạt động.
  - Regulatory: Bắt buộc tuân thủ pháp lý/compliance.
  - Core MVP: Minimum Viable Product không thể thiếu.
- **S (Should have) — Nên có:**
  - High business value NHƯNG không phải blocker.
  - Có workaround tạm chấp nhận được.
  - Competitor đã có.
- **C (Could have) — Có thì tốt:**
  - Nice-to-have, không ảnh hưởng đến MVP.
  - Low business value hoặc niche use case.
- **W (Won't have) — Không làm trong release này:**
  - Out of scope cho release hiện tại.
  - Quá phức tạp, cần research thêm.

## 2. WSJF Framework (Quantitative)

**Weighted Shortest Job First** — Ưu tiên dựa trên tỷ lệ:
`WSJF = Cost of Delay / Job Duration`
`Cost of Delay = Business Value + Time Criticality + Risk Reduction`

- **Business Value (1-10):** Giá trị cho business hoặc end-user.
- **Time Criticality (1-10):** Mức độ khẩn cấp (deadline, competitor pressure).
- **Risk Reduction (1-10):** Giảm thiểu risk (kỹ thuật, nghiệp vụ, compliance).
- **Job Duration (Story Points hoặc days):** Effort ước lượng.

*Insight:*
- Top items (WSJF > 3.0) → Must have, làm trước.
- Mid items (WSJF 2.5-3.0) → Should have.
- Low items (WSJF < 2.0) → Could/Won't, defer.

## 3. Hybrid Approach (Default)

Nếu user không chỉ định, hãy kết hợp cả hai:
1. Dùng **MoSCoW** trước để phân loại (Must/Should/Could/Won't) và loại bỏ nhanh các Could/Won't.
2. Dùng **WSJF** để chấm điểm (score) và xếp hạng (rank) chính xác các Must/Should items.

---
