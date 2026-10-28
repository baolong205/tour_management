# Giao diện quản trị tách biệt

- Cổng đăng nhập nội bộ: `http://localhost:5173/#/admin/login`.
- Admin và STAFF vào `#/admin` sau khi đăng nhập; các URL khách hàng chuyển về khu vực nghiệp vụ khi phiên nội bộ còn hiệu lực.
- Bố cục nội bộ có sidebar, nhóm chức năng, thông tin người đăng nhập và nút đăng xuất riêng; không dùng Navbar/Footer khách hàng.
- Menu và nội dung nghiệp vụ kiểm tra quyền; không cấp thêm quyền cho STAFF.
- Hồ sơ bảo mật và thông báo cá nhân nội bộ dùng `#/admin/account` và `#/admin/notifications`.
- Đăng xuất/đổi mật khẩu từ khu vực nội bộ đưa về cổng đăng nhập quản trị.
- Khách hàng không truy cập được nội dung quản trị và không được đưa vào trang quản trị sau đăng nhập.
- Vẫn dùng chung ứng dụng React/Vite và API hiện tại, không phải hai bản triển khai độc lập. Các kiểm tra quyền API phía backend vẫn là lớp bảo vệ dữ liệu.

Kiểm tra frontend: `npm test` và `npm run build` trong thư mục frontend. Kiểm tra chuyển trang và menu phân quyền nằm ở `frontend/tests/routing.test.js`.