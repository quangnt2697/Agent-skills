---
name: dev-planning-and-task-breakdown
description: Chia nhỏ công việc thành các task theo thứ tự.
trigger: Sử dụng khi bạn có một đặc tả (spec) hoặc yêu cầu rõ ràng và cần chia công việc thành các task có thể thực thi được. Sử dụng khi một task có vẻ quá lớn để bắt đầu, khi bạn cần ước lượng khối lượng công việc, hoặc khi có thể làm việc song song.
---

# Lên Kế hoạch và Chia nhỏ Task

## Tổng quan

Phân rã công việc thành các task nhỏ, có thể xác minh được (verifiable) với các tiêu chí nghiệm thu (acceptance criteria) rõ ràng. Kỹ năng chia nhỏ task tốt chính là ranh giới phân biệt giữa một agent hoàn thành công việc ổn định, đáng tin cậy với một agent tạo ra một mớ bòng bong. Mỗi task phải đủ nhỏ để có thể implement, test, và verify (xác minh) trong một phiên làm việc tập trung duy nhất.

## Khi nào sử dụng

- Bạn có một bản spec và cần chia nó thành các đơn vị có thể code được
- Một task cho cảm giác quá khổng lồ hoặc quá mơ hồ để bắt đầu
- Công việc cần được làm song song (parallelized) qua nhiều agents hoặc nhiều phiên làm việc
- Bạn cần truyền đạt quy mô công việc (scope) cho một con người hiểu
- Thứ tự implement không được rõ ràng cho lắm

**Khi KHÔNG sử dụng:** Những thay đổi chỉ diễn ra trên 1 file duy nhất với phạm vi rõ ràng, hoặc khi bản spec vốn đã vạch sẵn các task rất chi tiết rồi.

## Quy trình Lên kế hoạch & Hướng dẫn

> 📖 **BẮT BUỘC ĐỌC:** Xem chi tiết 5 bước lên kế hoạch, cách phân rã task (Dependency Graph, Vertical Slicing), và Template Kế hoạch tại: **[planning-guide.md](references/planning-guide.md)**


| Biện hộ                                              | Thực tế                                                                                                                                                                     |
|------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| "Tới đâu hay tới đó, tôi sẽ tính toán trên đường đi" | Đó là con đường dẫn tới một mớ bòng bong phải đập đi làm lại. 10 phút lên kế hoạch sẽ cứu bạn hàng giờ làm việc.                                                            |
| "Mấy cái task này hiển nhiên quá rồi"                | Cứ viết nó ra. Đặt các task ra giấy sẽ làm lộ diện những rủi ro ngầm và các edge cases dễ bị lãng quên.                                                                     |
| "Lên kế hoạch là lãng phí thời gian (overhead)"      | Lên kế hoạch chính là làm task rồi. Code mà không có kế hoạch chỉ là hành động gõ phím mù quáng.                                                                            |
| "Tôi nhớ hết trong đầu mà"                           | Bộ nhớ ngữ cảnh (Context windows) có giới hạn. Kế hoạch viết ra giấy sẽ tồn tại vượt qua các ranh giới phiên làm việc và không bị thuật toán nén chữ (compaction) nuốt mất. |

## Dấu hiệu Cảnh báo (Red Flags)

- Bắt đầu code mà chưa có một danh sách task viết ra file tử tế
- Các task có nội dung chung chung kiểu "implement tính năng này" mà chả có lấy 1 dòng tiêu chí nghiệm thu (acceptance criteria)
- Không có bước xác minh (verification steps) trong bản kế hoạch
- Toàn bộ tasks đều là size XL
- Không có các điểm chốt kiểm tra (checkpoints) giữa các tasks
- Thứ tự phụ thuộc (Dependency order) không được quan tâm

## Xác minh

Trước khi bắt tay vào code, hãy xác nhận:

- [ ] Mọi task đều có tiêu chí nghiệm thu (acceptance criteria)
- [ ] Mọi task đều có bước xác minh (verification step)
- [ ] Các phụ thuộc của task (Task dependencies) đã được nhận diện và xếp đúng thứ tự
- [ ] Không có task nào đụng tới nhiều hơn ~5 files
- [ ] Các chốt kiểm tra (Checkpoints) đã được cắm giữa các giai đoạn lớn (major phases)
- [ ] Con người đã review và duyệt bản kế hoạch này


---
