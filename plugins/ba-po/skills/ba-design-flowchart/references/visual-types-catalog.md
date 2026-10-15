# Danh Mục 41 Loại Sơ Đồ Trực Quan & Semantic Patterns (Visual Types Catalog)

Tài liệu tham chiếu chi tiết cho kỹ năng `ba-design-flowchart`.

## 1. Hướng Dẫn Chọn Semantic Pattern
Khi hành vi, trạng thái, cơ chế kiểm soát hoặc rủi ro mang ý nghĩa chính, chọn Semantic Pattern trước khi chọn visual type cho layout:

| Behavioral trigger | Semantic pattern → nearest type |
|---|---|
| Fan-in, queue depth, finite capacity, bottleneck | **Fan-in queue / bottleneck** → Data flow |
| Repeated Question / Input / Governance / Output slots across stages | **Stage framework with semantic slots** → Process |
| Conversation or loose input becomes a structured durable artifact | **Unstructured input → structured artifact** → Data flow |
| Two rule traces need pass/fail/skipped/not-reached and first divergence | **Paired policy-evaluation traces** → Flowchart |
| Trust boundaries plus permitted/forbidden ingress or deploy paths | **Secure paved road** → Architecture |
| Controls grouped by where they are enforced | **Governance / control catalog** → Layer stack |
| Defenses compensate for prior gaps and residual risk propagates | **Compensating security layers** → Layer stack |
| Hierarchical, ID-addressable decomposition needing per-block I/O, constraints, and a code link | **Traceable block decomposition** → Tree |
| One subject progresses through phases, waits, retries, cancellation, and terminal outcomes | **Lifecycle phase map** → State Machine |

---

## 2. Danh Mục 41 Loại Sơ Đồ Trực Quan (Visual Types)

