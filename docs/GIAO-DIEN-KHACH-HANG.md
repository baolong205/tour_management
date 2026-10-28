# Giao diện khách hàng — ViVu Travel

## Định hướng thiết kế

- Phong cách travel editorial: ảnh khổ lớn, khoảng trắng thoáng, chữ rõ ràng; teal đậm kết hợp cam san hô.
- Trang chủ gồm banner cảm hứng, bộ tìm kiếm, điểm đến gợi ý, tour từ API, thông tin hỗ trợ, câu chuyện hành trình và hướng dẫn đặt tour.
- Không hiển thị số khách hàng, chứng nhận, giảm giá hoặc đánh giá giả. Các ảnh điểm đến là ảnh minh họa; không cam kết ảnh chụp chính xác dịch vụ.
- Header có menu thu gọn trên mobile, liên kết tài khoản và thông báo. Footer có các đường dẫn chức năng thực tế.
- Thẻ tour hiển thị danh mục, thời lượng, nơi khởi hành, đánh giá, giá và nút xem chi tiết.
- Danh sách, chi tiết, đặt tour và trang tài khoản dùng cùng ngôn ngữ thiết kế. Nghiệp vụ/API không thay đổi.
- CSS mới được giới hạn trong `.customer-site`; bố cục Admin/STAFF vẫn riêng biệt.
- Giữ hỗ trợ giảm chuyển động, nhãn biểu mẫu và thao tác bàn phím. Không bổ sung thư viện giao diện, font từ bên thứ ba hoặc dịch vụ theo dõi.

## Tệp chính

- `D:\nam4\project\tour_management\frontend\src\travel.css`
- `D:\nam4\project\tour_management\frontend\src\pages\Home.jsx`
- `D:\nam4\project\tour_management\frontend\src\components\Navbar.jsx`
- `D:\nam4\project\tour_management\frontend\src\components\Footer.jsx`
- `D:\nam4\project\tour_management\frontend\src\components\TourCard.jsx`

## Kiểm tra

Trong PowerShell:

```powershell
Set-Location 'D:\nam4\project\tour_management\frontend'
npm test
npm run build
node 'D:\nam4\project\tour_management\frontend\scripts\verify-travel-ui.mjs'
```

Script kiểm tra trình duyệt cần frontend/backend/MySQL đang chạy, dữ liệu tour có sẵn và Google Chrome cài trên máy. Không cần cài thư viện trình duyệt bổ sung. Có thể cấu hình `CHROME_PATH` và `UI_BASE_URL` qua biến môi trường. Script dùng Node.js có WebSocket toàn cục (đã chạy với Node 22).

Script kiểm tra trang chủ, ảnh điểm đến, gửi tìm kiếm, danh sách/chi tiết tour, menu mobile, trang đăng nhập, tràn ngang và lỗi runtime; đồng thời kiểm tra cổng nội bộ không có header/footer khách hàng. Ảnh chụp desktop/mobile được ghi vào thư mục tạm hệ điều hành. Script không đăng nhập, không tạo đơn hoặc thay đổi cơ sở dữ liệu; không thay thế kiểm thử giao dịch đặt tour/thanh toán đầu cuối.