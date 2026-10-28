# ViVu Travel — Frontend

Giao diện tiếng Việt, React + Vite, CSS thuần. API được đối chiếu với NestJS trong dự án; không dùng dữ liệu tour giả.

## Chạy cục bộ

```powershell
cd D:\nam4\project\tour_management\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Mở `http://localhost:5173`. Chạy backend và MySQL theo cấu hình backend trước khi sử dụng dữ liệu thật. Vite chuyển tiếp `/api` và `/uploads` sang `http://localhost:3000`.

Nếu backend dùng cổng khác, sửa `API_PROXY_TARGET` trong `.env` rồi khởi động lại Vite. Nếu đổi API_PREFIX ở backend, cần cập nhật cả `VITE_API_BASE_URL` và quy tắc proxy trong `vite.config.js`.

## Chức năng

- Trang chủ, tìm kiếm tour, lọc theo danh mục / thành phố khởi hành, sắp xếp và phân trang phía server.
- Chi tiết tour, ảnh, điểm đến, lịch trình, chính sách hủy, lịch khởi hành và yêu thích.
- Đăng ký, đăng nhập, đăng xuất; refresh token luân phiên khi API nghiệp vụ trả 401.
- Báo giá theo ngày sinh và mã ưu đãi; đặt tour; xem đơn, hành khách và gửi yêu cầu hủy.
- Quản lý thông tin cơ bản của tour (tạo / sửa / xóa), hiển thị theo permission `tour:read`, `tour:write`, `tour:delete`. Backend vẫn là nơi thực thi phân quyền.
- Tương thích payload trực tiếp và envelope `RESPONSE_ENVELOPE=true`.

## Kiểm tra

```powershell
npm test
npm run build
npm run preview
```

## Phạm vi và triển khai

- Sử dụng hash routing, không cần thư viện router hoặc cấu hình fallback của máy chủ.
- Token lưu trong `sessionStorage`, mất khi đóng tab. Khi đưa lên production nên xem xét cơ chế cookie HttpOnly phía backend để giảm rủi ro XSS.
- Sáu tour DEMO có ảnh Pexels lưu cục bộ, nguồn ghi tại `public/images/sources.json` và trang `/images/credits.html`. Một số ảnh là ảnh minh họa trải nghiệm, không bảo đảm địa điểm chụp hoặc dịch vụ thực tế của tour. SVG vẫn dùng làm ảnh dự phòng.
- Banner trang chủ, trang đăng nhập và khối giới thiệu dùng ảnh cục bộ trong `public/images`. Ảnh tour được sao chép sang thư mục uploads và gắn vào DB bằng `npm run db:seed:images` khi chạy ở `D:\nam4\project\tour_management\backend`. Chạy `db:seed:tours` trước nếu database chưa có tour DEMO. Script ảnh không tạo trùng và giữ ảnh bìa người dùng đã thêm; tên file có hash nội dung để tránh cache cũ.
- Tạo đơn chưa đồng nghĩa thanh toán thành công. Frontend này chưa tích hợp giao diện cổng thanh toán, quản lý lịch khởi hành, báo cáo, nhà cung cấp hoặc toàn bộ module vận hành của backend.
- Khi deploy thư mục `dist`, cần reverse proxy `/api` và `/uploads` về backend, hoặc đặt `VITE_API_BASE_URL` thành URL API tuyệt đối lúc build và cấu hình CORS_ORIGIN tương ứng ở backend. Proxy Vite chỉ áp dụng cho dev.
- Unit test kiểm tra xử lý giá, ngày, truy vấn, đường dẫn sau đăng nhập và trạng thái đơn. Cần backend + database để kiểm thử tích hợp giao dịch thật.