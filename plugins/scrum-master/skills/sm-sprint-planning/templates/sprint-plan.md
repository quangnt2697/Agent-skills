# 📊 KẾ HOẠCH SPRINT
> **Sprint**: Sprint {N} ({sprint_start_date} → {sprint_end_date})
> **Ngày lập kế hoạch**: {today}
> **Trạng thái**: {Đang ở giữa Sprint hiện tại / Cuối Sprint – Chuẩn bị Sprint mới}

---

## 1. Thông tin Sprint

| Chỉ số              | Giá trị                                              |
|---------------------|------------------------------------------------------|
| Sprint hiện tại     | Sprint {current_N} ({current_start} → {current_end}) |
| Sprint tiếp theo    | Sprint {next_N} ({next_start} → {next_end})          |
| Độ dài Sprint       | {duration_days} ngày                                 |
| Ngày hôm nay        | {today}                                              |
| Vị trí trong Sprint | Ngày {day_X}/{duration_days}                         |

---

## 2. Carry-over từ Sprint hiện tại

> *Phần này chỉ xuất hiện khi đang ở cuối Sprint hoặc qua Sprint mới. Nếu đang ở giữa Sprint, ghi: "Không áp dụng – Sprint hiện tại đang diễn ra."*

| # | Ticket   | Tiêu đề   | Assignee   | Points   | Trạng thái hiện tại   | Lý do chưa hoàn thành   |
|---|----------|-----------|------------|----------|-----------------------|-------------------------|
| 1 | {KEY-1}  | {title}   | {assignee} | {pts}    | {status}              | {lý do}                 |

**Tổng carry-over**: {carry_over_count} ticket – {carry_over_points} points

---

## 3. Backlog sẵn sàng (Refined & Prioritized)

> Các ticket từ Backlog đã qua Refinement, sẵn sàng để kéo vào Sprint tiếp theo.

| # | Ticket   | Tiêu đề   | Priority          | Points   | Labels/Component   | Đề xuất Assignee   |
|---|----------|-----------|-------------------|----------|--------------------|--------------------|
| 1 | {KEY-2}  | {title}   | {High/Medium/Low} | {pts}    | {label}            | {tên}              |

**Tổng Backlog sẵn sàng**: {backlog_ready_count} ticket – {backlog_ready_points} points

---

## 4. Đề xuất Sprint Backlog cho Sprint {next_N}

### 🎯 Sprint Goal (Đề xuất)
> *{Mô tả mục tiêu chính của Sprint dựa trên các ticket được chọn}*

### Danh sách Ticket đề xuất

| # | Ticket   | Tiêu đề   | Priority   | Points   | Đề xuất Assignee   | Nguồn                |
|---|----------|-----------|------------|----------|--------------------|----------------------|
| 1 | {KEY-X}  | {title}   | {priority} | {pts}    | {tên}              | Carry-over / Backlog |

### Phân bổ theo Thành viên

| Thành viên       | Role              | Số ticket   | Tổng Points   |
|------------------|-------------------|-------------|---------------|
| Phan Hữu Thắng   | Developer APP     | {n}         | {pts}         |
| Lương Tuấn Linh  | Developer WEB     | {n}         | {pts}         |
| Trịnh Quốc Đạt   | Developer Backend | {n}         | {pts}         |
| Nguyễn Thành Sơn | Developer Backend | {n}         | {pts}         |

### Tổng hợp Capacity

| Chỉ số                                  | Giá trị                           |
|-----------------------------------------|-----------------------------------|
| Tổng Points đề xuất                     | {total_proposed_points}           |
| Carry-over Points                       | {carry_over_points}               |
| Backlog mới Points                      | {new_backlog_points}              |
| Velocity trung bình (3 Sprint gần nhất) | {avg_velocity} *(nếu có dữ liệu)* |

---

## 5. Rủi ro & Lưu ý

| # | Loại                 | Mô tả                                | Ảnh hưởng                | Đề xuất xử lý                                          |
|---|----------------------|--------------------------------------|--------------------------|--------------------------------------------------------|
| 1 | 🔴 Carry-over lớn    | {n} ticket chưa xong từ Sprint trước | Giảm capacity Sprint mới | Ưu tiên hoàn thành trước                               |
| 2 | 🟡 Thiếu requirement | Ticket {KEY} chưa có đủ AC           | Có thể block DEV         | Yêu cầu BA (Trịnh Thu Hà / Phạm Thị Thảo Linh) bổ sung |
| 3 | 🟡 Mất cân bằng tải  | {tên} có quá nhiều ticket            | Trễ deadline             | Chuyển bớt sang {tên_khác}                             |

---

## 6. Quyết định cần PO phê duyệt

> Các quyết định cần PO (**Nguyễn Trung Hiếu**) xác nhận trước khi chốt Sprint Backlog.

| # | Quyết định                                  | Lý do cần PO                       |
|---|---------------------------------------------|------------------------------------|
| 1 | {Có nên kéo ticket {KEY} vào Sprint không?} | {Priority chưa rõ ràng}            |
| 2 | {Sprint Goal có chính xác không?}           | {Cần align với business direction} |

---
*Kế hoạch được tạo tự động bởi Scrum Master Agent vào {timestamp}.*
