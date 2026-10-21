# Quy trình Lập mô hình Quy trình (ba-process-modeling)

## Các loại Biểu đồ (Diagram Types)

1. **Flowchart (Simple):** Dùng cho quy trình tuyến tính, ít rẽ nhánh, 1-2 actors.
2. **Swim Lane Diagram:** Quy trình đa người dùng, nhấn mạnh việc giao tiếp (handoff) giữa các bên.
3. **BPMN-style:** Formal documentation với events, gateways, tasks chuẩn mực.

## Quy trình thực hiện

### Bước 1: Đọc Input
Đọc từ file Business-Spec (Section 5 - User Flow), file Gap Analysis (nếu có), hoặc mô tả text từ người dùng.

### Bước 2: Nhận diện Thành phần (Identify Components)
Xác định các yếu tố cốt lõi:
- **Actors (WHO):** Người/Hệ thống tham gia (Khách hàng, Broker, Sàn...).
- **Activities (WHAT):** Các bước công việc, kèm theo estimate thời gian.
- **Decision Points (IF/ELSE):** Các điểm rẽ nhánh.
- **Start/End Events:** Điểm khởi tạo và điểm kết thúc của quy trình.

### Bước 3: Chọn Loại Biểu đồ (Choose Diagram Type)
Dựa vào mức độ phức tạp (số lượng actors, decision points) để chọn loại biểu đồ phù hợp nhất.

### Bước 4: Vẽ Biểu đồ (Mermaid Syntax)
> **⚠️ TUÂN THỦ QUY TẮC VẼ SƠ ĐỒ (Rule 6 - AGENTS.md):**
> - Luôn khai báo engine ELK: `%%{init: {"flowchart": {"defaultRenderer": "elk"}, "elk": {"edgeRouting": "ORTHOGONAL", "mergeEdges": false, "nodePlacementStrategy": "BRANDES_KOEPF"}}}%%`
> - Sử dụng hướng `flowchart LR`.
> - Ký hiệu chuẩn: `([Stadium])` cho Start/End, `{Diamond}` cho Decision, `[Rectangle]` cho Task.
> - Hạn chế dùng `subgraph` nếu có thể thiết kế thẳng một hàng (Straight Spine).
> - Tất cả mũi tên từ Decision phải có Label (Pass / Fail).
> - Mũi tên vòng lặp quay lại phải dùng nét đứt `-.->` và phải viết **ở cuối file mã nguồn**.
> - Render trắng đen: `--bg '#ffffff' --fg '#000000'`

### Bước 5 & 6: Chú thích Pain Points và Vẽ TO-BE Diagram
- Gắn nhãn icon (⚠️ Lỗi, 🐢 Chậm, ⏱️ Thời gian, ✅ Cải tiến) trực tiếp vào text node.
- Vẽ sơ đồ AS-IS với các Pain Points. Vẽ sơ đồ TO-BE với các điểm Improvements.

### Bước 7: So sánh AS-IS vs TO-BE
Lập bảng so sánh (Total Time, Manual Steps, Error Rate) để minh họa rõ sự khác biệt.

## Đầu ra (Output)

### Format: Process Modeling Document

Lưu báo cáo vào:
- AS-IS: `workspace/issues/{issueKey}/spec/process-as-is.md`
- TO-BE: `workspace/issues/{issueKey}/spec/process-to-be.md`

Trước khi lưu file, neo về gốc dự án và tạo thư mục đích:
```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p workspace/issues/{issueKey}/spec
```

**Quan trọng**: Sau khi tạo file sơ đồ Editorial HTML/SVG, BẮT BUỘC gọi lệnh xuất ảnh chuẩn Full HD qua script `ba-design-flowchart`:
```bash
python3 ${AGENT_SKILLS_HOME:-.}/plugins/ba-po/skills/ba-design-flowchart/assets/export.py <file_diagram_html> --both 2.0
```
*(Script tự động xuất cả `.png` siêu nét chuẩn Full HD và `.svg` vector độc lập không lỗi font)*.

## Các Dấu hiệu Cảnh báo (Red Flags)
❌ **Biểu đồ quá phức tạp (> 20 nodes):** Cần chia nhỏ thành các sub-processes.
❌ **Không có actors rõ ràng:** Nếu có nhiều bên tham gia, phải dùng Swim Lane.
❌ **Không chú thích Pain Points (AS-IS):** Sẽ không thấy được cải tiến ở TO-BE.
❌ **TO-BE không có metrics:** Không chứng minh được sự tối ưu.
❌ **Không đồng nhất với text:** Biểu đồ vẽ một đằng, mô tả text một nẻo.

## Anti-patterns (Tránh)
1. **Chỉ vẽ hình, không giải thích:** Sơ đồ phải đi kèm bảng thống kê và mô tả Text.
2. **Copy template mù quáng:** Phải vẽ chính xác theo quy trình thực tế.
3. **Bỏ qua Decision Points:** Biến một luồng rẽ nhánh thành một đường thẳng tuyến tính.
4. **Không Validate:** Không họp review sơ đồ với stakeholders.

## Verification Checklist
- [ ] Đã identify tất cả Actors, Activities, Decision Points.
- [ ] Đã khai báo engine ELK và chuẩn hoá theo Rule 6.
- [ ] Mũi tên rẽ nhánh có Label; mũi tên quay lại là nét đứt và nằm ở cuối file.
- [ ] Render thành công không báo lỗi cú pháp.
- [ ] Sơ đồ không vượt quá 20 nodes (nếu lớn hơn đã chia nhỏ).
- [ ] Pain points / Cải tiến đã được highlight bằng emoji trực tiếp trên node.

---
