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

{workload_balancing_section}

---

## 5. Tổng kết & Đề xuất

{proposals}
