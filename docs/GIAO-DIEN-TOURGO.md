# Giao diện theo mẫu TourGo

## Phạm vi

Áp dụng bố cục mẫu người dùng cung cấp cho khu vực tài khoản khách hàng: nền xanh nhạt, header tìm kiếm, sidebar tài khoản, nội dung dạng thẻ trắng và điểm nhấn xanh dương.

- `http://localhost:5173/#/account/overview`: tổng quan tài khoản.
- `http://localhost:5173/#/bookings`: danh sách tour đã đặt.
- Từ **Tour của tôi → Xem chi tiết** mở `#/bookings/:id`, thay cho hộp thoại cũ.
- `http://localhost:5173/#/account/security`: đổi mật khẩu.
- Hồ sơ, tour yêu thích, đánh giá, thông báo, thanh toán và CSKH dùng chung sidebar.
- Admin/STAFF vẫn dùng workspace tách biệt, không áp dụng sidebar khách hàng.

## Chi tiết đơn

- Ảnh tour có thumbnail bấm chuyển ảnh; ảnh và thông tin bổ sung lấy từ API tour.
- Trạng thái, ngày đặt, hành khách, giá vé, khuyến mãi và tổng tiền lấy từ API booking.
- Các tab: Tổng quan, Thông tin hành khách, Lịch trình, Thanh toán, Chính sách, Hỗ trợ.
- Tiến trình không tự đánh dấu đã thanh toán khi chưa có dữ liệu thanh toán xác nhận; không đánh dấu hoàn thành theo ngày tương lai.
- Nút thanh toán, yêu cầu hủy và đánh giá xuất hiện theo trạng thái đơn hiện có.
- Yêu cầu hủy dùng API cũ, không hủy ngay lập tức và không tự phê duyệt hoàn tiền.
- Hóa đơn chỉ tải được khi backend đã phát hành. Hiện xuất dữ liệu hóa đơn JSON, không phải PDF/hóa đơn điện tử hợp lệ.
- Hỗ trợ là yêu cầu CSKH, chưa có chat trực tiếp.

## Khác biệt có chủ đích so với ảnh mẫu

- Không sao chép tên khách, giá, mã đơn, số đánh giá hoặc huy hiệu thông báo giả.
- Avatar dùng chữ đầu của tên do chưa có chức năng tải ảnh đại diện.
- Không thêm menu Blog, mã giảm giá cá nhân hoặc lịch sử thanh toán toàn tài khoản khi chưa có chức năng tương ứng. Lịch sử thanh toán có trong từng đơn.
- Không ghi hướng dẫn viên khi API booking chưa cung cấp thông tin này.
- Lịch trình và chính sách tour bổ sung là dữ liệu tour hiện tại, được ghi chú rõ; không giả là snapshot của đơn đã đặt.

## Kiểm tra

```powershell
Set-Location 'D:\nam4\project\tour_management\frontend'
npm test
npm run build
node 'D:\nam4\project\tour_management\frontend\scripts\verify-travel-ui.mjs'
```

Script trình duyệt chạy Chrome headless; cần frontend/backend hoạt động và có tour. Các luồng công khai dùng dữ liệu API đang chạy. Phần chi tiết tài khoản dùng fixture được chặn trong `window.fetch` riêng của trình duyệt thử nghiệm, không tạo khách hàng, đơn hoặc thanh toán trong database. Kiểm tra này không xác nhận giao dịch thật hoặc toàn bộ phân quyền backend.

Ảnh kết quả chi tiết đơn nằm tại `%TEMP%\tourgo-booking-desktop.png`. Fixture chỉ xuất hiện trong phiên thử nghiệm, không hiển thị trong ứng dụng thông thường.

Tệp chính:

- `D:\nam4\project\tour_management\frontend\src\tourgo.css`
- `D:\nam4\project\tour_management\frontend\src\components\AccountLayout.jsx`
- `D:\nam4\project\tour_management\frontend\src\components\Brand.jsx`
- `D:\nam4\project\tour_management\frontend\src\pages\BookingDetail.jsx`
- `D:\nam4\project\tour_management\frontend\src\booking-view.js`
- `D:\nam4\project\tour_management\frontend\tests\booking-view.test.js`