| Nhu cầu biểu diễn | Loại sơ đồ | Tài liệu chi tiết |
|---|---|---|
| Thành phần + kết nối hệ thống | **Architecture** | [type-architecture.md](type-architecture.md) |
| Hiện trạng hệ thống IT cũ (before state) | **IT current-state** | [type-it-state.md](type-it-state.md) |
| Logic rẽ nhánh & quyết định | **Flowchart** | [type-flowchart.md](type-flowchart.md) |
| Tương tác giữa các đối tượng theo thời gian | **Sequence** | [type-sequence.md](type-sequence.md) |
| Trạng thái + chuyển trạng thái (State Machine) | **State machine** | [type-state.md](type-state.md) |
| Thực thể + quan hệ dữ liệu (ERD) | **ER / data model** | [type-er.md](type-er.md) |
| Sự kiện theo mốc thời gian | **Timeline** | [type-timeline.md](type-timeline.md) |
| Quy trình liên phòng ban (Handoffs) | **Swimlane** | [type-swimlane.md](type-swimlane.md) |
| Phân loại ưu tiên trên ma trận 2 trục | **Quadrant** | [type-quadrant.md](type-quadrant.md) |
| Đánh giá đối tượng qua 3–5 tiêu chí định lượng | **Radar / Spider** | [type-radar.md](type-radar.md) |
| Chu kỳ lặp; bước cuối nuôi dưỡng hub trung tâm | **Loop** | [type-loop.md](type-loop.md) |
| Cấu trúc thứ bậc theo phạm vi chứa | **Nested** | [type-nested.md](type-nested.md) |
| Quan hệ cha - con phân cấp | **Tree** | [type-tree.md](type-tree.md) |
| Sơ đồ tổ chức, báo cáo & leo thang quyền hạn | **Org chart** | [type-org-chart.md](type-org-chart.md) |
| Các tầng trừu tượng xếp chồng | **Layer stack** | [type-layers.md](type-layers.md) |
| Tập hợp giao thoa | **Venn** | [type-venn.md](type-venn.md) |
| Phễu chuyển đổi hoặc cấp bậc thứ hạng | **Pyramid / funnel** | [type-pyramid.md](type-pyramid.md) |
| So sánh định lượng giữa các danh mục | **Bar chart** | [type-bar.md](type-bar.md) |
| Biến động từ điểm đầu đến điểm cuối (ngân sách, nhân sự) | **Waterfall** | [type-waterfall.md](type-waterfall.md) |
| Tỷ trọng đóng góp thành phần (Part-of-whole) | **Treemap** | [type-treemap.md](type-treemap.md) |
| Phân bố mật độ theo ô lưới | **Heatmap** | [type-heatmap.md](type-heatmap.md) |
| Xu hướng liên tục theo thời gian | **Line chart** | [type-line.md](type-line.md) |
| Tiến độ công việc trên dòng thời gian | **Gantt** | [type-gantt.md](type-gantt.md) |
| Tương quan phân tán 2 biến (Bubble/Beeswarm) | **Scatter plot** | [type-scatter.md](type-scatter.md) |
| Toàn cảnh nền tảng dữ liệu trên cụm container | **High-Level** | [type-high-level.md](type-high-level.md) |
| Quy trình tuần tự nhiều tác nhân có luân chuyển dữ liệu | **Process** | [type-process.md](type-process.md) |
| Phân tầng lưu trữ dữ liệu (Bronze / Silver / Gold) | **Medallion** | [type-medallion.md](type-medallion.md) |
| Luồng dữ liệu theo vai trò xử lý | **Data flow** | [type-data-flow.md](type-data-flow.md) |
| Cấu trúc tích hợp nền tảng dữ liệu (Source → Core → Consumer) | **DP integration** | [type-dp-integration.md](type-dp-integration.md) |
| Ma trận quyền truy cập theo vai trò/thành phần | **DP security matrix** | [type-dp-security-matrix.md](type-dp-security-matrix.md) |
| Dòng chảy chia tách và hội tụ với độ rộng tương ứng giá trị | **Sankey** | [type-sankey.md](type-sankey.md) |
| Phân tích nguyên nhân gốc rễ (Ishikawa) | **Fishbone** | [type-fishbone.md](type-fishbone.md) |
| Bản đồ chuỗi giá trị và độ trưởng thành công nghệ | **Wardley map** | [type-wardley.md](type-wardley.md) |
| Tiến độ công việc kèm giới hạn WIP | **Kanban** | [type-kanban.md](type-kanban.md) |
| Trải nghiệm và cảm xúc của người dùng qua các giai đoạn | **User journey** | [type-journey.md](type-journey.md) |
| Hạ tầng triển khai phần mềm (Zone, Host, Replica, Port) | **Deployment** | [type-deployment.md](type-deployment.md) |
| Mạng lưới phụ thuộc giữa các module | **Dependency graph** | [type-dependency.md](type-dependency.md) |
| Lớp đối tượng, phương thức, kế thừa (UML) | **UML class** | [type-uml-class.md](type-uml-class.md) |
| Xương sống tính năng phân lát theo từng bản phát hành | **Story map** | [type-story-map.md](type-story-map.md) |
| Cấu trúc bảng CSDL vật lý (Khóa chính, Ngoại, Index) | **Database schema** | [type-db-schema.md](type-db-schema.md) |

---

## 3. Các Phản Mẫu Trực Quan Tuyệt Đối Tránh (Anti-patterns)

1. **Dark mode + cyan/purple glow neon:** Nhìn có vẻ "kỹ thuật" nhưng gây rối mắt và che lấp thông điệp.
2. **Font JetBrains Mono bừa bãi:** Mono chỉ dành cho nội dung kỹ thuật (port, URL, command). Nhãn tên dùng Geist Sans hoặc Helvetica.
3. **Các hộp giống hệt nhau:** Làm mất thứ bậc phân cấp thông tin.
4. **Chú thích (Legend) thả nổi đè lên node sơ đồ:** Gây va chạm bố cục.
5. **Nhãn mũi tên không có nền che (Masking Rect):** Chữ bị đè lên đường kẻ.
6. **Chữ xoay dọc (`writing-mode: vertical`):** Rất khó đọc.
