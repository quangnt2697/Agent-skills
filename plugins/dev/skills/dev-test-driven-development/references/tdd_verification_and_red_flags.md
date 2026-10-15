# Checklist Xác Minh TDD, Biện Hộ Thường Gặp & Red Flags

## Các Biện hộ Thường gặp

| Biện hộ                                   | Thực tế                                                                                                                                                            |
|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| "Tôi sẽ viết test sau khi code chạy được" | Bạn sẽ không làm đâu. Và test viết sau khi đã làm xong thường chỉ test cách implementation, chứ không phải hành vi.                                                |
| "Cái này quá đơn giản để test"            | Code đơn giản rồi sẽ phức tạp. Test là tài liệu ghi lại hành vi mong muốn.                                                                                         |
| "Test làm tôi chậm lại"                   | Test làm bạn chậm bây giờ. Nhưng chúng giúp bạn nhanh lên trong TẤT CẢ các lần sửa code sau này.                                                                   |
| "Tôi đã test tay rồi"                     | Test tay không được lưu lại. Thay đổi ngày mai có thể làm hỏng tính năng đó mà không ai biết.                                                                      |
| "Đọc code là hiểu ngay rồi"               | Test CHÍNH LÀ bản đặc tả. Chúng ghi tài liệu về điều đoạn code *nên* làm, không phải điều nó *đang* làm.                                                           |
| "Đây chỉ là bản prototype thôi"           | Bản prototype sẽ trở thành code production. Viết test từ ngày đầu giúp tránh khủng hoảng "nợ test" (test debt).                                                    |
| "Để tôi chạy test lại lần nữa cho chắc"   | Sau một lượt test thành công, chạy lại lệnh đó chẳng mang ý nghĩa gì trừ khi code đã thay đổi. Chỉ chạy lại sau các chỉnh sửa tiếp theo, không phải để tự trấn an. |

## Dấu hiệu Cảnh báo (Red Flags)

- Viết code mà không có bài test tương ứng nào
- Tự động gõ lệnh test mặc định (`npm test`) mà không kiểm tra xem repo này thực sự dùng lệnh gì
- Các bài test pass ngay lần đầu chạy (chúng có thể không test đúng thứ bạn nghĩ)
- Báo cáo "Tất cả test pass" nhưng thực tế không có bài test nào được chạy
- Các bản sửa lỗi (bug fixes) không có bài test tái hiện đi kèm
- Các test đi test hành vi của framework thay vì test hành vi ứng dụng
- Tên bài test không mô tả hành vi được kiểm chứng
- Bỏ qua (Skip) test để ép bộ test pass
- Chạy cùng một lệnh test hai lần liên tiếp mà không hề thay đổi code ở giữa

## Xác minh

Sau khi hoàn thành bất kỳ triển khai nào:

- [ ] Mọi hành vi mới đều có test tương ứng
- [ ] Toàn bộ test suite chạy thành công bằng lệnh chuẩn của repository (`npm test`, `./gradlew test`, `pytest`, `go test ./...`, v.v.)
- [ ] Các bản sửa lỗi có bao gồm bài test tái hiện (đã fail trước khi có bản sửa lỗi)
- [ ] Tên bài test mô tả hành vi đang được xác minh
- [ ] Không có test nào bị skipped hay vô hiệu hóa (disabled)
- [ ] Độ bao phủ (Coverage) không bị sụt giảm (nếu có theo dõi)

**Lưu ý:** Chạy từng lệnh test sau mỗi thay đổi có khả năng tác động đến kết quả. Sau một lượt test sạch, đừng chạy lại lệnh cũ nếu code không thay đổi — chạy lại code không đổi chẳng làm tăng thêm chút tự tin nào.


---
