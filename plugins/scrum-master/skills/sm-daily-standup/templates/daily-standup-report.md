# 📋 BÁO CÁO DAILY STANDUP - SPRINT {N} {today}
> **Sprint**: Sprint {N} ({sprint_start_date} → {sprint_end_date})
> **Ngày báo cáo**: {today}
> **Giờ báo cáo**: {report_time}
> **Ngày thứ**: {day_X}/{total_days} của Sprint

---

## 1. Tổng quan Sprint

| Chỉ số                    | Giá trị                                          |
|---------------------------|--------------------------------------------------|
| Tổng ticket trong Sprint  | {total_tickets}                                  |
| Hoàn thành (Done)         | {done_count} ({done_percent}%)                   |
| Đang xử lý (In Progress)  | {in_progress_count}                              |
| Chờ test (Ready to Test)  | {ready_to_test_count}                            |
| Chưa bắt đầu (Open/To Do) | {open_count}                                     |
| Tổng Story Points cam kết | {committed_points}                               |
| Story Points hoàn thành   | {completed_points} ({completed_points_percent}%) |

---

## 2. Chi tiết Ticket theo Trạng thái

### ✅ Done
| # | Ticket   | Tiêu đề  | Ưu tiên | Assignee   | Points   | Hoàn thành ngày   |
|---|----------|----------|---------|------------|----------|-------------------|
| 1 | {KEY-1}  | {title}  | {prio}  | {assignee} | {pts}    | {date}            |

### 🔄 In Progress
| # | Ticket   | Tiêu đề   | Ưu tiên | Assignee   | Points   | Thời gian ở trạng thái   | Cảnh báo          |
|---|----------|-----------|---------|------------|----------|--------------------------|-------------------|
| 1 | {KEY-2}  | {title}   | {prio}  | {assignee} | {pts}    | {X ngày}                 | {⚠️ nếu > 3 ngày} |

### 🧪 Ready to Test
| # | Ticket   | Tiêu đề   | Ưu tiên | Assignee   | Points  | Thời gian chờ test   | Cảnh báo          |
|---|----------|-----------|---------|------------|---------|----------------------|-------------------|
| 1 | {KEY-3}  | {title}   | {prio}  | {assignee} | {pts}   | {X ngày}             | {⚠️ nếu > 3 ngày} |

### 📝 Open / To Do
| # | Ticket   | Tiêu đề   | Ưu tiên | Assignee   | Points   | Thời gian ở Open   | Cảnh báo          |
|---|----------|-----------|---------|------------|----------|--------------------|-------------------|
| 1 | {KEY-4}  | {title}   | {prio}  | {assignee} | {pts}    | {X ngày}           | {⚠️ nếu > 3 ngày} |

---

## 3. 🚨 Cảnh báo Ticket bị treo

> Các ticket nằm ở một trạng thái quá **4 ngày** mà chưa chuyển tiếp.

| # | Ticket   | Tiêu đề   | Trạng thái hiện tại  | Ưu tiên | Assignee   | Thời gian bị treo   | Mức độ                        |
|---|----------|-----------|----------------------|---------|------------|---------------------|-------------------------------|
| 1 | {KEY-X}  | {title}   | {status}             | {prio}  | {assignee} | {X ngày}            | 🔴 Nghiêm trọng / 🟡 Cảnh báo |

---

## 4. ⚖️ Phân tích Cân bằng Tải (Workload Balancing)

### Phân bổ theo vai trò chuyên trách
| Thành viên      | Role          | Số ticket   | Tổng Points   | Ghi chú                           |
|-----------------|---------------|-------------|---------------|-----------------------------------|
| Phan Hữu Thắng  | Developer APP | {n}         | {pts}         | Chuyên trách APP – Không cân bằng |
| Lương Tuấn Linh | Developer WEB | {n}         | {pts}         | Chuyên trách WEB – Không cân bằng |

### 🔍 So sánh khối lượng Backend DEV (Trọng tâm cân bằng)
| Thành viên       | Số ticket          | Tổng Points     | % khối lượng         |
|------------------|--------------------|-----------------|----------------------|
| Trịnh Quốc Đạt   | {n}                | {pts}           | {percent}%           |
| Nguyễn Thành Sơn | {n}                | {pts}           | {percent}%           |
| **Chênh lệch**   | **{delta_ticket}** | **{delta_pts}** | **{delta_percent}%** |

### Kết luận Cân bằng Tải
> - ✅ **Cân bằng** (chênh lệch ≤ 20%): Phân bổ hợp lý, không cần điều chỉnh.
> - ⚠️ **Mất cân bằng** (chênh lệch > 20%): *Đề xuất chuyển ticket {KEY-Y} ({pts} pts) từ {người_quá_tải} sang {người_rảnh_hơn} để cân bằng khối lượng.*

---

## 5. Tổng kết & Đề xuất

{proposals}
