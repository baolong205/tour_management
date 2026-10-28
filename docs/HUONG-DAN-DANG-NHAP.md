# Hướng dẫn đăng nhập theo vai trò — ViVu Travel

Tài liệu dành cho quản trị viên (ADMIN), nhân viên (STAFF) và khách hàng (CUSTOMER) trong môi trường phát triển cục bộ.

> **Bảo mật:** Các tài khoản/mật khẩu mẫu dưới đây chỉ dùng để thử nghiệm nội bộ. Không công khai tài liệu chứa mật khẩu và phải đổi mật khẩu trước khi triển khai thật. Trên môi trường thật, mỗi người cần tài khoản riêng.

## 1. Chuẩn bị trước khi đăng nhập

- MySQL và backend phải đang chạy, kết nối đúng cơ sở dữ liệu của dự án.
- Frontend phải đang chạy tại `http://localhost:5173` theo cấu hình phát triển hiện tại.
- Nếu triển khai ở địa chỉ khác, thay `http://localhost:5173` bằng địa chỉ website thực tế và giữ nguyên phần `/#/...`.
- Đăng xuất tài khoản đang dùng trước khi chuyển sang người khác. Để thử nhiều vai trò đồng thời, nên dùng các hồ sơ trình duyệt riêng hoặc cửa sổ ẩn danh.

## 2. Tra cứu nhanh

| Người sử dụng | Địa chỉ đăng nhập | Email | Mật khẩu | Sau khi đăng nhập |
| --- | --- | --- | --- | --- |
| Quản trị viên (ADMIN) | `http://localhost:5173/#/admin/login` | `admin@tour.local` | `Admin@123456` | Khu vực quản trị `#/admin` |
| Nhân viên demo (STAFF) | `http://localhost:5173/#/staff/login` | `demo-staff-21cf99eb@example.test` | `Demo@21cf99eb123` | Khu vực nghiệp vụ `#/staff` |
| Khách hàng (CUSTOMER) | `http://localhost:5173/#/login` | Email đã đăng ký | Mật khẩu đã tạo | Trang khách hàng hoặc trang đang cần đăng nhập |

**Lưu ý về tài khoản mẫu:**

- Admin là thông tin mặc định trong script seed. Nếu cấu hình `ADMIN_EMAIL`/`ADMIN_PASSWORD` khác hoặc mật khẩu đã được đổi, hãy dùng thông tin thực tế. Chạy lại seed không đặt lại mật khẩu tài khoản đã tồn tại.
- STAFF demo là tài khoản đã được báo cáo sử dụng trong lần kiểm tra trước, không phải tài khoản mặc định được tạo trên mọi cơ sở dữ liệu. Tài liệu này chưa xác minh lại đăng nhập trực tiếp vào cơ sở dữ liệu hiện tại.
- Chưa có thông tin tài khoản khách hàng mẫu được xác nhận cho tài liệu này. Khách hàng hãy đăng ký theo mục 5, không dùng tài khoản Admin để thử chức năng khách hàng.

## 3. Hướng dẫn cho quản trị viên (ADMIN)

### Đăng nhập

1. Mở `http://localhost:5173/#/admin/login`.
2. Nhập email và mật khẩu Admin trong bảng trên, hoặc thông tin được cấp thực tế.
3. Nhấn **Đăng nhập**.
4. Hệ thống mở khu vực quản trị với sidebar và thanh tài khoản riêng, không có menu/footer khách hàng.

### Các nhóm công việc

- Theo dõi tổng quan và báo cáo.
- Quản lý tour, lịch khởi hành, danh mục, địa điểm và khuyến mãi.
- Xử lý đơn đặt tour, thanh toán và hoàn tiền.
- Quản lý khách hàng, nhân viên và vai trò.
- Kiểm duyệt đánh giá, xử lý CSKH và gửi thông báo.
- Quản lý banner, chính sách hủy và cấu hình hệ thống.

Menu thực tế được hiển thị theo quyền tài khoản nhận được từ backend.

### Tạo tài khoản cho nhân viên mới

1. Đăng nhập bằng tài khoản Admin có quyền quản lý vai trò.
2. Chọn **Nhân viên & vai trò** trên sidebar.
3. Mở **Tạo tài khoản nhân viên**.
4. Điền họ tên, email, mật khẩu khởi tạo và số điện thoại nếu có.
5. Gửi biểu mẫu; chỉ thông báo tạo thành công khi hệ thống xác nhận.
6. Gửi riêng cho nhân viên địa chỉ cổng nội bộ, email và mật khẩu khởi tạo qua kênh an toàn.
7. Yêu cầu nhân viên đổi mật khẩu sau lần đăng nhập đầu tiên.

Không dùng tính năng **Đăng ký ngay** của khách hàng để tạo tài khoản có quyền STAFF hoặc ADMIN.

## 4. Hướng dẫn cho nhân viên (STAFF)

### Đăng nhập

1. Nhận tài khoản từ Admin, hoặc dùng tài khoản demo nếu có trong cơ sở dữ liệu đang chạy.
2. Mở `http://localhost:5173/#/staff/login`.
3. Nhập email, mật khẩu và nhấn **Đăng nhập**.
4. Hệ thống mở khu vực nghiệp vụ. Chỉ các chức năng được cấp quyền mới xuất hiện.

