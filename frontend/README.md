# TourGo — Frontend

Giao diện tiếng Việt, React + Vite, CSS thuần. API được đối chiếu với NestJS trong dự án; không dùng dữ liệu tour giả.

## Chạy cục bộ

```powershell
# Từ thư mục gốc dự án:
cd frontend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

Mở `http://localhost:5173`. Chạy backend và MySQL theo cấu hình backend trước khi sử dụng dữ liệu thật. Vite chuyển tiếp `/api` và `/uploads` sang `http://localhost:3000`.

Từ thư mục gốc, `npm.cmd run dev:web` tự chạy backend và website với cùng cấu hình cổng/prefix. Nếu chạy riêng và backend dùng cổng khác, sửa `API_PROXY_TARGET` trong `.env`; nếu backend đổi API_PREFIX, đặt `API_PROXY_PREFIX` tương ứng. Giữ `VITE_API_BASE_URL=/api` để Vite proxy tới backend.

## Chức năng

- Trang chủ, tìm kiếm tour, lọc theo danh mục / thành phố khởi hành, sắp xếp và phân trang phía server.
- Chi tiết tour, ảnh, điểm đến, lịch trình, chính sách hủy, lịch khởi hành và yêu thích.
- Đăng ký, đăng nhập, đăng xuất; refresh token luân phiên khi API nghiệp vụ trả 401.
- Báo giá theo ngày sinh và mã ưu đãi; đặt tour; xem đơn, hành khách và gửi yêu cầu hủy.
- Quản lý thông tin cơ bản của tour (tạo / sửa / xóa), hiển thị theo permission `tour:read`, `tour:write`, `tour:delete`. Backend vẫn là nơi thực thi phân quyền.
- Tương thích payload trực tiếp và envelope `RESPONSE_ENVELOPE=true`.

## Tổ chức mã nguồn

- `src/pages/`: các trang được router hiển thị.
- `src/components/`: UI và layout dùng chung.
- `src/features/`: helper và component theo nghiệp vụ tours, booking, payment,
  schedules, staff, admin, management và workspace.
- `src/styles/`: CSS, tải theo thứ tự trong `index.css`.
- `src/routing/`, `src/hooks/`, `src/lib/`, `src/services/`: điều hướng, hook,
  tiện ích dùng chung và API client.
- `tests/`: kiểm thử logic; báo cáo/screenshot cục bộ đặt trong `.artifacts/`.

Xem thêm [quy ước toàn dự án](../docs/ARCHITECTURE.md).

## Chức năng tài khoản và vận hành

Hồ sơ, khôi phục mật khẩu demo, thông báo, thanh toán/chứng từ, đánh giá, CSKH và
workspace quản trị theo quyền. Xem [danh sách chức năng](../docs/FEATURE-CHECKLIST.md).

Các trang mới: `#/account`, `#/forgot-password`, `#/notifications`, `#/support`, `#/reviews`, `#/payment/:bookingId`, `#/admin`.

Email thanh toán do backend gửi theo cấu hình SMTP và `MAIL_ENABLED`; VNPay/MoMo
là cổng giả lập. Xem [thanh toán và hóa đơn](../docs/PAYMENT_RECEIPTS.md).
Báo cáo CSV và in/lưu PDF qua trình duyệt; một số biểu mẫu quản trị nâng cao dùng JSON.

### Hiệu ứng 3D

- Chuyển động 3D: thẻ tour nghiêng tối đa 6° theo chuột, ánh sáng trên thẻ và ảnh dịch chuyển tạo chiều sâu; banner nghiêng nhẹ tối đa 2°, ảnh/chữ parallax và nút có bóng nổi.
- Tilt chỉ chạy với chuột trên thiết bị hỗ trợ hover và khi không bật giảm chuyển động; cập nhật qua requestAnimationFrame, tự reset khi rời chuột, cuộn, resize, mất focus hoặc đổi tùy chọn chuyển động. Không dùng WebGL hay thư viện bổ sung.

- Hiệu ứng vào trang, tiêu đề banner xuất hiện lần lượt, ảnh banner phóng nhẹ một lần.
- Các thẻ tour và khối nội dung xuất hiện khi vào vùng nhìn; hỗ trợ cả dữ liệu API tải bất đồng bộ.
- Hover/nhấn cho nút, ảnh, danh mục; hiệu ứng mở menu và hộp thoại.
- CSS hiệu ứng nằm ở `src/styles/animations.css`; bộ quan sát nằm ở
  `src/lib/motion.js` và `src/lib/tilt.js`.
- Tôn trọng `prefers-reduced-motion`, kể cả khi thay đổi lúc trang đang mở. Khi không có observer, nội dung vẫn hiển thị bình thường. Không remount trang khi chỉ thay đổi query bộ lọc.

### Lệnh kiểm tra

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Phạm vi và triển khai

- Sử dụng hash routing, không cần thư viện router hoặc cấu hình fallback của máy chủ.
- Token lưu trong `sessionStorage`, mất khi đóng tab. Khi đưa lên production nên xem xét cơ chế cookie HttpOnly phía backend để giảm rủi ro XSS.
- Sáu tour DEMO có ảnh Pexels lưu cục bộ, nguồn ghi tại `public/images/sources.json` và trang `/images/credits.html`. Một số ảnh là ảnh minh họa trải nghiệm, không bảo đảm địa điểm chụp hoặc dịch vụ thực tế của tour. SVG vẫn dùng làm ảnh dự phòng.
- Banner trang chủ, trang đăng nhập và khối giới thiệu dùng ảnh cục bộ trong `public/images`.
  Chạy `npm run db:seed:images` trong `backend/` để sao chép ảnh tour vào uploads và
  gắn vào DB. Chạy `db:seed:tours` trước nếu chưa có tour DEMO. Script giữ ảnh bìa
  người dùng đã thêm; tên file có hash nội dung để tránh cache cũ.
- Tạo đơn chưa đồng nghĩa thanh toán thành công. Ghi nhận tiền, xác nhận chuyến đi,
  duyệt chứng từ và hoàn tiền là các trạng thái riêng do backend xử lý.
- Khi deploy thư mục `dist`, cần reverse proxy `/api` và `/uploads` về backend, hoặc đặt `VITE_API_BASE_URL` thành URL API tuyệt đối lúc build và cấu hình CORS_ORIGIN tương ứng ở backend. Proxy Vite chỉ áp dụng cho dev.
- Unit test kiểm tra xử lý giá, ngày, truy vấn, đường dẫn sau đăng nhập và trạng thái đơn. Cần backend + database để kiểm thử tích hợp giao dịch thật.
