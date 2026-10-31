# Giao diện quản trị tách biệt

- Cổng đăng nhập nội bộ: `http://localhost:5173/#/admin/login`.
- Admin vào `#/admin`, STAFF vào `#/staff` sau khi đăng nhập; các URL khách hàng chuyển về khu vực nghiệp vụ khi phiên nội bộ còn hiệu lực.
- Bố cục nội bộ có sidebar, nhóm chức năng, thông tin người đăng nhập và nút đăng xuất riêng; không dùng Navbar/Footer khách hàng.
- Menu và nội dung nghiệp vụ kiểm tra quyền; không cấp thêm quyền cho STAFF.
- Hồ sơ bảo mật và thông báo cá nhân nội bộ dùng `#/admin/account` và `#/admin/notifications`.
- Đăng xuất/đổi mật khẩu từ khu vực nội bộ đưa về cổng đăng nhập quản trị.
- Khách hàng không truy cập được nội dung quản trị và không được đưa vào trang quản trị sau đăng nhập.
- Vẫn dùng chung ứng dụng React/Vite và API hiện tại, không phải hai bản triển khai độc lập. Các kiểm tra quyền API phía backend vẫn là lớp bảo vệ dữ liệu.

Kiểm tra frontend: `npm test` và `npm run build` trong thư mục frontend. Kiểm tra chuyển trang và menu phân quyền nằm ở `frontend/tests/routing.test.js`.

## Dashboard theo mẫu TourGo

## Danh sách và biểu mẫu gọn cho ba vai trò

- Khách hàng/nhân viên dùng bảng phân trang với tên, liên hệ, trạng thái, vai trò, nút mở chi tiết; tìm kiếm và lọc trạng thái thực hiện phía API, không lọc giả toàn bộ danh sách ở client.
- Biểu mẫu hồ sơ, trạng thái và vai trò mở trong cửa sổ `dialog` riêng. STAFF chỉ đọc không thấy biểu mẫu ghi; không cho tự gán vai trò cho chính mình. Quyền và API hiện có được giữ nguyên.
- Hỗ trợ hiển thị bản tóm tắt và số phản hồi; mở cửa sổ để đọc trao đổi, trả lời và xử lý trạng thái. Khách tạo yêu cầu trong cửa sổ riêng thay vì biểu mẫu dài ở đầu trang.
- Thanh toán, hoàn tiền, kiểm duyệt và sửa đánh giá dùng nút mở biểu mẫu thay cho `details/summary` mặc định. Cảnh báo đối soát tiền và xác nhận chuyển tiền vẫn giữ nguyên.
- Thông báo hiển thị dạng feed gọn và cho xem thông báo chưa đọc **trong trang hiện tại**. Liên kết booking mở đúng đơn theo vai trò.
- Kiểu nhập liệu, bảng quản trị, hồ sơ cá nhân, tour của tôi được đồng bộ; tour của tôi dùng hai cột khi đủ rộng và một cột trên màn hình nhỏ.
- Dialog có tên truy cập, focus mặc định của trình duyệt, giữ focus trong modal, khóa cuộn nền và đóng bằng nút/Escape. Bảng rộng chỉ cuộn trong vùng bảng, không tràn ngang toàn trang.
- Kiểm thử trình duyệt bao gồm bảng admin, bộ lọc, cập nhật hồ sơ giả lập, STAFF chỉ đọc, mobile 390/320px, phản hồi hỗ trợ, đánh dấu thông báo, sửa đánh giá và đóng bằng Escape. Không ghi dữ liệu thật.

- Sidebar sáng chia nhóm, tìm kiếm Tour/Booking, banner Hạ Long, thẻ thống kê, biểu đồ dòng tiền theo tháng và booking theo trạng thái; bảng đơn gần đây và các khối tour được đặt nhiều, khách mới, lịch sắp tới, thông báo.
- Báo cáo chi tiết, bộ lọc và xuất CSV vẫn ở `#/admin?tab=reports`, yêu cầu `report:read`.
- Dòng tiền lấy từ `reports/overview`: tiền nhận chưa trừ hoàn, không phải lợi nhuận. Chọn năm cũ sẽ hiển thị tổng tiền nhận năm đó trên thẻ thay cho tháng hiện tại.
- Trạng thái booking và tour được đặt nhiều chỉ thống kê tối đa 100 booking gần nhất, có chú thích trên giao diện. Không đánh đồng trạng thái đơn với thanh toán. Tổng tiền tour là giá trị đơn, không phải tiền thực nhận; loại đơn hủy/từ chối/hết hạn.
- Không giả số tăng trưởng hoặc badge thông báo. API và điều hướng theo quyền hiện có; không thêm menu giả cho nghiệp vụ chưa tồn tại.
- Đơn gần đây mở chi tiết bằng tham số `booking`; tìm kiếm truyền từ khóa trên route. Có menu mobile, thu gọn sidebar desktop, tải/lỗi/trống và thử lại; không cài thư viện biểu đồ mới.
- Kiểm thử tại `D:\nam4\project\tour_management\frontend`: `npm test`, `npm run build`, `node scripts/verify-travel-ui.mjs`. Dữ liệu admin trong kiểm thử trình duyệt là fixture, không ghi dữ liệu thật.