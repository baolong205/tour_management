# Giao diện đặt tour TourGo

- Biểu mẫu liên hệ, danh sách hành khách và thông tin bổ sung đặt bên trái; lịch khởi hành, đơn giá và báo giá đặt bên phải. Mobile chuyển sang một cột, nút gửi vẫn liên kết đúng biểu mẫu bằng thuộc tính `form`.
- Tiến trình: thông tin đặt tour → kiểm tra báo giá → thanh toán sau khi tạo đơn.
- Giá và loại hành khách do backend tính từ ngày sinh và lịch khởi hành. Thay đổi hành khách hoặc mã ưu đãi làm mất báo giá hiện tại. Báo giá không giữ chỗ.
- Backend vẫn kiểm tra chỗ và tính giá khi tạo đơn. Nút xác nhận bị khóa khi báo giá báo hết chỗ; lỗi cho phép sửa thông tin và lấy báo giá lại.
- Thành công có liên kết thanh toán và chi tiết đơn; không mô tả đơn mới tạo là đã thanh toán hay xác nhận chỗ.
- Mẫu tại `mau/TourGo_ Khám phá thế giới diệu kỳ.png` được tìm thấy (1448 × 1086), nhưng công cụ không hiển thị nội dung ảnh dù đã thử thu nhỏ. Bản này đồng bộ phong cách TourGo hiện tại, chưa được xác nhận khớp mẫu.

Kiểm tra: 33 tests frontend đạt, production build đạt, Chrome smoke đạt desktop/390px/320px. Luồng tạo đơn được kiểm tra qua fetch fixture trong trình duyệt, không tạo bản ghi thật: thêm/xóa hành khách, báo giá, đổi thông tin, hết chỗ, lỗi mã ưu đãi, payload tạo đơn, thành công và lịch không tồn tại.