### Phạm vi công việc

- Xem và xử lý đơn đặt tour theo quyền được cấp.
- Theo dõi/xử lý thanh toán theo quyền được cấp.
- Tra cứu thông tin khách hàng phục vụ nghiệp vụ.
- Xem lịch khởi hành và xử lý yêu cầu hỗ trợ CSKH.

Theo phân quyền STAFF hiện tại, nhân viên **không có** quyền quản lý vai trò, cấu hình hệ thống, chỉnh sửa/xóa tour, hoàn tiền hoặc xem báo cáo doanh thu. Không thấy các mục này là hành vi phân quyền bình thường.

Nếu tài khoản không có chức năng cần thiết, liên hệ Admin; không sử dụng chung tài khoản Admin.

## 5. Hướng dẫn cho khách hàng (CUSTOMER)

### Đã có tài khoản

1. Mở `http://localhost:5173/#/login`.
2. Nhập email và mật khẩu đã đăng ký.
3. Nhấn **Đăng nhập**.
4. Tiếp tục sử dụng giao diện khách hàng. Nếu đăng nhập từ luồng đặt tour, hệ thống có thể đưa về trang đang thực hiện.

### Chưa có tài khoản

1. Mở `http://localhost:5173/#/login`.
2. Nhấn **Đăng ký ngay**.
3. Nhập họ tên, email và mật khẩu; số điện thoại không bắt buộc.
4. Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số; không quá 72 ký tự.
5. Nhấn **Tạo tài khoản**.
6. Khi đăng ký và đăng nhập thành công, sử dụng tài khoản mới để thao tác trên website.

### Các chức năng khách hàng

- Khám phá tour, xem lịch khởi hành và đặt tour.
- Xem đơn của mình, gửi yêu cầu thanh toán/chứng từ và yêu cầu hủy theo điều kiện hệ thống.
- Quản lý tour yêu thích, hồ sơ và mật khẩu.
- Xem thông báo, gửi yêu cầu CSKH và đánh giá khi đủ điều kiện.

Khách hàng không được truy cập nội dung quản trị. Mở đường dẫn cổng nội bộ không tự cấp quyền Admin/STAFF.

## 6. Đổi mật khẩu và đăng xuất

### Admin / STAFF

1. Chọn **Tài khoản & bảo mật**, hoặc mở `http://localhost:5173/#/admin/account`.
2. Trong mục **Đổi mật khẩu**, nhập mật khẩu hiện tại và mật khẩu mới hợp lệ.
3. Gửi biểu mẫu. Sau khi thành công, đăng nhập lại tại cổng nội bộ bằng mật khẩu mới.
4. Khi kết thúc công việc, nhấn **Đăng xuất** trên thanh tài khoản. Hệ thống đưa về cổng đăng nhập quản trị.

### Khách hàng

1. Bấm tên tài khoản trên menu, hoặc mở `http://localhost:5173/#/account`.
2. Đổi mật khẩu trong phần **Đổi mật khẩu** và đăng nhập lại khi được yêu cầu.
3. Nhấn **Đăng xuất** trên menu khi kết thúc sử dụng.

## 7. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không mở được website | Kiểm tra frontend đang chạy và đúng địa chỉ/cổng. |
| Báo không thể kết nối máy chủ | Kiểm tra backend, MySQL và cấu hình proxy/API của frontend. |
| Sai email hoặc mật khẩu | Kiểm tra thông tin được cấp, chữ hoa/thường và mật khẩu có bị thay đổi hay không; không mặc định tài khoản demo tồn tại trên database mới. |
| Đăng nhập Admin nhưng mở trang tour lại quay về quản trị | Đây là thiết kế hiện tại. Đăng xuất và dùng tài khoản CUSTOMER để thử trang khách hàng. |
| STAFF không thấy mục quản trị hệ thống/hoàn tiền/báo cáo | Đây là giới hạn quyền STAFF hiện tại. Liên hệ Admin nếu cần xem lại phân quyền. |
| Đã đổi vai trò nhưng menu chưa cập nhật | Đăng xuất rồi đăng nhập lại để nhận thông tin quyền mới. |
| Khách hàng bị báo không có quyền khi mở `#/admin` | Quay về `http://localhost:5173/#/`; chỉ tài khoản nội bộ được cấp quyền mới dùng khu vực quản trị. |
| Quên mật khẩu | Khách hàng có thể mở `http://localhost:5173/#/forgot-password`. Khôi phục hiện còn ở mức demo cục bộ, chưa tích hợp email thật; không coi đây là quy trình khôi phục production. Nhân viên liên hệ quản trị hệ thống khi cần hỗ trợ. |

> **Dành cho người vận hành:** Không chạy `npm run db:sync` trên cơ sở dữ liệu đang có dữ liệu để xử lý lỗi đăng nhập. Lệnh này có thể đồng bộ phá hủy dữ liệu; hãy kiểm tra cấu hình và quy trình nâng cấp an toàn của dự án.
