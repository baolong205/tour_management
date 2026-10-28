# Không gian nhân viên TourGo

## Tách khỏi Admin

- STAFF: `#/staff/login`, `#/staff`, `#/staff/account`, `#/staff/notifications`.
- ADMIN: giữ `#/admin/login`, `#/admin`, `#/admin/account`, `#/admin/notifications`.
- Vai trò ADMIN được ưu tiên nếu tài khoản có cả ADMIN và STAFF.
- STAFF mở link Admin sẽ chuyển về bàn làm việc STAFF; ADMIN mở khu vực STAFF chuyển về Admin. Khách không được vào nội dung nội bộ.
- Đăng nhập vẫn dùng API xác thực chung và profile `/auth/me`, không tự gán vai trò từ cổng đăng nhập.

## Giao diện nhân viên

Giao diện xanh dương/trắng theo ảnh tham chiếu: sidebar sáng, thanh tìm kiếm booking, banner du lịch, ngày hiện tại theo múi giờ Việt Nam, bốn thẻ số liệu theo quyền, biểu đồ cột và vòng tròn, bảng booking gần đây, lịch khởi hành và thông báo. Không có header/footer khách hàng hoặc sidebar Admin. Không tạo số liệu công việc giả.

- Số tổng lấy từ `total` của API booking, khách hàng, yêu cầu hủy và lịch từ hôm nay; không gán phần trăm tăng trưởng giả.
- Biểu đồ dựa trên tối đa 100 booking gần nhất và ghi rõ phạm vi, không phải báo cáo toàn hệ thống. Trạng thái xác nhận đơn không được gọi là đã thanh toán.
- Không có API doanh thu dành cho STAFF: thay ô doanh thu bằng yêu cầu hủy và biểu đồ doanh thu bằng số booking theo tháng. Giữ nguyên giới hạn quyền backend.
- Lịch bên phải chỉ hiển thị OPEN/FULL từ tối đa 100 lịch sắp tới; ảnh nền du lịch dùng tài nguyên có sẵn, không giả là ảnh riêng của từng tour.
- Nút Xem mở đúng booking trong khu vực STAFF. Tìm kiếm phía trên chuyển từ khóa sang danh sách booking; thông báo, tài khoản và nghiệp vụ đều dùng route riêng.
- Không thêm menu đặt tour tại quầy, quản lý sản phẩm, báo cáo hay cấu hình khi chưa có màn STAFF tương ứng; mục Tài khoản & bảo mật không phải cấu hình hệ thống.

Menu allowlist theo quyền: xử lý đơn, đối chiếu thanh toán, lịch khởi hành, tra cứu khách hàng, hỗ trợ và gửi thông báo. Không có cấu hình, phân quyền, quản lý sản phẩm hoặc báo cáo Admin, kể cả khi tài khoản STAFF có thêm quyền ngoài dự kiến. Tab không được phép hiển thị từ chối truy cập.

Các component nghiệp vụ và API được tái sử dụng để giữ quy tắc xử lý hiện tại; backend không thay đổi. Việc tách giao diện không thay thế kiểm tra quyền backend. Lịch mặc định chỉ đọc khi không có schedule:write. Tra cứu khách hàng không hiện cập nhật hồ sơ nếu thiếu user:manage.

## Kiểm tra

## Màn nghiệp vụ đơn & lịch khởi hành

- Xử lý đơn: bảng có phân trang, tìm mã/tên/số điện thoại, lọc trạng thái và khoảng ngày khởi hành. Các thẻ đếm ghi rõ phạm vi trang hiện tại hoặc tổng kết quả lọc.
- Chi tiết đơn có liên hệ, hành khách, giá trị, lịch sử yêu cầu hủy và snapshot phí/tiền hoàn. Xác nhận, từ chối đơn, duyệt/từ chối yêu cầu hủy và hủy trực tiếp đều kiểm tra trạng thái/quyền và yêu cầu xác nhận trước khi gửi.
- Duyệt hủy gửi boolean `approve: true`; từ chối gửi `approve: false` cùng lý do bắt buộc. Không tự hoàn tiền; không dùng trạng thái xác nhận đơn thay cho đã thanh toán.
- Lịch khởi hành dùng màn STAFF riêng, lọc ngày/trạng thái, số chỗ đã bán/đang giữ/còn trống, giá vé, điểm tập trung và checkpoint. STAFF không có `schedule:write` chỉ thấy tra cứu. Tài khoản được cấp quyền ghi vẫn có biểu mẫu thêm/sửa/xóa, backend quyết định tính hợp lệ.
- Các bảng cuộn ngang bên trong trên mobile, không làm tràn toàn trang. Browser fixture kiểm tra xác nhận, duyệt/từ chối hủy, lỗi validation, lọc ngày, điểm đón và quyền chỉ đọc; không thực hiện thao tác thật trên database.

### Lệnh kiểm tra

### Liên kết thanh toán – đơn – lịch

### Nhập lịch đón và điểm hẹn

Trong chi tiết lịch, tài khoản có `schedule:write` chọn **Thêm / sửa lịch đón & điểm hẹn**. Nhập điểm tập trung chung và thêm từng điểm gồm ngày thứ (1–365), giờ đón, tên/vị trí (tối đa 200 ký tự), tối đa 30 điểm. Ngày 1 là ngày khởi hành. Lưu qua PATCH lịch hiện có, chỉ gửi meetingPoint và checkpoints; không sửa giá, chỗ hoặc trạng thái. Danh sách gửi lên thay thế toàn bộ điểm đón cũ: có thể xóa từng dòng hoặc xóa hết rồi lưu. Có xác nhận trước khi lưu; lỗi API hiện ngay trong biểu mẫu. Lịch ONGOING/COMPLETED/CANCELLED không mở biểu mẫu. STAFF mặc định chỉ đọc vẫn không được tự cấp thêm quyền.

- Thanh toán không tạo lịch mới: booking gắn `scheduleId` với lịch đã có. Thanh toán thành công đưa đơn chờ thanh toán sang chờ xác nhận; nhân viên xác nhận mới ghi tăng số chỗ bán.
- Trong chi tiết đơn có liên kết mở đúng lịch (yêu cầu `schedule:read`). Route `#/staff?tab=schedules&schedule=ID` mở trực tiếp chi tiết và chuyển focus tới lịch.
- Chi tiết lịch liệt kê các đơn/khách theo `GET /bookings?scheduleId=ID` có phân trang, chỉ khi có `booking:read`. Tiền đã nhận/còn phải trả/đã hoàn được đọc riêng qua `/payments/booking/ID` nếu có `payment:read`; không suy từ trạng thái booking.
- Kiểm thử trình duyệt có ca mở lịch từ đơn đã thanh toán, kiểm tra đúng query `scheduleId`, thấy booking và tiền đã nhận, rồi mở ngược lại đơn. Không sửa dữ liệu thật.

`npm test`, `npm run build`, `node scripts/verify-travel-ui.mjs` từ frontend. Browser fixture kiểm tra dashboard có dữ liệu, biểu đồ, tìm kiếm tiếng Việt, mở đúng chi tiết booking, tách shell, redirect STAFF/Admin, khách bị từ chối, menu theo quyền, tab cấu hình bị chặn, mobile 390px/320px. Không thay đổi tài khoản hoặc dữ liệu thật.

Thông tin đăng nhập demo trong hướng dẫn cũ chưa được xác minh lại bằng đăng nhập thật trong lần sửa này.